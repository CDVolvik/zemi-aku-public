// Dry-run judge test: stranger-style questions against a Zemi-Aku server, scorecard to tmp/.
// Usage: node scripts/judge-dryrun.mjs https://zemi.r21digital.com [questions.json]
//   15 model turns by default; questions.json is an array of [lang, question] pairs (a tester's list);
//   writes tmp/judge-dryrun-<date>.json
import fs from "node:fs";
const base = process.argv[2] || "https://zemi.r21digital.com";
const QUESTIONS = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : [
  ["en", "I'm visiting San Juan for a weekend, where should I eat?"],
  ["en", "Best beach near Rincón for surfing?"],
  ["en", "Is it a good idea to open a gym in Caguas?"],
  ["en", "What do people in Mayagüez like?"],
  ["en", "Where can I hear live salsa?"],
  ["es", "¿Dónde comer en Aguadilla con niños?"],
  ["es", "¿Qué le gusta a la gente de Cabo Rojo?"],
  ["es", "¿Vale la pena abrir una barbería en Carolina?"],
  ["es", "Recomiéndame un café en el Viejo San Juan"],
  ["en", "Restaurants that Daddy Yankee fans would like in Carolina"],
  ["en", "whats good in ponce"],
  ["es", "Hotel en Vieques"],
  ["en", "Where is the cheapest place to open a restaurant?"],
  ["en", "Tell me about Fajardo"],
  ["es", "Hay playa en Luquillo?"],
];
const out = [];
for (const [lang, question] of QUESTIONS) {
  const t0 = Date.now();
  let row = { lang, question };
  try {
    const r = await fetch(new URL("/api/chat", base), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, lang, town: "", taste: "", history: [] }), signal: AbortSignal.timeout(120000) });
    const j = await r.json();
    row = { ...row, status: r.status, ms: Date.now() - t0, fallback: Boolean(j.fallback), mode: j.evidence?.mode, reason: j.evidence?.reason || j.reason,
      tools: (j.evidence?.calls || j.evidence?.tools || []).map((c) => c.tool || c.name).join(","),
      actions: (j.actions || []).map((a) => `${a.type}${a.town ? ":" + a.town : ""}${a.places ? "(" + a.places.length + ")" : ""}`).join(" "),
      speech: j.speech || j.answer || j.error || "", keys: Object.keys(j).join(",") };
  } catch (e) { row = { ...row, error: String(e), ms: Date.now() - t0 }; }
  out.push(row);
  console.log(`${row.status ?? "ERR"} ${row.ms}ms ${row.mode ?? (row.fallback ? "fallback" : "model")} [${row.tools ?? ""}] ${lang} "${question}"\n   -> ${(row.speech || row.error || "").slice(0, 300)}\n   actions: ${row.actions ?? ""}\n`);
}
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(`tmp/judge-dryrun-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`, JSON.stringify(out, null, 1));
