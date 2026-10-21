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
