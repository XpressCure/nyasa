# Document Module

Documents store metadata in MongoDB and files either locally under `apps/api/uploads` or in AWS S3.

## Current Scope

- Attach PDF/image bills to submitted expenses.
- Download attached bills through an authenticated API route.
- Keep uploaded files out of Git with `apps/api/uploads/`.
- Use `STORAGE_DRIVER=s3` to store new uploads in AWS S3.

## AWS S3 Configuration

```env
STORAGE_DRIVER=s3
AWS_S3_BUCKET_NAME=xpresscure
AWS_S3_REGION=ap-south-1
AWS_S3_ACCESS_KEY_ID=replace-with-rotated-access-key
AWS_S3_SECRET_ACCESS_KEY=replace-with-rotated-secret-key
```

The bucket should remain private. Downloads are streamed through the API after normal family permission checks.

## Endpoints

- `POST /api/documents/family/:familyId/expenses/:expenseId`
- `GET /api/documents/family/:familyId/:documentId/download`
