# Expense Module

Expenses represent mission implementation spending after members have allocated wallet funds to a mission.

## Flow

1. Owners/admins create missions and set the target budget.
2. Members add money to their own wallet.
3. Members allocate wallet balance to a mission.
4. Expenses can be submitted only after the mission target budget is fully allocated.
5. Project leads submit expenses against a mission.
6. Owners/admins approve or reject submitted expenses.
7. Approved expenses create posted project ledger debit transactions of type `expense_debit`.

Submitted and approved expenses count toward mission `spent` totals. Rejected expenses are excluded.

## Endpoints

- `GET /api/expenses/family/:familyId/project/:projectId`
- `POST /api/expenses/family/:familyId/project/:projectId`
- `POST /api/expenses/family/:familyId/:expenseId/approve`
- `POST /api/expenses/family/:familyId/:expenseId/reject`
