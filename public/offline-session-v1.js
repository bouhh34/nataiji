/* Short-lived offline reopening of a previously verified device workspace.
 * Never caches a cookie/password and never grants server access. */
(function(global){
 'use strict';
 const KEY='nataiji-offline-session-v1', MAX_AGE=12*60*60*1000;
 function read(storage){
  try{
   const record=JSON.parse(storage.getItem(KEY)||'null');
   if(!record||record.version!==1||!record.user?.id||!Number.isFinite(record.verifiedAt))return null;
   if(record.verifiedAt>Date.now()+60_000||Date.now()-record.verifiedAt>MAX_AGE||record.user.suspended)return null;
   if(storage.getItem('nataiji-active-user')!==String(record.user.id))return null;
   const professor=record.user.role==='professor'||record.user.profileType==='professor';
   const snap=professor?storage.getItem('nataiji-professor-profile-v1:'+record.user.id):storage.getItem('nataiji-data');
   if(!snap)return null;
   const parsed=JSON.parse(snap);
   if(!parsed||typeof parsed!=='object'||professor&&!Array.isArray(parsed.classes)||!professor&&!Array.isArray(parsed.classes)&&!Array.isArray(parsed.pupils))return null;
   return {user:record.user,professor};
  }catch{return null}
 }
 function remember(storage,user){
  if(!user?.id||user.suspended||user.needsProfileChoice)return false;
  try{
   const allowed=['id','name','role','baseRole','accountRole','profileType','needsProfileChoice','isSuperAdmin','schoolId','activeSharedGrant','sharedGrants','permissions','classIds','classAccess','subjectIds','allSubjects','preferredClassId','preferredTerm','sessionVersion'];
   const safe=Object.fromEntries(allowed.filter(k=>user[k]!==undefined).map(k=>[k,user[k]]));
   storage.setItem(KEY,JSON.stringify({version:1,user:safe,verifiedAt:Date.now()}));
   return true
  }catch{return false}
 }
 function clear(storage){try{storage.removeItem(KEY)}catch{}}
 global.NataijiOfflineResume={remember:user=>remember(global.localStorage,user),read:()=>read(global.localStorage),clear:()=>clear(global.localStorage)};
})(globalThis);
