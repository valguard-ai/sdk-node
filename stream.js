/**
 * Parse an OpenAI-style chat completion SSE response body.
 * @param {ReadableStream<Uint8Array>} body
 * @returns {AsyncGenerator<StreamChunkEvent>}
 */
export async function* parseChatCompletionStream(body) {
  if (!body || typeof body.getReader !== "function") {
    throw new Error("parseChatCompletionStream requires a ReadableStream body");
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const event = parseSSEPart(part);
        if (event) yield event;
      }
    }
    if (buffer.trim()) {
      const event = parseSSEPart(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * @param {string} part
 * @returns {StreamChunkEvent | null}
 */
function parseSSEPart(part) {
  const lines = part.split("\n");
  let dataLine = "";
  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLine += line.slice(5).trimStart();
    }
  }
  const payload = dataLine.trim();
  if (!payload || payload === "[DONE]") {
    return payload === "[DONE]" ? { type: "done" } : null;
  }
  let json;
  try {
    json = JSON.parse(payload);
  } catch {
    return { type: "raw", raw: payload };
  }
  const choice = json.choices?.[0];
  const delta = choice?.delta ?? {};
  /** @type {StreamChunkEvent} */
  const out = {
    type: "chunk",
    id: json.id ?? null,
    model: json.model ?? null,
    delta: {
      role: delta.role ?? null,
      content: delta.content ?? null,
      tool_calls: delta.tool_calls ?? null,
    },
    finishReason: choice?.finish_reason ?? null,
    usage: json.usage ?? null,
  };
  return out;
}

/**
 * @typedef {Object} StreamDelta
 * @property {string | null} [role]
 * @property {string | null} [content]
 * @property {unknown} [tool_calls]
 */

/**
 * @typedef {Object} StreamChunkEvent
 * @property {"chunk" | "done" | "raw"} type
 * @property {string | null} [id]
 * @property {string | null} [model]
 * @property {StreamDelta} [delta]
 * @property {string | null} [finishReason]
 * @property {unknown} [usage]
 * @property {string} [raw]
 */
