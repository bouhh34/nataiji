(()=>{
'use strict';

/*
 * Final print authority for Nataiji PDFs.
 * Loaded last so it can safely override older print rules without changing
 * report data, calculations, permissions, or the interactive UI.
 */
const style=document.createElement('style');
style.id='nataiji-pdf-layout-v2';
style.textContent=`
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

  /* ---------- One selected pupil: one readable full A4 ---------- */
  body[data-print="student"] #officialSheet{
    box-sizing:border-box!important;
    display:flex!important;
    flex-direction:column!important;
    width:190mm!important;
    max-width:190mm!important;
    min-height:262mm!important;
    margin:0 auto!important;
    padding:7mm 8mm!important;
    border:1.5px solid #222!important;
    overflow:visible!important;
  }
  body[data-print="student"] #officialSheet .official-document-head{
    margin:0 0 4mm!important;
  }
  body[data-print="student"] #officialSheet .doc-head.final-official-head{
    grid-template-columns:minmax(0,1fr) 40mm minmax(0,1fr)!important;
    gap:5mm!important;
    font-size:10.4pt!important;
    line-height:1.48!important;
  }
  body[data-print="student"] #officialSheet .doc-basmala{
    font-size:10.6pt!important;
    margin-bottom:1mm!important;
  }
  body[data-print="student"] #officialSheet .doc-center img{
    width:29mm!important;
    height:29mm!important;
  }
  body[data-print="student"] #officialSheet h1{
    font-size:20pt!important;
    line-height:1.2!important;
    margin:4mm 0 1.5mm!important;
  }
  body[data-print="student"] #officialSheet h3{
    font-size:12.5pt!important;
    line-height:1.3!important;
    margin:0 0 3mm!important;
  }
  body[data-print="student"] #officialSheet .info{
    display:grid!important;
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:1.5mm 3mm!important;
    align-items:center!important;
    font-size:10.2pt!important;
    line-height:1.35!important;
    margin-bottom:2mm!important;
  }
  body[data-print="student"] #officialSheet .sheet{
    width:100%!important;
    margin-top:2.5mm!important;
    font-size:10.4pt!important;
    line-height:1.25!important;
    table-layout:fixed!important;
  }
  body[data-print="student"] #officialSheet .sheet th,
  body[data-print="student"] #officialSheet .sheet td{
    height:8.2mm!important;
    padding:1.1mm 1.4mm!important;
    border:1.4px solid #222!important;
  }
  body[data-print="student"] #officialSheet .sheet th:first-child,
  body[data-print="student"] #officialSheet .sheet td:first-child{width:42%!important}
  body[data-print="student"] #officialSheet .sheet th:nth-child(2),
  body[data-print="student"] #officialSheet .sheet td:nth-child(2){width:24%!important}
  body[data-print="student"] #officialSheet .student-evaluation-cell span{
    font-size:10pt!important;
  }
  body[data-print="student"] #officialSheet footer:not(.workflow-signatures){
    display:none!important;
  }
  body[data-print="student"] #officialSheet .workflow-signatures{
    display:grid!important;
    grid-template-columns:repeat(3,1fr)!important;
    gap:12mm!important;
    align-items:start!important;
    width:100%!important;
    margin-top:auto!important;
    padding-top:9mm!important;
    font-size:9.8pt!important;
    text-align:center!important;
  }
  body[data-print="student"] #officialSheet .workflow-signatures b{
    display:block!important;
    min-height:17mm!important;
    font-size:9.8pt!important;
  }

  /* ---------- Batch: one pupil per A4 ---------- */
  body[data-print="batch"] .batch-page.one .batch-sheet{
    box-sizing:border-box!important;
    display:flex!important;
    flex-direction:column!important;
    width:190mm!important;
    height:277mm!important;
    min-height:277mm!important;
    max-height:277mm!important;
    padding:8mm!important;
    overflow:hidden!important;
  }
  body[data-print="batch"] .batch-page.one .doc-head.final-official-head{
    grid-template-columns:minmax(0,1fr) 40mm minmax(0,1fr)!important;
    gap:5mm!important;
    font-size:10.2pt!important;
    line-height:1.45!important;
  }
  body[data-print="batch"] .batch-page.one .doc-basmala{font-size:10.4pt!important}
  body[data-print="batch"] .batch-page.one .doc-center img{width:29mm!important;height:29mm!important}
  body[data-print="batch"] .batch-page.one h1{font-size:20pt!important;margin:4mm 0 1.5mm!important}
  body[data-print="batch"] .batch-page.one h3{font-size:12.5pt!important;margin:0 0 3mm!important}
  body[data-print="batch"] .batch-page.one .info{
    display:grid!important;
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:1.5mm 3mm!important;
    font-size:10pt!important;
  }
  body[data-print="batch"] .batch-page.one .sheet{margin-top:2.5mm!important;font-size:10.2pt!important;table-layout:fixed!important}
  body[data-print="batch"] .batch-page.one .sheet th,
  body[data-print="batch"] .batch-page.one .sheet td{height:8.1mm!important;padding:1mm 1.3mm!important;border:1.4px solid #222!important}
  body[data-print="batch"] .batch-page.one footer:not(.workflow-signatures){display:none!important}
  body[data-print="batch"] .batch-page.one .workflow-signatures{
    display:grid!important;
    grid-template-columns:repeat(3,1fr)!important;
    gap:12mm!important;
    width:100%!important;
    margin-top:auto!important;
    padding-top:9mm!important;
    font-size:9.6pt!important;
    text-align:center!important;
  }
  body[data-print="batch"] .batch-page.one .workflow-signatures b{min-height:16mm!important;font-size:9.6pt!important}

  /* ---------- Batch: two complete pupils per A4 ---------- */
  body[data-print="batch"] .batch-page.two{
    display:flex!important;
    flex-direction:column!important;
    width:190mm!important;
    height:277mm!important;
    overflow:hidden!important;
  }
  body[data-print="batch"] .batch-page.two .batch-sheet{
    box-sizing:border-box!important;
    display:flex!important;
    flex-direction:column!important;
    width:190mm!important;
    height:138.5mm!important;
    min-height:138.5mm!important;
    max-height:138.5mm!important;
    margin:0!important;
    padding:3.8mm 6mm 3mm!important;
    overflow:hidden!important;
    border:0!important;
    border-bottom:1px dashed #777!important;
  }
  body[data-print="batch"] .batch-page.two .batch-sheet:nth-child(2){border-bottom:0!important}
  body[data-print="batch"] .batch-page.two .official-document-head{margin:0 0 1mm!important}
  body[data-print="batch"] .batch-page.two .doc-head.final-official-head{
    grid-template-columns:minmax(0,1fr) 29mm minmax(0,1fr)!important;
    gap:2.5mm!important;
    font-size:7.8pt!important;
    line-height:1.2!important;
  }
  body[data-print="batch"] .batch-page.two .doc-basmala{
    font-size:7.8pt!important;
    line-height:1.15!important;
    margin-bottom:.4mm!important;
  }
  body[data-print="batch"] .batch-page.two .doc-center img{
    width:18.5mm!important;
    height:18.5mm!important;
  }
  body[data-print="batch"] .batch-page.two h1{
    font-size:15.5pt!important;
    line-height:1.1!important;
    margin:1.1mm 0 .4mm!important;
  }
  body[data-print="batch"] .batch-page.two h3{
    font-size:9.6pt!important;
    line-height:1.1!important;
    margin:0 0 .7mm!important;
  }
  body[data-print="batch"] .batch-page.two .info{
    display:grid!important;
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:.4mm 1.3mm!important;
    font-size:7.4pt!important;
    line-height:1.12!important;
    margin:0!important;
  }
  body[data-print="batch"] .batch-page.two .sheet{
    width:100%!important;
    margin-top:.8mm!important;
    font-size:7.6pt!important;
    line-height:1.05!important;
    table-layout:fixed!important;
  }
  body[data-print="batch"] .batch-page.two .sheet th,
  body[data-print="batch"] .batch-page.two .sheet td{
    height:4.35mm!important;
    padding:.22mm .45mm!important;
    border:1px solid #222!important;
  }
  body[data-print="batch"] .batch-page.two .student-evaluation-cell span{font-size:7.3pt!important}
  body[data-print="batch"] .batch-page.two footer:not(.workflow-signatures){display:none!important}
  body[data-print="batch"] .batch-page.two .workflow-signatures{
    display:grid!important;
    grid-template-columns:repeat(3,1fr)!important;
    gap:4mm!important;
    width:100%!important;
    margin-top:auto!important;
    padding-top:1mm!important;
    font-size:7.3pt!important;
    text-align:center!important;
  }
  body[data-print="batch"] .batch-page.two .workflow-signatures b{
    min-height:5.5mm!important;
    font-size:7.3pt!important;
  }

  /* ---------- Student list: portrait, readable ---------- */
  body[data-print="portal"][data-portal-type="list"] #printPortal .portal-paper{
    box-sizing:border-box!important;
    width:190mm!important;
    max-width:190mm!important;
    padding:7mm!important;
  }
  body[data-print="portal"][data-portal-type="list"] #printPortal .doc-head.final-official-head{
    font-size:9.8pt!important;
    line-height:1.4!important;
  }
  body[data-print="portal"][data-portal-type="list"] #printPortal h2{
    font-size:18pt!important;
    margin:4mm 0!important;
  }
  body[data-print="portal"][data-portal-type="list"] #printPortal table{
    font-size:10pt!important;
    table-layout:fixed!important;
  }
  body[data-print="portal"][data-portal-type="list"] #printPortal th,
  body[data-print="portal"][data-portal-type="list"] #printPortal td{
    height:8mm!important;
    padding:1mm!important;
  }

  /* ---------- Class results: landscape, denser but legible ---------- */
  body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{
    box-sizing:border-box!important;
    width:277mm!important;
    max-width:277mm!important;
    padding:5mm!important;
  }
  body[data-print="portal"][data-portal-type="class"] #printPortal .doc-head.final-official-head{
    grid-template-columns:minmax(0,1fr) 38mm minmax(0,1fr)!important;
    gap:5mm!important;
    font-size:9pt!important;
    line-height:1.3!important;
  }
  body[data-print="portal"][data-portal-type="class"] #printPortal .doc-center img{width:24mm!important;height:24mm!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal h2{
    font-size:18pt!important;
    margin:3mm 0 4mm!important;
  }
  body[data-print="portal"][data-portal-type="class"] #printPortal table{
    width:100%!important;
    font-size:7.7pt!important;
    line-height:1.12!important;
  }
  body[data-print="portal"][data-portal-type="class"] #printPortal th,
  body[data-print="portal"][data-portal-type="class"] #printPortal td{
    height:6.2mm!important;
    padding:.65mm!important;
  }
  body[data-print="portal"][data-portal-type="class"] #printPortal .class-result-signatures{
    margin-top:7mm!important;
    font-size:9pt!important;
    gap:14mm!important;
  }
}
`;

document.head.appendChild(style);
})();
