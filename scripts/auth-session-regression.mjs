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


test('login keeps password manager autofill and offers an accessible one-tap password reveal',()=>{
 const beginning=source.indexOf('function loginForm(){');
 const end=source.indexOf('function registerForm(){',beginning);
 assert.ok(beginning>0&&end>beginning);
 const html=vm.runInNewContext(source.slice(beginning,end)+';loginForm()', {tr:(ar)=>ar});
 assert.match(html,/autocomplete="username"/);
 assert.match(html,/name="identifier"/);
 assert.match(html,/رقم الهاتف أو البريد الإلكتروني/);
 assert.match(html,/8 أرقام أو example@email.com/);
 assert.match(html,/autocomplete="current-password"/);
 assert.match(html,/data-auth2-password-toggle/);
 assert.match(html,/aria-pressed="false"/);
 assert.match(html,/maxlength="254"/);
 assert.doesNotMatch(html,/name="email" type="email"/);
});

function logoutFixture(mode='success'){
 const start=source.indexOf('let logoutInFlight=false;');
 const end=source.indexOf('function patchOfficialWording(',start);
 assert.ok(start>0&&end>start,'logout must be isolated for regression');
 const calls=[],renders=[],alerts=[],entries=new Map([
  ['nataiji-data','private pupil grades'],
  ['nataiji-active-user','teacher-1'],
  ['nataiji-offline-school-scope-v1','school-1']
 ]);
 let complete=null,clears=0;
 const button={dataset:{},disabled:false,textContent:'تسجيل الخروج'};
 const ctx=vm.createContext({
  currentUser:{id:'teacher-1'},lastStatus:{user:{id:'teacher-1'},storage:'postgres'},storageMode:'postgres',
  q:selector=>selector==='#logoutBtn'?button:null,
  api:(url,options)=>{
   calls.push({url,method:options.method});
   if(mode==='offline')return Promise.reject(new Error('offline'));
   if(mode==='expired')return Promise.reject(Object.assign(new Error('expired'),{status:401}));
   return new Promise(resolve=>{complete=resolve});
  },
  tr:(ar)=>ar,
  alert:message=>alerts.push(message),
  window:{__nataijiOfflineActive:false,NataijiOfflineResume:{clear(){clears++}}},
  localStorage:{removeItem:key=>entries.delete(key)}
  ,renderAuth:async(...args)=>{renders.push(args)}
 });
 vm.runInContext(source.slice(start,end),ctx);
 ctx.bindLogout();
 return {button,ctx,calls,renders,alerts,entries,complete:()=>complete?.(),clears:()=>clears};
}

test('successful logout is one POST, no second status request, and no duplicate tap',async()=>{
 const f=logoutFixture();
 const first=f.button.onclick();
 const second=f.button.onclick();
 assert.equal(f.calls.length,1,'double tapping must not resend logout');
 assert.equal(f.button.disabled,true);
 f.complete();
 await Promise.all([first,second]);
 assert.deepEqual(f.calls.map(c=>c.url),['/api/auth/logout']);
 assert.equal(f.ctx.currentUser,null);
 assert.equal(f.ctx.lastStatus.user,null);
 assert.equal(f.renders.length,1);
 assert.equal(f.renders[0][0],'login');
 assert.equal(f.renders[0][1],true,'verified logout renders the login gate without another network request');
 assert.equal(f.entries.size,0);
 assert.equal(f.clears(),1);
 assert.equal(f.button.disabled,false);
});

test('offline logout leaves current session and data intact, with retry enabled',async()=>{
 const f=logoutFixture('offline');
 await f.button.onclick();
 assert.equal(f.ctx.currentUser.id,'teacher-1');
 assert.equal(f.entries.get('nataiji-data'),'private pupil grades');
 assert.equal(f.renders.length,0);
 assert.equal(f.alerts.length,1);
 assert.equal(f.button.disabled,false);
});

test('server-confirmed expired session can exit cleanly',async()=>{
 const f=logoutFixture('expired');
 await f.button.onclick();
 assert.equal(f.ctx.currentUser,null);
 assert.equal(f.clears(),1);
 assert.equal(f.renders.length,1);
});

test('phone sign-in accepts exactly eight local digits including Arabic numerals',()=>{
 const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
 const beginning=server.indexOf('const localLoginPhone=');
 const ending=server.indexOf('const configuredOwnerEmail=',beginning);
 assert.ok(beginning>=0&&ending>beginning);
 const parse=vm.runInNewContext(server.slice(beginning,ending)+';localLoginPhone');
 assert.equal(parse('22334455'),'22334455');
 assert.equal(parse('٢٢٣٣٤٤٥٥'),'22334455');
 assert.equal(parse('۲۲۳۳۴۴۵۵'),'22334455');
 for(const invalid of ['+22222334455','2233445','223344556','aaa34455','test@example.com'])assert.equal(parse(invalid),'');
 assert.match(server,/req\.body\?\.identifier\?\?req\.body\?\.email/);
 assert.match(server,/idx\['phone:'\+phone\]/);
 assert.match(server,/user\.phoneVerified/);
 assert.match(server,/localLoginPhone\(user\.phone\)!==phone/);
 assert.match(server,/verifyPassword\(password,user\)/);
});

test('registration uses exactly name, a unified identifier, and password in both languages',()=>{
 const beginning=source.indexOf('function registerForm(){'),end=source.indexOf('function forgotForm(){',beginning);
 assert.ok(beginning>0&&end>beginning);
 const render=language=>vm.runInNewContext(source.slice(beginning,end)+';registerForm()',{tr:(ar,fr)=>language==='fr'?fr:ar});
 const ar=render('ar'),fr=render('fr');
 for(const html of [ar,fr]){
  assert.match(html,/name="name"/);assert.match(html,/name="identifier"/);assert.match(html,/name="password"/);
  assert.match(html,/autocomplete="username"/);assert.match(html,/autocomplete="new-password"/);
  assert.match(html,/minlength="8"/);assert.match(html,/data-auth2-password-toggle/);
  assert.doesNotMatch(html,/name="email" type="email"/);
 }
 assert.match(ar,/رقم الهاتف أو البريد الإلكتروني/);
 assert.match(ar,/دون \+222/);
 assert.match(ar,/استعادة الحساب تكون عبر دعم نتائجي/);
 assert.match(fr,/Numéro de téléphone ou e-mail/);
});
test('phone registration remains a password-protected username, never falsely phone-verified or super-admin',()=>{
 const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
 const block=server.slice(server.indexOf("app.post('/api/auth/register',registerRate,"),server.indexOf("app.post('/api/auth/login',loginRate,"));
 assert.match(block,/phone:phone\|\|''/);
 assert.match(block,/phoneSignInEnabled:!!phone,phoneVerified:false/);
 assert.match(block,/const owner=Boolean\(email&&configuredOwnerEmail\(\)&&email===configuredOwnerEmail\(\)\)/);
 assert.match(block,/idx\[loginKey\]=id/);
 assert.match(server,/user\.phoneVerified!==true&&user\.phoneSignInEnabled!==true/);
});

test('identifier format feedback is bilingual and does not enumerate accounts on input',()=>{
 const beginning=source.indexOf('function authIdentifierFeedback('),end=source.indexOf('function resetToken(){',beginning);
 assert.ok(beginning>0&&end>beginning);
 const parse=vm.runInNewContext(source.slice(beginning,end)+';authIdentifierFeedback',{tr:(ar)=>ar});
 for(const valid of ['22334455','٢٢٣٣٤٤٥٥','professeur@example.com'])assert.equal(parse(valid).valid,true,valid);
 for(const invalid of ['+22222334455','2233445','223344556','name@','123 45678'])assert.equal(parse(invalid).valid,false,invalid);
 assert.match(parse('22334455').message,/سيُتحقق من التسجيل عند إرسال الطلب/);
 assert.doesNotMatch(parse('22334455').message,/غير موجود|متاح|مسجّل بالفعل/);
 assert.match(source,/data-auth2-identifier-feedback role="status" aria-live="polite"/);
 assert.match(source,/authMode==='register'&&\['email_exists','phone_exists'\]/);
 assert.match(source,/createFromLogin\.hidden=false/);
 assert.match(source,/تعذر الدخول\. تحقق من رقم الهاتف/);
});
