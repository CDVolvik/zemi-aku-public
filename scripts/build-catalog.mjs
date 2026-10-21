// Harvests every town's catalog through a running server, then writes the counts (not Qloo's
// records) to data/catalog-counts.json for the island map and the front page.
//   npm run eagle   (or docker compose up), then: node scripts/build-catalog.mjs [http://127.0.0.1:8080]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bandOf } from "../server/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.argv[2] || "http://127.0.0.1:8080";
const survey = JSON.parse(fs.readFileSync(path.join(root, "data/municipio-survey-2026-10-06.json"), "utf8"));

const towns = [];
for (const { town } of survey.rows) {
  let res;
  // The server allows 60 catalog requests a minute per visitor; wait it out rather than fail.
  while ((res = await fetch(`${host}/api/catalog?town=${encodeURIComponent(town)}`)).status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  const data = await res.json();
  if (!res.ok) throw new Error(`${town}: ${data.error || res.status}`);
  towns.push({
    town,
    total: data.total,
    band: bandOf(data.total),
    categories: Object.fromEntries(data.categories.map((category) => [category.id, category.count])),
  });
  console.log(`${town.padEnd(14)} ${String(data.total).padStart(4)}  measured ${data.measured}`);
}
towns.sort((a, b) => b.total - a.total);
const out = {
  measured: new Date().toISOString().slice(0, 10),
  source: "Qloo /v2/insights, filter.type place, filter.location.query '<town>, Puerto Rico', take 50, every page; kept when geocode.admin2_region is the town",
  total: towns.reduce((sum, row) => sum + row.total, 0),
  towns,
};
fs.writeFileSync(path.join(root, "data/catalog-counts.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(`\n${out.total} places in ${towns.length} towns → data/catalog-counts.json`);
