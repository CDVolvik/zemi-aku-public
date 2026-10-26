import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { categoryOf } from '../server/catalog.mjs';
import { fold, affinityWhy } from '../server/lib.mjs';

const serve = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
const source = serve.match(/async function qlooArtist\([^]*?\n}\n/)[0] + serve.match(/async function artistAnswer\([^]*?\n}\n/)[0];
function artistAnswer({ ok = true } = {}) {
  const context = { process: { env: {} }, URLSearchParams, fold, categoryOf, affinityWhy,
    qlooFetch: async () => ({ ok, status: 502, json: async () => ({ results: [{ name: 'Bad Bunny', entity_id: 'artist-id' }] }) }),
    qlooAlsoLike: async () => ['Restaurant', 'Bar', 'Historical landmark', 'Private educational institution', 'International airport']
      .map((genre, id) => ({ id, name: genre, genre, lat: 18, lon: -66 })),
    inIsland: () => true, inTown: () => true, listAnswer: data => ({ ...data, places: data.rows }) };
  vm.createContext(context); vm.runInContext(source, context); return context.artistAnswer;
}

test('the guided journey filters service institutions without changing general artist search', async () => {
  const answer = artistAnswer(), catalog = { query: 'Bad Bunny' };
  const guided = await answer(catalog, 'Bad Bunny', 'en', [], { exploreOnly: true });
  assert.deepEqual(Array.from(guided.places, p => p.genre), ['Restaurant', 'Bar', 'Historical landmark']);
  const general = await answer(catalog, 'Bad Bunny', 'en');
  assert.equal(general.places.length, 5);
  assert.equal(general.journey, undefined);
  assert.equal(guided.journey.artist, 'Bad Bunny');
  assert.match(guided.note, /does not mean the artist visited/i);
  assert.equal(guided.places[0].affinitySignal, 'Bad Bunny');
  assert.equal(guided.places[0].whyLang, 'en');
});

test('Spanish journeys explain the affinity relationship in Spanish', async () => {
  const guided = await artistAnswer()({ query: 'Bad Bunny' }, 'Bad Bunny', 'es', [], { exploreOnly: true });
  assert.match(guided.note, /según Qloo/);
  assert.match(guided.note, /no significa/);
  assert.equal(guided.places[0].whyLang, 'es');
  assert.equal(guided.places[0].affinitySignal, 'Bad Bunny');
});

test('a Qloo search outage is not presented as a journey with no matches', async () => {
  await assert.rejects(artistAnswer({ ok: false })({ query: 'Bad Bunny' }, 'Bad Bunny', 'en', [], { exploreOnly: true }));
});
