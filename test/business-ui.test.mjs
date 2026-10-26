import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('an exact town answer continues the purchase conversation instead of bypassing chat', async () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/\$\("ask"\)\.addEventListener\("submit", async \(event\) => \{[^]*?\n\}\);/)[0];
  let submit, selected = 0, asked = '';
  const context = { $: () => ({ addEventListener: (_, fn) => { submit = fn; } }),
    qInput: { value: 'Bayamon' }, businessFlow: true, hitIndex: -1, shownHits: [],
    byName: new Map([['Bayamon', {}]]), norm: text => text.toLowerCase(),
    showHits() {}, select() { selected++; }, speakNext: false, unlockAudio() {}, narrate() {},
    ZemiApp: { ask: async text => { asked = text; return {}; } } };
  vm.createContext(context); vm.runInContext(source, context);
  await submit({ preventDefault() {} });
  assert.equal(asked, 'Bayamon'); assert.equal(selected, 0);
});
test('the business brief identifies actual sources without claiming a Wikipedia lookup', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/function briefText\(data\) \{[^]*?\n\}\n/)[0];
  const context = {};
  vm.createContext(context); vm.runInContext(source, context);
  const text = context.briefText({ business: {}, town: 'Bayamón' });
  assert.match(text, /saved catalog/);
  assert.doesNotMatch(text, /Wikipedia/);
});

test('nearby business questions transmit only the selected verified place id', async () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/async function askTown\([^]*?\n}\n/)[0];
  let sent;
  const context = { step: 'place', focusedIndex: 0, openPlaces: [{ id: 'known-place' }], businessReferenceId: '',
    currentTaste: () => '', ZemiConverse: { voice: () => ({ lang: 'en' }) }, conversation: [], businessFlow: true,
    fetch: async (_, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ business: {} }) }; } };
  vm.createContext(context); vm.runInContext(source, context);
  await context.askTown('Bayamón', 'Competitors near this place');
  assert.equal(sent.referenceId, 'known-place');
  assert.equal(sent.referenceCoordinates, undefined);
});

test('business research distinguishes observed supply from demographic context in its source brief', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/function briefText\(data\) \{[^]*?\n}\n/)[0];
  const context = {};
  vm.createContext(context); vm.runInContext(source, context);
  const text = context.briefText({ business: { mode: 'research', evidence: {
    supply: { release: '2026-09-23.1', count: 24 }, demographics: { period: '2020–2024' } } }, town: 'Bayamón' });
  assert.match(text, /Overture/);
  assert.match(text, /2020–2024/);
  assert.doesNotMatch(text, /Wikipedia|directories.*searched/);
});

test('a tool list title reads in Spanish when Spanish is picked', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/function localFocus\([^]*?\n}\n/)[0];
  const context = { ZemiConverse: { voice: () => ({ lang: 'es' }) }, ZemiMarks: { KINDS: { food: { label: 'Food', es: 'Comida' } }, kindLabel: (k, l) => (l === 'es' ? k.es : k.label) } };
  vm.createContext(context); vm.runInContext(source, context);
  assert.equal(context.localFocus('food in Caguas'), 'comida en Caguas');
  assert.equal(context.localFocus('all in Adjuntas'), 'todos en Adjuntas');
  assert.equal(context.localFocus('Bad Bunny fans in San Juan'), 'fanáticos de Bad Bunny en San Juan');
  assert.equal(context.localFocus('Places'), 'Places');
  context.ZemiConverse = { voice: () => ({ lang: 'en' }) };
  assert.equal(context.localFocus('food in Caguas'), 'food in Caguas');
});

test('a town with an opportunity verdict gets a decision card first: what the data says, what it cannot, three checks', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/function decisionCard\([^]*?\nfunction showBusinessResearch\(business\) \{[^]*?\n}\n/)[0];
  const elements = new Map();
  const context = { $: id => { if (!elements.has(id)) elements.set(id, { dataset: {} }); return elements.get(id); },
    ZemiConverse: { voice: () => ({ lang: 'es' }) }, esc: text => String(text), document: { querySelectorAll: () => [] },
    ZemiOpportunity: { LABELS: { es: { gap: 'Brecha: afinidad sobre la mediana, pocos negocios por residente', competitive: 'Competido' }, en: { gap: 'Gap' } }, supplyText: () => ({ businesses: '16 establecimientos', per: '0.5 por cada 10,000' }),
      definitionsHtml: () => '', industryChips: () => '', censusScope: (lang, sources) => sources?.cbp?.naics?.length ? `panaderías al detal, con empleados (NAICS ${sources.cbp.naics.join(' + ')})` : '' } };
  context.window = context; context.URLSearchParams = URLSearchParams;
  vm.createContext(context);
  // The card's sentences live in app/decision.js, shared with the printable opening plan.
  vm.runInContext(fs.readFileSync(new URL('../app/decision.js', import.meta.url), 'utf8'), context);
  vm.runInContext(source, context);
  vm.runInContext("researchPlaces = [{ name: 'Panadería Alturas' }, { name: 'La Familia Bakery 2' }, { name: 'Ekelekua' }, { name: 'Cuarta' }];", context);
  context.showBusinessResearch({ town: 'San Juan', mode: 'research', available: true, total: 37, counts: [],
    evidence: { supply: { count: 64, release: '2026-09' }, opportunity: { industry: 'bakery', group: 'gap', tasteRank: 5, ranked: 76, establishments: 16, suppressed: false, perTenThousand: 0.476, medianPerTenThousand: 1.3, notes: [] } } });
  const out = elements.get('business-evidence').innerHTML;
  assert.ok(out.indexOf('class="decision"') < out.indexOf('Overture'), 'the card comes first');
  assert.match(out, /Lo que dicen los datos<\/h4><p>Brecha: afinidad sobre la mediana, pocos negocios por residente · gusto #5 de 76\. 16 establecimientos con empleados, 0\.5 por cada 10,000 residentes frente a la mediana de 1\.3 con la que se dividen los grupos\. Qloo registra 37 lugares de este tipo; Overture, 64\./);
  assert.match(out, /Lo que no puede decir<\/h4><p>Demanda, ventas, rentas, tráfico peatonal, permisos ni ganancias\./);
  assert.match(out, /Tres pasos siguientes<\/h4><ol><li>Visite Panadería Alturas, La Familia Bakery 2, Ekelekua a la hora de apertura/);
  assert.match(out, /<li>Pregunte rentas en la calle principal/);
  assert.match(out, /<li>Compare con el siguiente pueblo del grupo brecha/);
  // The card links the same verdict as a printable page, in the session's language.
  assert.match(out, /<p class="plan-link"><a href="\/plan\?industry=bakery&town=San\+Juan&lang=es" target="_blank" rel="noopener">Plan de apertura para imprimir/);
  assert.doesNotMatch(out, /Overture, [^<]*mapa de Overture/);
  assert.doesNotMatch(out, /El Censo cuenta solo/, 'no NAICS codes in the record: no scope sentence');
  assert.doesNotMatch(out, /Qloo etiqueta/, 'no taste profile: no tags sentence');
  // The town's Qloo taste tags sit beside the rank (judge panel 10/25).
  elements.clear();
  context.showBusinessResearch({ town: 'San Juan', mode: 'research', available: true, total: 37, counts: [],
    evidence: { supply: { count: 64 }, taste: { status: 'ready', profile: { vibe: [{ name: 'Nightlife' }, { name: 'Trendy' }, { name: 'Historic' }, { name: 'Fourth' }], music: [], tv: [] } },
      opportunity: { industry: 'bakery', group: 'gap', tasteRank: 5, ranked: 76, establishments: 16, suppressed: false, perTenThousand: 0.476, medianPerTenThousand: 1.3, notes: [] } } });
  assert.match(elements.get('business-evidence').innerHTML, /gusto #5 de 76\. Qloo etiqueta el gusto del pueblo como Nightlife, Trendy, Historic\. 16 establecimientos/);
  // The visit line follows the answer's named places (judge panel 10/25: panel and bubble disagreed).
  const app = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(app, /const spoken = data\.speech \? ZemiMarks\.picks\(listed, data\.speech, 3, \{ exact: true \}\)\.map\(\(p\) => p\.name\) : \[\];\s*const order = spoken\.length \? spoken : leadNames;[^\n]*\n\s*const named = new Set\(order\);\s*researchPlaces = \[\.\.\.order\.map\(\(name\) => listed\.find\(\(p\) => p\.name === name\)\)\.filter\(Boolean\), \.\.\.listed\.filter\(\(p\) => !named\.has\(p\.name\)\)\];/);
  // With the build's codes, the card says what the Census counts and why the catalogs run longer (judge panel 10/24 round 4).
  elements.clear();
  context.showBusinessResearch({ town: 'San Juan', mode: 'research', available: true, total: 37, counts: [],
    evidence: { supply: { count: 64, release: '2026-09' }, opportunity: { industry: 'bakery', group: 'gap', tasteRank: 5, ranked: 76, establishments: 16, suppressed: false, perTenThousand: 0.476, medianPerTenThousand: 1.3, notes: [], sources: { cbp: { naics: ['311811'] } } } } });
  const scoped = elements.get('business-evidence').innerHTML;
  assert.match(scoped, /Overture, 64\. El Censo cuenta solo panaderías al detal, con empleados \(NAICS 311811\); las listas de Qloo y Overture incluyen lugares sin empleados y con otras etiquetas, por eso son más largas, y el grupo se lee en el eje del Censo\.<\/p>/);
  elements.clear();
  context.showBusinessResearch({ town: 'Lares', mode: 'research', available: true, total: 2, counts: [],
    evidence: { supply: { count: 3 }, opportunity: { industry: 'bakery', group: 'competitive', tasteRank: 30, ranked: 76, establishments: 5, suppressed: false, perTenThousand: 2.0, medianPerTenThousand: 1.3, notes: [], sources: { cbp: { naics: ['311811'] } } } } });
  assert.doesNotMatch(elements.get('business-evidence').innerHTML, /El Censo cuenta solo/, 'catalogs no longer than the Census count: nothing to explain');
  // One catalog longer, the other not: only that one is named (Codex review 10/25: Bayamón cafés, Qloo 21, Overture 62, Census 31).
  elements.clear();
  context.showBusinessResearch({ town: 'Bayamón', mode: 'research', available: true, total: 21, counts: [],
    evidence: { supply: { count: 62 }, opportunity: { industry: 'cafe', group: 'competitive', tasteRank: 9, ranked: 76, establishments: 31, suppressed: false, perTenThousand: 1.9, medianPerTenThousand: 1.3, notes: [], sources: { cbp: { naics: ['311811'] } } } } });
  assert.match(elements.get('business-evidence').innerHTML, /la lista de Overture incluye lugares sin empleados y con otras etiquetas, por eso es más larga, y el grupo/);
  assert.doesNotMatch(elements.get('business-evidence').innerHTML, /lista de Qloo/);
  // A withheld count compares against its upper bound: two catalog places against 0–2 proves nothing.
  elements.clear();
  context.showBusinessResearch({ town: 'Florida', mode: 'research', available: true, total: 2, counts: [],
    evidence: { supply: { count: 2 }, opportunity: { industry: 'bakery', group: 'gap', tasteRank: 20, ranked: 76, establishments: 0, establishmentsMax: 2, suppressed: true, perTenThousand: 0, perTenThousandMax: 1.6, medianPerTenThousand: 1.3, notes: [], sources: { cbp: { naics: ['311811'] } } } } });
  assert.doesNotMatch(elements.get('business-evidence').innerHTML, /El Censo cuenta solo/);
  // The third check follows the group, and Overture-only names join the visit list (judge panel 10/24 round 3).
  elements.clear();
  context.showBusinessResearch({ town: 'Adjuntas', mode: 'research', available: true, total: 5, counts: [],
    evidence: { supply: { count: 7, places: [{ name: 'Panadería Alturas' }, { name: 'La Adjunteña' }, { name: 'La Fé' }, { name: 'Otra' }] },
      opportunity: { industry: 'bakery', group: 'competitive', tasteRank: 32, ranked: 76, establishments: 5, suppressed: false, perTenThousand: 2.8, medianPerTenThousand: 1.3, notes: [] } } });
  const comp = elements.get('business-evidence').innerHTML;
  assert.match(comp, /Visite Panadería Alturas, La Familia Bakery 2, Ekelekua y, del mapa de Overture, La Adjunteña y La Fé a la hora de apertura/);
  assert.match(comp, /<li>Visite dos competidores y anote qué venden y a qué precio\.<\/li>/);
  assert.doesNotMatch(comp, /grupo brecha/);
  // A suppressed count reads as a range and an upper bound, never 0.0.
  elements.clear();
  context.showBusinessResearch({ town: 'Luquillo', mode: 'research', available: true, total: 3, counts: [],
    evidence: { supply: { count: 4 }, opportunity: { industry: 'bakery', group: 'gap', tasteRank: 3, ranked: 76, establishments: 0, establishmentsMax: 2, suppressed: true, perTenThousand: 0, perTenThousandMax: 1.14, medianPerTenThousand: 1.3, notes: [] } } });
  const sup = elements.get('business-evidence').innerHTML;
  assert.match(sup, /de 0 a 2 establecimientos con empleados \(el Censo no publica cifras menores de 3\), hasta 1\.1 por cada 10,000 residentes frente a la mediana de 1\.3/);
  assert.doesNotMatch(sup, /0\.0 por cada/);
  // No verdict row: no card.
  elements.clear();
  context.showBusinessResearch({ town: 'Ponce', mode: 'research', available: true, total: 2, counts: [], evidence: {} });
  assert.doesNotMatch(elements.get('business-evidence').innerHTML, /class="decision"/);
});

test('a TV-only returned taste profile is visible in the business panel', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/function showBusinessResearch\(business\) \{[^]*?\n}\n/)[0];
  const elements = new Map();
  const context = { $: id => { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); },
    ZemiConverse: { voice: () => ({ lang: 'en' }) }, esc: text => String(text),
    document: { querySelectorAll: () => [] } };
  vm.createContext(context); vm.runInContext(source, context);
  context.showBusinessResearch({ town: 'Ponce', mode: 'research', available: true, total: 0, counts: [],
    evidence: { taste: { status: 'ready', profile: { music: [], vibe: [], tv: [{ name: 'Returned show' }] } } } });
  assert.match(elements.get('business-evidence').innerHTML, /TV: Returned show/);
});
