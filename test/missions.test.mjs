import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../app/missions.js', import.meta.url), 'utf8'), context);
const missions = context.window.ZemiMissions;

const place = { id: '11111111-1111-1111-1111-111111111111', name: 'La Casita Blanca', genre: 'Puerto Rican restaurant', municipality: 'San Juan',
  lat: 18.4, lon: -66.1, description: 'Home-style Puerto Rican cooking in Santurce. Known for its sofrito. Cash only.' };

function fakeDeps(responses, log) {
  return {
    select: async (town) => log.push(`select ${town}`),
    showCatalog: (data) => log.push(`catalog ${data.places.length}`),
    openFoundPlace: async (p, town) => log.push(`open ${p.name} ${town}`),
    say: async (text) => log.push(`say ${text}`),
    fetchJson: async (url) => { log.push(`fetch ${url.split('?')[0]}`); const hit = Object.entries(responses).find(([k]) => url.includes(k)); if (!hit) throw new Error('404'); return hit[1]; },
    voiceLang: (lang) => log.push(`lang ${lang}`),
  };
}

test('every line slot fills from data and the first sentence stays speakable', () => {
  assert.equal(missions.fill('{a} and {b}', { a: 'x', b: 2 }), 'x and 2');
  assert.equal(missions.fill('{missing} here', {}), 'here');
  assert.equal(missions.firstSentence(place.description), 'Home-style Puerto Rican cooking in Santurce.');
  assert.equal(missions.firstSentence('x'.repeat(200)).length, 161);
  // Street abbreviations are not sentence ends (Club Cumpliendo Metas, Vega Alta, live 12 Oct).
  assert.equal(missions.firstSentence('Neighborhood restaurant offering curbside pickup on C. Luis Muñoz Rivera. Open daily.'), 'Neighborhood restaurant offering curbside pickup on C. Luis Muñoz Rivera.');
  assert.equal(missions.firstSentence('Bakery on Ave. Hostos in Ponce. Famous for quesitos.'), 'Bakery on Ave. Hostos in Ponce.');
  for (const lang of ['en', 'es']) for (const key of Object.keys(missions.T.en)) assert.ok(missions.T[lang][key], `${lang}.${key}`);
});

test('an artist mission speaks only what Qloo returned, opens the strongest place, and ends on the invitation', async () => {
  const log = [];
  const deps = fakeDeps({
    '/api/ask': { places: [place, { name: 'No coordinates' }, { ...place, id: '22222222-2222-2222-2222-222222222222', name: 'Second' }] },
    '/culture': { status: 'ok', artists: [{ name: 'Bad Bunny' }, { name: 'Rauw Alejandro' }], trips: [{ name: 'Cartagena' }] },
  }, log);
  const engine = missions.create(deps);
  assert.equal(await engine.play('bad-bunny'), true);
  assert.equal(log[0], 'lang en');
  assert.match(log[1], /^say Start with an artist\. Qloo knows what Bad Bunny's fans also love/);
  assert.equal(log[3], 'catalog 3', 'the list keeps every place; only pinnable ones are counted aloud');
  assert.match(log[4], /Qloo links 2 places to Bad Bunny's audience\. The strongest is La Casita Blanca, Puerto Rican restaurant in San Juan\./);
  assert.equal(log[5], 'open La Casita Blanca San Juan');
  assert.match(log[6], /^say La Casita Blanca\. Home-style Puerto Rican cooking in Santurce\.$/);
  assert.match(log[8], /also follow Rauw Alejandro, and travel to Cartagena\./);
  assert.match(log.at(-1), /^say Ask me anything about Puerto Rico/);
  assert.equal(engine.playing(), null);
  assert.equal(await engine.play('nope'), false);
});

test('the tour opens the strongest place that has a photo, and says so honestly when it is not the first', async () => {
  const log = [];
  const engine = missions.create(fakeDeps({
    '/api/ask': { places: [place, { ...place, id: '33333333-3333-3333-3333-333333333333', name: 'Photo Place', image: 'https://x/p.jpg', municipality: 'Ponce' }] },
    '/culture': { artists: [], trips: [] },
  }, log));
  await engine.play('bad-bunny');
  assert.match(log[4], /^say Across the island, Qloo links 2 places to Bad Bunny's audience\. Among them, Photo Place, Puerto Rican restaurant in Ponce\./);
  assert.equal(log[5], 'open Photo Place Ponce');
});

test('a mission with no Qloo places says so and stops, and a stop mid-tour cuts the next beat', async () => {
  const log = [];
  const engine = missions.create(fakeDeps({ '/api/ask': { places: [] } }, log));
  await engine.play('vico-c');
  assert.match(log.at(-1), /^say Qloo returned nothing/);
  const log2 = [];
  const deps = fakeDeps({ '/api/ask': { places: [place] }, '/culture': { artists: [], trips: [] } }, log2);
  const stops = [];
  deps.onStop = (m) => stops.push(m.id);
  deps.say = async (text) => { log2.push(`say ${text}`); if (log2.filter((l) => l.startsWith('say')).length === 2) engine2.stop(); };
  const engine2 = missions.create(deps);
  await engine2.play('bad-bunny');
  assert.deepEqual(stops, ['bad-bunny']);
  assert.equal(log2.filter((l) => l.startsWith('say')).length, 2);
  assert.ok(!log2.some((l) => l.startsWith('open')), 'nothing after the stop');
});

test('the Spanish town mission reads the standout vibes first and ends on the top café', async () => {
  const log = [];
  const engine = missions.create(fakeDeps({
    '/api/town/profile': { stats: { qloo: 357 }, profile: { vibe: [{ name: 'Puerto Rican' }, { name: 'Tropical', standout: true }, { name: 'Resort Like' }, { name: 'Casual' }] } },
    '/api/catalog': { count: 7, places: [{ ...place, name: 'Con Leche', genre: 'Cafe', municipality: 'Ponce', description: 'Coffee-focused café in Ponce.' }] },
  }, log));
  await engine.play('ponce');
  assert.equal(log[0], 'lang es');
  assert.equal(log[1], 'select Ponce');
  assert.match(log[4], /^say Esto es Ponce\. Qloo conoce 357 lugares aquí, y sabe lo que le gusta al pueblo, en sus etiquetas en inglés: Tropical, Puerto Rican, Resort Like\./);
  assert.match(log[6], /empiezan con Con Leche\./);
  assert.equal(log[7], 'open Con Leche Ponce');
  assert.match(log.at(-1), /^say Pregúnteme lo que quiera/);
});

test('the mission chips list every mission with its language for the voice', () => {
  const html = missions.chips('en');
  assert.match(html, /Watch a tour/);
  assert.match(html, /data-mission="bad-bunny" lang="en"/);
  assert.match(html, /data-mission="ponce" lang="es"/);
  assert.match(missions.chips('es'), /Ver un recorrido/);
});

test('on a Spanish page the English tours are named in Spanish and say they play in English', () => {
  const es = missions.chips('es');
  assert.match(es, /▶ Dónde comen los fans de Bad Bunny \(en inglés\)/);
  assert.match(es, /▶ Vico C, en lugares reales \(en inglés\)/);
  assert.match(es, /data-mission="ponce" lang="es">▶ Ponce, en español/);
  const en = missions.chips('en');
  assert.match(en, /data-mission="bad-bunny" lang="en">▶ Where Bad Bunny's fans eat/);
});
