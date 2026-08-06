import mongoose from "mongoose";

const bankSmsReceiptSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    messageId: { type: String, required: true, trim: true },
    sender: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    receivedAt: { type: Date, required: true },
    status: { type: String, enum: ["matched", "unmatched", "ignored"], required: true, index: true },
    matchedClaimId: { type: mongoose.Schema.Types.ObjectId, ref: "BankContributionClaim" },
    extractedUtr: String,
    extractedAmountPaise: Number,
    matchReason: String
  },
  { timestamps: true }
);

bankSmsReceiptSchema.index({ familyId: 1, receivedAt: -1 });
bankSmsReceiptSchema.index({ familyId: 1, status: 1, receivedAt: -1 });
bankSmsReceiptSchema.index({ familyId: 1, messageId: 1 }, { unique: true });

export const BankSmsReceipt = mongoose.model("BankSmsReceipt", bankSmsReceiptSchema);
