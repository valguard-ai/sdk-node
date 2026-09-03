/** @typedef {"pass" | "warn" | "block" | "shadow"} ValidationStatus */

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
 */

/**
 * Read Valguard observability headers from a fetch Response or a plain header map.
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
    return value == null ? null : String(value);
  };

  const latencyRaw = get("x-vg-latency-ms");
  const latencyMs = latencyRaw == null ? null : Number.parseInt(latencyRaw, 10);

  const remainingRaw = get("x-vg-orchestration-executions-remaining");
  let orchestrationExecutionsRemaining = null;
  if (remainingRaw != null) {
    orchestrationExecutionsRemaining =
      remainingRaw === "unlimited" ? "unlimited" : Number.parseInt(remainingRaw, 10);
    if (typeof orchestrationExecutionsRemaining === "number" && !Number.isFinite(orchestrationExecutionsRemaining)) {
      orchestrationExecutionsRemaining = null;
    }
  }

  const validationsUsedRaw = get("x-vg-orchestration-validations-used");
  const validationsUsed = validationsUsedRaw == null ? null : Number.parseInt(validationsUsedRaw, 10);

  return {
    validationStatus: /** @type {ValidationStatus | null} */ (get("x-vg-validation-status")),
    shadowMode: get("x-vg-shadow-mode") === "true",
    latencyMs: Number.isFinite(latencyMs) ? latencyMs : null,
    requestId: get("x-vg-request-id"),
    inputValidationShadow: get("x-vg-input-validation") === "shadow",
    validationPhase: get("x-vg-validation-phase") === "input" ? "input" : null,
    overage: get("x-vg-overage") === "true",
    targetType: get("x-vg-target-type"),
    orchestrationPath: get("x-vg-orchestration-path"),
    orchestrationValidationsUsed: Number.isFinite(validationsUsed) ? validationsUsed : null,
    orchestrationExecutionsRemaining,
    idempotencyReplayed: get("x-vg-idempotency-replayed") === "true",
  };
}
