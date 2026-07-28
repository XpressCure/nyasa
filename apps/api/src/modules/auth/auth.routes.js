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
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function prepareLaunchFamily(user) {
  let family = await Family.findOne({ slug: "nyasa-trust-alahdadpur" });
  let isNewFamily = false;

  if (!family) {
    if (!user) {
      return { family: null, isNewFamily };
    }

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

  return { family, isNewFamily };
}

function sortNameMatches(fullName, members) {
  const normalizedName = fullName.trim().toLowerCase();
  return [...members].sort((left, right) => {
    const leftExact = left.displayName.trim().toLowerCase() === normalizedName ? 0 : 1;
    const rightExact = right.displayName.trim().toLowerCase() === normalizedName ? 0 : 1;
    return leftExact - rightExact || left.displayName.localeCompare(right.displayName);
  });
}

async function findProfileMatches(familyId, fullName) {
  const members = await FamilyMember.find({
    familyId,
    displayName: new RegExp(escapeRegex(fullName.trim()), "i"),
    status: { $ne: "removed" }
  }).limit(6);

  return sortNameMatches(fullName, members);
}

async function updateUserLoginFields(user, body) {
  user.fullName = body.fullName;
  user.lastLoginAt = new Date();
  user.status = "active";

  if (body.phone && !user.phone) {
    user.phone = body.phone;
  }

  if (body.email && !user.email) {
    user.email = body.email.toLowerCase();
  }

  await user.save();
  return user;
}

function copyMissingMemberFields(sourceMember, targetMember) {
  [
    "relationLabel",
    "gender",
    "photoUrl",
    "photoDocumentId",
    "dateOfBirth",
    "livingStatus",
    "dateOfDeath",
    "yearOfDeath",
    "maritalStatus",
    "anniversaryDate",
    "fatherMemberId",
    "motherMemberId",
    "spouseMemberId",
    "grandfatherName",
    "grandmotherName",
    "childrenCount",
    "city",
    "state",
    "country",
    "placeOfResidence",
    "profession",
    "education",
    "work",
    "health",
    "bio"
  ].forEach((field) => {
    if (targetMember[field] === undefined || targetMember[field] === "" || targetMember[field] === null) {
      targetMember[field] = sourceMember[field];
    }
  });

  targetMember.childMemberIds = [
    ...new Set([...(targetMember.childMemberIds || []), ...(sourceMember.childMemberIds || [])].filter(Boolean).map(String))
  ];
}

async function findOrCreateLoginUser(body) {
  if (!body.phone && !body.email) {
    return User.create({
      fullName: body.fullName,
      lastLoginAt: new Date(),
      status: "active"
    });
  }

  const loginFilter = body.phone ? { phone: body.phone } : { email: body.email.toLowerCase() };
  const authProvider = body.phone ? "phone_otp" : "email_magic_link";

  return User.findOneAndUpdate(
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
}

async function ensureLaunchFamilyMembership(user, { family, isNewFamily, profileToClaim = null }) {
  const existingMembership = await FamilyMember.findOne({
    userId: user._id,
    status: "active"
  }).populate("familyId");

  if (existingMembership) {
    if (profileToClaim && String(profileToClaim._id) !== String(existingMembership._id)) {
      copyMissingMemberFields(existingMembership, profileToClaim);
      profileToClaim.userId = user._id;
      profileToClaim.status = "active";
      profileToClaim.joinedAt = profileToClaim.joinedAt || existingMembership.joinedAt || new Date();
      await profileToClaim.save();

      if (existingMembership.role !== "owner") {
        await FamilyMember.updateMany({ familyId: family._id, fatherMemberId: existingMembership._id }, { $set: { fatherMemberId: profileToClaim._id } });
        await FamilyMember.updateMany({ familyId: family._id, motherMemberId: existingMembership._id }, { $set: { motherMemberId: profileToClaim._id } });
        await FamilyMember.updateMany({ familyId: family._id, spouseMemberId: existingMembership._id }, { $set: { spouseMemberId: profileToClaim._id } });
        await FamilyMember.updateMany({ familyId: family._id, childMemberIds: existingMembership._id }, { $addToSet: { childMemberIds: profileToClaim._id } });
        await FamilyMember.updateMany({ familyId: family._id, childMemberIds: existingMembership._id }, { $pull: { childMemberIds: existingMembership._id } });

        existingMembership.status = "removed";
        await existingMembership.save();
      }

      return {
        family,
        member: profileToClaim
      };
    }

    return {
      family: existingMembership.familyId,
      member: existingMembership
    };
  }

  const activeOwnerCount = await FamilyMember.countDocuments({
    familyId: family._id,
    role: "owner",
    status: "active"
  });

  if (profileToClaim) {
    profileToClaim.userId = user._id;
    profileToClaim.status = "active";
    profileToClaim.joinedAt = profileToClaim.joinedAt || new Date();
    await profileToClaim.save();

    return { family, member: profileToClaim };
  }

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
    let preparedFamily = await prepareLaunchFamily();
    const profileMatches = preparedFamily.family ? await findProfileMatches(preparedFamily.family._id, body.fullName) : [];
    const unclaimedMatches = profileMatches.filter((member) => !member.userId);
    const claimedMatches = profileMatches.filter((member) => member.userId);
    let user;
    let profileToClaim = null;

    if (!body.phone && !body.email) {
      if (profileMatches.length > 1) {
        throw httpError(
          409,
          "More than one family profile matches this name. Please enter phone number also.",
          "LOGIN_PHONE_REQUIRED"
        );
      }

      if (profileMatches.length === 1) {
        const profile = profileMatches[0];
        const profileBody = { ...body, fullName: profile.displayName };
        user = profile.userId ? await User.findById(profile.userId) : await findOrCreateLoginUser(profileBody);

        if (!user) {
          throw httpError(404, "This profile is linked to a user that could not be found.", "LINKED_USER_NOT_FOUND");
        }

        await updateUserLoginFields(user, profileBody);
        profileToClaim = profile.userId ? null : profile;
      } else {
        throw httpError(
          400,
          "Phone number is needed the first time a new family profile is created.",
          "LOGIN_PHONE_REQUIRED"
        );
      }
    } else {
      const singleUnclaimedMatch = unclaimedMatches.length === 1 ? unclaimedMatches[0] : null;
      const loginBody = singleUnclaimedMatch ? { ...body, fullName: singleUnclaimedMatch.displayName } : body;
      user = await findOrCreateLoginUser(loginBody);
      if (!preparedFamily.family) {
        preparedFamily = await prepareLaunchFamily(user);
      }

      const claimedByLogin = claimedMatches.find((member) => String(member.userId) === String(user._id));
      if (claimedByLogin) {
        profileToClaim = null;
      } else if (unclaimedMatches.length === 1) {
        profileToClaim = unclaimedMatches[0];
      } else if (unclaimedMatches.length > 1) {
        throw httpError(
          409,
          "More than one unclaimed profile matches this name. Please enter the full name as shown in the family tree.",
          "NAME_MATCH_AMBIGUOUS"
        );
      }
    }

    const launchMembership = await ensureLaunchFamilyMembership(user, {
      ...preparedFamily,
      profileToClaim
    });

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
