import assert from "node:assert/strict";
import test from "node:test";
import { analyzeContributionEvidence, normalizeUtr } from "./evidence-analysis.js";

test("extracts a matching amount, UTR and payment time from contributor SMS", () => {
  const analysis = analyzeContributionEvidence({
    type: "contributor_sms",
    smsText: "Rs.2,000.00 debited successfully on 06/08/2026 18:42. UTR 612345678901",
    requestedAmountPaise: 200000,
    now: new Date("2026-08-06T19:00:00+05:30")
  });

  assert.equal(analysis.extractedAmountPaise, 200000);
  assert.equal(analysis.extractedUtr, "612345678901");
  assert.equal(analysis.amountMatches, true);
  assert.equal(analysis.timeIsPlausible, true);
  assert.equal(analysis.paymentLanguageFound, true);
  assert.equal(analysis.confidence, 100);
});

test("flags mismatched receipt metadata and never claims OCR ran", () => {
  const analysis = analyzeContributionEvidence({
    type: "payment_screenshot",
    declaredAmountPaise: 150000,
    declaredPaidAt: "2026-08-06T12:00:00.000Z",
    declaredUtr: "UTR-ABC-123456",
    requestedAmountPaise: 200000,
    now: new Date("2026-08-06T13:00:00.000Z")
  });

  assert.equal(analysis.ocrStatus, "not_configured");
  assert.equal(analysis.amountMatches, false);
  assert.ok(analysis.warnings.some((warning) => warning.includes("does not match")));
});

test("normalizes transaction references for duplicate protection", () => {
  assert.equal(normalizeUtr(" utr-abc 123 "), "UTRABC123");
});
