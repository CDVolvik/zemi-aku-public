import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { PORTS, nearbyPlaces, createCoastalDiscovery } from '../server/coastal.mjs';

test('nearby discovery excludes far, missing and non-leisure records without inventing walking time', () => {
  const port = PORTS[0];
  const rows = [
    { id: 'close', name: 'Cafe', lat: port.lat, lon: port.lon, genre: 'Cafe' },
    { id: 'far', lat: 17.98, lon: -66.62, genre: 'Restaurant' },
    { id: 'missing', lat: null, lon: null, genre: 'Restaurant' },
    { id: 'office', lat: port.lat, lon: port.lon, genre: 'Dentist' },
  ];
  const result = nearbyPlaces(port, rows);
  assert.deepEqual(result.map(p => p.id), ['close']);
  assert.equal(result[0].distanceKm, 0);
  assert.equal(result[0].walkingMinutes, undefined);
});

test('port/category/artist validation happens before data calls', async () => {
  let calls = 0;
  const discover = createCoastalDiscovery({ catalog: async () => { calls++; return []; } });
  for (const request of [{ port: 'invalid' }, { port: PORTS[0].id, category: 'invalid' }, { port: PORTS[0].id, artist: 'x' }]) {
    assert.ok((await discover(request)).error);
  }
  assert.equal(calls, 0);
});

test('music affinity stays empty when Qloo has no nearby matches; cache results are not substituted', async () => {
  const port = PORTS[0];
  let catalogCalls = 0;
  const discover = createCoastalDiscovery({ catalog: async () => { catalogCalls++; return []; },
    artist: async () => ({ places: [{ id: 'far', genre: 'Restaurant', lat: 17.98, lon: -66.62 }], journey: { artist: 'Bad Bunny', source: 'Qloo' } }) });
  const result = await discover({ port: port.id, artist: 'Bad Bunny' });
  assert.deepEqual(result.places, []);
  assert.equal(result.relationship, 'affinity');
  assert.match(result.note, /no.*within 5 km/i);
  assert.equal(catalogCalls, 0);
});

test('ordinary discovery uses catalog records and clearly distinguishes proximity from affinity', async () => {
  const port = PORTS[0];
  const discover = createCoastalDiscovery({ catalog: async town => {
    assert.equal(town, port.town);
    return [{ id: 'verified', name: 'Cafe', lat: port.lat, lon: port.lon, genre: 'Cafe' }];
  } });
  const result = await discover({ port: port.id, category: 'food' });
  assert.equal(result.relationship, 'proximity');
  assert.equal(result.places[0].id, 'verified');
  assert.match(result.note, /straight line.*not walking/i);
});

test('artist results are already browser records and must not be published a second time', async () => {
  const port = PORTS[0];
  const discover = createCoastalDiscovery({ artist: async () => ({ places: [{ id: 'affinity', lat: port.lat, lon: port.lon, genre: 'Cafe', facts: ['preserved'] }] }),
    publish: () => { throw new Error('already published'); } });
  const result = await discover({ port: port.id, artist: 'Bad Bunny' });
  assert.deepEqual(result.places[0].facts, ['preserved']);
});

test('an existing but corrupt coastal catalog fails without invoking the live catalog loader', async () => {
  const source = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8')
    .match(/const discoverCoast = createCoastalDiscovery\(\{[\s\S]*?\n\}\);/)[0];
  for (const value of ['null', '{bad json', '{"places":null}']) {
    let upstreamCalls = 0;
    const context = { createCoastalDiscovery: config => config, path, catalogDir: '/cache/catalog', fold: value => value,
      catalogs: new Map(), fs: { existsSync: () => true, readFileSync: () => value },
      catalogFor: () => { upstreamCalls++; return {places: []}; }, artistAnswer() {}, publishPlace() {} };
    vm.createContext(context);
    vm.runInContext(source + '\nglobalThis.coast = discoverCoast;', context);
    await assert.rejects(context.coast.catalog('San Juan'));
    assert.equal(upstreamCalls, 0);
  }
});

test('a Spanish page gets the coast answer, its errors and its heading in Spanish', async () => {
  const port = PORTS[0];
  const discover = createCoastalDiscovery({ catalog: async () => [], artist: async () => ({ places: [] }) });
  assert.equal((await discover({ port: port.id, artist: 'BB', lang: 'es' })).error, 'Escriba el nombre de un artista de 3 a 80 caracteres.');
  assert.equal((await discover({ port: 'nowhere', lang: 'es' })).error, 'Escoja un puerto de Puerto Rico de la lista.');
  const es = await discover({ port: port.id, lang: 'es' });
  assert.equal(es.focus, `En tierra, ${port.town}`);
  assert.match(es.note, /^Lugares cercanos del catálogo guardado de Qloo para .+ A menos de 5 km/);
  const en = await discover({ port: port.id });
  assert.equal(en.focus, `Ashore in ${port.town}`);
  assert.match(en.note, /^Nearby places from Qloo's saved/);
});
