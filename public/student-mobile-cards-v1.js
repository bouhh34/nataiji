(()=>{
'use strict';
if(window.__nataijiStudentMobileCardsV1)return;
window.__nataijiStudentMobileCardsV1=true;

const q=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getState=()=>{try{return state}catch{return null}};
const getUser=()=>{try{return currentUser}catch{return null}};
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const canEdit=()=>{const u=getUser();return !!(u&&(u.role==='admin'||u.permissions?.includes('pupils')))};

function ensureHost(){
  const table=q('[data-page="students"] .student-table');
  if(!table)return null;
  const wrap=table.closest('.table-scroll');
  if(wrap)wrap.classList.add('student-table-desktop-wrap');
  let host=q('#mobileStudentCards');
  if(!host){
    host=document.createElement('div');
    host.id='mobileStudentCards';
    host.className='student-mobile-cards';
    (wrap||table).insertAdjacentElement('beforebegin',host);
  }
  return host;
}

function renderCards(){
  const s=getState(),host=ensureHost();
  if(!s||!host)return;
  const pupils=Array.isArray(s.pupils)?s.pupils:[];
  const editable=canEdit(),fr=isFr();

  host.innerHTML=pupils.length?pupils.map((p,i)=>{
    const call=Number(p?.[5])||i+1;
    const ar=String(p?.[1]||'').trim();
    const frName=String(p?.[4]||'').trim();
    const primary=fr?(frName||ar):ar;
    const secondary=fr?ar:frName;
    const sex=String(p?.[2]||'').trim()||'—';
    const sexFr=sex==='ذكر'?'Garçon':sex==='أنثى'?'Fille':sex;
    const nns=String(p?.[0]||'').trim()||'—';
    const dob=String(p?.[3]||'').trim()||'—';
    return `<article class="student-mobile-card">
      <div class="student-mobile-top">
        <span class="student-call" aria-label="${fr?'Numéro d’appel':'رقم النداء'}">${esc(call)}</span>
        <div class="student-mobile-name">
          <b>${esc(primary||'—')}</b>
          ${secondary?`<small dir="${fr?'rtl':'ltr'}">${esc(secondary)}</small>`:''}
        </div>
        <span class="student-sex">${esc(fr?sexFr:sex)}</span>
      </div>
      <div class="student-mobile-meta">
        <div><span>${fr?'NNS':'الرقم المدرسي NNS'}</span><strong dir="ltr">${esc(nns)}</strong></div>
        <div><span>${fr?'Date de naissance':'تاريخ الميلاد'}</span><strong dir="ltr">${esc(dob)}</strong></div>
      </div>
      ${editable?`<div class="student-mobile-actions">
        <button type="button" class="nataiji-edit-pupil mobile-edit-pupil" data-i="${i}"><span>✎</span> ${fr?'Modifier':'تعديل'}</button>
        <button type="button" class="nataiji-delete-pupil mobile-delete-pupil" data-i="${i}"><span>⌫</span> ${fr?'Supprimer':'حذف'}</button>
      </div>`:''}
    </article>`;
  }).join(''):`<div class="student-mobile-empty">${fr?'Aucun élève dans cette classe.':'لا يوجد تلاميذ في هذا القسم.'}</div>`;
}

let timer=null;
function schedule(){clearTimeout(timer);timer=setTimeout(renderCards,20)}

const style=document.createElement('style');
style.id='nataiji-student-mobile-cards-style';
style.textContent=`
.student-mobile-cards{display:none}
@media(max-width:720px){
  [data-page="students"] .student-table-desktop-wrap{display:none!important}
  [data-page="students"] .student-mobile-cards{
    display:grid!important;gap:8px;margin:10px 0 12px;direction:rtl
  }
  .student-mobile-card{
    border:1px solid #dbe6ed;border-radius:13px;background:#fff;padding:10px;
    box-shadow:0 1px 2px #17324a08;overflow:hidden
  }
  .student-mobile-top{
    display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:8px
  }
  .student-call{
    width:32px;height:32px;border-radius:9px;background:#eef7fc;color:#167fbf;
    display:grid;place-items:center;font-weight:900;font-size:14px
  }
  .student-mobile-name{min-width:0;display:grid;gap:2px}
  .student-mobile-name b{
    color:#20394c;font-size:14.5px;line-height:1.32;white-space:normal;overflow-wrap:anywhere
  }
  .student-mobile-name small{
    color:#8797a3;font-size:10.5px;white-space:normal;overflow-wrap:anywhere
  }
  .student-sex{
    border:1px solid #dbe5ea;background:#f8fafb;border-radius:999px;padding:4px 7px;
    color:#536d7d;font-size:11px;font-weight:700;white-space:nowrap
  }
  .student-mobile-meta{
    display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px;padding-top:7px;
    border-top:1px solid #edf2f5
  }
  .student-mobile-meta>div{display:flex;align-items:center;justify-content:space-between;gap:5px;min-width:0}
  .student-mobile-meta span{color:#84939e;font-size:9.5px;white-space:nowrap}
  .student-mobile-meta strong{color:#334f62;font-size:11px;font-weight:700;overflow-wrap:anywhere;min-width:12px;text-align:left}
  .student-mobile-actions{
    display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px
  }
  .student-mobile-actions button{
    min-height:36px;border-radius:9px;font-size:11.5px;font-weight:800;background:#fff;
    box-shadow:none;margin:0!important;padding:7px 10px!important
  }
  .student-mobile-actions .mobile-edit-pupil{
    border:1px solid #cddde7!important;color:#28506a!important;background:#f9fcfe!important
  }
  .student-mobile-actions .mobile-delete-pupil{
    border:1px solid #f1caca!important;color:#b42318!important;background:#fff8f8!important
  }
  .student-mobile-actions button small{display:none!important}
  .student-mobile-empty{
    padding:24px 14px;text-align:center;color:#7b8d99;border:1px dashed #d4e0e7;
    border-radius:12px;background:#fbfdfe;font-size:13px
  }
}
@media(min-width:721px){.student-mobile-cards{display:none!important}}
@media print{.student-mobile-cards{display:none!important}.student-table-desktop-wrap{display:block!important}}
`;
document.head.appendChild(style);

function bind(){
  ensureHost();
  const body=q('#list');
  if(body&&!body.dataset.mobileCardsObserved){
    body.dataset.mobileCardsObserved='1';
    new MutationObserver(schedule).observe(body,{childList:true,subtree:false});
  }
  renderCards();
}

new MutationObserver(m=>{
  for(const x of m)for(const n of x.addedNodes){
    if(n.nodeType!==1)continue;
    if(n.id==='list'||n.querySelector?.('#list')){bind();return}
  }
}).observe(document.documentElement,{childList:true,subtree:true});

window.addEventListener('DOMContentLoaded',bind);
window.addEventListener('storage',e=>{if(e.key==='nataiji-lang')schedule()});
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="students"]'))setTimeout(bind,40);
  if(e.target.closest?.('#langSwitch'))setTimeout(schedule,60);
},true);
setTimeout(bind,400);
})();