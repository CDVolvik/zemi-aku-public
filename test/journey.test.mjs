import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
function harness() {
  const nodes = new Map(), pending = [], rendered = [];
  const context = { AbortController, AbortSignal: {}, setTimeout, clearTimeout,
    $: id => { if (!nodes.has(id)) nodes.set(id, { textContent: '', hidden: true }); return nodes.get(id); },
    fetch: (url, options) => new Promise(resolve => pending.push({ url, options, resolve })),
    ZemiConverse: { voice: () => ({ lang: 'en' }) },
    showCatalog: data => rendered.push(data), updateJourney: () => {}, leaveOpportunity: () => {},
    journeyRequest: null, journeyData: null };
  vm.createContext(context);
  for (const name of ['clearJourney', 'runJourney']) {
    const source = html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}\\n`));
    assert.ok(source, `missing ${name}`);
    vm.runInContext(source[0], context);
  }
  return { context, nodes, pending, rendered };
}
const settle = (request, data, ok = true) => request.resolve({ ok, json: async () => data });

test('rapid artist changes cannot let the older journey replace the new results', async () => {
  const h = harness();
  const first = h.context.runJourney('Bad Bunny'), next = h.context.runJourney('Vico C');
  assert.equal(h.pending[0].options.signal.aborted, true);
  settle(h.pending[1], { journey: { artist: 'Vico C' }, places: [{ name: 'Verified' }] }); await next;
  settle(h.pending[0], { journey: { artist: 'Bad Bunny' } }); await first;
  assert.equal(h.rendered.length, 1);
  assert.equal(h.rendered[0].journey.artist, 'Vico C');
  assert.equal(JSON.parse(h.pending[1].options.body).artist, 'Vico C');
  assert.equal(h.pending[1].url, '/api/ask');
});

test('leaving a journey prevents its delayed response from moving the map', async () => {
  const h = harness(), request = h.context.runJourney('Bad Bunny');
  h.context.clearJourney();
  settle(h.pending[0], { journey: { artist: 'Bad Bunny' } }); await request;
  assert.equal(h.rendered.length, 0);
  assert.equal(h.nodes.get('journey-status').textContent, '');
});

test('failed requests keep the island usable with a visible retry message', async () => {
  const h = harness(), request = h.context.runJourney('Bad Bunny');
  settle(h.pending[0], {}, false); await request;
  assert.equal(h.rendered.length, 0);
  assert.match(h.nodes.get('journey-status').textContent, /try again/i);
});

test('a rendering failure does not blame Qloo for a successful response', async () => {
  const h = harness();
  h.context.showCatalog = () => { throw new Error('map renderer failed'); };
  const request = h.context.runJourney('Bad Bunny');
  settle(h.pending[0], { journey: { artist: 'Bad Bunny' } }); await request;
  assert.match(h.nodes.get('journey-status').textContent, /map/i);
  assert.doesNotMatch(h.nodes.get('journey-status').textContent, /Qloo's connections could not load/i);
});

test('empty results retain a visible error if clearing the journey precedes a map failure', async () => {
  const h = harness();
  h.context.showCatalog = () => { h.context.clearJourney(); throw new Error('map renderer failed'); };
  const request = h.context.runJourney('Unknown artist');
  settle(h.pending[0], { places: [] }); await request;
  assert.match(h.nodes.get('journey-status').textContent, /map/i);
});
