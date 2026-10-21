// Build the public municipality demographics cache. Credentials stay in the project .env.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCensus } from "../server/census.mjs";
import { fold } from "../server/lib.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = fs.readFileSync(path.join(root, ".env"), "utf8").match(/^CENSUS_API_KEY=(.+)$/m)?.[1].trim();
const rows = await fetchCensus({ key });
const towns = JSON.parse(fs.readFileSync(path.join(root, "data", "catalog-counts.json"), "utf8")).towns;
const byTown = new Map(rows.map(row => [fold(row.town), row]));
if (rows.length !== 78 || towns.some(({ town }) => !byTown.has(fold(town)))) throw new Error("Census municipality coverage is incomplete");
const dir = path.join(root, "cache", "census");
fs.mkdirSync(dir, { recursive: true });
for (const { town } of towns) {
  const file = path.join(dir, fold(town).replace(/ /g, "-") + ".json");
  fs.writeFileSync(file + ".tmp", JSON.stringify({ ...byTown.get(fold(town)), town, fetchedAt: new Date().toISOString() }));
  fs.renameSync(file + ".tmp", file);
}
console.log(JSON.stringify({ municipalities: rows.length, vintage: 2024, period: "2020–2024", metrics: 4, keysStoredInCache: false }));
