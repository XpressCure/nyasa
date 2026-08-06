import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/nyasa-test";
process.env.JWT_SECRET ||= "cashfree-test-secret-at-least-16";
process.env.CASHFREE_CLIENT_SECRET ||= "cashfree-test-client-secret";

const { verifyCashfreeWebhookSignature } = await import("./cashfree.service.js");

test("verifies Cashfree signature against timestamp and untouched body", () => {
  const rawBody = Buffer.from('{"type":"PAYMENT_SUCCESS_WEBHOOK"}');
  const timestamp = "1786000000000";
  const signature = createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET)
    .update(`${timestamp}${rawBody.toString("utf8")}`)
    .digest("base64");

  assert.equal(verifyCashfreeWebhookSignature({ rawBody, timestamp, signature }), true);
  assert.equal(verifyCashfreeWebhookSignature({ rawBody: Buffer.from("changed"), timestamp, signature }), false);
});
