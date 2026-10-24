import test from 'node:test';
import assert from 'node:assert/strict';
import { spoken, spokenIssues, roughCount, roughThousands, SAMPLE_DATA } from '../server/spoken.mjs';

test('spokenIssues names each broken rule and passes a clean line', () => {
  assert.deepEqual(spokenIssues('Maunabo’s a small one. Want to see who’s nearby?', 'en'), []);
  assert.deepEqual(spokenIssues('Overture lists 24 places in its 2026-09-23.1 release. See https://x.y?', 'en').sort(),
    ['date', 'decimal', 'release', 'source', 'url']);
  assert.ok(spokenIssues('x'.repeat(281), 'en').includes('length'));
  assert.ok(spokenIssues('Income is 31,354 dollars ± 910, 90%.', 'en').includes('bignumber'));
  assert.ok(spokenIssues('Income is 31,354 dollars ± 910, 90%.', 'en').includes('percent'));
  assert.ok(spokenIssues('¿Qué quieres? ¿Tienes tiempo?', 'es').includes('tu'));
  assert.ok(spokenIssues('¿Y usted? ¿Cómo está?', 'es').includes('questions'));
  assert.deepEqual(spokenIssues('Ponce se fundó en 1692. ¿Quiere ver la plaza?', 'es'), []);
});

test('roughCount and roughThousands round the way a person talks', () => {
  assert.equal(roughCount(6, 'en'), 'a handful');
  assert.equal(roughCount(24, 'es'), 'un par de docenas');
  assert.equal(roughCount(0, 'en'), 'none');
  assert.equal(roughCount(900, 'en'), 'hundreds');
  assert.equal(roughThousands(31354, 'en'), 'about 31 thousand');
  assert.equal(roughThousands(185996, 'es'), 'unos 186 mil');
  assert.equal(roughThousands(400, 'en'), 'a few hundred');
});

test('the Maunabo readout matches the spec target line', () => {
  assert.equal(spoken('business', { town: 'Maunabo', mode: 'research', available: true, count: 6, supplyCount: 24, category: 'food', label: 'restaurants', topic: null, metric: null, taste: null, proximity: null }, 'en'),
    'Maunabo’s a small one. 6 restaurants show up in Qloo, and other map data counts 24 across town. Want to see who’s nearby?');
});

test('every kind in both languages passes the rules on sample data', () => {
  for (const lang of ['en', 'es']) for (const [kind, data] of SAMPLE_DATA) {
    const line = spoken(kind, data, lang);
    assert.ok(line, `${kind} ${lang} is empty`);
    assert.deepEqual(spokenIssues(line, lang), [], `${kind} ${lang}: ${line}`);
  }
});

test('missing catalog and supply still give a short honest line', () => {
  const line = spoken('business', { town: 'Culebra', mode: 'research', available: false, count: 0, supplyCount: null, category: 'all', label: 'places', topic: null, metric: null, taste: null, proximity: null }, 'en');
  assert.deepEqual(spokenIssues(line, 'en'), []);
  assert.match(line, /Culebra/);
  assert.match(line, /\?$/);
});

test('five-digit figures are spoken in thousands and the question is dropped for a figure', () => {
  const income = spoken('business', { town: 'Bayamón', mode: 'research', available: true, count: 15, supplyCount: 62, category: 'food', label: 'cafés', topic: 'income', metric: { kind: 'income', estimate: 31354 } }, 'en');
  assert.match(income, /about 31 thousand dollars/);
  assert.doesNotMatch(income, /31,354|\?/);
  assert.match(spoken('business', { town: 'Bayamón', mode: 'research', available: true, count: 15, category: 'food', label: 'cafés', topic: 'population', metric: { kind: 'population', estimate: 185996 } }, 'es'), /unas 186 mil personas/);
});

test('a long brief is trimmed to the limit by dropping the last sentence first', () => {
  const lead = Array.from({ length: 3 }, (_, i) => ({ name: `A very long restaurant name number ${i} in the old quarter`, kind: 'Puerto Rican restaurant' }));
  const line = spoken('catalog', { town: 'San Sebastián', question: 'Where can I eat in San Sebastián?', intent: 'Food', matched: true, lead,
    neighbors: [{ name: 'Another long name', city: 'Lares' }], thin: true }, 'en');
  assert.ok(line.length <= 280, `${line.length}`);
  assert.match(line, /^Hungry in San Sebastián\?/);
});

test('counts of zero, one, two and many read as grammatical sentences in both languages', () => {
  const base = { mode: 'research', available: true, supplyCount: null, category: 'retail', topic: null, metric: null, taste: null, proximity: null };
  const en = (count) => spoken('business', { ...base, town: 'Lajas', count, label: 'shops' }, 'en');
  const es = (count) => spoken('business', { ...base, town: 'Lajas', count, label: 'tiendas' }, 'es');
  assert.match(en(0), /^Lajas’s a small one\. No shops show up in Qloo\./);
  assert.match(en(1), /Just one entry under shops shows up in Qloo\./);
  assert.match(en(2), /A couple of shops show up in Qloo\./);
  assert.match(en(24), /24 shops show up in Qloo\./);
  assert.match(es(0), /En Qloo no aparecen tiendas\./);
  assert.match(es(1), /En Qloo aparece una sola entrada de tiendas\./);
  assert.match(es(2), /En Qloo aparecen un par de tiendas\./);
  assert.match(es(5), /En Qloo aparecen 5 tiendas\./);
  assert.match(es(24), /En Qloo aparecen 24 tiendas\./);
  for (const line of [en(0), en(1), es(0), es(1), es(24)]) assert.deepEqual(spokenIssues(line, /Qloo aparece/.test(line) ? 'es' : 'en'), []);
  assert.match(spoken('business', { ...base, mode: 'buy', town: 'Lajas', count: 1, label: 'shops' }, 'en'), /Qloo has one entry under shops to explore\./);
  assert.match(spoken('business', { ...base, mode: 'buy', town: 'Lajas', count: 0, label: 'tiendas' }, 'es'), /Qloo no tiene tiendas aquí\./);
});

test('a nearby slice is not judged as the town’s size, and zero in Qloo still mentions other map data', () => {
  const near = spoken('business', { town: 'Bayamón', mode: 'research', available: true, count: 4, supplyCount: 300, category: 'food', label: 'cafés', topic: null, metric: null, taste: null, proximity: { reference: 'Coffee from 2' } }, 'en');
  assert.doesNotMatch(near, /small one/);
  assert.match(near, /within 3 kilometers of Coffee from 2/);
  const none = spoken('business', { town: 'Culebra', mode: 'research', available: true, count: 0, supplyCount: 3, category: 'food', label: 'bakeries', topic: null, metric: null, taste: null, proximity: null }, 'en');
  assert.match(none, /No bakeries show up in Qloo, but other map data counts 3 across town\./);
  assert.match(spoken('business', { town: 'Bayamón', mode: 'research', available: true, count: 15, category: 'food', label: 'cafés', topic: 'population', metric: { kind: 'population', estimate: 185996 } }, 'es'), /unas 186 mil personas/);
});

// Judge panel 10/23: the panel said "Gap: few businesses" while the bubble said "San Juan's busy". When the
// opportunity row exists, speech leads with that verdict and the exact figures, never with a size clause.
const sanJuan = { town: 'San Juan', mode: 'research', available: true, count: 35, supplyCount: 64, category: 'food', label: 'bakeries', topic: null, metric: null, taste: null, proximity: null,
  opportunity: { group: 'gap', tasteRank: 5, ranked: 78, establishments: 16, establishmentsMax: 16, suppressed: false, perTenThousand: 0.476, perTenThousandMax: 0.476, islandPerTenThousand: 0.8 } };
test('a town with an opportunity verdict is spoken as that verdict with exact counts, in both languages', () => {
  const en = spoken('business', sanJuan, 'en');
  assert.equal(en, 'San Juan is a gap for bakeries: strong taste, rank 5 of 78, and few businesses, 16 establishments with employees, about 5 per hundred thousand residents against 8 island-wide. Qloo lists 35 and other map data 64. A lead, not proof: visit and check rents.');
  assert.doesNotMatch(en, /busy|some options|small one|about fifty|couple dozen/);
  assert.deepEqual(spokenIssues(en, 'en'), []);
  const es = spoken('business', { ...sanJuan, label: 'panaderías' }, 'es');
  assert.equal(es, 'San Juan es una brecha para panaderías: mucha afinidad, puesto 5 de 78, y pocos negocios, 16 establecimientos con empleados, unos 5 por cada cien mil residentes frente a 8 en la isla. Qloo registra 35 y otros datos del mapa 64. Pista, no prueba: visite y revise rentas.');
  assert.deepEqual(spokenIssues(es, 'es'), []);
});

test('when the file carries the median the groups split on, the verdict quotes that median, not the island average', () => {
  const ponce = { ...sanJuan, town: 'Ponce', opportunity: { ...sanJuan.opportunity, establishments: 15, perTenThousand: 1.13, medianPerTenThousand: 1.3, islandPerTenThousand: 0.76 } };
  const en = spoken('business', ponce, 'en');
  assert.match(en, /few businesses, 15 establishments with employees, about 11 per hundred thousand residents against a median of 13\./);
  assert.doesNotMatch(en, /island-wide/);
  const es = spoken('business', { ...ponce, label: 'panaderías' }, 'es');
  assert.match(es, /frente a una mediana de 13\./);
  for (const [l, lang] of [[en, 'en'], [es, 'es']]) assert.deepEqual(spokenIssues(l, lang), []);
});

test('the four other verdicts and a suppressed count each read as their own sentence', () => {
  const line = (patch, lang = 'en') => spoken('business', { ...sanJuan, town: 'Adjuntas', opportunity: { ...sanJuan.opportunity, ...patch } }, lang);
  assert.match(line({ group: 'competitive', tasteRank: 32, establishments: 5, perTenThousand: 2.8 }), /^Adjuntas is competitive for bakeries: strong taste, rank 32 of 78, but many businesses, 5 establishments with employees, about 28 per hundred thousand residents against 8 island-wide\./);
  assert.match(line({ group: 'competitive', tasteRank: 32, establishments: 5, perTenThousand: 2.8 }), /Compare what two local competitors sell\.$/);
  // The next step survives a long town and label: the catalog counts go before it does (Codex 10/24).
  const closings = { gap: /revise rentas\.$/, competitive: /competidores locales\.$/, quiet: /antes de apostar\.$/, crowded: /nadie atiende\.$/ };
  for (const [group, tail] of Object.entries(closings)) {
    const long = spoken('business', { ...sanJuan, town: 'Trujillo Alto', label: 'salones de belleza', opportunity: { ...sanJuan.opportunity, group, tasteRank: 17, ranked: 70 } }, 'es');
    assert.match(long, tail, long);
    assert.ok(long.length <= 280, long);
    assert.deepEqual(spokenIssues(long, 'es'), []);
  }
  assert.match(line({ group: 'quiet', tasteRank: 50 }), /^Adjuntas is quiet for bakeries: less taste, rank 50 of 78, and few businesses/);
  assert.match(line({ group: 'crowded', tasteRank: 60, establishments: 9, perTenThousand: 3.1 }), /^Adjuntas is crowded for bakeries: less taste, rank 60 of 78, and many businesses/);
  const unknown = line({ group: 'unknown', tasteRank: 37, establishments: 0, establishmentsMax: 2, suppressed: true, perTenThousand: 0, perTenThousandMax: 1.1 });
  assert.equal(unknown, 'Not enough data for bakeries in Adjuntas: no published count, 0 to 2 establishments, and taste rank 37 of 78. Qloo lists 35 and other map data 64. Visit before you decide.');
  const unknownEs = line({ group: 'unknown', tasteRank: 37, establishments: 0, establishmentsMax: 2, suppressed: true, perTenThousand: 0, perTenThousandMax: 1.1 }, 'es');
  assert.match(unknownEs, /^No hay datos suficientes para bakeries en Adjuntas: sin cifra publicada, de 0 a 2 establecimientos, y afinidad puesto 37 de 78\./);
  for (const l of [unknown, unknownEs]) assert.deepEqual(spokenIssues(l, l === unknownEs ? 'es' : 'en'), []);
  // Unknown for lack of taste data keeps the published count and says what is missing instead of inventing a suppression.
  assert.equal(line({ group: 'unknown', tasteRank: null, establishments: 12, establishmentsMax: 12, suppressed: false, perTenThousand: 2.1 }),
    'Not enough data for bakeries in Adjuntas: 12 establishments, and no taste data. Qloo lists 35 and other map data 64. Visit before you decide.');
  // A grouped row with its numbers missing falls back to the plain readout rather than saying "undefined".
  const partial = line({ group: 'gap', establishments: undefined, perTenThousand: undefined, islandPerTenThousand: undefined });
  assert.doesNotMatch(partial, /undefined|NaN|is a gap/);
  assert.match(partial, /35 bakeries show up in Qloo/);
});

test('a suppressed Census count in a grouped town is spoken as a range, and zero in Qloo reads naturally in Spanish', () => {
  const loiza = { ...sanJuan, town: 'Loíza', count: 0, supplyCount: 7, label: 'salones de belleza',
    opportunity: { ...sanJuan.opportunity, establishments: 0, establishmentsMax: 4, suppressed: true, perTenThousand: 0, perTenThousandMax: 1.6, islandPerTenThousand: 1.0 } };
  const es = spoken('business', loiza, 'es');
  assert.equal(es, 'Loíza es una brecha para salones de belleza: mucha afinidad, puesto 5 de 78, y pocos negocios, sin cifra publicada, de 0 a 4 establecimientos. Qloo no registra ninguno y otros datos del mapa 7. Pista, no prueba: visite y revise rentas.');
  assert.deepEqual(spokenIssues(es, 'es'), []);
  assert.match(spoken('business', { ...loiza, label: 'salons' }, 'en'), /few businesses, no published count, 0 to 4 establishments\. Qloo lists none and other map data 7\. A lead, not proof/);
});

test('a topic question or a nearby slice keeps its own line even when a verdict exists', () => {
  assert.match(spoken('business', { ...sanJuan, topic: 'income', metric: { kind: 'income', estimate: 27992 } }, 'en'), /about 28 thousand dollars/);
  assert.match(spoken('business', { ...sanJuan, proximity: { reference: 'Pan Café' } }, 'en'), /within 3 kilometers of Pan Café/);
  assert.doesNotMatch(spoken('business', { ...sanJuan, proximity: { reference: 'Pan Café' } }, 'en'), /is a gap/);
});
