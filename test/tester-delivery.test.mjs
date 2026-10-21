import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTesterDelivery } from '../server/tester-delivery.mjs';
test('authenticated delivery retries failures and survives process restart without reposting', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zemi-delivery-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const row={at:'2026-10-07T00:00:00Z',firstName:'Test',lastName:'Request',email:'test@example.invalid'};
  const options={url:'https://n8n.r21digital.com/webhook/test',secret:'s'.repeat(64),file:path.join(dir,'sent.json'),readRows:()=>[row]};
  const requests=[];
  const delivery=createTesterDelivery({...options,fetchImpl:async(url,opts)=>{
    requests.push(opts);return requests.length===1?{ok:false}:{ok:true,json:async()=>({ok:true})};
  }});
  await delivery();await delivery();await delivery();
  assert.equal(requests.length,2);
  assert.equal(requests[1].headers['X-Zemi-Webhook-Secret'],options.secret);
  assert.equal(JSON.parse(requests[0].body).id,JSON.parse(requests[1].body).id);
  await createTesterDelivery({...options,fetchImpl:async()=>{throw new Error('should not repost')}})();
  assert.equal(JSON.stringify(fs.readFileSync(options.file,'utf8')).includes(row.email),false);
});
test('missing authentication and unconfirmed HTTP 200 never mark a request delivered',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zemi-delivery-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  let calls=0;
  const options={url:'https://n8n.r21digital.com/webhook/test',file:path.join(dir,'sent.json'),readRows:()=>[{email:'test@example.invalid',at:'2026-10-07'}],fetchImpl:async()=>{calls++;return{ok:true,json:async()=>({})}}};
  await createTesterDelivery(options)();assert.equal(calls,0);
  const delivery=createTesterDelivery({...options,secret:'s'.repeat(64)});
  await delivery();await delivery();assert.equal(calls,2);assert.equal(fs.existsSync(options.file),false);
});
test('the batch limit counts pending rows, so signup 301 is still delivered once the first 300 are acknowledged (Codex r2 #7)',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zemi-delivery-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const rows=Array.from({length:301},(_,i)=>({at:'2026-10-07T00:00:00Z',firstName:'T',lastName:String(i),email:`t${i}@example.invalid`}));
  const crypto=await import('node:crypto');
  const acked=rows.slice(0,300).map(r=>crypto.createHash('sha256').update(`${r.email}|${r.at}`).digest('hex'));
  fs.writeFileSync(path.join(dir,'sent.json'),JSON.stringify(acked));
  const bodies=[];
  await createTesterDelivery({url:'https://n8n.r21digital.com/webhook/test',secret:'s'.repeat(64),file:path.join(dir,'sent.json'),readRows:()=>rows,
    fetchImpl:async(_u,o)=>{bodies.push(JSON.parse(o.body));return {ok:true,json:async()=>({ok:true})};}})();
  assert.equal(bodies.length,1);
  assert.equal(bodies[0].email,'t300@example.invalid');
});
