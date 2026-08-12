# Nyas Android

The Android application is a secure native shell for the live Nyas family platform. It deliberately reuses the production React experience so Android and web members see the same family data, permissions, Sankalp, Kosh, profiles, and Kul Map.

## Included in the first APK

- Persistent secure sign-in through Android WebView storage
- Native camera and document picker for profile photos, estimates, bills, and evidence
- Native authenticated downloads for Sankalp documents and receipts
- Android Downloads support for generated Kul Map images
- Android share sheet support
- Verified `https://nyasa.xpresscure.com` deep links
- External links open in the device browser
- Offline recovery screen and retry
- Android back navigation and saved screen state
- No cleartext HTTP traffic and no SSL-error bypass

## Build a debug APK on Windows

Use JDK 17 for the Android build:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
cd apps\android
.\gradlew.bat assembleDebug
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
