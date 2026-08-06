import mongoose from "mongoose";

const paymentOrderSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    provider: { type: String, enum: ["razorpay", "cashfree"], default: "razorpay" },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String, unique: true, sparse: true },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    description: String,
    status: { type: String, enum: ["created", "processing", "paid", "failed", "cancelled"], default: "created" },
    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerTransaction" },
    rawProviderResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

paymentOrderSchema.index({ familyId: 1, memberId: 1, createdAt: -1 });
paymentOrderSchema.index({ familyId: 1, status: 1 });

export const PaymentOrder = mongoose.model("PaymentOrder", paymentOrderSchema);
