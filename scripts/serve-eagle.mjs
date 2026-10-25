// Eagle-eye server. Static files, plus town places and a grounded answer.
// The Qloo key stays in .env. It is never sent to the browser.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fold, inTown, priceLabel, splitTown, audienceLines, pickTasteTag, tasteLabel, musicAsk, qlooImageOf, domainOf, affinityOf, affinityWhy } from "../server/lib.mjs";
import { qlooTools } from "../server/qloo-mcp.mjs";
import { attachListenRelay } from "../server/listen-relay.mjs";
import { createLimiter, dailyCap, rateGate, ROUTE_LIMITS } from "../server/limits.mjs";
import { VOICES, DEFAULT_VOICE, voiceFor } from "../server/voices.mjs";
import { speechFor, firstSentence } from "../server/brain.mjs";
import { CATEGORIES, categoryOf, summarize } from "../server/catalog.mjs";
import { smallTalkKind, guideKind, vagueKind, chatReply } from "../server/chat.mjs";
import { createBusinessDiscovery } from "../server/business.mjs";
import { checkTester, testersCsv } from "../server/testers.mjs";
import { createTesterDelivery } from "../server/tester-delivery.mjs";
import { handleConfig } from "../server/beta.mjs";
import crypto from "node:crypto";
import { createAgent, createSpendLedger, checkChat, MODEL, createNote, spokenExcerpt } from "../server/agent.mjs";
import { agentTools, withoutQloo, catalogOnly } from "../server/agent-tools.mjs";
import { createSamples } from "../server/samples.mjs";
import { createWeather } from "../server/weather.mjs";
import { createMcpHandler, mcpBudget, mcpTools } from "../server/mcp.mjs";
import { createOpportunity } from "../server/opportunity.mjs";
import { attachVoiceAgent } from "../server/voice-agent.mjs";
import { createDiscovery } from "../server/discovery.mjs";
import { PORT_DATA, createCoastalDiscovery } from "../server/coastal.mjs";
import { createShipFeed } from "../server/ships.mjs";
import { moreLikeThese } from "../server/alike.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json",
};

function loadEnv() {
  const file = path.join(root, ".env");
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
  return values;
}
const projectEnv = loadEnv();
const shipFeed = createShipFeed({ key: fs.existsSync(path.join(root, ".env")) ? projectEnv.AISSTREAM_API_KEY : process.env.AISSTREAM_API_KEY, enabled: process.env.ZEMI_AIS_ENABLED === "1" });

const cache = new Map();

// Public URL protection. Per-visitor requests per minute, and daily budgets shared by everyone.
const limiter = createLimiter();
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const CAPS = {
  speakChars: dailyCap(process.env.ZEMI_SPEAK_CHARS_PER_DAY, 150000),
  listenSeconds: dailyCap(process.env.ZEMI_LISTEN_MINUTES_PER_DAY, 120) * 60,
  qlooCalls: dailyCap(process.env.ZEMI_QLOO_CALLS_PER_DAY, 6000),
};
// The MCP connector's own allowance, and the Qloo calls it must leave for the web demo. Kept out of
// CAPS: the reserve is not a spending cap, and a zero Qloo cap already stops the connector.
const MCP_CAPS = {
  calls: dailyCap(process.env.ZEMI_MCP_CALLS_PER_DAY, 150),
  qlooReserve: dailyCap(process.env.ZEMI_MCP_QLOO_RESERVE, 200),
};
// One visitor may use this many model turns a day; past it the rule-based router answers. Judges on a
// shared platform address get the per-minute allowance; this only stops one tab draining the day.
const CHAT_TURNS_PER_VISITOR = 40;
setInterval(() => limiter.sweep(), 60000).unref();
const PUBLIC_DIRS = [path.join(root, "app"), path.join(root, "data")];
// Qloo official harness over MCP: find_tags, audience_demographics, where_popular.
// The daily allowance is charged per upstream call, after the harness cache, so repeats of one request cost nothing.
const callQloo = qlooTools(root, { charge: () => limiter.spend("qloo-calls", 1, CAPS.qlooCalls) });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tagNames(entity) {
  const bags = [entity.tags, entity.properties?.tags].filter(Boolean);
  const names = [];
  for (const bag of bags) {
    for (const tag of Array.isArray(bag) ? bag : []) {
      const name = typeof tag === "string" ? tag : tag?.name;
      if (name && !names.includes(name)) names.push(name);
      if (names.length === 6) return names;
    }
  }
  return names;
}

function safeHttp(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function hostOf(value) {
  const safe = safeHttp(value);
  if (!safe) return "";
  return new URL(safe).host.replace(/^www\./, "");
}

function telHref(phone) {
  const text = String(phone ?? "").trim();
  if (!text) return "";
  if (text.startsWith("+") && text.replace(/\D/g, "").length > 8) return "tel:" + text.replace(/[^\d+]/g, "");
  const digits = text.replace(/\D/g, "");
  if (digits.length === 10) return "tel:+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "tel:+" + digits;
  return "";
}

function clock(value) {
  const match = String(value ?? "").match(/T(\d{2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "pm" : "am"}`;
}

function todayHours(hours) {
  if (!hours || typeof hours !== "object") return "";
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  const spans = Array.isArray(hours[day]) ? hours[day] : [];
  const open = spans.filter((span) => span && !span.closed && span.opens && span.closes);
  if (open.length) return "Today " + open.map((span) => `${clock(span.opens)}–${clock(span.closes)}`).join(", ");
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const publishesHours = days.some((name) => (hours[name] || []).some((span) => span && !span.closed && span.opens && span.closes));
  return publishesHours && spans.some((span) => span?.closed) ? "Closed today" : "";
}

function fact(facts, label, text, href, source) {
  if (!text) return;
  const same = facts.find((item) => item.label === label && item.href === (href || "") && item.text === text);
  if (same) {
    if (!same.source.includes(source)) same.source += " · " + source;
    return;
  }
  facts.push({ label, text, href: href || "", source });
}

const NETWORKS = [
  { keys: ["instagram", "contact:instagram"], label: "Instagram", hosts: ["instagram.com"], profile: (handle) => "https://www.instagram.com/" + handle + "/" },
  { keys: ["facebook", "contact:facebook"], label: "Facebook", hosts: ["facebook.com", "fb.com"], profile: (handle) => "https://www.facebook.com/" + handle },
  { keys: ["twitter", "contact:twitter"], label: "X", hosts: ["twitter.com", "x.com"], profile: (handle) => "https://x.com/" + handle },
  { keys: ["tiktok", "contact:tiktok"], label: "TikTok", hosts: ["tiktok.com"], profile: (handle) => "https://www.tiktok.com/@" + handle },
  { keys: ["youtube", "contact:youtube"], label: "YouTube", hosts: ["youtube.com", "youtu.be"], profile: () => "" },
];

function socialHref(network, raw) {
  const value = String(raw ?? "").trim();
  if (!value || /\s/.test(value)) return "";
  if (/^https?:\/\//i.test(value)) {
    const safe = safeHttp(value);
    const host = hostOf(safe);
    if (!safe || !network.hosts.some((item) => host === item || host.endsWith("." + item))) return "";
    return safe;
  }
  const handle = value.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{2,50}$/.test(handle)) return "";
  return network.profile(handle);
}

function metersBetween(aLat, aLon, bLat, bLon) {
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLon = (bLon - aLon) * Math.PI / 180;
  const step = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(step));
}

function namesAgree(left, right) {
  const a = fold(left);
  const b = fold(right);
  if (!a || !b) return false;
  if (a === b || (a.length >= 8 && b.includes(a)) || (b.length >= 8 && a.includes(b))) return true;
  const skip = new Set(["the", "and", "hotel", "resort"]);
  const words = (value) => value.split(" ").filter((word) => word.length > 2 && !skip.has(word));
  const leftWords = words(a);
  const rightWords = new Set(words(b));
  if (leftWords.length < 2) return false;
  const shared = leftWords.filter((word) => rightWords.has(word)).length;
  return shared >= 2 && shared / leftWords.length >= 0.6;
}

// A real picture for every listing. Qloo's Google photo links come back 403, so: a Wikimedia photo
// of the business when one exists, otherwise Esri's aerial of its exact spot (no key, centred).
function aerialUrl(lat, lon) {
  if (lat == null || lon == null) return "";
  const dLon = 0.0009;
  const dLat = 0.00068;
  return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?"
    + `bbox=${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}&bboxSR=4326&imageSR=3857&size=480,360&format=jpg&f=image`;
}

const textOf = (value) => (typeof value === "string" ? value.trim() : "");
const namesOf = (list, take = 8) => (Array.isArray(list) ? list : [])
  .map((item) => (typeof item === "string" ? item : item?.name))
  .filter(Boolean)
  .slice(0, take);

function priceRangeOf(range) {
  if (!range || !Number.isFinite(range.from)) return "";
  const sign = String(range.currency || "usd").toLowerCase() === "usd" ? "$" : "";
  return Number.isFinite(range.to) && range.to !== range.from ? `${sign}${range.from}–${sign}${range.to}` : `${sign}${range.from}`;
}

// Everything else Qloo writes about a place, for the business card.
function qlooDetails(p = {}) {
  const keywords = (Array.isArray(p.keywords) ? p.keywords : [])
    .filter((k) => k?.name)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 8)
    .map((k) => k.name);
  const features = [
    p.parking === true ? "Parking" : "",
    p.live_music === true ? "Live music" : "",
    p.pet_friendly === true ? "Pet friendly" : "",
  ].filter(Boolean);
  return {
    standout: textOf(p.unique_selling_points),
    ambience: textOf(p.ambience_description),
    setting: textOf(p.physical_setting_description),
    amenities: textOf(p.amenities_description),
    cuisine: textOf(p.cuisine_description),
    service: textOf(p.service_description),
    crowd: textOf(p.customer_demographics_description),
    dishes: namesOf(p.specialty_dishes),
    goodFor: namesOf(p.good_for),
    keywords,
    features,
    priceRange: priceRangeOf(p.price_range),
    menu: safeHttp(p.menu_url || ""),
  };
}

function mapPlace(entity) {
  const website = safeHttp(entity.properties?.website || "");
  const placeId = entity.external?.google_place?.[0]?.place_id || "";
  const genre = entity.properties?.primary_genre?.name
    || (entity.tags || []).find((tag) => String(tag?.type || "").includes("genre"))?.name
    || "";
  const affinity = affinityOf(entity);
  return {
    id: entity.entity_id || "",
    name: entity.name,
    description: entity.properties?.short_description || entity.properties?.description || "",
    priceLevel: entity.properties?.price_level ?? null,
    municipality: entity.properties?.geocode?.admin2_region || "",
    popularity: entity.popularity ?? null,
    rating: typeof entity.properties?.business_rating === "number"
      ? Math.round(entity.properties.business_rating * 10) / 10
      : null,
    lat: entity.location?.lat ?? null,
    lon: entity.location?.lon ?? null,
    address: entity.properties?.address || "",
    neighborhood: entity.properties?.neighborhood || "",
    city: entity.properties?.geocode?.city || entity.properties?.geocode?.name || "",
    tags: tagNames(entity),
    genre,
    genreId: entity.properties?.primary_genre?.id || "",
    hours: todayHours(entity.properties?.hours),
    phone: typeof entity.properties?.phone === "string" ? entity.properties.phone.trim() : "",
    website,
    domain: domainOf(website),
    qlooImage: qlooImageOf(entity),
    image: "",
    affinity,
    why: "",
    google: placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entity.name)}&query_place_id=${encodeURIComponent(placeId)}`
      : "",
    osmWebsite: "",
    osmPhone: "",
    osmHours: "",
    socials: [],
    osm: "none",
    aerial: aerialUrl(entity.location?.lat, entity.location?.lon),
    details: qlooDetails(entity.properties),
  };
}

function mergeOsm(place, tags) {
  const website = safeHttp(tags.website || tags["contact:website"] || "");
  const phone = tags.phone || tags["contact:phone"] || "";
  if (website && !place.osmWebsite) place.osmWebsite = website;
  if (phone && !place.osmPhone) place.osmPhone = String(phone).trim();
  if (!place.hours && !place.osmHours && tags.opening_hours) place.osmHours = String(tags.opening_hours).slice(0, 80);
  for (const [key, value] of Object.entries(tags)) {
    const network = NETWORKS.find((item) => item.keys.includes(key) || key.toLowerCase().includes(item.label.toLowerCase()));
    if (!network || place.socials.some((item) => item.label === network.label)) continue;
    const href = socialHref(network, value);
    if (!href) continue;
    place.socials.push({ label: network.label, text: network.label, href, source: "OpenStreetMap" });
  }
}

function publishPlace(place) {
  const facts = [];
  fact(facts, "Address", place.address, "", "Qloo");
  fact(facts, "Hours", place.hours, "", "Qloo");
  fact(facts, "Hours", place.osmHours, "", "OpenStreetMap");
  fact(facts, "Phone", place.phone, telHref(place.phone), "Qloo");
  const digits = (value) => String(value ?? "").replace(/\D/g, "");
  if (place.osmPhone && digits(place.osmPhone) !== digits(place.phone)) {
    fact(facts, "Phone", place.osmPhone, telHref(place.osmPhone), "OpenStreetMap");
  } else if (place.osmPhone && place.phone) {
    const row = facts.find((item) => item.label === "Phone");
    if (row) row.source += " · OpenStreetMap";
  }
  fact(facts, "Website", hostOf(place.website), place.website, "Qloo");
  if (place.osmWebsite && hostOf(place.osmWebsite) !== hostOf(place.website)) {
    fact(facts, "Website", hostOf(place.osmWebsite), place.osmWebsite, "OpenStreetMap");
  } else if (place.osmWebsite && place.website) {
    const row = facts.find((item) => item.label === "Website");
    if (row && !row.source.includes("OpenStreetMap")) row.source += " · OpenStreetMap";
  }
  for (const social of place.socials) facts.push(social);
  if (place.details?.menu) fact(facts, "Menu", hostOf(place.details.menu), place.details.menu, "Qloo");
  // Overture fills what Qloo and OpenStreetMap left out: a phone, a website, a Facebook page, an email.
  const ground = overtureMatch(place);
  let groundWebsite = "";
  if (ground) {
    const via = `Overture${ground.sources?.length ? ` · ${ground.sources.join(", ")}` : ""}`;
    if (ground.phone && !facts.some((item) => item.label === "Phone" && digits(item.text).endsWith(digits(ground.phone).slice(-7)))) {
      fact(facts, "Phone", ground.phone, telHref(ground.phone), via);
    }
    if (ground.website && !facts.some((item) => item.label === "Website" && item.text === hostOf(ground.website))) {
      groundWebsite = safeHttp(ground.website);
      fact(facts, "Website", hostOf(ground.website), groundWebsite, via);
    }
    const social = (ground.socials || []).find((link) => /facebook|instagram/.test(link));
    if (social && !facts.some((item) => item.href === social)) fact(facts, /instagram/.test(social) ? "Instagram" : "Facebook", "Page", safeHttp(social), via);
    if (/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(ground.email || "")) fact(facts, "Email", ground.email, `mailto:${ground.email}`, via);
  }
  fact(facts, "Google listing", "Maps", place.google, "Qloo place id");
  if (place.rating != null) fact(facts, "Rating", String(place.rating), "", "Qloo");
  const website = place.website || place.osmWebsite || groundWebsite || "";
  const domain = place.domain || domainOf(website);
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    price: priceLabel(place.priceLevel),
    rating: place.rating,
    popularity: place.popularity,
    lat: place.lat,
    lon: place.lon,
    neighborhood: place.neighborhood,
    city: place.city,
    municipality: place.municipality,
    tags: place.tags,
    genre: place.genre,
    // The map colors its pins by this (app/marks.js).
    category: place.category || categoryOf(place.genreId, place.genre),
    hours: place.hours || place.osmHours || "",
    website,
    domain,
    qlooImage: place.qlooImage || "",
    image: place.image || "",
    imageSource: place.image ? (place.imageSource || "Wikimedia Commons") : "",
    logo: place.logo || "",
    aerial: place.aerial || "",
    affinity: Number.isFinite(place.affinity) ? place.affinity : null,
    why: place.why || affinityWhy(place.affinity, place.affinitySignal || "", place.whyLang || "en") || "",
    details: place.details || {},
    wiki: wikiUrl(place.wikipedia),
    facts,
    osm: place.osm,
    sourceLine: sourceLine(place),
  };
}

function sourceLine(place) {
  if (place.osm === "skipped") return "Qloo record.";
  if (place.osm === "down") return "Qloo record. OpenStreetMap did not answer.";
  const sources = ["Qloo"];
  if (place.osm === "match") sources.push("OpenStreetMap");
  if (place.socials.some((item) => item.source === "Wikidata") || place.image || place.logo) sources.push("Wikidata");
  if (sources.length === 1) return "Qloo record. No OpenStreetMap match at this pin.";
  return "Sources: " + sources.join(", ") + ".";
}

function claimValue(claims) {
  const value = claims?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value.trim() : "";
}

function wikiUrl(tag) {
  const split = String(tag || "").indexOf(":");
  if (split < 2) return "";
  const lang = tag.slice(0, split);
  const title = tag.slice(split + 1).replace(/ /g, "_");
  if (!/^[a-z-]{2,12}$/.test(lang) || !title) return "";
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

function addSocial(place, network, raw, source) {
  if (place.socials.some((item) => item.label === network.label)) return;
  const href = network.label === "YouTube" && /^UC[\w-]{10,}$/.test(raw)
    ? "https://www.youtube.com/channel/" + raw
    : socialHref(network, raw);
  if (!href) return;
  place.socials.push({ label: network.label, text: network.label, href, source });
}

let nominatimAt = 0;
let nominatimCoolUntil = 0;

function nominatimLimited() {
  const error = new Error("OpenStreetMap is rate limiting");
  error.limited = true;
  return error;
}

async function nominatimHit(place) {
  if (Date.now() < nominatimCoolUntil) throw nominatimLimited();
  const wait = nominatimAt - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  nominatimAt = Date.now() + 1100;
  const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
    q: `${place.name}, ${place.city || "Puerto Rico"}`,
    format: "jsonv2",
    extratags: "1",
    limit: "1",
  });
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Zemi-Aku/0.1 (local Qloo hackathon map)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 429 || res.status >= 500) {
    nominatimCoolUntil = Date.now() + 45000;
    throw nominatimLimited();
  }
  if (!res.ok) return null;
  return (await res.json())[0] || null;
}

function commonsFile(file, width) {
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file.replace(/ /g, "_")) + `?width=${width}`;
}

// Place records and, for chains, the brand record (OpenStreetMap's brand:wikidata): a Commons photo
// when the place has one, and the brand logo when the chain has one. The card picks its own order.
async function attachWikidata(places) {
  const ids = [...new Set(places.flatMap((place) => [place.wikidata, place.brandWikidata]).filter(Boolean))];
  if (!ids.length) return;
  const url = "https://www.wikidata.org/w/api.php?" + new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    props: "claims",
    format: "json",
  });
  const res = await fetch(url, {
    headers: { "user-agent": "Zemi-Aku/0.1 (local Qloo hackathon map)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return;
  const entities = (await res.json()).entities || {};
  const fields = [
    ["P2013", "Facebook"],
    ["P2003", "Instagram"],
    ["P2002", "X"],
    ["P2397", "YouTube"],
  ];
  for (const place of places) {
    const claims = entities[place.wikidata]?.claims;
    if (!claims) continue;
    for (const [prop, label] of fields) {
      const network = NETWORKS.find((item) => item.label === label);
      const raw = claimValue(claims[prop]);
      if (network && raw) addSocial(place, network, raw, "Wikidata");
    }
    const file = claimValue(claims.P18);
    if (file && !place.image) {
      place.image = commonsFile(file, 640);
      place.imageSource = "Wikimedia Commons";
    }
  }
  for (const place of places) {
    // Keep an existing place photo; only fall back to the brand logo when the place has none.
    const logo = place.image ? "" : claimValue(entities[place.brandWikidata]?.claims?.P154);
    if (logo) place.logo = commonsFile(logo, 480);
  }
}

async function attachWikipediaImages(places) {
  const pending = places.filter((place) => !place.image && place.wikipedia);
  const byLang = new Map();
  for (const place of pending) {
    const split = place.wikipedia.indexOf(":");
    if (split < 2) continue;
    const lang = place.wikipedia.slice(0, split);
    const title = place.wikipedia.slice(split + 1).replace(/_/g, " ");
    if (!/^[a-z-]{2,12}$/.test(lang) || !title) continue;
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang).push({ place, title });
  }
  for (const [lang, rows] of byLang) {
    const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
      action: "query",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "640",
      titles: rows.map((row) => row.title).join("|"),
      format: "json",
    });
    const res = await fetch(url, {
      headers: { "user-agent": "Zemi-Aku/0.1 (local Qloo hackathon map)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) continue;
    const pages = Object.values((await res.json()).query?.pages || {});
    for (const row of rows) {
      const page = pages.find((item) => fold(item.title || "") === fold(row.title));
      const source = page?.thumbnail?.source || "";
      if (!/^https:\/\/upload\.wikimedia\.org\//.test(source)) continue;
      row.place.image = source;
      row.place.imageSource = "Wikimedia Commons";
    }
  }
}

async function attachOsm(places) {
  const located = places.filter((place) => place.lat != null && place.lon != null);
  for (const place of located) {
    try {
      const hit = await nominatimHit(place);
      if (!hit) continue;
      const meters = metersBetween(place.lat, place.lon, Number(hit.lat), Number(hit.lon));
      if (!Number.isFinite(meters) || meters > 500 || !namesAgree(place.name, hit.name)) continue;
      place.osm = "match";
      const tags = hit.extratags || {};
      mergeOsm(place, tags);
      if (/^Q\d+$/.test(tags.wikidata || "")) place.wikidata = tags.wikidata;
      if (/^Q\d+$/.test(tags["brand:wikidata"] || "")) place.brandWikidata = tags["brand:wikidata"];
      if (/^[a-z-]{2,12}:\S/.test(tags.wikipedia || "")) place.wikipedia = tags.wikipedia;
      if (!place.image && /^https:\/\//.test(tags.image || "") && !/googleusercontent|gstatic/.test(tags.image)) {
        place.image = tags.image;
        place.imageSource = "OpenStreetMap";
      }
    } catch (err) {
      if (place.osm !== "match") place.osm = "down";
      if (err.limited) {
        for (const rest of located) if (rest.osm === "none") rest.osm = "down";
        break;
      }
    }
  }
  try {
    await attachWikidata(places);
    await attachWikipediaImages(places);
  } catch {
    // Qloo facts still publish when Wikidata does not answer.
  }
}

const TASTES = {
  restaurant: "urn:tag:genre:place:restaurant",
};

const qlooCache = new Map();

// Qloo turns some requests away when several arrive at once (seen as 502s in a burst of seven).
// Two bounded retries, honoring Retry-After, as the hackathon kit asks.
async function qlooFetch(url, key) {
  for (let attempt = 0; ; attempt += 1) {
    // Every attempt is a Qloo request, so every attempt is charged.
    if (!limiter.spend("qloo-calls", 1, CAPS.qlooCalls)) throw new Error("The Qloo budget for today is used up");
    const res = await fetch(url, { headers: { "X-Api-Key": key }, signal: AbortSignal.timeout(15000) });
    if (attempt >= 2 || (res.status !== 429 && res.status < 500)) return res;
    const wait = Number(res.headers.get("retry-after")) * 1000 || 400 * 3 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 3000)));
  }
}

const TAG_ID = /^urn:tag:[a-z0-9_]+(:[a-z0-9_.-]+)+$/i;

// taste: a TASTES key or a raw Qloo tag URN. enrich: false skips OpenStreetMap (one request a second).
async function qlooPlaces(town, taste, { take = 8, enrich = true, strict = false } = {}) {
  const tasteId = TASTES[taste] || (TAG_ID.test(taste || "") ? taste : "");
  const qlooKey = `${town}|${tasteId}|${take}|${strict}`;
  const cacheKey = `${qlooKey}|${enrich}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  // A fast request is happy with the enriched list when it already exists.
  if (!enrich && cache.has(`${qlooKey}|true`)) return cache.get(`${qlooKey}|true`);
  let basePlaces = qlooCache.get(qlooKey);
  if (!basePlaces) {
    const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
    const key = process.env.QLOO_API_KEY;
    if (!key) throw new Error("Qloo key is missing");
    const params = {
      "filter.type": "urn:entity:place",
      "filter.location.query": fold(town) === "puerto rico" ? "Puerto Rico" : `${town}, Puerto Rico`,
      take: String(take),
    };
    // strict: only places that carry the tag (a dish they serve). Otherwise the tag ranks by taste.
    if (tasteId) params[strict ? "filter.tags" : "signal.interests.tags"] = tasteId;
    const url = `${base}/v2/insights?` + new URLSearchParams(params);
    const res = await qlooFetch(url, key);
    const body = await res.json();
    if (!res.ok) throw new Error(`Qloo returned ${res.status}`);
    basePlaces = (body.results?.entities ?? []).map(mapPlace);
    qlooCache.set(qlooKey, basePlaces);
  }
  const places = basePlaces.map((place) => ({ ...place, socials: [] }));
  if (enrich) await attachOsm(places);
  else for (const place of places) place.osm = "skipped";
  const published = places.map(publishPlace);
  if (published.every((place) => place.osm !== "down")) cache.set(cacheKey, published);
  return published;
}

// ---------- Catalog: every place Qloo knows in a town ----------
// /v2/insights with no taste, paged until Qloo runs out, kept to the places whose municipality is
// the town. Ponce: 357 places over 9 pages; San Juan: 1,345 over 37. The old list showed 30.
// Cached in cache/catalog/, outside the served folders: Qloo's records are not ours to republish.
const catalogDir = path.join(root, "cache", "catalog");
const catalogs = new Map();
const catalogJobs = new Map();
const CATALOG_PAGES = 60; // a safety stop; San Juan, the largest, ends at 37

async function harvestTown(town) {
  const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new Error("Qloo key is missing");
  const seen = new Map();
  for (let page = 1; page <= CATALOG_PAGES; page += 1) {
    const params = new URLSearchParams({
      "filter.type": "urn:entity:place",
      "filter.location.query": `${town}, Puerto Rico`,
      take: "50",
      page: String(page),
    });
    const res = await qlooFetch(`${base}/v2/insights?${params}`, key);
    if (!res.ok) throw new Error(`Qloo catalog returned ${res.status}`);
    const list = (await res.json()).results?.entities || [];
    let fresh = 0;
    for (const entity of list) {
      if (entity.entity_id && !seen.has(entity.entity_id)) {
        seen.set(entity.entity_id, entity);
        fresh += 1;
      }
    }
    if (list.length < 50 || !fresh) break;
  }
  const places = [...seen.values()]
    .map(mapPlace)
    .filter((place) => inTown(place, town));
  return { town, measured: new Date().toISOString().slice(0, 10), places };
}

const testersFile = path.join(root, "cache", "testers", "requests.jsonl");
function readTesters() {
  try {
    return fs.readFileSync(testersFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
const deliverTesters = createTesterDelivery({
  url: process.env.TESTER_WEBHOOK_URL, secret: process.env.TESTER_WEBHOOK_SECRET,
  file: path.join(root, "cache", "testers", "delivered.json"), readRows: readTesters,
});
setInterval(() => { void deliverTesters(); }, 60000).unref();
void deliverTesters();

// ---------- Ground truth beside the taste: Overture places and Wikidata landmarks ----------
// Built by scripts/overture.py and scripts/wikidata.mjs into cache/ (open licences: Overture is
// CDLA-Permissive-2.0 / Apache-2.0 / CC0, Wikidata CC0). Qloo says what people like; these say what
// is there: Ponce has 3,034 places on Overture's map, 357 in Qloo, and 135 photographed landmarks.
const groundFiles = new Map();
function groundFile(kind, town) {
  const key = `${kind}|${fold(town)}`;
  if (!groundFiles.has(key)) {
    let data = null;
    try {
      data = JSON.parse(fs.readFileSync(path.join(root, "cache", kind, `${fold(town).replace(/ /g, "-")}.json`), "utf8"));
    } catch {}
    groundFiles.set(key, data);
  }
  return groundFiles.get(key);
}

const nameTokens = (name) => fold(name || "").replace(/[^a-z0-9 ]/g, " ").split(" ").filter((word) => word.length > 1);
const metersApart = (a, b) => Math.hypot((a.lat - b.lat) * 110540, (a.lon - b.lon) * 104800);

// The Overture record for a Qloo place: same town, within 300 m, and most of the name in common.
function overtureMatch(place) {
  const town = place.municipality || place.city;
  const file = town && place.lat != null ? groundFile("overture", town) : null;
  if (!file) return null;
  const mine = nameTokens(place.name);
  let best = null;
  for (const row of file.places) {
    const meters = metersApart(place, row);
    if (meters > 300) continue;
    const theirs = nameTokens(row.name);
    const shared = mine.filter((word) => theirs.includes(word)).length;
    const score = shared / Math.max(1, Math.min(mine.length, theirs.length));
    if (score >= 0.6 && (!best || score > best.score || (score === best.score && meters < best.meters))) best = { row, score, meters };
  }
  return best?.row || null;
}

const wikidataTowns = new Map(
  JSON.parse(fs.readFileSync(path.join(root, "data/wikidata-towns.json"), "utf8")).towns.map((row) => [fold(row.town), row]),
);
const overtureCounts = new Map(
  JSON.parse(fs.readFileSync(path.join(root, "data/overture-counts.json"), "utf8")).towns.map((row) => [fold(row.town), row]),
);

// Landmarks worth a visit, not neighbourhoods, radio stations or schools.
const NOT_LANDMARK = /barrio|comunidad|emisora|radio|escolar|escuela|hospital|centro comercial|hotel|empresa|oficina|sede|antena|telecomunicaci/i;
function landmarksOf(town) {
  const file = groundFile("wikidata", town);
  const photos = new Set(); // two plazas can share one Commons photo; show it once
  return (file?.landmarks || [])
    .filter((item) => fold(item.name) !== fold(town) && !(item.types.length && item.types.every((type) => NOT_LANDMARK.test(type))))
    .filter((item) => !photos.has(item.image) && photos.add(item.image))
    .sort((a, b) => Boolean(b.wikipedia) - Boolean(a.wikipedia))
    .slice(0, 30)
    .map((item) => ({ ...item, thumb: `${item.image}?width=360` }));
}

// ---------- A town's cultural shape, the way qloo.com shows a place ----------
// Qloo's locality signal: the music, TV and place vibe a town's people lean toward. Much of the music
// is island-wide (Bad Bunny tops every town), so each list is compared with Puerto Rico's own and the
// entries the island list lacks are marked: Ponce adds Daddy Yankee and Guaynaa; Vieques reads
// romantic, unique and stylish.
const PROFILE_KINDS = {
  music: { "filter.type": "urn:entity:artist", take: "12" },
  tv: { "filter.type": "urn:entity:tv_show", take: "10" },
  vibe: { "filter.type": "urn:tag", "filter.parents.types": "urn:entity:place", take: "12" },
};
const localityCache = new Map();
async function localityTop(location, kind) {
  const key = `${location}|${kind}`;
  if (!localityCache.has(key)) {
    const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
    const params = new URLSearchParams({ ...PROFILE_KINDS[kind], "signal.location.query": location });
    const job = qlooFetch(`${base}/v2/insights?${params}`, process.env.QLOO_API_KEY)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Qloo returned ${res.status}`);
        const results = (await res.json()).results || {};
        return (results.entities || results.tags || []).map((item) => item.name).filter(Boolean);
      });
    localityCache.set(key, job);
    job.catch(() => localityCache.delete(key));
  }
  return localityCache.get(key);
}

async function townProfile(town) {
  const lists = {};
  for (const kind of Object.keys(PROFILE_KINDS)) {
    const [here, island] = await Promise.all([localityTop(`${town}, Puerto Rico`, kind), localityTop("Puerto Rico", kind)]);
    const islandSet = new Set(island.map((name) => fold(name)));
    lists[kind] = here.slice(0, kind === "tv" ? 6 : 8).map((name) => ({ name, standout: !islandSet.has(fold(name)) }));
  }
  return lists;
}

// ---------- Connected tastes: what fans of one thing also like, in another domain ----------
// Qloo's cross-domain signal: fans of Campioni (a Ponce pizzeria) → Tony Dize, Vico C, Wisin & Yandel;
// fans of Bad Bunny → La Placita de Santurce. type: artist, destination, place, movie, tv_show, book.
const alsoCache = new Map();
async function qlooAlsoLike(entityId, type, { take = 6, location = "" } = {}) {
  const cacheKey = `${entityId}|${type}|${take}|${location}`;
  if (alsoCache.has(cacheKey)) return alsoCache.get(cacheKey);
  const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
  const params = new URLSearchParams({
    "filter.type": `urn:entity:${type}`,
    "signal.interests.entities": entityId,
    take: String(take),
  });
  if (location) params.set("filter.location.query", location);
  const res = await qlooFetch(`${base}/v2/insights?${params}`, process.env.QLOO_API_KEY);
  if (!res.ok) throw new Error(`Qloo returned ${res.status}`);
  const rows = ((await res.json()).results?.entities || []).map((entity) => type === "place"
    ? mapPlace(entity)
    : { id: entity.entity_id, name: entity.name });
  alsoCache.set(cacheKey, rows);
  return rows;
}

// One harvest per town at a time; later callers wait on the same one.
function catalogFor(town) {
  if (catalogs.has(town)) return Promise.resolve(catalogs.get(town));
  if (!catalogJobs.has(town)) {
    const file = path.join(catalogDir, `${fold(town).replace(/ /g, "-")}.json`);
    const job = (async () => {
      let data = null;
      try {
        data = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {}
      if (!data) {
        data = await harvestTown(town);
        fs.mkdirSync(catalogDir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data));
      }
      // Categories are assigned on load, so a rule change needs no new harvest.
      data.places = data.places.map((place) => ({ ...place, category: categoryOf(place.genreId, place.genre) }));
      catalogs.set(town, data);
      return data;
    })().finally(() => catalogJobs.delete(town));
    catalogJobs.set(town, job);
  }
  return catalogJobs.get(town);
}

const byPopularity = (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0);

const surveyByTown = new Map(
  JSON.parse(fs.readFileSync(path.join(root, "data/municipio-survey-2026-10-06.json"), "utf8"))
    .rows.map((row) => [fold(row.town), row]),
);

// How many places Qloo knows in each town (scripts/build-catalog.mjs), and its band.
const countsByTown = new Map(
  JSON.parse(fs.readFileSync(path.join(root, "data/catalog-counts.json"), "utf8"))
    .towns.map((row) => [fold(row.town), row]),
);
const catalogTotal = [...countsByTown.values()].reduce((sum, row) => sum + row.total, 0);

// The municipality when Qloo has it, else the printed city.
const homeOf = (place) => place.municipality || place.city || "";

function groundedAnswer(town, places, question) {
  const known = countsByTown.get(fold(town));
  const here = places.filter((place) => inTown(place, town)).map((place) => place.name);
  const neighbor = places.filter((place) => homeOf(place) && !inTown(place, town)).map((place) => place.name);
  const grade = !known
    ? ""
    : known.band === "thin"
      ? `Qloo knows only ${known.total} places in ${town}. Read the city on each pin before you treat the list as this town.`
      : `Qloo knows ${known.total} places in ${town}.`;
  const present = here.length
    ? `Already naming ${town}: ${here.slice(0, 4).join(", ")}.`
    : places.length
      ? `None of these places print ${town} as the city.`
      : `${town}: Qloo returned no places. That is not proof the town has none.`;
  const nextDoor = neighbor.length ? `Naming another city: ${neighbor.slice(0, 3).join(", ")}.` : "";
  const lead = question ? `For “${question.trim()}”. ` : "";
  return `${lead}${grade} ${present} ${nextDoor} This is who Qloo already associates with the town. It is not foot traffic and it is not a full business list.`.replace(/\s+/g, " ").trim();
}

const INTENTS = [
  { label: "Food", test: /restaurant|food|cafe|bakery|pizza|bar|grill|diner|kitchen|eat|dinner|lunch|breakfast|coffee|dessert|waffle|pasta|pasteler|comida|comer|restaurante|panaderia|desayuno|almuerzo|cena|cafeteria|postre|manger|essen|mangiare|ristorante|cibo|nourriture/ },
  { label: "History", test: /histor|museum|heritage|landmark|monument|castle|fort|church|cultural|founded|century|old|historia|museo|iglesia|monumento|fuerte|fundad|siglo/ },
  { label: "Stay", test: /hotel|resort|stay|lodg|sleep|inn|hospedaje|dormir|quedar/ },
  { label: "Shop", test: /shop|mall|store|retail|market|tienda|compras|centro comercial|mercado/ },
];

function intentOf(question) {
  const text = fold(question);
  return INTENTS.find((intent) => intent.test.test(text)) || null;
}

function placeText(place) {
  return fold([place.name, place.genre].filter(Boolean).join(" "));
}

function toCard(place, town) {
  const mentions = town && fold(town) !== "puerto rico" && inTown(place, town);
  return {
    name: place.name,
    line: !town || fold(town) === "puerto rico"
      ? [place.genre, homeOf(place)].filter(Boolean).join(", ") || "Town not on the record"
      : mentions
        ? [place.genre, homeOf(place)].filter(Boolean).join(", ")
        : homeOf(place)
          ? `Names ${homeOf(place)}, not ${town}`
          : "Town not on the record",
    genre: place.genre || "", home: homeOf(place) || "", category: place.category || "", elsewhere: Boolean(town && fold(town) !== "puerto rico" && !mentions),
    popularity: typeof place.popularity === "number" ? Math.round(place.popularity * 100) / 100 : null,
    image: place.image || "",
    imageSource: place.imageSource || "",
    wiki: place.wiki || "",
  };
}

function clipExtract(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= 420) return clean;
  const cut = clean.slice(0, 420);
  const dot = cut.lastIndexOf(". ");
  return dot > 180 ? cut.slice(0, dot + 1) : cut;
}

const historyCache = new Map();

async function townHistory(town) {
  const key = fold(town);
  if (historyCache.has(key)) return historyCache.get(key);
  let record = null;
  for (const title of [`${town}, Puerto Rico`, town]) {
    const url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "Zemi-Aku/0.1 (local Qloo hackathon map)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) continue;
    const body = await res.json();
    const extract = clipExtract(body.extract);
    const page = body.content_urls?.desktop?.page || "";
    if (!extract || !page || !/puerto rico/i.test(`${body.title} ${extract}`)) continue;
    const thumb = body.thumbnail?.source || "";
    record = {
      title: body.title || title,
      extract,
      url: page,
      source: "Wikipedia",
      image: /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(thumb) ? thumb : "",
    };
    break;
  }
  historyCache.set(key, record);
  return record;
}

function answerPack(town, places, question) {
  const mentions = (place) => inTown(place, town);
  const byPop = (a, b) => (b.popularity ?? -1) - (a.popularity ?? -1);
  // Qloo sometimes holds two records for one business (two "Mayagüez Mall"). Show it once.
  const seen = new Set();
  const local = places.filter(mentions).sort(byPop).filter((place) => {
    const key = fold(place.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const neighbor = places.filter((place) => homeOf(place) && !mentions(place));
  const intent = intentOf(question);
  const matched = intent ? local.filter((place) => intent.test.test(placeText(place))) : [];
  const lead = (matched.length ? matched : local).slice(0, 3);
  const landmarkText = /museum|histor|landmark|monument|castle|fort|church|heritage/;
  const landmarks = local
    .filter((place) => (place.image || place.wiki || landmarkText.test(placeText(place))) && !lead.some((item) => item.name === place.name))
    .slice(0, 3);
  const focus = !intent
    ? `Places in ${town}`
    : matched.length
      ? `${intent.label} in ${town}`
      : `No ${intent.label.toLowerCase()} places in this sample of ${town}`;
  const neighborLine = neighbor
    .slice(0, 2)
    .map((place) => `${place.name} names ${homeOf(place)}, not ${town}.`)
    .join(" ");
  const known = countsByTown.get(fold(town));
  const note = [
    !places.length ? `${town}: Qloo returned no places. That is not proof the town has none.` : "",
    known?.band === "thin" ? `Qloo knows only ${known.total} places in ${town}. Read the city before you treat a place as this town.` : "",
    neighborLine,
    "The number is Qloo popularity. This is not every business in the town.",
  ].filter(Boolean).join(" ");
  return {
    answer: groundedAnswer(town, places, question),
    focus,
    note,
    cards: lead.map((place) => toCard(place, town)),
    landmarks: landmarks.map((place) => toCard(place, town)),
    brief: {
      town,
      question,
      intent: intent?.label || null,
      matched: matched.length > 0,
      lead: lead.map((place) => ({ name: place.name, kind: place.genre || "" })),
      neighbors: neighbor.slice(0, 2).map((place) => ({ name: place.name, city: homeOf(place) })),
      thin: known?.band === "thin",
    },
  };
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) return {};
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function inIsland(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= 17.85 && lat <= 18.62 && lon >= -67.5 && lon <= -65.15;
}

// The canonical survey name for a municipality, or "" (Atlantis is not a town).
function knownTown(name) {
  const row = surveyByTown.get(fold(name));
  return row ? row.town : "";
}

function townForPlace(place) {
  for (const row of surveyByTown.values()) {
    if (inTown(place, row.town)) return row.town;
  }
  return "";
}

const searchCache = new Map();

// Plural to singular, English and Spanish (hoteles → hotel, farmacias → farmacia). Matching is a
// substring test, so trimming an English word too far ("tables" → "tabl") still matches.
function stemWord(word) {
  if (word.length > 5 && /[lrndzj]es$/.test(word)) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// Qloo's place names and genres are mostly English. Spoken Spanish place words map to them.
const ES_PLACE_WORDS = {
  hoteles: "hotel", restaurante: "restaurant", restaurantes: "restaurant", tienda: "store", tiendas: "store",
  playa: "beach", playas: "beach", museo: "museum", museos: "museum", iglesia: "church", iglesias: "church",
  panaderia: "bakery", panaderias: "bakery", farmacia: "pharmacy", farmacias: "pharmacy",
  supermercado: "supermarket", supermercados: "supermarket", parque: "park", parques: "park", bares: "bar",
  cafeteria: "cafe", cafeterias: "cafe", gimnasio: "gym", gimnasios: "gym", hospitales: "hospital",
  escuela: "school", escuelas: "school", banco: "bank", bancos: "bank", gasolinera: "gas station",
  gasolineras: "gas station", centro: "", centros: "", comercial: "mall", comerciales: "mall",
};

function searchQuery(text) {
  return fold(text).split(" ").filter(Boolean)
    .map((word) => ES_PLACE_WORDS[word] ?? word)
    .filter(Boolean)
    .map(stemWord)
    .join(" ");
}

// Words as spoken, singular. Qloo's search reads business names, and Puerto Rico names its
// businesses in Spanish ("farmacia" finds 13 near Caguas, "pharmacy" finds none).
function nativeQuery(text) {
  return fold(text).split(" ").filter(Boolean).map(stemWord).join(" ");
}

function placeMatches(place, q) {
  const blob = fold([place.name, place.genre, ...(place.tags || [])].filter(Boolean).join(" "));
  if (!q || !blob) return false;
  if (blob.includes(q)) return true;
  const tokens = q.split(" ").filter((word) => word.length >= 3);
  return tokens.length > 0 && tokens.every((token) => blob.includes(token));
}

function catalogOf(question) {
  const original = fold(question);
  if (original.length < 2) return null;
  if (/\b(who|why|how|when|already|thin|histor\w*|politic\w*|mayor|election\w*|on the ground|open a|artist\w*|musician\w*|singer\w*|painter\w*|band|quien|por que|como|cuando|politica|alcalde|compar\w*|artista\w*|abrir)\b/.test(original)) {
    return null;
  }
  const cue = /\b(bring|show|find|pull|list|where|locations|location|all|every|muestr\w*|busc\w*|encuentr\w*|todos|todas|donde|lista)\b/.test(original);
  let text = original;
  let town = "";
  const towns = [...surveyByTown.values()].sort((a, b) => fold(b.town).length - fold(a.town).length);
  for (const row of towns) {
    const name = fold(row.town);
    if (name.length < 3 || !new RegExp(`\\b${name}\\b`).test(text)) continue;
    town = row.town;
    text = text.replace(name, " ");
    break;
  }
  text = text.replace(/\b(love|fan|fans|listen|listening|encanta|gusta|hey|hi|hello|hola|buenas|buenos|dias|morning|afternoon|evening|tonight|today|noche|hoy|esta|okay|ok|please|zemi|aku|bring|show|find|get|give|pull|tell|say|up|look|search|for|where|are|is|can|you|i|want|need|list|the|a|an|all|every|of|me|my|locations|location|places|place|spots|spot|across|around|on|in|island|puerto|rico|and|to|with|some|any|what|which|that|this|there|here|best|good|near|nearby|muestr\w*|busc\w*|encuentr\w*|todos|todas|los|las|el|la|de|del|en|donde|quiero|necesito|lugares|lugar|cerca|hay|que|un|una|y|por|favor|puedo|podemos|comer|dormir|quedar\w*|comprar|ir|eat|sleep|stay|go|would|could|should|do|does|did|people|like|we|they|instead|actually|also|then|now|um|uh|maybe|just|lets|let|about|again|vez|mejor|ahora|entonces|tambien|otra|vamos)\b/g, " ");
  const query = nativeQuery(text);
  const words = query.split(" ").filter(Boolean);
  if (query.length < 2) return null;
  // "Dinner tonight" is a question about the town's food, not a search for a business named "dinner".
  if (/^((dinner|lunch|breakfast|brunch|food|hungry|cena|cenar|almuerzo|almorzar|desayuno|desayunar|comida|hambre) ?)+$/.test(query)) return null;
  if (!cue && words.length > 4) return null;
  // "restaurants in Ponce" is a question about Ponce's food, not a search for a business named "restaurant".
  if (town && !cue && INTENTS.some((intent) => intent.test.test(query))) return null;
  return { query, town };
}

function labelQuery(query) {
  if (query === "kfc") return "KFC";
  return query.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

// The center of each municipality, from the same outlines the page draws. A search for one town
// looks around that town; otherwise its places fall outside the top 50 for the whole island.
const townCenters = (() => {
  const centers = new Map();
  const geo = JSON.parse(fs.readFileSync(path.join(root, "app/data/municipios.geojson"), "utf8"));
  for (const feature of geo.features) {
    const g = feature.geometry;
    const rings = g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map((poly) => poly[0]);
    const ring = rings.sort((a, b) => b.length - a.length)[0];
    const lon = ring.reduce((sum, pair) => sum + pair[0], 0) / ring.length;
    const lat = ring.reduce((sum, pair) => sum + pair[1], 0) / ring.length;
    centers.set(fold(String(feature.properties.NAME).replace(/ municipio$/i, "")), { lat, lon });
  }
  return centers;
})();

async function qlooSearchRaw(query, town = "") {
  const q = String(query).slice(0, 80);
  if (q.length < 2) return [];
  const center = town ? townCenters.get(fold(town)) : null;
  const cacheKey = center ? `${q}|${fold(town)}` : q;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);
  const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new Error("Qloo key is missing");
  const params = new URLSearchParams({
    query: q,
    type: "urn:entity:place",
    "filter.location": center ? `${center.lat.toFixed(4)},${center.lon.toFixed(4)}` : "18.22,-66.45",
    "filter.radius": center ? "12" : "100",
    take: "50",
  });
  const res = await qlooFetch(`${base}/search?${params}`, key);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Qloo search returned ${res.status}`);
  const places = [];
  const seen = new Set();
  for (const entity of body.results || []) {
    const place = mapPlace(entity);
    if (!inIsland(place.lat, place.lon)) continue;
    const id = `${fold(place.name)}|${Number(place.lat).toFixed(3)}|${Number(place.lon).toFixed(3)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    places.push(place);
  }
  searchCache.set(cacheKey, places);
  return places;
}

async function qlooSearch(query) {
  const q = nativeQuery(query);
  const places = await qlooSearchRaw(q);
  const matched = places.filter((place) => placeMatches(place, q));
  return (matched.length ? matched : places).slice(0, 6).map((place) => ({
    kind: "place",
    label: place.name,
    hint: [place.genre, homeOf(place)].filter(Boolean).join(" · ") || "Place",
    town: townForPlace(place),
    lon: place.lon,
    lat: place.lat,
    place: publishPlace({ ...place, osm: "skipped" }),
  }));
}

// "Bakeries in Ponce", "pizza en Ponce": every place in the town's catalog whose kind matches, before
// any name search. Null when no kind matches, so a name or a chain ("KFC") still goes to /search.
async function catalogKindAnswer(catalog, question, lang) {
  if (!catalog.town) return null;
  const words = searchQuery(catalog.query).split(" ")
    .filter((word) => word.length >= 4)
    .map((word) => word.replace(/ie$/, "y")); // bakeries → bakerie → bakery
  if (!words.length) return null;
  const town = catalog.town;
  const data = await catalogFor(town);
  const rows = data.places.filter((place) => words.every((word) => fold(place.genre || "").includes(word))).sort(byPopularity);
  if (!rows.length) return null;
  const tally = new Map();
  for (const place of rows) tally.set(place.genre, (tally.get(place.genre) || 0) + 1);
  const byCount = [...tally].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const kinds = byCount.slice(0, 3).join(", ");
  const label = byCount[0]; // Qloo's own name for the kind ("Bakery"), not the stemmed word
  const note = `Qloo files ${rows.length} place${rows.length === 1 ? "" : "s"} in ${town} as ${kinds}.${rows.length > 50 ? " Showing the 50 most popular." : ""} This is Qloo's catalog of the town, not every business there.`;
  return listAnswer({ rows, town, label, query: catalog.query, question, lang, note, qloo: `GET /v2/insights · place · every page for ${town} · kind: ${kinds}` });
}

// A list answer the page shows like a catalog: up to 50 places, three lead cards, the spoken line.
function listAnswer({ rows, town, label, query, question, lang, note, qloo }) {
  const focus = `${label} in ${town}`;
  const cards = rows.slice(0, 3).map((place) => toCard(place, town === "Puerto Rico" ? "" : town));
  const brief = { catalog: true, query: label, town, count: rows.length, lead: rows.slice(0, 3).map((place) => ({ name: place.name, kind: place.genre || "" })) };
  return {
    catalog: true,
    query,
    town,
    question,
    focus,
    note,
    answer: note,
    cards,
    landmarks: [],
    places: rows.slice(0, 50).map(publishPlace),
    brief,
    speech: speechFor(lang, brief),
    packet: {
      town,
      question,
      focus,
      qloo,
      places: cards.map((card) => ({ name: card.name, record: card.line, popularity: card.popularity })),
      landmarks: [],
      history: null,
      note,
    },
  };
}

// "Bad Bunny", "I love Bad Bunny": an artist Qloo knows → the places their fans like, in the town
// asked about or across the island. Qloo's cross-domain taste, not places tied to the artist.
async function artistAnswer(catalog, question, lang, named = [], { exploreOnly = false } = {}) {
  const q = catalog.query.trim();
  if (q.length < 3) return null;
  const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
  const params = new URLSearchParams({ query: q, types: "urn:entity:artist", take: "3" });
  const res = await qlooFetch(`${base}/search?${params}`, process.env.QLOO_API_KEY);
  if (!res.ok) {
    if (exploreOnly) throw new Error("Qloo artist search is unavailable");
    return null;
  }
  const artist = ((await res.json()).results || []).find((entity) => fold(entity.name) === fold(q));
  if (!artist) return null;
  const town = catalog.town || "Puerto Rico";
  const location = town === "Puerto Rico" ? "Puerto Rico" : `${town}, Puerto Rico`;
  const seen = new Set(named.map((place) => place.id || place.name));
  const fans = (await qlooAlsoLike(artist.entity_id, "place", { take: 15, location }))
    .filter((place) => inIsland(place.lat, place.lon) && (town === "Puerto Rico" || inTown(place, town)) && !seen.has(place.id || place.name))
    .filter((place) => !exploreOnly || ["food", "drinks", "fun", "outdoors", "culture"].includes(categoryOf(place.genreId, place.genre)))
    .map((place) => ({
      ...place,
      affinitySignal: artist.name,
      whyLang: lang,
      why: affinityWhy(place.affinity, artist.name, lang) || place.why || "",
    }))
    .sort((a, b) => (Number(b.affinity) || 0) - (Number(a.affinity) || 0)); // the order the cards display
  if (!fans.length) return null;
  const rows = [...named, ...fans];
  const fansLine = `places that people who like ${artist.name} also like, in ${town}, from Qloo's cross-domain taste data. They are not places connected to ${artist.name}.`;
  const note = exploreOnly
    ? lang === "es"
      ? `A quienes les gusta ${artist.name} también les gustan estos lugares, según Qloo. Seleccionados para comer, salir, disfrutar al aire libre y explorar la cultura. Esto no significa que el artista haya visitado o actuado aquí.`
      : `People who like ${artist.name} also like these places, according to Qloo. Selected for food, nightlife, outdoors, culture and things to do. This does not mean the artist visited or performed here.`
    : named.length
    ? `${named.map((place) => place.name).join(" and ")} carries the name. The rest are ${fansLine}`
    : `These are ${fansLine}`;
  return { ...listAnswer({ rows, town, label: `${artist.name} fans`, query: q, question, lang, note, qloo: `GET /search · artist "${artist.name}" → GET /v2/insights · place · signal.interests.entities` }),
    ...(exploreOnly ? { journey: { artist: artist.name, source: "Qloo", relationship: "affinity" } } : {}) };
}
const discover = createDiscovery(artistAnswer);
const discoverCoast = createCoastalDiscovery({
  catalog: async town => {
    const file = path.join(catalogDir, `${fold(town).replace(/ /g, "-")}.json`);
    if (!fs.existsSync(file)) throw new Error("This town's saved Qloo catalog is unavailable. Try another port.");
    const saved = catalogs.get(town) || JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(saved?.places)) throw new Error("This town's saved Qloo catalog is unavailable. Try another port.");
    return saved.places;
  },
  artist: artistAnswer, publish: publishPlace,
});

async function qlooCatalog(catalog, question) {
  // The words as said first. The English place word (hoteles → hotel, centro comercial → mall) only
  // when that finds fewer than three.
  const matched = (await qlooSearchRaw(catalog.query, catalog.town)).filter((place) => placeMatches(place, catalog.query));
  const english = searchQuery(catalog.query);
  if (english !== catalog.query && english.length >= 2 && matched.length < 3) {
    const seen = new Set(matched.map((place) => place.id || place.name));
    for (const place of await qlooSearchRaw(english, catalog.town)) {
      if (placeMatches(place, english) && !seen.has(place.id || place.name)) matched.push(place);
    }
  }
  const rows = catalog.town
    ? matched.filter((place) => inTown(place, catalog.town) || fold(place.name).includes(fold(catalog.town)))
    : matched;
  const shown = rows.slice(0, 30);
  const where = catalog.town || "Puerto Rico";
  const label = labelQuery(catalog.query);
  const focus = `${label} in ${where}`;
  const note = shown.length
    ? rows.length > shown.length
      ? `Qloo search matched ${rows.length} places for “${label}” in ${where}. Showing 30 on the map. The city is the one on the record. This is not every business on the island.`
      : `Qloo search matched ${shown.length} place${shown.length === 1 ? "" : "s"} for “${label}” in ${where}. The city is the one on the record. This is not every business on the island.`
    : `Qloo had no place whose name or genre matches “${label}” in ${where}.`;
  const cards = shown.slice(0, 3).map((place) => toCard(place, catalog.town || ""));
  return {
    catalog: true,
    query: catalog.query,
    town: where,
    question,
    focus,
    note,
    answer: note,
    cards,
    landmarks: [],
    places: shown,
    brief: {
      catalog: true,
      query: label,
      town: where,
      count: shown.length,
      lead: shown.slice(0, 3).map((place) => ({ name: place.name, kind: place.genre || "" })),
    },
    packet: {
      town: where,
      question,
      focus,
      qloo: catalog.town ? `GET /search · place · 12 miles around ${catalog.town}` : "GET /search · place · 100 miles around the island",
      places: cards.map((card) => ({ name: card.name, record: card.line, popularity: card.popularity })),
      landmarks: [],
      history: null,
      note,
    },
  };
}

// A taste from Qloo's tag list ("mofongo", "surfing") and the places that carry it, in one town or
// across the island. Null when Qloo has no such tag. strictOnly: null unless some place lists the tag,
// for the ask fallback, where places merely ranked by taste would read as matches (bars for "coffee").
async function tasteAnswer(query, town, q, lang, { strictOnly = false } = {}) {
  if (query.length < 2) return null;
  const found = await callQloo("qloo_find_tags", { query, limit: 8 });
  const tag = pickTasteTag(found.results);
  if (!tag) return null;
  let where = town || "Puerto Rico";
  // First the places that list the tag (Cayey + lechon finds Dr. Lechón). Hobbies such as surfing
  // are not on place records, so with none listed the tag ranks places by taste instead.
  let places = await qlooPlaces(where, tag.id, { take: 12, enrich: false, strict: true });
  // None in the town lists it: the island's places that do beat the town's others ranked by
  // taste, which put an OfficeMax under "mofongo in Ponce".
  let missedTown = "";
  if (!places.length && town) {
    const island = await qlooPlaces("Puerto Rico", tag.id, { take: 12, enrich: false, strict: true });
    if (island.length) [places, where, missedTown] = [island, "Puerto Rico", town];
  }
  const strict = places.length > 0;
  if (!strict && strictOnly) return null;
  if (!strict) places = await qlooPlaces(where, tag.id, { take: 12, enrich: false });
  const label = tasteLabel(tag.name, places, where, strict);
  // Real Qloo affinity only — signal + lang so publishPlace/compact can regenerate why.
  places = places.map((place) => ({
    ...place,
    affinitySignal: tag.name,
    whyLang: lang,
    why: affinityWhy(place.affinity, tag.name, lang) || place.why || "",
  })).sort((a, b) => (Number(b.affinity) || 0) - (Number(a.affinity) || 0));
  const cards = places.slice(0, 3).map((place) => toCard(place, missedTown ? "" : town));
  const note = missedTown ? `No Qloo place in ${missedTown} lists ${tag.name}. ${label.note}` : label.note;
  const brief = { catalog: true, query: tag.name, town: where, missedTown, count: places.length, lead: places.slice(0, 3).map((place) => ({ name: place.name, kind: place.genre || "" })) };
  return {
    catalog: true,
    tag,
    label: label.hit,
    query: tag.name,
    town: where,
    question: q,
    focus: `${tag.name} in ${where}`,
    note,
    answer: note,
    cards,
    landmarks: [],
    places,
    brief,
    speech: speechFor(lang, brief),
    packet: {
      town: where,
      question: q,
      focus: `${tag.name} in ${where}`,
      qloo: `qloo_find_tags "${query}" → ${tag.id} · GET /v2/insights · place · ${strict ? "filter.tags" : "taste signal"}`,
      places: cards.map((card) => ({ name: card.name, record: card.line, popularity: card.popularity })),
      landmarks: [],
      history: null,
      note,
    },
  };
}

const piperDir = path.join(root, "tools", "piper");
const piperExe = path.join(piperDir, "piper.exe");
const piperModel = path.join(root, "voices", "en_US-lessac-medium.onnx");

async function speakWithDeepgram(text, voice) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("deepgram missing");
  const params = new URLSearchParams({
    model: voice,
    encoding: "linear16",
    container: "wav",
    sample_rate: "24000",
  });
  const res = await fetch(`https://api.deepgram.com/v1/speak?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: String(text || "").replace(/\s+/g, " ").trim() }),
  });
  if (!res.ok) throw new Error(`Deepgram returned ${res.status}`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length < 44 || audio.subarray(0, 4).toString("ascii") !== "RIFF") {
    throw new Error("Deepgram returned no audio");
  }
  return audio;
}

function speakWithPiper(text) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(piperExe) || !fs.existsSync(piperModel)) {
      reject(new Error("voice missing"));
      return;
    }
    const out = path.join(os.tmpdir(), `zemi-voice-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
    const child = spawn(piperExe, [
      "--model", piperModel,
      "--output_file", out,
      "--length_scale", "1.02",
      "--sentence_silence", "0.28",
    ], { cwd: piperDir, stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 || !fs.existsSync(out)) {
        fs.rm(out, { force: true }, () => {});
        reject(new Error(err.slice(-240) || `piper exited ${code}`));
        return;
      }
      resolve(out);
    });
    child.stdin.end(String(text || "").replace(/\s+/g, " ").trim());
  });
}

const heatCache = new Map();

async function qlooHeat(town) {
  const cacheKey = fold(town);
  if (!cacheKey) return [];
  if (heatCache.has(cacheKey)) return heatCache.get(cacheKey);
  const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new Error("Qloo key is missing");
  const params = new URLSearchParams({
    "filter.type": "urn:heatmap",
    "filter.location.query": `${town}, Puerto Rico`,
    "signal.interests.tags": "urn:tag:genre:place:restaurant",
    take: "40",
  });
  const res = await qlooFetch(`${base}/v2/insights?${params}`, key);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Qloo heat returned ${res.status}`);
  const rows = body.results?.heatmap || [];
  const points = [];
  for (const row of rows) {
    const lat = Number(row.location?.latitude);
    const lon = Number(row.location?.longitude);
    if (!inIsland(lat, lon)) continue;
    const affinity = Number(row.query?.affinity);
    points.push({
      lat,
      lon,
      affinity: Number.isFinite(affinity) ? Math.round(affinity * 100) / 100 : null,
    });
    if (points.length === 80) break;
  }
  heatCache.set(cacheKey, points);
  return points;
}


// True without an Origin header (scripts, curl) or when the browser's Origin is this site itself.
function sameOrigin(req) {
  const origin = String(req.headers.origin || "");
  if (!origin) return true;
  const own = [process.env.ZEMI_PUBLIC_URL || "https://zemi.r21digital.com", `http://${req.headers.host || ""}`, `https://${req.headers.host || ""}`];
  return own.some((candidate) => candidate.replace(/\/$/, "").toLowerCase() === origin.replace(/\/$/, "").toLowerCase());
}

// The headline siting answer keeps its rule-based verdict (it matches the map) and, when the visitor has a
// model turn and the budget allows, gets two model sentences from the same data (judge panels 10/23, 10/24).
// A capped or failed note leaves the template alone; the drawer says which happened.
const GROUP_ES = { gap: "brecha", competitive: "competido", quiet: "tranquilo", crowded: "saturado", unknown: "sin datos suficientes" };
async function withVerdictNote(business, asked, ip) {
  const row = business?.business?.evidence?.opportunity;
  if (!row || !Array.isArray(business.places) || business.business.mode !== "research" || business.business.topic !== "overview") return business;
  // The verdict templates exist in English and Spanish only; a French, Italian or German request gets no note
  // rather than a verdict in one language and a note in another.
  if (!["en", "es"].includes(asked.lang)) return { ...business, evidence: { ...business.evidence, note: { fallback: "language" } } };
  if (!limiter.spend(`chat-turns:${ip}`, 1, CHAT_TURNS_PER_VISITOR)) return { ...business, evidence: { ...business.evidence, note: { fallback: "visitor-cap" } } };
  const file = opportunity?.get?.(row.industry);
  const es = asked.lang === "es";
  // No figure reaches the note (judge panel 10/24 round 3: it restated the rate in the wrong unit and once inverted a
  // comparison); the verdict holds the numbers, and the comparison with the first gap town is written here, in words.
  // The current town is never its own comparison; a suppressed Census count is said in words, never as zero.
  const label = es ? "negocios de este tipo" : "businesses of this type";
  const rate = (r) => (r.suppressed ? r.perTenThousandMax ?? 0 : r.perTenThousand ?? 0);
  const gapRows = (file?.towns || []).filter((r) => r.group === "gap" && r.town !== business.town).sort((a, b) => (a.tasteRank ?? 99) - (b.tasteRank ?? 99));
  // The next row on the gap list the person is looking at: the gap town after this one by taste rank, else the top
  // row (judge panel 10/25 round 6: San Juan's "siguiente pueblo" was the top row, not the row after San Juan).
  const after = row.group === "gap" ? gapRows.find((r) => (r.tasteRank ?? 99) > (row.tasteRank ?? -1)) : null;
  const topGaps = [...(after ? [after] : []), ...gapRows.filter((r) => r !== after)].slice(0, 5)
    .map((r) => ({ town: r.town, group: "gap", suppressed: Boolean(r.suppressed) }));
  const gap = (file?.towns || []).find((r) => r.town === topGaps[0]?.town);
  // Said as what it is: the next row after this town, or the top row when there is none (Codex review 10/25 round 6).
  const other = after ? "the next gap-group town by taste rank" : "the top gap-group town by taste rank";
  const otherEs = after ? "el siguiente pueblo del grupo brecha por gusto" : "el primer pueblo del grupo brecha por gusto";
  const comparison = !gap ? (es ? "No hay otro pueblo del grupo brecha con el que comparar." : "No other gap-group town to compare with.")
    // The other town is introduced as what it is, the next (or top) gap-group town by taste rank (judge panel 10/25: "no se compara con Río
    // Grande" at the end of a Maricao answer read as a non sequitur).
    : row.suppressed ? (es ? `El Census retiene el conteo de ${business.town}, así que no se puede ordenar frente a ${gap.town}, ${otherEs}.` : `The Census withholds ${business.town}'s count, so it cannot be ordered against ${gap.town}, ${other}.`)
    : gap.suppressed ? (es ? `${gap.town}, ${otherEs}, no tiene cifra publicada (el Census retiene los conteos pequeños), así que los dos no se pueden ordenar.` : `${gap.town}, ${other}, has no published count (the Census withholds small counts), so the two cannot be ordered.`)
    : rate(gap) < rate(row) ? (es ? `${gap.town}, ${otherEs}, tiene menos ${label} por residente que ${business.town}.` : `${gap.town}, ${other}, has fewer ${label} per resident than ${business.town}.`)
    : rate(gap) > rate(row) ? (es ? `${gap.town}, ${otherEs}, tiene más ${label} por residente que ${business.town}.` : `${gap.town}, ${other}, has more ${label} per resident than ${business.town}.`)
    : (es ? `${gap.town}, ${otherEs}, y ${business.town} tienen la misma cifra por residente.` : `${gap.town}, ${other}, and ${business.town} have the same figure per resident.`);
  const places = business.places.slice(0, 6).map((p) => ({ name: p.name, genre: p.genre || null, rating: p.rating ?? null })); // no hours: the cards carry them
  const note = await verdictNote({ lang: asked.lang, town: business.town, industry: row.industry, verdict: business.speech, topGaps, places, comparison,
    row: { group: row.group, groupEs: GROUP_ES[row.group] || row.group, suppressed: Boolean(row.suppressed),
      ...(row.suppressed ? { countNote: "no published count: the Census withholds small counts" } : {}) } });
  if (note.fallback) { console.warn(`verdict note fallback: ${note.reason}`); return { ...business, evidence: { ...business.evidence, note: { fallback: note.reason } } }; }
  const speech = `${business.speech} ${note.text}`;
  // The voice reads whole sentences within the speak endpoint's limit; the caption shows the whole note.
  return { ...business, speech, spoken: spokenExcerpt(speech, 300), evidence: { ...business.evidence, note: { model: note.model, ms: note.ms } } };
}

// One question back for an ask with no kind of place and no purpose, before the model and before the records
// (judge panels 10/24). A fixed reply, labeled as the rules router with the reason "clarify".
function clarification(body) {
  const lang = String(body.lang || "en");
  return { chat: true, kind: "vague", question: String(body.question || "").slice(0, 240), speech: chatReply(lang, "vague", { places: catalogTotal }),
    evidence: { mode: "rules", reason: "clarify", at: new Date().toISOString() } };
}

async function patternAnswer(body) {
  const question = String(body.question || "").slice(0, 240);
  const lang = String(body.lang || "en");
  // Conversation first: a greeting, "how are you", thanks. No Qloo call needed.
  const facts = { places: catalogTotal };
  if (body.greet) return ({ chat: true, kind: "greet", speech: chatReply(lang, "greet", facts) });
  if (vagueKind(question)) return clarification(body);
  const talk = smallTalkKind(question);
  const business = await businessAnswer(body, { force: true });
  if (business) return business;
  if (talk) return ({ chat: true, kind: talk, question, speech: chatReply(lang, talk, facts) });
  // A plan with no town yet ("dinner tonight", "I want to buy a business"): ask which town.
  const townNames = [...surveyByTown.values()].map((row) => row.town);
  if (!body.pinTown && !knownTown(String(body.town || "")) && !splitTown(question, townNames).town) {
    const guide = guideKind(question);
    if (guide) return ({ chat: true, kind: guide, question, speech: chatReply(lang, guide, facts) });
  }
  // "Where can I hear live salsa?" asks for live music venues, which Qloo tags; a name search would
  // match a restaurant called Salsa. The genre is not on Qloo's place records, and the note says so.
  const music = body.pinTown ? null : musicAsk(question);
  if (music) {
    const where = splitTown(question, townNames).town || knownTown(String(body.town || "")) || "";
    const live = await tasteAnswer(music.query, where, question, lang, { strictOnly: true }).catch(() => null);
    if (live) {
      if (music.genre) {
        const caveat = lang === "es" ? `Qloo marca los lugares con música en vivo, no por género; ${music.genre} no está confirmada.`
          : `Qloo tags venues for live music, not by genre; ${music.genre} itself is not confirmed.`;
        live.note = `${caveat} ${live.note}`;
        live.answer = live.note;
        live.packet.note = live.note;
        // The caption and the voice carry the caveat too, in one short sentence.
        live.speech = `${live.speech} ${lang === "es" ? `Qloo marca música en vivo, no ${music.genre} como tal.` : `Qloo marks live music, not ${music.genre} itself.`}`;
      }
      return live;
    }
  }
  // French, Italian and German go to the town answer; the list search reads English and Spanish only.
  // Compare (pinTown) always answers for its own town, never with an island-wide list.
  const catalog = !body.pinTown && (lang === "en" || lang === "es") ? catalogOf(question) : null;
  if (catalog) {
    // With a town open, "hotels" means hotels in that town unless the question asks for the island.
    const islandWide = /\b(island|isla|puerto rico|all|every|todos|todas)\b/.test(fold(question));
    if (!catalog.town && !islandWide && knownTown(String(body.town || ""))) catalog.town = knownTown(String(body.town));
    const kind = await catalogKindAnswer(catalog, question, lang);
    const data = kind || await qlooCatalog(catalog, question);
    // An artist ("Bad Bunny"): where their fans go, after any place named for them (the Bad Bunny mural).
    const fans = !kind && data.places.length < 3 ? await artistAnswer(catalog, question, lang, data.places).catch(() => null) : null;
    // No business by that name and no artist: the words may be a taste ("mofongo").
    const taste = fans || data.places.length ? null
      : await tasteAnswer(catalog.query, catalog.town || "", question, lang, { strictOnly: true });
    return fans || taste || { ...data, speech: speechFor(lang, data.brief) };
  }
  // A town named in the question wins over the open one, so a spoken "in Mayagüez" moves the map.
  // Compare pins each side to its own town (pinTown).
  const named = body.pinTown ? "" : splitTown(question, [...surveyByTown.values()].map((row) => row.town)).town;
  const town = named || knownTown(String(body.town || ""));
  if (!town) return ({ error: "town is required", speech: speechFor(lang, { noTown: true }) });
  let taste = String(body.taste || "");
  let places = await qlooPlaces(town, taste, { enrich: false }); // answers need Qloo only; the page enriches its list
  const history = await townHistory(town).catch(() => null);
  let pack = answerPack(town, places, question);
  // A food question over the all-places sample may find no restaurant. Ask Qloo with the restaurant taste.
  if (pack.brief.intent === "Food" && !pack.brief.matched && body.taste !== "restaurant") {
    taste = "restaurant";
    places = await qlooPlaces(town, taste, { enrich: false });
    pack = answerPack(town, places, question);
  }
  const rowOf = (card) => ({
    name: card.name,
    record: card.line,
    popularity: card.popularity,
  });
  return ({
    town,
    question,
    ...pack,
    taste,
    history,
    speech: speechFor(lang, { ...pack.brief, historyFirst: firstSentence(history?.extract) }),
    packet: {
      town,
      question,
      focus: pack.focus,
      qloo: "GET /v2/insights · place · location query is the town plus Puerto Rico",
      places: pack.cards.map(rowOf),
      landmarks: pack.landmarks.map(rowOf),
      history: history ? { title: history.title, source: "Wikipedia" } : null,
      note: pack.note,
    },
  });
}

const routerKey = fs.existsSync(path.join(root, ".env")) ? projectEnv.OPENROUTER_API_KEY : process.env.OPENROUTER_API_KEY;
const modelLedger = createSpendLedger({ file: path.join(root, "cache", "agent", "spend.json"),
  cap: process.env.ZEMI_CHAT_USD_PER_DAY === undefined ? 1 : Number(process.env.ZEMI_CHAT_USD_PER_DAY) });
const townNames = [...surveyByTown.values()].map((row) => row.town);
// Built once by scripts/opportunity.mjs; the public demo serves it and makes no live call for it.
const opportunity = createOpportunity({ dir: path.join(root, "cache", "opportunity") });
const businessAnswer = createBusinessDiscovery({ towns: townNames, publish: publishPlace, opportunity,
  context: async town => ({ census: groundFile('census', town), overture: groundFile('overture', town) }),
  culture: townProfile,
  catalog: async town => {
    const saved = JSON.parse(fs.readFileSync(path.join(catalogDir, `${fold(town).replace(/ /g, "-")}.json`), "utf8"));
    if (!Array.isArray(saved?.places)) throw new Error("Saved catalog unavailable");
    return saved.places;
  },
});
// Free NWS/NHC/RainViewer feeds, cached in memory; no key, no daily cap needed.
const weather = createWeather({ centers: townCenters });
const registry = agentTools({ towns: townNames, weather,
    categories: CATEGORIES.map((row) => row.id), catalogFor, byPopularity, publishPlace,
    tasteAnswer, placeMatches, qlooSearchRaw, inTown, qlooAlsoLike, artistAnswer,
    townProfile, landmarksOf, townHistory, callQloo, opportunityFor: (industry) => opportunity.get(industry),
    townStats: (town) => ({ population: wikidataTowns.get(fold(town))?.population ?? null,
      supply: overtureCounts.get(fold(town)) ?? null, qlooPlaces: countsByTown.get(fold(town))?.total ?? null,
      demographics: groundFile("census", town) }),
  });
const textAgent = createAgent({ key: routerKey, ledger: modelLedger, tools: registry, model: process.env.ZEMI_MODEL || MODEL, towns: townNames,
  onFallback: (reason) => console.warn(`agent fallback: ${reason}`) });
// The control run: same model, prompt and settings, no Qloo tools. Built for /compare under ZEMI_COMPARE=1 and,
// since October 23, for the public "Ask again without Qloo" button, under the same ledger and visitor cap.
const bareAgent = createAgent({ key: routerKey, ledger: modelLedger, tools: withoutQloo(registry), towns: townNames,
  model: process.env.ZEMI_MODEL || MODEL, onFallback: (reason) => console.warn(`bare agent fallback: ${reason}`) });
// The closing note under the rule-based siting verdict: one short model call on the same data, same ledger.
const verdictNote = createNote({ key: routerKey, ledger: modelLedger, model: process.env.ZEMI_MODEL || MODEL });
// The catalog-only control for /compare (ZEMI_COMPARE=1 only): Qloo places without any affinity tool.
const catalogAgent = createAgent({ key: routerKey, ledger: modelLedger, tools: catalogOnly(registry), towns: townNames,
  model: process.env.ZEMI_MODEL || MODEL, onFallback: (reason) => console.warn(`catalog agent fallback: ${reason}`) });
// Three saved model runs, served when the model cannot answer (budget, provider, a refused round).
const samples = createSamples({ dir: path.join(root, "data", "samples") });
// Off unless ZEMI_MCP_ENABLED=1: then /mcp is a plain 404, like any unknown path.
const mcpHandler = process.env.ZEMI_MCP_ENABLED === "1" ? createMcpHandler({ tools: mcpTools(registry),
  appUrl: process.env.ZEMI_PUBLIC_URL || "https://zemi.r21digital.com",
  budget: mcpBudget({ limiter, callsPerDay: MCP_CAPS.calls, qlooCap: CAPS.qlooCalls, qlooReserve: MCP_CAPS.qlooReserve }),
  version: JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version }) : null;
let voiceAgent;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!rateGate(req, res, { limiter, limits: ROUTE_LIMITS, trustProxy: TRUST_PROXY, sendJson })) return;
  try {
    if (url.pathname === "/mcp") {
      if (!mcpHandler) { res.writeHead(404).end("not found"); return; }
      return await mcpHandler(req, res);
    }
    if (url.pathname === "/api/opportunity") {
      const industry = url.searchParams.get("industry") || "";
      if (!opportunity.industries.includes(industry)) return sendJson(res, 400, { error: "Unknown industry" });
      const file = opportunity.get(industry);
      return file ? sendJson(res, 200, file) : sendJson(res, 503, { error: "Opportunity data is not built yet" });
    }
    if (url.pathname === "/api/coastal/ports" && req.method === "GET") return sendJson(res, 200, PORT_DATA);
    if (url.pathname === "/api/coastal/ships" && req.method === "GET") return sendJson(res, 200, shipFeed.snapshot());
    if (url.pathname === "/api/coastal/places" && req.method === "GET") {
      const answer = await discoverCoast({ port: url.searchParams.get("port"), category: url.searchParams.get("category") || "all", artist: url.searchParams.get("artist") || "",
        lang: url.searchParams.get("lang") === "es" ? "es" : "en" });
      return sendJson(res, answer.error ? 400 : 200, answer);
    }
    if (url.pathname === "/api/voice/status") return sendJson(res, 200, { enabled: voiceAgent.enabled });
    if (url.pathname === "/api/voice/think") return await voiceAgent.handleThink(req, res, await readBody(req));
    // Public TestFlight join link for the front page CTA. Null when unset or not a canonical join URL.
    if (url.pathname === "/api/config") {
      return handleConfig(req, res, { env: process.env, sendJson });
    }
    if (url.pathname === "/api/capabilities") {
      sendJson(res, 200, {
        satellite: "Esri World Imagery",
        buildings: "Cesium OSM Buildings, needs the Cesium ion token bundled with CesiumJS",
        ...(process.env.ZEMI_PHOTOREAL_ENABLED === "1" ? { photoreal: "Google Photorealistic 3D Tiles, needs a Cesium ion token or a Google Maps key" } : {}),
        ask: "Answers from the Qloo places for the open town, plus a Wikipedia history of that town. No ChatGPT login.",
      });
      return;
    }
    if (url.pathname === "/api/speak" && req.method === "POST") {
      const body = await readBody(req);
      // Spoken lines are at most 280 characters (server/spoken.mjs); nothing longer needs the paid voice.
      const text = String(body.text || "").slice(0, 300).trim();
      if (!text) return sendJson(res, 400, { error: "text is required" });
      const voice = voiceFor(body.voice) || voiceFor(DEFAULT_VOICE);
      // Over the daily budget the page falls back to the browser's own voice. One visitor may use
      // at most a fifth of the day, so a single tab cannot silence every judge after it.
      const ip = limiter.visitorIp(req, TRUST_PROXY);
      if (!limiter.spend(`speak-chars:${ip}`, text.length, Math.ceil(CAPS.speakChars / 5))) return sendJson(res, 429, { error: "Your voice budget for today is used up" });
      if (!limiter.spend("speak-chars", text.length, CAPS.speakChars)) return sendJson(res, 429, { error: "The voice budget for today is used up" });
      try {
        const audio = await speakWithDeepgram(text, voice.id);
        res.writeHead(200, {
          "content-type": "audio/wav",
          "cache-control": "no-store",
          "x-zemi-voice": voice.id,
        });
        res.end(audio);
        return;
      } catch {
        // Piper speaks English only. Other languages fall back to the browser voice on the page.
        if (voice.lang !== "en") return sendJson(res, 502, { error: "voice failed" });
      }
      const file = await speakWithPiper(text);
      res.writeHead(200, {
        "content-type": "audio/wav",
        "cache-control": "no-store",
        "x-zemi-voice": "piper-lessac",
      });
      fs.createReadStream(file).pipe(res);
      res.on("close", () => fs.rm(file, { force: true }, () => {}));
      return;
    }
    if (url.pathname.startsWith("/api/place/")) {
      const [, , , id, what] = url.pathname.split("/");
      if (!UUID.test(id || "")) return sendJson(res, 400, { error: "a Qloo place id is required" });
      if (what === "audience") {
        const envelope = await callQloo("qloo_audience_demographics", { entity: id, entity_type: "place" });
        sendJson(res, 200, { status: envelope.status, ...audienceLines(envelope.results?.[0]?.query) });
        return;
      }
      if (what === "footprint") {
        const envelope = await callQloo("qloo_where_popular", { entity: id, entity_type: "place", within: "Puerto Rico", limit: 20 });
        const points = (envelope.results || [])
          .map((row) => ({ lat: Number(row.location?.latitude), lon: Number(row.location?.longitude), affinity: Number(row.query?.affinity) }))
          .filter((point) => inIsland(point.lat, point.lon));
        sendJson(res, 200, { status: envelope.status, points });
        return;
      }
      if (what === "culture") {
        // Music and trips only: Qloo's film, TV and book links for Puerto Rico places came back unrelated.
        const [artists, trips] = await Promise.all([
          qlooAlsoLike(id, "artist").catch(() => []),
          qlooAlsoLike(id, "destination").catch(() => []),
        ]);
        sendJson(res, 200, { status: artists.length || trips.length ? "ok" : "empty", artists, trips });
        return;
      }
      return sendJson(res, 404, { error: "unknown place view" });
    }
    if (url.pathname === "/api/taste") {
      const q = (url.searchParams.get("q") || "").slice(0, 80);
      const { query, town } = splitTown(q, [...surveyByTown.values()].map((row) => row.town));
      sendJson(res, 200, (await tasteAnswer(query, town, q, url.searchParams.get("lang") || "en")) || { tag: null });
      return;
    }
    // Cesium ion tokens are browser tokens by design (restrict them to this site in the ion dashboard).
    if (url.pathname === "/app/config.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
      res.end(`window.ZEMI_ION_TOKEN = ${JSON.stringify(process.env.CESIUM_ION_TOKEN || "")};
window.ZEMI_PHOTOREAL_ENABLED = ${process.env.ZEMI_PHOTOREAL_ENABLED === "1"};
`);
      return;
    }
    if (url.pathname === "/api/voices") {
      const speechEnabled = CAPS.speakChars > 0 && !!process.env.DEEPGRAM_API_KEY;
      sendJson(res, 200, { voices: speechEnabled ? VOICES : [], default: DEFAULT_VOICE,
        speechEnabled, listeningEnabled: CAPS.listenSeconds > 0 && !!process.env.DEEPGRAM_API_KEY });
      return;
    }
    if (url.pathname === "/api/search") {
      const q = url.searchParams.get("q") || "";
      sendJson(res, 200, { q, places: await qlooSearch(q) });
      return;
    }
    // TestFlight requests from the front page. Kept in cache/testers (never served, never in git) and
    // forwarded through an authenticated, retryable outbox to durable Google Sheets storage.
    if (url.pathname === "/api/testers" && req.method === "POST") {
      const result = checkTester(await readBody(req));
      if (result.bot) return sendJson(res, 200, { ok: true }); // looks accepted; nothing is kept
      if (!result.ok) return sendJson(res, 400, { error: `Please check your ${result.error}.` });
      if (!limiter.spend("tester-requests", 1, 300)) return sendJson(res, 429, { error: "Too many requests today. Please try again tomorrow." });
      // The same answer for a repeat, so the form cannot be used to learn who already asked.
      if (!readTesters().some((row) => row.email === result.value.email)) {
        const row = { at: new Date().toISOString(), ...result.value };
        fs.mkdirSync(path.dirname(testersFile), { recursive: true });
        fs.appendFileSync(testersFile, `${JSON.stringify(row)}\n`);
        void deliverTesters();
      }
      return sendJson(res, 200, { ok: true });
    }
    if (url.pathname === "/api/testers.csv") {
      const token = process.env.ADMIN_TOKEN || "";
      const given = String(req.headers.authorization || "").replace(/^Bearer /, "");
      const allowed = token.length >= 16 && given.length === token.length
        && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token));
      if (!allowed) return sendJson(res, 404, { error: "not found" });
      res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=testflight-requests.csv" });
      res.end(testersCsv(readTesters()));
      return;
    }
    if (url.pathname === "/api/town/profile") {
      const town = knownTown(url.searchParams.get("town"));
      if (!town) return sendJson(res, 400, { error: "a Puerto Rico municipality is required" });
      const [profile, catalog] = await Promise.all([townProfile(town).catch(() => null), catalogFor(town).catch(() => null)]);
      sendJson(res, 200, {
        town,
        stats: {
          population: wikidataTowns.get(fold(town))?.population ?? null,
          ground: overtureCounts.get(fold(town))?.total ?? null,
          qloo: catalog?.places.length ?? null,
          landmarks: landmarksOf(town).length,
        },
        profile,
        demographics: groundFile("census", town),
        source: "Qloo locality signal (signal.location.query), compared with all of Puerto Rico · Wikidata · Overture",
      });
      return;
    }
    if (url.pathname === "/api/landmarks") {
      const town = knownTown(url.searchParams.get("town"));
      if (!town) return sendJson(res, 400, { error: "a Puerto Rico municipality is required" });
      sendJson(res, 200, { town, source: "Wikidata (CC0) · photos from Wikimedia Commons", landmarks: landmarksOf(town) });
      return;
    }
    if (url.pathname === "/api/catalog") {
      const town = knownTown(url.searchParams.get("town"));
      if (!town) return sendJson(res, 400, { error: "a Puerto Rico municipality is required" });
      const data = await catalogFor(town);
      const category = url.searchParams.get("category") || "";
      if (!category) {
        const counts = overtureCounts.get(fold(town));
        return sendJson(res, 200, {
          town,
          measured: data.measured,
          ...summarize(data.places),
          population: wikidataTowns.get(fold(town))?.population ?? null,
          ground: counts ? { total: counts.total, top: counts.top.slice(0, 6) } : null,
        });
      }
      if (category !== "all" && !CATEGORIES.some((item) => item.id === category)) return sendJson(res, 400, { error: "unknown category" });
      const kind = url.searchParams.get("kind") || "";
      const rows = data.places
        .filter((place) => (category === "all" || place.category === category) && (!kind || place.genre === kind))
        .sort(byPopularity);
      // Fifty at a time: San Juan alone has over 800 places to eat.
      const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
      const places = rows.slice(offset, offset + 50).map(publishPlace);
      sendJson(res, 200, { town, measured: data.measured, category, kind, count: rows.length, offset, places });
      return;
    }
    if (url.pathname === "/api/weather") {
      const town = knownTown(url.searchParams.get("town"));
      if (!town) return sendJson(res, 400, { error: "a Puerto Rico municipality is required" });
      const [forecast, alerts] = await Promise.all([weather.forecast(town), weather.alerts()]);
      return sendJson(res, 200, { town, forecast, alerts });
    }
    if (url.pathname === "/api/weather/radar") return sendJson(res, 200, await weather.radar());
    if (url.pathname === "/api/weather/storms") return sendJson(res, 200, await weather.storms());
    if (url.pathname === "/api/heat") {
      const town = knownTown(url.searchParams.get("town"));
      if (!town) return sendJson(res, 400, { error: "a Puerto Rico municipality is required" });
      sendJson(res, 200, { town, source: "Qloo heatmap", taste: "restaurant", points: await qlooHeat(town) });
      return;
    }
    if (url.pathname === "/api/places/like") {
      // The picks of an answer, sent together as one Qloo entity signal. Names ride along so the
      // spoken line can say what the seeds were without another lookup.
      const ids = (url.searchParams.get("ids") || "").split(",").filter((id) => UUID.test(id)).slice(0, 5);
      const names = (url.searchParams.get("names") || "").split("|").map((name) => name.slice(0, 80));
      if (ids.length < 2) return sendJson(res, 400, { error: "two to five Qloo place ids are required" });
      const town = knownTown(url.searchParams.get("town")) || "";
      const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
      const answer = await moreLikeThese({ ids, town, lang }, {
        alsoLike: qlooAlsoLike,
        seedNames: async () => ids.map((id, index) => ({ id, name: names[index] || "this place" })),
        attachOsm: (places) => attachOsm(places).catch(() => {}),
        publishPlace,
      });
      return sendJson(res, 200, answer);
    }
    if (url.pathname === "/api/places") {
      const town = knownTown(url.searchParams.get("town"));
      const taste = url.searchParams.get("taste") || "";
      if (!town) return sendJson(res, 400, { error: "a Puerto Rico municipality is required" });
      // fast=1: Qloo only, at once. The page asks again without it for photos and social links.
      const fast = url.searchParams.get("fast") === "1";
      sendJson(res, 200, { town, places: await qlooPlaces(town, taste, { enrich: !fast }) });
      return;
    }
    if (url.pathname === "/api/chat" && req.method === "POST") {
      const body = await readBody(req);
      const checked = checkChat(body);
      if (!checked.ok || (checked.value.town && !knownTown(checked.value.town))) {
        return sendJson(res, 400, { error: "Check your question, language and conversation history." });
      }
      const ip = limiter.visitorIp(req, TRUST_PROXY);
      if (body.tools === "catalog-only") {
        // Only the local compare build runs this control; the public site keeps the one documented switch.
        if (process.env.ZEMI_COMPARE !== "1") return sendJson(res, 404, { error: "Not available here." });
        if (!limiter.spend(`chat-turns:${ip}`, 1, CHAT_TURNS_PER_VISITOR)) return sendJson(res, 429, { error: "Your model turns for today are used." });
        const run = await catalogAgent(checked.value);
        if (run.fallback) return sendJson(res, 503, { error: "The control run could not answer.", reason: run.reason });
        return sendJson(res, 200, { ...run, control: "catalog-only", evidence: { ...run.evidence, control: "catalog-only" } });
      }
      if (body.tools === "no-qloo") {
        // The live control (judge panel 10/23: a recorded comparison is not one a judge can fire). One
        // visitor turn and one model reservation, like any model answer; a failed run is a plain 503.
        // It always reaches the model, so a cross-origin page must not be able to fire it: JSON only
        // (so browsers preflight) and, when a browser sends Origin, only this site's own.
        if (!/^application\/json\b/i.test(String(req.headers["content-type"] || ""))) return sendJson(res, 415, { error: "Send JSON." });
        if (!sameOrigin(req)) return sendJson(res, 403, { error: "The control run answers this site only." });
        if (!limiter.spend(`chat-turns:${ip}`, 1, CHAT_TURNS_PER_VISITOR)) return sendJson(res, 429, { error: "Your model turns for today are used." });
        const bare = await bareAgent(checked.value);
        if (bare.fallback) return sendJson(res, 503, { error: "The control run could not answer.", reason: bare.reason });
        return sendJson(res, 200, { ...bare, control: "no-qloo", evidence: { ...bare.evidence, control: "no-qloo" } });
      }
      const business = await businessAnswer(checked.value);
      if (business) return sendJson(res, 200, await withVerdictNote(business, checked.value, ip));
      if (vagueKind(checked.value.question)) return sendJson(res, 200, clarification(checked.value));
      let answer;
      if (limiter.spend(`chat-turns:${ip}`, 1, CHAT_TURNS_PER_VISITOR)) answer = await textAgent(checked.value);
      else { console.warn("agent fallback: visitor-cap"); answer = { fallback: true, reason: "visitor-cap" }; }
      if (!answer.fallback) return sendJson(res, 200, answer);
      // A saved run for this exact question: the page gets the real answer and map, labeled replay.
      const sample = samples.match(checked.value);
      if (sample) { console.warn(`agent replay: ${answer.reason || "unknown"}`); return sendJson(res, 200, { ...sample, fallback: true }); }
      const fallback = await patternAnswer(checked.value);
      // The page labels this answer as the rules router; the reason is a fixed code, never provider text.
      const evidence = { mode: "rules", reason: answer.reason || "unknown", at: new Date().toISOString(),
        ...(answer.rounds ? { rounds: answer.rounds, calls: answer.calls, model: answer.model } : {}) };
      return sendJson(res, fallback.error ? 400 : 200, { ...fallback, fallback: true, evidence });
    }
    if (url.pathname === "/api/ask" && req.method === "POST") {
      const body = await readBody(req);
      if (!body || typeof body !== "object" || Array.isArray(body) || (body.question !== undefined && typeof body.question !== "string")
        || (body.history !== undefined && !Array.isArray(body.history))) {
        return sendJson(res, 400, { error: "Check your question and conversation history." });
      }
      const answer = body.artist !== undefined ? await discover(body) : await patternAnswer(body);
      return sendJson(res, answer.error ? 400 : 200, answer);
    }
  } catch (err) {
    const privateRoute = ["/api/chat", "/api/ask", "/api/testers", "/mcp"].includes(url.pathname) || url.pathname.startsWith("/api/voice/");
    sendJson(res, 502, { error: privateRoute ? "Zemi-Aku could not complete this request. Please try again." : err.message });
    return;
  }

  let rel;
  try {
    // / is the front page, /app the live map.
    const pretty = { "/": "/app/home.html", "/app": "/app/index.html", "/app/": "/app/index.html", "/compare": "/app/compare.html", "/notes-for-qloo": "/app/qloo-notes.html" };
    rel = decodeURIComponent(pretty[url.pathname] || url.pathname);
  } catch {
    res.writeHead(400).end("bad path");
    return;
  }
  const file = path.resolve(root, "." + rel);
  // Only the page and its public data. Never .env, .git, node_modules, or the server code.
  const isPublic = PUBLIC_DIRS.some((dir) => file.startsWith(dir + path.sep)) && types[path.extname(file)];
  if (!isPublic || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

// Local dishes people ask for, which speech recognition otherwise mishears ("mofombo").
const DISH_TERMS = ["mofongo", "trifongo", "alcapurrias", "bacalaítos", "pastelillos", "lechón", "lechonera", "chinchorro", "piraguas", "tostones", "pinchos", "mallorca"];
attachListenRelay(server, {
  keyterms: [...[...surveyByTown.values()].map((row) => row.town), ...DISH_TERMS],
  maxSeconds: 300,
  trustProxy: TRUST_PROXY,
  visitorIp: (req) => limiter.visitorIp(req, TRUST_PROXY),
  allow: (req) => limiter.take(`${limiter.visitorIp(req, TRUST_PROXY)}:listen`, 4),
  // The whole session is charged before the upgrade; the unused part is refunded on close.
  reserve: (seconds) => limiter.spend("listen-seconds", seconds, CAPS.listenSeconds),
  settle: (reserved, used) => limiter.spend("listen-seconds", used - reserved, Infinity),
  maxActivePerIp: 1, maxActive: 8,
});
voiceAgent = attachVoiceAgent(server, {
  trustProxy: TRUST_PROXY,
  key: routerKey, deepgramKey: process.env.DEEPGRAM_API_KEY, baseUrl: process.env.ZEMI_PUBLIC_URL,
  towns: townNames, tools: registry, ledger: modelLedger,
  // Ten minutes a conversation; the session's whole length is reserved from the daily minutes first.
  maxSeconds: 600,
  voiceLedger: createSpendLedger({ file: path.join(root, "cache", "agent", "voice-spend.json"),
    cap: process.env.ZEMI_VOICE_CHAT_USD_PER_DAY === undefined ? 0.5 : Number(process.env.ZEMI_VOICE_CHAT_USD_PER_DAY) }),
  timeLedger: createSpendLedger({ file: path.join(root, "cache", "agent", "voice-seconds.json"),
    cap: (process.env.ZEMI_VOICE_MINUTES_PER_DAY === undefined ? 120 : Number(process.env.ZEMI_VOICE_MINUTES_PER_DAY)) * 60 }),
  visitorIp: req => limiter.visitorIp(req, TRUST_PROXY),
  greeting: lang => chatReply(lang, "greet", { places: catalogTotal }),
  allow: req => limiter.take(`${limiter.visitorIp(req, TRUST_PROXY)}:voice`, 4),
});
server.on("upgrade", (req, socket) => {
  if (!["/api/listen", "/api/voice"].includes(new URL(req.url ?? "/", "http://localhost").pathname)) socket.destroy();
});

// One bad request must not take the demo down.
process.on("unhandledRejection", (err) => console.error("unhandled", err?.message || err));
process.on("uncaughtException", (err) => console.error("uncaught", err?.message || err));

// HOST=0.0.0.0 inside the container; localhost otherwise.
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () => {
  console.log(`eagle http://${host}:${port}/`);
  // Warm the harness: its first start takes about 10 s.
  callQloo("qloo_find_tags", { query: "restaurant", limit: 1 }).catch(() => {});
  // Warm the demo towns so the first visitor does not wait on OpenStreetMap (one request a second).
  (async () => {
    for (const town of ["San Juan", "Ponce", "Mayagüez", "Vieques", "Cataño"]) {
      for (const taste of ["", "restaurant"]) await qlooPlaces(town, taste).catch(() => {});
    }
    // Then every town's catalog, from disk when it is there, one town at a time.
    for (const row of surveyByTown.values()) await catalogFor(row.town).catch(() => {});
  })();
});
