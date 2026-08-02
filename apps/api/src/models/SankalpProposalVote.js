import mongoose from "mongoose";

const sankalpProposalVoteSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "SankalpProposal", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    vote: { type: String, enum: ["up", "down"], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

sankalpProposalVoteSchema.index({ proposalId: 1, memberId: 1 }, { unique: true });
sankalpProposalVoteSchema.index({ familyId: 1, proposalId: 1, vote: 1 });

export const SankalpProposalVote = mongoose.model("SankalpProposalVote", sankalpProposalVoteSchema);
