const donorNameKeys = ["full_name", "fullname", "name", "donor_name", "customer_name"];

export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function payloadContainsValue(value, expected) {
  if (!expected) return false;
  if (Array.isArray(value)) return value.some((item) => payloadContainsValue(item, expected));
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => payloadContainsValue(item, expected));
  }
  return typeof value === "string" && (value === expected || value.includes(expected));
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function noteEntries(notes) {
  if (!notes || Array.isArray(notes) || typeof notes !== "object") return [];
  return Object.entries(notes).map(([key, value]) => [normalizeKey(key), value]);
}

export function extractHostedPayment(payload) {
  const payment = payload?.payload?.payment?.entity || null;
  const order = payload?.payload?.order?.entity || null;
  if (!payment) return null;

  const notes = [...noteEntries(order?.notes), ...noteEntries(payment.notes)];
  const donorName = notes.find(([key]) => donorNameKeys.includes(key))?.[1] || payment.name || "";

  return {
    amountPaise: Number(payment.amount || order?.amount_paid || 0),
    currency: payment.currency || order?.currency || "INR",
    donorEmail: payment.email || "",
    donorName: String(donorName || "").trim(),
    donorPhone: payment.contact || "",
    normalizedPhone: normalizePhone(payment.contact),
    paidAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
    providerOrderId: payment.order_id || order?.id || "",
    providerPaymentId: payment.id || "",
    status: payment.status || "",
    source: { order, payment }
  };
}
