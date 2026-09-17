(()=>{
'use strict';

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TERMS_DEFAULT=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const terms=()=>{const a=Array.isArray(state?.terms)?state.terms.filter(Boolean):[];return [a[0]||TERMS_DEFAULT[0],a[1]||TERMS_DEFAULT[1],a[2]||TERMS_DEFAULT[2]]};
const WEIGHTS=[1,2,3];
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'—';

function totalMax(){
  const key=String(state?.activeClassId||state?.classCode||state?.className||'default');
  const n=Number(state?.scoringByClass?.[key]?.totalMax ?? state?.totalMax);
  return Number.isFinite(n)&&n>0?n:200;
}
function termRows(term){return term===state?.term?(state?.marks||[]):(state?.marksByTerm?.[term]||[])}
function termAverage(i,term){
  const row=termRows(term)?.[i];if(!Array.isArray(row)||!row.some(v=>v!==''&&v!=null))return null;
  const sum=row.reduce((a,v)=>v===''||v==null?a:a+(Number.isFinite(Number(v))?Number(v):0),0);
  return sum*20/totalMax();
}
function annualAverage(i){
  const avgs=terms().map(t=>termAverage(i,t));if(avgs.some(v=>v==null))return null;
  /* Official yearly weighting: T1×1 + T2×2 + T3×3, divided by 6.
     Each trimester average is already normalized to /20, so the yearly result stays /20. */
  return (avgs[0]+2*avgs[1]+3*avgs[2])/6;
}
function annualRanks(){
  const vals=(state?.pupils||[]).map((_,i)=>annualAverage(i));
  return vals.map(v=>v==null?null:1+vals.filter(x=>x!=null&&x>v).length);
}
function callNo(p,i){return String(p?.[5]??'').trim()||String(i+1)}
function currentStudentIndex(){return Math.max(0,q('#student')?.selectedIndex??0)}
function finalTerm(){const t=terms();return state?.term===t[2]||/الثالث|3e|3ème|3/i.test(String(state?.term||''))}
function rowByLabel(body,re){return [...body.rows].find(r=>re.test(String(r.cells?.[0]?.textContent||'').trim()))}
function makeRow(ar,frLabel,value){const tr=document.createElement('tr');tr.className='annual-summary-row nr-stat';tr.innerHTML=`<th dir="rtl" class="report-black-label report-summary-label">${esc(ar)}</th><td><strong dir="ltr">${esc(value)}</strong></td><th dir="ltr" class="report-black-label report-summary-label">${esc(frLabel)}</th>`;return tr}
function removeAnnualRows(body){qa('tr.annual-summary-row',body).forEach(r=>r.remove())}

function ensureSwipeWrapper(){
  const sheet=q('#officialSheet');if(!sheet||sheet.parentElement?.classList.contains('student-sheet-scroll'))return;
  const wrap=document.createElement('div');wrap.className='student-sheet-scroll';sheet.parentNode.insertBefore(wrap,sheet);wrap.appendChild(sheet);
}
function markBoldLabels(root=q('#officialSheet')){
  if(!root)return;
  qa('.sheet th',root).forEach(x=>x.classList.add('report-black-label'));
  qa('.info span',root).forEach(x=>x.classList.add('report-black-label'));
  qa('.sheet tbody tr',root).forEach(r=>{const label=String(r.cells?.[0]?.textContent||'').trim();if(/^(المجموع|المعدل|معدل الفصل|المعدل العام|الرتبة|Total|Moyenne|Rang)/i.test(label))r.cells?.[0]?.classList.add('report-black-label','report-summary-label')});
}

function patchFinalStudent(){
  const root=q('#officialSheet'),body=q('#sheet');if(!root||!body||!state?.pupils?.length)return;
  removeAnnualRows(body);
  const i=currentStudentIndex(),baseAvg=rowByLabel(body,/^(المعدل|Moyenne|Moyenne du 3e trimestre|معدل الفصل الثالث)$/i),rankRow=rowByLabel(body,/^(الرتبة|Rang|الرتبة العامة|Rang général)$/i);
  if(!finalTerm()){
    if(baseAvg)baseAvg.cells[0].textContent=fr()?'Moyenne':'المعدل';
    if(rankRow)rankRow.cells[0].textContent=fr()?'Rang':'الرتبة';
    markBoldLabels(root);return;
  }
  const ts=terms(),a1=termAverage(i,ts[0]),a2=termAverage(i,ts[1]),a3=termAverage(i,ts[2]),annual=annualAverage(i),rank=annualRanks()[i];
  if(baseAvg){baseAvg.cells[0].textContent=fr()?'Moyenne du 3e trimestre':'معدل الفصل الثالث';baseAvg.cells[1].innerHTML=`<strong dir="ltr">${fmt(a3)} / 20</strong>`}
  const anchor=rankRow||null;
  body.insertBefore(makeRow('معدل الفصل الثاني','Moyenne du 2e trimestre',`${fmt(a2)} / 20`),anchor);
  body.insertBefore(makeRow('معدل الفصل الأول','Moyenne du 1er trimestre',`${fmt(a1)} / 20`),anchor);
  body.insertBefore(makeRow('المعدل العام','Moyenne générale',annual==null?'—':`${fmt(annual)} / 20`),anchor);
  if(rankRow){rankRow.cells[0].textContent='الرتبة';rankRow.cells[2].textContent='Rang';rankRow.cells[1].innerHTML=`<strong>${rank==null?'—':rank+' / '+(state.pupils||[]).length}</strong>`;rankRow.cells[0].classList.add('report-black-label','report-summary-label');rankRow.cells[2].classList.add('report-black-label','report-summary-label')}
  const obsRow=rowByLabel(body,/^(الملاحظة|Observation)$/i);if(obsRow){const ok=annual!=null&&annual>=10;obsRow.cells[0].textContent='الملاحظة';obsRow.cells[2].textContent='Observation';obsRow.cells[1].innerHTML=annual==null?'<strong>—</strong>':`<strong>${ok?'ناجح / Admis':'راسب / Non admis'}</strong>`}
  markBoldLabels(root);
}

function fillFinalTable(table){
  if(!finalTerm()||!table||!state?.pupils?.length)return;
  const ranks=annualRanks(),isFrench=fr();
  table.innerHTML=`<thead><tr>
    <th>${isFrench?"N° d’appel":'رقم النداء'}</th><th>${isFrench?'Élève':'التلميذ'}</th>
    <th>${isFrench?'1er trimestre':'معدل الفصل الأول'}</th><th>${isFrench?'2e trimestre':'معدل الفصل الثاني'}</th><th>${isFrench?'3e trimestre':'معدل الفصل الثالث'}</th>
    <th>${isFrench?'Moyenne générale /20':'المعدل العام /20'}</th><th>${isFrench?'Rang':'الرتبة'}</th><th data-eval-col="1">${isFrench?'Appréciation':'الملاحظة'}</th>
  </tr></thead><tbody>${state.pupils.map((p,i)=>{const ts=terms(),a1=termAverage(i,ts[0]),a2=termAverage(i,ts[1]),a3=termAverage(i,ts[2]),annual=annualAverage(i),remark=annual!=null&&typeof window.nataijiRemark==='function'?window.nataijiRemark(annual):'';return `<tr><td>${esc(callNo(p,i))}</td><td>${esc(p[1])}</td><td>${fmt(a1)}</td><td>${fmt(a2)}</td><td>${fmt(a3)}</td><td><strong>${fmt(annual)}</strong></td><td><strong>${ranks[i]??'—'}</strong></td><td data-eval-cell="1">${esc(remark)}</td></tr>`}).join('')}</tbody>`;
}
function buildFinalClassTable(){
  if(!finalTerm())return;fillFinalTable(q('#paperResults'));
  const title=q('#classReportTitle');if(title)title.textContent=fr()?'Résultats annuels – 3e trimestre':'النتائج السنوية – الفصل الثالث';
  if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class')fillFinalTable(q('#printPortal table'));
}

function patchBatchFinal(){
  if(!finalTerm())return;const ranks=annualRanks();
  qa('#printBatch .batch-sheet').forEach((root,i)=>{
    const body=q('.sheet tbody',root);if(!body||!state?.pupils?.[i])return;removeAnnualRows(body);
    const baseAvg=rowByLabel(body,/^(المعدل|Moyenne|Moyenne du 3e trimestre|معدل الفصل الثالث)$/i),rankRow=rowByLabel(body,/^(الرتبة|Rang|الرتبة العامة|Rang général)$/i);
    const ts=terms(),a1=termAverage(i,ts[0]),a2=termAverage(i,ts[1]),a3=termAverage(i,ts[2]),annual=annualAverage(i);
    if(baseAvg){baseAvg.cells[0].textContent=fr()?'Moyenne du 3e trimestre':'معدل الفصل الثالث';baseAvg.cells[1].innerHTML=`<strong dir="ltr">${fmt(a3)} / 20</strong>`}
    body.insertBefore(makeRow('معدل الفصل الأول','Moyenne du 1er trimestre',`${fmt(a1)} / 20`),rankRow||null);
    body.insertBefore(makeRow('معدل الفصل الثاني','Moyenne du 2e trimestre',`${fmt(a2)} / 20`),rankRow||null);
    body.insertBefore(makeRow('المعدل العام','Moyenne générale',annual==null?'—':`${fmt(annual)} / 20`),rankRow||null);
    if(rankRow){rankRow.cells[0].textContent=fr()?'Rang':'الرتبة';rankRow.cells[1].innerHTML=`<strong>${ranks[i]??'—'}</strong>`}
    markBoldLabels(root);
  });
}

let timer,busy=false;
function patchAll(){if(busy)return;busy=true;try{ensureSwipeWrapper();patchFinalStudent();buildFinalClassTable();patchBatchFinal();markBoldLabels()}finally{busy=false}}
function schedule(ms=70){clearTimeout(timer);timer=setTimeout(patchAll,ms)}

const css=document.createElement('style');css.id='annual-results-v1-style';css.textContent=`
.student-sheet-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;padding:4px 0 10px;scrollbar-width:thin}
.report-black-label{color:#000!important;font-weight:900!important}.report-summary-label{font-size:1.04em!important}
#officialSheet .sheet th{color:#000!important;font-weight:900!important;background:#f5f5f5!important}#officialSheet .info{color:#000!important}#officialSheet .info b{color:#000!important;font-weight:900!important}
#officialSheet .annual-summary-row td{border-top:1.5px solid #111!important}
@media screen and (max-width:800px){.student-sheet-scroll #officialSheet{box-sizing:border-box!important;width:760px!important;min-width:760px!important;max-width:none!important;font-size:15px!important;margin:0!important;padding:24px!important}.student-sheet-scroll #officialSheet h1{font-size:28px!important;color:#000!important;font-weight:900!important}.student-sheet-scroll #officialSheet h3{font-size:18px!important;color:#000!important;font-weight:900!important}.student-sheet-scroll #officialSheet .sheet{font-size:15px!important}.student-sheet-scroll #officialSheet .sheet th,.student-sheet-scroll #officialSheet .sheet td{padding:8px 10px!important;height:38px!important}}
@media print{.student-sheet-scroll{display:contents!important;overflow:visible!important;padding:0!important}#officialSheet .sheet th,#officialSheet .report-black-label,.batch-sheet .report-black-label{color:#000!important;font-weight:900!important}#officialSheet .annual-summary-row td,.batch-sheet .annual-summary-row td{font-weight:800!important}body[data-print=portal][data-portal-type=class] #printPortal table th{color:#000!important;font-weight:900!important;background:#f2f2f2!important}}
`;
document.head.appendChild(css);

new MutationObserver(()=>schedule(100)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop'))schedule(80)},true);
document.addEventListener('click',e=>{if(e.target.closest?.('#showResult,[data-report],#printResult,.report-print'))schedule(60)},true);
window.addEventListener('beforeprint',()=>patchAll());
window.addEventListener('DOMContentLoaded',()=>schedule(900));
setTimeout(()=>schedule(0),0);setTimeout(()=>schedule(1200),1200);
window.nataijiTermAverage=termAverage;window.nataijiAnnualAverage=annualAverage;window.nataijiAnnualRanks=annualRanks;
})();
