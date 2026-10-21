import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
const functionSource = name => html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}\\n`))[0];

test("browser config keeps photo mode off unless explicitly enabled", () => {
  const server = fs.readFileSync(new URL("../scripts/serve-eagle.mjs", import.meta.url), "utf8");
  const route = server.match(/if \(url.pathname === "\/app\/config.js"\) \{([^]*?)\n    \}/)[1];
  for (const value of [undefined, "0", "true", "1"]) {
    let javascript;
    vm.runInNewContext(`(() => {${route}})()`, {
      process: { env: { CESIUM_ION_TOKEN: 'test"token', ZEMI_PHOTOREAL_ENABLED: value } },
      res: { writeHead() {}, end: body => { javascript = body; } },
    });
    const window = {};
    vm.runInNewContext(javascript, { window });
    assert.equal(window.ZEMI_PHOTOREAL_ENABLED, value === "1");
    assert.equal(window.ZEMI_ION_TOKEN, 'test"token');
  }
});

test("disabled photoreal mode neither opens tiles nor changes the selected map", async () => {
  let calls = 0;
  const context = vm.createContext({ window: { ZEMI_PHOTOREAL_ENABLED: false },
    Cesium: { createGooglePhotorealistic3DTileset: () => { calls++; return Promise.resolve({}); } },
    viewer: { scene: { primitives: { add() {} } } },
    photoTiles: null, photoPromise: null, styleToken: 0, styleName: "eagle" });
  vm.runInContext(functionSource("warmPhoto") + functionSource("setStyle"), context);
  await context.warmPhoto();
  assert.equal(calls, 0);
  await context.setStyle("photo");
  assert.equal(calls, 0);
  assert.equal(context.styleName, "eagle");
});

test("startup still warms OSM buildings but leaves disabled photo tiles alone", () => {
  let buildings = 0, photo = 0;
  const preload = html.match(/setTimeout\(\(\) => \{ ensureImagery\(\);[^]*?\}, 400\);/)[0];
  vm.runInNewContext(preload, { window: { ZEMI_ION_TOKEN: "browser-token", ZEMI_PHOTOREAL_ENABLED: false },
    setTimeout: callback => callback(), ensureImagery() {},
    warmBuildings: () => { buildings++; return Promise.resolve(); },
    warmPhoto: () => { photo++; return Promise.resolve(); } });
  assert.equal(buildings, 1);
  assert.equal(photo, 0);
});
