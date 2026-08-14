import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    url: { type: String, trim: true },
    caption: { type: String, trim: true, maxlength: 300 }
  },
  { _id: true }
);

const familyMomentSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    story: { type: String, trim: true, maxlength: 5000 },
    eventDate: { type: Date, required: true, index: true },
    location: { type: String, trim: true },
    category: { type: String, enum: ["celebration", "festival", "wedding", "village_visit", "milestone", "memorial", "everyday", "other"], default: "everyday" },
    visibility: { type: String, enum: ["family", "selected_members", "private"], default: "family" },
    selectedMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }],
    taggedMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }],
    photos: { type: [photoSchema], default: [] },
    createdByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    status: { type: String, enum: ["active", "archived"], default: "active" }
  },
  { timestamps: true }
);

familyMomentSchema.index({ familyId: 1, status: 1, eventDate: -1 });
familyMomentSchema.index({ familyId: 1, createdByMemberId: 1 });

export const FamilyMoment = mongoose.model("FamilyMoment", familyMomentSchema);
