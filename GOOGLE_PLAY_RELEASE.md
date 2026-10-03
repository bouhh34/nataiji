# Nataiji — Google Play release preparation

Package: `mr.nataiji.app`  
App title: **نتائجي | Nataiji**  
Category: Education  
Website: https://nataiji.onrender.com  
Support: bahmedou596@gmail.com  
Privacy: https://nataiji.onrender.com/privacy.html  
Account deletion: https://nataiji.onrender.com/delete-account.html

## Verified Android candidate — 3 October 2026

- Source commit: `a974e6bb119a89041f7e0405837574b9fc042550` (merged PR #86).
- Every one of the seven PostgreSQL/browser acceptance workflows passed, plus 20 regression tests and 180 release gates.
- Production verification passed for `nataiji-shell-v100`, PostgreSQL connectivity, Brotli delivery, privacy and deletion pages.
- Signed Android AAB built successfully with API 36 and versionCode 1 using the existing repository upload key.
- Bundle SHA-256: `5f65dd20657d4d68213325ee7d37954733d21523f59682aec5701c258233f627`.
- Build run: https://github.com/bouhh34/nataiji/actions/runs/37080344406
- Google Play upload and physical-device/internal testing are still pending. Confirm that versionCode 1 is unused and this configured certificate matches the package's Play upload key before submission.

## Arabic store listing

Short description:

> أقسامك ودرجاتك وتقاريرك المدرسية، بالعربية والفرنسية في مكان واحد.

Full description:

نتائجي يساعد المعلمين والأساتذة وإدارة المدرسة على تنظيم الأقسام والتلاميذ والدرجات وإعداد التقارير بالعربية والفرنسية.

• أنشئ أقسامك وحدد المواد الدراسية ومعاملاتها.  
• أدخل درجات الفصول الثلاثة وتابع معدلات المواد والمعدل السنوي.  
• احفظ عملك في حسابك واسترجع الدرجات بعد إعادة فتح التطبيق.  
• شارك القسم مع زملائك باستخدام رمز دعوة وصلاحيات محددة.  
• جهّز لوائح القسم وكشوف التلاميذ للطباعة أو الحفظ بصيغة PDF عبر خيارات الطباعة المتاحة على الجهاز.  
• بدّل بين العربية والفرنسية من داخل التطبيق.

تُخزّن ملفات الواجهة محليًا بعد أول تحميل ناجح لتقليل التنزيل المتكرر. يتطلب تسجيل الدخول وحفظ البيانات في الخادم اتصالًا بالإنترنت. راجع تأكيد نجاح الحفظ عند ضعف الشبكة.

التطبيق مخصص للمستخدمين المهنيين المخولين بمعالجة البيانات المدرسية. نتائجي أداة مستقلة، ولا يمثل جهة حكومية.

## French store listing

Short description:

> Gérez vos classes, notes et bulletins en arabe et en français.

Full description:

Nataiji aide les enseignants, professeurs et responsables d’établissement à organiser les classes, élèves et notes, avec des rapports en arabe et en français.

• Créez vos classes et définissez les matières et coefficients.  
• Saisissez les notes des trois trimestres et suivez les moyennes annuelles.  
• Enregistrez votre travail dans votre compte et retrouvez vos notes à la réouverture.  
• Partagez une classe avec vos collègues par code d’invitation et autorisations.  
• Préparez les listes de classe et bulletins à imprimer ou enregistrer en PDF avec les options disponibles sur l’appareil.  
• Passez de l’arabe au français dans l’application.

Après un premier chargement réussi, les fichiers de l’interface sont conservés localement pour réduire les téléchargements répétés. La connexion au compte et l’enregistrement sur le serveur nécessitent Internet. Vérifiez la confirmation de sauvegarde lorsque le réseau est instable.

L’application est destinée aux professionnels autorisés à traiter les données scolaires. Nataiji est un outil indépendant et ne représente pas une autorité publique.

## Build and signing

`.github/workflows/mobile-android-release.yml` validates the release source and Android API 36 target, builds the AAB and verifies signing when configured. It emits a source SHA and SHA-256 report alongside the AAB. See `MOBILE_SIGNING_SECRETS.md` for required secret names. No passwords or private keys belong in source control.

Use the existing upload key if this package has already been registered in Play. `ANDROID_VERSION_CODE` must exceed the latest uploaded code. An artifact named `nataiji-android-play-UNSIGNED` cannot be submitted to Play. Only use `nataiji-android-play-SIGNED` after verifying its source commit and testing the resulting build.

## Screenshots

The professor browser acceptance workflow captures four 1080 × 1920 PNG previews using disposable demonstration accounts: Arabic teacher home, grades and collective reports, plus French reports. Download the `nataiji-play-screenshots` artifact from a successful current run and inspect all images before uploading. These screenshots do not substitute for testing an Android device.

The branded native icon and splash images are generated from `assets/logo.png`. Store assets are prepared in `assets/play-store/`: `icon-512.png` (512 × 512, PNG with alpha channel) and `feature-graphic.png` (1024 × 500, opaque PNG). The editable banner source is `feature-graphic.svg`, which uses the existing approved logo.

## Play Console declarations to review

| Item | Evidence / proposed answer |
| --- | --- |
| Audience | Teachers and authorized school staff; do not select children as the intended audience without reviewing the actual product. |
| Ads | No ad SDK or advertising code found in this repository. |
| Account creation | Yes: email, name and password. |
| Data collected | User name, email, account identifiers; school/class details; authorized student names, school numbers, birth dates, sex and grades. Review the corresponding Console categories. |
| Purpose | Account management and app functionality, including saving grades and generating reports. |
| Encryption in transit | Production uses HTTPS; confirm the live service before submission. |
| Deletion | In-app password-confirmed deletion and a public email request page. Shared classroom rosters used by other members remain with those members. |
| Sharing | Authorized classroom collaboration and hosting/email providers. Review Google's distinction between service-provider processing and sharing before completing the form. |
| Permissions | Check the merged Android manifest from the actual release; do not declare sensitive permissions that are absent. |
| App access | Give reviewers a dedicated disposable demonstration account with classes and grades. Do not include production credentials. |

The developer must confirm the legal developer name, data-safety and content-rating forms, countries and pricing in Play Console. Check the actual Console account for any required closed testing before production access.

## Final verification before submission

1. Current commit passes every required GitHub acceptance check, including shared-school isolation, grade preservation, complete account deletion and weak-network UI behavior.
2. Live HTTPS privacy and deletion pages match the release and are publicly accessible.
3. Signed AAB uses the correct upload key, package and unused versionCode.
4. Install through Play internal testing on a physical Android device. Check Arabic/French layout, back navigation, reopening, weak connection, grade saves, printing/PDF, sharing and account deletion with disposable accounts.
5. Upload reviewed screenshots, feature graphic and store text; complete app access, data safety and content-rating declarations.
6. Submit from the authorized Play Console account. Google review and any account-specific testing gate remain external to this repository.
