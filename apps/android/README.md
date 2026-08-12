# Nyas Android

Nyas Android is the mobile-first home for family identity, memory, Kosh, Sankalp, and collective decisions. The app uses English for everyday operation while retaining the few cultural terms that define the product: Nyas, Kul, Sankalp, Kosh, and Virasat.

## Native foundation

- Kotlin, Jetpack Compose, and Material 3
- Focused welcome and progressive sign-in that asks only for information needed to identify the member
- Encrypted on-device session storage backed by Android Keystore
- Native Darshan with real family, Kosh, and Sankalp data
- Adaptive bottom navigation on phones and navigation rail on larger screens
- Role-aware Account & Security surface with password change, preferences, legal links, and secure sign-out
- Verified `https://nyasa.xpresscure.com` deep links
- Edge-to-edge and safe-area-aware layouts
- Stable loading, empty, retry, and error states
- Native Kul Map with real generation, spouse, and parent-child relationships plus high-resolution image sharing
- Native Calendar, Sankalp Sabha, Virasat, profile, Kul Map, Kosh, and Sankalp workspace journeys
- Assigned Sankalp managers can advance stages, add or complete milestones, and publish progress reports
- First-time members are guided into Parichay before entering the wider family workspace

## Product navigation

The primary navigation is deliberately limited to five member jobs:

1. **Home** - understand what matters today and take the next action.
2. **Family** - find people, open the Kul Map, and explore Virasat.
3. **Sankalp** - understand shared projects, progress, and funding needs.
4. **Kosh** - see personal balance clearly, record a contribution, and allocate funds.
5. **You** - maintain profile, immediate family, and account security.

Calendar, Sankalp Sabha, Virasat, and other occasional tools live under More or inside their natural parent journey. This keeps the phone experience calm without hiding product depth.

## Native activity map

| Activity | Primary member action | Native migration |
| --- | --- | --- |
| Darshan | See what matters today and continue an action | Native |
| Parichay | Maintain identity, family links, education, work, and health | Native |
| Kul | Search and browse the member directory | Native |
| Kul Map | Explore relationships and generations | Native interactive graph with pan, zoom, and person details |
| Virasat | Read and add chronological family memories | Native |
| Kosh | Record a bank contribution and allocate it | Native guided flow |
| Sankalp | Follow projects, milestones, reports, documents, and funding | Native |
| Sankalp Sabha | Propose and vote | Native |
| Calendar | Celebrations and family events | Native |

All member-facing journeys now use the same API and permission model as the web portal without embedding web pages inside the app.

## Build a debug APK on Windows

Use JDK 17 for the Android build:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
cd apps\android
.\gradlew.bat :app:assembleDebug
```

The APK is created at:

```text
apps/android/app/build/outputs/apk/debug/app-debug.apk
```

## Release signing

Do not commit a keystore or passwords. Create one release keystore, store it outside Git, and configure Gradle signing through environment variables before producing the family release APK.

The first signed release is published at:

`https://github.com/XpressCure/nyasa/releases/tag/android-v1.0.0`

Keep the permanent signing key and its recovery details backed up securely. Every future update to the installed app must be signed with the same key.
