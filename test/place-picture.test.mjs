import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { qlooImageOf, domainOf, affinityOf, affinityWhy } from '../server/lib.mjs';

const source = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
const pick = (name) => source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}\\n`))[0];

function run(entities) {
  const calls = [];
  const context = { NETWORKS: [], addSocial() {}, URLSearchParams, AbortSignal,
    fetch: async (url) => { calls.push(url); return { ok: true, json: async () => ({ entities }) }; } };
  vm.createContext(context);
  vm.runInContext(pick('claimValue') + pick('commonsFile') + pick('attachWikidata'), context);
  return { context, calls };
}
const claim = (value) => [{ mainsnak: { datavalue: { value } } }];

test('a chain with no photo gets its brand logo from Wikidata; a place with its own photo keeps that photo', async () => {
  const { context, calls } = run({
    Q1: { claims: { P154: claim('Chilis logo.svg') } },
    Q2: { claims: { P18: claim('Melao front.jpg') } },
  });
  const chain = { name: "Chili's", brandWikidata: 'Q1', socials: [] };
  const own = { name: 'Melao', wikidata: 'Q2', brandWikidata: 'Q1', socials: [] };
  const kept = { name: 'Kept', image: 'https://existing.jpg', brandWikidata: 'Q1', socials: [] };
  await context.attachWikidata([chain, own, kept]);
  assert.equal(chain.logo, 'https://commons.wikimedia.org/wiki/Special:FilePath/Chilis_logo.svg?width=480');
  assert.equal(chain.image, undefined);
  assert.equal(own.image, 'https://commons.wikimedia.org/wiki/Special:FilePath/Melao_front.jpg?width=640');
  assert.equal(own.logo, undefined, 'own Commons photo blocks the brand logo fallback');
  assert.equal(kept.image, 'https://existing.jpg', 'Wikidata does not overwrite an existing image');
  assert.equal(kept.logo, undefined);
  assert.match(calls[0], /ids=Q2%7CQ1|ids=Q1%7CQ2/, 'one request carries both the place and the brand');
});

test('OpenStreetMap brand ids are kept and published with website domain and Qloo image fields', () => {
  assert.match(pick('attachOsm'), /tags\["brand:wikidata"\]/);
  assert.match(pick('publishPlace'), /logo: place\.logo \|\| ""/);
  assert.match(pick('publishPlace'), /qlooImage: place\.qlooImage \|\| ""/);
  assert.match(pick('publishPlace'), /domain/);
  assert.match(pick('mapPlace'), /qlooImage: qlooImageOf\(entity\)/);
  assert.match(pick('mapPlace'), /domain: domainOf\(website\)/);
});

test('artist and taste answers attach affinitySignal and whyLang so publishPlace can regenerate why', () => {
  assert.match(pick('artistAnswer'), /affinitySignal: artist\.name/);
  assert.match(pick('artistAnswer'), /whyLang: lang/);
  assert.match(pick('tasteAnswer'), /affinitySignal: tag\.name/);
  assert.match(pick('tasteAnswer'), /whyLang: lang/);
  const tools = fs.readFileSync(new URL('../server/agent-tools.mjs', import.meta.url), 'utf8');
  assert.match(tools, /affinityWhy\(place\.affinity, place\.affinitySignal \|\| "", place\.whyLang \|\| "en"\)/);
});

test('Qloo entity images, domains and affinity why-lines are read without inventing scores', () => {
  assert.equal(qlooImageOf({ properties: { images: ['https://cdn.example/a.jpg'] } }), 'https://cdn.example/a.jpg');
  assert.equal(qlooImageOf({ properties: { image: { url: 'https://cdn.example/b.jpg' } } }), 'https://cdn.example/b.jpg');
  assert.equal(qlooImageOf({ properties: {} }), '');
  assert.equal(domainOf('https://www.cafe.pr/menu'), 'cafe.pr');
  assert.equal(domainOf('not a url'), '');
  // A social page is not the place's own site: its icon would be Facebook's, not the café's (TocaMadera, 10/17).
  assert.equal(domainOf('https://www.facebook.com/tocamaderacafe'), '');
  assert.equal(domainOf('https://m.facebook.com/tocamaderacafe'), '');
  assert.equal(domainOf('https://instagram.com/lossocios'), '');
  assert.equal(domainOf('https://linktr.ee/hacienda'), '');
  assert.equal(affinityOf({ query: { affinity: 0.814 } }), 0.81);
  assert.equal(affinityWhy(0.81, 'Bad Bunny'), 'Strong match for Bad Bunny fans (81%)');
  assert.equal(affinityWhy(0.81, 'Bad Bunny', 'es'), 'Fuerte afinidad para fans de Bad Bunny (81%)');
  assert.equal(affinityWhy(0.45, 'Bad Bunny'), 'Good match for Bad Bunny fans (45%)');
  assert.equal(affinityWhy(0.45, 'Bad Bunny', 'es'), 'Buena afinidad para fans de Bad Bunny (45%)');
  assert.equal(affinityWhy(0.12, 'Bad Bunny'), '', 'below 0.3 omits the line');
  assert.equal(affinityWhy(0.81, 'Bad Bunny', 'fr'), 'Strong match for Bad Bunny fans (81%)', 'unsupported langs fall back to en');
  assert.equal(affinityWhy(null, 'Bad Bunny'), '');
  assert.equal(affinityWhy(0.81, ''), '');
});

const dossierSource = fs.readFileSync(new URL('../app/dossier.js', import.meta.url), 'utf8');
function loadDossier() {
  const context = { window: {}, URL };
  vm.createContext(context);
  vm.runInContext(dossierSource, context);
  return context.window.ZemiDossier;
}

test('pictureOf prefers Qloo image, then Commons photo, then logo, then site icon, then a letter tile; aerial is only a location thumb', () => {
  const dossier = loadDossier();
  assert.equal(dossier.pictureOf({ qlooImage: 'https://q/img.jpg', logo: 'https://l.png', image: 'https://p.jpg' }).src, 'https://q/img.jpg');
  assert.equal(dossier.pictureOf({ logo: 'https://l.png', image: 'https://p.jpg', aerial: 'https://a.jpg' }).src, 'https://p.jpg');
  assert.equal(dossier.pictureOf({ logo: 'https://l.png', image: 'https://p.jpg' }).credit, 'Photo · Wikimedia Commons');
  assert.equal(dossier.pictureOf({ logo: 'https://l.png', website: 'https://www.spot.pr' }).credit, 'Logo · Wikimedia Commons');
  assert.equal(dossier.pictureOf({ website: 'https://www.spot.pr', aerial: 'https://a.jpg' }).src, 'https://icons.duckduckgo.com/ip3/spot.pr.ico');
  assert.equal(dossier.pictureOf({ website: 'https://www.spot.pr' }).credit, '');
  assert.equal(dossier.pictureOf({ website: 'https://www.spot.pr' }).logo, true);
  // A Facebook or Instagram page is not the place's site: no platform logo on the card, letter tile instead.
  assert.equal(dossier.pictureOf({ name: 'TocaMadera Café', website: 'https://www.facebook.com/tocamaderacafe' }).letter, true);
  assert.equal(dossier.pictureOf({ name: 'TocaMadera Café', domain: 'facebook.com' }).letter, true);
  assert.equal(dossier.pictureOf({ name: 'Los Socios', domain: 'instagram.com' }).initial, 'L');
  assert.equal(dossier.pictureOf({ image: 'https://p.jpg', aerial: 'https://a.jpg' }).credit, 'Photo · Wikimedia Commons');
  const letter = dossier.pictureOf({ name: 'Campioni', category: 'food', aerial: 'https://a.jpg' });
  assert.equal(letter.letter, true);
  assert.equal(letter.initial, 'C');
  assert.equal(letter.tone, 'coral');
  assert.equal(dossier.locationThumb({ aerial: 'https://a.jpg' }).credit, 'Location · Esri World Imagery');
  const card = dossier.markup({ name: 'X', aerial: 'https://a.jpg', facts: [], details: {} });
  assert.match(card, /location-shot[\s\S]*Location · Esri/);
  assert.match(card, /hero-shot"><span class="shot letter"/);
  assert.doesNotMatch(card, /hero-shot"><img[^>]*a\.jpg/);
});

test('index wires result logos to fall through to a letter tile on error or a <=48px DDG placeholder', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(html, /icons\\.duckduckgo\\.com/);
  assert.match(html, /naturalWidth <= 48 && img\.naturalHeight <= 48/);
  assert.match(html, /dataset\.tone/);
  assert.match(html, /letterTileForCard/);
  assert.doesNotMatch(html, /onResultCardKeydown/);
  const marks = fs.readFileSync(new URL('../app/marks.js', import.meta.url), 'utf8');
  assert.match(marks, /data-tone="\$\{esc\(tone\)\}"/);
  assert.match(marks, /<ul class="answer-cards">/);
  assert.match(marks, /class="result-name"/);
  assert.match(marks, /aria-describedby/);
});
