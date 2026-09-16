(()=>{
'use strict';

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TERMS=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const WEIGHTS=[1,2,3];
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'—';

function totalMax(){
  const key=String(state?.activeClassId||state?.classCode||state?.className||'default');
  const n=Number(state?.scoringByClass?.[key]?.totalMax ?? state?.totalMax);
  return Number.isFinite(n)&&n>0?n:200;
}
function termRows(term){
  if(term===state?.term)return state?.marks||[];
  return state?.marksByTerm?.[term]||[];
}
function termAverage(i,term){
  const row=termRows(term)?.[i];
  if(!Array.isArray(row)||!row.some(v=>v!==''&&v!=null))return null;
  const sum=row.reduce((a,v)=>v===''||v==null?a:a+(Number.isFinite(Number(v))?Number(v):0),0);
  return sum*20/totalMax();
}
function annualAverage(i){
  const avgs=TERMS.map(t=>termAverage(i,t));
  if(avgs.some(v=>v==null))return null;
  return avgs.reduce((a,v,j)=>a+v*WEIGHTS[j],0)/WEIGHTS.reduce((a,b)=>a+b,0);
}
function annualRanks(){
  const vals=(state?.pupils||[]).map((_,i)=>annualAverage(i));
  return vals.map(v=>v==null?null:1+vals.filter(x=>x!=null&&x>v).length);
}
function callNo(p,i){return String(p?.[5]??'').trim()||String(i+1)}

function ensureSwipeWrapper(){
  const sheet=q('#officialSheet');if(!sheet||sheet.parentElement?.classList.contains('student-sheet-scroll'))return;
  const wrap=document.createElement('div');wrap.className='student-sheet-scroll';sheet.parentNode.insertBefore(wrap,sheet);wrap.appendChild(sheet);
}
function markBoldLabels(root=q('#officialSheet')){
  if(!root)return;
  root.querySelectorAll('.sheet th').forEach(x=>x.classList.add('report-black-label'));
  root.querySelectorAll('.info span').forEach(x=>x.classList.add('report-black-label'));
  root.querySelectorAll('.sheet tbody tr').forEach(r=>{
    const label=String(r.cells?.[0]?.textContent||'').trim();
    if(/^(المجموع|المعدل|معدل الفصل|المعدل العام|الرتبة|Total|Moyenne|Rang)/i.test(label))r.cells?.[0]?.classList.add('report-black-label','report-summary-label');
  });
}

function currentStudentIndex(){return Math.max(0,q('#student')?.selectedIndex??0)}
function currentTermIsFinal(){return state?.term===TERMS[2]}
function rowByLabel(body,re){return [...body.rows].find(r=>re.test(String(r.cells?.[0]?.textContent||'').trim()))}
function makeRow(label,value,cls='annual-summary-row'){
  const tr=document.createElement('tr');tr.className=cls;
  tr.innerHTML=`<td class="report-black-label report-summary-label">${esc(label)}</td><td><strong dir="ltr">${esc(value)}</strong></td><td></td>`;
  return tr;
}
function removeAnnualRows(body){qa('tr.annual-summary-row',body).forEach(r=>r.remove())}

function patchFinalStudent(){
  const root=q('#officialSheet'),body=q('#sheet');if(!root||!body||!state?.pupils?.length)return;
  removeAnnualRows(body);
  const i=currentStudentIndex();
  const baseAvg=rowByLabel(body,/^(المعدل|Moyenne)$/i);
  const rankRow=rowByLabel(body,/^(الرتبة|Rang)$/i);
  if(!currentTermIsFinal()){
    if(baseAvg)baseAvg.cells[0].textContent=fr()?'Moyenne':'المعدل';
    markBoldLabels(root);return;
  }
  const a1=termAverage(i,TERMS[0]),a2=termAverage(i,TERMS[1]),a3=termAverage(i,TERMS[2]),annual=annualAverage(i),rank=annualRanks()[i];
  if(baseAvg){baseAvg.cells[0].textContent=fr()?'Moyenne du 3e trimestre':'معدل الفصل الثالث';baseAvg.cells[1].innerHTML=`<strong dir="ltr">${fmt(a3)} / 20</strong>`}
  const anchor=rankRow||null;
  body.insertBefore(makeRow(fr()?'Moyenne du 1er trimestre':'معدل الفصل الأول',`${fmt(a1)} / 20`),anchor);
  body.insertBefore(makeRow(fr()?'Moyenne du 2e trimestre':'معدل الفصل الثاني',`${fmt(a2)} / 20`),anchor);
  body.insertBefore(makeRow(fr()?'Moyenne générale':'المعدل العام',annual==null?'—':`${fmt(annual)} / 20`),anchor);
  if(rankRow){rankRow.cells[0].textContent=fr()?'Rang général':'الرتبة العامة';rankRow.cells[1].innerHTML=`<strong>${rank??'—'}</strong>`;rankRow.cells[0].classList.add('report-black-label','report-summary-label')}
  forceAnnualRemark(root,annual);
  markBoldLabels(root);
}

function forceAnnualRemark(root,annual){
  if(!root||annual==null||typeof window.nataijiRemark!=='function')return;
  const body=q('.sheet tbody',root);if(!body)return;
  const rows=[...body.rows];if(!rows.length)return;
  rows.forEach(r=>{const c=r.cells?.[2];if(c){c.removeAttribute('rowspan');c.classList.remove('student-evaluation-cell')}});
  // Rebuild a single observation cell spanning the complete report.
  rows.forEach((r,idx)=>{
    if(idx===0){
      let c=r.cells[2];if(!c){c=r.insertCell(-1)}
      c.rowSpan=rows.length;c.className='student-evaluation-cell';c.innerHTML=`<span>${esc(window.nataijiRemark(annual))}</span>`;
    }else if(r.cells.length>2){r.deleteCell(2)}
  });
}

function buildFinalClassTable(){
  if(!currentTermIsFinal())return;
  const table=q('#paperResults');if(!table||!state?.pupils?.length)return;
  const ranks=annualRanks(),isFrench=fr();
  table.innerHTML=`<thead><tr>
    <th>${isFrench?"N° d’appel":'رقم النداء'}</th>
    <th>${isFrench?'Élève':'التلميذ'}</th>
    <th>${isFrench?'1er trimestre':'معدل الفصل الأول'}</th>
    <th>${isFrench?'2e trimestre':'معدل الفصل الثاني'}</th>
    <th>${isFrench?'3e trimestre':'معدل الفصل الثالث'}</th>
    <th>${isFrench?'Moyenne générale':'المعدل العام'}</th>
    <th>${isFrench?'Rang général':'الرتبة العامة'}</th>
    <th>${isFrench?'Appréciation':'الملاحظة'}</th>
  </tr></thead><tbody>${state.pupils.map((p,i)=>{
    const a1=termAverage(i,TERMS[0]),a2=termAverage(i,TERMS[1]),a3=termAverage(i,TERMS[2]),annual=annualAverage(i);
    const remark=annual!=null&&typeof window.nataijiRemark==='function'?window.nataijiRemark(annual):'';
    return `<tr><td>${esc(callNo(p,i))}</td><td>${esc(p[1])}</td><td>${fmt(a1)}</td><td>${fmt(a2)}</td><td>${fmt(a3)}</td><td><strong>${fmt(annual)}</strong></td><td><strong>${ranks[i]??'—'}</strong></td><td>${esc(remark)}</td></tr>`
  }).join('')}</tbody>`;
  const title=q('#classReportTitle');if(title)title.textContent=isFrench?'Résultats annuels – 3e trimestre':'النتائج السنوية – الفصل الثالث';
}

function patchBatchFinal(){
  if(!currentTermIsFinal())return;
  const ranks=annualRanks();
  qa('#printBatch .batch-sheet').forEach((root,i)=>{
    const body=q('.sheet tbody',root);if(!body||!state?.pupils?.[i])return;
    removeAnnualRows(body);
    const baseAvg=rowByLabel(body,/^(المعدل|Moyenne)$/i),rankRow=rowByLabel(body,/^(الرتبة|Rang)$/i);
    const a1=termAverage(i,TERMS[0]),a2=termAverage(i,TERMS[1]),a3=termAverage(i,TERMS[2]),annual=annualAverage(i);
    if(baseAvg){baseAvg.cells[0].textContent=fr()?'Moyenne du 3e trimestre':'معدل الفصل الثالث';baseAvg.cells[1].innerHTML=`<strong dir="ltr">${fmt(a3)} / 20</strong>`}
    body.insertBefore(makeRow(fr()?'Moyenne du 1er trimestre':'معدل الفصل الأول',`${fmt(a1)} / 20`),rankRow||null);
    body.insertBefore(makeRow(fr()?'Moyenne du 2e trimestre':'معدل الفصل الثاني',`${fmt(a2)} / 20`),rankRow||null);
    body.insertBefore(makeRow(fr()?'Moyenne générale':'المعدل العام',annual==null?'—':`${fmt(annual)} / 20`),rankRow||null);
    if(rankRow){rankRow.cells[0].textContent=fr()?'Rang général':'الرتبة العامة';rankRow.cells[1].innerHTML=`<strong>${ranks[i]??'—'}</strong>`}
    forceAnnualRemark(root,annual);markBoldLabels(root);
  });
}

let timer,busy=false;
function patchAll(){
  if(busy)return;busy=true;
  try{ensureSwipeWrapper();patchFinalStudent();if(currentTermIsFinal())buildFinalClassTable();patchBatchFinal();markBoldLabels()}finally{busy=false}
}
function schedule(ms=70){clearTimeout(timer);timer=setTimeout(patchAll,ms)}

const css=document.createElement('style');css.id='annual-results-v1-style';css.textContent=`
/* On-screen bulletin: keep it large and swipeable instead of shrinking it to phone width. */
.student-sheet-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;padding:4px 0 10px;scrollbar-width:thin}
.report-black-label{color:#000!important;font-weight:900!important}.report-summary-label{font-size:1.04em!important}
#officialSheet .sheet th{color:#000!important;font-weight:900!important;background:#f5f5f5!important}
#officialSheet .info{color:#000!important}#officialSheet .info b{color:#000!important;font-weight:900!important}
#officialSheet .annual-summary-row td{border-top:1.5px solid #111!important}
@media screen and (max-width:800px){
  .student-sheet-scroll #officialSheet{box-sizing:border-box!important;width:760px!important;min-width:760px!important;max-width:none!important;font-size:15px!important;margin:0!important;padding:24px!important}
  .student-sheet-scroll #officialSheet h1{font-size:28px!important;color:#000!important;font-weight:900!important}
  .student-sheet-scroll #officialSheet h3{font-size:18px!important;color:#000!important;font-weight:900!important}
  .student-sheet-scroll #officialSheet .sheet{font-size:15px!important}.student-sheet-scroll #officialSheet .sheet th,.student-sheet-scroll #officialSheet .sheet td{padding:8px 10px!important;height:38px!important}
}
@media print{
  .student-sheet-scroll{display:contents!important;overflow:visible!important;padding:0!important}
  #officialSheet .sheet th,#officialSheet .report-black-label,.batch-sheet .report-black-label{color:#000!important;font-weight:900!important}
  #officialSheet .annual-summary-row td,.batch-sheet .annual-summary-row td{font-weight:800!important}
  body[data-print=portal][data-portal-type=class] #printPortal table th{color:#000!important;font-weight:900!important;background:#f2f2f2!important}
}
`;
document.head.appendChild(css);

// Run after the other report/evaluation scripts so the final-term rules are authoritative.
new MutationObserver(()=>schedule(90)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop'))schedule(80)},true);
document.addEventListener('click',e=>{if(e.target.closest?.('#showResult,[data-report],#printResult,.report-print'))schedule(60)},true);
window.addEventListener('beforeprint',()=>patchAll());
window.addEventListener('DOMContentLoaded',()=>schedule(900));
setTimeout(()=>schedule(0),0);setTimeout(()=>schedule(1200),1200);
window.nataijiAnnualAverage=annualAverage;
window.nataijiAnnualRanks=annualRanks;
})();
