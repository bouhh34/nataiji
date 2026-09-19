(()=>{
'use strict';
if(window.__nataijiReportMobilePreviewV1)return;
window.__nataijiReportMobilePreviewV1=true;

const q=(s,r=document)=>r.querySelector(s);
let stage=null,raf=0,lastHeight=0;

function ensureStage(){
 const sheet=q('#officialSheet');
 if(!sheet)return null;
 if(sheet.parentElement?.classList.contains('report-preview-stage')){
  stage=sheet.parentElement;return sheet
 }
 stage=document.createElement('div');
 stage.className='report-preview-stage';
 stage.setAttribute('aria-label','معاينة كشف الدرجات');
 sheet.parentNode.insertBefore(stage,sheet);
 stage.appendChild(sheet);
 return sheet
}

function fit(){
 cancelAnimationFrame(raf);
 raf=requestAnimationFrame(()=>{
  const sheet=ensureStage();if(!sheet||!stage)return;
  if(!matchMedia('(max-width:760px)').matches||document.body.dataset.print){
   stage.style.removeProperty('--report-preview-scale');
   stage.style.removeProperty('--report-preview-height');
   stage.style.height='';
   return
  }
  // The preview deliberately keeps an A4-like document width, then scales the
  // complete sheet to the phone. Printing remains untouched by screen-only CSS.
  const available=Math.max(240,stage.clientWidth-12);
  const natural=Math.max(1,sheet.offsetWidth);
  const scale=Math.min(1,available/natural);
  const height=Math.ceil(sheet.offsetHeight*scale+12);
  stage.style.setProperty('--report-preview-scale',String(scale));
  stage.style.setProperty('--report-preview-height',height+'px');
  if(Math.abs(height-lastHeight)>1){stage.style.height=height+'px';lastHeight=height}
 })
}

const css=document.createElement('style');
css.id='nataiji-report-mobile-preview-v1-style';
css.textContent=`
@media screen and (max-width:760px){
 #studentReport{min-width:0!important;overflow:visible!important}
 .report-preview-stage{
   position:relative!important;
   width:100%!important;
   min-width:0!important;
   height:var(--report-preview-height,auto);
   margin:10px 0 2px!important;
   padding:6px!important;
   overflow:hidden!important;
   border:1px solid #dbe5ec!important;
   border-radius:12px!important;
   background:#eef3f7!important;
   box-shadow:inset 0 1px 0 rgba(255,255,255,.8)!important;
   direction:ltr!important;
 }
 .report-preview-stage>#officialSheet{
   box-sizing:border-box!important;
   position:absolute!important;
   top:6px!important;
   left:50%!important;
   width:185mm!important;
   max-width:none!important;
   min-width:185mm!important;
   min-height:240mm!important;
   margin:0!important;
   padding:8mm!important;
   transform:translateX(-50%) scale(var(--report-preview-scale,1))!important;
   transform-origin:top center!important;
   overflow:hidden!important;
   background:#fff!important;
   border:1.5px solid #202020!important;
   box-shadow:0 7px 22px rgba(28,52,70,.13)!important;
 }
 /* Match the PDF's numeric reading order without changing the print document. */
 .report-preview-stage>#officialSheet table.sheet td:nth-child(2),
 .report-preview-stage>#officialSheet .nr-stat td,
 .report-preview-stage>#officialSheet bdi,
 .report-preview-stage>#officialSheet [dir="ltr"]{
   direction:ltr!important;
   unicode-bidi:isolate!important;
 }
 .report-preview-stage>#officialSheet table.sheet td:nth-child(2){
   text-align:center!important;
   white-space:nowrap!important;
 }
 /* Recreate the print-quality header inside the scaled phone preview. */
 .report-preview-stage>#officialSheet .nr-head{
   grid-template-columns:minmax(0,1fr) 30mm minmax(0,1fr)!important;
   gap:6mm!important;
   font-size:10pt!important;
   line-height:1.35!important;
 }
 .report-preview-stage>#officialSheet .nr-center img{
   width:24mm!important;
   height:24mm!important;
 }
 .report-preview-stage>#officialSheet .doc-head.final-official-head{
   grid-template-columns:minmax(0,1fr) 42mm minmax(0,1fr)!important;
   gap:6mm!important;
   font-size:9.2pt!important;
   line-height:1.38!important;
 }
 .report-preview-stage>#officialSheet .doc-basmala{
   font-size:9pt!important;
   white-space:nowrap!important;
   margin-bottom:.8mm!important;
 }
 .report-preview-stage>#officialSheet .doc-center img{
   width:25mm!important;
   height:25mm!important;
 }
 .report-preview-stage>#officialSheet .nr-title,
 .report-preview-stage>#officialSheet h1{
   font-size:17pt!important;
   margin:5mm 0 1mm!important;
   text-align:center!important;
 }
 .report-preview-stage>#officialSheet .nr-term{
   font-size:10pt!important;
   margin-bottom:3mm!important;
 }
 .report-preview-stage>#officialSheet .nr-name{
   font-size:10.5pt!important;
   padding:2mm 3mm!important;
 }
 .report-preview-stage>#officialSheet .info{font-size:9.5pt!important}
 .report-preview-stage>#officialSheet table.sheet{
   width:100%!important;
   min-width:0!important;
   table-layout:fixed!important;
   border-collapse:collapse!important;
   font-size:10.5pt!important;
 }
 .report-preview-stage>#officialSheet table.sheet th,
 .report-preview-stage>#officialSheet table.sheet td{
   height:7mm!important;
   padding:1.6mm 2mm!important;
   border:1.2px solid #000!important;
 }
 .report-preview-stage>#officialSheet .nr-signatures{
   font-size:10pt!important;
   margin-top:5mm!important;
 }
 .report-preview-stage>#officialSheet .nr-signatures i{margin-top:10mm!important}
}
@media print{
 .report-preview-stage{display:contents!important}
 .report-preview-stage>#officialSheet{
   position:static!important;
   transform:none!important;
   width:185mm!important;
   min-width:0!important;
   max-width:185mm!important;
   margin:0 auto!important;
   box-shadow:none!important;
 }
}
`;
document.head.appendChild(css);

function install(){
 const sheet=ensureStage();if(!sheet)return;
 fit();
 if(!stage.dataset.previewObserved){
  stage.dataset.previewObserved='1';
  new ResizeObserver(fit).observe(stage);
  new MutationObserver(fit).observe(sheet,{childList:true,subtree:true,characterData:true,attributes:true});
 }
}

window.addEventListener('resize',fit,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(fit,120),{passive:true});
window.addEventListener('beforeprint',()=>{if(stage)stage.style.height=''});
window.addEventListener('afterprint',()=>setTimeout(fit,60));
document.addEventListener('click',e=>{
 if(e.target.closest?.('#showResult,[data-report="student"],#student'))setTimeout(fit,60)
},true);
document.addEventListener('change',e=>{
 if(e.target.matches?.('#student,#term,#classTop,#yearTop'))setTimeout(fit,60)
},true);
window.addEventListener('DOMContentLoaded',()=>setTimeout(install,350));
setTimeout(install,0);
setTimeout(install,900);
})();
