(()=>{
'use strict';

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TERMS_DEFAULT=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const terms=()=>{const a=Array.isArray(state?.terms)?state.terms.filter(Boolean):[];return [a[0]||TERMS_DEFAULT[0],a[1]||TERMS_DEFAULT[1],a[2]||TERMS_DEFAULT[2]]};
const WEIGHTS=[1,2,3];
const fmt=n=>n===''||n==null||!Number.isFinite(Number(n))?'—':Number(n).toFixed(1);

function totalMax(){
  const sum=(state?.subjects||[]).reduce((a,s)=>{const n=Number(s?.[3]);return a+(Number.isFinite(n)&&n>0?n:20)},0);
  return sum>0?sum:200;
}
function termRows(term){return term===state?.term?(state?.marks||[]):(state?.marksByTerm?.[term]||[])}
function isAbsent(v){return /^(غائب|غائبة|absent|absente|a)$/i.test(String(v??'').trim())}
function female(i){const p=state?.pupils?.[i]||[],g=String(p?.[2]??p?.[6]??p?.gender??'').trim().toLowerCase();return /أنثى|انثى|female|féminin|feminin|fille/.test(g)}
function absenceLabel(i,frLabel=false){return female(i)?(frLabel?'Absente':'غائبة'):(frLabel?'Absent':'غائب')}
function termAbsent(i,term){const row=termRows(term)?.[i]||[];return !!state?.subjects?.length&&state.subjects.every((_,j)=>isAbsent(row[j]))}
function termAverage(i,term){
  const row=termRows(term)?.[i]||[],subjects=state?.subjects||[];
  if(!subjects.length||termAbsent(i,term))return null;
  const complete=subjects.every((_,j)=>{const v=row[j];return v!==''&&v!=null&&(isAbsent(v)||Number.isFinite(Number(v)))});
  if(!complete)return null;
  const sum=subjects.reduce((a,_,j)=>{const v=row[j];return a+(isAbsent(v)?0:Number(v))},0);
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
  const i=currentStudentIndex(),baseAvg=[...body.rows].find(r=>/^(المعدل(?: العام)?|Moyenne(?: générale)?)/i.test(String(r.cells?.[0]?.textContent||'').trim())),rankRow=rowByLabel(body,/^(الرتبة|Rang|الرتبة العامة|Rang général)$/i),totalRow=rowByLabel(body,/^(المجموع|Total)$/i);
  if(!finalTerm()){
    if(baseAvg)baseAvg.cells[0].textContent=fr()?'Moyenne':'المعدل';
    if(rankRow)rankRow.cells[0].textContent=fr()?'Rang':'الرتبة';
    markBoldLabels(root);return;
  }
  const ts=terms(),a1=termAverage(i,ts[0]),a2=termAverage(i,ts[1]),a3=termAverage(i,ts[2]),annual=annualAverage(i),rank=annualRanks()[i];
  const absent3=termAbsent(i,ts[2]);if(totalRow?.cells?.[1]&&absent3)totalRow.cells[1].innerHTML='<strong>—</strong>';if(baseAvg){if(baseAvg.cells[0])baseAvg.cells[0].textContent='معدل الفصل الثالث';if(baseAvg.cells[2])baseAvg.cells[2].textContent='Moyenne du 3e trimestre';baseAvg.cells[1].innerHTML=absent3?`<strong>${absenceLabel(i)} / ${absenceLabel(i,true)}</strong>`:`<strong dir="ltr">${fmt(a3)} / 20</strong>`}
  const anchor=rankRow||null;
  body.insertBefore(makeRow('معدل الفصل الثاني','Moyenne du 2e trimestre',`${fmt(a2)} / 20`),anchor);
  body.insertBefore(makeRow('معدل الفصل الأول','Moyenne du 1er trimestre',`${fmt(a1)} / 20`),anchor);
  body.insertBefore(makeRow('المعدل العام','Moyenne générale',absent3?`${absenceLabel(i)} / ${absenceLabel(i,true)}`:(annual==null?'—':`${fmt(annual)} / 20`)),anchor);
  if(rankRow){rankRow.cells[0].textContent='الرتبة';rankRow.cells[2].textContent='Rang';rankRow.cells[1].innerHTML=`<strong>${rank==null?'—':rank+' / '+(state.pupils||[]).length}</strong>`;rankRow.cells[0].classList.add('report-black-label','report-summary-label');rankRow.cells[2].classList.add('report-black-label','report-summary-label')}
  const obsRow=rowByLabel(body,/^(الملاحظة|Observation)$/i);if(obsRow){const ok=annual!=null&&annual>=10;obsRow.cells[0].textContent='الملاحظة';obsRow.cells[2].textContent='Observation';obsRow.cells[1].innerHTML=absent3?`<strong>${absenceLabel(i)} / ${absenceLabel(i,true)}</strong>`:(annual==null?'<strong>—</strong>':`<strong>${ok?'ناجح / Admis':'راسب / Non admis'}</strong>`)}
  markBoldLabels(root);
}

function fillFinalTable(table){
  if(!finalTerm()||!table||!state?.pupils?.length)return;
  const ts=terms(),subjects=state.subjects||[];
  const subjectMax=s=>{const n=Number(s?.[3]);return Number.isFinite(n)&&n>0?n:20};
  const annualRankValues=annualRanks();
  const ordered=(state.pupils||[]).map((p,i)=>({p,i,annual:annualAverage(i),rank:annualRankValues[i]})).sort((a,b)=>{
    const av=a.annual,bv=b.annual;
    if(av==null&&bv==null)return String(a.p?.[1]||'').localeCompare(String(b.p?.[1]||''),'ar');
    if(av==null)return 1;if(bv==null)return -1;
    if(bv!==av)return bv-av;
    return String(a.p?.[1]||'').localeCompare(String(b.p?.[1]||''),'ar');
  });
  table.className='nr-table nr-class-table nr-final-class';
  table.setAttribute('dir','rtl');
  table.innerHTML=`<thead><tr>
    <th class="final-rank"><span>الرتبة</span><small>Rang</small></th>
    <th class="final-name"><span>الاسم الكامل</span><small>Nom complet</small></th>
    ${subjects.map(s=>`<th class="final-sub"><div class="final-vertical"><span dir="rtl">${esc(s?.[0]||'')}</span>${s?.[2]?`<em dir="ltr">${esc(s[2])}</em>`:''}<small dir="ltr">/${subjectMax(s)}</small></div></th>`).join('')}
    <th class="final-avg"><div class="final-vertical"><span>معدل الثالث</span><small dir="ltr">T3 /20</small></div></th>
    <th class="final-avg"><div class="final-vertical"><span>معدل الثاني</span><small dir="ltr">T2 /20</small></div></th>
    <th class="final-avg"><div class="final-vertical"><span>معدل الأول</span><small dir="ltr">T1 /20</small></div></th>
    <th class="final-avg"><div class="final-vertical"><span>المعدل العام</span><small dir="ltr">Moy. /20</small></div></th>
    <th class="final-obs"><span>الملاحظة</span><small>Observation</small></th>
  </tr></thead><tbody>${ordered.map((o,pos)=>{
    const p=o.p,i=o.i,row=termRows(ts[2])?.[i]||[],absent3=termAbsent(i,ts[2]),a3=termAverage(i,ts[2]),a2=termAverage(i,ts[1]),a1=termAverage(i,ts[0]),annual=o.annual,remark=absent3?absenceLabel(i):(annual==null?'':(annual>=10?'ناجح':'راسب'));
    return `<tr><td class="final-rank-cell"><b>${o.rank==null?'—':o.rank}</b></td><td class="final-name-cell"><span dir="rtl">${esc(p?.[1]||'')}</span>${p?.[4]?`<small dir="ltr">${esc(p[4])}</small>`:''}</td>${subjects.map((sub,j)=>`<td class="final-mark">${isAbsent(row[j])?esc(absenceLabel(i)):row[j]===''||row[j]==null?'':esc(row[j])}</td>`).join('')}<td class="final-num">${absent3?esc(absenceLabel(i)):fmt(a3)}</td><td class="final-num">${fmt(a2)}</td><td class="final-num">${fmt(a1)}</td><td class="final-num final-general"><b>${absent3?esc(absenceLabel(i)):fmt(annual)}</b></td><td class="final-obs-cell"><span>${esc(remark)}</span><small>${absent3?esc(absenceLabel(i,true)):(annual==null?'':(annual>=10?'Admis':'Non admis'))}</small></td></tr>`
  }).join('')}</tbody>`;
}
function buildFinalClassTable(){
  if(!finalTerm())return;fillFinalTable(q('#paperResults'));
  const title=q('#classReportTitle');if(title)title.innerHTML='<span dir="ltr">Résultats du 3e trimestre</span> | <span dir="rtl">نتائج الفصل الثالث</span>';
  if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class')fillFinalTable(q('#printPortal table'));
}

function patchBatchFinal(){
  if(!finalTerm())return;const ranks=annualRanks();
  qa('#printBatch .batch-sheet').forEach((root,i)=>{
    const body=q('.sheet tbody',root);if(!body||!state?.pupils?.[i])return;removeAnnualRows(body);
    const baseAvg=rowByLabel(body,/^(المعدل|Moyenne|Moyenne du 3e trimestre|معدل الفصل الثالث)$/i),rankRow=rowByLabel(body,/^(الرتبة|Rang|الرتبة العامة|Rang général)$/i);
    const ts=terms(),a1=termAverage(i,ts[0]),a2=termAverage(i,ts[1]),a3=termAverage(i,ts[2]),annual=annualAverage(i),absent3=termAbsent(i,ts[2]);
    if(baseAvg){baseAvg.cells[0].textContent=fr()?'Moyenne du 3e trimestre':'معدل الفصل الثالث';baseAvg.cells[1].innerHTML=absent3?`<strong>${absenceLabel(i)} / ${absenceLabel(i,true)}</strong>`:`<strong dir="ltr">${fmt(a3)} / 20</strong>`}
    body.insertBefore(makeRow('معدل الفصل الثاني','Moyenne du 2e trimestre',`${fmt(a2)} / 20`),rankRow||null);
    body.insertBefore(makeRow('معدل الفصل الأول','Moyenne du 1er trimestre',`${fmt(a1)} / 20`),rankRow||null);
    body.insertBefore(makeRow('المعدل العام','Moyenne générale',absent3?`${absenceLabel(i)} / ${absenceLabel(i,true)}`:(annual==null?'—':`${fmt(annual)} / 20`)),rankRow||null);
    if(rankRow){rankRow.cells[0].textContent='الرتبة';if(rankRow.cells[2])rankRow.cells[2].textContent='Rang';rankRow.cells[1].innerHTML=`<strong>${ranks[i]==null?'—':ranks[i]+' / '+(state.pupils||[]).length}</strong>`}
    const obsRow=rowByLabel(body,/^(الملاحظة|Observation)$/i);if(obsRow){const ok=annual!=null&&annual>=10;if(obsRow.cells[0])obsRow.cells[0].textContent='الملاحظة';if(obsRow.cells[2])obsRow.cells[2].textContent='Observation';obsRow.cells[1].innerHTML=absent3?`<strong>${absenceLabel(i)} / ${absenceLabel(i,true)}</strong>`:(annual==null?'<strong>—</strong>':`<strong>${ok?'ناجح / Admis':'راسب / Non admis'}</strong>`)}
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
css.textContent+="\n@media print{\n body[data-print=portal][data-portal-type=class] #printPortal table{font-size:9.2pt!important;table-layout:fixed!important}\n body[data-print=portal][data-portal-type=class] #printPortal table th,\n body[data-print=portal][data-portal-type=class] #printPortal table td{padding:3px 2px!important;line-height:1.12!important}\n body[data-print=portal][data-portal-type=class] #printPortal .sub-head small,\n body[data-print=portal][data-portal-type=class] #printPortal .avg-head small{display:block!important;font-size:.82em!important;font-weight:800!important;direction:ltr!important}\n body[data-print=portal][data-portal-type=class] #printPortal .mark-only{font-size:9.5pt!important;font-weight:700!important}\n}\n#paperResults{table-layout:fixed!important}\n#paperResults th,#paperResults td{padding:5px 3px!important}\n#paperResults .sub-head span,#paperResults .avg-head span{display:block!important}\n";css.textContent+="\n#paperResults .sub-head small,#paperResults .avg-head small{display:block!important;font-size:.78em!important;font-weight:800!important;direction:ltr!important;margin-top:2px!important}\n#paperResults .mark-only{direction:ltr!important;font-weight:700!important}\n";css.textContent+="#paperResults.nr-final-class{width:100%!important;table-layout:fixed!important;border-collapse:collapse!important}\n#paperResults.nr-final-class th,#paperResults.nr-final-class td{border:1px solid #222!important;text-align:center!important;vertical-align:middle!important;padding:3px 2px!important}\n#paperResults.nr-final-class .final-rank{width:6%!important}.nr-final-class .final-name{width:18%!important}.nr-final-class .final-obs{width:8%!important}\n.nr-final-class .final-sub,.nr-final-class .final-avg{width:auto!important;height:118px!important;padding:0!important}\n.nr-final-class .final-vertical{height:114px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:3px!important;writing-mode:vertical-rl!important;transform:rotate(180deg)!important;white-space:nowrap!important}\n.nr-final-class .final-vertical span{font-weight:800!important}.nr-final-class .final-vertical em{font-style:normal!important;font-size:.72em!important;font-weight:700!important;opacity:.92!important}.nr-final-class .final-vertical small{font-size:.76em!important;font-weight:800!important}\n.nr-final-class .final-name span,.nr-final-class .final-name small,.nr-final-class .final-name-cell span,.nr-final-class .final-name-cell small,.nr-final-class .final-obs span,.nr-final-class .final-obs small,.nr-final-class .final-obs-cell span,.nr-final-class .final-obs-cell small{display:block!important}\n.nr-final-class .final-name-cell{text-align:right!important;font-weight:700!important}.nr-final-class .final-name-cell small{font-size:.74em!important;text-align:left!important;margin-top:2px!important}\n.nr-final-class .final-mark,.nr-final-class .final-num{direction:ltr!important;font-weight:700!important}.nr-final-class .final-general{font-weight:900!important}\n.nr-final-class .final-obs-cell small{font-size:.72em!important}\n@media print{#paperResults.nr-final-class{font-size:8.8pt!important}.nr-final-class .final-sub,.nr-final-class .final-avg{height:27mm!important}.nr-final-class .final-vertical{height:26mm!important}.nr-final-class td{height:7.5mm!important;font-size:8.8pt!important}.nr-final-class .final-name-cell{font-size:9.1pt!important}.nr-final-class .final-mark,.nr-final-class .final-num{font-size:9pt!important}}";document.head.appendChild(css);

const previousAnnualRenderReports=typeof renderReports==='function'?renderReports:null;if(previousAnnualRenderReports){renderReports=function(){previousAnnualRenderReports();setTimeout(patchAll,0)}}
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop'))schedule(80)},true);
document.addEventListener('click',e=>{if(e.target.closest?.('#showResult,[data-report],#printResult,.report-print'))schedule(60)},true);
window.addEventListener('beforeprint',()=>patchAll());
window.addEventListener('DOMContentLoaded',()=>schedule(900));
setTimeout(()=>schedule(0),0);setTimeout(()=>schedule(1200),1200);
window.nataijiApplyAnnualReports=patchAll;window.nataijiTermAverage=termAverage;window.nataijiAnnualAverage=annualAverage;window.nataijiAnnualRanks=annualRanks;
})();
