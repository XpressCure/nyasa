import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { AuditLog } from "../../models/AuditLog.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { permissions } from "../permissions/permissions.js";

export const auditRoutes = Router();

auditRoutes.use(requireAuth);

auditRoutes.get(
  "/family/:familyId",
  requireFamilyPermission(permissions.auditView),
  asyncHandler(async (req, res) => {
    const logs = await AuditLog.find({ familyId: req.familyId }).sort({ createdAt: -1 }).limit(100);
    res.json({ data: logs });
  })
);
