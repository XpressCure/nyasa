import mongoose from "mongoose";

const evidenceAnalysisSchema = new mongoose.Schema(
  {
    engine: { type: String, default: "rules_v1" },
    ocrStatus: { type: String, enum: ["not_needed", "not_configured", "completed", "failed"], default: "not_needed" },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    extractedAmountPaise: Number,
    extractedPaidAt: Date,
    extractedUtr: String,
    amountMatches: Boolean,
    timeIsPlausible: Boolean,
    paymentLanguageFound: Boolean,
    warnings: [{ type: String, trim: true }]
  },
  { _id: false }
);

const contributionEvidenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["contributor_sms", "bank_sms", "payment_screenshot", "bank_statement"],
      required: true
    },
    smsText: { type: String, trim: true, maxlength: 4000 },
    declaredAmountPaise: Number,
    declaredPaidAt: Date,
    declaredUtr: { type: String, trim: true, uppercase: true },
    proofDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    analysis: evidenceAnalysisSchema,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    submittedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const bankContributionClaimSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    requestedAmountPaise: { type: Number, required: true, min: 1 },
    approvedAmountPaise: Number,
    paymentReference: { type: String, required: true, trim: true, uppercase: true },
    utr: { type: String, trim: true, uppercase: true },
    status: {
      type: String,
      enum: ["awaiting_payment", "pending_review", "approved", "rejected", "cancelled", "processing"],
      default: "awaiting_payment",
      index: true
    },
    evidence: [contributionEvidenceSchema],
    reviewerNote: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    reviewedAt: Date,
    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerTransaction" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

bankContributionClaimSchema.index({ familyId: 1, memberId: 1, createdAt: -1 });
bankContributionClaimSchema.index({ familyId: 1, status: 1, createdAt: -1 });
bankContributionClaimSchema.index({ familyId: 1, paymentReference: 1 }, { unique: true });
bankContributionClaimSchema.index(
  { familyId: 1, utr: 1 },
  { unique: true, partialFilterExpression: { utr: { $type: "string" } } }
);

export const BankContributionClaim = mongoose.model("BankContributionClaim", bankContributionClaimSchema);
