(()=>{
'use strict';
if(window.__nataijiCommercialFoundationV1)return;
window.__nataijiCommercialFoundationV1=true;
const q=(s,r=document)=>r.querySelector(s);
const lang=()=>localStorage.getItem('nataiji-lang')==='fr'?'fr':'ar';
const tr=(ar,fr)=>lang()==='fr'?fr:ar;
function user(){try{return currentUser}catch{return null}}
function closeableModal(){
 const root=document.createElement('div');root.className='modal nataiji-plan-modal';
 root.innerHTML=`<div class="modal-card"><div class="modal-head"><div><small class="plan-eyebrow">NATAIJI ACCESS</small><h2>${tr('الخطة والاشتراك','Offre et abonnement')}</h2></div><button class="x" type="button" aria-label="${tr('إغلاق','Fermer')}">×</button></div><section class="launch-plan"><span>${tr('عرض الإطلاق','OFFRE DE LANCEMENT')}</span><strong>${tr('مجاني طوال 2026–2027','Gratuit pour toute l’année scolaire 2026–2027')}</strong><p>${tr('جميع وظائف نتائجي مجانية للمعلمين والأساتذة الحاليين والجدد طوال السنة الدراسية 2026–2027. تبقى نتائجك محفوظة وقابلة للاستخراج، وأي أسعار مستقبلية ستُعلن مسبقًا.','Toutes les fonctionnalités sont gratuites pour les enseignants actuels et nouveaux durant l’année scolaire 2026–2027. Vos résultats restent conservés et exportables ; toute future tarification sera annoncée à l’avance.')}</p></section><div class="future-plans"><article><i data-feather="gift"></i><b>${tr('لا رسوم هذا العام','Aucun frais cette année')}</b><p>${tr('جميع الوظائف متاحة طوال السنة الدراسية 2026–2027.','Toutes les fonctions sont accessibles pendant l’année scolaire 2026–2027.')}</p><small>${tr('2026–2027','2026–2027')}</small></article><article class="pro"><i data-feather="award"></i><b>Nataiji Pro</b><p>${tr('سنعلن أي اشتراكات مستقبلية قبل بداية السنة التالية؛ دون المساس بالنتائج السابقة.','Les éventuels abonnements futurs seront annoncés avant la prochaine année scolaire, sans altérer les résultats passés.')}</p><small>${tr('بعد 2026–2027','Après 2026–2027')}</small></article></div><button class="plan-close" type="button">${tr('متابعة الاستخدام المجاني','Continuer gratuitement')}</button></div>`;
 document.body.appendChild(root);const close=()=>root.remove();q('.x',root).onclick=close;q('.plan-close',root).onclick=close;root.onclick=e=>{if(e.target===root)close()};if(window.feather)window.feather.replace({class:'lux-feather','stroke-width':1.8});
}
/* Keep the plan card mounted after asynchronous login, while the More page
   organizer moves existing nodes.  Never recreate the card on every mutation. */
function bind(){
 if(document.documentElement.classList.contains('nataiji-professor-mode'))return;
 const page=q('[data-page="more"]'),grid=page?.querySelector('.settings-grid');
 if(!grid||!user())return;
 let btn=grid.querySelector('#subscriptionBtn');
 if(!btn){
   btn=document.createElement('button');
   btn.type='button';
   btn.id='subscriptionBtn';
   btn.className='menu-card subscription-card';
   const anchor=grid.querySelector('#installAppBtn,#shareAppBtn,#supportBtn,#changePasswordBtn,#logoutBtn');
   grid.insertBefore(btn,anchor||null);
 }
 // DOM reordering retains this node and its handler: it never drops a tap.
 if(btn.dataset.planBound!=='1'){
   btn.dataset.planBound='1';
   btn.addEventListener('click',event=>{event.preventDefault();closeableModal()});
 }
 const currentLang=lang();
 if(btn.dataset.locale!==currentLang||!btn.querySelector(':scope > b')||!btn.querySelector(':scope > span')){
   btn.dataset.locale=currentLang;
   btn.innerHTML=`<b>${tr('الخطة والاشتراك','Offre et abonnement')} <small>${tr('مجاني','GRATUIT')}</small></b><span>${tr('مجاني لجميع الأساتذة طوال 2026–2027','Gratuit pour tous les enseignants en 2026–2027')}</span>`;
 }
}
const css=document.createElement('style');css.id='nataiji-commercial-style';css.textContent=`
.subscription-card{border-color:rgba(184,145,45,.35)!important;background:linear-gradient(145deg,#fffdf7,#fff 58%,#eef9f5)!important}.subscription-card>b small{margin-inline-start:auto;padding:4px 8px;border:1px solid #d9bd72;border-radius:999px;background:#fff7d9;color:#846314;font-size:9px;letter-spacing:.08em}.nataiji-plan-modal .modal-card{max-width:610px;background:linear-gradient(180deg,#fff,#f5faf8)}.plan-eyebrow{color:#9a7421;font-weight:900;letter-spacing:.12em}.launch-plan{position:relative;overflow:hidden;margin:18px 0;padding:20px;border:1px solid rgba(219,187,105,.6);border-radius:20px;background:linear-gradient(135deg,#082b4b,#075d58);color:#fff;box-shadow:0 18px 38px rgba(8,43,75,.16)}.launch-plan:after{content:'';position:absolute;width:150px;height:150px;border:1px solid #fff2;border-radius:50%;inset-inline-end:-55px;top:-70px}.launch-plan span{display:block;color:#f2d88b;font-size:10px;font-weight:900;letter-spacing:.12em}.launch-plan strong{display:block;margin:8px 0 6px;font-size:25px}.launch-plan p{margin:0;color:#d9ebe8;line-height:1.75;font-size:12px}.future-plans{display:grid;grid-template-columns:1fr 1fr;gap:10px}.future-plans article{display:grid;grid-template-columns:32px 1fr;align-items:center;gap:4px 8px;padding:15px;border:1px solid #dce7e8;border-radius:16px;background:#fff}.future-plans article>svg{grid-row:1/4;width:21px;color:#0b8c73}.future-plans article b{color:#14384e;font-size:13px}.future-plans article p{margin:0;color:#6d808c;font-size:11px;line-height:1.5}.future-plans article small{color:#9a7421;font-weight:850}.future-plans article.pro{border-color:#d8c27f;background:#fffdf7}.plan-close{width:100%;min-height:48px;margin-top:14px;border:0;border-radius:13px;background:linear-gradient(135deg,#0a9877,#08705c);color:#fff;font-weight:900}@media(max-width:520px){.future-plans{grid-template-columns:1fr}.launch-plan{padding:17px}.launch-plan strong{font-size:22px}}
`;document.head.appendChild(css);
// Leading-edge coalescing: repeated UI mutations cannot postpone mounting forever.
let mountTimer=null;
function scheduleBind(delay=80){
 if(mountTimer!==null)return;
 mountTimer=setTimeout(()=>{mountTimer=null;bind()},delay);
}
new MutationObserver(records=>{
 // Only schedule when the menu or account shell changes. Avoid re-render loops.
 if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>
   node.nodeType===1 && (
     node.matches?.('.settings-grid,#subscriptionBtn,.auth-gate,[data-page="more"]') ||
     node.querySelector?.('.settings-grid,#subscriptionBtn,[data-page="more"]')
   )
 )))scheduleBind(60);
}).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('click',event=>{
 if(event.target.closest?.('[data-view="more"],.bottom-nav button[data-view="more"]'))scheduleBind(0);
},true);
window.addEventListener('pageshow',()=>scheduleBind(0));
window.addEventListener('focus',()=>scheduleBind(50));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleBind(50)});
document.addEventListener('DOMContentLoaded',()=>scheduleBind(0));
setTimeout(bind,450);
setTimeout(bind,1500);
setTimeout(bind,4000);
})();
