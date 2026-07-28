import mongoose from "mongoose";

const familyHistoryEventSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    title: { type: String, required: true, trim: true },
    eventDate: { type: Date, index: true },
    eventYear: { type: Number, min: 1600, max: 2200, index: true },
    location: { type: String, trim: true },
    category: {
      type: String,
      enum: ["family", "village", "education", "migration", "property", "spiritual", "achievement", "memory", "other"],
      default: "family"
    },
    description: { type: String, trim: true },
    sourceNote: { type: String, trim: true },
    createdByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    status: { type: String, enum: ["active", "hidden"], default: "active", index: true }
  },
  { timestamps: true }
);

familyHistoryEventSchema.index({ familyId: 1, eventYear: 1, eventDate: 1, status: 1 });

export const FamilyHistoryEvent = mongoose.model("FamilyHistoryEvent", familyHistoryEventSchema);
