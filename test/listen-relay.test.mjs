// /api/listen admission: same origin only, the whole session reserved from the daily seconds before the
// upgrade, settled on close, and a cap on concurrent sessions (Codex round 2, finding 1).
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { attachListenRelay } from "../server/listen-relay.mjs";

function fakeWss() {
  const clients = [];
  return {
    clients,
    handleUpgrade(_req, _socket, _head, callback) {
      const client = new EventEmitter();
      client.closed = false;
      client.close = (code, reason) => { client.closed = { code, reason }; client.emit("close"); };
      clients.push(client);
      callback(client);
    },
  };
}

function upgrade(server, { origin = "https://zemi.r21digital.com", ip = "203.0.113.1", host = "zemi.r21digital.com" } = {}) {
  const socket = { ended: null, end(text) { this.ended = text; } };
  const headers = { host, "x-forwarded-for": ip, "x-forwarded-proto": "https" };
  if (origin !== null) headers.origin = origin;
  const req = { url: "/api/listen", headers, socket: { remoteAddress: "10.0.0.2" } };
  server.emit("upgrade", req, socket, Buffer.alloc(0));
  return socket;
}

function harness(options = {}) {
  const server = new EventEmitter();
  const wss = fakeWss();
  const reserves = [], settles = [];
  attachListenRelay(server, {
    wss, relayImpl: () => {}, trustProxy: true, maxSeconds: 300,
    visitorIp: (req) => req.headers["x-forwarded-for"],
    reserve: (seconds) => { reserves.push(seconds); return options.reserve ? options.reserve(seconds) : true; },
    settle: (reserved, used) => settles.push([reserved, used]),
    maxActivePerIp: 1, maxActive: 3,
    ...options.relay,
  });
  return { server, wss, reserves, settles };
}

test("a foreign or missing Origin is refused before any upgrade", () => {
  const { server, wss } = harness();
  const foreign = upgrade(server, { origin: "https://evil.example" });
  const missing = upgrade(server, { origin: null });
  assert.match(foreign.ended, /^HTTP\/1\.1 403/);
  assert.match(missing.ended, /^HTTP\/1\.1 403/);
  assert.equal(wss.clients.length, 0);
});

test("the maximum session length is reserved before the upgrade and settled with the real length on close", () => {
  const { server, wss, reserves, settles } = harness();
  const socket = upgrade(server);
  assert.equal(socket.ended, null);
  assert.deepEqual(reserves, [300]);
  assert.equal(wss.clients.length, 1);
  wss.clients[0].close(1000, "done");
  assert.equal(settles.length, 1);
  assert.equal(settles[0][0], 300);
  assert.ok(settles[0][1] >= 0 && settles[0][1] <= 300);
});

test("a refused reservation answers 429 and opens nothing", () => {
  const { server, wss, settles } = harness({ reserve: () => false });
  const socket = upgrade(server);
  assert.match(socket.ended, /^HTTP\/1\.1 429/);
  assert.equal(wss.clients.length, 0);
  assert.equal(settles.length, 0);
});

test("one live session per visitor and a global ceiling; a closed session frees its slot", () => {
  const { server, wss } = harness();
  assert.equal(upgrade(server, { ip: "203.0.113.1" }).ended, null);
  assert.match(upgrade(server, { ip: "203.0.113.1" }).ended, /^HTTP\/1\.1 429/);
  assert.equal(upgrade(server, { ip: "203.0.113.2" }).ended, null);
  assert.equal(upgrade(server, { ip: "203.0.113.3" }).ended, null);
  assert.match(upgrade(server, { ip: "203.0.113.4" }).ended, /^HTTP\/1\.1 429/, "global ceiling of 3");
  wss.clients[0].close(1000, "done");
  assert.equal(upgrade(server, { ip: "203.0.113.1" }).ended, null, "the slot is free again");
  for (const client of wss.clients) if (!client.closed) client.close(1000, "done");
});
