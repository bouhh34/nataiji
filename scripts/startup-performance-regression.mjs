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
 for(const [first,second] of [['/app.js?v=53','/auth-access-v2.js?v=48'],['/grade-journal.js?v=1','/professor-v2.js?v=83'],['/auth-access-v2.js?v=48','/luxury-ui-v1.js?v=6']]){
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

test('cached home page appears immediately even when the refresh request is slow',async()=>{
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
 const result=await Promise.race([promised.then(async r=>r.text()),new Promise(resolve=>setTimeout(()=>resolve('timed out'),150))]);
 assert.equal(result,'offline home','cached startup must not wait for network');
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
