import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const read=path=>fs.readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js'),sw=read('sw.js');

test('all application entrypoint scripts download without blocking the HTML parser, in dependency order',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)><\/script>/g)]
  .map(match=>match[1]).filter(attributes=>/\bsrc=/.test(attributes));
 assert.ok(scripts.length>=35);
 assert.ok(scripts.every(attributes=>/\bdefer\b/.test(attributes)));
 const names=scripts.map(attributes=>attributes.match(/src="([^"]+)"/)?.[1]);
 for(const [first,second] of [['/app.js?v=54','/auth-access-v2.js?v=56'],['/grade-journal.js?v=1','/professor-v2.js?v=89'],['/auth-access-v2.js?v=56','/luxury-ui-v1.js?v=6']]){
  assert.ok(names.indexOf(first)>=0&&names.indexOf(second)>names.indexOf(first),first+' should precede '+second);
 }
 const cacheAssets=JSON.parse(sw.match(/const ASSETS = ([\s\S]*?);/)[1]);
 for(const name of names)assert.ok(cacheAssets.includes(name),'offline shell missing '+name);
});

test('ranking remains equal to the historical competition ranking, including ties',()=>{
 const source=app.slice(app.indexOf('function ranks(){'),app.indexOf('\nfunction setView('));
 assert.ok(source.startsWith('function ranks(){'));
 const run=values=>Array.from(vm.runInNewContext('const state={pupils:values.map(()=>({}))}; const calc=i=>({avg:values[i]}); '+source+';ranks()', {values}));
 for(const values of [[],[0],[10,10,10],[0,10,10,16,0,17],Array.from({length:600},(_,i)=>((i*73)%41)/2)]){
  assert.deepEqual(run(values),values.map(value=>1+values.filter(other=>other>value).length));
 }
});

test('reports are prepared on demand and still rendered before printing',()=>{
 assert.match(app,/if\(!document\.querySelector\('\[data-page="reports"\]'\)\?\.classList\.contains\('hidden'\)\)renderReports\(\)/);
 assert.match(app,/if\(name==='reports'\)renderReports\(\)/);
 const print=app.slice(app.indexOf('function printOnly('),app.indexOf('function importCsv('));
 assert.ok(print.includes('renderReports();'));
});

test('cached home page appears within the bounded online refresh window',async()=>{
 const listeners={},waits=[],writes=[];
 let completeNetwork;
 const cache={match:async()=>new Response('offline home',{headers:{'Content-Type':'text/html'}}),put:async(request,response)=>writes.push([request,response])};
 vm.runInNewContext(sw,{URL,Response,setTimeout,clearTimeout,location:{origin:'https://nataiji.test'},
  caches:{open:async()=>cache},
  fetch:()=>new Promise(resolve=>{completeNetwork=resolve}),
  self:{addEventListener:(name,listener)=>listeners[name]=listener}});
 let promised;
 listeners.fetch({request:{method:'GET',url:'https://nataiji.test/',mode:'navigate'},respondWith:response=>{promised=response},waitUntil:p=>waits.push(p)});
 assert.ok(promised);
 const result=await Promise.race([promised.then(async r=>r.text()),new Promise(resolve=>setTimeout(()=>resolve('timed out'),2200))]);
 assert.equal(result,'offline home','cached startup must not wait indefinitely for network');
 assert.equal(typeof completeNetwork,'function');
 completeNetwork(new Response('refreshed home',{headers:{'Content-Type':'text/html'}}));
 await Promise.all(waits);
 assert.equal(writes.length,1,'the refresh should still update the cache');
});

test('teacher free-year promise is bilingual and does not advertise paid service in 2026–2027',()=>{
 const plan=read('commercial-foundation-v1.js');
 assert.match(plan,/2026–2027/);
 assert.match(plan,/جميع وظائف نتائجي مجانية للمعلمين والأساتذة الحاليين والجدد/);
 assert.match(plan,/Toutes les fonctionnalités sont gratuites/);
});


test('lightweight table updates do not rewrite unchanged cells or loop on their own mutations',()=>{
 const stability=read('app-stability-v1.js');
 const start=stability.indexOf('function callNo('),end=stability.indexOf('let timer=null;',start);
 assert.ok(start>0&&end>start);
 const makeCell=()=>{let current='',writes=0;return{get textContent(){return current},set textContent(v){current=v;writes++},get writes(){return writes}}};
 const title=makeCell(),number=makeCell(),st={pupils:[['1234','Pupil','','','','3']]};
 const ctx=vm.createContext({state:st,localStorage:{getItem:()=> 'ar'},q:()=>({cells:[title]}),qa:()=>[{cells:[number]}]});
 vm.runInContext(stability.slice(start,end),ctx);
 ctx.syncAdminCallNumbers();
 assert.equal(title.writes,1);
 assert.equal(number.writes,1);
 ctx.syncAdminCallNumbers();
 assert.equal(title.writes,1,'repeated renders should not rewrite the header');
 assert.equal(number.writes,1,'repeated renders should not rewrite the pupil cells');
 st.pupils[0][5]='4';
 ctx.syncAdminCallNumbers();
 assert.equal(number.textContent,'4');
 assert.equal(number.writes,2,'changed values should still update immediately');
 assert.match(stability,/if\(callNumberSyncQueued\)return/);
});

test('login, session restore and UI updates ship as versioned assets in the current offline bundle',()=>{
 const css=read('auth.css'),login=read('auth-access-v2.js'),stability=read('app-stability-v1.js');
 for(const asset of ['/auth.css?v=5','/auth-access-v2.js?v=56','/app-stability-v1.js?v=7']){
  assert.ok(html.includes(asset),'page missing '+asset);
  assert.ok(sw.includes(asset),'offline cache missing '+asset);
 }
 assert.match(login,/lastStatus=\{\.\.\.\(lastStatus\|\|\{\}\),user:null,storage:storageMode\}/);
 assert.match(css,/auth2-password-toggle/);
 assert.match(stability,/callNumberSyncQueued/);
});

test('session and login downloads receive preload priority with unchanged execution order',()=>{
 const paths=['/offline-session-v1.js?v=3','/app.js?v=54','/auth-access-v2.js?v=56'];
 const positions=[];
 for(const path of paths){
  assert.ok(html.includes('<link rel="preload" href="'+path+'" as="script" />'));
  const script='<script src="'+path+'" defer></script>';
  assert.ok(html.includes(script),'original deferred script remains');
  positions.push(html.indexOf(script));
 }
 assert.ok(positions[0]<positions[1]&&positions[1]<positions[2]);
});

test('professor add-student action is a clear full-width mobile primary button, scoped by mode',()=>{
 const css=read('professor-v2.css'),professor=read('professor-v2.js');
 assert.match(css,/\.nataiji-professor-mode #pv2AddStudent\.prof-add-student/);
 assert.match(css,/flex:1 1 100%!important/);
 assert.match(css,/min-height:59px!important/);
 assert.match(css,/focus-visible/);
 assert.match(professor,/canManageRoster\?\x60/);
 assert.match(professor,/id="pv2AddStudent"/);
 assert.match(professor,/if\(canManageRoster\)\{q\('#pv2AddStudent',el\)\.onclick=/);
 assert.match(html,/professor-v2\.css\?v=50/);
 assert.match(sw,/professor-v2\.css\?v=50/);
});
