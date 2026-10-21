// Deepgram owns turn-taking; this server owns model spend, tools and map actions.
import crypto from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { voiceFor } from "./voices.mjs";
import { MODEL, PROMPT, MAX_REQUEST_BYTES, RESERVATION, validArgs } from "./agent.mjs";

export function voiceOriginAllowed(req, trustProxy = false) {
  try {
    const origin = new URL(req.headers.origin);
    const protocol = req.socket?.encrypted || (trustProxy && req.headers["x-forwarded-proto"] === "https") ? "https:" : "http:";
    return origin.protocol === protocol && origin.host === req.headers.host && origin.origin === req.headers.origin;
  } catch { return false; }
}

// Deepgram's function results are limited; a long list is shortened from the end until it fits, and
// only a result with no list to shorten is refused (an eight-place artist answer used to be dropped).
export function fitContent(result, limit = 7000) {
  let content = JSON.stringify(result);
  if (content.length <= limit) return content;
  const key = result && typeof result === "object" && !Array.isArray(result)
    ? Object.keys(result).filter((k) => Array.isArray(result[k]) && result[k].length).sort((a, b) => JSON.stringify(result[b]).length - JSON.stringify(result[a]).length)[0]
    : null;
  if (key) {
    const short = { ...result, note: `${result.note ? result.note + " " : ""}List shortened to fit the voice turn.` };
    for (let n = result[key].length - 1; n >= 1; n -= 1) {
      short[key] = result[key].slice(0, n);
      content = JSON.stringify(short);
      if (content.length <= limit) return content;
    }
  }
  return JSON.stringify({ error: "Result too large; narrow your question." });
}

export function createVoiceSession({ voice, town = "", taste = "", greeting = "", towns, baseUrl, token, key,
  tools, ledger, voiceLedger, sendBrowser, sendProvider, fetchImpl = fetch, toolTimeoutMs = 20000 }) {
  const chosen = voiceFor(voice);
  if (!chosen || (town && !towns.includes(town)) || typeof taste !== "string" || taste.length > 80) throw new Error("Invalid voice context");
  const definitions = tools.map(({ name, description, parameters }) => ({ name, description, parameters, defer_until_eot: true }));
  const prompt = () => `${PROMPT}\nLanguage: ${chosen.lang}. Open town: ${town || "none"}. Selected taste: ${taste || "none"}.`;
  const settings = { type: "Settings", audio: { input: { encoding: "linear16", sample_rate: 16000 },
    output: { encoding: "linear16", sample_rate: 24000, container: "none" } }, agent: {
    ...(greeting ? { greeting } : {}),
    listen: { provider: { type: "deepgram", model: "nova-3", language: chosen.lang } },
    think: { provider: { type: "open_ai", model: MODEL }, context_length: 12000,
      endpoint: { url: `${baseUrl}/api/voice/think`, headers: { authorization: `Bearer ${token}` } },
      prompt: prompt(), functions: definitions },
    speak: { provider: { type: "deepgram", model: chosen.id } },
  } };
  let closed = false, activeThink = null, requests = 0, calls = 0;
  const pending = new Map(), seen = new Set(), cancelled = new Set();
  const reasoning = new Map();
  const canonicalCalls = calls => calls.map(call => ({ id: call.id, type: "function",
    function: { name: call.function?.name, arguments: call.function?.arguments } }));
  const lifetime = new AbortController();
  const error = status => ({ status, body: { error: "Voice agent unavailable. Use the standard conversation." } });
  function close() { closed = true; lifetime.abort(); reasoning.clear(); for (const abort of pending.values()) abort.abort(); }
  async function onProvider(message, binary = false) {
    if (closed) return;
    if (binary) { sendBrowser(message, true); return; }
    if (message.type === "FunctionCallCancelled") {
      for (const call of message.functions || []) { cancelled.add(call.id); pending.get(call.id)?.abort(); }
      return;
    }
    if (message.type === "FunctionCallRequest") {
      if (!Array.isArray(message.functions) || message.functions.length > 4) { close(); sendBrowser({ type: "VoiceError" }); return; }
      const actions = [];
      for (const call of message.functions) {
        if (closed || cancelled.has(call.id) || call.client_side !== true || typeof call.id !== "string" || call.id.length > 100 || seen.has(call.id)) continue;
        if (++calls > 32) { close(); sendBrowser({ type: "VoiceError" }); return; }
        seen.add(call.id);
        const tool = tools.find(item => item.name === call.name);
        const abort = new AbortController(); pending.set(call.id, abort);
        const timeout = setTimeout(() => abort.abort(), toolTimeoutMs);
        let result = { error: "Unknown tool or invalid arguments" }, output;
        try {
          const args = typeof call.arguments === "string" && call.arguments.length <= 2000 ? JSON.parse(call.arguments) : null;
          if (tool && validArgs(tool.parameters, args)) {
            output = await Promise.race([tool.run(args), new Promise((_, reject) => {
              abort.signal.addEventListener("abort", () => reject(new Error("Cancelled")), { once: true });
            })]);
            result = output.data ?? output;
          }
        } catch { result = { error: "This data is unavailable. Do not guess." }; }
        finally { clearTimeout(timeout); pending.delete(call.id); }
        if (closed || cancelled.has(call.id)) continue;
        if (abort.signal.aborted) output = null;
        if (output?.action) {
          if (towns.includes(output.action.town)) town = output.action.town;
          actions.push({ id: call.id, action: output.action });
        }
        sendProvider({ type: "FunctionCallResponse", id: call.id, name: call.name, content: fitContent(result, 7000) });
      }
      const committed = actions.filter(item => !cancelled.has(item.id)).map(item => item.action);
      if (!closed && committed.length) sendBrowser({ type: "MapActions", actions: committed });
      return;
    }
    if (message.type === "Error" || (message.type === "Warning" && /THINK|FAILED/.test(message.code || ""))) {
      sendBrowser({ type: "VoiceError" }); close(); return;
    }
    if (message.type === "ConversationText") {
      if (["user", "assistant"].includes(message.role) && typeof message.content === "string" && message.content.length <= 6000)
        sendBrowser({ type: message.type, role: message.role, content: message.content });
      return;
    }
    if (["SettingsApplied", "UserStartedSpeaking", "AgentThinking", "AgentStartedSpeaking", "AgentAudioDone"].includes(message.type)) sendBrowser({ type: message.type });
  }
  async function think(body, signal) {
    if (closed || requests >= 8) return error(429);
    if (!key || !Array.isArray(body?.messages) || body.messages.length > 40 || body.messages.some(row => !row
      || !["system", "user", "assistant", "tool"].includes(row.role)
      || (row.content != null && (typeof row.content !== "string" || row.content.length > 12000)))) return error(400);
    const messages = [{ role: "system", content: prompt() }, ...body.messages.filter(row => row.role !== "system").map(row => {
      const { reasoning_details, reasoning: ignoredReasoning, ...message } = row;
      if (row.role === "assistant" && Array.isArray(row.tool_calls)) message.tool_calls = canonicalCalls(row.tool_calls);
      const cached = row.role === "assistant" && reasoning.get(row.tool_calls?.[0]?.id);
      if (cached && cached.calls === JSON.stringify(message.tool_calls)) message.reasoning_details = cached.details;
      return message;
    })];
    const request = { model: MODEL, messages, tools: definitions.map(({ defer_until_eot, ...fn }) => ({ type: "function", function: fn })),
      tool_choice: "auto", max_tokens: 1200, stream: false, provider: { require_parameters: true }, reasoning: { effort: "low" } };
    if (Buffer.byteLength(JSON.stringify(request)) > MAX_REQUEST_BYTES) return error(413);
    const day = new Date().toISOString().slice(0, 10);
    if (voiceLedger && !voiceLedger.reserve(RESERVATION)) return error(429);
    if (!ledger.reserve(RESERVATION)) { voiceLedger?.settle?.(RESERVATION, 0, day); return error(429); }
    activeThink?.abort("superseded");
    const current = new AbortController();
    const deadline = AbortSignal.any([lifetime.signal, current.signal, AbortSignal.timeout(20000), ...(signal ? [signal] : [])]);
    activeThink = current; requests++;
    const settle = cost => { ledger.settle?.(RESERVATION, cost, day); voiceLedger?.settle?.(RESERVATION, cost, day); };
    const interrupted = () => ({ status: 200, body: { id: "zemi-interrupted", object: "chat.completion", model: MODEL,
      choices: [{ message: { role: "assistant", content: "" }, finish_reason: "stop" }] } });
    try {
      const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", { method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "x-title": "Zemi-Aku Voice" },
        body: JSON.stringify(request), signal: deadline });
      if (!response.ok) {
        if ([400, 401, 402, 403, 404, 429].includes(response.status)) settle(0);
        if (current.signal.reason === "superseded") return interrupted();
        return error(502);
      }
      const data = await response.json();
      settle(data.usage?.cost);
      if (current.signal.reason === "superseded") return interrupted();
      const choice = data.choices?.[0];
      if (!choice?.message || JSON.stringify(choice).length > 16000 || (choice.message.tool_calls?.length || 0) > 4) return error(502);
      if (choice.message.tool_calls?.length && Array.isArray(choice.message.reasoning_details)) {
        reasoning.set(choice.message.tool_calls[0].id, { calls: JSON.stringify(canonicalCalls(choice.message.tool_calls)), details: choice.message.reasoning_details });
      }
      return { status: 200, body: { id: data.id || "zemi-voice", object: "chat.completion", model: MODEL, choices: [choice] } };
    } catch {
      if (current.signal.reason === "superseded") return interrupted();
      return error(502);
    }
    finally { if (activeThink === current) activeThink = null; }
  }
  return { settings, onProvider, think, close };
}

// Only the owning Deepgram connection receives the short-lived think token.
export function attachVoiceAgent(server, { key, deepgramKey, baseUrl = "", towns, tools, ledger, voiceLedger, timeLedger,
  allow = () => true, visitorIp = req => req.socket.remoteAddress, greeting = () => "", trustProxy = false, maxSeconds = 300,
  connect = (url, options) => new WebSocket(url, options), fetchImpl = fetch }) {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password
      || !url.hostname.includes(".") || url.hostname.endsWith(".localhost") || url.hostname.includes(":") || /^[\d.]+$/.test(url.hostname)) baseUrl = "";
    else baseUrl = url.origin;
  } catch { baseUrl = ""; }
  const enabled = Boolean(key && deepgramKey && baseUrl);
  const canStart = () => enabled && ledger.canReserve?.(RESERVATION) !== false
    && voiceLedger?.canReserve?.(RESERVATION) !== false && timeLedger.canReserve?.(maxSeconds) !== false;
  const sessions = new Map(), visitors = new Set();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64000 });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/voice") return;
    const ip = visitorIp(req);
    const chosen = voiceFor(url.searchParams.get("voice"));
    const town = url.searchParams.get("town") || "", taste = url.searchParams.get("taste") || "";
    const reject = status => socket.end(`HTTP/1.1 ${status} Unavailable\r\nConnection: close\r\n\r\n`);
    if (!canStart()) return reject(503);
    if (!voiceOriginAllowed(req, trustProxy) || !chosen || (town && !towns.includes(town)) || taste.length > 80) return reject(403);
    if (sessions.size >= 3 || visitors.has(ip) || !allow(req)) return reject(429);
    wss.handleUpgrade(req, socket, head, client => {
      if (sessions.size >= 3 || visitors.has(ip) || !timeLedger.reserve(maxSeconds)) return client.close(4004, "daily voice limit");
      const day = new Date().toISOString().slice(0, 10), started = Date.now();
      visitors.add(ip);
      const token = crypto.randomBytes(32).toString("hex");
      let upstream, ready = false, paused = false;
      const pausedActions = [];
      const sendBrowser = (data, binary = false) => {
        if (paused && !binary && data.type === "MapActions") { pausedActions.push(...data.actions); return; }
        if (client.readyState === WebSocket.OPEN && (!paused || data.type === "VoiceError")) {
          if (client.bufferedAmount > 1 << 20) return client.close(4004, "slow client");
          client.send(binary ? data : JSON.stringify(data), { binary });
        }
        if (!binary && data.type === "VoiceError") client.close(4002, "voice unavailable");
      };
      const sendProvider = message => { if (upstream?.readyState === WebSocket.OPEN) upstream.send(JSON.stringify(message)); };
      const session = createVoiceSession({ voice: chosen.id, town, taste, greeting: greeting(chosen.lang), towns, baseUrl, token, key,
        tools, ledger, voiceLedger, sendBrowser, sendProvider, fetchImpl });
      sessions.set(token, session);
      const expiry = setTimeout(() => client.close(4004, "session limit"), maxSeconds * 1000);
      const setup = setTimeout(() => client.close(4002, "voice unavailable"), 10000);
      const keepAlive = setInterval(() => sendProvider({ type: "KeepAlive" }), 8000);
      client.on("error", () => {});
      client.on("close", () => {
        clearTimeout(expiry); clearTimeout(setup); clearInterval(keepAlive);
        sessions.delete(token); visitors.delete(ip); session.close(); upstream?.terminate();
        try { timeLedger.settle(maxSeconds, Math.min(maxSeconds, Math.ceil((Date.now() - started) / 1000)), day); } catch { /* Keep reservation. */ }
      });
      try {
        upstream = connect("wss://agent.deepgram.com/v1/agent/converse", { headers: { Authorization: `Token ${deepgramKey}` }, maxPayload: 1 << 20 });
        upstream.on("open", () => sendProvider(session.settings));
        upstream.on("message", (data, binary) => {
          if (binary) { if (ready) session.onProvider(data, true).catch(() => client.close(4002)); return; }
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "SettingsApplied") { ready = true; clearTimeout(setup); }
            session.onProvider(message).catch(() => client.close(4002));
          } catch { client.close(4002, "voice unavailable"); }
        });
        upstream.on("error", () => { sendBrowser({ type: "VoiceError" }); });
        upstream.on("close", () => client.close(4002, "voice unavailable"));
      } catch { client.close(4002, "voice unavailable"); }
      client.on("message", (data, binary) => {
        if (!ready) return;
        if (binary) {
          if (!paused && data.length <= 6400 && upstream.readyState === WebSocket.OPEN) {
            if (upstream.bufferedAmount > 1 << 20) return client.close(4004, "slow upstream");
            upstream.send(data, { binary: true });
          }
          return;
        }
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "Pause") paused = true;
          else if (message.type === "Resume") {
            paused = false;
            if (pausedActions.length) sendBrowser({ type: "MapActions", actions: pausedActions.splice(0) });
          }
          else if (message.type === "InjectUserMessage" && !paused && typeof message.content === "string" && message.content.length <= 1200)
            sendProvider({ type: "InjectUserMessage", content: message.content });
        } catch { /* Never forward browser configuration or arbitrary provider messages. */ }
      });
    });
  });
  async function handleThink(req, res, body) {
    const token = String(req.headers.authorization || "").match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    const session = token && sessions.get(token);
    if (req.method !== "POST" || !session) { res.writeHead(404).end(); return; }
    const abort = new AbortController();
    const abandoned = () => { if (!res.writableFinished) abort.abort(); };
    res.once("close", abandoned);
    let result;
    try { result = await session.think(body, abort.signal); }
    finally { res.off("close", abandoned); }
    if (res.destroyed) return;
    if (result.status !== 200 || !body.stream) {
      res.writeHead(result.status, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(result.body)); return;
    }
    const choice = result.body.choices[0];
    const delta = { ...choice.message };
    if (delta.tool_calls) delta.tool_calls = delta.tool_calls.map((call, index) => ({ ...call, index }));
    const chunk = (delta, finish_reason) => `data: ${JSON.stringify({ id: result.body.id, object: "chat.completion.chunk", model: MODEL, created: Math.floor(Date.now() / 1000),
      choices: [{ index: 0, delta, finish_reason }] })}\n\n`;
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" });
    res.end(chunk(delta, null) + chunk({}, choice.finish_reason || "stop") + "data: [DONE]\n\n");
  }
  return { get enabled() { return canStart(); }, handleThink };
}
