import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const source=fs.readFileSync(new URL('../public/auth-access-v2.js',import.meta.url),'utf8');
function fixture(handleStatus){
 const events={};
 const storage=new Map();
 let gate=null,requests=0,starts=0,handler=handleStatus;
 const rootClasses=new Set();
 const makeGate=()=>({
  innerHTML:'',
  remove(){gate=null},
  querySelector(selector){
   if(selector==='[data-auth-retry]'&&this.innerHTML.includes('data-auth-retry')){
    return {addEventListener(_event,cb){this.onclick=cb},click(){this.onclick?.()}}
   }
   return null
  },
  querySelectorAll(){return []}
 });
 const document={
  body:{appendChild(node){gate=node}},
  head:{appendChild(){}},
  addEventListener(){},
  documentElement:{classList:{add(name){rootClasses.add(name)}}},
  createElement(tag){return tag==='style'?{textContent:''}:makeGate()},
  querySelector(selector){return selector==='.auth-gate'?gate:null},
  querySelectorAll(){return []},
 };
 const localStorage={
  getItem(key){return storage.get(key)??null},
  setItem(key,value){storage.set(key,String(value))},
  removeItem(key){storage.delete(key)}
 };
 const window={addEventListener(name,fn){events[name]=fn},NataijiProfessor:{activate(){return false}}};
 const ctx=vm.createContext({
  document,window,localStorage,location:{search:''},currentUser:null,storageMode:'memory',
  startApp:async()=>{starts++},
  api:async url=>{assert.equal(url,'/api/auth/status');requests++;return await handler()},
  MutationObserver:class{observe(){}},
  setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},
  URLSearchParams,console
 });
 vm.runInContext(source,ctx);
 return {window,ctx,events,rootClasses,gate:()=>gate,requests:()=>requests,starts:()=>starts,
  setStatus(fn){handler=fn}};
}

test('reload restores an existing session without rendering any login gate',async()=>{
 const f=fixture(async()=>({user:{id:'teacher-1',name:'Teacher'},storage:'postgres'}));
 f.events.DOMContentLoaded();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.requests(),1);
 assert.equal(f.starts(),1);
 assert.equal(f.gate(),null);
 assert.ok(f.rootClasses.has('nataiji-auth-ready'));
 await f.window.showAuth('login');
 assert.equal(f.requests(),1,'a resumed session must not re-request the login screen');
 assert.equal(f.starts(),1,'the app must not restart twice');
});

test('a legitimately logged-out session renders one login screen',async()=>{
 const f=fixture(async()=>({user:null,storage:'postgres'}));
 await f.window.showAuth('login');
 assert.match(f.gate().innerHTML,/id="auth2Form"/);
 assert.match(f.gate().innerHTML,/nataiji-brand-mark.png/);
 assert.doesNotMatch(f.gate().innerHTML,/data-auth-retry/);
});

test('unreachable server shows retry, not a new login or false logout',async()=>{
 const f=fixture(async()=>{throw new Error('offline')});
 await f.window.showAuth('login');
 assert.match(f.gate().innerHTML,/data-auth-retry/);
 assert.doesNotMatch(f.gate().innerHTML,/id="auth2Form"/);
 assert.equal(f.ctx.currentUser,null);
 assert.ok(f.rootClasses.has('nataiji-auth-ready'));
});

test('a stale auth response cannot reopen login after successful activation',async()=>{
 let release;
 let count=0;
 const f=fixture(async()=>{
  count++;
  if(count===1)return await new Promise(resolve=>{release=resolve});
  return {user:{id:'teacher-2',name:'Teacher'},storage:'postgres'}
 });
 const slower=f.window.showAuth('login');
 await f.window.showAuth('login');
 release({user:null,storage:'postgres'});
 await slower;
 assert.equal(f.requests(),2);
 assert.equal(f.starts(),1);
 assert.equal(f.gate(),null);
});

test('the legacy boot and timeout no longer force the login screen',()=>{
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/__nataijiBootPromise\s*=\s*showAuth\('resume'\)/);
 assert.doesNotMatch(html,/window\.showAuth\?\.\('login'\)/);
 assert.match(html,/نتحقق من جلستك/);
});
