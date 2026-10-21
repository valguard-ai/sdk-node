# Changelog

All notable changes to `@valguard/sdk-node` are documented here. GitHub Releases mirror tags (`v0.3.x`) on [valguard-ai/sdk-node](https://github.com/valguard-ai/sdk-node/releases).

## 0.3.8 — 2026-10-21

- README: `default` agent in env block; fetch example guards `VG_API_KEY` / `VG_PROXY` for `tsc --strict`.
- README: streaming section title and copy aligned with content-delta examples (tool-call parsing still supported when `tools` are sent).

## 0.3.7 — 2026-10-21

- README examples use the default-agent-valid Ada Lovelace prompt and Groq-style `gsk_...` BYOK placeholder.

## 0.3.6 — 2026-10-20

- Streaming helpers; class-based `ValGuard` stream API tests.

## 0.3.5 — 2026-10-20

- `chatCompletionsStream` tool-call delta parsing; header and quota alignment with proxy.
