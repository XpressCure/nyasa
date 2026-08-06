# Verified Bank Contributions

This fallback keeps a contribution pending until a Kosh reviewer checks the actual bank record. Member-provided SMS or a screenshot is evidence, not automatic authority to move money.

## Enable on the API server

Add these values to the Nyas API environment and restart `nyasa-api`:

```env
BANK_CONTRIBUTION_ENABLED=true
BANK_ACCOUNT_NAME=YOUR ACCOUNT NAME
BANK_ACCOUNT_NUMBER=YOUR ACCOUNT NUMBER
BANK_IFSC=YOUR IFSC
BANK_UPI_ID=
```

The account details are returned only to authenticated family members who have Kosh contribution permission.

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
