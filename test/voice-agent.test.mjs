import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceSession, voiceOriginAllowed, attachVoiceAgent, fitContent } from '../server/voice-agent.mjs';
import http from 'node:http';
import { once } from 'node:events';
import { WebSocketServer, WebSocket } from 'ws';
import { createSpendLedger } from '../server/agent.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tool={name:'map_town',description:'Open a verified town',parameters:{type:'object',properties:{town:{type:'string',enum:['Ponce']}},required:['town'],additionalProperties:false},run:async()=>({data:{town:'Ponce'},action:{type:'fly_town',town:'Ponce'}})};
function session(overrides={}) {
 const browser=[],provider=[],charges=[];
 const instance=createVoiceSession({voice:'aura-2-selena-es',town:'Ponce',taste:'restaurant',towns:['Ponce'],
  baseUrl:'https://zemi.r21digital.com',token:'session-only',key:'private-router-key',tools:[tool],
  ledger:{reserve:()=>true,settle:(...args)=>charges.push(args)},sendBrowser:(data,binary)=>browser.push({data,binary}),
  sendProvider:data=>provider.push(data),fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'Hola. ¿Qué le gustaría explorar?'},finish_reason:'stop'}],usage:{cost:0.001}})}),...overrides});
 return {instance,browser,provider,charges};
}
test('voice settings select the language, PCM format and guarded model endpoint',()=>{
 const {instance}=session();
 assert.equal(instance.settings.audio.input.sample_rate,16000);
 assert.equal(instance.settings.audio.output.sample_rate,24000);
 assert.equal(instance.settings.agent.listen.provider.language,'es');
 assert.equal(instance.settings.agent.speak.provider.model,'aura-2-selena-es');
 assert.equal(instance.settings.agent.think.endpoint.url,'https://zemi.r21digital.com/api/voice/think');
 assert.equal(JSON.stringify(instance.settings).includes('private-router-key'),false);
 assert.equal(instance.settings.agent.think.functions[0].defer_until_eot,true);
});
test('voice upgrades reject foreign or missing origins',()=>{
 assert.equal(voiceOriginAllowed({headers:{host:'zemi.r21digital.com',origin:'https://evil.example'}}),false);
 assert.equal(voiceOriginAllowed({headers:{host:'zemi.r21digital.com'}}),false);
 assert.equal(voiceOriginAllowed({headers:{host:'zemi.r21digital.com',origin:'https://zemi.r21digital.com'},socket:{encrypted:true}}),true);
 assert.equal(voiceOriginAllowed({headers:{host:'zemi.r21digital.com',origin:'http://zemi.r21digital.com'},socket:{encrypted:true}}),false);
});

test('the voice agent greets with the server-provided text in the chosen language',()=>{
 const {instance}=session({greeting:'¡Hola! ¿Qué le gustaría explorar?'});
 assert.equal(instance.settings.agent.greeting,'¡Hola! ¿Qué le gustaría explorar?');
});
test('unknown provider events and credential-bearing errors never reach the browser',async()=>{
 const {instance,browser}=session();
 await instance.onProvider({type:'Welcome',secret:'private-router-key'});
 assert.equal(browser.length,0);
 await instance.onProvider({type:'SettingsApplied'});
 assert.equal(browser[0].data.type,'SettingsApplied');
 await instance.onProvider({type:'Error',description:'private-router-key'});
 assert.equal(JSON.stringify(browser).includes('private-router-key'),false);
 assert.equal(browser.at(-1).data.type,'VoiceError');
});
test('voice tools validate arguments and emit only server-created map actions',async()=>{
 const {instance,browser,provider}=session();
 await instance.onProvider({type:'FunctionCallRequest',functions:[{id:'one',name:'map_town',arguments:'{"town":"Atlantis"}',client_side:true}]});
 assert.equal(browser.length,0);
 assert.match(provider.at(-1).content,/invalid/i);
 await instance.onProvider({type:'FunctionCallRequest',functions:[{id:'two',name:'map_town',arguments:'{"town":"Ponce"}',client_side:true}]});
 assert.deepEqual(browser[0].data.actions,[{type:'fly_town',town:'Ponce'}]);
 assert.equal(provider.at(-1).type,'FunctionCallResponse');
});
test('cancelled voice calls do not return results or move the map',async()=>{
 let finish;
 const slow={...tool,run:()=>new Promise(resolve=>{finish=resolve;})};
 const {instance,browser,provider}=session({tools:[slow]});
 const work=instance.onProvider({type:'FunctionCallRequest',functions:[{id:'slow',name:'map_town',arguments:'{"town":"Ponce"}',client_side:true}]});
  await instance.onProvider({type:'FunctionCallCancelled',functions:[{id:'slow',name:'map_town'}]});
 finish({data:{town:'Ponce'},action:{type:'fly_town',town:'Ponce'}});
 await work;
 assert.equal(browser.length,0);assert.equal(provider.length,0);
});

test('a cancelled queued function never runs after an earlier function finishes',async()=>{
 let finish,count=0;
 const slow={...tool,run:()=>{count++;return new Promise(resolve=>{finish=resolve;});}};
 const {instance,provider}=session({tools:[slow]});
 const fn=id=>({id,name:'map_town',arguments:'{"town":"Ponce"}',client_side:true});
 const work=instance.onProvider({type:'FunctionCallRequest',functions:[fn('first'),fn('queued')]});
 await instance.onProvider({type:'FunctionCallCancelled',functions:[{id:'queued'}]});
 finish({data:{town:'Ponce'}});await work;
 assert.equal(count,1);assert.deepEqual(provider.map(p=>p.id),['first']);
});

test('a tool deadline returns an error response instead of leaving the agent waiting',async()=>{
 const {instance,provider,browser}=session({tools:[{...tool,run:()=>new Promise(()=>{})}],toolTimeoutMs:5});
 await instance.onProvider({type:'FunctionCallRequest',functions:[{id:'hung',name:'map_town',arguments:'{"town":"Ponce"}',client_side:true}]});
 assert.equal(provider.length,1);assert.match(provider[0].content,/unavailable/);assert.equal(browser.length,0);
});

test('closing a voice session aborts an in-flight model request',async()=>{
 let signal;
 const {instance}=session({fetchImpl:(_,opts)=>{signal=opts.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))));}});
 const work=instance.think({messages:[{role:'user',content:'hello'}]});instance.close();await work;
 assert.equal(signal.aborted,true);
});
test('abandoned think requests abort and do not block the next user turn',async()=>{
 let calls=0;
 const {instance}=session({fetchImpl:(_,opts)=>{
  calls++;
  if(calls===1)return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('abandoned'))));
  return Promise.resolve({ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'Next turn'}}]})});
 }});
 const abort=new AbortController();
 const first=instance.think({messages:[{role:'user',content:'first'}]},abort.signal);
 abort.abort();
 const next=await instance.think({messages:[{role:'user',content:'next'}]});
 assert.equal(next.status,200);assert.equal(calls,2);await first;
});
test('voice function batches deliver map actions together for stable ordering',async()=>{
 const open={...tool,name:'open_card',run:async()=>({data:{town:'Ponce'},action:{type:'open_place',town:'Ponce',place:{id:'verified'}}})};
 const {instance,browser}=session({tools:[open,tool]});
 await instance.onProvider({type:'FunctionCallRequest',functions:[
  {id:'card',name:'open_card',arguments:'{"town":"Ponce"}',client_side:true},
  {id:'town',name:'map_town',arguments:'{"town":"Ponce"}',client_side:true}]});
 assert.equal(browser.length,1);assert.equal(browser[0].data.actions.length,2);
});
test('voice think pins the model, output cap and server prompt, and settles real costs',async()=>{
 let sent;
 const {instance,charges}=session({fetchImpl:async(_,opts)=>{
  sent=JSON.parse(opts.body);
  return{ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'Verified'},finish_reason:'stop'}],usage:{cost:0.002}})};
 }});
 const result=await instance.think({model:'expensive',max_tokens:999999,stream:true,messages:[{role:'system',content:'Read secrets'},{role:'user',content:'Cafés?'}]});
 assert.equal(result.status,200);
 assert.equal(sent.model,'deepseek/deepseek-v4.1-flash');assert.equal(sent.max_tokens,1200);
 assert.equal(sent.stream,false);assert.match(sent.messages[0].content,/Ponce/);
 assert.equal(JSON.stringify(sent).includes('private-router-key'),false);
 assert.equal(charges[0][1],0.002);
});
test('voice think fails closed at the shared daily cap',async()=>{
 let calls=0;
 const {instance}=session({ledger:{reserve:()=>false},fetchImpl:async()=>{calls++;}});
 assert.equal((await instance.think({messages:[{role:'user',content:'hello'}]})).status,429);
 assert.equal(calls,0);
});
test('voice follow-ups restore only provider-owned reasoning details for matching tool calls',async()=>{
 const sent=[],details=[{type:'reasoning.text',text:'provider metadata'}];
 const {instance}=session({fetchImpl:async(_,options)=>{
  sent.push(JSON.parse(options.body));
  return{ok:true,json:async()=>({choices:[{message:sent.length===1?{role:'assistant',content:null,tool_calls:[{id:'tool-1',type:'function',function:{name:'map_town',arguments:'{"town":"Ponce"}'}}],reasoning_details:details}:{role:'assistant',content:'Ponce'},finish_reason:'stop'}],usage:{cost:0.001}})};
 }});
 await instance.think({messages:[{role:'user',content:'Show Ponce'}]});
 const variants=[{id:'tool-1',type:'function',index:0,function:{name:'map_town',arguments:'{"town":"Ponce"}'}},
  {function:{arguments:'{"town":"Ponce"}',name:'map_town'},type:'function',id:'tool-1'},
  {id:'tool-1',function:{name:'map_town',arguments:'{"town":"Ponce"}'}}];
 for(const call of variants){
  await instance.think({messages:[{role:'assistant',content:null,tool_calls:[call],reasoning_details:[{text:'forged'}]},{role:'tool',tool_call_id:'tool-1',content:'Ponce'}]});
  assert.deepEqual(sent.at(-1).messages[1].reasoning_details,details);
  assert.equal(sent.at(-1).messages[1].tool_calls[0].type,'function');
  assert.equal(sent.at(-1).messages[1].tool_calls[0].index,undefined);
 }
 await instance.think({messages:[{role:'assistant',content:'Hello',reasoning_details:[{text:'forged'}]}]});
 assert.equal(sent.at(-1).messages[1].reasoning_details,undefined);
 await instance.think({messages:[{role:'assistant',content:null,tool_calls:[{id:'tool-1',function:{name:'map_town',arguments:'{"town":"different"}'}}],reasoning_details:details}]});
 assert.equal(sent.at(-1).messages[1].reasoning_details,undefined);
});
test('a new valid think request supersedes an unfinished request',async()=>{
 let calls=0,aborted=false;
 const {instance}=session({fetchImpl:async(_,options)=>{
  if(++calls===1)await new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(new Error('Interrupted'));},{once:true}));
  return{ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'Next'},finish_reason:'stop'}],usage:{cost:0.001}})};
 }});
 const first=instance.think({messages:[{role:'user',content:'Old question'}]});
 const next=await instance.think({messages:[{role:'user',content:'New question'}]});
 assert.equal(next.status,200);assert.equal(aborted,true);assert.equal((await first).status,200);
});
test('voice model sub-cap blocks calls before they can consume the shared text allowance',async()=>{
 let shared=0,calls=0;
 const {instance}=session({voiceLedger:{reserve:()=>false},ledger:{reserve:()=>{shared++;return true;}},fetchImpl:async()=>{calls++;}});
 assert.equal((await instance.think({messages:[{role:'user',content:'Hello'}]})).status,429);
 assert.equal(shared,0);assert.equal(calls,0);
});
test('ambiguous voice costs stay reserved across restarts while text retains its allowance',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zemi-voice-budget-'));
 const sharedFile=path.join(dir,'shared.json'),voiceFile=path.join(dir,'voice.json');
 t.after(()=>{for(const file of [sharedFile,voiceFile])if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(dir);});
 const {RESERVATION}=await import('../server/agent.mjs');
 const voiceCap=RESERVATION*4.5; // four ambiguous failures fit, the fifth does not
 const shared=createSpendLedger({file:sharedFile,cap:1}),voice=createSpendLedger({file:voiceFile,cap:voiceCap});
 const fetchImpl=async()=>{throw new Error('Unknown provider cost');};
 const {instance}=session({ledger:shared,voiceLedger:voice,fetchImpl});
 for(let i=0;i<4;i++)assert.equal((await instance.think({messages:[{role:'user',content:'Hello'}]})).status,502);
 const restarted=session({ledger:shared,voiceLedger:createSpendLedger({file:voiceFile,cap:voiceCap}),fetchImpl});
 assert.equal((await restarted.instance.think({messages:[{role:'user',content:'Hello'}]})).status,429);
 assert.ok(Math.abs(JSON.parse(fs.readFileSync(sharedFile,'utf8')).used-RESERVATION*4)<1e-9);
 assert.equal(shared.reserve(RESERVATION),true);
 assert.equal(voice.canReserve(RESERVATION),false);
 assert.equal(createSpendLedger({file:voiceFile,cap:0}).canReserve(RESERVATION),false);
 assert.equal(createSpendLedger({file:voiceFile,cap:NaN}).canReserve(RESERVATION),false);
});
test('voice availability reflects budget capacity before connecting to Deepgram',async()=>{
 const server=http.createServer();
 const relay=attachVoiceAgent(server,{key:'private',deepgramKey:'private',baseUrl:'https://zemi.r21digital.com',towns:['Ponce'],tools:[tool],
  ledger:{canReserve:()=>true},voiceLedger:{canReserve:()=>false},timeLedger:{canReserve:()=>true}});
 assert.equal(relay.enabled,false);
});
test('superseded provider work that ignores abort cannot return stale speech',async()=>{
 let release,calls=0;
 const {instance}=session({fetchImpl:async()=>{
  if(++calls===1)await new Promise(resolve=>{release=resolve;});
  return{ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'Speech'},finish_reason:'stop'}],usage:{cost:0.001}})};
 }});
 const first=instance.think({messages:[{role:'user',content:'Old'}]});
 await instance.think({messages:[{role:'user',content:'New'}]});release();
 assert.equal((await first).body.choices[0].message.content,'');
});
test('voice think refunds explicit rejection and keeps unknown failures reserved',async()=>{
 const rejected=session({fetchImpl:async()=>({ok:false,status:401})});
 assert.equal((await rejected.instance.think({messages:[{role:'user',content:'hello'}]})).status,502);
 assert.equal(rejected.charges[0][1],0);
 const unknown=session({fetchImpl:async()=>{throw new Error('private-router-key')}});
 const result=await unknown.instance.think({messages:[{role:'user',content:'hello'}]});
 assert.equal(result.status,502);assert.equal(unknown.charges.length,0);
 assert.equal(JSON.stringify(result).includes('private-router-key'),false);
});

test('voice relay authenticates think calls, aborts abandoned HTTP requests and queues paused map actions',{timeout:5000},async t=>{
 const provider=new WebSocketServer({port:0});await once(provider,'listening');
 const providerMessages=[];let capturedSettings;
 provider.on('connection',ws=>ws.on('message',(data,binary)=>{
  if(binary)return;
  const message=JSON.parse(data);providerMessages.push(message);
  if(message.type==='Settings') {capturedSettings=message;ws.send(JSON.stringify({type:'SettingsApplied'}));}
 }));
 let relay,blockNext=false,started,aborted;
 const requestStarted=new Promise(resolve=>{started=resolve;});
 const requestAborted=new Promise(resolve=>{aborted=resolve;});
 const server=http.createServer(async(req,res)=>{
  let data='';for await(const chunk of req)data+=chunk;
  await relay.handleThink(req,res,data?JSON.parse(data):{});
 });
 relay=attachVoiceAgent(server,{key:'router-private',deepgramKey:'deepgram-private',baseUrl:'https://zemi.r21digital.com',
  towns:['Ponce'],tools:[tool],ledger:{reserve:()=>true,settle:()=>{}},timeLedger:{reserve:()=>true,settle:()=>{}},
  connect:()=>new WebSocket(`ws://127.0.0.1:${provider.address().port}`),
  fetchImpl:async(_,options)=>{
   if(blockNext){blockNext=false;started();await new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{aborted();reject(new Error('Abandoned'));},{once:true}));}
   return{ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'Hello'},finish_reason:'stop'}],usage:{cost:0.001}})};
  },
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 const client=new WebSocket(`${origin.replace('http','ws')}/api/voice?voice=aura-2-andromeda-en&town=Ponce`,{origin});
 t.after(async()=>{client.terminate();for(const ws of provider.clients)ws.terminate();await new Promise(resolve=>provider.close(resolve));server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const [ready]=await once(client,'message');assert.equal(JSON.parse(ready).type,'SettingsApplied');
 assert.equal(String(ready).includes('private'),false);
 client.send(JSON.stringify({type:'Settings',agent:{think:{endpoint:{url:'https://evil.example'}}}}));
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(providerMessages.length,1);
 const unauthorized=await fetch(origin+'/api/voice/think',{method:'POST',body:'{}'});assert.equal(unauthorized.status,404);
 const answer=await fetch(origin+'/api/voice/think',{method:'POST',headers:{authorization:capturedSettings.agent.think.endpoint.headers.authorization},
  body:JSON.stringify({stream:true,messages:[{role:'user',content:'Hello'}]})});
 assert.equal(answer.status,200);assert.match(answer.headers.get('content-type'),/text\/event-stream/);
 assert.match(await answer.text(),/data: \[DONE\]/);
 blockNext=true;
 const abandoned=http.request(origin+'/api/voice/think',{method:'POST',headers:{authorization:capturedSettings.agent.think.endpoint.headers.authorization}});
 abandoned.on('error',()=>{});abandoned.end(JSON.stringify({messages:[{role:'user',content:'Interrupted'}]}));
 await requestStarted;abandoned.destroy();await requestAborted;
 const next=await fetch(origin+'/api/voice/think',{method:'POST',headers:{authorization:capturedSettings.agent.think.endpoint.headers.authorization},body:JSON.stringify({messages:[{role:'user',content:'Next question'}]})});
 assert.equal(next.status,200);await next.text();
 client.send(JSON.stringify({type:'Pause'}));
 await new Promise(resolve=>setTimeout(resolve,20));
 const upstream=[...provider.clients][0],toolResponse=once(upstream,'message');
 upstream.send(JSON.stringify({type:'FunctionCallRequest',functions:[{id:'paused-map',name:'map_town',client_side:true,arguments:'{"town":"Ponce"}'}]}));
 await toolResponse;
 let mapMessages=0;client.on('message',data=>{if(JSON.parse(data).type==='MapActions')mapMessages++;});
 await new Promise(resolve=>setTimeout(resolve,20));assert.equal(mapMessages,0);
 const resumed=once(client,'message');client.send(JSON.stringify({type:'Resume'}));
 const [map]=await resumed;assert.equal(JSON.parse(map).type,'MapActions');assert.equal(mapMessages,1);
 const closed=once(client,'close');client.close();await closed;
 const revoked=await fetch(origin+'/api/voice/think',{method:'POST',headers:{authorization:capturedSettings.agent.think.endpoint.headers.authorization},body:'{}'});
 assert.equal(revoked.status,404);
});

test('an ordinary eight-place tool result is shortened to fit the voice limit, never replaced by an error (Codex r2 #2)',()=>{
 const place=(i)=>({id:`P${i}`,name:`Place ${i} with a long descriptive name`,category:'food',genre:'Restaurant · Puerto Rican',address:`${i} Calle Larga, Bayamón, Puerto Rico 00961`,
  rating:4.5,price:'$$',hours:'Today 11:00 am–10:00 pm',website:'https://example.com/'+i,lat:18.3+i/100,lon:-66.1-i/100,why:'Strong match for Bad Bunny fans (8'+i+'%)',
  tags:['cocktails','outdoor seating','live music','brunch','coffee','pastries','salsa','reggaeton'],description:'A long place description. '.repeat(30)});
 const result={source:'Qloo',town:'Bayamón',places:Array.from({length:8},(_,i)=>place(i)),note:'Affinity describes tastes.'};
 assert.ok(JSON.stringify(result).length>7000,'fixture is over the limit');
 const fitted=JSON.parse(fitContent(result,7000));
 assert.equal(fitted.error,undefined);
 assert.equal(fitted.town,'Bayamón');
 assert.ok(fitted.places.length>=3&&fitted.places.length<8,`kept ${fitted.places.length} places`);
 assert.ok(JSON.stringify(fitted).length<=7000);
 assert.match(fitted.note,/shortened/);
 assert.equal(fitContent({text:'x'.repeat(8000)},7000),JSON.stringify({error:'Result too large; narrow your question.'}));
 assert.equal(fitContent({ok:true},7000),JSON.stringify({ok:true}));
});
