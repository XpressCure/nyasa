import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Family } from "../../models/Family.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { permissions, rolePermissions } from "./permissions.js";

export const permissionRoutes = Router();

permissionRoutes.use(requireAuth);

permissionRoutes.get(
  "/family/:familyId/me",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const family = await Family.findById(req.familyId).select("name slug");

    res.json({
      data: {
        user: {
          id: req.user._id,
          fullName: req.user.fullName,
          email: req.user.email,
          phone: req.user.phone,
          hasPassword: Boolean(req.user.passwordSetAt)
        },
        authLevel: req.auth?.authLevel || "onboarding",
        member: {
          id: req.member._id,
          displayName: req.member.displayName,
          role: req.member.role,
          status: req.member.status
        },
        family,
        role: req.member.role,
        permissions: rolePermissions[req.member.role] || []
      }
    });
  })
);
