/* School owner: frozen, exportable year snapshots. No live grade or roster edits. */
(()=>{
'use strict';
if(window.__nataijiSchoolYearArchiveUi)return;window.__nataijiSchoolYearArchiveUi=true;
const q=(sel,root=document)=>root.querySelector(sel);
const yearKey=value=>String(value??'').trim().replace(/\s*[-/]\s*/g,'-');
const validAcademicYear=value=>{const m=yearKey(value).match(/^(\d{4})-(\d{4})$/);return !!m&&Number(m[2])===Number(m[1])+1};
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const tr=(ar,f)=>fr()?f:ar;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function archiveError(error){
 if(navigator.onLine===false||window.__nataijiOfflineActive)return tr('أنت تعمل دون إنترنت. اتصل بالإنترنت ثم اضغط «إعادة المحاولة».','Vous êtes hors ligne. Connectez-vous puis appuyez sur « Réessayer ».');
 if(error?.status===401)return tr('انتهت جلسة الحساب. أعد تسجيل الدخول ثم افتح الأرشيف.','Session expirée. Reconnectez-vous puis ouvrez les archives.');
 if(error?.status===403)return tr('لا تملك صلاحية الاطلاع على أرشيف هذه المساحة.','Vous n’avez pas accès aux archives de cet espace.');
 if(error?.code==='academic_year_mismatch')return tr('السنة الدراسية لا تطابق إعدادات المدرسة. السنة المسجلة بالخادم: ','L’année diffère des paramètres scolaires. Année du serveur : ')+String(error?.data?.currentYear||'—');
 if(error?.code==='invalid_academic_year')return tr('تحقق من السنة الدراسية في الإعدادات، مثل 2026-2027.','Vérifiez l’année scolaire dans les paramètres (ex. 2026-2027).');
 if(error?.code==='archive_limit_reached')return tr('بلغت هذه السنة الحد الأقصى من الأرشيفات. يمكنك تنزيل النسخ السابقة.','Limite des archives atteinte pour cette année ; vous pouvez télécharger les copies existantes.');
 if(error?.code==='empty_school_archive')return tr('لا توجد بيانات في هذا القسم تستحق الأرشفة بعد.','Aucune donnée scolaire à archiver.');
 if(error?.code==='durable_storage_required')return tr('تخزين الأرشيف غير متاح على الخادم مؤقتًا.','Stockage d’archives temporairement indisponible.');
 if(error?.status===503||error?.status>=500)return tr('الخادم غير متاح مؤقتًا. لا تتأثر الدرجات؛ حاول بعد قليل.','Serveur temporairement indisponible. Les notes sont intactes ; réessayez.');
 if(error?.name==='AbortError')return tr('استغرق الاتصال بالخادم وقتًا طويلًا. حاول مرة أخرى.','Le serveur met trop de temps à répondre. Réessayez.');
 return tr('تعذر الاتصال بالخادم. تحقق من الإنترنت ثم اضغط «إعادة المحاولة».','Connexion au serveur impossible. Vérifiez Internet et appuyez sur « Réessayer ».');
}
function pendingLocal(){
 const id=String(currentUser?.id||'');if(!id)return 0;
 try{return JSON.parse(localStorage.getItem('nataiji-school-grade-drafts-v1:'+id)||'{}').rows?.length||0}catch{return 1}
}
function saveJson(data,year){
 const raw=JSON.stringify(data,null,2),blob=new Blob([raw],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='Nataiji-archive-'+String(year||'year').replace(/[^0-9-]/g,'')+'-'+String(data.id||'').slice(0,8)+'.json';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
function openArchive(){
 if(currentUser?.role!=='admin')return;
 const year=String(state?.year||'').trim(),p=modal(tr('أرشيف السنوات الدراسية','Archives des années scolaires'),`
 <p class="year-helper">${tr('احفظ نسخة مستقلة من نتائج السنة الحالية على الخادم ثم نزّلها على جهازك. الأرشفة لا تغيّر السنة، ولا تنقل التلاميذ أو تحذف أي درجة.','Conservez une copie indépendante des résultats scolaires et téléchargez-la. Aucune note, classe ou année active ne sera modifiée.')}</p>
 <p class="year-helper year-caution">${tr('مهم: الأرشيف يحتوي فقط على ما وصل إلى الخادم لحظة إنشائه. مسودات المعلمين على أجهزة أخرى قد تكون غير متزامنة.','Important : seules les notes arrivées au serveur sont archivées. D’autres appareils peuvent avoir des brouillons non synchronisés.')}</p>
 <div class="school-year-archive-current"><div><span class="year-current-label">${tr('السنة الحالية','Année en cours')}</span><strong dir="ltr" style="unicode-bidi:isolate">${esc(year||'—')}</strong></div>
 <button id="schoolYearArchiveCreate" class="primary year-primary" type="button">${tr('حفظ أرشيف السنة الحالية','Archiver l’année courante')}</button></div>
 <p id="schoolYearArchiveMessage" role="status" aria-live="polite"></p><div id="schoolYearArchivesList" aria-live="polite">${tr('جارٍ تحميل الأرشيف…','Chargement des archives…')}</div>
 <button type="button" id="schoolYearArchiveRetry" hidden>${tr('إعادة المحاولة','Réessayer')}</button>`);
 p.classList.add('nataiji-year-dialog','nataiji-archive-dialog');
 const msg=q('#schoolYearArchiveMessage',p),list=q('#schoolYearArchivesList',p),create=q('#schoolYearArchiveCreate',p),retry=q('#schoolYearArchiveRetry',p);
 const yearIsValid=validAcademicYear(year);
 let refreshing=false,ready=false;
 create.disabled=true;
 if(!yearIsValid)msg.textContent=tr('تحقق من السنة الدراسية في الإعدادات (مثال 2026-2027).','Vérifiez l’année scolaire dans les paramètres (ex. 2026-2027).');
 const render=async()=>{
  if(refreshing||!p.isConnected)return;refreshing=true;
  retry.hidden=true;list.textContent=tr('جارٍ الاتصال بالخادم…','Connexion au serveur…');
  try{
   if(navigator.onLine===false||window.__nataijiOfflineActive)throw Object.assign(new Error('offline'),{code:'offline'});
   const data=await api('/api/school-year-archives');
   if(!p.isConnected)return;
   ready=true;create.disabled=!yearIsValid;
   if(!msg.dataset.keepMessage)msg.textContent='';
   const rows=data.archives||[];
   list.innerHTML=rows.length?rows.map(item=>`<div class="school-year-archive-row">
    <div class="year-archive-detail"><b dir="ltr">${esc(item.year)}</b>
     <small>${esc(new Date(item.createdAt).toLocaleString(fr()?'fr-FR':'ar-MR'))}</small>
     <small>${tr('التلاميذ','Élèves')}: ${Number(item.counts?.pupils||0)} · ${tr('الدرجات','Notes')}: ${Number(item.counts?.marks||0)}</small></div>
    <div class="year-archive-actions">
     <button type="button" data-archive-export="${esc(item.id)}" data-archive-year="${esc(item.year)}">${tr('تنزيل نسخة','Télécharger')}</button>
     ${yearKey(item.year)===yearKey(year)?'<button type="button" class="year-primary" data-archive-promote="'+esc(item.id)+'">'+tr('إعداد السنة القادمة','Préparer l’année suivante')+'</button>':''}
    </div></div>`).join(''):`<p>${tr('لا توجد أرشيفات بعد.','Aucune archive enregistrée.')}</p>`;
   for(const button of p.querySelectorAll('[data-archive-promote]'))button.onclick=()=>{
    const archived=rows.find(x=>x.id===button.dataset.archivePromote);
    if(archived)window.nataijiOpenYearPromotion?.(archived)
   };
   for(const button of p.querySelectorAll('[data-archive-export]'))button.onclick=async()=>{
    button.disabled=true;
    try{const item=await api('/api/school-year-archives/'+encodeURIComponent(button.dataset.archiveExport));saveJson(item,button.dataset.archiveYear)}
    catch{msg.textContent=tr('تعذّر تنزيل الأرشيف، حاول مجددًا عند توفر الإنترنت.','Téléchargement impossible ; réessayez avec Internet.')}
    finally{button.disabled=false}
   }
  }catch(error){
   if(!p.isConnected)return;
   ready=false;create.disabled=true;
   list.textContent=archiveError(error);
   retry.hidden=false;
  }finally{refreshing=false}
 };
 retry.onclick=()=>{void render()};
 window.addEventListener('online',()=>{if(p.isConnected&&!ready)void render()},{once:true});
 create.onclick=async()=>{
  if(!ready||navigator.onLine===false||window.__nataijiOfflineActive){msg.textContent=tr('يجب الاتصال بالخادم وتحميل قائمة الأرشيف أولًا.','Connectez-vous au serveur et chargez la liste des archives avant de sauvegarder.');return}
  const n=pendingLocal();
  if(n){msg.textContent=tr('توجد '+n+' درجة معلقة على هذا الجهاز. زامنها أولًا قبل إنشاء الأرشيف.','Il reste '+n+' note(s) sur cet appareil. Synchronisez-les avant l’archive.');return}
  if(!confirm(tr('إنشاء نسخة ثابتة لسنة '+year+'؟ لن يتغير أي تلميذ أو درجة أو سنة. تأكد من مزامنة جميع أجهزة المعلمين أولًا.','Archiver '+year+' sans modifier les élèves, notes ou l’année ? Vérifiez que tous les appareils ont synchronisé leurs notes.')))return;
  create.disabled=true;msg.textContent=tr('جارٍ حفظ الأرشيف على الخادم…','Archivage sur le serveur…');
  try{
   const result=await api('/api/school-year-archives',{method:'POST',body:JSON.stringify({year:yearKey(year)})});
   msg.dataset.keepMessage='1';
   await render();
   msg.textContent=tr('✓ تم الحفظ بنجاح. يمكنك الآن الضغط على «إعداد السنة القادمة» بجوار الأرشيف.','✓ Archive enregistrée. Utilisez « Préparer l’année suivante » à côté.');
   const button=p.querySelector('[data-archive-promote="'+result.id+'"]')||p.querySelector('[data-archive-export="'+result.id+'"]');button?.focus()
  }
  catch(e){msg.textContent=archiveError(e)+tr(' تحقق من القائمة قبل إعادة الحفظ.',' Vérifiez la liste avant de recommencer.')}
  finally{create.disabled=!ready||!yearIsValid}
 };
 void render();
}
function mount(){
 const grid=q('[data-page="more"] .settings-grid');
 if(!grid)return;
 const existing=q('#schoolYearArchiveBtn',grid);
 // Session permission can change when switching between owned and shared spaces.
 if(typeof currentUser==='undefined'||currentUser?.role!=='admin'){
  existing?.remove();return
 }
 if(existing)return;
 const b=document.createElement('button');
 b.id='schoolYearArchiveBtn';b.className='menu-card';b.type='button';
 b.innerHTML='<b>'+tr('أرشيف السنوات الدراسية','Archives des années scolaires')+'</b><span>'+tr('حفظ النتائج السابقة وتنزيلها دون تغييرها','Conserver et exporter les résultats sans les modifier')+'</span>';
 grid.appendChild(b);b.onclick=openArchive
}
window.nataijiMountSchoolYearArchive=mount;
document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,100));
// The first auth status request may still be pending at DOMContentLoaded.
document.addEventListener('click',e=>{
 if(e.target.closest?.('[data-view="more"]'))setTimeout(mount,0)
},true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(mount,0)});
let timer;
new MutationObserver(()=>{
 if(!q('[data-page="more"] .settings-grid'))return;
 const visible=q('#schoolYearArchiveBtn');
 if(visible&&typeof currentUser!=='undefined'&&currentUser?.role==='admin')return;
 clearTimeout(timer);timer=setTimeout(mount,60)
}).observe(document.documentElement,{childList:true,subtree:true});
})();
