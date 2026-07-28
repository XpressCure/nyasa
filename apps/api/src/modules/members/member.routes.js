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

const optionalNumber = (schema) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

const educationStageSchema = z.object({
  institution: z.string().optional(),
  degree: z.string().optional(),
  year: optionalNumber(z.coerce.number().int().min(1900).max(2100)),
  details: z.string().optional()
});

const workHistorySchema = z.object({
  currentPlace: z.string().optional(),
  currentRole: z.string().optional(),
  previousPlaces: z.string().optional(),
  experienceYears: optionalNumber(z.coerce.number().min(0).max(100)),
  notes: z.string().optional()
});

const healthProfileSchema = z.object({
  bloodGroup: z.string().optional(),
  knownConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  geneticNotes: z.string().optional()
});

const updateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  relationLabel: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  photoUrl: z.string().optional(),
  dateOfBirth: z.string().optional(),
  livingStatus: z.enum(["living", "deceased", "unknown"]).optional(),
  maritalStatus: z.enum(["single", "married", "widowed", "divorced", "separated", "unknown"]).optional(),
  anniversaryDate: z.string().optional(),
  fatherMemberId: z.string().optional(),
  motherMemberId: z.string().optional(),
  spouseMemberId: z.string().optional(),
  grandfatherName: z.string().optional(),
  grandmotherName: z.string().optional(),
  childrenCount: optionalNumber(z.coerce.number().int().min(0)),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  placeOfResidence: z.string().optional(),
  profession: z.string().optional(),
  education: z
    .object({
      intermediate: educationStageSchema.optional(),
      graduation: educationStageSchema.optional(),
      postGraduation: educationStageSchema.optional()
    })
    .optional(),
  work: workHistorySchema.optional(),
  health: healthProfileSchema.optional(),
  bio: z.string().optional()
});

const updateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "project_lead", "member", "viewer", "external_advisor"])
});

const updateStatusSchema = z.object({
  status: z.enum(["active", "inactive", "removed"])
});

function serializeMember(member, { includeSensitive = false } = {}) {
  const data = member?.toObject ? member.toObject() : { ...member };

  if (!includeSensitive) {
    delete data.health;
  }

  return data;
}

function toOptionalDate(value) {
  return value ? new Date(value) : undefined;
}

function toOptionalObjectId(value) {
  return value || undefined;
}

function normalizeProfileUpdate(body) {
  return {
    ...body,
    dateOfBirth: toOptionalDate(body.dateOfBirth),
    anniversaryDate: toOptionalDate(body.anniversaryDate),
    fatherMemberId: toOptionalObjectId(body.fatherMemberId),
    motherMemberId: toOptionalObjectId(body.motherMemberId),
    spouseMemberId: toOptionalObjectId(body.spouseMemberId)
  };
}

function buildTreeLinks(members) {
  const memberIds = new Set(members.map((member) => String(member._id)));
  const links = [];

  members.forEach((member) => {
    [
      ["fatherMemberId", "father"],
      ["motherMemberId", "mother"],
      ["spouseMemberId", "spouse"]
    ].forEach(([field, relationship]) => {
      if (member[field] && memberIds.has(String(member[field]))) {
        links.push({
          fromMemberId: String(member[field]),
          toMemberId: String(member._id),
          relationship
        });
      }
    });
  });

  return links;
}

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

    res.json({ data: members.map((member) => serializeMember(member)) });
  })
);

memberRoutes.get(
  "/family/:familyId/tree",
  requireFamilyPermission(permissions.membersView),
  asyncHandler(async (req, res) => {
    const members = await FamilyMember.find({
      familyId: req.familyId,
      status: { $ne: "removed" }
    }).sort({ displayName: 1 });

    res.json({
      data: {
        members: members.map((member) => serializeMember(member)),
        links: buildTreeLinks(members)
      }
    });
  })
);

memberRoutes.get(
  "/family/:familyId/me",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    res.json({ data: serializeMember(req.member, { includeSensitive: true }) });
  })
);

memberRoutes.patch(
  "/family/:familyId/me",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = normalizeProfileUpdate(updateProfileSchema.parse(req.body));

    const member = await FamilyMember.findByIdAndUpdate(req.member._id, body, {
      new: true
    });

    res.json({ data: serializeMember(member, { includeSensitive: true }) });
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

    res.json({ data: serializeMember(targetMember) });
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

    res.json({ data: serializeMember(targetMember) });
  })
);
