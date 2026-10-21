// Where a taste is strong and businesses are few: Qloo's island heatmap for an industry, totaled per
// municipio, against Census County Business Patterns per 10,000 residents. Towns join on the Census
// county code, never on names (accents differ across sources).

import fs from "node:fs";
import path from "node:path";

export const INDUSTRIES = [
  { id: "cafe", tag: "urn:tag:genre:place:restaurant:cafe", naics: ["722515"], label: { en: "café", es: "cafetería" } },
  { id: "bakery", tag: "urn:tag:genre:place:restaurant:bakery", naics: ["311811"], label: { en: "bakery", es: "panadería" } },
  { id: "restaurant", tag: "urn:tag:genre:place:restaurant", naics: ["722511", "722513"], label: { en: "restaurant", es: "restaurante" } },
  { id: "bar", tag: "urn:tag:genre:place:restaurant:bar", naics: ["722410"], label: { en: "bar", es: "barra" } },
  { id: "hotel", tag: "urn:tag:genre:place:hotel", naics: ["721110"], label: { en: "hotel", es: "hotel" } },
  // Beauty salons only: nail salons (812113) are published in 3 towns, so summing them would add a 0–2 range to 75.
  { id: "salon", tag: "urn:tag:genre:place:beauty_salon", naics: ["812112"], label: { en: "salon", es: "salón de belleza" } },
];
const MIN_CELLS = 5;

// Ray casting on [lon, lat] rings; a point inside a hole is outside the polygon.
function inRing(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inPolygon = ([outer, ...holes], lon, lat) => inRing(outer, lon, lat) && !holes.some((hole) => inRing(hole, lon, lat));

export function townOfPoint(features, lat, lon) {
  for (const feature of features) {
    const { type, coordinates } = feature.geometry || {};
    const polygons = type === "Polygon" ? [coordinates] : type === "MultiPolygon" ? coordinates : [];
    if (polygons.some((polygon) => inPolygon(polygon, lon, lat))) return feature.properties.COUNTY;
  }
  return null;
}

// CBP does not publish a county cell with fewer than 3 establishments (the smallest published value
// across ~2,000 US counties per industry is 3; checked 2026-10-11). An absent county has 0–2.
const UNPUBLISHED_MAX = 2;
export function cbpCounts(responses) {
  const counts = new Map();
  for (const rows of responses) {
    const [header, ...values] = rows;
    const estab = header.indexOf("ESTAB");
    const emp = header.indexOf("EMP");
    const county = header.indexOf("county");
    if (estab < 0 || county < 0) throw new Error("Unexpected County Business Patterns response");
    for (const row of values) {
      const prior = counts.get(row[county]) || { establishments: 0, employees: 0, published: 0 };
      counts.set(row[county], { establishments: prior.establishments + (Number(row[estab]) || 0),
        employees: prior.employees + (emp < 0 ? 0 : Number(row[emp]) || 0), published: prior.published + 1 });
    }
  }
  return counts;
}

export function tasteByTown(cells, features) {
  const sums = new Map();
  for (const cell of cells) {
    const lat = Number(cell.location?.latitude);
    const lon = Number(cell.location?.longitude);
    const affinity = cell.query?.affinity;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || typeof affinity !== "number" || !Number.isFinite(affinity)) continue;
    const county = townOfPoint(features, lat, lon);
    if (!county) continue; // Offshore cells belong to no town.
    const sum = sums.get(county) || { total: 0, cells: 0 };
    sums.set(county, { total: sum.total + affinity, cells: sum.cells + 1 });
  }
  return new Map([...sums].map(([county, { total, cells }]) => [county, { taste: total / cells, cells }]));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// codes = how many NAICS codes the industry sums. Each unpublished code adds 0–2 establishments, so a
// town carries a lower and an upper bound. It is "many" only if its lower bound reaches the median of
// towns with published counts, "few" only if its upper bound stays below it; otherwise its group is unknown.
export function groupTowns({ towns, taste, supply, codes = 1 }) {
  const rows = towns.map(({ town, county, population }) => {
    const signal = taste.get(county);
    const counted = supply.get(county) || { establishments: 0, employees: 0, published: 0 };
    const hidden = Math.max(0, codes - (counted.published || 0));
    const people = Number(population);
    const per = (count) => (people > 0 ? (count / people) * 10000 : null);
    const establishmentsMax = counted.establishments + hidden * UNPUBLISHED_MAX;
    return { town, county, population: people > 0 ? people : null,
      taste: signal && signal.cells >= MIN_CELLS ? signal.taste : null, cells: signal?.cells || 0,
      suppressed: hidden > 0, establishments: counted.establishments, establishmentsMax, employees: counted.employees,
      perTenThousand: per(counted.establishments), perTenThousandMax: per(establishmentsMax) };
  });
  const tasted = rows.filter((row) => row.taste !== null);
  const published = tasted.filter((row) => !row.suppressed && row.perTenThousand !== null);
  const medians = { taste: tasted.length ? median(tasted.map((row) => row.taste)) : null,
    perTenThousand: published.length ? median(published.map((row) => row.perTenThousand)) : null };
  const ranked = [...tasted].sort((a, b) => b.taste - a.taste || a.town.localeCompare(b.town));
  const rank = new Map(ranked.map((row, index) => [row.county, index + 1]));
  for (const row of rows) {
    const supplyKnown = row.perTenThousand !== null && medians.perTenThousand !== null;
    const many = supplyKnown && row.perTenThousand >= medians.perTenThousand;
    const few = supplyKnown && row.perTenThousandMax < medians.perTenThousand;
    const strong = row.taste !== null && row.taste >= medians.taste;
    row.group = row.taste === null || (!many && !few) ? "unknown" : strong ? (many ? "competitive" : "gap") : many ? "crowded" : "quiet";
    row.tasteRank = row.taste !== null ? rank.get(row.county) : null;
  }
  return { towns: rows, medians };
}

const MIN_HEAT_CELLS = 100;
const RULE = "Taste is split at the island median of towns with taste data, and businesses per 10,000 residents at the median "
  + "of towns with published Census counts; at or above the median counts as high. Census does not publish counts below 3: "
  + "a town without a published count counts as few only when even 2 businesses would stay below the median, otherwise "
  + "not enough data. Towns with fewer than 5 heatmap cells show as not enough data.";
const ATTRIBUTION = {
  en: "Taste data from the Qloo API (hackathon access). Affinities describe aggregate cultural patterns, not individuals. Rankings and interpretations are Zemi-Aku's.",
  es: "Datos de gusto de la API de Qloo (acceso del hackathon). Las afinidades describen patrones culturales agregados, no a personas. Las clasificaciones e interpretaciones son de Zemi-Aku.",
};
function notesFor(label, day) {
  return {
    en: ["Taste compared with existing businesses. Not a measure of demand, revenue or profit.",
      "Businesses: U.S. Census Bureau, County Business Patterns 2023. Excludes the self-employed and government. Census does not publish counts below 3, so a town without a published count has 0–2 establishments in this industry.",
      `Taste: Qloo heatmap affinity for ${label.en}, averaged over the town's map cells, retrieved ${day}.`,
      "People: Puerto Rico Community Survey 2020–2024.",
      "Groups split at the island median on each axis. A town without a published count counts as few only when even 2 businesses would stay below the median; otherwise it shows as not enough data.", ATTRIBUTION.en],
    es: ["Gusto comparado con los negocios que ya existen. No mide demanda, ingresos ni ganancias.",
      "Negocios: U.S. Census Bureau, County Business Patterns 2023. No incluye a quienes trabajan por cuenta propia ni al gobierno. El Census no publica cifras menores de 3, así que un pueblo sin cifra publicada tiene de 0 a 2 establecimientos en esta industria.",
      `Gusto: afinidad del mapa de calor de Qloo por ${label.es}, promediada sobre las celdas del pueblo, obtenida el ${day}.`,
      "Población: Puerto Rico Community Survey 2020–2024.",
      "Los grupos se dividen en la mediana de la isla en cada eje. Un pueblo sin cifra publicada se cuenta entre los de pocos negocios solo si aun con 2 quedaría por debajo de la mediana; si no, aparece como datos insuficientes.", ATTRIBUTION.es],
  };
}

// One industry: one island heatmap call and one Census call per NAICS code. Stores derived per-town
// numbers only, never Qloo's cells.
export async function buildIndustry({ industry, features, towns, fetchHeat, fetchCbp, now = () => new Date() }) {
  const cells = await fetchHeat(industry.tag);
  if (!Array.isArray(cells) || cells.length < MIN_HEAT_CELLS) throw new Error(`Qloo heatmap for ${industry.id} returned too few cells`);
  const retrievedAt = now().toISOString();
  const responses = [];
  for (const code of industry.naics) responses.push(await fetchCbp(code));
  const { towns: rows, medians } = groupTowns({ towns, taste: tasteByTown(cells, features), supply: cbpCounts(responses), codes: industry.naics.length });
  return { industry: industry.id, label: industry.label, builtAt: retrievedAt,
    sources: { qloo: { tag: industry.tag, retrievedAt }, cbp: { vintage: 2023, naics: industry.naics }, census: { period: "2020–2024" } },
    rule: RULE, notes: notesFor(industry.label, retrievedAt.slice(0, 10)), medians, towns: rows };
}

// The saved build, read on first use. A missing or unreadable file is "not built", never a crash, and
// is checked again on the next request so a later build is picked up without a restart.
export function createOpportunity({ dir }) {
  const loaded = new Map();
  return {
    industries: INDUSTRIES.map((industry) => industry.id),
    get(id) {
      if (!INDUSTRIES.some((industry) => industry.id === id)) return null;
      if (!loaded.has(id)) {
        try { loaded.set(id, JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8"))); }
        catch { return null; }
      }
      return loaded.get(id);
    },
  };
}

// The business flow's parsed request → one of the six industries, or null.
export function industryOf(request) {
  if (["cafe", "bakery", "restaurant", "hotel", "salon"].includes(request?.type)) return request.type;
  return request?.category === "drinks" ? "bar" : null;
}
