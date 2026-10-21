// "More like these": the places an answer named, sent to Qloo together as one entity signal.
// The seeds come back out of the list, the first three get photos, and the line names them.
const nameList = (names, lang) => names.length < 2 ? names.join("")
  : names.slice(0, -1).join(", ") + (lang === "es" ? " y " : " and ") + names[names.length - 1];

// deps: alsoLike(entityId, type, opts), seedNames(ids) → [{id, name}], attachOsm(places), publishPlace
export async function moreLikeThese({ ids, town = "", lang = "en" }, deps) {
  const seeds = await deps.seedNames(ids);
  const seedLine = nameList(seeds.map((seed) => seed.name), lang);
  const location = town ? `${town}, Puerto Rico` : "Puerto Rico";
  const rows = await deps.alsoLike(ids.join(","), "place", { take: 12, location });
  const places = rows.filter((row) => !ids.includes(row.id)).map((row) => ({ ...row, socials: [] }));
  await deps.attachOsm(places.slice(0, 3));
  const published = places.map(deps.publishPlace);
  const named = nameList(published.slice(0, 3).map((place) => place.name), lang);
  const es = lang === "es";
  const speech = !published.length
    ? (es ? `Qloo no encontró más lugares como ${seedLine}.` : `Qloo found no more places like ${seedLine}.`)
    : (es ? `Qloo conecta estos con ${seedLine}: ${named}.` : `Qloo links these to ${seedLine}: ${named}.`);
  return {
    town, places: published, speech,
    focus: es ? "Más como estos" : "More like these",
    qloo: `GET /v2/insights · place · signal.interests.entities (${ids.length}) · filter.location.query "${location}"`,
  };
}
