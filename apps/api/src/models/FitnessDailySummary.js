import mongoose from "mongoose";

const fitnessDailySummarySchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    steps: { type: Number, min: 0, default: 0 },
    activeMinutes: { type: Number, min: 0, default: 0 },
    distanceMetres: { type: Number, min: 0, default: 0 },
    source: { type: String, enum: ["health_connect", "manual"], default: "health_connect" },
    syncedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

fitnessDailySummarySchema.index({ familyId: 1, memberId: 1, date: 1 }, { unique: true });

export const FitnessDailySummary = mongoose.model("FitnessDailySummary", fitnessDailySummarySchema);
