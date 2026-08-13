import mongoose from "mongoose";

const passwordRecoveryGrantSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    codeHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

passwordRecoveryGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordRecoveryGrant = mongoose.model("PasswordRecoveryGrant", passwordRecoveryGrantSchema);
