import assert from "node:assert/strict";
import test from "node:test";
import { extractHostedPayment, normalizePhone, payloadContainsValue } from "./hosted-contribution.service.js";

test("normalizes common Indian phone formats", () => {
  assert.equal(normalizePhone("+91 96210-16427"), "9621016427");
  assert.equal(normalizePhone("09621016427"), "9621016427");
  assert.equal(normalizePhone("9621016427"), "9621016427");
});

test("finds a configured payment page id anywhere in the signed payload", () => {
  assert.equal(payloadContainsValue({ payload: { order: { notes: { page: "pl_nyasa123" } } } }, "pl_nyasa123"), true);
  assert.equal(payloadContainsValue({ payload: { order: { notes: { page: "pl_other" } } } }, "pl_nyasa123"), false);
});

test("extracts Payment Page donor details from an order.paid payload", () => {
  const payment = extractHostedPayment({
    payload: {
      order: { entity: { id: "order_1", notes: { "Full Name": "Ajay Singh", payment_page_id: "pl_nyasa123" } } },
      payment: {
        entity: {
          amount: 200000,
          contact: "+91 98765 43210",
          currency: "INR",
          email: "ajay@example.com",
          id: "pay_1",
          order_id: "order_1",
          status: "captured"
        }
      }
    }
  });

  assert.equal(payment.donorName, "Ajay Singh");
  assert.equal(payment.normalizedPhone, "9876543210");
  assert.equal(payment.amountPaise, 200000);
  assert.equal(payment.providerPaymentId, "pay_1");
});
