// The with-and-without-Qloo control: six frozen prompts, each asked twice of a local server started
// with ZEMI_COMPARE=1 (the second time with the Qloo tools removed). Writes data/compare-qloo.json.
// Twelve model turns against the local daily budget; no key leaves this machine.
//   ZEMI_COMPARE=1 PORT=4182 node scripts/serve-eagle.mjs &  node scripts/compare-qloo.mjs http://127.0.0.1:4182
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROMPTS, compareRuns, mapPlaces } from "../server/compare.mjs";
import { MODEL } from "../server/agent.mjs";

const base = new URL(process.argv[2] || "http://127.0.0.1:4182");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("Run the control against a local server only.");
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "compare-qloo.json");

// A run that fell back (the model asked for five tools in one round, a timeout) is retried; the page
// only shows model answers, and the retry count is recorded so nothing is hidden.
async function ask(prompt, tools, attempts = 3) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try { return { ...(await once(prompt, tools)), attempt: i }; }
    catch (error) { last = error; console.warn(`retry ${i}/${attempts}: ${error.message}`); }
  }
  throw last;
}
async function once(prompt, tools) {
  const response = await fetch(new URL("/api/chat", base), { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: prompt.question, lang: prompt.lang, town: "", taste: "", history: [], ...(tools ? { tools } : {}) }),
    signal: AbortSignal.timeout(90000) });
  const data = await response.json();
  if (!response.ok || !data.agent || data.evidence?.mode !== "model") throw new Error(`${prompt.id} ${tools || "with"}: not a model answer (${response.status} ${data.evidence?.reason || data.error || ""})`);
  return { speech: data.speech, evidence: data.evidence, places: mapPlaces(data), actions: data.actions || [] };
}

const prompts = [];
for (const prompt of PROMPTS) {
  const withRun = await ask(prompt);
  const withoutRun = await ask(prompt, "no-qloo");
  const compare = compareRuns(withRun, withoutRun);
  console.log(`${prompt.id}: with ${compare.tools.with} calls, ${compare.catalog} places, named ${compare.named.with.length}; without ${compare.tools.without} calls; ${compare.qlooAddedNothing ? "Qloo added nothing" : "Qloo changed " + compare.onlyWith.join(", ")}`);
  const strip = ({ actions, ...run }) => run; // the map actions carry full records; the page needs names only
  prompts.push({ ...prompt, with: strip(withRun), without: strip(withoutRun), compare });
}
const file = { ranAt: new Date().toISOString(), model: MODEL,
  settings: { history: [], town: "", maxTokens: 1200, reasoningEffort: "low", rounds: 4, withoutTools: ["map_town", "town_weather", "landmarks", "town_history"] },
  prompts };
fs.writeFileSync(out, JSON.stringify(file, null, 1) + "\n");
console.log(`wrote ${path.relative(process.cwd(), out)}`);
