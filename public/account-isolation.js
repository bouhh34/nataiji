(()=>{
'use strict';
if(window.__nataijiAccountIsolation)return;
window.__nataijiAccountIsolation=true;
let lastSessionUser=localStorage.getItem('nataiji-active-user');
const baseStart=startApp;
startApp=async function(...args){
  const id=currentUser?.id||'';
  if(id&&lastSessionUser&&lastSessionUser!==id){localStorage.removeItem('nataiji-data');localStorage.removeItem('nataiji-ui-state-v1')}
  if(id){localStorage.setItem('nataiji-active-user',id);lastSessionUser=id}
  return await baseStart(...args);
};

// Student POST/PUT responses are authoritative. Never launch a second bulk
// state save from a click listener while the row mutation is still pending.
window.nataijiVerifyPupils=async function(){
 if(typeof state==='undefined'||!state||!currentUser)return true;
 const userId=String(currentUser.id),schoolId=String(currentUser.schoolId||''),grantId=String(currentUser.activeSharedGrant||''),classId=String(state.activeClassId||'');
 if(!classId)return false;
 const expected=structuredClone(state.pupils||[]);
 const r=await api('/api/pupils?classId='+encodeURIComponent(classId));
 if(String(currentUser?.id)!==userId||String(currentUser?.schoolId||'')!==schoolId||String(currentUser?.activeSharedGrant||'')!==grantId||String(state?.activeClassId||'')!==classId)return false;
 if(!r?.ok||JSON.stringify(expected)!==JSON.stringify(r.pupils||[]))throw new Error('pupil_save_not_verified');
 return true;
};
})();
