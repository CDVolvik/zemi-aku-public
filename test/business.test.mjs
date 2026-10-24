import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { smallTalkKind, guideKind, chatReply } from '../server/chat.mjs';
import { businessRequest, createBusinessDiscovery } from '../server/business.mjs';

test('purchase intent reaches its own handler before a place-name search', async () => {
  const source = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8')
    .match(/async function patternAnswer\([^]*?\n}\n/)[0];
  const expected = { business: { town: 'Bayamón' }, speech: 'Which kind of business?' };
  const context = { smallTalkKind, guideKind, chatReply, catalogTotal: 7717,
    surveyByTown: new Map([['bayamon', { town: 'Bayamón' }]]),
    knownTown: () => '', splitTown: () => ({ town: 'Bayamón' }),
    businessAnswer: async () => expected,
    catalogOf: () => { throw new Error('Purchase request became a place-name search'); } };
  vm.createContext(context); vm.runInContext(source, context);
  assert.equal(await context.patternAnswer({ question: 'I want to buy a business in Bayamon', lang: 'en' }), expected);
});

const towns = ['Bayamón', 'Ponce'];
const rows = [{ id: 'cafe', name: 'Saved café', genre: 'Cafe' }, { id: 'hotel', name: 'Saved hotel', genre: 'Hotel' }];
const discover = createBusinessDiscovery({ towns, catalog: async () => rows });
test('a purchase question supplies market context and clearly separated listing sources', async () => {
  const data = await discover({ question: 'I want to buy a business in Bayamon', lang: 'en' });
  assert.equal(data.town, 'Bayamón');
  assert.equal(data.business.total, 2);
  assert.match(data.note, /not confirmed businesses for sale/);
  assert.match(data.speech, /What kind/);
  assert.equal(data.business.sources.length, 3);
  assert.ok(data.business.sources.every(s => s.url.startsWith('https://')));
  assert.equal(data.places[0].askingPrice, undefined);
});
test('town and category follow-ups continue the purchase flow in English and Spanish', async () => {
  const history = [{ role: 'user', content: 'I want to buy a business' }];
  const town = await discover({ question: 'Bayamon', history });
  assert.equal(town.town, 'Bayamón');
  const category = await discover({ question: 'A cafe', history: [...history, { role: 'user', content: 'Bayamon' }] });
  assert.equal(category.town, 'Bayamón');
  assert.equal(category.business.category, 'food');
  assert.equal(category.places.length, 1);
  const spanish = await discover({ question: 'Quiero comprar un negocio en Bayamón', lang: 'es' });
  assert.match(spanish.speech, /Claro, busquemos en Bayamón/);
  assert.match(spanish.note, /no negocios confirmados en venta/);
});
test('missing saved data gives useful listing sources without claiming zero businesses', async () => {
  const missing = createBusinessDiscovery({ towns, catalog: async () => { throw Error('missing'); } });
  const data = await missing({ question: 'Buy a business in Bayamon' });
  assert.equal(data.business.available, false);
  assert.match(data.speech, /isn’t available/);
  assert.equal(data.business.sources.length, 3);
});
test('a Spanish question that ends in "y por qué" is not sent off the map, and conjunction places need a known town', async () => {
  const { outsidePlace } = await import('../server/business.mjs');
  const asked = 'Quiero abrir una panadería pequeña con poco dinero. ¿En qué pueblo me conviene y por qué?';
  assert.equal(outsidePlace(asked, towns), '');
  assert.equal(outsidePlace('¿Dónde me conviene y para quién vendo?', towns), '');
  assert.equal(outsidePlace('Should I open in Ponce or Miami?', towns), 'Miami');
  assert.equal(outsidePlace('Should I open in Orlando or Miami?', towns), 'Orlando');
  assert.equal(outsidePlace('a bakery in miami', towns), 'Miami');
  const data = await discover({ question: asked, lang: 'es' });
  assert.notEqual(data?.kind, 'outside');
});

test('a bakery that Qloo filed under the plain restaurant genre still counts as a bakery by its name', async () => {
  const maricao = [
    { id: 'e1', name: "Erik's Bakery and Pastry Shop", genre: 'Restaurant', genreId: 'urn:tag:genre:place:restaurant', municipality: 'Ponce', lat: 18.18, lon: -66.98 },
    { id: 'e2', name: 'La Casona', genre: 'Restaurant', genreId: 'urn:tag:genre:place:restaurant', municipality: 'Ponce', lat: 18.18, lon: -66.98 },
  ];
  const named = createBusinessDiscovery({ towns, catalog: async () => maricao });
  const data = await named({ question: 'Should I open a bakery in Ponce?', lang: 'en' });
  assert.equal(data.business.total, 1);
  assert.match(JSON.stringify(data.places), /Erik's Bakery/);
  assert.doesNotMatch(JSON.stringify(data.places), /La Casona/);
  const plain = await named({ question: 'Should I open a restaurant in Ponce?', lang: 'en' });
  assert.equal(plain.business.total, 2);
  // Other genres keep their own type whatever the name says.
  const others = createBusinessDiscovery({ towns, catalog: async () => [
    { id: 'h1', name: 'Café Hotel', genre: 'Hotel', genreId: 'urn:tag:genre:place:hotel', municipality: 'Ponce', lat: 18.0, lon: -66.6 },
    { id: 's1', name: 'Caribbean Bakery School', genre: 'School', genreId: 'urn:tag:genre:place:school', municipality: 'Ponce', lat: 18.0, lon: -66.6 },
    { id: 'b1', name: 'Hotel Bar Central', genre: 'Restaurant', genreId: 'urn:tag:genre:place:restaurant', municipality: 'Ponce', lat: 18.0, lon: -66.6 },
  ] });
  assert.equal((await others({ question: 'Should I open a cafe in Ponce?', lang: 'en' })).business.total, 0);
  assert.equal((await others({ question: 'Should I open a bakery in Ponce?', lang: 'en' })).business.total, 0);
  assert.equal((await others({ question: 'Should I open a hotel in Ponce?', lang: 'en' })).business.total, 1);
});

test('a new dinner question or greeting leaves acquisition research', async () => {
  const history = [{ role: 'user', content: 'Buy a business in Bayamon' }];
  assert.equal(await discover({ question: 'Where can I eat in Ponce?', history }), null);
  assert.equal(await discover({ question: 'Hello', history }), null);
  assert.equal(await discover({ question: 'What hotels are in Ponce?', history }), null);
});
test('a previous dinner search cannot filter a later acquisition conversation', () => {
  const history = [{ role: 'user', content: 'Show restaurants in Ponce' },
    { role: 'user', content: 'Buy a business in Bayamon' }];
  assert.equal(businessRequest({ question: 'yes', history }, towns).category, 'all');
});
test('category counts use current genre classification instead of stale saved categories', async () => {
  const research = createBusinessDiscovery({ towns, catalog: async () => [
    { name: 'Café', genre: 'Cafe', category: 'other' },
  ] });
  const answer = await research({ question: 'Buy a business in Bayamon' });
  assert.equal(answer.business.counts[0].id, 'food');
});

const opportunitySources={qloo:{tag:'urn:tag:genre:place:test',retrievedAt:'2026-10-11T07:13:59.194Z'},cbp:{vintage:2023,naics:['000000']},census:{period:'2020–2024'}};
const opportunityFile=(industry,label)=>({industry,label,notes:{en:['Taste compared with existing businesses.'],es:['Gusto comparado.']},sources:opportunitySources,
  towns:[{town:'Bayamón',county:'021',population:180000,group:'gap',tasteRank:3,establishments:10,employees:50,perTenThousand:10/18},
    {town:'Ponce',county:'113',population:130000,group:'quiet',tasteRank:20,establishments:20,employees:90,perTenThousand:20/13}]});
const files={bakery:opportunityFile('bakery',{en:'bakery',es:'panadería'}),cafe:opportunityFile('cafe',{en:'café',es:'cafetería'}),
  salon:opportunityFile('salon',{en:'salon',es:'salón de belleza'}),restaurant:opportunityFile('restaurant',{en:'restaurant',es:'restaurante'}),
  bar:opportunityFile('bar',{en:'bar',es:'barra'}),hotel:opportunityFile('hotel',{en:'hotel',es:'hotel'})};
const withMap=createBusinessDiscovery({towns,catalog:async()=>rows,opportunity:{get:id=>files[id]||null}});

test('a no-town opening question opens the opportunity map in English and Spanish',async()=>{
  for(const [question,lang,industry] of [['Where should I open a bakery?','en','bakery'],['¿Dónde abro una panadería?','es','bakery'],['¿Dónde pongo un salón de belleza?','es','salon']]){
    const data=await withMap({question,lang});
    assert.equal(data?.kind,'opportunity',question);
    assert.deepEqual(data.opportunity,{industry});
  }
  assert.equal((await withMap({question:'Where should I open a bakery?',lang:'en'})).speech,
    'Here’s where bakery taste runs strong and businesses are few. Tap a town to look closer.');
  assert.equal((await withMap({question:'¿Dónde abro una panadería?',lang:'es'})).speech,
    'Aquí el gusto por panadería es fuerte y hay pocos negocios. Toque un pueblo para ver más.');
});

test('an uncovered industry or a missing build does not open the map',async()=>{
  assert.notEqual((await withMap({question:'Where should I open a gym?',lang:'en'}))?.kind,'opportunity');
  const noBuild=createBusinessDiscovery({towns,catalog:async()=>rows,opportunity:{get:()=>null}});
  assert.match((await noBuild({question:'Where should I open a bakery?',lang:'en'})).speech,/Which town/);
});

test('a town question adds the industry opportunity evidence',async()=>{
  const data=await withMap({question:'Should I open a café in Bayamón?',lang:'en'});
  const evidence=data.business.evidence.opportunity;
  assert.equal(evidence.industry,'cafe');assert.equal(evidence.group,'gap');assert.equal(evidence.tasteRank,3);
  assert.equal(evidence.establishments,10);assert.equal(evidence.employees,50);
  assert.ok(Math.abs(evidence.islandPerTenThousand-30/310000*10000)<1e-9);
  assert.deepEqual(evidence.notes,files.cafe.notes.en);
});

test('the town evidence carries the saved build sources so the readout can spell out its definitions',async()=>{
  const data=await withMap({question:'Should I open a café in Bayamón?',lang:'en'});
  assert.deepEqual(data.business.evidence.opportunity.sources,opportunitySources);
});

test('every industry opens the map in Spanish and the panel town questions reach the readout',async()=>{
  for(const [question,industry] of [['¿Dónde abro una cafetería?','cafe'],['¿Dónde abro una panadería?','bakery'],['¿Dónde abro un restaurante?','restaurant'],
    ['¿Dónde abro una barra?','bar'],['¿Dónde abro un hotel?','hotel'],['¿Dónde pongo un salón de belleza?','salon']]){
    const data=await withMap({question,lang:'es'});
    assert.equal(data?.kind,'opportunity',question);assert.equal(data.opportunity.industry,industry,question);
  }
  for(const [question,lang] of [['¿Debo abrir una barra en Ponce?','es'],['¿Debo abrir una cafetería en Ponce?','es'],['Should I open a bar in Ponce?','en'],['Should I open a salon in Ponce?','en']]){
    const data=await withMap({question,lang});
    assert.equal(data?.town,'Ponce',question);assert.ok(data.business.evidence.opportunity,question);
  }
});

test('the new Spanish verbs do not capture unrelated questions or place names',()=>{
  for(const question of ['¿Dónde pongo el carro cerca del restaurante?','¿Cuál es el monto del depósito del hotel?','Abra la panadería Kasalta',
    "Monte's Bakery",'El Monte bar in San Juan','Ponga el hotel de Rincón en el mapa'])
    assert.equal(businessRequest({question},towns.concat(['San Juan','Rincón'])),null,question);
});

test('the spoken count names the researched kind in the visitor language', async () => {
  const shops = await discover({ question: 'Quiero abrir una tienda en Ponce', lang: 'es' });
  assert.match(shops.speech, /tiendas/);
  const stay = await discover({ question: 'Should I open a hotel in Ponce?', lang: 'en' });
  assert.match(stay.speech, /hotels/);
  const any = await discover({ question: 'Open a business in Ponce' });
  assert.match(any.speech, /places/);
});


// Judge panel 10/23: the owner's first answer must agree with the panel's verdict, and a question that
// names two towns, asks which is better, or names a place off the island must not get a one-town template.
test('a town opening question speaks the opportunity verdict with exact counts', async () => {
  const data = await withMap({ question: 'Should I open a café in Bayamón?', lang: 'en' });
  assert.match(data.speech, /^Bayamón is a gap for cafés: taste above the median, rank 3 of 2, and few businesses, 10 establishments/);
  assert.doesNotMatch(data.speech, /busy|some options|small one/);
  const es = await withMap({ question: '¿Conviene abrir una cafetería en Bayamón?', lang: 'es' });
  assert.match(es.speech, /^Bayamón es una brecha para cafeterías: afinidad sobre la mediana, puesto 3 de 2, y pocos negocios, 10 establecimientos/);
  assert.equal(data.business.evidence.opportunity.ranked, 2);
});

test('two towns, a which-is-better question, or a comparison leave the template so the model answers', async () => {
  for (const question of ['Vivo en Bayamón. ¿Me conviene abrir una panadería allí o en Ponce?', 'Should I open a bakery in Bayamón or Ponce?',
    'Compare Ponce and Bayamón for opening a café', 'Which town is better for a bakery, Ponce or Bayamón?', '¿Qué pueblo me conviene para una panadería?']) {
    assert.equal(await withMap({ question, lang: 'es' }), null, question);
  }
  // A which-is-better follow-up compares once two towns are in play; alone it is one-town research.
  const history = [{ role: 'user', content: 'Should I open a bakery in Bayamón?' }, { role: 'assistant', content: 'x' }, { role: 'user', content: 'And Ponce?' }];
  assert.equal(await withMap({ question: '¿Y cuál es mejor para una panadería?', lang: 'es', history }), null);
  assert.equal((await withMap({ question: 'Where is it best to open a bakery in Ponce?', lang: 'en' })).town, 'Ponce', 'standalone best stays on the template');
  assert.equal((await withMap({ question: '¿Cuál es el mejor sitio para abrir una panadería en Ponce?', lang: 'es' })).town, 'Ponce');
  // The rules router (model down) still gets an answer when it asks for one.
  const forced = await withMap({ question: 'Should I open a bakery in Bayamón or Ponce?', lang: 'en' }, { force: true });
  assert.equal(forced.town, 'Bayamón');
});

test('a business question about a place outside Puerto Rico says so instead of answering the open town', async () => {
  const data = await withMap({ question: 'Where should I open a bakery in Miami?', lang: 'en', town: 'Ponce' });
  assert.equal(data.kind, 'outside');
  assert.equal(data.speech, 'Zemi-Aku covers Puerto Rico’s 78 towns only, and Miami is not on this map. Name a town here and I’ll look.');
  const es = await withMap({ question: '¿Dónde abro una panadería en Orlando?', lang: 'es', town: 'Ponce' });
  assert.equal(es.speech, 'Zemi-Aku cubre solo los 78 pueblos de Puerto Rico, y Orlando no está en este mapa. Dígame un pueblo de aquí y lo busco.');
  // Lowercase, a mixed pair, and a town inside a longer name.
  assert.equal((await withMap({ question: 'Where should I open a bakery in miami?', lang: 'en', town: 'Ponce' })).kind, 'outside');
  assert.equal((await withMap({ question: 'Should I open a bakery in Ponce or Miami?', lang: 'en' })).kind, 'outside');
  assert.equal((await withMap({ question: 'Should I open a bakery in Old Ponce?', lang: 'en' })).town, 'Ponce');
  // A known town, "Puerto Rico" itself, a generic place word, a determiner or a source keeps the normal flow.
  assert.equal((await withMap({ question: 'Where should I open a bakery in Ponce?', lang: 'en' })).town, 'Ponce');
  assert.equal((await withMap({ question: 'Where should I open a bakery in Puerto Rico?', lang: 'en' })).kind, 'opportunity');
  for (const question of ['Where should I open a bakery in Qloo data?', 'Where should I open a bakery in a small town?', 'Where should I open a bakery in downtown?',
    '¿Dónde abro una panadería en la isla?', '¿Dónde abro una panadería en el centro?', 'Vivo en Ponce. ¿Me conviene abrir una panadería allí?']) {
    assert.notEqual((await withMap({ question, lang: 'es' }))?.kind, 'outside', question);
  }
});
