# @valguard/sdk-node

Thin Node.js helpers for the ValGuard OpenAI-compatible integrity layer.

npm package: `@valguard/sdk-node`. Public GitHub: [github.com/valguard-ai/sdk-node](https://github.com/valguard-ai/sdk-node).

Docs: set `VG_PROXY` to your layer URL (production default is configured in deployment — see [valguard.ai](https://valguard.ai/docs/quickstart)).

## Install

```bash
npm install github:valguard-ai/sdk-node openai
# after npm publish:
# npm install @valguard/sdk-node openai
```

## Environment

```bash
export VG_PROXY="https://api.valguard.ai"   # your layer base URL
export VG_API_KEY="vg_live_..."
export VG_AGENT="invoice_extraction_agent"
export VG_PROVIDER_KEY="sk-..."             # optional BYOK upstream key
```

## OpenAI SDK (recommended)

```js
import OpenAI from "openai";
import { ValGuard } from "@valguard/sdk-node";

const vg = ValGuard.fromEnv();
const client = new OpenAI(vg.openaiOptions());

const raw = await client.withRawResponse.chat.completions.create({
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Extract invoice JSON" }],
});

console.log(vg.parseResponseHeaders(raw.response.headers));
console.log(raw.parse());
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
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "hi" }],
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
  await vg.chatCompletions({ model: "openai/gpt-4o-mini", messages: [] });
} catch (err) {
  if (err instanceof ValGuardError) {
    console.log(err.info.type); // validation_block | input_validation | rate_limit_exceeded
  }
}
```

Soft-fail agents return HTTP 200 with `{ valid: false, validation: {...} }` — check `result.error?.softFail` instead of thrown errors.

## API surface

| Export | Purpose |
|--------|---------|
| `ValGuard` | Main client class + `fromEnv()` |
| `createValGuardClient()` | Functional factory |
| `parseValidationHeaders()` | Read `X-VG-*` headers |
| `parseValGuardError()` | Parse error / soft-fail JSON |
| `ValGuardError` | Thrown on non-2xx responses |
