import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import https from "node:https";
import { env } from "../../config/env.js";
import { httpError } from "../../utils/http-error.js";

function getBaseUrl() {
  return env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

export function isCashfreeConfigured() {
  return Boolean(env.CASHFREE_ENABLED && env.CASHFREE_CLIENT_ID && env.CASHFREE_CLIENT_SECRET);
}

async function cashfreeRequest(path, options = {}) {
  if (!isCashfreeConfigured()) {
    throw httpError(503, "Cashfree checkout is not configured.", "CASHFREE_NOT_CONFIGURED");
  }

  const requestBody = options.body || "";
  let response;
  try {
    response = await new Promise((resolve, reject) => {
      const request = https.request(`${getBaseUrl()}${path}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
          "x-api-version": env.CASHFREE_API_VERSION,
          "x-client-id": env.CASHFREE_CLIENT_ID,
          "x-client-secret": env.CASHFREE_CLIENT_SECRET,
          "x-request-id": randomUUID(),
          ...options.headers
        }
      }, (cashfreeResponse) => {
        const chunks = [];
        cashfreeResponse.on("data", (chunk) => chunks.push(chunk));
        cashfreeResponse.on("end", () => {
          const rawPayload = Buffer.concat(chunks).toString("utf8");
          let payload = {};
          try {
            payload = rawPayload ? JSON.parse(rawPayload) : {};
          } catch (_error) {
            payload = { message: rawPayload };
          }
          resolve({ ok: cashfreeResponse.statusCode >= 200 && cashfreeResponse.statusCode < 300, payload, status: cashfreeResponse.statusCode });
        });
      });
      request.on("error", reject);
      if (requestBody) request.write(requestBody);
      request.end();
    });
  } catch (_error) {
    throw httpError(502, "Could not reach Cashfree. Please try again.", "CASHFREE_UNREACHABLE");
  }

  if (!response.ok) {
    const message = response.payload.message || response.payload.type || `Cashfree request failed (${response.status}).`;
    throw httpError(502, message, "CASHFREE_REQUEST_FAILED");
  }
  return response.payload;
}

export function createCashfreeOrder({ orderId, amountRupees, customer, description, returnUrl }) {
  return cashfreeRequest("/orders", {
    method: "POST",
    headers: { "x-idempotency-key": randomUUID() },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amountRupees,
      order_currency: "INR",
      customer_details: {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email || undefined,
        customer_phone: customer.phone
      },
      order_meta: { return_url: returnUrl },
      order_note: description || "Nyas Kosh wallet contribution",
      order_tags: { purpose: "wallet_top_up" }
    })
  });
}

export function getCashfreeOrder(orderId) {
  return cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`);
}

export function getCashfreeOrderPayments(orderId) {
  return cashfreeRequest(`/orders/${encodeURIComponent(orderId)}/payments`);
}

export function verifyCashfreeWebhookSignature({ rawBody, timestamp, signature }) {
  if (!env.CASHFREE_CLIENT_SECRET || !rawBody || !timestamp || !signature) return false;
  const expected = createHmac("sha256", env.CASHFREE_CLIENT_SECRET)
    .update(`${timestamp}${rawBody.toString("utf8")}`)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}
