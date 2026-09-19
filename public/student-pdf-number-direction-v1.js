(()=>{
'use strict';
if(window.__nataijiStudentPdfNumberDirectionV1)return;
window.__nataijiStudentPdfNumberDirectionV1=true;
const style=document.createElement('style');
style.id='nataiji-student-pdf-number-direction-v1';
style.textContent=`
@media print{
  /* Single-student PDF only. Keep grade/total/average/rank values in reading order. */
  body[data-print="student"] #officialSheet table.sheet td:nth-child(2),
  body[data-print="student"] #officialSheet table.sheet td:nth-child(2) bdi,
  body[data-print="student"] #officialSheet .nr-stat td,
  body[data-print="student"] #officialSheet .nr-stat td bdi{
    direction:ltr!important;
    unicode-bidi:isolate!important;
    text-align:center!important;
    white-space:nowrap!important;
  }
}
`;
document.head.appendChild(style);
})();