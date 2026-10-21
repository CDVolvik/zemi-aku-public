import test from "node:test";
import assert from "node:assert/strict";
import { smallTalkKind, guideKind, chatReply } from "../server/chat.mjs";

test("small talk is recognised in all five languages", () => {
  assert.equal(smallTalkKind("Hi!"), "greet");
  assert.equal(smallTalkKind("Hello Zemi"), "greet");
  assert.equal(smallTalkKind("Buenos días"), "greet");
  assert.equal(smallTalkKind("How are you?"), "how");
  assert.equal(smallTalkKind("hey, how's it going"), "how");
  assert.equal(smallTalkKind("¿Cómo está usted?"), "how");
  assert.equal(smallTalkKind("Comment ça va ?"), "how");
  assert.equal(smallTalkKind("Come stai?"), "how");
  assert.equal(smallTalkKind("Wie geht's?"), "how");
  assert.equal(smallTalkKind("Who are you?"), "who");
  assert.equal(smallTalkKind("¿Qué puedes hacer?"), "help");
  assert.equal(smallTalkKind("thank you so much"), "thanks");
  assert.equal(smallTalkKind("Gracias"), "thanks");
  assert.equal(smallTalkKind("bye"), "bye");
  assert.equal(smallTalkKind("yes"), "yes");
});

test("a real question with a greeting in front is not small talk", () => {
  assert.equal(smallTalkKind("Hi, where can I eat in Ponce?"), null);
  assert.equal(smallTalkKind("how are the beaches in Rincón"), null);
  assert.equal(smallTalkKind("thanks, now show me Mayagüez"), null);
  assert.equal(smallTalkKind("help me find dinner in Ponce"), null);
  assert.equal(smallTalkKind("bakeries in Ponce"), null);
});

test("a vague plan with no town gets a guiding question", () => {
  assert.equal(guideKind("I want to buy a business"), "business");
  assert.equal(guideKind("Quiero comprar un negocio"), "business");
  assert.equal(guideKind("dinner tonight"), "dinner");
  assert.equal(guideKind("I'm hungry"), "dinner");
  assert.equal(guideKind("¿Dónde cenar esta noche?"), "dinner");
});

test("a plan that already names something is answered, not redirected", () => {
  assert.equal(guideKind("where can I eat mofongo"), null, "mofongo is an answer on its own");
  assert.equal(guideKind("all malls in Puerto Rico"), null);
  assert.equal(guideKind("KFC"), null);
});

test("replies speak naturally and reserve the record count for the introduction to the data", () => {
  const facts = { places: 7717, towns: 78 };
  assert.match(chatReply("en", "who", facts), /thousands of places/);
  assert.match(chatReply("en", "greet", facts), /\?$/);
  assert.match(chatReply("es", "how", facts), /usted/);
  assert.match(chatReply("fr", "greet", facts), /^Bonjour/);
  assert.match(chatReply("de", "who", facts), /7\.717/);
  assert.doesNotMatch(chatReply("en", "greet", facts), /buy a business/);
  assert.doesNotMatch(chatReply("en", "how", facts), /circuits/);
  assert.match(chatReply("en", "business", facts), /Which town/);
  assert.equal(chatReply("xx", "bye", facts), chatReply("en", "bye", facts), "unknown languages fall back to English");
});
