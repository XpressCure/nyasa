import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Expense } from "../../models/Expense.js";
import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { Milestone } from "../../models/Milestone.js";
import { Project } from "../../models/Project.js";
import { ProjectMember } from "../../models/ProjectMember.js";
import { ProjectUpdate } from "../../models/ProjectUpdate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";

export const projectRoutes = Router();

const createProjectSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  category: z.enum(["renovation", "education", "health", "event", "asset_maintenance", "community", "other"]).default("other"),
  status: z.enum(["draft", "proposed", "active", "implementation", "paused"]).default("active"),
  targetBudgetRupees: z.coerce.number().min(0),
  projectLeadMemberId: z.string().min(1).optional(),
  startDate: z.string().optional(),
  targetCompletionDate: z.string().optional()
});

const updateProjectSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.enum(["renovation", "education", "health", "event", "asset_maintenance", "community", "other"]).optional(),
  status: z.enum(["draft", "proposed", "active", "implementation", "paused", "completed", "archived"]).optional(),
  targetBudgetRupees: z.coerce.number().min(0).optional(),
  completionPercent: z.coerce.number().min(0).max(100).optional(),
  projectLeadMemberId: z.string().min(1).optional()
});

const milestoneSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  dueDate: z.string().optional()
});

const updateSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(2)
});

function serializeProject(project, financials = {}) {
  const allocatedPaise = financials.allocatedPaise || 0;
  const spentPaise = financials.spentPaise || 0;
  const targetBudgetPaise = project.targetBudgetPaise || 0;
  const fundingPercent = targetBudgetPaise > 0 ? Math.min(Math.round((allocatedPaise / targetBudgetPaise) * 100), 100) : 0;
  const isFullyFunded = targetBudgetPaise > 0 && allocatedPaise >= targetBudgetPaise;
  const targetRemainingPaise = Math.max(targetBudgetPaise - allocatedPaise, 0);
  const availableToSpendPaise = Math.max(allocatedPaise - spentPaise, 0);

  return {
    id: project._id,
    title: project.title,
    slug: project.slug,
    description: project.description,
    category: project.category,
    status: project.status,
    targetBudgetPaise,
    targetBudgetRupees: paiseToRupees(targetBudgetPaise),
    allocatedPaise,
    allocatedRupees: paiseToRupees(allocatedPaise),
    fundingPercent,
    isFullyFunded,
    implementationStatus: project.status === "implementation" ? "in_implementation" : isFullyFunded ? "ready_to_begin" : "funding",
    targetRemainingPaise,
    targetRemainingRupees: paiseToRupees(targetRemainingPaise),
    spentPaise,
    spentRupees: paiseToRupees(spentPaise),
    availableToSpendPaise,
    availableToSpendRupees: paiseToRupees(availableToSpendPaise),
    remainingPaise: Math.max(targetBudgetPaise - spentPaise, 0),
    remainingRupees: paiseToRupees(Math.max(targetBudgetPaise - spentPaise, 0)),
    completionPercent: project.completionPercent,
    projectLeadMember: project.projectLeadMemberId,
    startDate: project.startDate,
    targetCompletionDate: project.targetCompletionDate,
    completedAt: project.completedAt,
    createdAt: project.createdAt
  };
}

async function getProjectFinancials(familyId, projectIds) {
  const normalizedFamilyId =
    typeof familyId === "string" && mongoose.Types.ObjectId.isValid(familyId) ? new mongoose.Types.ObjectId(familyId) : familyId;

  const [ledgerRows, expenseRows] = await Promise.all([
    LedgerTransaction.aggregate([
      {
        $match: {
          familyId: normalizedFamilyId,
          projectId: { $in: projectIds },
          status: "posted"
        }
      },
      {
        $group: {
          _id: { projectId: "$projectId", type: "$type", direction: "$direction" },
          amountPaise: { $sum: "$amountPaise" }
        }
      }
    ]),
    Expense.aggregate([
      {
        $match: {
          familyId: normalizedFamilyId,
          projectId: { $in: projectIds },
          status: { $in: ["submitted", "approved"] }
        }
      },
      {
        $group: {
          _id: "$projectId",
          amountPaise: { $sum: "$amountPaise" }
        }
      }
    ])
  ]);

  const financials = ledgerRows.reduce((map, row) => {
    const projectId = String(row._id.projectId);
    const current = map.get(projectId) || { allocatedPaise: 0, spentPaise: 0 };

    if (row._id.type === "allocation" && row._id.direction === "debit") {
      current.allocatedPaise += row.amountPaise;
    }

    map.set(projectId, current);
    return map;
  }, new Map());

  for (const row of expenseRows) {
    const projectId = String(row._id);
    const current = financials.get(projectId) || { allocatedPaise: 0, spentPaise: 0 };
    current.spentPaise = row.amountPaise;
    financials.set(projectId, current);
  }

  return financials;
}

projectRoutes.use(requireAuth);

projectRoutes.get(
  "/family/:familyId",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const projects = await Project.find({ familyId: req.familyId, status: { $ne: "archived" } })
      .populate("projectLeadMemberId", "displayName role")
      .sort({ createdAt: -1 });
    const financials = await getProjectFinancials(req.familyId, projects.map((project) => project._id));

    res.json({
      data: projects.map((project) => serializeProject(project, financials.get(String(project._id))))
    });
  })
);

projectRoutes.post(
  "/family/:familyId",
  requireFamilyPermission(permissions.projectsCreate),
  asyncHandler(async (req, res) => {
    const body = createProjectSchema.parse(req.body);
    const existing = await Project.findOne({ familyId: req.familyId, slug: body.slug.toLowerCase() });

    if (existing) {
      throw httpError(409, "A mission with this slug already exists.", "PROJECT_SLUG_EXISTS");
    }

    const project = await Project.create({
      familyId: req.familyId,
      title: body.title,
      slug: body.slug.toLowerCase(),
      description: body.description,
      category: body.category,
      status: body.status,
      targetBudgetPaise: rupeesToPaise(body.targetBudgetRupees),
      projectLeadMemberId: body.projectLeadMemberId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      targetCompletionDate: body.targetCompletionDate ? new Date(body.targetCompletionDate) : undefined,
      createdBy: req.user._id
    });

    if (body.projectLeadMemberId) {
      await ProjectMember.create({
        familyId: req.familyId,
        projectId: project._id,
        memberId: body.projectLeadMemberId,
        role: "lead",
        addedBy: req.member._id
      });
    }

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "project.created",
      entityType: "Project",
      entityId: String(project._id),
      summary: `Created mission ${project.title}`,
      after: {
        title: project.title,
        status: project.status,
        targetBudgetPaise: project.targetBudgetPaise
      },
      req
    });

    res.status(201).json({ data: serializeProject(project) });
  })
);

projectRoutes.get(
  "/family/:familyId/:projectId",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId })
      .populate("projectLeadMemberId", "displayName role");

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    const [milestones, updates, financials] = await Promise.all([
      Milestone.find({ projectId: project._id }).sort({ sortOrder: 1, createdAt: 1 }),
      ProjectUpdate.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(20),
      getProjectFinancials(req.familyId, [project._id])
    ]);

    res.json({
      data: {
        project: serializeProject(project, financials.get(String(project._id))),
        milestones,
        updates
      }
    });
  })
);

projectRoutes.patch(
  "/family/:familyId/:projectId",
  requireFamilyPermission(permissions.projectsManage),
  asyncHandler(async (req, res) => {
    const body = updateProjectSchema.parse(req.body);
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    const before = {
      status: project.status,
      targetBudgetPaise: project.targetBudgetPaise,
      completionPercent: project.completionPercent,
      projectLeadMemberId: project.projectLeadMemberId
    };

    if (body.title !== undefined) project.title = body.title;
    if (body.description !== undefined) project.description = body.description;
    if (body.category !== undefined) project.category = body.category;
    if (body.status === "implementation") {
      const financials = await getProjectFinancials(req.familyId, [project._id]);
      const projectFinancials = financials.get(String(project._id));
      const allocatedPaise = projectFinancials?.allocatedPaise || 0;

      if (project.targetBudgetPaise > 0 && allocatedPaise < project.targetBudgetPaise) {
        throw httpError(400, "Mission can enter implementation only after the target budget is fully allocated.", "PROJECT_NOT_FULLY_FUNDED");
      }
    }

    if (body.status !== undefined) {
      project.status = body.status;
      if (body.status === "completed" && !project.completedAt) project.completedAt = new Date();
    }
    if (body.targetBudgetRupees !== undefined) project.targetBudgetPaise = rupeesToPaise(body.targetBudgetRupees);
    if (body.completionPercent !== undefined) project.completionPercent = body.completionPercent;
    if (body.projectLeadMemberId !== undefined) project.projectLeadMemberId = body.projectLeadMemberId;

    await project.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "project.updated",
      entityType: "Project",
      entityId: String(project._id),
      summary: `Updated mission ${project.title}`,
      before,
      after: {
        status: project.status,
        targetBudgetPaise: project.targetBudgetPaise,
        completionPercent: project.completionPercent,
        projectLeadMemberId: project.projectLeadMemberId
      },
      req
    });

    res.json({ data: serializeProject(project) });
  })
);

projectRoutes.post(
  "/family/:familyId/:projectId/milestones",
  requireFamilyPermission(permissions.projectsManage),
  asyncHandler(async (req, res) => {
    const body = milestoneSchema.parse(req.body);
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    const milestone = await Milestone.create({
      familyId: req.familyId,
      projectId: project._id,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      createdBy: req.user._id
    });

    res.status(201).json({ data: milestone });
  })
);

projectRoutes.post(
  "/family/:familyId/:projectId/updates",
  requireFamilyPermission(permissions.projectsManage),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    const update = await ProjectUpdate.create({
      familyId: req.familyId,
      projectId: project._id,
      title: body.title,
      body: body.body,
      createdBy: req.user._id
    });

    res.status(201).json({ data: update });
  })
);
