import { createHmac, timingSafeEqual } from "node:crypto";

/** HTTP header for outbound webhook HMAC (validation, orchestration, health). */
export const WEBHOOK_SIGNATURE_HEADER = "X-VG-Signature";

/**
 * Returns `sha256=<hex>` HMAC-SHA256 over the raw request body bytes.
 * @param {string | Buffer | Uint8Array} rawBody
 * @param {string} secret
 */
export function signWebhookPayload(rawBody, secret) {
  const digest = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return `sha256=${digest}`;
}

/**
 * Verify `X-VG-Signature` on an inbound ValGuard webhook delivery.
 * @param {string | Buffer | Uint8Array} rawBody Raw request body (not re-serialized JSON)
 * @param {string | null | undefined} signatureHeader Value of `X-VG-Signature`
 * @param {string} secret Deployment `OUTBOUND_WEBHOOK_HMAC_SECRET`
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) {
    return false;
  }
  const expected = signWebhookPayload(rawBody, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
