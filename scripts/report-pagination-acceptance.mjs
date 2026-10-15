// Isolated real-browser/PDF checks: uses synthetic pupils, never a live account.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=fileURLToPath(new URL('../public/',import.meta.url));
const output=process.env.NATAIJI_PDF_QA_DIR;
if(output)await fs.mkdir(output,{recursive:true});
const html=(await fs.readFile(path.join(root,'index.html'),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),name=url.pathname;
  const file=path.resolve(root,'.'+name);
  if(name!=='/'&&!file.startsWith(root))throw Error('outside public');
  res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':name.endsWith('.png')?'image/png':'text/html');
  res.end(name==='/'?html:await fs.readFile(file));
 }catch{res.statusCode=404;res.end()}
}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:393,height:850}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(()=>{
  document.documentElement.classList.add('nataiji-auth-ready');
  window.state={school:'النجاح',schoolFr:'Nejah',region:'عرفات',regionFr:'Arafat',inspection:'مال',inspectionFr:'Mal',year:'2026 - 2027',className:'2AF',classNameFr:'2AF',term:'الفصل الأول',terms:['الفصل الأول','الفصل الثاني','الفصل الثالث'],subjects:[['التربية الإسلامية','','Éducation islamique',30],['اللغة العربية','','Langue arabe',50],['الحساب','','Calcul',40],['التربية المدنية','','Éducation civique',15],['التربية الفنية','','Éducation artistique',15],['اللغة الفرنسية','','Français',40],['الرياضة','','Éducation physique',10]],pupils:Array.from({length:3},(_,i)=>[''+(i+1),'تلميذ '+(i+1),i===1?'female':'male','','Pupil '+(i+1)]),marks:Array.from({length:3},(_,i)=>[13+i,16,12,12,12,30,8])};
  for(const name of ['cleanMark','calc','ranks','bindMarks','renderMobileScores','renderReports','render','renderDashboard'])window[name]=()=>{};
  window.dirtyCalls=0;window.markDirty=()=>window.dirtyCalls++;
  document.querySelector('#student').innerHTML='<option value="0">Pupil 1</option>';
  document.querySelector('[data-page="reports"]').classList.remove('hidden');
  document.querySelector('#subjectPicker').innerHTML='<option value="0">Islamic</option>';
  window.selectorClasses=()=>[];window.save=()=>{throw Error('Printing must not save')};window.setView=name=>document.querySelectorAll('.view').forEach(view=>view.classList.toggle('hidden',view.dataset.page!==name));
  window.print=()=>{};
 });
 for(const file of ['teacher-timetable-v1.js','final-grade-entry.js','official-bilingual-v1.js','class-report-layout-v2.js','two-students-a4-v1.js','grade-mobile-ui-v1.js','report-mobile-preview-v1.js','report-final-polish-v1.js','student-pdf-number-direction-v1.js'])await page.addScriptTag({url:'/'+file});
 await page.waitForTimeout(1600);
 const originalMarks=await page.evaluate(()=>JSON.stringify(state.marks));
 async function inspect(pdf,label,expectedPages){
  if(output)await fs.writeFile(path.join(output,label+'.pdf'),pdf);
  const doc=await getDocument({data:new Uint8Array(pdf),useSystemFonts:true}).promise;
  assert.equal(doc.numPages,expectedPages,label+' page count');
  const texts=[];
  for(let n=1;n<=doc.numPages;n++){
   const p=await doc.getPage(n),[,,width,height]=p.view;
   assert.ok(height>width,label+' must be portrait');
   texts.push((await p.getTextContent()).items.map(item=>item.str).join(' '));
  }
  if(label.includes('student')){assert.match(texts[0],/Pupil 1/);assert.match(texts[0],/Total/);assert.match(texts[0],/Surveillant/)}
  if(label.includes('two-a4')){
   assert.match(texts[0],/Pupil 3/);assert.match(texts[0],/Pupil 2/);assert.doesNotMatch(texts[0],/Pupil 1/);
   assert.equal((texts[0].match(/Surveillant/g)||[]).length,2,'two complete signature zones');
   assert.match(texts[1],/Pupil 1/);assert.match(texts[1],/Surveillant/);
  }
  await doc.destroy();return texts;
 }
 const expected={student:1,'two-a4':2,class:1,list:1},webTexts={};
 for(const [mode,count] of Object.entries(expected)){
  await page.emulateMedia({media:'screen'});
  await page.evaluate(mode=>{delete document.body.dataset.print;document.body.classList.remove('print-two-a4');if(mode==='two-a4')document.querySelector('#printAllStudents').click();else document.body.dataset.print=mode},mode);
  await page.waitForTimeout(100);
  await page.emulateMedia({media:'print'});
  webTexts[mode]=await inspect(await page.pdf({format:'A4',printBackground:true}), 'web-'+mode,count);
 }
 await page.emulateMedia({media:'screen'});
 // Exercise RC4's JavaScript bridge and render the exact HTML sent to printHtml.
 await page.evaluate(()=>{
  window.nativeCalls=[];
  window.Capacitor={isNativePlatform:()=>true,isPluginAvailable:()=>true,nativePromise:async(plugin,method,args)=>{window.nativeCalls.push({plugin,method,args})}};
  window.nataijiFinishPrintLifecycle=()=>{delete document.body.dataset.print;document.body.classList.remove('print-two-a4')};
 });
 await page.addScriptTag({url:'/native-report-print.js'});
 for(const [mode,count] of Object.entries(expected)){
  await page.evaluate(async mode=>{document.body.dataset.print=mode;document.body.classList.toggle('print-two-a4',mode==='two-a4');await window.print();await window.print()},mode);
  const call=await page.evaluate(()=>window.nativeCalls.at(-1));
  assert.equal(call.plugin,'NataijiPrint');assert.equal(call.method,'printHtml');assert.equal(call.args.landscape,false);
  assert.ok(!call.args.html.includes('<script'),'isolated native document must not execute app code');
  assert.ok(!call.args.html.includes('id="saveGrades"'),'only report content enters native document');
  const nativePage=await browser.newPage({javaScriptEnabled:false});
  await nativePage.setContent(call.args.html,{waitUntil:'networkidle'});
  const nativeTexts=await inspect(await nativePage.pdf({format:'A4',printBackground:true}),'native-'+mode,count);
  assert.deepEqual(nativeTexts,webTexts[mode],'native and web report text must agree');
  await nativePage.close();
  await page.evaluate(()=>window.dispatchEvent(new Event('nataiji-native-print-finished')));
  assert.equal(await page.evaluate(()=>document.body.dataset.print),undefined);
 }
 assert.equal(await page.evaluate(()=>window.nativeCalls.length),4,'busy guard prevents duplicate native jobs');
 assert.equal(await page.evaluate(()=>JSON.stringify(state.marks)),originalMarks,'printing must not write grades');

 // Timetable: all eleven periods and unsaved current input values survive printing.
 await page.evaluate(()=>{
  document.querySelector('#teacherTimetableMoreBtn').click();
  const subject=document.querySelector('#teacherTimetable input[data-field="subject"]');
  subject.value='Custom current lesson';subject.dispatchEvent(new Event('input',{bubbles:true}));
 });
 async function timetableCheck(pdf,label){
  if(output)await fs.writeFile(path.join(output,label+'.pdf'),pdf);
  const doc=await getDocument({data:new Uint8Array(pdf),useSystemFonts:true}).promise;
  assert.equal(doc.numPages,1,label+' all periods fit on one page');
  const p=await doc.getPage(1),[,,width,height]=p.view;
  assert.ok(width>height,label+' landscape');
  const text=(await p.getTextContent()).items.map(item=>item.str).join(' ');
  assert.match(text,/Custom current lesson/);assert.match(text,/11/);assert.match(text,/Production/);
  await doc.destroy();return text;
 }
 await page.emulateMedia({media:'print'});
 const timetableText=await timetableCheck(await page.pdf({format:'A4',printBackground:true}),'web-timetable');
 await page.emulateMedia({media:'screen'});
 await page.evaluate(()=>window.print());
 const timetableCall=await page.evaluate(()=>window.nativeCalls.at(-1));
 assert.equal(timetableCall.method,'printHtml');assert.equal(timetableCall.args.landscape,true);
 const timetablePage=await browser.newPage({javaScriptEnabled:false});
 await timetablePage.setContent(timetableCall.args.html,{waitUntil:'networkidle'});
 assert.equal(await timetableCheck(await timetablePage.pdf({format:'A4',printBackground:true}),'native-timetable'),timetableText);
 await timetablePage.close();
 await page.evaluate(()=>{window.dispatchEvent(new Event('nataiji-native-print-finished'));document.querySelector('#teacherTimetable').classList.add('hidden')});
 assert.equal(await page.evaluate(()=>document.querySelector('#teacherTimetable input[data-field="subject"]').value),'Custom current lesson');
 assert.equal(await page.evaluate(()=>JSON.stringify(state.marks)),originalMarks);
 // Entry labels may change language, but reports and persisted values must not.
 await page.emulateMedia({media:'screen'});
 const localeChecks=await page.evaluate(async()=>{
  const wait=()=>new Promise(r=>setTimeout(r,100));
  state.marks[0][0]='غائب';state.marks[1][0]='غائبة';state.marks[2][0]='';
  window.nataijiRefreshOfficialReports();
  const report=document.querySelector('#officialSheet').textContent;
  const before=JSON.stringify(state.marks);window.dirtyCalls=0;
  localStorage.setItem('nataiji-lang','fr');renderMobileScores();render();await wait();
  const inputs=()=>[...document.querySelectorAll('#mobileScores .mobile-mark')];
  const buttons=()=>[...document.querySelectorAll('#mobileScores .absent-btn')];
  const result={labels:buttons().map(b=>b.textContent),values:inputs().map(i=>i.value),placeholder:inputs()[2].placeholder,unchanged:before===JSON.stringify(state.marks),dirtyOnRender:window.dirtyCalls,reportUnchanged:report===document.querySelector('#officialSheet').textContent};
  inputs()[0].dispatchEvent(new Event('blur'));await wait();result.storedAfterBlur=state.marks[0][0];
  buttons()[0].click();result.cleared=state.marks[0][0];buttons()[0].click();result.restored=state.marks[0][0];result.displayAfterToggle=inputs()[0].value;
  inputs()[2].value='31';inputs()[2].dispatchEvent(new Event('change',{bubbles:true}));result.invalidStored=state.marks[2][0];
  inputs()[2].value='15';inputs()[2].dispatchEvent(new Event('change',{bubbles:true}));result.numericStored=state.marks[2][0];
  localStorage.setItem('nataiji-lang','ar');renderMobileScores();render();await wait();result.arabic=buttons().map(b=>b.textContent);
  return result;
 });
 assert.deepEqual(localeChecks,{labels:['Abs','Abs','Abs'],values:['Abs','Abs',''],placeholder:'Note ou Abs',unchanged:true,dirtyOnRender:0,reportUnchanged:true,storedAfterBlur:'غائب',cleared:'',restored:'غائب',displayAfterToggle:'Abs',invalidStored:'',numericStored:15,arabic:['غائب','غائبة','غائب']});
 assert.deepEqual(errors,[],'no browser errors');
 console.log('PASS: 10 web/native PDF cases, complete page contents, native lifecycle, unchanged grades/reports, French/Arabic absence and numeric validation.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
