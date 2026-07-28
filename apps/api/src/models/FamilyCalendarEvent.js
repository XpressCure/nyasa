import mongoose from "mongoose";

const familyCalendarEventSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    title: { type: String, required: true, trim: true },
    eventType: {
      type: String,
      enum: ["puja", "fast", "gathering", "meeting", "ritual", "other"],
      default: "other",
      index: true
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: Date,
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    createdByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active", index: true }
  },
  { timestamps: true }
);

familyCalendarEventSchema.index({ familyId: 1, startsAt: 1, status: 1 });

export const FamilyCalendarEvent = mongoose.model("FamilyCalendarEvent", familyCalendarEventSchema);
