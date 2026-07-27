import mongoose from "mongoose";

const familySettingsSchema = new mongoose.Schema(
  {
    contributionVisibility: {
      type: String,
      enum: ["admins_only", "members_can_see_totals", "members_can_see_all"],
      default: "members_can_see_totals"
    },
    voteVisibility: {
      type: String,
      enum: ["public_votes", "anonymous_votes", "result_only"],
      default: "public_votes"
    },
    expenseApprovalRequired: { type: Boolean, default: true },
    projectCreationPolicy: {
      type: String,
      enum: ["admin_only", "members_can_request", "members_can_create"],
      default: "members_can_request"
    },
    documentDefaultVisibility: {
      type: String,
      enum: ["admins_only", "members", "custom"],
      default: "admins_only"
    },
    minimumVotingAge: { type: Number, default: 18 },
    defaultProposalQuorumPercent: { type: Number, default: 51 }
  },
  { _id: false }
);

const familySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: String,
    logoUrl: String,
    primaryLocation: String,
    defaultCurrency: { type: String, enum: ["INR"], default: "INR" },
    timezone: { type: String, default: "Asia/Kolkata" },
    language: { type: String, enum: ["en", "hi", "mixed"], default: "en" },
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
    settings: { type: familySettingsSchema, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

familySchema.index({ createdBy: 1 });

export const Family = mongoose.model("Family", familySchema);
