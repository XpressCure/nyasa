import mongoose from "mongoose";

const hostedContributionSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", index: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerTransaction" },
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },
    providerEventId: { type: String, unique: true, sparse: true },
    providerPaymentId: { type: String, required: true, unique: true },
    providerOrderId: String,
    paymentPageId: { type: String, required: true },
    donorName: { type: String, trim: true },
    donorPhone: { type: String, trim: true },
    normalizedPhone: { type: String, trim: true, index: true },
    donorEmail: { type: String, trim: true, lowercase: true },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    status: {
      type: String,
      enum: ["pending", "credited"],
      default: "pending",
      index: true
    },
    matchReason: {
      type: String,
      enum: ["phone_match", "phone_not_found", "phone_ambiguous", "phone_missing", "amount_below_minimum", "manual_link"],
      required: true
    },
    rawProviderResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    creditedAt: Date,
    linkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

hostedContributionSchema.index({ familyId: 1, status: 1, createdAt: -1 });
hostedContributionSchema.index({ familyId: 1, normalizedPhone: 1, status: 1 });

export const HostedContribution = mongoose.model("HostedContribution", hostedContributionSchema);
