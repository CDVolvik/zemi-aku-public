import test from "node:test";
import assert from "node:assert/strict";
import { VOICES, voiceFor, sttLanguage } from "../server/voices.mjs";
import { speechFor, firstSentence } from "../server/brain.mjs";

test("voices: two genders in each of the five languages, ids end with the language", () => {
  const langs = [...new Set(VOICES.map((voice) => voice.lang))];
  assert.deepEqual(langs.sort(), ["de", "en", "es", "fr", "it"]);
  for (const lang of langs) {
    const genders = VOICES.filter((voice) => voice.lang === lang).map((voice) => voice.gender).sort();
    assert.deepEqual(genders, ["female", "male"], lang);
  }
  for (const voice of VOICES) assert.ok(voice.id.endsWith(`-${voice.lang}`), voice.id);
});

test("voiceFor only accepts listed ids", () => {
  assert.equal(voiceFor("aura-2-selena-es").lang, "es");
  assert.equal(voiceFor("aura-2-hacker-xx"), null);
  assert.equal(voiceFor(undefined), null);
  assert.equal(sttLanguage("it"), "it");
  assert.equal(sttLanguage("klingon"), "en");
});

const ponceFood = {
  town: "Ponce",
  question: "I want to open a restaurant in Ponce",
  intent: "Food",
  matched: true,
  lead: [{ name: "Meson Sandwiches", kind: "Restaurant" }, { name: "La Muralla China", kind: "Chinese restaurant" }],
  neighbors: [{ name: "El Campo Es Leña", city: "Adjuntas" }],
  thin: false,
};

test("English food answer names the leads and the neighbor", () => {
  const speech = speechFor("en", ponceFood);
  assert.match(speech, /^Hungry in Ponce\? Here’s what’s already on the record\./);
  assert.match(speech, /Top of the list are Meson Sandwiches, a restaurant and La Muralla China, a Chinese restaurant\./);
  assert.match(speech, /El Campo Es Leña is over in Adjuntas, not Ponce\./);
});

test("three leads keep a list comma and capital nationalities", () => {
  const speech = speechFor("en", { ...ponceFood, lead: [
    { name: "Campioni", kind: "Pizza restaurant" },
    { name: "La Nueva Pastelería", kind: "Bakery" },
    { name: "Romano's", kind: "Italian restaurant" },
  ] });
  assert.match(speech, /Top of the list are Campioni, a pizza restaurant, La Nueva Pastelería, a bakery, and Romano's, an Italian restaurant\./);
});

test("Spanish answers in Spanish", () => {
  const speech = speechFor("es", { ...ponceFood, intent: null, question: "¿Qué hay en Ponce?" });
  assert.match(speech, /^Esto es lo que ya hay en Ponce\./);
  assert.match(speech, /Encabezan la lista Meson Sandwiches y La Muralla China\./);
  assert.match(speech, /El Campo Es Leña queda en Adjuntas, no en Ponce\./);
});

test("Spanish artist question gets the no-artists line", () => {
  assert.match(speechFor("es", { ...ponceFood, question: "¿Qué artistas hay en Ponce?" }), /No tengo una lista de artistas/);
});

test("the rules router tells French, Italian and German visitors it has no full answer and shows the English cards", () => {
  assert.match(speechFor("fr", ponceFood), /pas de réponse complète en français/);
  assert.match(speechFor("it", ponceFood), /non ho una risposta completa in italiano/);
  assert.match(speechFor("de", ponceFood), /keine vollständige Antwort auf Deutsch/);
});

test("a chain is spoken once, with its count", () => {
  const kfc = { catalog: true, query: "KFC", town: "San Juan", count: 13, lead: [
    { name: "KFC", kind: "Fast food restaurant" }, { name: "KFC", kind: "Fast food restaurant" }, { name: "KFC", kind: "Fast food restaurant" },
  ] };
  assert.equal(speechFor("en", kfc), "Here’s what Qloo has for KFC in San Juan. They’re all KFC, about a dozen of them, right there on the map.");
  assert.match(speechFor("es", kfc), /Son todos KFC, como una docena/);
});

test("catalog with nothing found does not invent places", () => {
  assert.match(speechFor("en", { catalog: true, query: "KFC", town: "Culebra", count: 0, lead: [] }), /won’t make one up/);
  assert.match(speechFor("es", { catalog: true, query: "KFC", town: "Culebra", count: 0, lead: [] }), /No voy a inventar/);
});

test("no town and errors have a spoken line", () => {
  assert.match(speechFor("en", { noTown: true }), /Pick a town first/);
  assert.match(speechFor("es", { error: true }), /No pude leer los registros/);
});

test("firstSentence keeps one sentence", () => {
  assert.equal(firstSentence("Ponce is a city. It was founded in 1692 by many people over there."), "Ponce is a city. It was founded in 1692 by many people over there.");
  assert.equal(firstSentence("Ponce is the second largest city in Puerto Rico by population. It was founded in 1692."), "Ponce is the second largest city in Puerto Rico by population.");
  assert.equal(firstSentence(""), "");
});

test("a dish no place in the town lists: it says so, then names the island's places", () => {
  const brief = {
    catalog: true, query: "Mofongo", town: "Puerto Rico", missedTown: "Ponce", count: 6,
    lead: [{ name: "Casa Mofongo", kind: "" }, { name: "El Fogón", kind: "" }, { name: "Mi Mofongo", kind: "" }],
  };
  assert.match(speechFor("en", brief), /^Nothing in Ponce lists Mofongo\. Here’s what Qloo has for Mofongo in Puerto Rico\. /);
  assert.match(speechFor("es", brief), /^Ningún lugar de Ponce tiene Mofongo\. Esto es lo que Qloo tiene de Mofongo en Puerto Rico\. /);
});
