import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const auth=fs.readFileSync(new URL('../public/auth-access-v2.js',import.meta.url),'utf8');
const source=auth.slice(auth.indexOf('let offlineRevalidationBusy='),auth.indexOf("window.addEventListener('beforeprint'"));
function fixture(api){
 const events={},intervals=[],clears=[],activations=[],logins=[];
 const ctx=vm.createContext({api,within:p=>p,authRenderSeq:1,currentUser:{id:'a'},lastStatus:null,navigator:{onLine:true},document:{hidden:false,addEventListener:()=>{}},window:{__nataijiOfflineActive:true,NataijiOfflineResume:{clear:()=>clears.push(true),remember:()=>{}},addEventListener:(key,fn)=>events[key]=fn},setInterval:(fn,ms)=>intervals.push({fn,ms}),accountActivate:async user=>activations.push(user),renderAuth:async mode=>logins.push(mode)});
 vm.runInContext(source,ctx);
 return {ctx,events,intervals,clears,activations,logins,run:()=>vm.runInContext('revalidateOfflineSession()',ctx)};
}
test('server recovers after first reconnect failure without another online event',async()=>{
 let calls=0;const f=fixture(async()=>{if(++calls===1)throw Error('server unavailable');return {user:{id:'a'}}});
 await f.run();assert.equal(f.ctx.window.__nataijiOfflineActive,true);assert.equal(f.clears.length,0);
 assert.equal(f.intervals[0].ms,30000);f.intervals[0].fn();await new Promise(setImmediate);
 assert.equal(f.activations.length,1);assert.equal(f.ctx.window.__nataijiOfflineActive,false);
});
test('overlapping revalidation events send one request',async()=>{
 let resolve,calls=0;const f=fixture(()=>{calls++;return new Promise(r=>resolve=r)});
 const pending=f.run();await f.run();assert.equal(calls,1);resolve({user:{id:'a'}});await pending;assert.equal(f.activations.length,1);
});
test('a delayed response never switches a newly selected account',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>resolve=r));const pending=f.run();f.ctx.currentUser={id:'b'};f.ctx.authRenderSeq++;resolve({user:{id:'a'}});await pending;
 assert.equal(f.activations.length,0);assert.equal(f.logins.length,0);assert.equal(f.ctx.currentUser.id,'b');
});
test('revoked session requests login but temporary failures preserve offline access',async()=>{
 const f=fixture(async()=>{throw Object.assign(Error('revoked'),{status:403})});await f.run();assert.equal(f.clears.length,1);assert.deepEqual(f.logins,['login']);
});
test('disconnected and hidden devices do not poll the server',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return {user:{id:'a'}}});f.ctx.navigator.onLine=false;await f.run();assert.equal(calls,0);
 f.ctx.navigator.onLine=true;f.ctx.document.hidden=true;f.intervals[0].fn();await new Promise(setImmediate);assert.equal(calls,0);
});
