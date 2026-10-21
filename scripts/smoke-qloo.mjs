// Proves the Qloo hackathon key works: one entity search and one insights call.
// Prints no secrets.
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

const get = async (path) => {
  const res = await fetch(`${base}${path}`, { headers: { "X-Api-Key": key } });
  return { status: res.status, body: res.ok ? await res.json() : await res.text() };
};

const search = await get(`/search?query=${encodeURIComponent("San Juan Puerto Rico")}`);
console.log(`/search: HTTP ${search.status}`);

const insights = await get(`/v2/insights?filter.type=urn:entity:movie&take=3`);
console.log(`/v2/insights: HTTP ${insights.status}`);

process.exit(search.status === 200 && insights.status === 200 ? 0 : 1);
