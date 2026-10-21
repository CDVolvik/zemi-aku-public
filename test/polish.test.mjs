// Step 4 polish: one type system across the front page and the app, a camera that drifts at rest on the
// island too, and the town's taste rows folded so the panel is not a wall of chips.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
const home = fs.readFileSync(new URL("../app/home.html", import.meta.url), "utf8");
const rule = (selector) => app.match(new RegExp(String.raw`\n\s*${selector.replace(/[.#]/g, "\\$&")}\s*\{([^}]*)\}`))?.[1] ?? "";

test("the app and front page load Inter and Fira Code and alias serif to Inter", () => {
  const homeFonts = home.match(/fonts\.googleapis\.com\/css2\?[^"]+/)?.[0] ?? "";
  const appFonts = app.match(/fonts\.googleapis\.com\/css2\?[^"]+/)?.[0] ?? "";
  assert.match(homeFonts, /family=Inter/);
  assert.match(homeFonts, /family=Fira\+Code/);
  assert.match(appFonts, /family=Inter/);
  assert.match(appFonts, /family=Fira\+Code/);
  assert.match(home, /--serif:\s*"Inter"/);
  assert.match(home, /--mono:\s*"Fira Code"/);
  assert.match(app, /--serif:\s*"Inter"/);
  assert.match(app, /--mono:\s*"Fira Code"/);
});

test("headline, town title and spoken lines are set in the serif; labels in the mono", () => {
  assert.match(rule("#hero h1"), /var\(--serif\)/);
  assert.match(rule(".step h2"), /var\(--serif\)/);
  assert.match(rule(".say"), /var\(--serif\)/);
  assert.match(rule(".group-title"), /var\(--mono\)/);
  assert.match(rule(".small"), /var\(--mono\)/);
});

test("the app's paper theme is the front page's paper", () => {
  const paper = home.match(/--paper:\s*(#[0-9a-f]{6})/i)[1];
  const theme = app.match(/html\[data-theme="paper"\]\s*\{([^}]*)\}/)[1];
  assert.match(theme, new RegExp(String.raw`--paper:\s*${paper}`, "i"));
});

function flight(eye) {
  const listeners = [];
  const Cesium = {
    Cartesian3: { fromDegrees: (lon, lat, h) => ({ lon, lat, h }), distance: () => 0 },
    Math: { toRadians: (d) => d * Math.PI / 180 },
    Transforms: { eastNorthUpToFixedFrame: () => "enu" },
    Matrix4: { IDENTITY: "identity" },
    EasingFunction: {},
  };
  const context = {
    Cesium, performance, localStorage: { getItem: () => null, setItem() {} },
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {} },
  };
  context.window.ZemiFlight = undefined;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL("../app/flight.js", import.meta.url), "utf8"), context);
  context.window.ZemiFlight.setAllowTilt(true);
  const viewer = {
    camera: { cancelFlight() {}, setView() {}, flyTo() {}, lookAtTransform() {}, rotateRight() {}, positionCartographic: { longitude: 0, latitude: 0, height: 0 } },
    scene: { preRender: { addEventListener: (fn) => { listeners.push(fn); return () => {}; } } },
    container: { addEventListener() {}, removeEventListener() {} },
  };
  context.window.ZemiFlight.travel(viewer, { lon: -66.5, lat: 18.2, eye, ground: eye * 0.66 }, { duration: 0 });
  return { listeners, sway: context.window.ZemiFlight.swayFor };
}

test("the camera drifts at rest over the island as well as over a town, more slowly up high", () => {
  assert.equal(flight(20000).listeners.length, 1, "a town settles into the sway");
  const island = flight(190000);
  assert.equal(island.listeners.length, 1, "the island view settles into a drift too");
  assert.ok(island.sway(190000).amplitude < island.sway(20000).amplitude);
  assert.ok(island.sway(190000).period > island.sway(20000).period);
  assert.doesNotMatch(app.match(/function flyHome\([^]*?\n}\n/)[0], /noOrbit/);
});

test("the town's taste rows fold: the first open, the rest a closed summary with a count", () => {
  const source = app.match(/function profileRow\([^]*?\n}\n/);
  assert.ok(source, "profileRow is a function of its own");
  const context = { esc: (s) => s };
  vm.createContext(context);
  vm.runInContext(source[0], context);
  const music = [{ name: "Bad Bunny" }, { name: "Residente", standout: true }];
  const closed = context.profileRow("Music", music, false);
  assert.match(closed, /^<details class="row">/);
  assert.doesNotMatch(closed, /<details[^>]*\sopen/);
  assert.match(closed, /<summary>[^]*Music[^]*2[^]*<\/summary>/);
  assert.match(closed, /chip out/);
  assert.match(context.profileRow("The feel of its places", music, true), /^<details class="row" open>/);
  assert.equal(context.profileRow("On TV", [], false), "");
});
