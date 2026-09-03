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
  "x-vg-orchestration-executions-remaining": "7",
  "x-vg-idempotency-replayed": "true",
});
assert.equal(orch.targetType, "playbook");
assert.equal(orch.orchestrationPath, "a,b,c");
assert.equal(orch.orchestrationValidationsUsed, 5);
assert.equal(orch.orchestrationExecutionsRemaining, 7);
assert.equal(orch.idempotencyReplayed, true);

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
