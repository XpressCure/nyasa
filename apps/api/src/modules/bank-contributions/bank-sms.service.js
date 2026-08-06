import { createHmac, timingSafeEqual } from "node:crypto";
import { analyzeContributionEvidence } from "./evidence-analysis.js";

export function createSmsSignature({ rawBody, timestamp, secret }) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function verifySmsSignature({ rawBody, timestamp, signature, secret, nowMs = Date.now() }) {
  if (!rawBody || !timestamp || !signature || !secret) return false;
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(nowMs - timestampMs) > 5 * 60 * 1000) return false;
  const expected = createSmsSignature({ rawBody, timestamp, secret });
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
}

function claimUtrs(claim) {
  return new Set([
    claim.utr,
    ...claim.evidence.flatMap((item) => [item.declaredUtr, item.analysis?.extractedUtr])
  ].filter(Boolean).map((value) => String(value).replace(/[^a-z0-9]/gi, "").toUpperCase()));
}

export function matchBankSmsToClaims({ body, receivedAt, claims }) {
  const analyses = claims.map((claim) => ({
    claim,
    analysis: analyzeContributionEvidence({
      type: "bank_sms",
      smsText: body,
      requestedAmountPaise: claim.requestedAmountPaise,
      now: new Date(receivedAt)
    })
  }));
  const extractedUtr = analyses.find((item) => item.analysis.extractedUtr)?.analysis.extractedUtr || null;
  if (extractedUtr) {
    const utrMatches = analyses.filter(({ claim }) => claimUtrs(claim).has(extractedUtr));
    if (utrMatches.length === 1) return { ...utrMatches[0], reason: "exact_utr" };
  }

  const amountMatches = analyses.filter(({ claim, analysis }) => {
    const claimAgeMs = new Date(receivedAt).getTime() - new Date(claim.createdAt).getTime();
    return analysis.amountMatches && claimAgeMs >= -15 * 60 * 1000 && claimAgeMs <= 7 * 24 * 60 * 60 * 1000;
  });
  if (amountMatches.length === 1) return { ...amountMatches[0], reason: "unique_amount_time" };
  return { claim: null, analysis: analyses[0]?.analysis || analyzeContributionEvidence({ type: "bank_sms", smsText: body, requestedAmountPaise: 0, now: new Date(receivedAt) }), reason: "no_unambiguous_match" };
}
