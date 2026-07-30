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
import { permissions, roleHasPermission } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";

export const projectRoutes = Router();

const createProjectSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  category: z.enum(["renovation", "education", "health", "event", "asset_maintenance", "community", "other"]).default("other"),
  projectType: z.enum(["implementation", "research", "business_study", "asset_management", "community", "event", "other"]).default("implementation"),
  status: z.enum(["draft", "proposed", "active", "estimate_received", "fundraising", "implementation", "paused"]).default("draft"),
  lifecycleStage: z
    .enum(["concept", "research", "estimate_pending", "estimate_received", "fundraising", "ready_for_implementation", "implementation", "paused"])
    .default("concept"),
  rules: z.string().optional(),
  budgetRequired: z.boolean().default(true),
  tentativeBudgetRupees: z.coerce.number().min(0).default(0),
  estimatedBudgetRupees: z.coerce.number().min(0).optional(),
  targetBudgetRupees: z.coerce.number().min(0).optional(),
  projectLeadMemberId: z.string().min(1).optional(),
  auditorMemberId: z.string().min(1).optional(),
  implementationLeadMemberId: z.string().min(1).optional(),
  startDate: z.string().optional(),
  targetCompletionDate: z.string().optional()
});

const updateProjectSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.enum(["renovation", "education", "health", "event", "asset_maintenance", "community", "other"]).optional(),
  projectType: z.enum(["implementation", "research", "business_study", "asset_management", "community", "event", "other"]).optional(),
  status: z.enum(["draft", "proposed", "active", "estimate_received", "fundraising", "implementation", "paused", "completed", "archived"]).optional(),
  lifecycleStage: z
    .enum([
      "concept",
      "research",
      "estimate_pending",
      "estimate_received",
      "fundraising",
      "ready_for_implementation",
      "implementation",
      "completed",
      "paused",
      "archived"
    ])
    .optional(),
  rules: z.string().optional(),
  budgetRequired: z.boolean().optional(),
  tentativeBudgetRupees: z.coerce.number().min(0).optional(),
  estimatedBudgetRupees: z.coerce.number().min(0).optional(),
  targetBudgetRupees: z.coerce.number().min(0).optional(),
  completionPercent: z.coerce.number().min(0).max(100).optional(),
  projectLeadMemberId: z.string().min(1).optional(),
  auditorMemberId: z.string().min(1).optional(),
  implementationLeadMemberId: z.string().min(1).optional(),
  startDate: z.string().optional(),
  targetCompletionDate: z.string().optional()
});

const milestoneSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  budgetRupees: z.coerce.number().min(0).optional()
});

const updateMilestoneSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]).optional(),
  budgetRupees: z.coerce.number().min(0).optional(),
  actualSpendRupees: z.coerce.number().min(0).optional(),
  completionNote: z.string().optional()
});

const updateSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(2),
  updateType: z.enum(["note", "research", "estimate", "progress", "risk", "decision", "completion"]).default("note"),
  milestoneId: z.string().optional(),
  progressPercent: z.coerce.number().min(0).max(100).optional()
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
    projectType: project.projectType,
    status: project.status,
    isDraft: project.status === "draft",
    isLive: project.status !== "draft" && project.status !== "archived",
    lifecycleStage: project.lifecycleStage,
    rules: project.rules,
    budgetRequired: project.budgetRequired,
    tentativeBudgetPaise: project.tentativeBudgetPaise || 0,
    tentativeBudgetRupees: paiseToRupees(project.tentativeBudgetPaise || 0),
    estimatedBudgetPaise: project.estimatedBudgetPaise || 0,
    estimatedBudgetRupees: paiseToRupees(project.estimatedBudgetPaise || 0),
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
    auditorMember: project.auditorMemberId,
    implementationLeadMember: project.implementationLeadMemberId,
    startDate: project.startDate,
    targetCompletionDate: project.targetCompletionDate,
    estimateReceivedAt: project.estimateReceivedAt,
    fundraisingStartedAt: project.fundraisingStartedAt,
    implementationStartedAt: project.implementationStartedAt,
    completedAt: project.completedAt,
    createdAt: project.createdAt
  };
}

function lifecycleFromStatus(status) {
  const statusMap = {
    draft: "concept",
    proposed: "estimate_pending",
    active: "fundraising",
    estimate_received: "estimate_received",
    fundraising: "fundraising",
    implementation: "implementation",
    paused: "paused",
    completed: "completed",
    archived: "archived"
  };

  return statusMap[status] || "concept";
}

function statusFromLifecycle(stage) {
  const stageMap = {
    concept: "proposed",
    research: "proposed",
    estimate_pending: "proposed",
    estimate_received: "estimate_received",
    fundraising: "fundraising",
    ready_for_implementation: "active",
    implementation: "implementation",
    completed: "completed",
    paused: "paused",
    archived: "archived"
  };

  return stageMap[stage] || "proposed";
}

async function upsertProjectMember({ familyId, projectId, memberId, role, addedBy }) {
  if (!memberId) return null;

  return ProjectMember.findOneAndUpdate(
    { projectId, memberId },
    {
      familyId,
      projectId,
      memberId,
      role,
      status: "active",
      addedBy,
      addedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function assertCanManageProject(req, project) {
  if (String(project.createdBy || "") === String(req.user._id || "")) return;

  if (roleHasPermission(req.member.role, permissions.projectsManage)) return;

  const assignedDirectly = [project.projectLeadMemberId, project.auditorMemberId, project.implementationLeadMemberId].some(
    (memberId) => String(memberId || "") === String(req.member._id)
  );

  if (roleHasPermission(req.member.role, permissions.projectsManageAssigned) && assignedDirectly) return;

  const assignment = await ProjectMember.findOne({
    familyId: req.familyId,
    projectId: project._id,
    memberId: req.member._id,
    role: { $in: ["project_manager", "progress_auditor", "implementation_lead", "lead"] },
    status: "active"
  });

  if (roleHasPermission(req.member.role, permissions.projectsManageAssigned) && assignment) return;

  throw httpError(403, "You can manage only Sankalp assigned to you.", "PROJECT_ASSIGNMENT_REQUIRED");
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
    const canSeeDrafts = roleHasPermission(req.member.role, permissions.projectsManage);
    const projectQuery = canSeeDrafts
      ? { familyId: req.familyId, status: { $ne: "archived" } }
      : {
          familyId: req.familyId,
          status: { $ne: "archived" },
          $or: [
            { status: { $ne: "draft" } },
            { createdBy: req.user._id },
            { projectLeadMemberId: req.member._id },
            { auditorMemberId: req.member._id },
            { implementationLeadMemberId: req.member._id }
          ]
        };

    const projects = await Project.find(projectQuery)
      .populate("projectLeadMemberId", "displayName role")
      .populate("auditorMemberId", "displayName role")
      .populate("implementationLeadMemberId", "displayName role")
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

    const tentativeBudgetPaise = rupeesToPaise(body.tentativeBudgetRupees || body.targetBudgetRupees || 0);
    const estimatedBudgetPaise =
      body.estimatedBudgetRupees !== undefined ? rupeesToPaise(body.estimatedBudgetRupees) : 0;
    const targetBudgetPaise = body.budgetRequired
      ? estimatedBudgetPaise || rupeesToPaise(body.targetBudgetRupees || body.tentativeBudgetRupees || 0)
      : 0;
    const lifecycleStage = body.lifecycleStage || lifecycleFromStatus(body.status);

    const project = await Project.create({
      familyId: req.familyId,
      title: body.title,
      slug: body.slug.toLowerCase(),
      description: body.description,
      category: body.category,
      projectType: body.projectType,
      status: body.status || statusFromLifecycle(lifecycleStage),
      lifecycleStage,
      rules: body.rules,
      budgetRequired: body.budgetRequired,
      tentativeBudgetPaise,
      estimatedBudgetPaise,
      targetBudgetPaise,
      projectLeadMemberId: body.projectLeadMemberId,
      auditorMemberId: body.auditorMemberId,
      implementationLeadMemberId: body.implementationLeadMemberId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      targetCompletionDate: body.targetCompletionDate ? new Date(body.targetCompletionDate) : undefined,
      createdBy: req.user._id
    });

    await Promise.all([
      upsertProjectMember({
        familyId: req.familyId,
        projectId: project._id,
        memberId: body.projectLeadMemberId,
        role: "project_manager",
        addedBy: req.member._id
      }),
      upsertProjectMember({
        familyId: req.familyId,
        projectId: project._id,
        memberId: body.auditorMemberId,
        role: "progress_auditor",
        addedBy: req.member._id
      }),
      upsertProjectMember({
        familyId: req.familyId,
        projectId: project._id,
        memberId: body.implementationLeadMemberId,
        role: "implementation_lead",
        addedBy: req.member._id
      })
    ]);

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
        lifecycleStage: project.lifecycleStage,
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
      .populate("projectLeadMemberId", "displayName role")
      .populate("auditorMemberId", "displayName role")
      .populate("implementationLeadMemberId", "displayName role");

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    if (project.status === "draft") {
      await assertCanManageProject(req, project);
    }

    const [milestones, updates, projectMembers, financials] = await Promise.all([
      Milestone.find({ projectId: project._id }).sort({ sortOrder: 1, createdAt: 1 }),
      ProjectUpdate.find({ projectId: project._id })
        .populate("createdByMember", "displayName role")
        .populate("milestoneId", "title status")
        .sort({ createdAt: -1 })
        .limit(20),
      ProjectMember.find({ projectId: project._id, status: "active" }).populate("memberId", "displayName role"),
      getProjectFinancials(req.familyId, [project._id])
    ]);

    res.json({
      data: {
        project: serializeProject(project, financials.get(String(project._id))),
        milestones,
        updates,
        projectMembers
      }
    });
  })
);

projectRoutes.patch(
  "/family/:familyId/:projectId",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const body = updateProjectSchema.parse(req.body);
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    await assertCanManageProject(req, project);

    const before = {
      status: project.status,
      lifecycleStage: project.lifecycleStage,
      targetBudgetPaise: project.targetBudgetPaise,
      completionPercent: project.completionPercent,
      projectLeadMemberId: project.projectLeadMemberId,
      auditorMemberId: project.auditorMemberId,
      implementationLeadMemberId: project.implementationLeadMemberId
    };

    if (body.title !== undefined) project.title = body.title;
    if (body.description !== undefined) project.description = body.description;
    if (body.category !== undefined) project.category = body.category;
    if (body.projectType !== undefined) project.projectType = body.projectType;
    if (body.rules !== undefined) project.rules = body.rules;
    if (body.budgetRequired !== undefined) project.budgetRequired = body.budgetRequired;
    if (body.tentativeBudgetRupees !== undefined) project.tentativeBudgetPaise = rupeesToPaise(body.tentativeBudgetRupees);
    if (body.estimatedBudgetRupees !== undefined) {
      project.estimatedBudgetPaise = rupeesToPaise(body.estimatedBudgetRupees);
      project.targetBudgetPaise = project.budgetRequired ? project.estimatedBudgetPaise : 0;
      project.estimateReceivedAt = project.estimateReceivedAt || new Date();
    }
    if (body.targetBudgetRupees !== undefined) project.targetBudgetPaise = rupeesToPaise(body.targetBudgetRupees);
    if (body.startDate !== undefined) project.startDate = body.startDate ? new Date(body.startDate) : undefined;
    if (body.targetCompletionDate !== undefined) {
      project.targetCompletionDate = body.targetCompletionDate ? new Date(body.targetCompletionDate) : undefined;
    }

    const nextLifecycleStage = body.lifecycleStage || (body.status ? lifecycleFromStatus(body.status) : project.lifecycleStage);
    const enteringImplementation = body.status === "implementation" || body.lifecycleStage === "implementation";

    if (enteringImplementation && project.budgetRequired) {
      const financials = await getProjectFinancials(req.familyId, [project._id]);
      const projectFinancials = financials.get(String(project._id));
      const allocatedPaise = projectFinancials?.allocatedPaise || 0;

      if (project.targetBudgetPaise > 0 && allocatedPaise < project.targetBudgetPaise) {
        throw httpError(400, "Mission can enter implementation only after the target budget is fully allocated.", "PROJECT_NOT_FULLY_FUNDED");
      }
    }

    if (body.status !== undefined) {
      project.status = body.status;
    }
    if (body.lifecycleStage !== undefined) {
      project.lifecycleStage = body.lifecycleStage;
      project.status = body.status || statusFromLifecycle(body.lifecycleStage);
    } else if (body.status !== undefined) {
      project.lifecycleStage = nextLifecycleStage;
    }
    if (["fundraising", "ready_for_implementation"].includes(project.lifecycleStage)) {
      project.fundraisingStartedAt = project.fundraisingStartedAt || new Date();
    }
    if (project.lifecycleStage === "implementation") {
      project.implementationStartedAt = project.implementationStartedAt || new Date();
    }
    if (["completed"].includes(project.status) || project.lifecycleStage === "completed") {
      project.completedAt = project.completedAt || new Date();
      project.completionPercent = 100;
    }
    if (body.completionPercent !== undefined) project.completionPercent = body.completionPercent;
    if (body.projectLeadMemberId !== undefined) project.projectLeadMemberId = body.projectLeadMemberId;
    if (body.auditorMemberId !== undefined) project.auditorMemberId = body.auditorMemberId;
    if (body.implementationLeadMemberId !== undefined) project.implementationLeadMemberId = body.implementationLeadMemberId;

    await project.save();

    await Promise.all([
      upsertProjectMember({
        familyId: req.familyId,
        projectId: project._id,
        memberId: project.projectLeadMemberId,
        role: "project_manager",
        addedBy: req.member._id
      }),
      upsertProjectMember({
        familyId: req.familyId,
        projectId: project._id,
        memberId: project.auditorMemberId,
        role: "progress_auditor",
        addedBy: req.member._id
      }),
      upsertProjectMember({
        familyId: req.familyId,
        projectId: project._id,
        memberId: project.implementationLeadMemberId,
        role: "implementation_lead",
        addedBy: req.member._id
      })
    ]);

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
        lifecycleStage: project.lifecycleStage,
        targetBudgetPaise: project.targetBudgetPaise,
        completionPercent: project.completionPercent,
        projectLeadMemberId: project.projectLeadMemberId,
        auditorMemberId: project.auditorMemberId,
        implementationLeadMemberId: project.implementationLeadMemberId
      },
      req
    });

    res.json({ data: serializeProject(project) });
  })
);

projectRoutes.post(
  "/family/:familyId/:projectId/milestones",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const body = milestoneSchema.parse(req.body);
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    await assertCanManageProject(req, project);

    const milestone = await Milestone.create({
      familyId: req.familyId,
      projectId: project._id,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      budgetPaise: body.budgetRupees !== undefined ? rupeesToPaise(body.budgetRupees) : 0,
      createdBy: req.user._id
    });

    res.status(201).json({ data: milestone });
  })
);

projectRoutes.patch(
  "/family/:familyId/:projectId/milestones/:milestoneId",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const body = updateMilestoneSchema.parse(req.body);
    const milestone = await Milestone.findOne({
      _id: req.params.milestoneId,
      projectId: req.params.projectId,
      familyId: req.familyId
    });

    if (!milestone) {
      throw httpError(404, "Milestone not found.", "MILESTONE_NOT_FOUND");
    }

    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });
    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }
    await assertCanManageProject(req, project);

    if (body.title !== undefined) milestone.title = body.title;
    if (body.description !== undefined) milestone.description = body.description;
    if (body.dueDate !== undefined) milestone.dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
    if (body.budgetRupees !== undefined) milestone.budgetPaise = rupeesToPaise(body.budgetRupees);
    if (body.actualSpendRupees !== undefined) milestone.actualSpendPaise = rupeesToPaise(body.actualSpendRupees);
    if (body.completionNote !== undefined) milestone.completionNote = body.completionNote;
    if (body.status !== undefined) {
      milestone.status = body.status;
      if (body.status === "completed") {
        milestone.completedAt = milestone.completedAt || new Date();
        milestone.completedBy = req.member._id;
      }
    }

    await milestone.save();

    res.json({ data: milestone });
  })
);

projectRoutes.post(
  "/family/:familyId/:projectId/updates",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });

    if (!project) {
      throw httpError(404, "Mission not found.", "PROJECT_NOT_FOUND");
    }

    await assertCanManageProject(req, project);

    const update = await ProjectUpdate.create({
      familyId: req.familyId,
      projectId: project._id,
      milestoneId: body.milestoneId,
      updateType: body.updateType,
      title: body.title,
      body: body.body,
      progressPercent: body.progressPercent,
      createdByMember: req.member._id,
      createdBy: req.user._id
    });

    if (body.progressPercent !== undefined && body.progressPercent > project.completionPercent) {
      project.completionPercent = body.progressPercent;
      await project.save();
    }

    res.status(201).json({ data: update });
  })
);
