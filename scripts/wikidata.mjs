// Wikidata (CC0) for each municipality: population, and the landmarks inside it that have a photo
// (Ponce: 136, from Caja de Muertos to the Parque de Bombas). The cultural layer Qloo does not carry.
//   node scripts/wikidata.mjs
// Writes data/wikidata-towns.json (population, Wikidata id) and cache/wikidata/<town>.json (landmarks).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fold } from "../server/lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UA = "zemi-aku/0.1 (https://github.com/CDVolvik/qloo-local-taste)";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sparql(query) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
      headers: { "user-agent": UA, accept: "application/sparql-results+json" },
    });
    if (res.ok) return (await res.json()).results.bindings;
    await sleep(2000 * (attempt + 1)); // the public endpoint asks for patience under load
  }
  throw new Error("Wikidata query failed");
}

// The 78 municipalities: whatever Ponce (Q864024) is an instance of, located in Puerto Rico (Q1183).
const towns = await sparql(`
  SELECT ?town ?townLabel (MAX(?pop) AS ?population) WHERE {
    wd:Q864024 wdt:P31 ?kind.
    ?town wdt:P31 ?kind; wdt:P17|wdt:P131 ?pr.
    FILTER(?pr IN (wd:Q1183, wd:Q30))
    OPTIONAL { ?town wdt:P1082 ?pop }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  } GROUP BY ?town ?townLabel`);

const ours = JSON.parse(fs.readFileSync(path.join(root, "data/catalog-counts.json"), "utf8")).towns.map((row) => row.town);
const byName = new Map(towns.map((row) => [fold(row.townLabel.value), row]));
const out = [];
fs.mkdirSync(path.join(root, "cache", "wikidata"), { recursive: true });
for (const town of ours) {
  const row = byName.get(fold(town));
  if (!row) {
    console.log(`${town}: no Wikidata match`);
    continue;
  }
  const qid = row.town.value.split("/").pop();
  const items = await sparql(`
    SELECT ?item ?itemLabel ?itemDescription ?img ?coord ?typeLabel ?article WHERE {
      ?item wdt:P131+ wd:${qid}; wdt:P625 ?coord; wdt:P18 ?img.
      OPTIONAL { ?item wdt:P31 ?type }
      OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }`);
  const landmarks = new Map();
  for (const b of items) {
    const id = b.item.value.split("/").pop();
    const [lon, lat] = (b.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/) || []).slice(1).map(Number);
    if (!Number.isFinite(lat)) continue;
    const entry = landmarks.get(id) || {
      id, name: b.itemLabel?.value || "", description: b.itemDescription?.value || "",
      lat, lon, image: b.img.value.replace(/^http:/, "https:"), types: [], wikipedia: b.article?.value || "",
    };
    if (b.typeLabel && !entry.types.includes(b.typeLabel.value)) entry.types.push(b.typeLabel.value);
    landmarks.set(id, entry);
  }
  // A label that is still a Q-number has no name in Spanish or English; leave it out.
  const list = [...landmarks.values()].filter((item) => item.name && !/^Q\d+$/.test(item.name));
  fs.writeFileSync(path.join(root, "cache", "wikidata", `${fold(town).replace(/ /g, "-")}.json`), JSON.stringify({ town, qid, landmarks: list }));
  out.push({ town, qid, population: row.population ? Number(row.population.value) : null, landmarks: list.length });
  console.log(`${town.padEnd(14)} ${qid.padEnd(10)} pop ${String(row.population?.value || "?").padStart(7)}  landmarks ${list.length}`);
  await sleep(300);
}
fs.writeFileSync(path.join(root, "data/wikidata-towns.json"), `${JSON.stringify({
  source: "Wikidata (CC0): population P1082; landmarks are items located in the town (P131) with coordinates (P625) and a photo (P18)",
  measured: new Date().toISOString().slice(0, 10),
  towns: out,
}, null, 2)}\n`);
