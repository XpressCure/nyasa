import crypto from "node:crypto";
import https from "node:https";
import { env } from "../../config/env.js";
import { httpError } from "../../utils/http-error.js";

function assertRazorpayConfigured() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw httpError(500, "Razorpay is not configured.", "RAZORPAY_NOT_CONFIGURED");
  }
}

function requestRazorpay({ method, path, body }) {
  assertRazorpayConfigured();

  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path,
        method,
        auth: `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (response) => {
        let responseBody = "";

        response.on("data", (chunk) => {
          responseBody += chunk;
        });

        response.on("end", () => {
          let parsed = {};

          try {
            parsed = responseBody ? JSON.parse(responseBody) : {};
          } catch (_error) {
            parsed = {};
          }

          if (response.statusCode >= 400) {
            reject(httpError(response.statusCode, parsed.error?.description || "Razorpay request failed.", "RAZORPAY_REQUEST_FAILED"));
            return;
          }

          resolve(parsed);
        });
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

export function getRazorpayKeyId() {
  assertRazorpayConfigured();
  return env.RAZORPAY_KEY_ID;
}

export function createRazorpayOrder({ amountPaise, currency, receipt, notes }) {
  return requestRazorpay({
    method: "POST",
    path: "/v1/orders",
    body: {
      amount: amountPaise,
      currency,
      receipt,
      notes
    }
  });
}

export function verifyRazorpayPaymentSignature({ orderId, paymentId, signature }) {
  assertRazorpayConfigured();
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
