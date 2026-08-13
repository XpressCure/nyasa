# Verified Bank Contributions

This fallback keeps a contribution pending until a Kosh reviewer checks the actual bank record. Member-provided SMS or a screenshot is evidence, not automatic authority to move money.

## Enable on the API server

Add these values to the Nyas API environment and restart `nyasa-api`:

```env
BANK_CONTRIBUTION_ENABLED=true
BANK_ACCOUNT_NAME=YOUR ACCOUNT NAME
BANK_ACCOUNT_NUMBER=YOUR ACCOUNT NUMBER
BANK_IFSC=YOUR IFSC
BANK_UPI_ID=9621016427@pthdfc
BANK_QR_IMAGE_URL=https://nyasa.xpresscure.com/assets/nyas-kosh-upi-qr.jpeg
BANK_SMS_INGEST_SECRET=GENERATE_A_LONG_RANDOM_SECRET
BANK_SMS_FAMILY_ID=YOUR_FAMILY_OBJECT_ID
BANK_SMS_ALLOWED_SENDERS=UCOBANK,UCOBNK
```

The account details are returned only to authenticated family members who have Kosh contribution permission.

The QR image is deployed with the web application. It identifies the recipient as Kumar Saurabh and displays the same `9621016427@pthdfc` UPI handle. Before enabling contributions, make one INR 1 test transfer and verify the recipient in the UPI confirmation screen.

## Member flow

1. Sign in with password verification and open **Kosh**.
2. Create a bank payment reference for at least INR 2,000.
3. Transfer the exact amount to the displayed bank account.
4. Paste the debit SMS and UTR, or upload a receipt screenshot/PDF.
5. The claim stays **pending review**. The wallet is not credited yet.

## Kosh Pramukh flow

1. Open **Kosh Verification Desk**.
2. Compare the contributor SMS, receipt, amount, time and UTR against the UCO Bank transaction.
3. Optionally paste the bank-side credit SMS to run a second set of checks.
4. Enter the verified amount and UTR.
5. Approve to credit the member wallet, or reject with a clear reason.

## Controls

- A claim cannot credit money twice.
- A normalized UTR can be used only once across the family.
- Approvals require a password-verified Kosh reviewer.
- Every approval writes an audit log.
- Bank proofs are visible only to the contributor and Kosh reviewers.
- SMS checks extract amount, date/time, UTR and payment language.
- Receipt OCR is deliberately marked `not_configured`; the image is stored for manual review. Add a vetted OCR provider before treating extracted image text as a reviewer aid.

## Dedicated Android SMS forwarder

This is intended for one controlled Android phone holding the Kosh bank SIM. It does not read members' phones. Install Termux and Termux:API from their trusted distribution, grant SMS access once, then install Node.js and keep the phone secured.

```bash
pkg install nodejs termux-api
termux-setup-storage
export NYAS_SMS_API_URL="https://nyasa.xpresscure.com/api/bank-contributions/sms-ingest"
export NYAS_SMS_INGEST_SECRET="THE_SAME_LONG_SECRET_AS_THE_SERVER"
export NYAS_SMS_SENDERS="UCOBANK,UCOBNK"
node tools/bank-sms-forwarder.mjs
```

The forwarder polls the newest inbox messages every 30 seconds, filters senders locally, signs the exact payload, and remembers the last 500 forwarded message IDs. Nyas verifies the signature and rejects messages older than five minutes or from senders outside the server allowlist.

Matching order:

1. Exact UTR against an open claim.
2. One and only one open claim with the exact amount in the seven-day window.
3. Anything ambiguous is retained under **Unmatched bank SMS** for Kosh Pramukh review and never credits a wallet automatically.
