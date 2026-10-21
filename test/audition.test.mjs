import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATES, LINES, renderIndex } from '../server/audition.mjs';

test('thirty-two candidates, four per English and Spanish slot, a pair or more per new language, ids in Deepgram form', () => {
  assert.equal(CANDIDATES.length, 32);
  for (const lang of ['en', 'es']) for (const gender of ['female', 'male'])
    assert.equal(CANDIDATES.filter(c => c.lang === lang && c.gender === gender).length, 4);
  for (const lang of ['fr', 'it', 'de']) for (const gender of ['female', 'male'])
    assert.ok(CANDIDATES.filter(c => c.lang === lang && c.gender === gender).length >= 1, `${lang} ${gender}`);
  for (const c of CANDIDATES) assert.match(c.id, /^aura-2-[a-z]+-(en|es|fr|it|de)$/);
  assert.equal(new Set(CANDIDATES.map(c => c.id)).size, 32);
});

test('each audition line is short, natural and names two towns', () => {
  assert.deepEqual(Object.keys(LINES), ['en', 'es', 'fr', 'it', 'de']);
  for (const line of Object.values(LINES)) {
    assert.ok(line.length <= 280, `${line.length} characters`);
    assert.match(line, /Mayagüez/);
    assert.match(line, /Bayamón/);
    assert.equal((line.match(/\?/g) || []).length, 1);
  }
  assert.doesNotMatch(LINES.es, /\b(puedes|quieres|tienes)\b/);
});

test('the index lists an unavailable voice without dropping the others', () => {
  const html = renderIndex([
    { id: 'aura-2-phoebe-en', lang: 'en', gender: 'female', name: 'Phoebe', file: 'aura-2-phoebe-en.mp3', status: 200 },
    { id: 'aura-2-nobody-en', lang: 'en', gender: 'female', name: 'Nobody', file: null, status: 400 },
  ]);
  assert.match(html, /<audio controls src="aura-2-phoebe-en\.mp3">/);
  assert.match(html, /Nobody[^]*unavailable \(400\)/);
  assert.equal((html.match(/<audio /g) || []).length, 1);
  assert.match(html, /Mayagüez/);
});
