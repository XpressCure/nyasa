import assert from "node:assert/strict";
import test from "node:test";
import { createSmsSignature, matchBankSmsToClaims, verifySmsSignature } from "./bank-sms.service.js";

const secret = "a-test-secret-that-is-long-enough";

test("accepts a fresh correctly signed SMS payload and rejects tampering", () => {
  const rawBody = JSON.stringify({ messageId: "1", sender: "UCOBANK", body: "credited" });
  const timestamp = "1786030200";
  const signature = createSmsSignature({ rawBody, timestamp, secret });
  assert.equal(verifySmsSignature({ rawBody, timestamp, signature, secret, nowMs: 1786030200000 }), true);
  assert.equal(verifySmsSignature({ rawBody: `${rawBody}x`, timestamp, signature, secret, nowMs: 1786030200000 }), false);
});

test("matches bank SMS by exact UTR before amount", () => {
  const claims = [
    { _id: "a", utr: "ABC123456789", requestedAmountPaise: 200000, evidence: [], createdAt: new Date("2026-08-06T10:00:00Z") },
    { _id: "b", requestedAmountPaise: 200000, evidence: [], createdAt: new Date("2026-08-06T10:00:00Z") }
  ];
  const match = matchBankSmsToClaims({
    body: "A/c credited Rs.2,000 on 06/08/2026 16:00 UTR ABC123456789",
    receivedAt: new Date("2026-08-06T10:31:00Z"),
    claims
  });
  assert.equal(match.claim._id, "a");
  assert.equal(match.reason, "exact_utr");
});

test("does not guess when two open claims have the same amount", () => {
  const claims = ["a", "b"].map((_id) => ({ _id, requestedAmountPaise: 200000, evidence: [], createdAt: new Date("2026-08-06T10:00:00Z") }));
  const match = matchBankSmsToClaims({
    body: "A/c credited Rs.2,000 successfully",
    receivedAt: new Date("2026-08-06T10:30:00Z"),
    claims
  });
  assert.equal(match.claim, null);
  assert.equal(match.reason, "no_unambiguous_match");
});
