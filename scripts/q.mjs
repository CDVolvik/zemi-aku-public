// Short probe of one Qloo workflow: `npm run q -- <workflow> '<json>' [rows]`.
// Prints status, summary, and the first rows of results, not the full envelope.
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [workflow, input = "{}", rows = "5"] = process.argv.slice(2);
if (!workflow) {
  console.error("usage: npm run q -- <workflow> '<json>' [rows]");
  process.exit(2);
}
let out;
try {
  out = execFileSync(process.execPath, [path.join(root, "scripts", "qloo.mjs"), "exec", workflow, "--input", input], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  out = err.stdout || String(err);
}
const result = JSON.parse(out);
console.log(result.status ?? "error", "·", result.summary ?? result.error?.code ?? "");
for (const issue of result.resolution?.issues ?? []) {
  console.log("needs:", issue.input, issue.kind, (issue.candidates ?? []).map((c) => `${c.name} [${c.id}] ${c.address ?? ""}`).join(" | "));
}
const list = Array.isArray(result.results) ? result.results.slice(0, Number(rows)) : result.results;
console.log(JSON.stringify(list, null, 1));
