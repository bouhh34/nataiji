(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
function getState(){try{return typeof state==='undefined'?null:state}catch{return null}}
function getUser(){try{return typeof currentUser==='undefined'?null:currentUser}catch{return null}}
function canEdit(){const u=getUser();return !!u&&(u.role==='admin'||u.permissions?.includes('pupils'))}
function callNo(p,i){return String(p?.[5]??'').trim()||String(i+1)}
function setText(el,v){if(el&&el.textContent!==v)el.textContent=v}
function syncHeaders(){
 const ar='رقم النداء',fr='N° d’appel',label=isFr()?fr:ar;
 const heads=[
  q('.student-table thead tr')?.cells?.[0],
  q('#listReport table thead tr')?.cells?.[0],
  q('#classReport table thead tr')?.cells?.[0],
  q('#printPortal table thead tr')?.cells?.[0]
 ].filter(Boolean);
 heads.forEach(h=>{setText(h,label);h.dataset.callHeader='1'});
}
function syncValues(){
 const s=getState();if(!s)return;
 const selectors=['#list tbody tr','#listReport tbody tr','#classReport tbody tr','#printPortal tbody tr'];
 selectors.forEach(sel=>qa(sel).forEach((r,i)=>{if(s.pupils?.[i]&&r.cells?.[0])setText(r.cells[0],callNo(s.pupils[i],i))}));
}
function styleEditableList(){
 const s=getState();if(!s)return;
 qa('#list tbody tr').forEach((r,i)=>{
   const cell=r.cells?.[0],p=s.pupils?.[i];if(!cell||!p)return;
   const n=callNo(p,i);
   cell.dataset.callIndex=String(i);
   cell.classList.toggle('call-number-editable',canEdit());
   if(canEdit()) cell.title=isFr()?'Modifier le N° d’appel':'اضغط لتعديل رقم النداء';
   setText(cell,n);
 });
}
async function editCall(i){
 const s=getState();if(!s||!s.pupils?.[i]||!canEdit())return;
 const old=callNo(s.pupils[i],i),fr=isFr();
 const v=window.prompt(fr?'Modifier le N° d’appel':'تعديل رقم النداء',old);
 if(v===null)return;
 const n=String(v).trim();
 if(!/^\d+$/.test(n)||Number(n)<1){alert(fr?'Saisissez un numéro d’appel positif.':'أدخل رقم نداء صحيحًا أكبر من صفر.');return}
 if(s.pupils.some((p,j)=>j!==i&&callNo(p,j)===n)){alert(fr?'Ce N° d’appel est déjà utilisé.':'رقم النداء مستخدم لتلميذ آخر.');return}
 const prev=s.pupils[i][5];s.pupils[i][5]=n;
 try{
   if(typeof save==='function')await save(true);
   if(typeof render==='function')render();
   window.nataijiFinalizeReports?.();
   setTimeout(apply,20);
 }catch(e){s.pupils[i][5]=prev;alert(fr?'Impossible d’enregistrer la modification.':'تعذر حفظ تعديل رقم النداء.');}
}
function apply(){syncHeaders();syncValues();styleEditableList()}
document.addEventListener('click',e=>{
 const cell=e.target.closest?.('#list tbody td:first-child.call-number-editable');
 if(cell){e.preventDefault();editCall(Number(cell.dataset.callIndex));return}
 if(e.target.closest?.('[data-report],.report-print,#printList,#showResult'))setTimeout(apply,20);
},true);
document.addEventListener('change',e=>{if(e.target.matches?.('#classTop,#yearTop,#term,#student'))setTimeout(apply,20)},true);
new MutationObserver(()=>{clearTimeout(window.__nataijiCallTimer);window.__nataijiCallTimer=setTimeout(apply,40)}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('beforeprint',apply);
window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250));
const st=document.createElement('style');st.id='nataiji-call-number-control';st.textContent=`
#list tbody td.call-number-editable{cursor:pointer;font-weight:800;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
#list tbody td.call-number-editable:after{content:' ✎';font-size:.8em;opacity:.65}
@media print{
 body[data-print="portal"][data-portal-type="class"] #printPortal th[data-call-header="1"]{writing-mode:vertical-rl!important;text-orientation:mixed!important;white-space:nowrap!important;height:28mm!important;font-size:6.8pt!important;line-height:1!important;padding:.7mm .2mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal th[data-call-header="1"]{writing-mode:horizontal-tb!important;white-space:normal!important}
}
`;document.head.appendChild(st);
setTimeout(apply,0);
})();