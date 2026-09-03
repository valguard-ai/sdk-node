import assert from "node:assert/strict";
import {
  verifyWebhookSignature,
  signWebhookPayload,
  WEBHOOK_SIGNATURE_HEADER,
} from "../webhook.js";

const CONTRACT_SECRET = "contract-test-webhook-secret";
const CONTRACT_BODY = '{"event":"validation.block","request_id":"abc"}';
const CONTRACT_SIG =
  "sha256=6ef400c3c929c837d90cd6e99f082815966aee86cf10ac5f884e0f06cbcfd879";

assert.equal(WEBHOOK_SIGNATURE_HEADER, "X-VG-Signature");
assert.equal(signWebhookPayload(CONTRACT_BODY, CONTRACT_SECRET), CONTRACT_SIG);
assert.equal(
  verifyWebhookSignature(CONTRACT_BODY, CONTRACT_SIG, CONTRACT_SECRET),
  true,
);
assert.equal(verifyWebhookSignature(CONTRACT_BODY, "sha256=bad", CONTRACT_SECRET), false);
assert.equal(verifyWebhookSignature(CONTRACT_BODY, CONTRACT_SIG, ""), false);

console.log("sdk-node webhook.test.mjs: ok");
