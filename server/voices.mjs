// The Deepgram Aura-2 voices the page may pick: one female and one male in each of the five languages
// the agent answers in. /api/speak accepts only these ids. English and Spanish were chosen 2026-10-11
// from the sixteen-voice audition (docs/plans/2026-10-11-natural-voices.md); the Spanish pair is the
// neutral Latin American accent and both code-switch, so English brand and place names come out
// cleanly. French, Italian and German were added 2026-10-14 (plan item 6) from Deepgram's Aura-2 list
// (developers.deepgram.com/docs/tts-models): the adult pair of each language, the ten auditioned with
// scripts/voice-audition.mjs fr it de; Carlos can swap any of them here in one line. Same price and
// the same daily character cap as the first four.
export const VOICES = [
  { id: "aura-2-andromeda-en", lang: "en", gender: "female", name: "Andromeda", language: "English" },
  { id: "aura-2-arcas-en", lang: "en", gender: "male", name: "Arcas", language: "English" },
  { id: "aura-2-selena-es", lang: "es", gender: "female", name: "Selena", language: "Español" },
  { id: "aura-2-aquila-es", lang: "es", gender: "male", name: "Aquila", language: "Español" },
  { id: "aura-2-agathe-fr", lang: "fr", gender: "female", name: "Agathe", language: "Français" },
  { id: "aura-2-hector-fr", lang: "fr", gender: "male", name: "Hector", language: "Français" },
  { id: "aura-2-melia-it", lang: "it", gender: "female", name: "Melia", language: "Italiano" },
  { id: "aura-2-elio-it", lang: "it", gender: "male", name: "Elio", language: "Italiano" },
  { id: "aura-2-elara-de", lang: "de", gender: "female", name: "Elara", language: "Deutsch" },
  { id: "aura-2-julius-de", lang: "de", gender: "male", name: "Julius", language: "Deutsch" },
];
export const SPOKEN_LANGS = [...new Set(VOICES.map((voice) => voice.lang))];

export const DEFAULT_VOICE = "aura-2-andromeda-en";

export function voiceFor(id) {
  return VOICES.find((voice) => voice.id === id) || null;
}

// Listening (nova-3) covers the same five languages the voices speak.
const LISTEN = new Set(["en", "es", "fr", "it", "de"]);
export function sttLanguage(lang) {
  return LISTEN.has(lang) ? lang : "en";
}
