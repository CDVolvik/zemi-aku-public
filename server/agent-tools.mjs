import { fold, affinityWhy, audienceLines } from "./lib.mjs";
import { INDUSTRIES } from "./opportunity.mjs";
import { CATEGORIES, categoryOf } from "./catalog.mjs";
// One read-only tool registry shared by the text agent and future voice/MCP transports.
// The with-and-without-Qloo control runs the same prompt against this registry minus every tool
// that reads Qloo: the saved /compare runs (local, ZEMI_COMPARE=1) and, since October 23, the public
// "Ask again without Qloo" control under the same caps; see docs/SPEC-2026-10-14-with-and-without-qloo.md.
export const NON_QLOO_TOOLS = ["map_town", "town_weather", "landmarks", "town_history"];
export function withoutQloo(tools) { return tools.filter((tool) => NON_QLOO_TOOLS.includes(tool.name)); }
// The second control (judge panel 10/24): the Qloo place catalog stays, every affinity tool goes (artist places,
// fans-also-love, recommendations, audiences, tags, trends, the taste profile and the heatmap), so a pair shows
// whether Qloo's taste signal changes which places are named, not just whether names exist.
export const CATALOG_ONLY_TOOLS = [...NON_QLOO_TOOLS, "town_catalog", "find_places", "place_details"];
export function catalogOnly(tools) { return tools.filter((tool) => CATALOG_ONLY_TOOLS.includes(tool.name)); }
// The same test as the cards' bar note (app/marks.js): any bar, pub or lounge, except the ones that serve no drinks.
const BAR_GENRE = /\b(bar|bars|pub|gastropub|brewpub|lounge|beer hall|beer garden|night ?club|tavern|cantina)\b/i;
const NOT_A_BAR = /\b(espresso|snack|juice|salad|oyster|raw|sushi|coffee|smoothie|candy|dessert|ice cream)\s+bar\b/i;
export const isBar = (place) => BAR_GENRE.test(String(place?.genre || "")) && !NOT_A_BAR.test(String(place?.genre || ""));
const GROUP_WORDS = { gap: "a gap", competitive: "competitive", quiet: "quiet", crowded: "crowded", unknown: "not enough data" };
const GROUP_ES = { gap: "brecha", competitive: "competido", quiet: "tranquilo", crowded: "saturado", unknown: "sin datos suficientes" };
function townReading(file, industry, town) {
  const row = file.towns.find((r) => r.town === town);
  if (!row) return null;
  const counted = file.towns.filter((r) => r.population > 0);
  const people = counted.reduce((sum, r) => sum + r.population, 0);
  const businesses = counted.reduce((sum, r) => sum + (r.establishments || 0), 0);
  const island = people > 0 ? businesses / people * 10000 : null;
  const ranked = file.towns.filter((r) => Number.isInteger(r.tasteRank)).length;
  const figure = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
  const median = Number.isFinite(file.medians?.perTenThousand) ? file.medians.perTenThousand : null;
  // The groups split at the median of towns with published counts; quote that line, not the island average.
  const against = median !== null ? `against the median of ${figure(median)} the groups split on (island average ${figure(island)})` : `against ${figure(island)} island-wide`;
  // A withheld cell is 0 to 2; an industry that sums two withheld codes reads 0 to 4, and the sentence says why
  // (judge panel 10/25 round 6: "0 a 4" read as a misstated rule). An unranked town gets no "of N" to turn into a rank.
  const published = row.establishments || 0;
  const cells = row.suppressed ? Math.max(1, Math.round(Math.max(0, (row.establishmentsMax ?? 2) - published) / 2)) : 0;
  const upper = published + 2 * cells; // equals establishmentsMax when the build is consistent; never below the published count
  const withheldCodes = cells === 1 ? "one withheld code" : `${cells} withheld codes`;
  const density = row.suppressed
    ? (published > 0
      ? `${published} published plus ${withheldCodes} (the Census withholds a code's count below 3), so ${published} to ${upper} establishments in all`
      : `no published count (the Census withholds a code's count below 3; ${withheldCodes} here), so 0 to ${upper} establishments`)
    : `${row.establishments} establishments with employees, ${figure(row.perTenThousand)} per 10,000 residents ${against}`;
  const rank = Number.isInteger(row.tasteRank) ? `taste rank ${row.tasteRank} of ${ranked}` : "no taste rank (Qloo has no heatmap signal here, so no position among the ranked towns)";
  const reading = `${town} is ${GROUP_WORDS[row.group] || row.group} for ${industry}: ${rank}; ${density}. `
    + (row.group === "gap" ? "Taste above the median, few businesses per resident: a lead to visit, not demand." : row.group === "competitive" ? "Taste above the median, many businesses per resident: the figure is at or above the median, so never call it few."
      : row.group === "quiet" ? "Taste below the median, few businesses per resident." : row.group === "crowded" ? "Taste below the median, many businesses per resident." : "Not enough data to group.");
  return { town, group: row.group, groupEs: GROUP_ES[row.group] || row.group, tasteRank: row.tasteRank ?? null, ranked, establishments: row.establishments ?? null, establishmentsMax: row.establishmentsMax ?? null,
    suppressed: Boolean(row.suppressed), perTenThousand: row.suppressed ? null : figure(row.perTenThousand), perTenThousandMax: figure(row.perTenThousandMax), medianPerTenThousand: median, islandPerTenThousand: island, reading };
}

// Which town has fewer businesses per resident is decided here, never by the model (judge panel 10/24 round 3:
// it recommended Cayey for "less competition" while quoting Cayey 1.22 against Caguas 0.72 per 10,000).
export function townComparison(file, industry, towns) {
  // A suppressed row is a range from 0 to its upper bound, a published row a point; a row with no figure is left out.
  const lo = (r) => (r.suppressed ? 0 : r.perTenThousand);
  const hi = (r) => (r.suppressed ? r.perTenThousandMax : r.perTenThousand);
  const rows = [...new Set(towns)].map((t) => townReading(file, industry, t)).filter((r) => r && Number.isFinite(hi(r)));
  if (rows.length < 2) return null;
  const ordered = [...rows].sort((a, b) => hi(a) - hi(b) || lo(a) - lo(b) || a.town.localeCompare(b.town));
  const label = INDUSTRIES.find((row) => row.id === industry)?.label || { en: industry, es: industry };
  const part = (r) => (r.suppressed
    ? `${r.town} (no published count, 0 to ${r.perTenThousandMax} per 10,000, ${GROUP_WORDS[r.group] || r.group})`
    : `${r.town} (${r.establishments} establishments with employees, ${r.perTenThousand} per 10,000, ${GROUP_WORDS[r.group] || r.group})`);
  const parteEs = (r) => (r.suppressed
    ? `${r.town} (sin cifra publicada, de 0 a ${r.perTenThousandMax} por cada 10,000, ${r.groupEs})`
    : `${r.town} (${r.establishments} establecimientos con empleados, ${r.perTenThousand} por cada 10,000, ${r.groupEs})`);
  const first = ordered[0], last = ordered[ordered.length - 1];
  // A direction only when the ranges do not overlap; two equal published rates are equal, not ordered.
  const ordered2 = lo(last) > hi(first);
  const equal = !first.suppressed && !last.suppressed && first.perTenThousand === last.perTenThousand;
  const direction = ordered2 ? `${last.town} has more ${label.en} businesses per resident than ${first.town}.`
    : equal ? `${first.town} and ${last.town} have the same ${label.en} businesses per resident.`
    : `${first.town} and ${last.town} cannot be ordered: a withheld count may be below or above the other town's rate.`;
  const directionEs = ordered2 ? `${last.town} tiene más negocios de ${label.es} por residente que ${first.town}.`
    : equal ? `${first.town} y ${last.town} tienen la misma cifra de negocios de ${label.es} por residente.`
    : `${first.town} y ${last.town} no se pueden ordenar: una cifra retenida puede estar por debajo o por encima de la del otro pueblo.`;
  const sentence = `${label.en} businesses per resident, lowest first: ${ordered.map(part).join("; ")}. ${direction} Repeat this as given; never recompute it.`;
  const sentenceEs = `Negocios de ${label.es} por residente, de menor a mayor: ${ordered.map(parteEs).join("; ")}. ${directionEs} Repita esto tal cual; nunca lo recalcule.`;
  return { towns: ordered.map((r) => ({ town: r.town, group: r.group, groupEs: r.groupEs, suppressed: r.suppressed, establishments: r.establishments, perTenThousand: r.perTenThousand, perTenThousandMax: r.perTenThousandMax })),
    fewerPerResident: ordered2 ? first.town : null, morePerResident: ordered2 ? last.town : null, sentence, sentenceEs };
}

export function agentTools(api) {
  const text = { type: "string", maxLength: 100 };
  const town = { type: "string", enum: api.towns };
  const id = { type: "string", pattern: "^[0-9a-fA-F-]{36}$", maxLength: 36 };
  const type = { type: "string", enum: ["artist", "place", "brand", "movie", "tv_show", "book"] };
  const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
  const tool = (name, description, properties, required, run) => ({ name, description,
    parameters: { type: "object", properties, required, additionalProperties: false }, run });
  // Structured fields for the chat result cards; keep the older keys so existing tool contracts stay intact.
  const compact = (place) => ({
    id: place.id, name: place.name, town: place.municipality || place.city,
    kind: place.genre, category: place.category || "",
    lat: place.lat ?? null, lon: place.lon ?? null,
    logo: place.logo || "", qlooImage: place.qlooImage || "",
    website: place.website || "", domain: place.domain || "",
    affinity: Number.isFinite(place.affinity) ? place.affinity : null,
    why: place.why || affinityWhy(place.affinity, place.affinitySignal || "", place.whyLang || "en") || "",
    // A short description and three facts: two towns' lists in one round ran past the round budget and the second
    // town's list was dropped (judge panel 10/25 round 8: a Mayagüez-against-Caguas answer carried Caguas cards only).
    address: place.address, description: typeof place.description === "string" && place.description.length > 240 ? `${place.description.slice(0, 239)}…` : place.description,
    price: place.price, rating: place.rating ?? null, hours: place.hours || "",
    facts: place.facts?.slice(0, 3),
  });
  // The cards on screen are the places in the evidence line: the same eight (judge panel 10/23 saw
  // "8 places" beside fourteen cards).
  const list = (town, places, focus, extra = {}) => ({
    data: { source: "Qloo", town, places: places.slice(0, 8).map(compact), ...extra },
    ...(places.length ? { action: { type: "show_places", town, places: places.slice(0, 8), focus } } : {}),
  });
  const category = { type: "string", enum: CATEGORIES.map((row) => row.id) };
  const inCategory = (place, id) => (place.category || categoryOf(place.genreId, place.genre)) === id;
  const kit = async (name, args) => {
    const result = await api.callQloo(name, args);
    if (result?.status !== "ok" && result?.status !== "empty") return { error: "Qloo could not answer this request. Do not guess." };
    return { source: "Qloo", status: result.status, results: result.results?.slice(0, 6),
      note: "Affinity describes tastes, not sales, footfall or certainty of a viable business." };
  };
  // Weather around a Qloo answer: only registered when the server has a weather client.
  const weatherTool = api.weather ? [tool("town_weather",
    "Three-day National Weather Service forecast for a town, island-wide alerts and nearby Atlantic storms. Use it to shape a recommendation (rain, heat, a storm), then still name Qloo places. Not emergency guidance.",
    { town }, ["town"], async ({ town }) => {
      const [forecast, alerts, storms] = await Promise.all([api.weather.forecast(town), api.weather.alerts(), api.weather.storms()]);
      if (forecast.error) return { error: forecast.error };
      return { data: { source: "National Weather Service · National Hurricane Center", town, forecast, alerts, storms,
        note: "Use the weather to choose between Qloo places, not as the answer. Warnings come from weather.gov and nhc.noaa.gov; send people there for emergency decisions." },
      action: { type: "show_weather", town } };
    })] : [];
  return [
    tool("map_town", "Move the map to a Puerto Rico municipality.", { town }, ["town"], async ({ town }) => ({
      data: { town }, action: { type: "fly_town", town },
    })),
    ...weatherTool,
    tool("town_catalog", "List Qloo places by category, with verified town counts. Use for cafés, shops, hotels, restaurants.",
      { town, category: { type: "string", enum: ["all", ...api.categories] } }, ["town"], async ({ town, category = "all" }) => {
        const catalog = await api.catalogFor(town);
        const places = catalog.places.filter((row) => category === "all" || row.category === category).sort(api.byPopularity);
        return list(town, places.slice(0, 20).map(api.publishPlace), `${category} in ${town}`, { count: places.length, measured: catalog.measured });
      }),
    tool("find_places", "Find a named place in a town (mode name: matches names and kinds such as bakery, panadería, café), or search a strict Qloo taste tag (mode taste). A taste miss does not mean the town has none of that kind; use mode name or town_catalog before saying so. Do not invent results.",
      { town, query: text, mode: { type: "string", enum: ["name", "taste"] } }, ["town", "query", "mode"], async ({ town, query, mode }) => {
        if (mode === "taste") {
          const result = await api.tasteAnswer(query, town, query, "en", { strictOnly: true });
          const places = (result?.places || []).filter(place => fold(place.municipality || place.city) === fold(town));
          return list(town, places, `${query} in ${town}`, { note: places.length ? result.note : "No strict taste match in this town." });
        }
        const catalog = await api.catalogFor(town);
        const folded = fold(query);
        let places = catalog.places.filter((row) => api.placeMatches(row, folded));
        if (!places.length) places = (await api.qlooSearchRaw(query, town)).filter((row) => api.inTown(row, town) && api.placeMatches(row, folded));
        return list(town, places.slice(0, 20).map(api.publishPlace), `${query} in ${town}`, { count: places.length });
      }),
    tool("place_details", "Open a business card using a verified Qloo ID from the town catalog.", { town, id }, ["town", "id"], async ({ town, id }) => {
      const place = (await api.catalogFor(town)).places.find((row) => row.id === id);
      if (!place) return { error: "Place is not in this town's verified catalog." };
      const published = api.publishPlace(place);
      return { data: { source: "Qloo + Overture", ...compact(published) }, action: { type: "open_place", town, place: published } };
    }),
    tool("place_audience", "Who likes a verified place, from Qloo: age bands and gender compared with Qloo's average audience. Use it for who goes there, what customers, which ages. Affinity, not a customer count.",
      { town, id }, ["town", "id"], async ({ town, id }) => {
        const place = (await api.catalogFor(town)).places.find((row) => row.id === id);
        if (!place) return { error: "Place is not in this town's verified catalog." };
        const envelope = await api.callQloo("qloo_audience_demographics", { entity: id, entity_type: "place" });
        if (envelope?.status !== "ok" && envelope?.status !== "empty") return { error: "Qloo could not answer this request. Do not guess." };
        const lines = audienceLines(envelope.results?.[0]?.query);
        const any = lines.age.length || lines.gender.length;
        return { data: { source: "Qloo audience demographics", place: place.name, status: any ? "ok" : "empty", ...lines,
          note: any ? "Compared with Qloo's average audience: positive leans toward that group, negative away. Not a customer count." : "Qloo had no audience data for this place." } };
      }),
    tool("fans_also_love", "Artists and destinations liked by fans of a verified place. These are affinities, not sponsorships.",
      { town, id }, ["town", "id"], async ({ town, id }) => {
        if (!(await api.catalogFor(town)).places.some((row) => row.id === id)) return { error: "Unknown place ID." };
        const [artists, trips] = await Promise.all([api.qlooAlsoLike(id, "artist"), api.qlooAlsoLike(id, "destination")]);
        return { source: "Qloo cross-domain affinities", artists, trips };
      }),
    tool("artist_places", "Places an artist's fans like in a town, using Qloo cross-domain taste data. Pass category food when the question is where fans eat, drinks for where they go out; leave it out for a general question.",
      { town, artist: text, category }, ["town", "artist"], async ({ town, artist, category: only }) => {
        // Qloo files many bars under its restaurant genres, so "where do fans eat" read mostly bars (judge panels 10/25
        // rounds 7-8). For food, a deeper list is read and places that serve meals come before the bars, which stay last.
        const answer = await api.artistAnswer({ town, query: artist }, artist, "en", [], only === "food" ? { take: 30 } : {});
        let places = (answer?.places || []).filter((place) => !only || inCategory(place, only));
        const bars = only === "food" ? places.filter(isBar) : [];
        if (bars.length) places = [...places.filter((place) => !isBar(place)), ...bars];
        const shown = Math.min(places.length, 8), barsShown = Math.max(0, shown - (places.length - bars.length));
        const barNote = barsShown ? ` Qloo files ${barsShown} of these ${shown} as bars or lounges under restaurants; name places that serve meals first and call the bars bars.` : "";
        return list(town, places, `${artist} fans in ${town}`, { note: `${answer?.note || "No verified artist affinities found."}${barNote}`, ...(only ? { category: only } : {}) });
      }),
    // Island-wide, for "which town fits my Björk taste" (judge panel 10/25 round 8: with no tool to rank towns by an
    // artist, the answer fell back to the open town).
    tool("artist_towns", "Which Puerto Rico towns lean most toward an artist's fans' taste, island-wide, from Qloo's heatmap. Use it for which town fits an artist or where on the island their fans lean; then artist_places for places in one of those towns.",
      { artist: text }, ["artist"], async ({ artist }) => {
        const result = await api.artistTowns(artist);
        if (!result?.towns?.length) return { error: result?.error || "Qloo could not answer this request. Do not guess." };
        // No map action: the answer may lead with another town than the first row (a thin reading, or a business gap
        // town), so the model moves the map with map_town to the town it names.
        return { data: { source: "Qloo heatmap", ...result,
          note: "Towns ranked by the artist's taste signal averaged over each town's map cells; a town with under 10 cells is a thin reading. Affinity, not visits, sales or demand. Call map_town for the town you lead with." } };
      }),
    tool("town_profile", "Town cultural tastes, observed supply and Census PRCS demographics with survey period and margins of error. Qloo affinity is not business demand.", { town }, ["town"], async ({ town }) => ({
      source: "Qloo locality · Overture · Wikidata · Census PRCS", town, profile: await api.townProfile(town), ...api.townStats(town),
    })),
    tool("landmarks", "Verified Wikidata landmarks in the town.", { town }, ["town"], async ({ town }) => ({
      source: "Wikidata", town, landmarks: api.landmarksOf(town).slice(0, 8).map(({ name, wikipedia, types }) => ({ name, wikipedia, types })),
    })),
    tool("town_history", "Town history from Wikipedia, separate from Qloo.", { town }, ["town"], async ({ town }) => ({
      source: "Wikipedia", town, history: await api.townHistory(town),
    })),
    tool("qloo_describe", "Describe an artist, brand, film or book using Qloo metadata. For places use place_details.",
      { entity: text, type: { type: "string", enum: ["artist", "brand", "movie", "tv_show", "book"] } }, ["entity", "type"],
      ({ entity, type }) => kit("qloo_describe", { entity, type })),
    tool("qloo_recommend", "Cross-domain taste recommendations in Puerto Rico. Use find_places for strict dishes.",
      { entity: text, target_type: type, town }, ["entity", "target_type", "town"], ({ entity, target_type, town }) =>
        kit("qloo_recommend", { signals: [entity], target_type, filter_location: `${town}, Puerto Rico`, limit: 6 })),
    tool("qloo_compare_audiences", "Compare taste affinities between two artists or brands; never infer sales.",
      { a: text, b: text, target_type: type }, ["a", "b", "target_type"], ({ a, b, target_type }) =>
        kit("qloo_compare_audiences", { group_a: [a], group_b: [b], target_type, limit: 6 })),
    tool("qloo_entity_tags", "Qloo concepts associated with an artist or brand.", { entity: text, type }, ["entity", "type"], ({ entity, type }) =>
      kit("qloo_entity_tags", { entities: [entity], entity_type: type, limit: 6 })),
    tool("qloo_trends", "Qloo popularity trends over a date range. May be unavailable on the hackathon API.",
      { entity: text, type, start_date: date, end_date: date }, ["entity", "type", "start_date", "end_date"], ({ entity, type, start_date, end_date }) => {
        if (start_date > end_date || new Date(start_date).toISOString().slice(0, 10) !== start_date
          || new Date(end_date).toISOString().slice(0, 10) !== end_date) return { error: "Invalid date range." };
        return kit("qloo_trends", { entities: [entity], entity_type: type, start_date, end_date, limit: 6 });
      }),
    tool("opportunity_map", "Where in Puerto Rico a taste is above the median and businesses are few, for one industry: Qloo heatmap taste against Census businesses per 10,000 residents, in four groups. Not demand or profit. To compare towns, pass towns (two to four): the result carries the comparison sentence to repeat.",
      { industry: { type: "string", enum: INDUSTRIES.map((industry) => industry.id) }, town, towns: { type: "array", items: town, maxItems: 4 } }, ["industry"], async ({ industry, town: asked, towns: compared }) => {
        const file = api.opportunityFor?.(industry);
        if (!file) return { error: "Opportunity data is unavailable for this industry." };
        // One town's row beside the island figure, read as a sentence the model can repeat without
        // contradicting it (judge panel 10/23: "pocos negocios por habitante" at 2.8 against 0.8).
        const townRow = asked ? townReading(file, industry, asked) : undefined;
        const comparison = Array.isArray(compared) && compared.length >= 2 ? townComparison(file, industry, compared) : null;
        const byRank = [...file.towns].sort((a, b) => (a.tasteRank ?? Infinity) - (b.tasteRank ?? Infinity) || a.town.localeCompare(b.town));
        const groups = Object.fromEntries(["gap", "competitive", "quiet", "crowded", "unknown"].map((group) => [group,
          byRank.filter((row) => row.group === group).map((row) => row.town)]));
        return { data: { source: "Qloo heatmap · Census County Business Patterns 2023 · Census PRCS 2020–2024", industry,
          ...(asked ? { town: townRow } : {}),
          ...(comparison ? { comparison } : {}),
          ...(file.sources?.qloo?.retrievedAt ? { retrievedAt: file.sources.qloo.retrievedAt } : {}),
          medians: file.medians, notes: file.notes.en, groups,
          // A withheld count is a range, never a rate of zero (judge panel 10/24 round 4: "la tasa es 0 por cada 10,000").
          topGaps: byRank.filter((row) => row.group === "gap").slice(0, 5).map(({ town, tasteRank, suppressed, perTenThousand, perTenThousandMax }) =>
            ({ town, tasteRank, suppressed, perTenThousand: suppressed ? null : perTenThousand, perTenThousandMax })) },
        // The town the tool was asked about rides on the action, so the map, URL and composer follow it
        // (judge panel 10/24 round 4: a San Juan bakery answer left the page on Ponce).
        action: { type: "show_opportunity", industry, ...(asked && api.towns.includes(asked) ? { town: asked } : {}), ...(comparison ? { towns: compared } : {}) } };
      }),
  ];
}
