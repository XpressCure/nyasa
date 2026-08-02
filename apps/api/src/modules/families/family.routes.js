import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Family } from "../../models/Family.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { Project } from "../../models/Project.js";
import { SankalpProposal } from "../../models/SankalpProposal.js";
import { SankalpProposalVote } from "../../models/SankalpProposalVote.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { calculatePostedBalance, getOrCreateMainTreasury } from "../treasury/treasury.service.js";

export const familyRoutes = Router();

const createFamilySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  primaryLocation: z.string().optional()
});

const ageGroups = [
  { id: "kids", label: "बच्चे", englishLabel: "Kids", rangeLabel: "0-10 years", min: 0, max: 10 },
  { id: "teenagers", label: "किशोर", englishLabel: "Teenagers", rangeLabel: "11-21 years", min: 11, max: 21 },
  { id: "youngAdults", label: "युवा", englishLabel: "New Adults", rangeLabel: "22-35 years", min: 22, max: 35 },
  { id: "adults", label: "वयस्क", englishLabel: "Adults", rangeLabel: "36-64 years", min: 36, max: 64 },
  { id: "seniors", label: "वरिष्ठ", englishLabel: "Seniors", rangeLabel: "65+ years", min: 65, max: Infinity }
];

function calculateAge(dateOfBirth, today = new Date()) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function buildAgeGroupMetrics(members) {
  const today = new Date();
  const groups = ageGroups.map(({ id, label, englishLabel, rangeLabel }) => ({ id, label, englishLabel, rangeLabel, count: 0 }));
  let unknownDateOfBirth = 0;

  members.forEach((member) => {
    const age = calculateAge(member.dateOfBirth, today);
    if (age === null) {
      unknownDateOfBirth += 1;
      return;
    }

    const groupIndex = ageGroups.findIndex((ageGroup) => age >= ageGroup.min && age <= ageGroup.max);
    if (groupIndex >= 0) groups[groupIndex].count += 1;
  });

  return { groups, unknownDateOfBirth };
}

familyRoutes.get(
  "/public/nyasa-summary",
  asyncHandler(async (_req, res) => {
    const family = await Family.findOne({ slug: "nyasa-trust-alahdadpur" });

    if (!family) {
      res.json({ data: { memberCount: 0, locationCount: 0, locations: [] } });
      return;
    }

    const normalizedFamilyId = new mongoose.Types.ObjectId(String(family._id));
    const [memberCount, locationRows, activeSankalpCount, featuredSankalp] = await Promise.all([
      FamilyMember.countDocuments({ familyId: family._id, status: { $ne: "removed" } }),
      FamilyMember.aggregate([
        { $match: { familyId: normalizedFamilyId, status: { $ne: "removed" } } },
        {
          $project: {
            location: {
              $ifNull: [
                "$city",
                {
                  $ifNull: ["$placeOfResidence", "$country"]
                }
              ]
            }
          }
        },
        { $match: { location: { $nin: [null, ""] } } },
        { $group: { _id: "$location", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 }
      ]),
      Project.countDocuments({
        familyId: family._id,
        visibility: "family",
        status: { $in: ["proposed", "active", "estimate_received", "fundraising", "implementation"] }
      }),
      Project.findOne({
        familyId: family._id,
        visibility: "family",
        status: { $in: ["implementation", "fundraising", "estimate_received", "active", "proposed"] }
      })
        .select("title description lifecycleStage targetBudgetPaise completionPercent")
        .sort({ updatedAt: -1 })
    ]);

    const targetBudgetRupees = (featuredSankalp?.targetBudgetPaise || 0) / 100;
    let allocatedPaise = 0;

    if (featuredSankalp?._id) {
      const allocationRows = await LedgerTransaction.aggregate([
        {
          $match: {
            familyId: normalizedFamilyId,
            projectId: featuredSankalp._id,
            status: "posted",
            type: { $in: ["allocation", "refund", "reversal"] }
          }
        },
        { $group: { _id: "$direction", amountPaise: { $sum: "$amountPaise" } } }
      ]);
      const debit = allocationRows.find((row) => row._id === "debit")?.amountPaise || 0;
      const credit = allocationRows.find((row) => row._id === "credit")?.amountPaise || 0;
      allocatedPaise = Math.max(debit - credit, 0);
    }

    const allocatedRupees = allocatedPaise / 100;
    const fundingPercent = targetBudgetRupees > 0 ? Math.round((allocatedRupees / targetBudgetRupees) * 100) : 0;

    res.json({
      data: {
        memberCount,
        locationCount: locationRows.length,
        locations: locationRows.map((row) => ({ location: row._id, count: row.count })),
        sankalp: {
          activeCount: activeSankalpCount,
          featured: featuredSankalp
            ? {
                id: featuredSankalp._id,
                title: featuredSankalp.title,
                description: featuredSankalp.description,
                lifecycleStage: featuredSankalp.lifecycleStage,
                targetBudgetRupees,
                allocatedRupees,
                fundingPercent,
                completionPercent: featuredSankalp.completionPercent || 0
              }
            : null
        }
      }
    });
  })
);

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
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const normalizedFamilyId = new mongoose.Types.ObjectId(req.familyId);
    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });

    const [family, memberCount, livingMembersForAgeGroups, activeProjects, completedProjects, treasuryBalancePaise, contributionRows, featuredProjects, proposalRows] = await Promise.all([
      Family.findById(req.familyId),
      FamilyMember.countDocuments({ familyId: req.familyId, status: "active" }),
      FamilyMember.find({
        familyId: req.familyId,
        status: "active",
        livingStatus: { $ne: "deceased" }
      }).select("dateOfBirth"),
      Project.countDocuments({ familyId: req.familyId, status: { $in: ["proposed", "active", "implementation"] } }),
      Project.countDocuments({ familyId: req.familyId, status: "completed" }),
      calculatePostedBalance({ familyId: req.familyId, treasuryAccountId: treasury._id }),
      LedgerTransaction.aggregate([
        {
          $match: {
            familyId: normalizedFamilyId,
            type: "contribution",
            direction: "credit",
            status: "posted",
            createdAt: { $gte: startOfYear }
          }
        },
        { $group: { _id: null, amountPaise: { $sum: "$amountPaise" } } }
      ]),
      Project.find({
        familyId: req.familyId,
        visibility: "family",
        status: { $in: ["proposed", "active", "estimate_received", "fundraising", "implementation"] }
      })
        .select("title slug description category projectType status lifecycleStage budgetRequired targetBudgetPaise targetCompletionDate completionPercent")
        .sort({ createdAt: -1 })
        .limit(5),
      SankalpProposal.aggregate([
        {
          $match: {
            familyId: normalizedFamilyId,
            status: "voting"
          }
        },
        {
          $lookup: {
            from: SankalpProposalVote.collection.name,
            localField: "_id",
            foreignField: "proposalId",
            as: "votes"
          }
        },
        {
          $addFields: {
            upVotes: { $size: { $filter: { input: "$votes", as: "vote", cond: { $eq: ["$$vote.vote", "up"] } } } },
            downVotes: { $size: { $filter: { input: "$votes", as: "vote", cond: { $eq: ["$$vote.vote", "down"] } } } }
          }
        },
        { $addFields: { voteScore: { $subtract: ["$upVotes", "$downVotes"] }, totalVotes: { $add: ["$upVotes", "$downVotes"] } } },
        { $sort: { voteScore: -1, totalVotes: -1, createdAt: -1 } },
        { $limit: 3 }
      ])
    ]);

    res.json({
      data: {
        family,
        metrics: {
          memberCount,
          ageGroups: buildAgeGroupMetrics(livingMembersForAgeGroups),
          activeProjects,
          completedProjects,
          treasuryBalance: treasuryBalancePaise / 100,
          contributionThisYear: (contributionRows[0]?.amountPaise || 0) / 100
        },
        votingSankalp: proposalRows.map((proposal) => ({
          id: proposal._id,
          title: proposal.title,
          description: proposal.description,
          category: proposal.category,
          status: proposal.status,
          tentativeBudgetRupees: (proposal.tentativeBudgetPaise || 0) / 100,
          votes: {
            up: proposal.upVotes || 0,
            down: proposal.downVotes || 0,
            total: proposal.totalVotes || 0,
            score: proposal.voteScore || 0
          },
          createdAt: proposal.createdAt
        })),
        featuredProjects: featuredProjects.map((project) => ({
          id: project._id,
          title: project.title,
          slug: project.slug,
          description: project.description,
          category: project.category,
          projectType: project.projectType,
          status: project.status,
          lifecycleStage: project.lifecycleStage,
          budgetRequired: project.budgetRequired,
          targetBudgetRupees: (project.targetBudgetPaise || 0) / 100,
          targetCompletionDate: project.targetCompletionDate,
          completionPercent: project.completionPercent || 0
        }))
      }
    });
  })
);
