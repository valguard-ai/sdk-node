# @valguard/sdk-node

Thin Node.js helpers for the ValGuard OpenAI-compatible integrity layer.

npm package: `@valguard/sdk-node`. Public GitHub: [github.com/valguard-ai/sdk-node](https://github.com/valguard-ai/sdk-node).

Docs: set `VG_PROXY` to your layer URL (production default is configured in deployment — see [valguard.ai](https://valguard.ai/docs/quickstart)).

## Install

```bash
npm install @valguard/sdk-node openai
```

## Environment

```bash
export VG_PROXY="https://api.valguard.ai"   # your layer base URL
export VG_API_KEY="vg_live_..."
export VG_AGENT="invoice_extraction_agent"
export VG_PROVIDER_KEY="gsk_..."              # optional BYOK upstream key (Groq-style)
```

## withAgent and withPlaybook

`withAgent` pins the `X-VG-Agent` slug and returns a new client. `withPlaybook` pins `X-VG-Flow` instead. The original client is unchanged. Do not set both on one client.

```js
import { ValGuard } from "@valguard/sdk-node";

const invoice = ValGuard.fromEnv().withAgent("invoice_extraction_agent");
const playbook = ValGuard.fromEnv().withPlaybook("invoice-processing");
```

## OpenAI SDK (recommended)

```js
import OpenAI from "openai";
import { ValGuard } from "@valguard/sdk-node";

const vg = ValGuard.fromEnv().withAgent(process.env.VG_AGENT ?? "default");
const client = new OpenAI(vg.openaiOptions());

const raw = await client.chat.completions.create({
  model: "groq/openai/gpt-oss-20b",
  messages: [
    {
      role: "user",
      content: "Return JSON with name Ada Lovelace and email ada@example.com for a demo contact.",
    },
  ],
}).withResponse();

console.log(vg.parseResponseHeaders(raw.response.headers));
console.log(raw.data);
```

## Streaming (tool-call deltas)

Playbooks (`X-VG-Flow`) do not support `stream: true`. For single-agent chat, use `chatCompletionsStream` — it parses SSE chunks (including indexed `tool_calls` deltas when the layer buffers the stream):

```js
import { ValGuard } from "@valguard/sdk-node";

const vg = ValGuard.fromEnv().withAgent("default");
const { status, validation, stream, error } = await vg.chatCompletionsStream({
  model: "groq/openai/gpt-oss-20b",
  stream: true,
  messages: [
    {
      role: "user",
      content: "Return JSON with name Ada Lovelace and email ada@example.com for a demo contact.",
    },
  ],
});

console.log(status, validation);
for await (const event of stream) {
  if (event.type === "chunk" && event.delta?.content) {
    process.stdout.write(event.delta.content);
  }
}
if (error) console.log(error);
```

## Fetch-only (no OpenAI SDK)

```js
import { ValGuard } from "@valguard/sdk-node";

const vg = new ValGuard({
  apiKey: process.env.VG_API_KEY,
  baseURL: process.env.VG_PROXY,
  agentSlug: "default",
  providerKey: process.env.VG_PROVIDER_KEY,
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
```

## RAG sources

```js
const vg = ValGuard.fromEnv().withRAGSources([
  { id: "doc-1", text: "Acme revenue was $4.2M in Q3." },
]);
```

## Errors

```js
import { ValGuardError, parseValGuardError } from "@valguard/sdk-node";

try {
  await vg.chatCompletions({ model: "groq/openai/gpt-oss-20b", messages: [] });
} catch (err) {
  if (err instanceof ValGuardError) {
    console.log(err.info.type); // validation_block | invalid_request_error | ...
    console.log(err.info.code); // rate_limited | invalid_api_key | orchestration_stream_unsupported | ...
  }
}
```

Soft-fail agents return HTTP 200 with `{ valid: false, validation: {...} }` — check `result.error?.softFail` instead of thrown errors.

## API surface

| Export | Purpose |
|--------|---------|
| `ValGuard` | Main client class + `fromEnv()` |
| `createValGuardClient()` | Functional factory |
| `parseValidationHeaders()` | Read `X-VG-*` headers, including repair, cache, trace, and approval |
| `verifyProof()` / `verifyEvidence()` | Offline HMAC check of a Proof download (`valguard-evidence/1`) |
| `parseValGuardError()` | Parse error / soft-fail JSON |
| `ValGuardError` | Thrown on non-2xx responses |
| `chatCompletionsStream()` / `parseChatCompletionStream()` | SSE streaming with tool-call delta parsing |

`withAgent(slug)` sets `X-VG-Agent`. `withPlaybook(slug)` sets `X-VG-Flow` and clears the agent header. `withApprovalMode("async")` sends `X-VG-Approval-Mode` for playbooks that pause on a human approval step. `openaiOptions()` forwards `X-Provider-Key` when `providerKey` is set. `withIdempotencyKey` sends `X-VG-Idempotency-Key`. `withTrace` sends `traceparent`, `X-VG-Parent-Span-Id`, and `X-VG-Agent-Id`. Repair presets stay on the agent. `X-VG-Healed` is set only when the final response passed because of repair. A repair that still blocks is `X-VG-Repair-Attempted` (with `X-VG-Repair-Rules`) and does not set `X-VG-Healed`.
