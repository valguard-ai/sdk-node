import assert from "node:assert/strict";
import { parseValidationHeaders } from "../headers.js";
import { parseValGuardError } from "../errors.js";
import { createValGuardClient } from "../index.js";

const headers = new Headers({
  "x-vg-validation-status": "shadow",
  "x-vg-shadow-mode": "true",
  "x-vg-latency-ms": "12",
  "x-vg-request-id": "abc-123",
});

const parsed = parseValidationHeaders(headers);
assert.equal(parsed.validationStatus, "shadow");
assert.equal(parsed.shadowMode, true);
assert.equal(parsed.latencyMs, 12);
assert.equal(parsed.requestId, "abc-123");

const softFail = parseValGuardError(200, {
  valid: false,
  validation: { status: "block", failures: [] },
});
assert.ok(softFail?.softFail);

const block = parseValGuardError(403, {
  error: { type: "validation_block", reason: "required_fields", message: "blocked" },
});
assert.equal(block?.type, "validation_block");

const orch = parseValidationHeaders({
  "x-vg-target-type": "playbook",
  "x-vg-orchestration-path": "a,b,c",
  "x-vg-orchestration-validations-used": "5",
  "x-vg-requests-remaining": "7",
  "x-vg-idempotency-replayed": "true",
  "x-vg-validation-status": "stream_passthrough",
  "x-vg-healed": "true",
  "x-vg-healed-rules": "tier1:trim_whitespace,tier2:enum_normalize",
  "x-vg-healed-event-count": "2",
  "x-vg-healed-trace": "tier1:trim_whitespace@_,tier2:enum_normalize@status",
  "x-vg-cache": "cache_hit",
  "x-trace-id": "trace-1",
  "x-vg-span-id": "span-1",
  "x-vg-parent-span-id": "parent-1",
  "x-vg-agent-id": "billing-agent",
  "x-vg-idempotent-run-id": "run-replay",
  "x-vg-run-id": "run-1",
  "x-vg-run-status": "waiting_approval",
  "x-vg-approval-id": "appr-1",
  "x-vg-license-status": "valid",
  "x-vg-license-mode": "enforce",
});
assert.equal(orch.targetType, "playbook");
assert.equal(orch.orchestrationPath, "a,b,c");
assert.equal(orch.orchestrationValidationsUsed, 5);
assert.equal(orch.orchestrationExecutionsRemaining, 7);
assert.equal(orch.idempotencyReplayed, true);
assert.equal(orch.validationStatus, "stream_passthrough");
assert.equal(orch.healed, true);
assert.deepEqual(orch.healedRules, ["tier1:trim_whitespace", "tier2:enum_normalize"]);
assert.equal(orch.healedEventCount, 2);
assert.deepEqual(orch.healedTrace, ["tier1:trim_whitespace@_", "tier2:enum_normalize@status"]);
assert.equal(orch.cacheStatus, "cache_hit");
assert.equal(orch.traceId, "trace-1");
assert.equal(orch.spanId, "span-1");
assert.equal(orch.parentSpanId, "parent-1");
assert.equal(orch.agentId, "billing-agent");
assert.equal(orch.idempotentRunId, "run-replay");
assert.equal(orch.runId, "run-1");
assert.equal(orch.runStatus, "waiting_approval");
assert.equal(orch.approvalId, "appr-1");
assert.equal(orch.licenseStatus, "valid");
assert.equal(orch.licenseMode, "enforce");

const unlimited = parseValidationHeaders({ "X-VG-Requests-Remaining": "unlimited" });
assert.equal(unlimited.orchestrationExecutionsRemaining, "unlimited");
assert.equal(unlimited.healed, false);
assert.deepEqual(unlimited.healedRules, []);

const unknown = parseValidationHeaders({ "X-VG-Validation-Status": "reasked_ok" });
assert.equal(unknown.validationStatus, null);

const routed = createValGuardClient({
  apiKey: "vg_test",
  baseURL: "https://api.example.com",
  flowSlug: "invoice-processing",
  idempotencyKey: "idem-1",
  approvalMode: "async",
  traceparent: "00-abc-def-01",
  parentSpanId: "parent",
  agentId: "billing-agent",
  providerKey: "sk-up",
});
const built = routed.buildHeaders();
assert.equal(built["X-VG-Flow"], "invoice-processing");
assert.equal(built["X-VG-Agent"], undefined);
assert.equal(built["X-VG-Idempotency-Key"], "idem-1");
assert.equal(built["X-VG-Approval-Mode"], "async");
assert.equal(built.traceparent, "00-abc-def-01");
assert.equal(built["X-VG-Parent-Span-Id"], "parent");
assert.equal(built["X-VG-Agent-Id"], "billing-agent");
assert.equal(built["X-Provider-Key"], "sk-up");
const openai = routed.openaiOptions();
assert.equal(openai.defaultHeaders.Authorization, undefined);
assert.equal(openai.defaultHeaders["X-VG-Flow"], "invoice-processing");
assert.equal(openai.defaultHeaders["X-Provider-Key"], "sk-up");
assert.equal(openai.defaultHeaders["X-VG-Approval-Mode"], "async");

const client = createValGuardClient({
  apiKey: "vg_test",
  baseURL: "https://api.example.com",
  internalSecret: "secret",
  projectId: "proj-1",
});
await assert.rejects(
  () => client.testValidators({ output: "", agentSlug: "a" }),
  /testValidators requires output and agentSlug/,
);

console.log("sdk-node headers.test.mjs: ok");
