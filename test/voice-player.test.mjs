import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function player() {
 const window={};vm.runInNewContext(fs.readFileSync(new URL('../app/voice-player.js',import.meta.url),'utf8'),{window,Int16Array});
 const sources=[],buffers=[];
 const context={currentTime:2,destination:{},createBuffer:(_,length,rate)=>{
  const samples=new Float32Array(length);const buffer={duration:length/rate,getChannelData:()=>samples};buffers.push(samples);return buffer;
 },createBufferSource:()=>{const source={connect(){},start(at){this.at=at;},stop(){this.stopped=true;this.onended?.();}};sources.push(source);return source;}};
 return{instance:window.ZemiVoicePlayer.create(context,{}),context,sources,buffers};
}
test('raw voice PCM is decoded and scheduled without overlapping chunks',()=>{
 const {instance,sources,buffers}=player();
 const audio=new Int16Array([32767,-32768]).buffer;instance.push(audio);instance.push(audio);
 assert.ok(Math.abs(buffers[0][0]-32767/32768)<0.000001);assert.equal(buffers[0][1],-1);
 assert.ok(sources[1].at>sources[0].at);assert.equal(sources[0].buffer.duration,2/24000);
});
test('barge-in clears every queued buffer and resolves playback completion',async()=>{
 const {instance,sources}=player();instance.push(new Int16Array(2400).buffer);instance.push(new Int16Array(2400).buffer);
 let done=false;const completed=instance.done().then(()=>{done=true;});
 assert.equal(done,false);instance.clear();await completed;
 assert.equal(sources.every(source=>source.stopped),true);assert.equal(done,true);
});
test('voice playback truncates excessive buffering without failing the session',async()=>{
 const {instance,sources}=player();assert.equal(instance.push(new Int16Array(24000*91).buffer),false);
 assert.ok(sources[0].buffer.duration<=90);assert.equal(instance.push(new Int16Array(2400).buffer),false);
 sources[0].onended();await instance.done();assert.equal(instance.push(new Int16Array(2400).buffer),true);
});
test('a normal 45-second spoken answer can arrive faster than playback',()=>{
 const {instance,sources}=player();
 for(let i=0;i<450;i++)instance.push(new Int16Array(2400).buffer);
 assert.equal(sources.length,450);instance.clear();
});
test('PCM frames split across messages retain their trailing byte',()=>{
 const {instance,buffers}=player();instance.push(new Uint8Array([255]).buffer);
 instance.push(new Uint8Array([127,0,128]).buffer);
 assert.equal(buffers.length,1);assert.equal(buffers[0][1],-1);
 assert.ok(Math.abs(buffers[0][0]-32767/32768)<0.000001);
});
