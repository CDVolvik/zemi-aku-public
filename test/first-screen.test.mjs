// First-screen fixes, October 13: the front page may frame its own live map, a typed answer stays
// until the next question, and the ask bar sits clear of an open panel on a narrow desktop.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
const caddy = fs.readFileSync(new URL("../deploy/Caddyfile", import.meta.url), "utf8");

test("the edge lets this origin frame its pages, and no other", () => {
  assert.match(caddy, /X-Frame-Options "SAMEORIGIN"/);
  assert.match(caddy, /Content-Security-Policy "frame-ancestors 'self'"/);
  assert.doesNotMatch(caddy, /DENY/);
});

test("an answer is not hidden on a timer; a tap on its close hides it", () => {
  assert.doesNotMatch(app, /setTimeout\(hideCaption, 4000 \+ data\.speech\.length \* 45\)/);
  assert.doesNotMatch(app, /then\(\(\) => \{\s*if \(\$\("talk"\)\.dataset\.mode === "off"\) captionTimer = setTimeout\(hideCaption, 5000\)/);
  assert.match(app, /<button type="button" class="x" aria-label="\$\{lang === "es" \? "Cerrar" : "Dismiss"\}">×<\/button>/);
  assert.match(app, /\$\("caption"\)\.addEventListener\("click", \(event\) => \{/);
  assert.match(app, /if \(event\.target\.closest\("\.x"\)\) return hideCaption\(\);/);
});

test("a question's list folds the town directory to one line, a town opens it", () => {
  assert.match(app, /const focus = localFocus\(data\.focus \|\| data\.query \|\| "Places"\);\n\s*listTitle = focus\.charAt\(0\)\.toUpperCase\(\) \+ focus\.slice\(1\);/);
  assert.match(app, /\$\("directory"\)\.dataset\.folded = "true";/);
  assert.match(app, /\$\("town-title"\)\.textContent = record\.town;\n\s*delete \$\("directory"\)\.dataset\.folded;/);
  assert.match(app, /data-unfold>\$\{esDir \? "Ver los" : "Browse all"\} \$\{directory\.total\.toLocaleString\("en-US"\)\} \$\{esDir \? "lugares" : "places"\}/);
  assert.match(app, /#directory\.folded \.dir-head \.seg, #directory\.folded \.dir, #directory\.folded \.dir-ask \{ display: none; \}/);
});

test("polish: titles read as titles, hovers are gated, a phone shows two chips, the island fades back in", () => {
  assert.match(app, /@media \(hover: hover\) and \(pointer: fine\) \{ \.crumbs button:hover/);
  assert.match(app, /@media \(hover: hover\) and \(pointer: fine\) \{ #hits button:hover/);
  assert.doesNotMatch(app, /#hits button\[aria-selected="true"\], #hits button:hover/);
  assert.match(app, /#suggest button:nth-child\(n\+3\) \{ display: none; \}/);
  assert.match(app, /if \(island\) \{\n[^\n]*\n\s*for \(const el of \[\$\("hero"\), \$\("suggest"\)\]\) el\.animate\(\[\{ opacity: 0 \}, \{ opacity: 1 \}\], \{ duration: 220/);
  const agent = fs.readFileSync(new URL("../server/agent.mjs", import.meta.url), "utf8");
  assert.match(agent, /Typed chat: end with the answer, not with an offer or a yes\/no question/);
  const voice = fs.readFileSync(new URL("../server/voice-agent.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(voice, /Typed chat/);
});

test("with the panel open on a desktop the ask bar moves off the panel", () => {
  assert.match(app, /body:has\(#panel:not\(\[hidden\]\):not\(\[data-collapsed="true"\]\)\) #dockbar,\s*body:has\(#opportunity-panel:not\(\[hidden\]\)\) #dockbar \{[^}]*left: calc\(\(424px \+ var\(--left\) \+ 100%\) \/ 2\); width: min\(620px, calc\(100% - 448px - var\(--left\)\)\);/);
});

test("a directory loaded for one town is never offered under another town's name", () => {
  const app = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(app, /directory = \{ \.\.\.data, town \};/, 'the directory remembers its town');
  assert.match(app, /if \(!directory\?\.total \|\| pinsWide \|\| \(pickedId && directory\.town !== pickedId\)\) \{\s*box\.hidden = true;/,
    "judge panel 10/24 round 4: 'Ver los 323 lugares en Maricao' opened the previous town's catalog");
});

test("on a short laptop window the suggestion row waits while the first screen is up (judge panel 10/25)", () => {
  assert.match(app, /@media \(min-width: 721px\) and \(max-height: 720px\) \{\s*body:has\(#hero:not\(\[hidden\]\)\) #suggest \{ display: none; \}/);
});

test("the first screen's words sit on a dark field, and a phone hides the map controls until a pick (10/26)", () => {
  assert.match(app, /#hero::before \{ content: ""; position: absolute; inset: -36px -64px; z-index: -1; pointer-events: none;/);
  const phone = app.slice(app.indexOf("@media (max-width: 720px) {"));
  assert.match(phone, /body:has\(#hero:not\(\[hidden\]\)\) #map-chrome \{ display: none; \}/);
});

test("on a phone the voice button shows the language code alone, so the ask field keeps its width (judge panel 10/25)", () => {
  assert.match(app, /const narrow = window\.matchMedia\("\(max-width: 480px\)"\)\.matches;[^]*?\$\("voice-btn"\)\.textContent = narrow \? code : name \? `\$\{language\} · \$\{name\}` : language;/);
  assert.match(app, /window\.matchMedia\("\(max-width: 480px\)"\)\.addEventListener\("change", voiceLabel\);/);
});

test("the first screen names its two languages in words, and a pick there or a ?lang= link is remembered (judge panel 10/25 round 8)", () => {
  assert.match(app, /<div id="hero-lang" role="group" aria-label="Idioma · Language">\s*<button type="button" data-hero-lang="es" lang="es" aria-pressed="false">Español<\/button>\s*<button type="button" data-hero-lang="en" lang="en" aria-pressed="true">English<\/button>/);
  assert.match(app, /\$\("hero-lang"\)\.addEventListener\("click"[^]*?ZemiConverse\.choose\(lang, ZemiConverse\.voice\(\)\.gender, \{ persist: "lang" \}\);\s*voiceLabel\(\); renderHero\(lang\); relabel\(\);/);
  assert.match(app, /for \(const button of document\.querySelectorAll\("\[data-hero-lang\]"\)\) button\.setAttribute\("aria-pressed", String\(button\.dataset\.heroLang === lang\)\);/);
  assert.match(app, /const linkLang = new URLSearchParams\(location\.search\)\.get\("lang"\);\s*if \(\["en", "es"\]\.includes\(linkLang\) && linkLang !== ZemiConverse\.voice\(\)\.lang\) ZemiConverse\.choose\(linkLang, ZemiConverse\.voice\(\)\.gender, \{ persist: "lang" \}\);\s*renderHero\(\);/);
  assert.match(app, /const language = \{ en: "English", es: "Español"/);
  const home = fs.readFileSync(new URL("../app/home.html", import.meta.url), "utf8");
  assert.match(home, /<a href="\/app\?lang=es" lang="es">El mapa en español<\/a>/);
});

test("between a phone and a wide desktop the panel ends above the dock, and the hero claims taste town by town, not for all 78 (judge panel 10/25 round 7)", () => {
  assert.match(app, /@media \(min-width: 721px\) and \(max-width: 1023px\) \{\s*#panel, body #opportunity-panel \{ bottom: calc\(96px \+ var\(--caption-h, 0px\) \+ var\(--bottom\)\); \}/, 'the opportunity list too: the answer covered it from 721 to 1440 px');
  assert.doesNotMatch(app, /taste for all 78 towns|en los 78 pueblos, frente/);
  assert.match(app, /Qloo's taste town by town, against the businesses the Census already counts/);
  const home = fs.readFileSync(new URL("../app/home.html", import.meta.url), "utf8");
  assert.doesNotMatch(home, /scores all 78 (?:Puerto Rico )?towns/, 'the meta descriptions too');
});
