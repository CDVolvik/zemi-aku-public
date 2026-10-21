import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { agentTools } from '../server/agent-tools.mjs';
import { createLimiter, ROUTE_LIMITS } from '../server/limits.mjs';
import { MCP_TOOL_NAMES, mcpTools, mapUrl, mcpBudget, callMcpTool } from '../server/mcp.mjs';

const appUrl='https://zemi.r21digital.com';
const open={allow:()=>true};
const town={type:'string',enum:['Ponce','Mayagüez','San Juan']};
const artist={type:'string',maxLength:100};
const id={type:'string',pattern:'^[0-9a-fA-F-]{36}$',maxLength:36};
const ID='11111111-1111-1111-1111-111111111111';
const tool=(name,properties,required,run)=>({name,description:name,parameters:{type:'object',properties,required,additionalProperties:false},run});
const text=r=>r.content[0].text;

test('mcpTools keeps the 13 connector tools and drops map_town and qloo_trends',()=>{
  const names=mcpTools(agentTools({towns:['Ponce'],categories:['food']})).map(t=>t.name);
  assert.deepEqual([...names].sort(),[...MCP_TOOL_NAMES].sort());
  assert.equal(names.length,13);
  assert.ok(names.includes('opportunity_map'));
  assert.ok(!names.includes('map_town')&&!names.includes('qloo_trends'));
});

test('mapUrl builds links only from parameters the app reads',()=>{
  assert.equal(mapUrl(appUrl,'artist_places',{town:'Mayagüez',artist:'Bad Bunny'}),
    'https://zemi.r21digital.com/app?town=Mayag%C3%BCez&ask=Where+do+Bad+Bunny+fans+go+in+Mayag%C3%BCez%3F');
  assert.equal(mapUrl(appUrl,'town_catalog',{town:'Ponce',category:'food'}),appUrl+'/app?town=Ponce&category=food');
  assert.equal(mapUrl(appUrl,'town_catalog',{town:'Ponce',category:'all'}),appUrl+'/app?town=Ponce');
  for(const name of ['find_places','place_details','fans_also_love','town_profile','landmarks','town_history','qloo_recommend'])
    assert.equal(mapUrl(appUrl,name,{town:'Ponce'}),appUrl+'/app?town=Ponce');
  assert.equal(mapUrl(appUrl,'opportunity_map',{industry:'bakery'}),appUrl+'/app?opportunity=bakery');
  for(const name of ['qloo_describe','qloo_compare_audiences','qloo_entity_tags'])
    assert.equal(mapUrl(appUrl,name,{}),undefined);
});

test('callMcpTool returns data plus map_url and drops the map action',async()=>{
  const t=tool('artist_places',{town,artist},['town','artist'],
    async()=>({data:{source:'Qloo',places:[{name:'Plaza Las Delicias'}]},action:{type:'show_places'}}));
  const r=await callMcpTool(t,{town:'Ponce',artist:'Bad Bunny'},{appUrl,budget:open});
  assert.equal(r.isError,undefined);
  assert.equal(r.structuredContent.map_url,appUrl+'/app?town=Ponce&ask=Where+do+Bad+Bunny+fans+go+in+Ponce%3F');
  assert.equal(r.structuredContent.places[0].name,'Plaza Las Delicias');
  assert.ok(!('action' in r.structuredContent));
  assert.deepEqual(JSON.parse(text(r)),r.structuredContent);
});

test('callMcpTool keeps a top-level result when the tool has no data field',async()=>{
  const t=tool('landmarks',{town},['town'],async()=>({source:'Wikidata',town:'Ponce',landmarks:[{name:'Castillo Serrallés'}]}));
  const r=await callMcpTool(t,{town:'Ponce'},{appUrl,budget:open});
  assert.equal(r.structuredContent.source,'Wikidata');
  assert.equal(r.structuredContent.landmarks[0].name,'Castillo Serrallés');
  assert.equal(r.structuredContent.map_url,appUrl+'/app?town=Ponce');
});

test('callMcpTool resolves accent and case variants of a town',async()=>{
  let got;
  const t=tool('artist_places',{town,artist},['town','artist'],async a=>{got=a;return{data:{}}});
  await callMcpTool(t,{town:'mayaguez',artist:'X'},{appUrl,budget:open});
  assert.equal(got.town,'Mayagüez');
  await callMcpTool(t,{town:'SAN  JUAN',artist:'X'},{appUrl,budget:open});
  assert.equal(got.town,'San Juan');
});

test('callMcpTool treats null optional arguments as absent',async()=>{
  let got;
  const t=tool('town_catalog',{town,category:{type:'string',enum:['all','food']}},['town'],async a=>{got=a;return{data:{}}});
  const r=await callMcpTool(t,{town:'Ponce',category:null},{appUrl,budget:open});
  assert.equal(r.isError,undefined);
  assert.deepEqual(got,{town:'Ponce'});
});

test('callMcpTool rejects invalid arguments without spending budget and names the bad keys',async()=>{
  let asked=0;
  const budget={allow:()=>{asked++;return true}};
  const t=tool('place_details',{town,id},['town','id'],async()=>({data:{}}));
  for(const [args,keys] of [[{town:'Ponce',id:'x'.repeat(36)},'id'],[{town:'Atlantis',id:ID},'town'],[{town:'Ponce',id:ID,extra:'1'},'extra'],[{town:'Ponce'},'id']]){
    const r=await callMcpTool(t,args,{appUrl,budget});
    assert.equal(r.isError,true);
    assert.equal(text(r),`Invalid arguments for place_details: ${keys}`);
  }
  assert.equal(asked,0);
});

test('callMcpTool resolves a town written with ", Puerto Rico" or ", PR"',async()=>{
  let got;
  const t=tool('artist_places',{town,artist},['town','artist'],async a=>{got=a;return{data:{}}});
  await callMcpTool(t,{town:'Ponce, Puerto Rico',artist:'X'},{appUrl,budget:open});
  assert.equal(got.town,'Ponce');
  await callMcpTool(t,{town:'San Juan, PR',artist:'X'},{appUrl,budget:open});
  assert.equal(got.town,'San Juan');
});

test('callMcpTool treats an empty optional argument as absent',async()=>{
  let got;
  const t=tool('town_catalog',{town,category:{type:'string',enum:['all','food']}},['town'],async a=>{got=a;return{data:{}}});
  const r=await callMcpTool(t,{town:'Ponce',category:''},{appUrl,budget:open});
  assert.equal(r.isError,undefined);
  assert.deepEqual(got,{town:'Ponce'});
});

test('the public overlay keeps the hosted connector off until Qloo confirms in writing',()=>{
  const overlay=fs.readFileSync(new URL('../deploy/compose.safe.yaml',import.meta.url),'utf8');
  assert.match(overlay,/^\s*ZEMI_MCP_ENABLED: "0"\s*$/m);
});

test('the connector per-IP limit leaves room for judges who share a platform IP',()=>{
  assert.equal(ROUTE_LIMITS['/mcp'],60);
});

test('callMcpTool passes a tool error through as isError',async()=>{
  const t=tool('place_details',{town,id},['town','id'],async()=>({error:"Place is not in this town's verified catalog."}));
  const r=await callMcpTool(t,{town:'Ponce',id:ID},{appUrl,budget:open});
  assert.equal(r.isError,true);
  assert.match(text(r),/verified catalog/);
});

test('callMcpTool returns a typical eight-place result in full',async()=>{
  const place={id:ID,name:'Plaza Las Delicias',town:'Ponce',kind:'Plaza',address:'Calle Marina, Ponce',
    description:'d'.repeat(600),facts:['f'.repeat(60),'f'.repeat(60),'f'.repeat(60),'f'.repeat(60),'f'.repeat(60),'f'.repeat(60)]};
  const t=tool('artist_places',{town,artist},['town','artist'],async()=>({data:{source:'Qloo',town:'Ponce',places:Array(8).fill(place),note:'n'.repeat(200)}}));
  const r=await callMcpTool(t,{town:'Ponce',artist:'Bad Bunny'},{appUrl,budget:open});
  assert.equal(r.isError,undefined);
  assert.equal(r.structuredContent.places.length,8);
});

test('callMcpTool replaces an oversized result',async()=>{
  const t=tool('town_profile',{town},['town'],async()=>({data:{blob:'x'.repeat(21000)}}));
  const r=await callMcpTool(t,{town:'Ponce'},{appUrl,budget:open});
  assert.equal(r.isError,true);
  assert.equal(text(r),'Result too large; narrow your question.');
});

test('callMcpTool times out a hung tool',async()=>{
  const t=tool('town_profile',{town},['town'],()=>new Promise(()=>{}));
  const r=await callMcpTool(t,{town:'Ponce'},{appUrl,budget:open,timeoutMs:50});
  assert.equal(r.isError,true);
  assert.equal(text(r),'This data is unavailable. Do not guess.');
});

test('callMcpTool hides the details of a thrown tool error',async()=>{
  const t=tool('town_profile',{town},['town'],async()=>{throw new Error('The Qloo budget for today is used up at /opt/zemi')});
  const r=await callMcpTool(t,{town:'Ponce'},{appUrl,budget:open});
  assert.equal(r.isError,true);
  assert.equal(text(r),'This data is unavailable. Do not guess.');
});

test('callMcpTool refuses with the limit message when the budget says no',async()=>{
  let ran=0;
  const t=tool('town_profile',{town},['town'],async()=>{ran++;return{data:{}}});
  const r=await callMcpTool(t,{town:'Ponce'},{appUrl,budget:{allow:()=>false}});
  assert.equal(r.isError,true);
  assert.equal(text(r),"Zemi-Aku's connector has reached today's limit. The map at https://zemi.r21digital.com/app still works.");
  assert.equal(ran,0);
});

test('mcpBudget refuses everything when the Qloo cap is zero',()=>{
  const limiter=createLimiter();
  assert.equal(mcpBudget({limiter,callsPerDay:150,qlooCap:0,qlooReserve:200}).allow(),false);
  assert.equal(mcpBudget({limiter,callsPerDay:150,qlooCap:0,qlooReserve:0}).allow(),false);
  assert.equal(limiter.used('mcp-calls'),0);
});

test('mcpBudget stops at callsPerDay and keeps the Qloo reserve for the web demo',()=>{
  const now=()=>Date.parse('2026-10-20T12:00:00Z');
  const budget=mcpBudget({limiter:createLimiter({now}),callsPerDay:2,qlooCap:10,qlooReserve:4});
  assert.equal(budget.allow(),true);assert.equal(budget.allow(),true);assert.equal(budget.allow(),false);
  const shared=createLimiter({now});
  const reserved=mcpBudget({limiter:shared,callsPerDay:150,qlooCap:10,qlooReserve:4});
  shared.spend('qloo-calls',5,10);
  assert.equal(reserved.allow(),true);
  shared.spend('qloo-calls',1,10);
  assert.equal(reserved.allow(),false);
  assert.equal(shared.used('mcp-calls'),1);
});
