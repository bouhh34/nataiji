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
assert('PWA cache version current', /nataiji-shell-v22/.test(sw));
assert('PWA caches final mobile css', /release-100-v1\.css/.test(sw));
assert('PWA caches final visual polish', /nataiji-final-visual-v1\.css/.test(sw));
assert('PWA caches premium v2 layer', /nataiji-premium-v2\.css/.test(sw) && /nataiji-premium-v2\.js/.test(sw));
assert('PWA caches approved home reference layer', /nataiji-home-reference-v1\.css/.test(sw) && /nataiji-home-reference-v1\.js/.test(sw));
assert('PWA excludes API cache', /pathname\.startsWith\("\/api\/"\)/.test(sw));
assert('auth copy avoids ambiguous temporary storage', !/وضع تخزين مؤقت|Mode de stockage temporaire/.test(read('public/auth-access-v2.js')));
assert('French auth direction is explicit', /lang-fr \.auth-gate/.test(read('public/auth-access-v2.js')) || /lang-fr \.auth-gate/.test(read('public/interface-language-fix.js')));
assert('install card has no legacy text glyph', !/[⬇↓↔]/u.test(read('public/app-power-v1.js')));
assert('dynamic sharing cards use canonical icons', /data-feather=\"share-2\"/.test(read('public/auth-access-v2.js')) && /data-feather=\"link\"/.test(read('public/auth-access-v2.js')));
assert('grade enhancer scoped to real grade inputs', /input\.mark\[data-i\]\[data-j\],input\.mobile-mark\[data-i\]\[data-j\]/.test(read('public/final-grade-entry.js')));
assert('absence button exposes explicit selected state', /aria-pressed/.test(read('public/final-grade-entry.js')) && /aria-pressed/.test(read('public/grade-mobile-ui-v1.js')));
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
const homeReference = read('public/nataiji-home-reference-v1.css');
assert('home CTA normal-flow guard', /welcome button[\s\S]*position:static!important/.test(css));
assert('subject wrapping guard', /subject-progress-name[\s\S]*word-break:normal!important/.test(css));
assert('mobile report controls guard', /report-tabs[\s\S]*grid-template-columns:repeat\(3/.test(css));
assert('safe-area bottom nav', /safe-area-inset-bottom/.test(css));
assert('premium v2 is screen-scoped and print-safe', /@media screen/.test(premiumV2) && /@media print/.test(premiumV2));
assert('premium v2 keeps official report content untouched', !/official-sheet[^\n]*display:none/.test(premiumV2));
assert('home reference is screen-only and report-safe', /@media screen/.test(homeReference) && !/official-sheet|report-preview-stage|data-page=\"reports\"/.test(homeReference));
assert('home reference compacts progress list', /#subjectProgress>div/.test(homeReference) && /np-home-show-all/.test(homeReference));

console.log('\nNataiji final release audit');
for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}${c.detail?' — '+c.detail:''}`);
if (failures.length){
  console.error(`\n${failures.length} release gate check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} release gate checks passed.`);
