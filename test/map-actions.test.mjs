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
 vm.createContext(context);vm.runInContext(source,context);
 await context.applyMapActions([{type:'show_places',town:'Ponce',places:[{id:'verified'}]},
  {type:'open_place',town:'Ponce',place:{id:'verified'}},{type:'fly_town',town:'Ponce'}]);
 assert.deepEqual(events,['town','places','card']);
});
test('a separate voice town flight preserves an already open business card',async()=>{
 const events=[];
 const context={byName:new Map([['Ponce',{}]]),pickedId:'Ponce',step:'place',
  select:async()=>events.push('reset'),frameWholeTown:()=>events.push('reframe'),showCatalog(){},openFoundPlace(){},
  syncAnswerCards(){}};
 vm.createContext(context);vm.runInContext(source,context);
 await context.applyMapActions([{type:'fly_town',town:'Ponce'}]);
 assert.deepEqual(events,[]);
});
test('two place lists in one answer merge into one list, so the place the answer names stays on the panel',async()=>{
 const shown=[];
 const context={byName:new Map([['Ponce',{}]]),pickedId:null,step:'island',
  select:async town=>{context.pickedId=town;context.step='town';},
  frameWholeTown:()=>{},showCatalog:data=>shown.push(data),openFoundPlace:async()=>{},
  syncAnswerCards(){}};
 vm.createContext(context);vm.runInContext(source,context);
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
