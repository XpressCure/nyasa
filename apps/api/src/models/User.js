import mongoose from "mongoose";

const authProviderSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["phone_otp", "google", "email_magic_link", "password"],
      required: true
    },
    providerUserId: String,
    verifiedAt: Date
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatarUrl: String,
    authProviders: { type: [authProviderSchema], default: [] },
    passwordHash: { type: String, select: false },
    passwordSetAt: Date,
    authVersion: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
      index: true
    },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User = mongoose.model("User", userSchema);
