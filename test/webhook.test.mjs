import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyWebhookSignature,
  signWebhookPayload,
  WEBHOOK_SIGNATURE_HEADER,
} from "../webhook.js";

const CONTRACT_SECRET = "contract-test-webhook-secret";
const CONTRACT_BODY = '{"event":"validation.block","request_id":"abc"}';
const CONTRACT_SIG = signWebhookPayload(CONTRACT_BODY, CONTRACT_SECRET, 1700000000);

assert.equal(WEBHOOK_SIGNATURE_HEADER, "X-VG-Signature");
assert.match(CONTRACT_SIG, /^t=1700000000,v1=[0-9a-f]+$/);
assert.equal(
  verifyWebhookSignature(CONTRACT_BODY, CONTRACT_SIG, CONTRACT_SECRET, { maxAgeSeconds: null }),
  true,
);
assert.equal(verifyWebhookSignature(CONTRACT_BODY, "sha256=bad", CONTRACT_SECRET), false);
assert.equal(verifyWebhookSignature(CONTRACT_BODY, CONTRACT_SIG, ""), false);
assert.equal(
  verifyWebhookSignature("hello", signWebhookPayload("hello", CONTRACT_SECRET), CONTRACT_SECRET),
  true,
);

const legacy = "sha256=" + createHmac("sha256", CONTRACT_SECRET).update(CONTRACT_BODY).digest("hex");
assert.equal(verifyWebhookSignature(CONTRACT_BODY, legacy, CONTRACT_SECRET), true);

console.log("sdk-node webhook.test.mjs: ok");
