import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["family_declared", "document_uploaded", "official_portal_checked", "needs_review"], required: true },
    checkedAt: { type: Date, default: Date.now },
    checkedByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    sourceName: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true, maxlength: 1000 }
  },
  { _id: true }
);

const familyAssetSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    assetType: { type: String, enum: ["agricultural_land", "house", "plot", "commercial", "temple", "vehicle", "other"], required: true },
    status: { type: String, enum: ["active", "under_dispute", "leased", "sold", "archived"], default: "active" },
    visibility: { type: String, enum: ["family", "admins_only"], default: "family" },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    tehsil: { type: String, trim: true },
    village: { type: String, trim: true },
    address: { type: String, trim: true },
    surveyNumber: { type: String, trim: true },
    khasraNumber: { type: String, trim: true },
    khataNumber: { type: String, trim: true },
    ulpin: { type: String, trim: true },
    area: { type: String, trim: true },
    recordedOwners: [{ type: String, trim: true }],
    caretaker: { type: String, trim: true },
    officialPortalUrl: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 4000 },
    verificationStatus: { type: String, enum: ["family_declared", "document_uploaded", "official_portal_checked", "needs_review"], default: "family_declared" },
    verificationHistory: { type: [verificationSchema], default: [] },
    createdByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    managerMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }
  },
  { timestamps: true }
);

familyAssetSchema.index({ familyId: 1, status: 1, updatedAt: -1 });
familyAssetSchema.index({ familyId: 1, assetType: 1 });

export const FamilyAsset = mongoose.model("FamilyAsset", familyAssetSchema);
