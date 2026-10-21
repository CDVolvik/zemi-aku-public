import test from 'node:test';
import assert from 'node:assert/strict';
import { businessRequest, createBusinessDiscovery } from '../server/business.mjs';

const towns = ['Bayamón', 'Ponce'];
const places = [
  { id: 'anchor', name: 'Reference café', genre: 'Cafe', lat: 18.4, lon: -66.15 },
  { id: 'close', name: 'Close café', genre: 'Cafe', lat: 18.401, lon: -66.15 },
  { id: 'far', name: 'Far café', genre: 'Cafe', lat: 18.41, lon: -66.15 },
  { id: 'bakery', name: 'Bakery', genre: 'Bakery', lat: 18.402, lon: -66.15 },
  { id: 'unknown', name: 'Café without coordinates', genre: 'Cafe' },
];
const census = { period: '2020–2024', sourceUrl: 'https://api.census.gov/data/2024/acs/acs5',
  population: { estimate: 182469, unit: 'people', marginOfError: null },
  medianHouseholdIncome: { estimate: 31354, marginOfError: 910, unit: 'USD (2024 inflation-adjusted)' },
};
const ground = { release: '2026-09-23.1', places: [
  { id: 'o-cafe', name: 'Overture café', category: 'cafe', hierarchy: ['food_and_drink', 'cafe'] },
  { id: 'o-bakery', name: 'Overture bakery', category: 'bakery', hierarchy: ['food_and_drink', 'bakery'] },
] };
const make = (options = {}) => createBusinessDiscovery({ towns, catalog: async () => places,
  context: async () => ({ census, overture: ground }), ...options });

test('opening and business-research questions reach the existing flow in English and Spanish', async () => {
  const phrases = ['Should I open a cafe in Bayamon?', 'I want to start a bakery in Bayamon',
    'Business opportunities in Bayamon', 'Who are my competitors in Bayamon?',
    'What is the local demand for a cafe in Bayamon?', 'Median household income in Bayamon',
    'Population of Bayamon', 'Quiero abrir una cafetería en Bayamón',
    'Montar una panadería en Bayamón', 'Oportunidades de negocio en Bayamón',
    '¿Qué competencia hay en Bayamón?', 'Demanda de cafeterías en Bayamón',
    'Ingreso de los hogares en Bayamón', 'Población de Bayamón'];
  for (const question of phrases) {
    const answer = await make()({ question, lang: 'en' });
    assert.equal(answer?.town, 'Bayamón', question);
    assert.ok(answer.business, question);
  }
});

test('café peers exclude bakeries while a food request keeps both', async () => {
  const cafe = await make()({ question: 'Open a cafe in Bayamon' });
  assert.ok(cafe, 'Opening a café should yield business research');
  assert.deepEqual(cafe.places.map(p => p.id), ['anchor', 'close', 'far', 'unknown']);
  assert.equal(cafe.business.type, 'cafe');
  const food = await make()({ question: 'Buy a food business in Bayamon' });
  assert.equal(food.business.total, 5);
});

test('demographic follow-ups retain the researched town and café type', async () => {
  const history = [{ role: 'user', content: 'Open a cafe in Bayamon' }];
  const answer = await make()({ question: 'What about household income?', history });
  assert.ok(answer, 'Income should continue business research');
  assert.equal(answer.town, 'Bayamón');
  assert.equal(answer.business.type, 'cafe');
  assert.equal(answer.business.evidence.demographics.period, '2020–2024');
  assert.match(answer.speech, /about 31 thousand dollars/);
  assert.doesNotMatch(answer.speech, /31,354|910/);
  assert.equal(answer.business.evidence.demographics.medianHouseholdIncome.estimate, 31354);
});

test('category and town changes preserve only the current business conversation', async () => {
  const history = [{ role: 'user', content: 'Open a cafe in Bayamon' },
    { role: 'user', content: 'What about income?' }];
  const bakery = await make()({ question: 'What about a bakery?', history });
  assert.ok(bakery, 'A category follow-up should yield business research');
  assert.equal(bakery.business.type, 'bakery');
  assert.deepEqual(bakery.places.map(p => p.id), ['bakery']);
  const ponce = await make()({ question: 'And Ponce?', history });
  assert.equal(ponce.town, 'Ponce');
  assert.equal(ponce.business.type, 'cafe');
  assert.equal(businessRequest({ question: 'Who was the mayor in 1990?', history }, towns), null);
  assert.equal(businessRequest({ question: 'Where can I eat in Ponce?', history }, towns), null);
});

test('Census and Overture evidence stay separate from Qloo records and expose freshness', async () => {
  const answer = await make()({ question: 'Open a cafe in Bayamon' });
  assert.ok(answer, 'Opening should expose sourced evidence');
  assert.equal(answer.business.evidence.supply.source, 'Overture');
  assert.equal(answer.business.evidence.supply.count, 1);
  assert.equal(answer.business.evidence.supply.release, '2026-09-23.1');
  assert.equal(answer.business.evidence.demographics.medianHouseholdIncome.marginOfError, 910);
  assert.ok(answer.places.every(p => !p.id.startsWith('o-')));
  assert.match(answer.note, /not.*(?:demand|profitability)/i);
});

test('nearby peers require a verified reference and are ordered by straight-line distance', async () => {
  const question = 'Competitors near this place';
  const history = [{ role: 'user', content: 'Open a cafe in Bayamon' }];
  const answer = await make()({ question, history, referenceId: 'anchor' });
  assert.ok(answer, 'Nearby competition should yield business research');
  assert.deepEqual(answer.places.map(p => p.id), ['close', 'far']);
  assert.ok(answer.places[0].distanceKm < answer.places[1].distanceKm);
  assert.equal(answer.business.proximity.reference.name, 'Reference café');
  assert.match(answer.business.proximity.note, /straight.line/i);
  const forged = await make()({ question, history, referenceId: 'not-in-catalog' });
  assert.equal(forged.business.proximity.reference, null);
  assert.match(forged.speech, /(?:choose|select|open).*place/i);
  assert.ok(forged.places.every(p => p.distanceKm === undefined));
});

test('missing Qloo can still expose public ground evidence without fabricated affinity', async () => {
  const answer = await make({ catalog: async () => { throw Error('unavailable'); } })({ question: 'Open a cafe in Bayamon' });
  assert.ok(answer, 'Missing Qloo must still permit public context');
  assert.equal(answer.business.available, false);
  assert.equal(answer.business.evidence.supply.count, 1);
  assert.equal(answer.business.evidence.demographics.population.estimate, 182469);
  assert.deepEqual(answer.places, []);
  assert.match(answer.speech, /(?:isn’t available|unavailable)/);
});

test('missing context stays unknown, and “demand” does not become an opportunity score', async () => {
  const answer = await make({ context: async () => { throw Error('unavailable'); } })({ question: 'Demand for a cafe in Bayamon' });
  assert.ok(answer, 'Demand questions should yield bounded research');
  assert.equal(answer.business.evidence.demographics, null);
  assert.equal(answer.business.evidence.supply, null);
  assert.match(answer.speech, /(?:don’t measure|doesn’t measure|not measured)/);
  assert.equal(answer.business.opportunityScore, undefined);
});

test('additional ground places are labeled and cannot acquire invented Qloo affinity', async () => {
  const answer = await make()({ question: 'Open a cafe in Bayamon' });
  assert.deepEqual(answer.business.evidence.supply.places, [{ name: 'Overture café', category: 'cafe' }]);
  assert.equal(answer.business.evidence.supply.places[0].affinity, undefined);
});

test('proximity metadata survives publication of a normalized Qloo record', async () => {
  const answer = await make({ publish: p => ({ id: p.id, name: p.name }) })({
    question: 'Competitors near this place', referenceId: 'anchor',
    history: [{ role: 'user', content: 'Open a cafe in Bayamon' }],
  });
  assert.ok(Number.isFinite(answer.places[0].distanceKm));
  assert.equal(answer.places[0].distanceFrom, 'Reference café');
});

test('an empty Qloo taste response is distinguished from unavailable evidence', async () => {
  const empty = await make({ culture: async () => ({ music: [], vibe: [], tv: [] }) })({ question: 'Local tastes in Bayamon' });
  assert.equal(empty.business.evidence.taste.status, 'empty');
  assert.match(empty.speech, /no.*(?:signals|affinities)/i);
  const failed = await make({ culture: async () => { throw Error('offline'); } })({ question: 'Local tastes in Bayamon' });
  assert.equal(failed.business.evidence.taste.status, 'unavailable');
  assert.match(failed.speech, /unavailable/);
});

test('nested Qloo genre identifiers retain café and bakery specificity', async () => {
  const saved = [
    { id: 'coffee', genre: 'Coffee shop', genreId: 'urn:tag:genre:place:restaurant:coffee_shop' },
    { id: 'bread', genre: 'Bakery', genreId: 'urn:tag:genre:place:restaurant:bakery' },
    { id: 'pizza', genre: 'Pizza restaurant', genreId: 'urn:tag:genre:place:restaurant:pizza' },
  ];
  const research = make({ catalog: async () => saved });
  assert.deepEqual((await research({ question: 'Open a cafe in Bayamon' })).places.map(p => p.id), ['coffee']);
  assert.deepEqual((await research({ question: 'Open a bakery in Bayamon' })).places.map(p => p.id), ['bread']);
});

test('business and opportunity answers carry a sources evidence line for the drawer', async () => {
  const saved = { industry: 'bakery', label: { en: 'bakeries', es: 'panaderías' }, towns: [{ town: 'Bayamón', group: 'competitive', tasteRank: 3, establishments: 13, employees: 190, perTenThousand: 1.8, population: 70000 }] };
  const research = make({ opportunity: { get: id => (id === 'bakery' ? saved : null) } });
  const town = await research({ question: 'Open a bakery in Bayamon', lang: 'en' });
  assert.equal(town.evidence.mode, 'sources');
  assert.equal(town.evidence.kind, 'business');
  assert.deepEqual(town.evidence.calls.map(c => c.tool), ['town_catalog', 'overture_supply', 'census_prcs', 'opportunity_map']);
  assert.equal(town.evidence.calls[0].count, town.business.total);
  assert.equal(town.evidence.calls[1].count, 1);
  assert.match(town.evidence.calls[2].note, /2020/);
  assert.match(town.evidence.at, /^\d{4}-\d{2}-\d{2}T/);
  const island = await research({ question: 'Where should I open a bakery?', lang: 'en' });
  assert.equal(island.kind, 'opportunity');
  assert.equal(island.evidence.mode, 'sources');
  assert.equal(island.evidence.kind, 'opportunity');
  assert.deepEqual(island.evidence.calls.map(c => c.tool), ['opportunity_map']);
  assert.equal(island.evidence.calls[0].note, '1 towns');
  assert.equal(town.evidence.calls[3].note, '1 towns · competitive');
  const bare = await make()({ question: 'Open a bakery in Bayamon', lang: 'en' });
  assert.deepEqual(bare.evidence.calls.map(c => c.tool), ['town_catalog', 'overture_supply', 'census_prcs'], 'no opportunity file, no opportunity call');
});
