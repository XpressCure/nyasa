# Nyas Android

Nyas Android is the mobile-first home for family identity, memory, Kosh, Sankalp, and collective decisions. Version 1.1 begins the migration from the original WebView shell to a native Kotlin and Jetpack Compose product.

## Native foundation

- Kotlin, Jetpack Compose, and Material 3
- Animated Hindi-first welcome and progressive sign-in
- Encrypted on-device session storage backed by Android Keystore
- Native Darshan with real family, Kosh, and Sankalp data
- Adaptive bottom navigation on phones and navigation rail on larger screens
- Role-aware account surface and secure sign-out
- Verified `https://nyasa.xpresscure.com` deep links
- Edge-to-edge and safe-area-aware layouts
- Stable loading, empty, retry, and error states
- Existing production journeys remain available through an authenticated compatibility screen while each is migrated to native Compose

## Native activity map

| Activity | Primary member action | Native migration |
| --- | --- | --- |
| Darshan | See what matters today and continue an action | Native |
| Parichay | Maintain identity and immediate family | Compatibility, next native form |
| Kul | Browse members, memories, and family map | Compatibility, native graph planned |
| Kosh | Record a bank contribution and allocate it | Compatibility, biometric native flow planned |
| Sankalp | Follow, fund, and manage family work | Compatibility, native cards in Darshan |
| Sankalp Sabha | Propose and vote | Compatibility, native voting planned |
| Panchang | Celebrations and family events | Compatibility, native calendar planned |

The compatibility layer is temporary but intentional: it keeps every current production feature available while high-frequency journeys become fully native without splitting family data or permissions.

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
