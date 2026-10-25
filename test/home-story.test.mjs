import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync(new URL("../app/home.html", import.meta.url), "utf8");
const compare = fs.readFileSync(new URL("../app/compare.html", import.meta.url), "utf8");
const islandScript = fs.readFileSync(new URL("../scripts/island-svg.mjs", import.meta.url), "utf8");

test("HERO_COPY defines business and traveler variants with distinct headlines and CTAs", () => {
  assert.match(home, /const HERO_COPY = \{/);
  assert.match(home, /business:\s*\{[^}]*title:\s*"Where should you open in Puerto Rico\?"/s);
  assert.match(home, /traveler:\s*\{[^}]*title:\s*"Tell us what you love\. We'll show you Puerto Rico\."/s);
  assert.match(home, /Plan my trip from my taste/);
  assert.match(home, /\/app\?mission=bad-bunny/);
  assert.match(home, /Find a town to open in/);
  assert.match(home, /See how taste meets supply/);
});

test("business is the default story and the static hero leads with it", () => {
  assert.match(home, /<html lang="en" data-story="business">/);
  assert.match(home, /<h1 id="hero-title">Where should you open in Puerto Rico\?<\/h1>/);
  assert.match(home, /key === "traveler" \? "traveler" : "business"/);
});

test("story flag reads ?story=traveler or data-story on the document element", () => {
  assert.match(home, /dataset\.story|data-story/);
  assert.match(home, /story=traveler|get\("story"\)/);
});

test("head carries business-first title, description and Open Graph/Twitter tags", () => {
  assert.match(home, /<title>Zemi-Aku — Where should you open in Puerto Rico\?<\/title>/);
  assert.match(home, /<meta name="description" content="[^"]*Qloo taste for your industry[^"]*Census[^"]*Built for the Qloo Agentic Hackathon[^"]*">/);
  assert.match(home, /<meta property="og:title" content="[^"]*Where should you open in Puerto Rico\?[^"]*">/);
  assert.match(home, /<meta property="og:description" content="[^"]*Qloo taste[^"]*Built for the Qloo Agentic Hackathon[^"]*">/);
  assert.match(home, /<meta property="og:type" content="website">/);
  assert.match(home, /<meta property="og:url" content="https:\/\/zemi\.r21digital\.com\/">/);
  assert.match(home, /<meta property="og:image" content="https:\/\/zemi\.r21digital\.com\/app\/assets\/shot-business\.png">/);
  assert.match(home, /<meta name="twitter:card" content="summary_large_image">/);
});

test("public GitHub links point at CDVolvik/zemi-aku-public", () => {
  assert.doesNotMatch(home, /github\.com\/CDVolvik\/qloo-local-taste/);
  assert.doesNotMatch(compare, /github\.com\/CDVolvik\/qloo-local-taste/);
  assert.match(home, /github\.com\/CDVolvik\/zemi-aku-public/);
  assert.match(compare, /github\.com\/CDVolvik\/zemi-aku-public/);
});

test("Inter and Fira Code load on the front page; Newsreader stays optional for quotes", () => {
  const fonts = home.match(/fonts\.googleapis\.com\/css2\?[^"]+/)?.[0] ?? "";
  assert.match(fonts, /family=Inter/);
  assert.match(fonts, /family=Fira\+Code/);
  assert.match(home, /--serif:\s*"Inter"/);
  assert.match(home, /--mono:\s*"Fira Code"/);
  assert.match(home, /Newsreader/);
});

test("design tokens include surface paper alias and heat ramp colours", () => {
  assert.match(home, /--paper:\s*#f8f6f4/);
  assert.match(home, /--surface:\s*#f8f6f4/);
  assert.match(home, /#fabe50|fabe50/i);
  assert.match(home, /#f04632|f04632/i);
  assert.match(home, /200 or more|under 25/);
});

test("live map uses shot-town poster until play or intersection loads the embed", () => {
  assert.match(home, /shot-town\.png/);
  assert.match(home, /embed=1/);
  assert.match(home, /IntersectionObserver|map-play|live-map/);
  assert.match(home, /loading="lazy"/);
});

test("island SVG script paints paths with the heat ramp fills", () => {
  assert.match(islandScript, /fabe50/);
  assert.match(islandScript, /f04632/);
  assert.match(islandScript, /fill="\$\{fill\}"|fill="\$\{/);
});
