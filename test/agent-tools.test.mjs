import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { agentTools, catalogOnly, withoutQloo, CATALOG_ONLY_TOOLS } from '../server/agent-tools.mjs';
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
  assert.deepEqual(out.data.topGaps,[{town:'Vieques',tasteRank:1,suppressed:true,perTenThousand:null,perTenThousandMax:2.1},{town:'San Juan',tasteRank:5,suppressed:false,perTenThousand:.5,perTenThousandMax:.5}]);
  assert.equal(out.data.source,'Qloo heatmap · Census County Business Patterns 2023 · Census PRCS 2020–2024');
  assert.deepEqual(out.data.notes,bakeryFile.notes.en);
  assert.deepEqual(out.data.medians,bakeryFile.medians);
  assert.equal(out.data.retrievedAt,'2026-10-11T07:13:59.194Z','the drawer shows when the heatmap was read');
  assert.deepEqual(out.action,{type:'show_opportunity',industry:'bakery'});
});
test('opportunity_map with towns says which town has fewer businesses per resident, so the model never works it out', async () => {
  const file = { ...bakeryFile, towns: bakeryFile.towns.map(row => ({ ...row, population: 100000, establishments: row.town === 'Caguas' ? 7 : 12, perTenThousand: row.town === 'Caguas' ? 0.72 : 1.22 })) };
  const tool = agentTools({ towns: ['Caguas', 'Ponce'], categories: [], opportunityFor: id => id === 'bakery' ? file : null }).find(t => t.name === 'opportunity_map');
  assert.equal(tool.parameters.properties.towns.maxItems, 4);
  const out = await tool.run({ industry: 'bakery', towns: ['Ponce', 'Caguas'] });
  assert.equal(out.data.comparison.fewerPerResident, 'Caguas');
  assert.equal(out.data.comparison.morePerResident, 'Ponce');
  assert.deepEqual(out.data.comparison.towns.map(r => [r.town, r.establishments]), [['Caguas', 7], ['Ponce', 12]], 'the count travels with the row, so the model never calls it unpublished');
  assert.match(out.data.comparison.sentence, /^bakery businesses per resident, lowest first: Caguas \(7 establishments with employees, 0\.72 per 10,000, competitive\); Ponce \(12 establishments with employees, 1\.22 per 10,000, quiet\)\. Ponce has more bakery businesses per resident than Caguas\. Repeat this as given; never recompute it\.$/);
  assert.equal(out.data.comparison.sentenceEs, 'Negocios de panadería por residente, de menor a mayor: Caguas (7 establecimientos con empleados, 0.72 por cada 10,000, competido); Ponce (12 establecimientos con empleados, 1.22 por cada 10,000, tranquilo). Ponce tiene más negocios de panadería por residente que Caguas. Repita esto tal cual; nunca lo recalcule.');
  // A suppressed town is a range: it overlaps a published rate inside it (no direction), not one above it.
  const vieques = await tool.run({ industry: 'bakery', towns: ['Vieques', 'Caguas'] });
  assert.match(vieques.data.comparison.sentence, /Vieques \(no published count, 0 to 2\.1 per 10,000, a gap\)/);
  assert.match(vieques.data.comparison.sentence, /Caguas and Vieques cannot be ordered: a withheld count may be below or above the other town's rate\./);
  assert.match(vieques.data.comparison.sentenceEs, /Vieques \(sin cifra publicada, de 0 a 2\.1 por cada 10,000, brecha\)\. Caguas y Vieques no se pueden ordenar/);
  assert.equal(vieques.data.comparison.fewerPerResident, null);
  const above = { ...file, towns: file.towns.map(row => (row.town === 'Ponce' ? { ...row, perTenThousand: 3.4 } : row)) };
  const vp = await agentTools({ towns: [], categories: [], opportunityFor: () => above }).find(t => t.name === 'opportunity_map').run({ industry: 'bakery', towns: ['Ponce', 'Vieques'] });
  assert.match(vp.data.comparison.sentence, /Ponce has more bakery businesses per resident than Vieques\./);
  // Equal published rates are equal, not ordered; a town with no figure is left out.
  const same = { ...file, towns: file.towns.map(row => (row.town === 'Ponce' ? { ...row, perTenThousand: 0.72 } : row)) };
  const eq = await agentTools({ towns: [], categories: [], opportunityFor: () => same }).find(t => t.name === 'opportunity_map').run({ industry: 'bakery', towns: ['Ponce', 'Caguas'] });
  assert.match(eq.data.comparison.sentence, /Caguas and Ponce have the same bakery businesses per resident\./);
  assert.equal(eq.data.comparison.morePerResident, null);
  const blank = { ...file, towns: file.towns.map(row => (row.town === 'Ponce' ? { ...row, suppressed: false, perTenThousand: null, perTenThousandMax: null } : row)) };
  assert.equal((await agentTools({ towns: [], categories: [], opportunityFor: () => blank }).find(t => t.name === 'opportunity_map').run({ industry: 'bakery', towns: ['Ponce', 'Caguas'] })).data.comparison, undefined);
  assert.equal((await tool.run({ industry: 'bakery', towns: ['Caguas', 'Nowhere'] })).data.comparison, undefined);
  assert.equal((await tool.run({ industry: 'bakery' })).data.comparison, undefined);
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
    domain:'cafe.pr',affinity:0.81,why:'Strong match for Bad Bunny fans (affinity 81/100)',address:'1 Main',description:'Nice',
    price:'$',rating:4.5,hours:'Today 8–4',facts:[{label:'Phone',text:'1'}]};
  const registry=agentTools({towns:['Ponce'],categories:['food'],catalogFor:async()=>({places:[place],measured:'2026-10-12'}),
    byPopularity:()=>0,publishPlace:p=>p});
  const out=await registry.find(t=>t.name==='town_catalog').run({town:'Ponce',category:'food'});
  const row=out.data.places[0];
  assert.equal(row.id,place.id);
  assert.equal(row.category,'food');
  assert.equal(row.lat,18.01);
  assert.equal(row.logo,'https://l.png');
  assert.equal(row.why,'Strong match for Bad Bunny fans (affinity 81/100)');
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
  assert.equal(out.data.places[0].why,'Strong match for Bad Bunny fans (affinity 81/100)');
  assert.equal(out.data.places[1].why,'Fuerte afinidad para fans de Bad Bunny (81 de 100)');
  assert.equal(out.data.places[2].why,'');
  assert.equal(out.data.places[3].why,'');
});


// Judge panel 10/23: "where do fans eat" showed a school and a hotel as strong matches, and the evidence
// line said 8 places while 14 cards were on screen.
test('artist_places can keep one category and the map action lists the same places as the evidence', async () => {
  const places = [
    { id: 'a', name: 'La Victoria', genreId: 'urn:tag:genre:place:restaurant', genre: 'Restaurant', category: 'food' },
    { id: 'b', name: 'Colegio San Ignacio', genreId: 'urn:tag:genre:place:school', genre: 'School', category: 'other' },
    { id: 'c', name: 'Old San Juan Hotel', genreId: 'urn:tag:genre:place:hotel', genre: 'Hotel', category: 'stay' },
    ...Array.from({ length: 11 }, (_, i) => ({ id: `f${i}`, name: `Food ${i}`, genreId: 'urn:tag:genre:place:restaurant', genre: 'Restaurant', category: 'food' })),
  ];
  const registry = agentTools({ towns: ['San Juan'], categories: [], artistAnswer: async () => ({ places, note: 'affinities' }) });
  const tool = registry.find(t => t.name === 'artist_places');
  assert.deepEqual(tool.parameters.properties.category.enum, ['food', 'drinks', 'stay', 'groceries', 'shopping', 'fun', 'outdoors', 'culture', 'health', 'other']);
  const all = await tool.run({ town: 'San Juan', artist: 'Bad Bunny' });
  assert.equal(all.data.places.length, 8);
  assert.equal(all.action.places.length, 8, 'the cards on screen are the places in the evidence line');
  const food = await tool.run({ town: 'San Juan', artist: 'Bad Bunny', category: 'food' });
  assert.ok(food.data.places.every(p => p.category === 'food'));
  assert.ok(!food.action.places.some(p => p.name === 'Colegio San Ignacio'));
  assert.equal(food.data.category, 'food');
});

test('opportunity_map with a town returns that town’s row beside the island figure', async () => {
  const file = { ...bakeryFile, towns: bakeryFile.towns.map(row => ({ ...row, population: 100000, establishments: row.town === 'San Juan' ? 16 : 5 })) };
  const tool = agentTools({ towns: ['San Juan'], categories: [], opportunityFor: id => id === 'bakery' ? file : null }).find(t => t.name === 'opportunity_map');
  const out = await tool.run({ industry: 'bakery', town: 'San Juan' });
  assert.equal(out.data.town.town, 'San Juan');
  assert.equal(out.data.town.group, 'gap');
  assert.equal(out.data.town.establishments, 16);
  assert.equal(out.data.town.perTenThousand, 0.5);
  assert.ok(Math.abs(out.data.town.islandPerTenThousand - 41 / 600000 * 10000) < 1e-9);
  assert.equal(out.data.town.ranked, 5);
  assert.match(out.data.town.reading, /^San Juan is a gap for bakery: taste rank 5 of 5; 16 establishments with employees, 0\.5 per 10,000 residents against (?:the median of [\d.]+ the groups split on \(island average 0\.68\)|0\.68 island-wide)\. Taste above the median, few businesses per resident/);
  assert.doesNotMatch(out.data.town.reading, /strong taste/i);
  assert.deepEqual(out.action, { type: 'show_opportunity', industry: 'bakery', town: 'San Juan' }, 'the action names the town asked about');
  const withheld = await tool.run({ industry: 'bakery', town: 'Vieques' });
  assert.equal(withheld.data.town.perTenThousand, null, 'a withheld count is never a rate of zero');
  assert.equal(withheld.data.town.perTenThousandMax, 2.1);
  assert.match(withheld.data.town.reading, /5 published plus one withheld code \(the Census withholds a code's count below 3\), so 5 to 7 establishments in all/, 'a partly published count says so (Codex review 10/25 round 6)');
  const unranked = await tool.run({ industry: 'bakery', town: 'Culebra' });
  assert.match(unranked.data.town.reading, /no taste rank \(Qloo has no heatmap signal here, so no position among the ranked towns\)/);
  assert.doesNotMatch(unranked.data.town.reading, /of \d+;/);
  const missing = await tool.run({ industry: 'bakery', town: 'Lares' });
  assert.equal(missing.data.town, null);
});

test('the catalog-only control keeps Qloo places and loses every affinity tool', () => {
  const names = ['map_town', 'town_catalog', 'find_places', 'place_details', 'place_audience', 'fans_also_love', 'artist_places', 'town_profile', 'landmarks', 'town_history', 'qloo_describe', 'qloo_recommend', 'qloo_compare_audiences', 'qloo_entity_tags', 'qloo_trends', 'opportunity_map', 'town_weather'];
  const kept = catalogOnly(names.map((name) => ({ name }))).map((t) => t.name);
  assert.deepEqual(kept.sort(), [...CATALOG_ONLY_TOOLS].sort());
  for (const gone of ['artist_places', 'fans_also_love', 'place_audience', 'qloo_recommend', 'qloo_compare_audiences', 'qloo_entity_tags', 'qloo_trends', 'town_profile', 'opportunity_map', 'qloo_describe']) assert.ok(!kept.includes(gone), gone);
});

test('place_audience returns the age and gender leans the card shows, from a verified catalog id (judge panel 10/25 round 7)', async () => {
  const place = { id: 'q1', name: 'Panadería Don Nico', category: 'food' };
  const calls = [];
  const registry = agentTools({ towns: ['Río Grande'], categories: [], catalogFor: async () => ({ places: [place] }), publishPlace: p => p,
    callQloo: async (name, args) => { calls.push([name, args]); return { status: 'ok', results: [{ query: { age: { '24_and_younger': 0.21, '35_to_44': -0.1 }, gender: { female: 0.12, male: -0.12 } } }] }; } });
  const tool = registry.find(t => t.name === 'place_audience');
  assert.ok(tool, 'the tool is registered');
  const out = await tool.run({ town: 'Río Grande', id: 'q1' });
  assert.deepEqual(calls, [['qloo_audience_demographics', { entity: 'q1', entity_type: 'place' }]]);
  assert.equal(out.data.place, 'Panadería Don Nico');
  assert.equal(out.data.status, 'ok');
  assert.ok(out.data.age.length >= 1 && out.data.gender.length === 2, JSON.stringify(out.data));
  assert.match(out.data.note, /Not a customer count/);
  assert.deepEqual(await tool.run({ town: 'Río Grande', id: 'nope' }), { error: "Place is not in this town's verified catalog." });
  assert.ok(!withoutQloo(registry).some(t => t.name === 'place_audience'), 'the control run has no audience tool');
});

test('the public inventory counts the registry: 18 tools with weather, 13 through MCP (Codex review 10/25 round 7)', async () => {
  const { mcpTools } = await import('../server/mcp.mjs');
  const registry = agentTools({ towns: ['Ponce'], categories: [], weather: {}, catalogFor: async () => ({ places: [] }), publishPlace: p => p, callQloo: async () => ({ status: 'empty' }) });
  assert.equal(registry.length, 18);
  assert.equal(mcpTools(registry).length, 13);
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /18 read-only tools/);
  assert.match(readme, /13 of the app's 18 read-only tools \(all but map_town, town_weather,\s+qloo_trends, place_audience and artist_towns\)/);
  assert.doesNotMatch(readme, /1[67] read-only tools/);
});

test('artist_towns ranks towns island-wide and leaves the map to the model; the controls never get it (judge panel 10/25 round 8)', async () => {
  const registry = agentTools({ towns: ['Vieques', 'Ponce'], categories: [], catalogFor: async () => ({ places: [] }), publishPlace: p => p,
    artistTowns: async (artist) => artist === 'Björk'
      ? { artist: 'Björk', ranked: 35, retrievedAt: '2026-10-25T23:00:00.000Z', towns: [{ town: 'Vieques', rank: 1, cells: 21 }, { town: 'Ponce', rank: 2, cells: 8, thin: true }] }
      : { error: 'Qloo has no artist named Nobody.' } });
  const tool = registry.find(t => t.name === 'artist_towns');
  const out = await tool.run({ artist: 'Björk' });
  assert.equal(out.data.source, 'Qloo heatmap');
  assert.deepEqual(out.data.towns.map(t => t.town), ['Vieques', 'Ponce']);
  assert.match(out.data.note, /not visits, sales or demand/);
  assert.equal(out.action, undefined, 'a thin first row (Maricao for Marc Anthony, five cells) is not where the answer leads');
  assert.match(out.data.note, /Call map_town for the town you lead with/);
  assert.deepEqual(await tool.run({ artist: 'Nobody' }), { error: 'Qloo has no artist named Nobody.' });
  assert.ok(!withoutQloo(registry).some(t => t.name === 'artist_towns'));
  assert.ok(!catalogOnly(registry).some(t => t.name === 'artist_towns'));
});
