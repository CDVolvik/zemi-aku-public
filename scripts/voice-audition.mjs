// Generates one MP3 per candidate voice into tmp/voice-audition/ plus an index.html to listen from.
// Reads DEEPGRAM_API_KEY from the project .env; never prints it. About 4,000 characters for every
// candidate; pass language codes to run a few only:  node scripts/voice-audition.mjs fr it de
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATES, LINES, renderIndex } from "../server/audition.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
const key = env.match(/^DEEPGRAM_API_KEY=(.+)$/m)?.[1].trim();
if (!key) throw new Error("DEEPGRAM_API_KEY is required in .env");

const out = path.join(root, "tmp", "voice-audition");
fs.mkdirSync(out, { recursive: true });

const only = process.argv.slice(2).filter((arg) => /^[a-z]{2}$/.test(arg));
const picked = only.length ? CANDIDATES.filter((candidate) => only.includes(candidate.lang)) : CANDIDATES;
const results = [];
let chars = 0;
for (const candidate of picked) {
  const text = LINES[candidate.lang];
  chars += text.length;
  const res = await fetch(`https://api.deepgram.com/v1/speak?${new URLSearchParams({ model: candidate.id })}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    results.push({ ...candidate, file: null, status: res.status });
    console.log(`${candidate.id} ${res.status}`);
    continue;
  }
  const audio = Buffer.from(await res.arrayBuffer());
  const file = `${candidate.id}.mp3`;
  fs.writeFileSync(path.join(out, file), audio);
  results.push({ ...candidate, file, status: 200 });
  console.log(`${candidate.id} 200 ${audio.length}`);
}
fs.writeFileSync(path.join(out, "index.html"), renderIndex(results));
console.log(`${chars} characters sent · ${results.filter((r) => r.file).length}/${picked.length} voices · ${path.join(out, "index.html")}`);
