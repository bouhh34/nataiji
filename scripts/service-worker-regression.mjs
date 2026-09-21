import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const code=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function fixture(fetchImpl,cached){
 const handlers={},writes=[],waits=[];
 const ctx=vm.createContext({URL,Response,location:{origin:'https://example.test'},self:{addEventListener:(name,fn)=>handlers[name]=fn},fetch:fetchImpl,caches:{open:async()=>({put:async(...args)=>writes.push(args)}),match:async request=>cached(request)}});
 vm.runInContext(code,ctx);
 return {writes,async request(path,mode='cors'){let response;handlers.fetch({request:{method:'GET',url:'https://example.test'+path,mode},respondWith:p=>response=p,waitUntil:p=>waits.push(p)});const result=await response;await Promise.all(waits);return result}};
}
test('failed HTTP responses never poison the asset cache',async()=>{
 const f=fixture(async()=>new Response('unavailable',{status:503}),()=>null);assert.equal((await f.request('/app.js')).status,503);assert.equal(f.writes.length,0);
});
test('offline JavaScript never receives HTML fallback',async()=>{
 const f=fixture(async()=>{throw Error('offline')},r=>r==='/'?new Response('<html>shell</html>'):null);assert.equal((await f.request('/missing.js')).type,'error');assert.equal(await(await f.request('/','navigate')).text(),'<html>shell</html>');
});
test('API and health responses bypass service-worker cache',async()=>{
 const f=fixture(()=>{throw Error('must not fetch')},()=>null);assert.equal(await f.request('/api/state'),undefined);assert.equal(await f.request('/health'),undefined);
});
test('valid assets are cached',async()=>{
 const f=fixture(async()=>new Response('script'),()=>null);assert.equal(await(await f.request('/app.js?v=31')).text(),'script');assert.equal(f.writes.length,1);
});
