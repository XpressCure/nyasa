# Nyas Android App

## Product promise

The Android app should help a family member understand the next useful action within a few seconds. It is not a smaller desktop portal. The mobile information architecture is intentionally limited to four primary destinations and one secondary menu:

1. **Darshan** - today's family picture and next actions
2. **Kul** - family members, relationships, and Kul Map
3. **Kosh** - declare a bank contribution and allocate wallet money
4. **Sankalp** - funding, milestones, progress, and documents
5. **More** - Parichay, Panchang, Sankalp Sabha, administration, and sign out

## First release architecture

The native Android shell loads the production React application from `https://nyasa.xpresscure.com/dashboard`. This provides immediate parity with the family web version and keeps one source of truth for permissions and workflows. Android adds the capabilities that a browser cannot provide reliably:

- Camera and gallery selection
- PDF/image document selection
- Authenticated downloads
- Kul Map file saving
- Android share sheet
- Deep links
- Offline recovery
- Android back navigation

The web UI detects mobile width and presents app-style navigation. Future high-frequency flows can move to fully native screens without changing the API or database.

## Release gates

- Login and first-time password setup
- Parichay save and photo upload
- Immediate Kul create/search/link
- Kul Map view and download
- Kosh declaration confirmation
- Wallet-to-Sankalp allocation
- Sankalp browsing, updates, and document upload/download
- Panchang create/view
- Sankalp Sabha voting eligibility
- Owner/accountant permission checks
- Offline and interrupted-network behavior
- Back-button behavior
- Small Android phone and standard Android phone visual checks

## APK distribution

The family APK will be signed with one long-lived release key, uploaded under the Nyas domain, and linked from the home page. The release keystore must remain outside Git and be backed up securely. Every later APK must use the same key so Android can install it as an update.
