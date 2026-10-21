// The with-and-without-Qloo control (plan item 3): six frozen prompts and a pure comparison of two
// runs of the same prompt, one with the Qloo tools and one without. The script writes the result to
// data/compare-qloo.json; the page reads it. Nothing here calls a model.
import { fold } from "./lib.mjs";

export const PROMPTS = [
  { id: "bad-bunny", lang: "en", question: "Where do Bad Bunny fans eat in Bayamón?" },
  { id: "bayamon-cafe", lang: "en", question: "Which cafés in Bayamón are good for a morning meeting?" },
  { id: "maricao", lang: "en", question: "What is there to do in Maricao?" },
  { id: "mofongo", lang: "es", question: "¿Dónde comer mofongo en Ponce?" },
  { id: "rincon-rain", lang: "en", question: "Plan a rainy afternoon in Rincón." },
  { id: "calle-13", lang: "en", question: "Which town should I visit if I like Calle 13?" },
];

// The catalog places a run put on the map: every show_places list and every opened place.
export function mapPlaces(run) {
  const seen = new Map();
  for (const action of run?.actions || []) {
    const places = action.type === "show_places" && Array.isArray(action.places) ? action.places
      : action.type === "open_place" && action.place ? [action.place] : [];
    for (const place of places) if (place?.name && !seen.has(place.id || place.name)) seen.set(place.id || place.name, place.name);
  }
  return [...seen.values()];
}

// A place counts as named when its folded name appears in the folded answer. One-word names (a town,
// "Ponce") are skipped: they match prose by accident and say nothing about the catalog.
function namedIn(speech, names) {
  const text = ` ${fold(speech || "")} `;
  return names.filter((name) => fold(name).trim().includes(" ") && text.includes(fold(name)));
}

export function compareRuns(withRun, withoutRun) {
  const catalog = mapPlaces(withRun);
  const named = { with: namedIn(withRun?.speech, catalog), without: namedIn(withoutRun?.speech, catalog) };
  const onlyWith = named.with.filter((name) => !named.without.includes(name));
  const onlyWithout = named.without.filter((name) => !named.with.includes(name));
  return {
    catalog: catalog.length,
    named,
    onlyWith,
    onlyWithout,
    qlooAddedNothing: named.with.length === 0 || (onlyWith.length === 0 && onlyWithout.length === 0),
    tools: { with: (withRun?.evidence?.calls || []).length, without: (withoutRun?.evidence?.calls || []).length },
  };
}
