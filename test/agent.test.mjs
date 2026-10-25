import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAgent, createSpendLedger, checkChat, plainSpeech, spokenExcerpt, PROMPT, validArgs, industryIn, namesTown, townFlight, createNote, wholeSentences, echoes, checkNote, noteLanguage, kindPlaces, dropUnaskedConditions } from "../server/agent.mjs";

test('a question about one kind of place keeps cards of that kind (judge panel 10/25 round 6)', () => {
  const list = { type: 'show_places', town: 'Culebra', places: [{ name: 'Pan Café', genre: 'Bakery' }, { name: "Zaco's Tacos", genre: 'Mexican restaurant' }, { name: 'Dinghy Dock', genre: 'Seafood' }] };
  assert.deepEqual(kindPlaces('List the 5 best bakeries in Culebra', [list]), [{ ...list, places: [{ name: 'Pan Café', genre: 'Bakery' }] }]);
  assert.deepEqual(kindPlaces('¿Qué panaderías hay en Culebra?', [list]), [{ ...list, places: [{ name: 'Pan Café', genre: 'Bakery' }] }]);
  assert.deepEqual(kindPlaces('Where do Bad Bunny fans eat in Culebra?', [list]), [list]);
  assert.deepEqual(kindPlaces('Which salons are in Culebra?', [list]), [list], 'nothing matches: the list stays');
  assert.deepEqual(kindPlaces('Any good restaurants in Culebra?', [list]), [list], 'restaurant is the whole food category');
  const fly = { type: 'fly_town', town: 'Culebra' };
  assert.deepEqual(kindPlaces('bakeries in Culebra', [fly, list]), [fly, { ...list, places: [{ name: 'Pan Café', genre: 'Bakery' }] }]);
  // Codex review 10/25 round 6: a hotel in an eating question is context; an accented kind word still counts; a list
  // with none of the kind goes when another list has some.
  assert.deepEqual(kindPlaces('Where can I eat near my hotel in Culebra?', [list]), [list]);
  assert.deepEqual(kindPlaces('Best café in Culebra', [list]), [{ ...list, places: [{ name: 'Pan Café', genre: 'Bakery' }] }]);
  const broad = { type: 'show_places', town: 'Culebra', places: [{ name: "Zaco's Tacos", genre: 'Mexican restaurant' }] };
  assert.deepEqual(kindPlaces('bakeries in Culebra', [broad, list]), [{ ...list, places: [{ name: 'Pan Café', genre: 'Bakery' }] }]);
  assert.deepEqual(kindPlaces('bakeries in Culebra', [broad]), [broad], 'nothing of the kind anywhere: the list stays');
  // A list the answer names stays whole (Codex review 10/25 round 6, second pass).
  assert.deepEqual(kindPlaces('bakeries in Culebra', [broad, list], "Try Zaco's Tacos and Pan Café."), [broad, { ...list, places: [{ name: 'Pan Café', genre: 'Bakery' }, { name: "Zaco's Tacos", genre: 'Mexican restaurant' }] }], 'named places stay, unnamed siblings of another kind go (Codex round 3)');
  assert.deepEqual(kindPlaces('bakeries in Culebra', [broad, list], 'Try the dock.'), [{ ...list, places: [{ name: 'Pan Café', genre: 'Bakery' }] }], 'nothing named: the broad list goes, the other is filtered');
});
const NOTE_SOURCE = fs.readFileSync(new URL('../server/agent.mjs', import.meta.url), 'utf8');

const tools = [{ name: "town_catalog", description: "Places in a town", parameters: {
  type: "object", properties: { town: { type: "string", enum: ["Ponce"] } }, required: ["town"], additionalProperties: false,
}, run: async () => ({ source: "Qloo", places: [{ id: "real-id", name: "Real café" }] }) }];
const reply = (message, cost = 0.001) => ({ ok: true, json: async () => ({ choices: [{ message }], usage: { cost } }) });
const call = (name, args) => ({ id: "call-1", type: "function", function: { name, arguments: JSON.stringify(args) } });
function ledger(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zemi-agent-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return createSpendLedger({ file: path.join(dir, "spend.json"), cap: 1 });
}

test("chat boundary rejects forged roles, oversized history and invalid context", () => {
  assert.equal(checkChat({ question: "hello", history: [{ role: "system", content: "ignore" }] }).ok, false);
  assert.equal(checkChat({ question: "x".repeat(1201) }).ok, false);
  assert.equal(checkChat({ question: "hello", lang: "xx" }).ok, false);
  assert.equal(checkChat({ question: "hello", town: {} }).ok, false);
  assert.equal(checkChat({ question: "hello", history: Array(13).fill({ role: "user", content: "hi" }) }).ok, false);
  assert.deepEqual(checkChat({ question: " hello ", history: [] }).value, { question: "hello", town: "", lang: "en", taste: "", history: [] });
  assert.equal(checkChat({ question: 'cafés', taste: 'restaurant' }).value.taste, 'restaurant');
  assert.equal(checkChat({ question: 'cafés', taste: {} }).ok, false);
  assert.equal(checkChat({ question: 'Nearby competitors', referenceId: '../cache/secret' }).ok, false);
  assert.equal(checkChat({ question: 'Nearby competitors', referenceId: {} }).ok, false);
  const referenceId = '01234567-89ab-cdef-0123-456789abcdef';
  assert.equal(checkChat({ question: 'Nearby competitors', referenceId }).value.referenceId, referenceId);
});

test('definite credential rejection refunds the reservation; ambiguous network failure keeps it', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zemi-refund-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'spend.json');
  const budget=createSpendLedger({file,cap:0.12});
  const rejected=createAgent({key:'test',tools,ledger:budget,fetchImpl:async()=>({ok:false,status:401})});
  for(let i=0;i<20;i++)assert.equal((await rejected({question:'hello'})).fallback,true);
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).used,0);
  const ambiguous=createAgent({key:'test',tools,ledger:budget,fetchImpl:async()=>{throw new Error('unknown outcome')}});
  await ambiguous({question:'hello'});
  assert.ok(JSON.parse(fs.readFileSync(file,'utf8')).used>0);
});

test('long follow-ups trim old history and preserve provider reasoning during tool calls',async t=>{
  let count=0;
  const expanded=tools.map(tool=>({...tool,description:'x'.repeat(14000),run:async()=>({text:'x'.repeat(6000)})}));
  const reasoning=[{type:'reasoning.encrypted',data:'opaque-state'}];
  const agent=createAgent({key:'test',tools:expanded,ledger:ledger(t),fetchImpl:async(_,opts)=>{
    count++;assert.ok(Buffer.byteLength(opts.body)<=48000);
    if(count===1)return reply({content:null,tool_calls:[call('town_catalog',{town:'Ponce'})],reasoning_details:reasoning});
    assert.deepEqual(JSON.parse(opts.body).messages.find(m=>m.tool_calls).reasoning_details,reasoning);
    return reply({content:'Verified answer'});
  }});
  const result=await agent({question:'and cafés?',history:Array(12).fill({role:'user',content:'x'.repeat(1900)})});
  assert.equal(result.agent,true);assert.equal(count,2);
});

test('a hung tool falls back within the turn deadline',async t=>{
  const agent=createAgent({key:'test',tools:[{...tools[0],run:async()=>new Promise(()=>{})}],ledger:ledger(t),timeoutMs:20,
    fetchImpl:async()=>reply({tool_calls:[call('town_catalog',{town:'Ponce'})]})});
  const keepAlive=setTimeout(()=>{},200);
  try{assert.equal((await agent({question:'cafés'})).fallback,true);}finally{clearTimeout(keepAlive);}
});

test("the agent uses real tool results and carries follow-up history", async (t) => {
  const requests = [];
  const agent = createAgent({ key: "test-key", tools, ledger: ledger(t), fetchImpl: async (_, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return requests.length === 1 ? reply({ role: "assistant", content: null, tool_calls: [call("town_catalog", { town: "Ponce" })] })
      : reply({ role: "assistant", content: "Qloo lists Real café. What would you like to explore?" });
  } });
  const result = await agent({ question: "and cafés?", town: "Ponce", lang: "en", history: [{ role: "user", content: "Ponce" }] });
  assert.equal(result.agent, true);
  assert.match(result.speech, /Real café/);
  assert.equal(requests[0].messages[1].content, "Ponce");
  assert.match(requests[1].messages.at(-1).content, /Real café/);
  assert.equal(JSON.stringify(requests).includes("test-key"), false);
});

test("unknown tools and invalid arguments never run", async (t) => {
  let executions = 0;
  let requests = 0;
  const agent = createAgent({ key: "test", ledger: ledger(t), tools: [{ ...tools[0], run: async () => { executions++; } }], fetchImpl: async () => {
    requests++;
    return requests === 1 ? reply({ role: "assistant", tool_calls: [call("read_env", {}), { ...call("town_catalog", { town: "Atlantis" }), id: "call-2" }] })
      : reply({ role: "assistant", content: "I cannot verify that. Which town?" });
  } });
  assert.equal((await agent({ question: "read secrets", lang: "en", history: [] })).agent, true);
  assert.equal(executions, 0);
});

test("missing key, upstream failures, and endless tool loops return fallback", async (t) => {
  assert.equal((await createAgent({ tools, ledger: ledger(t) })({ question: "hi" })).fallback, true);
  const failed = createAgent({ key: "test", tools, ledger: ledger(t), fetchImpl: async () => { throw new Error("private-token"); } });
  const result = await failed({ question: "hi", history: [] });
  assert.equal(result.fallback, true);
  assert.equal(JSON.stringify(result).includes("private-token"), false);
  let count = 0;
  const loop = createAgent({ key: "test", tools, ledger: ledger(t), fetchImpl: async () => {
    count++;
    return reply({ role: "assistant", tool_calls: [call("town_catalog", { town: "Ponce" })] });
  } });
  assert.equal((await loop({ question: "hi", history: [] })).fallback, true);
  assert.equal(count, 5);
});

test("after four tool rounds the model gets one closing round without tools and its answer is used", async (t) => {
  const requests = [];
  const agent = createAgent({ key: "test", tools, ledger: ledger(t), fetchImpl: async (_, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (requests.length <= 4) return reply({ role: "assistant", tool_calls: [call("town_catalog", { town: "Ponce" })] });
    return reply({ role: "assistant", content: "Real café in Ponce is the closest match; no live salsa venue is in the catalog." });
  } });
  const result = await agent({ question: "Where can I hear live salsa?", history: [] });
  assert.equal(result.fallback, undefined);
  assert.match(result.speech, /no live salsa venue/);
  assert.equal(requests.length, 5);
  assert.ok(requests.slice(0, 4).every((r) => Array.isArray(r.tools) && r.tool_choice === "auto"));
  assert.equal(requests[4].tools, undefined);
  assert.equal(requests[4].tool_choice, undefined);
  assert.match(requests[4].messages.at(-1).content, /Tools are closed/);
  assert.equal(result.evidence.rounds, 5);
  assert.equal(result.evidence.calls.length, 4);
});

test("daily reservations survive restarts and block concurrent overspending", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zemi-spend-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "spend.json");
  const first = createSpendLedger({ file, cap: 0.1, now: () => new Date("2026-10-07") });
  assert.equal(first.reserve(0.06), true);
  assert.equal(first.reserve(0.06), false);
  const restart = createSpendLedger({ file, cap: 0.1, now: () => new Date("2026-10-07") });
  assert.equal(restart.reserve(0.06), false);
  const tomorrow = createSpendLedger({ file, cap: 0.1, now: () => new Date("2026-10-08") });
  assert.equal(tomorrow.reserve(0.06), true);
  tomorrow.settle(0.06, 0.2, '2026-10-08');
  assert.equal(tomorrow.reserve(0.06), false, 'unexpected provider costs still count against the cap');
  fs.writeFileSync(file, "broken");
  assert.equal(createSpendLedger({ file, cap: 1 }).reserve(0.06), false, "corrupt ledger must fail closed");
});

test("no provider call is made after the budget cap", async (t) => {
  let requests = 0;
  const agent = createAgent({ key: "test", tools, ledger: { reserve: () => false }, fetchImpl: async () => { requests++; } });
  assert.equal((await agent({ question: "hi", history: [] })).fallback, true);
  assert.equal(requests, 0);
});

test("a real eight-place tool result (over 7,000 characters) reaches the model instead of 'Result too large'", async (t) => {
  const requests = [];
  const big = { source: "Qloo", places: Array.from({ length: 8 }, (_, i) => ({ id: `id-${i}`, name: `Place ${i}`, facts: Array(6).fill("x".repeat(180)) })) };
  assert.ok(JSON.stringify(big).length > 7000 && JSON.stringify(big).length < 20000);
  const agent = createAgent({ key: "test", ledger: ledger(t), tools: [{ ...tools[0], run: async () => big }], fetchImpl: async (_, options) => {
    requests.push(JSON.parse(options.body));
    return requests.length === 1 ? reply({ role: "assistant", content: null, tool_calls: [call("town_catalog", { town: "Ponce" })] })
      : reply({ role: "assistant", content: "Eight places." });
  } });
  await agent({ question: "cafés", town: "Ponce", lang: "en", history: [] });
  const toolMessage = requests[1].messages.find((m) => m.role === "tool");
  assert.doesNotMatch(toolMessage.content, /Result too large/);
  assert.match(toolMessage.content, /Place 7/);
  const huge = createAgent({ key: "test", ledger: ledger(t), tools: [{ ...tools[0], run: async () => ({ blob: "y".repeat(20001) }) }], fetchImpl: async (_, options) => {
    requests.push(JSON.parse(options.body));
    return requests.length === 3 ? reply({ role: "assistant", content: null, tool_calls: [call("town_catalog", { town: "Ponce" })] })
      : reply({ role: "assistant", content: "Too much." });
  } });
  await huge({ question: "cafés", town: "Ponce", lang: "en", history: [] });
  assert.match(requests[3].messages.find((m) => m.role === "tool").content, /Result too large/);
});

test("a round of several large results shares one budget and still answers instead of falling back", async (t) => {
  const requests = [];
  const big = { blob: "z".repeat(15000) };
  const calls3 = [1, 2, 3].map((i) => ({ ...call("town_catalog", { town: "Ponce" }), id: `call-${i}` }));
  const agent = createAgent({ key: "test", ledger: ledger(t), tools: [{ ...tools[0], run: async () => big }], fetchImpl: async (_, options) => {
    requests.push(JSON.parse(options.body));
    return requests.length === 1 ? reply({ role: "assistant", content: null, tool_calls: calls3 }) : reply({ role: "assistant", content: "Three results." });
  } });
  const result = await agent({ question: "cafés", town: "Ponce", lang: "en", history: [] });
  assert.equal(result.agent, true, "the request must stay under the size limit");
  const toolMessages = requests[1].messages.filter((m) => m.role === "tool");
  assert.equal(toolMessages.length, 3);
  assert.equal(toolMessages.filter((m) => /Result too large/.test(m.content)).length, 1);
});

test("model Markdown becomes plain sentences the caption and the voice can use", () => {
  const md = "Here's what you'll find:\n\n**Local flavors:**\n- **La Jibarita** – Caribbean lounge. $$\n- *González Sea Food* – famous for `mofongo`.\n### Also\n1. Casiano's Chicken & Ribs";
  const plain = plainSpeech(md);
  assert.doesNotMatch(plain, /[*#`]/);
  assert.doesNotMatch(plain, /\n/);
  assert.match(plain, /La Jibarita – Caribbean lounge\. González Sea Food – famous for mofongo\./, "price tiers are not read aloud");
  assert.match(plain, /Also Casiano's Chicken & Ribs/);
  assert.equal(plainSpeech("  "), "");
  assert.equal(plainSpeech("See [La Placita](https://laplacita.pr/menu) for menus. > A quote. Moderate prices. $$ On PR-413, the #1 spot."),
    "See La Placita for menus. A quote. Moderate prices. On PR-413, the #1 spot.");
});

test("the spoken excerpt keeps whole sentences and never exceeds the voice clamp", () => {
  const text = "Rincón has lovely beachfront spots. The Beach House is your best bet, with sunset views. Tamboo sits right on the sand. Call ahead on weekends.";
  assert.equal(spokenExcerpt(text, 90), "Rincón has lovely beachfront spots. The Beach House is your best bet, with sunset views.");
  assert.equal(spokenExcerpt("Short.", 280), "Short.");
  const run = "a".repeat(120) + " " + "b".repeat(200) + ". Next sentence.";
  const cut = spokenExcerpt(run, 280);
  assert.ok(cut.length <= 280, "an over-long first sentence is cut at a space");
  assert.match(cut, /…$/);
  assert.ok(spokenExcerpt("¿Dónde como? Aquí mismo. Y también allá.", 20).startsWith("¿Dónde como?"));
  const decimals = "Pargomar sits in La Parguera, open until 3:00 pm, rated 4.5. Good for coffee before the water. " + "Filler sentence here. ".repeat(12);
  assert.equal(spokenExcerpt(decimals, 100), "Pargomar sits in La Parguera, open until 3:00 pm, rated 4.5. Good for coffee before the water.");
  assert.equal(spokenExcerpt("Dr. Ruiz runs it. Prices from $12.50 a plate. " + "More. ".repeat(60), 50), "Dr. Ruiz runs it. Prices from $12.50 a plate.");
  assert.equal(spokenExcerpt("Open 9 a.m. to 5 p.m. daily. See laplacita.pr for menus. " + "More. ".repeat(60), 60), "Open 9 a.m. to 5 p.m. daily. See laplacita.pr for menus.");
  assert.equal(spokenExcerpt('He said "great food." Then he left. ' + "More. ".repeat(60), 40), 'He said "great food." Then he left.');
  const nospace = "x".repeat(400);
  assert.equal(spokenExcerpt(nospace, 280).length, 280, "no space at all: a hard cut with an ellipsis");
  assert.match(spokenExcerpt(nospace, 280), /…$/);
});

test("the reservation is sized for the flash model so a one-dollar day allows many turns in flight", async () => {
  const { RESERVATION } = await import("../server/agent.mjs");
  assert.ok(RESERVATION <= 0.02 && RESERVATION >= 0.01, `reservation ${RESERVATION}`);
});

test("an agent answer carries plain speech, a spoken excerpt and a fallback reason hook", async (t) => {
  const reasons = [];
  const long = Array.from({ length: 6 }, (_, i) => `**Place ${i}** is a fine spot with a long description that goes on for a while.`).join(" ");
  const agent = createAgent({ key: "test", tools, ledger: ledger(t), onFallback: (reason) => reasons.push(reason),
    fetchImpl: async () => reply({ role: "assistant", content: long }) });
  const result = await agent({ question: "dinner", lang: "en", history: [] });
  assert.equal(result.agent, true);
  assert.doesNotMatch(result.speech, /\*\*/);
  assert.ok(result.spoken.length <= 280 && result.spoken.length < result.speech.length);
  assert.match(result.spoken, /^Place 0 is a fine spot/);
  assert.deepEqual(reasons, []);

  assert.equal((await createAgent({ tools, ledger: ledger(t), onFallback: (r) => reasons.push(r) })({ question: "hi" })).fallback, true);
  const denied = createAgent({ key: "test", tools, ledger: ledger(t), onFallback: (r) => reasons.push(r), fetchImpl: async () => ({ ok: false, status: 401 }) });
  await denied({ question: "hi", history: [] });
  const empty = createAgent({ key: "test", tools, ledger: ledger(t), onFallback: (r) => reasons.push(r), fetchImpl: async () => reply({ role: "assistant", content: "   " }) });
  await empty({ question: "hi", history: [] });
  let count = 0;
  const loop = createAgent({ key: "test", tools, ledger: ledger(t), onFallback: (r) => reasons.push(r), fetchImpl: async () => {
    count++;
    return reply({ role: "assistant", tool_calls: [call("town_catalog", { town: "Ponce" })] });
  } });
  await loop({ question: "hi", history: [] });
  assert.deepEqual(reasons, ["no-key", "http-401", "empty-answer", "rounds-exhausted"]);
});

test("the model id can be overridden per deployment and defaults to the pinned one", async (t) => {
  const seen = [];
  const capture = async (_, options) => { seen.push(JSON.parse(options.body).model); return reply({ role: "assistant", content: "ok" }); };
  await createAgent({ key: "test", tools, ledger: ledger(t), fetchImpl: capture })({ question: "hi", history: [] });
  await createAgent({ key: "test", tools, ledger: ledger(t), fetchImpl: capture, model: "deepseek/deepseek-v4-pro" })({ question: "hi", history: [] });
  assert.deepEqual(seen, ["deepseek/deepseek-v4.1-flash", "deepseek/deepseek-v4-pro"]);
  const server = fs.readFileSync(new URL("../scripts/serve-eagle.mjs", import.meta.url), "utf8");
  assert.match(server, /model: process\.env\.ZEMI_MODEL \|\| MODEL/);
});

test("the prompt asks for short plain answers with at most three places", () => {
  assert.match(PROMPT, /under 90 words/);
  assert.match(PROMPT, /at most three places/);
  assert.match(PROMPT, /no Markdown/i);
});

test("one visitor gets a bounded share of the day's model turns and fallbacks are counted, never quoted", () => {
  const server = fs.readFileSync(new URL("../scripts/serve-eagle.mjs", import.meta.url), "utf8");
  const route = server.slice(server.indexOf('url.pathname === "/api/chat"'), server.indexOf('url.pathname === "/api/ask"'));
  assert.match(route, /limiter\.spend\(`chat-turns:\$\{ip\}`, 1, CHAT_TURNS_PER_VISITOR\)/, "per-visitor daily turn cap");
  assert.match(server, /const CHAT_TURNS_PER_VISITOR = 40;/);
  assert.match(server, /onFallback: \(reason\) => console\.warn\(`agent fallback: \$\{reason\}`\)/);
  assert.match(route, /console\.warn\("agent fallback: visitor-cap"\)/);
});

test("every model answer carries its evidence: the tool calls it made, resolved IDs, the model and the timing; never the key", async (t) => {
  let requests = 0;
  const catalog = { ...tools[0], run: async () => ({ source: "Qloo", measured: "2026-10-12", count: 14,
    places: [{ id: "11111111-1111-1111-1111-111111111111", name: "Real café" }] }) };
  const agent = createAgent({ key: "test-key", tools: [catalog], ledger: ledger(t), model: "deepseek/deepseek-v4.1-flash", fetchImpl: async () => {
    requests++;
    return requests === 1 ? reply({ role: "assistant", content: null, tool_calls: [call("town_catalog", { town: "Ponce" })] })
      : reply({ role: "assistant", content: "Qloo lists Real café." });
  } });
  const result = await agent({ question: "cafés?", town: "Ponce", lang: "en", history: [] });
  const { evidence } = result;
  assert.equal(evidence.mode, "model");
  assert.equal(evidence.model, "deepseek/deepseek-v4.1-flash");
  assert.equal(evidence.rounds, 2);
  assert.ok(Number.isInteger(evidence.ms) && evidence.ms >= 0);
  assert.match(evidence.at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(evidence.calls.length, 1);
  const [first] = evidence.calls;
  assert.equal(first.tool, "town_catalog");
  assert.deepEqual(first.args, { town: "Ponce" });
  assert.equal(first.ok, true);
  assert.equal(first.source, "Qloo");
  assert.equal(first.count, 14);
  assert.equal(first.measured, "2026-10-12");
  assert.deepEqual(first.ids, ["11111111-1111-1111-1111-111111111111"]);
  assert.ok(Number.isInteger(first.ms));
  assert.equal(JSON.stringify(result).includes("test-key"), false);
});

test("a refused tool call and a dropped oversize result are recorded as evidence, not hidden", async (t) => {
  let requests = 0;
  const big = { ...tools[0], run: async () => ({ source: "Qloo", text: "x".repeat(21000) }) };
  const agent = createAgent({ key: "test", tools: [big], ledger: ledger(t), fetchImpl: async () => {
    requests++;
    return requests === 1 ? reply({ role: "assistant", tool_calls: [call("town_catalog", { town: "Atlantis" }), { ...call("town_catalog", { town: "Ponce" }), id: "call-2" }] })
      : reply({ role: "assistant", content: "Narrow the question." });
  } });
  const { evidence } = await agent({ question: "everything", lang: "en", history: [] });
  assert.equal(evidence.calls.length, 2);
  assert.equal(evidence.calls[0].ok, false);
  assert.match(evidence.calls[0].error, /Unknown tool or invalid arguments/);
  assert.equal(evidence.calls[1].ok, true);
  assert.match(evidence.calls[1].error, /too large/);
});

test("a fallback names its reason as a fixed code so the page can label the rules router", async (t) => {
  assert.deepEqual(await createAgent({ tools, ledger: ledger(t) })({ question: "hi" }), { fallback: true, reason: "no-key" });
  const budget = createSpendLedger({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "zemi-b-")), "spend.json"), cap: 0.01 });
  assert.equal((await createAgent({ key: "k", tools, ledger: budget, fetchImpl: async () => reply({ content: "x" }) })({ question: "hi" })).reason, "budget");
  const http = createAgent({ key: "k", tools, ledger: ledger(t), fetchImpl: async () => ({ ok: false, status: 429 }) });
  assert.equal((await http({ question: "hi" })).reason, "http-429");
});

test("a round with more than four tool calls runs the first four and refuses the rest, instead of dropping the turn", async (t) => {
  let requests = 0;
  let executions = 0;
  const counted = { ...tools[0], run: async () => { executions++; return { source: "Qloo", places: [] }; } };
  const agent = createAgent({ key: "test", tools: [counted], ledger: ledger(t), fetchImpl: async (_, options) => {
    requests++;
    if (requests === 1) return reply({ role: "assistant", tool_calls: [1, 2, 3, 4, 5, 6].map((n) => ({ ...call("town_catalog", { town: "Ponce" }), id: `call-${n}` })) });
    const results = JSON.parse(options.body).messages.filter((m) => m.role === "tool");
    assert.equal(results.length, 6, "every call gets a tool message back, so the provider accepts the transcript");
    assert.match(results[5].content, /Too many tool calls in one round/);
    return reply({ role: "assistant", content: "Here is what I found." });
  } });
  const result = await agent({ question: "everything about Ponce", lang: "en", history: [] });
  assert.equal(result.agent, true);
  assert.equal(executions, 4);
  assert.equal(result.evidence.calls.length, 6);
  assert.equal(result.evidence.calls[3].ok, true);
  assert.equal(result.evidence.calls[4].ok, false);
  assert.match(result.evidence.calls[4].error, /Too many tool calls/);
});

test("a fallback after a round ran keeps the rounds and tool traces; one before any round carries none", async (t) => {
  let reservations = 0;
  const once = { reserve: () => reservations++ === 0, settle: () => {} };
  const agent = createAgent({ key: "k", tools, ledger: once, fetchImpl: async () => reply({ content: null, tool_calls: [call("town_catalog", { town: "Ponce" })] }) });
  const out = await agent({ question: "Tell me about Ponce" });
  assert.equal(out.fallback, true);
  assert.equal(out.reason, "budget");
  assert.equal(out.rounds, 1);
  assert.equal(out.calls.length, 1);
  assert.equal(out.calls[0].tool, "town_catalog");
  assert.equal(out.calls[0].ok, true);
  assert.deepEqual(await createAgent({ tools, ledger: ledger(t) })({ question: "hi" }), { fallback: true, reason: "no-key" });
});


test('an eating question keeps only food and drink places on the map action, whatever the tool returned', async t => {
  const places = [{ id: '1', name: 'La Victoria', category: 'food' }, { id: '2', name: 'A school', category: 'other' }, { id: '3', name: 'A bar', category: 'drinks' },
    { id: '4', name: 'A hotel', genreId: 'urn:tag:genre:place:hotel', genre: 'Hotel' }];
  const listing = [{ name: 'artist_places', description: 'x', parameters: { type: 'object', properties: { town: { type: 'string' } }, required: ['town'], additionalProperties: false },
    run: async () => ({ data: { places }, action: { type: 'show_places', town: 'San Juan', places, focus: 'fans' } }) }];
  let count = 0;
  const agent = createAgent({ key: 'test', tools: listing, ledger: ledger(t), fetchImpl: async () => {
    count++;
    return count === 1 ? reply({ content: null, tool_calls: [call('artist_places', { town: 'San Juan' })] }) : reply({ content: 'Try La Victoria.' });
  } });
  const eat = await agent({ question: 'Where do Bad Bunny fans eat in San Juan?' });
  assert.deepEqual(eat.actions[0].places.map(p => p.name), ['La Victoria', 'A bar']);
  count = 0;
  const any = await agent({ question: 'What do Bad Bunny fans like in San Juan?' });
  assert.equal(any.actions[0].places.length, 4);
  count = 0;
  const comer = await agent({ question: '¿Dónde cenan los fans de Bad Bunny en San Juan?' });
  assert.equal(comer.actions[0].places.length, 2);
  // Nothing edible in the result: no cards at all, never the school and the hotel back.
  const nothing = [{ name: 'artist_places', description: 'x', parameters: listing[0].parameters,
    run: async () => ({ data: { places: places.slice(1, 2) }, action: { type: 'show_places', town: 'San Juan', places: places.slice(1, 2), focus: 'fans' } }) }];
  count = 0;
  const bare = createAgent({ key: 'test', tools: nothing, ledger: ledger(t), fetchImpl: async () => {
    count++;
    return count === 1 ? reply({ content: null, tool_calls: [call('artist_places', { town: 'San Juan' })] }) : reply({ content: 'Nothing to eat there.' });
  } });
  assert.deepEqual((await bare({ question: 'Where do fans eat?' })).actions, []);
});

test('an eating question adds category food to artist_places when the model left it out, so evidence and cards agree', async t => {
  let got;
  const withCategory = [{ name: 'artist_places', description: 'x', parameters: { type: 'object', properties: { town: { type: 'string' }, category: { type: 'string', enum: ['food', 'other'] } }, required: ['town'], additionalProperties: false },
    run: async (args) => { got = args; return { data: { places: [] } }; } }];
  let count = 0;
  const agent = createAgent({ key: 'test', tools: withCategory, ledger: ledger(t), fetchImpl: async () => {
    count++;
    return count === 1 ? reply({ content: null, tool_calls: [call('artist_places', { town: 'San Juan' })] }) : reply({ content: 'ok' });
  } });
  await agent({ question: 'Where do Bad Bunny fans eat in San Juan?' });
  assert.deepEqual(got, { town: 'San Juan', category: 'food' });
  count = 0;
  await agent({ question: 'What do Bad Bunny fans like in San Juan?' });
  assert.deepEqual(got, { town: 'San Juan' });
});

test('an empty tool call takes the open town and the industry the question names, so it runs instead of failing', async t => {
  const got = {};
  const pair = [
    { name: 'opportunity_map', description: 'x', parameters: { type: 'object', properties: { industry: { type: 'string', enum: ['bakery', 'cafe', 'bar'] }, town: { type: 'string' } }, required: ['industry'], additionalProperties: false },
      run: async (args) => { got.map = args; return { data: { towns: [] } }; } },
    { name: 'map_town', description: 'x', parameters: { type: 'object', properties: { town: { type: 'string' } }, required: ['town'], additionalProperties: false },
      run: async (args) => { got.town = args; return { data: {} }; } },
  ];
  let count = 0;
  const agent = createAgent({ key: 'test', tools: pair, ledger: ledger(t), fetchImpl: async () => {
    count++;
    return count === 1 ? reply({ content: null, tool_calls: [{ ...call('opportunity_map', {}), id: 'c1' }, { ...call('map_town', {}), id: 'c2' }] }) : reply({ content: 'ok' });
  } });
  const out = await agent({ question: '¿Hay espacio para una panadería en Arecibo?', town: 'Arecibo' });
  assert.deepEqual(got.map, { industry: 'bakery', town: 'Arecibo' });
  assert.deepEqual(got.town, { town: 'Arecibo' });
  assert.ok(out.evidence.calls.every((c) => c.ok), JSON.stringify(out.evidence.calls));
  // Nothing to guess from: the call still fails honestly.
  count = 0; got.map = undefined;
  const bare = await agent({ question: 'What is good here?', town: '' });
  assert.equal(got.map, undefined);
  assert.equal(bare.evidence.calls[0].ok, false);
  assert.equal(industryIn('un salón de belleza en Loíza'), 'salon');
  assert.equal(industryIn('coffee in Ponce'), 'cafe');
  assert.equal(industryIn('nothing'), '');
  // Ambiguous or non-business wording stays empty, so the call fails instead of answering another question.
  assert.equal(industryIn('Compare cafés and bakeries island-wide'), '');
  assert.equal(industryIn('¿Dónde conviene abrir un salón de eventos en Ponce?'), '');
  // A data tool left town-less may mean the whole island: only map_town takes the open town, and a
  // selected taste never picks the industry.
  const catalog = [{ name: 'town_catalog', description: 'x', parameters: { type: 'object', properties: { town: { type: 'string' } }, required: ['town'], additionalProperties: false },
    run: async (args) => { got.catalog = args; return { data: {} }; } }, pair[0]];
  count = 0; got.map = undefined;
  const wide = createAgent({ key: 'test', tools: catalog, ledger: ledger(t), fetchImpl: async () => {
    count++;
    return count === 1 ? reply({ content: null, tool_calls: [{ ...call('town_catalog', {}), id: 'c1' }, { ...call('opportunity_map', {}), id: 'c2' }] }) : reply({ content: 'ok' });
  } });
  const out2 = await wide({ question: 'What destinations do Bad Bunny fans like across Puerto Rico?', town: 'Ponce', taste: 'urn:tag:genre:place:restaurant:cafe' });
  assert.equal(got.catalog, undefined);
  assert.equal(got.map, undefined);
  assert.ok(out2.evidence.calls.every((c) => c.ok === false));
  // The map call gets the town row only when the question names the open town.
  count = 0; got.map = undefined;
  const named = createAgent({ key: 'test', tools: [pair[0]], ledger: ledger(t), fetchImpl: async () => {
    count++;
    return count === 1 ? reply({ content: null, tool_calls: [{ ...call('opportunity_map', { industry: 'bakery' }), id: 'c1' }] }) : reply({ content: 'ok' });
  } });
  await named({ question: '¿Hay espacio para otra panadería en arecibo o ya hay muchas?', town: 'Arecibo' });
  assert.deepEqual(got.map, { industry: 'bakery', town: 'Arecibo' });
  count = 0; got.map = undefined;
  await named({ question: 'Which towns are the best bet for a bakery?', town: 'Arecibo' });
  assert.deepEqual(got.map, { industry: 'bakery' });
  assert.equal(namesTown('Vivo en Río Grande', 'Río Grande'), true);
  assert.equal(namesTown('a bakery in Ponce', 'Ponce'), true);
  assert.equal(namesTown('Juana Díaz', 'Díaz'), true);
  assert.equal(namesTown('Hormigueros', 'Hormigueros'), true);
  assert.equal(namesTown('Vega Alta', 'Vega Baja'), false);
  assert.equal(namesTown('Hormigueros', 'Hormigueros'), true);
  assert.equal(namesTown('Cayey', 'Caye'), false);
});

test('the map follows the town the question names when the model moved nothing, and never overrides a move', () => {
  const towns = ['Adjuntas', 'Culebra', 'San Juan', 'Río Grande'];
  assert.deepEqual(townFlight('¿Hay espacio para una panadería en Culebra?', 'Adjuntas', towns, []), [{ type: 'fly_town', town: 'Culebra' }]);
  assert.deepEqual(townFlight('¿Y en río grande?', 'Adjuntas', towns, []), [{ type: 'fly_town', town: 'Río Grande' }]);
  assert.deepEqual(townFlight('¿Hay espacio para una panadería en Culebra?', 'Culebra', towns, []), []);
  assert.deepEqual(townFlight('What about the rent on Calle Loíza?', 'Adjuntas', towns, []), []);
  const moved = [{ type: 'fly_town', town: 'San Juan' }];
  assert.equal(townFlight('Compare Culebra and San Juan', 'Adjuntas', towns, moved), moved);
  // An opportunity action with no town has not moved the map; one with a town has (judge panel 10/24 round 4).
  assert.deepEqual(townFlight('Guaranteed profit for a bakery in San Juan?', 'Adjuntas', towns, [{ type: 'show_opportunity', industry: 'bakery' }]),
    [{ type: 'fly_town', town: 'San Juan' }, { type: 'show_opportunity', industry: 'bakery' }]);
  const placed = [{ type: 'show_opportunity', industry: 'bakery', town: 'San Juan' }];
  assert.equal(townFlight('Guaranteed profit for a bakery in San Juan?', 'Adjuntas', towns, placed), placed);
  // A comparison names two towns and carries them on the action: no flight either way (Codex review 10/25).
  const compared = [{ type: 'show_opportunity', industry: 'bakery', towns: ['Culebra', 'San Juan'] }];
  assert.equal(townFlight('Compare Culebra and San Juan for a bakery', 'Adjuntas', towns, compared), compared);
  const townless = [{ type: 'show_opportunity', industry: 'bakery' }];
  assert.equal(townFlight('Compare Culebra and San Juan for a bakery', 'Adjuntas', towns, townless), townless);
  assert.deepEqual(townFlight('Is a bakery like the one in San Juan a good idea in Culebra?', 'Adjuntas', towns, []), []);
  const places = [{ type: 'show_places', town: 'Culebra', places: [] }];
  assert.equal(townFlight('Culebra bakeries', 'Adjuntas', towns, places), places);
  assert.match(PROMPT, /call map_town for that town/);
  assert.match(PROMPT, /per 10,000 residents in that unit/);
});

test('the verdict note is one plain model call on the data given, charged to the ledger, and a failure leaves the template alone', async t => {
  let sent;
  const note = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async (url, init) => { sent = JSON.parse(init.body); return reply({ content: '**Go see** Panadería Alturas early. Río Grande ranks higher.' }, 0.0004); } });
  const out = await note({ lang: 'en', town: 'San Juan', industry: 'bakery', verdict: 'San Juan is a gap.', row: { group: 'gap' }, topGaps: [{ town: 'Río Grande' }], places: [{ name: 'Panadería Alturas' }] });
  assert.equal(out.text, 'Go see Panadería Alturas early. Río Grande ranks higher.');
  assert.equal(out.model, 'deepseek/deepseek-v4.1-flash');
  assert.ok(sent.messages[0].content.includes('two short sentences'));
  assert.ok(sent.messages[1].content.includes('Language: en'));
  assert.ok(sent.messages[1].content.includes('Panadería Alturas'));
  assert.equal(sent.tools, undefined);
  const refused = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => ({ ok: false, status: 429 }) });
  assert.deepEqual(await refused({ town: 'Ponce' }), { fallback: true, reason: 'http-429' });
  const noKey = createNote({ key: '', ledger: ledger(t) });
  assert.deepEqual(await noKey({ town: 'Ponce' }), { fallback: true, reason: 'no-key' });
  const empty = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: '' }) });
  assert.deepEqual(await empty({ town: 'Ponce' }), { fallback: true, reason: 'empty-answer' });
  // A note cut by the token limit keeps only whole sentences.
  const cut = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: "Visit El Horno early. Compare San Juan's 0" }) });
  assert.equal((await cut({ town: 'San Juan' })).text, 'Visit El Horno early.');
  assert.equal(wholeSentences('Only a fragment with no end'), '');
  assert.equal(wholeSentences('¿Listo? Sí.'), '¿Listo? Sí.');
  assert.equal(wholeSentences('Done.'), 'Done.');
  assert.ok(sent.max_tokens >= 400);
  assert.deepEqual(sent.reasoning, { enabled: false });
  // A note that echoes the verdict is dropped (a probe saw the whole verdict sentence come back).
  const verdict = 'San Juan is a gap for bakeries: taste above the median, rank 5 of 76, and few businesses, 16 establishments with employees. Qloo lists 37. A lead, not proof: visit and check rents.';
  const echo = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: verdict }) });
  assert.deepEqual(await echo({ town: 'San Juan', verdict }), { fallback: true, reason: 'echo' });
  assert.equal(echoes('Visit El Horno early and check the queue. Compare with Río Grande, rank 2.', verdict), false);
  assert.equal(echoes('San Juan is a gap for bakeries with taste above the median and few businesses, 16 establishments with employees, rank 5 of 76.', verdict), true);
  // The output contract: the requested language, no claim the data cannot carry, three sentences at most.
  const english = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: 'Visit El Horno early and check the queue. Compare with Río Grande, which has fewer bakeries per resident.' }) });
  assert.deepEqual(await english({ town: 'San Juan', lang: 'es', verdict }), { fallback: true, reason: 'language' });
  const spanish = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: 'Visite El Horno temprano y mire la fila. Compare con Río Grande, que tiene menos negocios por residente.' }) });
  assert.equal((await spanish({ town: 'San Juan', lang: 'es', verdict })).text, 'Visite El Horno temprano y mire la fila. Compare con Río Grande, que tiene menos negocios por residente.');
  const claim = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: 'Visit El Horno early. A bakery there will make money, guaranteed.' }) });
  assert.deepEqual(await claim({ town: 'San Juan', lang: 'en', verdict }), { fallback: true, reason: 'claim' });
  assert.equal(checkNote('One. Two. Three. Four.', 'en').text, 'One. Two. Three.');
  // A figure beside a unit is the model restating a number; the verdict carries them all.
  const figure = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: 'Visite El Horno. Río Grande tiene unos 0,65 por cada cien mil residentes.' }) });
  assert.deepEqual(await figure({ town: 'San Juan', lang: 'es', verdict }), { fallback: true, reason: 'number' });
  assert.deepEqual(checkNote('Compare with Rincón, where the maximum is 1.3 per 10,000.', 'en'), { reason: 'number' });
  // Clock times, phone numbers and quotation marks drop the note (Codex review 10/25 round 6).
  assert.deepEqual(checkNote('Visit Café Luna at 8:00 a.m. and check the queue. Compare it with Ponce.', 'en'), { reason: 'hours' });
  assert.deepEqual(checkNote('Pan Café opens at 5:30 am; go early.', 'en'), { reason: 'hours' });
  // Bare hours and unpunctuated phones (Codex review 10/25 round 6, second pass).
  for (const bad of ['Visit Cafe Luna at 8 and check the queue.', 'Visite Cafe Luna a las 8 y mire la fila.', 'Abre a las 7.30 todos los días.', 'Opens 18h30 on Fridays.', 'Llegue desde las 6 de la mañana.', 'Call 7875550123 first.', 'Call (787)555-0123 first.', 'Llame al 787.555.0123.'])
    assert.equal(checkNote(bad, 'en').reason === 'hours' || checkNote(bad, 'en').reason === 'phone', true, bad);
  // Allowed: a time-like catalog name given to the note, a ratio, a year.
  assert.equal(checkNote('Visit Bar 5:30 and 2 pm Cafe early.', 'en', ['Bar 5:30', '2 pm Cafe']).text, 'Visit Bar 5:30 and 2 pm Cafe early.');
  assert.equal(checkNote('Visit bar 5:30 and 2 PM cafe early.', 'en', ['Bar 5:30', '2 pm Cafe']).text, 'Visit bar 5:30 and 2 PM cafe early.', 'the name mask ignores case');
  assert.equal(checkNote('Go early and watch the queue; compare with Loíza.', 'en').text, 'Go early and watch the queue; compare with Loíza.');
  assert.deepEqual(checkNote('Call Pan Café at (787) 555-0123 before you go.', 'en'), { reason: 'phone' });
  assert.deepEqual(checkNote('Comparando: "Negocios de panadería por residente" dice el mapa.', 'es'), { reason: 'quote' });
  assert.equal(checkNote('Visit Pan Café early and watch the queue. Río Grande has fewer bakeries per resident than San Juan.', 'en').text.length > 0, true);
  assert.deepEqual(checkNote('Caguas has 16 establishments with employees.', 'en'), { reason: 'number' });
  assert.deepEqual(checkNote('Strong match for Bad Bunny fans (87%).', 'en'), { reason: 'number' });
  // Ranks and counted nouns are figures too (Codex 10/24); clock times and phone numbers drop the note too (10/25).
  for (const text of ['Compare con Río Grande, puesto 2 de 76.', 'Río Grande ranks 2 of 76.', 'Río Grande is #2 for taste.', 'Qloo lists 12 bakeries there.', 'Hay 5 panaderías en Adjuntas.'])
    assert.deepEqual(checkNote(text, 'en'), { reason: 'number' }, text);
  assert.equal(checkNote('Visite temprano y vuelva por la tarde.', 'es').text, 'Visite temprano y vuelva por la tarde.');
  // A place name ending in a digit is not a figure (live: "La Familia Bakery 2, Panadería Alturas" was dropped).
  const listed = 'Visit La Familia Bakery 2, Panadería Alturas de Río Grande and Tres Hermanos, and check the queue.';
  assert.deepEqual(checkNote(listed, 'en'), { reason: 'number' });
  assert.equal(checkNote(listed, 'en', ['La Familia Bakery 2', 'Panadería Alturas de Río Grande']).text, listed);
  assert.deepEqual(checkNote('Visit La Familia Bakery 2 and 12 bakeries nearby.', 'en', ['La Familia Bakery 2']), { reason: 'number' });
  const named = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async () => reply({ content: listed }) });
  assert.equal((await named({ town: 'Río Grande', lang: 'en', verdict, places: [{ name: 'La Familia Bakery 2' }, { name: 'Panadería Alturas de Río Grande' }] })).text, listed);
  assert.equal(checkNote('Visit El Horno early and check the queue. Río Grande has fewer bakeries per resident than San Juan.', 'en').text,
    'Visit El Horno early and check the queue. Río Grande has fewer bakeries per resident than San Juan.');
  const compared = createNote({ key: 'test', ledger: ledger(t), fetchImpl: async (url, init) => { sent = JSON.parse(init.body); return reply({ content: 'Visit El Horno early. Río Grande has fewer bakeries per resident than San Juan.' }); } });
  await compared({ town: 'San Juan', lang: 'en', verdict, comparison: 'Río Grande has fewer businesses of this type per resident than San Juan.' });
  assert.ok(sent.messages[1].content.includes('"comparison":"Río Grande has fewer businesses of this type per resident than San Juan."'));
  assert.equal(noteLanguage('Visite y compare con la mediana de la isla'), 'es');
  assert.equal(noteLanguage('Visit and compare with the island median'), 'en');
  assert.equal(noteLanguage('Panadería Alturas'), '');
  // The route sends suppressed rows as ranges, never zeroes, and never compares a town with itself.
  const server = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  assert.match(server, /r\.group === "gap" && r\.town !== business\.town/);
  assert.match(server, /const comparison = !gap \?/, 'the comparison with the next gap town is written by the route, in words');
  // The comparison town is the next row on the gap list after this one (judge panel 10/25 round 6).
  assert.match(server, /const after = row\.group === "gap" \? gapRows\.find\(\(r\) => \(r\.tasteRank \?\? 99\) > \(row\.tasteRank \?\? -1\)\) : null;/);
  assert.match(server, /const other = after \? "the next gap-group town by taste rank" : "the top gap-group town by taste rank";/);
  assert.match(server, /\$\{gap\.town\}, \$\{other\}, has fewer \$\{label\} per resident than \$\{business\.town\}/);
  assert.match(server, /\$\{gap\.town\}, \$\{otherEs\}, tiene menos \$\{label\} por residente que \$\{business\.town\}/);
  // A withheld count says whose count is withheld and who the other town is (judge panel 10/25).
  assert.match(server, /The Census withholds \$\{business\.town\}'s count, so it cannot be ordered against \$\{gap\.town\}, \$\{other\}\./);
  assert.doesNotMatch(server, /asi que no se compara con|así que no se compara con/);
  assert.doesNotMatch(server, /rate: lakh\(/, 'no figure reaches the note');
  assert.match(server, /if \(!\["en", "es"\]\.includes\(asked\.lang\)\) return \{ \.\.\.business, evidence: \{ \.\.\.business\.evidence, note: \{ fallback: "language" \} \} \};/);
  assert.match(server, /spoken: spokenExcerpt\(speech, 300\)/);
  // The note gets the Spanish group name and the comparison sentence, never a rate.
  assert.match(server, /groupEs: GROUP_ES\[row\.group\]/);
  assert.match(server, /topGaps, places, comparison,/);
  assert.doesNotMatch(server.slice(server.indexOf('async function withVerdictNote'), server.indexOf('async function patternAnswer')), /tasteRank: row\.tasteRank|ranked: row\.ranked|below 3|menos de 3|fewer than 3/, 'no rank or numeric threshold reaches the note');
  assert.match(PROMPT, /four at most/);
  assert.match(PROMPT, /call opportunity_map once with the industry and towns: \[every town named, four at most;/);
  assert.match(NOTE_SOURCE, /Never quote a rate, count, rank or percentage/);
  assert.match(PROMPT, /brecha, competido, tranquilo, saturado/);
  assert.match(PROMPT, /Never state\s+rents, foot traffic, footfall, crowds, menus, prices or "more traffic"/);
  assert.match(PROMPT, /sentence in English, sentenceEs in Spanish/);
});

test('two large tool results that overrun the request drop the largest one and the model still answers', async t => {
  const big = { name: 'town_catalog', description: 'x'.repeat(14000), parameters: { type: 'object', properties: { town: { type: 'string' } }, required: ['town'], additionalProperties: false },
    run: async ({ town }) => ({ data: { town, places: Array.from({ length: 40 }, (_, i) => ({ name: `${town} place ${i}`, description: 'd'.repeat(400) })) } }) };
  let count = 0; let seen;
  const agent = createAgent({ key: 'test', tools: [big], ledger: ledger(t), fetchImpl: async (_, opts) => {
    count++;
    assert.ok(Buffer.byteLength(opts.body) <= 48000, 'every request fits');
    if (count === 1) return reply({ content: null, tool_calls: [{ ...call('town_catalog', { town: 'Caguas' }), id: 'c1' }, { ...call('town_catalog', { town: 'Río Grande' }), id: 'c2' }] });
    seen = JSON.parse(opts.body).messages.filter(m => m.role === 'tool').map(m => m.content);
    return reply({ content: 'Río Grande before Caguas.' });
  } });
  const result = await agent({ question: 'Caguas or Río Grande for a bakery?' });
  assert.equal(result.agent, true);
  assert.equal(seen.length, 2);
  assert.ok(seen.some(c => c.includes('Result dropped to fit the request')), 'the largest result was replaced');
  assert.ok(seen.some(c => c.includes('place 39')), 'the other result survived');
  const dropped = result.evidence.calls.filter(c => c.error === 'dropped to fit the request');
  assert.equal(dropped.length, 1, 'the drawer marks the dropped call');
  assert.equal(dropped[0].ok, false);
  assert.equal(dropped[0].count, undefined);
});

test('tool arguments may carry a short list of strings, each checked by the item rule', () => {
  const schema = { properties: { industry: { type: 'string', enum: ['bakery'] }, towns: { type: 'array', items: { type: 'string', maxLength: 10 }, maxItems: 4 } }, required: ['industry'] };
  assert.equal(validArgs(schema, { industry: 'bakery', towns: ['Caguas', 'Cayey'] }), true);
  assert.equal(validArgs(schema, { industry: 'bakery', towns: ['Caguas'] }), false, 'one town is no comparison');
  assert.equal(validArgs(schema, { industry: 'bakery', towns: ['a', 'b', 'c', 'd', 'e'] }), false, 'over maxItems');
  assert.equal(validArgs(schema, { industry: 'bakery', towns: ['Caguas', 'a town name too long'] }), false, 'the item rule applies');
  assert.equal(validArgs(schema, { industry: 'bakery', towns: 'Caguas' }), false);
  assert.equal(validArgs(schema, { industry: 'bakery', towns: ['Caguas', 7] }), false);
});

test('the prompt tells the model how to answer a siting or comparison question and when to pass a category', () => {
  assert.match(PROMPT, /opportunity_map with the industry and the town\. For a comparison of\s+two to four towns, call opportunity_map once with the industry and towns/);
  assert.match(PROMPT, /never say few when its figure is at or\s+above the median/i);
  assert.match(PROMPT, /category food/);
  // An ambiguous ask gets a question back, not food in the open town (judge panels 10/24).
  assert.match(PROMPT, /names no kind of place and no purpose[^]*gets one short question back and no tool call/);
  assert.match(PROMPT, /¿dónde está lo\s+bueno\?/);
  // Round 6: hours in the text contradicted the card; "unranked" became "70 of 70"; the tool sentence came back in quotes.
  assert.match(PROMPT, /Never write opening hours or phone\s+numbers in the answer/);
  assert.match(PROMPT, /A town with no taste rank is unranked:\s+never give it a position/);
  assert.match(PROMPT, /without quotation marks/);
  assert.match(PROMPT, /call find_places with that word in the town so the cards are that kind/);
  // Round 7: the model denied Qloo audience data the card shows; the control run called a refused tool "returned nothing".
  assert.match(PROMPT, /call place_audience with its catalog id: Qloo carries age and\s+gender affinities for places, so never say it lacks them/);
  assert.match(PROMPT, /A tool refused as unavailable did not run: say that tool was\s+off for this run, never that it returned nothing/);
  assert.match(PROMPT, /names a condition the tools cannot test\s+\(vegan, kosher, parking, a budget, rent as the priority\), say so in one sentence/);
  assert.match(PROMPT, /Never raise a condition the question did not\s+name\./);
  assert.match(PROMPT, /A strict taste-tag miss is not catalog absence/);
});

test("a disclaimer for a condition the question never named is dropped; a named one stays (live 10/25, Taylor Swift in Ponce)", () => {
  const answer = "Taylor Swift fans in Ponce like Melao Coffee Shop and El Rastro. These are affinity matches. Note: Qloo has no data on vegan, budget or parking here.";
  assert.equal(dropUnaskedConditions("Where do Taylor Swift fans eat in Ponce?", answer),
    "Taylor Swift fans in Ponce like Melao Coffee Shop and El Rastro. These are affinity matches.");
  assert.equal(dropUnaskedConditions("¿Dónde abro una panadería vegana en San Juan?", answer), answer, "a named condition keeps its sentence");
  assert.equal(dropUnaskedConditions("Quiero abrir una panadería pero no tengo mucho dinero", answer), answer, "money counts as a named budget");
  const spanish = "Los fans comen en La Placita. No hay datos de estacionamiento ni presupuesto.";
  assert.equal(dropUnaskedConditions("¿Dónde comen los fans de Bad Bunny?", spanish), "Los fans comen en La Placita.");
  // A place that is vegan, mentioned without a disclaimer, stays; so does a fact about a place.
  const vegan = "Try Vegan Planet, a vegan café downtown.";
  assert.equal(dropUnaskedConditions("Where to eat in Ponce?", vegan), vegan);
  assert.equal(dropUnaskedConditions("Where should I eat?", "Vegan Planet is not open today. Try Cafe X."), "Vegan Planet is not open today. Try Cafe X.");
  // A cost or rent question names a budget, in Spanish too.
  assert.equal(dropUnaskedConditions("¿Cuánto cuesta alquilar un local?", "No hay datos de presupuesto. Compare las zonas."), "No hay datos de presupuesto. Compare las zonas.");
  // An answer that was only the unasked disclaimer comes back empty, so the empty-answer fallback runs.
  assert.equal(dropUnaskedConditions("Hi", "There is no parking data."), "");
  assert.equal(dropUnaskedConditions("¿Dónde comen en Ponce?", "Comen en El Rastro. Qloo no tiene datos de accesibilidad para silla de ruedas."), "Comen en El Rastro.");
  assert.equal(dropUnaskedConditions("Where should I eat?", "Vegan Planet is known for vegan lunches, but it is not open today. Try Cafe X."),
    "Vegan Planet is known for vegan lunches, but it is not open today. Try Cafe X.", "a venue fact with a negation is not a data gap");
  assert.equal(dropUnaskedConditions("Where can I eat cheaply?", "Qloo has no vegan data for this town. Try Cafe X."), "Try Cafe X.",
    "a budget question does not license a vegan disclaimer");
  // Passive wording is a data gap too; a place called Costa is not a cost question.
  assert.equal(dropUnaskedConditions("Where should I eat?", "Parking isn't tracked by Qloo. Try Cafe X."), "Try Cafe X.");
  assert.equal(dropUnaskedConditions("Where should I eat?", "Parking details are unavailable. Try Cafe X."), "Try Cafe X.");
  assert.equal(dropUnaskedConditions("Tell me about Costa Azul", "There is no budget data. Try Costa Azul."), "Try Costa Azul.");
  assert.equal(dropUnaskedConditions("¿Cuánto cuesta abrir aquí?", "No hay datos de presupuesto. Vea dos locales."), "No hay datos de presupuesto. Vea dos locales.");
  // The siting caveat about rents and sales is not a budget disclaimer and stays under any question.
  const caveat = "Río Grande está en el grupo brecha. Alquileres, tráfico y ventas no están en estos datos.";
  assert.equal(dropUnaskedConditions("¿Dónde abro una panadería?", caveat), caveat);
});
