import { chromium } from 'playwright';

const base=process.env.NATAIJI_TEST_URL||'http://127.0.0.1:3222';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ar'});
const page=await context.newPage();
const failures=[];
const check=(name,ok,detail='')=>{console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?' — '+detail:''}`);if(!ok)failures.push(name+(detail?': '+detail:''))};

async function registerProfessor(name,email){
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('[data-auth2="register"]').waitFor({state:'visible',timeout:10000});
 await page.locator('[data-auth2="register"]').click();
 await page.locator('#auth2Form input[name="name"]').fill(name);
 await page.locator('#auth2Form input[name="email"]').fill(email);
 await page.locator('#auth2Form input[name="password"]').fill('ProfessorQA-9021');
 await page.locator('#auth2Form .auth-submit').click();
 await page.locator('[data-profile-type="professor"]').waitFor({state:'visible',timeout:12000});
 await page.locator('[data-profile-type="professor"]').click();
 await page.locator('#profAddSubject').waitFor({state:'visible',timeout:12000});
}
async function logout(){
 await page.locator('#profLogout').click();
 await page.locator('[data-auth2="login"]').waitFor({state:'visible',timeout:10000});
}
try{
 await registerProfessor('Professor One','professor.one@example.com');
 check('professor dashboard replaces legacy shell',await page.locator('#nataijiProfessorRoot .prof-v2-hero').count()===1 && await page.locator('.app-shell:visible').count()===0);
 check('professor navigation matches teacher mental model',await page.locator('[data-prof-nav]').count()===5 && await page.locator('[data-prof-nav="grades"]').count()===1 && await page.locator('[data-prof-nav="students"]').count()===1 && await page.locator('[data-prof-nav="reports"]').count()===1 && await page.locator('[data-prof-nav="more"]').count()===1);

 await page.locator('#profAddSubject').click();
 const levelOptions=await page.locator('#pv2Level option').allTextContents();
 check('only current first-cycle levels are offered',levelOptions.some(x=>x.includes('1AS'))&&levelOptions.some(x=>x.includes('2AS'))&&levelOptions.some(x=>x.includes('3AS'))&&!levelOptions.some(x=>/4AS|5AS/.test(x)),levelOptions.join(' | '));
 await page.locator('#pv2Level').selectOption('2AS');
 await page.locator('#pv2Subject').selectOption('math');
 check('official math coefficient loads automatically',await page.locator('#pv2Coefficient').inputValue()==='6'&&await page.locator('#pv2Coefficient').getAttribute('readonly')!==null);
 await page.locator('#pv2NewClass').fill('2AS-A');
 await page.locator('#pv2SaveAssignment').click();
 await page.locator('.prof-v2-assignment').waitFor({state:'visible',timeout:8000});
 const firstAssignmentText=await page.locator('.prof-v2-assignment').innerText();
 check('professor can create own subject and class',firstAssignmentText.includes('الرياضيات'));
 check('official subject coefficient is shown on dashboard',/معامل\s*×6|Coef\.\s*×6/.test(firstAssignmentText),firstAssignmentText);

 await page.locator('#profAllClasses').click();
 await page.locator('[data-manage-class]').first().click();
 await page.locator('#pv2AddStudent').click();
 check('professor add-student opens dedicated bilingual sheet',await page.locator('.prof-student-modal').count()===1&&(await page.locator('.prof-student-modal h2').innerText()).includes('Ajouter un élève')&&(await page.locator('.prof-student-modal h2').innerText()).includes('إضافة تلميذ'));
 await page.locator('#pv2StudentName').fill('محمد سالم');
 check('French student name is suggested automatically',(await page.locator('#pv2StudentNameFr').inputValue()).trim()==='Mohamed Salem');
 await page.locator('#pv2StudentNameFr').fill('Mohamed Salem Manuel');
 await page.locator('#pv2StudentName').fill('محمد سالم ولد');
 check('manual French student name is locked against later Arabic edits',(await page.locator('#pv2StudentNameFr').inputValue()).trim()==='Mohamed Salem Manuel');
 await page.locator('#pv2StudentName').fill('محمد سالم');
 await page.locator('#pv2StudentNameFr').fill('Mohamed Salem');
 await page.locator('#pv2StudentNns').fill('NNS-001');
 check('student call number is assigned automatically',await page.locator('#pv2StudentCall').inputValue()==='1');
 await page.locator('#pv2StudentSex').selectOption('female');
 await page.locator('#pv2StudentBirthDate').fill('2010-05-03');
 await page.locator('#pv2StudentSave').click();
 await page.locator('.prof-student-row').waitFor({state:'visible',timeout:8000});
 check('class student is saved',await page.locator('.prof-student-row').count()===1);
 const savedStudent=await page.evaluate(async()=>{const r=await fetch('/api/professor/profile');const j=await r.json();return j.profile?.classes?.[0]?.students?.[0]||null});
 check('extended professor student fields persist on server',savedStudent?.nameFr==='Mohamed Salem'&&savedStudent?.nns==='NNS-001'&&savedStudent?.callNumber===1&&savedStudent?.sex==='female'&&savedStudent?.birthDate==='2010-05-03',JSON.stringify(savedStudent));

 // One professor can own multiple subjects in the same class without duplicating the roster.
 await page.locator('#pv2AddClassSubject').click();
 await page.locator('#pv2Subject').selectOption('french');
 check('second subject in same class gets official coefficient',await page.locator('#pv2Coefficient').inputValue()==='4'&&await page.locator('#pv2Coefficient').getAttribute('readonly')!==null);
 await page.locator('#pv2SaveAssignment').click();
 await page.locator('[data-class-grade]').nth(1).waitFor({state:'visible',timeout:8000});
 check('same professor can own two subjects in one class',await page.locator('[data-class-grade]').count()===2);
 check('same class keeps one shared roster for both own subjects',await page.locator('.prof-student-row').count()===1);
 await page.locator('[data-class-grade]').filter({hasText:'اللغة الفرنسية'}).click();
 check('grade screen exposes direct switch between same-class subjects',await page.locator('[data-switch-subject]').count()===2);
 let frenchTests=page.locator('[data-test-index]');
 for(let i=0;i<3;i++)await frenchTests.nth(i).fill('15');
 await page.locator('[data-exam]').fill('15');
 await page.locator('#pv2SaveGrades').click();
 await page.locator('[data-prof-term="2"]').click();
 frenchTests=page.locator('[data-test-index]');for(let i=0;i<3;i++)await frenchTests.nth(i).fill('15');
 await page.locator('[data-exam]').fill('15');await page.locator('#pv2SaveGrades').click();
 await page.locator('[data-prof-term="3"]').click();
 frenchTests=page.locator('[data-test-index]');for(let i=0;i<3;i++)await frenchTests.nth(i).fill('15');
 await page.locator('[data-exam]').fill('15');await page.locator('#pv2SaveGrades').click();
 check('second own subject keeps independent trimester marks',(await page.locator('[data-avg]').first().innerText()).trim()==='15.00');
 check('annual subject average appears only in trimester 3',(await page.locator('[data-annual]').first().innerText()).trim()==='15.00');
 check('trimester 3 individual list includes annual subject column',await page.locator('#pv2OwnSubjectList').count()===1);
 // Individual mode has a subject list but no collective student bulletin.
 await page.locator('#pv2OwnSubjectList').click();
 check('individual professor has bilingual subject list',await page.locator('.professor-own-list-table').count()===1&&(await page.locator('.prof-own-list-preview').innerText()).includes('Interrogation 1'));
 check('trimester 3 subject list uses annual-average wording only there',(await page.locator('.prof-own-list-preview').innerText()).includes('Moyenne générale de la matière')&&(await page.locator('.prof-own-list-preview').innerText()).includes('المعدل العام للمادة'));
 await page.locator('.professor-x').click();
 const unsharedCollective=await page.evaluate(async()=>{const p=await fetch('/api/professor/profile');const j=await p.json();const id=j.profile.classes[0].id;const r=await fetch('/api/professor/classes/'+encodeURIComponent(id)+'/results?term=1');return{status:r.status,body:await r.json()}});
 check('individual professor cannot open collective student bulletins before sharing',unsharedCollective.status===409&&unsharedCollective.body?.error==='collective_mode_required',JSON.stringify(unsharedCollective));
 await page.locator('#pv2BackGrade').click();

 await page.locator('#pv2ShareClass').click();
 await page.locator('.prof-class-code').waitFor({state:'visible',timeout:8000});
 const code=(await page.locator('.prof-class-code').innerText()).trim();
 check('shared class code has expected format',/^CL-[A-F0-9]{8}$/.test(code),code);
 await page.locator('.professor-x').click();

 await page.locator('[data-class-grade]').filter({hasText:'الرياضيات'}).click();
 let gradeTests=page.locator('[data-test-index]');
 for(const [i,v] of ['10','11','12'].entries())await gradeTests.nth(i).fill(v);
 await page.locator('[data-exam]').fill('13');await page.locator('#pv2SaveGrades').click();
 check('first professor math trimester 1 uses three tests plus exam',(await page.locator('[data-avg]').first().innerText()).trim()==='12.00');
 await page.locator('[data-prof-term="2"]').click();
 gradeTests=page.locator('[data-test-index]');for(const [i,v] of ['14','15','16'].entries())await gradeTests.nth(i).fill(v);
 await page.locator('[data-exam]').fill('17');await page.locator('#pv2SaveGrades').click();
 check('math trimester 2 is independent from trimester 1',(await page.locator('[data-avg]').first().innerText()).trim()==='16.00');
 await page.locator('[data-prof-term="3"]').click();
 gradeTests=page.locator('[data-test-index]');for(const [i,v] of ['16','17','18'].entries())await gradeTests.nth(i).fill(v);
 await page.locator('[data-exam]').fill('19');await page.locator('#pv2SaveGrades').click();
 check('math trimester 3 uses its own three tests and exam',(await page.locator('[data-avg]').first().innerText()).trim()==='18.00');
 check('math annual subject average appears in trimester 3',(await page.locator('[data-annual]').first().innerText()).trim()==='16.33');
 await page.locator('#pv2BackGrade').click();

 await logout();
 await page.locator('[data-auth2="register"]').click();
 await page.locator('#auth2Form input[name="name"]').fill('Professor Two');
 await page.locator('#auth2Form input[name="email"]').fill('professor.two@example.com');
 await page.locator('#auth2Form input[name="password"]').fill('ProfessorQA-9021');
 await page.locator('#auth2Form .auth-submit').click();
 await page.locator('[data-profile-type="professor"]').waitFor({state:'visible',timeout:12000});
 await page.locator('[data-profile-type="professor"]').click();
 await page.locator('#profJoinClass').waitFor({state:'visible',timeout:12000});

 await page.locator('#profJoinClass').click();
 await page.locator('#pv2JoinCode').fill(code);
 await page.locator('#pv2JoinNow').click();
 await page.locator('.prof-class-card').waitFor({state:'visible',timeout:10000});
 const cardText=await page.locator('.prof-class-card').first().innerText();
 check('second professor joins same class',cardText.includes('2AS-A') && /2\s+أساتذة|2\s+professeurs/.test(cardText),cardText);

 await page.locator('[data-manage-class]').first().click();
 check('shared roster is visible to second professor',await page.locator('.prof-student-row').count()===1,await page.locator('.prof-student-row').first().innerText());
 const joinedStudent=await page.evaluate(async()=>{const r=await fetch('/api/professor/profile');const j=await r.json();return j.profile?.classes?.[0]?.students?.[0]||null});
 check('shared roster preserves French name and student metadata',joinedStudent?.nameFr==='Mohamed Salem'&&joinedStudent?.callNumber===1&&joinedStudent?.sex==='female'&&joinedStudent?.birthDate==='2010-05-03',JSON.stringify(joinedStudent));

 check('linked professor cannot edit the shared roster from UI',await page.locator('#pv2AddStudent').count()===0&&await page.locator('[data-remove-student]').count()===0);
 const rosterGuard=await page.evaluate(async()=>{
  const get=await fetch('/api/professor/profile',{headers:{Accept:'application/json'}}),data=await get.json(),shared=data.profile.classes.find(c=>c.sharedClassId);
  shared.students.push({id:'member-must-not-add',name:'Should Not Persist',nns:'BLOCKED'});
  const put=await fetch('/api/professor/profile',{method:'PUT',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({profile:data.profile})});
  const body=await put.json();
  const saved=body.profile.classes.find(c=>c.sharedClassId);
  return{status:put.status,count:saved.students.length,blocked:!saved.students.some(s=>s.id==='member-must-not-add')}
 });
 check('server keeps shared roster under code creator control',rosterGuard.status===200&&rosterGuard.count===1&&rosterGuard.blocked,JSON.stringify(rosterGuard));

 await page.locator('#pv2AddClassSubject').click();
 await page.locator('#pv2Subject').selectOption('math');
 await page.locator('#pv2SaveAssignment').click();
 await page.waitForTimeout(250);
 check('second professor cannot claim a subject already owned in shared class',(await page.locator('.professor-msg').innerText()).includes('مسجلة بالفعل')||(await page.locator('.professor-msg').innerText()).includes('appartient déjà'));
 await page.locator('#pv2Subject').selectOption('physical_sciences');
 check('physical sciences coefficient is official and automatic',await page.locator('#pv2Coefficient').inputValue()==='1'&&await page.locator('#pv2Coefficient').getAttribute('readonly')!==null);
 await page.locator('#pv2SaveAssignment').click();
 await page.locator('[data-class-grade]').waitFor({state:'visible',timeout:8000});
 check('second professor can add private subject to shared class',(await page.locator('[data-class-grade]').innerText()).includes('العلوم الفيزيائية'));

 await page.locator('[data-class-grade]').click();
 let physicsTests=page.locator('[data-test-index]');
 for(let i=0;i<3;i++)await physicsTests.nth(i).fill('14');
 await page.locator('[data-exam]').fill('18');
 check('three tests and exam compute trimester average',(await page.locator('[data-avg]').first().innerText()).trim()==='16.00');
 await page.locator('#pv2SaveGrades').click();
 await page.locator('[data-prof-term="2"]').click();
 physicsTests=page.locator('[data-test-index]');for(let i=0;i<3;i++)await physicsTests.nth(i).fill('12');
 await page.locator('[data-exam]').fill('16');await page.locator('#pv2SaveGrades').click();
 check('second professor trimester 2 is independent',(await page.locator('[data-avg]').first().innerText()).trim()==='14.00');
 await page.locator('[data-prof-term="3"]').click();
 physicsTests=page.locator('[data-test-index]');for(let i=0;i<3;i++)await physicsTests.nth(i).fill('13');
 await page.locator('[data-exam]').fill('17');await page.locator('#pv2SaveGrades').click();
 check('second professor trimester 3 is independent',(await page.locator('[data-avg]').first().innerText()).trim()==='15.00');
 check('second professor annual subject average is available only in trimester 3',(await page.locator('[data-annual]').first().innerText()).trim()==='14.83');
 await page.locator('[data-prof-nav="reports"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 const autosavedResults=await page.locator('#pv2ResultsBody').innerText();
 check('leaving grade page auto-saves professor grades',autosavedResults.includes('13.45'),autosavedResults);
 check('partial curriculum is clearly marked provisional',autosavedResults.includes('11 / 28')&&/مؤقت|provisoire/i.test(autosavedResults),autosavedResults);
 await page.locator('[data-results-term="3"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 const term3Results=await page.locator('#pv2ResultsBody').innerText();
 check('shared term 3 result combines both professors',term3Results.includes('15.71'),term3Results);

 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#profAddSubject').waitFor({state:'visible',timeout:12000});
 await page.locator('#profAllClasses').click();
 await page.locator('[data-manage-class]').first().click();
 await page.locator('[data-class-grade]').click();
 check('professor grades persist after reload',(await page.locator('[data-avg]').first().innerText()).trim()==='16.00');
 check('official coefficient persists after reload',(await page.locator('[data-avg]').first().innerText()).trim()==='16.00');
 await page.locator('[data-prof-term="3"]').click();
 await page.locator('[data-test-index="0"]').waitFor({state:'visible',timeout:8000});
 check('term 3 professor grades persist after reload',(await page.locator('[data-avg]').first().innerText()).trim()==='15.00');

 await page.locator('[data-prof-nav="reports"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 const resultsText=await page.locator('#pv2ResultsBody').innerText();
 check('shared results include subjects from both professors',resultsText.includes('الرياضيات')&&resultsText.includes('اللغة الفرنسية')&&resultsText.includes('العلوم الفيزيائية'),resultsText);
 const orderedSubjects=await page.locator('#pv2ResultsBody .prof-result-subject').allTextContents();
 check('collective report subjects follow curriculum order',JSON.stringify(orderedSubjects.slice(0,3))===JSON.stringify(['الرياضيات','اللغة الفرنسية','العلوم الفيزيائية']),JSON.stringify(orderedSubjects));
 check('shared general average uses subject coefficients',resultsText.includes('13.45'),resultsText);
 check('report exposes official coefficient coverage',resultsText.includes('11 / 28'),resultsText);
 check('shared results expose one student bulletin button',await page.locator('[data-bulletin]').count()===1);
 await page.locator('[data-bulletin]').click();
 const bulletinPreview=await page.locator('.prof-bulletin-preview').innerText();
 check('student bulletin contains all shared subjects',bulletinPreview.includes('الرياضيات')&&bulletinPreview.includes('اللغة الفرنسية')&&bulletinPreview.includes('العلوم الفيزيائية'));
 check('student bulletin preview is bilingual independent of Arabic UI',bulletinPreview.includes('Mathématiques')&&bulletinPreview.includes('Français')&&bulletinPreview.includes('Sciences physiques')&&bulletinPreview.includes('محمد سالم')&&bulletinPreview.includes('Mohamed Salem'),bulletinPreview);
 const studentPopupPromise=page.waitForEvent('popup');
 await page.locator('#pv2PrintStudent').click();
 const studentPrint=await studentPopupPromise;
 await studentPrint.waitForLoadState('domcontentloaded');
 const studentPrintText=await studentPrint.locator('body').innerText();
 check('printed student bulletin has bilingual Mauritanian official header',studentPrintText.includes('الجمهورية الإسلامية الموريتانية')&&studentPrintText.includes('République Islamique de Mauritanie')&&studentPrintText.includes('وزارة التربية وإصلاح النظام التعليمي')&&studentPrintText.includes('Ministère de l’Éducation et de la Réforme du Système Éducatif'),studentPrintText);
 check('printed student bulletin keeps Arabic and French subject/name labels together',studentPrintText.includes('الرياضيات')&&studentPrintText.includes('Mathématiques')&&studentPrintText.includes('محمد سالم')&&studentPrintText.includes('Mohamed Salem'),studentPrintText);
 check('printed student bulletin uses two copies on one A4 page',await studentPrint.locator('.student-copy').count()===2&&await studentPrint.locator('.official-head').count()===2&&await studentPrint.locator('.cut-line').count()===1);
 check('both printed student copies are the same student',await studentPrint.locator('.student-copy').nth(0).innerText()===await studentPrint.locator('.student-copy').nth(1).innerText());
 check('school-style footer has date, signatures and stamp zones in both copies',await studentPrint.locator('.school-signatures').count()===2&&await studentPrint.locator('.official-date-line').count()===2&&await studentPrint.locator('.stamp-zone').count()===2);
 const schoolGridStyle=await studentPrint.locator('.secondary-summary').first().evaluate(el=>({left:getComputedStyle(el).borderLeftStyle,bottom:getComputedStyle(el).borderBottomStyle,color:getComputedStyle(el).color}));
 check('student bulletin uses formal bordered school-record blocks',schoolGridStyle.left==='solid'&&schoolGridStyle.bottom==='solid',JSON.stringify(schoolGridStyle));
 await studentPrint.close();
 await page.locator('.professor-x').click();

 const classPopupPromise=page.waitForEvent('popup');
 await page.locator('#pv2PrintClass').click();
 const classPrint=await classPopupPromise;
 await classPrint.waitForLoadState('domcontentloaded');
 const classPrintText=await classPrint.locator('body').innerText();
 check('printed collective class list is bilingual',classPrintText.includes('اللائحة الجماعية للقسم')&&classPrintText.includes('Liste collective de la classe')&&classPrintText.includes('العلوم الفيزيائية')&&classPrintText.includes('Sciences physiques'),classPrintText);
 check('collective class list uses dedicated wider print layout',await classPrint.locator('main.class-list-doc').count()===1);
 check('collective class list keeps formal signature/date/stamp footer',await classPrint.locator('.school-signatures').count()===1&&await classPrint.locator('.official-date-line').count()===1&&await classPrint.locator('.stamp-zone').count()===1);
 check('class list switches to landscape at six subjects',await page.evaluate(()=>window.NataijiProfessor?._classListLandscape?.(5)===false&&window.NataijiProfessor?._classListLandscape?.(6)===true));
 await classPrint.close();

 // Secondary-school bulletin structure stays trimester-aware.
 await page.locator('[data-results-term="1"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 await page.locator('[data-bulletin]').click();
 check('first trimester collective bulletin has three test columns',await page.locator('.secondary-bulletin-table[data-term="1"] thead tr:nth-child(2) th').count()===3);
 await page.locator('.professor-x').click();
 await page.locator('[data-results-term="2"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 await page.locator('[data-bulletin]').click();
 const term2Bulletin=await page.locator('.prof-bulletin-preview').innerText();
 check('second trimester collective bulletin still has exactly three test columns',await page.locator('.secondary-bulletin-table[data-term="2"] thead tr:nth-child(2) th').count()===3);
 check('second trimester bulletin shows bilingual tests and composition',term2Bulletin.includes('الاختبارات')&&term2Bulletin.includes('Interrogations')&&term2Bulletin.includes('امتحان الفصل')&&term2Bulletin.includes('Composition'),term2Bulletin);
 const physicsTerm2=await page.locator('.secondary-bulletin-table tbody tr').filter({hasText:'العلوم الفيزيائية'}).innerText();
 check('second trimester bulletin shows that trimester three tests and exam',physicsTerm2.includes('12')&&physicsTerm2.includes('16'),physicsTerm2);
 await page.locator('.professor-x').click();

 await page.locator('#profLang').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 const frenchResults=await page.locator('#pv2ResultsBody').innerText();
 check('French mode translates Arabic professor subject automatically',frenchResults.includes('Mathématiques'),frenchResults);
 check('French mode transliterates student names automatically',frenchResults.includes('Mohamed Salem'),frenchResults);
 const frenchMeta=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,htmlFr:document.documentElement.classList.contains('lang-fr')}));
 check('professor French mode applies LTR metadata consistently',frenchMeta.lang==='fr'&&frenchMeta.dir==='ltr'&&frenchMeta.htmlFr,JSON.stringify(frenchMeta));
 check('collective results body is fully localized in French',!/[\u0600-\u06ff]/u.test(frenchResults),frenchResults);
 check('language switch clearly offers Arabic from French mode',(await page.locator('#profLang').innerText()).trim()==='العربية');

 if(failures.length)throw new Error(failures.join('\n'));
 console.log('Professor v2 acceptance passed');
}finally{
 await browser.close();
}