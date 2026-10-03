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
