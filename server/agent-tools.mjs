import { fold, affinityWhy } from "./lib.mjs";
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
  const density = row.suppressed
    ? `no published count below 3, so 0 to ${row.establishmentsMax ?? 2} establishments`
    : `${row.establishments} establishments with employees, ${figure(row.perTenThousand)} per 10,000 residents ${against}`;
  const reading = `${town} is ${GROUP_WORDS[row.group] || row.group} for ${industry}: taste rank ${row.tasteRank ?? "unranked"} of ${ranked}; ${density}. `
    + (row.group === "gap" ? "Strong taste, few businesses: a lead to visit, not demand." : row.group === "competitive" ? "Strong taste, many businesses: the figure is at or above the median, so never call it few."
      : row.group === "quiet" ? "Less taste, few businesses." : row.group === "crowded" ? "Less taste, many businesses." : "Not enough data to group.");
  return { town, group: row.group, groupEs: GROUP_ES[row.group] || row.group, tasteRank: row.tasteRank ?? null, ranked, establishments: row.establishments ?? null, establishmentsMax: row.establishmentsMax ?? null,
    suppressed: Boolean(row.suppressed), perTenThousand: figure(row.perTenThousand), perTenThousandMax: figure(row.perTenThousandMax), medianPerTenThousand: median, islandPerTenThousand: island, reading };
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
    address: place.address, description: place.description,
    price: place.price, rating: place.rating ?? null, hours: place.hours || "",
    facts: place.facts?.slice(0, 6),
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
    tool("find_places", "Find a named place in a town, or search a strict food/taste tag. Do not invent results.",
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
    tool("fans_also_love", "Artists and destinations liked by fans of a verified place. These are affinities, not sponsorships.",
      { town, id }, ["town", "id"], async ({ town, id }) => {
        if (!(await api.catalogFor(town)).places.some((row) => row.id === id)) return { error: "Unknown place ID." };
        const [artists, trips] = await Promise.all([api.qlooAlsoLike(id, "artist"), api.qlooAlsoLike(id, "destination")]);
        return { source: "Qloo cross-domain affinities", artists, trips };
      }),
    tool("artist_places", "Places an artist's fans like in a town, using Qloo cross-domain taste data. Pass category food when the question is where fans eat, drinks for where they go out; leave it out for a general question.",
      { town, artist: text, category }, ["town", "artist"], async ({ town, artist, category: only }) => {
        const answer = await api.artistAnswer({ town, query: artist }, artist, "en");
        const places = (answer?.places || []).filter((place) => !only || inCategory(place, only));
        return list(town, places, `${artist} fans in ${town}`, { note: answer?.note || "No verified artist affinities found.", ...(only ? { category: only } : {}) });
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
    tool("opportunity_map", "Where in Puerto Rico a taste is strong and businesses are few, for one industry: Qloo heatmap taste against Census businesses per 10,000 residents, in four groups. Not demand or profit.",
      { industry: { type: "string", enum: INDUSTRIES.map((industry) => industry.id) }, town }, ["industry"], async ({ industry, town: asked }) => {
        const file = api.opportunityFor?.(industry);
        if (!file) return { error: "Opportunity data is unavailable for this industry." };
        // One town's row beside the island figure, read as a sentence the model can repeat without
        // contradicting it (judge panel 10/23: "pocos negocios por habitante" at 2.8 against 0.8).
        const townRow = asked ? townReading(file, industry, asked) : undefined;
        const byRank = [...file.towns].sort((a, b) => (a.tasteRank ?? Infinity) - (b.tasteRank ?? Infinity) || a.town.localeCompare(b.town));
        const groups = Object.fromEntries(["gap", "competitive", "quiet", "crowded", "unknown"].map((group) => [group,
          byRank.filter((row) => row.group === group).map((row) => row.town)]));
        return { data: { source: "Qloo heatmap · Census County Business Patterns 2023 · Census PRCS 2020–2024", industry,
          ...(asked ? { town: townRow } : {}),
          ...(file.sources?.qloo?.retrievedAt ? { retrievedAt: file.sources.qloo.retrievedAt } : {}),
          medians: file.medians, notes: file.notes.en, groups,
          topGaps: byRank.filter((row) => row.group === "gap").slice(0, 5).map(({ town, tasteRank, suppressed, perTenThousand, perTenThousandMax }) =>
            ({ town, tasteRank, suppressed, perTenThousand, perTenThousandMax })) },
        action: { type: "show_opportunity", industry } };
      }),
  ];
}
