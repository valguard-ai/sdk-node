#!/usr/bin/env node
/**
 * Live README examples against the default agent (requires VG_API_KEY + VG_PROVIDER_KEY).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const apiKey = process.env.VG_API_KEY || process.env.VALGUARD_API_KEY;
const providerKey = process.env.VG_PROVIDER_KEY;
const baseURL = (process.env.VG_PROXY || process.env.VALGUARD_BASE_URL || "https://api.valguard.ai").replace(
  /\/$/,
  "",
);

if (!apiKey || !providerKey) {
  console.log("readme-examples-live.test.mjs: skipped (set VG_API_KEY and VG_PROVIDER_KEY)");
  process.exit(0);
}

const env = {
  ...process.env,
  VG_API_KEY: apiKey,
  VG_PROVIDER_KEY: providerKey,
  VG_PROXY: baseURL,
  VG_AGENT: process.env.VG_AGENT || "default",
};

function runNode(args) {
  const r = spawnSync(process.execPath, args, { cwd: pkgDir, env, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
    process.exit(r.status ?? 1);
  }
}

// README "Fetch-only" example (examples/readme-fetch.ts).
runNode(["--experimental-strip-types", "examples/readme-fetch.ts"]);

// README streaming section (chatCompletionsStream).
const streamScript = `
import { ValGuard } from "./index.js";
const vg = ValGuard.fromEnv().withAgent(process.env.VG_AGENT ?? "default");
const { status, validation, stream } = await vg.chatCompletionsStream({
  model: "groq/openai/gpt-oss-20b",
  stream: true,
  messages: [{
    role: "user",
    content: "Return JSON with name Ada Lovelace and email ada@example.com for a demo contact.",
  }],
});
if (status !== 200) throw new Error("stream status " + status);
let chunks = 0;
for await (const event of stream) {
  if (event.type === "chunk") chunks++;
}
if (chunks < 1) throw new Error("expected stream chunks");
console.log(validation?.status ?? "pass");
`;
const tmp = path.join(pkgDir, ".readme-stream-live.mjs");
fs.writeFileSync(tmp, streamScript, "utf8");
runNode([tmp]);
fs.unlinkSync(tmp);

console.log("readme-examples-live.test.mjs: ok");
