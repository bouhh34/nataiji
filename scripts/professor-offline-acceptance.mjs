import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.NATAIJI_TEST_URL||'http://127.0.0.1:3222';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:320,height:740},isMobile:true,hasTouch:true});
const page=await context.newPage();
let calls=0,totalRows=0;
page.on('request',r=>{if(r.method()==='PUT'&&/assignments\/[^/]+\/grades$/.test(r.url())){calls++;totalRows+=r.postDataJSON().rows.length}});
const request=async(path,method='GET',data)=>{const r=await context.request.fetch(base+path,{method,data});let j=await r.json();return {status:r.status(),...j}};
try{
 const reg=await request('/api/auth/register','POST',{name:'أستاذ اختبار الانقطاع',email:'offline.professor@example.com',password:'OfflinePass-9021'});assert.equal(reg.status,201);
 await request('/api/account/profile-type','POST',{type:'professor'});
 const profile={schoolName:'ثانوية اختبار الاتصال الضعيف',year:'2026-2027',classes:[{id:'offline-c',name:'2AS A',students:Array.from({length:25},(_,i)=>({id:'p'+i,name:'التلميذ '+i}))}],assignments:[{id:'offline-a',classId:'offline-c',subject:'الرياضيات',subjectKey:'math'}],marks:{}};
 assert.equal((await request('/api/professor/profile','PUT',{profile})).status,200);
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('[data-prof-nav="grades"]').click();
 await page.locator('[data-grade-id]').first().click();
 await page.locator('[data-test-index]').first().fill('12');
 await page.locator('[data-exam]').first().fill('14');
 await page.waitForFunction(()=>document.querySelector('#profSyncStatus')?.dataset.state==='saved');
 assert.equal(totalRows,1,'editing one of 25 pupils sends one row');
 assert.equal(calls,1,'autosave coalesces one changed row into one request');
 await page.locator('[data-test-index]').first().fill('21');await page.locator('#pv2SaveGrades').click();assert.equal(await page.locator('[data-test-index]').first().getAttribute('aria-invalid'),'true');assert.equal((await request('/api/professor/profile')).profile.marks['offline-a'].p0.terms['1'].tests[0],'12','invalid entry is rejected instead of silently clamped');await page.locator('[data-test-index]').first().fill('12');
 await context.setOffline(true);
 await page.locator('[data-test-index]').first().fill('0');
 await page.locator('[data-exam]').first().fill('10');
 await page.locator('[data-prof-term="2"]').click();
 await page.locator('[data-test-index]').first().fill('15');
 await page.locator('[data-exam]').first().fill('ABSENT');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nataiji-grade-drafts-v1:'+currentUser.id)).rows.length),2,'offline navigation preserves two trimester drafts');
 assert.match(await page.locator('#profSyncStatus').innerText(),/محفوظ على الجهاز/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'320px screen must not overflow');
 await page.locator('[data-prof-nav="more"]').click();await page.locator('#profMoreBackup').click();
 const downloaded=page.waitForEvent('download');await page.locator('#profExportDrafts').click();
 const backup=JSON.parse(await fs.readFile(await (await downloaded).path(),'utf8'));assert.equal(backup.userId,reg.user.id);assert.equal(backup.drafts.length,2);
 await page.locator('.professor-x').click();
 // Reconnect with writes temporarily blocked so reauthentication/reload cannot erase drafts.
 await page.route('**/api/professor/assignments/*/grades',route=>route.abort());
 await context.setOffline(false);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#profSyncStatus').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nataiji-grade-drafts-v1:'+currentUser.id)).rows.length),2);
 // Exercise the downloaded backup: erase the local drafts, then restore them explicitly.
 await page.evaluate(()=>localStorage.removeItem('nataiji-grade-drafts-v1:'+currentUser.id));await page.reload({waitUntil:'domcontentloaded'});await page.locator('#profSyncStatus').waitFor({state:'visible'});
 await page.locator('[data-prof-nav="more"]').click();await page.locator('#profMoreBackup').click();
 page.once('dialog',d=>d.accept());await page.locator('#profImportDrafts').setInputFiles({name:'Nataiji-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await page.waitForFunction(()=>document.querySelector('.professor-modal')===null);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nataiji-grade-drafts-v1:'+currentUser.id)).rows.length),2);
 await page.unroute('**/api/professor/assignments/*/grades');
 await page.locator('#profSyncRetry').click();
 await page.waitForFunction(()=>document.querySelector('#profSyncStatus')?.dataset.state==='saved');
 const saved=(await request('/api/professor/profile')).profile.marks['offline-a'].p0.terms;
 assert.deepEqual(saved['1'],{tests:['0'],exam:'10'});assert.deepEqual(saved['2'],{tests:['15'],exam:'ABSENT'});
 // Concurrent device writes must stop replay and expose a human choice.
 await page.locator('[data-prof-nav="grades"]').click();await page.locator('[data-grade-id]').first().click();
 await context.setOffline(true);await page.locator('[data-test-index]').first().fill('17');
 assert.equal((await request('/api/professor/assignments/offline-a/grades','PUT',{term:1,rows:[{studentId:'p0',test:'18',exam:'10'}]})).status,200);
 await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('#profSyncStatus')?.dataset.state==='error');
 assert.equal((await request('/api/professor/profile')).profile.marks['offline-a'].p0.terms['1'].tests[0],'18','newer remote mark preserved');
 await page.locator('#profSyncReview').click();await page.locator('[data-draft-local]').click();
 await page.waitForFunction(()=>document.querySelector('#profSyncStatus')?.dataset.state==='saved');
 assert.equal((await request('/api/professor/profile')).profile.marks['offline-a'].p0.terms['1'].tests[0],'17','explicit conflict choice saved');
 // Invalid batch must leave ALL earlier rows unchanged.
 const invalid=await request('/api/professor/assignments/offline-a/grades','PUT',{term:1,rows:[{studentId:'p0',test:'19',exam:'10'},{studentId:'p1',test:'21',exam:'10'}]});assert.equal(invalid.status,400);
 assert.equal((await request('/api/professor/profile')).profile.marks['offline-a'].p0.terms['1'].tests[0],'17');
 // Replayed lost response is idempotent; stale baseline cannot overwrite it.
 const payload={term:1,rows:[{studentId:'p0',test:'16',exam:'10',expected:{test:'17',exam:'10'}}]};
 assert.equal((await request('/api/professor/assignments/offline-a/grades','PUT',payload)).status,200);
 assert.equal((await request('/api/professor/assignments/offline-a/grades','PUT',payload)).status,200);
 assert.equal((await request('/api/professor/assignments/offline-a/grades','PUT',{term:1,rows:[{studentId:'p0',test:'11',exam:'10',expected:{test:'17',exam:'10'}}]})).status,409);
 // Account boundary: a different valid user must not see/replay this user's draft.
 await context.setOffline(true);await page.locator('[data-test-index]').first().fill('13');
 await page.route('**/api/professor/assignments/*/grades',route=>route.abort());await context.setOffline(false);
 await request('/api/auth/logout','POST',{});
 const other=await request('/api/auth/register','POST',{name:'Other Professor',email:'offline.other@example.com',password:'OtherPass-9021'});assert.equal(other.status,201);await request('/api/account/profile-type','POST',{type:'professor'});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#profSyncStatus').waitFor({state:'visible'});assert.match(await page.locator('#profSyncStatus').innerText(),/جميع التغييرات محفوظة/);
 assert.equal((await request('/api/professor/profile')).profile.assignments.length,0);
 assert.ok(await page.evaluate(id=>!!localStorage.getItem('nataiji-grade-drafts-v1:'+id),reg.user.id));
 await request('/api/auth/logout','POST',{});await request('/api/auth/login','POST',{email:'offline.professor@example.com',password:'OfflinePass-9021'});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#profSyncStatus').waitFor({state:'visible'});assert.match(await page.locator('#profSyncStatus').innerText(),/بانتظار المزامنة/);
 console.log('PASS backup export/import, offline drafts, reload, account isolation, 25-pupil delta batching, atomic rejection, idempotency and concurrent-device conflict resolution');
}catch(e){await fs.mkdir('artifacts/play',{recursive:true});await page.screenshot({path:'artifacts/play/offline-failure.png',fullPage:true}).catch(()=>{});console.error('Offline test page:',await page.locator('body').innerText().catch(()=>''));throw e}finally{await browser.close()}
