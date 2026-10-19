import { createHmac, timingSafeEqual } from "node:crypto";

/** HTTP header for outbound webhook HMAC (validation, orchestration, health). */
export const WEBHOOK_SIGNATURE_HEADER = "X-VG-Signature";

function asBuffer(rawBody) {
  if (typeof rawBody === "string") return Buffer.from(rawBody, "utf8");
  return Buffer.from(rawBody);
}

/**
 * Returns `t=<unix>,v1=<hex>` HMAC-SHA256 over `<unix>.<raw body>`.
 * @param {string | Buffer | Uint8Array} rawBody
 * @param {string} secret
 * @param {number} [unix]
 */
export function signWebhookPayload(rawBody, secret, unix = Math.floor(Date.now() / 1000)) {
  const digest = createHmac("sha256", secret)
    .update(`${unix}.`)
    .update(asBuffer(rawBody))
    .digest("hex");
  return `t=${unix},v1=${digest}`;
}

/**
 * Verify `X-VG-Signature`. Accepts the timestamped format and legacy `sha256=`.
 * @param {string | Buffer | Uint8Array} rawBody
 * @param {string | null | undefined} signatureHeader
 * @param {string} secret
 * @param {{ maxAgeSeconds?: number | null }} [opts]
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signatureHeader, secret, opts = {}) {
  if (!signatureHeader || !secret) return false;
  const header = String(signatureHeader).trim();
  const maxAge = opts.maxAgeSeconds === undefined ? 300 : opts.maxAgeSeconds;
  const stamped = header.match(/^t=(\d+),v1=([0-9a-f]+)$/i);
  let expected;
  if (stamped) {
    const unix = Number(stamped[1]);
    if (maxAge != null && Math.abs(Math.floor(Date.now() / 1000) - unix) > maxAge) {
      return false;
    }
    expected = signWebhookPayload(rawBody, secret, unix);
  } else if (header.startsWith("sha256=")) {
    const digest = createHmac("sha256", secret).update(asBuffer(rawBody)).digest("hex");
    expected = `sha256=${digest}`;
  } else {
    return false;
  }
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(header, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
