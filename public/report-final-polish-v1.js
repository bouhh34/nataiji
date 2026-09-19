(()=>{
'use strict';
if(window.__nataijiReportFinalPolishV1)return;
window.__nataijiReportFinalPolishV1=true;

const q=(s,r=document)=>r.querySelector(s);
function dedupe(type){
  const host=type==='student'?q('#studentReport'):type==='class'?q('#classReport'):q('#listReport');
  const doc=type==='student'?q('#officialSheet'):type==='class'?q('#classReport .paper'):q('#listReport .paper');
  if(!host||!doc)return;
  const wrappers=[];
  let p=doc.parentElement;
  while(p&&p!==host){
    if(p.classList?.contains('report-preview-stage-v2')||p.classList?.contains('report-preview-stage'))wrappers.push(p);
    p=p.parentElement;
  }
  if(wrappers.length<=1)return;
  const keep=wrappers[0],outer=wrappers[wrappers.length-1],parent=outer.parentNode;
  if(parent){
    parent.insertBefore(keep,outer);
    keep.classList.remove('report-preview-stage');
    keep.classList.add('report-preview-stage-v2');
    keep.dataset.previewType=type;
    wrappers.slice(1).forEach(w=>{try{w.remove()}catch{}});
  }
}
function normalize(){['student','class','list'].forEach(dedupe)}
document.addEventListener('click',e=>{
  if(e.target.closest?.('.report-tabs [data-report],[data-view="reports"],#showResult'))setTimeout(normalize,120);
},true);
window.addEventListener('DOMContentLoaded',()=>setTimeout(normalize,700));
setTimeout(normalize,1400);

const style=document.createElement('style');
style.id='nataiji-report-final-polish-v1';
style.textContent=`
@media screen and (max-width:760px){
  .report-preview-stage-v2 .report-preview-stage-v2,
  .report-preview-stage-v2 .report-preview-stage{
    display:contents!important;
    border:0!important;
    padding:0!important;
    margin:0!important;
    background:transparent!important;
    box-shadow:none!important;
  }
}
@media print{
  /* Keep class and list reports compact enough for 20 pupils on one A4 page.
     Student reports and two-per-A4 printing are intentionally untouched. */
  body[data-print="class"] #classReport,
  body[data-print="list"] #listReport{
    margin:0 auto!important;
    padding:0!important;
    overflow:visible!important;
  }
  body[data-print="class"] #classReport{width:202mm!important;max-width:202mm!important}
  body[data-print="list"] #listReport{width:190mm!important;max-width:190mm!important}

  body[data-print="class"] #classReport .paper,
  body[data-print="list"] #listReport .paper{
    box-sizing:border-box!important;
    margin:0 auto!important;
    min-height:0!important;
    border:0!important;
    overflow:visible!important;
    transform:none!important;
    zoom:1!important;
  }
  body[data-print="class"] #classReport .paper{
    width:202mm!important;
    max-width:202mm!important;
    padding:2.5mm 4mm!important;
  }
  body[data-print="list"] #listReport .paper{
    width:190mm!important;
    max-width:190mm!important;
    padding:2.5mm 5mm!important;
  }

  body[data-print="class"] #classReport .doc-head.final-official-head,
  body[data-print="class"] #classReport .nr-head,
  body[data-print="list"] #listReport .doc-head.final-official-head,
  body[data-print="list"] #listReport .nr-head{
    grid-template-columns:minmax(0,1fr) 24mm minmax(0,1fr)!important;
    gap:3mm!important;
    font-size:7.2pt!important;
    line-height:1.18!important;
    margin:0 0 1.2mm!important;
  }
  body[data-print="class"] #classReport .doc-basmala,
  body[data-print="list"] #listReport .doc-basmala{
    font-size:7.1pt!important;
    margin-bottom:.35mm!important;
    white-space:nowrap!important;
  }
  body[data-print="class"] #classReport .doc-center img,
  body[data-print="class"] #classReport .nr-center img,
  body[data-print="list"] #listReport .doc-center img,
  body[data-print="list"] #listReport .nr-center img{
    width:18mm!important;
    height:18mm!important;
  }
  body[data-print="class"] #classReport h2,
  body[data-print="list"] #listReport h2{
    font-size:14pt!important;
    line-height:1.15!important;
    margin:1.6mm 0 .8mm!important;
  }
  body[data-print="class"] #classReport .nr-term,
  body[data-print="list"] #listReport .nr-term{
    font-size:7.6pt!important;
    margin:0 0 1.2mm!important;
  }

  body[data-print="class"] #classReport .table-scroll,
  body[data-print="list"] #listReport .table-scroll{
    overflow:visible!important;
    width:100%!important;
  }

  body[data-print="class"] #classReport .nr-class-table{
    margin-top:.6mm!important;
    font-size:8pt!important;
    table-layout:fixed!important;
  }
  body[data-print="class"] #classReport .nr-class-v2 .plain-head,
  body[data-print="class"] #classReport .nr-class-v2 .sub-head{
    height:23mm!important;
  }
  body[data-print="class"] #classReport .nr-class-v2 .vertical-label{
    height:17.5mm!important;
    gap:.45mm!important;
  }
  body[data-print="class"] #classReport .nr-class-v2 .vertical-label span{font-size:7.6pt!important}
  body[data-print="class"] #classReport .nr-class-v2 .vertical-label small{font-size:6.2pt!important}
  body[data-print="class"] #classReport .nr-class-v2 .plain-head{font-size:7.8pt!important;padding:.55mm .3mm!important}
  body[data-print="class"] #classReport .nr-class-v2 .plain-head small{font-size:6.2pt!important;margin-top:.4mm!important}
  body[data-print="class"] #classReport .nr-class-v2 .sub-head>.subject-max{
    height:2.7mm!important;
    margin:.3mm auto 0!important;
    font-size:6.2pt!important;
  }
  body[data-print="class"] #classReport .nr-class-v2 tbody td{
    height:5.75mm!important;
    padding:.3mm .35mm!important;
    line-height:1.02!important;
    font-size:7.6pt!important;
  }
  body[data-print="class"] #classReport .nr-class-v2 .name-cell{
    font-size:7.6pt!important;
    padding-right:.7mm!important;
  }
  body[data-print="class"] #classReport .nr-class-v2 .name-cell small{font-size:5.8pt!important;margin-top:.2mm!important}
  body[data-print="class"] #classReport .nr-class-v2 .mark-cell{font-size:7.2pt!important}
  body[data-print="class"] #classReport .nr-class-v2 .rank-cell{font-size:7.6pt!important}
  body[data-print="class"] #classReport .nr-class-v2 .avg-cell{font-size:7.5pt!important}
  body[data-print="class"] #classReport .nr-class-v2 .obs-cell{font-size:7pt!important}
  body[data-print="class"] #classReport .nr-class-v2 .obs-cell small{font-size:5.6pt!important;margin-top:.15mm!important}
  body[data-print="class"] #classReport .nr-class-signatures{
    margin-top:2.5mm!important;
    font-size:8pt!important;
    page-break-inside:avoid!important;
  }

  body[data-print="list"] #listReport table{
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    table-layout:fixed!important;
    border-collapse:collapse!important;
    font-size:7.7pt!important;
    margin-top:1mm!important;
  }
  body[data-print="list"] #listReport th,
  body[data-print="list"] #listReport td{
    height:5.6mm!important;
    min-height:5.6mm!important;
    padding:.45mm .7mm!important;
    line-height:1.05!important;
    overflow-wrap:anywhere!important;
    vertical-align:middle!important;
  }
  body[data-print="list"] #listReport th{font-size:7.1pt!important}
  body[data-print="list"] #listReport tbody tr{
    break-inside:avoid!important;
    page-break-inside:avoid!important;
  }

  body[data-print="class"] #classReport .page-cut{
    break-after:auto!important;
    page-break-after:auto!important;
  }
}
`;
document.head.appendChild(style);
})();