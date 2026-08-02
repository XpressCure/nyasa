import mongoose from "mongoose";

const sankalpProposalSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["renovation", "education", "health", "event", "asset_maintenance", "community", "research", "business_study", "other"],
      default: "other"
    },
    expectedImpact: { type: String, trim: true },
    tentativeBudgetPaise: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["voting", "accepted", "declined", "archived"],
      default: "voting",
      index: true
    },
    votingEndsAt: Date,
    proposedByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

sankalpProposalSchema.index({ familyId: 1, status: 1, createdAt: -1 });
sankalpProposalSchema.index({ title: "text", description: "text", expectedImpact: "text" });

export const SankalpProposal = mongoose.model("SankalpProposal", sankalpProposalSchema);
