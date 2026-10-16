/* Safe staging of next year's pupils. Does NOT activate a year or alter marks. */
(()=>{
'use strict';
const tr=(ar,fr)=>localStorage.getItem('nataiji-lang')==='fr'?fr:ar;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q=(selector,root=document)=>root.querySelector(selector);
function messageFor(error){
 const code=String(error?.code||'');
 const map={
  invalid_promotion_selection:tr('تحقق من القسم والتلاميذ والرمز المطلوب.','Vérifiez la classe, les élèves et le code.'),
  source_year_changed:tr('تغيرت السنة الحالية. أعد فتح الأرشيف وتأكد من السنة.','L’année active a changé. Rouvrez les archives.'),
  destination_archive_mismatch:tr('هذا القسم المستقبلي أُعد سابقًا من أرشيف آخر. لا يمكن خلط نسختين مختلفتين.','Cette classe future provient d’une autre archive. Mélange interdit.'),
  pupil_not_found:tr('تغيّر اختيار التلاميذ؛ حدّث القائمة.','Sélection des élèves périmée ; rechargez.'),
  class_capacity:tr('القسم المستقبلي وصل إلى الحد الأقصى المسموح.','La classe future a atteint sa capacité.'),
  archived_pupils_missing:tr('هذا القسم لا يحتوي على تلاميذ محفوظين في الأرشيف.','Aucun élève archivé pour cette classe.'),
  archive_not_found:tr('تعذّر العثور على الأرشيف أو الوصول إليه.','Archive inaccessible ou introuvable.')
 };
 return map[code]||tr('تعذّر الاتصال بالخادم أو إكمال الطلب. حاول لاحقًا؛ لم تُحذف بيانات السنة الحالية.','Connexion ou opération impossible. Aucune donnée actuelle n’a été supprimée.');
}
async function open(archive){
 if(typeof currentUser==='undefined'||currentUser?.role!=='admin'||!archive?.id)return;
 if(navigator.onLine===false||window.__nataijiOfflineActive){alert(tr('يتطلب إعداد السنة الجديدة الاتصال بالإنترنت.','Une connexion Internet est requise.'));return}
 const p=modal(tr('إعداد تلاميذ السنة القادمة','Préparer les élèves de l’année suivante'),`
 <p>${tr('هذه مرحلة إعداد منفصلة؛ لا تغيّر سنة العمل ولا التلاميذ أو الدرجات الحالية. ستكون درجات السنة الجديدة فارغة.','Cette préparation est isolée : ni l’année en cours, ni les élèves ou leurs notes ne sont modifiés. Les notes futures seront vides.')}</p>
 <p>${tr('يجب أن يكون الأرشيف قد أُنشئ بعد مزامنة جميع درجات السنة الأصلية.','L’archive doit être créée après la synchronisation de toutes les notes de l’année source.')}</p>
 <div id="promotionYearHeader" dir="ltr" style="text-align:center;font-weight:750;margin:10px 0"></div>
 <div id="promotionLoading" role="status">${tr('جارٍ تحميل بيانات الأرشيف…','Chargement de l’archive…')}</div>
 <section id="promotionForm" hidden>
  <label>${tr('القسم الأصلي','Classe source')}<select id="promotionSource"></select></label>
  <label>${tr('رمز القسم في السنة الجديدة (مثلاً 2AF)','Code de la classe future (ex. 2AF)')}<input id="promotionTarget" type="text" maxlength="20" dir="ltr" style="text-transform:uppercase" placeholder="2AF" autocomplete="off"></label>
  <label style="display:flex;align-items:center;gap:9px;margin-top:10px"><input type="checkbox" id="promotionAll" checked> ${tr('اختيار جميع التلاميذ','Sélectionner tous les élèves')}</label>
  <div class="roster-check-list" id="promotionPupils" style="max-height:32vh;overflow:auto"></div>
  <p id="promotionStatus" role="status" aria-live="polite"></p>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
   <button type="button" id="promotionPreview">${tr('معاينة الترحيل','Prévisualiser')}</button>
   <button type="button" id="promotionStage" class="primary" disabled>${tr('تأكيد إعداد القائمة','Confirmer la préparation')}</button>
  </div>
  <h3 style="font-size:16px">${tr('الأقسام التي أُعدت للسنة الجديدة','Classes déjà préparées')}</h3>
  <div id="promotionPrepared"></div>
 </section>`);
 const status=q('#promotionStatus',p),form=q('#promotionForm',p),sourceEl=q('#promotionSource',p),target=q('#promotionTarget',p),
  selection=q('#promotionPupils',p),checkAll=q('#promotionAll',p),previewBtn=q('#promotionPreview',p),stageBtn=q('#promotionStage',p);
 let snapshot=null,sourceClasses=[],pupils=[],lastPreview=null,working=false;
 const invalid=()=>{lastPreview=null;stageBtn.disabled=true;status.textContent=''};
 function currentSelections(){
  return [...selection.querySelectorAll('[data-promotion-key]')].filter(x=>x.checked).map(x=>x.dataset.promotionKey)
 }
 function redraw(){
  invalid();
  const classId=sourceEl.value;
  const rows=pupils.filter(x=>String(x.class_id)===classId);
  selection.innerHTML=rows.length?rows.map(row=>`<label style="display:flex;gap:9px;align-items:center;padding:7px 0"><input type="checkbox" data-promotion-key="${esc(row.nns)}" checked><span>${esc(row.data?.[1]||'—')}</span></label>`).join(''):`<p>${tr('لا يوجد تلاميذ مؤرشفون لهذا القسم.','Aucun élève archivé pour cette classe.')}</p>`;
  checkAll.checked=true;status.textContent=tr('تم العثور على '+rows.length+' تلميذًا في القسم.','Élèves trouvés : '+rows.length);
 }
 const displayPrepared=async()=>{
  const data=await api('/api/year-promotion');
  const year=q('#promotionYearHeader',p).dataset.targetYear;
  const items=(data.prepared||[]).filter(x=>x.targetYear===year);
  q('#promotionPrepared',p).innerHTML=items.length?items.map(x=>`<p><strong dir="ltr">${esc(x.targetClassCode)}</strong> · ${Number(x.studentCount||0)} ${tr('تلميذًا محفوظين للسنة القادمة','élèves préparés pour l’année future')}</p>`).join(''):`<p>${tr('لم تُجهّز أقسام للسنة القادمة بعد.','Aucune classe future préparée.')}</p>`;
 };
 try{
  const data=await api('/api/school-year-archives/'+encodeURIComponent(archive.id));
  snapshot=data.snapshot;
  sourceClasses=Array.isArray(snapshot?.structure?.classes)?snapshot.structure.classes:[];
  pupils=Array.isArray(snapshot?.pupils)?snapshot.pupils:[];
  const parts=String(archive.year||'').replace('/','-').split('-').map(Number);
  const nextYear=(parts.length===2&&parts[1]===parts[0]+1)?(parts[0]+1)+'-'+(parts[1]+1):'';
  if(!nextYear||!sourceClasses.length)throw Error('invalid_archive');
  const heading=q('#promotionYearHeader',p);
  heading.textContent=String(archive.year).replace('/','-')+' → '+nextYear;heading.dataset.targetYear=nextYear;
  sourceEl.innerHTML=sourceClasses.map(c=>`<option value="${esc(c.id)}">${esc(c.name||c.code||c.id)}</option>`).join('');
  if(!p.isConnected)return;
  q('#promotionLoading',p).hidden=true;form.hidden=false;
  sourceEl.onchange=redraw;target.oninput=invalid;selection.onchange=()=>{
   invalid();
   const all=[...selection.querySelectorAll('[data-promotion-key]')];checkAll.checked=all.length>0&&all.every(x=>x.checked);
  };
  checkAll.onchange=()=>{selection.querySelectorAll('[data-promotion-key]').forEach(x=>x.checked=checkAll.checked);invalid()};
  redraw();await displayPrepared();
 }catch(e){q('#promotionLoading',p).textContent=messageFor(e);return}
 function parameters(){return{archiveId:archive.id,sourceClassId:sourceEl.value,targetClassCode:target.value.trim().toUpperCase(),pupilKeys:currentSelections()}}
 previewBtn.onclick=async()=>{
  if(working)return;
  const body=parameters();
  if(!body.pupilKeys.length||!/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(body.targetClassCode)){
   status.textContent=tr('حدد التلاميذ ورمز قسم صحيحًا، مثل 2AF.','Choisissez les élèves et un code valide (ex. 2AF).');return
  }
  working=true;previewBtn.disabled=true;stageBtn.disabled=true;
  status.textContent=tr('جارٍ فحص التكرار في القائمة الجديدة…','Vérification des doublons…');
  try{
   const plan=await api('/api/year-promotion/prepare',{method:'POST',body:JSON.stringify({...body,dryRun:true})});
   lastPreview={body,plan};
   status.textContent=tr('المعاينة: '+plan.copied+' سيُعدّون في القسم '+plan.targetClassCode+'، و'+plan.skipped+' أسماء موجودة لن تتكرر. مجموع القسم المستقبلي: '+plan.totalPrepared+'.',
    'Aperçu : '+plan.copied+' à préparer dans '+plan.targetClassCode+', '+plan.skipped+' doublons ignorés. Total futur : '+plan.totalPrepared+'.');
   stageBtn.disabled=plan.copied===0;
  }catch(e){lastPreview=null;status.textContent=messageFor(e)}
  finally{working=false;previewBtn.disabled=false}
 };
 stageBtn.onclick=async()=>{
  if(working||!lastPreview||stageBtn.disabled)return;
  const {body,plan}=lastPreview;
  if(JSON.stringify(parameters())!==JSON.stringify(body)){invalid();return}
  if(!confirm(tr('تأكيد إعداد '+plan.copied+' تلميذًا في سنة '+plan.targetYear+' دون درجات؟ لن تتغير بيانات السنة الحالية، ولن تبدأ السنة الجديدة تلقائيًا.',
   'Préparer '+plan.copied+' élèves pour '+plan.targetYear+' sans notes ? Aucune donnée actuelle ne changera ; la nouvelle année ne sera pas activée.')))return;
  working=true;stageBtn.disabled=true;previewBtn.disabled=true;
  status.textContent=tr('جارٍ حفظ القائمة المستقبلية منفصلة عن البيانات الحالية…','Enregistrement isolé de la future liste…');
  try{
   const saved=await api('/api/year-promotion/prepare',{method:'POST',body:JSON.stringify(body)});
   status.textContent=tr('✓ أُعدّ '+saved.copied+' تلميذًا للسنة '+saved.targetYear+' دون المساس بنتائج السنة الحالية.','✓ '+saved.copied+' élèves préparés pour '+saved.targetYear+' sans modifier les notes actuelles.');
   lastPreview=null;await displayPrepared();
  }catch(e){status.textContent=messageFor(e)+' '+tr('افتح معاينة جديدة قبل إعادة المحاولة.','Faites un nouvel aperçu avant de réessayer.');lastPreview=null}
  finally{working=false;previewBtn.disabled=false}
 };
}
window.nataijiOpenYearPromotion=open;
})();
