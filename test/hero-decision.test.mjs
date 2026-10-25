// Plan item 1: the decision journey is the default path. Static checks on the page and the coastal styles.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const coastal = fs.readFileSync(new URL('../app/coastal.css', import.meta.url), 'utf8');
const section = (start, end) => { const i = html.indexOf(start); assert.ok(i >= 0, start); const j = html.indexOf(end, i); return html.slice(i, j < 0 ? undefined : j); };

test('the island hero asks the decision question first and keeps the artists as the on-ramp', () => {
  const hero = section('<div id="hero">', '<div id="embed-play"');
  assert.match(hero, /<h1 id="hero-title">/);
  assert.match(hero, /<p id="hero-lede">/);
  assert.doesNotMatch(hero, /Your music\. A way into Puerto Rico\./);
  assert.ok(hero.indexOf('id="decide-start"') < hero.indexOf('id="journey-start"'), 'industry chips come before the artist chips');
  assert.match(hero, /<p class="small" id="hero-or">/);
  assert.ok(hero.indexOf('id="journey-start"') < hero.indexOf('id="missions"'), 'missions stay under the artists');
});

test('hero copy exists in both languages and re-renders when the voice language changes', () => {
  assert.match(html, /function renderHero\(next\)/);
  assert.match(html, /\$\("talk-lang"\)\.addEventListener\("change", \(event\) => \{ renderHero\(event\.target\.value\); relabel\(\); toggleMenu\(\$\("voice-menu"\), \$\("voice-btn"\), false\); \}\);/);
  assert.match(html, /Where should I open a business in Puerto Rico\?/);
  assert.match(html, /¿Dónde abro un negocio en Puerto Rico\?/);
  assert.match(html, /Or start with an artist/);
  assert.match(html, /O empiece por un artista/);
  assert.match(html, /ZemiOpportunity\.industryChips\(\w+, \{ attr: "data-opportunity" \}\)/);
  // Both places the page switches language by itself redraw the page, and neither is remembered: only a pick in the
  // menu is (Opus, Grok 10/25: after one English question a fresh load came up English for a Spanish speaker).
  assert.match(html, /ZemiConverse\.choose\(guessed, ZemiConverse\.voice\(\)\.gender, \{ persist: false \}\); voiceLabel\(\); renderHero\(\); relabel\(\);/);
  assert.match(html, /voiceLang: \(lang\) => \{ if \(ZemiConverse\.voice\(\)\.lang !== lang\) \{ ZemiConverse\.choose\(lang, ZemiConverse\.voice\(\)\.gender, \{ persist: false \}\); renderHero\(\); relabel\(\); \} \}/);
});

test('only a pick in the language menu is remembered; a language switch redraws the open town and opportunity panel', () => {
  const converse = fs.readFileSync(new URL('../app/converse.js', import.meta.url), 'utf8');
  assert.match(converse, /function choose\(nextLang, nextGender, \{ persist = false \} = \{\}\)/);
  assert.match(converse, /if \(persist === "lang"\) localStorage\.setItem\(LANG_STORE, lang\);\s+if \(persist === "gender"\) localStorage\.setItem\(GENDER_STORE, gender\);/);
  assert.match(converse, /\$\("talk-lang"\)\.addEventListener\("change", \(event\) => choose\(event\.target\.value, gender, \{ persist: "lang" \}\)\)/, 'the language pick saves the language');
  assert.match(converse, /\$\("talk-voice"\)\.addEventListener\("change", \(event\) => choose\(lang, event\.target\.value, \{ persist: "gender" \}\)\)/, 'the voice pick saves the gender only');
  assert.equal(converse.match(/restoreChoice\(\);/g).length, 1, 'the saved choice is restored once, at start');
  const relabel = html.match(/function relabel\(\) \{[^]*?\n\}\n/)[0];
  for (const call of [/opportunityUI\.render\(\)/, /townLede\(byName\.get\(pickedId\)\.record\)/, /renderDirectory\(\)/, /renderList\(\)/, /renderCrumbs\(\)/, /loadProfile\(pickedId\)/]) assert.match(relabel, call);
  assert.match(html, /function renderHero\(next\) \{[^]*?applyStatic\(lang\);/);
  for (const [selector, es] of [["#dir-mode \\[data-mode='cats'\\]", 'Por categoría'], ['#compare-open', 'Comparar con…'], ['#q', 'Pregúntele a Zemi-Aku, o busque un pueblo o un lugar'], ['#picks', 'Lo más destacado']]) {
    assert.match(html, new RegExp(`\\["${selector}", "[a-z-]+", "[^"]+", "${es}"\\]`), selector);
  }
});

test('an industry chip in the hero opens the opportunity map', () => {
  assert.match(html, /\$\("decide-start"\)\.addEventListener\("click", \(event\) => \{\n  const button = event\.target\.closest\("\[data-opportunity\]"\);\n  if \(!button\) return;\n  unlockAudio\(\);\n  showOpportunityList\(button\.dataset\.opportunity\);/);
});

test('Ships and Ports live behind the layers button, and picking one closes the menu', () => {
  const menu = section('<div id="map-menu"', '<button type="button" id="motion-pill"');
  assert.match(menu, /<p>Explore<\/p>\s*<nav id="explore-nav" aria-label="Explore Puerto Rico">/);
  assert.match(menu, /data-explore="places"[^>]*aria-pressed="true"/);
  assert.match(menu, /data-explore="ships"/);
  assert.match(menu, /data-explore="ports"/);
  assert.equal(html.match(/id="explore-nav"/g).length, 1);
  assert.match(html, /if \(event\.target\.closest\("\[data-explore\]"\)\) toggleMenu\(\$\("map-menu"\), \$\("map-btn"\), false\);/);
  assert.doesNotMatch(coastal, /#explore-nav \{ position: absolute/);
  assert.match(coastal, /#explore-nav button \{[^}]*width: 100%/);
});

test('without the rail, the panels sit at the page edge and the ask bar centres on the new free area', () => {
  assert.doesNotMatch(coastal, /#panel, #coastal-panel \{ left: calc\(100px/);
  assert.match(coastal, /#coastal-panel \{[^}]*left: calc\(12px \+ var\(--left\)\)/);
  const opportunity = fs.readFileSync(new URL('../app/opportunity.css', import.meta.url), 'utf8');
  assert.match(opportunity, /#opportunity-panel \{[^}]*left: calc\(12px \+ var\(--left\)\)/);
  assert.match(opportunity, /width: min\(var\(--panel-w, 400px\), calc\(100% - 24px\)\)/);
  assert.match(html, /body:has\(#panel:not\(\[hidden\]\):not\(\[data-collapsed="true"\]\)\) #dockbar,\s*body:has\(#opportunity-panel:not\(\[hidden\]\)\) #dockbar \{[^}]*left: calc\(\(424px \+ var\(--left\) \+ 100%\) \/ 2\); width: min\(620px, calc\(100% - 448px - var\(--left\)\)\);/);
});

test('a town readout reached through the decision offers the second turn: another industry or another town', () => {
  const panel = section('<section id="business-research"', '</section>');
  assert.match(panel, /<div id="business-rerun" hidden>/);
  assert.ok(panel.indexOf('id="business-evidence"') < panel.indexOf('id="business-rerun"'));
  const readout = html.match(/function showBusinessResearch\(business\) \{[^]*?\n\}/)[0];
  assert.match(readout, /ZemiOpportunity\.industryChips\(es \? "es" : "en", \{ attr: "data-business-industry", current: opportunity\.industry \}\)/);
  assert.match(readout, /data-business-map/);
  assert.match(readout, /\$\("business-rerun"\)\.hidden = !opportunity/);
  assert.match(readout, /\$\("business-types"\)\.hidden = Boolean\(opportunity\)/);
  assert.match(panel, /aria-label="Business type" id="business-types"/);
  const handler = section('$("business-research").addEventListener("click"', '// ---------- Answers');
  assert.match(handler, /const industry = event\.target\.closest\("\[data-business-industry\]"\)\?\.dataset\.businessIndustry;/);
  assert.match(handler, /ZemiOpportunity\.townQuestion\(ZemiConverse\.voice\(\)\.lang, industry, currentTown\(\)\)/);
  assert.match(handler, /if \(event\.target\.closest\("\[data-business-map\]"\)\) \{ const id = \$\("business-rerun"\)\.dataset\.industry; goHome\(\); showOpportunityList\(id\); \}/);
});

test('the Try one chips lead with the decision', () => {
  const suggest = section('<div id="suggest"', '</div>');
  const buttons = [...suggest.matchAll(/<button type="button" (data-[a-z]+="[^"]+")/g)].map((m) => m[1]);
  assert.deepEqual(buttons.slice(0, 2), ['data-opportunity="bakery"', 'data-job="ponce"']);
});

test('a person asking for the list brings it forward over an open answer; the list an answer opens stays behind it', () => {
  assert.match(html, /function showOpportunityList\(id\) \{\s+const shown = opportunityUI\.show\(id\);\s+if \(!\$\("caption"\)\.hidden\) foldCaption\(true\);/);
  assert.match(html, /await opportunityUI\.show\(action\.industry\);/, 'a model action does not fold its own answer');
});
