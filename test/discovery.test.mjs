import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiscovery } from '../server/discovery.mjs';

test('the music journey uses the resolved Qloo artist and preserves its real records', async () => {
  const calls = [];
  const answer = { places: [{ id: 'qloo-id', name: 'Real place' }], journey: { artist: 'Bad Bunny', source: 'Qloo' }, packet: { qloo: 'insights' } };
  const discover = createDiscovery(async (...args) => { calls.push(args); return answer; });
  const result = await discover({ artist: ' Bad Bunny ', lang: 'es' });
  assert.equal(result, answer);
  assert.deepEqual(calls, [[{ query: 'Bad Bunny', town: '' }, 'Bad Bunny', 'es', [], { exploreOnly: true }]]);
});

test('invalid artist requests are rejected before upstream calls', async () => {
  let calls = 0;
  const discover = createDiscovery(async () => { calls++; });
  for (const artist of [null, [], '', 'x', 'a'.repeat(81), 'Bad\nBunny']) {
    assert.equal((await discover({ artist })).error, 'Enter an artist name between 3 and 80 characters.');
  }
  assert.equal(calls, 0);
});

test('an empty journey explains its limits without substituting unrelated places', async () => {
  const result = await createDiscovery(async () => null)({ artist: 'Unknown artist', lang: 'en' });
  assert.deepEqual(result.places, []);
  assert.equal(result.catalog, true);
  assert.match(result.note, /no place matches.*not.*no places/i);
  assert.equal(result.journey, undefined);
  assert.equal(result.packet, undefined);
});

test('upstream failures stay failures instead of an empty affinity claim', async () => {
  await assert.rejects(createDiscovery(async () => { throw new Error('offline'); })({ artist: 'Bad Bunny' }), /offline/);
});
