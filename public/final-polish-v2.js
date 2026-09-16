(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const TERMS=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const ABS='غائب';
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const isAbsent=v=>/^(غائب|absent|a)$/i.test(String(v??'').trim());
const filled=v=>v!==''&&v!=null;
const maxFor=(subjects,j)=>{const n=Number(subjects?.[j]?.[3]);return Number.isFinite(n)&&n>0?n:20};
const activeKey=()=>String(state?.activeClassId||state?.classCode||state?.className||'default');
const totalMax=()=>{const n=Number(state?.scoringByClass?.[activeKey()]?.totalMax??state?.totalMax);return Number.isFinite(n)&&n>0?n:200};
const rowsFor=t=>t===state?.term?(state?.marks||[]):(state?.marksByTerm?.[t]||[]);
function safeNumeric(v,max){if(isAbsent(v))return 0;const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(max,n)):0}
function completeRow(row=[]){return (state?.subjects||[]).every((_,j)=>filled(row[j]))}
function strictTerm(i,t){const row=rowsFor(t)?.[i]||[];if(!completeRow(row))return null;let sum=0;(state.subjects||[]).forEach((s,j)=>sum+=safeNumeric(row[j],maxFor(state.subjects,j)));return sum*20/totalMax()}
function strictAnnual(i){const a=TERMS.map(t=>strictTerm(i,t));return a.some(v=>v==null)?null:(a[0]+2*a[1]+3*a[2])/6}
function strictAnnualRanks(){const vals=(state?.pupils||[]).map((_,i)=>strictAnnual(i));return vals.map(v=>v==null?null:1+vals.filter(x=>x!=null&&x>v).length)}
function currentStrict(i){const row=state?.marks?.[i]||[],complete=completeRow(row);let sum=0;(state?.subjects||[]).forEach((s,j)=>sum+=safeNumeric(row[j],maxFor(state.subjects,j)));return{sum,avg:sum*20/totalMax(),complete,totalMax:totalMax()}}
function currentRanks(){const vals=(state?.pupils||[]).map((_,i)=>currentStrict(i));return vals.map(v=>!v.complete?null:1+vals.filter(x=>x.complete&&x.avg>v.avg).length)}
function labelIncomplete(){return fr()?'Incomplet':'غير مكتمل'}
function remarkFor(v){if(v==null)return'';try{return window.nataijiRemark?.(v)||''}catch{return''}}

/* Normalize legacy impossible marks once per active class. Absent stays absent, blanks stay missing. */
let normalizedSig='';
function normalizeInvalidMarks(){
  if(!state?.subjects?.length)return 0;const sig=[activeKey(),state.subjects.map(s=>s?.[3]).join(','),(state.marks||[]).length,Object.keys(state.marksByTerm||{}).join('|')].join('::');
  if(sig===normalizedSig)return 0;normalizedSig=sig;let changed=0;
  const cleanMatrix=matrix=>{if(!Array.isArray(matrix))return;matrix.forEach(row=>{if(!Array.isArray(row))return;(state.subjects||[]).forEach((s,j)=>{const v=row[j];if(!filled(v)||isAbsent(v))return;const n=Number(v),m=maxFor(state.subjects,j);if(!Number.isFinite(n)){row[j]='';changed++;return}const c=Math.max(0,Math.min(m,n));if(c!==n){row[j]=c;changed++}})})};
  cleanMatrix(state.marks);Object.values(state.marksByTerm||{}).forEach(cleanMatrix);
  const d=state.classData?.[state.activeClassId];if(d){cleanMatrix(d.marks);Object.values(d.marksByTerm||{}).forEach(cleanMatrix)}
  if(changed){try{markDirty?.()}catch{}setTimeout(()=>{try{save(true)}catch{}},120)}return changed;
}

/* Final authoritative arithmetic, including absent = 0 and blank = incomplete. */
try{calc=function(i){return currentStrict(i)};ranks=function(){return currentRanks()}}catch{}
window.nataijiTermAverageStrict=strictTerm;window.nataijiAnnualAverageStrict=strictAnnual;window.nataijiAnnualRanksStrict=strictAnnualRanks;

function findRow(body,re){return [...(body?.rows||[])].find(r=>re.test(String(r.cells?.[0]?.textContent||'').trim()))}
function setCell(row,value){if(row?.cells?.[1])row.cells[1].innerHTML=value}
function patchStudentSummary(root,i){
  if(!root||!state?.pupils?.[i])return;const body=q('.sheet tbody',root);if(!body)return;const now=currentStrict(i),rank=currentRanks()[i],final=state.term===TERMS[2];
  const total=findRow(body,/^(المجموع|Total)$/i),avg=findRow(body,/^(المعدل|Moyenne|Moyenne du 3e trimestre|معدل الفصل الثالث)$/i),rankRow=findRow(body,/^(الرتبة|Rang|الرتبة العامة|Rang général)$/i);
  setCell(total,`<strong dir="ltr">${Number(now.sum.toFixed(2))} / ${now.totalMax}</strong>`);
  if(!final){setCell(avg,now.complete?`<strong dir="ltr">${now.avg.toFixed(1)} / 20</strong>`:`<strong>${labelIncomplete()}</strong>`);setCell(rankRow,rank==null?'<strong>—</strong>':`<strong>${rank}</strong>`)}
  else{
    const a1=strictTerm(i,TERMS[0]),a2=strictTerm(i,TERMS[1]),a3=strictTerm(i,TERMS[2]),annual=strictAnnual(i),ar=strictAnnualRanks()[i];
    const mapping=[[/^(معدل الفصل الأول|Moyenne du 1er trimestre)$/i,a1],[/^(معدل الفصل الثاني|Moyenne du 2e trimestre)$/i,a2],[/^(معدل الفصل الثالث|Moyenne du 3e trimestre|المعدل|Moyenne)$/i,a3],[/^(المعدل العام|Moyenne générale)$/i,annual]];
    mapping.forEach(([re,v])=>{const r=findRow(body,re);if(r)setCell(r,v==null?`<strong>${labelIncomplete()}</strong>`:`<strong dir="ltr">${v.toFixed(1)} / 20</strong>`)});
    if(rankRow){rankRow.cells[0].textContent=fr()?'Rang général':'الرتبة العامة';setCell(rankRow,ar==null?'<strong>—</strong>':`<strong>${ar}</strong>`)}
  }
  const basis=final?strictAnnual(i):(now.complete?now.avg:null),evalCell=q('.student-evaluation-cell',root)||q('.sheet tbody td[rowspan]',root);if(evalCell){evalCell.innerHTML=basis==null?'':`<span>${remarkFor(basis)}</span>`}
  root.classList.toggle('report-incomplete',basis==null);
}
function patchClassFinal(){
  const table=q('#paperResults');if(!table?.tBodies?.[0])return;const final=state?.term===TERMS[2];
  if(final){const ranks=strictAnnualRanks();[...table.tBodies[0].rows].forEach((r,i)=>{const vals=[strictTerm(i,TERMS[0]),strictTerm(i,TERMS[1]),strictTerm(i,TERMS[2]),strictAnnual(i)];for(let k=0;k<4;k++){if(r.cells?.[k+2])r.cells[k+2].innerHTML=vals[k]==null?`<strong>${labelIncomplete()}</strong>`:`<strong>${vals[k].toFixed(1)}</strong>`}if(r.cells?.[6])r.cells[6].innerHTML=ranks[i]==null?'—':`<strong>${ranks[i]}</strong>`;if(r.cells?.[7])r.cells[7].textContent=vals[3]==null?'':remarkFor(vals[3])})}
  else{const rs=currentRanks();[...table.tBodies[0].rows].forEach((r,i)=>{const c=currentStrict(i),avgIdx=2+(state?.subjects?.length||0),rankIdx=avgIdx+1,evalIdx=rankIdx+1;if(r.cells?.[avgIdx])r.cells[avgIdx].innerHTML=c.complete?`<strong>${c.avg.toFixed(1)}</strong>`:`<strong>${labelIncomplete()}</strong>`;if(r.cells?.[rankIdx])r.cells[rankIdx].innerHTML=rs[i]==null?'—':`<strong>${rs[i]}</strong>`;if(r.cells?.[evalIdx])r.cells[evalIdx].textContent=c.complete?remarkFor(c.avg):''})}
}
function patchPortalClass(){if(document.body.dataset.print!=='portal'||document.body.dataset.portalType!=='class')return;const src=q('#paperResults'),dst=q('#printPortal table');if(src&&dst)dst.innerHTML=src.innerHTML;applyDensity()}
function patchAllStudentRoots(){const selected=Math.max(0,q('#student')?.selectedIndex??0);patchStudentSummary(q('#officialSheet'),selected);qa('#printBatch .batch-sheet').forEach((r,i)=>patchStudentSummary(r,i))}

function applyDensity(){
  const portal=q('#printPortal .portal-paper');if(!portal)return;const n=state?.pupils?.length||0;portal.dataset.pupilCount=String(n);portal.dataset.density=n<=10?'spacious':n<=20?'normal':'dense';
}
function polishLabels(root=document){qa('.sheet th,.sheet .report-summary-label,.info span,#paperResults th,#paperList th',root).forEach(x=>x.classList.add('final-ink'))}
function repairStaticClassLabel(){const o=q('#classTop option');if(o&&/^1AF\s*-\s*السنة الثانية ابتدائية/.test(o.textContent))o.textContent='1AF - السنة الأولى ابتدائية'}

let applying=false,timer;
function apply(){if(applying)return;applying=true;try{repairStaticClassLabel();normalizeInvalidMarks();patchAllStudentRoots();patchClassFinal();patchPortalClass();applyDensity();polishLabels()}finally{applying=false}}
function schedule(ms=40){clearTimeout(timer);timer=setTimeout(apply,ms)}

/* Visual identity and print geometry: equal header columns, stronger hierarchy, adaptive tables. */
const style=document.createElement('style');style.id='nataiji-final-polish-v2';style.textContent=`
.final-ink{color:#000!important;font-weight:900!important}.final-official-head{display:grid!important;grid-template-columns:minmax(0,1fr) 38mm minmax(0,1fr)!important;column-gap:6mm!important;align-items:start!important}.final-official-head .doc-side{display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-self:start!important;line-height:1.38!important}.final-official-head .doc-primary,.final-official-head .doc-motto{font-weight:900!important;color:#000!important;min-height:1.55em!important;margin:0 0 .6mm!important}.final-official-head .doc-center{align-self:start!important;text-align:center!important}.final-official-head .doc-basmala{font-weight:800!important;color:#000!important}.final-official-head .doc-line span{font-weight:700!important;color:#111!important}.final-official-head .doc-line b{font-weight:900!important;color:#000!important}.sheet th,.sheet td,#paperResults th,#paperList th{color:#000!important}.sheet th,#paperResults th,#paperList th{font-weight:900!important}.sheet tbody tr:has(.report-summary-label) td,.annual-summary-row td{border-top:1.6px solid #111!important}.student-evaluation-cell span{font-weight:900!important;color:#000!important}.report-incomplete .student-evaluation-cell{background:#fafafa!important}.report-incomplete .student-evaluation-cell span{display:none!important}
@media print{
  .final-official-head{grid-template-columns:minmax(0,1fr) 34mm minmax(0,1fr)!important;column-gap:5mm!important}
  body[data-print="student"] #officialSheet{width:194mm!important;max-width:194mm!important;min-height:280mm!important;padding:7mm 8mm!important}
  body[data-print="student"] #officialSheet .doc-head.final-official-head{font-size:11.3pt!important;line-height:1.45!important}
  body[data-print="student"] #officialSheet .doc-center img{width:31mm!important;height:31mm!important}
  body[data-print="student"] #officialSheet h1{font-size:22pt!important;margin:5mm 0 1.5mm!important;font-weight:900!important;color:#000!important}
  body[data-print="student"] #officialSheet h3{font-size:13.5pt!important;font-weight:900!important;color:#000!important}
  body[data-print="student"] #officialSheet .info{font-size:10.8pt!important;gap:2mm 4mm!important}
  body[data-print="student"] #officialSheet .sheet{font-size:11.2pt!important;line-height:1.25!important}
  body[data-print="student"] #officialSheet .sheet th,body[data-print="student"] #officialSheet .sheet td{height:9mm!important;padding:1.25mm 1.55mm!important}
  body[data-print="student"] #officialSheet .workflow-signatures{font-size:10pt!important;margin-top:auto!important;padding-top:10mm!important}

  body[data-print="batch"] .batch-page.two .batch-sheet{padding:3.2mm 5.5mm 2.7mm!important}
  body[data-print="batch"] .batch-page.two .doc-head.final-official-head{grid-template-columns:minmax(0,1fr) 27mm minmax(0,1fr)!important;font-size:8.1pt!important;line-height:1.18!important}
  body[data-print="batch"] .batch-page.two .doc-center img{width:18mm!important;height:18mm!important}
  body[data-print="batch"] .batch-page.two h1{font-size:15.8pt!important;font-weight:900!important}
  body[data-print="batch"] .batch-page.two .sheet{font-size:7.9pt!important}
  body[data-print="batch"] .batch-page.two .sheet th,body[data-print="batch"] .batch-page.two .sheet td{height:4.45mm!important;padding:.25mm .5mm!important}

  /* Portrait-safe fallback; landscape engines expand it below. */
  body[data-print="portal"][data-portal-type="class"] #printPortal{width:194mm!important;max-width:194mm!important;margin:0 auto!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{box-sizing:border-box!important;width:194mm!important;max-width:194mm!important;padding:5mm 6mm!important;margin:0 auto!important;border:0!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .doc-head.final-official-head{font-size:8.7pt!important;grid-template-columns:minmax(0,1fr) 28mm minmax(0,1fr)!important;column-gap:3.5mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .doc-center img{width:21mm!important;height:21mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal h2{font-size:18pt!important;font-weight:900!important;margin:3mm 0 4mm!important;color:#000!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal table{width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;font-size:7.8pt!important;line-height:1.12!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th,body[data-print="portal"][data-portal-type="class"] #printPortal td{height:6.8mm!important;padding:.65mm .45mm!important;white-space:normal!important;overflow-wrap:anywhere!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-density="spacious"] table{font-size:8.5pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-density="spacious"] th,body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-density="spacious"] td{height:8mm!important;padding:.8mm .5mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-density="dense"] table{font-size:6.9pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-density="dense"] th,body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-density="dense"] td{height:5.7mm!important;padding:.45mm .3mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .class-result-signatures{font-size:9pt!important;margin-top:7mm!important}

  body[data-print="portal"][data-portal-type="list"] #printPortal{width:194mm!important;max-width:194mm!important;margin:0 auto!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper{width:194mm!important;max-width:194mm!important;box-sizing:border-box!important;padding:7mm 9mm!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal .doc-head.final-official-head{font-size:10.2pt!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal h2{font-size:21pt!important;font-weight:900!important;margin:5mm 0!important;color:#000!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal table{width:100%!important;table-layout:fixed!important;font-size:11pt!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal th,body[data-print="portal"][data-portal-type="list"] #printPortal td{height:9mm!important;padding:1.1mm 1.4mm!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-density="spacious"] table{font-size:12.2pt!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-density="spacious"] th,body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-density="spacious"] td{height:11mm!important;padding:1.45mm!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-density="dense"] table{font-size:9pt!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-density="dense"] th,body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-density="dense"] td{height:7mm!important;padding:.75mm 1mm!important}
}
@media print and (orientation:landscape){
  body[data-print="portal"][data-portal-type="class"] #printPortal{width:287mm!important;max-width:287mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{width:287mm!important;max-width:287mm!important;padding:5mm 7mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .doc-head.final-official-head{font-size:10.2pt!important;grid-template-columns:minmax(0,1fr) 36mm minmax(0,1fr)!important;column-gap:6mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .doc-center img{width:25mm!important;height:25mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal h2{font-size:21pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal table{font-size:10pt!important;table-layout:auto!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th,body[data-print="portal"][data-portal-type="class"] #printPortal td{height:7.8mm!important;padding:.9mm .7mm!important;overflow-wrap:normal!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-density="spacious"] table{font-size:11pt!important}
}
`;
document.head.appendChild(style);

function printPageRule(){let s=q('#nataiji-final-page-rule');if(!s){s=document.createElement('style');s.id='nataiji-final-page-rule';document.head.appendChild(s)}s.textContent=document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class'?'@page{size:A4 landscape;margin:5mm}':'@page{size:A4 portrait;margin:6mm}'}
new MutationObserver(()=>schedule(70)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop,#yearTop,#subjectPicker'))schedule(30)},true);
document.addEventListener('input',e=>{if(e.target.matches?.('.mark,.mobile-mark'))schedule(35)},true);
window.addEventListener('beforeprint',()=>{apply();printPageRule()});window.addEventListener('afterprint',()=>q('#nataiji-final-page-rule')?.remove());
window.addEventListener('DOMContentLoaded',()=>schedule(700));setTimeout(()=>schedule(0),0);setTimeout(()=>schedule(1100),1100);
})();