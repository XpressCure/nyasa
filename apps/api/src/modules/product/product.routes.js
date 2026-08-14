import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { FamilyAsset } from "../../models/FamilyAsset.js";
import { FamilyMoment } from "../../models/FamilyMoment.js";
import { FinancialAccount } from "../../models/FinancialAccount.js";
import { Document } from "../../models/Document.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { getDocumentObject, saveDocumentFile } from "../documents/document-storage.service.js";
import { permissions, roleHasPermission } from "../permissions/permissions.js";
import { canMemberSeeMoment, financialAccountAccess, redactFinancialAccount } from "./product-policy.js";

export const productRoutes = Router();
productRoutes.use(requireAuth);

const optionalText = (max = 1000) => z.string().trim().max(max).optional().default("");
const objectId = z.string().regex(/^[a-f\d]{24}$/i);

const assetSchema = z.object({
  title: z.string().trim().min(2).max(160),
  assetType: z.enum(["agricultural_land", "house", "plot", "commercial", "temple", "vehicle", "other"]),
  status: z.enum(["active", "under_dispute", "leased", "sold", "archived"]).optional(),
  visibility: z.enum(["family", "admins_only"]).optional(),
  state: optionalText(100), district: optionalText(100), tehsil: optionalText(100), village: optionalText(100), address: optionalText(500),
  surveyNumber: optionalText(100), khasraNumber: optionalText(100), khataNumber: optionalText(100), ulpin: optionalText(100), area: optionalText(100),
  recordedOwners: z.array(z.string().trim().min(1).max(140)).max(30).optional().default([]),
  caretaker: optionalText(140), officialPortalUrl: z.string().url().or(z.literal("")).optional().default(""), notes: optionalText(4000),
  managerMemberId: objectId.nullable().optional()
});

const verificationSchema = z.object({
  status: z.enum(["family_declared", "document_uploaded", "official_portal_checked", "needs_review"]),
  sourceName: optionalText(140), sourceUrl: z.string().url().or(z.literal("")).optional().default(""), reference: optionalText(200), note: optionalText(1000)
});

const momentSchema = z.object({
  title: z.string().trim().min(2).max(160), story: optionalText(5000), eventDate: z.coerce.date(), location: optionalText(200),
  category: z.enum(["celebration", "festival", "wedding", "village_visit", "milestone", "memorial", "everyday", "other"]).optional(),
  visibility: z.enum(["family", "selected_members", "private"]).optional(),
  selectedMemberIds: z.array(objectId).max(100).optional().default([]), taggedMemberIds: z.array(objectId).max(100).optional().default([]),
  photos: z.array(z.object({ url: z.string().url(), caption: optionalText(300) })).max(20).optional().default([])
});

const accountSchema = z.object({
  nickname: z.string().trim().min(2).max(100), institutionName: z.string().trim().min(2).max(140),
  accountType: z.enum(["savings", "current", "fixed_deposit", "loan", "investment", "insurance", "pension", "other"]),
  maskedNumber: z.string().trim().regex(/^$|^[A-Za-z0-9*Xx-]{2,12}$/).optional().default(""),
  balanceRupees: z.coerce.number().nonnegative().max(1_000_000_000_000).nullable().optional(),
  sharingScope: z.enum(["only_me", "selected_members", "family_summary"]).optional(),
  sharedWithMemberIds: z.array(objectId).max(20).optional().default([]), notes: optionalText(1000)
});

const photoUploadSchema = z.object({
  originalName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce.number().positive().max(8 * 1024 * 1024),
  dataBase64: z.string().min(1),
  caption: optionalText(300)
});

productRoutes.get("/families/:familyId/assets", requireFamilyPermission(permissions.assetsView), asyncHandler(async (req, res) => {
  const query = { familyId: req.familyId, status: { $ne: "archived" } };
  if (!roleHasPermission(req.member.role, permissions.assetsManage)) query.visibility = "family";
  const assets = await FamilyAsset.find(query).sort({ updatedAt: -1 }).lean();
  res.json({ data: assets });
}));

productRoutes.post("/families/:familyId/assets", requireFamilyPermission(permissions.assetsManage), asyncHandler(async (req, res) => {
  const body = assetSchema.parse(req.body);
  const asset = await FamilyAsset.create({ ...body, familyId: req.familyId, createdByMemberId: req.member._id });
  await writeAuditLog({ familyId: req.familyId, actorUserId: req.user._id, actorMemberId: req.member._id, action: "asset.created", entityType: "FamilyAsset", entityId: String(asset._id), summary: `Added family asset ${asset.title}`, after: { assetType: asset.assetType, visibility: asset.visibility }, req });
  res.status(201).json({ data: asset });
}));

productRoutes.patch("/families/:familyId/assets/:assetId", requireFamilyPermission(permissions.assetsManage), asyncHandler(async (req, res) => {
  const body = assetSchema.partial().parse(req.body);
  const asset = await FamilyAsset.findOneAndUpdate({ _id: req.params.assetId, familyId: req.familyId }, { $set: body }, { new: true, runValidators: true });
  if (!asset) throw httpError(404, "Family asset not found.", "ASSET_NOT_FOUND");
  await writeAuditLog({ familyId: req.familyId, actorUserId: req.user._id, actorMemberId: req.member._id, action: "asset.updated", entityType: "FamilyAsset", entityId: String(asset._id), summary: `Updated family asset ${asset.title}`, after: body, req });
  res.json({ data: asset });
}));

productRoutes.post("/families/:familyId/assets/:assetId/verifications", requireFamilyPermission(permissions.assetsManage), asyncHandler(async (req, res) => {
  const body = verificationSchema.parse(req.body);
  const asset = await FamilyAsset.findOne({ _id: req.params.assetId, familyId: req.familyId });
  if (!asset) throw httpError(404, "Family asset not found.", "ASSET_NOT_FOUND");
  asset.verificationStatus = body.status;
  asset.verificationHistory.push({ ...body, checkedAt: new Date(), checkedByMemberId: req.member._id });
  await asset.save();
  await writeAuditLog({ familyId: req.familyId, actorUserId: req.user._id, actorMemberId: req.member._id, action: "asset.verification_recorded", entityType: "FamilyAsset", entityId: String(asset._id), summary: `Recorded ${body.status} verification for ${asset.title}`, after: body, req });
  res.status(201).json({ data: asset });
}));

productRoutes.get("/families/:familyId/moments", requireFamilyPermission(permissions.momentsView), asyncHandler(async (req, res) => {
  const moments = await FamilyMoment.find({ familyId: req.familyId, status: "active" }).sort({ eventDate: -1, createdAt: -1 }).lean();
  res.json({ data: moments.filter((moment) => canMemberSeeMoment(moment, req.member._id)) });
}));

productRoutes.post("/families/:familyId/moments", requireFamilyPermission(permissions.momentsCreate), asyncHandler(async (req, res) => {
  const body = momentSchema.parse(req.body);
  if (body.visibility === "selected_members" && body.selectedMemberIds.length === 0) throw httpError(400, "Choose at least one family member.", "MOMENT_AUDIENCE_REQUIRED");
  const moment = await FamilyMoment.create({ ...body, familyId: req.familyId, createdByMemberId: req.member._id });
  await writeAuditLog({ familyId: req.familyId, actorUserId: req.user._id, actorMemberId: req.member._id, action: "moment.created", entityType: "FamilyMoment", entityId: String(moment._id), summary: `Shared family moment ${moment.title}`, after: { visibility: moment.visibility, photoCount: moment.photos.length }, req });
  res.status(201).json({ data: moment });
}));

productRoutes.patch("/families/:familyId/moments/:momentId", requireFamilyPermission(permissions.momentsCreate), asyncHandler(async (req, res) => {
  const body = momentSchema.partial().parse(req.body);
  const query = { _id: req.params.momentId, familyId: req.familyId };
  if (!roleHasPermission(req.member.role, permissions.workspaceManage)) query.createdByMemberId = req.member._id;
  const moment = await FamilyMoment.findOneAndUpdate(query, { $set: body }, { new: true, runValidators: true });
  if (!moment) throw httpError(404, "Moment not found or cannot be edited.", "MOMENT_NOT_FOUND");
  res.json({ data: moment });
}));

productRoutes.post("/families/:familyId/moments/:momentId/photos", requireFamilyPermission(permissions.momentsCreate), asyncHandler(async (req, res) => {
  const body = photoUploadSchema.parse(req.body);
  const moment = await FamilyMoment.findOne({ _id: req.params.momentId, familyId: req.familyId, createdByMemberId: req.member._id, status: "active" });
  if (!moment) throw httpError(404, "Moment not found or cannot be edited.", "MOMENT_NOT_FOUND");
  if (moment.photos.length >= 20) throw httpError(400, "A moment can contain up to 20 photos.", "MOMENT_PHOTO_LIMIT");
  const fileBuffer = Buffer.from(body.dataBase64, "base64");
  if (fileBuffer.length !== body.sizeBytes || fileBuffer.length > 8 * 1024 * 1024) throw httpError(400, "Uploaded photo size is invalid.", "INVALID_UPLOAD_SIZE");
  const stored = await saveDocumentFile({ familyId: req.familyId, folder: `moments/${moment._id}`, originalName: body.originalName, mimeType: body.mimeType, fileBuffer });
  const document = await Document.create({ familyId: req.familyId, originalName: body.originalName, storedName: stored.storedName, mimeType: body.mimeType, sizeBytes: body.sizeBytes, storageDriver: stored.storageDriver, storagePath: stored.storagePath, storageKey: stored.storageKey, bucketName: stored.bucketName, region: stored.region, category: "moment_photo", uploadedBy: req.member._id });
  moment.photos.push({ documentId: document._id, caption: body.caption });
  await moment.save();
  await writeAuditLog({ familyId: req.familyId, actorUserId: req.user._id, actorMemberId: req.member._id, action: "moment.photo_uploaded", entityType: "FamilyMoment", entityId: String(moment._id), summary: `Added a photo to ${moment.title}`, after: { documentId: document._id, sizeBytes: document.sizeBytes }, req });
  res.status(201).json({ data: moment });
}));

productRoutes.get("/families/:familyId/moments/:momentId/photos/:documentId", requireFamilyPermission(permissions.momentsView), asyncHandler(async (req, res) => {
  const moment = await FamilyMoment.findOne({ _id: req.params.momentId, familyId: req.familyId, status: "active" }).lean();
  if (!moment || !canMemberSeeMoment(moment, req.member._id) || !moment.photos.some((photo) => String(photo.documentId) === req.params.documentId)) throw httpError(404, "Moment photo not found.", "MOMENT_PHOTO_NOT_FOUND");
  const document = await Document.findOne({ _id: req.params.documentId, familyId: req.familyId, category: "moment_photo", status: "active" });
  if (!document) throw httpError(404, "Moment photo not found.", "MOMENT_PHOTO_NOT_FOUND");
  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${document.originalName.replaceAll("\"", "")}"`);
  if (document.storageDriver === "s3") {
    const object = await getDocumentObject(document);
    object.Body.pipe(res);
    return;
  }
  res.sendFile(document.storagePath);
}));

productRoutes.get("/families/:familyId/financial-accounts", requireFamilyPermission(permissions.financeAccountsUse), asyncHandler(async (req, res) => {
  const accounts = await FinancialAccount.find({ familyId: req.familyId, status: "active", $or: [
    { ownerUserId: req.user._id }, { sharingScope: "family_summary" }, { sharingScope: "selected_members", sharedWithMemberIds: req.member._id }
  ] }).sort({ updatedAt: -1 }).lean();
  const data = accounts.map((account) => redactFinancialAccount(account, financialAccountAccess(account, req.user._id, req.member._id))).filter(Boolean);
  res.json({ data, integration: { mode: "consent_ready", liveProviderConfigured: false, message: "Live bank data requires an RBI-regulated Account Aggregator partner and explicit user consent." } });
}));

productRoutes.post("/families/:familyId/financial-accounts", requireFamilyPermission(permissions.financeAccountsUse), asyncHandler(async (req, res) => {
  const body = accountSchema.parse(req.body);
  const account = await FinancialAccount.create({ ...body, balancePaise: body.balanceRupees == null ? undefined : Math.round(body.balanceRupees * 100), balanceRupees: undefined, balanceAsOf: body.balanceRupees == null ? undefined : new Date(), familyId: req.familyId, ownerUserId: req.user._id, ownerMemberId: req.member._id, source: "manual", connectionStatus: "manual" });
  await writeAuditLog({ familyId: req.familyId, actorUserId: req.user._id, actorMemberId: req.member._id, action: "financial_account.added", entityType: "FinancialAccount", entityId: String(account._id), summary: `Added a private ${account.accountType} account`, after: { institutionName: account.institutionName, sharingScope: account.sharingScope, source: account.source }, req });
  res.status(201).json({ data: account });
}));

productRoutes.patch("/families/:familyId/financial-accounts/:accountId", requireFamilyPermission(permissions.financeAccountsUse), asyncHandler(async (req, res) => {
  const body = accountSchema.partial().parse(req.body);
  const update = { ...body };
  if (Object.hasOwn(body, "balanceRupees")) { update.balancePaise = body.balanceRupees == null ? undefined : Math.round(body.balanceRupees * 100); update.balanceAsOf = new Date(); delete update.balanceRupees; }
  const account = await FinancialAccount.findOneAndUpdate({ _id: req.params.accountId, familyId: req.familyId, ownerUserId: req.user._id }, { $set: update }, { new: true, runValidators: true });
  if (!account) throw httpError(404, "Financial account not found.", "FINANCIAL_ACCOUNT_NOT_FOUND");
  res.json({ data: account });
}));
