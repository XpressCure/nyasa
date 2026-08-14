# Nyas Public Product MVP

This branch turns the existing single-family application into the first usable multi-family product layer while preserving the live Alahdadpur workflow.

## Identity and family partition

- A `User` is the global Nyas identity.
- A `Family` is an isolated workspace.
- A `FamilyMember` grants a user a role inside one family.
- `POST /api/auth/register` creates a global password-secured identity without granting access to any family.
- Existing Alahdadpur members continue to use the legacy profile-claiming login.
- New users create a family or accept a steward-issued invitation.
- Web and Android both list memberships and switch the active family without creating another user account.
- API access is never authorized from a client-provided `familyId` alone; `requireFamilyPermission` verifies an active membership for the authenticated user.

Before production migration, add a unique partial index for active user membership per family after resolving any historical duplicates:

```js
db.familymembers.createIndex(
  { familyId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" }, status: { $in: ["active", "invited"] } } }
)
```

## Rural assets

`FamilyAsset` stores family-declared property metadata, land identifiers, caretakers and a verification history. The product deliberately distinguishes:

1. `family_declared`
2. `document_uploaded`
3. `official_portal_checked`
4. `needs_review`

An official portal check records its source URL, reference, member, date and note. It is not described as legal title certification. Initial rollout should enable and test state-specific official portals one state at a time; scraping must not be introduced without written authorization from the source.

## Moments

`FamilyMoment` supports family, selected-member and private visibility. Lists and photo downloads enforce that audience on the server. Photographs are stored through the existing local/S3 document storage layer, under a family and moment-specific path. Web and Android upload JPEG, PNG or WebP files up to 8 MB and retrieve protected files with the signed-in token.

Production storage should use a private S3 bucket with encryption, lifecycle rules, malware scanning and no public object ACLs.

## Financial overview

`FinancialAccount` is private to its owner by default. It stores only a nickname, institution, account type, optional last four characters, manually entered balance and sharing choice. Shared responses are redacted server-side and never expose the masked account identifier.

The current `manual` source is an organizer, not live banking. Nyas must never collect net-banking credentials, card PINs, OTPs or SMS inbox data for account aggregation.

Live connectivity is intentionally behind an Account Aggregator adapter boundary. Production enablement requires:

1. A contract with an RBI-regulated Account Aggregator.
2. Confirmation that Nyas or its regulated partner can serve the intended FIU/personal-finance use case.
3. Provider credentials and callback verification.
4. Purpose-specific consent artefacts, expiry, revocation and deletion.
5. A security and legal review plus updated Play Data Safety disclosure and privacy policy.

Until those conditions are met, `liveProviderConfigured` remains `false` and the connect action stays disabled.

## API surface

- `GET/POST/PATCH /api/product/families/:familyId/assets`
- `POST /api/product/families/:familyId/assets/:assetId/verifications`
- `GET/POST/PATCH /api/product/families/:familyId/moments`
- `POST /api/product/families/:familyId/moments/:momentId/photos`
- `GET /api/product/families/:familyId/moments/:momentId/photos/:documentId`
- `GET/POST/PATCH /api/product/families/:familyId/financial-accounts`
- `POST /api/auth/register`
- `POST /api/auth/product-login`

## Release checklist

1. Back up the production database and object storage.
2. Deploy to a separate staging API, database and bucket.
3. Run cross-family authorization tests with at least two unrelated families.
4. Validate invitations, family recovery and role changes.
5. Configure private S3 storage and upload scanning.
6. Review consent text, privacy policy, account deletion and data export.
7. Update Google Play Data Safety declarations for photos, financial information and property documents.
8. Pilot with internal non-production families before enabling self-service public onboarding.

No automatic migration, production deployment, bank connection or government-portal claim is performed by this branch.
