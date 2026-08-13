import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePasswordAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Family } from "../../models/Family.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { User } from "../../models/User.js";
import { PasswordRecoveryGrant } from "../../models/PasswordRecoveryGrant.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { clearFailedLogins, getLoginLock, recordFailedLogin } from "./login-attempts.service.js";
import { hashPassword, validatePassword, verifyPassword } from "./password.service.js";
import { permissions } from "../permissions/permissions.js";

export const authRoutes = Router();

const devLoginSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  password: z.string().max(128).optional(),
  confirmPassword: z.string().max(128).optional()
});

const passwordSetupSchema = z.object({
  password: z.string(),
  confirmPassword: z.string()
});

const passwordChangeSchema = z.object({
  currentPassword: z.string(),
  password: z.string(),
  confirmPassword: z.string()
});

const passwordRecoveryGrantSchema = z.object({ memberId: z.string().min(1) });
const passwordRecoverySchema = z.object({
  fullName: z.string().min(2),
  recoveryCode: z.string().min(8).max(20),
  password: z.string(),
  confirmPassword: z.string()
});

function normalizeRecoveryCode(value = "") {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashRecoveryCode(value) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(normalizeRecoveryCode(value)).digest("hex");
}

function createRecoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const characters = Array.from({ length: 8 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  return `NYAS-${characters.slice(0, 4)}-${characters.slice(4)}`;
}

function createToken(user, authLevel) {
  return jwt.sign(
    { sub: String(user._id), authLevel, authVersion: user.authVersion || 0 },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function validateNewPassword(body) {
  if (body.password !== body.confirmPassword) {
    throw httpError(400, "Passwords do not match.", "PASSWORDS_DO_NOT_MATCH");
  }
  const validationError = validatePassword(body.password);
  if (validationError) throw httpError(400, validationError, "PASSWORD_TOO_WEAK");
}

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

function normalizeNameForMatch(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameSimilarity(left = "", right = "") {
  const source = normalizeNameForMatch(left);
  const target = normalizeNameForMatch(right);
  if (!source || !target) return 0;
  if (source === target) return 1;
  if (source.includes(target) || target.includes(source)) return 0.9;

  const distances = Array.from({ length: source.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= target.length; column += 1) {
    distances[0][column] = column;
  }

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      const cost = source[row - 1] === target[column - 1] ? 0 : 1;
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + cost
      );
    }
  }

  return 1 - distances[source.length][target.length] / Math.max(source.length, target.length);
}

function hasFamilyRelationships(member) {
  return Boolean(
    member?.fatherMemberId || member?.motherMemberId || member?.spouseMemberId || member?.childMemberIds?.length
  );
}

async function findProfileMatches(familyId, fullName) {
  const nameParts = fullName.trim().split(/\s+/).filter((part) => part.length >= 3);
  const searchTerms = nameParts.length ? nameParts : [fullName.trim()];
  const queryRegexes = searchTerms.map((term) => new RegExp(escapeRegex(term), "i"));
  const members = await FamilyMember.find({
    familyId,
    $or: queryRegexes.map((regex) => ({ displayName: regex })),
    status: { $ne: "removed" }
  }).limit(40);

  const closeMatches = members.filter((member) => nameSimilarity(fullName, member.displayName) >= 0.72);
  return sortNameMatches(fullName, closeMatches).slice(0, 6);
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

async function rewireMemberReferences({ familyId, fromMemberId, toMemberId }) {
  await FamilyMember.updateMany({ familyId, fatherMemberId: fromMemberId }, { $set: { fatherMemberId: toMemberId } });
  await FamilyMember.updateMany({ familyId, motherMemberId: fromMemberId }, { $set: { motherMemberId: toMemberId } });
  await FamilyMember.updateMany({ familyId, spouseMemberId: fromMemberId }, { $set: { spouseMemberId: toMemberId } });
  await FamilyMember.updateMany({ familyId, childMemberIds: fromMemberId }, { $addToSet: { childMemberIds: toMemberId } });
  await FamilyMember.updateMany({ familyId, childMemberIds: fromMemberId }, { $pull: { childMemberIds: fromMemberId } });
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

  const existingUser = await User.findOne(loginFilter);
  if (existingUser) return existingUser;

  return User.create({
    fullName: body.fullName,
    ...(body.email ? { email: body.email.toLowerCase() } : {}),
    ...(body.phone ? { phone: body.phone } : {}),
    authProviders: [{ provider: authProvider, verifiedAt: new Date() }],
    lastLoginAt: new Date(),
    status: "active"
  });
}

async function ensureLaunchFamilyMembership(user, { family, isNewFamily, profileToClaim = null }) {
  const existingMembership = await FamilyMember.findOne({
    userId: user._id,
    status: "active"
  }).populate("familyId");

  if (existingMembership) {
    if (profileToClaim && String(profileToClaim._id) !== String(existingMembership._id)) {
      const keepExistingMembership = ["owner", "admin"].includes(existingMembership.role);
      const keeper = keepExistingMembership ? existingMembership : profileToClaim;
      const duplicate = keepExistingMembership ? profileToClaim : existingMembership;

      copyMissingMemberFields(duplicate, keeper);
      keeper.userId = user._id;
      keeper.status = "active";
      keeper.joinedAt = keeper.joinedAt || duplicate.joinedAt || new Date();
      await keeper.save();

      await rewireMemberReferences({
        familyId: family._id,
        fromMemberId: duplicate._id,
        toMemberId: keeper._id
      });

      duplicate.status = "removed";
      duplicate.userId = undefined;
      await duplicate.save();

      return {
        family,
        member: keeper
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
  ["/login", "/dev-login"],
  asyncHandler(async (req, res) => {
    const body = devLoginSchema.parse(req.body);
    let preparedFamily = await prepareLaunchFamily();
    const profileMatches = preparedFamily.family ? await findProfileMatches(preparedFamily.family._id, body.fullName) : [];
    const unclaimedMatches = profileMatches.filter((member) => !member.userId);
    const claimedMatches = profileMatches.filter((member) => member.userId);
    let user;
    let profileToClaim = null;
    let orphanPhoneUserToDetach = null;
    let effectiveLoginBody = body;

    if (!body.phone && !body.email) {
      if (profileMatches.length > 1) {
        throw httpError(
          409,
          "More than one family profile matches this name. Please enter phone number also.",
          "NAME_MATCH_AMBIGUOUS"
        );
      }

      if (profileMatches.length === 1) {
        const profile = profileMatches[0];
        if (!profile.userId) {
          throw httpError(
            409,
            "We found your profile in the Kul Map. Add your mobile number and create your own password to claim it.",
            "PROFILE_CLAIM_REQUIRED"
          );
        }

        const profileBody = { ...body, fullName: profile.displayName };
        effectiveLoginBody = profileBody;
        user = await User.findById(profile.userId);

        if (!user) {
          throw httpError(404, "This profile is linked to a user that could not be found.", "LINKED_USER_NOT_FOUND");
        }
      } else {
        throw httpError(
          409,
          "No existing Kul profile matches this name. Add your mobile number and create a password to join Nyas.",
          "NEW_ACCOUNT_REQUIRED"
        );
      }
    } else {
      const phoneUser = body.phone
        ? await User.findOne({ phone: body.phone, status: "active" }).select("+passwordHash")
        : null;
      const phoneMembership = phoneUser && preparedFamily.family
        ? await FamilyMember.findOne({
            familyId: preparedFamily.family._id,
            userId: phoneUser._id,
            status: "active"
          })
        : null;

      if (phoneUser && phoneMembership) {
        if (nameSimilarity(body.fullName, phoneMembership.displayName) < 0.55) {
          throw httpError(401, "The name does not match the account registered with this mobile number.", "INVALID_CREDENTIALS");
        }
        user = phoneUser;
        effectiveLoginBody = { ...body, fullName: phoneMembership.displayName };
        const canonicalCandidates = profileMatches.filter(
          (member) =>
            String(member._id) !== String(phoneMembership._id) &&
            normalizeNameForMatch(member.displayName) === normalizeNameForMatch(phoneMembership.displayName) &&
            hasFamilyRelationships(member)
        );
        if (!hasFamilyRelationships(phoneMembership) && canonicalCandidates.length === 1) {
          profileToClaim = canonicalCandidates[0];
        }
      } else {
        const singleUnclaimedMatch = unclaimedMatches.length === 1 ? unclaimedMatches[0] : null;
        const singleClaimedMatch = claimedMatches.length === 1 ? claimedMatches[0] : null;
        const matchedProfile = singleClaimedMatch || singleUnclaimedMatch;
        const loginBody = matchedProfile ? { ...body, fullName: matchedProfile.displayName } : body;
        effectiveLoginBody = loginBody;
        user = singleClaimedMatch?.userId
          ? await User.findById(singleClaimedMatch.userId).select("+passwordHash")
          : await findOrCreateLoginUser(loginBody);

        if (!user) {
          throw httpError(404, "This profile is linked to a user that could not be found.", "LINKED_USER_NOT_FOUND");
        }

        if (singleClaimedMatch && body.phone && user.phone && user.phone !== body.phone) {
          throw httpError(401, "The mobile number does not match this account.", "INVALID_CREDENTIALS");
        }

        if (phoneUser && singleClaimedMatch && String(phoneUser._id) !== String(user._id)) {
          const phoneUserHasMembership = await FamilyMember.exists({ userId: phoneUser._id, status: "active" });
          const samePersonName =
            normalizeNameForMatch(phoneUser.fullName) === normalizeNameForMatch(singleClaimedMatch.displayName);
          if (phoneUserHasMembership || !samePersonName) {
            throw httpError(
              409,
              "This mobile number is already registered to another Nyas account. Ask the owner for help.",
              "PHONE_ALREADY_REGISTERED"
            );
          }
          orphanPhoneUserToDetach = phoneUser;
        }

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
    }

    const userWithPassword = await User.findById(user._id).select("+passwordHash");
    let hasPassword = Boolean(userWithPassword?.passwordHash);
    if (!hasPassword && !body.phone && !body.email) {
      throw httpError(
        409,
        "This profile has never created login details. Add a mobile number and create a password now.",
        "ACCOUNT_SETUP_REQUIRED"
      );
    }
    if (hasPassword && !body.password) {
      throw httpError(
        401,
        "Enter your password to continue.",
        "PASSWORD_REQUIRED"
      );
    }
    if (!hasPassword && !body.password) {
      throw httpError(
        409,
        "Create a simple password to protect this account.",
        "PASSWORD_SETUP_REQUIRED"
      );
    }
    if (hasPassword) {
      const loginIdentity = { userId: userWithPassword._id, ip: req.ip };
      const lock = getLoginLock(loginIdentity);
      if (lock) {
        throw httpError(
          429,
          `Too many incorrect attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minutes.`,
          "LOGIN_TEMPORARILY_LOCKED"
        );
      }
      if (!(await verifyPassword(body.password, userWithPassword.passwordHash))) {
        const newLock = recordFailedLogin(loginIdentity);
        throw httpError(
          newLock ? 429 : 401,
          newLock
            ? "Too many incorrect attempts. Please wait 15 minutes before trying again."
            : "The password is incorrect.",
          newLock ? "LOGIN_TEMPORARILY_LOCKED" : "INVALID_CREDENTIALS"
        );
      }
      clearFailedLogins(loginIdentity);
    }
    if (!hasPassword && body.password) {
      validateNewPassword({ password: body.password, confirmPassword: body.confirmPassword });
      userWithPassword.passwordHash = await hashPassword(body.password);
      userWithPassword.passwordSetAt = new Date();
      userWithPassword.authVersion = (userWithPassword.authVersion || 0) + 1;
      if (!userWithPassword.authProviders.some((provider) => provider.provider === "password")) {
        userWithPassword.authProviders.push({ provider: "password", verifiedAt: new Date() });
      }
      await userWithPassword.save();
      hasPassword = true;
    }
    if (orphanPhoneUserToDetach) {
      orphanPhoneUserToDetach.phone = undefined;
      orphanPhoneUserToDetach.status = "inactive";
      orphanPhoneUserToDetach.authVersion = (orphanPhoneUserToDetach.authVersion || 0) + 1;
      await orphanPhoneUserToDetach.save();
    }

    try {
      user = await updateUserLoginFields(userWithPassword || user, effectiveLoginBody);
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.phone) {
        throw httpError(
          409,
          "This mobile number is already registered to another Nyas account. Ask the owner for help.",
          "PHONE_ALREADY_REGISTERED"
        );
      }
      throw error;
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

    const authLevel = hasPassword ? "password" : "onboarding";
    const token = createToken(userWithPassword || user, authLevel);

    res.json({
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          hasPassword
        },
        authLevel,
        family: launchMembership.family,
        member: launchMembership.member
      }
    });
  })
);

authRoutes.post(
  "/family/:familyId/password-recovery-grants",
  requireAuth,
  requirePasswordAuth,
  requireFamilyPermission(permissions.workspaceManageRoles),
  asyncHandler(async (req, res) => {
    const body = passwordRecoveryGrantSchema.parse(req.body);
    const member = await FamilyMember.findOne({
      _id: body.memberId,
      familyId: req.familyId,
      status: "active",
      livingStatus: { $ne: "deceased" },
      userId: { $exists: true, $ne: null }
    });
    if (!member) {
      throw httpError(404, "Select an active member who already has a login account.", "RECOVERY_MEMBER_NOT_FOUND");
    }

    const user = await User.findOne({ _id: member.userId, status: "active" });
    if (!user) throw httpError(404, "The linked login account could not be found.", "LINKED_USER_NOT_FOUND");

    await PasswordRecoveryGrant.deleteMany({ userId: user._id, usedAt: null });
    const recoveryCode = createRecoveryCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await PasswordRecoveryGrant.create({
      familyId: req.familyId,
      memberId: member._id,
      userId: user._id,
      codeHash: hashRecoveryCode(recoveryCode),
      expiresAt,
      createdByUserId: req.user._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "auth.password_recovery_issued",
      entityType: "User",
      entityId: String(user._id),
      summary: `One-time password recovery issued for ${member.displayName}`,
      req
    });

    res.status(201).json({
      data: { recoveryCode, expiresAt, memberId: member._id, memberName: member.displayName },
      message: "One-time recovery code created. Share it privately; it expires in 15 minutes."
    });
  })
);

authRoutes.post(
  "/password/recover",
  asyncHandler(async (req, res) => {
    const body = passwordRecoverySchema.parse(req.body);
    validateNewPassword(body);
    const grant = await PasswordRecoveryGrant.findOne({
      codeHash: hashRecoveryCode(body.recoveryCode),
      usedAt: null,
      expiresAt: { $gt: new Date() }
    });
    if (!grant) throw httpError(401, "This recovery code is invalid or has expired.", "INVALID_RECOVERY_CODE");

    const [member, user, family] = await Promise.all([
      FamilyMember.findOne({ _id: grant.memberId, familyId: grant.familyId, status: "active" }),
      User.findOne({ _id: grant.userId, status: "active" }).select("+passwordHash"),
      Family.findById(grant.familyId)
    ]);
    if (!member || !user || !family) throw httpError(404, "This recovery account is no longer active.", "RECOVERY_ACCOUNT_INACTIVE");
    if (nameSimilarity(body.fullName, member.displayName) < 0.72) {
      throw httpError(401, "Enter the member name shown when the recovery code was created.", "RECOVERY_NAME_MISMATCH");
    }

    user.passwordHash = await hashPassword(body.password);
    user.passwordSetAt = new Date();
    user.authVersion = (user.authVersion || 0) + 1;
    user.lastLoginAt = new Date();
    if (!user.authProviders.some((provider) => provider.provider === "password")) {
      user.authProviders.push({ provider: "password", verifiedAt: new Date() });
    }
    await user.save();
    grant.usedAt = new Date();
    await grant.save();

    await writeAuditLog({
      familyId: family._id,
      actorUserId: user._id,
      actorMemberId: member._id,
      action: "auth.password_recovered",
      entityType: "User",
      entityId: String(user._id),
      summary: `${member.displayName} completed owner-assisted password recovery`,
      req
    });

    res.json({
      data: {
        token: createToken(user, "password"),
        authLevel: "password",
        user: { id: user._id, fullName: member.displayName, email: user.email, phone: user.phone, hasPassword: true },
        family,
        member
      },
      message: "Password reset. You are now signed in."
    });
  })
);

authRoutes.post(
  "/password/setup",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = passwordSetupSchema.parse(req.body);
    validateNewPassword(body);

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (user.passwordHash) {
      throw httpError(409, "A password is already set. Use change password instead.", "PASSWORD_ALREADY_SET");
    }

    user.passwordHash = await hashPassword(body.password);
    user.passwordSetAt = new Date();
    user.authVersion = (user.authVersion || 0) + 1;
    if (!user.authProviders.some((provider) => provider.provider === "password")) {
      user.authProviders.push({ provider: "password", verifiedAt: new Date() });
    }
    await user.save();

    const token = createToken(user, "password");
    res.json({
      data: {
        token,
        authLevel: "password",
        user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, hasPassword: true }
      },
      message: "Password secured. Kosh actions are now unlocked."
    });
  })
);

authRoutes.post(
  "/password/change",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = passwordChangeSchema.parse(req.body);
    validateNewPassword(body);

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user.passwordHash || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw httpError(401, "Current password is incorrect.", "INVALID_CURRENT_PASSWORD");
    }

    user.passwordHash = await hashPassword(body.password);
    user.passwordSetAt = new Date();
    user.authVersion = (user.authVersion || 0) + 1;
    await user.save();

    const token = createToken(user, "password");
    res.json({
      data: {
        token,
        authLevel: "password",
        user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, hasPassword: true }
      },
      message: "Password changed successfully."
    });
  })
);
