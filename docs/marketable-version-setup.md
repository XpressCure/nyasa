# Marketable Nyas Version Setup

This branch is for turning Nyas into a repeatable subscription product while keeping `main` as the live family version for `nyasa.xpresscure.com`.

## Branch Purpose

- `main`: live Nyasa family workspace.
- `marketable-version`: product website, sales demo, configurable customer workspace, and subscription roadmap.

## What Can Be Built Without New Infrastructure

- Product-facing homepage and pricing.
- Sales/demo content.
- Configurable language, labels, and customer-facing copy.
- Demo mode UI that does not write to the family production database.
- Onboarding checklist and internal admin workflows.

## Frontend Product Config

The marketable frontend can be rebranded without code changes through `apps/web/.env`.

```env
VITE_NYAS_DEMO_MODE=true
VITE_NYAS_PRODUCT_NAME=Nyas
VITE_NYAS_PRODUCT_HINDI_NAME=न्यास
VITE_NYAS_PRODUCT_SHORT_LABEL=Family OS
VITE_NYAS_PRODUCT_TAGLINE=One private digital home for every large family.
VITE_NYAS_PRODUCT_PROMISE=विरासत, विश्वास, निर्णय और योगदान - सब एक सुरक्षित डिजिटल न्यास में।
VITE_NYAS_PUBLIC_SUMMARY_ENDPOINT=/families/public/nyasa-summary
```

Use `VITE_NYAS_DEMO_MODE=true` for sales demos that should not depend on the live family API summary.

## When We Need A New EC2 And DB

Create separate infrastructure before any public demo or paid customer uses the product version.

Required then:

- New app host or subdomain, for example `nyas.xpresscure.com` or `demo.nyas.in`.
- Separate MongoDB database or Atlas project.
- Separate S3 prefix or bucket for customer uploads.
- Separate Razorpay test/live keys for product subscriptions.
- Separate environment variables and PM2 process name.

## Suggested Product Environments

1. **Family production**
   - Branch: `main`
   - Domain: `nyasa.xpresscure.com`
   - Database: current family database
   - Purpose: live family portal

2. **Product demo**
   - Branch: `marketable-version`
   - Domain: `demo.nyas.xpresscure.com`
   - Database: demo database
   - Purpose: sales calls and guided demos

3. **First paid customer**
   - Branch: stable release from `marketable-version`
   - Domain: customer-specific or shared tenant domain
   - Database: tenant-safe production database
   - Purpose: paid subscription

## First Product Build Priorities

1. Replace family-specific public copy with product positioning.
2. Add a lead capture or demo request flow.
3. Add tenant/customer branding config.
4. Add demo data mode so sales screens never depend on private family data.
5. Add subscription/account model.
6. Add admin onboarding dashboard for new customers.
