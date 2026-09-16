(()=>{
'use strict';

const BASMALA='بسم الله الرحمن الرحيم';
let timer=null;

function enforceBasmala(){
  document.querySelectorAll('.doc-basmala').forEach(el=>{
    if(el.textContent!==BASMALA) el.textContent=BASMALA;
    if(el.lang!=='ar') el.lang='ar';
    if(el.dir!=='rtl') el.dir='rtl';
    if(el.dataset.dynamicLang!=='1') el.dataset.dynamicLang='1';
    el.setAttribute('aria-label',BASMALA);
  });
}

function normalizeOfficialHeads(){
  document.querySelectorAll('.paperhead.official-document-head,.official-head.enhanced-head').forEach(el=>{
    el.style.width='100%';
  });
}

function apply(){
  enforceBasmala();
  normalizeOfficialHeads();
}

const style=document.createElement('style');
style.id='nataiji-final-report-layout';
style.textContent=`
.paperhead.official-document-head,.official-head.enhanced-head{display:block!important;width:100%!important;max-width:100%!important}
.doc-head{display:grid!important;grid-template-columns:minmax(0,1fr) 40mm minmax(0,1fr)!important;gap:4mm!important;align-items:start!important;width:100%!important;max-width:none!important}
.doc-right,.doc-left{min-width:0!important;overflow-wrap:break-word!important}
.doc-right{text-align:start!important}.doc-left{text-align:end!important}
.doc-center{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;min-width:0!important;text-align:center!important}
.doc-basmala{display:block!important;width:100%!important;margin:0 0 1mm!important;font-weight:700!important;font-size:9pt!important;line-height:1.35!important;text-align:center!important;direction:rtl!important;unicode-bidi:isolate!important;white-space:nowrap!important;font-family:Tahoma,Arial,sans-serif!important}
.doc-center img{display:block!important;width:24mm!important;height:24mm!important;object-fit:contain!important;margin:0 auto!important}
.lang-fr .doc-head{direction:ltr!important}.lang-fr .doc-right{text-align:left!important}.lang-fr .doc-left{text-align:right!important}.lang-fr .doc-basmala{direction:rtl!important;text-align:center!important}
.lang-switch{top:max(12px,env(safe-area-inset-top))!important;left:12px!important;right:auto!important}
.lang-fr .lang-switch{left:auto!important;right:12px!important}

@media(max-width:760px){
  .doc-head{grid-template-columns:minmax(0,1fr) 31% minmax(0,1fr)!important;gap:5px!important;font-size:9px!important;line-height:1.35!important}
  .doc-basmala{font-size:9px!important;white-space:normal!important;margin-bottom:3px!important}
  .doc-center img{width:58px!important;height:58px!important}
  .lang-switch{top:10px!important}
}

@media print{
  .lang-switch{display:none!important}
  .paperhead.official-document-head,.official-head.enhanced-head{display:block!important;width:100%!important;max-width:100%!important;margin:0 0 3.5mm!important}
  .doc-head{grid-template-columns:minmax(0,1fr) 38mm minmax(0,1fr)!important;gap:4mm!important;font-size:9.2pt!important;line-height:1.35!important}
  .doc-basmala{font-size:8.8pt!important;line-height:1.25!important;white-space:nowrap!important;margin-bottom:.8mm!important}
  .doc-center img{width:23mm!important;height:23mm!important}

  body[data-print="portal"] #printPortal{width:190mm!important}
  body[data-print="portal"] #printPortal .portal-paper{box-sizing:border-box!important;width:190mm!important;max-width:190mm!important;padding:5mm 6mm!important}
  body[data-print="portal"] #printPortal .paperhead.official-document-head{display:block!important;width:100%!important;margin-bottom:4mm!important}
  body[data-print="portal"] #printPortal .doc-head{grid-template-columns:minmax(0,1fr) 38mm minmax(0,1fr)!important;gap:4mm!important;width:100%!important;font-size:9.2pt!important;line-height:1.35!important}
  body[data-print="portal"] #printPortal .doc-basmala{font-size:8.8pt!important;white-space:nowrap!important}
  body[data-print="portal"] #printPortal .doc-center img{width:23mm!important;height:23mm!important}
  body[data-print="portal"] #printPortal h2{font-size:18pt!important;line-height:1.2!important;margin:4mm 0 5mm!important;text-align:center!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal table{font-size:10pt!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal th,body[data-print="portal"][data-portal-type="list"] #printPortal td{height:8.5mm!important;padding:1.2mm!important;line-height:1.2!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal table{font-size:7.8pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th,body[data-print="portal"][data-portal-type="class"] #printPortal td{height:6.6mm!important;padding:.75mm!important;line-height:1.15!important}

  body[data-print="batch"] .batch-page.two .doc-head{grid-template-columns:minmax(0,1fr) 29mm minmax(0,1fr)!important;gap:2mm!important}
  body[data-print="batch"] .batch-page.two .doc-basmala{font-size:6.8pt!important;white-space:nowrap!important;margin-bottom:.4mm!important}
  body[data-print="batch"] .batch-page.two .doc-center img{width:17mm!important;height:17mm!important}
}
`;
document.head.appendChild(style);

new MutationObserver(()=>{
  clearTimeout(timer);
  timer=setTimeout(apply,0);
}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});

document.addEventListener('click',e=>{
  if(e.target.closest?.('#langSwitch')) setTimeout(apply,100);
},true);
window.addEventListener('beforeprint',apply);
window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,50));
setTimeout(apply,0);
})();
