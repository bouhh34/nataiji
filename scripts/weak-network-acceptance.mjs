import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const base=process.env.NATAIJI_TEST_URL||'http://127.0.0.1:3221';
 await page.goto(base,{waitUntil:'networkidle'});
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.reload({waitUntil:'networkidle'});
 const assetBytes=await page.evaluate(()=>performance.getEntriesByType('resource')
   .filter(r=>/\.(?:js|css)(?:\?|$)/.test(r.name)).reduce((sum,r)=>sum+r.transferSize,0));
 assert.equal(assetBytes,0,'repeat shell assets should be served by the service worker');
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 assert.match(await page.title(),/Nataiji/);
 // Auth remains server-controlled even though the public shell is available offline.
 const apiOffline=await page.evaluate(async()=>{try{await fetch('/api/auth/status');return false}catch{return true}});
 assert.equal(apiOffline,true);
 await context.setOffline(false);
 // Seed a real teacher workspace and confirm it can be reopened from local
 // state while disconnected, not just the public HTML shell.
 const register=await context.request.post(base+'/api/auth/register',{data:{
  name:'Offline School QA',email:'offline.school.qa@example.com',password:'OfflineSchool-9021',school:'École test'
 }});
 assert.equal(register.status(),201,'test school account should register');
 const setup=await context.request.post(base+'/api/account/profile-type',{data:{type:'teacher'}});
 assert.equal(setup.status(),200,'test account should choose the teacher workspace');
 const cls='offline-school-class',term='الفصل الأول';
 const structure=await context.request.put(base+'/api/structure',{data:{structure:{
  classes:[{id:cls,name:'القسم التجريبي',code:'1AF'}],terms:[term,'الفصل الثاني','الفصل الثالث'],activeClassId:cls,term
 }}});
 assert.equal(structure.status(),200);
 const pupil=await context.request.post(base+'/api/pupils',{data:{classId:cls,pupil:['','تلميذ تجريبي','','','','','', '']}});
 assert.equal(pupil.status(),201);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof currentUser!=='undefined'&&currentUser?.id&&state?.pupils?.some(p=>p[1]==='تلميذ تجريبي'));
 assert.equal(await page.evaluate(()=>currentUser?.role), 'admin','school owner must have access to archive tools');
 await page.locator('[data-view="more"]').click();
 await page.locator('#schoolYearArchiveBtn').waitFor({state:'visible',timeout:10000});
 assert.equal(await page.locator('#schoolYearArchiveBtn').count(),1,'archive entry cannot duplicate');
 assert.equal(await page.locator('#schoolYearArchiveBtn').evaluate(el=>el.dataset.moreGroup),'academic','archive entry must be under academic settings');
 await page.locator('#schoolYearArchiveBtn').click();
 await page.locator('#schoolYearArchiveCreate').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-page="more"] .settings-grid').count(),1);
 await page.locator('.modal:has(#schoolYearArchiveCreate) .x').click();
 await page.locator('[data-view="home"]').click();
 assert.equal(await page.evaluate(()=>!!window.NataijiOfflineResume?.read()),true);
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof currentUser!=='undefined'&&currentUser?.id&&state?.pupils?.some(p=>p[1]==='تلميذ تجريبي'));
 assert.equal(await page.evaluate(()=>window.__nataijiOfflineActive),true,'school should open cached workspace offline');
 assert.equal(await page.locator('.auth-gate').count(),0,'offline reopening must not show login or retry gate');
 await context.setOffline(false);
 await page.evaluate(()=>localStorage.setItem('nataiji-lang','fr'));
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.getAttribute('html','dir'),'ltr');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'French mobile viewport must not overflow');
 await page.evaluate(()=>localStorage.setItem('nataiji-lang','ar'));
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.getAttribute('html','dir'),'rtl');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Arabic mobile viewport must not overflow');
 console.log('Repeat shell: 0 asset network bytes; offline shell, uncached API, Arabic/French mobile layout passed');
} finally {await browser.close()}
