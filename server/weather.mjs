// Weather around a Qloo answer: the National Weather Service forecast and alerts for a town, and
// the National Hurricane Center's active storms near the island. Free feeds, no keys. The model
// uses them to shape a recommendation; the map shows rain when the model mentions it. Nothing here
// is emergency guidance: every digest names its authority.
import { fold } from "./lib.mjs";

const AGENT = "zemi-aku/1.0 (zemi.r21digital.com; contact via the site)";
const ISLAND = { lat: 18.22, lon: -66.5 };
const KINDS = { HU: "Hurricane", TS: "Tropical Storm", TD: "Tropical Depression", PTC: "Potential Tropical Cyclone", STS: "Subtropical Storm", SD: "Subtropical Depression" };
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function digestForecast(body, { periods: count = 6 } = {}) {
  const list = (body?.properties?.periods || []).slice(0, count).map((period) => {
    const unit = period.temperatureUnit === "C" ? "C" : "F";
    const value = Number(period.temperature);
    const fahrenheit = unit === "F" ? value : Math.round(value * 9 / 5 + 32);
    const pop = period.probabilityOfPrecipitation?.value;
    return {
      name: period.name,
      start: period.startTime,
      daytime: Boolean(period.isDaytime),
      fahrenheit,
      celsius: Math.round((fahrenheit - 32) * 5 / 9),
      rainChance: Number.isFinite(Number(pop)) && pop !== null ? Number(pop) : null,
      wind: [period.windSpeed, period.windDirection].filter(Boolean).join(" "),
      forecast: period.shortForecast || "",
    };
  });
  return { source: "National Weather Service", updated: body?.properties?.updateTime || body?.properties?.updated || null, periods: list };
}

export function digestAlerts(body) {
  const alerts = (body?.features || []).map(({ properties: p = {} }) => ({
    event: p.event || "", severity: p.severity || "", areas: p.areaDesc || "",
    onset: p.onset || null, ends: p.ends || p.expires || null, headline: p.headline || "",
  }));
  return { source: "National Weather Service", count: alerts.length, alerts, authority: "weather.gov" };
}

function km(a, b) {
  const D = Math.PI / 180;
  const dLat = (b.lat - a.lat) * D, dLon = (b.lon - a.lon) * D;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

// Atlantic basin only (NHC ids start with "al"), within 2,500 km: a storm that could matter to a
// trip this week, not every system in the hemisphere.
export function nearbyStorms(body, { within = 2500 } = {}) {
  const storms = (body?.activeStorms || [])
    .filter((storm) => /^al/i.test(storm.id || "") && Number.isFinite(storm.latitudeNumeric) && Number.isFinite(storm.longitudeNumeric))
    .map((storm) => ({
      name: storm.name, kind: KINDS[storm.classification] || storm.classification || "",
      knots: Number(storm.intensity) || null, lat: storm.latitudeNumeric, lon: storm.longitudeNumeric,
      moving: Number.isFinite(storm.movementDir) ? `${COMPASS[Math.round(storm.movementDir / 22.5) % 16]} at ${storm.movementSpeed} kt` : "",
      kmFromPuertoRico: km(ISLAND, { lat: storm.latitudeNumeric, lon: storm.longitudeNumeric }),
      updated: storm.lastUpdate || null,
    }))
    .filter((storm) => storm.kmFromPuertoRico <= within)
    .sort((a, b) => a.kmFromPuertoRico - b.kmFromPuertoRico);
  return { source: "National Hurricane Center", storms, authority: "nhc.noaa.gov" };
}

export function createWeather({ fetchImpl = fetch, centers, now = Date.now, ttlMs = 30 * 60 * 1000 } = {}) {
  const cache = new Map();
  const headers = { "User-Agent": AGENT, Accept: "application/geo+json, application/json" };
  async function getJson(url) {
    const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }
  // One fetch per key per TTL; a failure is not cached, so the next ask tries again.
  async function cached(key, ttl, load) {
    const hit = cache.get(key);
    if (hit && hit.until > now()) return hit.value;
    const value = await load();
    cache.set(key, { value, until: now() + ttl });
    return value;
  }
  const outage = (what) => ({ error: `${what} is unavailable right now.` });
  return {
    async forecast(town) {
      const center = centers.get(fold(town));
      if (!center) return { error: "Unknown town." };
      try {
        return await cached(`forecast:${fold(town)}`, ttlMs, async () => {
          const point = await getJson(`https://api.weather.gov/points/${center.lat.toFixed(4)},${center.lon.toFixed(4)}`);
          const body = await getJson(point.properties.forecast);
          return { town, ...digestForecast(body) };
        });
      } catch { return outage("Weather"); }
    },
    async alerts() {
      try {
        return await cached("alerts", 10 * 60 * 1000, async () => digestAlerts(await getJson("https://api.weather.gov/alerts/active?area=PR")));
      } catch { return outage("Alert data"); }
    },
    async storms() {
      try {
        return await cached("storms", ttlMs, async () => nearbyStorms(await getJson("https://www.nhc.noaa.gov/CurrentStorms.json")));
      } catch { return outage("Storm data"); }
    },
    // RainViewer's tile manifest: the newest radar and infrared frames. Tiles load in the browser.
    async radar() {
      try {
        return await cached("radar", 5 * 60 * 1000, async () => {
          const body = await getJson("https://api.rainviewer.com/public/weather-maps.json");
          const last = (list) => (list || []).at(-1) || null;
          return { source: "RainViewer", host: body.host, radar: last(body.radar?.past), infrared: last(body.satellite?.infrared) };
        });
      } catch { return outage("Rain radar"); }
    },
  };
}
