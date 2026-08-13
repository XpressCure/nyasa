# Nyas Google Play release

## App identity

- App name: **Nyas**
- Package name: `com.xpresscure.nyas`
- Default language: English (India)
- Category: Social
- Website: `https://nyasa.xpresscure.com`
- Privacy policy: `https://nyasa.xpresscure.com/privacy`
- Account deletion: `https://nyasa.xpresscure.com/delete-account`
- Support page: `https://nyasa.xpresscure.com/legal`

## Store listing

### Short description

Your private family space for Kul, Kosh, Sankalp, wellbeing and legacy.

### Full description

Nyas is a private digital home for families to stay connected, preserve their shared legacy and turn collective intentions into transparent action.

Build your Parichay, explore the living Kul Map and keep family relationships, milestones and memories connected across generations. Follow birthdays, anniversaries and family events from one calm, shared space.

With Sankalp, members can see family initiatives, follow their purpose and progress, and allocate their confirmed Kosh balance within the rules agreed by the family. Kosh entries remain transparent and are reconciled by authorised family accountants.

Nyas also brings the family together through Sankalp Sabha, daily Prabhat Smaran and optional wellbeing challenges. Fitness progress can be connected through Health Connect only when the member chooses to grant access.

Key features:

- Private family membership and secure password sign-in
- Parichay profiles with photographs and family links
- Interactive Kul Map and Virasat timeline
- Birthdays, anniversaries and family calendar
- Transparent Kosh ledger and Sankalp allocation
- Sankalp proposals, voting, teams, milestones and updates
- Optional fitness goals and Health Connect activity sync
- Shared Prabhat Smaran canvas and reminders
- Role-based controls for family owners and Kosh administrators

Nyas is designed for a family community. It is not a bank account, public fundraising service, investment product or medical service.

## Release notes for 1.2.0

Welcome to the first Google Play release of Nyas.

- A polished family-first Android experience
- Kul Map, Parichay, Virasat and family calendar
- Kosh contribution declarations, personal ledger and Sankalp allocation
- Sankalp Sabha, milestones and progress updates
- Optional fitness goals with Health Connect
- Prabhat Smaran with morning and evening reminders
- Improved account security, password recovery and account deletion requests

## Data safety draft

The answers below must be checked against the final Play Console wording before submission.

| Data category | Collected | Shared | Purpose | Optional |
| --- | --- | --- | --- | --- |
| Name | Yes | No | Account and family identity | No |
| Phone number | Yes | No | Sign-in, account matching and support | No for a claimed login |
| Email address | Sometimes | No | Account and support | Yes |
| Profile photo | Sometimes | No | Family profile and Kul Map | Yes |
| Date of birth and family relationships | Sometimes | No | Family tree, celebrations and age eligibility | Yes |
| Residence, education and work profile | Sometimes | No | Parichay and family directory | Yes |
| Optional health profile | Sometimes | No | Private family health context | Yes |
| Steps, walking distance and exercise sessions | Sometimes | No | Fitness progress and challenges | Yes; Health Connect permission required |
| Financial contribution records | Yes when Kosh is used | No | Personal wallet, allocation and reconciliation | Feature-dependent |
| Uploaded documents and images | Sometimes | No | Profile, Sankalp, expense and family archive | Yes |
| App activity and security logs | Yes | No | Security, support and audit integrity | No |

- Data is encrypted in transit using HTTPS.
- Sensitive credentials, UPI PINs and banking passwords are not collected.
- The Android app does not request or read SMS messages.
- Users can request account deletion in app or at the public account-deletion URL.
- Required accounting, fraud-prevention and audit records may be retained with restricted access.

## Health apps declaration draft

- App health features: Activity and fitness.
- Health Connect data types read: Steps, Distance, Exercise sessions.
- Purpose: show the member's activity progress and voluntary family fitness challenges.
- Medical functionality: None.
- Nyas does not diagnose, treat, recommend medication, or replace professional medical care.
- Health Connect is optional and the member can revoke access from Android settings.

## App access instructions for review

Nyas is a private family workspace. Create a dedicated Play review account in the live family with no owner, Kosh administrator or financial approval permissions.

Provide Google Play review with:

- Reviewer's full name
- Reviewer's mobile number
- Reviewer's password
- Note: no OTP is required; use the supplied name, mobile and password
- Steps: open Nyas, enter the supplied full name and mobile number, enter the supplied password, then tap Sign in

Do not provide a real family member's password.

## Console submission order

1. Create the app in Play Console and select **App** and **Free**.
2. Complete app access, ads, content rating, target audience, news-app and data-safety declarations.
3. Complete the Health apps declaration.
4. Add the privacy-policy and account-deletion URLs.
5. Add store icon, feature graphic and at least two phone screenshots.
6. Upload the signed `.aab` to Internal testing first.
7. Add family testers and complete one end-to-end install, sign-in, Kosh and Sankalp test.
8. Promote the verified build to Production and submit for review.

