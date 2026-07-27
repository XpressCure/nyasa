import mongoose from "mongoose";

const projectMemberSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    role: { type: String, enum: ["lead", "member", "advisor", "viewer"], default: "member" },
    status: { type: String, enum: ["active", "removed"], default: "active" },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    addedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

projectMemberSchema.index({ projectId: 1, memberId: 1 }, { unique: true });
projectMemberSchema.index({ familyId: 1, memberId: 1 });
projectMemberSchema.index({ familyId: 1, role: 1 });

export const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);
