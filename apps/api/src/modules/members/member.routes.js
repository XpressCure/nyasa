import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { permissions } from "../permissions/permissions.js";

export const memberRoutes = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  profession: z.string().optional(),
  bio: z.string().optional()
});

memberRoutes.use(requireAuth);

memberRoutes.get(
  "/family/:familyId",
  requireFamilyPermission(permissions.membersView),
  asyncHandler(async (req, res) => {
    const members = await FamilyMember.find({
      familyId: req.familyId,
      status: { $ne: "removed" }
    }).sort({ displayName: 1 });

    res.json({ data: members });
  })
);

memberRoutes.patch(
  "/family/:familyId/me",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = updateProfileSchema.parse(req.body);

    const member = await FamilyMember.findByIdAndUpdate(req.member._id, body, {
      new: true
    });

    res.json({ data: member });
  })
);
