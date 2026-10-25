import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const code=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function fixture(fetchImpl,cached){
 const handlers={},writes=[],waits=[];
 const ctx=vm.createContext({URL,Response,setTimeout,clearTimeout,location:{origin:'https://example.test'},self:{addEventListener:(name,fn)=>handlers[name]=fn},fetch:fetchImpl,caches:{open:async()=>({put:async(...args)=>writes.push(args),match:async request=>cached(request)}),match:async request=>cached(request)}});
 vm.runInContext(code,ctx);
 return {writes,async request(path,mode='cors'){let response;handlers.fetch({request:{method:'GET',url:'https://example.test'+path,mode},respondWith:p=>response=p,waitUntil:p=>waits.push(p)});const result=await response;await Promise.all(waits);return result}};
}
test('failed HTTP responses never poison the asset cache',async()=>{
 const f=fixture(async()=>new Response('unavailable',{status:503}),()=>null);assert.equal((await f.request('/app.js')).status,503);assert.equal(f.writes.length,0);
});
test('offline JavaScript never receives HTML fallback',async()=>{
 const f=fixture(async()=>{throw Error('offline')},r=>r==='/'?new Response('<html>shell</html>'):null);assert.equal((await f.request('/app.js')).type,'error');assert.equal(await(await f.request('/','navigate')).text(),'<html>shell</html>');
});
test('API and health responses bypass service-worker cache',async()=>{
 const f=fixture(()=>{throw Error('must not fetch')},()=>null);assert.equal(await f.request('/api/state'),undefined);assert.equal(await f.request('/health'),undefined);
});
test('valid assets are cached',async()=>{
 const f=fixture(async()=>new Response('script'),()=>null);assert.equal(await(await f.request('/app.js?v=31')).text(),'script');assert.equal(f.writes.length,1);
});

test('repeat exact-version assets use cache without a network request',async()=>{
 const f=fixture(()=>{throw Error('must not fetch')},r=>r.url?.endsWith('/app.js?v=41')?new Response('cached script'):null);
 assert.equal(await(await f.request('/app.js?v=41')).text(),'cached script');assert.equal(f.writes.length,0);
});
test('a new asset version cannot use an older cached version',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return new Response('new script')},r=>r.url?.endsWith('?v=40')?new Response('old script'):null);
 assert.equal(await(await f.request('/app.js?v=41')).text(),'new script');assert.equal(calls,1);
});
test('HTML responses do not poison JavaScript cache',async()=>{
 const f=fixture(async()=>new Response('<html>fallback</html>',{headers:{'Content-Type':'text/html'}}),()=>null);
 await f.request('/app.js');assert.equal(f.writes.length,0);
});
test('unrelated navigation is not cached',async()=>{
 const f=fixture(()=>{throw Error('must not fetch')},()=>null);
 assert.equal(await f.request('/private/export','navigate'),undefined);
});
test('temporary server failure returns the cached home',async()=>{
 const f=fixture(async()=>new Response('unavailable',{status:503}),r=>r.url?.endsWith('/')?new Response('saved home'):null);
 assert.equal(await(await f.request('/','navigate')).text(),'saved home');
});
test('new service worker becomes active after the complete asset cache is ready',async()=>{
  const handlers={}; let precacheResolve; let activated=false; let wait;
  const ready=new Promise(resolve=>{precacheResolve=resolve});
  const context=vm.createContext({
    URL, location:{origin:'https://example.test'},
    self:{addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{activated=true}},
    caches:{open:async()=>({addAll:async()=>ready})}
  });
  vm.runInContext(code,context);
  handlers.install({waitUntil:p=>{wait=p}});
  await Promise.resolve();
  assert.equal(activated,false,'a partial cache must never be activated');
  precacheResolve();
  await wait;
  assert.equal(activated,true,'a complete release should not remain waiting in Android WebView');
});
test('failed offline precache does not take over the current working release',async()=>{
  const handlers={};let activated=false;let wait;
  const context=vm.createContext({
    URL,location:{origin:'https://example.test'},
    self:{addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{activated=true}},
    caches:{open:async()=>({addAll:async()=>{throw Error('missing asset')}})}
  });
  vm.runInContext(code,context);
  handlers.install({waitUntil:p=>{wait=p}});
  await assert.rejects(wait,/missing asset/);
  assert.equal(activated,false);
});

test('all entrypoint scripts and styles are precached with their exact version',()=>{
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const assets=JSON.parse(code.match(/const ASSETS = ([\s\S]*?);/)[1]);
 for(const [,url] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g))assert.ok(assets.includes(url),url);
 for(const url of assets)assert.ok(fs.existsSync(new URL('../public/'+(url==='/'?'index.html':url.slice(1).split('?')[0]),import.meta.url)),url);
});

test('online navigation prefers current HTML to an old cached editor',async()=>{
 const f=fixture(async()=>new Response('current teacher editor'),()=>new Response('old teacher editor'));
 assert.equal(await(await f.request('/','navigate')).text(),'current teacher editor');
});
