import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const source=fs.readFileSync(new URL('../public/native-report-print.js',import.meta.url),'utf8');
function fixture(cap){
 let finishes=0,printCalls=0;const calls=[],alerts=[],events={},original=()=>{printCalls++};
 const window={Capacitor:cap,print:original,addEventListener:(name,fn)=>events[name]=fn,nataijiFinishPrintLifecycle:()=>finishes++};
 if(cap?.nativePromise)cap.nativePromise=async(...args)=>{calls.push(args);return{}};
 const ctx=vm.createContext({window,alert:t=>alerts.push(t),console,localStorage:{getItem:()=>null},document:{body:{dataset:{},classList:{remove(){}}}},Event});
 vm.runInContext(source,ctx);
 return{window,ctx,events,original,calls,alerts,get printCalls(){return printCalls},get finishes(){return finishes}};
}
const nativeCap=()=>({isNativePlatform:()=>true,getPlatform:()=>'android',PluginHeaders:[{name:'NataijiPrint'}],nativePromise:()=>{}});
test('web browser printing retains its original print function',async()=>{const f=fixture();assert.equal(f.window.print,f.original);assert.equal(await f.window.nataijiPrintDocument({html:'<p>School</p>'}),false)});
test('teacher printing reaches native PrintManager and keeps the document until completion',async()=>{
 const f=fixture(nativeCap());await f.window.print();assert.deepEqual(f.calls.map(c=>[c[0],c[1]]),[['NataijiPrint','print']]);assert.equal(f.finishes,0);f.events['nataiji-native-print-finished']();assert.equal(f.finishes,1);
});
test('professor report contents and orientation reach the native document renderer',async()=>{
 const f=fixture(nativeCap()),html='<html><body>مريم — 16 / 20</body></html>';
 assert.equal(await f.window.nataijiPrintDocument({html,title:'Classe 5AF',landscape:true}),true);
 const [name,method,args]=f.calls[0];assert.equal(name,'NataijiPrint');assert.equal(method,'printHtml');assert.equal(args.html,html);assert.equal(args.title,'Classe 5AF');assert.equal(args.landscape,true);assert.equal(f.finishes,0);
});
test('old binaries show an actionable update message rather than silently calling WebView print',async()=>{
 const f=fixture({getPlatform:()=>'android',PluginHeaders:[]});f.window.print();await f.window.nataijiPrintDocument({html:'<p>Professor</p>'});assert.equal(f.printCalls,0);assert.equal(f.alerts.length,2);assert.match(f.alerts[0],/Google Play/);assert.equal(f.finishes,2);
});
test('late bridge capabilities are detected at click time',async()=>{
 const cap={getPlatform:()=>'android',PluginHeaders:[],nativePromise:()=>{}},f=fixture(cap);cap.PluginHeaders.push({name:'NataijiPrint'});await f.window.print();assert.equal(f.calls.length,1);assert.equal(f.alerts.length,0);
});
test('native failures produce visible recovery and clear print state',async()=>{
 const cap=nativeCap(),f=fixture(cap);cap.nativePromise=async()=>{throw Error('print unavailable')};await f.window.print();assert.equal(f.printCalls,0);assert.equal(f.alerts.length,1);assert.equal(f.finishes,1);
});
test('every professor report routes its assembled HTML through the native bridge',()=>{
 const code=fs.readFileSync(new URL('../public/professor-v2.js',import.meta.url),'utf8');
 const fn=code.slice(code.indexOf('function printProfessorDocument('),code.indexOf('function professorStudentBulletinBody('));
 for(const opts of [{className:'1AS',landscape:true},{copyBodies:['<p>Alice</p>','<p>مريم</p>'],singlePages:true}]){
  let output,removed=0;const frame={style:{},setAttribute(){},remove(){removed++}};
  Object.defineProperty(frame,'contentDocument',{get(){throw Error('Native path must not print an iframe')}});
  const ctx=vm.createContext({window:{Capacitor:{isNativePlatform:()=>true},nataijiPrintDocument:args=>{output=args}},document:{createElement:()=>frame,body:{appendChild(){}}},fr:()=>false,esc:s=>String(s??''),professorOfficialHeader:()=>'<header>School</header>',professorSignatures:()=>'<footer>Signature</footer>'});
  vm.runInContext(fn,ctx);ctx.printProfessorDocument('كشف','<p>مريم — 16 / 20</p>',opts);assert.equal(removed,1);assert.ok(output.html.includes('Signature'));assert.equal(output.landscape,!!opts.landscape);assert.ok(output.html.includes('مريم'));
 }
});

// Regression: timetable paper orientation must never spill into pupil/class bulletins.
test('timetable landscape uses a named print page, preserving portrait RC4 reports',()=>{
 const timetable=fs.readFileSync(new URL('../public/teacher-timetable-v1.css',import.meta.url),'utf8');
 const batch=fs.readFileSync(new URL('../public/two-students-a4-v1.js',import.meta.url),'utf8');
 assert.match(timetable,/@page\s+nataiji-timetable\s*\{\s*size:A4 landscape/i);
 assert.match(timetable,/#teacherTimetable\{page:nataiji-timetable!important\}/);
 assert.doesNotMatch(timetable,/@page\s*\{\s*size:A4 landscape/i);
 assert.match(batch,/@page\s*\{\s*size:A4 portrait/i);
});
test('class report portal keeps portrait width for up to nine subjects and landscape for ten or more',()=>{
 const code=fs.readFileSync(new URL('../public/final-grade-entry.js',import.meta.url),'utf8');
 assert.match(code,/data-portal-type="class"\] #printPortal\{width:202mm/);
 assert.match(code,/data-nataiji-class-wide="1"\] #printPortal\{width:287mm/);
 assert.match(code,/state\?\.subjects\?\.length\|\|0\)>=10\?'@page\{size:A4 landscape/);
});
test('French Abs appears only in grade entry while report wording remains unchanged',()=>{
 const mobile=fs.readFileSync(new URL('../public/grade-mobile-ui-v1.js',import.meta.url),'utf8');
 const grade=fs.readFileSync(new URL('../public/final-grade-entry.js',import.meta.url),'utf8');
 assert.match(mobile,/if\(fr\(\)\)return 'Abs'/);
 assert.match(mobile,/value="\$\{esc\(displayMark\(value\)\)\}"/);
 assert.match(grade,/const markDisplay=v=>isFr\(\)&&isAbsent\(v\)\?'Abs':v/);
 assert.match(grade,/fr\?'Absente':'غائبة'/);
});

test('Android print orientation follows actual document, never the unrelated timetable CSS',async()=>{
 const f=fixture(nativeCap());f.ctx.state={subjects:Array.from({length:12},(_,i)=>['Subject '+i])};
 f.ctx.document.body.dataset.print='class';await f.window.print();
 assert.equal(f.calls[0][2].landscape,true);
 f.events['nataiji-native-print-finished']();
 f.ctx.document.body.dataset.print='student';await f.window.print();
 assert.equal(f.calls[1][2].landscape,false);
 f.events['nataiji-native-print-finished']();
 f.ctx.document.body.dataset.print='class';f.ctx.state.subjects.length=8;await f.window.print();
 assert.equal(f.calls[2][2].landscape,false);
 f.events['nataiji-native-print-finished']();
 f.ctx.document.querySelector=()=>({});await f.window.print();
 assert.equal(f.calls[3][2].landscape,true);
});
test('Android plugin accepts print landscape instead of forcing portrait',()=>{
 const java=fs.readFileSync(new URL('../native/android/NataijiPrintPlugin.java',import.meta.url),'utf8');
 assert.match(java,/startPrint\(getBridge\(\)\.getWebView\(\), "Nataiji", call\.getBoolean\("landscape", false\), call\)/);
});
