/* Offline library: selected PDFs and the teacher's own lesson plans.
   Small script only: never bundles curriculum PDFs or fetches third-party files. */
(()=>{'use strict';
if(window.nataijiOfflineLibrary)return;
const DB='nataiji-teaching-library-v1',LIMIT=64*1024*1024;
const lang=()=>localStorage.getItem('nataiji-lang')==='fr';
const tr=(ar,fr)=>lang()?fr:ar;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const owner=()=>{try{return String(currentUser?.id||currentUser?.userId||'device')}catch{return 'device'}};
const uid=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'local-'+Date.now()+'-'+Math.floor(Math.random()*1e7);
function transact(store,mode,createRequest){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('offline_storage_unavailable'));return}
  const opening=indexedDB.open(DB,1);
  opening.onupgradeneeded=()=>{const db=opening.result;for(const name of ['documents','preparations'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'})};
  opening.onerror=()=>reject(opening.error||Error('storage_open_failed'));
  opening.onsuccess=()=>{
   const db=opening.result;let tx,result,request;
   try{tx=db.transaction(store,mode);request=createRequest(tx.objectStore(store));request.onsuccess=()=>{result=request.result};request.onerror=()=>{};tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=()=>{db.close();reject(tx.error||request?.error||Error('storage_failed'))};tx.onerror=()=>{}}
   catch(e){db.close();reject(e)}
  }
 });
}
const get=(store,id)=>transact(store,'readonly',s=>s.get(id));
const all=store=>transact(store,'readonly',s=>s.getAll()).then(rows=>rows.filter(x=>x.owner===owner()).sort((a,b)=>(b.updated||b.created||0)-(a.updated||a.created||0)));
const put=(store,item)=>transact(store,'readwrite',s=>s.put(item));
const del=(store,id)=>transact(store,'readwrite',s=>s.delete(id));
function formatSize(bytes){return bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.ceil(bytes/1024)+' KB'}
async function pdfCheck(file){
 if(!file||file.size<5||file.size>LIMIT||!/\.pdf$/i.test(file.name))return false;
 const head=new Uint8Array(await file.slice(0,5).arrayBuffer());
 return [37,80,68,70,45].every((b,i)=>head[i]===b);
}
function normalizeError(err){
 if(err?.name==='QuotaExceededError')return tr('مساحة تخزين الجهاز لا تكفي. احذف ملفات غير لازمة أو استخدم مساحة أكبر.','Espace de stockage insuffisant sur cet appareil.');
 return err?.message||tr('تعذر حفظ الملف محليًا.','Enregistrement local impossible.');
}
function findRoot(element){return element?.closest('.koutoubi-modal')?.querySelector('[data-resource-content]')||element}
async function render(body){
 if(!body?.isConnected)return;
 body.innerHTML='<p role="status">'+tr('جارٍ فتح المكتبة المحلية…','Ouverture de la bibliothèque locale…')+'</p>';
 let documents,preps;
 try{[documents,preps]=await Promise.all([all('documents'),all('preparations')])}
 catch(err){body.innerHTML='<p role="alert">'+esc(tr('التخزين المحلي غير متاح في هذا المتصفح.','Le stockage local n’est pas disponible dans ce navigateur.'))+'</p>';return}
 if(!body.isConnected)return;
 const usage=documents.reduce((n,x)=>n+(x.size||0),0);
 body.innerHTML='<section class="kou-offline" dir="'+(lang()?'ltr':'rtl')+'">'+
 '<h3>'+tr('مكتبتي بلا إنترنت','Ma bibliothèque hors ligne')+'</h3>'+
 '<p class="kou-offline-hint">'+tr('اختر الكتب أو أدلة التحضير التي تحتاجها فقط. لا توضع ملفات PDF داخل حجم تطبيق نتائجي، بل تحفظ في هذا الجهاز بعد اختيارك لها.','Choisissez uniquement les manuels et guides utiles. Les PDF ne sont pas inclus dans l’application; ils sont conservés sur cet appareil.')+'</p>'+
 '<p class="kou-offline-status">'+tr('ملفات محفوظة: ','Fichiers sauvegardés : ')+documents.length+' · '+formatSize(usage)+' · '+tr('تحاضير مكتوبة: ','Préparations : ')+preps.length+'</p>'+
 '<div class="kou-offline-grid"><form data-offline-upload class="kou-offline-box">'+
 '<h4>'+tr('إضافة كتاب أو دليل PDF','Ajouter un manuel ou un guide PDF')+'</h4>'+
 '<label>'+tr('نوع المورد','Type de document')+'<select name="kind"><option value="book">'+tr('كتاب مدرسي','Manuel scolaire')+'</option><option value="preparation">'+tr('دليل المدرس / تحضير جاهز','Guide / préparation')+'</option></select></label>'+
 '<label>'+tr('ملفات PDF من الهاتف (يمكن اختيار أكثر من ملف)','PDF depuis le téléphone (plusieurs fichiers possibles)')+'<input type="file" name="pdfs" accept=".pdf,application/pdf" multiple required></label>'+
 '<button type="submit" class="primary">'+tr('حفظ على الجهاز','Conserver sur l’appareil')+'</button>'+
 '<p data-upload-state role="status"></p></form>'+
 '<form data-offline-note class="kou-offline-box">'+
 '<h4>'+tr('تحضير درس جديد','Nouvelle fiche de préparation')+'</h4>'+
 '<input name="id" type="hidden">'+
 '<label>'+tr('عنوان الدرس','Titre de la leçon')+'<input name="title" maxlength="140" required placeholder="'+tr('مثال: جمع الأعداد','Ex. Addition')+'"></label>'+
 '<label>'+tr('القسم / السنة','Classe / année')+'<input name="className" maxlength="90" placeholder="1AF / 2AF / 1AS"></label>'+
 '<label>'+tr('المادة','Matière')+'<input name="subject" maxlength="90"></label>'+
 '<label>'+tr('الأهداف','Objectifs')+'<textarea name="objectives" rows="2" maxlength="5000"></textarea></label>'+
 '<label>'+tr('خطوات التحضير والملاحظات','Déroulement et notes')+'<textarea name="steps" rows="4" maxlength="30000" required></textarea></label>'+
 '<button type="submit" class="primary">'+tr('حفظ التحضير دون إنترنت','Sauvegarder la préparation')+'</button>'+
 '<button type="button" data-note-cancel hidden>'+tr('إلغاء التعديل','Annuler la modification')+'</button>'+
 '<p data-note-state role="status"></p></form></div>'+
 '<h4>'+tr('الكتب والأدلة المحفوظة','Manuels et guides conservés')+'</h4>'+
 (documents.length?'<div class="kou-offline-list">'+documents.map(x=>
  '<div class="kou-offline-item"><div><b>'+esc(x.name)+'</b><small>'+tr(x.kind==='book'?'كتاب':'دليل أو تحضير',x.kind==='book'?'Manuel':'Guide / préparation')+' · '+formatSize(x.size)+'</small></div><div class="kou-offline-actions">'+
  '<button type="button" data-doc-open="'+esc(x.id)+'">'+tr('فتح','Ouvrir')+'</button>'+
  '<button type="button" data-doc-download="'+esc(x.id)+'">'+tr('تنزيل','Télécharger')+'</button>'+
  '<button type="button" data-doc-delete="'+esc(x.id)+'" class="kou-offline-danger">'+tr('حذف','Supprimer')+'</button></div></div>').join('')+'</div>':'<p class="kou-offline-empty">'+tr('لم تحفظ كتبًا بعد. افتح كتابك من كتبي الرسمي وحمّل ملف PDF، ثم أضفه هنا مرة واحدة.','Aucun manuel enregistré. Téléchargez un PDF depuis le site officiel Koutoubi puis ajoutez-le ici.')+'</p>')+
 '<h4>'+tr('تحاضيري المحفوظة','Mes préparations enregistrées')+'</h4>'+
 (preps.length?'<div class="kou-offline-list">'+preps.map(x=>
 '<div class="kou-offline-item"><div><b>'+esc(x.title)+'</b><small>'+esc([x.className,x.subject].filter(Boolean).join(' · '))+'</small></div><div class="kou-offline-actions">'+
 '<button type="button" data-note-view="'+esc(x.id)+'">'+tr('عرض','Afficher')+'</button>'+
 '<button type="button" data-note-edit="'+esc(x.id)+'">'+tr('تعديل','Modifier')+'</button>'+
 '<button type="button" data-note-delete="'+esc(x.id)+'" class="kou-offline-danger">'+tr('حذف','Supprimer')+'</button></div></div>').join('')+'</div>':'<p class="kou-offline-empty">'+tr('لا توجد تحاضير مكتوبة بعد. اكتب تحضيرًا ليبقى متاحًا دون اتصال.','Aucune préparation enregistrée. Rédigez-en une pour la consulter hors ligne.')+'</p>')+
 '<p class="kou-offline-warning">'+tr('المحتوى المحفوظ خاص بهذا الجهاز والمتصفح والحساب. لا يظهر تلقائيًا على جهاز آخر. لا تمسح بيانات موقع نتائجي؛ فذلك قد يمحو كتبك وتحاضيرك المحلية.','Les fichiers restent sur ce navigateur, cet appareil et ce compte; ils ne se synchronisent pas automatiquement. Ne supprimez pas les données du site.')+'</p></section>';
 const upload=body.querySelector('[data-offline-upload]'),note=body.querySelector('[data-offline-note]');
 upload.addEventListener('submit',async e=>{
  e.preventDefault();const status=upload.querySelector('[data-upload-state]'),files=[...upload.elements.pdfs.files];
  if(!files.length)return;
  if(files.length>12){status.textContent=tr('اختر 12 ملفًا أو أقل في كل مرة.','Choisissez 12 fichiers maximum.');return}
  const btn=upload.querySelector('button[type=submit]');btn.disabled=true;
  let count=0;
  try{
   if(navigator.storage?.persist)await navigator.storage.persist().catch(()=>false);
   for(const file of files){
    if(!await pdfCheck(file))throw Error(tr('الملف ليس PDF صالحًا أو يتجاوز 64 MB: ','Fichier PDF invalide ou supérieur à 64 MB : ')+file.name);
    const existing=documents.find(x=>x.name===file.name&&x.size===file.size);
    if(existing)continue;
    await put('documents',{id:uid(),owner:owner(),name:file.name.slice(0,180),kind:upload.elements.kind.value==='preparation'?'preparation':'book',size:file.size,blob:file,created:Date.now()});
    count++;
   }
   status.textContent=tr('تم حفظ الملفات: ','Fichiers sauvegardés : ')+count;
   await render(body)
  }catch(err){status.textContent=normalizeError(err);btn.disabled=false}
 });
 note.addEventListener('submit',async e=>{
  e.preventDefault();const status=note.querySelector('[data-note-state]'),btn=note.querySelector('button[type=submit]');
  const title=note.elements.title.value.trim(),steps=note.elements.steps.value.trim();
  if(!title||!steps){status.textContent=tr('أكمل العنوان وخطوات الدرس.','Complétez le titre et le déroulement.');return}
  const id=note.elements.id.value,existing=id?preps.find(x=>x.id===id):null;
  if(id&&!existing){status.textContent=tr('تعذر العثور على التحضير.','Préparation introuvable.');return}
  btn.disabled=true;
  try{await put('preparations',{id:existing?.id||uid(),owner:owner(),title,className:note.elements.className.value.trim(),subject:note.elements.subject.value.trim(),objectives:note.elements.objectives.value.trim(),steps,created:existing?.created||Date.now(),updated:Date.now()});await render(body)}
  catch(err){status.textContent=normalizeError(err);btn.disabled=false}
 });
 body.querySelector('[data-note-cancel]').onclick=()=>render(body);
 body.onclick=async e=>{
  const btn=e.target.closest('[data-doc-open],[data-doc-download],[data-doc-delete],[data-note-view],[data-note-edit],[data-note-delete]');
  if(!btn||!body.contains(btn))return;
  const action=['doc-open','doc-download','doc-delete','note-view','note-edit','note-delete'].find(k=>btn.hasAttribute('data-'+k)),id=btn.getAttribute('data-'+action);
  if(action==='doc-delete'||action==='note-delete'){
   if(!confirm(tr('هل تريد حذف هذا المورد المحلي من جهازك؟','Supprimer cette ressource locale ?')))return;
   try{await del(action==='doc-delete'?'documents':'preparations',id);await render(body)}catch(err){alert(normalizeError(err))}
   return;
  }
  if(action==='doc-open'||action==='doc-download'){
   // Open a blank tab synchronously so mobile popup blockers cannot cancel it.
   const win=action==='doc-open'?window.open('about:blank','_blank'):null;
   try{const item=await get('documents',id);if(!item||item.owner!==owner()||!(item.blob instanceof Blob))throw Error('file_missing');
    const url=URL.createObjectURL(item.blob);
    if(win)win.location.replace(url);
    else{const anchor=document.createElement('a');anchor.href=url;anchor.download=item.name;document.body.append(anchor);anchor.click();anchor.remove()}
    setTimeout(()=>URL.revokeObjectURL(url),120000);
   }catch(err){win?.close();alert(normalizeError(err))}
   return;
  }
  const item=preps.find(x=>x.id===id);if(!item)return;
  if(action==='note-edit'){
   note.elements.id.value=item.id;note.elements.title.value=item.title;note.elements.className.value=item.className||'';note.elements.subject.value=item.subject||'';note.elements.objectives.value=item.objectives||'';note.elements.steps.value=item.steps;
   note.querySelector('[data-note-cancel]').hidden=false;note.querySelector('button[type=submit]').textContent=tr('حفظ التعديلات','Enregistrer les modifications');note.scrollIntoView({block:'nearest'});return;
  }
  if(action==='note-view'){
   const existing=body.querySelector('[data-note-preview]');existing?.remove();
   const panel=document.createElement('section');panel.className='kou-offline-preview';panel.setAttribute('data-note-preview','');
   panel.innerHTML='<h4>'+esc(item.title)+'</h4><p>'+esc([item.className,item.subject].filter(Boolean).join(' · '))+'</p><b>'+tr('الأهداف','Objectifs')+'</b><p class="kou-offline-pre">'+esc(item.objectives||'—')+'</p><b>'+tr('خطوات الدرس','Déroulement')+'</b><p class="kou-offline-pre">'+esc(item.steps)+'</p><button type="button" data-close-preview>'+tr('إغلاق','Fermer')+'</button>';
   panel.querySelector('[data-close-preview]').onclick=()=>panel.remove();
   body.querySelector('.kou-offline-warning').before(panel);panel.scrollIntoView({block:'nearest'})
  }
 };
}
window.nataijiOfflineLibrary={render};
})();