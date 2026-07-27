import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    invitedEmail: { type: String, trim: true, lowercase: true },
    invitedPhone: { type: String, trim: true },
    invitedName: { type: String, trim: true },
    intendedRole: {
      type: String,
      enum: ["admin", "project_lead", "member", "viewer", "external_advisor"],
      default: "member"
    },
    tokenHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending"
    },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: Date,
    acceptedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true }
  },
  { timestamps: true }
);

invitationSchema.index({ familyId: 1, status: 1 });
invitationSchema.index({ invitedEmail: 1 });
invitationSchema.index({ invitedPhone: 1 });

export const Invitation = mongoose.model("Invitation", invitationSchema);
