import { chromium } from 'playwright';

const base=process.env.NATAIJI_TEST_URL||'http://127.0.0.1:3221';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:360,height:800},
  deviceScaleFactor:1,
  isMobile:true,
  hasTouch:true,
  locale:'ar'
});
const page=await context.newPage();
const failures=[];
const check=(name,ok,detail='')=>{console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?' — '+detail:''}`);if(!ok)failures.push(name+(detail?': '+detail:''))};

try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('[data-auth2="register"]').waitFor({state:'visible',timeout:10000});
  await page.locator('[data-auth2="register"]').click();
  await page.locator('#auth2Form input[name="name"]').fill('Mobile QA Teacher');
  await page.locator('#auth2Form input[name="email"]').fill('mobile.owner@example.com');
  await page.locator('#auth2Form input[name="password"]').fill('MobileQA-9021');
  await page.locator('#auth2Form .auth-submit').click();

  await page.locator('#nataijiOnboarding').waitFor({state:'visible',timeout:12000});
  await page.locator('#nwSchool').fill('مدرسة الاختبار');
  await page.locator('#nwSchoolFr').fill('École de test');
  await page.locator('#nwRegion').fill('نواكشوط');
  await page.locator('#nwRegionFr').fill('Nouakchott');
  await page.locator('#nwInspection').fill('اختبار');
  await page.locator('#nwInspectionFr').fill('Test');
  await page.locator('#nwNext1').click();
  await page.locator('#nwNext2').waitFor({state:'visible',timeout:10000});
  await page.locator('#nwNext2').click();
  await page.locator('#nwFinish').waitFor({state:'visible',timeout:10000});
  await page.locator('input[name="nwClass"][value="2AF"]').check();
  await page.locator('#nwFinish').click();
  await page.locator('#nwHome').waitFor({state:'visible',timeout:15000});
  await page.locator('#nwHome').click();

  await page.locator('[data-page="home"] .welcome').waitFor({state:'visible',timeout:10000});
  const hero=page.locator('[data-page="home"] .welcome');
  const button=hero.locator('button');
  const copy=hero.locator('div').first();
  const b=await button.boundingBox(), c=await copy.boundingBox();
  check('home CTA does not overlap copy',Boolean(b&&c&&b.y>=c.y+c.height-1),JSON.stringify({button:b,copy:c}));

  const horizontal=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
  check('home has no horizontal overflow',horizontal.scroll<=horizontal.width+2,JSON.stringify(horizontal));

  const firstSubject=page.locator('#subjectProgress .subject-progress-name').first();
  await firstSubject.waitFor({state:'visible',timeout:10000});
  const sb=await firstSubject.boundingBox();
  const subjectStyle=await firstSubject.evaluate(el=>({wordBreak:getComputedStyle(el).wordBreak,overflowWrap:getComputedStyle(el).overflowWrap,whiteSpace:getComputedStyle(el).whiteSpace,text:el.textContent}));
  check('subject label has usable mobile width',Boolean(sb&&sb.width>=90),JSON.stringify({box:sb,style:subjectStyle}));
  check('subject label does not force letter breaking',subjectStyle.wordBreak==='normal',JSON.stringify(subjectStyle));

  await page.locator('.bottom-nav button[data-view="reports"]').click();
  await page.locator('[data-page="reports"]').waitFor({state:'visible',timeout:7000});
  const reportTabs=page.locator('[data-page="reports"] .report-tabs');
  const rb=await reportTabs.boundingBox();
  const tabBoxes=await reportTabs.locator('button').evaluateAll(btns=>btns.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}));
  check('three report tabs stay inside mobile card',Boolean(rb)&&tabBoxes.every(x=>x.x>=rb.x-1&&x.right<=rb.x+rb.width+1),JSON.stringify({container:rb,tabs:tabBoxes}));

  await page.evaluate(()=>localStorage.setItem('nataiji-lang','fr'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.app-shell').waitFor({state:'visible',timeout:12000});
  const locale=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir}));
  check('French interface is LTR',locale.lang==='fr'&&locale.dir==='ltr',JSON.stringify(locale));

  const frenchOverflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
  check('French shell has no horizontal overflow',frenchOverflow.scroll<=frenchOverflow.width+2,JSON.stringify(frenchOverflow));

  await page.locator('.bottom-nav button[data-view="grades"]').click();
  await page.locator('[data-page="grades"]').waitFor({state:'visible',timeout:7000});
  await page.waitForTimeout(250);
  const frenchSubjects=await page.locator('#subjectPicker option').evaluateAll(opts=>opts.map(o=>o.textContent?.trim()||''));
  check('French subject picker contains no Arabic labels',frenchSubjects.length>0&&frenchSubjects.every(x=>!/[\u0600-\u06ff]/.test(x)),JSON.stringify(frenchSubjects));
  const selectedClass=await page.locator('#classTop option:checked').textContent();
  check('French class selector contains no Arabic label',Boolean(selectedClass)&&!/[\u0600-\u06ff]/.test(selectedClass),String(selectedClass));

  await page.locator('.bottom-nav button[data-view="more"]').click();
  await page.locator('[data-page="more"]').waitFor({state:'visible',timeout:7000});
  const ownerCard=page.locator('#ownerDashboardBtn');
  await ownerCard.waitFor({state:'visible',timeout:7000});
  const ownerTitleColor=await ownerCard.locator('b').evaluate(el=>getComputedStyle(el).color);
  check('Super-admin title stays readable on dark card',/rgb\(255,\s*255,\s*255\)/.test(ownerTitleColor),ownerTitleColor);

  console.log('\nNataiji mobile UI acceptance finished.');
  if(failures.length){
    console.error(failures.join('\n'));
    process.exitCode=1;
  }
}finally{
  await browser.close();
}
