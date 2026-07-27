import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Expense } from "../../models/Expense.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { Project } from "../../models/Project.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";

export const expenseRoutes = Router();

const submitExpenseSchema = z.object({
  amountRupees: z.coerce.number().positive(),
  category: z.enum(["material", "labor", "travel", "professional_fee", "maintenance", "document", "other"]).default("other"),
  vendorName: z.string().max(120).optional(),
  expenseDate: z.string().optional(),
  description: z.string().max(500).optional()
});

const rejectExpenseSchema = z.object({
  rejectionReason: z.string().max(500).optional()
});

function serializeExpense(expense) {
  return {
    id: expense._id,
    familyId: expense.familyId,
    projectId: expense.projectId,
    amountPaise: expense.amountPaise,
    amountRupees: paiseToRupees(expense.amountPaise),
    currency: expense.currency,
    category: expense.category,
    vendorName: expense.vendorName,
    expenseDate: expense.expenseDate,
    description: expense.description,
    status: expense.status,
    submittedBy: expense.submittedBy,
    submittedAt: expense.submittedAt,
    approvedBy: expense.approvedBy,
    approvedAt: expense.approvedAt,
    rejectedBy: expense.rejectedBy,
    rejectedAt: expense.rejectedAt,
    rejectionReason: expense.rejectionReason,
    ledgerTransactionId: expense.ledgerTransactionId,
    billDocuments: expense.billDocumentIds || [],
    createdAt: expense.createdAt
  };
}

async function findProjectOrThrow({ familyId, projectId }) {
  const project = await Project.findOne({ _id: projectId, familyId });

  if (!project) {
    throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
  }

  return project;
}

async function calculateProjectAllocatedPaise({ familyId, projectId }) {
  const normalizedFamilyId =
    typeof familyId === "string" && mongoose.Types.ObjectId.isValid(familyId) ? new mongoose.Types.ObjectId(familyId) : familyId;

  const rows = await LedgerTransaction.aggregate([
    {
      $match: {
        familyId: normalizedFamilyId,
        projectId,
        type: "allocation",
        direction: "debit",
        status: "posted"
      }
    },
    {
      $group: {
        _id: "$projectId",
        amountPaise: { $sum: "$amountPaise" }
      }
    }
  ]);

  return rows[0]?.amountPaise || 0;
}

async function calculateProjectExpensePaise({ familyId, projectId, statuses }) {
  const normalizedFamilyId =
    typeof familyId === "string" && mongoose.Types.ObjectId.isValid(familyId) ? new mongoose.Types.ObjectId(familyId) : familyId;

  const rows = await Expense.aggregate([
    {
      $match: {
        familyId: normalizedFamilyId,
        projectId,
        status: { $in: statuses }
      }
    },
    {
      $group: {
        _id: "$projectId",
        amountPaise: { $sum: "$amountPaise" }
      }
    }
  ]);

  return rows[0]?.amountPaise || 0;
}

expenseRoutes.use(requireAuth);

expenseRoutes.get(
  "/family/:familyId/project/:projectId",
  requireFamilyPermission(permissions.expensesView),
  asyncHandler(async (req, res) => {
    await findProjectOrThrow({ familyId: req.familyId, projectId: req.params.projectId });

    const expenses = await Expense.find({ familyId: req.familyId, projectId: req.params.projectId })
      .populate("submittedBy", "displayName role")
      .populate("approvedBy", "displayName role")
      .populate("rejectedBy", "displayName role")
      .populate("billDocumentIds", "originalName mimeType sizeBytes category createdAt")
      .sort({ expenseDate: -1, createdAt: -1 })
      .limit(100);

    res.json({ data: expenses.map(serializeExpense) });
  })
);

expenseRoutes.post(
  "/family/:familyId/project/:projectId",
  requireFamilyPermission(permissions.expensesSubmit),
  asyncHandler(async (req, res) => {
    const project = await findProjectOrThrow({ familyId: req.familyId, projectId: req.params.projectId });
    const body = submitExpenseSchema.parse(req.body);
    const amountPaise = rupeesToPaise(body.amountRupees);

    if (amountPaise <= 0) {
      throw httpError(400, "Expense amount must be greater than zero.", "INVALID_AMOUNT");
    }

    const [allocatedPaise, committedExpensePaise] = await Promise.all([
      calculateProjectAllocatedPaise({ familyId: req.familyId, projectId: project._id }),
      calculateProjectExpensePaise({ familyId: req.familyId, projectId: project._id, statuses: ["submitted", "approved"] })
    ]);

    if (project.targetBudgetPaise > 0 && allocatedPaise < project.targetBudgetPaise) {
      throw httpError(
        400,
        "Expenses can be submitted only after the mission target budget is fully allocated.",
        "PROJECT_NOT_FULLY_FUNDED"
      );
    }

    if (committedExpensePaise + amountPaise > allocatedPaise) {
      throw httpError(400, "Expense amount exceeds the mission amount available to spend.", "PROJECT_SPEND_LIMIT_EXCEEDED");
    }

    const expense = await Expense.create({
      familyId: req.familyId,
      projectId: project._id,
      amountPaise,
      category: body.category,
      vendorName: body.vendorName,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      description: body.description,
      status: "submitted",
      submittedBy: req.member._id,
      submittedAt: new Date()
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "expense.submitted",
      entityType: "Expense",
      entityId: String(expense._id),
      summary: `Submitted expense of INR ${paiseToRupees(amountPaise)} for ${project.title}`,
      after: {
        projectId: project._id,
        amountPaise,
        status: expense.status
      },
      req
    });

    res.status(201).json({ data: serializeExpense(expense) });
  })
);

expenseRoutes.post(
  "/family/:familyId/:expenseId/approve",
  requireFamilyPermission(permissions.expensesApprove),
  asyncHandler(async (req, res) => {
    const expense = await Expense.findOne({ _id: req.params.expenseId, familyId: req.familyId });

    if (!expense) {
      throw httpError(404, "Expense not found.", "EXPENSE_NOT_FOUND");
    }

    if (expense.status !== "submitted") {
      throw httpError(400, "Only submitted expenses can be approved.", "EXPENSE_NOT_APPROVABLE");
    }

    const project = await findProjectOrThrow({ familyId: req.familyId, projectId: expense.projectId });
    const [allocatedPaise, approvedExpensePaise] = await Promise.all([
      calculateProjectAllocatedPaise({ familyId: req.familyId, projectId: project._id }),
      calculateProjectExpensePaise({ familyId: req.familyId, projectId: project._id, statuses: ["approved"] })
    ]);

    if (approvedExpensePaise + expense.amountPaise > allocatedPaise) {
      throw httpError(400, "Approving this expense would exceed the mission amount available to spend.", "PROJECT_SPEND_LIMIT_EXCEEDED");
    }

    const transaction = await LedgerTransaction.create({
      familyId: req.familyId,
      memberId: expense.submittedBy,
      projectId: project._id,
      expenseId: expense._id,
      type: "expense_debit",
      direction: "debit",
      amountPaise: expense.amountPaise,
      description: expense.description || `Approved expense for ${project.title}`,
      status: "posted",
      postedAt: new Date(),
      metadata: {
        category: expense.category,
        vendorName: expense.vendorName,
        projectTitle: project.title
      },
      createdBy: req.user._id
    });

    expense.status = "approved";
    expense.approvedBy = req.member._id;
    expense.approvedAt = new Date();
    expense.ledgerTransactionId = transaction._id;
    await expense.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "expense.approved",
      entityType: "Expense",
      entityId: String(expense._id),
      summary: `Approved expense of INR ${paiseToRupees(expense.amountPaise)} for ${project.title}`,
      after: {
        expenseId: expense._id,
        transactionId: transaction._id,
        status: expense.status
      },
      req
    });

    res.json({ data: serializeExpense(expense) });
  })
);

expenseRoutes.post(
  "/family/:familyId/:expenseId/reject",
  requireFamilyPermission(permissions.expensesApprove),
  asyncHandler(async (req, res) => {
    const body = rejectExpenseSchema.parse(req.body);
    const expense = await Expense.findOne({ _id: req.params.expenseId, familyId: req.familyId });

    if (!expense) {
      throw httpError(404, "Expense not found.", "EXPENSE_NOT_FOUND");
    }

    if (expense.status !== "submitted") {
      throw httpError(400, "Only submitted expenses can be rejected.", "EXPENSE_NOT_REJECTABLE");
    }

    expense.status = "rejected";
    expense.rejectedBy = req.member._id;
    expense.rejectedAt = new Date();
    expense.rejectionReason = body.rejectionReason || "Rejected during review";
    await expense.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "expense.rejected",
      entityType: "Expense",
      entityId: String(expense._id),
      summary: `Rejected expense of INR ${paiseToRupees(expense.amountPaise)}`,
      after: {
        expenseId: expense._id,
        status: expense.status,
        rejectionReason: expense.rejectionReason
      },
      req
    });

    res.json({ data: serializeExpense(expense) });
  })
);
