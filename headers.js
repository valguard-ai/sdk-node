/** @typedef {"pass" | "warn" | "block" | "shadow" | "stream_passthrough" | "fail"} ValidationStatus */

const VALIDATION_STATUSES = new Set([
  "pass",
  "warn",
  "block",
  "shadow",
  "stream_passthrough",
  "fail",
]);

/**
 * @typedef {Object} ValidationHeaders
 * @property {ValidationStatus | null} validationStatus
 * @property {boolean} shadowMode
 * @property {number | null} latencyMs
 * @property {string | null} requestId
 * @property {boolean} inputValidationShadow
 * @property {"input" | null} validationPhase
 * @property {boolean} overage
 * @property {string | null} targetType
 * @property {string | null} orchestrationPath
 * @property {number | null} orchestrationValidationsUsed
 * @property {number | "unlimited" | null} orchestrationExecutionsRemaining
 * @property {boolean} idempotencyReplayed
 * @property {boolean} healed
 * @property {string[]} healedRules
 * @property {number | null} healedEventCount
 * @property {string[]} healedTrace
 * @property {string | null} cacheStatus
 * @property {string | null} traceId
 * @property {string | null} spanId
 * @property {string | null} parentSpanId
 * @property {string | null} agentId
 * @property {string | null} idempotentRunId
 * @property {string | null} runId
 * @property {string | null} runStatus
 * @property {string | null} approvalId
 * @property {string | null} licenseStatus
 * @property {string | null} licenseMode
 */

/**
 * @param {string | null | undefined} raw
 * @returns {string[]}
 */
function splitCsv(raw) {
  if (raw == null || raw === "") return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/**
 * @param {string | null | undefined} raw
 * @returns {number | null}
 */
function parseIntHeader(raw) {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read Valguard observability headers from a fetch Response or a plain header map.
 * Header names match the proxy (`X-VG-Requests-Remaining`, `X-VG-Healed*`, trace, cache).
 * @param {Headers | Record<string, string | undefined | null>} headers
 * @returns {ValidationHeaders}
 */
export function parseValidationHeaders(headers) {
  const get = (name) => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    const value = key ? headers[key] : null;
    return value == null || value === "" ? null : String(value);
  };

  const statusRaw = get("x-vg-validation-status")?.toLowerCase() ?? null;
  const validationStatus =
    statusRaw && VALIDATION_STATUSES.has(statusRaw) ? /** @type {ValidationStatus} */ (statusRaw) : null;

  const remainingRaw = get("x-vg-requests-remaining");
  let orchestrationExecutionsRemaining = null;
  if (remainingRaw != null) {
    orchestrationExecutionsRemaining =
      remainingRaw === "unlimited" ? "unlimited" : Number.parseInt(remainingRaw, 10);
    if (
      typeof orchestrationExecutionsRemaining === "number" &&
      !Number.isFinite(orchestrationExecutionsRemaining)
    ) {
      orchestrationExecutionsRemaining = null;
    }
  }

  return {
    validationStatus,
    shadowMode: get("x-vg-shadow-mode") === "true",
    latencyMs: parseIntHeader(get("x-vg-latency-ms")),
    requestId: get("x-vg-request-id"),
    inputValidationShadow: get("x-vg-input-validation") === "shadow",
    validationPhase: get("x-vg-validation-phase") === "input" ? "input" : null,
    overage: get("x-vg-overage") === "true",
    targetType: get("x-vg-target-type"),
    orchestrationPath: get("x-vg-orchestration-path"),
    orchestrationValidationsUsed: parseIntHeader(get("x-vg-orchestration-validations-used")),
    orchestrationExecutionsRemaining,
    idempotencyReplayed: get("x-vg-idempotency-replayed") === "true",
    healed: get("x-vg-healed") === "true",
    healedRules: splitCsv(get("x-vg-healed-rules")),
    healedEventCount: parseIntHeader(get("x-vg-healed-event-count")),
    healedTrace: splitCsv(get("x-vg-healed-trace")),
    cacheStatus: get("x-vg-cache"),
    traceId: get("x-trace-id"),
    spanId: get("x-vg-span-id"),
    parentSpanId: get("x-vg-parent-span-id"),
    agentId: get("x-vg-agent-id"),
    idempotentRunId: get("x-vg-idempotent-run-id"),
    runId: get("x-vg-run-id"),
    runStatus: get("x-vg-run-status"),
    approvalId: get("x-vg-approval-id"),
    licenseStatus: get("x-vg-license-status"),
    licenseMode: get("x-vg-license-mode"),
  };
}
