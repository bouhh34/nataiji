// Disposable PostgreSQL + Playwright acceptance test. Never run on production.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.NATAIJI_TEST_URL||'http://127.0.0.1:3225';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local server required');
const stamp=Date.now();
async function account(label,type){
 let cookie='';
 async function call(path,method='GET',body,expected=200){
  const resp=await fetch(base+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const updated=resp.headers.get('set-cookie');if(updated)cookie=updated.split(';')[0];
  const data=await resp.json();
  assert.equal(resp.status,expected,method+' '+path+': '+JSON.stringify(data));
  return data
 }
 const registered=await call('/api/auth/register','POST',{name:label,identifier:'qa.'+label.replace(/\W/g,'')+'.'+stamp+'@example.com',password:'DirectorQA-9021'},201);
 const selected=await call('/api/account/profile-type','POST',{type});
 assert.equal(selected.user.profileType,type);
 return {call,id:registered.user.id,cookie:()=>cookie}
}
const director=await account('Director QA','director');
assert.equal((await director.call('/api/director/institution')).institution,null);
const institution=(await director.call('/api/director/institution','POST',{name:'مدرسة اختبار المدير',level:'primary',academicYear:'2026-2027',region:'نواكشوط',district:'تفرغ زينة'},201)).institution;
assert.equal(institution.director_user_id,director.id);
assert.deepEqual((await director.call('/api/director/roster')).students,[]);
const payload={category:'enrolment',subject:'قيد التلميذ الأول',recordDate:'2026-10-18',details:{studentName:'تلميذ اختبار',notes:'قيد تجريبي'},clientMutationId:'0f1b22ab-cde0-4844-938c-10aee99f7b66'};
const created=await director.call('/api/director/registers','POST',payload,201);
const repeated=await director.call('/api/director/registers','POST',payload,200);
assert.equal(created.record.id,repeated.record.id);
await director.call('/api/director/registers','POST',{...payload,subject:'Conflicting retry'},409);
assert.equal((await director.call('/api/director/registers?category=enrolment')).records.length,1);
await director.call('/api/director/registers','POST',{...payload,category:'student-health',clientMutationId:'8de3ac2e-7b43-4a23-8823-ac23c34acfb1'},403);
await director.call('/api/director/registers?category=student-health','GET',undefined,403);
const code=(await director.call('/api/director/invitations','POST',{},201)).code;
const teacher=await account('Linked Teacher QA','teacher');
await teacher.call('/api/director/invitations/accept','POST',{code});
await teacher.call('/api/director/invitations/accept','POST',{code},409);
assert.equal((await director.call('/api/director/members')).members[0].name,'Linked Teacher QA');
await teacher.call('/api/director/registers','GET',undefined,403);
await director.call('/api/director/members/'+teacher.id,'DELETE');
assert.deepEqual((await director.call('/api/director/members')).members,[]);
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ar'});
 await context.addCookies([{name:'nataiji_session',value:director.cookie().slice('nataiji_session='.length),url:base}]);
 const page=await context.newPage();
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#nataijiDirectorRoot .director-welcome').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('[data-director-register]').count(),14);
 assert.equal(await page.locator('#directorTeacherArea').count(),1);
 await page.locator('[data-director-register="enrolment"]').click();
 await page.locator('[data-director-edit]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-director-print]').count(),1);
 await page.locator('[data-director-edit]').click();
 await page.locator('#directorRecordForm [name="subject"]').fill('قيد تم تعديله');
 await page.locator('#directorRecordForm button[type="submit"]').click();
 await page.locator('[data-director-edit]').waitFor({state:'visible'});
 assert.equal((await director.call('/api/director/registers?category=enrolment')).records[0].subject,'قيد تم تعديله');
 await context.setOffline(true);
 await page.locator('#directorNewEntry').click();
 await page.locator('#directorRecordForm [name="subject"]').fill('قيد دون إنترنت');
 await page.locator('#directorRecordForm [name="custom-studentName"]').fill('تلميذ آخر');
 await page.locator('#directorRecordForm button[type="submit"]').click();
 await page.locator('.director-pending').waitFor({state:'visible',timeout:10000});
 assert.match(await page.locator('.director-pending').innerText(),/قيد دون إنترنت/);
 assert.equal((await director.call('/api/director/registers?category=enrolment')).records.length,1);
 await context.setOffline(false);
 let synced=false;
 for(let i=0;i<24;i++){
  await page.waitForTimeout(500);
  const rows=(await director.call('/api/director/registers?category=enrolment')).records;
  if(rows.some(x=>x.subject==='قيد دون إنترنت')){synced=rows.length===2;break}
 }
 assert.ok(synced,'Offline entry synced exactly once after reconnect');
 await context.close();
 console.log('Director browser acceptance passed: accounts, invitations, secure registers, editor, offline replay.');
}finally{await browser.close()}
