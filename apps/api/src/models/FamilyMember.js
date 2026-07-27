import mongoose from "mongoose";

const familyMemberSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    displayName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["owner", "admin", "project_lead", "member", "viewer", "external_advisor"],
      default: "member"
    },
    status: {
      type: String,
      enum: ["invited", "active", "inactive", "removed"],
      default: "active"
    },
    relationLabel: String,
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    dateOfBirth: Date,
    isMinor: { type: Boolean, default: false },
    livingStatus: { type: String, enum: ["living", "deceased", "unknown"], default: "living" },
    city: String,
    state: String,
    country: String,
    profession: String,
    bio: String,
    phoneVisibility: { type: String, enum: ["private", "admins", "members"], default: "private" },
    emailVisibility: { type: String, enum: ["private", "admins", "members"], default: "private" },
    joinedAt: Date,
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }
  },
  { timestamps: true }
);

familyMemberSchema.index({ familyId: 1, userId: 1 });
familyMemberSchema.index({ familyId: 1, role: 1 });
familyMemberSchema.index({ familyId: 1, status: 1 });
familyMemberSchema.index({ displayName: "text", profession: "text", city: "text" });

export const FamilyMember = mongoose.model("FamilyMember", familyMemberSchema);
