import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AuditLog } from "../models/AuditLog.js";
import { Family } from "../models/Family.js";
import { FamilyMember } from "../models/FamilyMember.js";
import { Project } from "../models/Project.js";
import { TreasuryAccount } from "../models/TreasuryAccount.js";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";

const launchFamily = {
  name: "Nyasa Trust - Alahdadpur",
  slug: "nyasa-trust-alahdadpur",
  description: "A family trust workspace rooted in Alahdadpur for legacy, village missions, and transparent family contributions.",
  primaryLocation: "Alahdadpur",
  language: "mixed"
};

const launchMissions = [
  {
    title: "Alahdadpur Ancestral House Mission",
    slug: "alahdadpur-ancestral-house",
    description: "Repair, modernize, document, and maintain the ancestral house as a shared family and village legacy space.",
    category: "renovation",
    targetBudgetPaise: 80000000,
    completionPercent: 0
  },
  {
    title: "Family Gallery and Archive",
    slug: "family-gallery-archive",
    description: "Collect family photographs, event memories, old documents, and stories connected with Alahdadpur.",
    category: "other",
    targetBudgetPaise: 15000000,
    completionPercent: 0
  },
  {
    title: "Alahdadpur Social Works Fund",
    slug: "alahdadpur-social-works",
    description: "A transparent fund for future community initiatives around Alahdadpur, with approvals and expense records.",
    category: "community",
    targetBudgetPaise: 50000000,
    completionPercent: 0
  }
];

function getOwnerSeed() {
  return {
    fullName: process.env.LIVE_OWNER_NAME || "Kumar Saurabh",
    phone: process.env.LIVE_OWNER_PHONE || "9621016427",
    email: process.env.LIVE_OWNER_EMAIL || undefined
  };
}

async function createIndexes() {
  await Promise.all([
    User.createIndexes(),
    Family.createIndexes(),
    FamilyMember.createIndexes(),
    TreasuryAccount.createIndexes(),
    Wallet.createIndexes(),
    Project.createIndexes(),
    AuditLog.createIndexes()
  ]);
}

async function upsertOwnerUser() {
  const ownerSeed = getOwnerSeed();
  const loginFilter = ownerSeed.phone ? { phone: ownerSeed.phone } : { email: ownerSeed.email.toLowerCase() };

  return User.findOneAndUpdate(
    loginFilter,
    {
      $setOnInsert: {
        ...(ownerSeed.email ? { email: ownerSeed.email.toLowerCase() } : {}),
        ...(ownerSeed.phone ? { phone: ownerSeed.phone } : {}),
        authProviders: [{ provider: ownerSeed.phone ? "phone_otp" : "email_magic_link", verifiedAt: new Date() }]
      },
      $set: {
        fullName: ownerSeed.fullName,
        status: "active"
      }
    },
    { upsert: true, new: true }
  );
}

async function upsertFamily(owner) {
  return Family.findOneAndUpdate(
    { slug: launchFamily.slug },
    {
      $setOnInsert: {
        slug: launchFamily.slug,
        createdBy: owner._id,
        settings: {
          contributionVisibility: "members_can_see_totals",
          voteVisibility: "public_votes",
          expenseApprovalRequired: true,
          projectCreationPolicy: "members_can_request",
          documentDefaultVisibility: "admins_only",
          minimumVotingAge: 18,
          defaultProposalQuorumPercent: 51
        }
      },
      $set: {
        name: launchFamily.name,
        description: launchFamily.description,
        primaryLocation: launchFamily.primaryLocation,
        language: launchFamily.language,
        status: "active"
      }
    },
    { upsert: true, new: true }
  );
}

async function upsertOwnerMembership({ family, owner }) {
  return FamilyMember.findOneAndUpdate(
    { familyId: family._id, userId: owner._id },
    {
      $setOnInsert: {
        joinedAt: new Date()
      },
      $set: {
        displayName: owner.fullName,
        role: "owner",
        status: "active",
        city: "Alahdadpur",
        country: "India"
      }
    },
    { upsert: true, new: true }
  );
}

async function upsertTreasury({ family, owner }) {
  return TreasuryAccount.findOneAndUpdate(
    { familyId: family._id, type: "main", status: "active" },
    {
      $setOnInsert: {
        familyId: family._id,
        name: "Alahdadpur Family Kosh",
        type: "main",
        currency: "INR",
        status: "active",
        openingBalancePaise: 0,
        createdBy: owner._id
      }
    },
    { upsert: true, new: true }
  );
}

async function upsertWallet({ family, ownerMember }) {
  return Wallet.findOneAndUpdate(
    { familyId: family._id, memberId: ownerMember._id },
    {
      $setOnInsert: {
        familyId: family._id,
        memberId: ownerMember._id,
        currency: "INR",
        status: "active"
      }
    },
    { upsert: true, new: true }
  );
}

async function upsertMissions({ family, owner, ownerMember }) {
  const missions = [];

  for (const mission of launchMissions) {
    const project = await Project.findOneAndUpdate(
      { familyId: family._id, slug: mission.slug },
      {
        $setOnInsert: {
          familyId: family._id,
          slug: mission.slug,
          createdBy: owner._id,
          projectLeadMemberId: ownerMember._id,
          status: "active",
          visibility: "family",
          currency: "INR"
        },
        $set: {
          title: mission.title,
          description: mission.description,
          category: mission.category,
          targetBudgetPaise: mission.targetBudgetPaise,
          completionPercent: mission.completionPercent
        }
      },
      { upsert: true, new: true }
    );

    missions.push(project);
  }

  return missions;
}

async function writeBootstrapAudit({ family, owner, ownerMember }) {
  const existing = await AuditLog.findOne({
    familyId: family._id,
    action: "live_launch.prepared",
    entityType: "Family",
    entityId: String(family._id)
  });

  if (existing) return existing;

  return AuditLog.create({
    familyId: family._id,
    actorUserId: owner._id,
    actorMemberId: ownerMember._id,
    action: "live_launch.prepared",
    entityType: "Family",
    entityId: String(family._id),
    summary: "Prepared Nyasa Trust Alahdadpur database for live launch."
  });
}

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);

  console.log("Creating indexes...");
  await createIndexes();

  console.log("Preparing owner, family, treasury, wallet, and missions...");
  const owner = await upsertOwnerUser();
  const family = await upsertFamily(owner);
  const ownerMember = await upsertOwnerMembership({ family, owner });
  const treasury = await upsertTreasury({ family, owner });
  const wallet = await upsertWallet({ family, ownerMember });
  const missions = await upsertMissions({ family, owner, ownerMember });
  await writeBootstrapAudit({ family, owner, ownerMember });

  console.log("Live database prepared.");
  console.log(JSON.stringify({
    family: { id: family._id, name: family.name, slug: family.slug },
    owner: { id: owner._id, fullName: owner.fullName, phone: owner.phone, email: owner.email },
    ownerMember: { id: ownerMember._id, role: ownerMember.role },
    treasury: { id: treasury._id, name: treasury.name },
    wallet: { id: wallet._id },
    missions: missions.map((mission) => ({
      id: mission._id,
      title: mission.title,
      slug: mission.slug,
      targetBudgetPaise: mission.targetBudgetPaise
    }))
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to prepare live database", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
