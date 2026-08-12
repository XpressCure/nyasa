import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AuditLog } from "../models/AuditLog.js";
import { BankContributionClaim } from "../models/BankContributionClaim.js";
import { BankSmsReceipt } from "../models/BankSmsReceipt.js";
import { Document } from "../models/Document.js";
import { Expense } from "../models/Expense.js";
import { Family } from "../models/Family.js";
import { FamilyMember } from "../models/FamilyMember.js";
import { HostedContribution } from "../models/HostedContribution.js";
import { KoshReconciliationSnapshot } from "../models/KoshReconciliationSnapshot.js";
import { LedgerTransaction } from "../models/LedgerTransaction.js";
import { PaymentOrder } from "../models/PaymentOrder.js";
import { TreasuryAccount } from "../models/TreasuryAccount.js";
import { Wallet } from "../models/Wallet.js";

const familySlug = process.env.NYASA_FAMILY_SLUG || "nyasa-trust-alahdadpur";
const confirmation = "RESET_NYASA_ACCOUNTS";
const koshPramukhAliases = [
  ["Brij Bhan Singh", "Brijbhansingh", "Brij Bhan"],
  ["Hari Prakash Singh", "Hariprakash Singh", "Hari Prakash"]
];

function normalizeName(value = "") {
  return value.toLowerCase().replace(/\b(shri|sri|mr|dr|smt|late|lt)\b/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ").replace(/\s+/g, " ").trim();
}

async function inspectKoshPramukhs(familyId) {
  const members = await FamilyMember.find({ familyId, status: "active" }).select("displayName role");
  return koshPramukhAliases.map((aliases) => {
    const normalizedAliases = aliases.map(normalizeName);
    const matches = members.filter((member) => {
      const name = normalizeName(member.displayName);
      return normalizedAliases.some((alias) => name === alias || name.includes(alias) || alias.includes(name));
    });
    if (matches.length === 1) return { id: matches[0]._id, name: matches[0].displayName, currentRole: matches[0].role, status: "matched" };
    return { name: aliases.join(" / "), status: matches.length ? "ambiguous" : "missing", matches: matches.map((item) => item.displayName) };
  });
}

async function previewCleanup(familyId) {
  const expenseIds = await Expense.find({ familyId }).distinct("_id");
  const financialDocuments = {
    familyId,
    status: "active",
    $or: [
      { category: "bank_contribution_proof" },
      ...(expenseIds.length ? [{ category: "expense_bill", expenseId: { $in: expenseIds } }] : [])
    ]
  };
  const financialAudits = {
    familyId,
    $or: [
      { entityType: { $in: ["BankContributionClaim", "HostedContribution", "KoshReconciliationSnapshot", "LedgerTransaction", "PaymentOrder", "Expense", "Wallet", "TreasuryAccount"] } },
      { action: /^treasury\./ }, { action: /^payment/ }, { action: /^bank_contribution/ },
      { action: "accounts.launch_reset_prepared" }
    ]
  };
  const [ledger, paymentOrders, hostedPayments, declarations, bankSms, snapshots, expenses, documents, wallets, activeMembers, auditLogs] = await Promise.all([
    LedgerTransaction.countDocuments({ familyId }), PaymentOrder.countDocuments({ familyId }),
    HostedContribution.countDocuments({ familyId }), BankContributionClaim.countDocuments({ familyId }),
    BankSmsReceipt.countDocuments({ familyId }), KoshReconciliationSnapshot.countDocuments({ familyId }),
    Expense.countDocuments({ familyId }), Document.countDocuments(financialDocuments),
    Wallet.countDocuments({ familyId }), FamilyMember.countDocuments({ familyId, status: "active" }),
    AuditLog.countDocuments(financialAudits)
  ]);
  return { counts: { ledger, paymentOrders, hostedPayments, declarations, bankSms, snapshots, expenses, documents, wallets, activeMembers, auditLogs }, financialDocuments, financialAudits };
}

async function applyCleanup({ family, ownerMember, preview, pramukhs }) {
  const familyId = family._id;
  await Promise.all([
    LedgerTransaction.deleteMany({ familyId }), PaymentOrder.deleteMany({ familyId }),
    HostedContribution.deleteMany({ familyId }), BankContributionClaim.deleteMany({ familyId }),
    BankSmsReceipt.deleteMany({ familyId }), KoshReconciliationSnapshot.deleteMany({ familyId }),
    Expense.deleteMany({ familyId }), Document.updateMany(preview.financialDocuments, { $set: { status: "deleted" } }),
    Wallet.deleteMany({ familyId }), AuditLog.deleteMany(preview.financialAudits),
    TreasuryAccount.updateMany({ familyId, type: { $ne: "main" } }, { $set: { status: "archived" } })
  ]);

  for (const match of pramukhs.filter((item) => item.status === "matched")) {
    await FamilyMember.updateOne({ _id: match.id }, { $set: { role: "kosh_pramukh" } });
  }

  const treasury = await TreasuryAccount.findOneAndUpdate(
    { familyId, type: "main" },
    { $setOnInsert: { familyId, type: "main", currency: "INR", createdBy: ownerMember.userId }, $set: { name: "Alahdadpur Family Kosh", openingBalancePaise: 0, status: "active" } },
    { upsert: true, new: true, sort: { createdAt: 1 } }
  );
  await TreasuryAccount.updateMany({ familyId, _id: { $ne: treasury._id } }, { $set: { status: "archived" } });

  const members = await FamilyMember.find({ familyId, status: "active" }).select("_id");
  if (members.length) await Wallet.insertMany(members.map((member) => ({ familyId, memberId: member._id, currency: "INR", status: "active" })));

  const audit = await AuditLog.create({
    familyId, actorUserId: ownerMember.userId, actorMemberId: ownerMember._id,
    action: "accounts.launch_reset_prepared", entityType: "Family", entityId: String(familyId),
    summary: "Cleared test Kosh records and prepared Nyas for live self-declared bank contributions.",
    after: { cleared: preview.counts, koshPramukhs: pramukhs.map(({ name, status }) => ({ name, status })) }
  });
  return { treasury: { id: treasury._id, name: treasury.name }, walletsCreated: members.length, auditId: audit._id };
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const family = await Family.findOne({ slug: familySlug, status: "active" });
  if (!family) throw new Error(`Family not found for slug: ${familySlug}`);
  const ownerMember = await FamilyMember.findOne({ familyId: family._id, role: "owner", status: "active" });
  if (!ownerMember) throw new Error("Active owner member not found.");

  const [preview, pramukhs] = await Promise.all([previewCleanup(family._id), inspectKoshPramukhs(family._id)]);
  if (process.env.CONFIRM_ACCOUNT_RESET !== confirmation) {
    console.log("DRY RUN ONLY - no records changed.");
    console.log(JSON.stringify({ family: family.name, familySlug, koshPramukhs: pramukhs, cleanup: preview.counts }, null, 2));
    console.log(`After a completed backup, run with CONFIRM_ACCOUNT_RESET=${confirmation}.`);
    return;
  }

  const result = await applyCleanup({ family, ownerMember, preview, pramukhs });
  console.log("LIVE ACCOUNT CLEANUP COMPLETE.");
  console.log(JSON.stringify({ family: family.name, cleared: preview.counts, koshPramukhs: pramukhs, ...result }, null, 2));
}

main().catch((error) => { console.error("Failed to prepare accounts launch", error); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));
