# Nataiji mobile release

App name: Nataiji | نتائجي
Bundle / package id: `mr.nataiji.app`
Production URL: `https://nataiji.onrender.com`

## Prepared in repository
- Capacitor Android/iOS configuration
- Production HTTPS URL
- Privacy page: `/privacy.html`
- Existing authentication and school isolation remain server-side
- Mobile build scripts in package.json

## Android build
1. `npm install`
2. `npx cap add android`
3. `npm run mobile:sync`
4. Set Android target SDK to API 36 or newer for Google Play submissions after 31 Aug 2026.
5. Configure release signing / Play App Signing.
6. Build signed Android App Bundle (AAB).
7. Test on physical phones and Play internal testing before production.

## iOS build
1. `npm install`
2. `npx cap add ios`
3. `npm run mobile:sync`
4. Open the iOS project in Xcode.
5. Select the Apple Developer Team and keep bundle id `mr.nataiji.app` if available.
6. Configure signing, app icons and launch assets.
7. Archive and upload to App Store Connect / TestFlight.
8. Test on physical iPhone/iPad before App Review.

## Store metadata still requiring owner input
- Legal developer / organization name
- Public support email
- Public support URL or contact page
- Final app icon and screenshots
- Google Play Console account
- Apple Developer / App Store Connect account and Team ID
- Store age-rating and data-safety declarations based on final production behavior

## Release gate
Do not submit until the web acceptance flow passes: login -> class -> subjects -> students -> grades -> results -> ranking -> reports -> two student bulletins per A4, and account/school isolation has been tested with at least two independent schools.
