import mongoose from "mongoose";

const fitnessPreferenceSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    dailyStepGoal: { type: Number, min: 1000, max: 50000, default: 6000 },
    shareWithFamily: { type: Boolean, default: false },
    connectedToHealthConnect: { type: Boolean, default: false },
    consentUpdatedAt: Date
  },
  { timestamps: true }
);

fitnessPreferenceSchema.index({ familyId: 1, memberId: 1 }, { unique: true });

export const FitnessPreference = mongoose.model("FitnessPreference", fitnessPreferenceSchema);
