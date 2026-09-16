(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const isAbsent=v=>/^(غائب|absent|a)$/i.test(String(v??'').trim());
const filled=v=>v!==''&&v!=null;
const maxFor=j=>{const n=Number(state?.subjects?.[j]?.[3]);return Number.isFinite(n)&&n>0?n:20};

function activeClass(){return state?.classes?.find?.(c=>c.id===state?.activeClassId)||null}
function classCode(){
  const c=activeClass();
  const raw=[c?.code,state?.classCode,c?.name,state?.className].filter(Boolean).join(' ');
  return (raw.match(/\b([1-6])\s*AF\b/i)||[])[0]?.replace(/\s+/g,'').toUpperCase()||'';
}
function isFirstAF(){return classCode()==='1AF'}

/* 1AF is the first primary year everywhere, regardless of legacy stored labels. */
let classLabelSaved=false;
function repairClassIdentity(){
  if(!isFirstAF())return false;
  let changed=false;
  const fixAr=s=>String(s||'').replace(/السنة\s+الثانية\s+ابتدائية/g,'السنة الأولى ابتدائية');
  const c=activeClass();
  if(c?.name){const n=fixAr(c.name);if(n!==c.name){c.name=n;changed=true}}
  if(state?.className){const n=fixAr(state.className);if(n!==state.className){state.className=n;changed=true}}
  const d=state?.classData?.[state?.activeClassId];if(d?.className){const n=fixAr(d.className);if(n!==d.className){d.className=n;changed=true}}
  const o=q('#classTop option');if(o){o.textContent=isFr()?'1AF - 1re année primaire':'1AF - السنة الأولى ابتدائية'}
  qa('.final-official-head,.official-sheet,.portal-paper,.paper,#printPortal').forEach(root=>{
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while(n=w.nextNode()){
      let t=n.nodeValue||'',u=t;
      u=u.replace(/1AF\s*-\s*2e\s+année\s+primaire/gi,'1AF - 1re année primaire')
         .replace(/1AF\s*-\s*السنة\s+الثانية\s+ابتدائية/g,'1AF - السنة الأولى ابتدائية');
      if(u!==t)n.nodeValue=u;
    }
  });
  if(changed&&!classLabelSaved){classLabelSaved=true;setTimeout(()=>{try{save(true)}catch{}},150)}
  return changed;
}

/* Scan every loaded term. Impossible marks are corrected to the subject ceiling and persisted. */
let repairing=false;
function repairImpossibleMarks(){
  if(repairing||!state?.subjects?.length)return 0;repairing=true;let changed=0;
  try{
    const clean=matrix=>{
      if(!Array.isArray(matrix))return;
      matrix.forEach(row=>{
        if(!Array.isArray(row))return;
        state.subjects.forEach((_,j)=>{
          const v=row[j];if(!filled(v)||isAbsent(v))return;
          const n=Number(v),m=maxFor(j);
          if(!Number.isFinite(n)){row[j]='';changed++;return}
          const c=Math.max(0,Math.min(m,n));if(c!==n){row[j]=c;changed++}
        });
      });
    };
    clean(state.marks);Object.values(state.marksByTerm||{}).forEach(clean);
    Object.values(state.classData||{}).forEach(d=>{clean(d?.marks);Object.values(d?.marksByTerm||{}).forEach(clean)});
    if(changed){
      try{markDirty?.()}catch{}
      setTimeout(()=>{try{save(true)}catch{}},100);
      setTimeout(()=>{try{render?.()}catch{}try{renderReports?.()}catch{}},140);
    }
  }finally{repairing=false}
  return changed;
}

function enforceReportText(){
  repairClassIdentity();
  const sheet=q('#officialSheet');
  if(sheet){
    const info=q('.info',sheet);if(info)info.classList.add('critical-info-grid');
    const evalCell=q('.student-evaluation-cell',sheet)||q('.sheet tbody td[rowspan]',sheet);if(evalCell)evalCell.classList.add('critical-eval-cell');
  }
  qa('#printBatch .batch-sheet').forEach(s=>{const e=q('.student-evaluation-cell',s)||q('.sheet tbody td[rowspan]',s);if(e)e.classList.add('critical-eval-cell')});
  const portal=q('#printPortal .portal-paper');if(portal){const n=state?.pupils?.length||0;portal.dataset.criticalDensity=n<=12?'roomy':n<=22?'normal':'dense'}
}

function installPageRule(){
  let s=q('#critical-page-rule');if(!s){s=document.createElement('style');s.id='critical-page-rule';document.head.appendChild(s)}
  if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class')s.textContent='@page{size:A4 landscape;margin:5mm}';else s.textContent='';
}

const style=document.createElement('style');style.id='nataiji-critical-fix-v3';style.textContent=`
.critical-eval-cell,.critical-eval-cell span{writing-mode:horizontal-tb!important;transform:none!important;text-orientation:mixed!important;text-align:center!important;vertical-align:middle!important;white-space:normal!important;font-weight:900!important;color:#000!important}
#officialSheet .sheet th,#officialSheet .sheet td{color:#000!important}#officialSheet .sheet th{font-weight:900!important}
@media print{
  body[data-print="student"] #officialSheet .critical-info-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1.5mm 4mm!important;align-items:center!important}
  body[data-print="student"] #officialSheet .critical-info-grid>span{white-space:nowrap!important;overflow:visible!important;font-size:10.5pt!important;font-weight:800!important;color:#000!important}
  body[data-print="student"] #officialSheet .sheet th:nth-child(1),body[data-print="student"] #officialSheet .sheet td:nth-child(1){width:44%!important}
  body[data-print="student"] #officialSheet .sheet th:nth-child(2),body[data-print="student"] #officialSheet .sheet td:nth-child(2){width:25%!important}
  body[data-print="student"] #officialSheet .sheet th:nth-child(3),body[data-print="student"] #officialSheet .sheet td:nth-child(3){width:31%!important}

  /* Use a full logical landscape canvas. Android print services that keep a portrait preview
     will scale this full canvas to the page instead of leaving the report at ~60% width. */
  body[data-print="portal"][data-portal-type="class"]{width:297mm!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal{box-sizing:border-box!important;width:287mm!important;max-width:none!important;min-width:287mm!important;margin:0 auto!important;padding:0!important;transform:none!important;zoom:1!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{box-sizing:border-box!important;width:287mm!important;max-width:none!important;min-width:287mm!important;margin:0!important;padding:4.5mm 5.5mm!important;border:0!important;transform:none!important;zoom:1!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .final-official-head{grid-template-columns:minmax(0,1fr) 31mm minmax(0,1fr)!important;column-gap:5mm!important;font-size:10pt!important;line-height:1.26!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .doc-center img{width:24mm!important;height:24mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal h2{font-size:20pt!important;line-height:1.1!important;font-weight:900!important;color:#000!important;margin:3mm 0 4mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal table{width:100%!important;max-width:none!important;table-layout:fixed!important;border-collapse:collapse!important;font-size:9.5pt!important;line-height:1.16!important;color:#000!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th{font-size:8.8pt!important;font-weight:900!important;background:#f2f5f6!important;color:#000!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;vertical-align:middle!important;padding:1mm .55mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal td{font-size:9.2pt!important;color:#000!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;vertical-align:middle!important;padding:.85mm .55mm!important;height:7.2mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th:nth-child(1),body[data-print="portal"][data-portal-type="class"] #printPortal td:nth-child(1){width:12mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th:nth-child(2),body[data-print="portal"][data-portal-type="class"] #printPortal td:nth-child(2){width:31mm!important;font-weight:700!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th:nth-last-child(3),body[data-print="portal"][data-portal-type="class"] #printPortal td:nth-last-child(3){width:17mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th:nth-last-child(2),body[data-print="portal"][data-portal-type="class"] #printPortal td:nth-last-child(2){width:13mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th:last-child,body[data-print="portal"][data-portal-type="class"] #printPortal td:last-child{width:22mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .workflow-signatures{font-size:9.5pt!important;margin-top:8mm!important;padding-top:3mm!important;min-height:18mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-critical-density="roomy"] table{font-size:10.4pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-critical-density="roomy"] td{font-size:10pt!important;height:8.2mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-critical-density="roomy"] th{font-size:9.5pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-critical-density="dense"] table{font-size:8.3pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-critical-density="dense"] td{font-size:8.2pt!important;height:6mm!important;padding:.5mm .35mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-critical-density="dense"] th{font-size:7.8pt!important;padding:.7mm .35mm!important}
}
`;
document.head.appendChild(style);

let timer,busy=false;
function apply(){if(busy)return;busy=true;try{repairClassIdentity();repairImpossibleMarks();enforceReportText();installPageRule()}finally{busy=false}}
function schedule(ms=35){clearTimeout(timer);timer=setTimeout(apply,ms)}
new MutationObserver(()=>schedule(60)).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#student,#classTop,.mark,.mobile-mark'))schedule(20)},true);
document.addEventListener('click',e=>{if(e.target.closest?.('#printResult,.report-print,#showResult,[data-report]'))schedule(15)},true);
window.addEventListener('beforeprint',()=>{repairImpossibleMarks();enforceReportText();installPageRule()});
window.addEventListener('afterprint',()=>{const s=q('#critical-page-rule');if(s)s.textContent=''});
window.addEventListener('DOMContentLoaded',()=>schedule(500));
setTimeout(()=>schedule(0),0);setTimeout(()=>schedule(900),900);
})();