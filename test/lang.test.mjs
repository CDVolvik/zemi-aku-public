import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../app/lang.js", import.meta.url), "utf8"), context);
const { guessLang } = context.window.ZemiLang;

test("a Spanish question is recognised, with or without its marks", () => {
  assert.equal(guessLang("¿Dónde comer mofongo en Mayagüez?"), "es");
  assert.equal(guessLang("donde comer mofongo en mayaguez"), "es");
  assert.equal(guessLang("Restaurantes cerca de la playa"), "es");
  assert.equal(guessLang("qué hay en Ponce"), "es");
});

test("an English question is recognised, even with an accented town name", () => {
  assert.equal(guessLang("Where do Bad Bunny fans eat in Ponce?"), "en");
  assert.equal(guessLang("Where to eat in Mayagüez"), "en");
  assert.equal(guessLang("Best surf spots near Rincón"), "en");
});

test("a bare name or an unclear line decides nothing", () => {
  assert.equal(guessLang("Ponce"), "");
  assert.equal(guessLang("mofongo"), "");
  assert.equal(guessLang(""), "");
  assert.equal(guessLang("Bad Bunny"), "");
});

test("the app loads the guesser and switches the voice before asking", () => {
  const app = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
  assert.match(app, /<script src="\/app\/lang\.js"><\/script>/);
  assert.match(app, /ZemiLang\.guessLang\(question\)/);
});

test("affinity why-lines live on the server only; the app does not rephrase them", () => {
  assert.equal(context.window.ZemiLang.affinityWhy, undefined);
  const lang = fs.readFileSync(new URL("../app/lang.js", import.meta.url), "utf8");
  assert.doesNotMatch(lang, /function affinityWhy/);
  assert.match(lang, /server\/lib\.mjs affinityWhy/);
});

test("a French or German question never switches a chosen fr/it/de voice to the EN/ES guess (Codex r2 #6)", () => {
  assert.equal(guessLang("Wo kann ich in Ponce essen?"), "en", "the guesser only knows EN/ES");
  const app = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
  assert.match(app, /const spokenNow = ZemiConverse\.voice\(\)\.lang;\s*\n\s*if \(guessed && \["en", "es"\]\.includes\(spokenNow\) && guessed !== spokenNow\)/);
});
