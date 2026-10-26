import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { smallTalkKind, guideKind, vagueKind, chatReply } from "../server/chat.mjs";

test("an ask with no kind of place and no purpose gets one question back, before the model (judge panels 10/24)", () => {
  for (const q of ["¿Dónde está lo bueno?", "Where's the good stuff?", "what's good here", "¿Qué hay de bueno por aquí?", "Anything good around here?"]) assert.equal(vagueKind(q), "vague", q);
  // A bare "¿Dónde?" got a guessed list of the open town's places (judge panel 10/26); it gets the question back.
  for (const q of ["¿Dónde?", "Where?", "¿Y dónde?", "What?", "¿Cuál?", "¿Qué me recomiendas por aquí?", "What do you recommend around here?"]) assert.equal(vagueKind(q), "vague", q);
  for (const q of ["¿Qué me recomienda en Ponce para comer?", "What do you recommend for coffee in Ponce?"]) assert.equal(vagueKind(q), null, q);
  // After a question with a town and a purpose, the bare forms reach the model; the long vague forms still ask back.
  const history = [{ role: "user", content: "I want a quiet dinner in Ponce" }, { role: "assistant", content: "Here are three places." }];
  for (const q of ["What do you recommend?", "¿Dónde?", "Which?"]) assert.equal(vagueKind(q, history), null, q);
  assert.equal(vagueKind("Where's the good stuff?", history), "vague");
  for (const small of [[{ role: "user", content: "Hello" }], [{ role: "user", content: "¿Dónde?" }, { role: "assistant", content: "¿Qué busca?" }]]) {
    assert.equal(vagueKind("Where?", small), "vague", "small talk or another bare ask is no context");
  }
  for (const q of ["What is there to do in Maricao?", "Where do Bad Bunny fans eat in San Juan?", "what's good about Qloo", "¿Dónde abro una panadería?", "Where's the good coffee in Ponce?"]) assert.equal(vagueKind(q), null, q);
  assert.match(chatReply("en", "vague"), /^What are you after: food, nightlife, beaches and outdoors, culture, or a business to open\?/);
  assert.match(chatReply("es", "vague"), /^¿Qué busca: comida, vida nocturna, playas y aire libre, cultura, o un negocio para abrir\?/);
  assert.equal(chatReply("fr", "vague"), chatReply("en", "vague"));
  // The server answers it deterministically before the model turn and in the rules fallback.
  const server = fs.readFileSync(new URL("../scripts/serve-eagle.mjs", import.meta.url), "utf8");
  const vague = server.indexOf("if (vagueKind(checked.value.question, checked.value.history)) return sendJson(res, 200, clarification(checked.value));");
  assert.ok(vague > 0 && vague < server.indexOf("answer = await withVisitorTurn(ip, () => textAgent(checked.value))"), "the clarification comes before the model turn");
  assert.match(server, /if \(vagueKind\(question, body\.history\)\) return clarification\(body\);/);
  assert.match(server, /evidence: \{ mode: "rules", reason: "clarify", at: new Date\(\)\.toISOString\(\) \}/);
  const evidence = fs.readFileSync(new URL("../app/evidence.js", import.meta.url), "utf8");
  assert.match(evidence, /clarify: "a question back, no record read"/);
  assert.match(evidence, /clarify: "una pregunta de vuelta, sin leer registros"/);
});

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
