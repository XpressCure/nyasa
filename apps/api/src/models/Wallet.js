import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    currency: { type: String, enum: ["INR"], default: "INR" },
    status: { type: String, enum: ["active", "frozen", "closed"], default: "active" }
  },
  { timestamps: true }
);

walletSchema.index({ familyId: 1, memberId: 1 }, { unique: true });
walletSchema.index({ familyId: 1, status: 1 });

export const Wallet = mongoose.model("Wallet", walletSchema);
