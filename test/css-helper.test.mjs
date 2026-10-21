import test from "node:test";
import assert from "node:assert/strict";
import { parseCssRules, hasDeclaration } from "./helpers/css.mjs";

const GUARDED = [".result-credit", ".result-why", ".result-meta"];

test("a grouped selector list yields one rule per selector with the same declarations", () => {
  const rules = parseCssRules(".a, .b { color: red; z-index: 1 }");
  assert.deepEqual(rules.map((rule) => rule.selector), [".a", ".b"]);
  for (const rule of rules) {
    assert.equal(rule.declarations.color, "red");
    assert.equal(rule.declarations["z-index"], "1");
  }
});

test("only top-level commas split: commas inside :is() stay with the selector", () => {
  const rules = parseCssRules(":is(.a, .b), .c { color: red }");
  assert.deepEqual(rules.map((rule) => rule.selector), [":is(.a, .b)", ".c"]);
});

test("a grouped rule fails the no position/z-index guard for why/meta/credit", () => {
  const cssRules = parseCssRules(".result-credit, .result-why, .result-meta { z-index: 1 }");
  assert.throws(() => {
    for (const selector of GUARDED) {
      assert.equal(hasDeclaration(cssRules, selector, "position"), false, `${selector} must not raise above the card tap target`);
      assert.equal(hasDeclaration(cssRules, selector, "z-index"), false, `${selector} must not raise above the card tap target`);
    }
  }, { code: "ERR_ASSERTION", message: /must not raise above the card tap target/ });
});
