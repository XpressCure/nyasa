import { randomBytes } from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../../config/env.js";
import { requireAuth, requirePasswordAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { BankContributionClaim } from "../../models/BankContributionClaim.js";
import { KoshReconciliationSnapshot } from "../../models/KoshReconciliationSnapshot.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";
import { calculatePostedBalance, getOrCreateMainTreasury, getOrCreateWallet } from "../treasury/treasury.service.js";

export const selfDeclaredContributionRoutes = Router();

const MIN_CONTRIBUTION_RUPEES = 2000;
const declarationSchema = z.object({
  amountRupees: z.coerce.number().min(MIN_CONTRIBUTION_RUPEES),
  paidAt: z.coerce.date(),
  utr: z.string().trim().max(40).optional().default(""),
  sourceAccountLast4: z.string().trim().regex(/^\d{4}$/).optional().or(z.literal("")),
  note: z.string().trim().max(280).optional().default(""),
  declarationToken: z.string().min(12).max(100),
  attested: z.literal(true)
});
const reconciliationSchema = z.object({
  actualBankBalanceRupees: z.coerce.number().min(0),
  asOfDate: z.coerce.date(),
  note: z.string().trim().max(1000).optional().default("")
});
const declarationReviewSchema = z.object({
  confirmedAmountRupees: z.coerce.number().min(0),
  confirmedUtr: z.string().trim().max(40).optional().default(""),
  note: z.string().trim().max(1000).optional().default("")
});

function normalizeUtr(value = "") {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function assertNotFuture(date, fieldName) {
  if (date.getTime() > Date.now() + 5 * 60 * 1000) {
    throw httpError(400, `${fieldName} cannot be in the future.`, "FUTURE_DATE_NOT_ALLOWED");
  }
}

function createReference(memberId) {
  return `NYAS-${String(memberId).slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function serializeDeclaration(claim) {
  return {
    id: claim._id,
    member: claim.memberId,
    declaredAmountRupees: paiseToRupees(claim.requestedAmountPaise),
    confirmedAmountRupees: claim.reconciliationStatus === "reconciled" ? paiseToRupees(claim.approvedAmountPaise) : null,
    amountRupees: paiseToRupees(claim.approvedAmountPaise ?? claim.requestedAmountPaise),
    paymentReference: claim.paymentReference,
    utr: claim.utr || "",
    paidAt: claim.declaredPaidAt,
    sourceAccountLast4: claim.sourceAccountLast4 || "",
    status: claim.status,
    reconciliationStatus: claim.reconciliationStatus,
    reconciliationNote: claim.reconciliationNote || "",
    ledgerTransactionId: claim.ledgerTransactionId,
    createdAt: claim.createdAt
  };
}

async function calculateExpectedBankBalancePaise(familyId, asOfDate = new Date()) {
  const rows = await LedgerTransaction.aggregate([
    {
      $match: {
        familyId: new mongoose.Types.ObjectId(familyId),
        status: "posted",
        createdAt: { $lte: asOfDate },
        type: { $in: ["contribution", "expense_debit", "adjustment", "reversal", "transfer"] }
      }
    },
    { $group: { _id: "$direction", amountPaise: { $sum: "$amountPaise" } } }
  ]);
  return rows.reduce((total, row) => total + (row._id === "credit" ? row.amountPaise : -row.amountPaise), 0);
}

selfDeclaredContributionRoutes.use(requireAuth);

selfDeclaredContributionRoutes.get(
  "/family/:familyId/config",
  requireFamilyPermission(permissions.treasuryContribute),
  asyncHandler(async (_req, res) => {
    res.json({ data: {
      enabled: env.BANK_CONTRIBUTION_ENABLED,
      minimumAmountRupees: MIN_CONTRIBUTION_RUPEES,
      accountName: env.BANK_ACCOUNT_NAME || "",
      accountNumber: env.BANK_ACCOUNT_NUMBER || "",
      ifsc: env.BANK_IFSC || "",
      upiId: env.BANK_UPI_ID || "",
      qrImageUrl: env.BANK_QR_IMAGE_URL || "",
      paymentLink: env.BANK_PAYMENT_LINK || ""
    } });
  })
);

selfDeclaredContributionRoutes.get(
  "/family/:familyId/mine",
  requireFamilyPermission(permissions.treasuryContribute),
  asyncHandler(async (req, res) => {
    const declarations = await BankContributionClaim.find({
      familyId: req.familyId,
      memberId: req.member._id,
      contributionMode: "member_declared"
    }).sort({ createdAt: -1 }).limit(50);
    res.json({ data: declarations.map(serializeDeclaration) });
  })
);

selfDeclaredContributionRoutes.post(
  "/family/:familyId/declarations",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    if (!env.BANK_CONTRIBUTION_ENABLED) throw httpError(503, "Direct bank contribution is not enabled yet.", "BANK_CONTRIBUTIONS_DISABLED");
    const body = declarationSchema.parse(req.body);
    assertNotFuture(body.paidAt, "Transfer date");
    const utr = normalizeUtr(body.utr);
    if (utr && utr.length < 6) throw httpError(400, "Enter at least the last 6 characters of the UTR, or leave it blank.", "INVALID_UTR");

    const existing = await BankContributionClaim.findOne({
      familyId: req.familyId,
      memberId: req.member._id,
      declarationToken: body.declarationToken
    });
    if (existing) return res.json({ data: serializeDeclaration(existing), message: "This contribution was already recorded. Your wallet was not credited twice." });
    if (utr) {
      const duplicateUtr = await BankContributionClaim.findOne({ familyId: req.familyId, utr });
      if (duplicateUtr) throw httpError(409, "This UTR has already been recorded in Nyas.", "DUPLICATE_BANK_PAYMENT");
    }

    const amountPaise = rupeesToPaise(body.amountRupees);
    let claim;
    try {
      claim = await BankContributionClaim.create({
        familyId: req.familyId,
        memberId: req.member._id,
        requestedAmountPaise: amountPaise,
        approvedAmountPaise: amountPaise,
        paymentReference: createReference(req.member._id),
        utr: utr || undefined,
        status: "processing",
        contributionMode: "member_declared",
        declarationToken: body.declarationToken,
        declaredPaidAt: body.paidAt,
        sourceAccountLast4: body.sourceAccountLast4 || undefined,
        attestedAt: new Date(),
        reviewerNote: body.note,
        createdBy: req.user._id
      });
    } catch (error) {
      if (error?.code === 11000) throw httpError(409, "This transfer or declaration has already been recorded.", "DUPLICATE_BANK_PAYMENT");
      throw error;
    }

    try {
      const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
      const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId: req.member._id });
      const transaction = await LedgerTransaction.create({
        familyId: req.familyId,
        treasuryAccountId: treasury._id,
        walletId: wallet._id,
        memberId: req.member._id,
        paymentId: `member-declaration:${claim._id}`,
        type: "contribution",
        direction: "credit",
        amountPaise,
        description: body.note || "Member-declared bank contribution",
        status: "posted",
        postedAt: new Date(),
        metadata: { source: "member_declared_bank_transfer", claimId: claim._id, utr: utr || null, declaredPaidAt: body.paidAt },
        createdBy: req.user._id
      });
      claim.status = "self_recorded";
      claim.ledgerTransactionId = transaction._id;
      await claim.save();
      await writeAuditLog({
        familyId: req.familyId,
        actorUserId: req.user._id,
        actorMemberId: req.member._id,
        action: "treasury.member_bank_contribution_declared",
        entityType: "BankContributionClaim",
        entityId: String(claim._id),
        summary: `Member declared bank contribution of INR ${body.amountRupees}`,
        after: { amountPaise, utr: utr || null, paidAt: body.paidAt, transactionId: transaction._id },
        req
      });
      res.status(201).json({
        data: serializeDeclaration(claim),
        message: "Thank you. Your declaration is recorded and the amount is now available in your wallet."
      });
    } catch (error) {
      const transaction = await LedgerTransaction.findOne({ paymentId: `member-declaration:${claim._id}` });
      if (transaction) {
        claim.status = "self_recorded";
        claim.ledgerTransactionId = transaction._id;
        await claim.save();
        return res.json({ data: serializeDeclaration(claim), message: "Contribution recorded. Your wallet was credited once." });
      }
      await BankContributionClaim.deleteOne({ _id: claim._id, status: "processing" });
      throw error;
    }
  })
);

selfDeclaredContributionRoutes.get(
  "/family/:familyId/reconciliation",
  requireFamilyPermission(permissions.treasuryViewLedger),
  asyncHandler(async (req, res) => {
    const expectedBankBalancePaise = await calculateExpectedBankBalancePaise(req.familyId);
    const [latest, history, counts, recentDeclarations] = await Promise.all([
      KoshReconciliationSnapshot.findOne({ familyId: req.familyId }).populate("recordedBy", "displayName role").sort({ asOfDate: -1, createdAt: -1 }),
      KoshReconciliationSnapshot.find({ familyId: req.familyId }).populate("recordedBy", "displayName role").sort({ asOfDate: -1, createdAt: -1 }).limit(12),
      BankContributionClaim.aggregate([
        { $match: { familyId: new mongoose.Types.ObjectId(req.familyId), contributionMode: "member_declared" } },
        { $group: { _id: "$reconciliationStatus", count: { $sum: 1 }, amountPaise: { $sum: "$approvedAmountPaise" } } }
      ]),
      BankContributionClaim.find({ familyId: req.familyId, contributionMode: "member_declared" })
        .populate("memberId", "displayName role")
        .sort({ createdAt: -1 })
        .limit(30)
    ]);
    const serializeSnapshot = (snapshot) => ({
      id: snapshot._id,
      actualBankBalanceRupees: paiseToRupees(snapshot.actualBankBalancePaise),
      expectedBankBalanceRupees: paiseToRupees(snapshot.expectedBankBalancePaise),
      differenceRupees: paiseToRupees(snapshot.differencePaise),
      asOfDate: snapshot.asOfDate,
      note: snapshot.note,
      recordedBy: snapshot.recordedBy,
      createdAt: snapshot.createdAt
    });
    res.json({ data: {
      currentExpectedBankBalanceRupees: paiseToRupees(expectedBankBalancePaise),
      latest: latest ? serializeSnapshot(latest) : null,
      history: history.map(serializeSnapshot),
      declarationSummary: counts.map((row) => ({ status: row._id, count: row.count, amountRupees: paiseToRupees(row.amountPaise || 0) })),
      recentDeclarations: recentDeclarations.map(serializeDeclaration)
    } });
  })
);

selfDeclaredContributionRoutes.post(
  "/family/:familyId/reconciliation",
  requireFamilyPermission(permissions.treasuryViewLedger),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = reconciliationSchema.parse(req.body);
    assertNotFuture(body.asOfDate, "Statement date");
    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
    const expectedBankBalancePaise = await calculateExpectedBankBalancePaise(req.familyId, body.asOfDate);
    const actualBankBalancePaise = rupeesToPaise(body.actualBankBalanceRupees);
    const snapshot = await KoshReconciliationSnapshot.create({
      familyId: req.familyId,
      treasuryAccountId: treasury._id,
      actualBankBalancePaise,
      expectedBankBalancePaise,
      differencePaise: actualBankBalancePaise - expectedBankBalancePaise,
      asOfDate: body.asOfDate,
      note: body.note,
      recordedBy: req.member._id,
      createdBy: req.user._id
    });
    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "treasury.kosh_reconciled",
      entityType: "KoshReconciliationSnapshot",
      entityId: String(snapshot._id),
      summary: `Recorded Kosh reconciliation variance of INR ${paiseToRupees(snapshot.differencePaise)}`,
      after: snapshot.toObject(),
      req
    });
    res.status(201).json({ data: { id: snapshot._id, differenceRupees: paiseToRupees(snapshot.differencePaise) }, message: "Bank balance snapshot recorded." });
  })
);

selfDeclaredContributionRoutes.post(
  "/family/:familyId/declarations/:claimId/reconciliation",
  requireFamilyPermission(permissions.treasuryViewLedger),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = declarationReviewSchema.parse(req.body);
    const claim = await BankContributionClaim.findOne({
      _id: req.params.claimId,
      familyId: req.familyId,
      contributionMode: "member_declared",
      status: "self_recorded"
    });
    if (!claim) throw httpError(404, "Contribution declaration not found.", "DECLARATION_NOT_FOUND");

    const confirmedUtr = normalizeUtr(body.confirmedUtr || claim.utr || "");
    if (confirmedUtr && confirmedUtr.length < 6) throw httpError(400, "Enter at least the last 6 UTR characters.", "INVALID_UTR");
    if (confirmedUtr) {
      const duplicateUtr = await BankContributionClaim.findOne({ familyId: req.familyId, utr: confirmedUtr, _id: { $ne: claim._id } });
      if (duplicateUtr) throw httpError(409, "This UTR belongs to another contribution.", "DUPLICATE_BANK_PAYMENT");
    }

    const previousAmountPaise = claim.approvedAmountPaise ?? claim.requestedAmountPaise;
    const confirmedAmountPaise = rupeesToPaise(body.confirmedAmountRupees);
    const differencePaise = confirmedAmountPaise - previousAmountPaise;
    const nextVersion = (claim.reconciliationVersion || 0) + 1;
    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
    const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId: claim.memberId });

    let adjustment = null;
    if (differencePaise !== 0) {
      try {
        adjustment = await LedgerTransaction.create({
          familyId: req.familyId,
          treasuryAccountId: treasury._id,
          walletId: wallet._id,
          memberId: claim.memberId,
          paymentId: `declaration-reconciliation:${claim._id}:${nextVersion}`,
          type: "adjustment",
          direction: differencePaise > 0 ? "credit" : "debit",
          amountPaise: Math.abs(differencePaise),
          description: `Kosh reconciliation for ${claim.paymentReference}`,
          status: "posted",
          postedAt: new Date(),
          metadata: {
            source: "bank_reconciliation_adjustment",
            claimId: claim._id,
            declaredAmountPaise: claim.requestedAmountPaise,
            previousAmountPaise,
            confirmedAmountPaise,
            confirmedUtr: confirmedUtr || null
          },
          createdBy: req.user._id
        });
      } catch (error) {
        if (error?.code === 11000) throw httpError(409, "This reconciliation was already submitted. Refresh the page.", "RECONCILIATION_ALREADY_POSTED");
        throw error;
      }
    }

    const updatedClaim = await BankContributionClaim.findOneAndUpdate(
      { _id: claim._id, reconciliationVersion: claim.reconciliationVersion || 0 },
      {
        $set: {
          approvedAmountPaise: confirmedAmountPaise,
          utr: confirmedUtr || undefined,
          reconciliationStatus: "reconciled",
          reconciliationNote: body.note,
          reconciledBy: req.member._id,
          reconciledAt: new Date()
        },
        $inc: { reconciliationVersion: 1 }
      },
      { new: true }
    ).populate("memberId", "displayName role");
    if (!updatedClaim) {
      if (adjustment) await LedgerTransaction.updateOne({ _id: adjustment._id }, { $set: { status: "reversed" } });
      throw httpError(409, "Another Kosh Pramukh updated this declaration. Refresh and check again.", "RECONCILIATION_CONFLICT");
    }

    const walletBalancePaise = await calculatePostedBalance({ familyId: req.familyId, walletId: wallet._id });
    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "treasury.member_declaration_reconciled",
      entityType: "BankContributionClaim",
      entityId: String(claim._id),
      summary: `Reconciled ${claim.paymentReference} from INR ${paiseToRupees(previousAmountPaise)} to INR ${body.confirmedAmountRupees}`,
      after: { confirmedAmountPaise, differencePaise, walletBalancePaise, adjustmentId: adjustment?._id || null },
      req
    });
    res.json({
      data: {
        ...serializeDeclaration(updatedClaim),
        adjustmentRupees: paiseToRupees(differencePaise),
        walletBalanceRupees: paiseToRupees(walletBalancePaise),
        walletShortfallRupees: paiseToRupees(Math.max(-walletBalancePaise, 0))
      },
      message: walletBalancePaise < 0
        ? `Confirmed amount saved. This member now has a wallet shortfall of INR ${paiseToRupees(-walletBalancePaise)} because money was already allocated.`
        : `Confirmed amount saved. Wallet adjusted by INR ${paiseToRupees(differencePaise)}.`
    });
  })
);
