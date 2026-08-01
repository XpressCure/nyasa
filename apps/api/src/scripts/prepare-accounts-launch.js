import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AuditLog } from "../models/AuditLog.js";
import { Document } from "../models/Document.js";
import { Expense } from "../models/Expense.js";
import { Family } from "../models/Family.js";
import { FamilyMember } from "../models/FamilyMember.js";
import { LedgerTransaction } from "../models/LedgerTransaction.js";
import { PaymentOrder } from "../models/PaymentOrder.js";
import { TreasuryAccount } from "../models/TreasuryAccount.js";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";

const familySlug = process.env.NYASA_FAMILY_SLUG || "nyasa-trust-alahdadpur";
const confirmPhrase = "RESET_NYASA_ACCOUNTS";
const koshPramukhAliases = [
  ["Brij Bhan Singh", "Brijbhansingh", "Brij Bhan"],
  ["Hari Prakash Singh", "Hariprakash Singh", "Hari Prakash"]
];

function normalizeName(value = "") {
  return value
    .toLowerCase()
    .replace(/\b(shri|sri|mr|dr|smt|late|lt)\b/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findMemberByAliases(familyId, aliases) {
  const members = await FamilyMember.find({ familyId, status: "active" }).select("displayName role");
  const normalizedAliases = aliases.map(normalizeName).filter(Boolean);
  const matches = members.filter((member) => {
    const normalizedMemberName = normalizeName(member.displayName);
    return normalizedAliases.some((alias) => normalizedMemberName === alias || normalizedMemberName.includes(alias) || alias.includes(normalizedMemberName));
  });

  if (matches.length === 1) return { member: matches[0], status: "matched", aliases };
  if (matches.length > 1) return { member: null, status: "ambiguous", aliases, matches: matches.map((member) => member.displayName) };
  return { member: null, status: "missing", aliases };
}

async function assignKoshPramukhs({ familyId }) {
  const results = [];

  for (const aliases of koshPramukhAliases) {
    const result = await findMemberByAliases(familyId, aliases);
    if (result.member) {
      const previousRole = result.member.role;
      result.member.role = "kosh_pramukh";
      await result.member.save();
      results.push({ name: result.member.displayName, previousRole, role: result.member.role, status: "assigned" });
    } else {
      results.push({
        name: aliases.join(" / "),
        status: result.status,
        matches: result.matches || []
      });
    }
  }

  return results;
}

async function resetAccountingData({ family, owner }) {
  const expenseIds = await Expense.find({ familyId: family._id }).distinct("_id");
  const [ledgerDelete, paymentDelete, expenseDelete, documentUpdate, walletDelete, treasuryArchive] = await Promise.all([
    LedgerTransaction.deleteMany({ familyId: family._id }),
    PaymentOrder.deleteMany({ familyId: family._id }),
    Expense.deleteMany({ familyId: family._id }),
    expenseIds.length
      ? Document.updateMany({ familyId: family._id, expenseId: { $in: expenseIds }, category: "expense_bill" }, { $set: { status: "deleted" } })
      : Promise.resolve({ modifiedCount: 0 }),
    Wallet.deleteMany({ familyId: family._id }),
    TreasuryAccount.updateMany({ familyId: family._id, type: { $ne: "main" } }, { $set: { status: "archived" } })
  ]);

  const mainTreasury = await TreasuryAccount.findOneAndUpdate(
    { familyId: family._id, type: "main" },
    {
      $setOnInsert: {
        familyId: family._id,
        type: "main",
        currency: "INR",
        createdBy: owner._id
      },
      $set: {
        name: "Alahdadpur Family Kosh",
        openingBalancePaise: 0,
        status: "active"
      }
    },
    { upsert: true, new: true }
  );
  const duplicateTreasuryArchive = await TreasuryAccount.updateMany(
    { familyId: family._id, _id: { $ne: mainTreasury._id } },
    { $set: { status: "archived" } }
  );

  const activeMembers = await FamilyMember.find({ familyId: family._id, status: "active" }).select("_id");
  const walletWrites = activeMembers.map((member) => ({
    updateOne: {
      filter: { familyId: family._id, memberId: member._id },
      update: {
        $setOnInsert: {
          familyId: family._id,
          memberId: member._id,
          currency: "INR"
        },
        $set: { status: "active" }
      },
      upsert: true
    }
  }));

  if (walletWrites.length) {
    await Wallet.bulkWrite(walletWrites);
  }

  return {
    ledgerDeleted: ledgerDelete.deletedCount,
    paymentOrdersDeleted: paymentDelete.deletedCount,
    expensesDeleted: expenseDelete.deletedCount,
    expenseBillDocumentsMarkedDeleted: documentUpdate.modifiedCount || 0,
    walletsRecreated: activeMembers.length,
    oldWalletsDeleted: walletDelete.deletedCount,
    nonMainTreasuriesArchived: (treasuryArchive.modifiedCount || 0) + (duplicateTreasuryArchive.modifiedCount || 0),
    mainTreasury: { id: mainTreasury._id, name: mainTreasury.name }
  };
}

async function main() {
  if (process.env.CONFIRM_ACCOUNT_RESET !== confirmPhrase) {
    throw new Error(`Refusing to reset accounts. Set CONFIRM_ACCOUNT_RESET=${confirmPhrase} to continue.`);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);

  const family = await Family.findOne({ slug: familySlug, status: "active" });
  if (!family) throw new Error(`Family not found for slug: ${familySlug}`);

  const ownerMember = await FamilyMember.findOne({ familyId: family._id, role: "owner", status: "active" }).populate("userId");
  if (!ownerMember) throw new Error("Active owner member not found.");

  const owner = ownerMember.userId || (await User.findById(ownerMember.userId));
  if (!owner) throw new Error("Owner user not found.");

  const koshPramukhs = await assignKoshPramukhs({ familyId: family._id });
  const reset = await resetAccountingData({ family, owner });

  const audit = await AuditLog.create({
    familyId: family._id,
    actorUserId: owner._id,
    actorMemberId: ownerMember._id,
    action: "accounts.launch_reset_prepared",
    entityType: "Family",
    entityId: String(family._id),
    summary: "Reset experimental Kosh records and prepared Nyasa accounts for live contribution launch.",
    after: { reset, koshPramukhs }
  });

  console.log("Accounts launch database prepared.");
  console.log(JSON.stringify({ family: family.name, koshPramukhs, reset, auditId: audit._id }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to prepare accounts launch", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
