(()=>{
'use strict';
if(window.__nataijiGradeMobileV1)return;
window.__nataijiGradeMobileV1=true;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const absent=v=>/^(غائب|غائبة|absent|absente|a)$/i.test(String(v??'').trim());
const maxOf=s=>{const n=Number(s?.[3]);return Number.isFinite(n)&&n>0?n:20};
const normalizeSubject=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const currentSubjectIconKey=v=>{
 const n=normalizeSubject(v);
 if(/اسلام|islam/.test(n))return'islamic';
 if(/عرب|arabe/.test(n))return'arabic';
 if(/حساب|رياضيات|math|calcul/.test(n))return'math';
 if(/مدني|civique|citoy/.test(n))return'civic';
 if(/فني|artist|dessin/.test(n))return'art';
 if(/فرنس|francais/.test(n))return'french';
 if(/بدني|رياضة|education physique|sport/.test(n))return'sport';
 return'generic';
};
const currentSubjectIconMarkup=key=>{
 const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
 const icons={
  islamic:`<svg ${common}><path d="M5 20h14"/><path d="M7 20v-7.2c0-2.2 1.5-4.2 3.7-4.8"/><path d="M17 20v-7.2c0-2.2-1.5-4.2-3.7-4.8"/><path d="M12 3.2c1.2 1.1 1.8 2.2 1.8 3.3 0 1-.8 1.9-1.8 1.9s-1.8-.9-1.8-1.9c0-1.1.6-2.2 1.8-3.3Z"/><path d="M9.2 20v-4.4a2.8 2.8 0 0 1 5.6 0V20"/></svg>`,
  arabic:`<svg ${common}><path d="M4 5.5c2.8-.8 5.1-.2 8 1.6v12.2c-2.9-1.8-5.2-2.3-8-1.5V5.5Z"/><path d="M20 5.5c-2.8-.8-5.1-.2-8 1.6v12.2c2.9-1.8 5.2-2.3 8-1.5V5.5Z"/></svg>`,
  math:`<svg ${common}><rect x="5" y="3.5" width="14" height="17" rx="2.2"/><path d="M8 7.5h8"/><path d="M8.2 12h1.6M14.2 12h1.6M8.2 15.5h1.6M14.2 15.5h1.6M8.2 18.5h1.6M14.2 18.5h1.6"/></svg>`,
  civic:`<svg ${common}><path d="M6 21V4"/><path d="M6 5c4-2.2 7 2 12 0v9c-5 2-8-2.2-12 0"/></svg>`,
  art:`<svg ${common}><path d="M12 3.2c-5.2 0-9 3.5-9 8.1 0 4.7 4.1 8.5 9.1 8.5h1.1c1.4 0 2.1-.9 2.1-1.9 0-.8-.5-1.3-.5-2 0-.9.8-1.5 1.8-1.5H18c2 0 3-1.4 3-3.3 0-4.5-3.7-7.9-9-7.9Z"/><circle cx="7.7" cy="9.2" r=".8" fill="currentColor" stroke="none"/><circle cx="10.5" cy="6.8" r=".8" fill="currentColor" stroke="none"/><circle cx="14.2" cy="7.3" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.1" r=".8" fill="currentColor" stroke="none"/></svg>`,
  french:`<svg ${common}><path d="M4.2 5.5h15.6v10.2a3 3 0 0 1-3 3H10l-4.4 2v-2.8a3 3 0 0 1-1.4-2.5V5.5Z"/><path d="M8 9.3h8M8 12.7h5.5"/></svg>`,
  sport:`<svg ${common}><circle cx="14.7" cy="4.8" r="1.8"/><path d="m12.5 9.2 2.4 2.2 2.7.7"/><path d="m12.7 8.4-2.2 3.4-3.1 1.4"/><path d="m12 12.5-1.1 4.1-3.2 3"/><path d="m13.2 12.4 3 3.2 3.1 1.1"/></svg>`,
  generic:`<svg ${common}><path d="M6 4.5h9a3 3 0 0 1 3 3v12H9a3 3 0 0 1-3-3v-12Z"/><path d="M9 8h6M9 11h6"/></svg>`
 };
 return icons[key]||icons.generic;
};
function absentLabel(i){
 const p=state?.pupils?.[i]||[],g=String(p?.[2]??p?.[6]??p?.gender??'').trim().toLowerCase(),female=/أنثى|انثى|female|féminin|feminin|fille/.test(g);
 if(fr())return female?'Absente':'Absent';
 return female?'غائبة':'غائب'
}
function validate(raw,max){
 if(typeof window.nataijiValidateGradeValue==='function')return window.nataijiValidateGradeValue(raw,max);
 const s=String(raw??'').trim();
 if(!s||absent(s))return{ok:true,value:s,max};
 const n=Number(s);if(!Number.isFinite(n))return{ok:false,reason:'not_number',max,value:s};
 if(n<0)return{ok:false,reason:'below_zero',max,value:n};
 if(n>max)return{ok:false,reason:'above_max',max,value:n};
 return{ok:true,value:n,max}
}
function rowState(row,value){
 if(!row)return;
 const filled=String(value??'').trim()!=='',isAbsent=absent(value),btn=q('.absent-btn',row);
 row.classList.toggle('has-mark',filled&&!isAbsent);
 row.classList.toggle('is-absent',isAbsent);
 row.classList.toggle('is-empty',!filled);
 if(btn)btn.setAttribute('aria-pressed',isAbsent?'true':'false')
}
function renderCompactMobileScores(){
 const host=q('#mobileScores'),picker=q('#subjectPicker');if(!host||!picker||typeof state==='undefined')return;
 const j=Number(picker.value)||0,sub=state.subjects?.[j],m=maxOf(sub);
 if(!sub){host.innerHTML='';return}
 const currentName=String(fr()?(sub?.[2]||sub?.[0]||''):(sub?.[0]||sub?.[2]||'')),maxLabel=fr()?'Note sur':'من';
 const iconKey=currentSubjectIconKey(`${sub?.[0]||''} ${sub?.[2]||currentName}`);
 host.innerHTML=`<div class="subject-title grade-subject-title">
   <div class="grade-subject-copy"><span class="subject-premium-icon grade-current-subject-icon" data-icon="${iconKey}" aria-hidden="true">${currentSubjectIconMarkup(iconKey)}</span><small>${fr()?'Matière actuelle':'المادة الحالية'}</small><b>${esc(currentName)}</b></div>
   <span class="grade-max-chip" dir="ltr">${esc(maxLabel)} ${m}</span>
  </div>`+(state.pupils||[]).map((p,i)=>{
   const value=state.marks?.[i]?.[j]??'',cls=absent(value)?' is-absent':String(value).trim()!==''?' has-mark':' is-empty',nns=String(p?.[0]||'').trim();
   const pupilName=String(fr()?(p?.[4]||p?.[1]||''):(p?.[1]||p?.[4]||''));
   return `<div class="score-row compact-score-row${cls}" data-grade-row="${i}">
     <span class="score-student"><b dir="${fr()?'ltr':'rtl'}">${i+1}. ${esc(pupilName)}</b>${nns?`<small>${esc(nns)}</small>`:''}</span>
     <div class="score-controls">
       <div class="score-field" dir="ltr">
         <input class="mobile-mark" inputmode="decimal" min="0" max="${m}" step="0.1" data-i="${i}" data-j="${j}" value="${esc(value)}" placeholder="—" aria-label="${esc(pupilName+' — '+currentName)}">
         <em dir="ltr">/${m}</em>
       </div>
       <button type="button" class="absent-btn compact-absent" data-absent-i="${i}" aria-pressed="${absent(value)?'true':'false'}">${esc(absentLabel(i))}</button>
     </div>
   </div>`
  }).join('');

 qa('.compact-score-row',host).forEach(row=>{
   const input=q('.mobile-mark',row),button=q('.absent-btn',row),i=Number(input?.dataset.i);
   if(input){
     input.dataset.lastValid=String(state.marks?.[i]?.[j]??'');
     input.addEventListener('input',()=>{
       const check=validate(input.value,m);
       if(!check.ok){
         row.classList.add('is-invalid');
         if(typeof window.nataijiShowGradeValidationError==='function')window.nataijiShowGradeValidationError(input,check);
         else input.classList.add('grade-invalid');
         return
       }
       row.classList.remove('is-invalid');
       if(typeof window.nataijiClearGradeValidationError==='function')window.nataijiClearGradeValidationError(input);else input.classList.remove('grade-invalid');
       rowState(row,check.value)
     });
     input.addEventListener('change',()=>{
       const check=validate(input.value,m);
       if(!check.ok){row.classList.add('is-invalid');return}
       row.classList.remove('is-invalid');
       const value=check.absent?absentLabel(i):check.value;
       if(state.marks?.[i])state.marks[i][j]=value;
       input.value=value;input.dataset.lastValid=String(value??'');
       try{markDirty()}catch{}try{renderDashboard()}catch{}
       rowState(row,value)
     });
   }
   if(button&&input){
     // Safe first-render behavior. final-grade-entry may later replace this onclick
     // with its canonical handler, so there is no duplicate listener.
     button.onclick=e=>{
       e.preventDefault();e.stopPropagation();
       if(absent(input.value)){
         input.value='';
         if(state.marks?.[i])state.marks[i][j]='';
         try{markDirty()}catch{}
         try{renderDashboard()}catch{}
         rowState(row,'');
         input.dispatchEvent(new Event('change',{bubbles:true}));
         input.focus();
         return
       }
       const value=absentLabel(i);
       input.value=value;
       if(state.marks?.[i])state.marks[i][j]=value;
       try{markDirty()}catch{}
       try{renderDashboard()}catch{}
       rowState(row,value);
       input.dispatchEvent(new Event('change',{bubbles:true}))
     }
   }
 })
}
try{renderMobileScores=renderCompactMobileScores}catch{}
window.renderMobileScores=renderCompactMobileScores;

const picker=q('#subjectPicker');
if(picker){
 picker.onchange=()=>renderCompactMobileScores();
 if(!picker.dataset.compactGradeUi){picker.dataset.compactGradeUi='1';picker.addEventListener('change',()=>setTimeout(renderCompactMobileScores,0))}
}

document.addEventListener('input',e=>{
 const input=e.target?.closest?.('.compact-score-row .mobile-mark');if(!input)return;
 const row=input.closest('.compact-score-row');if(input.classList.contains('grade-invalid')){row?.classList.add('is-invalid');return}row?.classList.remove('is-invalid');rowState(row,input.value)
},true);
document.addEventListener('change',e=>{
 const input=e.target?.closest?.('.compact-score-row .mobile-mark');if(!input)return;
 const row=input.closest('.compact-score-row');if(input.classList.contains('grade-invalid')){row?.classList.add('is-invalid');return}row?.classList.remove('is-invalid');rowState(row,input.value)
},true);

const css=document.createElement('style');css.id='nataiji-grade-mobile-v1-style';css.textContent=`
@media(max-width:760px){
 [data-page="grades"] .card{padding:12px 12px 16px!important}
 [data-page="grades"] .section-head{margin-bottom:9px!important;align-items:center!important}
 [data-page="grades"] .section-head h2{font-size:20px!important;line-height:1.15!important}
 [data-page="grades"] .section-head small{font-size:11px!important}
 [data-page="grades"] #saveGrades{min-height:40px!important;padding:9px 13px!important;border-radius:10px!important;font-size:13px!important;box-shadow:0 3px 9px rgba(18,136,221,.14)}
 [data-page="grades"] .filters{gap:7px!important;margin-bottom:6px!important;padding:11px!important;border-radius:15px!important}
 [data-page="grades"] .filters label{grid-template-columns:46px minmax(0,1fr)!important;gap:6px!important;font-size:12.5px!important}
 [data-page="grades"] .filters select{height:39px!important;min-height:39px!important;border-radius:10px!important;padding-inline:10px!important;font-size:13.5px!important;outline:none!important;transition:border-color .15s ease,box-shadow .15s ease!important}
 [data-page="grades"] .filters select:focus{border-color:#238fd1!important;box-shadow:0 0 0 3px rgba(35,143,209,.10)!important}
 .grade-subject-title{min-height:46px!important;margin:5px 0 1px!important;padding:6px 9px!important;border:1px solid #dcebf4!important;border-radius:11px!important;background:#eef7fc!important;align-items:center!important;gap:8px!important}
 .grade-subject-copy{min-width:0!important;display:flex!important;flex-direction:column!important;gap:2px!important}
 .grade-subject-copy small{font-size:10.5px!important;font-weight:600!important;color:#768b9b!important}
 .grade-subject-copy b{font-size:14.7px!important;line-height:1.23!important;color:#183a52!important;font-weight:800!important;overflow-wrap:anywhere!important}
 .grade-max-chip{flex:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:58px!important;height:29px!important;padding:0 8px!important;border-radius:999px!important;background:#fff!important;border:1px solid #cfe2ee!important;color:#5c7587!important;font-size:11.5px!important;font-weight:800!important;white-space:nowrap!important}
 #mobileScores .compact-score-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;column-gap:8px!important;height:58px!important;min-height:58px!important;max-height:58px!important;padding:3px 2px!important;border-bottom:1px solid #edf2f5!important;background:transparent!important;transition:background .15s ease!important}
 .compact-score-row:last-child{border-bottom:0!important}
 .score-student{min-width:0!important;display:block!important;line-height:1.3!important}
 .score-student b{display:block!important;font-size:14px!important;font-weight:800!important;color:#17364d!important;line-height:1.22!important;overflow-wrap:anywhere!important}
 .score-student small{display:block!important;margin-top:1px!important;color:#91a0aa!important;font-size:9px!important;font-weight:500!important;line-height:1.1!important;direction:ltr!important;text-align:right!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:150px!important}
 .score-controls{display:grid!important;grid-template-columns:88px 58px!important;align-items:center!important;justify-content:start!important;gap:5px!important;direction:ltr!important;min-width:151px!important}
 .score-field{display:grid!important;grid-template-columns:60px 26px!important;align-items:center!important;gap:2px!important;direction:ltr!important;width:88px!important}
 .compact-score-row .mobile-mark{width:60px!important;height:38px!important;min-height:38px!important;margin:0!important;padding:0 5px!important;border:1px solid #c8dce7!important;border-radius:9px!important;background:#f8fcfe!important;color:#17364d!important;text-align:center!important;font-size:16px!important;font-weight:600!important;line-height:38px!important;box-shadow:inset 0 0 0 1px rgba(25,93,123,.02)!important;outline:none!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease!important}
 .compact-score-row .mobile-mark:focus{border-color:#218fd2!important;box-shadow:0 0 0 3px rgba(33,143,210,.12)!important;background:#fff!important}
 .compact-score-row .score-field em{width:26px!important;min-width:26px!important;margin:0!important;font-style:normal!important;color:#80919d!important;font-size:11.5px!important;font-weight:700!important;white-space:nowrap!important;letter-spacing:-.1px!important;text-align:left!important}
 .compact-score-row .absent-btn{position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:58px!important;min-width:58px!important;max-width:58px!important;height:34px!important;min-height:34px!important;margin:0!important;padding:0 5px!important;border:1px solid #d8e1e8!important;border-radius:9px!important;background:#fff!important;color:#667784!important;font-size:10.5px!important;font-weight:850!important;line-height:1!important;white-space:nowrap!important;box-shadow:0 1px 3px rgba(23,54,77,.05)!important;transition:background .15s ease,border-color .15s ease,color .15s ease,transform .08s ease!important}
 .compact-score-row .absent-btn::before{content:""!important;width:6px!important;height:6px!important;border-radius:999px!important;background:#a9b7c1!important;margin-inline-end:4px!important;flex:none!important}
 .compact-score-row .absent-btn:active{transform:scale(.97)!important}
 .compact-score-row.has-mark .mobile-mark{border-color:#b9d8e9!important;background:#fafdff!important}
 .compact-score-row.is-invalid{background:linear-gradient(90deg,rgba(255,244,243,.15),rgba(255,244,243,.72))!important}
 .compact-score-row.is-invalid .mobile-mark{border-color:#d92d20!important;background:#fff5f4!important;color:#b42318!important;box-shadow:0 0 0 3px rgba(217,45,32,.10)!important}
 .compact-score-row.is-absent{background:linear-gradient(90deg,rgba(255,249,226,.28),rgba(255,249,226,.72))!important}
 .compact-score-row.is-absent .mobile-mark{background:#fffaf0!important;border-color:#e6cc78!important;color:#8a6200!important;font-size:11.7px!important;font-weight:700!important}
 .compact-score-row.is-absent .absent-btn{background:#f2b51d!important;border-color:#b98300!important;color:#3f2b00!important;box-shadow:0 0 0 3px rgba(242,181,29,.22),0 2px 7px rgba(126,84,0,.18)!important}
 .compact-score-row.is-absent .absent-btn::before{background:#704a00!important}
 [data-page="grades"] .save-state{margin-top:9px!important;padding:7px 10px!important;border-radius:9px!important;background:#f7fafc!important;color:#738694!important;font-size:10.5px!important}
 [data-page="grades"] .save-state.dirty{background:#fff8e9!important;color:#9a6500!important}
}
@media(max-width:380px){
 #mobileScores .compact-score-row{column-gap:6px!important;height:56px!important;min-height:56px!important;max-height:56px!important;padding-block:3px!important}
 .score-student b{font-size:13.4px!important}
 .compact-score-row .mobile-mark{width:56px!important;height:37px!important;min-height:37px!important;line-height:37px!important}
 .score-controls{grid-template-columns:84px 54px!important;min-width:143px!important}.score-field{grid-template-columns:56px 26px!important;width:84px!important}.compact-score-row .absent-btn{width:54px!important;min-width:54px!important;max-width:54px!important;height:33px!important;min-height:33px!important;padding-inline:4px!important;font-size:10px!important}
 .compact-score-row .score-field em{min-width:23px!important;font-size:10.8px!important}
}
`;document.head.appendChild(css);

function install(){try{renderCompactMobileScores()}catch(e){console.error('compact grade UI failed',e)}}
window.addEventListener('DOMContentLoaded',()=>setTimeout(install,120));
setTimeout(install,0);
setTimeout(install,900);
})();
