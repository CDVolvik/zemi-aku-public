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
