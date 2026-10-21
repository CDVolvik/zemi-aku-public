// Live check of the three harness workflows the map uses. Exits 1 if any is not ok.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { qlooTools, closeQloo } from "../server/qloo-mcp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const callQloo = qlooTools(root);
const place = "AFB19D2A-4EB2-4422-869C-B4020046C342"; // La Muralla China, Ponce
const checks = [
  ["qloo_audience_demographics", { entity: place, entity_type: "place" }],
  ["qloo_where_popular", { entity: place, entity_type: "place", within: "Puerto Rico", limit: 20 }],
  ["qloo_find_tags", { query: "surf", limit: 5 }],
];
let failed = 0;
for (const [name, args] of checks) {
  const started = Date.now();
  const envelope = await callQloo(name, args).catch((err) => ({ status: "error", summary: err.message }));
  const rows = Array.isArray(envelope.results) ? envelope.results.length : 0;
  console.log(`${name}: ${envelope.status} · ${rows} rows · ${Date.now() - started} ms ${envelope.summary || ""}`);
  if (envelope.status !== "ok") failed += 1;
}
await closeQloo();
process.exit(failed ? 1 : 0);
