// Go/no-go test: does Qloo return useful signal for Puerto Rico and Arizona audiences?
// Runs the same location queries for each target city and prints status, count and top 3 names.
// Needs QLOO_API_KEY (see .env.example). Read-only GET calls; prints no secrets.
//
// Location params used (docs.qloo.com/reference/parameters):
//   filter.location.query  place/destination: named locality, fuzzy-matched (400 if none found)
//   filter.location        place/destination: a locality UUID from /search?types=urn:entity:locality (fallback)
//   signal.location.query  any entity type, per the Parameter Reference and the location use-case page
//                          (the Entity Type Parameter Guide does not list it, and unsupported params are
//                          silently ignored, so we also check the locality echo and cross-city differences)
//
// Grade per city, from the places query (take=20):
//   PASS  >= 5 places in the right region (PR or AZ), and at least 1 place whose city matches
//         or the API echoed the matched locality (query.locality.signal)
//   THIN  1-4 places in the right region, or 5+ with neither check above
//   FAIL  HTTP error, or 0 places in the right region
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const base = process.env.QLOO_API_BASE ?? "https://hackathon.api.qloo.com";
const key = process.env.QLOO_API_KEY;
if (!key) {
  console.error("Missing QLOO_API_KEY (the key arrives by email; see .env.example)");
  process.exit(1);
}

const CITIES = [
  { label: "San Juan, PR", query: "San Juan, Puerto Rico", city: "San Juan", area: "PR" },
  { label: "Bayamon, PR", query: "Bayamon, Puerto Rico", city: "Bayamon", area: "PR" },
  { label: "Carolina, PR", query: "Carolina, Puerto Rico", city: "Carolina", area: "PR" },
  { label: "Ponce, PR", query: "Ponce, Puerto Rico", city: "Ponce", area: "PR" },
  { label: "Mesa, AZ", query: "Mesa, Arizona", city: "Mesa", area: "AZ" },
  { label: "Phoenix, AZ", query: "Phoenix, Arizona", city: "Phoenix", area: "AZ" },
];
const REGION_WORDS = { PR: ["pr", "puerto rico"], AZ: ["az", "arizona"] };
const TAG_CONCEPTS = ["restaurant", "bar", "party"];
const PLACE = "urn:entity:place";

const redact = (s) => String(s).split(key).join("[redacted]");
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = (body, k) => {
  const r = body?.results;
  return Array.isArray(r) ? r : Array.isArray(r?.[k]) ? r[k] : [];
};

async function get(path, params) {
  const url = `${base}${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; ; attempt++) {
    await sleep(300);
    let res;
    try {
      res = await fetch(url, { headers: { "X-Api-Key": key } });
    } catch (err) {
      return { status: 0, body: null, error: redact(err.message) };
    }
    const text = await res.text();
    if (res.status === 429 && attempt === 0) {
      await sleep(Number(res.headers.get("retry-after")) * 1000 || 2000);
      continue;
    }
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON error page */
    }
    return { status: res.status, body, error: res.ok ? null : redact(text.slice(0, 200)) };
  }
}

function geoOf(e) {
  const g = e?.properties?.geocode ?? {};
  return {
    city: g.name ?? g.city,
    region: g.admin1_region,
    country: g.country_code,
    address: e?.properties?.address,
  };
}
const inRegion = (e, area) => {
  const g = geoOf(e);
  const words = REGION_WORDS[area];
  if ([g.region, g.country].some((v) => words.includes(norm(v)))) return true;
  const addr = norm(g.address);
  return words.some((w) => (w.length === 2 ? new RegExp(`[, ]${w}\\b`).test(addr) : addr.includes(w)));
};
const inCity = (e, city) => {
  const g = geoOf(e);
  return norm(g.city) === norm(city) || norm(g.address).includes(norm(city));
};
const describe = (e) => {
  const g = geoOf(e);
  const where = [g.city, g.region ?? g.country].filter(Boolean).join(", ");
  return where ? `${e.name} (${where})` : String(e.name);
};
const localityEcho = (body) => body?.query?.locality?.signal?.name ?? null;

function show(tag, r, items, extra = "") {
  const top = items.slice(0, 3).map((e) => (typeof e === "string" ? e : describe(e))).join("; ");
  const status = r.status === 0 ? "no response" : `HTTP ${r.status}`;
  const err = r.error ? ` [${r.error}]` : "";
  console.log(`  ${tag.padEnd(10)} ${status} | ${items.length} results${extra} | top: ${top || "-"}${err}`);
}

// Tag IDs are not guessable, so look up one per concept once.
console.log(`Qloo coverage check against ${base}\n`);
const tagIds = {};
for (const concept of TAG_CONCEPTS) {
  const r = await get("/v2/tags", { "filter.query": concept, take: 5 });
  if (r.status === 401 || r.status === 403) {
    console.error(
      `HTTP ${r.status}: key rejected. Hackathon keys work only at https://hackathon.api.qloo.com.`,
    );
    process.exit(2);
  }
  const tags = list(r.body, "tags");
  const pick = tags.find((t) => String(t.id ?? t.tag_id).includes(":place")) ?? tags[0];
  if (pick) tagIds[concept] = pick.id ?? pick.tag_id;
  show(`tag:${concept}`, r, tags.map((t) => `${t.name} ${t.id ?? t.tag_id}`));
}
const restaurantTag = tagIds.restaurant;

const results = [];
for (const c of CITIES) {
  console.log(`\n== ${c.label} ==`);
  const seen = { place: [], brand: [], tv_show: [], artist: [] };

  const loc = await get("/search", { query: c.query, types: "urn:entity:locality", take: 3 });
  const locs = list(loc.body, "entities");
  show("locality", loc, locs.map((l) => l.name));
  const localityId = locs[0]?.entity_id ?? locs[0]?.id;

  // Core places query, by name first, then by the locality UUID if that gave nothing usable.
  let locParam = { "filter.location.query": c.query };
  let core = await get("/v2/insights", { "filter.type": PLACE, ...locParam, take: 20 });
  let places = list(core.body, "entities");
  show("places", core, places, ` (${places.filter((e) => inRegion(e, c.area)).length} in ${c.area})`);
  if ((core.status !== 200 || !places.some((e) => inRegion(e, c.area))) && localityId) {
    locParam = { "filter.location": localityId };
    core = await get("/v2/insights", { "filter.type": PLACE, ...locParam, take: 20 });
    places = list(core.body, "entities");
    show("places/id", core, places, ` (${places.filter((e) => inRegion(e, c.area)).length} in ${c.area})`);
  }
  seen.place = places.map((e) => e.name);

  for (const concept of TAG_CONCEPTS) {
    if (!tagIds[concept]) continue;
    const r = await get("/v2/insights", { "filter.type": PLACE, ...locParam, "filter.tags": tagIds[concept], take: 10 });
    show(concept, r, list(r.body, "entities"));
  }

  // Brands, TV shows and artists have no documented location filter; signal.location.query is the candidate.
  for (const [type, label] of [["brand", "brands"], ["tv_show", "tv"], ["artist", "artists"]]) {
    const r = await get("/v2/insights", { "filter.type": `urn:entity:${type}`, "signal.location.query": c.query, take: 10 });
    const items = list(r.body, "entities");
    seen[type] = items.map((e) => e.name);
    show(label, r, items, localityEcho(r.body) ? ` (locality: ${localityEcho(r.body)})` : " (no locality echo)");
  }

  // Heatmap: informational only (grid points have no names), so print geohashes.
  if (restaurantTag) {
    const r = await get("/v2/insights", { "filter.type": "urn:heatmap", "filter.location.query": c.query, "signal.interests.tags": restaurantTag, take: 10 });
    show("heatmap", r, list(r.body, "heatmap").map((p) => p.location?.geohash ?? "?"));
  }

  const n = places.length;
  const region = places.filter((e) => inRegion(e, c.area)).length;
  const city = places.filter((e) => inCity(e, c.city)).length;
  const echo = localityEcho(core.body);
  let grade = "FAIL";
  if (core.status === 200 && region > 0) grade = region >= 5 && (city >= 1 || echo) ? "PASS" : "THIN";
  results.push({ c, grade, n, region, city, echo, seen });
}

console.log("\n== Location actually changes results? (top-10 names per city vs the other cities) ==");
for (const type of ["place", "brand", "tv_show", "artist"]) {
  const parts = results.map((r) => {
    const mine = r.seen[type].slice(0, 10);
    const others = new Set(results.filter((o) => o !== r).flatMap((o) => o.seen[type].slice(0, 10)));
    return `${r.c.city} ${mine.filter((x) => !others.has(x)).length}/${mine.length} unique`;
  });
  console.log(`  ${type.padEnd(8)} ${parts.join(" | ")}`);
}
console.log("  (all zeros means the location parameter was probably ignored for that type)");

console.log("\n== Result ==");
console.log("Rule: PASS = 5+ places in the right region and a city match or locality echo; THIN = 1-4 (or no corroboration); FAIL = error or none.");
for (const { c, grade, n, region, city, echo } of results) {
  console.log(`  ${grade.padEnd(4)} ${c.label} (${n} places, ${region} in ${c.area}, ${city} in city${echo ? `, matched "${echo}"` : ""})`);
}
console.log("\nThis only measures coverage. Carlos decides go/no-go after reading the lists above.");
process.exit(results.some((r) => r.grade === "FAIL") ? 1 : 0);
