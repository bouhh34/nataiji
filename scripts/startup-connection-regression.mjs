import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('async function api('),app.indexOf('function localState('));
function fixture(respond){
 const requests=[],deadlines=[],timers=new Map();let serial=0;
 const ctx=vm.createContext({AbortController,Promise,Error,
  setTimeout(fn,ms){const id=++serial;timers.set(id,fn);if(ms===1500)queueMicrotask(()=>{timers.delete(id);fn()});else deadlines.push(ms);return id},
  clearTimeout(id){timers.delete(id)},
  fetch:async(url,options)=>{requests.push({url,options});return respond(requests.length,options)}
 });
 vm.runInContext(source,ctx);
 return {api:ctx.api,requests,deadlines,timers};
}
const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});

test('a transient startup failure retries with cookies and a longer deadline',async()=>{
 const f=fixture(n=>{if(n===1)throw new TypeError('Failed to fetch');return response(200,{user:{id:'teacher-1'}})});
 assert.equal((await f.api('/api/auth/status')).user.id,'teacher-1');
 assert.equal(f.requests.length,2);
 assert.deepEqual(f.deadlines,[45000,45000]);
 for(const {options} of f.requests){assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store')}
 assert.equal(f.timers.size,0);
});
test('a gateway failure during wakeup is retried',async()=>{
 const f=fixture(n=>response(n===1?503:200,n===1?{}:{user:null}));
 assert.equal((await f.api('/api/auth/status')).user,null);
 assert.equal(f.requests.length,2);
});
test('persistent startup failures stop after two attempts',async()=>{
 const f=fixture(()=>{throw new TypeError('offline')});
 await assert.rejects(f.api('/api/auth/status'),/offline/);
 assert.equal(f.requests.length,2);
});
test('explicit authorization errors and caller cancellation are never retried',async()=>{
 const f=fixture(()=>response(401,{error:'not_authenticated'}));
 await assert.rejects(f.api('/api/auth/status'),e=>e.status===401);
 assert.equal(f.requests.length,1);
 const controller=new AbortController();controller.abort();
 const g=fixture(()=>{throw new Error('cancelled')});
 await assert.rejects(g.api('/api/auth/status',{signal:controller.signal}),/cancelled/);
 assert.equal(g.requests.length,1);
});
test('login and grade writes are never replayed and keep their original deadlines',async()=>{
 for(const [url,method] of [['/api/auth/login','POST'],['/api/state','PUT']]){
  const f=fixture(()=>{throw new TypeError('offline')});
  await assert.rejects(f.api(url,{method,body:'{}'}),/offline/);
  assert.equal(f.requests.length,1);assert.deepEqual(f.deadlines,[30000]);
 }
});
test('an HTML gateway page cannot masquerade as a successful logged-out session',async()=>{
 const f=fixture(n=>n===1?{ok:true,status:200,json:async()=>{throw new SyntaxError('HTML')}}:response(200,{user:{id:'teacher-2'}}));
 assert.equal((await f.api('/api/auth/status')).user.id,'teacher-2');
 assert.equal(f.requests.length,2);
});
