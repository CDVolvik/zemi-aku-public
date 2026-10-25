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
  assert.match(app, /<button type="button" class="x" aria-label="Dismiss">×<\/button>/);
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
  assert.match(app, /body:has\(#panel:not\(\[hidden\]\):not\(\[data-collapsed="true"\]\)\) #dockbar \{[^}]*left: calc\(\(212px \+ var\(--left\) \+ 100%\) \/ 2\); width: min\(620px, calc\(100% - 460px - var\(--left\)\)\);/);
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

test("on a phone the voice button shows the language code alone, so the ask field keeps its width (judge panel 10/25)", () => {
  assert.match(app, /const narrow = window\.matchMedia\("\(max-width: 480px\)"\)\.matches;\s*\$\("voice-btn"\)\.textContent = name && !narrow \? `\$\{code\} · \$\{name\}` : code;/);
  assert.match(app, /window\.matchMedia\("\(max-width: 480px\)"\)\.addEventListener\("change", voiceLabel\);/);
});
