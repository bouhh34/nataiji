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
 await page.locator('#pv2StudentName').fill('محمد سالم');
 await page.locator('#pv2StudentNns').fill('NNS-001');
 await page.locator('#pv2StudentSave').click();
 await page.locator('.prof-student-row').waitFor({state:'visible',timeout:8000});
 check('class student is saved',await page.locator('.prof-student-row').count()===1);

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
 let frenchInputs=page.locator('[data-kind]');
 await frenchInputs.nth(0).fill('15');
 await frenchInputs.nth(1).fill('15');
 await page.locator('#pv2SaveGrades').click();
 await page.locator('[data-prof-term="2"]').click();
 await page.locator('[data-kind="test2"]').fill('15');
 await page.locator('[data-kind="exam2"]').fill('15');
 await page.locator('#pv2SaveGrades').click();
 await page.locator('[data-prof-term="3"]').click();
 await page.locator('[data-kind="test3"]').fill('15');
 await page.locator('[data-kind="exam3"]').fill('15');
 await page.locator('#pv2SaveGrades').click();
 check('second own subject keeps independent marks',(await page.locator('[data-avg]').first().innerText()).trim()==='15.00');
 await page.locator('#pv2BackGrade').click();

 await page.locator('#pv2ShareClass').click();
 await page.locator('.prof-class-code').waitFor({state:'visible',timeout:8000});
 const code=(await page.locator('.prof-class-code').innerText()).trim();
 check('shared class code has expected format',/^CL-[A-F0-9]{8}$/.test(code),code);
 await page.locator('.professor-x').click();

 await page.locator('[data-class-grade]').filter({hasText:'الرياضيات'}).click();
 let gradeInputs=page.locator('[data-kind]');
 await gradeInputs.nth(0).fill('10');
 await gradeInputs.nth(1).fill('12');
 await page.locator('#pv2SaveGrades').click();
 await page.waitForTimeout(250);
 check('first professor math term 1 saved',(await page.locator('[data-avg]').first().innerText()).trim()==='11.00');
 await page.locator('[data-prof-term="2"]').click();
 await page.locator('[data-kind="test2"]').waitFor({state:'visible',timeout:8000});
 await page.locator('[data-kind="test2"]').fill('14');
 await page.locator('[data-kind="exam2"]').fill('13');
 await page.locator('#pv2SaveGrades').click();
 await page.locator('[data-prof-term="3"]').click();
 await page.locator('[data-kind="test3"]').waitFor({state:'visible',timeout:8000});
 await page.locator('[data-kind="test3"]').fill('16');
 await page.locator('[data-kind="exam3"]').fill('15');
 await page.locator('#pv2SaveGrades').click();
 check('first professor math term 3 formula is correct',(await page.locator('[data-avg]').first().innerText()).trim()==='13.67');
 check('official math coefficient weights term 3 correctly',(await page.locator('[data-weighted]').first().innerText()).trim()==='82.00');
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
 const inputs=page.locator('[data-kind]');
 await inputs.nth(0).fill('14');
 await inputs.nth(1).fill('18');
 const total=(await page.locator('[data-total]').first().innerText()).trim();
 const avg=(await page.locator('[data-avg]').first().innerText()).trim();
 const weighted=(await page.locator('[data-weighted]').first().innerText()).trim();
 check('test and exam compute total and average',total==='32.00'&&avg==='16.00',JSON.stringify({total,avg}));
 check('official physical-sciences coefficient computes weighted points',weighted==='16.00',JSON.stringify({weighted}));
 await page.locator('[data-prof-term="2"]').click();
 await page.locator('[data-kind="test2"]').waitFor({state:'visible',timeout:8000});
 await page.locator('[data-kind="test2"]').fill('12');
 await page.locator('[data-kind="exam2"]').fill('16');
 await page.locator('#pv2SaveGrades').click();
 check('second professor term 2 cumulative formula is correct',(await page.locator('[data-avg]').first().innerText()).trim()==='15.20');
 await page.locator('[data-prof-term="3"]').click();
 await page.locator('[data-kind="test3"]').waitFor({state:'visible',timeout:8000});
 await page.locator('[data-kind="test3"]').fill('13');
 await page.locator('[data-kind="exam3"]').fill('17');
 await page.locator('#pv2SaveGrades').click();
 check('second professor term 3 cumulative formula is correct',(await page.locator('[data-avg]').first().innerText()).trim()==='15.56');
 await page.locator('[data-prof-nav="reports"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 const autosavedResults=await page.locator('#pv2ResultsBody').innerText();
 check('leaving grade page auto-saves professor grades',autosavedResults.includes('12.91'),autosavedResults);
 check('partial curriculum is clearly marked provisional',autosavedResults.includes('11 / 28')&&/مؤقت|provisoire/i.test(autosavedResults),autosavedResults);
 await page.locator('[data-results-term="3"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 const term3Results=await page.locator('#pv2ResultsBody').innerText();
 check('shared term 3 result combines both professors',term3Results.includes('14.32'),term3Results);

 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#profAddSubject').waitFor({state:'visible',timeout:12000});
 await page.locator('#profAllClasses').click();
 await page.locator('[data-manage-class]').first().click();
 await page.locator('[data-class-grade]').click();
 check('professor grades persist after reload',(await page.locator('[data-total]').first().innerText()).trim()==='32.00');
 check('official coefficient persists after reload',(await page.locator('[data-weighted]').first().innerText()).trim()==='16.00');
 await page.locator('[data-prof-term="3"]').click();
 await page.locator('[data-kind="test3"]').waitFor({state:'visible',timeout:8000});
 check('term 3 professor grades persist after reload',(await page.locator('[data-avg]').first().innerText()).trim()==='15.56');

 await page.locator('[data-prof-nav="reports"]').click();
 await page.locator('#pv2ResultsBody .prof-results-table').waitFor({state:'visible',timeout:10000});
 const resultsText=await page.locator('#pv2ResultsBody').innerText();
 check('shared results include subjects from both professors',resultsText.includes('الرياضيات')&&resultsText.includes('اللغة الفرنسية')&&resultsText.includes('العلوم الفيزيائية'),resultsText);
 check('shared general average uses subject coefficients',resultsText.includes('12.91'),resultsText);
 check('report exposes official coefficient coverage',resultsText.includes('11 / 28'),resultsText);
 check('shared results expose one student bulletin button',await page.locator('[data-bulletin]').count()===1);
 await page.locator('[data-bulletin]').click();
 check('student bulletin contains all shared subjects',(await page.locator('.prof-bulletin-preview').innerText()).includes('الرياضيات')&&(await page.locator('.prof-bulletin-preview').innerText()).includes('اللغة الفرنسية')&&(await page.locator('.prof-bulletin-preview').innerText()).includes('العلوم الفيزيائية'));
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