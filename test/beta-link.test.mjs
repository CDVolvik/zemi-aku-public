import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { betaUrl, handleConfig } from "../server/beta.mjs";
import { createLimiter, rateGate, ROUTE_LIMITS } from "../server/limits.mjs";

const VALID = "https://testflight.apple.com/join/AbCdEfGh";
const CODE = "AbCdEfGh";

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

test("a valid TestFlight public join URL is accepted and rebuilt canonically", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: VALID }), VALID);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `  ${VALID}  ` }), VALID);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `https://testflight.apple.com/join/${CODE}` }), VALID);
});

test("explicit https default port :443 and uppercase host canonicalize", () => {
  assert.equal(
    betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com:443/join/ABCD1234" }),
    "https://testflight.apple.com/join/ABCD1234",
  );
  assert.equal(
    betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://TESTFLIGHT.APPLE.COM/join/ABCD1234" }),
    "https://testflight.apple.com/join/ABCD1234",
  );
});

test("unset or blank TESTFLIGHT_PUBLIC_URL yields null", () => {
  assert.equal(betaUrl({}), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "   " }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: undefined }), null);
});

test("http protocol is rejected", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "http://testflight.apple.com/join/AbCdEfGh" }), null);
});

test("non-TestFlight hosts are rejected", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://evil.example/join/AbCdEfGh" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com.evil/join/AbCdEfGh" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://www.testflight.apple.com/join/AbCdEfGh" }), null);
});

test("username or password in the URL is rejected", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `https://user:pass@testflight.apple.com/join/${CODE}` }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `https://user@testflight.apple.com/join/${CODE}` }), null);
});

test("a non-default port is rejected, including :80 on https", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `https://testflight.apple.com:8443/join/${CODE}` }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com:80/join/ABCD1234" }), null);
});

test("search or hash is rejected", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `${VALID}?x=1` }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `${VALID}#frag` }), null);
});

test("pathname must be /join/<4-16 alphanumerics>", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com/invite/AbCdEfGh" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com/join/" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com/join/abc" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com/join/abcdefghijklmnopq" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "https://testflight.apple.com/join/AbCd-EfG" }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `https://testflight.apple.com/join/${CODE}/extra` }), null);
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: `${VALID}/` }), null);
});

test("not a URL is rejected", () => {
  assert.equal(betaUrl({ TESTFLIGHT_PUBLIC_URL: "not-a-url" }), null);
});

test("home.html shows the CTA and keeps the invite form under a details summary when linked", () => {
  const home = fs.readFileSync(new URL("../app/home.html", import.meta.url), "utf8");
  assert.match(home, /id="beta-cta"/);
  assert.match(home, /Get the beta on TestFlight/);
  assert.match(home, /id="beta-link"/);
  assert.match(home, /rel="noopener"/);
  assert.match(home, /target="_blank"/);
  assert.match(home, /id="tester-form"/);
  assert.match(home, /Ask for access/);
  assert.match(home, /Add to Home Screen/);
  assert.match(home, /fetch\("\/api\/config"\)/);
  assert.match(home, /if \(!link\) return/);
  assert.match(home, /Link full\? Ask for an invite/);
  assert.match(home, /tester-invite/);
  assert.match(home, /createElement\("details"\)/);
  assert.doesNotMatch(home, /tester-form"\)\.hidden = true/);
  assert.doesNotMatch(home, /\.open\s*=/);
  assert.doesNotMatch(home, /setAttribute\(\s*["']open["']/);
  assert.match(home, /when a spot opens/);
  assert.match(home, /when the iPhone build is ready/);
  assert.match(home, /Install Apple's TestFlight app, tap the link/);
});

test("handleConfig over HTTP returns JSON, HEAD, 405 Allow GET HEAD, and ROUTE_LIMITS isolation", async () => {
  const limiter = createLimiter();
  const env = { TESTFLIGHT_PUBLIC_URL: VALID };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/config" && url.pathname !== "/api/catalog") {
      res.writeHead(404).end("not found");
      return;
    }
    if (!rateGate(req, res, { limiter, limits: ROUTE_LIMITS, trustProxy: false, sendJson })) return;
    if (url.pathname === "/api/catalog") {
      sendJson(res, 200, { ok: true });
      return;
    }
    handleConfig(req, res, { env, sendJson });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const get = async () => {
      const res = await fetch(`${base}/api/config`);
      return {
        status: res.status,
        cache: res.headers.get("cache-control"),
        body: await res.json().catch(() => ({})),
      };
    };

    const ok = await get();
    assert.equal(ok.status, 200);
    assert.equal(ok.cache, "no-store");
    assert.deepEqual(ok.body, { betaUrl: VALID });

    const head = await fetch(`${base}/api/config`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("cache-control"), "no-store");
    assert.equal(head.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(await head.text(), "");

    const bad = await fetch(`${base}/api/config`, { method: "POST" });
    assert.equal(bad.status, 405);
    assert.equal(bad.headers.get("allow"), "GET, HEAD");
    assert.deepEqual(await bad.json(), { error: "Method not allowed" });

    // GET + HEAD + POST already used 3 of 60; 57 more succeed, then the 61st is 429.
    for (let i = 0; i < 57; i += 1) {
      assert.equal((await get()).status, 200);
    }
    const limited = await get();
    assert.equal(limited.status, 429);
    assert.match(limited.body.error, /Too many requests/);

    // /api/catalog keeps its own independent limit after /api/config is exhausted.
    const catalog = await fetch(`${base}/api/catalog`);
    assert.equal(catalog.status, 200);
    assert.deepEqual(await catalog.json(), { ok: true });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
