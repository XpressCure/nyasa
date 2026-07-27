import mongoose from "mongoose";

const treasuryAccountSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["main", "emergency", "scholarship", "project_specific", "other"],
      default: "main"
    },
    currency: { type: String, enum: ["INR"], default: "INR" },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    openingBalancePaise: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

treasuryAccountSchema.index({ familyId: 1, type: 1 });
treasuryAccountSchema.index({ familyId: 1, status: 1 });

export const TreasuryAccount = mongoose.model("TreasuryAccount", treasuryAccountSchema);
