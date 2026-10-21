import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('speech fallback uses the selected voice rather than the first language match', async () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/function speakWithBrowser\([^]*?\n}\n/)[0];
  const male = { name: 'Microsoft David', lang: 'en-US', voiceURI: 'david' };
  const female = { name: 'Microsoft Zira', lang: 'en-US', voiceURI: 'zira' };
  let spoken;
  const synth = { getVoices: () => [male, female], cancel() {}, speak(u) { spoken = u; u.onend(); } };
  const context = { window: { speechSynthesis: synth }, speechSynthesis: synth,
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    ZemiConverse: { LANG_TAGS: { en: 'en-US' }, browserVoice: () => female } };
  vm.createContext(context); vm.runInContext(source, context);
  await context.speakWithBrowser('Let’s explore Bayamón.', { lang: 'en', browser: true, voiceURI: 'zira' });
  assert.equal(spoken.voice, female);
  assert.equal(spoken.lang, 'en-US');
});
test('a free browser voice never sends text to the paid speech endpoint', async () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/async function speak\(text, voice\) \{[^]*?\n\}\n/)[0];
  let spoken = '', paidRequests = 0;
  const context = { speakToken: 0, speaking: false, haltAudio() {},
    speakWithBrowser: async text => { spoken = text; },
    fetch: () => { paidRequests++; throw new Error('Paid speech endpoint must not be called'); },
    unlockAudio: () => { throw new Error('Browser voice needs no provider audio setup'); } };
  vm.createContext(context); vm.runInContext(source, context);
  await context.speak('Let’s explore Bayamón.', { browser: true, lang: 'en' });
  assert.equal(spoken, 'Let’s explore Bayamón.');
  assert.equal(paidRequests, 0);
  assert.equal(context.speaking, false);
});

function speakContext() {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const source = html.match(/async function speak\(text, voice\) \{[^]*?\n\}\n/)[0];
  const context = { speakToken: 0, speaking: false, haltAudio() {}, spoken: '', paidRequests: 0, audioCtx: {},
    unlockAudio: async () => {},
    speakWithBrowser: async text => { context.spoken = text; },
    fetch: async () => { context.paidRequests++; return { ok: false, status: 429 }; } };
  vm.createContext(context); vm.runInContext(source, context);
  return context;
}
test('a 429 from the speech endpoint falls back to the device voice with the same text', async () => {
  const context = speakContext();
  await context.speak('Maunabo’s a small one.', { id: 'aura-2-andromeda-en', lang: 'en' });
  assert.equal(context.paidRequests, 1);
  assert.equal(context.spoken, 'Maunabo’s a small one.');
  assert.equal(context.speaking, false);
});
test('a silent voice plays nothing and calls neither the endpoint nor the device voice', async () => {
  const context = speakContext();
  await context.speak('Bonjour', { id: 'silent-fr', lang: 'fr', silent: true });
  assert.equal(context.spoken, '');
  assert.equal(context.paidRequests, 0);
  assert.equal(context.speaking, false);
});
