import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { Family } from "../../models/Family.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { User } from "../../models/User.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";

export const authRoutes = Router();

const devLoginSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional()
}).refine((value) => value.email || value.phone, {
  message: "Email or phone is required"
});

async function ensureLaunchFamilyMembership(user) {
  const existingMembership = await FamilyMember.findOne({
    userId: user._id,
    status: "active"
  }).populate("familyId");

  if (existingMembership) {
    return {
      family: existingMembership.familyId,
      member: existingMembership
    };
  }

  let family = await Family.findOne({ slug: "nyasa-trust-alahdadpur" });
  let isNewFamily = false;

  if (!family) {
    try {
      family = await Family.create({
        name: "Nyasa Trust - Alahdadpur",
        slug: "nyasa-trust-alahdadpur",
        description: "Family trust workspace rooted in Alahdadpur.",
        primaryLocation: "Alahdadpur",
        language: "mixed",
        createdBy: user._id
      });
      isNewFamily = true;
    } catch (_error) {
      family = await Family.findOne({ slug: "nyasa-trust-alahdadpur" });
    }
  }

  if (!family) {
    throw httpError(500, "Could not prepare the Alahdadpur family workspace.", "LAUNCH_FAMILY_REQUIRED");
  }

  const activeOwnerCount = await FamilyMember.countDocuments({
    familyId: family._id,
    role: "owner",
    status: "active"
  });

  const member = await FamilyMember.findOneAndUpdate(
    { familyId: family._id, userId: user._id },
    {
      $setOnInsert: {
        displayName: user.fullName,
        role: isNewFamily || activeOwnerCount === 0 ? "owner" : "member",
        status: "active",
        joinedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  return { family, member };
}

authRoutes.post(
  "/dev-login",
  asyncHandler(async (req, res) => {
    const body = devLoginSchema.parse(req.body);
    const loginFilter = body.phone ? { phone: body.phone } : { email: body.email.toLowerCase() };
    const authProvider = body.phone ? "phone_otp" : "email_magic_link";

    const user = await User.findOneAndUpdate(
      loginFilter,
      {
        $setOnInsert: {
          ...(body.email ? { email: body.email.toLowerCase() } : {}),
          ...(body.phone ? { phone: body.phone } : {}),
          authProviders: [{ provider: authProvider, verifiedAt: new Date() }]
        },
        $set: {
          fullName: body.fullName,
          lastLoginAt: new Date(),
          status: "active"
        }
      },
      { upsert: true, new: true }
    );

    const launchMembership = await ensureLaunchFamilyMembership(user);

    await writeAuditLog({
      familyId: launchMembership.family._id,
      actorUserId: user._id,
      actorMemberId: launchMembership.member._id,
      action: "auth.dev_login",
      entityType: "User",
      entityId: String(user._id),
      summary: `${user.fullName} signed in with development login`,
      req
    });

    const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone
        },
        family: launchMembership.family,
        member: launchMembership.member
      }
    });
  })
);
