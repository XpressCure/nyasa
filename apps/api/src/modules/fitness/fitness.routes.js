import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { FitnessDailySummary } from "../../models/FitnessDailySummary.js";
import { FitnessPreference } from "../../models/FitnessPreference.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { permissions } from "../permissions/permissions.js";

export const fitnessRoutes = Router();

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.coerce.number().int().min(0).max(200000),
  activeMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  distanceMetres: z.coerce.number().min(0).max(500000).default(0)
});
const syncSchema = z.object({ days: z.array(daySchema).min(1).max(31) });
const preferenceSchema = z.object({
  dailyStepGoal: z.coerce.number().int().min(1000).max(50000),
  shareWithFamily: z.boolean()
});

fitnessRoutes.use(requireAuth);

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function weekWindow() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: isoDay(start), end: isoDay(end) };
}

fitnessRoutes.get(
  "/family/:familyId/me",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const { start, end } = weekWindow();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    const sinceDay = isoDay(since);
    const [preference, myDays, sharedRows, sharedPreferences] = await Promise.all([
      FitnessPreference.findOne({ familyId: req.familyId, memberId: req.member._id }),
      FitnessDailySummary.find({ familyId: req.familyId, memberId: req.member._id, date: { $gte: sinceDay } }).sort({ date: 1 }),
      FitnessDailySummary.aggregate([
        { $match: { familyId: req.member.familyId, date: { $gte: start, $lte: end } } },
        { $group: { _id: "$memberId", steps: { $sum: "$steps" } } }
      ]),
      FitnessPreference.find({ familyId: req.familyId, shareWithFamily: true }).populate("memberId", "displayName photoUrl")
    ]);
    const sharedByMember = new Map(sharedRows.map((row) => [String(row._id), row.steps]));
    const leaderboard = sharedPreferences
      .map((item) => ({
        memberId: item.memberId?._id,
        displayName: item.memberId?.displayName || "Kul member",
        photoUrl: item.memberId?.photoUrl || "",
        steps: sharedByMember.get(String(item.memberId?._id)) || 0
      }))
      .sort((a, b) => b.steps - a.steps)
      .slice(0, 10);
    const kulSteps = leaderboard.reduce((sum, row) => sum + row.steps, 0);
    const goal = preference?.dailyStepGoal || 6000;
    let streak = 0;
    for (let index = myDays.length - 1; index >= 0; index -= 1) {
      if (myDays[index].steps < goal) break;
      streak += 1;
    }
    res.json({ data: {
      preference: {
        dailyStepGoal: goal,
        shareWithFamily: preference?.shareWithFamily || false,
        connectedToHealthConnect: preference?.connectedToHealthConnect || false
      },
      days: myDays,
      streak,
      challenge: {
        title: "Nyas Kul Walk",
        subtitle: "10 lakh steps, together",
        startDate: start,
        endDate: end,
        targetSteps: 1000000,
        totalSteps: kulSteps,
        participantCount: sharedPreferences.length
      },
      leaderboard
    } });
  })
);

fitnessRoutes.post(
  "/family/:familyId/me/sync",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = syncSchema.parse(req.body);
    await Promise.all(body.days.map((day) => FitnessDailySummary.findOneAndUpdate(
      { familyId: req.familyId, memberId: req.member._id, date: day.date },
      { $set: { ...day, source: "health_connect", syncedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )));
    await FitnessPreference.findOneAndUpdate(
      { familyId: req.familyId, memberId: req.member._id },
      { $set: { connectedToHealthConnect: true } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ message: "Your activity is synced privately with Nyas." });
  })
);

fitnessRoutes.put(
  "/family/:familyId/me/preferences",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = preferenceSchema.parse(req.body);
    const preference = await FitnessPreference.findOneAndUpdate(
      { familyId: req.familyId, memberId: req.member._id },
      { $set: { ...body, consentUpdatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ data: preference, message: body.shareWithFamily ? "Kul sharing is on." : "Your activity is private." });
  })
);
