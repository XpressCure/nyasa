import mongoose from "mongoose";

const rolePermissionSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
    role: { type: String, required: true },
    permissions: { type: [String], default: [] },
    isSystemDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

rolePermissionSchema.index({ familyId: 1, role: 1 });
rolePermissionSchema.index({ isSystemDefault: 1 });

export const RolePermission = mongoose.model("RolePermission", rolePermissionSchema);
