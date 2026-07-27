import mongoose from "mongoose";

const projectUpdateSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: String,
    body: { type: String, required: true },
    mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

projectUpdateSchema.index({ projectId: 1, createdAt: -1 });

export const ProjectUpdate = mongoose.model("ProjectUpdate", projectUpdateSchema);
