// Plan item 3: the with-and-without-Qloo control.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { agentTools, withoutQloo } from '../server/agent-tools.mjs';
import { compareRuns, PROMPTS } from '../server/compare.mjs';

test('withoutQloo keeps only the tools that never read Qloo', () => {
  const registry = agentTools({ towns: ['Ponce'], categories: [], weather: { forecast: async () => ({}), alerts: async () => [], storms: async () => [] } });
  assert.deepEqual(withoutQloo(registry).map((tool) => tool.name).sort(), ['landmarks', 'map_town', 'town_history', 'town_weather']);
  assert.ok(registry.length > 10, 'the full registry is untouched');
});

test('the control has six frozen prompts, one in Spanish, none that the business flow would intercept', () => {
  assert.equal(PROMPTS.length, 6);
  assert.deepEqual(PROMPTS.map((p) => p.id), ['bad-bunny', 'bayamon-cafe', 'maricao', 'mofongo', 'rincon-rain', 'calle-13']);
  assert.equal(PROMPTS.filter((p) => p.lang === 'es').length, 1);
  for (const p of PROMPTS) assert.doesNotMatch(p.question, /should i open|debo abrir|competitors/i);
});

const place = (id, name) => ({ id, name });
const withRun = { speech: 'Fans of Bad Bunny go to La Placita and El Kiosko. Café Tres is also popular.',
  evidence: { mode: 'model', calls: [{ tool: 'artist_places', ok: true, ids: ['a', 'b', 'c'] }, { tool: 'map_town', ok: true }] },
  actions: [{ type: 'show_places', town: 'Bayamón', places: [place('a', 'La Placita'), place('b', 'El Kiosko'), place('c', 'Café Tres'), place('d', 'Unnamed Bar')] }] };
const withoutRun = { speech: 'As general knowledge, people like La Placita de Bayamón and Plaza del Sol.',
  evidence: { mode: 'model', calls: [{ tool: 'map_town', ok: true }] }, actions: [{ type: 'fly_town', town: 'Bayamón' }] };

test('compareRuns names the catalog places each answer used and what Qloo changed', () => {
  const out = compareRuns(withRun, withoutRun);
  assert.deepEqual(out.named.with, ['La Placita', 'El Kiosko', 'Café Tres']);
  assert.deepEqual(out.named.without, ['La Placita'], 'the without run can only name a place from general knowledge; it is matched against the Qloo run\'s catalog');
  assert.deepEqual(out.onlyWith, ['El Kiosko', 'Café Tres']);
  assert.deepEqual(out.onlyWithout, []);
  assert.equal(out.qlooAddedNothing, false);
  assert.equal(out.tools.with, 2);
  assert.equal(out.tools.without, 1);
});

test('compareRuns says so when Qloo added nothing: no catalog place named, or the same places either way', () => {
  const empty = compareRuns({ speech: 'Nothing verified in Maricao.', evidence: { calls: [{ tool: 'town_catalog', ok: true, ids: [] }] }, actions: [] },
    { speech: 'Maricao is a coffee town.', evidence: { calls: [] }, actions: [] });
  assert.equal(empty.qlooAddedNothing, true);
  assert.deepEqual(empty.named.with, []);
  const same = compareRuns({ ...withRun, speech: 'Go to La Placita.' }, { ...withoutRun, speech: 'Try La Placita.' });
  assert.equal(same.qlooAddedNothing, true);
  assert.deepEqual(same.onlyWith, []);
});

test('compareRuns matches names without accents or case and ignores one-word names that would match prose by accident', () => {
  const run = { speech: 'Vaya a CAFE TRES y a la placita.', evidence: { calls: [] },
    actions: [{ type: 'show_places', town: 'Ponce', places: [place('a', 'Café Tres'), place('b', 'La Placita'), place('c', 'Ponce')] }] };
  const out = compareRuns(run, { speech: 'Ponce has food.', evidence: { calls: [] }, actions: [] });
  assert.deepEqual(out.named.with, ['Café Tres', 'La Placita']);
  assert.deepEqual(out.named.without, []);
});

test('the page exists, reads the committed JSON and the front page and README link it', () => {
  const page = fs.readFileSync(new URL('../app/compare.html', import.meta.url), 'utf8');
  assert.match(page, /fetch\("\/data\/compare-qloo\.json"\)/);
  assert.match(page, /With Qloo/);
  assert.match(page, /Without Qloo/);
  assert.match(page, /Qloo added nothing here/);
  const home = fs.readFileSync(new URL('../app/home.html', import.meta.url), 'utf8');
  assert.match(home, /<a href="\/compare">With and without Qloo<\/a>/);
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /\/compare/);
  const server = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  assert.match(server, /"\/compare": "\/app\/compare\.html"/);
  assert.match(server, /process\.env\.ZEMI_COMPARE === "1" && body\.tools === "no-qloo"/, 'the no-Qloo agent is reachable only under the local env flag');
  const safe = fs.readFileSync(new URL('../deploy/compose.safe.yaml', import.meta.url), 'utf8');
  assert.doesNotMatch(safe, /ZEMI_COMPARE/);
});

test('the committed control has six prompts with both runs and carries no key material', (t) => {
  const saved = new URL('../data/compare-qloo.json', import.meta.url);
  // Saved Qloo results stay out of the public repository (scripts/compare-qloo.mjs rebuilds them): skip there.
  if (!fs.existsSync(saved)) { t.skip('data/compare-qloo.json is not in this checkout'); return; }
  const file = JSON.parse(fs.readFileSync(saved, 'utf8'));
  assert.equal(file.prompts.length, 6);
  assert.match(file.ranAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(file.model, 'deepseek/deepseek-v4.1-flash');
  for (const row of file.prompts) {
    assert.ok(row.with.speech.length > 20 && row.without.speech.length > 20, row.id);
    assert.equal(row.with.evidence.mode, 'model', `${row.id} with-run is a model answer`);
    assert.equal(row.without.evidence.mode, 'model', `${row.id} without-run is a model answer`);
    assert.ok(row.without.evidence.calls.every((call) => ['map_town', 'town_weather', 'landmarks', 'town_history'].includes(call.tool)), `${row.id}: the without run never touched Qloo`);
    assert.equal(typeof row.compare.qlooAddedNothing, 'boolean');
  }
  assert.doesNotMatch(JSON.stringify(file), /sk-or-|Bearer /);
});
