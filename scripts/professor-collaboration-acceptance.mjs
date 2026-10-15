// Run only against the disposable database started by professor-ui-acceptance.yml.
import assert from 'node:assert/strict';
const base=process.env.NATAIJI_TEST_URL||'http://127.0.0.1:3222';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Collaboration acceptance requires a local disposable server');
async function account(i){let cookie='';const call=async(path,method='GET',body,expected=200)=>{const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);return data};const reg=await call('/api/auth/register','POST',{name:'Collaboration QA '+i,email:`collaboration.${i}@example.com`,password:'Collaboration-9021'},201);await call('/api/account/profile-type','POST',{type:'professor'});return {call,id:reg.user.id,getCookie:()=>cookie}}
const owner=await account(1),member=await account(2),outsider=await account(3);
const initial={year:'2026-2027',classes:[{id:'owner-class',name:'1AS',levelCode:'1AS',students:[{id:'student',name:'أحمد',callNumber:1}]}],assignments:[{id:'math',classId:'owner-class',subject:'الرياضيات',subjectKey:'math',coefficient:6}],marks:{}};
await owner.call('/api/professor/profile','PUT',{profile:initial});
const grade=(who,id,test,exam)=>who.call(`/api/professor/assignments/${id}/students/student/grades`,'PUT',{term:1,test,exam});
await grade(owner,'math','14','16');
const share=await owner.call('/api/professor/classes/owner-class/share','POST',{},201),joined=await member.call('/api/professor/classes/join','POST',{code:share.code}),memberClass=joined.localClassId;
const memberProfile=joined.profile;memberProfile.assignments.push({id:'french',classId:memberClass,subject:'اللغة الفرنسية',subjectKey:'french',coefficient:4});
await member.call('/api/professor/profile','PUT',{profile:memberProfile});await grade(member,'french','10','12');
const results=()=>owner.call('/api/professor/classes/owner-class/results?term=1');
const before=await results(),value=before.students[0].general;
const list=await owner.call('/api/professor/classes/owner-class/members');assert.equal(list.members.length,2);assert.equal(list.members.find(x=>x.own).role,'owner');
await outsider.call('/api/professor/classes/owner-class/members','GET',undefined,403);
await member.call(`/api/professor/classes/${memberClass}/members/${owner.id}`,'DELETE',{},403);
await member.call(`/api/professor/classes/${memberClass}/owner`,'POST',{userId:member.id},403);
await owner.call('/api/professor/classes/owner-class/link','DELETE',{},409);
const archived=await owner.call('/api/professor/assignments/math/archive','POST',{});assert.equal(archived.profile.assignments[0].archived,true);assert.equal((await results()).students[0].general,value);
await owner.call('/api/professor/assignments/math/students/student/grades','PUT',{term:1,test:'20',exam:'20'},404);
await owner.call('/api/professor/profile','PUT',{profile:initial});const afterStale=await owner.call('/api/professor/profile');assert.equal(afterStale.profile.assignments[0].archived,true);assert.equal(afterStale.profile.marks.math.student.terms['1'].exam,'16');
await owner.call('/api/professor/assignments/math/archive','POST',{restore:true});assert.equal((await results()).students[0].general,value);
// A non-owner departure freezes shared results and keeps the local private copy.
await member.call(`/api/professor/classes/${memberClass}/link`,'DELETE',{});assert.equal((await results()).students[0].general,value);
await grade(member,'french','20','20');assert.equal((await results()).students[0].general,value);
await member.call(`/api/professor/classes/${memberClass}/results?term=1`,'GET',undefined,409);
// Rejoin explicitly with the same local class, then test owner removal/re-entry block.
await member.call('/api/professor/classes/join','POST',{code:share.code,localClassId:memberClass});
const afterRejoin=(await results()).students[0].general;
await owner.call(`/api/professor/classes/owner-class/members/${member.id}`,'DELETE',{});assert.equal((await results()).students[0].general,afterRejoin);
await member.call('/api/professor/classes/join','POST',{code:share.code,localClassId:memberClass},403);
// Transfer to a currently linked member; stale former-owner profile cannot change roster.
await outsider.call('/api/professor/classes/join','POST',{code:share.code});
await owner.call('/api/professor/classes/owner-class/owner','POST',{userId:outsider.id});
await owner.call(`/api/professor/classes/owner-class/members/${outsider.id}`,'DELETE',{},403);
const ownerNow=(await owner.call('/api/professor/profile')).profile;ownerNow.classes[0].students=[];await owner.call('/api/professor/profile','PUT',{profile:ownerNow});
assert.equal((await results()).students.length,1);
await owner.call('/api/professor/classes/owner-class/link','DELETE',{});
const outsiderProfile=(await outsider.call('/api/professor/profile')).profile,outsideClass=outsiderProfile.classes.find(c=>c.sharedClassId===share.sharedClassId);
const final=await outsider.call(`/api/professor/classes/${outsideClass.id}/results?term=1`);assert.equal(final.students[0].general,afterRejoin);assert.equal(final.students.length,1);
console.log('Collaboration acceptance passed: archives, stale saves, retained collective results, isolation, removal, blocked re-entry, ownership transfer, protected roster.');

// Verify the same controls through the mobile professor interface.
const {chromium}=await import('playwright');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const token=owner.getCookie().slice('nataiji_session='.length);
 await context.addCookies([{name:'nataiji_session',value:token,url:base}]);
 const page=await context.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('[data-prof-nav="grades"]').waitFor();await page.locator('[data-prof-nav="grades"]').click();
 await page.locator('[data-archive-assignment="math"]').click();await page.locator('#profConfirmArchive').click();
 await page.locator('[data-restore-assignment="math"]').waitFor({state:'attached'});
 await page.locator('.prof-archive-panel summary').click();
 const fs=await import('node:fs/promises');await fs.mkdir('artifacts/play',{recursive:true});
 await page.locator('[data-restore-assignment="math"]').scrollIntoViewIfNeeded();
 const buttonBox=await page.locator('[data-restore-assignment="math"]').boundingBox(),navBox=await page.locator('.professor-nav').boundingBox();
 assert.ok(buttonBox.y+buttonBox.height<navBox.y,'Final restore action must be above the fixed navigation');
 await page.screenshot({path:'artifacts/play/professor-archive-mobile.png'});
 await page.locator('[data-restore-assignment="math"]').click();await page.locator('#profConfirmArchive').click();await page.locator('[data-grade-id="math"]').waitFor();
 await page.locator('[data-toggle-subjects]').first().click();assert.equal(await page.locator('[data-grade-id="math"]').isVisible(),false);await page.locator('[data-toggle-subjects]').first().click();
 await page.locator('[data-grade-id="math"]').click();await page.locator('.prof-current-term').waitFor();
 assert.equal(await page.locator('[data-sid="student"][data-exam]').inputValue(),'16');
 await page.locator('[data-prof-nav="students"]').click();
 const sharedManage=await page.evaluate(async()=>{const p=await (await fetch('/api/professor/profile')).json();return p.profile.classes.find(c=>c.id==='owner-class')});assert.equal(sharedManage.sharedClassId,'');
 await context.close();
 const memberContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await memberContext.addCookies([{name:'nataiji_session',value:outsider.getCookie().slice('nataiji_session='.length),url:base}]);
 const memberPage=await memberContext.newPage();await memberPage.goto(base,{waitUntil:'domcontentloaded'});await memberPage.locator('[data-prof-nav="students"]').waitFor();await memberPage.locator('[data-prof-nav="students"]').click();
 await memberPage.locator('[data-manage-class]').first().click();await memberPage.locator('#pv2ManageMembers').click();await memberPage.locator('#profLeaveClass').waitFor();
 assert.ok((await memberPage.locator('.prof-member-row').allTextContents()).some(s=>s.includes('مسؤول القسم')));
 await memberPage.screenshot({path:'artifacts/play/professor-members-mobile.png'});
 console.log('Mobile collaboration controls passed: archive/restore, preserved grades, collapse, current term, participant roles and bottom navigation clearance.');
}finally{await browser.close()}
