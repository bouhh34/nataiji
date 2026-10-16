/* School owner: frozen, exportable year snapshots. No live grade or roster edits. */
(()=>{
'use strict';
if(window.__nataijiSchoolYearArchiveUi)return;window.__nataijiSchoolYearArchiveUi=true;
const q=(sel,root=document)=>root.querySelector(sel);
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const tr=(ar,f)=>fr()?f:ar;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let refreshing=false;
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
 <p>${tr('احفظ نسخة مستقلة من نتائج السنة الحالية على الخادم ثم نزّلها على جهازك. الأرشفة لا تغيّر السنة، ولا تنقل التلاميذ أو تحذف أي درجة.','Conservez une copie indépendante des résultats scolaires et téléchargez-la. Aucune note, classe ou année active ne sera modifiée.')}</p>
 <p>${tr('مهم: الأرشيف يحتوي فقط على ما وصل إلى الخادم لحظة إنشائه. مسودات المعلمين على أجهزة أخرى قد تكون غير متزامنة.','Important : seules les notes arrivées au serveur sont archivées. D’autres appareils peuvent avoir des brouillons non synchronisés.')}</p>
 <div class="school-year-archive-current"><strong>${esc(year||'—')}</strong>
 <button id="schoolYearArchiveCreate" class="primary" type="button">${tr('حفظ أرشيف السنة الحالية','Archiver l’année courante')}</button></div>
 <p id="schoolYearArchiveMessage" role="status"></p><div id="schoolYearArchivesList">${tr('جارٍ تحميل الأرشيف…','Chargement des archives…')}</div>`);
 const msg=q('#schoolYearArchiveMessage',p),list=q('#schoolYearArchivesList',p),create=q('#schoolYearArchiveCreate',p);
 if(!/^\d{4}[-/]\d{4}$/.test(year))create.disabled=true;
 const render=async()=>{
  if(refreshing)return;refreshing=true;
  try{
   const data=await api('/api/school-year-archives');
   const rows=data.archives||[];
   list.innerHTML=rows.length?rows.map(item=>`<div class="school-year-archive-row"><span><b>${esc(item.year)}</b><small>${esc(new Date(item.createdAt).toLocaleString(fr()?'fr-FR':'ar-MR'))} · ${tr('تلاميذ','Élèves')} ${Number(item.counts?.pupils||0)} · ${tr('درجات','Notes')} ${Number(item.counts?.marks||0)}</small></span><button type="button" data-archive-export="${esc(item.id)}" data-archive-year="${esc(item.year)}">${tr('تنزيل نسخة','Télécharger')}</button></div>`).join(''):`<p>${tr('لا توجد أرشيفات بعد.','Aucune archive enregistrée.')}</p>`;
   for(const button of p.querySelectorAll('[data-archive-export]'))button.onclick=async()=>{
    button.disabled=true;
    try{const item=await api('/api/school-year-archives/'+encodeURIComponent(button.dataset.archiveExport));saveJson(item,button.dataset.archiveYear)}
    catch{msg.textContent=tr('تعذّر تنزيل الأرشيف، حاول مجددًا عند توفر الإنترنت.','Téléchargement impossible ; réessayez avec Internet.')}
    finally{button.disabled=false}
   }
  }catch{list.textContent=tr('تعذّر جلب الأرشيف، أعد المحاولة بعد الاتصال.','Impossible de charger les archives ; réessayez en ligne.')}
  finally{refreshing=false}
 };
 create.onclick=async()=>{
  if(navigator.onLine===false){msg.textContent=tr('يتطلب حفظ الأرشيف اتصالًا بالخادم.','La sauvegarde exige une connexion au serveur.');return}
  const n=pendingLocal();
  if(n){msg.textContent=tr('توجد '+n+' درجة معلقة على هذا الجهاز. زامنها أولًا قبل إنشاء الأرشيف.','Il reste '+n+' note(s) sur cet appareil. Synchronisez-les avant l’archive.');return}
  if(!confirm(tr('إنشاء نسخة ثابتة لسنة '+year+'؟ لن يتغير أي تلميذ أو درجة أو سنة. تأكد من مزامنة جميع أجهزة المعلمين أولًا.','Archiver '+year+' sans modifier les élèves, notes ou l’année ? Vérifiez que tous les appareils ont synchronisé leurs notes.')))return;
  create.disabled=true;msg.textContent=tr('جارٍ حفظ الأرشيف على الخادم…','Archivage sur le serveur…');
  try{const result=await api('/api/school-year-archives',{method:'POST',body:JSON.stringify({year})});msg.textContent=tr('✓ حُفظ الأرشيف. نزّله من القائمة للاحتفاظ بنسخة أخرى.','✓ Archive créée. Téléchargez-en une autre copie depuis la liste.');await render();const button=p.querySelector('[data-archive-export="'+result.id+'"]');button?.focus()}
  catch(e){msg.textContent=tr('لم يكتمل الأرشيف: ','Archivage impossible : ')+String(e?.code||'check_connection')}
  finally{create.disabled=false}
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
