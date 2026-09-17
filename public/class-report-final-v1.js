(()=>{
'use strict';
if(window.__nataijiClassReportFinalV1)return;
window.__nataijiClassReportFinalV1=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const SUBJECT_FR={'التربية الإسلامية':'Éducation islamique','اللغة العربية':'Langue arabe','القراءة':'Lecture','التعبير':'Expression','الكتابة':'Écriture','الرياضيات':'Mathématiques','التربية المدنية':'Éducation civique','التربية الفنية':'Éducation artistique','الرياضة':'Éducation physique','التربية البدنية':'Éducation physique','التاريخ والجغرافيا':'Histoire et géographie','اللغة الفرنسية':'Français','Français':'Français','العلوم':'Sciences','العلوم الطبيعية':'Sciences naturelles'};
function getState(){try{return typeof state==='undefined'?null:state}catch{return null}}
function subjectName(s){const ar=String(s?.[0]||'').trim();return isFr()?String(s?.[2]||SUBJECT_FR[ar]||ar):ar}
function setCell(cell,text,cls=''){if(!cell)return;cell.removeAttribute('data-full-label');cell.removeAttribute('data-label');cell.removeAttribute('data-call-header');cell.removeAttribute('title');cell.className='';if(cls)cell.classList.add(cls);cell.replaceChildren(document.createTextNode(String(text??'').trim()))}
function numeric(v){const n=Number(String(v??'').replace(',','.').trim());return Number.isFinite(n)?n:Number.POSITIVE_INFINITY}
function removeStats(root){if(!root)return;const re=/^(الإحصائيات العامة(?: للقسم)?|إحصائيات عامة|Statistiques générales(?: de la classe)?)$/i;qa('h1,h2,h3,h4,h5,h6,p,div,span,strong,b',root).forEach(el=>{const t=String(el.textContent||'').replace(/\s+/g,' ').trim();if(!re.test(t))return;const block=el.closest('.general-stats,.statistics,.stats-summary,.class-stats,.summary-stats')||el;block.classList.add('nataiji-class-hide')})}
function normalizeTable(table){const s=getState(),head=table?.tHead?.rows?.[0];if(!s||!head)return;table.classList.add('nataiji-class-table-final');const n=s.subjects?.length||0,cells=[...head.cells],start=2;if(cells[0])setCell(cells[0],isFr()?'Rang':'الرتبة','nataiji-rank-head');if(cells[1])setCell(cells[1],isFr()?'Nom complet de l’élève':'اسم التلميذ الكامل','nataiji-name-head');
for(let j=0;j<n;j++)setCell(cells[start+j],subjectName(s.subjects[j]),'nataiji-subject-head');
const avgIdx=start+n,rankIdx=start+n+1,remarkIdx=start+n+2;if(cells[avgIdx])setCell(cells[avgIdx],isFr()?'Moyenne':'المعدل','nataiji-average-head');if(cells[rankIdx]){setCell(cells[rankIdx],isFr()?'Rang':'الرتبة','nataiji-original-rank');cells[rankIdx].classList.add('nataiji-class-hide')}if(cells[remarkIdx])setCell(cells[remarkIdx],isFr()?'Appréciation':'الملاحظة','nataiji-remark-head');
const rows=[...(table.tBodies?.[0]?.rows||[])];rows.forEach((row,i)=>{const originalRank=rankIdx<row.cells.length?numeric(row.cells[rankIdx]?.textContent):Number.POSITIVE_INFINITY;row.dataset.nataijiRank=Number.isFinite(originalRank)?String(originalRank):'';if(row.cells[0])row.cells[0].textContent=Number.isFinite(originalRank)?String(originalRank):String(i+1);if(row.cells[1])row.cells[1].classList.add('nataiji-name-cell');if(rankIdx<row.cells.length)row.cells[rankIdx]?.classList.add('nataiji-class-hide')});
rows.sort((a,b)=>numeric(a.dataset.nataijiRank)-numeric(b.dataset.nataijiRank)||String(a.cells?.[1]?.textContent||'').localeCompare(String(b.cells?.[1]?.textContent||''),'ar')).forEach(row=>table.tBodies[0].appendChild(row));
}
function apply(){normalizeTable(q('#paperResults'));normalizeTable(q('#printPortal table'));removeStats(q('#printPortal'))}
['nataiji-full-class-labels','nataiji-class-report-final-v3','nataiji-class-report-final-v4','nataiji-report-layout-v4','nataiji-call-number-control','nataiji-class-portrait-final'].forEach(id=>q('#'+id)?.remove());
const css=document.createElement('style');css.id='nataiji-class-report-master';css.textContent=`
#paperResults .nataiji-class-hide{display:none!important}
#paperResults th.nataiji-name-head{min-width:180px}
#paperResults td.nataiji-name-cell{white-space:normal;overflow-wrap:anywhere;font-weight:800}
.final-official-head .doc-meta,.final-official-head .doc-meta .doc-motto{text-align:start!important}
.final-official-head[dir="rtl"] .doc-meta,.final-official-head[dir="rtl"] .doc-meta .doc-motto{direction:rtl!important;text-align:right!important}
.final-official-head[dir="ltr"] .doc-meta,.final-official-head[dir="ltr"] .doc-meta .doc-motto{direction:ltr!important;text-align:left!important}
@media print{
@page{size:A4 portrait;margin:6mm!important}
body[data-print="portal"][data-portal-type="class"]{width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
body[data-print="portal"][data-portal-type="class"] #printPortal{width:198mm!important;max-width:198mm!important;min-width:198mm!important;margin:0 auto!important;padding:0!important;transform:none!important;zoom:1!important}
body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{box-sizing:border-box!important;width:198mm!important;max-width:198mm!important;min-width:198mm!important;margin:0!important;padding:4mm 2.5mm 3.5mm!important;border:0!important;transform:none!important;zoom:1!important}
body[data-print="portal"][data-portal-type="class"] #printPortal .final-official-head{width:100%!important;min-height:30mm!important;margin:0 0 2.2mm!important;display:grid!important;grid-template-columns:minmax(0,1fr) 30mm minmax(0,1fr)!important;column-gap:3mm!important;align-items:start!important;font-size:8pt!important;line-height:1.25!important}
body[data-print="portal"][data-portal-type="class"] #printPortal .final-official-head img{width:22mm!important;height:22mm!important;max-width:22mm!important;max-height:22mm!important;margin:0 auto!important}
body[data-print="portal"][data-portal-type="class"] #printPortal h1,body[data-print="portal"][data-portal-type="class"] #printPortal h2{margin:1mm 0 2.7mm!important;text-align:center!important;font-size:16pt!important;line-height:1.1!important;font-weight:900!important}
body[data-print="portal"][data-portal-type="class"] #printPortal table.nataiji-class-table-final{width:100%!important;max-width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;margin:0!important;color:#000!important}
body[data-print="portal"][data-portal-type="class"] #printPortal table.nataiji-class-table-final th,body[data-print="portal"][data-portal-type="class"] #printPortal table.nataiji-class-table-final td{border:.32mm solid #111!important;text-align:center!important;vertical-align:middle!important;box-sizing:border-box!important;color:#000!important}
body[data-print="portal"][data-portal-type="class"] #printPortal table.nataiji-class-table-final th{font-size:7pt!important;font-weight:900!important;line-height:1.08!important;padding:.7mm .3mm!important;height:25mm!important;white-space:normal!important;background:#f4f6f7!important}
body[data-print="portal"][data-portal-type="class"] #printPortal table.nataiji-class-table-final td{font-size:7.4pt!important;line-height:1.15!important;padding:1mm .4mm!important;height:7.4mm!important}
body[data-print="portal"][data-portal-type="class"] #printPortal th.nataiji-subject-head{writing-mode:vertical-rl!important;text-orientation:mixed!important;transform:none!important;white-space:nowrap!important;height:25mm!important;padding:.8mm .15mm!important}
body[data-print="portal"][data-portal-type="class"] #printPortal th.nataiji-subject-head::before,body[data-print="portal"][data-portal-type="class"] #printPortal th.nataiji-subject-head::after{content:none!important;display:none!important}
body[data-print="portal"][data-portal-type="class"] #printPortal th.nataiji-name-head,body[data-print="portal"][data-portal-type="class"] #printPortal td.nataiji-name-cell{width:36mm!important;min-width:36mm!important;max-width:36mm!important;writing-mode:horizontal-tb!important;white-space:normal!important}
body[data-print="portal"][data-portal-type="class"] #printPortal td.nataiji-name-cell{font-size:7.7pt!important;font-weight:800!important;line-height:1.2!important;overflow-wrap:anywhere!important;padding:1mm .7mm!important}
body[data-print="portal"][data-portal-type="class"] #printPortal th.nataiji-rank-head,body[data-print="portal"][data-portal-type="class"] #printPortal td:first-child{width:10mm!important;min-width:10mm!important;max-width:10mm!important}
body[data-print="portal"][data-portal-type="class"] #printPortal .nataiji-class-hide{display:none!important}
body[data-print="portal"][data-portal-type="class"] #printPortal .workflow-signatures,body[data-print="portal"][data-portal-type="class"] #printPortal footer{margin-top:6mm!important;padding-top:1.5mm!important;min-height:16mm!important;width:100%!important;font-size:8pt!important}
}`;document.head.appendChild(css);
let timer;const schedule=(ms=0)=>{clearTimeout(timer);timer=setTimeout(apply,ms)};new MutationObserver(()=>schedule(20)).observe(document.documentElement,{childList:true,subtree:true,characterData:true});document.addEventListener('click',e=>{if(e.target.closest?.('[data-report="class"],.report-print,[data-print="class"]')){schedule(0);schedule(80);schedule(220)}},true);document.addEventListener('change',()=>schedule(20),true);window.addEventListener('beforeprint',()=>{apply();setTimeout(apply,0)});window.addEventListener('DOMContentLoaded',()=>{schedule(100);schedule(500)});setTimeout(apply,0);
})();