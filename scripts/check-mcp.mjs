// Live check of the MCP connector. Exits 1 if anything fails.
//   node scripts/check-mcp.mjs [baseUrl] [--probes]
// --probes also checks the refusals a public URL needs (GET, foreign Origin, broken body).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const args = process.argv.slice(2);
const base = (args.find((arg) => !arg.startsWith("--")) || "http://127.0.0.1:4173").replace(/\/$/, "");
const endpoint = `${base}/mcp`;
let failed = 0;
const check = (ok, line) => { console.log(`${ok ? "ok  " : "FAIL"} ${line}`); if (!ok) failed += 1; };

if (args.includes("--probes")) {
  const post = { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" } };
  const get = await fetch(endpoint).catch(() => null);
  check(get?.status === 405, `GET /mcp → ${get?.status ?? "no answer"} (want 405)`);
  const foreign = await fetch(endpoint, { ...post, headers: { ...post.headers, origin: "https://example.com" }, body: "{}" }).catch(() => null);
  check(foreign?.status === 403, `foreign Origin → ${foreign?.status ?? "no answer"} (want 403)`);
  const broken = await fetch(endpoint, { ...post, body: "{" }).catch(() => null);
  check(broken?.status === 400, `broken body → ${broken?.status ?? "no answer"} (want 400)`);
  const list = (id) => ({ jsonrpc: "2.0", id, method: "tools/list" });
  const batch = await fetch(endpoint, { ...post, body: JSON.stringify([list(1), list(2)]) }).catch(() => null);
  check(batch?.status === 400, `batch → ${batch?.status ?? "no answer"} (want 400)`);
}

const client = new Client({ name: "zemi-aku-check", version: "0.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const { tools } = await client.listTools();
  check(tools.length === 13, `tools/list → ${tools.length} tools (want 13)`);
  for (const [name, input] of [["artist_places", { town: "Ponce", artist: "Bad Bunny" }], ["town_profile", { town: "Ponce" }]]) {
    const started = Date.now();
    const result = await client.callTool({ name, arguments: input });
    const data = result.structuredContent || {};
    const places = Array.isArray(data.places) ? ` · ${data.places.length} places` : "";
    check(!result.isError, `${name}: isError ${Boolean(result.isError)}${places} · ${Date.now() - started} ms · ${data.map_url || "no map_url"}`);
  }
} catch (err) {
  check(false, `MCP session: ${err.message}`);
} finally {
  await client.close().catch(() => {});
}
process.exit(failed ? 1 : 0);
