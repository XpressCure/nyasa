# Engineering Decisions

## Architecture

Nyasa starts as a two-app monorepo:

- `apps/api`: Express API with MongoDB/Mongoose
- `apps/web`: React frontend

This keeps the first version simple while still allowing the project to grow into a larger SaaS product.

## Database

MongoDB is used because Nyasa has flexible family records, documents, project metadata, assets, and timeline entries. Financial records still need strict rules:

- Ledger transactions are append-only.
- Corrections use reversal or adjustment records.
- Balances should be derived from posted ledger transactions.
- Payment webhooks must be idempotent.

## Permissions

Permissions are enforced in layers:

1. Family membership
2. Role permissions
3. Resource scope
4. Policy checks

Example: a Project Lead may submit expenses only for an assigned active project.

## Naming

Nyasa uses stewardship language:

- Treasury / Kosh
- Steward
- Mission
- Sabha
- Sankalp
- Legacy
