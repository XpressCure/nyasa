# Sprint 1: App Foundation, Auth, Family Workspace

## Goal

Create the technical foundation for Nyasa:

- Node API
- React frontend
- MongoDB connection
- Development login
- Family workspace creation
- Owner membership creation
- Role permission constants
- Audit log foundation

## Current Scaffold Includes

- `POST /api/auth/dev-login`
- `POST /api/families`
- `GET /api/families`
- `GET /api/families/:familyId/dashboard`
- `GET /api/members/family/:familyId`
- `GET /api/members/family/:familyId/me`
- `PATCH /api/members/family/:familyId/me`
- `PATCH /api/members/family/:familyId/:memberId/role`
- `PATCH /api/members/family/:familyId/:memberId/status`
- `GET /api/permissions/family/:familyId/me`
- `GET /api/audit-logs/family/:familyId`
- `POST /api/invitations`
- `GET /api/invitations/family/:familyId`
- `GET /api/invitations/preview/:token`
- `POST /api/invitations/accept`
- `POST /api/invitations/:invitationId/revoke`
- `GET /api/treasury/family/:familyId/summary`
- `GET /api/treasury/family/:familyId/transactions`
- `POST /api/treasury/family/:familyId/my-contributions`
- `POST /api/treasury/family/:familyId/manual-contributions`
- `POST /api/treasury/family/:familyId/allocations`
- `GET /api/projects/family/:familyId`
- `POST /api/projects/family/:familyId`
- `GET /api/projects/family/:familyId/:projectId`
- `PATCH /api/projects/family/:familyId/:projectId`
- `POST /api/projects/family/:familyId/:projectId/milestones`
- `POST /api/projects/family/:familyId/:projectId/updates`
- `GET /api/expenses/family/:familyId/project/:projectId`
- `POST /api/expenses/family/:familyId/project/:projectId`
- `POST /api/expenses/family/:familyId/:expenseId/approve`
- `POST /api/expenses/family/:familyId/:expenseId/reject`
- `POST /api/documents/family/:familyId/expenses/:expenseId`
- `GET /api/documents/family/:familyId/:documentId/download`
- `POST /api/payments/family/:familyId/razorpay-orders`
- `POST /api/payments/family/:familyId/razorpay-payments/verify`

Project financial summaries expose target, allocated, spent, budget gap, and available-to-spend values. Missions can enter `implementation` only after their target budget is fully allocated, and expenses can be submitted only after that same funding threshold is met.

Expense bills can be stored locally in development or in AWS S3 with `STORAGE_DRIVER=s3`. The API streams S3 downloads through authenticated routes so the bucket can remain private.

Member wallet top-ups use Razorpay Checkout. Wallet ledger credits are posted only after Razorpay signature verification succeeds.

The web app includes a public family-facing homepage at `/`, an internal dashboard at `/dashboard`, and a self-service profile page at `/profile` where members can update their own bio, city, country, and profession. Family launch onboarding supports name + phone sign-in, and owners can create invite links with phone numbers.

## Next Engineering Tasks

1. Replace development login with OTP and Google login.
2. Add seed script for first family.
3. Add automated tests for family creation, invitations, member management, and permission checks.
4. Add ledger tests for manual contributions and balance calculations.
5. Add project tests for creation, status changes, and family scoping.
6. Add bill/document uploads to expense submission.
7. Add ledger reversal APIs for audited corrections.
8. Replace manually copied invite links with email/WhatsApp delivery.
9. Replace development login with OTP and Google login.

## Local Verification

Run these from the repository root in a fresh VS Code terminal:

```bash
npm install
npm run db:up
npm run build
npm run lint
npm run dev
```

During initial scaffolding inside Codex, dependency installation succeeded using a project-local npm cache. Build and lint could not complete inside the sandbox because child Node processes were blocked from resolving `C:\Users\HP` with an `EPERM lstat` error. This should be rechecked in a normal VS Code terminal after restarting VS Code and confirming Node.js 20 LTS is active.
