import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireFamilyPermission } from "../../middleware/family-context.js";
import { SankalpProposal } from "../../models/SankalpProposal.js";
import { SankalpProposalVote } from "../../models/SankalpProposalVote.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { httpError } from "../../utils/http-error.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { permissions } from "../permissions/permissions.js";
import { paiseToRupees, rupeesToPaise } from "../treasury/money.js";

export const proposalRoutes = Router();

const proposalSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().min(10).max(2000),
  category: z
    .enum(["renovation", "education", "health", "event", "asset_maintenance", "community", "research", "business_study", "other"])
    .default("other"),
  expectedImpact: z.string().max(1000).optional(),
  tentativeBudgetRupees: z.coerce.number().min(0).default(0),
  votingEndsAt: z.string().optional()
});

const voteSchema = z.object({
  vote: z.enum(["up", "down"])
});

function calculateAge(dateOfBirth, today = new Date()) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function canVote(member) {
  if (!member || member.status !== "active") return false;
  if ((member.livingStatus || "living") !== "living") return false;

  const age = calculateAge(member.dateOfBirth);
  if (age !== null) return age >= 15;

  return member.isMinor !== true;
}

async function getVoteCounts(familyId, proposalIds) {
  if (!proposalIds.length) return new Map();

  const rows = await SankalpProposalVote.aggregate([
    {
      $match: {
        familyId: new mongoose.Types.ObjectId(String(familyId)),
        proposalId: { $in: proposalIds.map((id) => new mongoose.Types.ObjectId(String(id))) }
      }
    },
    {
      $group: {
        _id: { proposalId: "$proposalId", vote: "$vote" },
        count: { $sum: 1 }
      }
    }
  ]);

  const counts = new Map();
  rows.forEach((row) => {
    const key = String(row._id.proposalId);
    const existing = counts.get(key) || { up: 0, down: 0, total: 0 };
    existing[row._id.vote] = row.count;
    existing.total += row.count;
    counts.set(key, existing);
  });

  return counts;
}

function serializeProposal(proposal, counts, myVote) {
  const voteCounts = counts || { up: 0, down: 0, total: 0 };

  return {
    id: proposal._id,
    title: proposal.title,
    description: proposal.description,
    category: proposal.category,
    expectedImpact: proposal.expectedImpact,
    tentativeBudgetPaise: proposal.tentativeBudgetPaise || 0,
    tentativeBudgetRupees: paiseToRupees(proposal.tentativeBudgetPaise || 0),
    status: proposal.status,
    votingEndsAt: proposal.votingEndsAt,
    proposedBy: proposal.proposedByMemberId,
    createdAt: proposal.createdAt,
    votes: {
      up: voteCounts.up || 0,
      down: voteCounts.down || 0,
      total: voteCounts.total || 0,
      score: (voteCounts.up || 0) - (voteCounts.down || 0),
      myVote: myVote?.vote || null
    }
  };
}

proposalRoutes.use(requireAuth);

proposalRoutes.get(
  "/family/:familyId",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const proposals = await SankalpProposal.find({
      familyId: req.familyId,
      status: { $in: ["voting", "accepted"] }
    })
      .populate("proposedByMemberId", "displayName role photoUrl")
      .sort({ status: 1, createdAt: -1 })
      .limit(50);

    const proposalIds = proposals.map((proposal) => proposal._id);
    const [counts, myVotes] = await Promise.all([
      getVoteCounts(req.familyId, proposalIds),
      SankalpProposalVote.find({ proposalId: { $in: proposalIds }, memberId: req.member._id })
    ]);
    const myVoteMap = new Map(myVotes.map((vote) => [String(vote.proposalId), vote]));

    res.json({
      data: {
        canVote: canVote(req.member),
        proposals: proposals.map((proposal) => serializeProposal(proposal, counts.get(String(proposal._id)), myVoteMap.get(String(proposal._id))))
      }
    });
  })
);

proposalRoutes.post(
  "/family/:familyId",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = proposalSchema.parse(req.body);

    if ((req.member.livingStatus || "living") !== "living") {
      throw httpError(403, "Only living Sadasya can propose a Sankalp.", "PROPOSAL_NOT_ALLOWED");
    }

    const proposal = await SankalpProposal.create({
      familyId: req.familyId,
      title: body.title,
      description: body.description,
      category: body.category,
      expectedImpact: body.expectedImpact || "",
      tentativeBudgetPaise: rupeesToPaise(body.tentativeBudgetRupees || 0),
      votingEndsAt: body.votingEndsAt ? new Date(body.votingEndsAt) : undefined,
      proposedByMemberId: req.member._id,
      createdBy: req.user._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "sankalp.proposal_created",
      entityType: "SankalpProposal",
      entityId: String(proposal._id),
      summary: `Proposed Sankalp ${proposal.title}`,
      req
    });

    res.status(201).json({
      data: serializeProposal(proposal, null, null),
      message: "Sankalp proposal is now open for Sabha voting."
    });
  })
);

proposalRoutes.post(
  "/family/:familyId/:proposalId/vote",
  requireFamilyPermission(permissions.workspaceView),
  asyncHandler(async (req, res) => {
    const body = voteSchema.parse(req.body);

    if (!canVote(req.member)) {
      throw httpError(403, "Only living Sadasya aged 15 years or above can vote.", "VOTER_NOT_ELIGIBLE");
    }

    const proposal = await SankalpProposal.findOne({
      _id: req.params.proposalId,
      familyId: req.familyId,
      status: "voting"
    });

    if (!proposal) {
      throw httpError(404, "Voting Sankalp not found.", "PROPOSAL_NOT_FOUND");
    }

    const existingVote = await SankalpProposalVote.findOne({
      familyId: req.familyId,
      proposalId: proposal._id,
      memberId: req.member._id
    });

    if (existingVote) {
      throw httpError(409, "You have already voted for this Sankalp.", "VOTE_ALREADY_RECORDED");
    }

    const vote = await SankalpProposalVote.create({
      familyId: req.familyId,
      proposalId: proposal._id,
      memberId: req.member._id,
      vote: body.vote,
      createdBy: req.user._id
    });

    await writeAuditLog({
      familyId: req.familyId,
      actorUserId: req.user._id,
      actorMemberId: req.member._id,
      action: "sankalp.proposal_vote_recorded",
      entityType: "SankalpProposal",
      entityId: String(proposal._id),
      summary: `Recorded ${body.vote} vote for ${proposal.title}`,
      req
    });

    const counts = await getVoteCounts(req.familyId, [proposal._id]);

    res.status(201).json({
      data: serializeProposal(proposal, counts.get(String(proposal._id)), vote),
      message: "Your Sabha vote has been recorded."
    });
  })
);
