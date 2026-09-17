(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const shortAr={'التربية الإسلامية':'إسلامية','اللغة العربية':'العربية','القراءة':'القراءة','التعبير':'التعبير','الكتابة':'الكتابة','الرياضيات':'رياضيات','التربية المدنية':'مدنية','التربية الفنية':'فنية','الرياضة':'رياضة','التربية البدنية':'رياضة','التاريخ والجغرافيا':'تاريخ/جغرافيا','اللغة الفرنسية':'Français','Français':'Français','العلوم':'علوم','العلوم الطبيعية':'علوم'};
const shortFr={'التربية الإسلامية':'Islam.','اللغة العربية':'Arabe','القراءة':'Lecture','التعبير':'Expr.','الكتابة':'Écrit.','الرياضيات':'Maths','التربية المدنية':'Civique','التربية الفنية':'Arts','الرياضة':'Sport','التربية البدنية':'Sport','التاريخ والجغرافيا':'Hist./Géo','اللغة الفرنسية':'Français','Français':'Français','العلوم':'Sciences','العلوم الطبيعية':'Sciences'};
function normalizeFirstGrade(root=document){
  qa('*',root).forEach(el=>{if(el.children.length)return;let t=el.textContent||'';let u=t.replace(/1AF\s*-\s*2e\s+année\s+primaire/gi,'1AF - 1re année primaire').replace(/1AF\s*-\s*السنة\s+الثانية\s+ابتدائية/g,'1AF - السنة الأولى ابتدائية');if(u!==t)el.textContent=u});
}
function density(){const n=state?.pupils?.length||0;return n<=10?'roomy':n<=20?'normal':'dense'}
function patchList(){if(document.body.dataset.print!=='portal'||document.body.dataset.portalType!=='list')return;const paper=q('#printPortal .portal-paper');if(!paper)return;paper.dataset.v4Density=density();paper.classList.add('v4-list-paper')}
function patchClass(){
  if(document.body.dataset.print!=='portal'||document.body.dataset.portalType!=='class')return;
  const paper=q('#printPortal .portal-paper'),table=q('#printPortal table');if(!paper||!table)return;
  paper.dataset.v4Density=density();paper.classList.add('v4-class-paper');table.classList.add('v4-class-table');
  const final=String(state?.term||'').includes('الثالث');
  const th=[...(table.tHead?.rows?.[0]?.cells||[])];
  if(!final&&state?.subjects?.length&&th.length>=state.subjects.length+5){
    const start=2;state.subjects.forEach((s,j)=>{const cell=th[start+j];if(cell){const raw=String(s?.[0]||'');cell.textContent=(fr()?shortFr[raw]:shortAr[raw])||raw}});
    const avg=th[start+state.subjects.length],rank=th[start+state.subjects.length+1],app=th[start+state.subjects.length+2];
    if(avg)avg.textContent=fr()?'Moy.':'المعدل';if(rank)rank.textContent=fr()?'Rang':'الرتبة';if(app)app.textContent=fr()?'Appréc.':'الملاحظة';
  }
}
function forcePortraitPage(){
  if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class'){
    let s=q('#critical-page-rule');if(!s){s=document.createElement('style');s.id='critical-page-rule';document.head.appendChild(s)}
    s.textContent='@page{size:A4 portrait;margin:8mm}';
  }
}
function apply(){normalizeFirstGrade();patchClass();patchList()}
const css=document.createElement('style');css.id='nataiji-report-layout-v4';css.textContent=`
.final-official-head{grid-template-columns:minmax(0,1fr) 34mm minmax(0,1fr)!important;column-gap:5mm!important;align-items:start!important}.final-official-head .doc-side{line-height:1.36!important}.final-official-head .doc-primary,.final-official-head .doc-motto{font-weight:900!important;color:#000!important;margin:0 0 .9mm!important;min-height:1.35em!important}.final-official-head .doc-center{padding-top:0!important}.final-official-head .doc-basmala{font-size:.92em!important;margin-bottom:.8mm!important}.final-official-head .doc-center img{display:block!important;margin:0 auto!important}.workflow-signatures{display:grid!important;grid-template-columns:repeat(3,1fr)!important;align-items:end!important;text-align:center!important;color:#000!important;font-weight:800!important}
@media print{
 body[data-print="portal"][data-portal-type="class"]{width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal{width:194mm!important;max-width:194mm!important;min-width:194mm!important;margin:0 auto!important;padding:0!important;transform:none!important;zoom:1!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{box-sizing:border-box!important;width:194mm!important;max-width:194mm!important;min-width:194mm!important;margin:0!important;padding:4.5mm 3.5mm!important;border:0!important;transform:none!important;zoom:1!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .final-official-head{grid-template-columns:minmax(0,1fr) 25mm minmax(0,1fr)!important;column-gap:3.2mm!important;font-size:7.7pt!important;line-height:1.22!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .doc-center img{width:19mm!important;height:19mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal h2{font-size:17pt!important;font-weight:900!important;color:#000!important;margin:2.7mm 0 3.5mm!important;line-height:1.1!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table{width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;font-size:7.15pt!important;line-height:1.1!important;color:#000!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table th{font-size:6.8pt!important;font-weight:900!important;line-height:1.05!important;padding:.75mm .3mm!important;background:#f2f5f6!important;color:#000!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;vertical-align:middle!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table td{font-size:7.2pt!important;line-height:1.08!important;padding:.6mm .28mm!important;height:6.6mm!important;color:#000!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;vertical-align:middle!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table th:first-child,body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table td:first-child{width:7mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table th:nth-child(2),body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table td:nth-child(2){width:27mm!important;font-size:7.5pt!important;font-weight:700!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table th:nth-last-child(3),body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table td:nth-last-child(3){width:13mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table th:nth-last-child(2),body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table td:nth-last-child(2){width:9mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table th:last-child,body[data-print="portal"][data-portal-type="class"] #printPortal table.v4-class-table td:last-child{width:17mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="roomy"] table.v4-class-table td{height:7.8mm!important;font-size:7.8pt!important;padding:.7mm .35mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="roomy"] table.v4-class-table th{font-size:7.25pt!important;padding:.9mm .35mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="dense"] table.v4-class-table td{height:5.5mm!important;font-size:6.7pt!important;padding:.4mm .25mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="dense"] table.v4-class-table th{font-size:6.3pt!important;padding:.55mm .25mm!important}
 body[data-print="portal"][data-portal-type="class"] #printPortal .workflow-signatures{font-size:8pt!important;margin-top:8mm!important;padding-top:2mm!important;min-height:18mm!important}

 body[data-print="portal"][data-portal-type="list"] #printPortal{width:194mm!important;max-width:194mm!important;margin:0 auto!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper{box-sizing:border-box!important;width:194mm!important;max-width:194mm!important;padding:7mm 7mm!important;margin:0 auto!important;border:0!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .final-official-head{font-size:9.7pt!important;line-height:1.35!important;grid-template-columns:minmax(0,1fr) 31mm minmax(0,1fr)!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .doc-center img{width:25mm!important;height:25mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal h2{font-size:19pt!important;font-weight:900!important;color:#000!important;margin:5mm 0 4.5mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:9.7pt!important;color:#000!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal th{font-size:9.4pt!important;font-weight:900!important;background:#f2f5f6!important;color:#000!important;padding:1.2mm 1mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal td{font-size:9.7pt!important;padding:1mm!important;height:8.2mm!important;color:#000!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-v4-density="roomy"] td{height:10mm!important;font-size:10.2pt!important;padding:1.25mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-v4-density="roomy"] th{font-size:10pt!important;padding:1.35mm 1mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-v4-density="dense"] td{height:6.2mm!important;font-size:8.5pt!important;padding:.65mm!important}
 body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper[data-v4-density="dense"] th{font-size:8.4pt!important;padding:.8mm .6mm!important}

 body[data-print="student"] #officialSheet{width:194mm!important;max-width:194mm!important;min-height:280mm!important;padding:7mm 8mm!important}
 body[data-print="student"] #officialSheet .final-official-head{font-size:10.4pt!important;line-height:1.38!important;grid-template-columns:minmax(0,1fr) 31mm minmax(0,1fr)!important}
 body[data-print="student"] #officialSheet .doc-center img{width:27mm!important;height:27mm!important}
 body[data-print="student"] #officialSheet h1{font-size:21pt!important;font-weight:900!important;margin:4.5mm 0 1mm!important;color:#000!important}
 body[data-print="student"] #officialSheet h3{font-size:13pt!important;font-weight:900!important;margin:0 0 2mm!important;color:#000!important}
 body[data-print="student"] #officialSheet .info{display:grid!important;grid-template-columns:1.15fr 1fr 1fr .7fr!important;gap:1.2mm 3mm!important;font-size:10.1pt!important;align-items:center!important}
 body[data-print="student"] #officialSheet .info>span{white-space:nowrap!important;font-weight:800!important;color:#000!important}
 body[data-print="student"] #officialSheet .sheet{width:100%!important;font-size:10.5pt!important;table-layout:fixed!important}
 body[data-print="student"] #officialSheet .sheet th{font-size:10.3pt!important;font-weight:900!important;background:#f2f5f6!important;color:#000!important}
 body[data-print="student"] #officialSheet .sheet th,body[data-print="student"] #officialSheet .sheet td{height:8.6mm!important;padding:1mm 1.4mm!important}
 body[data-print="student"] #officialSheet .critical-eval-cell,body[data-print="student"] #officialSheet .student-evaluation-cell{writing-mode:horizontal-tb!important;transform:none!important;text-align:center!important;vertical-align:middle!important;font-weight:900!important}
 body[data-print="student"] #officialSheet .workflow-signatures{font-size:9.5pt!important;margin-top:auto!important;padding-top:10mm!important;min-height:22mm!important}

 body[data-print="batch"] .batch-page.two .batch-sheet{padding:3.2mm 5.5mm 2.5mm!important}
 body[data-print="batch"] .batch-page.two .final-official-head{font-size:7.65pt!important;line-height:1.16!important;grid-template-columns:minmax(0,1fr) 24mm minmax(0,1fr)!important;column-gap:3mm!important}
 body[data-print="batch"] .batch-page.two .doc-center img{width:17.5mm!important;height:17.5mm!important}
 body[data-print="batch"] .batch-page.two h1{font-size:15.5pt!important;font-weight:900!important;margin:1.6mm 0 .4mm!important;color:#000!important}
 body[data-print="batch"] .batch-page.two h3{font-size:9pt!important;margin:0 0 .5mm!important;font-weight:900!important}
 body[data-print="batch"] .batch-page.two .info{font-size:7.2pt!important;gap:.3mm 1.6mm!important}
 body[data-print="batch"] .batch-page.two .sheet{font-size:7.6pt!important;table-layout:fixed!important}
 body[data-print="batch"] .batch-page.two .sheet th{font-size:7.35pt!important;font-weight:900!important;background:#f2f5f6!important;color:#000!important}
 body[data-print="batch"] .batch-page.two .sheet th,body[data-print="batch"] .batch-page.two .sheet td{height:4.15mm!important;padding:.2mm .45mm!important}
 body[data-print="batch"] .batch-page.two .critical-eval-cell,body[data-print="batch"] .batch-page.two .student-evaluation-cell{writing-mode:horizontal-tb!important;transform:none!important;text-align:center!important;vertical-align:middle!important;font-weight:900!important}
 body[data-print="batch"] .batch-page.two .workflow-signatures{font-size:7.1pt!important;padding-top:2.5mm!important;min-height:11mm!important}
}
`;
document.head.appendChild(css);
let timer,busy=false;function run(){if(busy)return;busy=true;try{apply()}finally{busy=false}}function schedule(ms=45){clearTimeout(timer);timer=setTimeout(run,ms)}
new MutationObserver(()=>schedule(70)).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('#printResult,.report-print,[data-report],#showResult'))schedule(20)},true);
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop'))schedule(20)},true);
window.addEventListener('beforeprint',()=>{apply();forcePortraitPage()});
window.addEventListener('DOMContentLoaded',()=>schedule(350));setTimeout(()=>schedule(0),0);setTimeout(()=>schedule(800),800);
})();