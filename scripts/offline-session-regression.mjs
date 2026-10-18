import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const source=fs.readFileSync(new URL('../public/offline-session-v1.js',import.meta.url),'utf8');
function fixture(){
 const entries=new Map(),localStorage={
  getItem:key=>entries.get(key)||null,
  setItem:(key,val)=>entries.set(key,String(val)),
  removeItem:key=>entries.delete(key)
 };
 const ctx=vm.createContext({localStorage,Date,JSON});
 vm.runInContext(source,ctx);
 return{entries,localStorage,cache:ctx.NataijiOfflineResume};
}
test('cached school account opens only with its own saved state',()=>{
 const f=fixture(),user={id:'t-1',role:'teacher',schoolId:'school-a',permissions:['pupils'],name:'Teacher'};
 f.localStorage.setItem('nataiji-active-user',user.id);
 assert.equal(f.cache.remember(user),true);
 assert.equal(f.cache.read(),null,'no grade/roster snapshot yet');
 f.localStorage.setItem('nataiji-data',JSON.stringify({classes:[{id:'class-1'}],pupils:[['1001','Test']]}));
 f.localStorage.setItem('nataiji-offline-school-scope-v1',JSON.stringify([user.id,user.schoolId,'']));
 assert.equal(f.cache.read()?.user?.id,'t-1');
 f.localStorage.setItem('nataiji-offline-school-scope-v1',JSON.stringify([user.id,'another-school','']));
 assert.equal(f.cache.read(),null,'offline school snapshot must not cross workspaces');
 f.localStorage.setItem('nataiji-offline-school-scope-v1',JSON.stringify([user.id,user.schoolId,'']));
 f.localStorage.setItem('nataiji-active-user','t-2');
 assert.equal(f.cache.read(),null,'never reopen a different account');
});
test('professor offline cache requires a saved profile and remains account scoped',()=>{
 const f=fixture(),user={id:'prof-1',role:'professor',profileType:'professor'};
 f.localStorage.setItem('nataiji-active-user',user.id);
 f.cache.remember(user);assert.equal(f.cache.read(),null);
 f.localStorage.setItem('nataiji-professor-profile-v1:prof-1',JSON.stringify({profile:{classes:[]},classLinks:{}}));
 assert.equal(f.cache.read()?.professor,true);
 f.cache.clear();assert.equal(f.cache.read(),null);
});
test('stale, invalid and suspended sessions never open offline',()=>{
 const f=fixture(),user={id:'t',role:'teacher'};
 f.localStorage.setItem('nataiji-active-user','t');
 f.localStorage.setItem('nataiji-data',JSON.stringify({pupils:[]}));
 f.localStorage.setItem('nataiji-offline-school-scope-v1',JSON.stringify(['t','','']));
 f.cache.remember(user);
 const key='nataiji-offline-session-v1';
 const raw=JSON.parse(f.entries.get(key));raw.verifiedAt=Date.now()-36*24*60*60*1000;
 f.localStorage.setItem(key,JSON.stringify(raw));assert.equal(f.cache.read(),null);
 raw.verifiedAt=Date.now()+5*60*1000;f.localStorage.setItem(key,JSON.stringify(raw));assert.equal(f.cache.read(),null);
 raw.verifiedAt=Date.now();raw.user.suspended=true;f.localStorage.setItem(key,JSON.stringify(raw));assert.equal(f.cache.read(),null);
});
test('no secret fields can be written into offline account metadata',()=>{
 const f=fixture();
 f.localStorage.setItem('nataiji-active-user','u');
 f.localStorage.setItem('nataiji-data',JSON.stringify({pupils:[]}));
 f.localStorage.setItem('nataiji-offline-school-scope-v1',JSON.stringify(['t','','']));
 f.cache.remember({id:'u',role:'admin',password:'secret',accessToken:'token',cookie:'session',permissions:[]});
 const stored=f.entries.get('nataiji-offline-session-v1');
 assert.ok(!stored.includes('secret')&&!stored.includes('token')&&!stored.includes('session'));
});
test('offline login routing never sends saved snapshots as server grade mutations',()=>{
 const a=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const auth=fs.readFileSync(new URL('../public/auth-access-v2.js',import.meta.url),'utf8');
 const prof=fs.readFileSync(new URL('../public/professor-v2.js',import.meta.url),'utf8');
 assert.match(auth,/NataijiOfflineResume\?\.read\(\)/);
 assert.match(auth,/revalidateOfflineSession/);
 assert.match(a,/openCachedWorkspace\(\)/);
 assert.match(a,/window\.__nataijiOfflineActive\)\{const ctx=contextFilter/);
 assert.match(prof,/function offlineProfile\(\)/);
 assert.match(prof,/navigator\.onLine===false\|\|window\.__nataijiOfflineActive/);
});

 test('offline workspace remains usable after a month without extending verification time',()=>{
 const f=fixture(), user={id:'month',role:'teacher'};
 f.localStorage.setItem('nataiji-active-user',user.id);
 f.localStorage.setItem('nataiji-data',JSON.stringify({pupils:[]}));
 f.localStorage.setItem('nataiji-offline-school-scope-v1',JSON.stringify([user.id,'','']));
 f.cache.remember(user);
 const key='nataiji-offline-session-v1', record=JSON.parse(f.entries.get(key));
 record.verifiedAt=Date.now()-31*24*60*60*1000;
 f.localStorage.setItem(key,JSON.stringify(record));
 assert.equal(f.cache.read()?.user.id,user.id);
 assert.equal(JSON.parse(f.entries.get(key)).verifiedAt,record.verifiedAt);
 });
 test('cached startup renders before background network verification',async()=>{
 const auth=fs.readFileSync(new URL('../public/auth-access-v2.js',import.meta.url),'utf8');
 const source=auth.slice(auth.indexOf('async function resumeAtStartup(){'),auth.indexOf("window.addEventListener('DOMContentLoaded'"));
 const calls=[];
 const context=vm.createContext({resetToken:()=>'',window:{NataijiOfflineResume:{read:()=>({user:{id:'cached'}})}},
 accountActivate:async(user,offline)=>{calls.push(['open',user.id,offline])},
 revalidateOfflineSession:()=>{calls.push(['verify']);return new Promise(()=>{})},
 renderAuth:async()=>{calls.push(['login'])}});
 vm.runInContext(source,context);
 await context.resumeAtStartup();
 assert.deepEqual(calls,[['open','cached',true],['verify']]);
 context.resetToken=()=> 'reset-token';calls.length=0;
 await context.resumeAtStartup();assert.deepEqual(calls,[['login']]);
 });
