/**
 * @typedef {Object} ValGuardErrorInfo
 * @property {string} type
 * @property {string | null} code
 * @property {string | null} message
 * @property {string | null} reason
 * @property {unknown} details
 * @property {boolean} softFail
 * @property {unknown} body
 */

/**
 * Parse a ValGuard layer error or soft-fail envelope.
 * @param {number} status HTTP status code
 * @param {unknown} body Parsed JSON body (or null)
 * @returns {ValGuardErrorInfo | null} null when the body is not a ValGuard error shape
 */
export function parseValGuardError(status, body) {
  if (body == null || typeof body !== "object") {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const payload = /** @type {Record<string, unknown>} */ (body);

  if (payload.valid === false && payload.validation != null) {
    return {
      type: "validation_soft_fail",
      code: null,
      message: "response failed validation (http 200 envelope)",
      reason: null,
      details: payload.validation,
      softFail: true,
      body: payload,
    };
  }

  const error = payload.error;
  if (error == null || typeof error !== "object") {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const err = /** @type {Record<string, unknown>} */ (error);
  const type = typeof err.type === "string" ? err.type : "unknown";

  return {
    type,
    code: typeof err.code === "string" ? err.code : null,
    message: typeof err.message === "string" ? err.message : null,
    reason: typeof err.reason === "string" ? err.reason : null,
    details: err.details ?? null,
    softFail: false,
    body: payload,
  };
}

export class ValGuardError extends Error {
  /**
   * @param {number} status
   * @param {ValGuardErrorInfo} info
   */
  constructor(status, info) {
    super(info.message ?? info.reason ?? `ValGuard request failed (${status})`);
    this.name = "ValGuardError";
    this.status = status;
    this.info = info;
  }
}
