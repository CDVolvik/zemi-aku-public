import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { styleText, parseCssRules, ruleFor, hasDeclaration } from "./helpers/css.mjs";

const html = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
const converse = fs.readFileSync(new URL("../app/converse.js", import.meta.url), "utf8");
const marks = fs.readFileSync(new URL("../app/marks.js", import.meta.url), "utf8");
const cssRules = parseCssRules(styleText(html));
const functionSource = (name) => html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}\\n`))[0];

test("a typed question shows a waiting line while the model works, and clears it when the answer lands", () => {
  const run = functionSource("runQuestion");
  assert.match(run, /waitingTimer = setTimeout\(\(\) => \{ waiting = true; showCaption\("zemi", WAITING\[ZemiConverse\.voice\(\)\.lang\] \|\| WAITING\.en\); \}, 1500\)/);
  assert.match(run, /finally \{ clearTimeout\(waitingTimer\); if \(waiting\) showCaption\("you", question\); \}/, "a shown waiting line gives way to the question again, so catalog and town answers never leave it up");
  assert.ok(run.indexOf("waitingTimer = setTimeout") < run.indexOf("await askTown("), "the timer starts before the request");
  assert.match(html, /const WAITING = \{ en: "Checking Qloo's records…", es: "Revisando los registros de Qloo…"/);
});

test("the voice reads the spoken excerpt while the caption keeps the whole answer", () => {
  assert.match(functionSource("narrate"), /speak\(data\?\.spoken \|\| text, ZemiConverse\.voice\(\)\)/);
  assert.match(functionSource("narrate"), /showCaption\("zemi", text, data\?\.evidence, places\)/);
  assert.match(converse, /await app\(\)\.speak\(data\?\.spoken \|\| text, voice\(\)\)/);
});

test("agent answers render rich result cards in the caption and sync them after map actions", () => {
  assert.match(functionSource("showCaption"), /ZemiEvidence\.answerBody\(lang, evidence, cards\)/);
  assert.match(functionSource("showCaption"), /ZemiMarks\.resultCards/);
  assert.match(functionSource("renderList"), /ZemiMarks\.resultCards/);
  assert.match(functionSource("renderList"), /!townView/);
  assert.ok(ruleFor(cssRules, ".answer-cards"));
  assert.equal(hasDeclaration(cssRules, ".answer-cards", "flex-direction", "row"), true);
  assert.equal(hasDeclaration(cssRules, ".answer-cards", "overflow-x", "auto"), true);
  assert.match(html, /<div id="caption" hidden><\/div>/);
  assert.match(marks, /maps\/dir\/\?api=1&destination/);
  assert.match(marks, /data-open-place/);
  assert.match(marks, /data-ask-more/);
  assert.match(marks, /class="result-name"/);
  assert.match(marks, /<ul class="answer-cards">/);
  assert.doesNotMatch(marks, /role="button"/);
  assert.match(marks, /data-tone=/);
  assert.doesNotMatch(converse, /syncAnswerCards\?\.\(actions\)/, "voice path does not double-sync after applyMapActions");
  assert.match(functionSource("applyMapActions"), /syncAnswerCards\(actions\)/);
  assert.match(functionSource("syncAnswerCards"), /Zemi-Aku/);
  assert.doesNotMatch(functionSource("syncAnswerCards"), /openPlaces\.slice/);
  assert.match(html, /placeFromResultCard/);
  assert.doesNotMatch(html, /onResultCardKeydown/);
  for (const selector of [".result-credit", ".result-why", ".result-meta"]) {
    assert.equal(hasDeclaration(cssRules, selector, "position"), false, `${selector} must not raise above the card tap target`);
    assert.equal(hasDeclaration(cssRules, selector, "z-index"), false, `${selector} must not raise above the card tap target`);
  }
  assert.equal(hasDeclaration(cssRules, ".answer-cards > li", "display", "flex"), true);
  assert.equal(hasDeclaration(cssRules, ".answer-cards .result-card", "flex", "1"), true);
  assert.match(functionSource("answerPlacesForCaption"), /index: index >= 0 \? index : null/);
  assert.match(functionSource("answerPlacesForCaption"), /place\.id \? openPlaces\.findIndex/);
  const agentBranch = functionSource("runQuestion").slice(
    functionSource("runQuestion").indexOf("if (data.agent) {"),
    functionSource("runQuestion").indexOf("// Conversation ("),
  );
  assert.match(agentBranch, /showCaption\("zemi", data\.speech, data\.evidence, agentPlaces\)/);
  assert.doesNotMatch(agentBranch, /openPlaces\.slice/);
  assert.doesNotMatch(functionSource("runQuestion"), /openPlaces\.slice\(0, 6\)/);
});

test("placeFromResultCard skips mismatched ids and never trusts index alone", () => {
  const a = { id: "a", name: "Starbucks" };
  const b = { id: "b", name: "Starbucks" };
  const orphan = { id: "orphan", name: "Orphan" };
  const context = { openPlaces: [a, b, orphan] };
  vm.createContext(context);
  vm.runInContext(functionSource("placeFromResultCard"), context);
  const card = (dataset) => ({ dataset });
  assert.equal(context.placeFromResultCard(card({ id: "b", name: "Starbucks", index: "0" })), b);
  // Stale card id must not fall back to name/index.
  assert.equal(context.placeFromResultCard(card({ id: "gone", name: "Starbucks", index: "1" })), null);
  // Index alone (no name) must not resolve.
  assert.equal(context.placeFromResultCard(card({ id: "", name: "", index: "2" })), null);
  // Index + matching name, no card id → tiebreak wins.
  assert.equal(context.placeFromResultCard(card({ id: "", name: "Starbucks", index: "1" })), b);
  assert.equal(context.placeFromResultCard(card({ id: "orphan", name: "Orphan", index: "0" })), orphan);
});

test("a long answer scrolls inside the caption instead of covering the map", () => {
  const caption = ruleFor(cssRules, "#caption");
  assert.equal(caption?.declarations["max-height"], "38vh");
  assert.equal(caption?.declarations["overflow-y"], "auto");
});

test("an answer is shown once: the caption carries it and the panel bubble stays hidden; the picks and labeled pins carry the places", () => {
  const run = functionSource("runQuestion");
  const agentBranch = run.slice(run.indexOf("if (data.agent) {"), run.indexOf("// Conversation ("));
  assert.match(agentBranch, /\$\("town-say"\)\.hidden = true/, "the panel no longer repeats the caption");
  const catalog = functionSource("showCatalog");
  assert.match(catalog, /ZemiMarks\.picks\(openPlaces, data\.speech\)/, "a spoken answer's named places become the top picks");
  assert.match(catalog, /showPicks\(/);
  const picks = functionSource("showPicks");
  assert.match(picks, /ZemiMarks\.pickCards\(/);
  assert.match(picks, /\$\("picks"\)\.hidden = /);
  const draw = functionSource("drawPlaces");
  assert.match(draw, /label: lead \? \{/, "only the top picks get a name on the map");
  assert.match(html, /<div class="picks" id="picks" aria-label="Top picks" hidden><\/div>/);
  assert.match(html, /\$\("picks"\)\.addEventListener\("click"/);
});

test("an answer panel is not overwritten by town facts that arrive late, and the three pick labels take different sides", () => {
  assert.match(html, /let townView = false;/);
  assert.match(functionSource("openTownView"), /townView = true;/);
  assert.match(functionSource("showCatalog"), /townView = false;/);
  assert.match(functionSource("showCatalog"), /\$\("town-weather"\)\.hidden = true;/);
  const guards = html.match(/if \(!townView \|\| /g) || [];
  assert.ok(guards.length >= 4, `stats, landmarks, profile and directory loaders all check townView (found ${guards.length})`);
  assert.match(html, /const LABEL_SIDES = \[\n[^]*?BOTTOM[^]*?TOP[^]*?LEFT/);
  assert.match(functionSource("drawPlaces"), /LABEL_SIDES\[leadNames\.indexOf\(place\.name\) % 3\]/);
});

test("the picks offer 'More like these', which sends the picked Qloo ids as one entity signal and opens the answer", () => {
  assert.match(html, /<button type="button" id="picks-more" class="picks-more" hidden>/);
  const show = functionSource("showPicks");
  assert.match(show, /pickIds = rows\.map\(\(place\) => place\.id\)\.filter\(Boolean\)/);
  assert.match(show, /\$\("picks-more"\)\.hidden = pickIds\.length < 2/);
  const more = functionSource("moreLikeThese");
  assert.match(more, /\/api\/places\/like\?/);
  assert.match(more, /ids=\$\{encodeURIComponent\(pickIds\.join\(","\)\)\}/);
  assert.match(more, /showCatalog\(data\)/);
  assert.match(html, /\$\("picks-more"\)\.addEventListener\("click", moreLikeThese\)/);
});
