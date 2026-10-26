// Browser acceptance checks for answer states (judge panel 10/25 round 8):
//   1. the first screen names its two languages, a pick there or a ?lang= link is remembered, a phone keeps the code,
//   2. a without-Qloo answer leaves no Qloo list under the town's own breadcrumb, and the catalog returns on request,
//   3. opening a place an answer did not name clears that answer; one it named keeps it,
//   4. cards across two towns carry no cross-town distance.
// The model answer and its control run are recorded responses served at /api/chat, so the checks hold with or without
// a model; everything else is the real server.
// Usage: node scripts/check-answer-states.mjs [base-url]   (default http://localhost:4186). Exits 1 on any failure.
// Needs Playwright, which the app itself does not: npm i --no-save playwright && npx playwright install chromium.
const { chromium } = await import("playwright").catch(() => {
  console.error("Playwright is not installed: npm i --no-save playwright && npx playwright install chromium");
  process.exit(2);
});
const base = process.argv[2] || "http://localhost:4186";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const settle = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, detail = "") => { if (!ok) failed += 1; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` · ${detail}` : ""}`); };
try {
  // 1. The first screen names both languages; a pick is remembered; ?lang=es opens in Spanish.
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
    const page = await context.newPage();
    await page.goto(`${base}/app`, { waitUntil: "load" }); await settle(8000);
    const read = () => page.evaluate(() => ({ lang: document.documentElement.lang, title: document.getElementById("hero-title").textContent,
      es: document.querySelector("[data-hero-lang='es']").getAttribute("aria-pressed"), voice: document.getElementById("voice-btn").textContent }));
    let r = await read();
    check(r.lang === "en" && r.es === "false" && /^English/.test(r.voice), "en first screen: English pressed, the voice button names the language", JSON.stringify(r));
    await page.click("[data-hero-lang='es']"); await settle(1500);
    r = await read();
    check(r.lang === "es" && r.es === "true" && /Dónde abro/.test(r.title) && /^Español/.test(r.voice), "Español on the first screen switches the page", JSON.stringify(r));
    await page.reload({ waitUntil: "load" }); await settle(8000);
    r = await read();
    check(r.lang === "es", "the first-screen pick is remembered after a reload", r.lang);
    await page.close();
    const fresh = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" })).newPage();
    await fresh.goto(`${base}/app?lang=es`, { waitUntil: "load" }); await settle(8000);
    check(await fresh.evaluate(() => document.documentElement.lang) === "es", "?lang=es opens the map in Spanish for an English browser");
    await fresh.close();
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "en-US", isMobile: true, hasTouch: true })).newPage();
    await phone.goto(`${base}/app`, { waitUntil: "load" }); await settle(8000);
    const box = await phone.evaluate(() => { const b = document.getElementById("hero-lang").getBoundingClientRect(); return { w: b.width, right: b.right, vw: innerWidth, voice: document.getElementById("voice-btn").textContent }; });
    check(box.w > 0 && box.right <= box.vw && box.voice === "EN", "390 px: the switch fits and the voice button keeps its code", JSON.stringify(box));
    await phone.close();
  }

  // 2. Without Qloo: the panel holds no Qloo list, the breadcrumb is the town's, and the catalog comes back on request.
  {
    const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" })).newPage();
    const real = await (await fetch(`${base}/api/places?town=San%20Juan&fast=1`)).json();
    const places = real.places.slice(0, 3).map((p) => ({ ...p, why: "Strong match for Vico C fans (96%)" }));
    const agent = { agent: true, chat: true, speech: `Vico C fans in San Juan lean toward ${places.map((p) => p.name).join(", ")}.`,
      actions: [{ type: "show_places", town: "San Juan", places, focus: "Vico C fans in San Juan" }],
      evidence: { mode: "model", model: "recorded", rounds: 2, ms: 1800, at: new Date().toISOString(), calls: [{ tool: "artist_places", args: { town: "San Juan", artist: "Vico C" }, ok: true, ms: 300, source: "Qloo", count: 3 }] } };
    const control = { agent: true, chat: true, speech: "The artist tool is off for this run, so I won't name places from Vico C taste data.", actions: [],
      control: "no-qloo", evidence: { mode: "model", model: "recorded", rounds: 1, ms: 900, at: new Date().toISOString(), calls: [], control: "no-qloo" } };
    await page.route("**/api/chat", (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body.tools === "no-qloo" ? control : agent) });
    });
    await page.goto(`${base}/app#town=San Juan`, { waitUntil: "load" }); await settle(10000);
    await page.fill("#q", "Where do Vico C fans eat in San Juan?"); await page.press("#q", "Enter"); await settle(4000);
    const before = await page.evaluate(() => ({ crumbs: document.getElementById("crumbs").innerText.replace(/\s+/g, " "), note: document.querySelector("#caption .cards-note:last-of-type")?.textContent || "" }));
    check(/Vico C fans/.test(before.crumbs), "with Qloo: the breadcrumb names the answer", before.crumbs);
    check(/not the share of fans who go/.test(before.note), "an affinity percentage is defined under the cards", before.note);
    await page.click("#caption summary"); await settle(400);
    await page.click("[data-control-run]"); await settle(4000);
    const after = await page.evaluate(() => ({ crumbs: document.getElementById("crumbs").innerText.replace(/\s+/g, " "),
      places: document.getElementById("places").innerText.replace(/\s+/g, " "), directory: document.getElementById("directory").hidden,
      restore: Boolean(document.querySelector("[data-control-restore]")), cards: document.querySelectorAll("#places .card").length }));
    check(!/Vico C/.test(after.crumbs) && /San Juan/.test(after.crumbs), "without Qloo: the breadcrumb is the town's own", after.crumbs);
    check(after.cards === 0 && after.directory && after.restore && /put no places in the list/.test(after.places), "without Qloo: no Qloo list or directory, one button to bring the catalog back", JSON.stringify(after));
    await page.click("[data-control-restore]"); await settle(6000);
    const restored = await page.evaluate(() => ({ cards: document.querySelectorAll("#places .card").length, directory: !document.getElementById("directory").hidden }));
    check(restored.cards > 0 && restored.directory, "the catalog and its directory come back on request", JSON.stringify(restored));

    // 3. Opening a place the answer did not name clears the answer (the control pair is still up); one it named keeps it.
    check(await page.evaluate(() => !document.getElementById("caption").hidden), "the control answer is still on screen before a place opens");
    const other = await page.evaluate(() => document.querySelector("#places .card .name")?.textContent || "");
    await page.click("#places .card"); await settle(2500);
    check(await page.evaluate(() => document.getElementById("caption").hidden), "opening a place the answer did not name clears it", other);
    await page.click("[data-crumb='town']").catch(() => {}); await settle(2000);
    await page.fill("#q", "Where do Vico C fans eat in San Juan?"); await page.press("#q", "Enter"); await settle(4000);
    const named = await page.evaluate(() => document.querySelector("#caption .result-card")?.dataset.name || "");
    await page.click("#caption .result-card .result-name"); await settle(2500);
    check(await page.evaluate(() => !document.getElementById("caption").hidden), "opening a place the answer named keeps the answer", named);
    await page.close();
  }

  // 4. A card in another town carries no distance from the open town.
  {
    const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" })).newPage();
    const caguas = (await (await fetch(`${base}/api/places?town=Caguas&fast=1`)).json()).places.slice(0, 2);
    const mayaguez = (await (await fetch(`${base}/api/places?town=Mayag%C3%BCez&fast=1`)).json()).places.slice(0, 1);
    await page.route("**/api/chat", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ agent: true, chat: true,
      speech: `Caguas has ${caguas[0].name}; Mayagüez has ${mayaguez[0].name}.`, actions: [{ type: "show_places", town: "Caguas", places: [...caguas, ...mayaguez] }],
      evidence: { mode: "model", model: "recorded", rounds: 1, ms: 900, at: new Date().toISOString(), calls: [] } }) }));
    await page.goto(`${base}/app#town=Mayagüez`, { waitUntil: "load" }); await settle(10000);
    await page.fill("#q", "Mayagüez or Caguas for a bakery?"); await page.press("#q", "Enter"); await settle(4000);
    const metas = await page.evaluate(() => [...document.querySelectorAll("#caption .result-card")].map((card) => `${card.dataset.name}: ${card.querySelector(".result-meta")?.textContent || ""}`));
    // The map follows the answer to Caguas; a card in the other town carries no distance, and none reads like "111 km".
    const far = metas.filter((m) => Number((m.match(/(\d+(?:\.\d+)?) km/) || [])[1]) > 40);
    const mayaguezKm = metas.filter((m) => mayaguez.some((p) => m.startsWith(p.name)) && /km/.test(m));
    check(metas.length >= 3 && !far.length && !mayaguezKm.length, "cards across two towns: no cross-town distance", metas.join(" | "));
    await page.close();
  }

  // 5. An island ranking leaves the open town: the map, the URL and the breadcrumb follow the answer's first town, and an
  //    artist-and-business answer opens the gap list (the rules router's shapes, recorded).
  {
    const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" })).newPage();
    const island = { chat: true, kind: "artist-towns", speech: "Qloo's heatmap puts Björk's taste strongest in Vieques, Río Grande and Loíza. That is taste, not visits or demand.",
      actions: [{ type: "fly_town", town: "Vieques" }], evidence: { mode: "rules", reason: "budget", at: new Date().toISOString() } };
    const mix = { chat: true, kind: "artist-business", opportunity: { industry: "cafe" }, speech: "For Marc Anthony fans, Qloo's heatmap puts Maricao, San Juan and Fajardo on top. Of their top ten, Luquillo and Guánica are in the café gap group: taste above the median, few businesses. That is taste, not demand.",
      evidence: { mode: "rules", reason: "budget", at: new Date().toISOString() } };
    await page.route("**/api/chat", (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(/cafe/i.test(body.question) ? mix : island) });
    });
    await page.goto(`${base}/app#town=Maricao`, { waitUntil: "load" }); await settle(10000);
    await page.fill("#q", "I like Björk. Which town in Puerto Rico fits my taste?"); await page.press("#q", "Enter"); await settle(9000);
    const moved = await page.evaluate(() => ({ hash: decodeURIComponent(location.hash), crumbs: document.getElementById("crumbs").innerText.replace(/\s+/g, " "),
      caption: !document.getElementById("caption").hidden, list: document.getElementById("places").innerText.slice(0, 200) }));
    check(/Vieques/.test(moved.hash) && /Vieques/.test(moved.crumbs) && !/Maricao/.test(moved.crumbs) && moved.caption, "an island ranking moves the map, URL and breadcrumb off the open town", JSON.stringify(moved).slice(0, 220));
    await page.fill("#q", "Which town should I open a cafe in for Marc Anthony fans?"); await page.press("#q", "Enter"); await settle(6000);
    const gaps = await page.evaluate(() => ({ list: !document.getElementById("opportunity-panel").hidden, caption: document.getElementById("caption").innerText.slice(0, 80) }));
    check(gaps.list && /Marc Anthony/.test(gaps.caption), "an artist-and-business answer opens the gap list under its caption", JSON.stringify(gaps));
    await page.close();
  }
} finally { await browser.close(); }
console.log(`${failed} failed checks.`);
process.exitCode = failed ? 1 : 0;
