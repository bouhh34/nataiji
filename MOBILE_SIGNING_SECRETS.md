# Mobile signing secrets for Nataiji

This file documents the secret names expected by the release workflows. Never commit secret values to the repository.

## Android / Google Play

The workflow `.github/workflows/mobile-android-release.yml` builds an Android App Bundle (AAB).

Required repository secrets for a signed Play bundle:

- `ANDROID_KEYSTORE_BASE64` — release keystore encoded as base64
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Set the repository variable `ANDROID_VERSION_CODE` to a positive integer greater than the highest version already uploaded to Play; the current RC2 defaults to 2. A manual run can override this value with its `version_code` input. Never reuse an uploaded versionCode.

Without these secrets the workflow intentionally produces an **UNSIGNED** AAB dry-run artifact only.

Recommended release identity:

- application id: `mr.nataiji.app`
- app name: `Nataiji | نتائجي`

Keep the keystore and passwords in at least two secure backups. Losing the upload key can complicate future releases.

## iOS / App Store

The manual workflow `.github/workflows/mobile-ios-appstore.yml` expects:

- `APPLE_TEAM_ID`
- `IOS_CERTIFICATE_P12_BASE64` — Apple Distribution certificate + private key exported as .p12, then base64 encoded
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64` — App Store distribution provisioning profile for `mr.nataiji.app`, base64 encoded

For optional automatic TestFlight upload, also add:

- `APPSTORE_API_KEY_ID`
- `APPSTORE_API_ISSUER_ID`
- `APPSTORE_API_PRIVATE_KEY_BASE64` — App Store Connect API .p8 key encoded as base64

The iOS workflow remains manual and will stop immediately if the core signing secrets are absent.

## Current validation status

- Android branded debug APK: build verified.
- Android branded release AAB: unsigned dry-run build verified.
- iOS branded simulator app: build verified.
- Two-school production persistence/isolation smoke test: verified and disposable test accounts deleted.
- Signed Android AAB: verified on 3 October 2026 from commit `497208819b791fa0ba292a2fef3e3667a37978f7`, API 36, versionCode 2, with the configured repository upload key.
- Google Play submission: pending Play Console upload and account-specific review/testing requirements.
- Signed iOS IPA/TestFlight: waiting for Apple Developer signing data.

Current bundle SHA-256: `fcc44001323d42c50555912c0d220d8df3498a4435fb6030e67869dde874b6a1`.
Public upload certificate SHA-256: `4C:E9:93:8E:2E:AF:71:7C:44:DE:EA:91:DC:EF:B6:3C:70:7A:EF:22:03:47:E1:A2:F1:C7:AD:98:2B:FF:65:C3` (matches the prior configured upload certificate).
