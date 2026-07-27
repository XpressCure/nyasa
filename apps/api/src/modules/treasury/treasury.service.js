import { LedgerTransaction } from "../../models/LedgerTransaction.js";
import { TreasuryAccount } from "../../models/TreasuryAccount.js";
import { Wallet } from "../../models/Wallet.js";

export async function getOrCreateMainTreasury({ familyId, userId }) {
  const existing = await TreasuryAccount.findOne({ familyId, type: "main", status: "active" });
  if (existing) return existing;

  return TreasuryAccount.create({
    familyId,
    name: "Family Treasury",
    type: "main",
    createdBy: userId
  });
}

export async function getOrCreateWallet({ familyId, memberId }) {
  const existing = await Wallet.findOne({ familyId, memberId, status: "active" });
  if (existing) return existing;

  return Wallet.create({ familyId, memberId });
}

export async function calculatePostedBalance(filter) {
  const rows = await LedgerTransaction.aggregate([
    { $match: { ...filter, status: "posted" } },
    {
      $group: {
        _id: "$direction",
        amountPaise: { $sum: "$amountPaise" }
      }
    }
  ]);

  return rows.reduce((total, row) => {
    return row._id === "credit" ? total + row.amountPaise : total - row.amountPaise;
  }, 0);
}
