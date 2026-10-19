import { createHmac, timingSafeEqual } from "node:crypto";

/** Canonical evidence envelope type. Matches proxy `valguard-evidence/1`. */
export const EVIDENCE_TYP = "valguard-evidence/1";

/**
 * @param {string} keyId
 * @param {string} payload Exact payload bytes from the envelope (do not re-serialize)
 * @param {string} signature `sha256=<hex>`
 * @param {string} secret Deployment `EVIDENCE_HMAC_SECRET` (or webhook secret fallback)
 * @returns {boolean}
 */
export function verifyEvidence(keyId, payload, signature, secret) {
  if (!keyId || !payload || !signature || !secret) return false;
  const orgKey = createHmac("sha256", secret).update(keyId, "utf8").digest();
  const expected =
    "sha256=" + createHmac("sha256", orgKey).update(payload, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature).trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify a dashboard / CLI evidence envelope (`key_id`, `payload`, `signature`).
 * HMAC is over the exact `payload` string. Cloud customers do not have the
 * platform secret; self-host operators pass `EVIDENCE_HMAC_SECRET`.
 * @param {string | { key_id?: string, payload?: string, signature?: string }} envelope
 * @param {string} secret
 * @returns {boolean}
 */
export function verifyProof(envelope, secret) {
  /** @type {{ key_id?: string, payload?: string, signature?: string } | null} */
  let record = null;
  if (typeof envelope === "string") {
    try {
      record = JSON.parse(envelope);
    } catch {
      return false;
    }
  } else if (envelope && typeof envelope === "object") {
    record = envelope;
  }
  if (!record) return false;
  return verifyEvidence(record.key_id ?? "", record.payload ?? "", record.signature ?? "", secret);
}
