// Per-visitor rate limits and daily caps, so a public URL cannot spend the Deepgram credit or the
// Qloo quota. In memory: one container, and a restart forgiving everyone is acceptable.

export const ROUTE_LIMITS = {
  "/api/chat": 12, "/api/ask": 20, "/api/taste": 30, "/api/search": 60, "/api/places": 40, "/api/places/like": 20,
  "/api/place": 40, "/api/heat": 30, "/api/catalog": 60, "/api/config": 60, "/api/testers": 6, "/api/speak": 12, "/api/voices": 30,
  "/api/opportunity": 30, "/api/plan": 20, "/api/weather": 30, "/api/weather/radar": 30, "/api/weather/storms": 30,
  // Claude and ChatGPT reach /mcp from shared cloud addresses, and a client session spends about four
  // requests before its first tool call. The daily allowance, not this burst limit, bounds spending.
  "/mcp": 60,
};

export function dailyCap(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function createLimiter({ now = () => Date.now() } = {}) {
  const buckets = new Map();
  const daily = new Map();

  // Token bucket: `perMinute` requests, refilled continuously.
  function take(key, perMinute) {
    const t = now();
    const bucket = buckets.get(key) || { tokens: perMinute, at: t };
    bucket.tokens = Math.min(perMinute, bucket.tokens + ((t - bucket.at) / 60000) * perMinute);
    bucket.at = t;
    buckets.set(key, bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  function today() {
    return new Date(now()).toISOString().slice(0, 10);
  }

  // Daily budget shared by every visitor (UTC day).
  function spend(name, amount, cap) {
    return spendDay(name, amount, cap) !== null;
  }
  // The same, returning the UTC day it charged (null when over the cap), so a refund names that day exactly.
  function spendDay(name, amount, cap) {
    const day = today();
    const row = daily.get(name)?.day === day ? daily.get(name) : { day, used: 0 };
    daily.set(name, row);
    if (row.used + amount > cap) return null;
    row.used += amount;
    return day;
  }

  // Gives back what a request spent and could not use (a model turn the provider refused), on the day it was spent:
  // a request that crosses UTC midnight never refunds the next day's turn (Codex review, round ten).
  function refund(name, amount, day = today()) {
    const row = daily.get(name);
    if (row?.day === day) row.used = Math.max(0, row.used - amount);
  }

  function used(name) {
    const row = daily.get(name);
    return row?.day === today() ? row.used : 0;
  }

  // Behind a reverse proxy (Caddy on the public VM, with no trusted_proxies, so it replaces any
  // client-sent header) the visitor is the LAST X-Forwarded-For entry; anything before it can be forged.
  // If a CDN or load balancer is ever placed in front of Caddy, every visitor would share one address.
  function visitorIp(req, trustProxy) {
    const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",").pop().trim();
    return (trustProxy && forwarded) || req.socket?.remoteAddress || "unknown";
  }

  function sweep() {
    const cutoff = now() - 10 * 60000;
    for (const [key, bucket] of buckets) if (bucket.at < cutoff) buckets.delete(key);
  }

  return { take, spend, spendDay, refund, used, visitorIp, sweep };
}

// Shared gate for /api/* and /mcp. Returns false when a 429 was already sent.
export function rateGate(req, res, { limiter, limits = ROUTE_LIMITS, trustProxy, sendJson }) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/") && url.pathname !== "/mcp") return true;
  const route = url.pathname.startsWith("/api/place/") ? "/api/place" : url.pathname;
  const ip = limiter.visitorIp(req, trustProxy);
  if (!limiter.take(`${ip}:${route}`, limits[route] ?? 40)) {
    sendJson(res, 429, { error: "Too many requests. Wait a minute and try again." });
    return false;
  }
  return true;
}
