// Build the opportunity data once: one Qloo island heatmap per industry and one Census County Business
// Patterns call per NAICS code (14 calls). Keys stay in the project .env; the cache holds derived
// per-town numbers only. Run: node scripts/opportunity.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INDUSTRIES, buildIndustry } from "../server/opportunity.mjs";
import { fold } from "../server/lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
const value = (name) => env.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1].trim();
const qlooKey = value("QLOO_API_KEY");
const qlooBase = value("QLOO_API_BASE") || "https://hackathon.api.qloo.com";
const censusKey = value("CENSUS_API_KEY");
if (!qlooKey || !censusKey) throw new Error("QLOO_API_KEY and CENSUS_API_KEY are required in .env");

const features = JSON.parse(fs.readFileSync(path.join(root, "app", "data", "municipios.geojson"), "utf8")).features;
const towns = JSON.parse(fs.readFileSync(path.join(root, "data", "catalog-counts.json"), "utf8")).towns.map(({ town }) => {
  const census = JSON.parse(fs.readFileSync(path.join(root, "cache", "census", `${fold(town).replace(/ /g, "-")}.json`), "utf8"));
  return { town, county: census.fips.slice(2), population: census.population?.estimate };
});

async function fetchHeat(tag) {
  const params = new URLSearchParams({ "filter.type": "urn:heatmap", "filter.location.query": "Puerto Rico",
    "signal.interests.tags": tag, take: "40" }); // take=200 returns 400; 40 still returns every cell.
  const res = await fetch(`${qlooBase}/v2/insights?${params}`, { headers: { "X-Api-Key": qlooKey }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Qloo heatmap returned ${res.status}`);
  return (await res.json()).results?.heatmap || [];
}

const CBP_HEADER = ["NAME", "ESTAB", "EMP", "NAICS2017", "state", "county"];
async function fetchCbp(naics) {
  const params = new URLSearchParams({ get: "NAME,ESTAB,EMP", for: "county:*", in: "state:72", NAICS2017: naics, key: censusKey });
  const res = await fetch(`https://api.census.gov/data/2023/cbp?${params}`, { signal: AbortSignal.timeout(30000), redirect: "error" });
  if (res.status === 204) return [CBP_HEADER]; // No establishments anywhere in Puerto Rico.
  if (!res.ok) throw new Error(`Census County Business Patterns returned ${res.status}`);
  return res.json();
}

const dir = path.join(root, "cache", "opportunity");
fs.mkdirSync(dir, { recursive: true });
for (const industry of INDUSTRIES) {
  const file = await buildIndustry({ industry, features, towns, fetchHeat, fetchCbp });
  const target = path.join(dir, `${industry.id}.json`);
  fs.writeFileSync(target + ".tmp", JSON.stringify(file));
  fs.renameSync(target + ".tmp", target);
  const groups = {};
  for (const row of file.towns) groups[row.group] = (groups[row.group] || 0) + 1;
  const cells = file.towns.reduce((sum, row) => sum + row.cells, 0);
  console.log(JSON.stringify({ industry: industry.id, towns: file.towns.length, cellsInTowns: cells,
    withTaste: file.towns.filter((row) => row.taste !== null).length, groups }));
}
