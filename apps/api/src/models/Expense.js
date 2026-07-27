import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    category: {
      type: String,
      enum: ["material", "labor", "travel", "professional_fee", "maintenance", "document", "other"],
      default: "other"
    },
    vendorName: { type: String, trim: true },
    expenseDate: { type: Date, required: true },
    description: String,
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "reversed"],
      default: "submitted"
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    submittedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    rejectedAt: Date,
    rejectionReason: String,
    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerTransaction" },
    billDocumentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }]
  },
  { timestamps: true }
);

expenseSchema.index({ familyId: 1, projectId: 1, status: 1 });
expenseSchema.index({ familyId: 1, projectId: 1, expenseDate: -1 });
expenseSchema.index({ familyId: 1, submittedBy: 1 });
expenseSchema.index({ familyId: 1, status: 1 });

export const Expense = mongoose.model("Expense", expenseSchema);
