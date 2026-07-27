import mongoose from "mongoose";

const ledgerTransactionSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    treasuryAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "TreasuryAccount" },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense" },
    paymentId: String,
    type: {
      type: String,
      enum: ["contribution", "allocation", "expense_debit", "refund", "transfer", "adjustment", "reversal"],
      required: true
    },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    description: String,
    status: { type: String, enum: ["pending", "posted", "failed", "reversed"], default: "posted" },
    referenceTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerTransaction" },
    metadata: mongoose.Schema.Types.Mixed,
    postedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ledgerTransactionSchema.index({ familyId: 1, createdAt: -1 });
ledgerTransactionSchema.index({ familyId: 1, memberId: 1 });
ledgerTransactionSchema.index({ familyId: 1, projectId: 1 });
ledgerTransactionSchema.index({ familyId: 1, walletId: 1 });
ledgerTransactionSchema.index({ familyId: 1, treasuryAccountId: 1 });
ledgerTransactionSchema.index({ familyId: 1, type: 1 });
ledgerTransactionSchema.index({ familyId: 1, status: 1 });

export const LedgerTransaction = mongoose.model("LedgerTransaction", ledgerTransactionSchema);
