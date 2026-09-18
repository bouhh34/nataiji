(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const TERMS=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const ABS='غائب';
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const maxFor=j=>{const n=Number(state?.subjects?.[j]?.[3]);return Number.isFinite(n)&&n>0?n:20};
const totalMax=()=>{const sum=(state?.subjects||[]).reduce((a,_,j)=>a+maxFor(j),0);return sum>0?sum:200};
const isAbsent=v=>/^(غائب|absent|a)$/i.test(String(v??'').trim());
const filled=v=>v!==''&&v!=null;
const numeric=v=>isAbsent(v)?0:(Number.isFinite(Number(v))?Number(v):0);
const rowComplete=(row=[])=>state?.subjects?.every((_,j)=>filled(row?.[j]))||false;
const currentRows=()=>state?.marks||[];
const termRows=t=>t===state?.term?currentRows():(state?.marksByTerm?.[t]||[]);
const termComplete=(i,t)=>rowComplete(termRows(t)?.[i]||[]);
const termAvg=(i,t)=>{const row=termRows(t)?.[i]||[];if(!termComplete(i,t))return null;const sum=row.reduce((a,v)=>a+numeric(v),0);return sum*20/totalMax()};
const annualAvg=i=>{const a=TERMS.map(t=>termAvg(i,t));return a.some(v=>v==null)?null:(a[0]+2*a[1]+3*a[2])/6};
const annualRanks=()=>{const a=(state?.pupils||[]).map((_,i)=>annualAvg(i));return a.map(v=>v==null?null:1+a.filter(x=>x!=null&&x>v).length)};
const currentCalc=i=>{const row=currentRows()?.[i]||[],sum=row.reduce((a,v)=>a+numeric(v),0),complete=rowComplete(row);return{sum,avg:sum*20/totalMax(),totalMax:totalMax(),complete}};

/* Core calculation: blank = incomplete, absent = entered and worth zero. */
calc=function(i){return currentCalc(i)};
ranks=function(){const vals=(state?.pupils||[]).map((_,i)=>currentCalc(i));return vals.map(v=>!v.complete?null:1+vals.filter(x=>x.complete&&x.avg>v.avg).length)};
cleanMark=function(v,max=20){const s=String(v??'').trim();if(!s)return'';if(isAbsent(s))return ABS;const n=Number(s),m=Number(max);if(!Number.isFinite(n))return s;return Math.max(0,Math.min(Number.isFinite(m)&&m>0?m:20,n))};

function commitEntry(input,final=false){const i=+input.dataset.i,j=+input.dataset.j;if(!state?.marks?.[i])return;let raw=String(input.value??'').trim(),value=raw;if(isAbsent(raw))value=ABS;else if(raw==='')value='';else if(Number.isFinite(Number(raw)))value=Math.max(0,Math.min(maxFor(j),Number(raw)));else if(final)value='';state.marks[i][j]=value;input.value=value;input.classList.toggle('absent-mark',value===ABS);markDirty();renderDashboard();scheduleReports();}
function addAbsentButton(input){const parent=input.parentElement;if(!parent||parent.querySelector('.absent-btn'))return;const b=document.createElement('button');b.type='button';b.className='absent-btn';b.textContent=ABS;b.onclick=e=>{e.preventDefault();e.stopPropagation();input.value=ABS;commitEntry(input,true)};parent.appendChild(b)}
function enhanceInputs(){qa('.mark,.mobile-mark').forEach(input=>{input.inputMode='text';input.placeholder=isFr()?'Note ou Absent':'درجة أو غائب';input.oninput=()=>commitEntry(input,false);input.onchange=()=>commitEntry(input,true);input.onblur=()=>commitEntry(input,true);input.classList.toggle('absent-mark',isAbsent(input.value));addAbsentButton(input)})}
bindMarks=function(){enhanceInputs()};
const oldMobile=renderMobileScores;renderMobileScores=function(){oldMobile();setTimeout(enhanceInputs,0)};

function incompleteLabel(){return isFr()?'Incomplet':'غير مكتمل'}
function absenceLabel(){return ABS}
function patchStudentRoot(root,i){if(!root||!state?.pupils?.[i])return;const rows=qa('.sheet tbody tr',root),n=state.subjects.length,row=currentRows()?.[i]||[],c=currentCalc(i),rank=ranks()[i];for(let j=0;j<n&&j<rows.length;j++){const cell=rows[j]?.cells?.[1],v=row[j];if(!cell)continue;if(isAbsent(v))cell.innerHTML=`<strong class="absence-text">${absenceLabel()}</strong>`;else if(!filled(v))cell.innerHTML='<span>—</span>'}
const totalRow=rows.find(r=>/^(المجموع|Total)$/i.test(String(r.cells?.[0]?.textContent||'').trim()));const avgRow=rows.find(r=>/^(المعدل|Moyenne|Moyenne du 3e trimestre|معدل الفصل الثالث)$/i.test(String(r.cells?.[0]?.textContent||'').trim()));const rankRow=rows.find(r=>/^(الرتبة|Rang|الرتبة العامة|Rang général)$/i.test(String(r.cells?.[0]?.textContent||'').trim()));if(totalRow?.cells?.[1])totalRow.cells[1].innerHTML=`<strong dir="ltr">${Number(c.sum.toFixed(2))} / ${c.totalMax}</strong>`;if(avgRow?.cells?.[1])avgRow.cells[1].innerHTML=c.complete?`<strong dir="ltr">${c.avg.toFixed(1)} / 20</strong>`:`<strong>${incompleteLabel()}</strong>`;if(rankRow?.cells?.[1])rankRow.cells[1].innerHTML=c.complete?`<strong>${rank}</strong>`:'<strong>—</strong>';root.classList.toggle('report-incomplete',!c.complete)}
function patchClassTable(table){if(!table?.tBodies?.[0])return;const rows=[...table.tBodies[0].rows],rs=ranks();rows.forEach((r,i)=>{const raw=currentRows()?.[i]||[];state.subjects.forEach((_,j)=>{const c=r.cells?.[j+2],v=raw[j];if(!c)return;if(isAbsent(v))c.innerHTML=`<strong class="absence-text">${absenceLabel()}</strong>`});if(state.term!=='الفصل الثالث'){const avgIndex=2+state.subjects.length,rankIndex=avgIndex+1,cc=currentCalc(i);if(r.cells?.[avgIndex])r.cells[avgIndex].innerHTML=cc.complete?`<strong>${cc.avg.toFixed(1)}</strong>`:`<strong>${incompleteLabel()}</strong>`;if(r.cells?.[rankIndex])r.cells[rankIndex].innerHTML=cc.complete?`<strong>${rs[i]}</strong>`:'—'}}})}
function patchFinalAnnualTable(table){if(state?.term!=='الفصل الثالث'||!table?.tBodies?.[0])return;const ar=annualRanks();[...table.tBodies[0].rows].forEach((r,i)=>{const av=annualAvg(i),a1=termAvg(i,TERMS[0]),a2=termAvg(i,TERMS[1]),a3=termAvg(i,TERMS[2]);const vals=[a1,a2,a3,av];for(let k=0;k<4;k++){const c=r.cells?.[k+2];if(c)c.innerHTML=vals[k]==null?`<strong>${incompleteLabel()}</strong>`:`<strong>${vals[k].toFixed(1)}</strong>`}if(r.cells?.[6])r.cells[6].innerHTML=av==null?'—':`<strong>${ar[i]}</strong>`;if(r.cells?.[7])r.cells[7].textContent=av==null?'':(typeof window.nataijiRemark==='function'?window.nataijiRemark(av):'')})}
function patchReportsNow(){const i=Math.max(0,q('#student')?.selectedIndex??0);patchStudentRoot(q('#officialSheet'),i);qa('#printBatch .batch-sheet').forEach((root,j)=>patchStudentRoot(root,j));const third=state?.term==='الفصل الثالث'||/الثالث|3e|3ème|3eme/i.test(String(state?.term||''));if(third&&typeof window.nataijiApplyAnnualReports==='function'){window.nataijiApplyAnnualReports();window.nataijiApplyEvaluation?.();return}patchClassTable(q('#paperResults'));if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class')patchClassTable(q('#printPortal table'));window.nataijiApplyEvaluation?.()}
let reportTimer;function scheduleReports(){clearTimeout(reportTimer);reportTimer=setTimeout(patchReportsNow,50)}
const oldReports=renderReports;renderReports=function(){oldReports();setTimeout(()=>{enhanceInputs();patchReportsNow()},0)};
const oldRender=render;render=function(){oldRender();setTimeout(()=>{enhanceInputs();patchReportsNow()},0)};

/* Strong final PDF/layout authority. */
const style=document.createElement('style');style.id='nataiji-final-grade-entry-style';style.textContent=`
.absent-btn{border:1px solid #d8a11e!important;background:#fff8df!important;color:#815500!important;border-radius:7px!important;padding:4px 7px!important;margin-inline-start:4px!important;font-weight:800!important;font-size:11px!important;white-space:nowrap}.mark.absent-mark,.mobile-mark.absent-mark{font-weight:900!important;color:#8a5700!important;background:#fff8df!important}.absence-text{color:#000!important;font-weight:900!important}.report-black-label,#officialSheet .sheet th,#officialSheet .info span{color:#000!important;font-weight:900!important}.report-incomplete .student-evaluation-cell span{display:none!important}
@media screen and (max-width:800px){.student-sheet-scroll #officialSheet{width:820px!important;min-width:820px!important}.student-sheet-scroll #officialSheet .sheet{font-size:16px!important}.student-sheet-scroll #officialSheet .sheet th,.student-sheet-scroll #officialSheet .sheet td{height:42px!important;padding:9px 11px!important}}
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
function forcePageOrientation(){if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class'){let s=q('#final-page-orientation');if(!s){s=document.createElement('style');s.id='final-page-orientation';document.head.appendChild(s)}s.textContent='@page{size:297mm 210mm;margin:5mm}'}else{q('#final-page-orientation')?.remove()}}
window.addEventListener('beforeprint',()=>{forcePageOrientation();patchReportsNow()});window.addEventListener('afterprint',()=>q('#final-page-orientation')?.remove());
new MutationObserver(()=>{enhanceInputs();scheduleReports()}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop,#subjectPicker'))setTimeout(()=>{enhanceInputs();patchReportsNow()},40)},true);
window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{enhanceInputs();patchReportsNow()},700));setTimeout(()=>{enhanceInputs();patchReportsNow()},0);
window.nataijiIsAbsent=isAbsent;window.nataijiTermComplete=termComplete;window.nataijiAnnualAverageStrict=annualAvg;
})();
