import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: String,
    summary: { type: String, required: true },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    reason: String,
    ipAddress: String,
    userAgent: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ familyId: 1, createdAt: -1 });
auditLogSchema.index({ familyId: 1, actorMemberId: 1 });
auditLogSchema.index({ familyId: 1, entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
