(()=>{
'use strict';
if(window.__nataijiFinalGradeEntryV4)return;
window.__nataijiFinalGradeEntryV4=true;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const isAbsent=v=>/^(غائب|غائبة|absent|absente|a)$/i.test(String(v??'').trim());
const maxFor=j=>{const n=Number(state?.subjects?.[j]?.[3]);return Number.isFinite(n)&&n>0?n:20};
const totalMax=()=>{const n=(state?.subjects||[]).reduce((a,_,j)=>a+maxFor(j),0);return n>0?n:200};
const female=i=>{const p=state?.pupils?.[i]||[],g=String(p?.[2]??p?.[6]??p?.gender??'').trim().toLowerCase();return /أنثى|انثى|female|féminin|feminin|fille/.test(g)};
const absenceLabel=(i,fr=false)=>female(i)?(fr?'Absente':'غائبة'):(fr?'Absent':'غائب');
const rowFor=i=>state?.marks?.[i]||[];
const allAbsent=i=>!!state?.subjects?.length&&state.subjects.every((_,j)=>isAbsent(rowFor(i)[j]));
const numeric=v=>isAbsent(v)?0:(Number.isFinite(Number(v))?Number(v):0);
const calcRow=i=>{const sum=(state?.subjects||[]).reduce((a,_,j)=>a+numeric(rowFor(i)[j]),0),mx=totalMax();return{sum,avg:mx?sum*20/mx:0,totalMax:mx,absentAll:allAbsent(i)}};
const eligibleCount=()=>Math.max(0,(state?.pupils||[]).filter((_,i)=>!allAbsent(i)).length);

calc=function(i){return calcRow(i)};
ranks=function(){
 const vals=(state?.pupils||[]).map((_,i)=>calcRow(i));
 return vals.map(v=>v.absentAll?null:1+vals.filter(x=>!x.absentAll&&x.avg>v.avg).length)
};
function validateGradeValue(raw,max=20){
 const s=String(raw??'').trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[,٫]/g,'.'),m=Number(max),limit=Number.isFinite(m)&&m>0?m:20;
 if(s==='')return{ok:true,value:'',max:limit};
 if(isAbsent(s))return{ok:true,value:s,max:limit,absent:true};
 const n=Number(s);
 if(!Number.isFinite(n))return{ok:false,reason:'not_number',max:limit,value:s};
 if(n<0)return{ok:false,reason:'below_zero',max:limit,value:n};
 if(n>limit)return{ok:false,reason:'above_max',max:limit,value:n};
 return{ok:true,value:n,max:limit}
}
function gradeErrorMessage(result){
 if(isFr()){
  if(result?.reason==='above_max')return`La note ne peut pas dépasser ${result.max}.`;
  if(result?.reason==='below_zero')return'La note ne peut pas être inférieure à 0.';
  return'Saisissez une note valide ou choisissez Absent.'
 }
 if(result?.reason==='above_max')return`الدرجة لا يمكن أن تتجاوز ${result.max}.`;
 if(result?.reason==='below_zero')return'الدرجة لا يمكن أن تكون أقل من 0.';
 return'أدخل درجة صحيحة أو اختر غائب.'
}
let gradeToastTimer;
function showGradeValidationError(input,result){
 if(input){input.classList.add('grade-invalid');input.setAttribute('aria-invalid','true')}
 let toast=q('#nataiji-grade-error-toast');
 if(!toast){toast=document.createElement('div');toast.id='nataiji-grade-error-toast';toast.className='grade-error-toast';toast.setAttribute('role','alert');document.body.appendChild(toast)}
 toast.textContent='⚠ '+gradeErrorMessage(result);toast.classList.add('show');
 clearTimeout(gradeToastTimer);gradeToastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
 try{markSaveStatus(gradeErrorMessage(result),true)}catch{}
 return false
}
function clearGradeValidationError(input){
 if(input){input.classList.remove('grade-invalid');input.removeAttribute('aria-invalid')}
}
cleanMark=function(v,max=20){const r=validateGradeValue(v,max);return r.ok?r.value:String(v??'').trim()};

function commitEntry(input,final=false){
 const i=Number(input?.dataset?.i),j=Number(input?.dataset?.j);
 if(!Number.isInteger(i)||!Number.isInteger(j)||!state?.marks?.[i])return false;
 const raw=String(input.value??'').trim(),check=validateGradeValue(raw,maxFor(j));
 if(!check.ok)return showGradeValidationError(input,check);
 clearGradeValidationError(input);
 let value=check.value;if(check.absent)value=absenceLabel(i);
 input.classList.toggle('absent-mark',isAbsent(value));
 if(!final&&!check.absent)return true;
 state.marks[i][j]=value;input.value=value;input.dataset.lastValid=String(value??'');
 try{markDirty()}catch{}try{renderDashboard()}catch{}scheduleReports();
 return true
}
window.nataijiValidateGradeValue=validateGradeValue;
window.nataijiShowGradeValidationError=showGradeValidationError;
window.nataijiClearGradeValidationError=clearGradeValidationError;
window.nataijiFindInvalidMark=function(){
 for(let i=0;i<(state?.pupils||[]).length;i++)for(let j=0;j<(state?.subjects||[]).length;j++){
  const r=validateGradeValue(state?.marks?.[i]?.[j],maxFor(j));if(!r.ok)return{i,j,...r}
 }
 return null
};
function enhanceInputs(){
 qa('input.mark[data-i][data-j],input.mobile-mark[data-i][data-j]').forEach(input=>{
  const i=Number(input.dataset.i),j=Number(input.dataset.j);
  input.inputMode='decimal';input.enterKeyHint='next';if(input.dataset.lastValid===undefined)input.dataset.lastValid=String(state?.marks?.[i]?.[j]??'');
  input.placeholder=isFr()?'Note ou Absent':'درجة أو غائب';
  input.oninput=()=>commitEntry(input,false);
  input.onchange=()=>commitEntry(input,true);
  input.onblur=()=>commitEntry(input,true);
  input.classList.toggle('absent-mark',isAbsent(input.value));
  /* The compact mobile grade row already owns one absence button as a sibling
     of the score field. Reuse that canonical button instead of looking only
     inside the input's direct parent, which created a second "غائب" button. */
  const compactRow=input.closest?.('.compact-score-row');
  const buttonHost=compactRow?.querySelector?.('.score-controls')||input.parentElement;
  let b=buttonHost?.querySelector?.('.absent-btn')||compactRow?.querySelector?.('.absent-btn');
  if(!b&&buttonHost){b=document.createElement('button');b.type='button';b.className='absent-btn';buttonHost.appendChild(b)}
  if(b){const syncPressed=()=>b.setAttribute('aria-pressed',isAbsent(input.value)?'true':'false');b.textContent=absenceLabel(i);syncPressed();b.onclick=e=>{e.preventDefault();e.stopPropagation();if(isAbsent(input.value)){input.value='';commitEntry(input,true);syncPressed();input.focus()}else{input.value=absenceLabel(i);commitEntry(input,true);syncPressed();input.dispatchEvent(new Event('change',{bubbles:true}))}}
 })
}
try{
 const baseBind=bindMarks;
 bindMarks=function(){try{baseBind?.()}catch{}enhanceInputs()}
}catch{}
try{
 const baseMobile=renderMobileScores;
 renderMobileScores=function(){baseMobile();enhanceInputs()}
}catch{}

function patchStudent(root,i){
 if(!root||!state?.pupils?.[i]||state?.term==='الفصل الثالث')return;
 const rows=qa('.sheet tbody tr',root),n=state.subjects?.length||0,row=rowFor(i),c=calcRow(i),rank=ranks()[i],eligible=eligibleCount();
 for(let j=0;j<n&&j<rows.length;j++){
  const cell=rows[j]?.cells?.[1],v=row[j];if(!cell)continue;
  if(isAbsent(v))cell.innerHTML=`<strong class="absence-text">${absenceLabel(i)}</strong>`
 }
 const byLabel=re=>rows.find(x=>re.test(String(x.cells?.[0]?.textContent||'').trim()));
 const total=byLabel(/^(المجموع|Total)$/i),avg=byLabel(/^(المعدل|المعدل العام|Moyenne|Moyenne générale)$/i),rankRow=byLabel(/^(الرتبة|Rang)$/i),obs=byLabel(/^(الملاحظة|Observation)$/i);
 if(total?.cells?.[1])total.cells[1].innerHTML=c.absentAll?'<strong>—</strong>':`<strong dir="ltr">${Number(c.sum.toFixed(2))} / ${c.totalMax}</strong>`;
 if(avg?.cells?.[1])avg.cells[1].innerHTML=c.absentAll?`<strong>${absenceLabel(i)}</strong>`:`<strong dir="ltr">${c.avg.toFixed(1)} / 20</strong>`;
 if(rankRow?.cells?.[1])rankRow.cells[1].innerHTML=c.absentAll?'<strong>—</strong>':`<strong>${rank} / ${eligible}</strong>`;
 if(obs?.cells?.[1])obs.cells[1].innerHTML=c.absentAll?`<strong>${absenceLabel(i)} / ${absenceLabel(i,true)}</strong>`:`<strong>${c.avg>=10?'ناجح / Admis':'راسب / Non admis'}</strong>`
}
function applyReportDensity(root){if(!root)return;const n=state?.subjects?.length||0;root.classList.toggle('report-dense',n>9);root.classList.toggle('report-ultra',n>12)}
function patchReportsNow(){
 enhanceInputs();applyReportDensity(q('#officialSheet'));qa('#printBatch .batch-sheet').forEach(applyReportDensity);
 const third=state?.term==='الفصل الثالث'||/الثالث|3e|3ème|3eme/i.test(String(state?.term||''));
 if(third&&typeof window.nataijiApplyAnnualReports==='function'){window.nataijiApplyAnnualReports();window.nataijiApplyEvaluation?.();return}
 const i=Math.max(0,q('#student')?.selectedIndex??0);patchStudent(q('#officialSheet'),i);
 qa('#printBatch .batch-sheet').forEach((root,j)=>patchStudent(root,j));
 window.nataijiApplyEvaluation?.()
}
let reportTimer;
function scheduleReports(ms=40){clearTimeout(reportTimer);reportTimer=setTimeout(patchReportsNow,ms)}
try{
 const baseReports=renderReports;
 renderReports=function(){baseReports();scheduleReports(0)}
}catch{}
try{
 const baseRender=render;
 render=function(){baseRender();enhanceInputs();scheduleReports(0)}
}catch{}

const style=document.createElement('style');style.id='nataiji-final-grade-entry-style';style.textContent=`
.absent-btn{border:1px solid #d8a11e!important;background:#fff8df!important;color:#815500!important;border-radius:7px!important;padding:4px 7px!important;margin-inline-start:4px!important;font-weight:800!important;font-size:11px!important;white-space:nowrap}
.mark.absent-mark,.mobile-mark.absent-mark{font-weight:900!important;color:#8a5700!important;background:#fff8df!important}
.mark.grade-invalid,.mobile-mark.grade-invalid{border-color:#d92d20!important;background:#fff5f4!important;color:#b42318!important;box-shadow:0 0 0 3px rgba(217,45,32,.12)!important}
.grade-error-toast{position:fixed;left:50%;bottom:84px;z-index:99999;transform:translate(-50%,18px);opacity:0;pointer-events:none;max-width:min(92vw,430px);padding:10px 14px;border:1px solid #f1b4ae;border-radius:12px;background:#fff7f6;color:#b42318;font-size:13px;font-weight:800;line-height:1.45;text-align:center;box-shadow:0 10px 30px rgba(82,22,18,.16);transition:opacity .16s ease,transform .16s ease}.grade-error-toast.show{opacity:1;transform:translate(-50%,0)}
.absence-text{color:#000!important;font-weight:900!important}.report-dense .sheet th,.report-dense .sheet td{font-size:.92em!important;padding:.8mm 1mm!important}.report-ultra .sheet th,.report-ultra .sheet td{font-size:.82em!important;padding:.5mm .7mm!important}@media print{body[data-print="batch"] .batch-page.two .batch-sheet.report-dense .sheet th,body[data-print="batch"] .batch-page.two .batch-sheet.report-dense .sheet td{height:3.6mm!important;font-size:6.1pt!important}body[data-print="batch"] .batch-page.two .batch-sheet.report-ultra .sheet th,body[data-print="batch"] .batch-page.two .batch-sheet.report-ultra .sheet td{height:3.1mm!important;font-size:5.6pt!important}}
.report-black-label,#officialSheet .sheet th,#officialSheet .info span{color:#000!important;font-weight:900!important}
@media screen and (max-width:800px){
 .student-sheet-scroll #officialSheet{width:820px!important;min-width:820px!important}
 .student-sheet-scroll #officialSheet .sheet{font-size:16px!important}
 .student-sheet-scroll #officialSheet .sheet th,.student-sheet-scroll #officialSheet .sheet td{height:42px!important;padding:9px 11px!important}
}
@media print{
 body[data-print="student"] #officialSheet{width:194mm!important;max-width:194mm!important;min-height:278mm!important;padding:7mm 7mm!important}
 body[data-print="student"] #officialSheet .doc-head.final-official-head{font-size:11.2pt!important;line-height:1.5!important}
 body[data-print="student"] #officialSheet .doc-center img{width:32mm!important;height:32mm!important}
 body[data-print="student"] #officialSheet h1{font-size:22pt!important;margin:5mm 0 2mm!important}
 body[data-print="student"] #officialSheet h3{font-size:13.5pt!important}
 body[data-print="student"] #officialSheet .info{font-size:11pt!important}
 body[data-print="student"] #officialSheet .sheet{font-size:11.4pt!important}
 body[data-print="student"] #officialSheet .sheet th,body[data-print="student"] #officialSheet .sheet td{height:9.5mm!important;padding:1.4mm 1.6mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper{width:194mm!important;max-width:194mm!important;padding:7mm 8mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal h2{font-size:22pt!important;margin:5mm 0!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal table{font-size:11.5pt!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal th,body[data-print="portal"][data-portal-type="list"] #printPortal td{height:9.5mm!important;padding:1.2mm 1.5mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal{width:287mm!important;max-width:287mm!important;margin:0!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{width:287mm!important;max-width:287mm!important;padding:4mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table{font-size:8.6pt!important;line-height:1.18!important;table-layout:auto!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal th,body[data-print="portal"][data-portal-type="class"] #printPortal td{height:7mm!important;padding:.9mm .75mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal h2{font-size:20pt!important;margin:3mm 0 4mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .doc-head.final-official-head{font-size:9.6pt!important}
}
`;
document.head.appendChild(style);
function forcePageOrientation(){
 if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class'){
  let s=q('#final-page-orientation');if(!s){s=document.createElement('style');s.id='final-page-orientation';document.head.appendChild(s)}
  s.textContent='@page{size:297mm 210mm;margin:5mm}'
 }else q('#final-page-orientation')?.remove()
}
window.addEventListener('beforeprint',()=>{forcePageOrientation();patchReportsNow()});
window.addEventListener('afterprint',()=>q('#final-page-orientation')?.remove());
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop,#subjectPicker'))scheduleReports(0)},true);
window.addEventListener('DOMContentLoaded',()=>{enhanceInputs();scheduleReports(0)});
setTimeout(()=>{enhanceInputs();scheduleReports(0)},0);
window.nataijiIsAbsent=isAbsent;
window.nataijiAllAbsent=allAbsent;
})();
