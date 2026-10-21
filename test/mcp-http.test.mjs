import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpHandler, MCP_INSTRUCTIONS } from '../server/mcp.mjs';

const appUrl='https://zemi.r21digital.com';
const town={type:'string',enum:['Ponce']};
const tool=(name,properties,required,run)=>({name,description:name,parameters:{type:'object',properties,required,additionalProperties:false},run});
let runs=0;
const tools=[
  tool('artist_places',{town,artist:{type:'string',maxLength:100}},['town','artist'],async()=>{runs++;return{data:{source:'Qloo',places:[]}}}),
  tool('town_profile',{town},['town'],async()=>({source:'Census PRCS',town:'Ponce'})),
];
const init={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'t',version:'0'}}};
let server,base;

before(async()=>{
  const handler=createMcpHandler({tools,appUrl,budget:{allow:()=>true},version:'0.0.0'});
  server=http.createServer((req,res)=>req.url==='/mcp'?handler(req,res):res.writeHead(404).end());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
});
after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve))});

// Raw requests, so the test controls every header (fetch may refuse to set Origin).
function raw(method,body,headers={}){
  return new Promise((resolve,reject)=>{
    const req=http.request(base+'/mcp',{method,headers:{'content-type':'application/json',accept:'application/json, text/event-stream',...headers}},res=>{
      let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:data?JSON.parse(data):null}));
    });
    req.on('error',reject);
    if(body!==undefined)req.write(typeof body==='string'?body:JSON.stringify(body));
    req.end();
  });
}

test('GET /mcp explains the endpoint with a 405',async()=>{
  const r=await raw('GET');
  assert.equal(r.status,405);
  assert.equal(r.headers.allow,'POST');
  assert.match(r.body.error,/zemi\.r21digital\.com\/mcp/);
  assert.match(r.body.error,/zemi\.r21digital\.com\/app/);
});

test('a foreign Origin gets 403; no Origin and our Origin pass',async()=>{
  assert.equal((await raw('POST',init,{origin:'https://evil.example'})).status,403);
  const ours=await raw('POST',init,{origin:appUrl});
  assert.equal(ours.status,200);
  assert.equal(ours.body.result.serverInfo.name,'zemi-aku');
  assert.equal(ours.body.result.instructions,MCP_INSTRUCTIONS);
  assert.equal((await raw('POST',init)).status,200);
});

test('malformed JSON gets a JSON-RPC parse error',async()=>{
  const r=await raw('POST','{');
  assert.equal(r.status,400);
  assert.equal(r.body.error.code,-32700);
});

test('a batched request is refused before any tool runs',async()=>{
  const call=id=>({jsonrpc:'2.0',id,method:'tools/call',params:{name:'artist_places',arguments:{town:'Ponce',artist:'X'}}});
  const before=runs;
  const r=await raw('POST',[call(1),call(2)]);
  assert.equal(r.status,400);
  assert.equal(r.body.error.code,-32600);
  assert.equal(runs,before);
});

test('an oversized body gets 413',async()=>{
  assert.equal((await raw('POST','x'.repeat(70*1024))).status,413);
});

test('the SDK client lists the tools and calls one',async()=>{
  const client=new Client({name:'test',version:'0'});
  await client.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp')));
  try{
    const {tools:listed}=await client.listTools();
    assert.deepEqual(listed.map(t=>t.name),['artist_places','town_profile']);
    assert.ok(listed.every(t=>t.annotations?.readOnlyHint===true));
    const r=await client.callTool({name:'artist_places',arguments:{town:'Ponce',artist:'Bad Bunny'}});
    assert.ok(r.structuredContent.map_url.endsWith('/app?town=Ponce&ask=Where+do+Bad+Bunny+fans+go+in+Ponce%3F'));
  }finally{await client.close()}
});

test('an unknown or excluded tool is an error result, not a crash',async()=>{
  const client=new Client({name:'test',version:'0'});
  await client.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp')));
  try{
    for(const name of ['map_town','qloo_trends']){
      const r=await client.callTool({name,arguments:{town:'Ponce'}});
      assert.equal(r.isError,true);
      assert.equal(r.content[0].text,'Unknown tool');
    }
  }finally{await client.close()}
});
