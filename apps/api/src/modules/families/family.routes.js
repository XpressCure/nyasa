import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Family } from "../../models/Family.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";

export const familyRoutes = Router();

const createFamilySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  primaryLocation: z.string().optional()
});

familyRoutes.use(requireAuth);

familyRoutes.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createFamilySchema.parse(req.body);
    const existingFamily = await Family.findOne({ slug: body.slug.toLowerCase() });

    if (existingFamily) {
      throw httpError(409, "A family with this slug already exists. Load and select it instead.", "FAMILY_SLUG_EXISTS");
    }

    const family = await Family.create({
      ...body,
      slug: body.slug.toLowerCase(),
      createdBy: req.user._id
    });

    const member = await FamilyMember.create({
      familyId: family._id,
      userId: req.user._id,
      displayName: req.user.fullName,
      role: "owner",
      status: "active",
      joinedAt: new Date()
    });

    await writeAuditLog({
      familyId: family._id,
      actorUserId: req.user._id,
      actorMemberId: member._id,
      action: "family.created",
      entityType: "Family",
      entityId: String(family._id),
      summary: `Created family workspace ${family.name}`,
      req
    });

    res.status(201).json({ data: { family, member } });
  })
);

familyRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await FamilyMember.find({
      userId: req.user._id,
      status: "active"
    }).populate("familyId");

    res.json({ data: memberships });
  })
);

familyRoutes.get(
  "/:familyId/dashboard",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const [family, memberCount] = await Promise.all([
      Family.findById(req.familyId),
      FamilyMember.countDocuments({ familyId: req.familyId, status: "active" })
    ]);

    res.json({
      data: {
        family,
        metrics: {
          memberCount,
          activeProjects: 0,
          completedProjects: 0,
          treasuryBalance: 0,
          contributionThisYear: 0
        }
      }
    });
  })
);
