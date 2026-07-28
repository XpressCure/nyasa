import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", index: true },
    originalName: { type: String, required: true, trim: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    storageDriver: { type: String, enum: ["local", "s3"], default: "local" },
    storagePath: String,
    storageKey: String,
    bucketName: String,
    region: String,
    category: {
      type: String,
      enum: ["expense_bill", "member_photo", "project_photo", "project_document", "other"],
      default: "other"
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    status: { type: String, enum: ["active", "deleted"], default: "active" }
  },
  { timestamps: true }
);

documentSchema.index({ familyId: 1, expenseId: 1 });
documentSchema.index({ familyId: 1, projectId: 1 });
documentSchema.index({ familyId: 1, memberId: 1 });
documentSchema.index({ familyId: 1, uploadedBy: 1 });
documentSchema.index({ familyId: 1, category: 1 });

export const Document = mongoose.model("Document", documentSchema);
