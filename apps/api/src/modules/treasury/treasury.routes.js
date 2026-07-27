import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { Project } from "../../models/Project.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "./money.js";
import { calculatePostedBalance, getOrCreateMainTreasury, getOrCreateWallet } from "./treasury.service.js";

export const treasuryRoutes = Router();

const contributionSchema = z.object({
  memberId: z.string().min(1).optional(),
  amountRupees: z.coerce.number().positive(),
  description: z.string().max(280).optional()
});

const allocationSchema = z.object({
  projectId: z.string().min(1),
  amountRupees: z.coerce.number().positive(),
  description: z.string().max(280).optional()
});

treasuryRoutes.use(requireAuth);

treasuryRoutes.get(
  "/family/:familyId/summary",
  requireFamilyPermission(permissions.treasuryViewSummary),
  asyncHandler(async (req, res) => {
    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
    const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId: req.member._id });
    const [treasuryBalancePaise, walletBalancePaise, contributionThisYearPaise] = await Promise.all([
      calculatePostedBalance({ familyId: req.familyId, treasuryAccountId: treasury._id }),
      calculatePostedBalance({ familyId: req.familyId, walletId: wallet._id }),
      calculatePostedBalance({
        familyId: req.familyId,
        type: "contribution",
        direction: "credit",
        createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
      })
    ]);

    res.json({
      data: {
        treasury: {
          id: treasury._id,
          name: treasury.name,
          balancePaise: treasuryBalancePaise,
          balanceRupees: paiseToRupees(treasuryBalancePaise)
        },
        wallet: {
          id: wallet._id,
          balancePaise: walletBalancePaise,
          balanceRupees: paiseToRupees(walletBalancePaise)
        },
        contributionThisYearPaise,
        contributionThisYearRupees: paiseToRupees(contributionThisYearPaise)
      }
    });
  })
);

treasuryRoutes.get(
  "/family/:familyId/transactions",
  requireFamilyPermission(permissions.treasuryViewSummary),
  asyncHandler(async (req, res) => {
    const query = { familyId: req.familyId };

    if (req.member.role !== "owner" && req.member.role !== "admin") {
      query.memberId = req.member._id;
    }

    const transactions = await LedgerTransaction.find(query)
      .populate("memberId", "displayName role")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      data: transactions.map((transaction) => ({
        id: transaction._id,
        type: transaction.type,
        direction: transaction.direction,
        amountPaise: transaction.amountPaise,
        amountRupees: paiseToRupees(transaction.amountPaise),
        description: transaction.description,
        status: transaction.status,
        member: transaction.memberId,
        createdAt: transaction.createdAt
      }))
    });
  })
);

treasuryRoutes.post(
  "/family/:familyId/manual-contributions",
  requireFamilyPermission(permissions.treasuryViewLedger),
  asyncHandler(async (req, res) => {
    const body = contributionSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    if (amountPaise <= 0) {
      throw httpError(400, "Contribution amount must be greater than zero.", "INVALID_AMOUNT");
    }

    const memberId = body.memberId || req.member._id;
    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
    const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId });

    const transaction = await LedgerTransaction.create({
      familyId: req.familyId,
      treasuryAccountId: treasury._id,
      walletId: wallet._id,
      memberId,
      type: "contribution",
      direction: "credit",
      amountPaise,
      description: body.description || "Manual contribution",
      status: "posted",
      postedAt: new Date(),
      metadata: { source: "manual" },
      createdBy: req.user._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "treasury.manual_contribution_recorded",
      entityType: "LedgerTransaction",
      entityId: String(transaction._id),
      summary: `Recorded manual contribution of INR ${paiseToRupees(amountPaise)}`,
      after: {
        memberId,
        amountPaise,
        transactionId: transaction._id
      },
      req
    });

    res.status(201).json({ data: transaction });
  })
);

treasuryRoutes.post(
  "/family/:familyId/allocations",
  requireFamilyPermission(permissions.treasuryAllocateOwn),
  asyncHandler(async (req, res) => {
    const body = allocationSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    if (amountPaise <= 0) {
      throw httpError(400, "Allocation amount must be greater than zero.", "INVALID_AMOUNT");
    }

    const project = await Project.findOne({
      _id: body.projectId,
      familyId: req.familyId,
      status: { $in: ["active", "paused", "proposed"] }
    });

    if (!project) {
      throw httpError(404, "Mission not found or not open for allocation.", "PROJECT_NOT_ALLOCATABLE");
    }

    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
    const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId: req.member._id });
    const walletBalancePaise = await calculatePostedBalance({ familyId: req.familyId, walletId: wallet._id });

    if (walletBalancePaise < amountPaise) {
      throw httpError(400, "Wallet balance is not enough for this allocation.", "INSUFFICIENT_WALLET_BALANCE");
    }

    const transaction = await LedgerTransaction.create({
      familyId: req.familyId,
      treasuryAccountId: treasury._id,
      walletId: wallet._id,
      memberId: req.member._id,
      projectId: project._id,
      type: "allocation",
      direction: "debit",
      amountPaise,
      description: body.description || `Allocated to ${project.title}`,
      status: "posted",
      postedAt: new Date(),
      metadata: {
        projectTitle: project.title
      },
      createdBy: req.user._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "treasury.project_allocation_recorded",
      entityType: "LedgerTransaction",
      entityId: String(transaction._id),
      summary: `Allocated INR ${paiseToRupees(amountPaise)} to ${project.title}`,
      after: {
        projectId: project._id,
        amountPaise,
        transactionId: transaction._id
      },
      req
    });

    res.status(201).json({ data: transaction });
  })
);
