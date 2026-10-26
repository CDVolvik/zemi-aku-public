import test from "node:test";
import assert from "node:assert/strict";
import { createLimiter } from "../server/limits.mjs";
import * as limits from "../server/limits.mjs";
import fs from "node:fs";
import vm from "node:vm";

test("zero configuration blocks speech, listening and Qloo spending", () => {
  const server = fs.readFileSync(new URL("../scripts/serve-eagle.mjs", import.meta.url), "utf8");
  const declaration = server.match(/const CAPS = \{[^]*?\n\};/)[0];
  const caps = vm.runInNewContext(`${declaration}\nCAPS`, {
    dailyCap: limits.dailyCap,
    process: { env: { ZEMI_SPEAK_CHARS_PER_DAY: "0", ZEMI_LISTEN_MINUTES_PER_DAY: "0", ZEMI_QLOO_CALLS_PER_DAY: "0" } },
  });
  const limiter = createLimiter();
  for (const cap of Object.values(caps)) {
    assert.equal(cap, 0);
    assert.equal(limiter.spend("disabled", 1, cap), false);
  }
});

test("daily cap defaults apply only to missing values; invalid values fail closed", () => {
  for (const value of [undefined, "", "  "]) assert.equal(limits.dailyCap(value, 120), 120);
  assert.equal(limits.dailyCap("1.5", 120), 1.5);
  for (const value of ["-1", "NaN", "Infinity", "oops"]) assert.equal(limits.dailyCap(value, 120), 0);
});

test("a visitor gets its per-minute allowance, then waits", () => {
  let now = 0;
  const limiter = createLimiter({ now: () => now });
  for (let i = 0; i < 3; i += 1) assert.equal(limiter.take("ip1:ask", 3), true);
  assert.equal(limiter.take("ip1:ask", 3), false);
  assert.equal(limiter.take("ip2:ask", 3), true, "another visitor is not affected");
  now += 20000; // a third of a minute refills one request at 3 per minute
  assert.equal(limiter.take("ip1:ask", 3), true);
  assert.equal(limiter.take("ip1:ask", 3), false);
});

test("a daily cap stops spending and resets the next day", () => {
  let now = Date.UTC(2026, 9, 7, 12);
  const limiter = createLimiter({ now: () => now });
  assert.equal(limiter.spend("speak-chars", 600, 1000), true);
  assert.equal(limiter.spend("speak-chars", 500, 1000), false);
  assert.equal(limiter.spend("speak-chars", 400, 1000), true);
  assert.equal(limiter.used("speak-chars"), 1000);
  now = Date.UTC(2026, 9, 8, 0, 1);
  assert.equal(limiter.spend("speak-chars", 900, 1000), true);
});

test("visitorIp trusts the proxy header only when told to, and only its last entry", () => {
  const limiter = createLimiter();
  // A visitor can send their own X-Forwarded-For; the load balancer appends the address it saw.
  const req = { headers: { "x-forwarded-for": "198.51.100.7, 203.0.113.9" }, socket: { remoteAddress: "10.0.0.1" } };
  assert.equal(limiter.visitorIp(req, false), "10.0.0.1");
  assert.equal(limiter.visitorIp(req, true), "203.0.113.9");
});

test("the public overlay funds the voice agent, listening and speech with daily caps, and keeps the connector off", () => {
  const overlay = fs.readFileSync(new URL("../deploy/compose.safe.yaml", import.meta.url), "utf8");
  assert.doesNotMatch(overlay, /^\s*DEEPGRAM_API_KEY:/m, "the server .env key must reach the app");
  assert.doesNotMatch(overlay, /^\s*OPENROUTER_API_KEY:/m, "the server .env model key must reach the app");
  const cap = (key) => Number(overlay.match(new RegExp(`^\\s*${key}: "(\\d+(?:\\.\\d+)?)"\\s*$`, "m"))?.[1]);
  // Every paid cap is a finite daily number, and the whole worst case stays well under the credit.
  assert.equal(cap("ZEMI_SPEAK_CHARS_PER_DAY"), 300000);
  assert.equal(cap("ZEMI_LISTEN_MINUTES_PER_DAY"), 360);
  assert.equal(cap("ZEMI_VOICE_MINUTES_PER_DAY"), 240);
  assert.equal(cap("ZEMI_CHAT_USD_PER_DAY"), 2);
  assert.ok(cap("ZEMI_VOICE_CHAT_USD_PER_DAY") <= cap("ZEMI_CHAT_USD_PER_DAY"), "the voice model share sits inside the chat ledger");
  assert.match(overlay, /^\s*ZEMI_MCP_ENABLED: "0"\s*$/m);
});

test("the paid voice route clamps text to a spoken line and gives one visitor at most a fifth of the day", () => {
  const server = fs.readFileSync(new URL("../scripts/serve-eagle.mjs", import.meta.url), "utf8");
  const route = server.slice(server.indexOf('url.pathname === "/api/speak"'), server.indexOf("speakWithDeepgram(text, voice.id)"));
  assert.match(route, /slice\(0, 300\)/);
  assert.match(route, /limiter\.spend\(`speak-chars:\$\{ip\}`, text\.length, Math\.ceil\(CAPS\.speakChars \/ 5\)\)/);
  assert.match(route, /limiter\.spend\("speak-chars", text\.length, CAPS\.speakChars\)/);
});

test('a model turn the provider refused gives the visitor turn back; a turn the model used stays spent (judge panel 10/26)', () => {
  const limiter = createLimiter({ now: () => Date.UTC(2026, 9, 26, 12) });
  assert.equal(limiter.spend('chat-turns:1.2.3.4', 1, 2), true);
  assert.equal(limiter.spend('chat-turns:1.2.3.4', 1, 2), true);
  assert.equal(limiter.spend('chat-turns:1.2.3.4', 1, 2), false);
  limiter.refund('chat-turns:1.2.3.4', 1);
  assert.equal(limiter.used('chat-turns:1.2.3.4'), 1);
  assert.equal(limiter.spend('chat-turns:1.2.3.4', 1, 2), true);
  limiter.refund('chat-turns:9.9.9.9', 1);
  assert.equal(limiter.used('chat-turns:9.9.9.9'), 0, 'a refund never goes below zero or creates a row');
  const serve = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  const refused = serve.match(/const providerRefused = \(result\) => (.+);/)[1];
  const providerRefused = new Function('result', `return ${refused};`);
  assert.equal(providerRefused({ reason: 'http-402' }), true);
  assert.equal(providerRefused({ reason: 'budget' }), true);
  assert.equal(providerRefused({ reason: 'http-402', rounds: 1 }), true, 'the agent counts a round before its first request');
  assert.equal(providerRefused({ reason: 'http-402', rounds: 2, calls: [{ tool: 'town_catalog' }] }), false, 'a later round failing after a tool ran keeps the turn spent');
  assert.equal(providerRefused({ reason: 'claim' }), false, 'a note the model wrote and a check dropped keeps the turn spent');
  // Every model path goes through one helper, refunding on the day the turn was spent (Codex review, round ten).
  for (const run of ['textAgent', 'bareAgent', 'catalogAgent']) assert.match(serve, new RegExp(`await withVisitorTurn\\(ip, \\(\\) => ${run}\\(checked\\.value\\)\\)`), run);
  assert.match(serve, /async function withVisitorTurn\(ip, run\) \{\s*const day = limiter\.spendDay\(`chat-turns:\$\{ip\}`, 1, CHAT_TURNS_PER_VISITOR\);\s*if \(!day\) return null;[^]*?if \(result\?\.fallback && providerRefused\(result\)\) limiter\.refund\(`chat-turns:\$\{ip\}`, 1, day\);/);
  assert.match(serve, /const day = limiter\.spendDay\(`chat-turns:\$\{ip\}`, 1, CHAT_TURNS_PER_VISITOR\);\s*if \(!day\) return \{ \.\.\.business/);
  assert.match(serve, /if \(providerRefused\(note\)\) limiter\.refund\(`chat-turns:\$\{ip\}`, 1, day\);/);
});

test('a refund applies only to the day the turn was charged, read from the spend itself (Codex review, round ten)', () => {
  let t = Date.UTC(2026, 9, 26, 23, 59);
  const limiter = createLimiter({ now: () => t });
  const day = limiter.spendDay('chat-turns:a', 1, 40);
  assert.equal(day, '2026-10-26');
  t = Date.UTC(2026, 9, 27, 0, 1);
  assert.equal(limiter.spendDay('chat-turns:a', 1, 40), '2026-10-27');
  limiter.refund('chat-turns:a', 1, day);
  assert.equal(limiter.used('chat-turns:a'), 1, "yesterday's refund leaves today's turn spent");
  // At the boundary the charge and its day come from one read: a turn charged just after midnight refunds that day.
  const boundary = limiter.spendDay('chat-turns:b', 1, 40);
  limiter.refund('chat-turns:b', 1, boundary);
  assert.equal(limiter.used('chat-turns:b'), 0);
  assert.equal(limiter.spendDay('chat-turns:c', 1, 0), null, 'over the cap: no charge, no day');
});