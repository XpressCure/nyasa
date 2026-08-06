import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/nyasa-test";
process.env.JWT_SECRET ||= "test-secret-test-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-test-secret";

const { verifyRazorpayWebhookSignature } = await import("./razorpay.service.js");

test("validates a Razorpay webhook against the untouched request bytes", () => {
  const rawBody = Buffer.from('{"event":"order.paid","payload":{}}');
  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");

  assert.equal(verifyRazorpayWebhookSignature({ rawBody, signature }), true);
  assert.equal(verifyRazorpayWebhookSignature({ rawBody, signature: "invalid" }), false);
});
