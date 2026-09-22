import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const exists = p => fs.existsSync(path.join(root,p));
const failures = [];
const checks = [];
function assert(name, ok, detail=''){
  checks.push({name,ok,detail});
  if(!ok) failures.push(name + (detail ? ': '+detail : ''));
}

const required = [
  'public/index.html','public/manifest.webmanifest','public/sw.js',
  'public/privacy.html','public/terms.html','public/release-100-v1.css','public/nataiji-final-visual-v1.css','public/nataiji-premium-v2.css','public/nataiji-premium-v2.js','public/nataiji-home-reference-v1.css','public/nataiji-home-reference-v1.js',
  'public/nataiji-brand-mark.png','capacitor.config.ts',
  '.github/workflows/mobile-android-release.yml',
  '.github/workflows/mobile-ios-appstore.yml',
  '.github/workflows/mobile-production-smoke.yml',
  'scripts/server-smoke.mjs'
];
for (const file of required) assert('required:'+file, exists(file));

const index = read('public/index.html');
const sw = read('public/sw.js');
const server = read('src/server.js');
const capacitor = read('capacitor.config.ts');
const pkg = JSON.parse(read('package.json'));

assert('brand title', /نتائجي\s*\|\s*Nataiji/.test(index));
assert('viewport safe area', /viewport-fit=cover/.test(index));
assert('rtl-ltr boot direction', /document\.documentElement\.dir/.test(index));
assert('final mobile css loaded', /release-100-v1\.css/.test(index));
assert('final visual polish loaded', /nataiji-final-visual-v1\.css/.test(index));
assert('premium v2 visual layer loaded', /nataiji-premium-v2\.css/.test(index) && /nataiji-premium-v2\.js/.test(index));
assert('approved home reference layer loaded last', /nataiji-home-reference-v1\.css/.test(index) && /nataiji-home-reference-v1\.js/.test(index));
assert('privacy page exists', exists('public/privacy.html'));
assert('terms page exists', exists('public/terms.html'));
assert('PWA cache version current', /nataiji-shell-v39/.test(sw));
assert('PWA caches final mobile css', /release-100-v1\.css/.test(sw));
assert('PWA caches final visual polish', /nataiji-final-visual-v1\.css/.test(sw));
assert('PWA caches premium v2 layer', /nataiji-premium-v2\.css/.test(sw) && /nataiji-premium-v2\.js/.test(sw));
assert('PWA caches approved home reference layer', /nataiji-home-reference-v1\.css/.test(sw) && /nataiji-home-reference-v1\.js/.test(sw));
assert('PWA excludes API cache', /pathname\.startsWith\("\/api\/"\)/.test(sw));
assert('auth copy avoids ambiguous temporary storage', !/وضع تخزين مؤقت|Mode de stockage temporaire/.test(read('public/auth-access-v2.js')));
assert('French auth direction is explicit', /lang-fr \.auth-gate/.test(read('public/auth-access-v2.js')) || /lang-fr \.auth-gate/.test(read('public/interface-language-fix.js')));
const authAccess = read('public/auth-access-v2.js');
assert('auth exposes Arabic French language switch', /data-auth-lang="ar"/.test(authAccess) && /data-auth-lang="fr"/.test(authAccess));
assert('auth language switch updates direction immediately', /document\.documentElement\.dir=next==='fr'\?'ltr':'rtl'/.test(authAccess));
const bilingualEditor = read('public/bilingual-data-editor-v1.js');
assert('paired Arabic French fields sync live both ways', /a\.addEventListener\('input',\(\)=>\{f\.value=arToFr\(a\.value\)\}\)/.test(bilingualEditor) && /f\.addEventListener\('input',\(\)=>\{a\.value=frToAr\(f\.value\)\}\)/.test(bilingualEditor));
assert('new subject starts with blank bilingual names and max score', /draft\.push\(\['',1,'','',''\]\)/.test(bilingualEditor));
const adminUxPolish = read('public/admin-ux-polish-v1.js');
assert('new blank subject opens immediately', /const isNew=!String\(ar\?\.value\|\|''\)\.trim\(\)/.test(adminUxPolish));
assert('subject header uses compact edit delete guide', /السهم لفتح المادة وتعديلها/.test(bilingualEditor) && /لحذف المادة/.test(bilingualEditor) && !/المعامل ثابت/.test(bilingualEditor));
const structureManager = read('public/structure-manager.js');
assert('school structure uses exactly three fixed trimesters', /const FIXED_TERMS=\['الفصل الأول','الفصل الثاني','الفصل الثالث'\]/.test(structureManager) && !/id="addTerm"/.test(structureManager) && !/data-term-del/.test(structureManager));
assert('structure modal localizes trimesters and standard classes', /TERM_FR/.test(structureManager) && /CLASS_FR/.test(structureManager) && /Trimestres et classes/.test(structureManager));
const onboarding = read('public/onboarding-v1.js');
assert('school form uses precise French school label', /Nom de l’école en français/.test(authAccess) && /Nom de l’école en français/.test(onboarding) && /Nom de l’école en français/.test(bilingualEditor));
assert('My Schools keeps Arabic and French school names synchronized', /schoolAr\.addEventListener\('input'.*schoolFr\.value=toFr/s.test(authAccess) && /schoolFr\.addEventListener\('input'.*schoolAr\.value=toAr/s.test(authAccess));
assert('school create action is full width', /#auth2AddSchool\{width:100%!important/.test(adminUxPolish));
assert('teacher invite labels grade access clearly', /الوصول إلى الدرجات/.test(authAccess) && /اختر «تعديل» أمام المواد/.test(authAccess));
assert('teacher invite warns when no subject is editable', /لم تمنح المعلم تعديل أي مادة/.test(adminUxPolish) && /اختر «تعديل» أمام مادة واحدة على الأقل/.test(adminUxPolish));
assert('teacher invite permissions are compact on mobile', /\.auth2-invite \.auth2-perms label\{margin:0!important;padding:6px 4px!important/.test(adminUxPolish));
const interfaceLanguage = read('public/interface-language-fix.js');
assert('institution academic year stays LTR', /id="by" class="bi-year-input" dir="ltr"/.test(bilingualEditor) && /\.bi-year-input\{direction:ltr!important/.test(bilingualEditor));
assert('institution AR FR marker is a compact badge', /bi-title-badge/.test(bilingualEditor) && /بيانات المؤسسة<\/span><span class="bi-title-badge"/.test(bilingualEditor));
assert('language card has only one icon source', !/<svg viewBox="0 0 24 24"[^>]*aria-hidden="true"[^>]*focusable="false"/.test(interfaceLanguage) && /langSwitch:'globe'/.test(read('public/luxury-ui-v1.js')));
assert('shared class attach action is full width', /\.auth2-join-modal \.action\{width:100%!important/.test(adminUxPolish));
assert('subject save requires explicit maximum score', /الدرجة القصوى/.test(bilingualEditor) && /bi-field-invalid/.test(bilingualEditor) && /data-sm/.test(bilingualEditor));
assert('focused invalid subject fields remain red', /input\.bi-field-invalid:focus/.test(bilingualEditor));
assert('subject validation summarizes all missing fields', /أكمل الحقول المطلوبة/.test(bilingualEditor) && /الاسم بالعربية/.test(bilingualEditor) && /الاسم بالفرنسية/.test(bilingualEditor) && /الدرجة القصوى/.test(bilingualEditor));
assert('all report print actions are primary green', /#printResult,[\s\S]*\.report-print\{[\s\S]*color:#fff!important[\s\S]*background:linear-gradient\(135deg,#078b70,#086f61\)!important/.test(read('public/nataiji-premium-v2.css')));
assert('install card has no legacy text glyph', !/[⬇↓↔]/u.test(read('public/app-power-v1.js')));
const appPower = read('public/app-power-v1.js');
assert('More menu ordering avoids mutation loop', /del&&del!==grid\.lastElementChild/.test(appPower) && /logout&&logout\.nextElementSibling!==del/.test(appPower));
assert('dynamic sharing cards use canonical icons', /data-feather=\"share-2\"/.test(read('public/auth-access-v2.js')) && /data-feather=\"link\"/.test(read('public/auth-access-v2.js')));
assert('grade enhancer scoped to real grade inputs', /input\.mark\[data-i\]\[data-j\],input\.mobile-mark\[data-i\]\[data-j\]/.test(read('public/final-grade-entry.js')));
assert('absence button exposes explicit selected state', /aria-pressed/.test(read('public/final-grade-entry.js')) && /aria-pressed/.test(read('public/grade-mobile-ui-v1.js')));
const gradeMobileUi = read('public/grade-mobile-ui-v1.js');
assert('grade entry renders current subject icon host', /grade-current-subject-icon/.test(gradeMobileUi));
assert('grade entry keeps inactive absence control distinct from score field', /border:1px solid #d9ab38/.test(gradeMobileUi) && /background:#fff3c4!important;color:#6f4f00/.test(gradeMobileUi) && /absent-btn::before/.test(gradeMobileUi));
assert('grade entry compacts filters and rows', /padding:11px!important;border-radius:15px/.test(gradeMobileUi) && /height:58px!important;min-height:58px!important;max-height:58px/.test(gradeMobileUi));
assert('bulk grade save persists validated values', /normalizedMarks/.test(server));
assert('secure cookie enabled', /httpOnly:true/.test(server) && /sameSite:'lax'/.test(server));
assert('origin protection enabled', /cross_site_request_blocked/.test(server));
assert('CSP enabled', /Content-Security-Policy/.test(server));
assert('HSTS enabled', /Strict-Transport-Security/.test(server));
assert('password hashing is scrypt', /scryptSync/.test(server));
assert('account password change exists', /\/api\/account\/password/.test(server));
assert('account deletion exists', /app\.delete\('\/api\/account'/.test(server));
assert('health endpoint exists', /app\.get\('\/health'/.test(server));
assert('durable storage health reporting', /storage/.test(server) && /databaseOk/.test(server));
assert('Capacitor package id', /appId:\s*'mr\.nataiji\.app'/.test(capacitor));
assert('Capacitor HTTPS production url', /https:\/\/nataiji\.onrender\.com/.test(capacitor));
assert('Android dependency present', Boolean(pkg.dependencies?.['@capacitor/android']));
assert('iOS dependency present', Boolean(pkg.dependencies?.['@capacitor/ios']));

const css = read('public/release-100-v1.css');
const premiumV2 = read('public/nataiji-premium-v2.css');
const subjectLocale = read('public/premium-subject-locale-v1.js');
const homeReference = read('public/nataiji-home-reference-v1.css');
assert('home CTA normal-flow guard', /welcome button[\s\S]*position:static!important/.test(css));
assert('subject wrapping guard', /subject-progress-name[\s\S]*word-break:normal!important/.test(css));
assert('mobile report controls guard', /report-tabs[\s\S]*grid-template-columns:repeat\(3/.test(css));
assert('safe-area bottom nav', /safe-area-inset-bottom/.test(css));
assert('premium v2 is screen-scoped and print-safe', /@media screen/.test(premiumV2) && /@media print/.test(premiumV2));
assert('premium v2 keeps official report content untouched', !/official-sheet[^\n]*display:none/.test(premiumV2));
assert('semantic subject icon set present', /islamic:/.test(subjectLocale) && /arabic:/.test(subjectLocale) && /math:/.test(subjectLocale) && /civic:/.test(subjectLocale) && /art:/.test(subjectLocale) && /french:/.test(subjectLocale) && /sport:/.test(subjectLocale));
assert('premium icon helper deduplicates direct icons', /direct\.slice\(1\)\.forEach/.test(read('public/nataiji-premium-v2.js')));
assert('home reference is screen-only and report-safe', /@media screen/.test(homeReference) && !/official-sheet|report-preview-stage|data-page=\"reports\"/.test(homeReference));
assert('home reference compacts progress list', /#subjectProgress>div/.test(homeReference) && /np-home-show-all/.test(homeReference));

console.log('\nNataiji final release audit');
for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}${c.detail?' — '+c.detail:''}`);
if (failures.length){
  console.error(`\n${failures.length} release gate check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} release gate checks passed.`);
