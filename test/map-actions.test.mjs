import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const source=html.match(/async function applyMapActions\([\s\S]*?\n}\n/)[0];
test('a later town flight cannot replace the agent list or business card',async()=>{
 const events=[];
 const context={byName:new Map([['Ponce',{}]]),pickedId:null,step:'island',
  select:async town=>{events.push('town');context.pickedId=town;context.step='town';},
  frameWholeTown:()=>{},showCatalog:()=>events.push('places'),openFoundPlace:async()=>events.push('card'),
  syncAnswerCards(){}};
 vm.createContext(context);vm.runInContext('var keepOpportunity=false;'+source,context);
 await context.applyMapActions([{type:'show_places',town:'Ponce',places:[{id:'verified'}]},
  {type:'open_place',town:'Ponce',place:{id:'verified'}},{type:'fly_town',town:'Ponce'}]);
 assert.deepEqual(events,['town','places','card']);
});
test('a separate voice town flight preserves an already open business card',async()=>{
 const events=[];
 const context={byName:new Map([['Ponce',{}]]),pickedId:'Ponce',step:'place',
  select:async()=>events.push('reset'),frameWholeTown:()=>events.push('reframe'),showCatalog(){},openFoundPlace(){},
  syncAnswerCards(){}};
 vm.createContext(context);vm.runInContext('var keepOpportunity=false;'+source,context);
 await context.applyMapActions([{type:'fly_town',town:'Ponce'}]);
 assert.deepEqual(events,[]);
});
test('an opportunity answer opens the town it names and keeps the island colors (judge panel 10/24 round 4)',async()=>{
 const events=[];const panel={hidden:false};
 const context={byName:new Map([['Ponce',{}],['San Juan',{}]]),pickedId:'Ponce',step:'town',
  select:async(town,opts)=>{events.push(['select',town,Boolean(opts?.keepOpportunity)]);context.pickedId=town;context.step='town';},
  frameWholeTown:()=>{},showCatalog(){},openFoundPlace:async()=>{},
  opportunityUI:{show:async id=>{events.push(['show',id]);panel.hidden=false;}},$:id=>{assert.equal(id,'opportunity-panel');return panel;},
  syncAnswerCards(){}};
 vm.createContext(context);vm.runInContext(source,context);
 await context.applyMapActions([{type:'show_opportunity',industry:'bakery',town:'San Juan'}]);
 assert.deepEqual(events,[['show','bakery'],['select','San Juan',true]],'the colors load, then the town opens without leaving the opportunity');
 assert.equal(panel.hidden,true,'the industry selector gives way to the town view');
 // No town on the action while a town is open (an island or comparison answer): the selector stays, nothing moves.
 events.length=0;panel.hidden=false;
 await context.applyMapActions([{type:'show_opportunity',industry:'bakery',towns:['Ponce','San Juan']}]);
 assert.deepEqual(events,[['show','bakery']]);
 assert.equal(panel.hidden,false,'a comparison keeps the selector (Codex review 10/25)');
 // No town on the action from the island: the same.
 events.length=0;context.pickedId=null;context.step='island';
 await context.applyMapActions([{type:'show_opportunity',industry:'bakery'}]);
 assert.deepEqual(events,[['show','bakery']]);
 assert.equal(panel.hidden,false);
 // A flight the server added ahead of a town-less opportunity action opens that town under the colors.
 events.length=0;
 await context.applyMapActions([{type:'fly_town',town:'San Juan'},{type:'show_opportunity',industry:'bakery'}]);
 assert.deepEqual(events,[['select','San Juan',true],['show','bakery']]);
 assert.equal(panel.hidden,true);
 // The target town is open but a place dossier from an older answer is on screen: the town view returns under the answer.
 events.length=0;panel.hidden=false;context.step='place';
 await context.applyMapActions([{type:'show_opportunity',industry:'bakery',town:'San Juan'}]);
 assert.deepEqual(events,[['show','bakery'],['select','San Juan',true]]);
 assert.equal(panel.hidden,true);
 // The same answer opened a place: the dossier stays (Codex review 10/25).
 events.length=0;context.step='place';
 await context.applyMapActions([{type:'open_place',town:'San Juan',place:{id:'p'}},{type:'show_opportunity',industry:'bakery',town:'San Juan'}]);
 assert.deepEqual(events,[['show','bakery']]);
 // A voice frame never reloads the open town: its earlier frame may have shown the cards.
 events.length=0;context.step='town';
 await context.applyMapActions([{type:'show_opportunity',industry:'bakery',town:'San Juan'}],'',{reload:false});
 assert.deepEqual(events,[['show','bakery']]);
 // A same-town flight only reframes; it does not count as a reload, so the stale cards still go.
 events.length=0;
 await context.applyMapActions([{type:'fly_town',town:'San Juan'},{type:'show_opportunity',industry:'bakery',town:'San Juan'}]);
 assert.deepEqual(events,[['show','bakery'],['select','San Juan',true]]);
 // The open town, no list of its own: the catalog reloads so the previous industry's cards go (judge panel 10/25).
 events.length=0;panel.hidden=false;context.step='town';
 await context.applyMapActions([{type:'show_opportunity',industry:'bakery',town:'San Juan'}]);
 assert.deepEqual(events,[['show','bakery'],['select','San Juan',true]]);
 // With its own list the list wins and the town is not reloaded.
 events.length=0;
 await context.applyMapActions([{type:'show_places',town:'San Juan',places:[{id:'a',name:'Bakery'}]},{type:'show_opportunity',industry:'bakery',town:'San Juan'}]);
 assert.deepEqual(events,[['show','bakery']]);
});
test('two place lists in one answer merge into one list, so the place the answer names stays on the panel',async()=>{
 const shown=[];
 const context={byName:new Map([['Ponce',{}]]),pickedId:null,step:'island',
  select:async town=>{context.pickedId=town;context.step='town';},
  frameWholeTown:()=>{},showCatalog:data=>shown.push(data),openFoundPlace:async()=>{},
  syncAnswerCards(){}};
 vm.createContext(context);vm.runInContext('var keepOpportunity=false;'+source,context);
 await context.applyMapActions([
  {type:'show_places',town:'Ponce',places:[{id:'a',name:'Melao Coffee Shop'},{id:'b',name:'Museo'}],focus:'Bad Bunny fans'},
  {type:'fly_town',town:'Ponce'},
  {type:'show_places',town:'Ponce',places:[{id:'c',name:'Campioni'},{id:'a',name:'Melao Coffee Shop'}],focus:'Food in Ponce'}],
  'The one food match is Melao Coffee Shop.');
 assert.equal(shown.length,1,'one panel, not the last list winning');
 assert.deepEqual(shown[0].places.map(p=>p.id),['a','b','c'],'union in first-seen order, no duplicates');
 assert.equal(shown[0].focus,'Bad Bunny fans','the first list names the answer');
 assert.equal(shown[0].speech,'The one food match is Melao Coffee Shop.');
});
