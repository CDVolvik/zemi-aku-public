// Browser acceptance checks for the interface states that source-text tests cannot see:
//   1. a phone shows one scroll surface at a time (answer, details and opportunity list take turns),
//   2. from 721 px up the answer never covers the opportunity list,
//   3. a language switch redraws what is open, both ways.
// Usage: node scripts/check-ui-states.mjs [base-url]   (default http://localhost:4186). Exits 1 on any failure.
// Needs Playwright, which the app itself does not: npm i --no-save playwright && npx playwright install chromium.
// Answers may come from the rules router when the model is rate-limited; every check holds for either.
const { chromium } = await import("playwright").catch(() => {
  console.error("Playwright is not installed: npm i --no-save playwright && npx playwright install chromium");
  process.exit(2);
});

const base = process.argv[2] || "http://localhost:4186";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failed = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` · ${detail}` : ""}`);
  if (!ok) failed += 1;
};

async function open(viewport, locale, hash = "") {
  const page = await (await browser.newContext({ viewport, locale, hasTouch: viewport.width <= 720 })).newPage();
  await page.goto(`${base}/app${hash}`, { waitUntil: "load" });
  await page.waitForSelector("#decide-start [data-opportunity='bakery']", { state: "attached", timeout: 30000 });
  await settle(hash ? 10000 : 5000);
  return page;
}
const ask = async (page, question) => {
  await page.fill("#q", question);
  await page.press("#q", "Enter");
  await page.waitForSelector("#caption:not([hidden]) details.evidence", { timeout: 120000 });
  await settle(4000);
};
const phoneState = (page) => page.evaluate(() => {
  const caption = document.getElementById("caption"), panel = document.getElementById("panel"), list = document.getElementById("opportunity-panel");
  const shown = (el) => Boolean(el) && !el.hidden && getComputedStyle(el).display !== "none";
  const scrollers = [...document.querySelectorAll("body *")].filter((el) => el.checkVisibility?.() && el.getBoundingClientRect().height > 40
    && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 4).length;
  const nested = caption.dataset.folded === "true" && [...caption.querySelectorAll("button, a, input")].some((el) => el.checkVisibility?.());
  return { folded: caption.dataset.folded === "true", role: caption.getAttribute("role"), details: shown(panel) && panel.dataset.collapsed !== "true",
    list: shown(list), answer: shown(caption), scrollers, nested };
});

// 1. Phone: one sheet at a time.
{
  const page = await open({ width: 390, height: 844 }, "es-PR");
  await ask(page, "Muéstreme panaderías en San Juan");
  let s = await phoneState(page);
  check(s.answer && !s.folded && !s.details && s.scrollers <= 1, "phone: a place-rich answer is the one surface", JSON.stringify(s));
  await page.click("#panel-collapse"); await settle(1000);
  s = await phoneState(page);
  check(s.folded && s.role === "button" && s.details && s.scrollers <= 1 && !s.nested, "phone: opening the details folds the answer to a plain bar", JSON.stringify(s));
  await page.fill("#q", "Háblame de Ponce"); await page.press("#q", "Enter"); await settle(300);
  s = await phoneState(page);
  check(s.folded && s.details, "phone: the next question stays a bar while the details are open", JSON.stringify(s));
  await page.waitForSelector("#caption:not([hidden]) details.evidence", { timeout: 120000 }); await settle(4000);
  s = await phoneState(page);
  check(!s.folded && !s.details && s.scrollers <= 1, "phone: its answer takes the stage", JSON.stringify(s));
  await page.click("#panel-collapse"); await settle(1000);
  await page.setViewportSize({ width: 900, height: 844 }); await settle(1200);
  s = await phoneState(page);
  check(!s.folded && !s.role, "above 720 px nothing stays folded", JSON.stringify(s));
  await page.setViewportSize({ width: 390, height: 844 }); await settle(1200);
  s = await phoneState(page);
  check(s.folded && s.scrollers <= 1, "back at 390 px the fold returns", JSON.stringify(s));
  await page.focus("#caption"); await page.keyboard.press("Enter"); await settle(1000);
  s = await phoneState(page);
  check(!s.folded && !s.details, "Enter on the bar brings the answer back", JSON.stringify(s));
  // The opportunity list, a gap town and its answer, then the list again by a second action.
  await page.evaluate(() => opportunityUI.show("bakery")); await settle(4000);
  s = await phoneState(page);
  check(s.list && s.folded && s.scrollers <= 1, "phone: the opportunity list folds an open answer", JSON.stringify(s));
  const before = await page.evaluate(() => document.getElementById("caption").dataset.text || "");
  const town = await page.evaluate(() => { const b = document.querySelector("#opportunity-panel [data-opportunity-town]"); b?.click(); return b?.dataset.opportunityTown || ""; });
  check(Boolean(town), "phone: the gap list offers a town to tap", town);
  await page.waitForFunction((old) => { const c = document.getElementById("caption"); return !c.hidden && c.dataset.who === "zemi" && c.dataset.text !== old && c.querySelector("details.evidence"); },
    before, { timeout: 120000 }).catch(() => {});
  await settle(4000);
  s = await phoneState(page);
  const after = await page.evaluate(() => document.getElementById("caption").dataset.text || "");
  check(after !== before && !s.folded && s.scrollers <= 1, "phone: the gap town's own answer takes the stage", `${town} · ${after.slice(0, 80)}`);
  await page.evaluate(() => opportunityUI.show("bakery")); await settle(4000);
  s = await phoneState(page);
  check(s.list && s.folded, "phone: a second opportunity action after a gap-town answer shows the list", JSON.stringify(s));
  await page.close();
}

// 1b. A typed opportunity answer keeps the list open behind it; a person asking for the list brings it forward.
{
  const page = await open({ width: 390, height: 844 }, "en-US");
  await ask(page, "Where should I open a bakery?");
  let s = await phoneState(page);
  check(s.answer && !s.folded && s.scrollers <= 1, "phone: a typed opportunity answer is the one surface", JSON.stringify(s));
  await page.evaluate(() => showOpportunityList("bakery")); await settle(3000);
  s = await phoneState(page);
  check(s.list && s.folded && s.scrollers <= 1, "phone: asking for the list again brings it forward", JSON.stringify(s));
  await page.close();
}

// 2. From 721 px up the answer and the ask bar stay off both side panels.
const boxes = (page) => page.evaluate(() => {
  const box = (id) => { const el = document.getElementById(id); if (!el || el.hidden || getComputedStyle(el).display === "none") return null; const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  const panel = document.getElementById("panel");
  return { list: box("opportunity-panel"), panel: panel?.dataset.collapsed === "true" ? null : box("panel"), caption: box("caption"), dock: box("dockbar") };
});
const hit = (a, b) => Boolean(a && b) && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
for (const width of [721, 1024, 1366, 1440]) {
  let page = await open({ width, height: 844 }, "en-US");
  await ask(page, "Where should I open a bakery?");
  let r = await boxes(page);
  check(Boolean(r.list && r.caption) && !hit(r.list, r.caption) && !hit(r.list, r.dock), `${width} px: the answer and the ask bar stay off the opportunity list`, JSON.stringify(r));
  await page.close();
  page = await open({ width, height: 844 }, "en-US", "#town=San Juan");
  await ask(page, "Where do people eat in San Juan?");
  r = await boxes(page);
  check(Boolean(r.panel && r.caption) && !hit(r.panel, r.caption) && !hit(r.panel, r.dock), `${width} px: the answer and the ask bar stay off the details panel`, JSON.stringify(r));
  await page.close();
}

// 3. A language switch redraws the open surfaces, both ways.
{
  const page = await open({ width: 1366, height: 900 }, "en-US", "#town=San Juan");
  const pick = async (lang) => { await page.click("#voice-btn"); await settle(300); await page.selectOption("#talk-lang", lang); await settle(4500); };
  const read = () => page.evaluate(() => ({ lede: document.getElementById("town-lede")?.textContent || "", legend: document.getElementById("legend")?.textContent || "",
    more: document.getElementById("dir-more")?.textContent || "", spot: document.getElementById("spot")?.textContent || "", lang: document.documentElement.lang }));
  await pick("es");
  let t = await read();
  check(/de un vistazo/.test(t.lede) && /Comida|Hospedajes/.test(t.legend) && /^Ver \d+ más/.test(t.more), "Spanish: the open town, legend and load-more redraw", JSON.stringify(t).slice(0, 220));
  await page.click("#places button.card"); await settle(5000);
  await pick("en");
  t = await read();
  check(t.lang === "en" && /Its fans also love|Contact and sources/.test(t.spot) && !/Contacto y fuentes/.test(t.spot), "English: an open place card redraws", t.spot.slice(0, 160));
  await page.reload({ waitUntil: "load" }); await settle(6000);
  t = await read();
  check(t.lang === "en", "the menu pick is remembered after a reload", t.lang);
  // A comparison open in English, then Spanish: its lines redraw through the Spanish kind names.
  await page.evaluate(() => { location.hash = "#town=San Juan"; }); await settle(9000);
  await page.click("#compare-open"); await settle(500);
  await page.fill("#compare-find", "Ponce"); await page.click("#compare-go");
  await page.waitForSelector("#compare-out .compare-col", { timeout: 60000 }).catch(() => {}); await settle(1500);
  const enCompare = await page.innerText("#compare-out").catch(() => "");
  await pick("es");
  const esCompare = await page.innerText("#compare-out").catch(() => "");
  check(/Shopping mall|Hotel|restaurant/i.test(enCompare) && /Centro comercial|Restaurante|Hotel|Comida rápida/.test(esCompare) && !/Shopping mall|Department store|Fast food/.test(esCompare),
    "Spanish: an open comparison redraws its lines", esCompare.replace(/\s+/g, " ").slice(0, 160));
  await page.close();
}

// 4. The coast view answers in Spanish, its result and its errors.
{
  const page = await open({ width: 1366, height: 900 }, "es-PR");
  await page.click("#map-btn"); await settle(300);
  await page.click("[data-explore='ports']"); await settle(5000);
  await page.click("#coastal-list .coast-card"); await settle(1200);
  await page.fill("#coastal-artist", "BB"); await page.click("#coastal-go"); await settle(3000);
  const error = await page.innerText("#coastal-result").catch(() => "");
  check(/caracteres/.test(error), "Spanish coast: a short artist name gets a Spanish error", error);
  await page.fill("#coastal-artist", ""); await page.click("#coastal-go"); await settle(6000);
  const result = await page.evaluate(() => `${document.getElementById("town-title")?.textContent} | ${document.getElementById("town-lede")?.textContent} | ${document.getElementById("coast-return")?.textContent}`);
  check(/En tierra/.test(result) && /Lugares cercanos|Volver al puerto/.test(result) && !/Ashore in|Nearby places from/.test(result), "Spanish coast: the result reads Spanish", result.slice(0, 200));
  await page.close();
}

await browser.close();
console.log(failed ? `${failed} failed checks.` : "0 failed checks.");
process.exit(failed ? 1 : 0);
