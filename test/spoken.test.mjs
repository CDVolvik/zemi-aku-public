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
    'Maunabo’s a small one. A handful of restaurants show up in Qloo, and other map data counts a couple dozen across town. Want to see who’s nearby?');
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
  assert.match(en(24), /A couple dozen shops show up in Qloo\./);
  assert.match(es(0), /En Qloo no aparecen tiendas\./);
  assert.match(es(1), /En Qloo aparece una sola entrada de tiendas\./);
  assert.match(es(2), /En Qloo aparecen un par de tiendas\./);
  assert.match(es(5), /En Qloo aparecen un puñado de tiendas\./);
  assert.match(es(24), /En Qloo aparecen un par de docenas de tiendas\./);
  for (const line of [en(0), en(1), es(0), es(1), es(24)]) assert.deepEqual(spokenIssues(line, /Qloo aparece/.test(line) ? 'es' : 'en'), []);
  assert.match(spoken('business', { ...base, mode: 'buy', town: 'Lajas', count: 1, label: 'shops' }, 'en'), /Qloo has one entry under shops to explore\./);
  assert.match(spoken('business', { ...base, mode: 'buy', town: 'Lajas', count: 0, label: 'tiendas' }, 'es'), /Qloo no tiene tiendas aquí\./);
});

test('a nearby slice is not judged as the town’s size, and zero in Qloo still mentions other map data', () => {
  const near = spoken('business', { town: 'Bayamón', mode: 'research', available: true, count: 4, supplyCount: 300, category: 'food', label: 'cafés', topic: null, metric: null, taste: null, proximity: { reference: 'Coffee from 2' } }, 'en');
  assert.doesNotMatch(near, /small one/);
  assert.match(near, /within 3 kilometers of Coffee from 2/);
  const none = spoken('business', { town: 'Culebra', mode: 'research', available: true, count: 0, supplyCount: 3, category: 'food', label: 'bakeries', topic: null, metric: null, taste: null, proximity: null }, 'en');
  assert.match(none, /No bakeries show up in Qloo, but other map data counts a handful across town\./);
  assert.match(spoken('business', { town: 'Bayamón', mode: 'research', available: true, count: 15, category: 'food', label: 'cafés', topic: 'population', metric: { kind: 'population', estimate: 185996 } }, 'es'), /unas 186 mil personas/);
});
