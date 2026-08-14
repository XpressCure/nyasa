import mongoose from "mongoose";

const financialAccountSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    nickname: { type: String, required: true, trim: true, maxlength: 100 },
    institutionName: { type: String, required: true, trim: true, maxlength: 140 },
    accountType: { type: String, enum: ["savings", "current", "fixed_deposit", "loan", "investment", "insurance", "pension", "other"], required: true },
    maskedNumber: { type: String, trim: true, maxlength: 12 },
    source: { type: String, enum: ["manual", "account_aggregator"], default: "manual" },
    connectionStatus: { type: String, enum: ["manual", "pending_consent", "connected", "consent_expired", "disconnected"], default: "manual" },
    balancePaise: { type: Number, min: 0 },
    balanceAsOf: Date,
    sharingScope: { type: String, enum: ["only_me", "selected_members", "family_summary"], default: "only_me" },
    sharedWithMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }],
    consentExpiresAt: Date,
    providerName: { type: String, trim: true },
    providerReference: { type: String, trim: true, select: false },
    notes: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["active", "archived"], default: "active" }
  },
  { timestamps: true }
);

financialAccountSchema.index({ familyId: 1, ownerUserId: 1, status: 1 });

export const FinancialAccount = mongoose.model("FinancialAccount", financialAccountSchema);
