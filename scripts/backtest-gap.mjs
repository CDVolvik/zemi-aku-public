// Backtest of the opportunity map's gap signal (docs/BACKTEST-GAP-2026-10-26.md, preregistered first):
// groups from 2019 County Business Patterns and the saved Qloo taste, outcome the 2019→2023 change in
// establishments per 10,000 residents. Needs CENSUS_API_KEY in .env and the built cache/opportunity files.
// Writes data/backtest-gap.json (groups and Census counts only; no Qloo values). Run: node scripts/backtest-gap.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INDUSTRIES, cbpCounts, groupTowns } from "../server/opportunity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
const censusKey = env.match(/^CENSUS_API_KEY=(.+)$/m)?.[1].trim();
if (!censusKey) throw new Error("CENSUS_API_KEY is required in .env");

const HEADER = ["NAME", "ESTAB", "EMP", "NAICS2017", "state", "county"];
async function fetchCbp(year, naics) {
  const params = new URLSearchParams({ get: "NAME,ESTAB,EMP", for: "county:*", in: "state:72", NAICS2017: naics, key: censusKey });
  const res = await fetch(`https://api.census.gov/data/${year}/cbp?${params}`, { signal: AbortSignal.timeout(30000), redirect: "error" });
  if (res.status === 204) return [HEADER];
  if (!res.ok) throw new Error(`CBP ${year} ${naics} returned ${res.status}`);
  return res.json();
}

// Seeded so the p-values reproduce.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
const round = (value, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;

const rows = [];
for (const industry of INDUSTRIES) {
  const saved = JSON.parse(fs.readFileSync(path.join(root, "cache", "opportunity", `${industry.id}.json`), "utf8"));
  const towns = saved.towns.map(({ town, county, population }) => ({ town, county, population }));
  const taste = new Map(saved.towns.filter((row) => row.taste !== null).map((row) => [row.county, { taste: row.taste, cells: row.cells }]));
  const counts = {};
  for (const year of [2019, 2023]) {
    const responses = [];
    for (const code of industry.naics) responses.push(await fetchCbp(year, code));
    counts[year] = cbpCounts(responses);
  }
  const { towns: grouped } = groupTowns({ towns, taste, supply: counts[2019], codes: industry.naics.length });
  for (const row of grouped) {
    const before = counts[2019].get(row.county), after = counts[2023].get(row.county);
    const published = (count) => (count?.published || 0) === industry.naics.length;
    const outcome = published(before) && published(after) && row.population
      ? ((after.establishments - before.establishments) / row.population) * 10000 : null;
    rows.push({ industry: industry.id, town: row.town, group2019: row.group,
      establishments2019: published(before) ? before.establishments : null,
      establishments2023: published(after) ? after.establishments : null,
      changePerTenThousand: outcome === null ? null : round(outcome, 4) });
  }
}

const scored = rows.filter((row) => row.changePerTenThousand !== null);
const pick = (group, industry) => scored.filter((row) => row.group2019 === group && (!industry || row.industry === industry));
function compare(a, b) {
  if (!a.length || !b.length) return { nA: a.length, nB: b.length, difference: null };
  return { nA: a.length, nB: b.length, meanA: round(mean(a.map((r) => r.changePerTenThousand))),
    meanB: round(mean(b.map((r) => r.changePerTenThousand))),
    difference: round(mean(a.map((r) => r.changePerTenThousand)) - mean(b.map((r) => r.changePerTenThousand))),
    gainedA: round(a.filter((r) => r.changePerTenThousand > 0).length / a.length, 3),
    gainedB: round(b.filter((r) => r.changePerTenThousand > 0).length / b.length, 3) };
}
// Labels shuffled within each industry, so an industry's overall growth cannot favour one group.
function permutation(groupA, groupB, draws = 10000, seed = 20261026) {
  const random = mulberry32(seed);
  const pools = INDUSTRIES.map((industry) => {
    const pool = [...pick(groupA, industry.id), ...pick(groupB, industry.id)].map((row) => row.changePerTenThousand);
    return { pool, nA: pick(groupA, industry.id).length };
  }).filter(({ pool, nA }) => nA > 0 && nA < pool.length);
  const statistic = (split) => {
    const a = [], b = [];
    for (const { pool, nA } of split) { a.push(...pool.slice(0, nA)); b.push(...pool.slice(nA)); }
    return mean(a) - mean(b);
  };
  const observed = statistic(pools);
  let atLeast = 0;
  for (let i = 0; i < draws; i += 1) {
    const shuffled = pools.map(({ pool, nA }) => {
      const copy = [...pool];
      for (let j = copy.length - 1; j > 0; j -= 1) { const k = Math.floor(random() * (j + 1)); [copy[j], copy[k]] = [copy[k], copy[j]]; }
      return { pool: copy, nA };
    });
    if (statistic(shuffled) >= observed) atLeast += 1;
  }
  return { observed: round(observed), pOneSided: round((atLeast + 1) / (draws + 1), 4), draws, seed };
}

const others = scored.filter((row) => ["competitive", "quiet", "crowded"].includes(row.group2019));
const result = {
  ranAt: new Date().toISOString(),
  preregistration: "docs/BACKTEST-GAP-2026-10-26.md",
  sources: { cbp: [2019, 2023], qlooTasteRetrieved: "2026-10-11", residents: "PRCS 2020–2024" },
  primary: { comparison: "gap vs quiet, pooled", ...compare(pick("gap"), pick("quiet")), permutation: permutation("gap", "quiet") },
  perIndustry: INDUSTRIES.map((industry) => ({ industry: industry.id, ...compare(pick("gap", industry.id), pick("quiet", industry.id)) })),
  gapVsOthers: { ...compare(pick("gap"), others) },
  // Not preregistered: the pooled means mix industries (most quiet rows are restaurants, the fastest-growing
  // industry), so the average of the per-industry differences is reported beside them, labeled exploratory.
  exploratory: (() => {
    const differences = INDUSTRIES.map((industry) => compare(pick("gap", industry.id), pick("quiet", industry.id)).difference).filter((d) => d !== null);
    return { meanOfIndustryDifferences: round(mean(differences)), industriesGapAhead: differences.filter((d) => d > 0).length, industries: differences.length };
  })(),
  excluded: rows.length - scored.length,
  rows,
};
fs.writeFileSync(path.join(root, "data", "backtest-gap.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ primary: result.primary, perIndustry: result.perIndustry, gapVsOthers: result.gapVsOthers, exploratory: result.exploratory, excluded: result.excluded }, null, 1));
