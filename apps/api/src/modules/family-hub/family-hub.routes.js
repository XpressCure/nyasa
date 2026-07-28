import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { FamilyCalendarEvent } from "../../models/FamilyCalendarEvent.js";
import { FamilyHistoryEvent } from "../../models/FamilyHistoryEvent.js";
import { FamilyMember } from "../../models/FamilyMember.js";
import { WeeklyFeature } from "../../models/WeeklyFeature.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";

export const familyHubRoutes = Router();

const calendarEventSchema = z.object({
  title: z.string().min(2),
  eventType: z.enum(["puja", "fast", "gathering", "meeting", "ritual", "other"]).default("other"),
  startsAt: z.string().min(4),
  endsAt: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional()
});

const weeklyFeatureSchema = z.object({
  title: z.string().min(2),
  featureType: z.enum(["read", "video"]).default("read"),
  url: z.string().url().optional().or(z.literal("")),
  summary: z.string().optional(),
  weekStartsAt: z.string().optional()
});

const historyEventSchema = z
  .object({
    title: z.string().min(2),
    eventDate: z.string().optional(),
    eventYear: z.coerce.number().int().min(1600).max(2200).optional(),
    location: z.string().optional(),
    category: z
      .enum(["family", "village", "education", "migration", "property", "spiritual", "achievement", "memory", "other"])
      .default("family"),
    description: z.string().optional(),
    sourceNote: z.string().optional()
  })
  .refine((value) => value.eventDate || value.eventYear, {
    message: "Add either exact date or year."
  });

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function nextAnnualDate(value, today = startOfToday()) {
  if (!value) return null;

  const sourceDate = new Date(value);
  const nextDate = new Date(today.getFullYear(), sourceDate.getMonth(), sourceDate.getDate());
  nextDate.setHours(0, 0, 0, 0);

  if (nextDate < today) {
    nextDate.setFullYear(today.getFullYear() + 1);
  }

  return nextDate;
}

function daysUntil(date, today = startOfToday()) {
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function serializeCelebration(member, type, date) {
  return {
    memberId: member._id,
    memberName: member.displayName,
    type,
    date,
    daysUntil: daysUntil(date)
  };
}

function serializeEvent(event) {
  return {
    id: event._id,
    title: event.title,
    eventType: event.eventType,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    description: event.description,
    createdByMemberId: event.createdByMemberId
  };
}

function serializeFeature(feature) {
  return feature
    ? {
        id: feature._id,
        title: feature.title,
        featureType: feature.featureType,
        url: feature.url,
        summary: feature.summary,
        weekStartsAt: feature.weekStartsAt,
        suggestedByMemberId: feature.suggestedByMemberId
      }
    : null;
}

function serializeHistoryEvent(event) {
  return {
    id: event._id,
    title: event.title,
    eventDate: event.eventDate,
    eventYear: event.eventYear,
    location: event.location,
    category: event.category,
    description: event.description,
    sourceNote: event.sourceNote,
    createdByMemberId: event.createdByMemberId
  };
}

function serializeMemberHistoryEvent(member, type, date) {
  const year = date.getFullYear();
  const title = type === "birth" ? `${member.displayName} was born` : `${member.displayName}'s wedding anniversary`;

  return {
    id: `${type}-${member._id}`,
    title,
    eventDate: date,
    eventYear: year,
    location: member.placeOfResidence || member.city || member.country || "",
    category: type === "birth" ? "family" : "memory",
    description:
      type === "birth"
        ? `Birth date added from ${member.displayName}'s profile.`
        : `Anniversary date added from ${member.displayName}'s profile.`,
    sourceNote: "Auto-generated from member profile",
    createdByMemberId: member._id,
    source: "profile",
    eventType: type
  };
}

async function getAutomaticHistoryEvents(familyId) {
  const members = await FamilyMember.find({
    familyId,
    status: { $ne: "removed" },
    $or: [{ dateOfBirth: { $exists: true } }, { anniversaryDate: { $exists: true } }]
  }).sort({ displayName: 1 });

  return members.flatMap((member) => {
    const events = [];

    if (member.dateOfBirth) {
      events.push(serializeMemberHistoryEvent(member, "birth", member.dateOfBirth));
    }

    if (member.anniversaryDate) {
      events.push(serializeMemberHistoryEvent(member, "anniversary", member.anniversaryDate));
    }

    return events;
  });
}

function compareHistoryEvents(left, right) {
  const leftDate = left.eventDate ? new Date(left.eventDate).getTime() : Number.POSITIVE_INFINITY;
  const rightDate = right.eventDate ? new Date(right.eventDate).getTime() : Number.POSITIVE_INFINITY;
  return (left.eventYear || 9999) - (right.eventYear || 9999) || leftDate - rightDate || left.title.localeCompare(right.title);
}

async function getFamilySnapshot(familyId) {
  const normalizedFamilyId = new mongoose.Types.ObjectId(familyId);
  const [memberCount, livingMembers, locationRows] = await Promise.all([
    FamilyMember.countDocuments({ familyId, status: { $ne: "removed" } }),
    FamilyMember.countDocuments({ familyId, livingStatus: "living", status: { $ne: "removed" } }),
    FamilyMember.aggregate([
      { $match: { familyId: normalizedFamilyId, status: { $ne: "removed" } } },
      {
        $project: {
          location: {
            $ifNull: [
              "$city",
              {
                $ifNull: ["$placeOfResidence", "$country"]
              }
            ]
          }
        }
      },
      { $match: { location: { $nin: [null, ""] } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 8 }
    ])
  ]);

  return {
    memberCount,
    livingMembers,
    locationCount: locationRows.length,
    locations: locationRows.map((row) => ({ location: row._id, count: row.count }))
  };
}

async function getCelebrations(familyId) {
  const today = startOfToday();
  const windowEnd = addDays(today, 7);
  const members = await FamilyMember.find({
    familyId,
    status: { $ne: "removed" },
    livingStatus: { $ne: "deceased" },
    $or: [{ dateOfBirth: { $exists: true } }, { anniversaryDate: { $exists: true } }]
  }).sort({ displayName: 1 });

  return members
    .flatMap((member) => {
      const birthday = nextAnnualDate(member.dateOfBirth, today);
      const anniversary = nextAnnualDate(member.anniversaryDate, today);
      return [
        birthday && birthday <= windowEnd ? serializeCelebration(member, "birthday", birthday) : null,
        anniversary && anniversary <= windowEnd ? serializeCelebration(member, "anniversary", anniversary) : null
      ].filter(Boolean);
    })
    .sort((left, right) => left.date - right.date || left.memberName.localeCompare(right.memberName));
}

familyHubRoutes.use(requireAuth);

familyHubRoutes.get(
  "/family/:familyId/overview",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const today = startOfToday();
    const [snapshot, celebrations, calendarEvents, weeklyFeature] = await Promise.all([
      getFamilySnapshot(req.familyId),
      getCelebrations(req.familyId),
      FamilyCalendarEvent.find({
        familyId: req.familyId,
        status: "active",
        startsAt: { $gte: today, $lte: addDays(today, 30) }
      })
        .sort({ startsAt: 1, title: 1 })
        .limit(8),
      WeeklyFeature.findOne({
        familyId: req.familyId,
        status: "active"
      }).sort({ weekStartsAt: -1, createdAt: -1 })
    ]);

    res.json({
      data: {
        snapshot,
        celebrations,
        calendarEvents: calendarEvents.map(serializeEvent),
        weeklyFeature: serializeFeature(weeklyFeature)
      }
    });
  })
);

familyHubRoutes.post(
  "/family/:familyId/calendar-events",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = calendarEventSchema.parse(req.body);
    const event = await FamilyCalendarEvent.create({
      ...body,
      familyId: req.familyId,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      createdByMemberId: req.member._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "family_calendar.event_created",
      entityType: "FamilyCalendarEvent",
      entityId: String(event._id),
      summary: `Added family calendar event ${event.title}`,
      after: body,
      req
    });

    res.status(201).json({ data: serializeEvent(event) });
  })
);

familyHubRoutes.post(
  "/family/:familyId/weekly-feature",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = weeklyFeatureSchema.parse(req.body);
    const feature = await WeeklyFeature.create({
      ...body,
      url: body.url || undefined,
      familyId: req.familyId,
      weekStartsAt: body.weekStartsAt ? new Date(body.weekStartsAt) : startOfToday(),
      suggestedByMemberId: req.member._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "weekly_feature.created",
      entityType: "WeeklyFeature",
      entityId: String(feature._id),
      summary: `Added ${feature.featureType} of the week ${feature.title}`,
      after: body,
      req
    });

    res.status(201).json({ data: serializeFeature(feature) });
  })
);

familyHubRoutes.get(
  "/family/:familyId/history",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const [events, automaticEvents] = await Promise.all([
      FamilyHistoryEvent.find({
        familyId: req.familyId,
        status: "active"
      }).sort({ eventYear: 1, eventDate: 1, createdAt: 1 }),
      getAutomaticHistoryEvents(req.familyId)
    ]);
    const historyEvents = [...events.map(serializeHistoryEvent), ...automaticEvents].sort(compareHistoryEvents);

    res.json({ data: historyEvents });
  })
);

familyHubRoutes.post(
  "/family/:familyId/history",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = historyEventSchema.parse(req.body);
    const event = await FamilyHistoryEvent.create({
      ...body,
      familyId: req.familyId,
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
      eventYear: body.eventYear || (body.eventDate ? new Date(body.eventDate).getFullYear() : undefined),
      createdByMemberId: req.member._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "family_history.event_created",
      entityType: "FamilyHistoryEvent",
      entityId: String(event._id),
      summary: `Added family history event ${event.title}`,
      after: body,
      req
    });

    res.status(201).json({ data: serializeHistoryEvent(event) });
  })
);
