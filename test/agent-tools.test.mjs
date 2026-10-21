import test from 'node:test';
import assert from 'node:assert/strict';
import { agentTools } from '../server/agent-tools.mjs';
import { fold } from '../server/lib.mjs';
test('name lookup folds accented input and empty results do not reset the map',async()=>{
  let upstream=0;
  const place={id:'11111111-1111-1111-1111-111111111111',name:'Café Don Juan'};
  const registry=agentTools({towns:['Ponce'],categories:[],catalogFor:async()=>({places:[place]}),
    placeMatches:(p,q)=>fold(p.name).includes(q),qlooSearchRaw:async()=>{upstream++;return[]},publishPlace:p=>p});
  const find=registry.find(t=>t.name==='find_places');
  const found=await find.run({town:'Ponce',query:'Café Don Juan',mode:'name'});
  assert.equal(found.data.count,1);assert.equal(upstream,0);
  const empty=await find.run({town:'Ponce',query:'missing',mode:'name'});
  assert.equal(empty.action,undefined);
});

test('town taste searches never label island fallback results as local places',async()=>{
  const local={name:'Ponce café',city:'Ponce'};
  const other={name:'Island café',city:'Aguadilla'};
  const registry=agentTools({towns:['Ponce'],categories:[],
    tasteAnswer:async()=>({town:'Puerto Rico',places:[other,local],note:'Island fallback'}),
    inTown:(p,t)=>p.city===t});
  const result=await registry.find(t=>t.name==='find_places').run({town:'Ponce',query:'coffee',mode:'taste'});
  assert.deepEqual(result.data.places.map(p=>p.name),['Ponce café']);
  assert.deepEqual(result.action.places,[local]);
});

const bakeryFile={industry:'bakery',medians:{taste:.4,perTenThousand:.6},sources:{qloo:{retrievedAt:'2026-10-11T07:13:59.194Z'}},
  notes:{en:['Taste compared with existing businesses. Not a measure of demand, revenue or profit.'],es:['Gusto comparado.']},
  towns:[{town:'San Juan',group:'gap',tasteRank:5,perTenThousand:.5,perTenThousandMax:.5,suppressed:false},{town:'Vieques',group:'gap',tasteRank:1,perTenThousand:0,perTenThousandMax:2.1,suppressed:true},
    {town:'Ponce',group:'quiet',tasteRank:30,perTenThousand:.4},{town:'Culebra',group:'unknown',tasteRank:null,perTenThousand:0},
    {town:'Caguas',group:'competitive',tasteRank:2,perTenThousand:1.2},{town:'Aibonito',group:'crowded',tasteRank:60,perTenThousand:2}]};
test('opportunity_map groups towns and lists the top gaps by taste rank',async()=>{
  const tool=agentTools({towns:['Ponce'],categories:[],opportunityFor:id=>id==='bakery'?bakeryFile:null}).find(t=>t.name==='opportunity_map');
  assert.deepEqual(tool.parameters.properties.industry.enum,['cafe','bakery','restaurant','bar','hotel','salon']);
  const out=await tool.run({industry:'bakery'});
  assert.deepEqual(out.data.groups,{gap:['Vieques','San Juan'],competitive:['Caguas'],quiet:['Ponce'],crowded:['Aibonito'],unknown:['Culebra']});
  assert.deepEqual(out.data.topGaps,[{town:'Vieques',tasteRank:1,suppressed:true,perTenThousand:0,perTenThousandMax:2.1},{town:'San Juan',tasteRank:5,suppressed:false,perTenThousand:.5,perTenThousandMax:.5}]);
  assert.equal(out.data.source,'Qloo heatmap · Census County Business Patterns 2023 · Census PRCS 2020–2024');
  assert.deepEqual(out.data.notes,bakeryFile.notes.en);
  assert.deepEqual(out.data.medians,bakeryFile.medians);
  assert.equal(out.data.retrievedAt,'2026-10-11T07:13:59.194Z','the drawer shows when the heatmap was read');
  assert.deepEqual(out.action,{type:'show_opportunity',industry:'bakery'});
});
test('opportunity_map reports a missing build as an error',async()=>{
  const tool=agentTools({towns:['Ponce'],categories:[],opportunityFor:()=>null}).find(t=>t.name==='opportunity_map');
  assert.deepEqual(await tool.run({industry:'hotel'}),{error:'Opportunity data is unavailable for this industry.'});
});

test('a harness error envelope becomes an error result, never a successful Qloo line',async()=>{
  const registry=agentTools({towns:['Ponce'],categories:[],callQloo:async()=>({status:'error',error:{message:'provider outage'}})});
  const out=await registry.find(t=>t.name==='qloo_describe').run({query:'Bad Bunny',type:'artist'});
  assert.equal(typeof out.error,'string');assert.doesNotMatch(out.error,/outage/);assert.equal(out.source,undefined);
  const ok=agentTools({towns:['Ponce'],categories:[],callQloo:async()=>({status:'ok',results:[{name:'x'}]})});
  assert.equal((await ok.find(t=>t.name==='qloo_describe').run({query:'Bad Bunny',type:'artist'})).source,'Qloo');
});

test('town_catalog tool results include structured card fields without dropping older keys',async()=>{
  const place={id:'11111111-1111-1111-1111-111111111111',name:'Café',municipality:'Ponce',genre:'Cafe',
    category:'food',lat:18.01,lon:-66.61,logo:'https://l.png',qlooImage:'https://q.jpg',website:'https://cafe.pr',
    domain:'cafe.pr',affinity:0.81,why:'Strong match for Bad Bunny fans (81%)',address:'1 Main',description:'Nice',
    price:'$',rating:4.5,hours:'Today 8–4',facts:[{label:'Phone',text:'1'}]};
  const registry=agentTools({towns:['Ponce'],categories:['food'],catalogFor:async()=>({places:[place],measured:'2026-10-12'}),
    byPopularity:()=>0,publishPlace:p=>p});
  const out=await registry.find(t=>t.name==='town_catalog').run({town:'Ponce',category:'food'});
  const row=out.data.places[0];
  assert.equal(row.id,place.id);
  assert.equal(row.category,'food');
  assert.equal(row.lat,18.01);
  assert.equal(row.logo,'https://l.png');
  assert.equal(row.why,'Strong match for Bad Bunny fans (81%)');
  assert.equal(row.website,'https://cafe.pr');
  assert.equal(row.kind,'Cafe');
  assert.equal(row.town,'Ponce');
  assert.deepEqual(out.action.places,[place]);
});

test('compact fills why from a real affinity signal and never invents one',async()=>{
  const withSignal={id:'11111111-1111-1111-1111-111111111111',name:'Café',municipality:'Ponce',genre:'Cafe',
    category:'food',affinity:0.81,affinitySignal:'Bad Bunny',whyLang:'en',facts:[]};
  const esSignal={...withSignal,id:'22222222-2222-2222-2222-222222222222',whyLang:'es'};
  const low={...withSignal,id:'33333333-3333-3333-3333-333333333333',affinity:0.12,why:''};
  const bare={...withSignal,id:'44444444-4444-4444-4444-444444444444',affinity:null,affinitySignal:'',why:'',whyLang:''};
  const registry=agentTools({towns:['Ponce'],categories:['food'],catalogFor:async()=>({places:[withSignal,esSignal,low,bare],measured:'2026-10-12'}),
    byPopularity:()=>0,publishPlace:p=>p});
  const out=await registry.find(t=>t.name==='town_catalog').run({town:'Ponce',category:'food'});
  assert.equal(out.data.places[0].why,'Strong match for Bad Bunny fans (81%)');
  assert.equal(out.data.places[1].why,'Fuerte afinidad para fans de Bad Bunny (81%)');
  assert.equal(out.data.places[2].why,'');
  assert.equal(out.data.places[3].why,'');
});
