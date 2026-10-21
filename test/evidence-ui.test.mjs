// Plan item 2: the evidence drawer under every agent answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app/evidence.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
function load() {
  const window = {};
  const context = { window };
  vm.createContext(context); vm.runInContext(source, context);
  return window.ZemiEvidence;
}
const modelRun = { mode: 'model', model: 'deepseek/deepseek-v4.1-flash', rounds: 2, ms: 3120, at: '2026-10-14T03:12:40.000Z', calls: [
  { tool: 'town_catalog', args: { town: 'Ponce', category: 'cafe' }, ok: true, ms: 240, source: 'Qloo', count: 14, measured: '2026-10-12',
    ids: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'] },
  { tool: 'place_details', args: { town: 'Ponce', id: '11111111-1111-1111-1111-111111111111' }, ok: true, ms: 90, source: 'Qloo + Overture', count: 1,
    ids: ['11111111-1111-1111-1111-111111111111'] },
  { tool: 'read_env', ok: false, ms: 0, error: 'Unknown tool or invalid arguments' },
] };

test('a model answer folds to one line and opens to one line per tool call, with the model and the time', () => {
  const Z = load();
  const out = Z.html('en', modelRun);
  assert.match(out, /^<details class="evidence small">/);
  assert.match(out, /<summary>Evidence · live model · 3 tool calls · 3\.1 s<\/summary>/);
  assert.match(out, /<li><code>town_catalog<\/code> Ponce, cafe → Qloo · 14 places · catalog measured 2026-10-12 · 0\.2 s<\/li>/);
  assert.match(out, /<code>place_details<\/code> Ponce, 1111…1111 → Qloo \+ Overture · 1 place · 0\.1 s/);
  assert.match(out, /<code>read_env<\/code> → refused: Unknown tool or invalid arguments/);
  assert.match(out, /Model deepseek\/deepseek-v4\.1-flash via OpenRouter · 2 rounds · answered 2026-10-14 03:12 UTC/);
  assert.match(out, /Qloo IDs: 1111…1111, 2222…2222/, 'resolved IDs are listed once, shortened');
  const many = Z.html('en', { ...modelRun, calls: [{ tool: 'map_town', args: { town: 'Ponce' }, ok: true, ms: 3 }, { tool: 'town_catalog', args: { town: 'Ponce' }, ok: true, ms: 10, source: 'Qloo', count: 9, ids: Array.from({ length: 9 }, (_, i) => `${i}${i}${i}${i}${i}${i}${i}${i}-0000-0000-0000-000000000000`) }] });
  assert.match(many, /<code>map_town<\/code> Ponce → done<\/li>/, 'a call with no payload still reads as done, without a time under 50 ms');
  assert.match(many, /7777…0000, \+1 more<\/p>/, 'the ID list is capped at eight');
});

test('the same run reads in Spanish', () => {
  const out = load().html('es', modelRun);
  assert.match(out, /<summary>Evidencia · modelo en vivo · 3 llamadas · 3,1 s<\/summary>/);
  assert.match(out, /14 lugares · catálogo medido 2026-10-12/);
  assert.match(out, /→ rechazada: /);
  assert.match(out, /Modelo deepseek\/deepseek-v4\.1-flash vía OpenRouter · 2 rondas · respondió 2026-10-14 03:12 UTC/);
});

test('a rules-router answer says there was no model turn and why', () => {
  const Z = load();
  assert.match(Z.html('en', { mode: 'rules', reason: 'budget', at: '2026-10-14T03:12:40.000Z' }), /<summary>Evidence · rules router · no model turn \(daily model budget spent\)<\/summary>/);
  assert.match(Z.html('en', { mode: 'rules', reason: 'visitor-cap' }), /\(your model turns for today are used\)/);
  assert.match(Z.html('en', { mode: 'rules', reason: 'http-429' }), /\(the model did not answer: http-429\)/);
  assert.match(Z.html('es', { mode: 'rules', reason: 'budget' }), /Evidencia · reglas · sin turno del modelo \(presupuesto diario del modelo agotado\)/);
  const open = Z.html('en', { mode: 'rules', reason: 'budget', at: '2026-10-14T03:12:40.000Z' });
  assert.match(open, /Answered by the rule-based router from the saved Qloo catalog · 2026-10-14 03:12 UTC/);
});

test('a replay run is labeled as one, with its retrieval time', () => {
  const out = load().html('en', { mode: 'replay', at: '2026-10-11T07:13:59.000Z', calls: [{ tool: 'opportunity_map', args: { industry: 'bakery' }, ok: true, ms: 0, source: 'Qloo heatmap', retrievedAt: '2026-10-11T07:13:59.194Z' }] });
  assert.match(out, /<summary>Evidence · saved replay · 1 tool call<\/summary>/);
  assert.match(out, /bakery → Qloo heatmap · read 2026-10-11 07:13 UTC/);
});

test('tool output is escaped and absent evidence renders nothing', () => {
  const Z = load();
  const out = Z.html('en', { mode: 'model', model: 'm', rounds: 1, ms: 10, at: '2026-10-14T03:12:40.000Z', calls: [{ tool: '<b>x</b>', args: { town: '<img>' }, ok: false, ms: 1, error: '<script>' }] });
  assert.doesNotMatch(out, /<b>|<img>|<script>/);
  assert.match(out, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.equal(Z.html('en', null), '');
  assert.equal(Z.html('en', {}), '');
});

test('the page loads the module and the caption carries the drawer for typed and spoken answers', () => {
  assert.match(html, /<script src="\/app\/evidence\.js"><\/script>/);
  assert.match(html, /function showCaption\(who, text, evidence/);
  assert.match(html, /ZemiEvidence\.answerBody\(lang, evidence, cards\)/);
  const run = html.match(/async function runQuestion\([^]*?\n}\n/)[0];
  assert.match(run, /showCaption\("zemi", data\.speech, data\.evidence/);
  const narrate = html.match(/function narrate\([^]*?\n}\n/)[0];
  assert.match(narrate, /showCaption\("zemi", text, data\?\.evidence/);
  assert.match(html, /#caption \.evidence \{/);
  assert.match(html, /#caption \.evidence summary \{[^}]*cursor: pointer/);
});

test('answer bodies put place cards above the folded evidence line', () => {
  const Z = load();
  const cards = '<ul class="answer-cards"><li><article class="result-card">X</article></li></ul>';
  const out = Z.answerBody('en', modelRun, cards);
  assert.ok(out.indexOf('answer-cards') < out.indexOf('class="evidence'));
  assert.match(out, /<details class="evidence small">/);
  assert.equal(Z.answerBody('en', null, cards), cards);
});

test('a fallback that ran tool calls says the model did not finish and lists them', () => {
  const Z = load();
  const calls = [{ tool: 'map_town', args: { town: 'Ponce' }, ok: true, ms: 3 }];
  const out = Z.html('en', { mode: 'rules', reason: 'budget', rounds: 1, calls, at: '2026-10-14T03:12:40.000Z' });
  assert.match(out, /<summary>Evidence · rules router · model did not finish \(daily model budget spent\) · 1 tool call<\/summary>/);
  assert.match(out, /map_town/);
  assert.match(Z.html('es', { mode: 'rules', reason: 'budget', rounds: 1, calls }), /el modelo no terminó/);
});

test('a deterministic business or opportunity answer lists its sources and says no model turn', () => {
  const Z = load();
  const calls = [
    { tool: 'town_catalog', args: { town: 'Mayagüez', type: 'bakery' }, ok: true, source: 'Qloo saved catalog', count: 11 },
    { tool: 'overture_supply', args: { town: 'Mayagüez' }, ok: true, source: 'Overture Maps', count: 22, note: 'release 2026-09-23.1' },
    { tool: 'census_prcs', args: { town: 'Mayagüez' }, ok: true, source: 'Census PRCS', note: '2020–2024' },
  ];
  const out = Z.html('en', { mode: 'sources', kind: 'business', calls, at: '2026-10-14T03:12:40.000Z' });
  assert.match(out, /<summary>Evidence · business research · no model turn · 3 sources<\/summary>/);
  assert.match(out, /<li><code>town_catalog<\/code> Mayagüez, bakery → Qloo saved catalog · 11 places<\/li>/);
  assert.match(out, /<code>overture_supply<\/code> Mayagüez → Overture Maps · 22 places · release 2026-09-23\.1/);
  assert.match(out, /<code>census_prcs<\/code> Mayagüez → Census PRCS · 2020–2024/);
  assert.match(out, /Answered from these sources without a model turn · 2026-10-14 03:12 UTC/);
  const map = Z.html('es', { mode: 'sources', kind: 'opportunity', calls: [calls[0]] });
  assert.match(map, /<summary>Evidencia · mapa de oportunidad · sin turno del modelo · 1 fuente<\/summary>/);
  assert.match(map, /Respondido desde estas fuentes, sin turno del modelo/);
});
