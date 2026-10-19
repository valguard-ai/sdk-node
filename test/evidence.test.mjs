import assert from "node:assert/strict";
import { EVIDENCE_TYP, verifyEvidence, verifyProof } from "../evidence.js";

const secret = "contract-test-evidence-secret";
const keyId = "org:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb:v1";
const payload =
  '{"typ":"valguard-evidence/1","request_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","org_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","checked_at":"2026-03-15T08:30:00Z","engine_version":"valguard-engine/1","policy_snapshot_hash":"policy-1","request_digest":"sha256:758d61f26a44448384e5c4468a0dcb7a2abe456067b0f7b505bc28b9411fe931","response_digest":"sha256:9795c5ff8937f23526ccb207a5684c1fc94a7854e19c021b39d944e51f5baef2","verdicts":[]}';
const signature = "sha256=35b87328b2f2c94b34658646f15e993fe900e1a79fe75558b4b6140d55b3003a";

assert.equal(EVIDENCE_TYP, "valguard-evidence/1");
assert.equal(verifyEvidence(keyId, payload, signature, secret), true);
assert.equal(verifyEvidence(keyId, payload, signature + "x", secret), false);
assert.equal(verifyEvidence(keyId, payload.slice(0, -1) + "x", signature, secret), false);
assert.equal(verifyEvidence(keyId, payload, signature, ""), false);

const envelope = JSON.stringify({
  key_id: keyId,
  signature,
  payload,
  engine_version: "valguard-engine/1",
});
assert.equal(verifyProof(envelope, secret), true);
assert.equal(verifyProof({ key_id: keyId, payload, signature }, secret), true);
assert.equal(verifyProof("{", secret), false);

console.log("sdk-node evidence.test.mjs: ok");
