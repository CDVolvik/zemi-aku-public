// Saves the three instant samples (server/samples.mjs) from a local server's model answers into
// data/samples/. Three model turns against the local daily budget; no key leaves this machine.
//   PORT=4182 node scripts/serve-eagle.mjs &  node scripts/save-samples.mjs http://127.0.0.1:4182
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLE_PROMPTS } from "../server/samples.mjs";

const base = new URL(process.argv[2] || "http://127.0.0.1:4182");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("Save samples from a local server only.");
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "samples");
fs.mkdirSync(dir, { recursive: true });

for (const prompt of SAMPLE_PROMPTS) {
  let data;
  for (let attempt = 1; attempt <= 3 && !data; attempt++) {
    const response = await fetch(new URL("/api/chat", base), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: prompt.question, lang: prompt.lang, town: "", taste: "", history: [] }), signal: AbortSignal.timeout(90000) });
    const body = await response.json();
    if (response.ok && body.agent && body.evidence?.mode === "model" && body.actions?.length) data = body;
    else console.warn(`${prompt.id}: attempt ${attempt} was not a model answer with map actions (${body.evidence?.reason || response.status})`);
  }
  if (!data) throw new Error(`${prompt.id}: no model answer after three attempts`);
  const sample = { ...prompt, savedAt: new Date().toISOString(), model: data.evidence.model, speech: data.speech, spoken: data.spoken,
    actions: data.actions, evidence: data.evidence };
  fs.writeFileSync(path.join(dir, `${prompt.id}.json`), JSON.stringify(sample, null, 1) + "\n");
  console.log(`${prompt.id}: ${data.evidence.calls.length} calls, ${data.actions.length} actions, ${data.speech.length} chars`);
}
console.log(`wrote ${SAMPLE_PROMPTS.length} samples to ${path.relative(process.cwd(), dir)}`);
