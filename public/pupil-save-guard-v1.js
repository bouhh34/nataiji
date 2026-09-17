(()=>{
'use strict';
if(window.__nataijiPupilSaveGuardV1)return;window.__nataijiPupilSaveGuardV1=true;
const clone=x=>structuredClone(x);
function syncActive(s){if(!s?.activeClassId||!s.classData)return;const d=s.classData[s.activeClassId]||(s.classData[s.activeClassId]={});d.pupils=clone(s.pupils||[]);d.subjects=clone(s.subjects||[]);d.marksByTerm=d.marksByTerm&&typeof d.marksByTerm==='object'?d.marksByTerm:{};if(s.term)d.marksByTerm[s.term]=clone(s.marks||[])}
function pupilKey(p){return String(p?.[0]??'').trim()}
function pupilsEqual(a,b){a=Array.isArray(a)?a:[];b=Array.isArray(b)?b:[];if(a.length!==b.length)return false;return a.every((p,i)=>JSON.stringify(p)===JSON.stringify(b[i]))}
async function verifiedPupilSave(){
 if(typeof state==='undefined'||!state)return false;
 syncActive(state);
 const snapshot=clone(state),expected=clone(snapshot.pupils||[]);
 localStorage.setItem('nataiji-data',JSON.stringify(snapshot));
 if(!currentUser)return true;
 await api('/api/state',{method:'PUT',body:JSON.stringify({state:snapshot})});
 let read=await api('/api/state');
 let got=read?.state?.pupils||[];
 if(!pupilsEqual(expected,got)){
   await api('/api/state',{method:'PUT',body:JSON.stringify({state:snapshot})});
   read=await api('/api/state');got=read?.state?.pupils||[];
 }
 if(!pupilsEqual(expected,got))throw new Error('pupil_save_not_verified');
 state=normalizeState(read.state);syncActive(state);localStorage.setItem('nataiji-data',JSON.stringify(state));return true;
}
// Replace only pupil persistence used by the bilingual pupil editor; leave reports/settings untouched.
window.nataijiVerifiedPupilSave=verifiedPupilSave;
// Capture clicks on the bilingual Save button before its older handler. We let the old handler mutate the row,
// then immediately verify the resulting pupil list on the server before a refresh can lose it.
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('.nataiji-bi-editor .bi-save');if(!btn)return;
 const modal=btn.closest('.nataiji-bi-editor');if(!modal?.querySelector('#bi-nns'))return;
 setTimeout(async()=>{
   try{await verifiedPupilSave();const el=document.querySelector('#saveState');if(el){el.textContent='✓ تم تثبيت لائحة التلاميذ على الخادم';el.classList.remove('dirty')}}
   catch(err){console.error('Pupil save verification failed',err);const el=document.querySelector('#saveState');if(el){el.textContent='تعذر تثبيت لائحة التلاميذ على الخادم';el.classList.add('dirty')}}
 },0);
},true);
})();