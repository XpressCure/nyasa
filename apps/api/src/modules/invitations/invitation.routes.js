import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Family } from "../../models/Family.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { Invitation } from "../../models/Invitation.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions, roleHasPermission } from "../permissions/permissions.js";
import { createInvitationToken, hashInvitationToken } from "./invitation.tokens.js";

export const invitationRoutes = Router();

const createInvitationSchema = z
  .object({
    familyId: z.string().min(1),
    invitedEmail: z.string().email().optional(),
    invitedPhone: z.string().min(6).optional(),
    invitedName: z.string().min(2).optional(),
    intendedRole: z.enum(["admin", "project_lead", "member", "viewer", "external_advisor"]).default("member")
  })
  .refine((value) => value.invitedEmail || value.invitedPhone, {
    message: "Either invitedEmail or invitedPhone is required"
  });

const acceptInvitationSchema = z.object({
  token: z.string().min(20)
});

invitationRoutes.get(
  "/preview/:token",
  asyncHandler(async (req, res) => {
    const invitation = await Invitation.findOne({
      tokenHash: hashInvitationToken(req.params.token),
      status: "pending"
    }).populate("familyId", "name slug logoUrl primaryLocation");

    if (!invitation || invitation.expiresAt < new Date()) {
      throw httpError(404, "Invitation is invalid or expired", "INVITATION_INVALID");
    }

    res.json({
      data: {
        id: invitation._id,
        invitedName: invitation.invitedName,
        invitedEmail: invitation.invitedEmail,
        invitedPhone: invitation.invitedPhone,
        intendedRole: invitation.intendedRole,
        expiresAt: invitation.expiresAt,
        family: invitation.familyId
      }
    });
  })
);

invitationRoutes.use(requireAuth);

invitationRoutes.post(
  "/",
  requireFamilyPermission(permissions.membersInvite),
  asyncHandler(async (req, res) => {
    const body = createInvitationSchema.parse(req.body);
    const token = createInvitationToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const invitation = await Invitation.create({
      familyId: body.familyId,
      invitedEmail: body.invitedEmail?.toLowerCase(),
      invitedPhone: body.invitedPhone,
      invitedName: body.invitedName,
      intendedRole: body.intendedRole,
      tokenHash: hashInvitationToken(token),
      expiresAt,
      invitedBy: req.member._id
    });

    await writeAuditLog({
      familyId: body.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "invitation.created",
      entityType: "Invitation",
      entityId: String(invitation._id),
      summary: `Created invitation for ${body.invitedName || body.invitedEmail || body.invitedPhone}`,
      after: {
        intendedRole: invitation.intendedRole,
        invitedEmail: invitation.invitedEmail,
        invitedPhone: invitation.invitedPhone,
        expiresAt: invitation.expiresAt
      },
      req
    });

    res.status(201).json({
      data: {
        invitation,
        inviteUrl: `/invite/${token}`,
        token
      }
    });
  })
);

invitationRoutes.get(
  "/family/:familyId",
  requireFamilyPermission(permissions.membersInvite),
  asyncHandler(async (req, res) => {
    const invitations = await Invitation.find({ familyId: req.familyId }).sort({ createdAt: -1 }).limit(100);
    res.json({ data: invitations });
  })
);

invitationRoutes.post(
  "/accept",
  asyncHandler(async (req, res) => {
    const body = acceptInvitationSchema.parse(req.body);
    const invitation = await Invitation.findOne({
      tokenHash: hashInvitationToken(body.token),
      status: "pending"
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      throw httpError(404, "Invitation is invalid or expired", "INVITATION_INVALID");
    }

    const existingMember = await FamilyMember.findOne({
      familyId: invitation.familyId,
      userId: req.user._id,
      status: { $ne: "removed" }
    });

    if (existingMember) {
      throw httpError(409, "You are already a member of this family", "ALREADY_MEMBER");
    }

    const member = await FamilyMember.create({
      familyId: invitation.familyId,
      userId: req.user._id,
      displayName: req.user.fullName || invitation.invitedName,
      role: invitation.intendedRole,
      status: "active",
      joinedAt: new Date(),
      invitedBy: invitation.invitedBy
    });

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    invitation.acceptedByUserId = req.user._id;
    await invitation.save();

    await writeAuditLog({
      familyId: invitation.familyId,
      actorUserId: req.user._id,
      actorMemberId: member._id,
      action: "invitation.accepted",
      entityType: "Invitation",
      entityId: String(invitation._id),
      summary: `${member.displayName} accepted a family invitation`,
      after: {
        memberId: member._id,
        role: member.role
      },
      req
    });

    const family = await Family.findById(invitation.familyId);
    res.json({ data: { family, member } });
  })
);

invitationRoutes.post(
  "/:invitationId/revoke",
  asyncHandler(async (req, res) => {
    const invitation = await Invitation.findById(req.params.invitationId);
    if (!invitation) {
      throw httpError(404, "Invitation not found", "INVITATION_NOT_FOUND");
    }

    const member = await FamilyMember.findOne({
      familyId: invitation.familyId,
      userId: req.user._id,
      status: "active"
    });

    if (!member || !roleHasPermission(member.role, permissions.membersInvite)) {
      throw httpError(403, "You do not have permission to revoke this invitation", "PERMISSION_DENIED");
    }

    invitation.status = "revoked";
    await invitation.save();

    await writeAuditLog({
      familyId: invitation.familyId,
      actorUserId: req.user._id,
      actorMemberId: member._id,
      action: "invitation.revoked",
      entityType: "Invitation",
      entityId: String(invitation._id),
      summary: `Revoked invitation for ${invitation.invitedName || invitation.invitedEmail || invitation.invitedPhone}`,
      req
    });

    res.json({ data: invitation });
  })
);
