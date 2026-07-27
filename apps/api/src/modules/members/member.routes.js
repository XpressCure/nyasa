import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
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

const updateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "project_lead", "member", "viewer", "external_advisor"])
});

const updateStatusSchema = z.object({
  status: z.enum(["active", "inactive", "removed"])
});

async function assertCanChangeMember({ actorMember, targetMember, nextRole, nextStatus }) {
  if (String(actorMember._id) === String(targetMember._id) && nextStatus && nextStatus !== "active") {
    throw httpError(400, "You cannot deactivate or remove yourself.", "CANNOT_REMOVE_SELF");
  }

  if (actorMember.role !== "owner" && targetMember.role === "owner") {
    throw httpError(403, "Only an owner can manage another owner.", "OWNER_REQUIRED");
  }

  if (actorMember.role !== "owner" && nextRole === "owner") {
    throw httpError(403, "Only an owner can assign the owner role.", "OWNER_REQUIRED");
  }

  const activeOwnerCount = await FamilyMember.countDocuments({
    familyId: targetMember.familyId,
    role: "owner",
    status: "active"
  });

  const wouldDemoteOwner = targetMember.role === "owner" && nextRole && nextRole !== "owner";
  const wouldDeactivateOwner = targetMember.role === "owner" && nextStatus && nextStatus !== "active";

  if (activeOwnerCount <= 1 && (wouldDemoteOwner || wouldDeactivateOwner)) {
    throw httpError(400, "A family must always have at least one active owner.", "LAST_OWNER_REQUIRED");
  }
}

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

memberRoutes.patch(
  "/family/:familyId/:memberId/role",
  requireFamilyPermission(permissions.membersManage),
  asyncHandler(async (req, res) => {
    const body = updateRoleSchema.parse(req.body);
    const targetMember = await FamilyMember.findOne({
      _id: req.params.memberId,
      familyId: req.familyId,
      status: { $ne: "removed" }
    });

    if (!targetMember) {
      throw httpError(404, "Member not found.", "MEMBER_NOT_FOUND");
    }

    await assertCanChangeMember({ actorMember: req.member, targetMember, nextRole: body.role });

    const previousRole = targetMember.role;
    targetMember.role = body.role;
    await targetMember.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "member.role_changed",
      entityType: "FamilyMember",
      entityId: String(targetMember._id),
      summary: `Changed ${targetMember.displayName}'s role from ${previousRole} to ${targetMember.role}`,
      before: { role: previousRole },
      after: { role: targetMember.role },
      req
    });

    res.json({ data: targetMember });
  })
);

memberRoutes.patch(
  "/family/:familyId/:memberId/status",
  requireFamilyPermission(permissions.membersManage),
  asyncHandler(async (req, res) => {
    const body = updateStatusSchema.parse(req.body);
    const targetMember = await FamilyMember.findOne({
      _id: req.params.memberId,
      familyId: req.familyId,
      status: { $ne: "removed" }
    });

    if (!targetMember) {
      throw httpError(404, "Member not found.", "MEMBER_NOT_FOUND");
    }

    await assertCanChangeMember({ actorMember: req.member, targetMember, nextStatus: body.status });

    const previousStatus = targetMember.status;
    targetMember.status = body.status;
    await targetMember.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "member.status_changed",
      entityType: "FamilyMember",
      entityId: String(targetMember._id),
      summary: `Changed ${targetMember.displayName}'s status from ${previousStatus} to ${targetMember.status}`,
      before: { status: previousStatus },
      after: { status: targetMember.status },
      req
    });

    res.json({ data: targetMember });
  })
);
