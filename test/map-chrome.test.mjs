// Map chrome, hash restore, San Juan default for island-wide answers, artist link on place cards.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
const dossier = fs.readFileSync(new URL("../app/dossier.js", import.meta.url), "utf8");
const flight = fs.readFileSync(new URL("../app/flight.js", import.meta.url), "utf8");

function loadFlight() {
  const poses = [];
  const context = {
    Cesium: {
      Cartesian3: { fromDegrees: (lon, lat, h) => ({ lon, lat, h }), distance: () => 0 },
      Math: { toRadians: (d) => d * Math.PI / 180 },
      Transforms: { eastNorthUpToFixedFrame: () => "enu" },
      Matrix4: { IDENTITY: "identity" },
      EasingFunction: {},
    },
    performance, localStorage: { getItem: () => null, setItem() {} },
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {} },
  };
  vm.createContext(context);
  vm.runInContext(flight, context);
  const viewer = {
    camera: {
      cancelFlight() {},
      setView(pose) { poses.push(pose); },
      flyTo() {}, lookAtTransform() {}, rotateRight() {},
      positionCartographic: { longitude: 0, latitude: 0, height: 0 },
    },
    scene: { preRender: { addEventListener: () => () => {} } },
    container: { addEventListener() {}, removeEventListener() {} },
  };
  return { ZemiFlight: context.window.ZemiFlight, viewer, poses };
}

test("map chrome offers compass, top-down, home and 3D tilt controls at 44px", () => {
  assert.match(app, /id="map-chrome"/);
  assert.match(app, /id="compass-btn"[^>]*aria-label="Reset north"/);
  assert.match(app, /id="topdown-btn"[^>]*aria-label="Top-down view"/);
  assert.match(app, /id="home-view-btn"[^>]*aria-label="Island home view"/);
  assert.match(app, /id="tilt-btn"[^>]*aria-label="Allow 3D tilt"/);
  assert.match(app, /#map-chrome button \{[^}]*width: 44px; height: 44px/);
  assert.match(app, /viewer\.scene\.postRender\.addEventListener/);
});

test("flight defaults to top-down pitch and caps tilt at -45 when 3D is on", () => {
  assert.match(flight, /setAllowTilt/);
  assert.match(flight, /toRadians\(-89\)/);
  assert.match(flight, /ground = Math\.min\(ground, eye\)/);
  const { ZemiFlight, viewer, poses } = loadFlight();
  assert.equal(ZemiFlight.allowTilt(), false);
  ZemiFlight.travel(viewer, { lon: -66, lat: 18, eye: 20000, ground: 15000 }, { duration: 0 });
  assert.ok(Math.abs(poses[0].orientation.pitch - (-89 * Math.PI / 180)) < 1e-9, "default ignores ground and stays top-down");
});

test("S1: popstate only; history module owns navSeq / hashQuiet / restore", () => {
  const history = fs.readFileSync(new URL("../app/history.js", import.meta.url), "utf8");
  assert.match(app, /<script src="\/app\/history\.js"><\/script>/);
  assert.match(app, /addEventListener\("popstate"/);
  assert.equal((app.match(/addEventListener\("hashchange"/g) || []).length, 0, "no hashchange listener (popstate alone)");
  assert.match(app, /mapHistory\.onHistoryNav/);
  assert.match(history, /let navSeq = 0/);
  assert.match(history, /async function restoreHash\(\) \{[\s\S]*?const seq = \+\+navSeq;/);
  assert.match(history, /await setStyle\(want, \{ reframe: false, waitTiles: false \}\)/);
  assert.match(history, /await select\(town, \{ frame: true, fromHistory: true \}\)/);
  assert.match(history, /hashQuiet = true;[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?hashQuiet = false;/);
  assert.match(history, /if \(!town\) \{[\s\S]*?goHome\(\{ fromHistory: true \}\)/);
});

test("S2: beginUserNav on user paths; setStyle reframe/waitTiles opts; autoTilt wiring", () => {
  const history = fs.readFileSync(new URL("../app/history.js", import.meta.url), "utf8");
  assert.match(history, /const want = mode \|\| "eagle"/);
  assert.match(history, /function beginUserNav\(\)/);
  assert.match(app, /if \(!opts\.fromHistory\) mapHistory\.beginUserNav\(\)/);
  assert.match(app, /function setTiltEnabled\(on\)/);
  assert.match(app, /let tiltBeforeAuto = null/);
  assert.match(app, /async function setStyle\(next, \{ reframe = true, waitTiles = true \} = \{\}\)[\s\S]*?ZemiHistory\.autoTilt\(/);
  assert.match(app, /if \(reframe\) reframeCurrent\(hop\)/);
  assert.match(app, /if \(!waitTiles\) \{ warm\(\); return; \}/);
  // 3D reveal: beginUserNav + setStyle only (setStyle enables tilt for buildings/photo)
  assert.match(app, /data-place-3d[\s\S]*?mapHistory\.beginUserNav\(\);[\s\S]*?setStyle\("buildings"\)/);
  assert.doesNotMatch(app, /data-place-3d[\s\S]*?setTiltEnabled\(true\)[\s\S]*?setStyle\("buildings"\)/);
  assert.match(app, /\[data-style\][\s\S]*?mapHistory\.beginUserNav\(\);[\s\S]*?setStyle\(style\.dataset\.style\);[\s\S]*?syncHash\(\{ replace: true \}\)/);
});

test("flight poseFor caps pitch at -45° and keeps the place centered (ground <= eye)", () => {
  const { ZemiFlight, viewer, poses } = loadFlight();
  ZemiFlight.setAllowTilt(true);
  const floor = -Math.PI / 4; // -45°; shallower would be greater than this (closer to 0)
  const lon = -66.1, lat = 18.4;
  for (const [eye, ground] of [[100, 400], [200, 200], [500, 120], [80, 1000]]) {
    poses.length = 0;
    ZemiFlight.travel(viewer, { lon, lat, eye, ground }, { duration: 0 });
    const pose = poses[0];
    const capped = Math.min(ground, eye);
    assert.ok(pose.orientation.pitch <= floor + 1e-12, `pitch ${pose.orientation.pitch} must be ≤ -45° (eye=${eye}, ground=${ground})`);
    assert.ok(capped <= eye, "capped ground never exceeds eye");
    // south/west offsets use capped ground so the look ray still hits the place
    const expectedLat = lat - (capped * 0.92) / 110540;
    const expectedLon = lon - (capped * 0.18) / (111320 * Math.cos(lat * Math.PI / 180));
    assert.ok(Math.abs(pose.destination.lat - expectedLat) < 1e-12, "lat offset uses capped ground");
    assert.ok(Math.abs(pose.destination.lon - expectedLon) < 1e-12, "lon offset uses capped ground");
    assert.equal(pose.destination.h, eye);
  }
});

test("URL hash helpers record town, place and mode; pushState for nav, replace for restore", () => {
  const history = fs.readFileSync(new URL("../app/history.js", import.meta.url), "utf8");
  assert.match(history, /function serializeHash\(/);
  assert.match(history, /function parseHash\(/);
  assert.match(history, /params\.set\("town"/);
  assert.match(history, /params\.set\("place"/);
  assert.match(history, /params\.set\("mode"/);
  assert.match(history, /hist\.pushState/);
  assert.match(history, /hist\.replaceState/);
  assert.match(history, /syncHash\(\{ replace: true \}\)/);
  assert.match(app, /ZemiHistory\.create/);
  assert.match(app, /addEventListener\("popstate"/);
});

test("hash town is normalized like ?town=; places match id then name", () => {
  const history = fs.readFileSync(new URL("../app/history.js", import.meta.url), "utf8");
  assert.match(app, /function townKey\(raw\)/);
  assert.match(app, /const town = townKey\(params\.get\("town"\)\)/);
  assert.match(app, /townKey\(readHash\(\)\.town\)/);
  assert.match(app, /resolveTown: townKey/);
  assert.match(history, /function findOpenPlace\(key/);
  assert.match(history, /openPlaces\.find\(\(p\) => p\.id === key\) \|\| openPlaces\.find\(\(p\) => p\.name === key\)/);
});

test("compass and top-down rotate around the screen-center look-at point", () => {
  assert.match(app, /function lookAtScreenCenter\(\)/);
  assert.match(app, /globe\.pick\(ray, viewer\.scene\)/);
  assert.match(app, /function flyAroundLookAt\(/);
  assert.match(app, /HeadingPitchRange/);
  assert.match(app, /compass-btn"\)\.addEventListener\("click"[\s\S]*?flyAroundLookAt\(/);
  assert.match(app, /topdown-btn"\)\.addEventListener\("click"[\s\S]*?flyAroundLookAt\(/);
});

test("island-wide answers without a town focus San Juan", () => {
  assert.match(app, /function focusSanJuan/);
  assert.match(app, /pinsWide \? focusSanJuan\(\) : flyHome\(\)/);
  assert.match(app, /const town = byName\.has\(action\.town\) \? action\.town : ""/);
});

test("place cards restate the artist link from a journey", () => {
  assert.match(dossier, /Linked to \$\{esc\(artist\)\} fans by Qloo/);
  assert.match(app, /journeyData\?\.journey\?\.artist/);
  assert.match(app, /ZemiDossier\.markup\(place, \{[^}]*artist/s);
});

test("narrow phones wrap chips and avoid horizontal scroll", () => {
  assert.match(app, /overflow-x: hidden/);
  assert.match(app, /@media \(max-width: 390px\)/);
  assert.match(app, /#panel-handle/);
  assert.match(app, /--panel-w: 400px/);
});

test("phone: camera controls move above the open bottom sheet instead of over its text", () => {
  // Every sheet rises to 48% from 84px up; the chrome sat at 100px up, inside it (seen at 390x844 on the café map).
  const phone = app.slice(app.indexOf("@media (max-width: 720px)"));
  assert.match(phone, /body:has\(#panel:not\(\[hidden\]\):not\(\[data-collapsed="true"\]\)\) #map-chrome,\s*body:has\(#opportunity-panel:not\(\[hidden\]\)\) #map-chrome,\s*body:has\(#coastal-panel:not\(\[hidden\]\)\) #map-chrome \{ top: calc\(62px \+ var\(--top\)\); bottom: auto; flex-direction: row; \}/);
});
