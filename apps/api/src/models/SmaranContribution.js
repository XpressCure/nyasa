import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true, min: 0, max: 1 },
    y: { type: Number, required: true, min: 0, max: 1 }
  },
  { _id: false }
);

const strokeSchema = new mongoose.Schema(
  {
    points: { type: [pointSchema], default: [] },
    width: { type: Number, min: 1, max: 24, default: 5 }
  },
  { _id: false }
);

const smaranContributionSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    strokes: { type: [strokeSchema], default: [] },
    savedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

smaranContributionSchema.index({ familyId: 1, memberId: 1, date: 1 }, { unique: true });
smaranContributionSchema.index({ familyId: 1, date: -1 });

export const SmaranContribution = mongoose.model("SmaranContribution", smaranContributionSchema);
