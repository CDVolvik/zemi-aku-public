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
  assert.match(html, /\$\("talk-lang"\)\.addEventListener\("change", \(event\) => \{ renderHero\(event\.target\.value\); toggleMenu\(\$\("voice-menu"\), \$\("voice-btn"\), false\); \}\);/);
  assert.match(html, /Where should I open a business in Puerto Rico\?/);
  assert.match(html, /¿Dónde abro un negocio en Puerto Rico\?/);
  assert.match(html, /Or start with an artist/);
  assert.match(html, /O empiece por un artista/);
  assert.match(html, /ZemiOpportunity\.industryChips\(\w+, \{ attr: "data-opportunity" \}\)/);
  // Both places the page switches language call renderHero afterwards.
  assert.match(html, /ZemiConverse\.choose\(guessed, ZemiConverse\.voice\(\)\.gender\); voiceLabel\(\); renderHero\(\);/);
  assert.match(html, /voiceLang: \(lang\) => \{ if \(ZemiConverse\.voice\(\)\.lang !== lang\) \{ ZemiConverse\.choose\(lang, ZemiConverse\.voice\(\)\.gender\); renderHero\(\); \} \}/);
});

test('an industry chip in the hero opens the opportunity map', () => {
  assert.match(html, /\$\("decide-start"\)\.addEventListener\("click", \(event\) => \{\n  const button = event\.target\.closest\("\[data-opportunity\]"\);\n  if \(!button\) return;\n  unlockAudio\(\);\n  opportunityUI\.show\(button\.dataset\.opportunity\);/);
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
  assert.match(html, /body:has\(#panel:not\(\[hidden\]\):not\(\[data-collapsed="true"\]\)\) #dockbar \{[^}]*left: calc\(\(212px \+ var\(--left\) \+ 100%\) \/ 2\); width: min\(620px, calc\(100% - 460px - var\(--left\)\)\);/);
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
  assert.match(handler, /if \(event\.target\.closest\("\[data-business-map\]"\)\) \{ const id = \$\("business-rerun"\)\.dataset\.industry; goHome\(\); opportunityUI\.show\(id\); \}/);
});

test('the Try one chips lead with the decision', () => {
  const suggest = section('<div id="suggest"', '</div>');
  const buttons = [...suggest.matchAll(/<button type="button" (data-[a-z]+="[^"]+")/g)].map((m) => m[1]);
  assert.deepEqual(buttons.slice(0, 2), ['data-opportunity="bakery"', 'data-job="ponce"']);
});
