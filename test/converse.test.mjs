import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function browser(enabled=true,getMedia,voiceStatus,nativeVoices,stored={},voicesConfig,language) {
 const elements=new Map(),sockets=[],captions=[],actions=[],timers=[];
 let clears=0,stopped=0;
 const element=id=>{
  if(!elements.has(id))elements.set(id,{dataset:{},clientWidth:100,clientHeight:100,
   listeners:{},addEventListener(event,fn){this.listeners[event]=fn;},setAttribute(){}});
  return elements.get(id);
 };
 const audio={audioWorklet:{addModule:async()=>{}},resume:async()=>{},destination:{},
  createAnalyser:()=>({fftSize:512,connect(){},disconnect(){},getFloatTimeDomainData(){}}),
  createMediaStreamSource:()=>({connect(){},disconnect(){}})};
 class Socket {static OPEN=1;readyState=1;bufferedAmount=0;sent=[];
  constructor(url){this.url=url;this.events={};sockets.push(this);}send(data){this.sent.push(data);}close(){this.closed=true;}
  addEventListener(event,fn){this.events[event]=fn;}
 }
 const app={unlockAudio:async()=>{},stopSpeaking(){},outputLevel:()=>0,context:()=>({town:'Ponce',taste:'restaurant'}),
  voiceText:(...args)=>captions.push(args),applyMapActions:async list=>actions.push(...list),say(){},speak:async()=>{}};
 const context={window:{ZemiApp:app,AudioContext:function(){return audio;}},
  document:{getElementById:element,querySelectorAll:()=>[]},navigator:{language,mediaDevices:{getUserMedia:getMedia||(async()=>({getTracks:()=>[{stop(){stopped++;}}]}))}},
  location:{protocol:'https:',host:'zemi.r21digital.com'},WebSocket:Socket,ArrayBuffer,URLSearchParams,AbortSignal,
  AudioWorkletNode:class{port={};disconnect(){}},localStorage:{getItem(k){return stored[k]??null;},setItem(k,v){stored[k]=v;}},
  ZemiWisp:{createWisp:()=>({setState(){},setLevel(){}})},ZemiVoicePlayer:{create:()=>({push(){},clear(){clears++;},done:async()=>{}})},
  setInterval:()=>1,clearInterval(){},
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
  fetch:async url=>({json:async()=>url==='/api/voice/status'?(voiceStatus?await voiceStatus():{enabled}):url==='/api/voices'?(voicesConfig||{voices:[{id:'aura-2-andromeda-en',lang:'en',gender:'female',name:'Andromeda'},{id:'aura-2-arcas-en',lang:'en',gender:'male',name:'Arcas'},{id:'aura-2-selena-es',lang:'es',gender:'female',name:'Selena'},{id:'aura-2-aquila-es',lang:'es',gender:'male',name:'Aquila'}],default:'aura-2-andromeda-en',speechEnabled:true,listeningEnabled:true}):{speech:''}})};
 if(nativeVoices) context.window.speechSynthesis={getVoices:()=>nativeVoices,addEventListener(event,fn){this.changed=fn;}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../app/converse.js',import.meta.url),'utf8'),context);
 context.window.ZemiConverse.init();
 return{converse:context.window.ZemiConverse,elements,sockets,captions,actions,timers,app,audio,stored,get clears(){return clears;},get stopped(){return stopped;}};
}

test('the orb connects to the voice agent with context, captions and server map actions',async()=>{
 const b=browser();await b.converse.start();const ws=b.sockets[0];
 assert.match(ws.url,/\/api\/voice\?/);assert.match(ws.url,/town=Ponce/);
 await ws.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 await ws.onmessage({data:JSON.stringify({type:'ConversationText',role:'user',content:'Show Ponce'})});
 await ws.onmessage({data:JSON.stringify({type:'MapActions',actions:[{type:'fly_town',town:'Ponce'}]})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(b.captions,[['user','Show Ponce']]);assert.equal(b.actions[0].town,'Ponce');b.converse.stop();
 assert.equal(b.stopped,1);assert.equal(ws.closed,true);
});

test('the saved language is in place as soon as init runs, and a Spanish browser starts in Spanish', () => {
 const saved=browser(true,undefined,undefined,undefined,{'zemi-voice-lang':'es','zemi-voice-gender':'male'});
 assert.equal(saved.converse.voice().lang,'es'); assert.equal(saved.converse.voice().gender,'male');
 const fresh=browser(true,undefined,undefined,undefined,{},undefined,'es-PR');
 assert.equal(fresh.converse.voice().lang,'es');
 const english=browser(true,undefined,undefined,undefined,{},undefined,'en-US');
 assert.equal(english.converse.voice().lang,'en');
 const kept=browser(true,undefined,undefined,undefined,{'zemi-voice-lang':'en'},undefined,'es-PR');
 assert.equal(kept.converse.voice().lang,'en');
 // The menu shows the pick before /api/voices answers, and blocked storage still honours the browser language.
 assert.match(saved.elements.get('talk-lang').innerHTML,/value="es" selected/);
 const blocked=browser(true,undefined,undefined,undefined,{get 'zemi-voice-lang'(){throw new Error('SecurityError');},get 'zemi-voice-gender'(){throw new Error('SecurityError');}},undefined,'es-PR');
 assert.equal(blocked.converse.voice().lang,'es');
});

test('the menu is Female / Male per language, remembers the gender and ignores an old voice id', async () => {
 const b=browser(true,undefined,undefined,undefined,{'zemi-voice':'aura-2-nestor-es'});
 await b.converse.loadVoices(); b.converse.renderPicker();
 assert.match(b.elements.get('talk-voice').innerHTML,/value="female"[^]*value="male"/);
 assert.doesNotMatch(b.elements.get('talk-voice').innerHTML,/browser|Deepgram|nestor/);
 assert.equal(b.converse.voice().id,'aura-2-andromeda-en');
 b.converse.choose('es','male',{persist:'gender'});
 assert.equal(b.converse.voice().id,'aura-2-aquila-es'); assert.equal(b.stored['zemi-voice-gender'],'male');
 assert.equal(b.stored['zemi-voice-lang'],undefined,'a voice pick saves the gender only');
 b.converse.choose('es','male',{persist:'lang'});
 assert.match(b.elements.get('talk-voice').innerHTML,/Voz femenina[^]*Voz masculina/);
 assert.match(b.elements.get('talk-voice-name').textContent,/Deepgram/);
 assert.equal(b.stored['zemi-voice-lang'],'es');
 const again=browser(true,undefined,undefined,undefined,{'zemi-voice-gender':'male','zemi-voice-lang':'es'});
 again.converse.restoreChoice(); await again.converse.loadVoices(); assert.equal(again.converse.voice().id,'aura-2-aquila-es');
 const odd=browser(true,undefined,undefined,undefined,{'zemi-voice-lang':'klingon'});
 odd.converse.restoreChoice(); await odd.converse.loadVoices(); assert.equal(odd.converse.voice().lang,'en');
 // A question's language is this visit's only, and the voice list arriving later does not undo a switch.
 const visit=browser(true,undefined,undefined,undefined,{'zemi-voice-lang':'en'});
 visit.converse.restoreChoice(); visit.converse.choose('es','female');
 assert.equal(visit.stored['zemi-voice-lang'],'en'); await visit.converse.loadVoices(); assert.equal(visit.converse.voice().lang,'es');
});
test('with speech disabled the menu still offers Female / Male and the device voice is used', async () => {
 const zira={voiceURI:'zira',name:'Microsoft Zira',lang:'en-US'};
 const b=browser(true,undefined,undefined,[zira],{},{voices:[],speechEnabled:false,listeningEnabled:false});
 await b.converse.loadVoices(); b.converse.renderPicker();
 assert.equal(b.converse.voice().browser,true); assert.equal(b.converse.voice().voiceURI,'zira');
 assert.match(b.elements.get('talk-voice').innerHTML,/value="female"/);
 assert.equal(b.elements.get('talk-voice-name').textContent,'Your device’s voice for now.');
 const david={voiceURI:'david',name:'Microsoft David - English (United States)',lang:'en-US'};
 const two=browser(true,undefined,undefined,[zira,david],{},{voices:[],speechEnabled:false,listeningEnabled:false});
 await two.converse.loadVoices(); assert.equal(two.converse.browserVoice(two.converse.voice()),zira);
 two.converse.choose('en','male'); assert.equal(two.converse.browserVoice(two.converse.voice()),david);
 b.converse.choose('es','female'); assert.equal(b.elements.get('talk-voice-name').textContent,'Por ahora, la voz de su dispositivo.');
});
test('French, Italian and German speak: a Deepgram voice when offered, the device voice otherwise, silent only outside the menu', async () => {
 const b=browser(); await b.converse.loadVoices(); b.converse.choose('fr','female');
 assert.equal(b.converse.voice().silent,undefined); assert.equal(b.converse.voice().lang,'fr');
 assert.equal(b.elements.get('talk-voice').disabled,false);
 assert.match(b.elements.get('talk-voice').innerHTML,/Voix féminine/);
 const off=browser(true,undefined,undefined,[],{},{voices:[],speechEnabled:false,listeningEnabled:false});
 await off.converse.loadVoices(); off.converse.choose('de','male');
 assert.equal(off.converse.voice().browser,true); assert.equal(off.elements.get('talk-voice-name').textContent,'Vorerst die Stimme Ihres Geräts.');
});
test('Google US English is the preferred English voice and explicit choices still win', async () => {
 const us={voiceURI:'google-us',name:'Google US English',lang:'en-US'};
 const uk={voiceURI:'google-uk-female',name:'Google UK English Female',lang:'en-GB'};
 const zira={voiceURI:'zira',name:'Microsoft Zira',lang:'en-US'};
 const b=browser(false,null,null,[zira,uk,us],{},{voices:[],speechEnabled:false});
 await b.converse.loadVoices();
 assert.equal(b.converse.browserVoice(b.converse.voice()),us);
 assert.equal(b.converse.browserVoice({lang:'en',voiceURI:uk.voiceURI}),uk);
});
test('voice previews cannot be heard as a question during a conversation', async () => {
 const b=browser(); let previews=0; b.app.speak=async()=>{previews++;};
 await b.converse.start(); const ws=b.sockets[0];
 await ws.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 b.elements.get('talk-preview').listeners.click();
 assert.equal(previews,0); b.converse.stop();
 b.elements.get('talk-preview').listeners.click(); assert.equal(previews,1);
});
test('the named voice dropdown waits for the old provider connection to close', async () => {
 const b=browser(); await b.converse.start(); const ws=b.sockets[0];
 await ws.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 const switching=b.elements.get('talk-voice').listeners.change({target:{value:'male'}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(b.sockets.length,1); assert.equal(ws.closed,true);
 ws.events.close(); await switching;
 assert.equal(b.sockets.length,2); assert.match(b.sockets[1].url,/arcas-en/); b.converse.stop();
});
test('visible voice state follows thinking, speech, interruption, pause and end',async()=>{
 const b=browser();await b.converse.start();const ws=b.sockets[0];
 await ws.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 assert.equal(b.elements.get('voice-state')?.textContent,'Listening');
 await ws.onmessage({data:JSON.stringify({type:'AgentThinking'})});
 assert.equal(b.elements.get('voice-state').textContent,'Thinking');
 await ws.onmessage({data:JSON.stringify({type:'AgentStartedSpeaking'})});
 assert.equal(b.elements.get('voice-state').textContent,'Speaking');
 await ws.onmessage({data:JSON.stringify({type:'UserStartedSpeaking'})});
 assert.equal(b.elements.get('voice-state').textContent,'Listening');
 b.elements.get('talk-pause').listeners.click();assert.equal(b.elements.get('voice-state').textContent,'Paused');
 b.converse.stop();assert.equal(b.elements.get('voice-state').hidden,true);
 assert.equal(b.elements.get('wisp-button').dataset.mode,'off');
});
test('an audio setup failure does not leave the orb ignoring later taps',async()=>{
 const b=browser();let attempts=0;
 b.app.unlockAudio=async()=>{if(++attempts===1)throw new Error('Audio blocked');};
 await b.converse.start();assert.equal(b.elements.get('talk').dataset.mode,'off');
 await b.converse.start();assert.equal(b.sockets.length,1);b.converse.stop();
});
test('the session-ended explanation survives opening the fallback listener',async()=>{
 const b=browser();await b.converse.start();
 await b.sockets[0].onmessage({data:JSON.stringify({type:'VoiceError'})});
 b.sockets.at(-1).onopen();assert.match(b.elements.get('talk-status').textContent,/session ended.*Repeat/i);
 b.sockets.at(-1).onclose();b.sockets.at(-1).onopen();
 assert.doesNotMatch(b.elements.get('talk-status').textContent,/session ended/i);b.converse.stop();
});
test('pause, resume and interruption clear audio; a provider failure uses the existing listener',async()=>{
 const b=browser();await b.converse.start();const ws=b.sockets[0];
 await ws.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 b.elements.get('talk-pause').listeners.click();assert.equal(b.elements.get('talk').dataset.mode,'paused');
 assert.equal(JSON.parse(ws.sent.at(-1)).type,'Pause');
 b.elements.get('talk-pause').listeners.click();assert.equal(JSON.parse(ws.sent.at(-1)).type,'Resume');
 await ws.onmessage({data:JSON.stringify({type:'UserStartedSpeaking'})});assert.ok(b.clears>=2);
 await ws.onmessage({data:JSON.stringify({type:'VoiceError'})});assert.match(b.sockets.at(-1).url,/\/api\/listen\?/);
 assert.equal(ws.closed,true);b.converse.stop();
});
test('localhost with the voice agent disabled keeps the standard listening loop',async()=>{
 const b=browser(false);await b.converse.start();assert.match(b.sockets[0].url,/\/api\/listen\?/);b.converse.stop();
});
test('stopping while microphone permission is pending cannot restart listening',async()=>{
 let release,closed=0;
 const b=browser(true,()=>new Promise(resolve=>{release=resolve;}));
 const started=b.converse.start();await new Promise(resolve=>setImmediate(resolve));
 b.converse.stop();release({getTracks:()=>[{stop(){closed++;}}]});await started;
 assert.equal(b.sockets.length,0);assert.equal(closed,1);assert.equal(b.elements.get('talk').dataset.mode,'off');
});
test('pausing during connection setup preserves the paused session',async()=>{
 let release;
 const b=browser(true,null,()=>new Promise(resolve=>{release=resolve;}));
 const started=b.converse.start();await new Promise(resolve=>setImmediate(resolve));
 b.elements.get('talk-pause').listeners.click();release({enabled:true});await started;
 assert.equal(b.sockets.length,1);assert.equal(b.elements.get('talk').dataset.mode,'paused');
 await b.sockets[0].onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 assert.equal(b.elements.get('talk').dataset.mode,'paused');b.converse.stop();
});
test('committed map actions received while paused are displayed on resume',async()=>{
 const b=browser();await b.converse.start();const ws=b.sockets[0];
 await ws.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 b.elements.get('talk-pause').listeners.click();
 await ws.onmessage({data:JSON.stringify({type:'MapActions',actions:[{type:'fly_town',town:'Ponce'}]})});
 assert.equal(b.actions.length,0);b.elements.get('talk-pause').listeners.click();
 await new Promise(resolve=>setImmediate(resolve));assert.equal(b.actions.length,1);b.converse.stop();
});
test('changing a voice waits for the old connection to close before reconnecting',async()=>{
 const b=browser();await b.converse.start();const ws=b.sockets[0];
 await ws.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 const switching=b.elements.get('talk-lang').listeners.change({target:{value:'es'}});
 // loadVoices in this fixture must include a selectable Spanish voice.
 assert.equal(b.sockets.length,1);assert.equal(ws.closed,true);
 ws.events.close();await switching;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(b.sockets.length,2);assert.match(b.sockets[1].url,/selena-es/);b.converse.stop();
});
test('a voice-change handshake gets one bounded retry and Stop cancels it',async()=>{
 const b=browser();await b.converse.start();const old=b.sockets[0];
 await old.onmessage({data:JSON.stringify({type:'SettingsApplied'})});
 const switched=b.elements.get('talk-lang').listeners.change({target:{value:'es'}});old.events.close();await switched;
 b.sockets[1].onclose();assert.equal(b.timers.length,1);b.timers[0]();
 assert.match(b.sockets[2].url,/\/api\/voice\?/);b.sockets[2].onclose();
 assert.match(b.sockets[3].url,/\/api\/listen\?/);assert.equal(b.timers.length,1);b.converse.stop();
 const stopped=browser();await stopped.converse.start();const ws=stopped.sockets[0];
 const switching=stopped.elements.get('talk-lang').listeners.change({target:{value:'es'}});ws.events.close();await switching;
 stopped.sockets[1].onclose();stopped.converse.stop();stopped.timers[0]();assert.equal(stopped.sockets.length,2);
});
