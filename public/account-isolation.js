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

const clone=x=>structuredClone(x);
function syncActive(s){
 if(!s?.activeClassId||!s.classData)return;
 const d=s.classData[s.activeClassId]||(s.classData[s.activeClassId]={});
 d.pupils=clone(s.pupils||[]);
 d.subjects=clone(s.subjects||[]);
 d.marksByTerm=d.marksByTerm&&typeof d.marksByTerm==='object'?d.marksByTerm:{};
 if(s.term)d.marksByTerm[s.term]=clone(s.marks||[]);
}
function pupilsEqual(a,b){a=Array.isArray(a)?a:[];b=Array.isArray(b)?b:[];return JSON.stringify(a)===JSON.stringify(b)}
async function verifyPupils(){
 if(typeof state==='undefined'||!state||!currentUser)return true;
 syncActive(state);
 const snapshot=clone(state),expected=clone(snapshot.pupils||[]);
 localStorage.setItem('nataiji-data',JSON.stringify(snapshot));
 await api('/api/state',{method:'PUT',body:JSON.stringify({state:snapshot})});
 let r=await api('/api/state');
 if(!pupilsEqual(expected,r?.state?.pupils)){
   await api('/api/state',{method:'PUT',body:JSON.stringify({state:snapshot})});
   r=await api('/api/state');
 }
 if(!pupilsEqual(expected,r?.state?.pupils))throw new Error('pupil_save_not_verified');
 state=normalizeState(r.state);
 syncActive(state);
 localStorage.setItem('nataiji-data',JSON.stringify(state));
 return true;
}
window.nataijiVerifyPupils=verifyPupils;
// The bilingual editor mutates state synchronously before awaiting its normal save.
// Verify that exact list against a fresh server read before any refresh can replace it.
document.addEventListener('click',e=>{
 const b=e.target.closest?.('.nataiji-bi-editor .bi-save');
 if(!b||!b.closest('.nataiji-bi-editor')?.querySelector('#bi-nns'))return;
 setTimeout(async()=>{
   try{
    await verifyPupils();
    const el=document.querySelector('#saveState');if(el){el.textContent='✓ تم تثبيت لائحة التلاميذ على الخادم';el.classList.remove('dirty')}
   }catch(err){
    console.error('pupil persistence verification failed',err);
    const el=document.querySelector('#saveState');if(el){el.textContent='تعذر تثبيت لائحة التلاميذ على الخادم';el.classList.add('dirty')}
   }
 },0);
},true);
})();