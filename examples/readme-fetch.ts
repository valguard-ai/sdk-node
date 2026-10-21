/**
 * Mirrors the README "Fetch-only" example — must typecheck under strict TS.
 */
declare const process: { env: Record<string, string | undefined> };

import { ValGuard } from "../index.js";

const apiKey = process.env.VG_API_KEY;
const baseURL = process.env.VG_PROXY;
const providerKey = process.env.VG_PROVIDER_KEY;
if (!apiKey || !baseURL) {
  throw new Error("Set VG_API_KEY and VG_PROXY before running this example");
}

const vg = new ValGuard({
  apiKey,
  baseURL,
  agentSlug: "default",
  providerKey,
});

const result = await vg.chatCompletions({
  model: "groq/openai/gpt-oss-20b",
  messages: [
    {
      role: "user",
      content: "Return JSON with name Ada Lovelace and email ada@example.com for a demo contact.",
    },
  ],
});

console.log(result.validation);
console.log(result.data);
