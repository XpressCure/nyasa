import mongoose from "mongoose";

const koshReconciliationSnapshotSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    treasuryAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "TreasuryAccount", required: true },
    actualBankBalancePaise: { type: Number, required: true, min: 0 },
    expectedBankBalancePaise: { type: Number, required: true },
    differencePaise: { type: Number, required: true },
    asOfDate: { type: Date, required: true, index: true },
    note: { type: String, trim: true, maxlength: 1000 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

koshReconciliationSnapshotSchema.index({ familyId: 1, asOfDate: -1 });

export const KoshReconciliationSnapshot = mongoose.model("KoshReconciliationSnapshot", koshReconciliationSnapshotSchema);
