# Nataiji v1.0.0 RC1

Release candidate frozen on 2026-09-22.

## Identity
- Product: نتائجي | Nataiji
- Package version: 1.0.0-rc.1
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

Android release builds inherit versionName from package.json and use versionCode 1 for RC1.
iOS RC1 uses marketing version 1.0.0 and build number 1.
