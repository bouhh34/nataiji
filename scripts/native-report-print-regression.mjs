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
 return{window,events,original,calls,alerts,get printCalls(){return printCalls},get finishes(){return finishes}};
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
