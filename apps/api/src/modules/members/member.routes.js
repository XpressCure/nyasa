import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Document } from "../../models/Document.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { saveDocumentFile } from "../documents/document-storage.service.js";
import { permissions } from "../permissions/permissions.js";

export const memberRoutes = Router();

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const allowedPhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"];

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
  dateOfDeath: z.string().optional(),
  yearOfDeath: optionalNumber(z.coerce.number().int().min(1800).max(2100)),
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

const relativeProfileSchema = updateProfileSchema.extend({
  displayName: z.string().min(2)
});

const immediateFamilySchema = z.object({
  father: relativeProfileSchema.optional(),
  mother: relativeProfileSchema.optional(),
  spouse: relativeProfileSchema.optional(),
  children: z.array(relativeProfileSchema).default([])
});

const photoUploadSchema = z.object({
  originalName: z.string().min(1).max(180),
  mimeType: z.enum(allowedPhotoMimeTypes),
  sizeBytes: z.coerce.number().positive().max(MAX_PHOTO_BYTES),
  dataBase64: z.string().min(1)
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
    dateOfDeath: toOptionalDate(body.dateOfDeath),
    anniversaryDate: toOptionalDate(body.anniversaryDate),
    fatherMemberId: toOptionalObjectId(body.fatherMemberId),
    motherMemberId: toOptionalObjectId(body.motherMemberId),
    spouseMemberId: toOptionalObjectId(body.spouseMemberId)
  };
}

function normalizeRelativeProfile(body) {
  return normalizeProfileUpdate({
    ...body,
    childrenCount: body.childrenCount === "" ? undefined : body.childrenCount
  });
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

    (member.childMemberIds || []).forEach((childMemberId) => {
      if (childMemberId && memberIds.has(String(childMemberId))) {
        links.push({
          fromMemberId: String(member._id),
          toMemberId: String(childMemberId),
          relationship: "child"
        });
      }
    });
  });

  return links;
}

function memberHasHealthSignal(member) {
  return Boolean(
    member.health?.bloodGroup ||
      member.health?.geneticNotes ||
      member.health?.knownConditions?.length ||
      member.health?.allergies?.length
  );
}

function memberHasEducationSignal(member) {
  return Boolean(
    member.education?.intermediate?.institution ||
      member.education?.intermediate?.degree ||
      member.education?.graduation?.institution ||
      member.education?.graduation?.degree ||
      member.education?.postGraduation?.institution ||
      member.education?.postGraduation?.degree
  );
}

function serializeTreeMember(member, mode) {
  const data = serializeMember(member, { includeSensitive: mode === "health" });

  if (mode === "health") {
    data.treeSignal = memberHasHealthSignal(member) ? "health_data_available" : "health_data_pending";
  }

  if (mode === "education") {
    data.treeSignal = memberHasEducationSignal(member) ? "education_data_available" : "education_data_pending";
  }

  return data;
}

async function findExistingRelative({ familyId, displayName, dateOfBirth }) {
  const query = {
    familyId,
    displayName: new RegExp(`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    status: { $ne: "removed" }
  };

  if (dateOfBirth) {
    query.dateOfBirth = dateOfBirth;
  }

  return FamilyMember.findOne(query);
}

async function upsertRelative({ familyId, profile, defaults = {} }) {
  const normalized = normalizeRelativeProfile({ ...profile, ...defaults });
  const existing = await findExistingRelative({
    familyId,
    displayName: normalized.displayName,
    dateOfBirth: normalized.dateOfBirth
  });

  if (existing) {
    Object.entries(normalized).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && existing[key] === undefined) {
        existing[key] = value;
      }
    });
    await existing.save();
    return existing;
  }

  return FamilyMember.create({
    ...normalized,
    familyId,
    role: "member",
    status: "active",
    joinedAt: new Date()
  });
}

function isLinkedImmediateFamily(actorMember, targetMember) {
  const actorId = String(actorMember._id);
  const targetId = String(targetMember._id);

  return (
    String(targetMember.fatherMemberId || "") === actorId ||
    String(targetMember.motherMemberId || "") === actorId ||
    String(targetMember.spouseMemberId || "") === actorId ||
    String(actorMember.fatherMemberId || "") === targetId ||
    String(actorMember.motherMemberId || "") === targetId ||
    String(actorMember.spouseMemberId || "") === targetId ||
    (actorMember.childMemberIds || []).some((childMemberId) => String(childMemberId) === targetId) ||
    (targetMember.childMemberIds || []).some((childMemberId) => String(childMemberId) === actorId)
  );
}

function canEditMemberProfile(actorMember, targetMember) {
  return (
    String(actorMember._id) === String(targetMember._id) ||
    ["owner", "admin"].includes(actorMember.role) ||
    isLinkedImmediateFamily(actorMember, targetMember)
  );
}

function uniqueObjectIdStrings(values) {
  return values
    .filter(Boolean)
    .map((value) => String(value))
    .filter((value, index, allValues) => allValues.indexOf(value) === index);
}

function parentFieldForGender(gender) {
  if (gender === "male") return "fatherMemberId";
  if (gender === "female") return "motherMemberId";
  return "";
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
    const mode = ["general", "education", "health"].includes(req.query.mode) ? req.query.mode : "general";
    const members = await FamilyMember.find({
      familyId: req.familyId,
      status: { $ne: "removed" }
    }).sort({ displayName: 1 });

    res.json({
      data: {
        mode,
        selfMemberId: req.member._id,
        members: members.map((member) => serializeTreeMember(member, mode)),
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

memberRoutes.get(
  "/family/:familyId/immediate-family",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const [father, mother, spouse] = await Promise.all([
      req.member.fatherMemberId ? FamilyMember.findOne({ _id: req.member.fatherMemberId, familyId: req.familyId, status: { $ne: "removed" } }) : null,
      req.member.motherMemberId ? FamilyMember.findOne({ _id: req.member.motherMemberId, familyId: req.familyId, status: { $ne: "removed" } }) : null,
      req.member.spouseMemberId ? FamilyMember.findOne({ _id: req.member.spouseMemberId, familyId: req.familyId, status: { $ne: "removed" } }) : null
    ]);
    const childIdList = uniqueObjectIdStrings([...(req.member.childMemberIds || []), ...(spouse?.childMemberIds || [])]);
    const childQueries = [
      { _id: { $in: childIdList } },
      { fatherMemberId: req.member._id },
      { motherMemberId: req.member._id }
    ];

    if (spouse?._id) {
      childQueries.push({ fatherMemberId: spouse._id }, { motherMemberId: spouse._id });
    }

    const children = await FamilyMember.find({
      familyId: req.familyId,
      status: { $ne: "removed" },
      $or: childQueries
    }).sort({ dateOfBirth: 1, displayName: 1 });

    res.json({
      data: {
        father: father ? serializeMember(father) : null,
        mother: mother ? serializeMember(mother) : null,
        spouse: spouse ? serializeMember(spouse) : null,
        children: children.map((child) => serializeMember(child))
      }
    });
  })
);

memberRoutes.post(
  "/family/:familyId/immediate-family",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = immediateFamilySchema.parse(req.body);
    const created = {};
    const memberUpdates = {};

    if (body.father?.displayName) {
      const father = await upsertRelative({
        familyId: req.familyId,
        profile: body.father,
        defaults: { gender: body.father.gender || "male", relationLabel: "Father" }
      });
      memberUpdates.fatherMemberId = father._id;
      created.father = father;
    }

    if (body.mother?.displayName) {
      const mother = await upsertRelative({
        familyId: req.familyId,
        profile: body.mother,
        defaults: { gender: body.mother.gender || "female", relationLabel: "Mother" }
      });
      memberUpdates.motherMemberId = mother._id;
      created.mother = mother;
    }

    if (body.spouse?.displayName) {
      const spouse = await upsertRelative({
        familyId: req.familyId,
        profile: body.spouse,
        defaults: { relationLabel: "Spouse", maritalStatus: body.spouse.maritalStatus || "married" }
      });
      memberUpdates.spouseMemberId = spouse._id;
      spouse.spouseMemberId = req.member._id;
      if (!spouse.anniversaryDate && req.member.anniversaryDate) {
        spouse.anniversaryDate = req.member.anniversaryDate;
      }
      await spouse.save();
      created.spouse = spouse;
    }

    created.children = [];
    const spouseForChildLinks =
      created.spouse ||
      (req.member.spouseMemberId
        ? await FamilyMember.findOne({ _id: req.member.spouseMemberId, familyId: req.familyId, status: { $ne: "removed" } })
        : null);

    for (const childProfile of body.children) {
      if (!childProfile.displayName) continue;
      const parentLink = {};
      const actorParentField = parentFieldForGender(req.member.gender);
      const spouseParentField = parentFieldForGender(spouseForChildLinks?.gender);

      if (actorParentField) parentLink[actorParentField] = req.member._id;
      if (spouseParentField && spouseParentField !== actorParentField) parentLink[spouseParentField] = spouseForChildLinks._id;

      const child = await upsertRelative({
        familyId: req.familyId,
        profile: childProfile,
        defaults: { relationLabel: childProfile.relationLabel || "Child", ...parentLink }
      });
      created.children.push(child);
    }

    if (Object.keys(memberUpdates).length || created.children.length) {
      const existingChildIds = (req.member.childMemberIds || []).map((childMemberId) => String(childMemberId));
      const nextChildIds = [
        ...existingChildIds,
        ...created.children.map((child) => String(child._id))
      ].filter((childMemberId, index, allChildIds) => allChildIds.indexOf(childMemberId) === index);

      req.member.set({
        ...memberUpdates,
        childMemberIds: nextChildIds,
        childrenCount: nextChildIds.length || req.member.childrenCount
      });
      await req.member.save();

      const spouseToSync =
        created.spouse ||
        (req.member.spouseMemberId
          ? await FamilyMember.findOne({ _id: req.member.spouseMemberId, familyId: req.familyId, status: { $ne: "removed" } })
          : null);

      if (spouseToSync) {
        const spouseChildIds = uniqueObjectIdStrings([...(spouseToSync.childMemberIds || []), ...nextChildIds]);
        spouseToSync.childMemberIds = spouseChildIds;
        spouseToSync.childrenCount = spouseChildIds.length || spouseToSync.childrenCount;
        await spouseToSync.save();

        const spouseParentField = parentFieldForGender(spouseToSync.gender);
        if (spouseParentField) {
          await FamilyMember.updateMany(
            {
              _id: { $in: spouseChildIds },
              familyId: req.familyId,
              [spouseParentField]: { $exists: false }
            },
            { $set: { [spouseParentField]: spouseToSync._id } }
          );
        }
      }
    }

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "member.immediate_family_saved",
      entityType: "FamilyMember",
      entityId: String(req.member._id),
      summary: `Updated immediate family for ${req.member.displayName}`,
      after: {
        fatherMemberId: memberUpdates.fatherMemberId,
        motherMemberId: memberUpdates.motherMemberId,
        spouseMemberId: memberUpdates.spouseMemberId,
        childCount: created.children.length
      },
      req
    });

    res.status(201).json({
      data: {
        member: serializeMember(req.member, { includeSensitive: true }),
        father: created.father ? serializeMember(created.father) : null,
        mother: created.mother ? serializeMember(created.mother) : null,
        spouse: created.spouse ? serializeMember(created.spouse) : null,
        children: created.children.map((child) => serializeMember(child))
      }
    });
  })
);

memberRoutes.post(
  "/family/:familyId/:memberId/photo",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = photoUploadSchema.parse(req.body);
    const targetMember = await FamilyMember.findOne({
      _id: req.params.memberId,
      familyId: req.familyId,
      status: { $ne: "removed" }
    });

    if (!targetMember) {
      throw httpError(404, "Member not found.", "MEMBER_NOT_FOUND");
    }

    const isSelf = String(targetMember._id) === String(req.member._id);

    if (!canEditMemberProfile(req.member, targetMember)) {
      throw httpError(403, "You can upload photos only for yourself or your immediate family.", "PHOTO_UPLOAD_NOT_ALLOWED");
    }

    const fileBuffer = Buffer.from(body.dataBase64, "base64");

    if (fileBuffer.length !== body.sizeBytes || fileBuffer.length > MAX_PHOTO_BYTES) {
      throw httpError(400, "Uploaded photo size is invalid.", "INVALID_UPLOAD_SIZE");
    }

    const storedFile = await saveDocumentFile({
      familyId: req.familyId,
      memberId: targetMember._id,
      originalName: body.originalName,
      mimeType: body.mimeType,
      fileBuffer
    });

    const document = await Document.create({
      familyId: req.familyId,
      memberId: targetMember._id,
      originalName: body.originalName,
      storedName: storedFile.storedName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageDriver: storedFile.storageDriver,
      storagePath: storedFile.storagePath,
      storageKey: storedFile.storageKey,
      bucketName: storedFile.bucketName,
      region: storedFile.region,
      category: "member_photo",
      uploadedBy: req.member._id
    });

    targetMember.photoDocumentId = document._id;
    targetMember.photoUrl = `/api/documents/family/${req.familyId}/${document._id}/member-photo`;
    await targetMember.save();

    res.status(201).json({
      data: {
        member: serializeMember(targetMember, { includeSensitive: isSelf }),
        documentId: document._id,
        photoUrl: targetMember.photoUrl
      }
    });
  })
);

memberRoutes.patch(
  "/family/:familyId/:memberId/profile",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = normalizeProfileUpdate(updateProfileSchema.parse(req.body));
    const targetMember = await FamilyMember.findOne({
      _id: req.params.memberId,
      familyId: req.familyId,
      status: { $ne: "removed" }
    });

    if (!targetMember) {
      throw httpError(404, "Member not found.", "MEMBER_NOT_FOUND");
    }

    if (!canEditMemberProfile(req.member, targetMember)) {
      throw httpError(403, "You can edit only yourself or your immediate family.", "PROFILE_EDIT_NOT_ALLOWED");
    }

    targetMember.set(body);
    await targetMember.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "member.profile_updated",
      entityType: "FamilyMember",
      entityId: String(targetMember._id),
      summary: `Updated profile for ${targetMember.displayName}`,
      after: body,
      req
    });

    res.json({
      data: serializeMember(targetMember, {
        includeSensitive: String(targetMember._id) === String(req.member._id)
      })
    });
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
