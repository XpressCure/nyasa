import mongoose from "mongoose";

const weeklyFeatureSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    title: { type: String, required: true, trim: true },
    featureType: { type: String, enum: ["read", "video"], default: "read", index: true },
    url: { type: String, trim: true },
    summary: { type: String, trim: true },
    weekStartsAt: { type: Date, required: true, index: true },
    suggestedByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    status: { type: String, enum: ["active", "archived"], default: "active", index: true }
  },
  { timestamps: true }
);

weeklyFeatureSchema.index({ familyId: 1, weekStartsAt: -1, status: 1 });

export const WeeklyFeature = mongoose.model("WeeklyFeature", weeklyFeatureSchema);
