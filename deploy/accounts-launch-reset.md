# Accounts Launch Reset

Use this once before the accounts team starts recording real contributions.

## What It Resets

- Deletes experimental Kosh ledger entries.
- Deletes experimental Razorpay/Cashfree orders and hosted-payment records.
- Deletes test self-declared contributions, bank SMS matches, and reconciliation snapshots.
- Deletes experimental expenses.
- Marks expense bill documents as deleted in the database.
- Deletes and recreates member wallets at zero balance.
- Keeps family profiles, Kul map, photos, Sankalp, milestones, project documents, and history.
- Assigns Brij Bhan Singh and Hari Prakash Singh as `Kosh Pramukh`.
- Recreates the active main treasury account as `Alahdadpur Family Kosh` with zero opening balance.

## Run On Server

First pull, install, and verify the release:

```bash
cd ~/nyasa
git pull --ff-only
npm install
npm run lint
npm run test
npm run build
```

Preview the cleanup. This command is read-only:

```bash
npm run db:prepare-accounts-launch
```

Review every count. If either Kosh Pramukh is missing or ambiguous, fix that profile first. Create and complete an on-demand MongoDB Atlas snapshot before continuing.

During a short maintenance window, apply the cleanup:

```bash
pm2 stop nyasa-api
CONFIRM_ACCOUNT_RESET=RESET_NYASA_ACCOUNTS npm run db:prepare-accounts-launch
pm2 start nyasa-api
pm2 save
```

The command must end with `LIVE ACCOUNT CLEANUP COMPLETE`.

Publish the web build and reload Apache:

```bash
sudo rsync -a --delete apps/web/dist/ /var/www/nyasa/
sudo chown -R www-data:www-data /var/www/nyasa
sudo apache2ctl configtest
sudo systemctl reload apache2
```

After this command, the Kosh dashboard should show zero collected, zero allotted, zero spent, and clean member wallet balances.

Test one small real contribution end to end: member bank transfer, declaration, Kosh Pramukh reconciliation, and partial Sankalp allocation. Keep that transaction as the live Kosh opening record.
