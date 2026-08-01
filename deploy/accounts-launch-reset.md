# Accounts Launch Reset

Use this once before the accounts team starts recording real contributions.

## What It Resets

- Deletes experimental Kosh ledger entries.
- Deletes experimental Razorpay payment orders.
- Deletes experimental expenses.
- Marks expense bill documents as deleted in the database.
- Deletes and recreates member wallets at zero balance.
- Keeps family profiles, Kul map, photos, Sankalp, milestones, project documents, and history.
- Assigns Brij Bhan Singh and Hari Prakash Singh as `Kosh Pramukh`.
- Recreates the active main treasury account as `Alahdadpur Family Kosh` with zero opening balance.

## Run On Server

```bash
cd ~/nyasa
git pull
npm install
CONFIRM_ACCOUNT_RESET=RESET_NYASA_ACCOUNTS npm run db:prepare-accounts-launch
pm2 restart nyasa-api --update-env
```

Review the command output. If either Kosh Pramukh name is shown as missing or ambiguous, fix the Sadasya profile name/duplicate first and run the command again.

After this command, the Kosh dashboard should show zero collected, zero allotted, zero spent, and clean member wallet balances.
