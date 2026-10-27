# Android offline-first — 30-day acceptance gate

This branch is isolated from `main` and the Google Play testing build. No deployment or production data migration is authorized by this document.

## Existing behavior confirmed in source
- `public/offline-session-v1.js` permits reopening a previously verified local workspace for up to **35 days**, provided the scoped cached profile is present. This already covers the requested 30-day window; **do not shorten it**.
- `public/sw.js` caches a web shell and avoids caching authenticated API responses.
- `capacitor.config.ts` still points `server.url` to the remote Render website; the Android application cannot yet be considered fully standalone offline-first.
- Grade drafts and reconnect checks exist, but do not demonstrate durable offline support for **all** create/edit/delete workflows.

## Implementation required before release
1. Inventory every authenticated Android workflow (classes, pupils, marks, terms, reports, sharing, permissions, library). Record offline-read/write behavior and server-only dependencies.
2. Package the app shell for native Android, resolve API origins, session/cookie authentication and CSP safely. Never simply remove `server.url`.
3. Persist authorized account/school/class/term data in durable, versioned, encrypted-at-rest storage where feasible, with isolation and safe migration. Never store credentials.
4. Add durable idempotent offline mutations for supported workflows; bind each to original account, school, class, term and revision; do not claim server persistence until confirmed.
5. Revalidate server rights before upload; quarantine pending edits on revoked access. Resolve concurrent changes per record and show conflicts.
6. Keep 30 days of offline reopening after last verified session, including force-close/reboot, without deleting unsynced data at expiry. Device clock changes must not silently extend rights.
7. Verify all existing features and printing/annual formulas without regressions. Preserve current main branch and live data.
8. Build signed Android AAB with incremented versionCode, install on a physical device, run Play internal testing and seek owner approval before merging/deploying.

## Acceptance matrix
- Login once online; download selected school/classes; airplane mode; force close and reopen at day 1, 3, 29, 30.
- Offline create/edit pupil, class, subject and grades; switch A→B→A; generate report and print; reboot; confirm persisted.
- Reconnect with interrupted/repeated requests; no duplicated pupil/grade; all queued changes eventually reconcile.
- Two devices edit same grade concurrently; no silent overwrite; explain conflict.
- Account switch, permission revocation, logout, app upgrade and storage quota failure; no cross-account leak.
- Day 31/35+ policy test: expiry requires online verification but preserves unsynced local data.
- Compare current Android release behavior against candidate on physical device and complete `npm run release:check`.

## Release hold
**NOT READY**: This is an implementation/acceptance specification, not proof that 30-day offline-first functionality has been delivered. Do not merge, deploy or publish until all gates pass.
