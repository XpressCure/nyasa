import mongoose from "mongoose";

const accountDeletionRequestSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["requested", "processing", "completed", "cancelled"],
      default: "requested",
      index: true
    },
    requestedAt: { type: Date, default: Date.now },
    processBy: { type: Date, required: true },
    completedAt: Date
  },
  { timestamps: true }
);

export const AccountDeletionRequest = mongoose.model("AccountDeletionRequest", accountDeletionRequestSchema);
