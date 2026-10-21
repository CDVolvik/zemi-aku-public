// Behavioral coverage for URL hash history (re-review SF1/SF2 + nits).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../app/history.js", import.meta.url), "utf8");

function loadHistory() {
  const context = { window: {}, URLSearchParams, Object };
  vm.createContext(context);
  vm.runInContext(src, context);
  return context.window.ZemiHistory;
}

function fakeLoc(hash = "") {
  return { hash, pathname: "/app", search: "" };
}

function fakeHist(loc) {
  const pushes = [];
  const replaces = [];
  return {
    pushes,
    replaces,
    pushState(_s, _t, url) {
      pushes.push(url);
      loc.hash = url.startsWith("#") ? url : "";
    },
    replaceState(_s, _t, url) {
      replaces.push(url);
      loc.hash = url.startsWith("#") ? url : "";
    },
  };
}

function harness(overrides = {}) {
  const ZemiHistory = loadHistory();
  const loc = fakeLoc(overrides.hash || "");
  const hist = fakeHist(loc);
  const selects = [];
  const styleCalls = [];
  let state = {
    pickedId: null,
    step: "island",
    styleName: "eagle",
    openPlaces: [],
    focusedIndex: -1,
    ...overrides.state,
  };
  let styleResolve;
  const stylePending = overrides.deferStyle
    ? new Promise((resolve) => { styleResolve = resolve; })
    : null;

  const api = ZemiHistory.create({
    select: async (town, opts) => {
      selects.push({ town, opts });
      state.pickedId = town;
      state.step = "town";
      if (overrides.openPlaces) state.openPlaces = overrides.openPlaces;
    },
    openPlace: (place, opts) => {
      state.step = "place";
      state.focusedIndex = state.openPlaces.indexOf(place);
      void opts;
    },
    goHome: (opts) => {
      state.pickedId = null;
      state.step = "island";
      state.openPlaces = [];
      state.focusedIndex = -1;
      void opts;
    },
    showCatalog: () => {},
    setStyle: async (mode, opts) => {
      styleCalls.push({ mode, opts });
      if (stylePending) await stylePending;
      state.styleName = mode;
    },
    getState: () => state,
    resolveTown: (raw) => (raw ? String(raw) : ""),
    history: hist,
    location: loc,
  });

  return {
    api, loc, hist, selects, styleCalls, state,
    resolveStyle: () => styleResolve?.(),
  };
}

test("stale navigation cancels: second onHistoryNav wins; hashQuiet ends false", async () => {
  const h = harness({ hash: "#town=A&mode=buildings", deferStyle: true, state: { step: "island", styleName: "eagle" } });
  const first = h.api.onHistoryNav();
  await Promise.resolve();
  await Promise.resolve(); // past coalesce and into deferred setStyle
  assert.equal(h.styleCalls.length, 1);
  h.loc.hash = "#town=B";
  const second = h.api.onHistoryNav();
  await Promise.resolve(); // second past coalesce (may also enter setStyle)
  h.resolveStyle();
  await Promise.all([first, second]);
  assert.equal(h.selects.length, 1, "stale restore must not select");
  assert.equal(h.selects[0].town, "B");
  assert.equal(h.api.isQuiet(), false);
});

test("hashQuiet resets after island-level Forward then Back", async () => {
  const h = harness({
    hash: "#town=A&mode=buildings",
    deferStyle: true,
    state: { step: "island", styleName: "eagle" },
  });
  const forward = h.api.onHistoryNav();
  await Promise.resolve();
  await Promise.resolve(); // Forward is awaiting setStyle(buildings)
  assert.equal(h.styleCalls.length, 1);
  h.loc.hash = "";
  const back = h.api.onHistoryNav();
  await Promise.resolve();
  h.resolveStyle();
  await Promise.all([forward, back]);
  assert.equal(h.api.isQuiet(), false, "latest nav must clear hashQuiet");
  assert.equal(h.state.step, "island");
  h.api.markReady();
  h.state.pickedId = "C";
  h.state.step = "town";
  h.api.syncHash();
  assert.ok(h.hist.pushes.some((u) => u.includes("town=C")), "syncHash pushes after quiet clears");
});

test("hash without mode restores eagle", async () => {
  const h = harness({
    hash: "#town=A",
    state: { step: "town", styleName: "buildings", pickedId: "A" },
  });
  await h.api.restoreHash();
  assert.equal(h.styleCalls.length, 1);
  assert.equal(h.styleCalls[0].mode, "eagle");
  assert.equal(h.styleCalls[0].opts.reframe, false);
  assert.equal(h.styleCalls[0].opts.waitTiles, false);
});

test("user click during a restore wins", async () => {
  const h = harness({
    hash: "#town=A&mode=buildings",
    deferStyle: true,
    state: { step: "island", styleName: "eagle" },
  });
  const restore = h.api.onHistoryNav();
  await Promise.resolve();
  await Promise.resolve(); // restore is in deferred setStyle
  assert.equal(h.styleCalls.length, 1);
  h.api.markReady(); // prior user nav already primed pushState
  h.api.beginUserNav();
  h.state.pickedId = "B";
  h.state.step = "town";
  h.api.syncHash();
  h.resolveStyle();
  await restore;
  assert.ok(h.hist.pushes.some((u) => String(u).includes("town=B")), "user nav pushes town=B");
  assert.equal(h.selects.filter((s) => s.town === "A").length, 0, "restore must not select A after cancel");
  assert.equal(h.hist.replaces.filter((u) => String(u).includes("town=B")).length, 0, "must not replace A's entry with B");

  // Style menu click during a restore: beginUserNav cancels; syncHash({ replace }) keeps the choice
  const style = harness({
    hash: "#town=A&mode=buildings",
    deferStyle: true,
    state: { step: "island", styleName: "eagle" },
  });
  const styleRestore = style.api.onHistoryNav();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(style.styleCalls.length, 1);
  style.api.markReady();
  style.api.beginUserNav();
  style.state.styleName = "satellite";
  style.api.syncHash({ replace: true });
  style.resolveStyle();
  await styleRestore;
  assert.equal(style.selects.filter((s) => s.town === "A").length, 0, "style click cancel must not select A");
  assert.ok(
    style.hist.replaces.some((u) => String(u).includes("mode=satellite")),
    "style click replace-syncs mode=satellite",
  );
});

test("exactly one select per Back (double onHistoryNav)", async () => {
  const h = harness({
    hash: "#town=A",
    state: { step: "island", styleName: "eagle" },
  });
  await Promise.all([h.api.onHistoryNav(), h.api.onHistoryNav()]);
  assert.equal(h.selects.length, 1);
  assert.equal(h.selects[0].town, "A");
  assert.equal(h.selects[0].opts.fromHistory, true);
});

test("autoTilt: eagle -> buildings -> eagle restores prior off", () => {
  const { autoTilt } = loadHistory();
  let tiltEnabled = false;
  let tiltBeforeAuto = null;

  ({ tiltEnabled, tiltBeforeAuto } = autoTilt({
    mode: "buildings", prevMode: "eagle", tiltEnabled, tiltBeforeAuto,
  }));
  assert.equal(tiltEnabled, true);
  assert.equal(tiltBeforeAuto, false);

  ({ tiltEnabled, tiltBeforeAuto } = autoTilt({
    mode: "eagle", prevMode: "buildings", tiltEnabled, tiltBeforeAuto,
  }));
  assert.equal(tiltEnabled, false);
  assert.equal(tiltBeforeAuto, null);
});

test("autoTilt: user-enabled tilt survives buildings -> eagle", () => {
  const { autoTilt } = loadHistory();
  let tiltEnabled = true;
  let tiltBeforeAuto = null;

  ({ tiltEnabled, tiltBeforeAuto } = autoTilt({
    mode: "buildings", prevMode: "eagle", tiltEnabled, tiltBeforeAuto,
  }));
  assert.equal(tiltEnabled, true);
  assert.equal(tiltBeforeAuto, true);

  ({ tiltEnabled, tiltBeforeAuto } = autoTilt({
    mode: "eagle", prevMode: "buildings", tiltEnabled, tiltBeforeAuto,
  }));
  assert.equal(tiltEnabled, true, "user-chosen tilt stays on after leave");
  assert.equal(tiltBeforeAuto, null);
});

test("autoTilt: satellite restores off when tilt was not user-chosen", () => {
  const { autoTilt } = loadHistory();
  let tiltEnabled = false;
  let tiltBeforeAuto = null;

  ({ tiltEnabled, tiltBeforeAuto } = autoTilt({
    mode: "buildings", prevMode: "eagle", tiltEnabled, tiltBeforeAuto,
  }));
  assert.equal(tiltEnabled, true);
  assert.equal(tiltBeforeAuto, false);

  ({ tiltEnabled, tiltBeforeAuto } = autoTilt({
    mode: "satellite", prevMode: "buildings", tiltEnabled, tiltBeforeAuto,
  }));
  assert.equal(tiltEnabled, false, "satellite turns auto tilt off");
  assert.equal(tiltBeforeAuto, null);
});

test("userToggle in 3D mode updates tiltBeforeAuto", () => {
  const { autoTilt, userToggle } = loadHistory();
  let tiltEnabled = false;
  let tiltBeforeAuto = null;

  ({ tiltEnabled, tiltBeforeAuto } = autoTilt({
    mode: "buildings", prevMode: "eagle", tiltEnabled, tiltBeforeAuto,
  }));
  assert.equal(tiltEnabled, true);
  assert.equal(tiltBeforeAuto, false);

  // User turns tilt off while still in buildings — remember that for leave-restore.
  ({ tiltEnabled, tiltBeforeAuto } = userToggle({ tiltEnabled, mode: "buildings" }));
  assert.equal(tiltEnabled, false);
  assert.equal(tiltBeforeAuto, false);

  ({ tiltEnabled, tiltBeforeAuto } = userToggle({ tiltEnabled, mode: "buildings" }));
  assert.equal(tiltEnabled, true);
  assert.equal(tiltBeforeAuto, true, "toggle in 3D updates leave-restore preference");
});

test("plain start: the island entry is primed at boot, so the first town is a push and Back returns home (Codex r2 #4)", async () => {
  const app = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
  assert.match(app, /\(flyHome\(reducedMotion \? 0 : 3\), syncHash\(\{ replace: true \}\), Promise\.resolve\(\)\)/);
  const h = harness();
  h.api.syncHash({ replace: true });
  assert.deepEqual(h.hist.pushes, []);
  h.api.beginUserNav();
  h.state.pickedId = "Ponce";
  h.state.step = "town";
  h.api.syncHash();
  assert.deepEqual(h.hist.pushes, ["#town=Ponce"]);
  assert.equal(h.hist.replaces.length, 0);
});
