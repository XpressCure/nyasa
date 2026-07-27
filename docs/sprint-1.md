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
- `PATCH /api/members/family/:familyId/me`
- `GET /api/permissions/family/:familyId/me`
- `GET /api/audit-logs/family/:familyId`

## Next Engineering Tasks

1. Replace development login with OTP and Google login.
2. Add invitation create/accept flow.
3. Add seed script for first family.
4. Add automated tests for family creation and permission checks.
5. Connect React screens to the API.

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
