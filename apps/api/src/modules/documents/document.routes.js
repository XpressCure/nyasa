import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Document } from "../../models/Document.js";
import { Expense } from "../../models/Expense.js";
import { Project } from "../../models/Project.js";
import { ProjectMember } from "../../models/ProjectMember.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions, roleHasPermission } from "../permissions/permissions.js";
import { getDocumentObject, saveDocumentFile } from "./document-storage.service.js";

export const documentRoutes = Router();

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const uploadExpenseDocumentSchema = z.object({
  originalName: z.string().min(1).max(180),
  mimeType: z.enum(allowedMimeTypes),
  sizeBytes: z.coerce.number().positive().max(MAX_UPLOAD_BYTES),
  dataBase64: z.string().min(1)
});

function serializeDocument(document) {
  return {
    id: document._id,
    familyId: document.familyId,
    projectId: document.projectId,
    expenseId: document.expenseId,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    category: document.category,
    uploadedBy: document.uploadedBy,
    createdAt: document.createdAt
  };
}

function streamDocument(document, res, disposition = "attachment") {
  if (document.storageDriver === "s3") {
    return getDocumentObject(document).then((s3Object) => {
      res.setHeader("Content-Type", document.mimeType);
      res.setHeader("Content-Disposition", `${disposition}; filename="${document.originalName.replaceAll("\"", "")}"`);
      s3Object.Body.pipe(res);
    });
  }

  if (disposition === "inline") {
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.originalName.replaceAll("\"", "")}"`);
    res.sendFile(document.storagePath);
    return null;
  }

  res.download(document.storagePath, document.originalName);
  return null;
}

documentRoutes.get(
  "/family/:familyId/:documentId/member-photo",
  asyncHandler(async (req, res) => {
    const document = await Document.findOne({
      _id: req.params.documentId,
      familyId: req.params.familyId,
      category: "member_photo",
      status: "active"
    });

    if (!document) {
      throw httpError(404, "Member photo not found.", "MEMBER_PHOTO_NOT_FOUND");
    }

    await streamDocument(document, res, "inline");
  })
);

documentRoutes.use(requireAuth);

async function assertCanUploadProjectDocument(req, project) {
  if (String(project.createdBy || "") === String(req.user._id || "")) return;
  if (roleHasPermission(req.member.role, permissions.projectsManage)) return;

  const assignedDirectly = [project.projectLeadMemberId, project.auditorMemberId, project.implementationLeadMemberId].some(
    (memberId) => String(memberId || "") === String(req.member._id)
  );

  if (assignedDirectly) return;

  const assignment = await ProjectMember.findOne({
    familyId: req.familyId,
    projectId: project._id,
    memberId: req.member._id,
    role: { $in: ["project_manager", "progress_auditor", "implementation_lead", "lead"] },
    status: "active"
  });

  if (assignment) return;

  throw httpError(403, "You can upload Sankalp documents only for assigned Sankalp.", "PROJECT_DOCUMENT_UPLOAD_NOT_ALLOWED");
}

documentRoutes.post(
  "/family/:familyId/projects/:projectId",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const body = uploadExpenseDocumentSchema.parse(req.body);
    const project = await Project.findOne({ _id: req.params.projectId, familyId: req.familyId });

    if (!project) {
      throw httpError(404, "Sankalp not found.", "PROJECT_NOT_FOUND");
    }

    await assertCanUploadProjectDocument(req, project);

    const fileBuffer = Buffer.from(body.dataBase64, "base64");

    if (fileBuffer.length !== body.sizeBytes || fileBuffer.length > MAX_UPLOAD_BYTES) {
      throw httpError(400, "Uploaded file size is invalid.", "INVALID_UPLOAD_SIZE");
    }

    const storedFile = await saveDocumentFile({
      familyId: req.familyId,
      folder: `projects/${project._id}`,
      originalName: body.originalName,
      mimeType: body.mimeType,
      fileBuffer
    });

    const document = await Document.create({
      familyId: req.familyId,
      projectId: project._id,
      originalName: body.originalName,
      storedName: storedFile.storedName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageDriver: storedFile.storageDriver,
      storagePath: storedFile.storagePath,
      storageKey: storedFile.storageKey,
      bucketName: storedFile.bucketName,
      region: storedFile.region,
      category: "project_document",
      uploadedBy: req.member._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "document.project_document_uploaded",
      entityType: "Document",
      entityId: String(document._id),
      summary: `Uploaded Sankalp document ${document.originalName}`,
      after: {
        projectId: project._id,
        documentId: document._id,
        originalName: document.originalName,
        sizeBytes: document.sizeBytes
      },
      req
    });

    res.status(201).json({ data: serializeDocument(document) });
  })
);

documentRoutes.post(
  "/family/:familyId/expenses/:expenseId",
  requireFamilyPermission(permissions.expensesSubmit),
  asyncHandler(async (req, res) => {
    const body = uploadExpenseDocumentSchema.parse(req.body);
    const expense = await Expense.findOne({ _id: req.params.expenseId, familyId: req.familyId });

    if (!expense) {
      throw httpError(404, "Expense not found.", "EXPENSE_NOT_FOUND");
    }

    if (expense.status !== "submitted") {
      throw httpError(400, "Bills can be attached only while an expense is submitted for review.", "EXPENSE_NOT_EDITABLE");
    }

    const fileBuffer = Buffer.from(body.dataBase64, "base64");

    if (fileBuffer.length !== body.sizeBytes || fileBuffer.length > MAX_UPLOAD_BYTES) {
      throw httpError(400, "Uploaded file size is invalid.", "INVALID_UPLOAD_SIZE");
    }

    const storedFile = await saveDocumentFile({
      familyId: req.familyId,
      expenseId: expense._id,
      originalName: body.originalName,
      mimeType: body.mimeType,
      fileBuffer
    });

    const document = await Document.create({
      familyId: req.familyId,
      projectId: expense.projectId,
      expenseId: expense._id,
      originalName: body.originalName,
      storedName: storedFile.storedName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageDriver: storedFile.storageDriver,
      storagePath: storedFile.storagePath,
      storageKey: storedFile.storageKey,
      bucketName: storedFile.bucketName,
      region: storedFile.region,
      category: "expense_bill",
      uploadedBy: req.member._id
    });

    expense.billDocumentIds.push(document._id);
    await expense.save();

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "document.expense_bill_uploaded",
      entityType: "Document",
      entityId: String(document._id),
      summary: `Uploaded bill ${document.originalName}`,
      after: {
        expenseId: expense._id,
        documentId: document._id,
        originalName: document.originalName,
        sizeBytes: document.sizeBytes
      },
      req
    });

    res.status(201).json({ data: serializeDocument(document) });
  })
);

documentRoutes.get(
  "/family/:familyId/:documentId/download",
  requireFamilyPermission(permissions.projectsView),
  asyncHandler(async (req, res) => {
    const document = await Document.findOne({ _id: req.params.documentId, familyId: req.familyId, status: "active" });

    if (!document) {
      throw httpError(404, "Document not found.", "DOCUMENT_NOT_FOUND");
    }

    await streamDocument(document, res);
  })
);
