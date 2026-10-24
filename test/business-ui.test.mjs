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
    ZemiOpportunity: { LABELS: { es: { gap: 'Brecha: mucha afinidad, pocos negocios' }, en: { gap: 'Gap' } }, supplyText: () => ({ businesses: '16 establecimientos', per: '0.5 por cada 10,000' }),
      definitionsHtml: () => '', industryChips: () => '' } };
  vm.createContext(context); vm.runInContext(source, context);
  vm.runInContext("researchPlaces = [{ name: 'Panadería Alturas' }, { name: 'La Familia Bakery 2' }, { name: 'Ekelekua' }, { name: 'Cuarta' }];", context);
  context.showBusinessResearch({ town: 'San Juan', mode: 'research', available: true, total: 37, counts: [],
    evidence: { supply: { count: 64, release: '2026-09' }, opportunity: { industry: 'bakery', group: 'gap', tasteRank: 5, ranked: 76, establishments: 16, suppressed: false, perTenThousand: 0.476, medianPerTenThousand: 1.3, notes: [] } } });
  const out = elements.get('business-evidence').innerHTML;
  assert.ok(out.indexOf('class="decision"') < out.indexOf('Overture'), 'the card comes first');
  assert.match(out, /Lo que dicen los datos<\/h4><p>Brecha: mucha afinidad, pocos negocios · gusto #5 de 76\. 16 establecimientos con empleados, 0\.5 por cada 10,000 residentes frente a la mediana de 1\.3 con la que se dividen los grupos\. Qloo registra 37 lugares de este tipo; Overture, 64\./);
  assert.match(out, /Lo que no puede decir<\/h4><p>Demanda, ventas, rentas, tráfico peatonal, permisos ni ganancias\./);
  assert.match(out, /Tres pasos siguientes<\/h4><ol><li>Visite Panadería Alturas, La Familia Bakery 2, Ekelekua a la hora de apertura/);
  assert.match(out, /<li>Pregunte rentas en la calle principal/);
  // A suppressed count reads as a range and an upper bound, never 0.0.
  elements.clear();
  context.showBusinessResearch({ town: 'Luquillo', mode: 'research', available: true, total: 3, counts: [],
    evidence: { supply: { count: 4 }, opportunity: { industry: 'bakery', group: 'gap', tasteRank: 3, ranked: 76, establishments: 0, establishmentsMax: 2, suppressed: true, perTenThousand: 0, perTenThousandMax: 1.14, medianPerTenThousand: 1.3, notes: [] } } });
  const sup = elements.get('business-evidence').innerHTML;
  assert.match(sup, /de 0 a 2 establecimientos con empleados \(el Census no publica cifras menores de 3\), hasta 1\.1 por cada 10,000 residentes frente a la mediana de 1\.3/);
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
