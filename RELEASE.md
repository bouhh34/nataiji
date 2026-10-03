# Nataiji v1.0.0 RC2

Release candidate frozen on 2026-10-03.

## Identity
- Product: نتائجي | Nataiji
- Package version: 1.0.0-rc.2
- Capacitor app ID: mr.nataiji.app
- Production URL: https://nataiji.onrender.com
- PWA display mode: standalone
- Primary language: Arabic, with French interface support

## Release policy
This RC is feature-frozen. Only release-blocking bugs, security fixes, data-integrity fixes, and critical compatibility fixes should be merged before v1.0.0.

## Validation gate
Run:
```
npm run release:check
```

Android release builds inherit versionName from package.json and use versionCode 2 by default for RC2.
iOS RC2 uses marketing version 1.0.0 and build number 1.

## Weak-connection and account improvements
Professor grade changes are stored in per-account local drafts before verified delta batches are sent. Drafts survive navigation, reconnect and authenticated reload; fresh login still needs Internet. Concurrent-device changes require review. Export/import restores pending grade drafts without replacing school structure. Sessions can be revoked from account settings with the current password. Invalid grades are rejected explicitly.
