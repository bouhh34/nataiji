# Nataiji v1.0.0 RC3

Closed-testing candidate prepared on 2026-10-11 from main after user confirmation.

## Identity
- Product: نتائجي | Nataiji
- Version: 1.0.0-rc.3
- Android package: mr.nataiji.app
- Android versionCode: 3; verify highest uploaded code in Play before upload.
- Target SDK: 36
- Website: https://nataiji.onrender.com
- Existing signing secrets required; no replacement signing key.

## Validation
Run `npm run release:check`. GitHub Actions builds and signs the AAB from this commit.

## Changes
- Student imports from PDF, photos and camera, with Gemini transcription.
- Review source names before saving editable Arabic and French names.
- Official Koutoubi books by year and preparation links.
- Download option remains visible for installed users.
- Session restoration, class-response guards and account-scoped grade drafts.

## Known limits
- Capacitor loads the HTTPS website; fresh launch/login requires network. Complete offline roster editing is not implemented.
- Same-name pupils can be distinct; names do not establish identity. Repeated imports require review against existing pupils.
- Transliteration is an editable suggestion, not legal spelling.
- Physical Android install/upgrade, camera, PDF print/share, offline restart and two-device synchronization remain acceptance tasks.
- User confirmed successful Gemini extraction on 2026-10-11; no accuracy percentage claimed.
- Play Console upload, highest versionCode, store declarations and tester requirements require Console access.

## Open pull requests excluded from this candidate
- #93: educational staff modal timeout and retry.
- #46: unified professor class reports.
- #40: mobile acceptance absence contrast.
These branches are not automatically merged into the release.
