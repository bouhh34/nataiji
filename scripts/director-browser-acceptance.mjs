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
// Each class has a versioned timetable; teacher collisions are rejected.
const timetableKey='manual:11111111-1111-4111-8111-111111111111';
const otherClassKey='manual:22222222-2222-4222-8222-222222222222';
assert.deepEqual((await director.call('/api/director/timetables')).classes,[]);
const savedTimetable=(await director.call('/api/director/timetables/'+encodeURIComponent(timetableKey),'PUT',{className:'الأولى أ',expectedVersion:0,entries:[{day:'mon',start:'08:00',end:'10:00',subject:'الرياضيات',teacher:'أحمد',room:'A'}]})).timetable;
assert.equal(savedTimetable.version,1);
await director.call('/api/director/timetables/'+encodeURIComponent(otherClassKey),'PUT',{className:'الأولى ب',expectedVersion:0,entries:[{day:'mon',start:'09:00',end:'10:00',subject:'الفرنسية',teacher:'أحمد',room:'B'}]},409);
assert.equal((await director.call('/api/director/timetables')).timetables.length,1);
await director.call('/api/director/timetables/'+encodeURIComponent(timetableKey),'PUT',{className:'الأولى أ',expectedVersion:0,entries:[]},409);
const code=(await director.call('/api/director/invitations','POST',{},201)).code;
const teacher=await account('Linked Teacher QA','teacher');
await teacher.call('/api/director/invitations/accept','POST',{code});
await teacher.call('/api/director/invitations/accept','POST',{code},409);
assert.equal((await director.call('/api/director/members')).members[0].name,'Linked Teacher QA');
await teacher.call('/api/director/registers','GET',undefined,403);
// Primary directors and regular teachers must not gain professor endpoints.
await director.call('/api/professor/catalog','GET',undefined,403);
await teacher.call('/api/professor/catalog','GET',undefined,403);
const middle=await account('Middle School Director QA','director');
await middle.call('/api/director/institution','POST',{name:'إعدادية اختبار',level:'middle',academicYear:'2026-2027'},201);
assert.equal((await middle.call('/api/professor/catalog')).ok,true);
assert.equal((await middle.call('/api/professor/profile')).ok,true);
const secondary=await account('Secondary School Director QA','director');
await secondary.call('/api/director/institution','POST',{name:'ثانوية اختبار',level:'secondary',academicYear:'2026-2027'},201);
assert.equal((await secondary.call('/api/professor/catalog')).ok,true);
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
 assert.match(await page.locator('#directorTeacherArea').innerText(),/مساحة المعلم/);
 // Every register interior must provide an accessible back control and a useful empty state.
 await page.locator('[data-director-register="model-lessons"]').click();
 await page.locator('#directorEmptyAdd').waitFor({state:'visible'});
 assert.match(await page.locator('.director-empty-register').innerText(),/لا توجد قيود بعد/);
 assert.equal(await page.locator('#directorBack').isVisible(),true);
 await page.locator('#directorBack').click();
 await page.locator('#nataijiDirectorRoot .director-welcome').waitFor({state:'visible'});
 assert.equal(await page.locator('#directorBack').count(),0);
 await page.locator('#directorTimetables').click();
 await page.locator('#directorTimeClass').waitFor({state:'visible'});
 assert.equal(await page.locator('.director-time-lesson').count(),1);
 assert.match(await page.locator('.director-time-lesson').first().innerText(),/الرياضيات/);
 await page.locator('#directorTimeAdd').click();
 assert.equal(await page.locator('#directorBack').isVisible(),true);
 await page.locator('#directorBack').click();
 await page.locator('#directorTimeClass').waitFor({state:'visible'});
 await page.locator('#directorTimeAdd').click();
 await page.locator('#directorTimeLessonForm [name="day"]').selectOption('tue');
 await page.locator('#directorTimeLessonForm [name="start"]').fill('10:00');
 await page.locator('#directorTimeLessonForm [name="end"]').fill('11:00');
 await page.locator('#directorTimeLessonForm [name="subject"]').fill('اللغة العربية');
 await page.locator('#directorTimeLessonForm [name="teacher"]').fill('خديجة');
 await page.locator('#directorTimeLessonForm button[type="submit"]').click();
 await page.locator('.director-time-lesson').nth(1).waitFor({state:'visible'});
 assert.equal((await director.call('/api/director/timetables')).timetables[0].entries.length,2);
 await page.locator('#directorHome').click();
 await page.locator('#nataijiDirectorRoot .director-welcome').waitFor({state:'visible'});
 await page.locator('[data-director-register="enrolment"]').click();
 await page.locator('[data-director-edit]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-director-print]').count(),1);
 await page.locator('[data-director-edit]').click();
 assert.equal(await page.locator('#directorBack').isVisible(),true);
 await page.locator('#directorBack').click();
 await page.locator('[data-director-edit]').waitFor({state:'visible'});
 await page.locator('[data-director-edit]').click();
 await page.locator('#directorRecordForm [name="custom-studentName"]').fill('تلميذ تم تعديله');
 await page.locator('#directorRecordForm button[type="submit"]').click();
 await page.locator('[data-director-edit]').waitFor({state:'visible'});
 const revised=(await director.call('/api/director/registers?category=enrolment')).records[0];
 assert.equal(revised.subject,'قيد التلميذ الأول');
 assert.equal(revised.details.studentName,'تلميذ تم تعديله');
 await context.setOffline(true);
 await page.locator('#directorNewEntry').click();
 await page.locator('#directorRecordForm [name="custom-studentName"]').fill('تلميذ دون إنترنت');
 await page.locator('#directorRecordForm button[type="submit"]').click();
 await page.locator('.director-pending').waitFor({state:'visible',timeout:10000});
 assert.match(await page.locator('.director-pending').innerText(),/تلميذ دون إنترنت/);
 assert.equal((await director.call('/api/director/registers?category=enrolment')).records.length,1);
 await context.setOffline(false);
 let synced=false;
 for(let i=0;i<24;i++){
  await page.waitForTimeout(500);
  const rows=(await director.call('/api/director/registers?category=enrolment')).records;
  if(rows.some(x=>x.subject==='تلميذ دون إنترنت'&&x.details?.studentName==='تلميذ دون إنترنت')){synced=rows.length===2;break}
 }
 assert.ok(synced,'Offline entry synced exactly once after reconnect');
 await context.close();
 for(const [account,expectedLabel] of [[middle,'مساحة الأستاذ'],[secondary,'مساحة الأستاذ']]){
  const staffContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ar'});
  await staffContext.addCookies([{name:'nataiji_session',value:account.cookie().slice('nataiji_session='.length),url:base}]);
  const screen=await staffContext.newPage();
  await screen.goto(base,{waitUntil:'domcontentloaded'});
  await screen.locator('#nataijiDirectorRoot .director-welcome').waitFor({state:'visible',timeout:15000});
  assert.match(await screen.locator('#directorTeacherArea').innerText(),new RegExp(expectedLabel));
  await screen.locator('#directorTeacherArea').click();
  await screen.locator('#nataijiProfessorRoot').waitFor({state:'visible',timeout:15000});
  assert.equal(await screen.locator('#directorReturnButton').count(),1);
  await screen.locator('#directorReturnButton').click();
  await screen.locator('#nataijiDirectorRoot .director-welcome').waitFor({state:'visible',timeout:15000});
  assert.match(await screen.locator('#directorTeacherArea').innerText(),/مساحة الأستاذ/);
  await staffContext.close();
 }
 console.log('Director browser acceptance passed: primary teacher / collège lycée professor spaces, secure APIs, records, offline replay.');
}finally{await browser.close()}
