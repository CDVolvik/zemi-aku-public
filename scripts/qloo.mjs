// Runs Qloo's official harness (`qloo exec`, `qloo mcp`, ...) with the key from .env.
// The harness reads QLOO_API_KEY, and needs QLOO_BASE_URL + QLOO_TRUSTED_BASE_URL set to the
// same URL before it will send the key to the hackathon server.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}
const base = process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com";
process.env.QLOO_BASE_URL ||= base;
process.env.QLOO_TRUSTED_BASE_URL ||= process.env.QLOO_BASE_URL;

const bin = path.join(root, "node_modules", "@qloo", "qloo-harness", "dist", "bin.js");
const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
