import test from 'node:test';
import assert from 'node:assert/strict';
import { moreLikeThese } from '../server/alike.mjs';

const seeds = [{ id: 'a', name: 'Melao' }, { id: 'b', name: 'La Perla' }];
const found = [{ id: 'a', name: 'Melao' }, { id: 'c', name: 'Campioni', municipality: 'Ponce' }, { id: 'd', name: 'Vista', municipality: 'Ponce' },
  { id: 'e', name: 'Mirador', municipality: 'Ponce' }, { id: 'f', name: 'Faro', municipality: 'Ponce' }];

test('sends every seed to Qloo as one entity signal, drops the seeds from the answer, and names the first three', async () => {
  const asked = [];
  const enriched = [];
  const out = await moreLikeThese({ ids: ['a', 'b'], town: 'Ponce', lang: 'en' }, {
    alsoLike: async (entityId, type, opts) => { asked.push({ entityId, type, opts }); return found; },
    seedNames: async () => seeds,
    attachOsm: async (places) => { enriched.push(...places.map((p) => p.name)); },
    publishPlace: (place) => ({ ...place, published: true }),
  });
  assert.deepEqual(asked, [{ entityId: 'a,b', type: 'place', opts: { take: 12, location: 'Ponce, Puerto Rico' } }]);
  assert.deepEqual(out.places.map((p) => p.name), ['Campioni', 'Vista', 'Mirador', 'Faro']);
  assert.ok(out.places.every((p) => p.published));
  assert.deepEqual(enriched, ['Campioni', 'Vista', 'Mirador'], 'photos for the three picks only; the rest stay fast');
  assert.equal(out.speech, 'Qloo links these to Melao and La Perla: Campioni, Vista and Mirador.');
  assert.equal(out.focus, 'More like these', 'the heading stays short; the spoken line names the seeds');
  assert.equal(out.town, 'Ponce');
  assert.match(out.qloo, /signal\.interests\.entities/);
});

test('speaks Spanish, and says so when Qloo has nothing', async () => {
  const deps = { alsoLike: async () => [], seedNames: async () => seeds, attachOsm: async () => {}, publishPlace: (p) => p };
  const out = await moreLikeThese({ ids: ['a', 'b'], town: '', lang: 'es' }, deps);
  assert.deepEqual(out.places, []);
  assert.equal(out.speech, 'Qloo no encontró más lugares como Melao y La Perla.');
  const one = await moreLikeThese({ ids: ['a'], town: '', lang: 'es' }, { ...deps, alsoLike: async () => found.slice(1, 2), seedNames: async () => seeds.slice(0, 1) });
  assert.equal(one.speech, 'Qloo conecta estos con Melao: Campioni.');
});
