// Plan item 10: instant samples served when the model cannot answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSamples, replayOf, SAMPLE_PROMPTS } from '../server/samples.mjs';

const sample = { id: 'x', lang: 'en', question: 'Where do Bad Bunny fans eat in Bayamón?', savedAt: '2026-10-14T18:00:00.000Z',
  model: 'deepseek/deepseek-v4.1-flash', speech: 'Fans go to Los Socios Cafe.', spoken: 'Fans go to Los Socios Cafe.',
  actions: [{ type: 'show_places', town: 'Bayamón', places: [{ id: 'a', name: 'Los Socios Cafe' }] }],
  evidence: { mode: 'model', model: 'deepseek/deepseek-v4.1-flash', rounds: 2, ms: 2600, at: '2026-10-14T18:00:00.000Z',
    calls: [{ tool: 'artist_places', args: { town: 'Bayamón', artist: 'Bad Bunny' }, ok: true, ms: 700, source: 'Qloo', count: 8, ids: ['a'] }] } };

function dirWith(t, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zemi-samples-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
  return dir;
}

test('a replay keeps the answer and the map actions, and relabels the evidence with the save time on every call', () => {
  const out = replayOf(sample);
  assert.equal(out.agent, true);
  assert.equal(out.replay, true);
  assert.equal(out.speech, sample.speech);
  assert.deepEqual(out.actions, sample.actions);
  assert.equal(out.evidence.mode, 'replay');
  assert.equal(out.evidence.at, '2026-10-14T18:00:00.000Z');
  assert.equal(out.evidence.calls[0].retrievedAt, '2026-10-14T18:00:00.000Z');
  assert.equal(out.evidence.calls[0].tool, 'artist_places');
});

test('a saved question matches without accents, case or punctuation, in its own language only', (t) => {
  const samples = createSamples({ dir: dirWith(t, { 'x.json': sample, 'bad.json': '{not json', 'thin.json': { lang: 'en', question: 'q' } }) });
  assert.equal(samples.size, 1, 'a broken file and a file without an answer are skipped');
  assert.equal(samples.match({ question: 'where do bad bunny fans eat in bayamon', lang: 'en' }).replay, true);
  assert.equal(samples.match({ question: 'Where do Bad Bunny fans eat in Bayamón?', lang: 'es' }), null);
  assert.equal(samples.match({ question: 'Where do Bad Bunny fans drink in Bayamón?', lang: 'en' }), null);
  assert.equal(createSamples({ dir: path.join(os.tmpdir(), 'zemi-no-such-dir') }).size, 0);
});

test('the three committed samples are model runs with map actions for the three saved prompts', (t) => {
  const dir = new URL('../data/samples/', import.meta.url);
  // Saved Qloo results stay out of the public repository (scripts/save-samples.mjs rebuilds them): skip there.
  if (!fs.existsSync(dir)) { t.skip('data/samples is not in this checkout'); return; }
  const samples = createSamples({ dir: dir.pathname.replace(/^\/([A-Za-z]:)/, '$1') });
  assert.equal(samples.size, 3);
  for (const prompt of SAMPLE_PROMPTS) {
    const file = JSON.parse(fs.readFileSync(new URL(`${prompt.id}.json`, dir), 'utf8'));
    assert.equal(file.question, prompt.question);
    assert.equal(file.evidence.mode, 'model', prompt.id);
    assert.ok(file.actions.length >= 1, `${prompt.id} moves the map`);
    assert.match(file.savedAt, /^\d{4}-\d{2}-\d{2}T/);
    const served = samples.match(prompt);
    assert.equal(served.evidence.mode, 'replay');
    assert.equal(served.speech, file.speech);
  }
  assert.doesNotMatch(JSON.stringify(fs.readdirSync(dir).map((name) => fs.readFileSync(new URL(name, dir), 'utf8'))), /sk-or-|Bearer /);
});

test('the chat route serves a sample only after the model agent fell back, before the rules router', () => {
  const server = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  const route = server.slice(server.indexOf('if (url.pathname === "/api/chat"'), server.indexOf('if (url.pathname === "/api/ask"'));
  assert.ok(route.indexOf('if (!answer.fallback) return sendJson(res, 200, answer);') < route.indexOf('samples.match(checked.value)'));
  assert.ok(route.indexOf('samples.match(checked.value)') < route.indexOf('await patternAnswer(checked.value)'));
  assert.match(route, /sendJson\(res, 200, \{ \.\.\.sample, fallback: true \}\)/);
  assert.match(server, /createSamples\(\{ dir: path\.join\(root, "data", "samples"\) \}\)/);
});

test('a replay carries no day-specific text: no "Today" hours on its places and no weather sentence (Codex r2 #3)', (t) => {
  const dir = new URL('../data/samples/', import.meta.url);
  if (!fs.existsSync(dir)) { t.skip('data/samples is not in this checkout'); return; }
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const saved = JSON.parse(fs.readFileSync(new URL(name, dir), 'utf8'));
    assert.doesNotMatch(saved.speech, /\b(today|hoy)\b/i, `${name} speech`);
    assert.doesNotMatch(saved.spoken || '', /\b(today|hoy)\b/i, `${name} spoken`);
    const out = replayOf(saved);
    for (const action of out.actions) for (const place of action.places || [action.place].filter(Boolean)) {
      assert.equal(place.hours, undefined, `${name}: ${place.name} hours`);
    }
  }
});
