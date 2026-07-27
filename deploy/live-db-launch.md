# Live Database Launch

Use this checklist to prepare MongoDB Atlas for the Nyasa Trust Alahdadpur live launch.

## What The Script Creates

- `Nyasa Trust - Alahdadpur` family workspace
- First owner user from `LIVE_OWNER_NAME` and `LIVE_OWNER_PHONE`
- Owner family membership
- Main treasury account named `Alahdadpur Family Kosh`
- Owner wallet
- Three launch missions:
  - `Alahdadpur Ancestral House Mission`
  - `Family Gallery and Archive`
  - `Alahdadpur Social Works Fund`
- A bootstrap audit log
- Required MongoDB indexes

The script is idempotent. Running it again updates the launch records without duplicating them.

## EC2 Command

Run from the repository root:

```bash
cd ~/nyasa
LIVE_OWNER_NAME="Kumar Saurabh" LIVE_OWNER_PHONE="9621016427" npm run db:prepare-live
```

If the API uses `apps/api/.env`, confirm these values exist first:

```bash
grep -E "MONGODB_URI|JWT_SECRET|NODE_ENV" apps/api/.env
```

Do not paste secrets into chat or commit `.env`.

## Verify

After the script succeeds:

```bash
pm2 restart nyasa-api --update-env
curl http://localhost:4100/api/health
```

Then sign in on the website with the owner name and phone used above.
