import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: String,
    category: {
      type: String,
      enum: ["renovation", "education", "health", "event", "asset_maintenance", "community", "other"],
      default: "other"
    },
    projectType: {
      type: String,
      enum: ["implementation", "research", "business_study", "asset_management", "community", "event", "other"],
      default: "implementation"
    },
    status: {
      type: String,
      enum: ["draft", "proposed", "active", "estimate_received", "fundraising", "implementation", "paused", "completed", "archived"],
      default: "proposed"
    },
    lifecycleStage: {
      type: String,
      enum: ["concept", "research", "estimate_pending", "estimate_received", "fundraising", "ready_for_implementation", "implementation", "completed", "paused", "archived"],
      default: "concept"
    },
    visibility: { type: String, enum: ["family", "admins_only", "custom"], default: "family" },
    rules: { type: String, default: "" },
    budgetRequired: { type: Boolean, default: true },
    tentativeBudgetPaise: { type: Number, default: 0, min: 0 },
    estimatedBudgetPaise: { type: Number, default: 0, min: 0 },
    targetBudgetPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    startDate: Date,
    targetCompletionDate: Date,
    estimateReceivedAt: Date,
    fundraisingStartedAt: Date,
    implementationStartedAt: Date,
    completedAt: Date,
    projectLeadMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    auditorMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    implementationLeadMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    linkedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal" },
    completionPercent: { type: Number, default: 0, min: 0, max: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

projectSchema.index({ familyId: 1, slug: 1 }, { unique: true });
projectSchema.index({ familyId: 1, status: 1 });
projectSchema.index({ familyId: 1, category: 1 });
projectSchema.index({ familyId: 1, projectLeadMemberId: 1 });
projectSchema.index({ title: "text", description: "text" });

export const Project = mongoose.model("Project", projectSchema);
