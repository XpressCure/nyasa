const amountPattern = /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
const utrPattern = /(?:utr|rrn|ref(?:erence)?(?:\s*(?:no|number|id))?)[\s:#-]*([a-z0-9]{8,30})/i;
const datePattern = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

function normalizeUtr(value = "") {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function extractAmountPaise(text = "") {
  const amounts = [];
  for (const match of text.matchAll(amountPattern)) {
    const amount = Number(match[1].replaceAll(",", ""));
    if (Number.isFinite(amount) && amount > 0) amounts.push(Math.round(amount * 100));
  }
  return amounts[0] || null;
}

function extractDate(text = "") {
  const match = text.match(datePattern);
  if (!match) return null;
  const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
  const date = new Date(year, Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPlausibleTime(value, now = new Date()) {
  if (!value) return false;
  const ageMs = now.getTime() - new Date(value).getTime();
  return ageMs >= -15 * 60 * 1000 && ageMs <= 45 * 24 * 60 * 60 * 1000;
}

export function analyzeContributionEvidence({ type, smsText = "", declaredAmountPaise, declaredPaidAt, declaredUtr, requestedAmountPaise, now = new Date() }) {
  const extractedAmountPaise = extractAmountPaise(smsText) || declaredAmountPaise || null;
  const extractedPaidAt = extractDate(smsText) || (declaredPaidAt ? new Date(declaredPaidAt) : null);
  const extractedUtr = normalizeUtr(smsText.match(utrPattern)?.[1] || declaredUtr || "") || null;
  const paymentLanguageFound = /debited|paid|sent|transferred|credited|successful|success/i.test(smsText);
  const amountMatches = extractedAmountPaise ? extractedAmountPaise === requestedAmountPaise : false;
  const timeIsPlausible = isPlausibleTime(extractedPaidAt, now);
  const warnings = [];

  if (!extractedAmountPaise) warnings.push("Amount could not be read; reviewer must verify it from the proof.");
  else if (!amountMatches) warnings.push("Evidence amount does not match the requested contribution.");
  if (!extractedUtr) warnings.push("UTR/RRN was not found; approval requires a transaction reference.");
  if (!extractedPaidAt) warnings.push("Payment time could not be read.");
  else if (!timeIsPlausible) warnings.push("Payment time is outside the expected review window.");
  if (smsText && !paymentLanguageFound) warnings.push("The text does not clearly state that a payment succeeded.");
  if (["payment_screenshot", "bank_statement"].includes(type)) warnings.push("Image OCR is not configured; compare the uploaded proof manually.");

  let confidence = 0;
  if (amountMatches) confidence += 35;
  if (extractedUtr) confidence += 30;
  if (timeIsPlausible) confidence += 20;
  if (paymentLanguageFound) confidence += 15;

  return {
    engine: "rules_v1",
    ocrStatus: ["payment_screenshot", "bank_statement"].includes(type) ? "not_configured" : "not_needed",
    confidence,
    extractedAmountPaise,
    extractedPaidAt,
    extractedUtr,
    amountMatches,
    timeIsPlausible,
    paymentLanguageFound,
    warnings
  };
}

export { normalizeUtr };
