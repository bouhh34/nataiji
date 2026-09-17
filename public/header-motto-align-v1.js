(()=>{
'use strict';
const style=document.createElement('style');
style.id='nataiji-header-motto-align-v1';
style.textContent=`
/* Keep the national motto on the same visual axis as the metadata below it. */
.final-official-head .doc-meta{
  text-align:start!important;
}
.final-official-head .doc-meta .doc-motto{
  display:block!important;
  width:100%!important;
  box-sizing:border-box!important;
  text-align:start!important;
  margin-top:0!important;
  padding-top:0!important;
  line-height:1.36!important;
  white-space:nowrap!important;
}
.final-official-head .doc-meta .doc-line{
  width:100%!important;
}
.final-official-head[dir="rtl"] .doc-meta,
.final-official-head[dir="rtl"] .doc-meta .doc-motto{
  direction:rtl!important;
  text-align:right!important;
}
.final-official-head[dir="ltr"] .doc-meta,
.final-official-head[dir="ltr"] .doc-meta .doc-motto{
  direction:ltr!important;
  text-align:left!important;
}
`;
document.head.appendChild(style);
})();
