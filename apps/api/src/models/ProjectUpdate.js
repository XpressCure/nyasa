import mongoose from "mongoose";

const projectUpdateSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", index: true },
    updateType: {
      type: String,
      enum: ["note", "research", "estimate", "progress", "risk", "decision", "completion"],
      default: "note"
    },
    title: String,
    body: { type: String, required: true },
    progressPercent: { type: Number, min: 0, max: 100 },
    mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    createdByMember: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

projectUpdateSchema.index({ projectId: 1, createdAt: -1 });

export const ProjectUpdate = mongoose.model("ProjectUpdate", projectUpdateSchema);
