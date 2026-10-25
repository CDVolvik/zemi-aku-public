import fs from "node:fs";
import { categoryOf } from "./catalog.mjs";

export const PORT_DATA = JSON.parse(fs.readFileSync(new URL("../data/coastal-ports.json", import.meta.url), "utf8"));
export const PORTS = PORT_DATA.ports;
const leisure = new Set(["food", "drinks", "culture", "fun", "outdoors"]);

export function distanceKm(a, b) {
  const rad = n => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function nearbyPlaces(port, places, category = "all") {
  return places.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .filter(p => category === "all" ? leisure.has(categoryOf(p.genreId, p.genre)) : categoryOf(p.genreId, p.genre) === category)
    .map(p => ({ ...p, distanceKm: distanceKm(port, p) }))
    .filter(p => p.distanceKm <= 5)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 12);
}

export function createCoastalDiscovery({ catalog, artist, publish = p => p }) {
  // lang "es" answers in Spanish: the errors, the scope line, the note and the heading the page shows.
  return async function discover({ port: id, category = "all", artist: query = "", lang = "en" }) {
    const es = lang === "es";
    const port = PORTS.find(p => p.id === id);
    if (!port) return { error: es ? "Escoja un puerto de Puerto Rico de la lista." : "Choose a listed Puerto Rico port." };
    if (category !== "all" && !leisure.has(category)) return { error: es ? "Escoja una categoría disponible." : "Choose a supported category." };
    if (typeof query !== "string" || (query && (query.trim().length < 3 || query.length > 80 || /[\u0000-\u001f\u007f]/.test(query)))) {
      return { error: es ? "Escriba el nombre de un artista de 3 a 80 caracteres." : "Enter an artist name between 3 and 80 characters." };
    }
    const affinity = query ? await artist({ query: query.trim(), town: port.town }, query.trim(), es ? "es" : "en", [], { exploreOnly: true }) : null;
    const records = query ? affinity?.places || [] : await catalog(port.town);
    const nearby = nearbyPlaces(port, records, category);
    const name = affinity?.journey?.artist || query;
    const scope = es
      ? "A menos de 5 km del punto de referencia del puerto, en línea recta, no a pie. El acceso por agua y las salidas de la terminal pueden ser distintos."
      : "Within 5 km of the harbor reference point, measured in a straight line, not walking distance. Access across water and terminal exits may differ.";
    const note = es
      ? (query
        ? `${nearby.length ? `Afinidades de Qloo para ${name}` : `Qloo no devolvió afinidades para ${query} a menos de 5 km`}. Son afinidades del público, no visitas del artista. ${scope}`
        : `Lugares cercanos del catálogo guardado de Qloo para ${port.town}. Ordenados por distancia, no por gusto personal. ${scope}`)
      : (query
        ? `${nearby.length ? `Qloo taste matches for ${name}` : `Qloo returned no taste matches for ${query} within 5 km`}. These are audience affinities, not artist visits. ${scope}`
        : `Nearby places from Qloo's saved ${port.town} catalog. Ranked by distance, not personal taste. ${scope}`);
    return { catalog: true, port, town: port.town, focus: es ? `En tierra, ${port.town}` : `Ashore in ${port.town}`, relationship: query ? "affinity" : "proximity",
      measured: PORT_DATA.retrieved, note, places: nearby.map(p => ({ ...(query ? p : publish(p)), distanceKm: Number(p.distanceKm.toFixed(2)) })),
      ...(affinity?.journey ? { journey: affinity.journey } : {}) };
  };
}
