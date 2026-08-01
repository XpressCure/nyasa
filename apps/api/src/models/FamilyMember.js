import mongoose from "mongoose";

const educationStageSchema = new mongoose.Schema(
  {
    institution: { type: String, trim: true },
    degree: { type: String, trim: true },
    year: Number,
    details: { type: String, trim: true }
  },
  { _id: false }
);

const workHistorySchema = new mongoose.Schema(
  {
    currentPlace: { type: String, trim: true },
    currentRole: { type: String, trim: true },
    previousPlaces: { type: String, trim: true },
    experienceYears: Number,
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const healthProfileSchema = new mongoose.Schema(
  {
    bloodGroup: { type: String, trim: true },
    knownConditions: [{ type: String, trim: true }],
    allergies: [{ type: String, trim: true }],
    geneticNotes: { type: String, trim: true }
  },
  { _id: false }
);

const familyMemberSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    displayName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["owner", "admin", "kosh_pramukh", "project_lead", "member", "viewer", "external_advisor"],
      default: "member"
    },
    status: {
      type: String,
      enum: ["invited", "active", "inactive", "removed"],
      default: "active"
    },
    relationLabel: String,
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    photoUrl: { type: String, trim: true },
    photoDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    dateOfBirth: Date,
    isMinor: { type: Boolean, default: false },
    livingStatus: { type: String, enum: ["living", "deceased", "unknown"], default: "living" },
    dateOfDeath: Date,
    yearOfDeath: Number,
    maritalStatus: {
      type: String,
      enum: ["single", "married", "widowed", "divorced", "separated", "unknown"],
      default: "unknown"
    },
    anniversaryDate: Date,
    fatherMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", index: true },
    motherMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", index: true },
    spouseMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", index: true },
    childMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }],
    grandfatherName: { type: String, trim: true },
    grandmotherName: { type: String, trim: true },
    childrenCount: Number,
    city: String,
    state: String,
    country: String,
    placeOfResidence: { type: String, trim: true },
    profession: String,
    education: {
      intermediate: educationStageSchema,
      graduation: educationStageSchema,
      postGraduation: educationStageSchema
    },
    work: workHistorySchema,
    health: healthProfileSchema,
    bio: String,
    phoneVisibility: { type: String, enum: ["private", "admins", "members"], default: "private" },
    emailVisibility: { type: String, enum: ["private", "admins", "members"], default: "private" },
    joinedAt: Date,
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }
  },
  { timestamps: true }
);

familyMemberSchema.index({ familyId: 1, userId: 1 });
familyMemberSchema.index({ familyId: 1, role: 1 });
familyMemberSchema.index({ familyId: 1, status: 1 });
familyMemberSchema.index({ familyId: 1, livingStatus: 1 });
familyMemberSchema.index({ displayName: "text", profession: "text", city: "text", placeOfResidence: "text" });

export const FamilyMember = mongoose.model("FamilyMember", familyMemberSchema);
