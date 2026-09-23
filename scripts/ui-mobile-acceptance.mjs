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
  const duplicateHomeIcons=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('[data-page="home"] .stats article')];
    const statDuplicates=cards.filter(card=>card.querySelectorAll(':scope > svg.lux-feather,:scope > i[data-feather],:scope > .npv2-stat-icon').length!==1).length;
    const cta=document.querySelector('[data-page="home"] .welcome button');
    const ctaIcons=cta?cta.querySelectorAll(':scope > svg.lux-feather,:scope > i[data-feather],:scope > .npv2-button-icon').length:0;
    return {statDuplicates,ctaIcons};
  });
  check('home has exactly one icon per KPI and CTA',duplicateHomeIcons.statDuplicates===0&&duplicateHomeIcons.ctaIcons===1,JSON.stringify(duplicateHomeIcons));
  const homeHeader=page.locator('main > header.np-home-header');
  const homeHero=page.locator('[data-page="home"] .np-home-hero');
  const compactHeroHeight=await homeHero.evaluate(el=>Math.round(el.getBoundingClientRect().height));
  check('home hero is compact on mobile',compactHeroHeight<=175,String(compactHeroHeight));
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
  const subjectIconKeys=await page.locator('#subjectProgress .subject-premium-icon').evaluateAll(nodes=>nodes.slice(0,7).map(n=>n.dataset.icon||''));
  const expectedSubjectIconKeys=['islamic','arabic','math','civic','art','french','sport'];
  check('final semantic subject icons are mapped in order',JSON.stringify(subjectIconKeys)===JSON.stringify(expectedSubjectIconKeys),JSON.stringify({subjectIconKeys,expectedSubjectIconKeys}));
  const customSvgCount=await page.locator('#subjectProgress .subject-premium-icon > svg').count();
  check('subject icons render as custom vectors',customSvgCount>=7,String(customSvgCount));

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
  const gradeSubjectIcon=await page.locator('#mobileScores .grade-current-subject-icon svg').count();
  check('current grade subject shows its semantic icon',gradeSubjectIcon===1,String(gradeSubjectIcon));
  const gradeFilterBox=await page.locator('[data-page="grades"] .filters').boundingBox();
  check('grade filters are compact on mobile',Boolean(gradeFilterBox&&gradeFilterBox.height<=165),JSON.stringify(gradeFilterBox));
  const firstRowBox=await page.locator('.compact-score-row').first().boundingBox();
  check('grade rows are compact without crowding',Boolean(firstRowBox&&firstRowBox.height<=64),JSON.stringify(firstRowBox));
  const controlLefts=await page.locator('.compact-score-row .score-controls').evaluateAll(nodes=>nodes.slice(0,4).map(n=>Math.round(n.getBoundingClientRect().left)));
  check('grade controls stay vertically aligned',controlLefts.length>0&&Math.max(...controlLefts)-Math.min(...controlLefts)<=2,JSON.stringify(controlLefts));
  const saveResponse=page.waitForResponse(r=>r.url().includes('/api/mark')&&r.request().method()==='PUT'&&r.status()===200,{timeout:10000});
  await firstMark.fill('0');
  await firstMark.blur();
  await saveResponse;
  await page.locator('#saveGrades').click();
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
  const inactiveAbsentStyle=await absentButton.evaluate(el=>({pressed:el.getAttribute('aria-pressed'),background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor,color:getComputedStyle(el).color}));
  check('inactive absence control is visually neutral',inactiveAbsentStyle.pressed==='false'&&inactiveAbsentStyle.background==='rgb(255, 255, 255)',JSON.stringify(inactiveAbsentStyle));
  const saveAbsentResponse=page.waitForResponse(r=>r.url().includes('/api/mark')&&r.request().method()==='PUT'&&r.status()===200,{timeout:10000});
  await absentButton.click();
  await saveAbsentResponse;
  await page.waitForTimeout(80);
  let absentValue=await absentInput.inputValue();
  let absentPressed=await absentButton.getAttribute('aria-pressed');
  check('absence is an explicit selected state',/^(غائب|غائبة|Absent|Absente)$/u.test(absentValue)&&absentPressed==='true',JSON.stringify({absentValue,absentPressed}));
  await page.locator('#saveGrades').click();
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

  const saveBlankResponse=page.waitForResponse(r=>r.url().includes('/api/mark')&&r.request().method()==='PUT'&&r.status()===200,{timeout:10000});
  await absentButton.click();
  await saveBlankResponse;
  await page.waitForTimeout(80);
  let clearedValue=await absentInput.inputValue();
  let clearedPressed=await absentButton.getAttribute('aria-pressed');
  check('absence can be cleared back to not-entered',clearedValue===''&&clearedPressed==='false',JSON.stringify({clearedValue,clearedPressed}));
  await page.locator('#saveGrades').click();
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
  const reportGuard=await page.evaluate(()=>{const backup=structuredClone(state.marks||[]);try{state.marks=[];const ok=renderReports();return{ok:ok!==false,rows:document.querySelectorAll('#sheet tr').length,classRows:document.querySelectorAll('#paperResults tbody tr').length,officialText:(document.querySelector('#officialSheet')?.textContent||'').trim().slice(0,240)}}catch(error){return{ok:false,error:String(error?.message||error)}}finally{state.marks=backup;try{renderReports()}catch{}}});
  check('reports survive a partial teacher mark matrix without a blank page',reportGuard.ok&&reportGuard.rows>0&&reportGuard.classRows>0&&reportGuard.officialText.length>20,JSON.stringify(reportGuard));
  const reportTabs=page.locator('[data-page="reports"] .report-tabs');
  const rb=await reportTabs.boundingBox();
  const tabBoxes=await reportTabs.locator('button').evaluateAll(btns=>btns.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}));
  check('three report tabs stay inside mobile card',Boolean(rb)&&tabBoxes.every(x=>x.x>=rb.x-1&&x.right<=rb.x+rb.width+1),JSON.stringify({container:rb,tabs:tabBoxes}));
  const reportTabIcons=await reportTabs.locator('.npv2-tab-icon').count();
  const reportPrintIcon=await page.locator('#printResult .npv2-button-icon').count();
  check('premium v2 report controls keep canonical icons',reportTabIcons===3&&reportPrintIcon===1,JSON.stringify({reportTabIcons,reportPrintIcon}));

  await page.evaluate(()=>{
    state.marks=Array.isArray(state.marks)?state.marks:[];
    state.marks[0]=Array.isArray(state.marks[0])?state.marks[0]:[];
    state.marks[0][0]='1';
    try{renderReports()}catch{}
    window.__nativePrintCalls=0;
    window.print=()=>{
      window.__nativePrintCalls++;
      window.dispatchEvent(new Event('beforeprint'));
      setTimeout(()=>window.dispatchEvent(new Event('afterprint')),20);
    };
  });
  await page.locator('#printResult').click();
  await page.waitForTimeout(140);
  const singlePrintPending=await page.evaluate(()=>({
    mode:document.body.dataset.print||'',
    calls:window.__nativePrintCalls||0,
    reportText:(document.querySelector('#officialSheet')?.textContent||'').trim().slice(0,180)
  }));
  check('single-pupil Android preview keeps printable report alive after early afterprint',singlePrintPending.mode==='student'&&singlePrintPending.calls===1&&singlePrintPending.reportText.length>20,JSON.stringify(singlePrintPending));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(240);
  const singleCleaned=await page.evaluate(()=>document.body.dataset.print||'');
  check('single-pupil print mode cleans up after returning from native preview',singleCleaned==='',JSON.stringify({mode:singleCleaned}));

  const twoButton=page.locator('#printAllStudents');
  await twoButton.waitFor({state:'visible',timeout:3000});
  await twoButton.click();
  await page.waitForTimeout(140);
  await page.emulateMedia({media:'print'});
  const twoPrintPending=await page.evaluate(()=>{
    const root=document.querySelector('#twoStudentsA4'),pageEl=root?.querySelector('.ta-page'),half=root?.querySelector('.ta-half');
    return{
      mode:document.body.dataset.print||'',
      active:document.body.classList.contains('print-two-a4'),
      display:root?getComputedStyle(root).display:'',
      pageDisplay:pageEl?getComputedStyle(pageEl).display:'',
      text:(root?.textContent||'').trim().slice(0,180),
      halfHeight:half?Math.round(half.getBoundingClientRect().height):0,
      calls:window.__nativePrintCalls||0
    };
  });
  check('two-pupil Android preview keeps the generated A4 content visible',twoPrintPending.mode==='two-a4'&&twoPrintPending.active&&twoPrintPending.display!=='none'&&twoPrintPending.pageDisplay!=='none'&&twoPrintPending.text.length>20&&twoPrintPending.halfHeight>100&&twoPrintPending.calls>=2,JSON.stringify(twoPrintPending));
  await page.emulateMedia({media:'screen'});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(240);
  const twoCleaned=await page.evaluate(()=>({mode:document.body.dataset.print||'',active:document.body.classList.contains('print-two-a4')}));
  check('two-pupil print mode cleans up after returning from native preview',twoCleaned.mode===''&&!twoCleaned.active,JSON.stringify(twoCleaned));

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
