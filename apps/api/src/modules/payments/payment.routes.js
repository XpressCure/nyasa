import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { PaymentOrder } from "../../models/PaymentOrder.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";
import { getOrCreateMainTreasury, getOrCreateWallet } from "../treasury/treasury.service.js";
import { createRazorpayOrder, getRazorpayKeyId, verifyRazorpayPaymentSignature } from "./razorpay.service.js";

export const paymentRoutes = Router();

const createOrderSchema = z.object({
  amountRupees: z.coerce.number().positive(),
  description: z.string().max(280).optional()
});

const verifyPaymentSchema = z.object({
  paymentOrderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

paymentRoutes.use(requireAuth);

paymentRoutes.post(
  "/family/:familyId/razorpay-orders",
  requireFamilyPermission(permissions.treasuryContribute),
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    if (amountPaise <= 0) {
      throw httpError(400, "Payment amount must be greater than zero.", "INVALID_AMOUNT");
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
          email: req.user.email
        }
      }
    });
  })
);

paymentRoutes.post(
  "/family/:familyId/razorpay-payments/verify",
  requireFamilyPermission(permissions.treasuryContribute),
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
