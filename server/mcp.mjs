// Zemi-Aku as an MCP connector: the agent's read-only tools, for Claude, ChatGPT and other agents.
// Their model does the reasoning. We spend only the shared Qloo budget, never model credits.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { validArgs } from "./agent.mjs";
import { fold } from "./lib.mjs";

export const MCP_INSTRUCTIONS = "Zemi-Aku answers questions about Puerto Rico's 78 municipalities from Qloo's taste data, "
  + "with Overture, Wikidata, Wikipedia and Census PRCS as separately named sources. Qloo affinity describes tastes; "
  + "it is not proof of demand, sales, visits or business viability. Never invent a place, address, price, opening hours "
  + "or statistic; if a tool returns nothing, say so. Name the source of each fact. Give Census figures with their survey "
  + "period and margin of error. An artist affinity never means the artist visited a place. Results may include map_url; "
  + "share it so the user can see the places on the Zemi-Aku map.";
const MAX_BODY = 64 * 1024;

export const MCP_TOOL_NAMES = ["town_catalog", "find_places", "place_details", "fans_also_love", "artist_places",
  "town_profile", "landmarks", "town_history", "qloo_describe", "qloo_recommend", "qloo_compare_audiences", "qloo_entity_tags", "opportunity_map"];
// The text agent caps tool results at 7,000 characters to fit its own request budget. Eight places
// with descriptions already pass that, and here the client's model pays, so the cap is higher.
const MAX_RESULT = 20000;
const UNAVAILABLE = "This data is unavailable. Do not guess.";

// map_town only moves our own map, and qloo_trends may be unavailable on the hackathon API.
export function mcpTools(registry) {
  return registry.filter((tool) => MCP_TOOL_NAMES.includes(tool.name));
}

// Links use only the parameters the map page already reads (app/index.html: town, ask, category).
// Its &artist= journey is island-wide, so an artist link asks the town question instead; checked in
// Chrome, it opens the same leading places the tool returns. find_places links to the town only: the
// page's own router answers dish questions more loosely than the tool's strict tag search.
export function mapUrl(appUrl, name, args) {
  if (name === "opportunity_map") return `${appUrl}/app?${new URLSearchParams({ opportunity: args.industry })}`;
  if (!args.town) return undefined;
  const params = { town: args.town };
  if (name === "artist_places") params.ask = `Where do ${args.artist} fans go in ${args.town}?`;
  else if (name === "town_catalog" && args.category && args.category !== "all") params.category = args.category;
  return `${appUrl}/app?${new URLSearchParams(params)}`;
}

// The connector's own daily allowance, and it stops early so the web demo keeps its Qloo reserve.
export function mcpBudget({ limiter, callsPerDay, qlooCap, qlooReserve }) {
  return {
    allow() {
      if (limiter.used("qloo-calls") >= qlooCap - qlooReserve) return false;
      return limiter.spend("mcp-calls", 1, callsPerDay);
    },
  };
}

const reply = (value, isError) => isError
  ? { content: [{ type: "text", text: value }], isError: true }
  : { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };

// Models send null or "" for optional fields, drop accents or change case ("mayaguez") and add the
// island ("Ponce, Puerto Rico"). Match the town to the schema's own list before validating.
function cleanArgs(schema, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return args;
  const required = schema.required || [];
  const clean = Object.fromEntries(Object.entries(args)
    .filter(([key, value]) => value !== null && !(value === "" && !required.includes(key))));
  const towns = schema.properties?.town?.enum;
  if (towns && typeof clean.town === "string") {
    const bare = fold(clean.town.replace(/,\s*(puerto rico|pr)\s*$/i, ""));
    clean.town = towns.find((name) => fold(name) === bare) ?? clean.town;
  }
  return clean;
}

// Key names only, never values, so the model can correct the call.
function invalidKeys(schema, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return ["arguments"];
  const keys = Object.keys(args).filter((key) => !Object.hasOwn(schema.properties, key));
  for (const key of schema.required || []) if (!Object.hasOwn(args, key)) keys.push(key);
  for (const [key, value] of Object.entries(args)) {
    if (Object.hasOwn(schema.properties, key) && !validArgs({ properties: { [key]: schema.properties[key] } }, { [key]: value })) keys.push(key);
  }
  return keys.slice(0, 5).map((key) => key.slice(0, 40));
}

export async function callMcpTool(tool, args, { appUrl, budget, timeoutMs = 30000 }) {
  const clean = cleanArgs(tool.parameters, args);
  if (!validArgs(tool.parameters, clean)) return reply(`Invalid arguments for ${tool.name}: ${invalidKeys(tool.parameters, clean).join(", ")}`, true);
  if (!budget.allow()) return reply(`Zemi-Aku's connector has reached today's limit. The map at ${appUrl}/app still works.`, true);
  let timer;
  let output;
  try {
    const expired = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Tool deadline")), timeoutMs); });
    output = await Promise.race([tool.run(clean), expired]);
  } catch {
    return reply(UNAVAILABLE, true); // Never pass provider or server errors to the client.
  } finally {
    clearTimeout(timer);
  }
  if (output?.error) return reply(String(output.error), true);
  const { action, ...rest } = output ?? {};
  const url = mapUrl(appUrl, tool.name, clean);
  const result = { ...(output?.data ?? rest), ...(url ? { map_url: url } : {}) };
  return JSON.stringify(result).length <= MAX_RESULT ? reply(result) : reply("Result too large; narrow your question.", true);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

// Like readBody in serve-eagle.mjs, but a large or broken body is an error, not an empty question.
// The rest of a large body is read and dropped: stopping early would reset the socket before the 413.
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= MAX_BODY) chunks.push(chunk);
  }
  if (size > MAX_BODY) return { status: 413 };
  try { return { value: JSON.parse(Buffer.concat(chunks).toString("utf8")) }; }
  catch { return { status: 400 }; }
}

export function createMcpHandler({ tools, appUrl, budget, version }) {
  const origin = new URL(appUrl).origin;
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const listed = tools.map(({ name, description, parameters }) => ({ name, description, inputSchema: parameters,
    annotations: { readOnlyHint: true, openWorldHint: true } }));
  return async function handleMcp(req, res) {
    if (req.method !== "POST") {
      return send(res, 405, { error: `This is Zemi-Aku's MCP endpoint. Add ${appUrl}/mcp as a custom connector in Claude or ChatGPT. The map is at ${appUrl}/app.` }, { allow: "POST" });
    }
    // Claude and ChatGPT call from their servers. A browser Origin from another site is a page
    // trying to spend our budget through its visitors.
    if (req.headers.origin && req.headers.origin !== origin) return send(res, 403, { error: "Origin not allowed" });
    const body = await readJson(req);
    if (body.status === 413) return send(res, 413, { error: "Request too large" });
    if (body.status === 400) return send(res, 400, { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
    // MCP dropped JSON-RPC batches (2025-06-18). One batch could also run up to 100 tool calls past
    // the budget check before their Qloo calls are counted.
    if (Array.isArray(body.value)) return send(res, 400, { jsonrpc: "2.0", error: { code: -32600, message: "Batch requests are not supported" }, id: null });
    // Stateless: a fresh server and transport per request, so nothing lives between requests.
    const server = new Server({ name: "zemi-aku", version }, { capabilities: { tools: {} }, instructions: MCP_INSTRUCTIONS });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listed }));
    server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
      const tool = byName.get(params.name);
      if (!tool) return reply("Unknown tool", true);
      return callMcpTool(tool, params.arguments ?? {}, { appUrl, budget });
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close().catch(() => {}); server.close().catch(() => {}); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body.value);
  };
}
