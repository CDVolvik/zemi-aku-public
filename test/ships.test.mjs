import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { createShipStore, createShipFeed } from '../server/ships.mjs';

const now = Date.parse('2026-10-08T19:00:00Z');

test('AIS uses Docker runtime credentials only when the project env file is absent', () => {
  const source = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8')
    .match(/const shipFeed = createShipFeed\([^\n]+/)[0];
  for (const [fileExists, projectKey, expected] of [[false, undefined, 'runtime-test'], [true, undefined, undefined], [true, 'project-test', 'project-test']]) {
    const context = { fs: {existsSync: () => fileExists}, path, root: '/app', projectEnv: {AISSTREAM_API_KEY:projectKey},
      process: {env:{AISSTREAM_API_KEY:'runtime-test',ZEMI_AIS_ENABLED:'1'}}, createShipFeed: options => options };
    vm.createContext(context); vm.runInContext(source + '\nglobalThis.options = shipFeed;', context);
    assert.equal(context.options.key, expected);
    assert.equal(context.options.enabled, true);
  }
});
const position = (extra = {}) => ({ MessageType: 'PositionReport', MetaData: { MMSI: 123456789, ShipName: '<Boat>', time_utc: new Date(now).toISOString() },
  Message: { PositionReport: { Valid: true, Latitude: 18.46, Longitude: -66.12, Sog: 102.3, Cog: 360, TrueHeading: 511, ...extra } } });

test('ship store rejects missing/out-of-area positions and normalizes AIS unavailable values', () => {
  const store = createShipStore(() => now);
  store.ingest(position({ Latitude: 91 }));
  store.ingest(position({ Longitude: 0 }));
  assert.equal(store.snapshot().length, 0);
  store.ingest(position());
  const vessel = store.snapshot()[0];
  assert.equal(vessel.mmsi, '123456789');
  assert.equal(vessel.speedKnots, null);
  assert.equal(vessel.course, null);
  assert.equal(vessel.heading, null);
});

test('voyage-only data cannot create a marker or make an old position fresh', () => {
  let clock = now;
  const store = createShipStore(() => clock);
  const voyage = { MessageType: 'ShipStaticData', MetaData: { MMSI: 123456789 }, Message: { ShipStaticData: { Destination: 'PR SJU@@', Name: 'Boat' } } };
  store.ingest(voyage);
  assert.equal(store.snapshot().length, 0);
  store.ingest(position());
  clock += 11 * 60 * 1000;
  store.ingest(voyage);
  assert.equal(store.snapshot().length, 0);
});

test('ship destinations are declared text, with no predicted route or invented ETA', () => {
  const store = createShipStore(() => now);
  store.ingest(position({ Sog: 4, Cog: 90 }));
  store.ingest({ MessageType: 'ShipStaticData', MetaData: { MMSI: 123456789 }, Message: { ShipStaticData: { Destination: 'PR SJU@@' } } });
  assert.equal(store.snapshot()[0].destination, 'PR SJU');
  assert.equal(store.snapshot()[0].eta, undefined);
  assert.equal(store.snapshot()[0].route, undefined);
});

test('out-of-order and old source timestamps cannot replace a current position', () => {
  const store = createShipStore(() => now);
  store.ingest(position());
  const old = position({ Latitude: 18.4 });
  old.MetaData.time_utc = new Date(now - 20 * 60 * 1000).toISOString();
  store.ingest(old);
  assert.equal(store.snapshot()[0].lat, 18.46);
});

test('a half-open feed is terminated and reconnected rather than remaining connected forever', t => {
  t.mock.timers.enable({apis: ['setInterval', 'setTimeout', 'Date'], now});
  const sockets = [];
  class Socket extends EventEmitter {
    constructor() { super(); this.readyState = 1; sockets.push(this); }
    send() {}
    ping() {}
    terminate() { this.terminated = true; this.emit('close'); }
  }
  const feed = createShipFeed({key: 'test-only', enabled: true, Socket, clock: () => Date.now()});
  feed.snapshot();
  sockets[0].emit('open');
  for (let i = 0; i < 3; i++) { feed.snapshot(); t.mock.timers.tick(30000); }
  assert.equal(sockets[0].terminated, true);
  t.mock.timers.tick(7000);
  assert.equal(sockets.length, 2);
  feed.close();
});

test('the disabled feed never connects and cannot disclose a supplied key', () => {
  const feed = createShipFeed({key: 'private-test-key', enabled: false, Socket: class { constructor() { throw new Error('must not connect'); } }});
  const snapshot = feed.snapshot();
  assert.equal(snapshot.state, 'disabled');
  assert.deepEqual(snapshot.ships, []);
  assert.ok(!JSON.stringify(snapshot).includes('private-test-key'));
});
