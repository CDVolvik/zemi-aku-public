import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app/opportunity.js',import.meta.url),'utf8');
function load(){
  const elements={};
  const el=id=>elements[id]||(elements[id]={id,hidden:true,innerHTML:'',textContent:'',listeners:{},
    addEventListener(event,fn){this.listeners[event]=fn},querySelectorAll(){return[]}});
  const window={};
  const context={window,document:{getElementById:el}};
  vm.createContext(context);vm.runInContext(source,context);
  return {Z:window.ZemiOpportunity,elements};
}
const notes={en:['Taste compared with existing businesses. Not a measure of demand, revenue or profit.'],
  es:['Gusto comparado con los negocios que ya existen. No mide demanda, ingresos ni ganancias.']};
const sources={qloo:{tag:'urn:tag:genre:place:restaurant:bakery',retrievedAt:'2026-10-11T07:13:59.194Z'},cbp:{vintage:2023,naics:['311811']},census:{period:'2020–2024'}};
const file=(industry,towns)=>({industry,label:{en:industry,es:industry},medians:{taste:.5,perTenThousand:1},notes,sources,towns});
const base={lang:()=>'en',onChange(){},onAsk(){}};

test('show() fetches the industry once and maps towns to groups',async()=>{
  const {Z,elements}=load();let calls=0,changes=0;
  const ui=Z.mount({...base,onChange:()=>changes++,fetchJson:async url=>{calls++;assert.equal(url,'/api/opportunity?industry=bakery');
    return file('bakery',[{town:'Mayagüez',group:'gap',tasteRank:1,perTenThousand:0},{town:'Ponce',group:'quiet',tasteRank:9,perTenThousand:.2}]);}});
  await ui.show('bakery');await ui.show('bakery');
  assert.equal(calls,1);assert.equal(ui.active(),'bakery');
  assert.ok(elements['opportunity-gaps'].innerHTML.includes('taste #1 of 2'),elements['opportunity-gaps'].innerHTML);
  assert.ok(!elements['opportunity-gaps'].innerHTML.includes('towns with Qloo taste data'));
  // A town without taste data lowers the rank base, and the list says so in both languages.
  const {Z:Z2,elements:e2}=load();
  const partial=Z2.mount({...base,fetchJson:async()=>file('bakery',[{town:'Mayagüez',group:'gap',tasteRank:1,perTenThousand:0},{town:'Ponce',group:'quiet',tasteRank:2,perTenThousand:.2},{town:'Culebra',group:'unknown',tasteRank:null,perTenThousand:0}])});
  await partial.show('bakery');
  assert.ok(e2['opportunity-gaps'].innerHTML.includes('taste #1 of 2'),e2['opportunity-gaps'].innerHTML);
  assert.ok(e2['opportunity-gaps'].innerHTML.includes('Ranks are among the 2 of 3 towns with Qloo taste data.'),e2['opportunity-gaps'].innerHTML);
  assert.ok(!e2['opportunity-gaps'].innerHTML.includes('not here'),'a town with no taste rank is not a withheld one');
  // A withheld high-taste town is named under the list (judge panel 10/25: Vieques, #1, missing without a word).
  const {Z:Z3,elements:e3}=load();
  const held=Z3.mount({...base,fetchJson:async()=>file('bakery',[{town:'Vieques',group:'unknown',tasteRank:1,suppressed:true,perTenThousand:0},{town:'Río Grande',group:'gap',tasteRank:2,perTenThousand:.7},{town:'Ponce',group:'quiet',tasteRank:3,perTenThousand:.2}])});
  await held.show('bakery');
  assert.ok(e3['opportunity-gaps'].innerHTML.includes('Vieques (taste #1) is not here: the Census withholds its count, so few or many cannot be told.'),e3['opportunity-gaps'].innerHTML);
  assert.equal(ui.groupOf('Mayaguez'),'gap');assert.equal(ui.groupOf('Ponce'),'quiet');assert.equal(ui.groupOf('Caguas'),null);
  assert.ok(changes>=1);
  ui.hide();assert.equal(ui.active(),null);assert.equal(ui.groupOf('Ponce'),null);
});

test('switching industries quickly keeps only the last one',async()=>{
  const {Z}=load();let release;const slow=new Promise(resolve=>{release=resolve});
  const ui=Z.mount({...base,fetchJson:async url=>url.endsWith('bakery')
    ?(await slow,file('bakery',[{town:'Ponce',group:'gap'}])):file('bar',[{town:'Ponce',group:'crowded'}])});
  const first=ui.show('bakery');await ui.show('bar');release();await first;
  assert.equal(ui.active(),'bar');assert.equal(ui.groupOf('Ponce'),'crowded');
});

test('a failed load leaves no colors and says the industry is unavailable',async()=>{
  const {Z,elements}=load();
  const ui=Z.mount({...base,fetchJson:async()=>{throw new Error('503')}});
  await ui.show('hotel');
  assert.equal(ui.active(),null);assert.equal(ui.groupOf('Ponce'),null);
  assert.match(elements['opportunity-note'].textContent,/unavailable/);
});

test('the legend uses the group labels and honesty lines in the chosen language',()=>{
  const {Z}=load();
  const en=Z.legendHtml('en',notes.en);
  for(const text of ['Gap: taste above the median, few businesses','Competitive: taste above the median, many businesses','Quiet: taste below the median, few businesses',
    'Crowded: taste below the median, many businesses','Not enough data','Not a measure of demand']) assert.ok(en.includes(text),text);
  const es=Z.legendHtml('es',notes.es);
  for(const text of ['Brecha: afinidad sobre la mediana, pocos negocios','Competido: afinidad sobre la mediana, muchos negocios','Tranquilo: afinidad bajo la mediana, pocos negocios',
    'Saturado: afinidad bajo la mediana, muchos negocios','Datos insuficientes','No mide demanda']) assert.ok(es.includes(text),text);
});

test('tapping a town asks the town question in the current language',async()=>{
  const {Z}=load();const asked=[];let lang='en';
  const ui=Z.mount({...base,lang:()=>lang,onAsk:q=>asked.push(q),fetchJson:async()=>file('bakery',[{town:'Ponce',group:'gap'}])});
  await ui.show('bakery');
  ui.pickTown('Ponce');lang='es';ui.pickTown('Ponce');
  assert.deepEqual(asked,['Should I open a bakery in Ponce?','¿Debo abrir una panadería en Ponce?']);
});

test('the page loads the view, opens ?opportunity= links and colors towns by group',()=>{
  const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
  assert.match(html,/<script src="\/app\/opportunity\.js"><\/script>/);
  assert.match(html,/params\.get\("opportunity"\)/);
  assert.match(html,/action\.type === "show_opportunity"/);
  assert.match(html,/if \(data\.opportunity\)/);
  assert.match(html,/opportunityUI\?\.groupOf\(/);
});

test('picking a town hides the panel so the readout shows, and keeps the colors',async()=>{
  const {Z,elements}=load();
  const ui=Z.mount({...base,fetchJson:async()=>file('bakery',[{town:'Ponce',group:'gap',tasteRank:1,perTenThousand:0}])});
  await ui.show('bakery');
  assert.equal(elements['opportunity-panel'].hidden,false);
  ui.pickTown('Ponce');
  assert.equal(elements['opportunity-panel'].hidden,true);
  assert.equal(ui.groupOf('Ponce'),'gap');
});

test('going home closes the opportunity view',()=>{
  const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
  const home=html.match(/function goHome\([^)]*\) \{[^]*?\n\}/)[0];
  assert.match(home,/opportunityUI\?\.hide\(\)/);
});

test('supplyText states unpublished Census counts as a range, never as zero',()=>{
  const {Z}=load();
  const exact={suppressed:false,establishments:9,establishmentsMax:9,employees:40,perTenThousand:8.66,perTenThousandMax:8.66};
  const hidden={suppressed:true,establishments:0,establishmentsMax:2,employees:0,perTenThousand:0,perTenThousandMax:2.13};
  const partial={suppressed:true,establishments:10,establishmentsMax:12,employees:80,perTenThousand:10,perTenThousandMax:12};
  assert.deepEqual({...Z.supplyText(exact,'en')},{businesses:'9 establishments · 40 employees',per:'8.7 per 10,000 residents'});
  assert.deepEqual({...Z.supplyText(hidden,'en')},{businesses:'0–2 establishments (Census does not publish counts below 3)',per:'up to 2.1 per 10,000 residents'});
  assert.deepEqual({...Z.supplyText(partial,'en')},{businesses:'at least 10 establishments · at least 80 employees',per:'10.0–12.0 per 10,000 residents'});
  assert.deepEqual({...Z.supplyText(hidden,'es')},{businesses:'de 0 a 2 establecimientos (el Census no publica cifras menores de 3)',per:'hasta 2.1 por cada 10,000 residentes'});
  assert.deepEqual({...Z.supplyText(exact,'es')},{businesses:'9 establecimientos · 40 empleados',per:'8.7 por cada 10,000 residentes'});
});

test('definitionsHtml spells out the industry, the periods and margins, the suppression, the boundary and the screening',()=>{
  const {Z}=load();
  const en=Z.definitionsHtml('en',{industry:'bakery',sources});
  for(const text of ['<details','Definitions','311811','retail bakeries','urn:tag:genre:place:restaurant:bakery','March 2023','no margin of error','2020–2024',
    'five-year estimate','margin of error that the per-10,000 figure does not show','0–2','below 3','municipio boundary','3 km','straight line','screening','not demand'])
    assert.ok(en.includes(text),text);
  const es=Z.definitionsHtml('es',{industry:'bakery',sources});
  for(const text of ['<details','Definiciones','311811','panaderías','marzo de 2023','sin margen de error','2020–2024','estimado de cinco años','margen de error',
    'de 0 a 2','menores de 3','límite del municipio','3 km','línea recta','primer filtro','no mide demanda'])
    assert.ok(es.includes(text),text);
});

test('an industry that sums two Census codes names both, and missing sources leave the fixed definitions in place',()=>{
  const {Z}=load();
  const en=Z.definitionsHtml('en',{industry:'restaurant',sources:{...sources,cbp:{vintage:2023,naics:['722511','722513']}}});
  for(const text of ['722511','full-service','722513','limited-service']) assert.ok(en.includes(text),text);
  const bare=Z.definitionsHtml('en',{industry:'bakery'});
  for(const text of ['Bakeries','municipio boundary','screening']) assert.ok(bare.includes(text),text);
  assert.ok(!bare.includes('undefined')&&!bare.includes('NaN'));
});

test('the panel shows the definitions under the legend once an industry is loaded',async()=>{
  const {Z,elements}=load();
  const ui=Z.mount({...base,fetchJson:async()=>file('bakery',[{town:'Ponce',group:'gap',tasteRank:1,perTenThousand:1}])});
  await ui.show('bakery');
  const html=elements['opportunity-legend'].innerHTML;
  assert.ok(html.indexOf('Not a measure of demand')<html.indexOf('Definitions'),'definitions follow the honesty lines');
  for(const text of ['311811','municipio boundary','3 km']) assert.ok(html.includes(text),text);
});

test('the town readout shows the same definitions inside its sources and limits',()=>{
  const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
  const readout=html.match(/function showBusinessResearch\(business\) \{[^]*?\n\}/)[0];
  assert.match(readout,/ZemiOpportunity\.definitionsHtml\(/);
});

test('the gap list never shows an unpublished count as zero',async()=>{
  const {Z,elements}=load();
  const ui=Z.mount({...base,fetchJson:async()=>file('cafe',[{town:'Vieques',group:'gap',tasteRank:1,suppressed:true,establishments:0,establishmentsMax:2,perTenThousand:0,perTenThousandMax:2.13}])});
  await ui.show('cafe');
  assert.ok(elements['opportunity-gaps'].innerHTML.includes('up to 2.1 per 10,000 residents'));
  assert.ok(!elements['opportunity-gaps'].innerHTML.includes('0.0 per 10,000'));
});

test('the town readout uses the shared supply wording and shows every source note',()=>{
  const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
  const readout=html.match(/function showBusinessResearch\(business\) \{[^]*?\n\}/)[0];
  assert.match(readout,/ZemiOpportunity\.supplyText\(opportunity/);
  assert.match(readout,/<details/);
  assert.doesNotMatch(readout,/notes \|\| \[\]\)\.slice\(0, 2\)/);
});

test('the view reports whether its panel is open',async()=>{
  const {Z}=load();
  const ui=Z.mount({...base,fetchJson:async()=>file('bakery',[{town:'Ponce',group:'gap'}])});
  assert.equal(ui.panelOpen(),false);
  await ui.show('bakery');assert.equal(ui.panelOpen(),true);
  ui.pickTown('Ponce');assert.equal(ui.panelOpen(),false);
  await ui.show('bakery');ui.hide();assert.equal(ui.panelOpen(),false);
});

test('leaving for anything else clears the opportunity view, and map taps only ask while the panel is open',()=>{
  const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
  assert.match(html,/if \(opportunityUI\?\.panelOpen\(\)\) opportunityUI\.pickTown\(town\);/);
  assert.match(html,/function leaveOpportunity\(\) \{ if \(!keepOpportunity\) opportunityUI\?\.hide\(\); \}/);
  for(const fn of [/function select\(name, opts = \{\}\) \{\n  if \(!opts\.fromHistory\) mapHistory\.beginUserNav\(\);\n  if \(!opts\.keepOpportunity\) leaveOpportunity\(\);/,/async function runJourney\(artist\) \{\n  leaveOpportunity\(\);/])
    assert.match(html,fn);
  assert.match(html,/if \(data\.opportunity\) \{[^]*?return data;\n  \}\n  leaveOpportunity\(\);/);
  assert.match(html,/keepOpportunity = true;/);
});

test('industryChips renders the six industries with the given attribute, labels per language and the current one pressed',()=>{
  const {Z}=load();
  const en=Z.industryChips('en',{attr:'data-opportunity'});
  const ids=[...en.matchAll(/data-opportunity="([a-z]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,['cafe','bakery','restaurant','bar','hotel','salon']);
  for(const text of ['Cafés','Bakeries','Restaurants','Bars','Hotels','Salons']) assert.ok(en.includes(`>${text}<`),text);
  assert.ok(!en.includes('aria-pressed="true"'));
  const es=Z.industryChips('es',{attr:'data-business-industry',current:'bar'});
  for(const text of ['Cafeterías','Panaderías','Restaurantes','Barras','Hoteles','Salones de belleza']) assert.ok(es.includes(`>${text}<`),text);
  assert.match(es,/data-business-industry="bar" aria-pressed="true"/);
  assert.equal((es.match(/aria-pressed="true"/g)||[]).length,1);
});

test('townQuestion is the one town question, shared by the map and the readout',()=>{
  const {Z}=load();
  assert.equal(Z.townQuestion('en','bakery','Ponce'),'Should I open a bakery in Ponce?');
  assert.equal(Z.townQuestion('es','bakery','Ponce'),'¿Debo abrir una panadería en Ponce?');
  assert.equal(Z.townQuestion('es','salon','Mayagüez'),'¿Debo abrir un salón de belleza en Mayagüez?');
  assert.equal(Z.townQuestion('en','nope','Ponce'),null);
});
