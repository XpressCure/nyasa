import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { Document } from "../../models/Document.js";
import { Expense } from "../../models/Expense.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";

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

function getSafeExtension(originalName, mimeType) {
  const extension = path.extname(originalName).toLowerCase();

  if (extension && /^[a-z0-9.]+$/.test(extension)) {
    return extension;
  }

  const fallbackExtensions = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };

  return fallbackExtensions[mimeType] || ".bin";
}

documentRoutes.use(requireAuth);

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

    const uploadDir = path.resolve("uploads", String(req.familyId), "expenses", String(expense._id));
    const storedName = `${Date.now()}-${randomUUID()}${getSafeExtension(body.originalName, body.mimeType)}`;
    const storagePath = path.join(uploadDir, storedName);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(storagePath, fileBuffer);

    const document = await Document.create({
      familyId: req.familyId,
      projectId: expense.projectId,
      expenseId: expense._id,
      originalName: body.originalName,
      storedName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storagePath,
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
  requireFamilyPermission(permissions.expensesView),
  asyncHandler(async (req, res) => {
    const document = await Document.findOne({ _id: req.params.documentId, familyId: req.familyId, status: "active" });

    if (!document) {
      throw httpError(404, "Document not found.", "DOCUMENT_NOT_FOUND");
    }

    res.download(document.storagePath, document.originalName);
  })
);
