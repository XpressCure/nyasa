# Payment Module

Payments create verified wallet top-ups.

## Razorpay Wallet Top-Up Flow

1. Member enters an amount in Kosh.
2. API creates a Razorpay order.
3. Browser opens Razorpay Checkout.
4. API verifies the returned Razorpay signature.
5. API posts a ledger `contribution` credit to the member wallet.

Wallet balance is credited only after signature verification.

## Razorpay Payment Page Flow

The public Payment Page must collect these mandatory fields:

- Full name
- Mobile number
- Contribution amount, minimum INR 2,000

Configure Razorpay to send the `order.paid` webhook to:

`https://nyasa.xpresscure.com/api/payments/razorpay-webhook`

Nyas validates the webhook signature and the configured Payment Page ID before recording anything. A captured payment is then handled as follows:

1. One active, living family member matches the normalized phone number: credit that member's wallet automatically.
2. No member matches, the phone is missing, or the phone is ambiguous: retain the payment in Payment Page Review.
3. The donor later signs in with the same phone and opens Kosh: automatically claim and credit pending payments.
4. Owner or Kosh Pramukh can manually link unresolved payments to a living member.

Both the Razorpay payment ID and webhook event ID are stored for duplicate protection. Payments from other Razorpay Payment Pages are ignored.

### Safe Test Mode

Create a separate Payment Page in Razorpay Test Mode and configure its ID as `RAZORPAY_TEST_PAYMENT_PAGE_ID`. Test payments validate the webhook signature, donor fields, phone normalization, and member match, but never create a wallet or ledger entry. Use the same webhook secret in the Test and Live Razorpay webhook configurations when both modes call the same Nyas endpoint.

## Endpoints

- `POST /api/payments/family/:familyId/razorpay-orders`
- `POST /api/payments/family/:familyId/razorpay-payments/verify`
- `POST /api/payments/razorpay-webhook`
- `POST /api/payments/family/:familyId/hosted-contributions/claim`
- `GET /api/payments/family/:familyId/hosted-contributions/pending`
- `POST /api/payments/family/:familyId/hosted-contributions/:contributionId/link`

## Configuration

```env
RAZORPAY_KEY_ID=replace-with-key-id
RAZORPAY_KEY_SECRET=replace-with-key-secret
RAZORPAY_WEBHOOK_SECRET=use-a-separate-random-webhook-secret
RAZORPAY_PAYMENT_PAGE_ID=pl_replace-with-payment-page-id
RAZORPAY_TEST_PAYMENT_PAGE_ID=pl_replace-with-test-payment-page-id
RAZORPAY_PAYMENT_PAGE_FAMILY_ID=replace-with-mongodb-family-id
```

The webhook secret is chosen while creating the webhook in Razorpay. It is not the Razorpay API key secret.
