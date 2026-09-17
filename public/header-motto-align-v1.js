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
.call-number-modal-backdrop{position:fixed;inset:0;background:#0008;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px}
.call-number-modal{width:min(560px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 18px 55px #0004;color:#111}
.call-number-modal h3{margin:0 0 6px;font-size:20px}.call-number-modal p{margin:0 0 14px;color:#52606d;font-size:13px}.call-number-grid{display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:8px 12px;align-items:center}.call-number-grid label{font-weight:700;min-width:0}.call-number-grid input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #b8c1ca;border-radius:8px;text-align:center;font-weight:800;font-size:15px}.call-number-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}.call-number-actions button{padding:9px 15px;border-radius:8px;border:1px solid #bcc5ce;background:#fff;font-weight:800}.call-number-actions .save-call-numbers{background:#0b74b8;color:#fff;border-color:#0b74b8}.call-number-message{min-height:20px!important;margin-top:9px!important;color:#b42318!important;font-weight:700!important}
`;
document.head.appendChild(style);
if(!document.querySelector('script[data-full-class-labels]')){
  const s=document.createElement('script');
  s.src='/class-report-full-labels-v1.js?v=1';
  s.dataset.fullClassLabels='1';
  document.head.appendChild(s);
}

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
function getState(){try{return typeof state==='undefined'?null:state}catch{return null}}
function getUser(){try{return typeof currentUser==='undefined'?null:currentUser}catch{return null}}
function callNo(p,i){return String(p?.[5]??'').trim()||String(i+1)}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function canManage(){const u=getUser();return !!u&&(u.role==='admin'||u.permissions?.includes?.('pupils'))}
function callLabel(){return isFr()?'N° d’appel':'رقم النداء'}

function patchCallNumberHeaders(){
  const label=callLabel();
  const heads=[
    q('.student-table thead tr'),q('#scoreHead tr'),q('#paperResults thead tr'),
    q('#listReport table thead tr'),q('#classReport table thead tr'),q('#printPortal table thead tr')
  ];
  heads.forEach(r=>{if(r?.cells?.[0])setText(r.cells[0],label)});
}
function patchCallNumberRows(){
  const s=getState();if(!s)return;
  const groups=[
    '#list tr','#scores tr','#listReport table tbody tr','#paperResults tbody tr',
    '#classReport table tbody tr','#printPortal table tbody tr'
  ];
  groups.forEach(sel=>qa(sel).forEach((r,i)=>{const p=s.pupils?.[i];if(p&&r.cells?.[0])setText(r.cells[0],callNo(p,i))}));
}
function ensureManageButton(){
  const tools=q('[data-page="students"] .tools');if(!tools)return;
  let b=q('#manageCallNumbers');
  if(!canManage()){b?.remove();return}
  if(!b){b=document.createElement('button');b.id='manageCallNumbers';b.type='button';tools.appendChild(b);b.addEventListener('click',openCallNumberManager)}
  setText(b,isFr()?'Gérer les N° d’appel':'تعديل أرقام النداء');
}
function closeCallModal(){q('.call-number-modal-backdrop')?.remove()}
function openCallNumberManager(){
  const s=getState();if(!s||!canManage())return;
  closeCallModal();
  const back=document.createElement('div');back.className='call-number-modal-backdrop';
  const box=document.createElement('div');box.className='call-number-modal';box.dir=isFr()?'ltr':'rtl';
  const title=isFr()?'Gérer les numéros d’appel':'تعديل أرقام النداء';
  const hint=isFr()?'Chaque élève doit avoir un numéro d’appel positif et unique.':'يمكن تحديد رقم النداء لكل تلميذ، ويجب أن يكون رقمًا موجبًا وغير مكرر.';
  box.innerHTML=`<h3>${title}</h3><p>${hint}</p><div class="call-number-grid"></div><p class="call-number-message"></p><div class="call-number-actions"><button type="button" class="cancel-call-numbers">${isFr()?'Annuler':'إلغاء'}</button><button type="button" class="save-call-numbers">${isFr()?'Enregistrer':'حفظ'}</button></div>`;
  const grid=q('.call-number-grid',box);
  (s.pupils||[]).forEach((p,i)=>{
    const lab=document.createElement('label');lab.textContent=isFr()?(p[4]||p[1]):p[1];
    const inp=document.createElement('input');inp.type='number';inp.min='1';inp.step='1';inp.inputMode='numeric';inp.value=callNo(p,i);inp.dataset.i=String(i);inp.setAttribute('aria-label',`${callLabel()} - ${lab.textContent}`);
    grid.append(lab,inp);
  });
  q('.cancel-call-numbers',box).onclick=closeCallModal;
  q('.save-call-numbers',box).onclick=async()=>{
    const inputs=qa('input[data-i]',box),vals=inputs.map(x=>String(x.value||'').trim()),msg=q('.call-number-message',box);
    if(vals.some(v=>!/^\d+$/.test(v)||Number(v)<1)){msg.textContent=isFr()?'Saisissez uniquement des numéros positifs.':'أدخل أرقام نداء موجبة فقط.';return}
    if(new Set(vals).size!==vals.length){msg.textContent=isFr()?'Un numéro d’appel est utilisé plus d’une fois.':'يوجد رقم نداء مكرر.';return}
    inputs.forEach((inp,k)=>{const i=Number(inp.dataset.i);if(s.pupils?.[i])s.pupils[i][5]=vals[k]});
    msg.style.color='#18794e';msg.textContent=isFr()?'Enregistrement…':'جارٍ الحفظ...';
    try{if(typeof save==='function')await save(true);if(typeof render==='function')render();if(typeof renderReports==='function')renderReports();window.nataijiFinalizeReports?.();patchAll();closeCallModal()}catch(e){msg.style.color='#b42318';msg.textContent=isFr()?'Échec de l’enregistrement.':'تعذر حفظ أرقام النداء.'}
  };
  back.appendChild(box);document.body.appendChild(back);back.addEventListener('click',e=>{if(e.target===back)closeCallModal()});
}
function patchClassPrintPage(){
  if(document.body.dataset.print!=='portal'||document.body.dataset.portalType!=='class')return;
  const ps=q('#workflow-page-style');
  if(ps)ps.textContent='@page{size:A4 portrait;margin:8mm}';
  let late=q('#nataiji-class-portrait-final');
  if(!late){late=document.createElement('style');late.id='nataiji-class-portrait-final';document.head.appendChild(late)}
  late.textContent=`@media print{
    body[data-print="portal"][data-portal-type="class"]{width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
    body[data-print="portal"][data-portal-type="class"] #printPortal{box-sizing:border-box!important;width:194mm!important;max-width:194mm!important;min-width:194mm!important;margin:0 auto!important;padding:0!important;transform:none!important;zoom:1!important}
    body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper{box-sizing:border-box!important;width:194mm!important;max-width:194mm!important;min-width:194mm!important;margin:0!important;padding:4.5mm 3.5mm!important;border:0!important;transform:none!important;zoom:1!important}
    body[data-print="portal"][data-portal-type="class"] #printPortal table{width:100%!important;max-width:100%!important;table-layout:fixed!important}
  }`;
}
function patchAll(){patchCallNumberHeaders();patchCallNumberRows();ensureManageButton()}
let timer=null;function schedule(ms=25){clearTimeout(timer);timer=setTimeout(patchAll,ms)}
new MutationObserver(()=>schedule(35)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('#langSwitch,[data-report],.report-print,#printList,#printResult'))schedule(20)},true);
document.addEventListener('change',e=>{if(e.target.matches?.('#classTop,#yearTop,#term,#student'))schedule(20)},true);
window.addEventListener('beforeprint',()=>{patchAll();patchClassPrintPage()});
window.addEventListener('DOMContentLoaded',()=>schedule(120));
setTimeout(patchAll,0);
})();