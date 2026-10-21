import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICES, DEFAULT_VOICE, SPOKEN_LANGS, voiceFor, sttLanguage } from '../server/voices.mjs';

test('exactly ten voices, one per language and gender, and the default is one of them', () => {
  assert.equal(VOICES.length, 10);
  assert.deepEqual(SPOKEN_LANGS, ['en', 'es', 'fr', 'it', 'de']);
  for (const lang of SPOKEN_LANGS) for (const gender of ['female', 'male'])
    assert.equal(VOICES.filter(v => v.lang === lang && v.gender === gender).length, 1, `${lang} ${gender}`);
  assert.ok(voiceFor(DEFAULT_VOICE));
  for (const voice of VOICES) assert.ok(voice.id.endsWith(`-${voice.lang}`), voice.id);
});

test('old and foreign ids are refused and listening keeps fr/it/de', () => {
  assert.equal(voiceFor('aura-2-agathe-fr')?.lang, 'fr');
  for (const id of ['aura-2-nestor-es', 'aura-2-thalia-en', 'aura-2-celeste-es', 'aura-2-beatrix-nl', 'piper-lessac', '', undefined])
    assert.equal(voiceFor(id), null, String(id));
  for (const lang of ['fr', 'it', 'de']) assert.equal(sttLanguage(lang), lang, 'listening keeps the visitor’s language');
  assert.equal(sttLanguage('klingon'), 'en');
  assert.equal(sttLanguage('es'), 'es');
});
