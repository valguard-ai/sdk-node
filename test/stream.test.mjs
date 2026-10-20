import assert from "node:assert/strict";
import { parseChatCompletionStream } from "../stream.js";

function sseBody(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(new TextEncoder().encode(c));
      }
      controller.close();
    },
  });
}

async function collect(stream) {
  const events = [];
  for await (const e of stream) events.push(e);
  return events;
}

const toolChunk = sseBody([
  'data: {"id":"x","choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"get_weather"}}]}}]}\n\n',
  "data: [DONE]\n\n",
]);

const toolEvents = await collect(parseChatCompletionStream(toolChunk));
assert.equal(toolEvents.length, 2);
assert.equal(toolEvents[0].type, "chunk");
assert.ok(toolEvents[0].delta.tool_calls);
assert.equal(toolEvents[1].type, "done");

const textChunk = sseBody([
  'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
  "data: [DONE]\n\n",
]);
const textEvents = await collect(parseChatCompletionStream(textChunk));
assert.equal(textEvents[0].delta.content, "hi");

console.log("stream.test.mjs: ok");
