// Public TestFlight join link from App Store Connect. Only a canonical https join URL is accepted.

const JOIN_PATH = /^\/join\/([A-Za-z0-9]{4,16})$/;

export function betaUrl(env = process.env) {
  const raw = env?.TESTFLIGHT_PUBLIC_URL;
  if (raw == null || String(raw).trim() === "") return null;
  try {
    const url = new URL(String(raw).trim());
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "testflight.apple.com") return null;
    if (url.username || url.password) return null;
    if (url.port) return null;
    if (url.search || url.hash) return null;
    const match = url.pathname.match(JOIN_PATH);
    if (!match) return null;
    return `https://testflight.apple.com/join/${match[1]}`;
  } catch {
    return null;
  }
}

// GET|HEAD /api/config — public beta link for the front page. Rate limiting stays in the server.
export function handleConfig(req, res, { env = process.env, sendJson } = {}) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" }, { allow: "GET, HEAD" });
    return;
  }
  const body = { betaUrl: betaUrl(env) };
  if (req.method === "HEAD") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end();
    return;
  }
  sendJson(res, 200, body, { "cache-control": "no-store" });
}
