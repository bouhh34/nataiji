(()=>{
'use strict';
const style=document.createElement('style');
style.id='nataiji-pdf-layout-v3';
style.textContent=`
@media print{
  /* Final refinement for a single selected student: use the full printable A4. */
  body[data-print="student"] #officialSheet{
    box-sizing:border-box!important;
    display:flex!important;
    flex-direction:column!important;
    width:190mm!important;
    max-width:190mm!important;
    height:274mm!important;
    min-height:274mm!important;
    margin:0 auto!important;
    padding:6.5mm 8mm!important;
    overflow:hidden!important;
  }
  body[data-print="student"] #officialSheet .doc-head.final-official-head{
    grid-template-columns:minmax(0,1fr) 40mm minmax(0,1fr)!important;
    gap:5mm!important;
    font-size:11.1pt!important;
    line-height:1.5!important;
  }
  body[data-print="student"] #officialSheet .doc-basmala{
    font-size:11pt!important;
    margin-bottom:1mm!important;
  }
  body[data-print="student"] #officialSheet .doc-center img{
    width:30mm!important;
    height:30mm!important;
  }
  body[data-print="student"] #officialSheet h1{
    font-size:22pt!important;
    line-height:1.15!important;
    margin:4.5mm 0 1.5mm!important;
  }
  body[data-print="student"] #officialSheet h3{
    font-size:13.5pt!important;
    line-height:1.25!important;
    margin:0 0 3mm!important;
  }
  body[data-print="student"] #officialSheet .info{
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:1.5mm 3mm!important;
    font-size:10.8pt!important;
    line-height:1.35!important;
    margin-bottom:2.5mm!important;
  }
  body[data-print="student"] #officialSheet .sheet{
    margin-top:2mm!important;
    font-size:11pt!important;
    line-height:1.2!important;
    table-layout:fixed!important;
  }
  body[data-print="student"] #officialSheet .sheet th,
  body[data-print="student"] #officialSheet .sheet td{
    height:9mm!important;
    padding:1.15mm 1.5mm!important;
  }
  body[data-print="student"] #officialSheet .student-evaluation-cell{
    text-align:center!important;
    vertical-align:middle!important;
  }
  body[data-print="student"] #officialSheet .student-evaluation-cell span{
    display:inline-block!important;
    transform:none!important;
    font-size:11pt!important;
    font-weight:800!important;
    white-space:normal!important;
  }

  /* The old two-column signature footer must never appear together with the final 3-signature footer. */
  body[data-print="student"] #officialSheet footer:not(.workflow-signatures),
  body[data-print="student"] #officialSheet .signature-block,
  body[data-print="batch"] .batch-sheet footer:not(.workflow-signatures),
  body[data-print="batch"] .batch-sheet .signature-block{
    display:none!important;
    visibility:hidden!important;
    height:0!important;
    min-height:0!important;
    margin:0!important;
    padding:0!important;
    overflow:hidden!important;
  }
  body[data-print="student"] #officialSheet .workflow-signatures{
    display:grid!important;
    grid-template-columns:repeat(3,1fr)!important;
    gap:13mm!important;
    width:100%!important;
    margin-top:auto!important;
    padding-top:8mm!important;
    font-size:10.4pt!important;
    text-align:center!important;
  }
  body[data-print="student"] #officialSheet .workflow-signatures b{
    min-height:17mm!important;
    font-size:10.4pt!important;
  }

  /* Make the merged appreciation cell readable in all student PDFs. */
  body[data-print="batch"] .batch-sheet .student-evaluation-cell span{
    transform:none!important;
    white-space:normal!important;
    text-align:center!important;
  }
  body[data-print="batch"] .batch-page.one .student-evaluation-cell span{font-size:10pt!important}
  body[data-print="batch"] .batch-page.two .student-evaluation-cell span{font-size:7.2pt!important}
}
`;
document.head.appendChild(style);
})();
