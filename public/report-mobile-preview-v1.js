(()=>{
'use strict';
if(window.__nataijiReportMobilePreviewV2)return;
window.__nataijiReportMobilePreviewV2=true;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const mmPx=mm=>mm*96/25.4;
const appState=()=>{try{return state}catch{return null}};
const frames=new Map();
let raf=0;

function activeType(){
 const b=q('.report-tabs [data-report].active');
 return b?.dataset?.report||'student'
}
function naturalWidth(type){
 if(type==='student')return 185;
 if(type==='list')return 190;
 const count=Number(appState()?.subjects?.length||0);
 return count>=10?287:202
}
function target(type){
 if(type==='student')return q('#officialSheet');
 if(type==='class')return q('#classReport .paper');
 if(type==='list')return q('#listReport .paper');
 return null
}
function host(type){
 if(type==='student')return q('#studentReport');
 if(type==='class')return q('#classReport');
 if(type==='list')return q('#listReport');
 return null
}
function ensureFrame(type){
 const doc=target(type),root=host(type);if(!doc||!root)return null;
 if(doc.parentElement?.classList.contains('report-preview-stage-v2')){
  frames.set(type,doc.parentElement);return doc.parentElement
 }
 const stage=document.createElement('div');
 stage.className='report-preview-stage-v2';
 stage.dataset.previewType=type;
 stage.setAttribute('aria-label',type==='student'?'معاينة كشف التلميذ':type==='class'?'معاينة كشف القسم':'معاينة لائحة التلاميذ');
 doc.parentNode.insertBefore(stage,doc);
 stage.appendChild(doc);
 frames.set(type,stage);
 return stage
}
function refreshCanonical(){
 try{window.nataijiRefreshOfficialReports?.()}catch(e){console.error('official report refresh failed',e)}
 try{window.nataijiFinalizeReports?.()}catch(e){console.error('final report refresh failed',e)}
}
function fitOne(type){
 if(!matchMedia('(max-width:760px)').matches||document.body.dataset.print)return;
 const root=host(type),doc=target(type),stage=ensureFrame(type);
 if(!root||!doc||!stage||root.classList.contains('hidden'))return false;
 const widthMm=naturalWidth(type);
 stage.style.setProperty('--preview-natural-width',widthMm+'mm');
 doc.style.setProperty('--preview-natural-width',widthMm+'mm');
 // Wait until the currently selected report has actually been painted.
 const h=Math.max(doc.scrollHeight,doc.offsetHeight),available=Math.max(220,root.clientWidth-4);
 if(h<80||available<100)return false;
 const scale=Math.min(1,(available-12)/mmPx(widthMm));
 stage.style.setProperty('--report-preview-scale',String(scale));
 stage.style.height=Math.ceil(h*scale+12)+'px';
 stage.dataset.ready='1';
 return true
}
function fitActive(retries=4){
 cancelAnimationFrame(raf);
 raf=requestAnimationFrame(()=>{
  const type=activeType();
  refreshCanonical();
  const ok=fitOne(type);
  if(!ok&&retries>0)setTimeout(()=>fitActive(retries-1),90)
 })
}
function prepare(type){
 refreshCanonical();
 ensureFrame(type);
 [0,50,140,320].forEach(ms=>setTimeout(()=>{if(activeType()===type)fitOne(type)},ms))
}
function restoreForPrint(){
 for(const stage of frames.values()){stage.style.height='';stage.dataset.ready='0'}
}
function refitAfterPrint(){setTimeout(()=>fitActive(5),80)}

const css=document.createElement('style');
css.id='nataiji-report-mobile-preview-v2-style';
css.textContent=`
@media screen and (max-width:760px){
 #studentReport,#classReport,#listReport{min-width:0!important;overflow:visible!important}
 .report-preview-stage-v2{
   position:relative!important;
   width:100%!important;
   min-width:0!important;
   margin:10px 0 4px!important;
   padding:6px!important;
   overflow:hidden!important;
   border:1px solid #dbe5ec!important;
   border-radius:12px!important;
   background:#eef3f7!important;
   box-shadow:inset 0 1px 0 rgba(255,255,255,.86)!important;
   direction:ltr!important;
 }
 .report-preview-stage-v2[data-ready="0"]{min-height:18px!important}
 .report-preview-stage-v2>#officialSheet,
 .report-preview-stage-v2>.paper{
   box-sizing:border-box!important;
   position:absolute!important;
   top:6px!important;
   left:50%!important;
   width:var(--preview-natural-width)!important;
   min-width:var(--preview-natural-width)!important;
   max-width:none!important;
   margin:0!important;
   transform:translateX(-50%) scale(var(--report-preview-scale,1))!important;
   transform-origin:top center!important;
   overflow:visible!important;
   background:#fff!important;
   color:#111!important;
   border:1px solid #cfd9df!important;
   box-shadow:0 7px 22px rgba(28,52,70,.13)!important;
 }
 .report-preview-stage-v2>#officialSheet{padding:8mm!important;min-height:240mm!important;border:1.5px solid #202020!important}
 .report-preview-stage-v2>.paper{padding:6mm!important;min-height:250mm!important}
 .report-preview-stage-v2 .table-scroll{overflow:visible!important;width:100%!important}
 .report-preview-stage-v2 table{width:100%!important;max-width:100%!important}
 .report-preview-stage-v2[data-preview-type="list"] table{min-width:0!important;table-layout:fixed!important;font-size:9.4pt!important}
 .report-preview-stage-v2[data-preview-type="list"] th,
 .report-preview-stage-v2[data-preview-type="list"] td{height:7.5mm!important;padding:1mm!important}
 .report-preview-stage-v2[data-preview-type="class"] .nr-class-table{min-width:0!important;width:100%!important;table-layout:fixed!important}
 .report-preview-stage-v2[data-preview-type="class"] .nr-class-v2 .plain-head,
 .report-preview-stage-v2[data-preview-type="class"] .nr-class-v2 .sub-head{height:31mm!important}
 .report-preview-stage-v2[data-preview-type="class"] .nr-class-v2 .vertical-label{height:24.5mm!important}
 .report-preview-stage-v2[data-preview-type="class"] .nr-class-v2 tbody td{height:8.2mm!important}
 .report-preview-stage-v2 .nr-head{
   grid-template-columns:minmax(0,1fr) 30mm minmax(0,1fr)!important;
   gap:6mm!important;
   font-size:9.5pt!important;
   line-height:1.35!important;
 }
 .report-preview-stage-v2 .nr-center img{width:24mm!important;height:24mm!important}
 .report-preview-stage-v2 .doc-head.final-official-head{
   grid-template-columns:minmax(0,1fr) 42mm minmax(0,1fr)!important;
   gap:6mm!important;
   font-size:9.2pt!important;
   line-height:1.38!important;
 }
 .report-preview-stage-v2 .doc-basmala{font-size:9pt!important;white-space:nowrap!important;margin-bottom:.8mm!important}
 .report-preview-stage-v2 .doc-center img{width:25mm!important;height:25mm!important}
 .report-preview-stage-v2>#officialSheet .nr-title,
 .report-preview-stage-v2>#officialSheet h1{font-size:17pt!important;margin:5mm 0 1mm!important;text-align:center!important}
 .report-preview-stage-v2>#officialSheet .nr-term{font-size:10pt!important;margin-bottom:3mm!important}
 .report-preview-stage-v2>#officialSheet .nr-name{font-size:10.5pt!important;padding:2mm 3mm!important}
 .report-preview-stage-v2>#officialSheet .info{font-size:9.5pt!important}
 .report-preview-stage-v2>#officialSheet table.sheet{font-size:10.5pt!important;table-layout:fixed!important;border-collapse:collapse!important}
 .report-preview-stage-v2>#officialSheet table.sheet th,
 .report-preview-stage-v2>#officialSheet table.sheet td{height:7mm!important;padding:1.6mm 2mm!important;border:1.2px solid #000!important}
 .report-preview-stage-v2>#officialSheet table.sheet td:nth-child(2),
 .report-preview-stage-v2>#officialSheet .nr-stat td,
 .report-preview-stage-v2>#officialSheet bdi{direction:ltr!important;unicode-bidi:isolate!important;text-align:center!important;white-space:nowrap!important}
 .report-preview-stage-v2>#officialSheet .nr-signatures{font-size:10pt!important;margin-top:5mm!important}
 .report-preview-stage-v2>#officialSheet .nr-signatures i{margin-top:10mm!important}
 #classReport>.report-preview-stage-v2 + .report-print,
 #listReport>.report-preview-stage-v2 + .report-print{margin-top:10px!important}
}
@media print{
 .report-preview-stage-v2{display:contents!important}
 .report-preview-stage-v2>#officialSheet,
 .report-preview-stage-v2>.paper{
   position:static!important;
   transform:none!important;
   width:auto!important;
   min-width:0!important;
   max-width:none!important;
   margin:0 auto!important;
   box-shadow:none!important;
 }
}
`;
document.head.appendChild(css);

// Intercept class/list printing so the report is fully rebuilt before print begins.
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('.report-print[data-print]');
 if(btn){
   const type=btn.dataset.print;
   if(type==='class'||type==='list'){
     e.preventDefault();e.stopImmediatePropagation();
     refreshCanonical();
     requestAnimationFrame(()=>requestAnimationFrame(()=>{
       /* Keep print mode active for the whole native print/PDF preview.
          Clearing it after a fixed 250 ms can make Android render a blank A4
          because the printable report gets hidden while the preview is still
          being generated. app.js/afterprint owns the cleanup safely. */
       document.body.dataset.print=type;
       window.print();
     }));
     return
   }
 }
 const tab=e.target.closest?.('.report-tabs [data-report]');
 if(tab){prepare(tab.dataset.report);return}
 const reportsNav=e.target.closest?.('[data-view="reports"]');
 if(reportsNav)setTimeout(()=>prepare(activeType()),80)
},true);

document.addEventListener('change',e=>{
 if(e.target.matches?.('#student,#term,#classTop,#yearTop'))setTimeout(()=>{refreshCanonical();fitActive(5)},40)
},true);
document.addEventListener('click',e=>{
 if(e.target.closest?.('#showResult'))setTimeout(()=>{refreshCanonical();fitActive(5)},40)
},true);
window.addEventListener('resize',()=>fitActive(4),{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(()=>fitActive(5),140),{passive:true});
window.addEventListener('beforeprint',restoreForPrint);
window.addEventListener('afterprint',refitAfterPrint);
window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>prepare(activeType()),420));
setTimeout(()=>prepare(activeType()),80);
setTimeout(()=>prepare(activeType()),1100);
})();
