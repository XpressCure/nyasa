import mongoose from "mongoose";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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

async function createBackup({ family, preview }) {
  const familyId = family._id;
  const backup = {
    createdAt: new Date().toISOString(),
    family: { id: String(familyId), name: family.name, slug: family.slug },
    counts: preview.counts,
    collections: {
      ledgerTransactions: await LedgerTransaction.find({ familyId }).lean(),
      paymentOrders: await PaymentOrder.find({ familyId }).lean(),
      hostedContributions: await HostedContribution.find({ familyId }).lean(),
      bankContributionClaims: await BankContributionClaim.find({ familyId }).lean(),
      bankSmsReceipts: await BankSmsReceipt.find({ familyId }).lean(),
      reconciliationSnapshots: await KoshReconciliationSnapshot.find({ familyId }).lean(),
      expenses: await Expense.find({ familyId }).lean(),
      financialDocuments: await Document.find(preview.financialDocuments).lean(),
      wallets: await Wallet.find({ familyId }).lean(),
      treasuryAccounts: await TreasuryAccount.find({ familyId }).lean(),
      auditLogs: await AuditLog.find(preview.financialAudits).lean()
    }
  };
  const directory = path.resolve(process.env.ACCOUNT_RESET_BACKUP_DIR || "backups");
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(directory, `finance-reset-${family.slug}-${stamp}.json`);
  await writeFile(backupPath, JSON.stringify(backup, null, 2), { flag: "wx" });
  return backupPath;
}

async function applyCleanup({ family, ownerMember, preview }) {
  const familyId = family._id;
  await Promise.all([
    LedgerTransaction.deleteMany({ familyId }), PaymentOrder.deleteMany({ familyId }),
    HostedContribution.deleteMany({ familyId }), BankContributionClaim.deleteMany({ familyId }),
    BankSmsReceipt.deleteMany({ familyId }), KoshReconciliationSnapshot.deleteMany({ familyId }),
    Expense.deleteMany({ familyId }), Document.updateMany(preview.financialDocuments, { $set: { status: "deleted" } }),
    Wallet.deleteMany({ familyId }), AuditLog.deleteMany(preview.financialAudits),
    TreasuryAccount.updateMany({ familyId, type: { $ne: "main" } }, { $set: { status: "archived" } })
  ]);

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
    after: { cleared: preview.counts }
  });
  return { treasury: { id: treasury._id, name: treasury.name }, walletsCreated: members.length, auditId: audit._id };
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const family = await Family.findOne({ slug: familySlug, status: "active" });
  if (!family) throw new Error(`Family not found for slug: ${familySlug}`);
  const ownerMember = await FamilyMember.findOne({ familyId: family._id, role: "owner", status: "active" });
  if (!ownerMember) throw new Error("Active owner member not found.");

  const preview = await previewCleanup(family._id);
  if (process.env.CONFIRM_ACCOUNT_RESET !== confirmation) {
    console.log("DRY RUN ONLY - no records changed.");
    console.log(JSON.stringify({ family: family.name, familySlug, cleanup: preview.counts }, null, 2));
    console.log(`After a completed backup, run with CONFIRM_ACCOUNT_RESET=${confirmation}.`);
    return;
  }

  const backupPath = await createBackup({ family, preview });
  const result = await applyCleanup({ family, ownerMember, preview });
  console.log("LIVE ACCOUNT CLEANUP COMPLETE.");
  console.log(JSON.stringify({ family: family.name, backupPath, cleared: preview.counts, ...result }, null, 2));
}

main().catch((error) => { console.error("Failed to prepare accounts launch", error); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));
