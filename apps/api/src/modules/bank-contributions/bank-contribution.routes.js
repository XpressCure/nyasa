import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { requireAuth, requirePasswordAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { BankContributionClaim } from "../../models/BankContributionClaim.js";
import { BankSmsReceipt } from "../../models/BankSmsReceipt.js";
import { Document } from "../../models/Document.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { saveDocumentFile } from "../documents/document-storage.service.js";
import { permissions, roleHasPermission } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";
import { getOrCreateMainTreasury, getOrCreateWallet } from "../treasury/treasury.service.js";
import { analyzeContributionEvidence, normalizeUtr } from "./evidence-analysis.js";
import { matchBankSmsToClaims, verifySmsSignature } from "./bank-sms.service.js";

export const bankContributionRoutes = Router();
const MIN_CONTRIBUTION_RUPEES = 2000;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const createClaimSchema = z.object({ amountRupees: z.coerce.number().min(MIN_CONTRIBUTION_RUPEES) });
const evidenceSchema = z.object({
  type: z.enum(["contributor_sms", "bank_sms", "payment_screenshot", "bank_statement"]),
  smsText: z.string().max(4000).optional().default(""),
  amountRupees: z.coerce.number().positive().optional(),
  paidAt: z.string().datetime().optional(),
  utr: z.string().max(40).optional(),
  proof: z.object({
    originalName: z.string().min(1).max(180),
    mimeType: z.enum(allowedMimeTypes),
    sizeBytes: z.coerce.number().positive().max(MAX_UPLOAD_BYTES),
    dataBase64: z.string().min(1)
  }).optional()
});
const decisionSchema = z.object({
  note: z.string().max(1000).optional().default(""),
  amountRupees: z.coerce.number().min(MIN_CONTRIBUTION_RUPEES).optional(),
  utr: z.string().min(6).max(40).optional()
});
const smsIngestSchema = z.object({
  messageId: z.string().min(1).max(180),
  sender: z.string().min(2).max(80),
  body: z.string().min(1).max(4000),
  receivedAt: z.string().datetime()
});

function createPaymentReference(memberId) {
  return `NYAS-${String(memberId).slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function serializeEvidence(evidence) {
  return {
    id: evidence._id,
    type: evidence.type,
    smsText: evidence.smsText,
    declaredAmountRupees: evidence.declaredAmountPaise ? paiseToRupees(evidence.declaredAmountPaise) : null,
    declaredPaidAt: evidence.declaredPaidAt,
    declaredUtr: evidence.declaredUtr,
    proofDocumentId: evidence.proofDocumentId,
    analysis: evidence.analysis ? {
      ...(evidence.analysis.toObject?.() || evidence.analysis),
      extractedAmountRupees: evidence.analysis.extractedAmountPaise ? paiseToRupees(evidence.analysis.extractedAmountPaise) : null
    } : null,
    submittedBy: evidence.submittedBy,
    submittedAt: evidence.submittedAt
  };
}

function serializeClaim(claim) {
  return {
    id: claim._id,
    member: claim.memberId,
    requestedAmountRupees: paiseToRupees(claim.requestedAmountPaise),
    approvedAmountRupees: claim.approvedAmountPaise ? paiseToRupees(claim.approvedAmountPaise) : null,
    paymentReference: claim.paymentReference,
    utr: claim.utr,
    status: claim.status,
    evidence: claim.evidence.map(serializeEvidence),
    reviewerNote: claim.reviewerNote,
    reviewedBy: claim.reviewedBy,
    reviewedAt: claim.reviewedAt,
    ledgerTransactionId: claim.ledgerTransactionId,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt
  };
}

async function findAccessibleClaim(req) {
  const claim = await BankContributionClaim.findOne({ _id: req.params.claimId, familyId: req.familyId });
  if (!claim) throw httpError(404, "Contribution claim not found.", "BANK_CLAIM_NOT_FOUND");
  const isReviewer = roleHasPermission(req.member.role, permissions.treasuryViewLedger);
  if (!isReviewer && String(claim.memberId) !== String(req.member._id)) {
    throw httpError(403, "You cannot access this contribution claim.", "BANK_CLAIM_ACCESS_DENIED");
  }
  return claim;
}

bankContributionRoutes.post(
  "/sms-ingest",
  asyncHandler(async (req, res) => {
    if (!env.BANK_SMS_INGEST_SECRET || !env.BANK_SMS_FAMILY_ID) throw httpError(503, "Bank SMS ingestion is not configured.", "BANK_SMS_NOT_CONFIGURED");
    const rawBody = req.rawBody?.toString("utf8") || "";
    const timestamp = req.get("x-nyas-timestamp") || "";
    const signature = req.get("x-nyas-signature") || "";
    if (!verifySmsSignature({ rawBody, timestamp, signature, secret: env.BANK_SMS_INGEST_SECRET })) {
      throw httpError(401, "Invalid bank SMS signature.", "INVALID_BANK_SMS_SIGNATURE");
    }
    const body = smsIngestSchema.parse(req.body);
    const allowedSenders = (env.BANK_SMS_ALLOWED_SENDERS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (!allowedSenders.length || !allowedSenders.some((sender) => body.sender.toLowerCase().includes(sender))) {
      throw httpError(403, "SMS sender is not allowlisted.", "BANK_SMS_SENDER_NOT_ALLOWED");
    }

    const duplicate = await BankSmsReceipt.findOne({ familyId: env.BANK_SMS_FAMILY_ID, messageId: body.messageId });
    if (duplicate) return res.json({ data: { status: duplicate.status, duplicate: true, matchedClaimId: duplicate.matchedClaimId } });

    const receivedAt = new Date(body.receivedAt);
    const claims = await BankContributionClaim.find({
      familyId: env.BANK_SMS_FAMILY_ID,
      status: { $in: ["awaiting_payment", "pending_review"] },
      createdAt: { $gte: new Date(receivedAt.getTime() - 7 * 24 * 60 * 60 * 1000), $lte: new Date(receivedAt.getTime() + 15 * 60 * 1000) }
    });
    const match = matchBankSmsToClaims({ body: body.body, receivedAt, claims });
    let matchedClaimId = null;
    if (match.claim) {
      match.claim.evidence.push({
        type: "bank_sms",
        smsText: body.body,
        analysis: match.analysis,
        submittedBySystem: true,
        submittedAt: receivedAt
      });
      match.claim.status = "pending_review";
      if (!match.claim.utr && match.analysis.extractedUtr) match.claim.utr = match.analysis.extractedUtr;
      await match.claim.save();
      matchedClaimId = match.claim._id;
    }
    const receipt = await BankSmsReceipt.create({
      familyId: env.BANK_SMS_FAMILY_ID,
      messageId: body.messageId,
      sender: body.sender,
      body: body.body,
      receivedAt,
      status: match.claim ? "matched" : "unmatched",
      matchedClaimId,
      extractedUtr: match.analysis.extractedUtr,
      extractedAmountPaise: match.analysis.extractedAmountPaise,
      matchReason: match.reason
    });
    res.status(201).json({ data: { status: receipt.status, matchedClaimId, matchReason: match.reason } });
  })
);

bankContributionRoutes.use(requireAuth);

bankContributionRoutes.get(
  "/family/:familyId/config",
  requireFamilyPermission(permissions.treasuryContribute),
  asyncHandler(async (_req, res) => {
    res.json({ data: {
      enabled: env.BANK_CONTRIBUTION_ENABLED,
      minimumAmountRupees: MIN_CONTRIBUTION_RUPEES,
      accountName: env.BANK_ACCOUNT_NAME || "",
      accountNumber: env.BANK_ACCOUNT_NUMBER || "",
      ifsc: env.BANK_IFSC || "",
      upiId: env.BANK_UPI_ID || ""
    } });
  })
);

bankContributionRoutes.get(
  "/family/:familyId/mine",
  requireFamilyPermission(permissions.treasuryContribute),
  asyncHandler(async (req, res) => {
    const claims = await BankContributionClaim.find({ familyId: req.familyId, memberId: req.member._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ data: claims.map(serializeClaim) });
  })
);

bankContributionRoutes.get(
  "/family/:familyId/review",
  requireFamilyPermission(permissions.treasuryViewLedger),
  asyncHandler(async (req, res) => {
    const claims = await BankContributionClaim.find({ familyId: req.familyId, status: { $in: ["pending_review", "processing"] } })
      .populate("memberId", "displayName role")
      .populate("evidence.submittedBy", "displayName role")
      .sort({ createdAt: 1 });
    res.json({ data: claims.map(serializeClaim) });
  })
);

bankContributionRoutes.get(
  "/family/:familyId/sms-receipts",
  requireFamilyPermission(permissions.treasuryViewLedger),
  asyncHandler(async (req, res) => {
    const receipts = await BankSmsReceipt.find({ familyId: req.familyId, status: "unmatched" }).sort({ receivedAt: -1 }).limit(30);
    res.json({ data: receipts.map((receipt) => ({
      id: receipt._id,
      sender: receipt.sender,
      body: receipt.body,
      receivedAt: receipt.receivedAt,
      extractedUtr: receipt.extractedUtr,
      extractedAmountRupees: receipt.extractedAmountPaise ? paiseToRupees(receipt.extractedAmountPaise) : null,
      matchReason: receipt.matchReason
    })) });
  })
);

bankContributionRoutes.post(
  "/family/:familyId/claims",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    if (!env.BANK_CONTRIBUTION_ENABLED) throw httpError(503, "Bank contributions are not enabled yet.", "BANK_CONTRIBUTIONS_DISABLED");
    const body = createClaimSchema.parse(req.body);
    const openClaim = await BankContributionClaim.findOne({
      familyId: req.familyId,
      memberId: req.member._id,
      status: { $in: ["awaiting_payment", "pending_review", "processing"] }
    });
    if (openClaim) throw httpError(409, "Complete your existing bank contribution before creating another.", "OPEN_BANK_CLAIM_EXISTS");
    const claim = await BankContributionClaim.create({
      familyId: req.familyId,
      memberId: req.member._id,
      requestedAmountPaise: rupeesToPaise(body.amountRupees),
      paymentReference: createPaymentReference(req.member._id),
      createdBy: req.user._id
    });
    res.status(201).json({ data: serializeClaim(claim), message: "Payment reference created. Pay from your bank, then submit SMS or receipt proof." });
  })
);

bankContributionRoutes.post(
  "/family/:familyId/claims/:claimId/evidence",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = evidenceSchema.parse(req.body);
    const claim = await findAccessibleClaim(req);
    if (!["awaiting_payment", "pending_review"].includes(claim.status)) throw httpError(409, "This claim can no longer accept evidence.", "BANK_CLAIM_CLOSED");
    const isReviewer = roleHasPermission(req.member.role, permissions.treasuryViewLedger);
    if (body.type === "bank_sms" && !isReviewer) throw httpError(403, "Only Kosh reviewers can submit bank-side SMS.", "BANK_SMS_REVIEWER_ONLY");
    if (!body.smsText && !body.proof) throw httpError(400, "Paste an SMS or upload payment proof.", "PAYMENT_EVIDENCE_REQUIRED");

    let proofDocument = null;
    if (body.proof) {
      const fileBuffer = Buffer.from(body.proof.dataBase64, "base64");
      if (fileBuffer.length !== body.proof.sizeBytes || fileBuffer.length > MAX_UPLOAD_BYTES) throw httpError(400, "Uploaded proof size is invalid.", "INVALID_UPLOAD_SIZE");
      const storedFile = await saveDocumentFile({
        familyId: req.familyId,
        memberId: req.member._id,
        folder: `bank-contributions/${claim._id}`,
        originalName: body.proof.originalName,
        mimeType: body.proof.mimeType,
        fileBuffer
      });
      proofDocument = await Document.create({
        familyId: req.familyId,
        memberId: claim.memberId,
        originalName: body.proof.originalName,
        storedName: storedFile.storedName,
        mimeType: body.proof.mimeType,
        sizeBytes: body.proof.sizeBytes,
        storageDriver: storedFile.storageDriver,
        storagePath: storedFile.storagePath,
        storageKey: storedFile.storageKey,
        bucketName: storedFile.bucketName,
        region: storedFile.region,
        category: "bank_contribution_proof",
        uploadedBy: req.member._id
      });
    }

    const declaredAmountPaise = body.amountRupees ? rupeesToPaise(body.amountRupees) : undefined;
    const analysis = analyzeContributionEvidence({
      type: body.type,
      smsText: body.smsText,
      declaredAmountPaise,
      declaredPaidAt: body.paidAt,
      declaredUtr: body.utr,
      requestedAmountPaise: claim.requestedAmountPaise
    });
    claim.evidence.push({
      type: body.type,
      smsText: body.smsText,
      declaredAmountPaise,
      declaredPaidAt: body.paidAt ? new Date(body.paidAt) : undefined,
      declaredUtr: normalizeUtr(body.utr || "") || undefined,
      proofDocumentId: proofDocument?._id,
      analysis,
      submittedBy: req.member._id
    });
    claim.status = "pending_review";
    if (!claim.utr && analysis.extractedUtr) claim.utr = analysis.extractedUtr;
    try {
      await claim.save();
    } catch (error) {
      if (error?.code === 11000) throw httpError(409, "This UTR is already attached to another claim.", "DUPLICATE_BANK_PAYMENT");
      throw error;
    }
    res.status(201).json({ data: serializeClaim(claim), message: "Evidence submitted. Kosh Pramukh will verify it before your wallet is credited." });
  })
);

bankContributionRoutes.post(
  "/family/:familyId/claims/:claimId/approve",
  requireFamilyPermission(permissions.treasuryViewLedger),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = decisionSchema.parse(req.body);
    const existing = await BankContributionClaim.findOne({ _id: req.params.claimId, familyId: req.familyId });
    if (!existing || existing.status !== "pending_review") throw httpError(409, "Claim is not awaiting approval.", "BANK_CLAIM_NOT_PENDING");
    const utr = normalizeUtr(body.utr || existing.utr || existing.evidence.map((item) => item.analysis?.extractedUtr).find(Boolean) || "");
    if (!utr) throw httpError(400, "UTR/RRN is required before approval.", "UTR_REQUIRED");
    const approvedAmountPaise = body.amountRupees ? rupeesToPaise(body.amountRupees) : existing.requestedAmountPaise;

    let claim;
    try {
      claim = await BankContributionClaim.findOneAndUpdate(
        { _id: existing._id, familyId: req.familyId, status: "pending_review" },
        { $set: { status: "processing", utr } },
        { new: true }
      );
    } catch (error) {
      if (error?.code === 11000) throw httpError(409, "This UTR is already attached to another claim.", "DUPLICATE_BANK_PAYMENT");
      throw error;
    }
    if (!claim) throw httpError(409, "Another reviewer is already processing this claim.", "BANK_CLAIM_ALREADY_PROCESSING");

    try {
      const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
      const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId: claim.memberId });
      const transaction = await LedgerTransaction.create({
        familyId: req.familyId,
        treasuryAccountId: treasury._id,
        walletId: wallet._id,
        memberId: claim.memberId,
        paymentId: `bank-utr:${utr}`,
        type: "contribution",
        direction: "credit",
        amountPaise: approvedAmountPaise,
        description: `Verified bank contribution ${claim.paymentReference}`,
        status: "posted",
        postedAt: new Date(),
        metadata: { source: "verified_bank_transfer", claimId: claim._id, utr },
        createdBy: req.user._id
      });
      claim.status = "approved";
      claim.approvedAmountPaise = approvedAmountPaise;
      claim.reviewerNote = body.note;
      claim.reviewedBy = req.member._id;
      claim.reviewedAt = new Date();
      claim.ledgerTransactionId = transaction._id;
      await claim.save();
      await writeAuditLog({
        familyId: req.familyId,
        actorUserId: req.user._id,
        actorMemberId: req.member._id,
        action: "treasury.bank_contribution_approved",
        entityType: "BankContributionClaim",
        entityId: String(claim._id),
        summary: `Approved bank contribution ${claim.paymentReference}`,
        after: { amountPaise: approvedAmountPaise, utr, ledgerTransactionId: transaction._id },
        req
      });
      res.json({ data: serializeClaim(claim), message: `Verified. INR ${paiseToRupees(approvedAmountPaise)} is now available in the member wallet.` });
    } catch (error) {
      const postedTransaction = await LedgerTransaction.findOne({ paymentId: `bank-utr:${utr}` });
      if (postedTransaction && String(postedTransaction.metadata?.claimId || "") === String(claim._id)) {
        await BankContributionClaim.updateOne(
          { _id: claim._id },
          {
            $set: {
              status: "approved",
              approvedAmountPaise,
              reviewerNote: body.note,
              reviewedBy: req.member._id,
              reviewedAt: new Date(),
              ledgerTransactionId: postedTransaction._id
            }
          }
        );
        const recoveredClaim = await BankContributionClaim.findById(claim._id);
        res.json({ data: serializeClaim(recoveredClaim), message: `Verified. INR ${paiseToRupees(approvedAmountPaise)} is now available in the member wallet.` });
        return;
      }
      await BankContributionClaim.updateOne({ _id: claim._id, status: "processing" }, { $set: { status: "pending_review" } });
      if (error?.code === 11000) throw httpError(409, "This UTR or contribution has already been credited.", "DUPLICATE_BANK_PAYMENT");
      throw error;
    }
  })
);

bankContributionRoutes.post(
  "/family/:familyId/claims/:claimId/reject",
  requireFamilyPermission(permissions.treasuryViewLedger),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = decisionSchema.parse(req.body);
    if (!body.note.trim()) throw httpError(400, "Give the member a clear rejection reason.", "REJECTION_REASON_REQUIRED");
    const claim = await BankContributionClaim.findOneAndUpdate(
      { _id: req.params.claimId, familyId: req.familyId, status: "pending_review" },
      { $set: { status: "rejected", reviewerNote: body.note, reviewedBy: req.member._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!claim) throw httpError(409, "Claim is not awaiting review.", "BANK_CLAIM_NOT_PENDING");
    res.json({ data: serializeClaim(claim), message: "Claim rejected with a reason. The member can create a fresh claim after correcting it." });
  })
);
