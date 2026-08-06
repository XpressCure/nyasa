# Nyas Apache Live Update

This is the update path for the existing `nyasa.xpresscure.com` deployment. Apache serves `/var/www/nyasa` and proxies `/api` to PM2 on port 4100.

## Local: publish the release

Run from the Nyas repository root. Stage the application files explicitly so local output and secrets are not included.

```powershell
git add .gitignore ecosystem.config.cjs apps/api/.env.example apps/api/src/app.js apps/api/src/config/env.js apps/api/src/models/PaymentOrder.js apps/api/src/modules/payments/payment.routes.js apps/api/src/modules/payments/cashfree.service.js apps/api/src/modules/payments/cashfree.service.test.js apps/web/src/App.jsx apps/web/src/pages/HomePage.jsx apps/web/src/pages/TreasuryPage.jsx apps/web/src/pages/LegalPage.jsx apps/web/src/pages/PrivacyPage.jsx apps/web/src/pages/TermsPage.jsx apps/web/src/styles.css deploy/cashfree-sandbox-test.md deploy/apache-live-update.md
git commit -m "Add Cashfree sandbox and public payment policies"
git pull --rebase origin main
git push origin main
```

## EC2: pull and configure

```bash
cd ~/nyasa
git status
git pull origin main
npm install
nano apps/api/.env
```

Keep the existing MongoDB, JWT, S3, and other production values. Add the Cashfree **test** credentials:

```env
NODE_ENV=production
PORT=4100
WEB_ORIGIN=https://nyasa.xpresscure.com

CASHFREE_ENABLED=true
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=YOUR_TEST_APP_ID
CASHFREE_CLIENT_SECRET=YOUR_TEST_SECRET_KEY
CASHFREE_API_VERSION=2025-01-01
```

Do not put Cashfree keys in `apps/web/.env`; they are server secrets.

## Build and restart

```bash
cd ~/nyasa
npm run build
sudo mkdir -p /var/www/nyasa
sudo rsync -a --delete apps/web/dist/ /var/www/nyasa/
sudo chown -R www-data:www-data /var/www/nyasa
pm2 delete nyasa-api
pm2 start ecosystem.config.cjs --only nyasa-api
pm2 save
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Cashfree test webhook

Configure this URL in the Cashfree sandbox dashboard for payment-success events:

```text
https://nyasa.xpresscure.com/api/payments/cashfree-webhook
```

## Verify

```bash
curl http://localhost:4100/api/health
curl https://nyasa.xpresscure.com/api/health
curl -I https://nyasa.xpresscure.com/legal
curl -I https://nyasa.xpresscure.com/privacy
curl -I https://nyasa.xpresscure.com/terms
pm2 logs nyasa-api --lines 40
```

Open Kosh with a password-secured member account. The page must show `Cashfree Sandbox`, and test checkout must not move real money. Confirm that one successful test produces exactly one wallet credit even when both the browser return and webhook are received.
