import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../app/dossier.js',import.meta.url),'utf8'),context);
const dossier=context.window.ZemiDossier;

test('the first place view leads with Qloo taste connections and retains detailed sources',()=>{
 const html=dossier.markup({id:'verified',name:'A cafe',description:'Short description',
  details:{standout:'Full reason',keywords:['quiet'],amenities:'Wi-Fi'},
  facts:[{label:'Phone',text:'123',href:'tel:123',source:'Overture'}],sourceLine:'Verified record'});
 assert.ok(html.indexOf('data-culture')<html.indexOf('<summary>About this place</summary>'));
 assert.match(html,/<details class="more"><summary>Contact and sources<\/summary>/);
 for(const value of ['Full reason','quiet','Wi-Fi','tel:123','Overture','Verified record'])assert.ok(html.includes(value));
 assert.doesNotMatch(html,/undefined|null/);
});

test('taste previews keep every returned connection without inventing missing data',()=>{
 const html=dossier.cultureMarkup({status:'ok',artists:[{name:'One'},{name:'Two'},{name:'Three'},{name:'<Four>'}],trips:[]});
 assert.match(html,/<summary>More taste connections<\/summary>/);
 assert.ok(html.indexOf('Three')<html.indexOf('<details'));
 assert.ok(html.indexOf('&lt;Four&gt;')>html.indexOf('<details'));
 assert.doesNotMatch(html,/<Four>|Trips/);
 assert.match(dossier.cultureMarkup({status:'ok',artists:[],trips:[]}),/no taste links/i);
 assert.doesNotMatch(dossier.markup({name:'No Qloo ID'}),/data-culture|Reading Qloo/);
});
test('the 3D reveal uses an explicit available-map option, without hiding the no-token path',()=>{
 assert.doesNotMatch(dossier.markup({name:'Place'}),/data-place-3d/);
 assert.match(dossier.markup({name:'Place'},{show3D:true}),/<button type="button"[^>]*data-place-3d>See in 3D<\/button>/);
});

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const source=html.match(/async function loadDossierExtras\([\s\S]*?\n}\n/)[0];
function extras(){
 const requests=new Map(),nodes=new Map(),footprints=[];
 const ctx={focusToken:1,encodeURIComponent,Promise,
  fetch:url=>new Promise(resolve=>requests.set(url.split('/').at(-1),data=>resolve({json:async()=>data}))),
  document:{querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);}},
  ZemiDossier:{audienceMarkup:()=> 'audience',cultureMarkup:()=> 'culture',footprintLine:()=> 'footprint'},
  drawFootprint:points=>footprints.push(points)};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return{ctx,requests,nodes,footprints};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('taste connections render while the independent footprint request is still pending',async()=>{
 const b=extras(),pending=b.ctx.loadDossierExtras({id:'one',name:'One'},1);
 b.requests.get('culture')({status:'ok'});await settle();
 assert.equal(b.nodes.get('#spot [data-culture]')?.innerHTML,'culture');
 assert.equal(b.nodes.get('#spot [data-foot]')?.textContent,undefined);
 b.requests.get('audience')({});b.requests.get('footprint')({});await pending;
});
test('late dossier responses cannot overwrite a newly selected place',async()=>{
 const b=extras(),pending=b.ctx.loadDossierExtras({id:'old',name:'Old'},1);
 b.ctx.focusToken=2;
 for(const release of b.requests.values())release({status:'ok',points:[{lat:1,lon:1}]});
 await pending;assert.equal(b.nodes.size,0);assert.equal(b.footprints.length,1);
});

test('a Commons photo beats a brand logo; Qloo image beats both; logo still beats the site icon',()=>{
 const chain={name:"Chili's",logo:'https://commons/logo.png',aerial:'https://img/a.jpg'};
 const logo=dossier.pictureOf(chain);
 assert.equal(logo.src,'https://commons/logo.png');assert.equal(logo.credit,'Logo · Wikimedia Commons');assert.equal(logo.logo,true);
 assert.equal(dossier.pictureOf({...chain,image:'https://commons/p.jpg'}).credit,'Photo · Wikimedia Commons');
 assert.equal(dossier.pictureOf({...chain,image:'https://commons/p.jpg'}).src,'https://commons/p.jpg');
 assert.equal(dossier.pictureOf({...chain,qlooImage:'https://q/img.jpg'}).credit,'Photo · Qloo');
 assert.match(dossier.markup({...chain,id:'x',facts:[],details:{}}),/<img class="shot logo"/);
 assert.match(dossier.markup({...chain,id:'x',facts:[],details:{}}),/location-shot/);
});

test('on a Spanish page the place card speaks Spanish and marks Qloo text as English (judge panels 10/24-10/25)', () => {
  context.document = { documentElement: { lang: 'es' } };
  try {
    const html = dossier.markup({ id: 'v', name: 'Kamal Bakery', genre: 'Bakery', category: 'food', description: 'Neighborhood bakery and casual eatery.',
      details: { keywords: ['quiet'], amenities: 'Wi-Fi' }, rating: 4.4,
      facts: [{ label: 'Phone', text: '123', href: 'tel:123', source: 'Qloo' }], sourceLine: 'Qloo record. No OpenStreetMap match at this pin.' }, { show3D: true });
    for (const es of ['A sus fans también les gusta', 'Ver en 3D', 'Contacto y fuentes', 'Sobre este lugar', 'Teléfono: ', ' estrellas',
      'Registro de Qloo. OpenStreetMap no tiene este lugar en este punto.', 'Qloo · en inglés', 'Público y mapa de gusto']) assert.ok(html.includes(es), es);
    assert.match(html, /<span lang="en">Neighborhood bakery and casual eatery\.<\/span>/);
    for (const en of ['Its fans also love', 'See in 3D', 'Contact and sources', 'About this place', '>Phone: ', ' stars<']) assert.ok(!html.includes(en), en);
    const audience = dossier.audienceMarkup({ status: 'ok', age: [{ label: '24 and under', value: 0.2 }], gender: [{ label: 'Women', value: -0.1 }] });
    for (const es of ['A quién le gusta', '24 o menos', 'Mujeres', 'sobre el promedio', 'bajo el promedio', 'No es un conteo de clientes']) assert.ok(audience.includes(es), es);
    assert.match(dossier.cultureMarkup({ status: 'ok', artists: [{ name: 'Bad Bunny' }], trips: [] }), /Música/);
    assert.match(dossier.footprintLine({ status: 'ok', points: [1, 2] }, 'Kamal Bakery'), /^Brillo violeta: las 2 zonas/);
  } finally { delete context.document; }
  assert.match(dossier.markup({ id: 'v', name: 'X', description: 'Y' }), /Its fans also love/, 'English stays English');
});
