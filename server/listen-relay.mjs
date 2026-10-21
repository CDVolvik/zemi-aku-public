// Relays live microphone audio from the page to Deepgram (nova-3) and the transcripts back.
// The Deepgram key never reaches the browser; this key cannot mint browser tokens anyway.
import { WebSocketServer, WebSocket } from "ws";
import { sttLanguage } from "./voices.mjs";
import { voiceOriginAllowed } from "./voice-agent.mjs";

// Admission, in order: the page's own origin only; the per-visitor burst (allow); one live session per
// visitor and a global ceiling; then the whole maxSeconds is reserved from the daily seconds BEFORE the
// upgrade (reserve) and settled with the real length on close (settle), so concurrent sessions cannot
// outrun the cap and a refused reservation never streams a byte (Codex round 2, finding 1).
export function attachListenRelay(server, {
  keyterms = [], allow = () => true, maxSeconds = 300, trustProxy = false,
  originAllowed = (req) => voiceOriginAllowed(req, trustProxy),
  visitorIp = (req) => req.socket?.remoteAddress || "unknown",
  reserve = () => true, settle = () => {},
  maxActivePerIp = 1, maxActive = 8,
  wss = new WebSocketServer({ noServer: true, maxPayload: 1 << 20 }),
  relayImpl = relay,
} = {}) {
  const activeByIp = new Map();
  let active = 0;
  const refuse = (socket, status) => socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/listen") return;
    if (!originAllowed(req)) return refuse(socket, "403 Forbidden");
    const ip = visitorIp(req);
    if (!allow(req) || active >= maxActive || (activeByIp.get(ip) || 0) >= maxActivePerIp) return refuse(socket, "429 Too Many Requests");
    if (!reserve(maxSeconds)) return refuse(socket, "429 Too Many Requests");
    active += 1;
    activeByIp.set(ip, (activeByIp.get(ip) || 0) + 1);
    // The page streams WebM/Opus, which Deepgram detects. Raw PCM must say so (the check script does).
    const raw = url.searchParams.get("encoding") === "linear16"
      ? { encoding: "linear16", sample_rate: String(Math.min(48000, Math.max(8000, Number(url.searchParams.get("sample_rate")) || 16000))) }
      : {};
    wss.handleUpgrade(req, socket, head, (client) => {
      const started = Date.now();
      const limit = setTimeout(() => client.close(4004, "session limit"), maxSeconds * 1000);
      limit.unref?.(); // the server keeps the process alive; a session timer alone must not
      let settled = false;
      client.on("close", () => {
        if (settled) return;
        settled = true;
        clearTimeout(limit);
        active -= 1;
        const left = (activeByIp.get(ip) || 1) - 1;
        if (left > 0) activeByIp.set(ip, left); else activeByIp.delete(ip);
        settle(maxSeconds, Math.min(maxSeconds, Math.ceil((Date.now() - started) / 1000)));
      });
      relayImpl(client, sttLanguage(url.searchParams.get("lang")), keyterms, raw);
    });
  });
}

function relay(client, language, keyterms, raw) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    client.close(4001, "deepgram missing");
    return;
  }
  const params = new URLSearchParams({
    model: "nova-3",
    language,
    smart_format: "true",
    interim_results: "true",
    endpointing: "400",
    utterance_end_ms: "1200",
    vad_events: "true",
    ...raw,
  });
  // Town names spelled right in every language ("Ponce", not "Pons").
  for (const term of keyterms) params.append("keyterm", term);
  const upstream = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, { headers: { Authorization: `Token ${key}` } });
  const pending = [];
  let keepAlive = null;
  upstream.on("open", () => {
    for (const chunk of pending.splice(0)) upstream.send(chunk);
    keepAlive = setInterval(() => {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(JSON.stringify({ type: "KeepAlive" }));
    }, 8000);
  });
  upstream.on("message", (data) => {
    if (client.readyState === WebSocket.OPEN) client.send(data.toString());
  });
  upstream.on("close", () => {
    clearInterval(keepAlive);
    if (client.readyState === WebSocket.OPEN) client.close();
  });
  upstream.on("error", () => {
    clearInterval(keepAlive);
    if (client.readyState === WebSocket.OPEN) client.close(4002, "deepgram failed");
  });
  client.on("message", (data, isBinary) => {
    if (!isBinary) return;
    if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
    else if (upstream.readyState === WebSocket.CONNECTING && pending.length < 200) pending.push(data);
  });
  client.on("close", () => {
    clearInterval(keepAlive);
    if (upstream.readyState === WebSocket.OPEN) upstream.send(JSON.stringify({ type: "CloseStream" }));
    setTimeout(() => upstream.terminate(), 1500);
  });
}
