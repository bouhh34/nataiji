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
  const authAbsentControls=await page.locator('.auth-box .absent-btn').count();
  const authText=await page.locator('.auth-box').innerText();
  check('auth screen never shows grade absence controls',authAbsentControls===0&&!/(^|\s)(غائب|غائبة|Absent|Absente)(\s|$)/u.test(authText),JSON.stringify({authAbsentControls,authText}));
  const storageText=(await page.locator('.auth-storage').innerText()).trim();
  check('auth explains durable storage clearly',/تخزين آمن على قاعدة البيانات|Stockage sécurisé sur base de données/u.test(storageText),storageText);

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
  const premiumBrand=page.locator('main > header .npv2-brand');
  await premiumBrand.waitFor({state:'visible',timeout:5000});
  const premiumHeader=await page.locator('main > header').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));
  const premiumStats=await page.locator('[data-page="home"] .npv2-stat-icon').count();
  check('premium v2 header brand is visible',await premiumBrand.count()===1,String(await premiumBrand.count()));
  check('premium v2 header has no internal overflow',premiumHeader.scroll<=premiumHeader.width+2,JSON.stringify(premiumHeader));
  check('premium v2 dashboard has four stat icons',premiumStats===4,String(premiumStats));
  const homeHeader=page.locator('main > header.np-home-header');
  const homeHero=page.locator('[data-page="home"] .np-home-hero');
  const homeProgress=page.locator('[data-page="home"] .np-home-progress-card');
  const homeShowAll=page.locator('[data-page="home"] .np-home-show-all');
  check('approved home header layout is active',await homeHeader.count()===1,String(await homeHeader.count()));
  check('approved educational hero is active',await homeHero.count()===1&&await homeHero.locator('.np-home-hero-art').count()===1,String(await homeHero.locator('.np-home-hero-art').count()));
  check('approved compact progress card is active',await homeProgress.count()===1&&await homeShowAll.count()===1,JSON.stringify({progress:await homeProgress.count(),showAll:await homeShowAll.count()}));
  const countVisibleSubjectRows=()=>page.locator('#subjectProgress > div').evaluateAll(rows=>rows.filter(r=>{const s=getComputedStyle(r);const b=r.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0}).length);
  const visibleRowsBefore=await countVisibleSubjectRows();
  await homeShowAll.click();
  await page.waitForTimeout(80);
  const visibleRowsAfter=await countVisibleSubjectRows();
  check('show-all expands subject rows without data loss',visibleRowsAfter>=visibleRowsBefore&&visibleRowsAfter>0,JSON.stringify({visibleRowsBefore,visibleRowsAfter}));

  const firstSubject=page.locator('#subjectProgress .subject-progress-name').first();
  await firstSubject.waitFor({state:'visible',timeout:10000});
  const sb=await firstSubject.boundingBox();
  const subjectStyle=await firstSubject.evaluate(el=>({wordBreak:getComputedStyle(el).wordBreak,overflowWrap:getComputedStyle(el).overflowWrap,whiteSpace:getComputedStyle(el).whiteSpace,text:el.textContent}));
  check('subject label has usable mobile width',Boolean(sb&&sb.width>=90),JSON.stringify({box:sb,style:subjectStyle}));
  check('subject label does not force letter breaking',subjectStyle.wordBreak==='normal',JSON.stringify(subjectStyle));

  const pupilCountBefore=await page.locator('.student-mobile-card').count().catch(()=>0);
  if(pupilCountBefore===0){
    const seeded=await page.evaluate(async()=>{
      const classId=document.querySelector('#classTop')?.value||'';
      const res=await fetch('/api/pupils',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId,pupil:['','طالب الاختبار','','','','Test Student','','']})});
      return {status:res.status,body:await res.json()};
    });
    check('test pupil can be created for persistence flow',[200,201].includes(seeded.status)&&seeded.body?.ok===true,JSON.stringify(seeded));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.app-shell').waitFor({state:'visible',timeout:12000});
  }

  await page.locator('.bottom-nav button[data-view="grades"]').click();
  await page.locator('[data-page="grades"]').waitFor({state:'visible',timeout:7000});
  await page.waitForTimeout(350);
  const firstMark=page.locator('.compact-score-row .mobile-mark').first();
  await firstMark.waitFor({state:'visible',timeout:7000});
  await firstMark.fill('0');
  await firstMark.blur();
  const saveResponse=page.waitForResponse(r=>r.url().includes('/api/marks')&&r.request().method()==='PUT'&&r.status()===200,{timeout:10000});
  await page.locator('#saveGrades').click();
  await saveResponse;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.app-shell').waitFor({state:'visible',timeout:12000});
  await page.locator('.bottom-nav button[data-view="grades"]').click();
  await page.locator('[data-page="grades"]').waitFor({state:'visible',timeout:7000});
  await page.waitForTimeout(250);
  const persistedZero=await page.locator('.compact-score-row .mobile-mark').first().inputValue();
  check('zero grade persists distinctly from empty',persistedZero==='0',persistedZero);

  let firstRow=page.locator('.compact-score-row').first();
  let absentButton=firstRow.locator('.absent-btn');
  let absentInput=firstRow.locator('.mobile-mark');
  await absentButton.click();
  await page.waitForTimeout(80);
  let absentValue=await absentInput.inputValue();
  let absentPressed=await absentButton.getAttribute('aria-pressed');
  check('absence is an explicit selected state',/^(غائب|غائبة|Absent|Absente)$/u.test(absentValue)&&absentPressed==='true',JSON.stringify({absentValue,absentPressed}));

  const saveAbsentResponse=page.waitForResponse(r=>r.url().includes('/api/marks')&&r.request().method()==='PUT'&&r.status()===200,{timeout:10000});
  await page.locator('#saveGrades').click();
  await saveAbsentResponse;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.app-shell').waitFor({state:'visible',timeout:12000});
  await page.locator('.bottom-nav button[data-view="grades"]').click();
  await page.locator('[data-page="grades"]').waitFor({state:'visible',timeout:7000});
  await page.waitForTimeout(250);
  firstRow=page.locator('.compact-score-row').first();
  absentButton=firstRow.locator('.absent-btn');
  absentInput=firstRow.locator('.mobile-mark');
  absentValue=await absentInput.inputValue();
  absentPressed=await absentButton.getAttribute('aria-pressed');
  check('absence persists after reload',/^(غائب|غائبة|Absent|Absente)$/u.test(absentValue)&&absentPressed==='true',JSON.stringify({absentValue,absentPressed}));

  await absentButton.click();
  await page.waitForTimeout(80);
  let clearedValue=await absentInput.inputValue();
  let clearedPressed=await absentButton.getAttribute('aria-pressed');
  check('absence can be cleared back to not-entered',clearedValue===''&&clearedPressed==='false',JSON.stringify({clearedValue,clearedPressed}));

  const saveBlankResponse=page.waitForResponse(r=>r.url().includes('/api/marks')&&r.request().method()==='PUT'&&r.status()===200,{timeout:10000});
  await page.locator('#saveGrades').click();
  await saveBlankResponse;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.app-shell').waitFor({state:'visible',timeout:12000});
  await page.locator('.bottom-nav button[data-view="grades"]').click();
  await page.locator('[data-page="grades"]').waitFor({state:'visible',timeout:7000});
  await page.waitForTimeout(250);
  firstRow=page.locator('.compact-score-row').first();
  absentButton=firstRow.locator('.absent-btn');
  absentInput=firstRow.locator('.mobile-mark');
  clearedValue=await absentInput.inputValue();
  clearedPressed=await absentButton.getAttribute('aria-pressed');
  check('not-entered state persists distinctly from zero and absence',clearedValue===''&&clearedPressed==='false',JSON.stringify({clearedValue,clearedPressed}));

  const max=Number(await absentInput.getAttribute('max'))||20;
  await absentInput.fill(String(max+1));
  await absentInput.blur();
  check('grade above subject maximum is rejected',await absentInput.evaluate(el=>el.classList.contains('grade-invalid')),JSON.stringify({max,value:await absentInput.inputValue()}));
  await absentInput.fill('');
  await absentInput.blur();

  await page.locator('.bottom-nav button[data-view="more"]').click();
  await page.locator('[data-page="more"]').waitFor({state:'visible',timeout:7000});
  await page.waitForTimeout(140);
  const moreTitles=await page.locator('[data-page="more"] .menu-card > b').evaluateAll(nodes=>nodes.map(n=>n.textContent?.trim()||''));
  const legacyGlyph=/[⌂▤♙▧☷▥♧⚙↪↔⌁☏🌐🏫🔗⌫▦⬇↓]/u;
  check('More menu uses one icon system',moreTitles.every(x=>!legacyGlyph.test(x)),JSON.stringify(moreTitles));
  const subjectsIcon=await page.locator('#subjectsBtn b svg').count();
  check('Subjects menu keeps its icon after scoring refresh',subjectsIcon===1,String(subjectsIcon));
  const sharesIcon=await page.locator('#sharesBtn b svg').count();
  const joinIcon=await page.locator('#joinInviteBtn b svg').count();
  check('Sharing cards keep canonical icons',sharesIcon===1&&joinIcon===1,JSON.stringify({sharesIcon,joinIcon}));

  await page.locator('.bottom-nav button[data-view="reports"]').click();
  await page.locator('[data-page="reports"]').waitFor({state:'visible',timeout:7000});
  const reportTabs=page.locator('[data-page="reports"] .report-tabs');
  const rb=await reportTabs.boundingBox();
  const tabBoxes=await reportTabs.locator('button').evaluateAll(btns=>btns.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}));
  check('three report tabs stay inside mobile card',Boolean(rb)&&tabBoxes.every(x=>x.x>=rb.x-1&&x.right<=rb.x+rb.width+1),JSON.stringify({container:rb,tabs:tabBoxes}));
  const reportTabIcons=await reportTabs.locator('.npv2-tab-icon').count();
  const reportPrintIcon=await page.locator('#printResult .npv2-button-icon').count();
  check('premium v2 report controls keep canonical icons',reportTabIcons===3&&reportPrintIcon===1,JSON.stringify({reportTabIcons,reportPrintIcon}));

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
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeinstallprompt',{cancelable:true})));
  await page.waitForTimeout(120);
  const installCard=page.locator('#installAppBtn');
  await installCard.waitFor({state:'visible',timeout:3000});
  const installText=(await installCard.innerText()).trim();
  const installIcon=await installCard.locator('b svg').count();
  check('French install card is fully localized with canonical icon',/Installer Nataiji/.test(installText)&&!/[؀-ۿ]/.test(installText)&&installIcon===1,JSON.stringify({installText,installIcon}));

  console.log('\nNataiji mobile UI acceptance finished.');
  if(failures.length){
    console.error(failures.join('\n'));
    process.exitCode=1;
  }
}finally{
  await browser.close();
}
