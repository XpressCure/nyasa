import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    status: { type: String, enum: ["pending", "in_progress", "completed", "blocked"], default: "pending" },
    dueDate: Date,
    budgetPaise: { type: Number, default: 0, min: 0 },
    actualSpendPaise: { type: Number, default: 0, min: 0 },
    completionNote: String,
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

milestoneSchema.index({ projectId: 1, status: 1 });
milestoneSchema.index({ projectId: 1, sortOrder: 1 });

export const Milestone = mongoose.model("Milestone", milestoneSchema);
