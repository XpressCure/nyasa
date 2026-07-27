# Document Module

Documents store metadata in MongoDB and local files under `apps/api/uploads`.

## Current Scope

- Attach PDF/image bills to submitted expenses.
- Download attached bills through an authenticated API route.
- Keep uploaded files out of Git with `apps/api/uploads/`.

## Endpoints

- `POST /api/documents/family/:familyId/expenses/:expenseId`
- `GET /api/documents/family/:familyId/:documentId/download`
