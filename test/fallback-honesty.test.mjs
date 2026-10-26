import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fold, excludedTowns, withoutExcluded } from '../server/lib.mjs';
import { spokenIssues } from '../server/spoken.mjs';
import { islandScope, industryIn, isEating } from '../server/agent.mjs';
import { MONEY_QUESTION, asksBusiness } from '../server/business.mjs';
import { tasteByTown } from '../server/opportunity.mjs';

const serve = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
const block = (start, end) => serve.slice(serve.indexOf(start), serve.indexOf(end));

// Judge panel 10/25 round 8: after the model cap, "¿Dónde comen los fans de Vico C en Mayagüez?" became a search for a
// business named "Comen Vico C". The rules router reads the artist now, and says plainly what it cannot do.
const fallback = block('const FANS_ES', 'const routerKey');
const TOWNS = ['Mayagüez', 'Maricao', 'Culebra', 'San Juan', 'Vieques', 'Ponce'];
function load(patternAnswer = async () => ({ catalog: true, query: 'panaderia villa joviana', places: [] }), artistAnswer = async ({ query, town }, question, lang, named, options = {}) => ({ catalog: true, artist: query, town, ...(options.kinds ? { kinds: options.kinds, take: options.take } : {}) }),
  { artistTowns = async (artist) => ({ artist: artist === 'bjork' ? 'Björk' : artist, towns: [{ town: 'Vieques', cells: 21 }, { town: 'Río Grande', cells: 22 }, { town: 'Loíza', cells: 12 }] }),
    businessAnswer = async (body) => ({ business: true, asked: body.question }) } = {}) {
  const opportunity = { get: (id) => (id === 'cafe' ? { label: { en: 'café', es: 'cafetería' }, towns: [{ town: 'Luquillo', group: 'gap' }, { town: 'San Juan', group: 'competitive' }, { town: 'Guánica', group: 'gap' }], sources: { qloo: { retrievedAt: '2026-10-11T07:13:59.194Z' } } } : null) };
  const context = { excludedTowns, withoutExcluded, MONEY_QUESTION, asksBusiness, opportunity, fold, islandScope, industryIn, isEating, splitTown: (q) => ({ town: TOWNS.find((t) => fold(q).includes(fold(t))) || '' }), knownTown: (t) => t, townNames: TOWNS,
    patternAnswer, artistAnswer, artistTowns, businessAnswer };
  vm.createContext(context);
  vm.runInContext(`${fallback}; this.fansAsk = fansAsk; this.ruleAnswer = ruleAnswer;`, context);
  return context;
}

test('the rules router reads an artist out of a fans question in Spanish and English', () => {
  const { fansAsk } = load();
  assert.equal(fansAsk('¿Dónde comen los fans de Vico C en Mayagüez?'), 'vico c');
  assert.equal(fansAsk('Where do Bad Bunny fans eat in San Juan?'), 'bad bunny');
  assert.equal(fansAsk('Bad Bunny fans in Ponce'), 'bad bunny');
  assert.equal(fansAsk('¿Qué hay en Ponce?'), '');
  assert.equal(fansAsk('panaderías en Caguas'), '');
});

test('a capped turn answers an artist question with its fans, and a money or follow-up question with a plain limit', async () => {
  const { ruleAnswer } = load();
  assert.deepEqual(JSON.parse(JSON.stringify(await ruleAnswer({ question: '¿Dónde comen los fans de Vico C en Mayagüez?', lang: 'es', town: 'San Juan' }, 'visitor-cap'))),
    { catalog: true, artist: 'vico c', town: 'Mayagüez', kinds: ['food'], take: 30 }, 'an eating question keeps food places, from a deeper list');
  assert.deepEqual(JSON.parse(JSON.stringify(await ruleAnswer({ question: 'Bad Bunny fans in San Juan', lang: 'en', town: 'San Juan' }, 'budget'))),
    { catalog: true, artist: 'bad bunny', town: 'San Juan' }, 'a general fans question keeps every kind');
  const money = await ruleAnswer({ question: '¿Cuánta ganancia mensual da la mejor panadería de San Juan?', lang: 'es' }, 'visitor-cap');
  assert.equal(money.kind, 'limit');
  assert.match(money.speech, /^Los turnos del modelo de hoy en esta conexión se usaron, así que ahora solo contesto preguntas fijas/);
  assert.match(money.speech, /ninguna fuente aquí trae ventas ni ganancias\.$/);
  // Judge panel 10/26: a method question about a town's group became a food list; it gets the town's verdict card.
  const method = await ruleAnswer({ question: '¿Por qué San Juan es una brecha para panaderías si Qloo muestra 37 y Overture 64? ¿Cómo calculas 0.5 por 10,000?', lang: 'es' }, 'http-402');
  assert.deepEqual(JSON.parse(JSON.stringify(method)), { business: true, asked: 'abrir una panaderia en San Juan' });
  // Codex review, round ten: a "why" with no opportunity words is not a siting question.
  const hours = await ruleAnswer({ question: 'Why do bakeries in Ponce close early?', lang: 'en' }, 'http-402');
  assert.notEqual(hours.business, true, 'an hours question does not become a bakery verdict');
  for (const q of ['Calculate bakery payroll in Ponce', 'Find a quiet hotel in Ponce']) {
    assert.notEqual((await ruleAnswer({ question: q, lang: 'en' }, 'http-402')).business, true, q);
  }
  assert.equal((await ruleAnswer({ question: 'Explain the bakery gap in Ponce', lang: 'en' }, 'http-402')).business, true);
  // A local check 10/26: "makes the most money" got "Pick a town first" from the name search.
  for (const q of ['Which town makes the most money for a bakery?', '¿En qué pueblo una panadería hace más dinero?']) {
    const most = await ruleAnswer({ question: q, lang: 'en' }, 'budget');
    assert.equal(most.kind, 'limit', q);
    assert.match(most.speech, /No source here carries sales or profit either\.$/, q);
  }
  const there = await ruleAnswer({ question: '¿Y allí se vende bien?', lang: 'es' }, 'budget');
  assert.match(there.speech, /^El presupuesto del modelo de hoy se agotó/);
  const follow = await ruleAnswer({ question: 'And what about there?', lang: 'en' }, 'http-429');
  assert.match(follow.speech, /^The model did not answer this one, so I only answer fixed questions right now/);
  for (const answer of [money, there, follow]) assert.deepEqual(spokenIssues(answer.speech, answer === follow ? 'en' : 'es'), [], answer.speech);
  const sentence = await ruleAnswer({ question: '¿Hay panaderías en Villa Joviana?', lang: 'es' }, 'visitor-cap');
  assert.equal(sentence.kind, 'limit', 'a three-word name search with no match read a sentence as a name');
  // Judge panel 10/26: "¿Dónde pongo una veterinaria en Jayuya?" became a search for "Pongo Veterinaria".
  const { ruleAnswer: two } = load(async () => ({ catalog: true, query: 'pongo veterinaria', places: [] }));
  assert.equal((await two({ question: '¿Dónde pongo una veterinaria en Jayuya?', lang: 'es' }, 'http-402')).kind, 'limit', 'a two-word miss is a sentence, not a name');
  // Codex review, round ten: a two-word name with nothing left over but the town stays a search.
  const { ruleAnswer: hut } = load(async () => ({ catalog: true, query: 'pizza hut', places: [] }));
  assert.equal((await hut({ question: 'Pizza Hut', lang: 'en' }, 'http-402')).query, 'pizza hut');
  assert.equal((await hut({ question: 'Pizza Hut in Ponce', lang: 'en' }, 'http-402')).query, 'pizza hut');
  for (const q of ['Find Pizza Hut in Ponce', 'Please find Pizza Hut in Ponce']) assert.equal((await hut({ question: q, lang: 'en' }, 'http-402')).query, 'pizza hut', q);
  const { ruleAnswer: kfc } = load(async () => ({ catalog: true, query: 'kfc', places: [] }));
  assert.equal((await kfc({ question: 'KFC', lang: 'en' }, 'visitor-cap')).query, 'kfc', 'a one-word name search stays a search');
  const { ruleAnswer: none } = load(undefined, async () => null);
  assert.equal((await none({ question: 'Where do Nobody Known fans eat?', lang: 'en' }, 'budget')).kind, 'limit', 'an artist Qloo does not know gets the limit, not a name search');
});

test('a capped island question never answers for the open town (judge panel 10/25 round 8)', async () => {
  const { ruleAnswer } = load();
  const bjork = await ruleAnswer({ question: 'I like Björk. Which town in Puerto Rico fits my taste?', lang: 'en', town: 'Maricao' }, 'visitor-cap');
  assert.equal(bjork.kind, 'artist-towns');
  assert.equal(bjork.speech, "Qloo's heatmap puts Björk's taste strongest in Vieques, Río Grande and Loíza. That is taste, not visits or demand.");
  assert.doesNotMatch(bjork.speech, /Maricao/);
  const es = await ruleAnswer({ question: '¿En qué pueblo están los fans de Bad Bunny?', lang: 'es', town: 'Culebra' }, 'budget');
  assert.match(es.speech, /^El mapa de calor de Qloo ubica el gusto por bad bunny con más fuerza en Vieques, Río Grande y Loíza\. Es afinidad, no visitas ni demanda\.$/);
  // An island question with a business reads the artist ranking against the business groups, never the open town's fans.
  const marc = await ruleAnswer({ question: '¿En qué pueblo abro una cafetería para fans de Marc Anthony?', lang: 'es', town: 'Culebra' }, 'visitor-cap');
  assert.equal(marc.kind, 'artist-business');
  assert.match(marc.speech, /Ninguno de sus 3 primeros está en el grupo brecha para cafetería\./, 'no ranked town is a gap town in this fixture');
  const { ruleAnswer: thin } = load(undefined, undefined, { artistTowns: async () => ({ artist: 'Marc Anthony', towns: [{ town: 'Maricao', cells: 5, thin: true }, { town: 'San Juan', cells: 158 }] }) });
  assert.match((await thin({ question: 'Which town fits Marc Anthony fans?', lang: 'en', town: 'Culebra' }, 'budget')).speech, /Maricao rests on few map cells\.$/);
  for (const answer of [bjork, es]) assert.deepEqual(spokenIssues(answer.speech, answer === es ? 'es' : 'en'), []);
});

test('a capped "is this a good town for a café" reads the siting verdict, not the town food list', async () => {
  const { ruleAnswer } = load();
  assert.deepEqual(await ruleAnswer({ question: 'Is Maricao a good town for a café?', lang: 'en' }, 'http-402'), { business: true, asked: 'open a cafe in Maricao' });
  assert.deepEqual(await ruleAnswer({ question: '¿Conviene una panadería en Maricao?', lang: 'es' }, 'http-402'), { business: true, asked: 'abrir una panaderia en Maricao' });
});

test('the chat route uses this router only after the model and the saved samples', () => {
  const route = serve.slice(serve.indexOf('if (url.pathname === "/api/chat"'), serve.indexOf('if (url.pathname === "/api/ask"'));
  assert.ok(route.indexOf('samples.match(checked.value)') < route.indexOf('await ruleAnswer(checked.value, answer.reason)'));
  assert.doesNotMatch(route, /await patternAnswer\(checked\.value\)/);
});

test('a saved catalog\'s "Today" hours carry the day it was measured (judge panel 10/25 round 8)', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${block('const MONTHS', 'function fact(')}; this.datedHours = datedHours;`, context);
  const { datedHours } = context;
  assert.equal(datedHours('Today 5:00 pm–3:00 am', '2026-10-07'), 'On Oct 7: 5:00 pm–3:00 am');
  assert.equal(datedHours('Closed today', '2026-10-07'), 'Closed on Oct 7');
  assert.equal(datedHours('Today 12:00 am–12:00 am', '2026-10-07'), 'Open 24 hours on Oct 7');
  assert.equal(datedHours('', '2026-10-07'), '');
  assert.equal(datedHours('Today 8:00 am–4:00 pm', undefined), 'Today 8:00 am–4:00 pm', 'no measured day, no change');
  assert.match(serve, /hours: datedHours\(place\.hours, data\.measured\)/);
});

test('a second phone from another source is labeled as another number (judge panel 10/25 round 8)', () => {
  assert.match(serve, /const phoneLabel = \(\) => \(facts\.some\(\(item\) => item\.label === "Phone"\) \? "Other phone" : "Phone"\);/);
  assert.match(serve, /fact\(facts, phoneLabel\(\), ground\.phone, telHref\(ground\.phone\), via\);/);
  assert.match(fs.readFileSync(new URL('../app/dossier.js', import.meta.url), 'utf8'), /"Other phone": "Otro teléfono"/);
});

test('fan wording an evaluator would type reaches the island ranking (round-nine review)', async () => {
  const { ruleAnswer } = load();
  for (const question of ['I am a Bjork fan. Which town in Puerto Rico fits my taste?', "I'm a big Bjork fan, which town fits me?", 'Bjork is my favorite. Which town fits?',
    'Soy fan de Bjork. ¿En qué pueblo me iría mejor?', 'Where in Puerto Rico are Bjork fans strongest?']) {
    const answer = await ruleAnswer({ question, lang: /qué/.test(question) ? 'es' : 'en', town: 'Culebra' }, 'budget');
    assert.equal(answer.kind, 'artist-towns', question);
    assert.doesNotMatch(answer.speech, /Culebra/, question);
    assert.deepEqual(JSON.parse(JSON.stringify(answer.actions)), [{ type: 'fly_town', town: 'Vieques' }], 'the map leaves the old town for the first ranked one');
  }
  const { ruleAnswer: thin } = load(undefined, undefined, { artistTowns: async () => ({ artist: 'Marc Anthony', towns: [{ town: 'Maricao', cells: 5, thin: true }, { town: 'San Juan', cells: 158 }] }) });
  assert.deepEqual(JSON.parse(JSON.stringify((await thin({ question: 'Which town fits Marc Anthony fans?', lang: 'en', town: 'Culebra' }, 'budget')).actions)), [{ type: 'fly_town', town: 'San Juan' }], 'a thin first row is not flown to');
});

test('"fans of X" reads the artist, and an eating question keeps food (round-nine review)', async () => {
  const { ruleAnswer, fansAsk } = load();
  assert.equal(fansAsk('Where do fans of Vico C eat in Mayaguez?'), 'vico c');
  assert.deepEqual(JSON.parse(JSON.stringify(await ruleAnswer({ question: 'Where do fans of Vico C eat in Mayaguez?', lang: 'en', town: 'San Juan' }, 'budget'))),
    { catalog: true, artist: 'vico c', town: 'Mayagüez', kinds: ['food'], take: 30 });
});

test('an island question with an artist and a business reads both rankings, never the open town (round-nine review)', async () => {
  const { ruleAnswer } = load(undefined, undefined, { artistTowns: async () => ({ artist: 'Marc Anthony', towns: ['Maricao', 'San Juan', 'Fajardo', 'Luquillo', 'Guánica'].map((town, i) => ({ town, rank: i + 1, cells: 20 })) }) });
  const es = await ruleAnswer({ question: '¿En qué pueblo abro una cafetería para fans de Marc Anthony?', lang: 'es', town: 'Culebra' }, 'visitor-cap');
  assert.equal(es.kind, 'artist-business');
  assert.deepEqual(JSON.parse(JSON.stringify(es.opportunity)), { industry: 'cafe' });
  assert.equal(es.speech, 'Para fans de Marc Anthony, el mapa de calor de Qloo pone arriba a Maricao, San Juan y Fajardo. De sus 5 primeros, Luquillo y Guánica están en el grupo brecha para cafetería: gusto sobre la mediana y pocos negocios por residente. Es afinidad, no demanda.');
  const en = await ruleAnswer({ question: 'Which town should I open a cafe in for Marc Anthony fans?', lang: 'en', town: 'Culebra' }, 'visitor-cap');
  assert.match(en.speech, /^For Marc Anthony fans, Qloo's heatmap puts Maricao, San Juan and Fajardo on top\. Of their top 5, Luquillo and Guánica are in the café gap group/);
  for (const answer of [es, en]) assert.doesNotMatch(answer.speech, /Culebra/);
  const serve = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  assert.match(serve, /const business = islandArtistBusiness\(checked\.value\.question\) \|\| fansWithoutArtist\(checked\.value\.question\) \? null : await businessAnswer\(checked\.value\);/, 'the route keeps the one-sided business list off it, so the model reads both');
});

test('ROI, payback and margin questions get the no-profit limit, and household income stays a research question (round-nine review)', async () => {
  const { ruleAnswer } = load(async () => ({ catalog: false, speech: 'Hungry in Ponce?' }));
  for (const question of ['What ROI would a bakery in Ponce make?', 'What is the payback on a café in Ponce?', '¿Qué margen deja una panadería en Ponce?']) {
    const answer = await ruleAnswer({ question, lang: /margen/.test(question) ? 'es' : 'en' }, 'budget');
    assert.equal(answer.kind, 'limit', question);
    assert.match(answer.speech, /profit|ganancias/, question);
  }
  assert.notEqual((await ruleAnswer({ question: 'What is the household income in Ponce?', lang: 'en' }, 'budget')).kind, 'limit');
});

test('the artist ranking shares one lookup between simultaneous asks and keeps a confirmed miss (round-nine review)', async () => {
  const calls = { search: 0, heat: 0 };
  const block = serve.slice(serve.indexOf("// The towns where an artist's taste runs strongest"), serve.indexOf('// kinds: the categories to keep'));
  const features = [{ properties: { COUNTY: '147', NAME: 'Vieques Municipio' }, geometry: { type: 'Polygon', coordinates: [[[-65.6, 18.0], [-65.2, 18.0], [-65.2, 18.2], [-65.6, 18.2], [-65.6, 18.0]]] } }];
  const context = { fold, tasteByTown, municipios: features, townNames: ['Vieques'], URLSearchParams, process: { env: {} },
    qlooArtist: async (q) => { calls.search += 1; await new Promise((r) => setTimeout(r, 10)); return q === 'nobody' ? null : { name: 'Björk', entity_id: 'b' }; },
    qlooFetch: async () => { calls.heat += 1; return { ok: true, json: async () => ({ results: { heatmap: Array.from({ length: 6 }, (_, i) => ({ location: { latitude: 18.1, longitude: -65.4 - i / 100 }, query: { affinity: 0.7 } })) } }) }; } };
  vm.createContext(context);
  vm.runInContext(`${block}; this.artistTowns = artistTowns;`, context);
  const [a, b] = await Promise.all([context.artistTowns('Björk'), context.artistTowns('bjork')]);
  assert.equal(a, b);
  assert.deepEqual({ ...calls }, { search: 1, heat: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(a.towns)), [{ town: 'Vieques', rank: 1, cells: 6, thin: true }]);
  await context.artistTowns('nobody'); await context.artistTowns('nobody');
  assert.equal(calls.search, 2, 'a confirmed miss is asked once');
});

test('second pass: "in Puerto Rico" wording keeps the artist, and the answer carries both sources (round-nine review)', async () => {
  const marc = { artistTowns: async () => ({ artist: 'Marc Anthony', ranked: 77, retrievedAt: '2026-10-26T00:00:00.000Z', towns: ['Maricao', 'San Juan', 'Fajardo', 'Luquillo'].map((town, i) => ({ town, rank: i + 1, cells: 20 })) }) };
  const { ruleAnswer } = load(undefined, undefined, marc);
  for (const [question, lang] of [['Where should I open a cafe in Puerto Rico for Marc Anthony fans?', 'en'], ['¿Dónde debería abrir una cafetería en Puerto Rico para fans de Marc Anthony?', 'es']]) {
    const answer = await ruleAnswer({ question, lang, town: 'Culebra' }, 'budget');
    assert.equal(answer.kind, 'artist-business', question);
    assert.match(answer.speech, /Marc Anthony/);
    const calls = JSON.parse(JSON.stringify(answer.evidence.calls));
    assert.deepEqual(calls.map((c) => c.tool), ['artist_towns', 'opportunity_map']);
    assert.equal(answer.evidence.mode, 'sources');
    assert.equal(calls[1].retrievedAt, '2026-10-11T07:13:59.194Z');
  }
});

test('second pass: a drink or a dish is not an artist, and an artist named like a café is not a business (round-nine review)', async () => {
  const { ruleAnswer, fansAsk } = load();
  assert.equal((await ruleAnswer({ question: 'I am a coffee fan. Which town in Puerto Rico fits my taste?', lang: 'en', town: 'Culebra' }, 'budget')).kind, 'limit');
  assert.equal((await ruleAnswer({ question: 'Pizza is my favorite. Which town in Puerto Rico fits my taste?', lang: 'en', town: 'Culebra' }, 'budget')).kind, 'limit');
  const tacvba = await ruleAnswer({ question: 'Where in Puerto Rico are Café Tacvba fans strongest?', lang: 'en', town: 'Culebra' }, 'budget');
  assert.equal(tacvba.kind, 'artist-towns', 'no business was asked, so no gap list');
  assert.equal(tacvba.opportunity, undefined);
  assert.equal(fansAsk('Where in Puerto Rico should Marc Anthony fans open a cafe?'), 'marc anthony');
  assert.equal(fansAsk('Which town should Marc Anthony fans open a cafe in?'), 'marc anthony');
  assert.equal(fansAsk('Where in Puerto Rico are fans of Vico C strongest?'), 'vico c');
  assert.equal(fansAsk('Which town fits fans of Vico C best?'), 'vico c');
  assert.equal(fansAsk('Where do The Weeknd fans eat in San Juan?'), 'the weeknd');
  assert.equal(fansAsk('What do locals and fans like in San Juan?'), '');
  assert.equal(fansAsk('What do locals or fans like in San Juan?'), '');
  assert.equal((await ruleAnswer({ question: 'What do locals and fans like in San Juan?', lang: 'en', town: 'San Juan' }, 'budget')).kind, 'limit', 'never a search for "Local"');
});

test('second pass: an all-thin ranking still leaves the open town, with its warning (round-nine review)', async () => {
  const { ruleAnswer } = load(undefined, undefined, { artistTowns: async () => ({ artist: 'Mima', ranked: 3, towns: [{ town: 'San Juan', cells: 6, thin: true }, { town: 'Ponce', cells: 5, thin: true }] }) });
  const answer = await ruleAnswer({ question: 'I like Mima. Which town in Puerto Rico fits my taste?', lang: 'en', town: 'Maricao' }, 'budget');
  assert.deepEqual(JSON.parse(JSON.stringify(answer.actions)), [{ type: 'fly_town', town: 'San Juan' }]);
  assert.match(answer.speech, /San Juan rests on few map cells\.$/);
  assert.equal(answer.evidence.calls[0].tool, 'artist_towns');
});

test('third pass: a town after "besides" or "fuera de" is ruled out, never answered for (round-nine review)', async () => {
  const seen = [];
  const { ruleAnswer } = load(async (body) => { seen.push(body); return { catalog: true, query: 'x', places: [{ name: 'x' }] }; });
  const bjork = await ruleAnswer({ question: 'Which town besides Vieques fits Bjork fans?', lang: 'en', town: 'Culebra' }, 'budget');
  assert.equal(bjork.kind, 'artist-towns');
  assert.doesNotMatch(bjork.speech, /Vieques/);
  assert.equal(bjork.speech, "Qloo's heatmap puts Björk's taste strongest in Río Grande and Loíza. That is taste, not visits or demand.");
  const marc = await ruleAnswer({ question: 'Where in Puerto Rico besides San Juan should I open a cafe for Marc Anthony fans?', lang: 'en', town: 'Culebra' }, 'budget');
  assert.equal(marc.kind, 'artist-business');
  await ruleAnswer({ question: 'Where in Puerto Rico besides San Juan are the best beaches?', lang: 'en', town: 'San Juan' }, 'budget');
  assert.equal(seen.at(-1).town, '', 'the island search never uses the open town');
  assert.doesNotMatch(seen.at(-1).question, /san juan/i, 'nor the town it rules out');
});

test('third pass: names with "the" or "of" inside, business words after the name, and a fans question in Spanish (round-nine review)', async () => {
  const known = new Set(['tyler the creator', 'the rolling stones', 'marc anthony', 'bread']);
  const { ruleAnswer, fansAsk } = load(undefined, undefined, { artistTowns: async (name) => known.has(name)
    ? { artist: name, ranked: 70, towns: [{ town: 'Luquillo', cells: 20 }, { town: 'Ponce', cells: 30 }] } : { error: `Qloo has no artist named ${name}.` } });
  for (const [question, artist] of [['Where in Puerto Rico are Tyler the Creator fans strongest?', 'tyler the creator'], ['Where in Puerto Rico are The Rolling Stones fans strongest?', 'the rolling stones'],
    ['Where in Puerto Rico are fans of Bread strongest?', 'bread']]) {
    const answer = await ruleAnswer({ question, lang: 'en', town: 'Culebra' }, 'budget');
    assert.equal(answer.kind, 'artist-towns', question);
    assert.match(answer.speech, new RegExp(artist), question);
  }
  assert.equal(fansAsk('Where in Puerto Rico should fans of Marc Anthony open a cafe?'), 'marc anthony');
  assert.equal((await ruleAnswer({ question: 'Where in Puerto Rico should fans of Marc Anthony open a cafe?', lang: 'en', town: 'Culebra' }, 'budget')).kind, 'artist-business');
  for (const question of ['Where should a cafe for Marc Anthony fans open in Puerto Rico?', 'Where should I set up a cafe in Puerto Rico for Marc Anthony fans?'])
    assert.equal((await ruleAnswer({ question, lang: 'en', town: 'Culebra' }, 'budget')).kind, 'artist-business', question);
  for (const question of ['¿Qué les gusta a los fans en San Juan?', '¿Qué les gusta a los admiradores en San Juan?'])
    assert.equal((await ruleAnswer({ question, lang: 'es', town: 'San Juan' }, 'budget')).kind, 'limit', question);
  const serve = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  assert.match(serve, /const business = islandArtistBusiness\(checked\.value\.question\) \|\| fansWithoutArtist\(checked\.value\.question\) \? null : await businessAnswer\(checked\.value\);/,
    'a fans question with no artist never takes the business shortcut');
});

test('a refusal or an off-map town returns the panel to the open town, not the last question (judge panel 10/26)', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const branch = html.slice(html.indexOf('if (data.chat) {'), html.indexOf('if (data.catalog) {'));
  assert.match(branch, /\["limit", "outside"\]\.includes\(data\.kind\) && !townView && pickedId && byName\.has\(pickedId\)/);
  assert.match(branch, /openTownView\(record\);\s*Promise\.all\(\[loadPlaces\(record\)\.catch\(\(\) => \{\}\), loadDirectory\(record\.town\)\]\);/);
});
test('a late town load never replaces a newer answer (Codex review, round ten)', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(html, /async function loadPlaces\(record\) \{\s*const token = \+\+placesToken;/);
  assert.match(html, /if \(token !== placesToken \|\| !townView \|\| pickedId !== record\.town\) return false;/);
  assert.match(html, /function showCatalog\(data, opts = \{\}\) \{[^]*?townView = false;\s*placesToken \+= 1;/);
});

test('wanting to make money is still a siting question; asking which makes the most is a money question (Codex review, round ten)', async () => {
  const { createBusinessDiscovery } = await import('../server/business.mjs');
  const discover = createBusinessDiscovery({ towns: ['Ponce'], catalog: async () => [] });
  assert.ok(await discover({ question: 'I want to open a bakery in Ponce so I can make money.', lang: 'en' }), 'the siting answer stays');
  assert.equal(MONEY_QUESTION.test(fold('Which town makes the most money for a bakery?')), true);
  assert.equal(MONEY_QUESTION.test(fold('I want to open a bakery so I can make money')), false);
});
test('a retired town load paints nothing, so a newer answer is never left on the loading skeleton (Codex review, round ten)', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(html, /if \(token !== placesToken \|\| !townView \|\| pickedId !== record\.town\) return false;/);
  assert.match(html, /enrichPlaces\(record\.town, taste, query\);\s*return true;\s*\}/);
  assert.match(html, /\.then\(\(applied\) => \{[^]*?if \(applied && townView && pickedId === name && !leadNames\.length && !dirCat\) return openCategory\("all"\);/);
});