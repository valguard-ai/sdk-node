#!/usr/bin/env node
/**
 * Live README examples against the default agent (requires VG_API_KEY + VG_PROVIDER_KEY).
 */
import assert from "node:assert/strict";

const apiKey = process.env.VG_API_KEY || process.env.VALGUARD_API_KEY;
const providerKey = process.env.VG_PROVIDER_KEY || process.env.OPENAI_API_KEY;
const baseURL = (process.env.VG_PROXY || process.env.VALGUARD_BASE_URL || "https://api.valguard.ai").replace(
  /\/$/,
  "",
);

if (!apiKey || !providerKey) {
  console.log("readme-examples-live.test.mjs: skipped (set VG_API_KEY and VG_PROVIDER_KEY)");
  process.exit(0);
}

const prompt =
  "Return JSON with name Ada Lovelace and email ada@example.com for a demo contact.";

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "X-VG-Agent": process.env.VG_AGENT || "default",
  "X-Provider-Key": providerKey,
};

const body = {
  model: "groq/openai/gpt-oss-20b",
  messages: [{ role: "user", content: prompt }],
};

async function post(payload) {
  const res = await fetch(`${baseURL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  assert.equal(res.status, 200, JSON.stringify(data?.error ?? data));
}

await post(body);
await post({ ...body, stream: true });

console.log("readme-examples-live.test.mjs: ok");
