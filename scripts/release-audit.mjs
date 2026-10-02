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
const appJs = read('public/app.js');
const capacitor = read('capacitor.config.ts');
const pkg = JSON.parse(read('package.json'));
const lockPkg = JSON.parse(read('package-lock.json'));
const manifest = JSON.parse(read('public/manifest.webmanifest'));
assert('RC package version', pkg.version === '1.0.0-rc.1');
assert('lockfile matches RC package version', lockPkg.version === pkg.version && lockPkg.packages?.['']?.version === pkg.version);
assert('PWA stable app identity', manifest.id === '/' && manifest.name === 'نتائجي | Nataiji' && manifest.display === 'standalone');
assert('release freeze document exists', exists('RELEASE.md') && /Nataiji v1\.0\.0 RC1/.test(read('RELEASE.md')));
const androidRelease=read('.github/workflows/mobile-android-release.yml');
assert('Android RC version is wired from package.json', /Apply RC version metadata/.test(androidRelease) && /versionCode \$ANDROID_VERSION_CODE/.test(androidRelease));
assert('Android bundle validates Play API and signing', /target>=36/.test(androidRelease) && /Validate signing configuration/.test(androidRelease) && /npm run release:check/.test(androidRelease));
assert('iOS RC version metadata is explicit', /Apply RC version metadata/.test(read('.github/workflows/mobile-ios-appstore.yml')) && /CURRENT_PROJECT_VERSION = 1/.test(read('.github/workflows/mobile-ios-appstore.yml')));
const directDownload = read('.github/workflows/mobile-download.yml');
const downloadPage = read('public/download.html');
assert('direct Android download uses RC version metadata', /Apply RC version metadata/.test(directDownload) && /versionCode 1/.test(directDownload));
assert('direct Android package remains installable APK', /assembleDebug/.test(directDownload) && /app-debug\.apk/.test(directDownload));
assert('official download page identifies RC1 and Android sideloading', /Nataiji v1\.0\.0 RC1/.test(downloadPage) && /خارج Google Play/.test(downloadPage));
assert('download page links privacy and terms', /\/privacy\.html/.test(downloadPage) && /\/terms\.html/.test(downloadPage));

assert('brand title', /نتائجي\s*\|\s*Nataiji/.test(index));
assert('viewport safe area', /viewport-fit=cover/.test(index));
assert('rtl-ltr boot direction', /document\.documentElement\.dir/.test(index));
assert('final mobile css loaded', /release-100-v1\.css/.test(index));
assert('final visual polish loaded', /nataiji-final-visual-v1\.css/.test(index));
assert('premium v2 visual layer loaded', /nataiji-premium-v2\.css/.test(index) && /nataiji-premium-v2\.js/.test(index));
assert('approved home reference layer loaded last', /nataiji-home-reference-v1\.css/.test(index) && /nataiji-home-reference-v1\.js/.test(index));
assert('privacy page exists', exists('public/privacy.html'));
assert('terms page exists', exists('public/terms.html'));
assert('account deletion web resource exists', exists('public/delete-account.html'));
assert('PWA caches account deletion help', /\/delete-account\.html/.test(sw) && /\/info-pages\.css\?v=1/.test(sw));
assert('privacy has public support and deletion links', /mailto:bahmedou596@gmail\.com/.test(read('public/privacy.html')) && /\/delete-account\.html/.test(read('public/privacy.html')));
assert('PWA cache version current', /nataiji-shell-v98/.test(sw));
assert('PWA caches final mobile css', /release-100-v1\.css/.test(sw));
assert('PWA caches final visual polish', /nataiji-final-visual-v1\.css/.test(sw));
assert('PWA caches premium v2 layer', /nataiji-premium-v2\.css/.test(sw) && /nataiji-premium-v2\.js/.test(sw));
assert('PWA caches approved home reference layer', /nataiji-home-reference-v1\.css/.test(sw) && /nataiji-home-reference-v1\.js/.test(sw));
assert('PWA excludes API cache', /pathname\.startsWith\(['"]\/api\/['"]\)/.test(sw));
assert('auth copy avoids ambiguous temporary storage', !/وضع تخزين مؤقت|Mode de stockage temporaire/.test(read('public/auth-access-v2.js')));
assert('French auth direction is explicit', /lang-fr \.auth-gate/.test(read('public/auth-access-v2.js')) || /lang-fr \.auth-gate/.test(read('public/interface-language-fix.js')));
const authAccess = read('public/auth-access-v2.js');
assert('auth exposes Arabic French language switch', /data-auth-lang="ar"/.test(authAccess) && /data-auth-lang="fr"/.test(authAccess));
assert('auth language switch updates direction immediately', /document\.documentElement\.dir=next==='fr'\?'ltr':'rtl'/.test(authAccess));
const bilingualEditor = read('public/bilingual-data-editor-v1.js');
assert('paired Arabic French fields sync live both ways', /const fromAr=\(\)=>/.test(bilingualEditor) && /f\.value=arToFr\(a\.value\)/.test(bilingualEditor) && /const fromFr=\(\)=>/.test(bilingualEditor) && /a\.value=frToAr\(f\.value\)/.test(bilingualEditor) && /a\.addEventListener\('input'.*fromAr\(\)/.test(bilingualEditor) && /f\.addEventListener\('input'.*fromFr\(\)/.test(bilingualEditor));
assert('new subject starts with blank bilingual names and max score', /draft\.push\(\['',1,'','',''\]\)/.test(bilingualEditor));
const adminUxPolish = read('public/admin-ux-polish-v1.js');
assert('new blank subject opens immediately', /const isNew=!String\(ar\?\.value\|\|''\)\.trim\(\)/.test(adminUxPolish));
assert('subject header uses compact edit delete guide', /السهم لفتح المادة وتعديلها/.test(bilingualEditor) && /لحذف المادة/.test(bilingualEditor) && !/المعامل ثابت/.test(bilingualEditor));
const structureManager = read('public/structure-manager.js');
const annualResults = read('public/annual-results-v1.js');
const twoA4 = read('public/two-students-a4-v1.js');
assert('third trimester annual average uses 1-2-3 weighting', /return \(avgs\[0\]\+2\*avgs\[1\]\+3\*avgs\[2\]\)\/6/.test(annualResults) && /\(\(a1\?\?0\)\+2\*\(a2\?\?0\)\+3\*\(a3\?\?0\)\)\/6/.test(twoA4));
assert('third trimester rank uses annual average', /const vals=\(state\?\.pupils\|\|\[\]\)\.map\(\(_,i\)=>\{const v=annualAverage\(i\)/.test(annualResults) && /annualRank=third\?annualRankData\.ranks\[i\]/.test(twoA4));
assert('third trimester bulletin keeps earlier-term results', /A pupil who has any positive result in T1\/T2\/T3 must keep their bulletin/.test(appJs) && /if\(isThird\(s\)\)\{const annual=annualFor\(s,i\);return annual!=null&&Number\(annual\)>0\}/.test(twoA4));
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
const morePageJs = read('public/more-page-v1.js');
const morePageCss = read('public/more-page-v1.css');
assert('More page is grouped without moving cards out of settings grid', /GROUPS=\[/.test(morePageJs) && /Compte et école/.test(morePageJs) && /Paramètres académiques/.test(morePageJs) && /Collaboration et partage/.test(morePageJs));
assert('More page keeps cards compact for mobile', /\.nataiji-more-grid>\.menu-card\.more-row-card/.test(morePageCss) && /@media\(max-width:390px\)/.test(morePageCss));
assert('More page preserves RTL LTR chevron direction', /inset-inline-end:17px/.test(morePageCss) && /\.lang-fr \.nataiji-more-grid>\.menu-card\.more-row-card:after\{content:"›"\}/.test(morePageCss));
assert('More page assets are loaded', /more-page-v1\.css\?v=4/.test(index) && /more-page-v1\.js\?v=7/.test(index));
assert('legacy danger reorder yields to grouped More page', /grid\.classList\.contains\('nataiji-more-grid'\)/.test(read('public/app-power-v1.js')));
assert('account danger actions stay in account group', /termsPolicyBtn','logoutBtn','deleteAccountBtn'/.test(morePageJs));
assert('account management is the last More page section', /key:'academic'[\s\S]*key:'collaboration'[\s\S]*key:'account'/.test(morePageJs));
assert('language card keeps a single globe icon', /card\.id==='langSwitch'/.test(morePageJs) && /icon\.dataset\.feather='globe'/.test(morePageJs));
assert('More page leaves room above bottom navigation', /padding-bottom:calc\(140px \+ env\(safe-area-inset-bottom,0px\)\)/.test(morePageCss));
assert('dashboard shows provisional average before completion', /partialAvgs=state\.pupils\.map/.test(appJs) && /مؤقت حسب الدرجات المدخلة/.test(appJs));
assert('dashboard below-ten count uses entered marks provisionally', /needsEl\.textContent=finalAvgs\.length\?finalAvgs\.filter\(x=>x<10\)\.length:'—'/.test(appJs));
const appPowerJs = read('public/app-power-v1.js');
assert('More page exposes app share action', /id='shareAppBtn'/.test(appPowerJs) && /navigator\.share/.test(appPowerJs));
assert('install action hides after app installation', /isAppInstalled/.test(appPowerJs) && /appinstalled/.test(appPowerJs));
assert('share/install cards do not rewrite after feather rendering', /dataset\.uiLang===uiLang/.test(appPowerJs) && !/b\.innerHTML!==html/.test(appPowerJs));
assert('install and share precede support', /installAppBtn','shareAppBtn','supportBtn'/.test(morePageJs));
assert('Super Admin card overrides generic More row styling', /menu-card\.owner-card\.more-row-card/.test(morePageCss) && /background:linear-gradient\(120deg,#071f38/.test(morePageCss));
assert('subject save requires explicit maximum score', /الدرجة القصوى/.test(bilingualEditor) && /bi-field-invalid/.test(bilingualEditor) && /data-sm/.test(bilingualEditor));
assert('focused invalid subject fields remain red', /input\.bi-field-invalid:focus/.test(bilingualEditor));
assert('subject validation summarizes all missing fields', /أكمل الحقول المطلوبة/.test(bilingualEditor) && /الاسم بالعربية/.test(bilingualEditor) && /الاسم بالفرنسية/.test(bilingualEditor) && /الدرجة القصوى/.test(bilingualEditor));
assert('all report print actions are primary green', /#printResult,[\s\S]*\.report-print\{[\s\S]*color:#fff!important[\s\S]*background:linear-gradient\(135deg,#078b70,#086f61\)!important/.test(read('public/nataiji-premium-v2.css')));
const reportEnhancements = read('public/report-enhancements.js');
const printDocuments = read('public/print-documents.js');
assert('zero-result pupil cannot print individual report', /zeroResultPupil/.test(appJs) && /type==='student'/.test(appJs) && /مجموعه ومعدله صفر/.test(appJs));
assert('zero-result pupils are excluded from batch reports', /allOptions=\[\.\.\.s\.options\]/.test(reportEnhancements) && /sum===0&&Number\(c\?\.avg\)===0/.test(reportEnhancements));
assert('zero-result pupils stay in class result list as absent', /absent=Number\(c\?\.sum\)===0&&Number\(c\?\.avg\)===0/.test(printDocuments) && /absent\?'غائب'/.test(printDocuments));
assert('install card has no legacy text glyph', !/[⬇↓↔]/u.test(read('public/app-power-v1.js')));
const appPower = read('public/app-power-v1.js');
assert('More menu ordering avoids mutation loop', /del&&del!==grid\.lastElementChild/.test(appPower) && /logout&&logout\.nextElementSibling!==del/.test(appPower));
assert('dynamic sharing cards use canonical icons', /data-feather=\"share-2\"/.test(read('public/auth-access-v2.js')) && /data-feather=\"link\"/.test(read('public/auth-access-v2.js')));
assert('grade enhancer scoped to real grade inputs', /input\.mark\[data-i\]\[data-j\],input\.mobile-mark\[data-i\]\[data-j\]/.test(read('public/final-grade-entry.js')));
assert('absence button exposes explicit selected state', /aria-pressed/.test(read('public/final-grade-entry.js')) && /aria-pressed/.test(read('public/grade-mobile-ui-v1.js')));
const gradeMobileUi = read('public/grade-mobile-ui-v1.js');
assert('grade entry renders current subject icon host', /grade-current-subject-icon/.test(gradeMobileUi));
assert('grade entry keeps inactive absence control visually neutral until selected', /border:1px solid #d8e1e8/.test(gradeMobileUi) && /background:#fff!important;color:#667784/.test(gradeMobileUi) && /absent-btn::before/.test(gradeMobileUi) && /is-absent \.absent-btn\{background:#f2b51d/.test(gradeMobileUi));
assert('grade entry compacts filters and rows', /padding:11px!important;border-radius:15px/.test(gradeMobileUi) && /height:58px!important;min-height:58px!important;max-height:58px/.test(gradeMobileUi));
assert('bulk grade save persists validated values', /normalizedMarks/.test(server));
assert('manual grade save flushes autosave queue', /await markCellSaveTail\.catch/.test(appJs) && /pendingGradeSaves\.get\(key\)/.test(appJs));
assert('manual grade save does not bulk-overwrite marks', !/\$\('#saveGrades'\)[\s\S]{0,2200}api\('\/api\/marks'/.test(appJs));
const professorV2 = read('public/professor-v2.js');
const professorV2Css = read('public/professor-v2.css');
const professorCatalogSrc = read('src/professor-academic-catalog.js');
assert('official Mauritanian professor catalog is wired', /MR-SECONDARY-OFFICIAL-2026-V4/.test(professorCatalogSrc) && /code:'7AS'/.test(professorCatalogSrc) && /technology_informatics/.test(professorCatalogSrc) && /branch\('A',29/.test(professorCatalogSrc) && /branch\('C',30/.test(professorCatalogSrc));
assert('collective professor list uses official subject abbreviations', /name\.abbr\|\|String\(s\.subjectKey/.test(professorV2) && /<b dir="ltr">\$\{esc\(abbr\)\}<\/b>/.test(professorV2));
assert('collective subject headers use vertical Arabic labels', /professorCollectiveSubjectArabic/.test(professorV2) && /subject-vertical/.test(professorV2) && /writing-mode:vertical-rl/.test(professorV2));
assert('collective rank and appreciation headers are vertical and wider', /class="rank-head edge-vertical-head"/.test(professorV2) && /class="appreciation-head edge-vertical-head"/.test(professorV2) && /edge-vertical-label/.test(professorV2) && /appreciation-cell/.test(professorV2) && /width:11\.5%/.test(professorV2));
assert('collective appreciation cells wrap safely', /appreciation-cell\{padding-inline:\.7mm;white-space:normal;overflow-wrap:anywhere/.test(professorV2));
assert('collective vertical Arabic subject labels are enlarged', /subject-vertical\{height:30mm[^}]*font-size:9\.2pt/.test(professorV2));
assert('collective list is ranked and readable on Android print', /function professorClassListLandscape\(\)\{return false\}/.test(professorV2) && /orderedStudents=/.test(professorV2) && /collective-class-table/.test(professorV2));
assert('collective list omits class average footer', !/class=\"summary\"><div class=\"dual-summary\"/.test(professorV2.slice(professorV2.indexOf('function printClassList'),professorV2.indexOf('function professorReportSwitcher'))));
assert('collective metadata is arranged in bilingual rows', /collective-meta-row ar/.test(professorV2) && /collective-meta-row fr/.test(professorV2) && /مجموع المعاملات:/.test(professorV2));
assert('collective signatures are enlarged', /class-list-doc \.official-signatures b\{font-size:11pt/.test(professorV2) && /official-date-line span\{font-size:9\.3pt/.test(professorV2));
assert('collective PDF uses numeric ranks and no stamp box', /class-list-students-few/.test(professorV2) && /studentCount:data\.students\?\.length\|\|0/.test(professorV2) && !/الختم \/ Cachet/.test(professorV2) && /التوقيع \/ Signature/.test(professorV2));
assert('collective professor results include every official curriculum subject', /const officialSubjects=orderedSubjects\.map/.test(server) && /assigned:false,marks:\{\}/.test(server) && /officialCoefficientTotal=subjects\.reduce/.test(server) && /Math\.abs\(officialCoefficientTotal-expectedCoefficientTotal\)/.test(server));
assert('linked professor marks use canonical shared class metadata', /canonicalLevelCode/.test(server) && /canonicalBranchCode/.test(server) && /mergeMarks=/.test(server));
assert('collective official results are not labelled provisional', /if\(data\?\.curriculumComplete&&data\?\.expectedCoefficientTotal\)return String\(data\.expectedCoefficientTotal\)/.test(professorV2) && /officialReady=general!=null&&curriculumComplete/.test(server));
assert('professor grades use dedicated verified save endpoint', professorV2.includes("'/students/'+encodeURIComponent(row.studentId)+'/grades'") && /r\.verified!==true/.test(professorV2) && /professor_grade_verification_failed/.test(server));
assert('structural professor save flushes pending grades first', /async function saveProfile\(message=''\)\{\s*if\(gradeSaveTimer\|\|gradeSaveInFlight\|\|gradeSavedRevision<gradeEditRevision\)await flushGradeAutosave\(\)/.test(professorV2));
assert('professor recovery snapshots retain 200 versions', /ORDER BY id DESC LIMIT 200/.test(server));
assert('professor grades have append-only server history', /nataiji_professor_grade_history/.test(server) && /appendProfessorGradeHistory/.test(server));
assert('structural professor saves preserve surviving grades', /function preserveProfessorMarks\(/.test(server) && /candidate=preserveProfessorMarks\(before,req\.body\?\.profile\)/.test(server));
assert('opening professor profile never rewrites stored grades', /profile=cleanProfessorProfile\(profile\);\s*res\.json\(\{ok:true,profile,classLinks\}\)/.test(server) && !/profile=cleanProfessorProfile\(profile\);await saveProfessorProfile\(req\.user\.id,profile,\{syncShared:false\}\)/.test(server));
assert('manual professor save verifies every student atomically', /async function forceProfessorGradeSave\(\)/.test(professorV2) && /students\/'\+encodeURIComponent\(row\.studentId\)\+'\/grades/.test(professorV2) && /before-student-grade-save/.test(server) && /professor_grade_reload_verification_failed/.test(professorV2));
assert('manual professor save commits every visible grade input before request', /const commitVisibleGradeInputs=\(\)=>/.test(professorV2) && /commitVisibleGradeInputs\(\);gradeEditRevision\+\+/.test(professorV2));
assert('professor absence is independent and counts as zero', /data-absent-kind="test"/.test(professorV2) && /data-absent-kind="exam"/.test(professorV2) && /if\(professorIsAbsent\(v\)\)return 0/.test(professorV2) && /if\(professorResultAbsent\(v\)\)return 0/.test(server));
assert('professor grade entry uses class and subject selectors', /id="pv2GradeClassSelect"/.test(professorV2) && /id="pv2GradeSubjectSelect"/.test(professorV2) && /const next=assignmentsForClass\(value\)\[0\]/.test(professorV2));
assert('professor grade selectors include quick add actions', /value="__add_class__"/.test(professorV2) && /value="__add_subject__"/.test(professorV2) && /openAssignment\('','new'\)/.test(professorV2) && /openAssignment\(a\.classId,'existing'\)/.test(professorV2));
assert('professor quick add returns to new subject grade entry', /gradeMatch=.*\^grade:/.test(professorV2) && /openGrades\(newAssignment\.id,Number\(gradeMatch\[1\]\)\)/.test(professorV2));
assert('shared professor classes are explicitly labelled in selector', /مشترك · /.test(professorV2) && /Partagée · /.test(professorV2));
assert('professor full absence displays absent while calculation stays zero', /function professorTermFullyAbsent/.test(professorV2) && /professorTermFullyAbsent\(m,term\)\?tr\('غائب','Absent'\)/.test(professorV2) && /if\(professorIsAbsent\(v\)\)return 0/.test(professorV2));
assert('fully absent students stay only in collective list', /function professorStudentFullyAbsent/.test(professorV2) && /allRows\.filter\(row=>!professorStudentFullyAbsent\(row\)\)/.test(professorV2) && /const orderedStudents=\[\.\.\.\(data\.students\|\|\[\]\)\]/.test(professorV2));
assert('individual professor bulletin blocks fully absent student', /if\(professorStudentFullyAbsent\(row\)\)\{toast/.test(professorV2));
assert('professor compact grade table is scoped to professor workspace', /prof-grade-compact-table/.test(professorV2) && /\.nataiji-professor-mode \.prof-grade-reference \.prof-grade-compact-table/.test(professorV2Css));
assert('professor compact grade entry keeps verified save path', /forceProfessorGradeSave\(\)/.test(professorV2) && /professor_grade_reload_verification_failed/.test(professorV2));
assert('professor assignment dialog separates existing and new class flows', /data-assignment-mode="existing"/.test(professorV2) && /data-assignment-mode="new"/.test(professorV2) && /id="pv2ExistingClassLabel"/.test(professorV2) && /id="pv2NewClassLabel"/.test(professorV2));
assert('official professor coefficient field is hidden unless manual', /id="pv2CoefficientLabel" style="display:none"/.test(professorV2) && /coefLabel\.style\.display=manual\?'grid':'none'/.test(professorV2));
assert('professor shared class badge is explicit on grades page', /prof-shared-class-badge/.test(professorV2) && /tr\('مشترك','Partagée'\)/.test(professorV2));
assert('official professor coefficient stays automatic and manual coefficient is custom-only', /if\(spec\?\.official\)\{coef\.value=spec\.coefficient;coef\.readOnly=true/.test(professorV2) && /const .*manual=subjectSel\.value==='__other__'\|\|\(subjectSel\.value&&!spec\?\.official\)/.test(professorV2) && /coefLabel\.style\.display=manual\?'grid':'none'/.test(professorV2));
assert('professor grade cards are compact with grade entry as primary action', /prof-compact-subject-card/.test(professorV2) && /primary-card-action/.test(professorV2) && /Professor workflow simplification v47/.test(professorV2Css));
assert('professor reports remove duplicate collective entry and term icons', /prof-report-switcher-premium/.test(professorV2) && !/prof-collective-entry prof-collective-entry-premium/.test(professorV2.slice(professorV2.indexOf('function renderReportsHub'),professorV2.indexOf('async function renderResults'))) && !/data-own-report-term="\$\{t\}"[^>]*><span/.test(professorV2));
assert('c…15601 tokens truncated…e:'email_service_unconfigured'});const fr=lang==='fr',subject=fr?'Réinitialisation de votre mot de passe Nataiji':'استعادة كلمة مرور نتائجي',hello=fr?`Bonjour ${htmlEscape(user.name)},`:`مرحبًا ${htmlEscape(user.name)}،`,intro=fr?'Une demande de réinitialisation du mot de passe de votre compte Nataiji a été reçue.':'تم استلام طلب لاستعادة كلمة مرور حسابك في نتائجي.',cta=fr?'Réinitialiser le mot de passe':'استعادة كلمة المرور',ignore=fr?'Ce lien expire dans 30 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.':'تنتهي صلاحية هذا الرابط خلال 30 دقيقة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.';const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[user.email],subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.7;max-width:560px;margin:auto"><h2>Nataiji | نتائجي</h2><p>${hello}</p><p>${intro}</p><p><a href="${htmlEscape(link)}" style="display:inline-block;background:#1288dd;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${cta}</a></p><p>${ignore}</p></div>`})});if(!r.ok)throw Object.assign(new Error('email_delivery_failed'),{code:'email_delivery_failed',status:r.status})}

app.get('/health',async(_req,res)=>{let databaseOk=false;if(pool){try{await pool.query('SELECT 1');databaseOk=true}catch{databaseOk=false}}const durable=storage==='postgres'||storage==='redis',ok=process.env.NODE_ENV==='production'?durable&&databaseOk:durable||storage==='memory';res.status(ok?200:503).json({ok,app:'نتائجي',storage,databaseOk,emailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.RESET_FROM_EMAIL),superAdminConfigured:Boolean(configuredOwnerEmail())})});
app.get('/api/auth/status',async(req,res)=>{const idx=await getIndex(),token=parseCookies(req).nataiji_session;let user=null;if(token){const raw=await storeGet(sessionKey(token));if(raw){try{const session=JSON.parse(raw),uRaw=await storeGet(userKey(session.id));if(uRaw){let u=JSON.parse(uRaw);if((Number(u.sessionVersion)||0)===(Number(session.sessionVersion)||0)){u=await ensureConfiguredOwner(u);u=await ensureUsableWorkspace(u);user=safeUser(u)}}}catch{}}}res.json({initialized:Object.keys(idx).length>0,canRegister:true,user,storage,emailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.RESET_FROM_EMAIL)})});
app.post('/api/auth/register',registerRate,async(req,res)=>{const idx=await getIndex(),name=String(req.body?.name||'').trim(),email=normEmail(req.body?.email),password=String(req.body?.password||''),school=String(req.body?.school||'').trim();if(!name||!validEmail(email)||password.length<8)return res.status(400).json({error:'invalid_input'});if(idx[email])return res.status(409).json({error:'email_exists'});const id=crypto.randomUUID(),schoolId=crypto.randomUUID(),hp=hashPassword(password),owner=email===configuredOwnerEmail(),user={id,name:owner&&process.env.SUPER_ADMIN_NAME?String(process.env.SUPER_ADMIN_NAME).trim():name,email,role:owner?'owner':'admin',baseRole:owner?'owner':'admin',profileType:owner?'owner':'',needsProfileChoice:!owner,schoolId,ownedSchoolIds:[schoolId],sharedGrants:{},activeSharedGrant:'',permissions:['all'],classIds:[],sessionVersion:0,salt:hp.salt,passwordHash:hp.hash},fresh=newSchoolState(name,school);await storeSet(userKey(id),JSON.stringify(user));idx[email]=id;await setIndex(idx);await storeSet(schoolKey(schoolId),JSON.stringify(fresh));if(pool){await pool.query('INSERT INTO nataiji_school_settings(school_id,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[schoolId,JSON.stringify({school,schoolFr:'',region:'',regionFr:'',inspection:'',inspectionFr:'',year:'',onboardingComplete:false})]);await pool.query('INSERT INTO nataiji_structure(school_id,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[schoolId,JSON.stringify({classes:[],terms:[],activeClassId:'',term:''})])}res.status(201).json({user:await createSession(res,user)})});
app.post('/api/auth/login',loginRate,async(req,res)=>{const email=normEmail(req.body?.email),password=String(req.body?.password||''),idx=await getIndex(),id=idx[email];if(!id)return res.status(401).json({error:'bad_credentials'});const raw=await storeGet(userKey(id));if(!raw)return res.status(401).json({error:'bad_credentials'});let user=JSON.parse(raw);if(!verifyPassword(password,user))return res.status(401).json({error:'bad_credentials'});if(user.suspended)return res.status(403).json({error:'account_suspended'});user=await ensureConfiguredOwner(user);user=await migrateTeacherAssignment(user);user=await ensureUsableWorkspace(user);res.json({user:await createSession(res,user)})});
app.get('/api/schools',auth,async(req,res)=>{
 const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const u=JSON.parse(raw),ids=[...new Set(Array.isArray(u.ownedSchoolIds)?u.ownedSchoolIds:(u.role==='admin'&&u.schoolId?[u.schoolId]:[]))],schools=[];
 if(pool)for(const id of ids){const q=await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[id]),d=q.rows[0]?.data||{};schools.push({id,name:d.school||'مدرسة بدون اسم',nameFr:d.schoolFr||'',active:id===u.schoolId,owned:true})}
 res.json({ok:true,schools})
});
app.post('/api/schools',auth,async(req,res)=>{
 const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const u=JSON.parse(raw);if(u.role!=='admin')return res.status(403).json({error:'forbidden'});
 if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const name=String(req.body?.name||'').trim(),nameFr=String(req.body?.nameFr||'').trim();if(!name)return res.status(400).json({error:'school_name_required'});
 const id=crypto.randomUUID(),fresh=newSchoolState(u.name,name),client=await pool.connect();
 try{await client.query('BEGIN');await client.query('INSERT INTO nataiji_school_settings(school_id,data) VALUES($1,$2::jsonb)',[id,JSON.stringify({school:name,schoolFr:nameFr,region:'',regionFr:'',inspectionFr:'',inspection:'',year:'',onboardingComplete:true})]);await client.query('INSERT INTO nataiji_structure(school_id,data) VALUES($1,$2::jsonb)',[id,JSON.stringify({classes:[],terms:[],activeClassId:'',term:''})]);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 await storeSet(schoolKey(id),JSON.stringify(fresh));u.ownedSchoolIds=[...new Set([...(u.ownedSchoolIds||[u.schoolId]),id])];u.schoolId=id;await storeSet(userKey(u.id),JSON.stringify(u));res.status(201).json({ok:true,school:{id,name,nameFr,active:true},user:safeUser(u)})
});
app.post('/api/schools/switch',auth,async(req,res)=>{
 const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const u=JSON.parse(raw),id=String(req.body?.schoolId||''),baseRole=u.baseRole||u.role,ownedIds=Array.isArray(u.ownedSchoolIds)&&u.ownedSchoolIds.length?u.ownedSchoolIds:(isOwnerRole(baseRole)&&u.schoolId?[u.schoolId]:[]),owned=new Set(ownedIds);
 if(!owned.has(id))return res.status(403).json({error:'forbidden_school'});u.schoolId=id;u.activeSharedGrant='';u.workspaceMode='owned';await storeSet(userKey(u.id),JSON.stringify(u));res.json({ok:true,user:safeUser(u)})
});
app.post('/api/auth/logout',auth,async(req,res)=>{await storeDel(sessionKey(parseCookies(req).nataiji_session));res.clearCookie('nataiji_session',{path:'/'});res.json({ok:true})});
app.post('/api/account/profile-type',auth,async(req,res)=>{
 const type=String(req.body?.type||'').trim();if(!['teacher','professor'].includes(type))return res.status(400).json({error:'invalid_profile_type'});
 const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const user=JSON.parse(raw),base=user.baseRole||user.role;
 if(base==='owner')return res.status(403).json({error:'forbidden'});
 if(user.profileType===type&&user.needsProfileChoice!==true)return res.json({ok:true,user:safeUser(user)});
 if(user.needsProfileChoice!==true)return res.status(409).json({error:'profile_type_locked'});
 if(type==='teacher'){user.profileType='teacher';user.needsProfileChoice=false}
 else{
  const seeded=[...new Set((Array.isArray(user.ownedSchoolIds)?user.ownedSchoolIds:(user.schoolId?[user.schoolId]:[])).map(String).filter(Boolean))];
  if(pool)for(const schoolId of seeded)if(await schoolHasDurableContent(schoolId))return res.status(409).json({error:'profile_type_school_has_data'});
  user.profileType='professor';user.needsProfileChoice=false;user.role='professor';user.baseRole='professor';user.permissions=['professor'];user.classIds=[];user.classAccess={};user.subjectIds=[];user.sharedGrants={};user.activeSharedGrant='';user.workspaceMode='professor';
  if(pool)await pool.query('INSERT INTO nataiji_professor_profiles(user_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(user_id) DO NOTHING',[user.id,JSON.stringify(emptyProfessorProfile())]);
  // Never delete school rows during profile selection. Empty registration shells
  // may be orphaned, but preserving data is safer than any destructive cleanup.
  user.ownedSchoolIds=[];user.schoolId=''
 }
 await storeSet(userKey(user.id),JSON.stringify(user));res.json({ok:true,user:await createSession(res,user)})
});
app.get('/api/professor/catalog',auth,(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});
 res.json({ok:true,catalog:professorCatalog()})
});
app.get('/api/professor/profile',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 let profile=await loadProfessorProfile(req.user.id),classLinks=await professorClassLinks(profile,req.user.id);profile=cleanProfessorProfile(profile);
 res.json({ok:true,profile,classLinks})
});
app.put('/api/professor/profile',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const before=await loadProfessorProfile(req.user.id),candidate=preserveProfessorMarks(before,req.body?.profile),conflict=await professorSharedSubjectConflict(req.user.id,before,candidate);
 if(conflict)return res.status(409).json({error:'shared_subject_taken',subject:conflict.subject,subjectKey:conflict.subjectKey,sharedClassId:conflict.sharedClassId});
 let profile=await saveProfessorProfile(req.user.id,candidate),classLinks=await professorClassLinks(profile,req.user.id);profile=cleanProfessorProfile(profile);res.json({ok:true,profile,classLinks})
});
app.get('/api/professor/integrity',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const profile=await loadProfessorProfile(req.user.id),assignments=(profile.assignments||[]).length,students=(profile.classes||[]).reduce((n,c)=>n+(c.students||[]).length,0);
 let gradeRecords=0,enteredValues=0;for(const rows of Object.values(profile.marks||{}))for(const row of Object.values(rows||{}))for(const rec of Object.values(row?.terms||{})){gradeRecords++;const tests=Array.isArray(rec?.tests)?rec.tests:[];if(String(tests[0]??'')!=='')enteredValues++;if(String(rec?.exam??'')!=='')enteredValues++}
 const history=(await pool.query('SELECT count(*)::int AS n,max(created_at) AS latest FROM nataiji_professor_grade_history WHERE user_id=$1',[req.user.id])).rows[0]||{};
 const versions=(await pool.query('SELECT count(*)::int AS n,max(created_at) AS latest FROM nataiji_professor_profile_versions WHERE user_id=$1',[req.user.id])).rows[0]||{};
 res.json({ok:true,assignments,students,gradeRecords,enteredValues,gradeHistoryCount:Number(history.n)||0,latestGradeHistory:history.latest||null,profileVersionCount:Number(versions.n)||0,latestProfileVersion:versions.latest||null})
});
app.put('/api/professor/assignments/:assignmentId/grades',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const assignmentId=String(req.params.assignmentId||'').trim(),term=Number(req.body?.term),rows=Array.isArray(req.body?.rows)?req.body.rows.slice(0,800):null;
 if(!assignmentId||![1,2,3].includes(term)||!rows)return res.status(400).json({error:'invalid_professor_grades'});
 const cleanGrade=v=>{const raw=String(v??'').trim(),n=Number(raw.replace(',','.'));if(raw==='')return'';if(professorResultAbsent(raw))return'ABSENT';return Number.isFinite(n)?String(Math.max(0,Math.min(20,n))):''};
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const locked=await client.query('SELECT data FROM nataiji_professor_profiles WHERE user_id=$1 FOR UPDATE',[req.user.id]);
  if(!locked.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'professor_profile_not_found'})}
  const before=cleanProfessorProfile(locked.rows[0].data||{}),assignment=before.assignments.find(x=>String(x.id)===assignmentId);
  if(!assignment){await client.query('ROLLBACK');return res.status(404).json({error:'professor_assignment_not_found'})}
  const cls=before.classes.find(x=>String(x.id)===String(assignment.classId));
  if(!cls){await client.query('ROLLBACK');return res.status(404).json({error:'professor_class_not_found'})}
  if(String(cls.sharedClassId||'')){
   const room=await client.query('SELECT data FROM nataiji_professor_classrooms WHERE class_id=$1',[String(cls.sharedClassId)]);
   if(room.rowCount)applyProfessorSharedClassData(cls,room.rows[0].data||{})
  }
  const allowed=new Set((cls.students||[]).map(x=>String(x.id))),invalid=rows.find(x=>!allowed.has(String(x?.studentId||'')));
  if(invalid){await client.query('ROLLBACK');return res.status(400).json({error:'professor_student_not_found'})}
  const next=structuredClone(before);next.classes=before.classes;next.marks=next.marks&&typeof next.marks==='object'?next.marks:{};
  const assignmentMarks=next.marks[assignmentId]&&typeof next.marks[assignmentId]==='object'?next.marks[assignmentId]:{};
  for(const row of rows){
   const studentId=String(row.studentId),current=assignmentMarks[studentId]&&typeof assignmentMarks[studentId]==='object'?assignmentMarks[studentId]:{};
   current.terms=current.terms&&typeof current.terms==='object'?current.terms:{};
   current.terms[String(term)]={tests:[cleanGrade(row.test)],exam:cleanGrade(row.exam)};
   assignmentMarks[studentId]=current
  }
  next.marks[assignmentId]=assignmentMarks;
  const saved=cleanProfessorProfile(next);
  if(JSON.stringify(before)!==JSON.stringify(saved))await archiveProfessorProfileVersion(req.user.id,client,'before-grade-save',before);
  await client.query('UPDATE nataiji_professor_profiles SET data=$2::jsonb,updated_at=now() WHERE user_id=$1',[req.user.id,JSON.stringify(saved)]);
  for(const row of rows){const studentId=String(row.studentId),record=saved.marks?.[assignmentId]?.[studentId]?.terms?.[String(term)]||{};await appendProfessorGradeHistory(client,req.user.id,assignmentId,studentId,term,record)}
  await client.query('COMMIT');
  const verify=await pool.query('SELECT data,updated_at FROM nataiji_professor_profiles WHERE user_id=$1',[req.user.id]),confirmed=cleanProfessorProfile(verify.rows[0]?.data||{});
  const confirmedMarks=confirmed.marks?.[assignmentId]||{},verified=rows.every(row=>{
   const rec=confirmedMarks?.[String(row.studentId)]?.terms?.[String(term)]||{},tests=Array.isArray(rec.tests)?rec.tests:[];
   return String(tests[0]??'')===cleanGrade(row.test)&&String(rec.exam??'')===cleanGrade(row.exam)
  });
  if(!verified)return res.status(409).json({error:'professor_grade_verification_failed'});
  res.json({ok:true,verified:true,rowCount:rows.length,assignmentId,term,marks:confirmedMarks,savedAt:verify.rows[0]?.updated_at||new Date().toISOString()})
 }catch(e){try{await client.query('ROLLBACK')}catch{}throw e}finally{client.release()}
});
app.put('/api/professor/assignments/:assignmentId/students/:studentId/grades',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const assignmentId=String(req.params.assignmentId||'').trim(),studentId=String(req.params.studentId||'').trim(),term=Number(req.body?.term);
 if(!assignmentId||!studentId||![1,2,3].includes(term))return res.status(400).json({error:'invalid_professor_grades'});
 const cleanGrade=v=>{const raw=String(v??'').trim(),n=Number(raw.replace(',','.'));if(raw==='')return'';if(professorResultAbsent(raw))return'ABSENT';return Number.isFinite(n)?String(Math.max(0,Math.min(20,n))):''};
 const expected={tests:[cleanGrade(req.body?.test)],exam:cleanGrade(req.body?.exam)},client=await pool.connect();
 try{
  await client.query('BEGIN');
  const locked=await client.query('SELECT data FROM nataiji_professor_profiles WHERE user_id=$1 FOR UPDATE',[req.user.id]);
  if(!locked.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'professor_profile_not_found'})}
  const before=cleanProfessorProfile(locked.rows[0].data||{}),assignment=before.assignments.find(x=>String(x.id)===assignmentId);
  if(!assignment){await client.query('ROLLBACK');return res.status(404).json({error:'professor_assignment_not_found'})}
  const cls=before.classes.find(x=>String(x.id)===String(assignment.classId));
  if(!cls){await client.query('ROLLBACK');return res.status(404).json({error:'professor_class_not_found'})}
  if(String(cls.sharedClassId||'')){
   const room=await client.query('SELECT data FROM nataiji_professor_classrooms WHERE class_id=$1',[String(cls.sharedClassId)]);
   if(room.rowCount)applyProfessorSharedClassData(cls,room.rows[0].data||{})
  }
  if(!(cls.students||[]).some(x=>String(x.id)===studentId)){await client.query('ROLLBACK');return res.status(404).json({error:'professor_student_not_found'})}
  const next=structuredClone(before);next.classes=before.classes;next.marks=next.marks&&typeof next.marks==='object'?next.marks:{};
  const assignmentMarks=next.marks[assignmentId]&&typeof next.marks[assignmentId]==='object'?next.marks[assignmentId]:{},current=assignmentMarks[studentId]&&typeof assignmentMarks[studentId]==='object'?assignmentMarks[studentId]:{};
  current.terms=current.terms&&typeof current.terms==='object'?current.terms:{};
  current.terms[String(term)]=expected;assignmentMarks[studentId]=current;next.marks[assignmentId]=assignmentMarks;
  const saved=cleanProfessorProfile(next);
  if(JSON.stringify(before)!==JSON.stringify(saved))await archiveProfessorProfileVersion(req.user.id,client,'before-student-grade-save',before);
  await client.query('UPDATE nataiji_professor_profiles SET data=$2::jsonb,updated_at=now() WHERE user_id=$1',[req.user.id,JSON.stringify(saved)]);
  await appendProfessorGradeHistory(client,req.user.id,assignmentId,studentId,term,saved.marks?.[assignmentId]?.[studentId]?.terms?.[String(term)]||{});
  await client.query('COMMIT');
  const verify=await pool.query('SELECT data,updated_at FROM nataiji_professor_profiles WHERE user_id=$1',[req.user.id]),confirmed=cleanProfessorProfile(verify.rows[0]?.data||{}),rec=confirmed.marks?.[assignmentId]?.[studentId]?.terms?.[String(term)]||{},tests=Array.isArray(rec.tests)?rec.tests:[];
  const verified=String(tests[0]??'')===String(expected.tests[0]??'')&&String(rec.exam??'')===String(expected.exam??'');
  if(!verified)return res.status(409).json({error:'professor_grade_verification_failed'});
  res.json({ok:true,verified:true,assignmentId,studentId,term,record:rec,savedAt:verify.rows[0]?.updated_at||new Date().toISOString()})
 }catch(e){try{await client.query('ROLLBACK')}catch{}throw e}finally{client.release()}
});
app.get('/api/professor/classes/:localClassId/results',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const localClassId=String(req.params.localClassId||''),profile=await loadProfessorProfile(req.user.id),local=profile.classes.find(x=>String(x.id)===localClassId);
 if(!local)return res.status(404).json({error:'professor_class_not_found'});
 if(!String(local.sharedClassId||''))return res.status(409).json({error:'collective_mode_required'});
 const term=Math.max(1,Math.min(3,Number(req.query.term)||1)),result=await professorAggregatedResults(req.user.id,localClassId,term);
 if(!result)return res.status(404).json({error:'professor_class_not_found'});
 res.json({ok:true,...result})
});
app.post('/api/professor/classes/:localClassId/share',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const localClassId=String(req.params.localClassId||''),profile=await loadProfessorProfile(req.user.id),cls=profile.classes.find(x=>x.id===localClassId);if(!cls)return res.status(404).json({error:'professor_class_not_found'});
 if(cls.sharedClassId){
  const q=await pool.query(`SELECT c.class_id,c.join_code,(SELECT count(*)::int FROM nataiji_professor_class_members mm WHERE mm.class_id=c.class_id) AS member_count FROM nataiji_professor_classrooms c JOIN nataiji_professor_class_members m ON m.class_id=c.class_id AND m.user_id=$2 WHERE c.class_id=$1`,[cls.sharedClassId,req.user.id]);
  if(q.rowCount)return res.json({ok:true,localClassId,sharedClassId:q.rows[0].class_id,code:q.rows[0].join_code,memberCount:Number(q.rows[0].member_count)||1,profile})
  cls.sharedClassId=''
 }
 const sharedClassId=crypto.randomUUID();let code='',tries=0;
 while(tries++<8){code=professorJoinCode();const exists=await pool.query('SELECT 1 FROM nataiji_professor_classrooms WHERE join_code=$1',[code]);if(!exists.rowCount)break}
 if(!code)return res.status(500).json({error:'class_code_generation_failed'});
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('INSERT INTO nataiji_professor_classrooms(class_id,owner_user_id,join_code,data) VALUES($1,$2,$3,$4::jsonb)',[sharedClassId,req.user.id,code,JSON.stringify({name:cls.name,levelCode:cls.levelCode||inferProfessorLevelCode(cls.name),branchCode:cls.branchCode||'',students:cls.students||[]})]);await client.query('INSERT INTO nataiji_professor_class_members(class_id,user_id,role) VALUES($1,$2,$3)',[sharedClassId,req.user.id,'owner']);cls.sharedClassId=sharedClassId;await client.query('INSERT INTO nataiji_professor_profiles(user_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[req.user.id,JSON.stringify(cleanProfessorProfile(profile))]);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 res.status(201).json({ok:true,localClassId,sharedClassId,code,memberCount:1,profile:cleanProfessorProfile(profile)})
});
app.post('/api/professor/classes/join',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const code=String(req.body?.code||'').trim().toUpperCase(),requestedLocalId=String(req.body?.localClassId||'').trim();if(!/^CL-[A-F0-9]{8}$/.test(code))return res.status(400).json({error:'invalid_class_code'});
 const cq=await pool.query('SELECT class_id,owner_user_id,data FROM nataiji_professor_classrooms WHERE join_code=$1',[code]);if(!cq.rowCount)return res.status(404).json({error:'invalid_class_code'});
 const shared=cq.rows[0],data=shared.data&&typeof shared.data==='object'?shared.data:{},profile=await loadProfessorProfile(req.user.id);let cls=requestedLocalId?profile.classes.find(x=>x.id===requestedLocalId):null;
 const existing=profile.classes.find(x=>x.sharedClassId===shared.class_id);if(existing)cls=existing;
 if(cls?.sharedClassId&&cls.sharedClassId!==shared.class_id)return res.status(409).json({error:'professor_class_already_linked'});
 if(!cls){const joinedName=String(data.name||'قسم').trim().slice(0,120)||'قسم';cls={id:crypto.randomUUID(),name:joinedName,levelCode:['1AS','2AS','3AS','5AS','6AS','7AS'].includes(String(data.levelCode||'').toUpperCase())?String(data.levelCode).toUpperCase():inferProfessorLevelCode(joinedName),branchCode:normalizeProfessorBranchCode(String(data.branchCode||'').trim().slice(0,40)),students:[],sharedClassId:shared.class_id};profile.classes.push(cls)}
 cls.sharedClassId=shared.class_id;cls.name=String(data.name||cls.name||'قسم').trim().slice(0,120)||cls.name;cls.levelCode=['1AS','2AS','3AS','5AS','6AS','7AS'].includes(String(data.levelCode||'').toUpperCase())?String(data.levelCode).toUpperCase():(cls.levelCode||inferProfessorLevelCode(cls.name));cls.branchCode=normalizeProfessorBranchCode(String(data.branchCode||cls.branchCode||'').trim().slice(0,40));cls.students=Array.isArray(data.students)?data.students.map(s=>professorStudentData(s)).filter(s=>s.id&&s.name):[];
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('INSERT INTO nataiji_professor_class_members(class_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[shared.class_id,req.user.id,shared.owner_user_id===req.user.id?'owner':'member']);await client.query('INSERT INTO nataiji_professor_profiles(user_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[req.user.id,JSON.stringify(cleanProfessorProfile(profile))]);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 const clean=cleanProfessorProfile(profile),links=await professorClassLinks(clean,req.user.id);res.json({ok:true,profile:clean,classLinks:links,localClassId:cls.id,sharedClassId:shared.class_id})
});
app.delete('/api/professor/classes/:localClassId/link',auth,async(req,res)=>{
 if(req.user.role!=='professor')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const localClassId=String(req.params.localClassId||''),profile=await loadProfessorProfile(req.user.id),cls=profile.classes.find(x=>x.id===localClassId);if(!cls)return res.status(404).json({error:'professor_class_not_found'});const sharedClassId=String(cls.sharedClassId||'');if(!sharedClassId)return res.json({ok:true,profile,classLinks:await professorClassLinks(profile,req.user.id)});
 const owner=await pool.query('SELECT owner_user_id FROM nataiji_professor_classrooms WHERE class_id=$1',[sharedClassId]),count=await pool.query('SELECT count(*)::int AS n FROM nataiji_professor_class_members WHERE class_id=$1',[sharedClassId]);if(owner.rows[0]?.owner_user_id===req.user.id&&Number(count.rows[0]?.n||0)>1)return res.status(409).json({error:'owner_cannot_leave_shared_class'});
 await pool.query('DELETE FROM nataiji_professor_class_members WHERE class_id=$1 AND user_id=$2',[sharedClassId,req.user.id]);if(owner.rows[0]?.owner_user_id===req.user.id){await pool.query('DELETE FROM nataiji_professor_classrooms WHERE class_id=$1',[sharedClassId])}cls.sharedClassId='';await saveProfessorProfile(req.user.id,profile,{syncShared:false});res.json({ok:true,profile:cleanProfessorProfile(profile),classLinks:await professorClassLinks(profile,req.user.id)})
});
app.get('/api/owner/overview',auth,ownerOnly,async(_req,res)=>{
 const idx=await getIndex(),accounts=[],users=[];let schools=0;
 for(const [email,id] of Object.entries(idx)){
  const raw=await storeGet(userKey(id));if(!raw)continue;
  try{
   const u=JSON.parse(raw),baseRole=String(u.baseRole||u.role),owned=[...new Set(Array.isArray(u.ownedSchoolIds)?u.ownedSchoolIds:(isOwnerRole(baseRole)&&u.schoolId?[u.schoolId]:[]))];
   users.push(u);if(isOwnerRole(baseRole))schools+=owned.length;
   accounts.push({id:u.id,name:u.name||'',email,role:baseRole==='owner'?'owner':baseRole==='teacher'?'teacher':baseRole==='professor'?'professor':'admin',schools:isOwnerRole(baseRole)?owned.length:0,suspended:!!u.suspended,plan:u.plan||'free'})
  }catch{}
 }
 const teacherIds=new Set();
 for(const u of users){const role=String(u.baseRole||u.role);if(role==='professor')continue;const memberships=await ownerTeacherMembershipsForUser(u);if(memberships.length)teacherIds.add(String(u.id))}
 res.json({ok:true,stats:{users:accounts.length,schools,superAdmins:accounts.filter(x=>x.role==='owner').length,schoolAdmins:accounts.filter(x=>x.role==='admin').length,teachers:teacherIds.size,professors:accounts.filter(x=>x.role==='professor').length},accounts:accounts.sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr'))})
});
async function ownerAccountById(id){
 const raw=await storeGet(userKey(String(id||'')));if(!raw)return null;
 try{return JSON.parse(raw)}catch{return null}
}
async function ownerProfessorAccount(id){
 const user=await ownerAccountById(id);if(!user)return null;
 return String(user.baseRole||user.role)==='professor'?user:null
}
function professorAssignmentHasGrades(profile,assignmentId){
 const rows=profile?.marks?.[assignmentId];if(!rows||typeof rows!=='object')return false;
 for(const row of Object.values(rows||{}))for(const value of Object.values(row||{}))if(String(value??'').trim()!=='')return true;
 return false
}
async function ownerProfessorView(user){
 let profile=await loadProfessorProfile(user.id),links=await professorClassLinks(profile,user.id);profile=cleanProfessorProfile(profile);
 const versions=pool?Number((await pool.query('SELECT count(*)::int AS n FROM nataiji_professor_profile_versions WHERE user_id=$1',[user.id])).rows[0]?.n||0):0;
 const classes=profile.classes.map(cls=>({id:cls.id,name:cls.name,levelCode:cls.levelCode||'',branchCode:cls.branchCode||'',studentCount:(cls.students||[]).length,sharedClassId:cls.sharedClassId||'',linkedProfessorCount:Number(links?.[cls.id]?.memberCount||1)}));
 const assignments=profile.assignments.map(a=>({id:a.id,classId:a.classId,subject:a.subject,subjectKey:a.subjectKey||'',coefficient:Number(a.coefficient)||1,coefficientSource:a.coefficientSource||'manual',hasGrades:professorAssignmentHasGrades(profile,a.id)}));
 return{account:{id:user.id,name:user.name||'',email:user.email||'',role:'professor',suspended:!!user.suspended,plan:user.plan||'free'},schoolName:profile.schoolName||'',year:profile.year||'',classes,assignments,versionCount:versions}
}
async function ownerSchoolName(schoolId,fallback=''){
 if(!schoolId)return String(fallback||'');
 if(pool){const q=await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[schoolId]);const d=q.rows[0]?.data||{};return String(d.school||fallback||'')}
 return String(fallback||'')
}
async function ownerTeacherSummary(user,grant=null){
 const schoolId=String(grant?.schoolId||user.schoolId||''),schoolName=await ownerSchoolName(schoolId,grant?.schoolName||''),classAccess=grant?.classAccess&&typeof grant.classAccess==='object'?grant.classAccess:null;
 return{id:user.id,grantId:String(grant?.grantId||''),name:user.name||'',assignedName:String(grant?.teacherName||''),email:user.email||'',role:'teacher',suspended:!!user.suspended,plan:user.plan||'free',schoolName,schoolId,classCount:classAccess?Object.keys(classAccess).length:(Array.isArray(user.classIds)?user.classIds.length:0),permissions:grant?cleanPermissions(grant.permissions):cleanPermissions(user.permissions)}
}
async function ownerTeacherMembershipsForUser(user){
 const out=[],seen=new Set(),grants=user?.sharedGrants&&typeof user.sharedGrants==='object'?Object.values(user.sharedGrants):[];
 for(const local of grants){
  if(!local?.grantId||!local?.schoolId)continue;
  let live=local;const raw=await storeGet(grantKey(local.grantId));
  if(raw){try{const parsed=JSON.parse(raw);if(parsed.revoked)continue;live={...local,...parsed}}catch{continue}}
  const key=String(live.grantId);if(seen.has(key))continue;seen.add(key);out.push(await ownerTeacherSummary(user,live))
 }
 const role=String(user?.baseRole||user?.role);
 if(role==='teacher'&&!out.length)out.push(await ownerTeacherSummary(user,null));
 return out
}
async function ownerSchoolSummary(user,schoolId){
 const sid=String(schoolId||'');let schoolName='',schoolNameFr='',classCount=0;
 if(pool&&sid){
  const [sq,st]=await Promise.all([pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[sid]),loadDurableSchoolStructure(sid)]);
  const d=sq.rows[0]?.data||{};schoolName=String(d.school||'');schoolNameFr=String(d.schoolFr||'');classCount=Array.isArray(st?.classes)?st.classes.length:0
 }
 return{schoolId:sid,schoolName:schoolName||'مدرسة',schoolNameFr,ownerId:user.id,ownerName:user.name||'',ownerEmail:user.email||'',classCount,teacherCount:0}
}
app.get('/api/owner/staff',auth,ownerOnly,async(_req,res)=>{
 const idx=await getIndex(),teachers=[],professors=[],schools=[],users=[];
 for(const id of Object.values(idx)){const user=await ownerAccountById(id);if(user)users.push(user)}
 for(const user of users){
  const role=String(user.baseRole||user.role);
  if(role!=='professor')teachers.push(...await ownerTeacherMembershipsForUser(user));
  if(role==='professor'){const view=await ownerProfessorView(user);professors.push({...view.account,schoolName:view.schoolName,year:view.year,classCount:view.classes.length,assignmentCount:view.assignments.length,linkedClassCount:view.classes.filter(x=>x.linkedProfessorCount>1).length,versionCount:view.versionCount})}
  if(isOwnerRole(role)){
   const owned=[...new Set(Array.isArray(user.ownedSchoolIds)&&user.ownedSchoolIds.length?user.ownedSchoolIds:(user.schoolId?[user.schoolId]:[]))];
   for(const schoolId of owned)schools.push(await ownerSchoolSummary(user,schoolId))
  }
 }
 const byName=(a,b)=>String(a.name||a.schoolName||'').localeCompare(String(b.name||b.schoolName||''),'fr');
 const uniqueTeachers=[];const teacherKeys=new Set();
 for(const row of teachers){const key=String(row.id)+'|'+String(row.grantId||row.schoolId||'');if(teacherKeys.has(key))continue;teacherKeys.add(key);uniqueTeachers.push(row)}
 for(const school of schools)school.teacherCount=uniqueTeachers.filter(t=>String(t.schoolId)===String(school.schoolId)).length;
 res.json({ok:true,teachers:uniqueTeachers.sort(byName),schools:schools.sort(byName),professors:professors.sort(byName)})
});
app.get('/api/owner/professors/:id',auth,ownerOnly,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});const user=await ownerProfessorAccount(req.params.id);if(!user)return res.status(404).json({error:'professor_account_not_found'});
 res.json({ok:true,professor:await ownerProfessorView(user),catalog:professorCatalog()})
});
app.post('/api/owner/professors/:id/classes',auth,ownerOnly,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});const user=await ownerProfessorAccount(req.params.id);if(!user)return res.status(404).json({error:'professor_account_not_found'});
 const name=String(req.body?.name||'').trim().slice(0,120),levelCode=String(req.body?.levelCode||'').trim().toUpperCase();let branchCode=normalizeProfessorBranchCode(String(req.body?.branchCode||'').trim().slice(0,40));
 if(!name||!['1AS','2AS','3AS','5AS','6AS','7AS'].includes(levelCode))return res.status(400).json({error:'invalid_input'});
 const levelCatalog=professorCatalog().levels.find(x=>String(x.code)===levelCode),branches=Array.isArray(levelCatalog?.branches)?levelCatalog.branches:[];
 if(branches.length){if(!branches.some(x=>String(x.code)===branchCode))return res.status(400).json({error:'invalid_branch'})}else branchCode='';
 const profile=await loadProfessorProfile(user.id);if(profile.classes.some(x=>String(x.name).trim().toLowerCase()===name.toLowerCase()))return res.status(409).json({error:'professor_class_exists'});
 profile.classes.push({id:crypto.randomUUID(),name,levelCode,branchCode,students:[],sharedClassId:''});await saveProfessorProfile(user.id,profile,{syncShared:false});
 res.status(201).json({ok:true,professor:await ownerProfessorView(user)})
});
app.delete('/api/owner/professors/:id/classes/:classId',auth,ownerOnly,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});if(String(req.body?.confirm||'')!=='REMOVE_EMPTY_CLASS')return res.status(400).json({error:'delete_confirmation_required'});
 const user=await ownerProfessorAccount(req.params.id);if(!user)return res.status(404).json({error:'professor_account_not_found'});const profile=await loadProfessorProfile(user.id),cls=profile.classes.find(x=>x.id===String(req.params.classId||''));if(!cls)return res.status(404).json({error:'professor_class_not_found'});
 if((cls.students||[]).length||profile.assignments.some(a=>a.classId===cls.id)||cls.sharedClassId)return res.status(409).json({error:'professor_class_not_empty'});
 profile.classes=profile.classes.filter(x=>x.id!==cls.id);await saveProfessorProfile(user.id,profile,{syncShared:false});res.json({ok:true,professor:await ownerProfessorView(user)})
});
app.post('/api/owner/professors/:id/assignments',auth,ownerOnly,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});const user=await ownerProfessorAccount(req.params.id);if(!user)return res.status(404).json({error:'professor_account_not_found'});const profile=await loadProfessorProfile(user.id),classId=String(req.body?.classId||''),cls=profile.classes.find(x=>x.id===classId);if(!cls)return res.status(404).json({error:'professor_class_not_found'});
 const requestedKey=normalizeProfessorSubjectKey(req.body?.subjectKey||req.body?.subject),spec=requestedKey?professorSubjectFor(cls.levelCode,requestedKey,cls.branchCode):null,custom=String(req.body?.subject||'').trim().slice(0,120),subjectKey=spec?.key||'',subject=spec?.ar||custom,official=spec?.official?Number(spec.coefficient):null,rawCoefficient=Number(req.body?.coefficient),coefficient=official??(Number.isFinite(rawCoefficient)&&rawCoefficient>0&&rawCoefficient<=20?Math.round(rawCoefficient*100)/100:null);
 if(!subject||coefficient==null)return res.status(400).json({error:'invalid_input'});
 if(profile.assignments.some(a=>a.classId===classId&&((subjectKey&&a.subjectKey===subjectKey)||String(a.subject).trim().toLowerCase()===subject.toLowerCase())))return res.status(409).json({error:'professor_assignment_exists'});
 const assignment={id:crypto.randomUUID(),subject,classId,subjectKey,coefficient,coefficientSource:official!=null?'official':'manual'};profile.assignments.push(assignment);profile.marks[assignment.id]={};await saveProfessorProfile(user.id,profile,{syncShared:false});
 res.status(201).json({ok:true,professor:await ownerProfessorView(user)})
});
app.delete('/api/owner/professors/:id/assignments/:assignmentId',auth,ownerOnly,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});if(String(req.body?.confirm||'')!=='REMOVE_ASSIGNMENT')return res.status(400).json({error:'delete_confirmation_required'});
 const user=await ownerProfessorAccount(req.params.id);if(!user)return res.status(404).json({error:'professor_account_not_found'});const profile=await loadProfessorProfile(user.id),assignment=profile.assignments.find(x=>x.id===String(req.params.assignmentId||''));if(!assignment)return res.status(404).json({error:'professor_assignment_not_found'});
 if(professorAssignmentHasGrades(profile,assignment.id))return res.status(409).json({error:'assignment_has_grades'});
 profile.assignments=profile.assignments.filter(x=>x.id!==assignment.id);delete profile.marks[assignment.id];await saveProfessorProfile(user.id,profile,{syncShared:false});res.json({ok:true,professor:await ownerProfessorView(user)})
});

app.post('/api/account/password',auth,resetPasswordRate,async(req,res)=>{
 const current=String(req.body?.currentPassword||''),password=String(req.body?.password||'');
 if(password.length<8||password.length>256)return res.status(400).json({error:'invalid_input'});
 const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(401).json({error:'session_expired'});
 const user=JSON.parse(raw);if(!verifyPassword(current,user))return res.status(401).json({error:'bad_password'});
 const hp=hashPassword(password);user.salt=hp.salt;user.passwordHash=hp.hash;user.sessionVersion=(Number(user.sessionVersion)||0)+1;
 await storeSet(userKey(user.id),JSON.stringify(user));
 const oldToken=parseCookies(req).nataiji_session;if(oldToken)await storeDel(sessionKey(oldToken));
 res.json({ok:true,user:await createSession(res,user)});
});
app.delete('/api/account',auth,async(req,res)=>{
 const password=String(req.body?.password||''),confirm=String(req.body?.confirm||'').trim();
 if(!password)return res.status(400).json({error:'delete_confirmation_required'});
 const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const user=JSON.parse(raw),owner=isOwnerRole(user.baseRole||user.role);
 if(owner){if(normalizeDeleteConfirmation(confirm)!==normalizeDeleteConfirmation('حذف الحساب نهائيا'))return res.status(400).json({error:'delete_confirmation_required'})}
 else if(!['حذف','DELETE'].includes(confirm.toUpperCase()==='DELETE'?'DELETE':normalizeDeleteConfirmation(confirm)))return res.status(400).json({error:'delete_confirmation_required'});
 if(!verifyPassword(password,user))return res.status(401).json({error:'bad_password'});if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const owned=ownedSchoolIdsForDeletion(user),idx=await getIndex(),currentToken=parseCookies(req).nataiji_session;
 try{const client=await pool.connect();try{await client.query('BEGIN');for(const schoolId of owned)for(const table of ['nataiji_marks','nataiji_pupils','nataiji_subjects','nataiji_class_settings','nataiji_migrations','nataiji_school_settings','nataiji_structure'])await client.query('DELETE FROM '+table+' WHERE school_id=$1',[schoolId]);await cleanupProfessorSharing(user.id,client);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}catch(e){console.error('account cleanup failed',user.id,e);return res.status(500).json({error:'account_delete_failed'})}
 let ownerIds=[];try{ownerIds=JSON.parse(await storeGet(ownerGrantsKey(user.id))||'[]')}catch{}for(const id of ownerIds){const gr=await storeGet(grantKey(id));if(!gr)continue;const g=JSON.parse(gr);g.revoked=true;g.revokedAt=new Date().toISOString();await storeSet(grantKey(id),JSON.stringify(g));const ur=await storeGet(userKey(g.recipientId));if(ur){const u=JSON.parse(ur);if(u.sharedGrants)delete u.sharedGrants[id];if(u.activeSharedGrant===id)u.activeSharedGrant='';await storeSet(userKey(u.id),JSON.stringify(u))}}
 for(const [email,id] of Object.entries(idx)){if(id!==user.id)continue;delete idx[email]}await setIndex(idx);for(const schoolId of owned)await storeDel(schoolKey(schoolId));await storeDel(ownerGrantsKey(user.id));await storeDel(userKey(user.id));if(currentToken)await storeDel(sessionKey(currentToken));res.clearCookie('nataiji_session',{path:'/'});res.json({ok:true,scope:'account',deletedSchools:owned.length})
});
app.post('/api/auth/join',(_req,res)=>res.status(410).json({error:'account_login_required'}));
app.post('/api/auth/forgot-password',forgotPasswordRate,async(req,res)=>{const email=normEmail(req.body?.email),lang=req.body?.lang==='fr'?'fr':'ar';if(!process.env.RESEND_API_KEY||!process.env.RESET_FROM_EMAIL)return res.status(503).json({error:'email_service_unconfigured'});if(!email||!validEmail(email))return res.json({ok:true});const recent=await storeGet(resetRateKey(email));if(recent)return res.json({ok:true});await storeSet(resetRateKey(email),'1',60);const idx=await getIndex(),id=idx[email];if(!id)return res.json({ok:true});const raw=await storeGet(userKey(id));if(!raw)return res.json({ok:true});const user=JSON.parse(raw),token=crypto.randomBytes(32).toString('hex'),origin=(process.env.PUBLIC_BASE_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');await storeSet(resetKey(token),JSON.stringify({userId:user.id,createdAt:Date.now()}),RESET_TTL);try{await sendResetEmail(user,`${origin}/?reset=${encodeURIComponent(token)}`,lang)}catch(e){await storeDel(resetKey(token));return res.status(e.code==='email_service_unconfigured'?503:502).json({error:e.code||'email_delivery_failed'})}res.json({ok:true})});
app.post('/api/auth/reset-password',resetPasswordRate,async(req,res)=>{const token=String(req.body?.token||''),password=String(req.body?.password||'');if(token.length<20||password.length<8)return res.status(400).json({error:'invalid_input'});const raw=await storeGet(resetKey(token));if(!raw)return res.status(400).json({error:'invalid_or_expired_reset'});const {userId}=JSON.parse(raw),uRaw=await storeGet(userKey(userId));if(!uRaw){await storeDel(resetKey(token));return res.status(400).json({error:'invalid_or_expired_reset'})}const user=JSON.parse(uRaw),hp=hashPassword(password);user.salt=hp.salt;user.passwordHash=hp.hash;user.sessionVersion=(Number(user.sessionVersion)||0)+1;await storeSet(userKey(user.id),JSON.stringify(user));await storeDel(resetKey(token));res.json({ok:true})});
app.post('/api/auth/reset-with-code',resetPasswordRate,async(req,res)=>{const code=String(req.body?.code||'').trim().toUpperCase(),password=String(req.body?.password||'');if(!/^NT-[A-Z0-9]{8}$/.test(code)||password.length<8)return res.status(400).json({error:'invalid_input'});const key=resetCodeKey(code),raw=await storeGet(key);if(!raw)return res.status(400).json({error:'invalid_or_expired_reset'});const {userId}=JSON.parse(raw),uRaw=await storeGet(userKey(userId));if(!uRaw){await storeDel(key);return res.status(400).json({error:'invalid_or_expired_reset'})}const user=JSON.parse(uRaw),hp=hashPassword(password);user.salt=hp.salt;user.passwordHash=hp.hash;user.sessionVersion=(Number(user.sessionVersion)||0)+1;await storeSet(userKey(user.id),JSON.stringify(user));await storeDel(key);res.json({ok:true})});
app.post('/api/owner/accounts/:id/action',auth,ownerOnly,async(req,res)=>{const id=String(req.params.id||''),action=String(req.body?.action||''),raw=await storeGet(userKey(id));if(!raw)return res.status(404).json({error:'account_not_found'});const user=JSON.parse(raw);if(String(user.baseRole||user.role)==='owner')return res.status(403).json({error:'owner_account_protected'});if(action==='suspend'||action==='activate'){user.suspended=action==='suspend';user.sessionVersion=(Number(user.sessionVersion)||0)+1;await storeSet(userKey(id),JSON.stringify(user));return res.json({ok:true,suspended:user.suspended})}if(action==='reset_code'){const code='NT-'+crypto.randomBytes(4).toString('hex').toUpperCase();await storeSet(resetCodeKey(code),JSON.stringify({userId:id,createdAt:Date.now()}),RESET_TTL);return res.json({ok:true,code,expiresInMinutes:30})}return res.status(400).json({error:'invalid_action'})});
app.delete('/api/owner/accounts/:id',auth,ownerOnly,async(req,res)=>{const id=String(req.params.id||''),confirm=String(req.body?.confirm||'').trim();if(confirm!=='DELETE')return res.status(400).json({error:'delete_confirmation_required'});const raw=await storeGet(userKey(id));if(!raw)return res.status(404).json({error:'account_not_found'});const user=JSON.parse(raw);if(String(user.baseRole||user.role)==='owner')return res.status(403).json({error:'owner_account_protected'});const owned=ownedSchoolIdsForDeletion(user);if(pool){const client=await pool.connect();try{await client.query('BEGIN');for(const schoolId of owned)for(const table of ['nataiji_marks','nataiji_pupils','nataiji_subjects','nataiji_class_settings','nataiji_migrations','nataiji_school_settings','nataiji_structure'])await client.query('DELETE FROM '+table+' WHERE school_id=$1',[schoolId]);await cleanupProfessorSharing(id,client);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}const idx=await getIndex();for(const [email,userId] of Object.entries(idx))if(userId===id)delete idx[email];await setIndex(idx);for(const schoolId of owned)await storeDel(schoolKey(schoolId));await storeDel(ownerGrantsKey(id));await storeDel(userKey(id));res.json({ok:true,deletedSchools:owned.length})});
app.post('/api/invites',auth,adminOnly,async(req,res)=>{
 const raw=await storeGet(schoolKey(req.user.schoolId)),school=ensureSchoolModel(raw?JSON.parse(raw):{}),permissions=cleanPermissions(req.body?.permissions);
 if(!permissions.length)return res.status(400).json({error:'invalid_permissions'});
 const teacherName=String(req.body?.teacherName||'').trim()||'معلم',requested=req.body?.classAccess&&typeof req.body.classAccess==='object'?req.body.classAccess:null,classAccess={};
 if(requested){
  for(const [classId,scope] of Object.entries(requested)){
   const cls=school.classes.find(c=>c.id===classId);if(!cls)continue;
   const allSubjects=scope?.allSubjects===true,fullClass=scope?.fullClass===true;let subjectIds=[],hiddenSubjectIds=[];
   const sq=await pool.query('SELECT subject_id FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId]),valid=new Set(sq.rows.map(x=>String(x.subject_id)));
   subjectIds=[...new Set((Array.isArray(scope?.subjectIds)?scope.subjectIds:[]).map(String).filter(x=>valid.has(x)))];
   hiddenSubjectIds=[...new Set((Array.isArray(scope?.hiddenSubjectIds)?scope.hiddenSubjectIds:[]).map(String).filter(x=>valid.has(x)))];
   classAccess[classId]={allSubjects:fullClass||allSubjects,subjectIds,hiddenSubjectIds:fullClass?[]:hiddenSubjectIds,fullClass}
  }
 }else{
  const requestedClass=String(req.body?.classId||school.activeClassId||''),cls=school.classes.find(c=>c.id===requestedClass);if(!cls)return res.status(400).json({error:'invalid_class'});
  const allSubjects=req.body?.allSubjects!==false;let subjectIds=[];
  if(!allSubjects){const sq=await pool.query('SELECT subject_id FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,cls.id]),valid=new Set(sq.rows.map(x=>String(x.subject_id)));subjectIds=[...new Set((Array.isArray(req.body?.subjectIds)?req.body.subjectIds:[]).map(String).filter(x=>valid.has(x)))];if(!subjectIds.length)return res.status(400).json({error:'invalid_subject_scope'})}
  classAccess[cls.id]={allSubjects,subjectIds}
 }
 const classIds=Object.keys(classAccess);if(!classIds.length)return res.status(400).json({error:'invalid_class_scope'});
 const code='NT-'+crypto.randomBytes(6).toString('hex').toUpperCase(),grantId=crypto.randomUUID(),sq=pool?await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[req.user.schoolId]):null,sd=sq?.rows?.[0]?.data||{},inv={grantId,schoolId:req.user.schoolId,schoolName:sd.school||'مدرسة',schoolNameFr:sd.schoolFr||'',createdBy:req.user.id,ownerName:req.user.name||'',teacherName,permissions,classIds,classAccess,createdAt:new Date().toISOString()};
 await storeSet(inviteKey(code),JSON.stringify(inv),INVITE_TTL);
 res.status(201).json({code,expiresInDays:7,teacherName,permissions,classIds,classAccess,classes:school.classes.filter(x=>classIds.includes(x.id)).map(x=>({id:x.id,name:x.name}))})
});

app.post('/api/access/attach',inviteAttachRate,auth,async(req,res)=>{
 const code=String(req.body?.code||'').trim().toUpperCase();if(!/^NT-[A-F0-9]{8,16}$/.test(code))return res.status(400).json({error:'invalid_invite'});
 const used=await storeGet(accessCodeKey(code));if(used)return res.status(409).json({error:'invite_in_use'});
 const invRaw=await storeGet(inviteKey(code));if(!invRaw)return res.status(404).json({error:'invalid_invite'});const inv=JSON.parse(invRaw);if(inv.createdBy===req.user.id)return res.status(409).json({error:'cannot_attach_own_invite'});const uRaw=await storeGet(userKey(req.user.id));if(!uRaw)return res.status(404).json({error:'account_not_found'});const user=JSON.parse(uRaw),grantId=inv.grantId||crypto.randomUUID();
 user.baseRole=user.baseRole||user.role;user.sharedGrants=user.sharedGrants&&typeof user.sharedGrants==='object'?user.sharedGrants:{};user.sharedGrants[grantId]={grantId,ownerId:inv.createdBy,ownerName:inv.ownerName||'',schoolId:inv.schoolId,schoolName:inv.schoolName||'مدرسة',schoolNameFr:inv.schoolNameFr||'',classAccess:inv.classAccess||{},permissions:cleanPermissions(inv.permissions),teacherName:inv.teacherName||'',createdAt:new Date().toISOString()};user.activeSharedGrant=grantId;user.workspaceMode='shared';user.workspaceSelections=user.workspaceSelections&&typeof user.workspaceSelections==='object'?user.workspaceSelections:{};user.workspaceSelections['shared:'+grantId]=user.workspaceSelections['shared:'+grantId]||{classId:Object.keys(inv.classAccess||{})[0]||'',term:''};await storeSet(userKey(user.id),JSON.stringify(user));
 const grant={...user.sharedGrants[grantId],recipientId:user.id,recipientName:user.name,revoked:false};await storeSet(grantKey(grantId),JSON.stringify(grant));let ids=[];try{ids=JSON.parse(await storeGet(ownerGrantsKey(inv.createdBy))||'[]')}catch{};ids=[...new Set([...ids,grantId])];await storeSet(ownerGrantsKey(inv.createdBy),JSON.stringify(ids));await storeSet(accessCodeKey(code),JSON.stringify({userId:user.id,grantId,createdAt:new Date().toISOString()}));await storeDel(inviteKey(code));res.json({ok:true,user:safeUser(user),grant})
});
app.get('/api/workspaces',auth,async(req,res)=>{
 const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const u=JSON.parse(raw),baseRole=u.baseRole||u.role,ownedIds=[...new Set(Array.isArray(u.ownedSchoolIds)&&u.ownedSchoolIds.length?u.ownedSchoolIds:(isOwnerRole(baseRole)&&u.schoolId?[u.schoolId]:[]))],owned=[];
 if(pool)for(const schoolId of ownedIds){const sq=await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[schoolId]),legacyRaw=await storeGet(schoolKey(schoolId)),legacy=legacyRaw?JSON.parse(legacyRaw):null,structure=await repairStructureIfNeeded(schoolId,legacy),sd=sq.rows[0]?.data||{};owned.push({schoolId,schoolName:sd.school||'مدرسة',schoolNameFr:sd.schoolFr||'',classes:structure.classes||[],active:!u.activeSharedGrant&&u.schoolId===schoolId})}
 const shared=[];for(const g of Object.values(u.sharedGrants||{})){const gr=await storeGet(grantKey(g.grantId));if(gr&&JSON.parse(gr).revoked)continue;let classes=[];if(pool){const legacyRaw=await storeGet(schoolKey(g.schoolId)),legacy=legacyRaw?JSON.parse(legacyRaw):null,st=await repairStructureIfNeeded(g.schoolId,legacy),all=st.classes||[],allowed=new Set(Object.keys(g.classAccess||{}));classes=all.filter(x=>allowed.has(x.id))}shared.push({...g,classes,active:u.activeSharedGrant===g.grantId})}
 res.json({ok:true,owned,shared,activeSharedGrant:u.activeSharedGrant||''})
});
app.get('/api/shared',auth,async(req,res)=>{const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const u=JSON.parse(raw);res.json({ok:true,activeSharedGrant:u.activeSharedGrant||'',grants:Object.values(u.sharedGrants||{})})});
app.post('/api/shared/switch',auth,async(req,res)=>{const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});const u=JSON.parse(raw),id=String(req.body?.grantId||'');if(id&&!u.sharedGrants?.[id])return res.status(404).json({error:'shared_access_not_found'});if(id){const gr=await storeGet(grantKey(id));if(!gr||JSON.parse(gr).revoked){delete u.sharedGrants[id];u.activeSharedGrant='';await storeSet(userKey(u.id),JSON.stringify(u));return res.status(403).json({error:'shared_access_revoked'})}}u.activeSharedGrant=id;u.workspaceMode=id?'shared':'owned';u.workspaceSelections=u.workspaceSelections&&typeof u.workspaceSelections==='object'?u.workspaceSelections:{};if(id&&!u.workspaceSelections['shared:'+id])u.workspaceSelections['shared:'+id]={classId:Object.keys(u.sharedGrants?.[id]?.classAccess||{})[0]||'',term:''};await storeSet(userKey(u.id),JSON.stringify(u));res.json({ok:true,user:safeUser(u)})});
app.get('/api/shares',auth,async(req,res)=>{
 if(!isOwnerRole(req.user.baseRole)||req.user.activeSharedGrant)return res.status(403).json({error:'forbidden'});
 let ids=[];try{ids=JSON.parse(await storeGet(ownerGrantsKey(req.user.id))||'[]')}catch{}
 const grants=[],schoolCache=new Map();
 const metaFor=async schoolId=>{
  if(schoolCache.has(schoolId))return schoolCache.get(schoolId);
  const meta={classes:new Map(),subjects:new Map()};
  if(pool){
   const st=(await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[schoolId])).rows[0]?.data||{};
   for(const cls of st.classes||[])meta.classes.set(String(cls.id),{id:String(cls.id),name:String(cls.name||''),nameFr:String(cls.nameFr||''),code:String(cls.code||'')});
   const rows=(await pool.query('SELECT class_id,subject_id,data FROM nataiji_subjects WHERE school_id=$1 ORDER BY class_id,position,updated_at',[schoolId])).rows;
   for(const row of rows){
    const cid=String(row.class_id),d=Array.isArray(row.data)?row.data:[],arr=meta.subjects.get(cid)||[];
    arr.push({id:String(row.subject_id),name:String(d[0]||''),nameFr:String(d[2]||'')});meta.subjects.set(cid,arr)
   }
  }
  schoolCache.set(schoolId,meta);return meta
 };
 for(const id of ids){
  const raw=await storeGet(grantKey(id));if(!raw)continue;
  const g=JSON.parse(raw);if(g.revoked)continue;
  const meta=await metaFor(g.schoolId),classDetails=[];
  for(const [classId,scope] of Object.entries(g.classAccess||{})){
   const cls=meta.classes.get(String(classId))||{id:String(classId),name:String(classId),nameFr:'',code:''};
   const subs=meta.subjects.get(String(classId))||[],hidden=new Set((scope?.hiddenSubjectIds||[]).map(String)),edit=new Set((scope?.subjectIds||[]).map(String)),full=scope?.fullClass===true||scope?.allSubjects===true;
   const visible=subs.filter(s=>!hidden.has(s.id)),editSubjects=full?visible:visible.filter(s=>edit.has(s.id)),viewSubjects=full?[]:visible.filter(s=>!edit.has(s.id)),hiddenSubjects=subs.filter(s=>hidden.has(s.id));
   classDetails.push({...cls,fullClass:full,editSubjects,viewSubjects,hiddenSubjects})
  }
  grants.push({...g,permissions:cleanPermissions(g.permissions),classDetails})
 }
 res.json({ok:true,grants})
});
app.delete('/api/shares/:id',auth,async(req,res)=>{if(req.user.baseRole!=='admin'||req.user.activeSharedGrant)return res.status(403).json({error:'forbidden'});const id=String(req.params.id),raw=await storeGet(grantKey(id));if(!raw)return res.status(404).json({error:'share_not_found'});const g=JSON.parse(raw);if(g.ownerId!==req.user.id)return res.status(403).json({error:'forbidden'});g.revoked=true;g.revokedAt=new Date().toISOString();await storeSet(grantKey(id),JSON.stringify(g));const ur=await storeGet(userKey(g.recipientId));if(ur){const u=JSON.parse(ur);if(u.sharedGrants)delete u.sharedGrants[id];if(u.activeSharedGrant===id)u.activeSharedGrant='';await storeSet(userKey(u.id),JSON.stringify(u))}res.json({ok:true})});
app.put('/api/shares/:id',auth,async(req,res)=>{if(req.user.baseRole!=='admin'||req.user.activeSharedGrant)return res.status(403).json({error:'forbidden'});const id=String(req.params.id),raw=await storeGet(grantKey(id));if(!raw)return res.status(404).json({error:'share_not_found'});const g=JSON.parse(raw);if(g.ownerId!==req.user.id||g.revoked)return res.status(403).json({error:'forbidden'});const permissions=cleanPermissions(req.body?.permissions);if(!permissions.length)return res.status(400).json({error:'invalid_permissions'});const st=(await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[g.schoolId])).rows[0]?.data||{},requested=req.body?.classAccess&&typeof req.body.classAccess==='object'?req.body.classAccess:{},classAccess={};for(const [classId,scope] of Object.entries(requested)){if(!st.classes?.some(x=>x.id===classId))continue;const rows=(await pool.query('SELECT subject_id FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2',[g.schoolId,classId])).rows,valid=new Set(rows.map(x=>String(x.subject_id))),fullClass=scope?.fullClass===true,allSubjects=fullClass||scope?.allSubjects===true,subjectIds=[...new Set((scope?.subjectIds||[]).map(String).filter(x=>valid.has(x)))],hiddenSubjectIds=fullClass?[]:[...new Set((scope?.hiddenSubjectIds||[]).map(String).filter(x=>valid.has(x)))];classAccess[classId]={fullClass,allSubjects,subjectIds,hiddenSubjectIds}}if(!Object.keys(classAccess).length)return res.status(400).json({error:'invalid_class_scope'});g.permissions=permissions;g.classAccess=classAccess;g.updatedAt=new Date().toISOString();await storeSet(grantKey(id),JSON.stringify(g));const ur=await storeGet(userKey(g.recipientId));if(ur){const u=JSON.parse(ur);if(u.sharedGrants?.[id])u.sharedGrants[id]={...u.sharedGrants[id],permissions,classAccess,updatedAt:g.updatedAt};await storeSet(userKey(u.id),JSON.stringify(u))}res.json({ok:true,grant:g})});


app.post('/api/auth/code-login',(_req,res)=>res.status(401).json({error:'account_login_required'}));

app.get('/api/structure',auth,async(req,res)=>{if(!pool)return res.status(503).json({error:'durable_storage_required'});const raw=await storeGet(schoolKey(req.user.schoolId)),legacy=ensureSchoolModel(raw?JSON.parse(raw):{});let q=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]);if(!q.rowCount){const classes=structuredClone(legacy.classes||[]);for(const cls of classes){const cr=await pool.query('SELECT data FROM nataiji_class_settings WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,cls.id]);const m=cr.rows[0]?.data||{};if(m.className)cls.name=m.className;if(m.classNameFr!==undefined)cls.nameFr=m.classNameFr;if(m.classCode)cls.code=m.classCode}const seed={classes,terms:structuredClone(legacy.terms||[]),activeClassId:legacy.activeClassId||classes[0]?.id||'',term:legacy.term||legacy.terms?.[0]||''};await pool.query('INSERT INTO nataiji_structure(school_id,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[req.user.schoolId,JSON.stringify(seed)]);q=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId])}const structure=q.rows[0]?.data||{classes:[],terms:[],activeClassId:'',term:''};if(req.user.role==='teacher'){const allowed=new Set(assignedClassIds(req.user,{classes:structure.classes||[]}).map(String)),classes=(structure.classes||[]).filter(x=>allowed.has(String(x.id))),preferred=String(req.user.preferredClassId||structure.activeClassId||''),activeClassId=classes.some(x=>String(x.id)===preferred)?preferred:String(classes[0]?.id||'');return res.json({ok:true,structure:{...structure,classes,activeClassId}})}res.json({ok:true,structure})});

app.put('/api/structure',auth,adminOnly,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});
 try{
  const raw=await storeGet(schoolKey(req.user.schoolId));if(!raw)return res.status(404).json({error:'school_not_found'});
  const legacy=ensureSchoolModel(JSON.parse(raw)),input=req.body?.structure||{},seen=new Set(),classes=[];
  for(const x of Array.isArray(input.classes)?input.classes:[]){const id=String(x?.id||'').trim()||('class-'+crypto.randomUUID()),name=String(x?.name||'').trim(),nameFr=String(x?.nameFr||'').trim(),code=String(x?.code||'').trim().toUpperCase();if(!name||seen.has(id))continue;seen.add(id);classes.push({id,name,nameFr,code})}
  const terms=[...new Set((Array.isArray(input.terms)?input.terms:[]).map(x=>String(x||'').trim()).filter(Boolean))],activeClassId=classes.some(x=>x.id===input.activeClassId)?String(input.activeClassId):(classes[0]?.id||''),term=terms.includes(input.term)?String(input.term):(terms[0]||''),structure={classes,terms,activeClassId,term};
  const oldQ=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),oldClasses=oldQ.rows[0]?.data?.classes||legacy.classes||[],oldIds=new Set(oldClasses.map(x=>x.id)),explicitDelete=new Set((Array.isArray(req.body?.deleteClassIds)?req.body.deleteClassIds:[]).map(String)),requestedIds=new Set(classes.map(x=>x.id));for(const old of oldClasses)if(!requestedIds.has(old.id)&&!explicitDelete.has(old.id))classes.push(structuredClone(old));const keep=new Set(classes.map(x=>x.id)),removed=oldClasses.map(x=>x.id).filter(id=>explicitDelete.has(id)&&!keep.has(id));structure.classes=classes;structure.activeClassId=classes.some(x=>x.id===activeClassId)?activeClassId:(classes[0]?.id||'');
  const client=await pool.connect();
  try{await client.query('BEGIN');await client.query('INSERT INTO nataiji_structure(school_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(school_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[req.user.schoolId,JSON.stringify(structure)]);for(const id of removed){await client.query('DELETE FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,id]);await client.query('DELETE FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,id]);await client.query('DELETE FROM nataiji_marks WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,id]);await client.query('DELETE FROM nataiji_class_settings WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,id]);await client.query('DELETE FROM nataiji_migrations WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,id])}await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  // Seed subjects after the structure itself is durable, so a template issue can never block class creation.
  for(const cls of classes){if(oldIds.has(cls.id))continue;try{const preset=officialSubjectsFor(cls.code),sc=await pool.connect();try{await sc.query('BEGIN');for(let i=0;i<preset.length;i++){const s=preset[i],sid=crypto.createHash('sha256').update(String(i)+'|'+String(s[0])).digest('hex').slice(0,24);await sc.query('INSERT INTO nataiji_subjects(school_id,class_id,subject_id,data,position) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING',[req.user.schoolId,cls.id,sid,JSON.stringify(s),i])}await sc.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,cls.id,'subjects']);await sc.query('COMMIT')}catch(e){await sc.query('ROLLBACK');throw e}finally{sc.release()}}catch(e){console.error('structure subject seed failed',req.user.schoolId,cls.id,e.message)}}
  try{legacy.classes=structuredClone(classes);legacy.terms=structuredClone(terms);legacy.activeClassId=activeClassId;legacy.term=term;legacy.classData=legacy.classData&&typeof legacy.classData==='object'?legacy.classData:{};for(const cls of classes)legacy.classData[cls.id]=legacy.classData[cls.id]||{pupils:[],subjects:[],marksByTerm:{}};for(const id of Object.keys(legacy.classData)){if(!keep.has(id))delete legacy.classData[id]}const d=activeClassId?legacy.classData[activeClassId]:null;legacy.className=classes.find(x=>x.id===activeClassId)?.name||'';legacy.classNameFr=classes.find(x=>x.id===activeClassId)?.nameFr||'';legacy.classCode=classes.find(x=>x.id===activeClassId)?.code||'';legacy.pupils=structuredClone(d?.pupils||[]);legacy.subjects=structuredClone(d?.subjects||[]);legacy.marksByTerm=structuredClone(d?.marksByTerm||{});legacy.marks=structuredClone((term&&d?.marksByTerm?.[term])||[]);await storeSet(schoolKey(req.user.schoolId),JSON.stringify(legacy))}catch(e){console.error('structure legacy mirror failed',req.user.schoolId,e.message)}
  res.json({ok:true,structure});
 }catch(e){console.error('PUT /api/structure failed',req.user?.schoolId,e);res.status(500).json({error:'structure_save_failed',detail:String(e?.message||e)})}
});

app.put('/api/settings',auth,async(req,res)=>{if(req.user.role!=='admin')return res.status(403).json({error:'forbidden'});if(!pool)return res.status(503).json({error:'durable_storage_required'});const prevSettings=(await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[req.user.schoolId])).rows[0]?.data||{},schoolData={...prevSettings,school:String(req.body?.school||'').trim(),schoolFr:String(req.body?.schoolFr||'').trim(),region:String(req.body?.region||'').trim(),regionFr:String(req.body?.regionFr||'').trim(),inspection:String(req.body?.inspection||'').trim(),inspectionFr:String(req.body?.inspectionFr||'').trim(),year:String(req.body?.year||'').trim(),onboardingComplete:req.body?.onboardingComplete===undefined?prevSettings.onboardingComplete===true:req.body.onboardingComplete===true},classId=String(req.body?.classId||'').trim(),classData={className:String(req.body?.className||'').trim(),classNameFr:String(req.body?.classNameFr||'').trim(),classCode:String(req.body?.classCode||'').trim()},client=await pool.connect();try{await client.query('BEGIN');await client.query(`INSERT INTO nataiji_school_settings(school_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(school_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,[req.user.schoolId,JSON.stringify(schoolData)]);if(classId){const sq=await client.query('SELECT data FROM nataiji_structure WHERE school_id=$1 FOR UPDATE',[req.user.schoolId]),st=sq.rows[0]?.data||{classes:[],terms:[],activeClassId:'',term:''},cls=st.classes?.find(x=>x.id===classId);if(cls){cls.name=classData.className||cls.name;cls.nameFr=classData.classNameFr;cls.code=classData.classCode||cls.code;await client.query('UPDATE nataiji_structure SET data=$2::jsonb,updated_at=now() WHERE school_id=$1',[req.user.schoolId,JSON.stringify(st)]);await client.query(`INSERT INTO nataiji_class_settings(school_id,class_id,data,updated_at) VALUES($1,$2,$3::jsonb,now()) ON CONFLICT(school_id,class_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,[req.user.schoolId,classId,JSON.stringify(classData)])}}await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}const sRow=await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[req.user.schoolId]);let settings={...(sRow.rows[0]?.data||{})};if(classId){const sq=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),cls=sq.rows[0]?.data?.classes?.find(x=>x.id===classId);if(cls)settings={...settings,className:cls.name||'',classNameFr:cls.nameFr||'',classCode:cls.code||''}}res.json({ok:true,settings,classId})});

app.post('/api/recovery/local-state',auth,async(req,res)=>{
 if(req.user.role!=='admin')return res.status(403).json({error:'forbidden'});
 if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const recovered=recoveryState(req.body?.state),counts=recoveryCounts(recovered);
 if(!counts.classes||(!counts.pupils&&!counts.subjects))return res.status(400).json({error:'recovery_snapshot_empty'});
 const schoolId=req.user.schoolId,sq=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[schoolId]),current=sq.rows[0]?.data||{},existingCounts=(await Promise.all([
  pool.query('SELECT count(*)::int AS n FROM nataiji_pupils WHERE school_id=$1',[schoolId]),
  pool.query('SELECT count(*)::int AS n FROM nataiji_subjects WHERE school_id=$1',[schoolId]),
  pool.query('SELECT count(*)::int AS n FROM nataiji_marks WHERE school_id=$1',[schoolId])
 ])).map(x=>Number(x.rows[0]?.n||0));
 if((Array.isArray(current.classes)&&current.classes.length)||existingCounts.some(n=>n>0))return res.status(409).json({error:'recovery_target_not_empty'});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const structure={classes:recovered.classes,terms:recovered.terms,activeClassId:recovered.activeClassId,term:recovered.term};
  await client.query('INSERT INTO nataiji_structure(school_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(school_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[schoolId,JSON.stringify(structure)]);
  await client.query('INSERT INTO nataiji_school_settings(school_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(school_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[schoolId,JSON.stringify({school:recovered.school,schoolFr:recovered.schoolFr,region:recovered.region,regionFr:recovered.regionFr,inspection:recovered.inspection,inspectionFr:recovered.inspectionFr,year:recovered.year,onboardingComplete:true})]);
  for(const cls of recovered.classes){
   const d=recovered.classData[cls.id]||{pupils:[],subjects:[],marksByTerm:{}};
   await client.query('INSERT INTO nataiji_class_settings(school_id,class_id,data,updated_at) VALUES($1,$2,$3::jsonb,now()) ON CONFLICT(school_id,class_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[schoolId,cls.id,JSON.stringify({className:cls.name,classNameFr:cls.nameFr,classCode:cls.code})]);
   for(let i=0;i<d.subjects.length;i++){const s=structuredClone(d.subjects[i]),id=String(s[4]);s.length=Math.max(s.length,4);s.splice(4);await client.query('INSERT INTO nataiji_subjects(school_id,class_id,subject_id,data,position,updated_at) VALUES($1,$2,$3,$4::jsonb,$5,now()) ON CONFLICT(school_id,class_id,subject_id) DO UPDATE SET data=EXCLUDED.data,position=EXCLUDED.position,updated_at=now()',[schoolId,cls.id,id,JSON.stringify(s),i])}
   for(let i=0;i<d.pupils.length;i++){const p=structuredClone(d.pupils[i]),key=String(p[7]);await client.query('INSERT INTO nataiji_pupils(school_id,class_id,nns,data,position,updated_at) VALUES($1,$2,$3,$4::jsonb,$5,now()) ON CONFLICT(school_id,class_id,nns) DO UPDATE SET data=EXCLUDED.data,position=EXCLUDED.position,updated_at=now()',[schoolId,cls.id,key,JSON.stringify(p),i])}
   for(const t of recovered.terms){const matrix=d.marksByTerm?.[t]||[];for(let i=0;i<d.pupils.length;i++)for(let j=0;j<d.subjects.length;j++){const value=matrix?.[i]?.[j];if(value===''||value==null)continue;await client.query('INSERT INTO nataiji_marks(school_id,class_id,term,pupil_key,subject_id,value,updated_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT(school_id,class_id,term,pupil_key,subject_id) DO UPDATE SET value=EXCLUDED.value,updated_at=now()',[schoolId,cls.id,t,String(d.pupils[i][7]),String(d.subjects[j][4]),String(value)])}}
   for(const resource of ['subjects','pupils','marks-v1'])await client.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[schoolId,cls.id,resource])
  }
  await client.query('COMMIT')
 }catch(e){await client.query('ROLLBACK');console.error('local recovery failed',schoolId,e);return res.status(500).json({error:'local_recovery_failed'})}finally{client.release()}
 const legacy={...recovered,className:recovered.classes.find(x=>x.id===recovered.activeClassId)?.name||'',classNameFr:recovered.classes.find(x=>x.id===recovered.activeClassId)?.nameFr||'',classCode:recovered.classes.find(x=>x.id===recovered.activeClassId)?.code||'',pupils:structuredClone(recovered.classData?.[recovered.activeClassId]?.pupils||[]),subjects:structuredClone(recovered.classData?.[recovered.activeClassId]?.subjects||[]),marksByTerm:structuredClone(recovered.classData?.[recovered.activeClassId]?.marksByTerm||{}),marks:structuredClone(recovered.classData?.[recovered.activeClassId]?.marksByTerm?.[recovered.term]||[]),savedAt:new Date().toISOString(),saveRevision:crypto.randomUUID()};
 await storeSet(schoolKey(schoolId),JSON.stringify(legacy));
 console.log('local recovery completed',schoolId,counts);
 res.json({ok:true,counts})
});

app.get('/api/subjects',auth,async(req,res)=>{if(!pool)return res.status(503).json({error:'durable_storage_required'});const sq=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),st=sq.rows[0]?.data||{classes:[]},requested=String(req.query.classId||st.activeClassId||''),allowed=req.user.role==='admin'?(st.classes||[]).map(x=>x.id):assignedClassIds(req.user,{classes:st.classes||[]}),classId=allowed.includes(requested)?requested:(allowed[0]||'');if(!classId||!st.classes?.some(x=>x.id===classId))return res.status(400).json({error:'invalid_class'});let rows=(await pool.query('SELECT subject_id,data FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId])).rows;if(req.user.role==='teacher'){const scope=subjectScopeFor(req.user,classId);if(!scope)return res.status(403).json({error:'forbidden_class'});const hidden=new Set(scope.hiddenSubjectIds||[]);rows=rows.filter(x=>!hidden.has(String(x.subject_id)))}res.json({ok:true,classId,subjects:subjectRows(rows)})});

app.put('/api/subjects',auth,async(req,res)=>{if(!pool)return res.status(503).json({error:'durable_storage_required'});if(req.user.role!=='admin')return res.status(403).json({error:'forbidden'});const sq=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),st=sq.rows[0]?.data||{classes:[]},classId=String(req.body?.classId||st.activeClassId||''),subjects=Array.isArray(req.body?.subjects)?structuredClone(req.body.subjects):null;if(!classId||!subjects||!st.classes?.some(x=>x.id===classId))return res.status(400).json({error:'invalid_subjects'});const existing=(await pool.query('SELECT subject_id,data,position FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId])).rows,existingIds=new Set(existing.map(x=>String(x.subject_id))),usedIds=new Set(),clean=subjects.filter(s=>Array.isArray(s)&&String(s[0]||'').trim()).map((s,i)=>{const requested=String(s[4]||'').trim();let id=existingIds.has(requested)&&!usedIds.has(requested)?requested:'';if(!id){const fallback=String(existing[i]?.subject_id||'');if(fallback&&!usedIds.has(fallback))id=fallback}if(!id)id=crypto.randomUUID();usedIds.add(id);return{data:[String(s[0]).trim(),1,String(s[2]||'').trim(),Math.max(.1,Number(s[3])||20)],id}}),keepIds=new Set(clean.map(x=>x.id)),client=await pool.connect();try{await client.query('BEGIN');await client.query('DELETE FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,classId]);for(let i=0;i<clean.length;i++){const x=clean[i];await client.query('INSERT INTO nataiji_subjects(school_id,class_id,subject_id,data,position) VALUES($1,$2,$3,$4::jsonb,$5)',[req.user.schoolId,classId,x.id,JSON.stringify(x.data),i])}for(const old of existing){if(!keepIds.has(String(old.subject_id)))await client.query('DELETE FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND subject_id=$3',[req.user.schoolId,classId,old.subject_id])}await client.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,classId,'subjects']);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}const q=await pool.query('SELECT subject_id,data FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId]);res.json({ok:true,subjects:subjectRows(q.rows)})});

const OFFICIAL_SUBJECTS={
 '1AF':[['التربية الإسلامية',1,'Éducation islamique',40],['اللغة العربية',1,'Langue arabe',80],['التربية المدنية',1,'Éducation civique',15],['الرياضيات',1,'Mathématiques',40],['التربية الفنية',1,'Éducation artistique',15],['الرياضة',1,'Éducation physique',10]],
 '2AF':[['التربية الإسلامية',1,'Éducation islamique',30],['اللغة العربية',1,'Langue arabe',50],['الحساب',1,'Calcul',40],['التربية المدنية',1,'Éducation civique',15],['التربية الفنية',1,'Éducation artistique',15],['Français',1,'Français',40],['الرياضة',1,'Éducation physique',10]],
 '3AF':[['التربية الإسلامية',1,'Éducation islamique',30],['اللغة العربية',1,'Langue arabe',50],['الرياضيات',1,'Mathématiques',40],['التربية المدنية',1,'Éducation civique',10],['التربية الفنية',1,'Éducation artistique',10],['التاريخ والجغرافيا',1,'Histoire et géographie',10],['Français',1,'Français',30],['العلوم',1,'Sciences',10],['الرياضة',1,'Éducation physique',10]],
 '4AF':[['التربية الإسلامية',1,'Éducation islamique',30],['اللغة العربية',1,'Langue arabe',50],['الرياضيات',1,'Mathématiques',40],['التربية المدنية',1,'Éducation civique',10],['التربية الفنية',1,'Éducation artistique',10],['التاريخ والجغرافيا',1,'Histoire et géographie',10],['Français',1,'Français',30],['العلوم',1,'Sciences',10],['الرياضة',1,'Éducation physique',10]],
 '5AF':[['التربية الإسلامية',1,'Éducation islamique',30],['اللغة العربية',1,'Langue arabe',50],['الرياضيات',1,'Mathématiques',40],['التربية المدنية والفنية',1,'Education civique et artistique',20],['التاريخ والجغرافيا',1,'Histoire et géographie',20],['Français',1,'Français',30],['العلوم الطبيعية',1,'Sciences naturelles',10]],
 '6AF':[['التربية الإسلامية',1,'Éducation islamique',30],['اللغة العربية',1,'Langue arabe',50],['الرياضيات',1,'Mathématiques',40],['التربية المدنية والفنية',1,'Education civique et artistique',20],['التاريخ والجغرافيا',1,'Histoire et géographie',20],['Français',1,'Français',30],['العلوم الطبيعية',1,'Sciences naturelles',10]]
};
const officialSubjectsFor=code=>structuredClone(OFFICIAL_SUBJECTS[String(code||'').trim().toUpperCase()]||[]);
const subjectRows=rows=>rows.map(row=>{const s=Array.isArray(row.data)?structuredClone(row.data):[];s[4]=row.subject_id;return s});
const pupilRows=rows=>rows.map(row=>{const p=Array.isArray(row.data)?structuredClone(row.data):[];p[7]=row.nns;return p});
const recoveryText=(v,max=160)=>String(v??'').trim().slice(0,max);
function recoveryState(input){
 const src=input&&typeof input==='object'?structuredClone(input):{},rawClasses=Array.isArray(src.classes)?src.classes:[],classes=[],classIds=new Set();
 for(const raw of rawClasses.slice(0,120)){const id=recoveryText(raw?.id,120)||('class-'+crypto.randomUUID()),name=recoveryText(raw?.name,160)||recoveryText(raw?.code,80)||'قسم',nameFr=recoveryText(raw?.nameFr,160),code=recoveryText(raw?.code,80);if(classIds.has(id))continue;classIds.add(id);classes.push({id,name,nameFr,code})}
 if(!classes.length){
  const id=recoveryText(src.activeClassId,120)||'class-recovered',name=recoveryText(src.className,160)||recoveryText(src.classCode,80)||'القسم المسترجع',nameFr=recoveryText(src.classNameFr,160),code=recoveryText(src.classCode,80),hasTop=Array.isArray(src.pupils)&&src.pupils.length||Array.isArray(src.subjects)&&src.subjects.length||src.classData&&Object.keys(src.classData||{}).length;
  if(hasTop){classes.push({id,name,nameFr,code});classIds.add(id);src.activeClassId=id}
 }
 const classData=src.classData&&typeof src.classData==='object'?src.classData:{},terms=[...new Set((Array.isArray(src.terms)?src.terms:[]).map(x=>recoveryText(x,80)).filter(Boolean))];
 if(!terms.length){const keys=new Set();for(const d of Object.values(classData)){if(d?.marksByTerm&&typeof d.marksByTerm==='object')for(const k of Object.keys(d.marksByTerm))if(recoveryText(k,80))keys.add(recoveryText(k,80))}if(src.marksByTerm&&typeof src.marksByTerm==='object')for(const k of Object.keys(src.marksByTerm))if(recoveryText(k,80))keys.add(recoveryText(k,80));terms.push(...keys)}
 if(!terms.length&&classes.length)terms.push('الفصل الأول','الفصل الثاني','الفصل الثالث');
 const activeClassId=classes.some(x=>x.id===src.activeClassId)?src.activeClassId:(classes[0]?.id||''),term=terms.includes(src.term)?src.term:(terms[0]||''),cleanData={};
 for(const cls of classes){
  const raw=(classData[cls.id]&&typeof classData[cls.id]==='object')?classData[cls.id]:(cls.id===activeClassId?{pupils:src.pupils,subjects:src.subjects,marksByTerm:src.marksByTerm,marks:src.marks}:{}),pupils=[],subjects=[],pupilKeys=new Set(),subjectIds=new Set();
  for(const p0 of (Array.isArray(raw.pupils)?raw.pupils:[]).slice(0,1500)){
   if(!Array.isArray(p0)||!recoveryText(p0[1],180))continue;const p=structuredClone(p0);let key=recoveryText(p[7]||p[0],120)||('auto-'+crypto.randomUUID());while(pupilKeys.has(key))key='auto-'+crypto.randomUUID();pupilKeys.add(key);p[7]=key;pupils.push(p)
  }
  for(const s0 of (Array.isArray(raw.subjects)?raw.subjects:[]).slice(0,200)){
   if(!Array.isArray(s0)||!recoveryText(s0[0],140))continue;const s=structuredClone(s0);let id=recoveryText(s[4],120)||crypto.randomUUID();while(subjectIds.has(id))id=crypto.randomUUID();subjectIds.add(id);s[0]=recoveryText(s[0],140);s[1]=Math.max(.1,Math.min(20,Number(s[1])||1));s[2]=recoveryText(s[2],140);s[3]=Math.max(.1,Math.min(200,Number(s[3])||20));s[4]=id;subjects.push(s)
  }
  const marksByTerm={},rawMarks=raw.marksByTerm&&typeof raw.marksByTerm==='object'?raw.marksByTerm:{};
  for(const t of terms){const matrix=Array.isArray(rawMarks[t])?rawMarks[t]:(t===term&&Array.isArray(raw.marks)?raw.marks:[]);marksByTerm[t]=pupils.map((_,i)=>subjects.map((_,j)=>matrix?.[i]?.[j]??''))}
  cleanData[cls.id]={pupils,subjects,marksByTerm}
 }
 return{teacher:recoveryText(src.teacher,160),school:recoveryText(src.school,180),schoolFr:recoveryText(src.schoolFr,180),region:recoveryText(src.region,160),regionFr:recoveryText(src.regionFr,160),inspection:recoveryText(src.inspection,160),inspectionFr:recoveryText(src.inspectionFr,160),year:recoveryText(src.year,60),classes,terms,activeClassId,term,classData:cleanData}
}
function recoveryCounts(s){let pupils=0,subjects=0,marks=0;for(const d of Object.values(s?.classData||{})){pupils+=(d.pupils||[]).length;subjects+=(d.subjects||[]).length;for(const matrix of Object.values(d.marksByTerm||{}))for(const row of Array.isArray(matrix)?matrix:[])for(const v of Array.isArray(row)?row:[])if(v!==''&&v!=null)marks++}return{classes:(s?.classes||[]).length,pupils,subjects,marks}}

const primarySubjectKey=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ');
const primaryRowMatches=(row,aliases)=>{const d=Array.isArray(row?.data)?row.data:[],keys=[primarySubjectKey(d[0]),primarySubjectKey(d[2])];return aliases.some(a=>keys.includes(primarySubjectKey(a)))};
const primaryAbsent=v=>/^(غائب|غائبة|absent|absente|a)$/i.test(String(v??'').trim());
const primaryMergedValue=values=>{const non=values.map(v=>String(v??'').trim()).filter(Boolean);if(!non.length)return'';const nums=non.filter(v=>Number.isFinite(Number(v))).map(Number);if(nums.length)return String(Number(nums.reduce((a,b)=>a+b,0).toFixed(2)));if(non.every(primaryAbsent))return non[0];return non[0]};
app.post('/api/subjects/normalize-primary',auth,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});
 if(req.user.role!=='admin')return res.status(403).json({error:'forbidden'});
 const sq=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),st=sq.rows[0]?.data||{classes:[]},classId=String(req.body?.classId||st.activeClassId||''),cls=(st.classes||[]).find(x=>x.id===classId);
 if(!cls)return res.status(400).json({error:'invalid_class'});
 const code=String(cls.code||'').trim().toUpperCase(),rawRows=(await pool.query('SELECT subject_id,data,position FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId])).rows;
 if(!['1AF','2AF'].includes(code))return res.json({ok:true,changed:false,subjects:subjectRows(rawRows)});
 const mergeAliases=code==='1AF'?[['القراءة','Lecture'],['التعبير','Expression'],['الكتابة','Écriture','Ecriture']]:[['Langage'],['Lecture'],['Écriture','Ecriture']];
 const mergeRows=mergeAliases.map(a=>rawRows.find(r=>primaryRowMatches(r,a))).filter(Boolean);
 if(mergeRows.length!==3)return res.json({ok:true,changed:false,subjects:subjectRows(rawRows)});
 const mergeIds=new Set(mergeRows.map(r=>String(r.subject_id))),used=new Set(mergeIds),profile=officialSubjectsFor(code),target=[];
 for(const p of profile){const isMerged=(code==='1AF'&&p[0]==='اللغة العربية')||(code==='2AF'&&p[0]==='Français');const source=isMerged?mergeRows[0]:rawRows.find(r=>!used.has(String(r.subject_id))&&primaryRowMatches(r,[p[0],p[2]]));const id=source?String(source.subject_id):crypto.randomUUID();if(source)used.add(id);target.push({id,data:[p[0],1,p[2],p[3]],sourceIds:isMerged?mergeRows.map(r=>String(r.subject_id)):[id]})}
 const extras=rawRows.filter(r=>!used.has(String(r.subject_id))).map(r=>{const d=Array.isArray(r.data)?structuredClone(r.data):[];return{id:String(r.subject_id),data:[String(d[0]||'مادة').trim(),1,String(d[2]||'').trim(),Math.max(.1,Number(d[3])||20)],sourceIds:[String(r.subject_id)]}});target.push(...extras);
 const client=await pool.connect();
 try{await client.query('BEGIN');const sourceIds=mergeRows.map(r=>String(r.subject_id)),mq=await client.query('SELECT term,pupil_key,subject_id,value FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND subject_id=ANY($3::text[])',[req.user.schoolId,classId,sourceIds]),groups=new Map();for(const row of mq.rows){const k=String(row.term)+'\u0000'+String(row.pupil_key);if(!groups.has(k))groups.set(k,{term:row.term,pupil:row.pupil_key,values:[]});groups.get(k).values.push(row.value)}await client.query('DELETE FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND subject_id=ANY($3::text[])',[req.user.schoolId,classId,sourceIds]);const mergedId=target.find(x=>x.sourceIds.length>1)?.id;if(mergedId)for(const g of groups.values()){const value=primaryMergedValue(g.values);if(value!=='')await client.query('INSERT INTO nataiji_marks(school_id,class_id,term,pupil_key,subject_id,value,updated_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT(school_id,class_id,term,pupil_key,subject_id) DO UPDATE SET value=EXCLUDED.value,updated_at=now()',[req.user.schoolId,classId,g.term,g.pupil,mergedId,value])}await client.query('DELETE FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,classId]);for(let i=0;i<target.length;i++)await client.query('INSERT INTO nataiji_subjects(school_id,class_id,subject_id,data,position) VALUES($1,$2,$3,$4::jsonb,$5)',[req.user.schoolId,classId,target[i].id,JSON.stringify(target[i].data),i]);await client.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,classId,'primary-subjects-v2']);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');console.error('primary subject normalization failed',req.user.schoolId,classId,e);return res.status(500).json({error:'subject_normalization_failed'})}finally{client.release()}
 const q=await pool.query('SELECT subject_id,data FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId]);res.json({ok:true,changed:true,subjects:subjectRows(q.rows)})
});
app.post('/api/pupils',auth,async(req,res)=>{if(!pool)return res.status(503).json({error:'durable_storage_required'});const st=await loadDurableSchoolStructure(req.user.schoolId),requestedClassId=String(req.body?.classId||'').trim(),resolved=resolveTeacherMutationClass(req.user,st,requestedClassId);if(!resolved.ok)return res.status(req.user.role==='teacher'?403:400).json({error:resolved.error});const classId=resolved.classId,pupil=Array.isArray(req.body?.pupil)?structuredClone(req.body.pupil):null;if(!classId||!st.classes?.some(x=>String(x.id)===classId)||!pupil||!String(pupil[1]||'').trim())return res.status(400).json({error:'invalid_pupil'});if(req.user.role!=='admin'&&!new Set(req.user.permissions||[]).has('pupils'))return res.status(403).json({error:'forbidden'});const displayNns=String(pupil[0]||'').trim(),storageKey=displayNns||('auto-'+crypto.randomUUID());pupil[0]=displayNns;pupil[7]=storageKey;const client=await pool.connect();try{await client.query('BEGIN');const pos=(await client.query('SELECT COALESCE(MAX(position),-1)+1 AS n FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,classId])).rows[0].n;await client.query('INSERT INTO nataiji_pupils(school_id,class_id,nns,data,position) VALUES($1,$2,$3,$4::jsonb,$5)',[req.user.schoolId,classId,storageKey,JSON.stringify(pupil),pos]);await client.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,classId,'pupils']);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({error:'pupil_exists'});throw e}finally{client.release()}const q=await pool.query('SELECT nns,data FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId]);res.status(201).json({ok:true,classId,pupils:pupilRows(q.rows)})});

app.put('/api/pupils/:nns',auth,async(req,res)=>{if(!pool)return res.status(503).json({error:'durable_storage_required'});const st=await loadDurableSchoolStructure(req.user.schoolId),requestedClassId=String(req.body?.classId||'').trim(),resolved=resolveTeacherMutationClass(req.user,st,requestedClassId);if(!resolved.ok)return res.status(req.user.role==='teacher'?403:400).json({error:resolved.error});const classId=resolved.classId,pupil=Array.isArray(req.body?.pupil)?structuredClone(req.body.pupil):null;if(!classId||!st.classes?.some(x=>String(x.id)===classId)||!pupil||!String(pupil[1]||'').trim())return res.status(400).json({error:'invalid_pupil'});if(req.user.role!=='admin'&&!new Set(req.user.permissions||[]).has('pupils'))return res.status(403).json({error:'forbidden'});const oldKey=String(req.params.nns),displayNns=String(pupil[0]||'').trim(),newKey=displayNns||(oldKey.startsWith('auto-')?oldKey:'auto-'+crypto.randomUUID());pupil[0]=displayNns;pupil[7]=newKey;const client=await pool.connect();try{await client.query('BEGIN');const old=await client.query('SELECT position FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 AND nns=$3 FOR UPDATE',[req.user.schoolId,classId,oldKey]);if(!old.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'pupil_not_found'})}if(newKey!==oldKey)await client.query('UPDATE nataiji_marks SET pupil_key=$4,updated_at=now() WHERE school_id=$1 AND class_id=$2 AND pupil_key=$3',[req.user.schoolId,classId,oldKey,newKey]);await client.query('DELETE FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 AND nns=$3',[req.user.schoolId,classId,oldKey]);await client.query('INSERT INTO nataiji_pupils(school_id,class_id,nns,data,position) VALUES($1,$2,$3,$4::jsonb,$5)',[req.user.schoolId,classId,newKey,JSON.stringify(pupil),old.rows[0].position]);await client.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,classId,'pupils']);await client.query('COMMIT')}catch(e){try{await client.query('ROLLBACK')}catch{}if(e.code==='23505')return res.status(409).json({error:'pupil_exists'});throw e}finally{client.release()}const q=await pool.query('SELECT nns,data FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId]);res.json({ok:true,classId,pupils:pupilRows(q.rows)})});

app.delete('/api/pupils/:nns',auth,async(req,res)=>{if(!pool)return res.status(503).json({error:'durable_storage_required'});const st=await loadDurableSchoolStructure(req.user.schoolId),requestedClassId=String(req.query.classId||'').trim(),resolved=resolveTeacherMutationClass(req.user,st,requestedClassId);if(!resolved.ok)return res.status(req.user.role==='teacher'?403:400).json({error:resolved.error});const classId=resolved.classId;if(req.user.role!=='admin'&&!new Set(req.user.permissions||[]).has('pupils'))return res.status(403).json({error:'forbidden'});if(!classId||!st.classes?.some(x=>x.id===classId))return res.status(400).json({error:'invalid_class'});await pool.query('DELETE FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND pupil_key=$3',[req.user.schoolId,classId,String(req.params.nns)]);await pool.query('DELETE FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 AND nns=$3',[req.user.schoolId,classId,String(req.params.nns)]);await pool.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,classId,'pupils']);const q=await pool.query('SELECT nns,data FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId]);res.json({ok:true,classId,pupils:pupilRows(q.rows)})});

async function overlayCanonicalMarks(full,schoolId){
 if(!pool)return full;
 for(const cls of full.classes||[]){
  const d=full.classData[cls.id]||(full.classData[cls.id]={pupils:[],subjects:[],marksByTerm:{}});
  const legacyMarks=structuredClone(d.marksByTerm||{});
  const sq=await pool.query('SELECT subject_id,data FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[schoolId,cls.id]);
  d.subjects=subjectRows(sq.rows);
  const pq=await pool.query('SELECT nns,data FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[schoolId,cls.id]);
  d.pupils=pupilRows(pq.rows);
  const mm=await pool.query('SELECT 1 FROM nataiji_migrations WHERE school_id=$1 AND class_id=$2 AND resource=$3',[schoolId,cls.id,'marks-v1']);
  if(!mm.rowCount){
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    for(const term of full.terms||[]){
     const matrix=Array.isArray(legacyMarks?.[term])?legacyMarks[term]:[];
     for(let i=0;i<d.pupils.length;i++){
      const pupilKey=String(d.pupils[i]?.[7]||d.pupils[i]?.[0]||'').trim();if(!pupilKey)continue;
      for(let j=0;j<d.subjects.length;j++){
       const subjectId=String(d.subjects[j]?.[4]||'').trim(),value=matrix?.[i]?.[j];
       if(!subjectId||value===''||value==null)continue;
       await client.query('INSERT INTO nataiji_marks(school_id,class_id,term,pupil_key,subject_id,value,updated_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT(school_id,class_id,term,pupil_key,subject_id) DO UPDATE SET value=EXCLUDED.value,updated_at=now()',[schoolId,cls.id,term,pupilKey,subjectId,String(value)]);
      }
     }
    }
    await client.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[schoolId,cls.id,'marks-v1']);
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }
  const pMap=new Map(d.pupils.map((p,i)=>[String(p?.[7]||p?.[0]||''),i])),sMap=new Map(d.subjects.map((s,j)=>[String(s?.[4]||''),j]));
  d.marksByTerm={};
  for(const term of full.terms||[])d.marksByTerm[term]=d.pupils.map(()=>d.subjects.map(()=>''));
  const mq=await pool.query('SELECT term,pupil_key,subject_id,value FROM nataiji_marks WHERE school_id=$1 AND class_id=$2',[schoolId,cls.id]);
  for(const row of mq.rows){if(!d.marksByTerm[row.term])continue;const i=pMap.get(String(row.pupil_key)),j=sMap.get(String(row.subject_id));if(i!==undefined&&j!==undefined)d.marksByTerm[row.term][i][j]=row.value}
 }
 const active=full.classData?.[full.activeClassId];
 full.pupils=structuredClone(active?.pupils||[]);full.subjects=structuredClone(active?.subjects||[]);full.marksByTerm=structuredClone(active?.marksByTerm||{});full.marks=structuredClone((full.term&&active?.marksByTerm?.[full.term])||[]);
 return full;
}

const validAbsentMark=v=>/^(غائب|غائبة|absent|absente|a)$/i.test(String(v??'').trim());
const validateStoredMark=(value,subjectData)=>{
 const v=value==null?'':String(value).trim(),d=Array.isArray(subjectData)?subjectData:[],nMax=Number(d[3]),max=Number.isFinite(nMax)&&nMax>0?nMax:20;
 if(v==='')return{ok:true,value:'',max};
 if(validAbsentMark(v))return{ok:true,value:v,max,absent:true};
 const n=Number(v);
 if(!Number.isFinite(n))return{ok:false,error:'invalid_mark_value',value:v,max};
 if(n<0||n>max)return{ok:false,error:'mark_out_of_range',value:n,max};
 return{ok:true,value:String(n),max}
};

app.put('/api/mark',auth,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const sq=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),st=sq.rows[0]?.data||{classes:[],terms:[]};
 const allowed=req.user.role==='admin'?(st.classes||[]).map(x=>x.id):assignedClassIds(req.user,{classes:st.classes||[]});
 const classId=String(req.body?.classId||st.activeClassId||''),term=String(req.body?.term||st.term||''),pupilKey=String(req.body?.pupilKey||''),subjectId=String(req.body?.subjectId||''),value=req.body?.value;
 if(!classId||!allowed.includes(classId)||!st.classes?.some(x=>x.id===classId)||!st.terms?.includes(term)||!pupilKey||!subjectId)return res.status(400).json({error:'invalid_mark'});
 if(req.user.role!=='admin'&&!new Set(req.user.permissions||[]).has('grades'))return res.status(403).json({error:'forbidden'});if(req.user.role==='teacher'&&!subjectAllowed(req.user,classId,subjectId))return res.status(403).json({error:'subject_forbidden'});
 const [pq,sjq]=await Promise.all([
  pool.query('SELECT 1 FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 AND nns=$3',[req.user.schoolId,classId,pupilKey]),
  pool.query('SELECT data FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 AND subject_id=$3',[req.user.schoolId,classId,subjectId])
 ]);
 if(!pq.rowCount||!sjq.rowCount)return res.status(404).json({error:'mark_target_not_found'});
 const checked=validateStoredMark(value,sjq.rows[0]?.data);
 if(!checked.ok)return res.status(422).json({error:checked.error,max:checked.max,value:checked.value,subjectId,pupilKey});
 const v=checked.value;
 if(v==='')await pool.query('DELETE FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND term=$3 AND pupil_key=$4 AND subject_id=$5',[req.user.schoolId,classId,term,pupilKey,subjectId]);
 else await pool.query(`INSERT INTO nataiji_marks(school_id,class_id,term,pupil_key,subject_id,value,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,now())
 ON CONFLICT(school_id,class_id,term,pupil_key,subject_id)
 DO UPDATE SET value=EXCLUDED.value,updated_at=now()`,[req.user.schoolId,classId,term,pupilKey,subjectId,v]);
 await pool.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,classId,'marks-v1']);
 res.json({ok:true,classId,term,pupilKey,subjectId,value:v,savedAt:new Date().toISOString()});
});

app.put('/api/marks',auth,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});
 const sq=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),st=sq.rows[0]?.data||{classes:[],terms:[]};
 const ids=req.user.role==='admin'?(st.classes||[]).map(x=>x.id):assignedClassIds(req.user,{classes:st.classes||[]}),classId=String(req.body?.classId||st.activeClassId||''),term=String(req.body?.term||st.term||''),marks=Array.isArray(req.body?.marks)?req.body.marks:null;
 if(!classId||!ids.includes(classId)||!st.classes?.some(x=>x.id===classId)||!st.terms?.includes(term)||!marks)return res.status(400).json({error:'invalid_marks'});
 if(req.user.role!=='admin'&&!new Set(req.user.permissions||[]).has('grades'))return res.status(403).json({error:'forbidden'});
 const pupils=(await pool.query('SELECT nns FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId])).rows;
 const allSubjects=(await pool.query('SELECT subject_id,data FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,classId])).rows;
 let visibleSubjects=allSubjects,editableIndexes=allSubjects.map((_,i)=>i);
 if(req.user.role==='teacher'){
  const scope=subjectScopeFor(req.user,classId);if(!scope)return res.status(403).json({error:'forbidden_class'});
  const hidden=new Set((scope.hiddenSubjectIds||[]).map(String));
  visibleSubjects=allSubjects.filter(x=>!hidden.has(String(x.subject_id)));
  const editableIds=scope.fullClass||scope.allSubjects===true?null:new Set((scope.subjectIds||[]).map(String));
  editableIndexes=visibleSubjects.map((x,i)=>editableIds===null||editableIds.has(String(x.subject_id))?i:-1).filter(i=>i>=0);
 }
 const normalizedMarks=marks.map(row=>Array.isArray(row)?row.slice():[]);
 for(let i=0;i<pupils.length;i++)for(const j of editableIndexes){const checked=validateStoredMark(marks?.[i]?.[j],visibleSubjects[j]?.data);if(!checked.ok)return res.status(422).json({error:checked.error,max:checked.max,value:checked.value,pupilIndex:i,subjectIndex:j,subjectId:String(visibleSubjects[j]?.subject_id||'')});normalizedMarks[i]=normalizedMarks[i]||[];normalizedMarks[i][j]=checked.value}
 const editableSubjects=editableIndexes.map(j=>visibleSubjects[j]);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  if(req.user.role==='teacher'){
   const allowedIds=editableSubjects.map(x=>String(x.subject_id));
   if(allowedIds.length)await client.query('DELETE FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND term=$3 AND subject_id=ANY($4::text[])',[req.user.schoolId,classId,term,allowedIds]);
  }else await client.query('DELETE FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND term=$3',[req.user.schoolId,classId,term]);
  for(let i=0;i<pupils.length;i++)for(const j of editableIndexes){const v=normalizedMarks?.[i]?.[j],sub=visibleSubjects[j];if(v===''||v==null||!sub)continue;await client.query(`INSERT INTO nataiji_marks(school_id,class_id,term,pupil_key,subject_id,value,updated_at)
   VALUES($1,$2,$3,$4,$5,$6,now())
   ON CONFLICT(school_id,class_id,term,pupil_key,subject_id)
   DO UPDATE SET value=EXCLUDED.value,updated_at=now()`,[req.user.schoolId,classId,term,pupils[i].nns,sub.subject_id,String(v)])}
  await client.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,classId,'marks-v1']);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 const matrix=pupils.map(()=>visibleSubjects.map(()=>''));
 const mq=await pool.query('SELECT pupil_key,subject_id,value FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND term=$3',[req.user.schoolId,classId,term]),pm=new Map(pupils.map((x,i)=>[x.nns,i])),sm=new Map(visibleSubjects.map((x,j)=>[String(x.subject_id),j]));
 for(const row of mq.rows){const i=pm.get(row.pupil_key),j=sm.get(String(row.subject_id));if(i!==undefined&&j!==undefined)matrix[i][j]=row.value}
 res.json({ok:true,classId,term,marks:matrix,savedAt:new Date().toISOString()});
});

app.get('/api/state',auth,async(req,res)=>{const raw=await storeGet(schoolKey(req.user.schoolId)),legacyRaw=raw?JSON.parse(raw):null;let full=legacyRaw?ensureSchoolModel(legacyRaw):(pool?newSchoolState(req.user.name||''):null);if(!full)return res.status(404).json({error:'school_state_not_found'});if(pool){const st=await repairStructureIfNeeded(req.user.schoolId,legacyRaw);full.classes=structuredClone(st.classes||[]);full.terms=structuredClone(st.terms||[]);full.activeClassId=full.classes.some(x=>x.id===st.activeClassId)?st.activeClassId:(full.classes[0]?.id||'');full.term=full.terms.includes(st.term)?st.term:(full.terms[0]||'');full.classData=full.classData&&typeof full.classData==='object'?full.classData:{};for(const cls of full.classes){if(!full.classData[cls.id]&&legacyRaw?.classData?.[cls.id])full.classData[cls.id]=structuredClone(legacyRaw.classData[cls.id]);if(!full.classData[cls.id]&&cls.id===String(legacyRaw?.activeClassId||'')&&(Array.isArray(legacyRaw?.pupils)||Array.isArray(legacyRaw?.subjects))){const mb=legacyRaw?.marksByTerm&&typeof legacyRaw.marksByTerm==='object'?structuredClone(legacyRaw.marksByTerm):{};if(legacyRaw?.term&&Array.isArray(legacyRaw?.marks))mb[legacyRaw.term]=structuredClone(legacyRaw.marks);full.classData[cls.id]={pupils:structuredClone(legacyRaw?.pupils||[]),subjects:structuredClone(legacyRaw?.subjects||[]),marksByTerm:mb}}full.classData[cls.id]=full.classData[cls.id]||{pupils:[],subjects:[],marksByTerm:{}}}let sRow=await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[req.user.schoolId]);if(!sRow.rowCount){const seed={school:full.school||'',schoolFr:full.schoolFr||'',region:full.region||'',regionFr:full.regionFr||'',inspection:full.inspection||'',inspectionFr:full.inspectionFr||'',year:full.year||''};await pool.query('INSERT INTO nataiji_school_settings(school_id,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[req.user.schoolId,JSON.stringify(seed)]);sRow=await pool.query('SELECT data FROM nataiji_school_settings WHERE school_id=$1',[req.user.schoolId])}Object.assign(full,sRow.rows[0]?.data||{});if(full.onboardingComplete!==true&&((full.classes||[]).length>0||(await pool.query('SELECT 1 FROM nataiji_pupils WHERE school_id=$1 LIMIT 1',[req.user.schoolId])).rowCount>0)){full.onboardingComplete=true;const repaired={...(sRow.rows[0]?.data||{}),onboardingComplete:true};await pool.query('INSERT INTO nataiji_school_settings(school_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(school_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[req.user.schoolId,JSON.stringify(repaired)])}for(const cls of full.classes){const d=full.classData[cls.id]||(full.classData[cls.id]={pupils:[],subjects:[],marksByTerm:{}});const sm=await pool.query('SELECT 1 FROM nataiji_migrations WHERE school_id=$1 AND class_id=$2 AND resource=$3',[req.user.schoolId,cls.id,'subjects']);if(!sm.rowCount){const count=await pool.query('SELECT count(*)::int AS n FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,cls.id]);if(count.rows[0].n===0&&Array.isArray(d.subjects)&&d.subjects.length){const client=await pool.connect();try{await client.query('BEGIN');for(let i=0;i<d.subjects.length;i++){const s=d.subjects[i],id=crypto.createHash('sha256').update(String(i)+'|'+String(s[0])).digest('hex').slice(0,24);await client.query('INSERT INTO nataiji_subjects(school_id,class_id,subject_id,data,position) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING',[req.user.schoolId,cls.id,id,JSON.stringify(s),i])}await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}await pool.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,cls.id,'subjects'])}const sub=await pool.query('SELECT data FROM nataiji_subjects WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,cls.id]);d.subjects=sub.rows.map(x=>x.data);const pm=await pool.query('SELECT 1 FROM nataiji_migrations WHERE school_id=$1 AND class_id=$2 AND resource=$3',[req.user.schoolId,cls.id,'pupils']);if(!pm.rowCount){const count=await pool.query('SELECT count(*)::int AS n FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2',[req.user.schoolId,cls.id]);if(count.rows[0].n===0&&Array.isArray(d.pupils)&&d.pupils.length){const client=await pool.connect();try{await client.query('BEGIN');for(let i=0;i<d.pupils.length;i++){const p=structuredClone(d.pupils[i]),key=String(p[0]||'').trim()||('auto-'+crypto.randomUUID());p[7]=key;await client.query('INSERT INTO nataiji_pupils(school_id,class_id,nns,data,position) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING',[req.user.schoolId,cls.id,key,JSON.stringify(p),i])}await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}await pool.query('INSERT INTO nataiji_migrations(school_id,class_id,resource) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.user.schoolId,cls.id,'pupils'])}const pq=await pool.query('SELECT nns,data FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at',[req.user.schoolId,cls.id]);d.pupils=pupilRows(pq.rows);d.marksByTerm=d.marksByTerm&&typeof d.marksByTerm==='object'?d.marksByTerm:{};for(const term of full.terms){if(!Array.isArray(d.marksByTerm[term]))d.marksByTerm[term]=d.pupils.map(()=>d.subjects.map(()=>''))}}if(req.user.role==='admin'){const requestedClass=String(req.query.classId||''),requestedTerm=String(req.query.term||'');if(requestedClass&&full.classes.some(x=>String(x.id)===requestedClass))full.activeClassId=requestedClass;if(requestedTerm&&full.terms.includes(requestedTerm))full.term=requestedTerm}
const active=full.classes.find(x=>x.id===full.activeClassId),d=full.activeClassId?full.classData[full.activeClassId]:null;full.className=active?.name||'';full.classNameFr=active?.nameFr||'';full.classCode=active?.code||'';full.pupils=structuredClone(d?.pupils||[]);full.subjects=structuredClone(d?.subjects||[]);full.marksByTerm=structuredClone(d?.marksByTerm||{});full.marks=structuredClone((full.term&&d?.marksByTerm?.[full.term])||[]);await overlayCanonicalMarks(full,req.user.schoolId);if(!raw)await storeSet(schoolKey(req.user.schoolId),JSON.stringify(full))}res.json({state:req.user.role==='admin'?full:teacherView(full,req.user,req.query.classId,req.query.term),user:req.user})});
app.post('/api/active-selection',auth,async(req,res)=>{
 if(!pool)return res.status(503).json({error:'durable_storage_required'});
 try{
  const classId=String(req.body?.classId||''),term=String(req.body?.term||''),q=await pool.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[req.user.schoolId]),st=q.rows[0]?.data;
  if(!st)return res.status(404).json({error:'structure_not_found'});
  if(term&&!st.terms?.includes(term))return res.status(400).json({error:'invalid_term'});
  if(req.user.role==='teacher'){
   const allowed=assignedClassIds(req.user,{classes:st.classes||[]});
   if(classId&&!allowed.includes(classId))return res.status(400).json({error:'invalid_class'});
   const raw=await storeGet(userKey(req.user.id));if(!raw)return res.status(404).json({error:'account_not_found'});
   const u=JSON.parse(raw);u.workspaceSelections=u.workspaceSelections&&typeof u.workspaceSelections==='object'?u.workspaceSelections:{};
   const key=workspaceSelectionKey(u),prev=u.workspaceSelections[key]||{},nextClass=classId||String(prev.classId||req.user.preferredClassId||allowed[0]||''),nextTerm=term||String(prev.term||req.user.preferredTerm||st.term||st.terms?.[0]||'');
   if(nextClass&&!allowed.includes(nextClass))return res.status(400).json({error:'invalid_class'});
   u.workspaceSelections[key]={classId:nextClass,term:nextTerm};await storeSet(userKey(u.id),JSON.stringify(u));
   return res.json({ok:true,activeClassId:nextClass,term:nextTerm,user:safeUser(u)})
  }
  if(classId&&!st.classes?.some(x=>x.id===classId))return res.status(400).json({error:'invalid_class'});
  if(classId)st.activeClassId=classId;if(term)st.term=term;
  await pool.query('UPDATE nataiji_structure SET data=$2::jsonb,updated_at=now() WHERE school_id=$1',[req.user.schoolId,JSON.stringify(st)]);
  const raw=await storeGet(schoolKey(req.user.schoolId));if(raw){const legacy=ensureSchoolModel(JSON.parse(raw));if(classId)legacy.activeClassId=classId;if(term)legacy.term=term;await storeSet(schoolKey(req.user.schoolId),JSON.stringify(legacy))}
  res.json({ok:true,activeClassId:st.activeClassId,term:st.term})
 }catch(e){console.error('POST /api/active-selection failed',req.user?.schoolId,e);res.status(500).json({error:'selection_save_failed'})}
});

app.get('/api/persistence-check',auth,async(req,res)=>{const raw=await storeGet(schoolKey(req.user.schoolId));if(!raw)return res.json({ok:false,storage,reason:'school_not_found'});const s=ensureSchoolModel(JSON.parse(raw)),d=s.classData[s.activeClassId];res.json({ok:storage==='postgres'||storage==='redis',storage,schoolId:req.user.schoolId,revision:s.saveRevision||null,savedAt:s.savedAt||null,activeClassId:s.activeClassId,pupils:d?.pupils?.length||0,subjects:d?.subjects?.length||0})});
app.put('/api/state',auth,async(req,res)=>{const incoming=req.body?.state;if(!incoming||typeof incoming!=='object')return res.status(400).json({error:'invalid_state'});const key=schoolKey(req.user.schoolId);if(req.user.role==='admin'){const saved=canonicalIncoming(incoming);if(pool){const currentRaw=await storeGet(key),current=currentRaw?ensureSchoolModel(JSON.parse(currentRaw)):null;if(current){for(const cls of saved.classes){if(current.classData[cls.id]){saved.classData[cls.id].pupils=structuredClone(current.classData[cls.id].pupils||[]);saved.classData[cls.id].subjects=structuredClone(current.classData[cls.id].subjects||[])}}const d=saved.classData[saved.activeClassId];saved.pupils=structuredClone(d?.pupils||[]);saved.subjects=structuredClone(d?.subjects||[])}}saved.saveRevision=crypto.randomUUID();saved.savedAt=new Date().toISOString();await storeSet(key,JSON.stringify(saved));const verifyRaw=await storeGet(key);if(!verifyRaw)return res.status(500).json({error:'save_verification_failed'});const verified=JSON.parse(verifyRaw);if(verified.saveRevision!==saved.saveRevision)return res.status(409).json({error:'save_conflict'});return res.json({ok:true,savedAt:verified.savedAt,revision:verified.saveRevision,state:verified})}const oldRaw=await storeGet(key);if(!oldRaw)return res.status(404).json({error:'school_not_found'});const full=ensureSchoolModel(JSON.parse(oldRaw)),ids=assignedClassIds(req.user,full),requested=String(incoming.activeClassId||''),id=ids.includes(requested)?requested:ids[0];if(!id)return res.status(403).json({error:'class_assignment_required'});const term=full.terms.includes(incoming.term)?incoming.term:full.term,perms=new Set(req.user.permissions||[]);if(pool){await overlayCanonicalMarks(full,req.user.schoolId);const view=teacherView(full,req.user,id,term);return res.json({ok:true,savedAt:full.savedAt||null,revision:full.saveRevision||null,state:view})}if(!perms.has('grades')&&!perms.has('pupils'))return res.status(403).json({error:'read_only'});const d=full.classData[id];if(perms.has('grades')){const candidate=incoming.marksByTerm?.[term]??incoming.marks;if(Array.isArray(candidate))d.marksByTerm[term]=structuredClone(candidate)}if(perms.has('pupils')&&Array.isArray(incoming.pupils))d.pupils=structuredClone(incoming.pupils);full.classData[id]=d;full.saveRevision=crypto.randomUUID();full.savedAt=new Date().toISOString();await storeSet(key,JSON.stringify(full));const verified=JSON.parse(await storeGet(key));const view=teacherView(verified,req.user,id,term);res.json({ok:true,savedAt:verified.savedAt,revision:verified.saveRevision,state:view})});


app.use('/api',(_req,res)=>res.status(404).json({error:'not_found'}));
app.use(staticDelivery(path.join(__dirname,'../public')));
app.use((req,res,next)=>{if(req.method==='GET'&&(req.path==='/'||req.path.endsWith('.html')||req.path==='/sw.js'))res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');next()});app.use(express.static(path.join(__dirname,'../public')));app.use((req,res)=>{if(!['GET','HEAD'].includes(req.method)||path.extname(req.path))return res.status(404).end();res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');res.sendFile(path.join(__dirname,'../public/index.html'))});
app.use((err,req,res,_next)=>{const requestId=crypto.randomUUID();console.error('Unhandled request error',{requestId,method:req.method,path:req.path,error:err?.message||String(err),code:err?.code});if(res.headersSent)return _next(err);if(err?.type==='entity.parse.failed')return res.status(400).json({error:'invalid_json'});if(err?.type==='entity.too.large')return res.status(413).json({error:'request_too_large'});res.status(500).json({error:'internal_server_error',requestId})});
const port=process.env.PORT||3000;await initStore();if(process.env.NODE_ENV==='production'&&storage==='memory')throw new Error('Production requires persistent storage');await reconcileConfiguredOwner();app.listen(port,()=>console.log(`Nataiji running on ${port} with ${storage}${pool&&redis?' (Redis migration fallback enabled)':''}`));
