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
cleanMark=function(v,max=20){
 const s=String(v??'').trim();if(!s)return'';
 if(isAbsent(s))return s;
 const n=Number(s),m=Number(max);if(!Number.isFinite(n))return s;
 return Math.max(0,Math.min(Number.isFinite(m)&&m>0?m:20,n))
};

function commitEntry(input,final=false){
 const i=Number(input?.dataset?.i),j=Number(input?.dataset?.j);
 if(!Number.isInteger(i)||!Number.isInteger(j)||!state?.marks?.[i])return;
 const raw=String(input.value??'').trim();let value=raw;
 if(isAbsent(raw))value=absenceLabel(i);
 else if(raw==='')value='';
 else if(Number.isFinite(Number(raw)))value=Math.max(0,Math.min(maxFor(j),Number(raw)));
 else if(final)value='';
 state.marks[i][j]=value;input.value=value;input.classList.toggle('absent-mark',isAbsent(value));
 try{markDirty()}catch{}try{renderDashboard()}catch{}scheduleReports()
}
function enhanceInputs(){
 qa('.mark,.mobile-mark').forEach(input=>{
  const i=Number(input.dataset.i);
  input.inputMode='text';
  input.placeholder=isFr()?'Note ou Absent':'درجة أو غائب';
  input.oninput=()=>commitEntry(input,false);
  input.onchange=()=>commitEntry(input,true);
  input.onblur=()=>commitEntry(input,true);
  input.classList.toggle('absent-mark',isAbsent(input.value));
  let b=input.parentElement?.querySelector('.absent-btn');
  if(!b&&input.parentElement){b=document.createElement('button');b.type='button';b.className='absent-btn';input.parentElement.appendChild(b)}
  if(b){b.textContent=absenceLabel(i);b.onclick=e=>{e.preventDefault();e.stopPropagation();input.value=absenceLabel(i);commitEntry(input,true);input.dispatchEvent(new Event('change',{bubbles:true}))}}
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
 if(total?.cells?.[1])total.cells[1].innerHTML=`<strong dir="ltr">${Number(c.sum.toFixed(2))} / ${c.totalMax}</strong>`;
 if(avg?.cells?.[1])avg.cells[1].innerHTML=c.absentAll?`<strong>${absenceLabel(i)}</strong>`:`<strong dir="ltr">${c.avg.toFixed(1)} / 20</strong>`;
 if(rankRow?.cells?.[1])rankRow.cells[1].innerHTML=c.absentAll?'<strong>—</strong>':`<strong>${rank} / ${eligible}</strong>`;
 if(obs?.cells?.[1])obs.cells[1].innerHTML=c.absentAll?`<strong>${absenceLabel(i)} / ${absenceLabel(i,true)}</strong>`:`<strong>${c.avg>=10?'ناجح / Admis':'راسب / Non admis'}</strong>`
}
function patchReportsNow(){
 enhanceInputs();
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
.absence-text{color:#000!important;font-weight:900!important}
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