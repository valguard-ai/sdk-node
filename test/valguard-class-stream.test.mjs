#!/usr/bin/env node
import assert from "node:assert/strict";
import ValGuard, { parseChatCompletionStream } from "../index.js";

assert.equal(typeof ValGuard.prototype.chatCompletionsStream, "function");

const vg = new ValGuard({
  apiKey: "vg_live_test",
  baseURL: "https://example.test",
  agentSlug: "default",
});

let fetchCalled = false;
const mockFetch = async (_url, init) => {
  fetchCalled = true;
  assert.equal(JSON.parse(init.body).stream, true);
  return new Response('data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n', {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
};

const { stream } = await vg.chatCompletionsStream(
  { model: "groq/openai/gpt-oss-20b", messages: [{ role: "user", content: "hi" }] },
  { fetch: mockFetch },
);
assert.ok(fetchCalled);
const events = [];
for await (const ev of stream) events.push(ev);
assert.ok(events.some((e) => e.type === "chunk" || e.type === "done"));

const soft = await vg.chatCompletionsStream(
  { model: "x", messages: [] },
  {
    fetch: async () =>
      new Response(JSON.stringify({ valid: false, validation: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
);
assert.equal(typeof soft.stream[Symbol.asyncIterator], "function");

console.log("valguard-class-stream.test.mjs: ok");
