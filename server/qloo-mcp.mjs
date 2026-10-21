// One long-lived client to Qloo's official MCP server (`qloo mcp`, from @qloo/qloo-harness).
// Started on first use and again after it exits. ok/empty envelopes are cached by input.
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let connecting = null;
const cache = new Map();

function connect(root) {
  if (!connecting) {
    connecting = (async () => {
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [path.join(root, "scripts", "qloo.mjs"), "mcp"],
        cwd: root,
        env: process.env,
        stderr: "ignore",
      });
      const client = new Client({ name: "zemi-aku", version: "0.1.0" });
      client.onclose = () => { connecting = null; };
      await client.connect(transport);
      return client;
    })().catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

// charge: called once per upstream call, after the cache lookup; false means the daily allowance is spent.
export function qlooTools(root, { charge } = {}) {
  return async function callQloo(name, args) {
    const key = name + JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    if (charge && !charge()) throw new Error("The Qloo budget for today is used up");
    const client = await connect(root);
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 30000 });
    const envelope = result.structuredContent ?? JSON.parse(result.content?.[0]?.text || "{}");
    if (envelope.status === "ok" || envelope.status === "empty") cache.set(key, envelope);
    return envelope;
  };
}

export async function closeQloo() {
  const client = await connecting?.catch(() => null);
  await client?.close();
}
