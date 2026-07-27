# Payment Module

Payments create verified wallet top-ups.

## Razorpay Wallet Top-Up Flow

1. Member enters an amount in Kosh.
2. API creates a Razorpay order.
3. Browser opens Razorpay Checkout.
4. API verifies the returned Razorpay signature.
5. API posts a ledger `contribution` credit to the member wallet.

Wallet balance is credited only after signature verification.

## Endpoints

- `POST /api/payments/family/:familyId/razorpay-orders`
- `POST /api/payments/family/:familyId/razorpay-payments/verify`

## Configuration

```env
RAZORPAY_KEY_ID=replace-with-key-id
RAZORPAY_KEY_SECRET=replace-with-key-secret
RAZORPAY_WEBHOOK_SECRET=
```
