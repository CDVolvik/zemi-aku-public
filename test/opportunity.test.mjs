import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fold } from '../server/lib.mjs';
import { INDUSTRIES, townOfPoint, cbpCounts, tasteByTown, groupTowns, buildIndustry, createOpportunity, industryOf } from '../server/opportunity.mjs';

// GeoJSON order is [lon, lat]. Alfa is a 4x4 square with a 1x1 hole; Isla is two separate squares.
const square=(x,y,s=1)=>[[x,y],[x+s,y],[x+s,y+s],[x,y+s],[x,y]];
const features=[
  {properties:{NAME:'Alfa Municipio',COUNTY:'001'},geometry:{type:'Polygon',coordinates:[square(0,0,4),square(1,1)]}},
  {properties:{NAME:'Isla Municipio',COUNTY:'147'},geometry:{type:'MultiPolygon',coordinates:[[square(10,0)],[square(12,0)]]}},
];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('INDUSTRIES lists the six approved industries with their Qloo tags and Census codes',()=>{
  assert.deepEqual(INDUSTRIES.map(i=>i.id),['cafe','bakery','restaurant','bar','hotel','salon']);
  const by=Object.fromEntries(INDUSTRIES.map(i=>[i.id,i]));
  assert.equal(by.cafe.tag,'urn:tag:genre:place:restaurant:cafe');
  assert.equal(by.bakery.tag,'urn:tag:genre:place:restaurant:bakery');
  assert.equal(by.restaurant.tag,'urn:tag:genre:place:restaurant');
  assert.equal(by.bar.tag,'urn:tag:genre:place:restaurant:bar');
  assert.equal(by.hotel.tag,'urn:tag:genre:place:hotel');
  assert.equal(by.salon.tag,'urn:tag:genre:place:beauty_salon');
  assert.deepEqual(by.restaurant.naics,['722511','722513']);
  assert.deepEqual(by.salon.naics,['812112'],'nail salons (812113) are published in 3 towns only, so summing them adds a 0–2 range to 75 towns');
  assert.deepEqual(by.bakery.label,{en:'bakery',es:'panadería'});
});

test('townOfPoint finds a polygon town, a multipolygon island town and nothing offshore',()=>{
  assert.equal(townOfPoint(features,0.5,0.5),'001');
  assert.equal(townOfPoint(features,1.5,1.5),null,'a point in a hole belongs to no town');
  assert.equal(townOfPoint(features,0.5,10.5),'147');
  assert.equal(townOfPoint(features,0.5,12.5),'147');
  assert.equal(townOfPoint(features,0.5,11.5),null,'a point between the islands is sea');
});

test('joins all 78 towns on the Census county code',t=>{
  const censusDir=new URL('../cache/census/',import.meta.url);
  // A fresh clone has the folder (tracked .gitkeep) but no files: skip there too.
  if(!fs.existsSync(censusDir)||!fs.readdirSync(censusDir).some(f=>f.endsWith('.json'))){t.skip('cache/census is not built here');return}
  const geo=JSON.parse(fs.readFileSync(new URL('../app/data/municipios.geojson',import.meta.url),'utf8'));
  const counties=new Set(geo.features.map(f=>f.properties.COUNTY));
  const towns=JSON.parse(fs.readFileSync(new URL('../data/catalog-counts.json',import.meta.url),'utf8')).towns;
  const misses=towns.filter(({town})=>{
    const file=new URL(`${fold(town).replace(/ /g,'-')}.json`,censusDir);
    return !fs.existsSync(file)||!counties.has(JSON.parse(fs.readFileSync(file,'utf8')).fips.slice(2));
  });
  assert.equal(towns.length,78);
  assert.deepEqual(misses.map(t=>t.town),[]);
});

test('cbpCounts sums NAICS responses and leaves absent municipios out',()=>{
  const header=['NAME','ESTAB','EMP','NAICS2017','state','county'];
  const a=[header,['Ponce Municipio, Puerto Rico','10','100','722511','72','113']];
  const b=[header,['Ponce Municipio, Puerto Rico','5','40','722513','72','113'],['Adjuntas Municipio, Puerto Rico','1','3','722513','72','001']];
  const m=cbpCounts([a,b]);
  assert.deepEqual(m.get('113'),{establishments:15,employees:140,published:2});
  assert.deepEqual(m.get('001'),{establishments:1,employees:3,published:1});
  assert.equal(m.get('021'),undefined);
  assert.throws(()=>cbpCounts([[['NAME','EMP'],['x','1']]]));
});

test('tasteByTown averages cell affinity per town and drops offshore cells',()=>{
  const cell=(lat,lon,affinity)=>({location:{latitude:lat,longitude:lon},query:{affinity}});
  const m=tasteByTown([cell(0.5,0.5,0.2),cell(3,3,0.4),cell(0.5,3.5,0.6),cell(0.5,11.5,0.9),cell(0.5,0.6,undefined)],features);
  near(m.get('001').taste,0.4);
  assert.equal(m.get('001').cells,3);
  assert.equal(m.size,1);
});

test('groupTowns splits at the medians, ranks taste and marks thin towns unknown',()=>{
  const towns=['A','B','C','D','E','F'].map((town,i)=>({town,county:String(i+1).padStart(3,'0'),population:10000}));
  const taste=new Map([['001',{taste:.9,cells:10}],['002',{taste:.9,cells:10}],['003',{taste:.1,cells:10}],
    ['004',{taste:.1,cells:10}],['005',{taste:.5,cells:4}],['006',{taste:.5,cells:10}]]);
  const supply=new Map([['001',{establishments:1,employees:5,published:1}],['002',{establishments:9,employees:50,published:1}],
    ['003',{establishments:1,employees:5,published:1}],['004',{establishments:9,employees:50,published:1}],['006',{establishments:5,employees:20,published:1}]]);
  const {towns:rows,medians}=groupTowns({towns,taste,supply,codes:1});
  const by=Object.fromEntries(rows.map(r=>[r.town,r]));
  assert.deepEqual(medians,{taste:.5,perTenThousand:5});
  assert.equal(by.A.group,'gap');assert.equal(by.B.group,'competitive');
  assert.equal(by.C.group,'quiet');assert.equal(by.D.group,'crowded');
  assert.equal(by.F.group,'competitive','a town exactly at both medians counts as high on both');
  assert.equal(by.E.group,'unknown');assert.equal(by.E.taste,null);assert.equal(by.E.tasteRank,null);
  assert.equal(by.E.establishments,0);assert.equal(by.E.perTenThousand,0);
  assert.equal(by.A.tasteRank,1);assert.equal(by.F.tasteRank,3);
  const published=new Map(['001','002','003','004'].map(c=>[c,{establishments:3,employees:9,published:1}]));
  const even=groupTowns({towns:towns.slice(0,4),taste:new Map([['001',{taste:.1,cells:9}],['002',{taste:.2,cells:9}],['003',{taste:.3,cells:9}],['004',{taste:.4,cells:9}]]),supply:published,codes:1});
  near(even.medians.taste,.25);
});

test('buildIndustry assembles a file from injected fetchers and refuses an empty heatmap',async()=>{
  const cells=n=>Array.from({length:n},(_,i)=>({location:{latitude:i%2?0.5:3.5,longitude:i<100?0.5+(i%3):10.5},query:{affinity:(i%10)/10}}));
  const asked=[];
  const fetchCbp=async naics=>{asked.push(naics);return[['NAME','ESTAB','EMP','NAICS2017','state','county'],['Alfa Municipio, Puerto Rico','4','30',naics,'72','001']];};
  const towns=[{town:'Alfa',county:'001',population:10000},{town:'Isla',county:'147',population:5000}];
  const now=()=>new Date('2026-10-11T12:00:00Z');
  const restaurant=INDUSTRIES.find(i=>i.id==='restaurant');
  const file=await buildIndustry({industry:restaurant,features,towns,fetchHeat:async()=>cells(120),fetchCbp,now});
  assert.equal(file.industry,'restaurant');
  assert.deepEqual(file.label,{en:'restaurant',es:'restaurante'});
  assert.deepEqual(asked,['722511','722513']);
  assert.deepEqual(file.sources.cbp,{vintage:2023,naics:['722511','722513']});
  assert.deepEqual(file.sources.qloo,{tag:'urn:tag:genre:place:restaurant',retrievedAt:'2026-10-11T12:00:00.000Z'});
  assert.equal(file.sources.census.period,'2020–2024');
  assert.equal(file.towns.length,2);
  assert.equal(file.towns.find(t=>t.town==='Alfa').establishments,8);
  assert.equal(file.notes.en[0],'Taste compared with existing businesses. Not a measure of demand, revenue or profit.');
  assert.ok(file.notes.en.includes("Taste data from the Qloo API (hackathon access). Affinities describe aggregate cultural patterns, not individuals. Rankings and interpretations are Zemi-Aku's."));
  assert.ok(file.notes.en.some(line=>line.includes('restaurant')&&line.includes('2026-10-11')));
  assert.equal(file.notes.es.length,file.notes.en.length);
  assert.match(file.rule,/median/);
  assert.ok(file.notes.en[1].includes('Census does not publish counts below 3'));
  assert.ok(file.notes.es[1].includes('no publica cifras menores de 3'));
  assert.equal(file.towns.find(t=>t.town==='Isla').suppressed,true);
  const bakery=INDUSTRIES.find(i=>i.id==='bakery');
  await assert.rejects(buildIndustry({industry:bakery,features,towns,fetchHeat:async()=>cells(6),fetchCbp,now}),/Qloo heatmap for bakery returned too few cells/);
});

test('a town without a published Census count is few only when even two businesses stay below the median',()=>{
  const town=(t,i,population=10000)=>({town:t,county:String(i+1).padStart(3,'0'),population});
  const towns=[town('A',0),town('B',1),town('C',2),town('D',3,4000),town('E',4)];
  const taste=new Map(towns.map((t,i)=>[t.county,{taste:[.1,.1,.9,.9,.1][i],cells:9}]));
  const supply=new Map([['001',{establishments:6,employees:30,published:1}],['002',{establishments:4,employees:20,published:1}],['005',{establishments:3,employees:9,published:1}]]);
  const {towns:rows,medians}=groupTowns({towns,taste,supply,codes:1});
  const by=Object.fromEntries(rows.map(r=>[r.town,r]));
  assert.equal(medians.perTenThousand,4,'the supply median uses towns with published counts');
  assert.equal(by.C.suppressed,true);assert.equal(by.C.establishments,0);assert.equal(by.C.establishmentsMax,2);
  assert.equal(by.C.perTenThousandMax,2);assert.equal(by.C.group,'gap','up to 2 per 10,000 is still below the median of 4');
  assert.equal(by.D.group,'unknown','2 businesses in 4,000 people would be 5 per 10,000, so its group cannot be told');
  assert.equal(by.D.tasteRank,2,'a town with taste data keeps its taste rank (ties with C, broken by name)');
  assert.equal(by.A.suppressed,false);assert.equal(by.A.establishmentsMax,6);
});

test('a summed industry with one code unpublished reports a range',()=>{
  const towns=[{town:'F',county:'010',population:10000},{town:'G',county:'011',population:10000}];
  const taste=new Map([['010',{taste:.5,cells:9}],['011',{taste:.5,cells:9}]]);
  const supply=new Map([['010',{establishments:10,employees:80,published:1}],['011',{establishments:20,employees:90,published:2}]]);
  const by=Object.fromEntries(groupTowns({towns,taste,supply,codes:2}).towns.map(r=>[r.town,r]));
  assert.equal(by.F.suppressed,true);assert.equal(by.F.establishments,10);assert.equal(by.F.establishmentsMax,12);
  assert.equal(by.G.suppressed,false);
});

test('groupTowns keeps each town population for island comparisons',()=>{
  const {towns:rows}=groupTowns({towns:[{town:'A',county:'001',population:12345}],taste:new Map([['001',{taste:.5,cells:9}]]),supply:new Map()});
  assert.equal(rows[0].population,12345);
});

test('createOpportunity returns a saved file, null for a missing one, and lists industries',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'opportunity-'));
  fs.writeFileSync(path.join(dir,'bakery.json'),JSON.stringify({industry:'bakery',towns:[]}));
  fs.writeFileSync(path.join(dir,'bar.json'),'{not json');
  const store=createOpportunity({dir});
  assert.deepEqual(store.industries,['cafe','bakery','restaurant','bar','hotel','salon']);
  assert.equal(store.get('bakery').industry,'bakery');
  assert.equal(store.get('cafe'),null);
  assert.equal(store.get('bar'),null,'an unreadable file is unavailable, not a crash');
  assert.equal(store.get('gym'),null);
});

test('industryOf maps parsed requests to the six industries',()=>{
  for(const [request,id] of [[{type:'bakery',category:'food'},'bakery'],[{type:'cafe',category:'food'},'cafe'],
    [{type:'restaurant',category:'food'},'restaurant'],[{type:'hotel',category:'stay'},'hotel'],[{type:'salon',category:'health'},'salon'],
    [{type:'drinks',category:'drinks'},'bar'],[{type:'health',category:'health'},null],[{type:'all',category:'all'},null]])
    assert.equal(industryOf(request),id);
});

test('the Docker image ships the saved opportunity build',()=>{
  const dockerfile=fs.readFileSync(new URL('../Dockerfile',import.meta.url),'utf8');
  assert.match(dockerfile,/^COPY cache\/opportunity \.\/cache\/opportunity$/m);
});

test('a fresh clone keeps an empty cache/opportunity folder so the Docker COPY works',()=>{
  const ignore=fs.readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
  for(const line of ['!cache/opportunity/','cache/opportunity/*','!cache/opportunity/.gitkeep']) assert.ok(ignore.split(/\r?\n/).includes(line),line);
  assert.ok(fs.existsSync(new URL('../cache/opportunity/.gitkeep',import.meta.url)));
});
