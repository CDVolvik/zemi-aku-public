import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("the app manifest names icons that exist", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../app/manifest.webmanifest", import.meta.url)));
  assert.equal(manifest.start_url, "/app");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(new URL(`..${icon.src}`, import.meta.url)), `${icon.src} is missing`);
  }
});
