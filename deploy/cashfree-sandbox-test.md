# Cashfree Sandbox Test

This integration keeps test and production credentials separate. Never commit either secret.

## 1. Configure the API locally

Add these values to `apps/api/.env`:

```env
CASHFREE_ENABLED=true
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=YOUR_TEST_APP_ID
CASHFREE_CLIENT_SECRET=YOUR_TEST_SECRET_KEY
CASHFREE_API_VERSION=2025-01-01
```

Keep the existing `WEB_ORIGIN=http://localhost:5173` value for local testing.

## 2. Start Nyas

Run the API and web app in separate terminals:

```powershell
npm.cmd run dev:api
npm.cmd run dev:web
```

Sign in with a password-secured account, open Kosh, and confirm the yellow `Cashfree Sandbox` banner appears. A test wallet top-up must be at least INR 2,000. Cashfree simulates the payment; no real money moves.

The browser returns to `/treasury`, where Nyas independently asks Cashfree for the order and payment status. Only a Cashfree `PAID` order with a `SUCCESS` payment and matching INR amount is credited.

## 3. Optional webhook test

Cashfree cannot call `localhost`. Use an HTTPS tunnel to port 4000 and configure this endpoint in the Cashfree test dashboard:

```text
https://YOUR-TUNNEL/api/payments/cashfree-webhook
```

Subscribe to the payment success event. Nyas verifies the Cashfree signature against the untouched request body. Browser return verification remains available, so the initial checkout test does not depend on a tunnel.

## Production later

Production requires approved live credentials, `CASHFREE_ENV=production`, the deployed web origin, and the production webhook URL. Do not enable production until Cashfree has approved the account and the sandbox flow has passed.
