import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, requirePasswordAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Expense } from "../../models/Expense.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { Project } from "../../models/Project.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "./money.js";
import { calculatePostedBalance, getOrCreateMainTreasury, getOrCreateWallet } from "./treasury.service.js";

export const treasuryRoutes = Router();

const MIN_WALLET_TOP_UP_RUPEES = 2000;

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

const allocationReductionSchema = z.object({
  amountRupees: z.coerce.number().positive(),
  description: z.string().max(280).optional()
});

function parseDateFilter(query) {
  const today = new Date();
  const dateTo = query.dateTo ? new Date(query.dateTo) : today;
  let dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;

  if (!dateFrom) {
    dateFrom = new Date(dateTo);
    const range = query.range || "3m";
    if (range === "6m") {
      dateFrom.setMonth(dateFrom.getMonth() - 6);
    } else if (range === "12m") {
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);
    } else {
      dateFrom.setMonth(dateFrom.getMonth() - 3);
    }
  }

  dateFrom.setHours(0, 0, 0, 0);
  dateTo.setHours(23, 59, 59, 999);

  return { dateFrom, dateTo };
}

function serializeMoney(amountPaise = 0) {
  return {
    amountPaise,
    amountRupees: paiseToRupees(amountPaise)
  };
}

function netDebitCreditRows(rows = []) {
  return rows.reduce((total, row) => (row._id === "debit" ? total + row.amountPaise : total - row.amountPaise), 0);
}

function ensureMinimumWalletTopUp(amountRupees) {
  if (Number(amountRupees) < MIN_WALLET_TOP_UP_RUPEES) {
    throw httpError(400, `Minimum wallet top-up is INR ${MIN_WALLET_TOP_UP_RUPEES}.`, "WALLET_TOP_UP_BELOW_MINIMUM");
  }
}

function calculateAllocationPolicy(project) {
  if (!project.budgetRequired || !project.targetBudgetPaise) {
    return null;
  }

  const targetBudgetPaise = project.targetBudgetPaise;
  const maxPercent = targetBudgetPaise > rupeesToPaise(200000) ? 5 : 10;
  const minPercent = 2;
  const maxPaise = Math.floor((targetBudgetPaise * maxPercent) / 100);

  return {
    maxPercent,
    minPercent,
    maxPaise,
    minPaise: Math.min(Math.max(Math.ceil((targetBudgetPaise * minPercent) / 100), rupeesToPaise(500)), maxPaise)
  };
}

async function createContributionTransaction({ familyId, userId, memberId, amountPaise, description, source }) {
  const treasury = await getOrCreateMainTreasury({ familyId, userId });
  const wallet = await getOrCreateWallet({ familyId, memberId });

  return LedgerTransaction.create({
    familyId,
    treasuryAccountId: treasury._id,
    walletId: wallet._id,
    memberId,
    type: "contribution",
    direction: "credit",
    amountPaise,
    description,
    status: "posted",
    postedAt: new Date(),
    metadata: { source },
    createdBy: userId
  });
}

async function calculateNetProjectAllocationPaise({ familyId, projectId }) {
  const normalizedFamilyId =
    typeof familyId === "string" && mongoose.Types.ObjectId.isValid(familyId) ? new mongoose.Types.ObjectId(familyId) : familyId;
  const normalizedProjectId =
    typeof projectId === "string" && mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;

  const rows = await LedgerTransaction.aggregate([
    {
      $match: {
        familyId: normalizedFamilyId,
        projectId: normalizedProjectId,
        status: "posted",
        type: { $in: ["allocation", "refund", "reversal"] }
      }
    },
    {
      $group: {
        _id: "$direction",
        amountPaise: { $sum: "$amountPaise" }
      }
    }
  ]);

  return rows.reduce((total, row) => {
    return row._id === "debit" ? total + row.amountPaise : total - row.amountPaise;
  }, 0);
}

async function calculateNetMemberProjectAllocationPaise({ familyId, projectId, memberId }) {
  const normalizedFamilyId =
    typeof familyId === "string" && mongoose.Types.ObjectId.isValid(familyId) ? new mongoose.Types.ObjectId(familyId) : familyId;
  const normalizedProjectId =
    typeof projectId === "string" && mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
  const normalizedMemberId =
    typeof memberId === "string" && mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : memberId;

  const rows = await LedgerTransaction.aggregate([
    {
      $match: {
        familyId: normalizedFamilyId,
        projectId: normalizedProjectId,
        memberId: normalizedMemberId,
        status: "posted",
        type: { $in: ["allocation", "refund", "reversal"] }
      }
    },
    {
      $group: {
        _id: "$direction",
        amountPaise: { $sum: "$amountPaise" }
      }
    }
  ]);

  return rows.reduce((total, row) => {
    return row._id === "debit" ? total + row.amountPaise : total - row.amountPaise;
  }, 0);
}

async function calculateProjectExpensePaise({ familyId, projectId }) {
  const normalizedFamilyId =
    typeof familyId === "string" && mongoose.Types.ObjectId.isValid(familyId) ? new mongoose.Types.ObjectId(familyId) : familyId;
  const normalizedProjectId =
    typeof projectId === "string" && mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;

  const rows = await Expense.aggregate([
    {
      $match: {
        familyId: normalizedFamilyId,
        projectId: normalizedProjectId,
        status: { $in: ["submitted", "approved"] }
      }
    },
    { $group: { _id: "$projectId", amountPaise: { $sum: "$amountPaise" } } }
  ]);

  return rows[0]?.amountPaise || 0;
}

async function calculateReductionAlreadyPostedPaise({ familyId, transactionId }) {
  const normalizedFamilyId =
    typeof familyId === "string" && mongoose.Types.ObjectId.isValid(familyId) ? new mongoose.Types.ObjectId(familyId) : familyId;

  const rows = await LedgerTransaction.aggregate([
    {
      $match: {
        familyId: normalizedFamilyId,
        referenceTransactionId: new mongoose.Types.ObjectId(transactionId),
        status: "posted",
        type: { $in: ["refund", "reversal"] },
        direction: "credit"
      }
    },
    { $group: { _id: "$referenceTransactionId", amountPaise: { $sum: "$amountPaise" } } }
  ]);

  return rows[0]?.amountPaise || 0;
}

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
      .populate("projectId", "title slug")
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
        projectId: transaction.projectId?._id || transaction.projectId,
        project: transaction.projectId?.title ? {
          id: transaction.projectId._id,
          title: transaction.projectId.title,
          slug: transaction.projectId.slug
        } : null,
        source: transaction.metadata?.source || null,
        referenceTransactionId: transaction.referenceTransactionId,
        member: transaction.memberId,
        createdAt: transaction.createdAt
      }))
    });
  })
);

treasuryRoutes.get(
  "/family/:familyId/analytics",
  requireFamilyPermission(permissions.treasuryViewSummary),
  asyncHandler(async (req, res) => {
    const { dateFrom, dateTo } = parseDateFilter(req.query);
    const dateMatch = { $gte: dateFrom, $lte: dateTo };
    const familyObjectId = new mongoose.Types.ObjectId(req.familyId);

    const [contributionRows, allocationRows, spentRows, implementationAllocationRows, projectRows] = await Promise.all([
      LedgerTransaction.aggregate([
        {
          $match: {
            familyId: familyObjectId,
            type: "contribution",
            direction: "credit",
            status: "posted",
            createdAt: dateMatch
          }
        },
        { $group: { _id: null, amountPaise: { $sum: "$amountPaise" } } }
      ]),
      LedgerTransaction.aggregate([
        {
          $match: {
            familyId: familyObjectId,
            type: { $in: ["allocation", "refund", "reversal"] },
            status: "posted",
            createdAt: dateMatch
          }
        },
        { $group: { _id: "$direction", amountPaise: { $sum: "$amountPaise" } } }
      ]),
      Expense.aggregate([
        {
          $match: {
            familyId: familyObjectId,
            status: { $in: ["submitted", "approved"] },
            expenseDate: dateMatch
          }
        },
        { $group: { _id: null, amountPaise: { $sum: "$amountPaise" } } }
      ]),
      LedgerTransaction.aggregate([
        {
          $match: {
            familyId: familyObjectId,
            type: { $in: ["allocation", "refund", "reversal"] },
            status: "posted",
            createdAt: dateMatch
          }
        },
        {
          $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "project"
          }
        },
        { $unwind: "$project" },
        {
          $match: {
            $or: [{ "project.status": "implementation" }, { "project.lifecycleStage": "implementation" }]
          }
        },
        { $group: { _id: "$direction", amountPaise: { $sum: "$amountPaise" } } }
      ]),
      Project.aggregate([
        {
          $match: {
            familyId: familyObjectId,
            status: { $ne: "archived" }
          }
        },
        {
          $group: {
            _id: "$lifecycleStage",
            count: { $sum: 1 },
            targetBudgetPaise: { $sum: "$targetBudgetPaise" }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalCollectedPaise = contributionRows[0]?.amountPaise || 0;
    const totalAllocatedPaise = Math.max(netDebitCreditRows(allocationRows), 0);
    const totalSpentPaise = spentRows[0]?.amountPaise || 0;
    const implementationAllocatedPaise = Math.max(netDebitCreditRows(implementationAllocationRows), 0);

    res.json({
      data: {
        dateFrom,
        dateTo,
        totalCollected: serializeMoney(totalCollectedPaise),
        totalAllocated: serializeMoney(totalAllocatedPaise),
        unallocated: serializeMoney(Math.max(totalCollectedPaise - totalAllocatedPaise, 0)),
        implementationAllocated: serializeMoney(implementationAllocatedPaise),
        totalSpent: serializeMoney(totalSpentPaise),
        projectStages: projectRows.map((row) => ({
          stage: row._id || "concept",
          count: row.count,
          targetBudgetPaise: row.targetBudgetPaise,
          targetBudgetRupees: paiseToRupees(row.targetBudgetPaise)
        }))
      }
    });
  })
);

treasuryRoutes.post(
  "/family/:familyId/manual-contributions",
  requireFamilyPermission(permissions.treasuryViewLedger),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = contributionSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    ensureMinimumWalletTopUp(body.amountRupees);

    const transaction = await createContributionTransaction({
      familyId: req.familyId,
      userId: req.user._id,
      memberId: body.memberId || req.member._id,
      amountPaise,
      description: body.description || "Manual contribution",
      source: "manual_admin_entry"
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
        memberId: transaction.memberId,
        amountPaise,
        transactionId: transaction._id
      },
      req
    });

    res.status(201).json({ data: transaction });
  })
);

treasuryRoutes.post(
  "/family/:familyId/my-contributions",
  requireFamilyPermission(permissions.treasuryContribute),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = contributionSchema.omit({ memberId: true }).parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    ensureMinimumWalletTopUp(body.amountRupees);

    const transaction = await createContributionTransaction({
      familyId: req.familyId,
      userId: req.user._id,
      memberId: req.member._id,
      amountPaise,
      description: body.description || "Self contribution",
      source: "member_self_contribution"
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "treasury.self_contribution_recorded",
      entityType: "LedgerTransaction",
      entityId: String(transaction._id),
      summary: `Added INR ${paiseToRupees(amountPaise)} to own wallet`,
      after: {
        memberId: req.member._id,
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
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = allocationSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    if (amountPaise <= 0) {
      throw httpError(400, "Allocation amount must be greater than zero.", "INVALID_AMOUNT");
    }

    const project = await Project.findOne({
      _id: body.projectId,
      familyId: req.familyId,
      status: { $in: ["active", "paused", "proposed", "estimate_received", "fundraising", "implementation"] }
    });

    if (!project) {
      throw httpError(404, "Mission not found or not open for allocation.", "PROJECT_NOT_ALLOCATABLE");
    }

    const [allocatedPaise, memberAllocatedPaise] = await Promise.all([
      calculateNetProjectAllocationPaise({ familyId: req.familyId, projectId: project._id }),
      calculateNetMemberProjectAllocationPaise({ familyId: req.familyId, projectId: project._id, memberId: req.member._id })
    ]);
    const remainingNeedPaise = project.budgetRequired ? Math.max((project.targetBudgetPaise || 0) - allocatedPaise, 0) : amountPaise;
    const allocationPolicy = calculateAllocationPolicy(project);
    const memberRemainingLimitPaise = allocationPolicy ? Math.max(allocationPolicy.maxPaise - memberAllocatedPaise, 0) : amountPaise;
    const effectiveAmountPaise = project.budgetRequired ? Math.min(amountPaise, remainingNeedPaise, memberRemainingLimitPaise) : amountPaise;

    if (effectiveAmountPaise <= 0) {
      const code = memberRemainingLimitPaise <= 0 ? "MEMBER_ALLOCATION_LIMIT_REACHED" : "PROJECT_FULLY_FUNDED";
      const message =
        memberRemainingLimitPaise <= 0
          ? `You have already reached your ${allocationPolicy?.maxPercent || 0}% contribution limit for this Sankalp.`
          : "This Sankalp is already fully funded.";
      throw httpError(400, message, code);
    }

    if (allocationPolicy) {
      const memberTotalAfterAllocationPaise = memberAllocatedPaise + effectiveAmountPaise;
      const remainingAfterAllocationPaise = Math.max(remainingNeedPaise - effectiveAmountPaise, 0);
      const closingSmallBalance = remainingNeedPaise < allocationPolicy.minPaise || remainingAfterAllocationPaise === 0;

      if (memberTotalAfterAllocationPaise < allocationPolicy.minPaise && !closingSmallBalance) {
        throw httpError(
          400,
          `Minimum contribution for this Sankalp is INR ${paiseToRupees(allocationPolicy.minPaise)} (${allocationPolicy.minPercent}% or INR 500, whichever is higher).`,
          "MEMBER_ALLOCATION_BELOW_MINIMUM"
        );
      }
    }

    const treasury = await getOrCreateMainTreasury({ familyId: req.familyId, userId: req.user._id });
    const wallet = await getOrCreateWallet({ familyId: req.familyId, memberId: req.member._id });
    const walletBalancePaise = await calculatePostedBalance({ familyId: req.familyId, walletId: wallet._id });

    if (walletBalancePaise < effectiveAmountPaise) {
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
      amountPaise: effectiveAmountPaise,
      description: body.description || `Allocated to ${project.title}`,
      status: "posted",
      postedAt: new Date(),
      metadata: {
        projectTitle: project.title,
        requestedAmountPaise: amountPaise,
        cappedToRemainingNeed: project.budgetRequired && effectiveAmountPaise < amountPaise && remainingNeedPaise <= amountPaise,
        cappedToMemberLimit: allocationPolicy ? effectiveAmountPaise < amountPaise && memberRemainingLimitPaise <= amountPaise : false,
        memberAllocatedBeforePaise: memberAllocatedPaise,
        memberAllocatedAfterPaise: memberAllocatedPaise + effectiveAmountPaise,
        memberMinPaise: allocationPolicy?.minPaise,
        memberMaxPaise: allocationPolicy?.maxPaise,
        memberMaxPercent: allocationPolicy?.maxPercent
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
      summary: `Allocated INR ${paiseToRupees(effectiveAmountPaise)} to ${project.title}`,
      after: {
        projectId: project._id,
        requestedAmountPaise: amountPaise,
        amountPaise: effectiveAmountPaise,
        transactionId: transaction._id
      },
      req
    });

    let message = "Funds allocated to Sankalp.";
    if (effectiveAmountPaise < amountPaise && memberRemainingLimitPaise <= amountPaise) {
      message = `Allocated INR ${paiseToRupees(effectiveAmountPaise)}. Your per-member limit for this Sankalp has been reached; the balance stayed in your wallet.`;
    } else if (effectiveAmountPaise < amountPaise) {
      message = `Only INR ${paiseToRupees(effectiveAmountPaise)} was needed, so the remaining amount stayed in your wallet.`;
    }

    res.status(201).json({ data: transaction, message });
  })
);

treasuryRoutes.post(
  "/family/:familyId/allocations/:transactionId/reduce",
  requireFamilyPermission(permissions.treasuryAllocateOwn),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    const body = allocationReductionSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);
    const allocation = await LedgerTransaction.findOne({
      _id: req.params.transactionId,
      familyId: req.familyId,
      type: "allocation",
      direction: "debit",
      status: "posted"
    });

    if (!allocation) {
      throw httpError(404, "Allocation not found.", "ALLOCATION_NOT_FOUND");
    }

    const isOwnerOrAdmin = ["owner", "admin"].includes(req.member.role);
    const isOwnAllocation = String(allocation.memberId || "") === String(req.member._id);

    if (!isOwnerOrAdmin && !isOwnAllocation) {
      throw httpError(403, "You can reduce only your own allocation.", "ALLOCATION_REDUCTION_NOT_ALLOWED");
    }

    const [alreadyReducedPaise, netAllocatedPaise, spentPaise] = await Promise.all([
      calculateReductionAlreadyPostedPaise({ familyId: req.familyId, transactionId: allocation._id }),
      calculateNetProjectAllocationPaise({ familyId: req.familyId, projectId: allocation.projectId }),
      calculateProjectExpensePaise({ familyId: req.familyId, projectId: allocation.projectId })
    ]);
    const remainingOnThisAllocationPaise = Math.max(allocation.amountPaise - alreadyReducedPaise, 0);
    const reducibleProjectPaise = Math.max(netAllocatedPaise - spentPaise, 0);
    const effectiveAmountPaise = Math.min(amountPaise, remainingOnThisAllocationPaise, reducibleProjectPaise);

    if (effectiveAmountPaise <= 0) {
      throw httpError(400, "This allocation cannot be reduced because funds are already spent or reversed.", "ALLOCATION_NOT_REDUCIBLE");
    }

    const refund = await LedgerTransaction.create({
      familyId: req.familyId,
      treasuryAccountId: allocation.treasuryAccountId,
      walletId: allocation.walletId,
      memberId: allocation.memberId,
      projectId: allocation.projectId,
      type: "refund",
      direction: "credit",
      amountPaise: effectiveAmountPaise,
      description: body.description || "Sankalp allocation reduced and returned to member wallet",
      status: "posted",
      postedAt: new Date(),
      referenceTransactionId: allocation._id,
      metadata: {
        requestedAmountPaise: amountPaise,
        projectSpentPaise: spentPaise
      },
      createdBy: req.user._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "treasury.project_allocation_reduced",
      entityType: "LedgerTransaction",
      entityId: String(refund._id),
      summary: `Reduced Sankalp allocation by INR ${paiseToRupees(effectiveAmountPaise)}`,
      after: {
        originalTransactionId: allocation._id,
        refundTransactionId: refund._id,
        amountPaise: effectiveAmountPaise
      },
      req
    });

    res.status(201).json({
      data: refund,
      message:
        effectiveAmountPaise < amountPaise
          ? `Only INR ${paiseToRupees(effectiveAmountPaise)} could be returned because of project spending or prior reductions.`
          : "Allocation reduced and money returned to wallet."
    });
  })
);

treasuryRoutes.post(
  "/family/:familyId/transactions/:transactionId/reverse",
  requireFamilyPermission(permissions.treasuryViewLedger),
  requirePasswordAuth,
  asyncHandler(async (req, res) => {
    if (!["owner", "admin"].includes(req.member.role)) {
      throw httpError(403, "Only owner/admin can reverse Kosh entries.", "TREASURY_REVERSAL_NOT_ALLOWED");
    }

    const transaction = await LedgerTransaction.findOne({
      _id: req.params.transactionId,
      familyId: req.familyId,
      status: "posted"
    });

    if (!transaction) {
      throw httpError(404, "Transaction not found.", "TRANSACTION_NOT_FOUND");
    }

    const existingReversal = await LedgerTransaction.findOne({
      familyId: req.familyId,
      referenceTransactionId: transaction._id,
      type: "reversal",
      status: "posted"
    });

    if (existingReversal) {
      throw httpError(400, "This transaction has already been reversed.", "TRANSACTION_ALREADY_REVERSED");
    }

    if (transaction.direction === "credit" && transaction.walletId) {
      const walletBalancePaise = await calculatePostedBalance({ familyId: req.familyId, walletId: transaction.walletId });
      if (walletBalancePaise < transaction.amountPaise) {
        throw httpError(400, "Wallet balance is not enough to reverse this credit.", "INSUFFICIENT_WALLET_BALANCE");
      }
    }

    const reversal = await LedgerTransaction.create({
      familyId: req.familyId,
      treasuryAccountId: transaction.treasuryAccountId,
      walletId: transaction.walletId,
      memberId: transaction.memberId,
      projectId: transaction.projectId,
      expenseId: transaction.expenseId,
      type: "reversal",
      direction: transaction.direction === "credit" ? "debit" : "credit",
      amountPaise: transaction.amountPaise,
      description: `Reversal: ${transaction.description || transaction.type}`,
      status: "posted",
      postedAt: new Date(),
      referenceTransactionId: transaction._id,
      metadata: {
        reversedType: transaction.type
      },
      createdBy: req.user._id
    });

    transaction.status = "reversed";
    await transaction.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "treasury.transaction_reversed",
      entityType: "LedgerTransaction",
      entityId: String(transaction._id),
      summary: `Reversed Kosh entry INR ${paiseToRupees(transaction.amountPaise)}`,
      after: {
        originalTransactionId: transaction._id,
        reversalTransactionId: reversal._id
      },
      req
    });

    res.status(201).json({ data: reversal, message: "Kosh entry reversed." });
  })
);
