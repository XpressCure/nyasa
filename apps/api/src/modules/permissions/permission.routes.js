import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { permissions, rolePermissions } from "./permissions.js";

export const permissionRoutes = Router();

permissionRoutes.use(requireAuth);

permissionRoutes.get(
  "/family/:familyId/me",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    res.json({
      data: {
        role: req.member.role,
        permissions: rolePermissions[req.member.role] || []
      }
    });
  })
);
