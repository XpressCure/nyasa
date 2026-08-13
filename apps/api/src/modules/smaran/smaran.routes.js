import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { SmaranContribution } from "../../models/SmaranContribution.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { permissions } from "../permissions/permissions.js";

export const smaranRoutes = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1)
});
const saveSchema = z.object({
  date: dateSchema,
  strokes: z.array(z.object({
    points: z.array(pointSchema).min(2).max(2000),
    width: z.number().min(1).max(24).default(5)
  })).max(150)
});

smaranRoutes.use(requireAuth);

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

smaranRoutes.get(
  "/family/:familyId/pages",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const dates = await SmaranContribution.aggregate([
      { $match: { familyId: req.member.familyId } },
      { $group: { _id: "$date", contributorCount: { $sum: 1 }, strokeCount: { $sum: { $size: "$strokes" } } } },
      { $sort: { _id: -1 } },
      { $limit: 45 }
    ]);
    res.json({ data: dates.map((row) => ({ date: row._id, contributorCount: row.contributorCount, strokeCount: row.strokeCount })) });
  })
);

smaranRoutes.get(
  "/family/:familyId/page/:date",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const date = dateSchema.parse(req.params.date);
    const contributions = await SmaranContribution.find({ familyId: req.familyId, date })
      .sort({ createdAt: 1 })
      .populate("memberId", "displayName photoUrl");
    res.json({
      data: {
        date,
        editable: date === todayInIndia(),
        contributions: contributions.map((item) => ({
          id: item._id,
          memberId: item.memberId?._id,
          memberName: item.memberId?.displayName || "Kul member",
          photoUrl: item.memberId?.photoUrl || "",
          isMine: String(item.memberId?._id) === String(req.member._id),
          strokes: item.strokes,
          savedAt: item.savedAt
        }))
      }
    });
  })
);

smaranRoutes.put(
  "/family/:familyId/me",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = saveSchema.parse(req.body);
    if (body.date !== todayInIndia()) {
      throw httpError(409, "Earlier Smaran pages are preserved and cannot be changed.", "SMARAN_PAGE_CLOSED");
    }
    const contribution = await SmaranContribution.findOneAndUpdate(
      { familyId: req.familyId, memberId: req.member._id, date: body.date },
      { $set: { strokes: body.strokes, savedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ data: contribution, message: "Your writing is now part of today's Smaran Pat." });
  })
);
