import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { requireAuth, requirePasswordAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { HostedContribution } from "../../models/HostedContribution.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { PaymentOrder } from "../../models/PaymentOrder.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";
import { getOrCreateMainTreasury, getOrCreateWallet } from "../treasury/treasury.service.js";
import {
  createCashfreeOrder,
  getCashfreeOrder,
  getCashfreeOrderPayments,
  isCashfreeConfigured,
  verifyCashfreeWebhookSignature
} from "./cashfree.service.js";
import { extractHostedPayment, normalizePhone, payloadContainsValue } from "./hosted-contribution.service.js";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature
} from "./razorpay.service.js";

export const paymentRoutes = Router();

const MIN_WALLET_TOP_UP_RUPEES = 2000;

const createOrderSchema = z.object({
  amountRupees: z.coerce.number().positive(),
  description: z.string().max(280).optional(),
  returnPath: z.enum(["/treasury", "/contribute"]).default("/treasury")
});

const verifyPaymentSchema = z.object({
  paymentOrderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

const cashfreeStatusSchema = z.object({
  providerOrderId: z.string().min(3).max(45)
});

const linkHostedContributionSchema = z.object({
  memberId: z.string().min(1)
});

function serializeHostedContribution(contribution) {
  return {
    id: contribution._id,
    amountPaise: contribution.amountPaise,
    amountRupees: paiseToRupees(contribution.amountPaise),
    currency: contribution.currency,
    donorEmail: contribution.donorEmail,
    donorName: contribution.donorName,
    donorPhone: contribution.donorPhone,
    matchReason: contribution.matchReason,
    memberId: contribution.memberId,
    paidAt: contribution.paidAt,
    providerPaymentId: contribution.providerPaymentId,
    status: contribution.status
  };
}

async function findPhoneMatches({ familyId, normalizedPhone }) {
  if (!normalizedPhone) return [];

  const members = await FamilyMember.find({
    familyId,
    status: "active",
    livingStatus: "living",
    userId: { $exists: true, $ne: null }
  }).populate("userId");

  return members.filter((member) => (
    member.userId?.status === "active" && normalizePhone(member.userId.phone) === normalizedPhone
  ));
}

async function creditCashfreeOrder({ paymentOrder, cashfreeOrder, cashfreePayment, req }) {
  if (paymentOrder.status === "paid") return paymentOrder;
  if (cashfreeOrder.order_status !== "PAID" || cashfreePayment?.payment_status !== "SUCCESS") {
    throw httpError(409, "Cashfree has not confirmed this payment yet.", "CASHFREE_PAYMENT_NOT_PAID");
  }
  if (cashfreeOrder.order_currency !== "INR" || rupeesToPaise(cashfreeOrder.order_amount) !== paymentOrder.amountPaise) {
    throw httpError(409, "Cashfree order amount does not match Nyas.", "CASHFREE_AMOUNT_MISMATCH");
  }

  const providerPaymentId = String(cashfreePayment.cf_payment_id);
  const ledgerPaymentId = `cashfree:${providerPaymentId}`;
  const existingTransaction = await LedgerTransaction.findOne({ paymentId: ledgerPaymentId });
  if (existingTransaction) {
    paymentOrder.status = "paid";
    paymentOrder.providerPaymentId = providerPaymentId;
    paymentOrder.ledgerTransactionId = existingTransaction._id;
    paymentOrder.paidAt = existingTransaction.postedAt || existingTransaction.createdAt;
    paymentOrder.rawProviderResponse = { order: cashfreeOrder, payment: cashfreePayment };
    await paymentOrder.save();
    return paymentOrder;
  }

  const lockedOrder = await PaymentOrder.findOneAndUpdate(
    { _id: paymentOrder._id, status: { $in: ["created", "failed"] } },
    { $set: { status: "processing" } },
    { new: true }
  );
  if (!lockedOrder) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const latestOrder = await PaymentOrder.findById(paymentOrder._id);
      if (latestOrder?.status === "paid") return latestOrder;
      if (latestOrder?.status !== "processing") break;
    }
    throw httpError(409, "This payment is still being verified. Refresh Kosh in a few seconds.", "CASHFREE_PAYMENT_PROCESSING");
  }

  try {
    const treasury = await getOrCreateMainTreasury({ familyId: lockedOrder.familyId, userId: lockedOrder.createdBy });
    const wallet = await getOrCreateWallet({ familyId: lockedOrder.familyId, memberId: lockedOrder.memberId });
    let transaction;
    try {
      transaction = await LedgerTransaction.create({
        familyId: lockedOrder.familyId,
        treasuryAccountId: treasury._id,
        walletId: wallet._id,
        memberId: lockedOrder.memberId,
        paymentId: ledgerPaymentId,
        type: "contribution",
        direction: "credit",
        amountPaise: lockedOrder.amountPaise,
        description: lockedOrder.description || "Cashfree wallet top-up",
        status: "posted",
        postedAt: new Date(cashfreePayment.payment_time || Date.now()),
        metadata: {
          source: `cashfree_${env.CASHFREE_ENV}`,
          cashfreeOrderId: lockedOrder.providerOrderId,
          cashfreePaymentId: providerPaymentId,
          paymentOrderId: lockedOrder._id
        },
        createdBy: lockedOrder.createdBy
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      transaction = await LedgerTransaction.findOne({ paymentId: ledgerPaymentId });
      if (!transaction) throw error;
    }

    lockedOrder.status = "paid";
    lockedOrder.providerPaymentId = providerPaymentId;
    lockedOrder.ledgerTransactionId = transaction._id;
    lockedOrder.paidAt = transaction.postedAt || new Date();
    lockedOrder.rawProviderResponse = { order: cashfreeOrder, payment: cashfreePayment };
    await lockedOrder.save();

    await writeAuditLog({
      familyId: lockedOrder.familyId,
      actorUserId: lockedOrder.createdBy,
      actorMemberId: lockedOrder.memberId,
      action: "payment.cashfree_wallet_top_up_verified",
      entityType: "PaymentOrder",
      entityId: String(lockedOrder._id),
      summary: `Verified Cashfree wallet top-up of INR ${paiseToRupees(lockedOrder.amountPaise)}`,
      after: { paymentOrderId: lockedOrder._id, transactionId: transaction._id, providerPaymentId },
      req
    });
    return lockedOrder;
  } catch (error) {
    await PaymentOrder.updateOne({ _id: lockedOrder._id, status: "processing" }, { $set: { status: "created" } });
    throw error;
  }
}

async function confirmCashfreeOrder({ paymentOrder, req }) {
  const [cashfreeOrder, payments] = await Promise.all([
    getCashfreeOrder(paymentOrder.providerOrderId),
    getCashfreeOrderPayments(paymentOrder.providerOrderId)
  ]);
  const successfulPayment = payments.find((payment) => payment.payment_status === "SUCCESS");
  return creditCashfreeOrder({ paymentOrder, cashfreeOrder, cashfreePayment: successfulPayment, req });
}

async function creditHostedContribution({ contribution, member, actorUser, matchReason, req }) {
  if (contribution.status === "credited") return contribution;

  const existingTransaction = await LedgerTransaction.findOne({ paymentId: contribution.providerPaymentId });
  if (existingTransaction) {
    contribution.status = "credited";
    contribution.memberId = existingTransaction.memberId;
    contribution.walletId = existingTransaction.walletId;
    contribution.ledgerTransactionId = existingTransaction._id;
    contribution.creditedAt = existingTransaction.postedAt || existingTransaction.createdAt;
    contribution.matchReason = matchReason;
    contribution.linkedBy = actorUser._id;
    await contribution.save();
    return contribution;
  }

  const treasury = await getOrCreateMainTreasury({ familyId: contribution.familyId, userId: actorUser._id });
  const wallet = await getOrCreateWallet({ familyId: contribution.familyId, memberId: member._id });
  let transaction;

  try {
    transaction = await LedgerTransaction.create({
      familyId: contribution.familyId,
      treasuryAccountId: treasury._id,
      walletId: wallet._id,
      memberId: member._id,
      paymentId: contribution.providerPaymentId,
      type: "contribution",
      direction: "credit",
      amountPaise: contribution.amountPaise,
      description: "Razorpay Payment Page wallet top-up",
      status: "posted",
      postedAt: contribution.paidAt || new Date(),
      metadata: {
        source: "razorpay_payment_page",
        hostedContributionId: contribution._id,
        paymentPageId: contribution.paymentPageId,
        razorpayOrderId: contribution.providerOrderId
      },
      createdBy: actorUser._id
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    transaction = await LedgerTransaction.findOne({ paymentId: contribution.providerPaymentId });
    if (!transaction) throw error;
  }

  contribution.status = "credited";
  contribution.memberId = member._id;
  contribution.walletId = wallet._id;
  contribution.ledgerTransactionId = transaction._id;
  contribution.creditedAt = new Date();
  contribution.matchReason = matchReason;
  contribution.linkedBy = actorUser._id;
  await contribution.save();

  await writeAuditLog({
    familyId: contribution.familyId,
    actorUserId: actorUser._id,
    actorMemberId: member._id,
    action: "payment.razorpay_payment_page_credited",
    entityType: "HostedContribution",
    entityId: String(contribution._id),
    summary: `Credited Payment Page contribution of INR ${paiseToRupees(contribution.amountPaise)} to ${member.displayName}`,
    after: {
      contributionId: contribution._id,
      transactionId: transaction._id,
      memberId: member._id,
      matchReason
    },
    req
  });

  return contribution;
}

paymentRoutes.post(
  "/cashfree-webhook",
  asyncHandler(async (req, res) => {
    if (!isCashfreeConfigured()) throw httpError(503, "Cashfree webhook is not configured.", "CASHFREE_NOT_CONFIGURED");
    if (!verifyCashfreeWebhookSignature({
      rawBody: req.rawBody,
      timestamp: req.get("x-webhook-timestamp"),
      signature: req.get("x-webhook-signature")
    })) {
      throw httpError(400, "Invalid Cashfree webhook signature.", "CASHFREE_WEBHOOK_SIGNATURE_INVALID");
    }

    if (req.body?.type !== "PAYMENT_SUCCESS_WEBHOOK") {
      res.json({ data: { ignored: true, reason: "event_not_used" } });
      return;
    }

    const providerOrderId = req.body?.data?.order?.order_id;
    const paymentOrder = providerOrderId
      ? await PaymentOrder.findOne({ provider: "cashfree", providerOrderId })
      : null;
    if (!paymentOrder) {
      res.json({ data: { ignored: true, reason: "order_not_found" } });
      return;
    }

    await confirmCashfreeOrder({ paymentOrder, req });
    res.json({ data: { credited: true, paymentOrderId: paymentOrder._id } });
  })
);

paymentRoutes.post(
  "/razorpay-webhook",
  asyncHandler(async (req, res) => {
    const acceptedPageIds = [env.RAZORPAY_PAYMENT_PAGE_ID, env.RAZORPAY_TEST_PAYMENT_PAGE_ID].filter(Boolean);
    if (!env.RAZORPAY_WEBHOOK_SECRET || !acceptedPageIds.length || !env.RAZORPAY_PAYMENT_PAGE_FAMILY_ID) {
      throw httpError(503, "Razorpay Payment Page webhook is not configured.", "RAZORPAY_WEBHOOK_NOT_CONFIGURED");
    }

    if (!verifyRazorpayWebhookSignature({
      rawBody: req.rawBody,
      signature: req.get("x-razorpay-signature")
    })) {
      throw httpError(400, "Invalid Razorpay webhook signature.", "RAZORPAY_WEBHOOK_SIGNATURE_INVALID");
    }

    if (!["order.paid", "payment.captured"].includes(req.body?.event)) {
      res.json({ data: { ignored: true, reason: "event_not_used" } });
      return;
    }

    const matchedPageId = acceptedPageIds.find((pageId) => payloadContainsValue(req.body?.payload, pageId));
    if (!matchedPageId) {
      res.json({ data: { ignored: true, reason: "different_payment_page" } });
      return;
    }

    const payment = extractHostedPayment(req.body);
    if (!payment?.providerPaymentId || payment.status !== "captured" || payment.currency !== "INR") {
      res.json({ data: { ignored: true, reason: "payment_not_captured" } });
      return;
    }

    if (matchedPageId === env.RAZORPAY_TEST_PAYMENT_PAGE_ID) {
      const matches = await findPhoneMatches({
        familyId: env.RAZORPAY_PAYMENT_PAGE_FAMILY_ID,
        normalizedPhone: payment.normalizedPhone
      });
      console.info("Razorpay Test Payment Page webhook validated", {
        amountRupees: paiseToRupees(payment.amountPaise),
        eventId: req.get("x-razorpay-event-id"),
        matchCount: matches.length,
        matchedMember: matches.length === 1 ? matches[0].displayName : null,
        paymentId: payment.providerPaymentId
      });
      res.json({
        data: {
          amountRupees: paiseToRupees(payment.amountPaise),
          donorName: payment.donorName,
          donorPhone: payment.donorPhone,
          matchCount: matches.length,
          matchedMember: matches.length === 1 ? matches[0].displayName : null,
          normalizedPhone: payment.normalizedPhone,
          testMode: true,
          validated: true
        }
      });
      return;
    }

    const belowMinimum = payment.amountPaise < rupeesToPaise(MIN_WALLET_TOP_UP_RUPEES);
    let contribution = await HostedContribution.findOneAndUpdate(
      { providerPaymentId: payment.providerPaymentId },
      {
        $setOnInsert: {
          familyId: env.RAZORPAY_PAYMENT_PAGE_FAMILY_ID,
          providerEventId: req.get("x-razorpay-event-id") || undefined,
          providerPaymentId: payment.providerPaymentId,
          providerOrderId: payment.providerOrderId,
          paymentPageId: matchedPageId,
          donorName: payment.donorName,
          donorPhone: payment.donorPhone,
          normalizedPhone: payment.normalizedPhone,
          donorEmail: payment.donorEmail,
          amountPaise: payment.amountPaise,
          currency: payment.currency,
          status: "pending",
          matchReason: belowMinimum ? "amount_below_minimum" : payment.normalizedPhone ? "phone_not_found" : "phone_missing",
          paidAt: payment.paidAt,
          rawProviderResponse: payment.source
        }
      },
      { new: true, upsert: true }
    );

    if (contribution.status === "credited" || belowMinimum) {
      res.json({ data: serializeHostedContribution(contribution) });
      return;
    }

    const matches = await findPhoneMatches({
      familyId: contribution.familyId,
      normalizedPhone: contribution.normalizedPhone
    });

    if (matches.length === 1) {
      contribution = await creditHostedContribution({
        contribution,
        member: matches[0],
        actorUser: matches[0].userId,
        matchReason: "phone_match",
        req
      });
    } else {
      contribution.matchReason = !contribution.normalizedPhone
        ? "phone_missing"
        : matches.length > 1 ? "phone_ambiguous" : "phone_not_found";
      await contribution.save();
    }

    res.json({ data: serializeHostedContribution(contribution) });
  })
);

paymentRoutes.use(requireAuth);

paymentRoutes.get(
  "/family/:familyId/providers",
  requireFamilyPermission(permissions.treasuryContribute),
  asyncHandler(async (_req, res) => {
    res.json({ data: {
      cashfree: {
        enabled: isCashfreeConfigured(),
        mode: env.CASHFREE_ENV
      },
      razorpay: {
        enabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
      }
    } });
  })
);

paymentRoutes.post(
  "/family/:familyId/cashfree-orders",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);
    if (body.amountRupees < MIN_WALLET_TOP_UP_RUPEES) {
      throw httpError(400, `Minimum wallet top-up is INR ${MIN_WALLET_TOP_UP_RUPEES}.`, "WALLET_TOP_UP_BELOW_MINIMUM");
    }
    if (!req.user.phone) throw httpError(400, "Add your phone number in Parichay before paying.", "PAYMENT_PHONE_REQUIRED");

    const providerOrderId = `nyas_${Date.now()}_${String(req.member._id).slice(-6)}`;
    const returnUrl = `${env.WEB_ORIGIN}${body.returnPath}?cashfree_return=1&order_id={order_id}`;
    const cashfreeOrder = await createCashfreeOrder({
      orderId: providerOrderId,
      amountRupees: body.amountRupees,
      customer: {
        id: String(req.member._id),
        name: req.user.fullName || req.member.displayName,
        email: req.user.email,
        phone: req.user.phone
      },
      description: body.description,
      returnUrl
    });
    const paymentOrder = await PaymentOrder.create({
      familyId: req.familyId,
      memberId: req.member._id,
      provider: "cashfree",
      providerOrderId,
      amountPaise: rupeesToPaise(body.amountRupees),
      currency: "INR",
      description: body.description || "Wallet top-up",
      status: "created",
      rawProviderResponse: cashfreeOrder,
      createdBy: req.user._id
    });

    res.status(201).json({ data: {
      paymentOrderId: paymentOrder._id,
      providerOrderId,
      paymentSessionId: cashfreeOrder.payment_session_id,
      mode: env.CASHFREE_ENV,
      amountRupees: body.amountRupees
    } });
  })
);

paymentRoutes.post(
  "/family/:familyId/cashfree-orders/status",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = cashfreeStatusSchema.parse(req.body);
    const paymentOrder = await PaymentOrder.findOne({
      familyId: req.familyId,
      memberId: req.member._id,
      provider: "cashfree",
      providerOrderId: body.providerOrderId
    });
    if (!paymentOrder) throw httpError(404, "Cashfree order not found.", "PAYMENT_ORDER_NOT_FOUND");
    const confirmedOrder = await confirmCashfreeOrder({ paymentOrder, req });
    res.json({ data: {
      amountRupees: paiseToRupees(confirmedOrder.amountPaise),
      paidAt: confirmedOrder.paidAt,
      status: confirmedOrder.status
    } });
  })
);

paymentRoutes.post(
  "/family/:familyId/hosted-contributions/claim",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const normalizedPhone = normalizePhone(req.user.phone);
    if (!normalizedPhone) {
      res.json({ data: { claimed: 0 } });
      return;
    }

    const pending = await HostedContribution.find({
      familyId: req.familyId,
      normalizedPhone,
      status: "pending",
      matchReason: { $ne: "amount_below_minimum" }
    });

    for (const contribution of pending) {
      await creditHostedContribution({
        contribution,
        member: req.member,
        actorUser: req.user,
        matchReason: "phone_match",
        req
      });
    }

    res.json({ data: { claimed: pending.length } });
  })
);

paymentRoutes.get(
  "/family/:familyId/hosted-contributions/pending",
  requireFamilyPermission(permissions.treasuryViewLedger),
  asyncHandler(async (req, res) => {
    const contributions = await HostedContribution.find({ familyId: req.familyId, status: "pending" }).sort({ paidAt: -1 });
    res.json({ data: contributions.map(serializeHostedContribution) });
  })
);

paymentRoutes.post(
  "/family/:familyId/hosted-contributions/:contributionId/link",
  requireFamilyPermission(permissions.treasuryViewLedger),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = linkHostedContributionSchema.parse(req.body);
    const [contribution, member] = await Promise.all([
      HostedContribution.findOne({ _id: req.params.contributionId, familyId: req.familyId }),
      FamilyMember.findOne({ _id: body.memberId, familyId: req.familyId, status: "active", livingStatus: "living" })
    ]);

    if (!contribution) throw httpError(404, "Payment Page contribution not found.", "HOSTED_CONTRIBUTION_NOT_FOUND");
    if (!member) throw httpError(404, "Living active member not found.", "MEMBER_NOT_FOUND");
    if (contribution.status === "credited") throw httpError(409, "Contribution is already credited.", "CONTRIBUTION_ALREADY_CREDITED");

    const credited = await creditHostedContribution({
      contribution,
      member,
      actorUser: req.user,
      matchReason: "manual_link",
      req
    });

    res.json({ data: serializeHostedContribution(credited) });
  })
);

paymentRoutes.post(
  "/family/:familyId/razorpay-orders",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    if (body.amountRupees < MIN_WALLET_TOP_UP_RUPEES) {
      throw httpError(400, `Minimum wallet top-up is INR ${MIN_WALLET_TOP_UP_RUPEES}.`, "WALLET_TOP_UP_BELOW_MINIMUM");
    }

    const receipt = `nyasa_${Date.now()}`.slice(0, 40);
    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      currency: "INR",
      receipt,
      notes: {
        familyId: String(req.familyId),
        memberId: String(req.member._id),
        purpose: "wallet_top_up"
      }
    });

    const paymentOrder = await PaymentOrder.create({
      familyId: req.familyId,
      memberId: req.member._id,
      providerOrderId: razorpayOrder.id,
      amountPaise,
      currency: "INR",
      description: body.description || "Wallet top-up",
      status: "created",
      rawProviderResponse: razorpayOrder,
      createdBy: req.user._id
    });

    res.status(201).json({
      data: {
        paymentOrderId: paymentOrder._id,
        providerOrderId: paymentOrder.providerOrderId,
        amountPaise: paymentOrder.amountPaise,
        amountRupees: paiseToRupees(paymentOrder.amountPaise),
        currency: paymentOrder.currency,
        description: paymentOrder.description,
        razorpayKeyId: getRazorpayKeyId(),
        member: {
          displayName: req.member.displayName
        },
        user: {
          fullName: req.user.fullName,
          email: req.user.email,
          phone: req.user.phone
        }
      }
    });
  })
);

paymentRoutes.post(
  "/family/:familyId/razorpay-payments/verify",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = verifyPaymentSchema.parse(req.body);

    if (
      !verifyRazorpayPaymentSignature({
        orderId: body.razorpayOrderId,
        paymentId: body.razorpayPaymentId,
        signature: body.razorpaySignature
      })
    ) {
      throw httpError(400, "Payment verification failed.", "RAZORPAY_SIGNATURE_INVALID");
    }

    const paymentOrder = await PaymentOrder.findOne({
      _id: body.paymentOrderId,
      familyId: req.familyId,
      memberId: req.member._id,
      providerOrderId: body.razorpayOrderId
    });

    if (!paymentOrder) {
      throw httpError(404, "Payment order not found.", "PAYMENT_ORDER_NOT_FOUND");
    }

    if (paymentOrder.status === "paid") {
      throw httpError(409, "Payment order is already credited.", "PAYMENT_ALREADY_CREDITED");
    }

    const duplicatePayment = await PaymentOrder.findOne({ providerPaymentId: body.razorpayPaymentId });

    if (duplicatePayment) {
      throw httpError(409, "Payment has already been used.", "PAYMENT_ALREADY_USED");
    }

    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
    const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId: req.member._id });
    const transaction = await LedgerTransaction.create({
      familyId: req.familyId,
      treasuryAccountId: treasury._id,
      walletId: wallet._id,
      memberId: req.member._id,
      paymentId: body.razorpayPaymentId,
      type: "contribution",
      direction: "credit",
      amountPaise: paymentOrder.amountPaise,
      description: paymentOrder.description || "Razorpay wallet top-up",
      status: "posted",
      postedAt: new Date(),
      metadata: {
        source: "razorpay",
        razorpayOrderId: body.razorpayOrderId,
        paymentOrderId: paymentOrder._id
      },
      createdBy: req.user._id
    });

    paymentOrder.status = "paid";
    paymentOrder.providerPaymentId = body.razorpayPaymentId;
    paymentOrder.ledgerTransactionId = transaction._id;
    paymentOrder.paidAt = new Date();
    await paymentOrder.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "payment.razorpay_wallet_top_up_verified",
      entityType: "PaymentOrder",
      entityId: String(paymentOrder._id),
      summary: `Verified Razorpay wallet top-up of INR ${paiseToRupees(paymentOrder.amountPaise)}`,
      after: {
        paymentOrderId: paymentOrder._id,
        transactionId: transaction._id,
        razorpayPaymentId: body.razorpayPaymentId,
        amountPaise: paymentOrder.amountPaise
      },
      req
    });

    res.json({ data: { paymentOrder, transaction } });
  })
);
