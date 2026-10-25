/* Local OCR stays on device; optional cloud OCR sends the image for transcription. */
(()=>{'use strict';
const base='/vendor/student-import/',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let extracting=false;
let engine,cachedWorker,cachedLanguage,workerProgress=()=>{},idleTimer;
async function loadEngine(){if(window.Tesseract)return; if(!engine)engine=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=base+'tesseract.min.js';s.onload=resolve;s.onerror=()=>{engine=null;s.remove();reject(Error('OCR unavailable'))};document.head.append(s)});await engine}
function parse(text){return String(text).split(/\r?\n/).map(s=>s.trim().replace(/^[\d٠-٩۰-۹]+[\s.)،:-]+/u,'').replace(/\s+/g,' ')).filter(s=>/[\p{L}]/u.test(s)&&s.length<=160&&(s.match(/\p{L}/gu)||[]).length>=3&&!/^(?:NNS|N°|Nom|Prénom|Liste|Classe|École|الاسم|لائحة|قائمة|القسم|المدرسة|الرقم)(?:\s|$)/iu.test(s));}
function ocrLines(data){
 const words=String(data.tsv||'').split(/\r?\n/).slice(1).map(row=>row.split('\t')).filter(c=>c[0]==='5'&&c[11]?.trim()).map(c=>({x:+c[6],y:+c[7],w:+c[8],h:+c[9],text:c.slice(11).join('\t').trim()})).sort((a,b)=>a.y-b.y);
 if(!words.length)return data.text;
 const lines=[];for(const word of words){let line=lines.find(l=>Math.min(l.bottom,word.y+word.h)-Math.max(l.top,word.y)>Math.min(l.bottom-l.top,word.h)*.45);if(!line){line={top:word.y,bottom:word.y+word.h,words:[]};lines.push(line)}line.words.push(word);line.top=Math.min(line.top,word.y);line.bottom=Math.max(line.bottom,word.y+word.h)}
 return lines.sort((a,b)=>a.top-b.top).map(l=>{const rtl=l.words.filter(w=>/[\u0600-\u06ff]/.test(w.text)).length>l.words.length/2;return l.words.sort((a,b)=>rtl?b.x-a.x:a.x-b.x).map(w=>w.text).join(' ')}).join('\n');
}
async function extract(file,progress,cancelled,language='both',cloud=false){
 if(file.size>20*1024*1024)throw Error('الحد الأقصى 20 MB / Maximum 20 Mo');
 if(!(/\.(pdf|png|jpe?g|webp|bmp)$/i.test(file.name)||/^image\/(png|jpeg|webp|bmp)$/.test(file.type)))throw Error('اختر PDF أو صورة JPG/PNG / Choisissez un PDF ou une image JPG/PNG');
 if(extracting)throw Error('القراءة قيد التنفيذ / Lecture en cours');extracting=true;
 let worker,doc,pendingWorker,timer,failed=false;const output=[],confidences=[],students=[];clearTimeout(idleTimer);
 const stages={'loading tesseract core':'تحميل قارئ الصور / Chargement du lecteur','initializing tesseract':'تهيئة قارئ الصور / Initialisation','loading language traineddata':'تحميل لغة اللائحة لأول مرة / Chargement de la langue','initializing api':'تجهيز القراءة / Préparation','recognizing text':'استخراج الأسماء / Lecture des noms'};
 const timed=promise=>Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('انتهت مهلة القراءة؛ جرّب صورة أصغر / Délai dépassé : essayez une image plus petite')),180000)})]).finally(()=>clearTimeout(timer));
 const ocr=async image=>{if(cloud){progress('قراءة الصورة بالذكاء الاصطناعي / Lecture de l’image');const response=await fetch('/api/student-document/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:image.toDataURL('image/jpeg',.85),mode:'details'}),signal:AbortSignal.timeout(65000)});const result=await response.json();if(!response.ok)throw Error(result.error==='vision_model_unavailable'?'نموذج Gemini غير متاح لهذا المشروع / Modèle Gemini indisponible':result.error==='vision_request_invalid'?'رفض Gemini صيغة الطلب (400) / Requête Gemini refusée (400)':result.error==='vision_incomplete'?'لم تكتمل القراءة؛ جرّب صورة مقتصة حول الأسماء / Lecture incomplète, recadrez les noms':result.error==='vision_invalid_result'?'تعذر تحليل الأسماء المستخرجة / Réponse illisible':result.error==='vision_unconfigured'?'القراءة الذكية غير مفعلة / Lecture intelligente non activée':result.error==='vision_quota'?'رصيد API غير كافٍ أو بلغ حد الاستخدام؛ راجع حصة Gemini أو رصيد مزود القراءة / Vérifiez le quota Gemini ou les crédits du fournisseur':result.error==='vision_invalid_key'?'مفتاح API غير صالح؛ راجعه في Render / Clé API invalide':result.error==='vision_access_denied'?'المفتاح لا يملك صلاحية القراءة / Accès API refusé':result.error==='vision_busy'?'الخدمة مشغولة، أعد المحاولة / Service occupé, réessayez':'تعذر الوصول إلى خدمة القراءة الذكية / Service de lecture indisponible');const found=Array.isArray(result.students)?result.students:(result.names||[]).map(n=>({...n,phone:'',nns:'',sex:'',birthDate:''}));students.push(...found);confidences.push(found.some(n=>n.uncertain)?0:80);return found.map(n=>n.text).join('\n')}if(cancelled())throw Error('cancelled');progress('تجهيز القراءة / Préparation de la lecture');await loadEngine();workerProgress=m=>{if(!cancelled())progress(`${stages[m.status]||m.status} ${Math.round((m.progress||0)*100)}%`)};if(!worker){if(cachedWorker&&cachedLanguage!==language){await cachedWorker.terminate();cachedWorker=null}if(cachedWorker)worker=cachedWorker;else{pendingWorker=Tesseract.createWorker(language==='both'?['ara','fra']:language,1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base.slice(0,-1),logger:m=>workerProgress(m)},{load_system_dawg:'0',load_freq_dawg:'0'});worker=await timed(pendingWorker);cachedWorker=worker;cachedLanguage=language}await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'})}if(cancelled())throw Error('cancelled');progress('استخراج الأسماء / Lecture des noms');const {data}=await timed(worker.recognize(image,{}, {text:true,tsv:true}));confidences.push(Number.isFinite(data.confidence)?data.confidence:0);return ocrLines(data)};
 const photo=async()=>{const url=URL.createObjectURL(file),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('تعذر فتح الصورة / Image illisible'));img.src=url});const scale=Math.min(1,2200/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);try{return await ocr(canvas)}finally{canvas.width=canvas.height=0}}finally{URL.revokeObjectURL(url)}};
 try{if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
 const pdf=await import(base+'pdf.mjs');pdf.GlobalWorkerOptions.workerSrc=base+'pdf.worker.mjs';doc=await pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/'}).promise;
 if(doc.numPages>30)throw Error('الحد الأقصى 30 صفحة / Maximum 30 pages');
 for(let n=1;n<=doc.numPages;n++){if(cancelled())throw Error('cancelled');progress(`${n} / ${doc.numPages}`);const page=await doc.getPage(n);
 // Render each page for Gemini, even if the PDF contains embedded text.
 // This avoids inconsistent local extraction when a PDF mixes scans and text.
 const initial=page.getViewport({scale:1}),scale=Math.min(2,2200/Math.max(initial.width,initial.height)),view=page.getViewport({scale}),canvas=document.createElement('canvas');
 canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
 try{await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;output.push(await ocr(canvas))}
 finally{canvas.width=canvas.height=0;page.cleanup()}}
 }else output.push(await photo());return {text:output.join('\n'),confidence:confidences.length?Math.min(...confidences):100,students};
 }catch(err){failed=true;throw err}finally{extracting=false;clearTimeout(timer);workerProgress=()=>{};if(failed||cancelled()){if(worker){if(cachedWorker===worker)cachedWorker=null;await worker.terminate()}else pendingWorker?.then(w=>w.terminate()).catch(()=>{})}else if(worker){idleTimer=setTimeout(()=>{const old=cachedWorker;cachedWorker=null;old?.terminate().catch(()=>{})},120000)}await doc?.destroy()}
}
window.nataijiStudentImport={parse,open({toAr,toFr,onSave}){
 const french=localStorage.getItem('nataiji-lang')==='fr';
 const t=(ar,fr)=>french?fr:ar;
 const wrap=document.createElement('div');wrap.className='professor-modal nataiji-student-import-modal';
 wrap.innerHTML=`<div class="professor-modal-card" role="dialog" aria-modal="true" aria-labelledby="nti-import-title" dir="${french?'ltr':'rtl'}">
 <header>
   <div class="nti-heading"><span class="nti-heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></span><div><small>${t('لائحة التلاميذ','Liste des élèves')}</small><h2 id="nti-import-title">${t('استيراد التلاميذ','Importer des élèves')}</h2></div></div>
   <button type="button" data-close aria-label="${t('إغلاق','Fermer')}">×</button>
 </header>
 <div class="professor-modal-body">
   <div class="nti-steps" aria-label="${t('مراحل الاستيراد','Étapes de l’importation')}">
     <div data-step="1" aria-current="step"><b>1</b><span>${t('اختيار الملف','Choisir le fichier')}</span></div>
     <div data-step="2"><b>2</b><span>${t('مراجعة الأسماء','Vérifier les noms')}</span></div>
     <div data-step="3"><b>3</b><span>${t('حفظ التلاميذ','Enregistrer')}</span></div>
   </div>
   <p class="nti-intro">${t('ارفع صورة واضحة أو ملف PDF، ثم راجع الأسماء بالعربية والفرنسية قبل الحفظ.','Importez une photo nette ou un PDF, puis vérifiez les noms en arabe et en français avant de les enregistrer.')}</p>
   <div class="nti-upload-grid">
     <label class="nti-upload-choice">
       <span class="nti-upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></span>
       <span class="nti-upload-copy"><strong>${t('اختيار PDF أو صورة','Choisir un PDF ou une photo')}</strong><small>PDF · JPG · PNG · WebP</small></span>
       <input type="file" data-file accept="application/pdf,image/jpeg,image/png,image/webp,image/bmp,.pdf" aria-label="${t('اختيار ملف PDF أو صورة','Sélectionner un PDF ou une photo')}">
       <output data-file-feedback aria-live="polite"></output>
     </label>
     <label class="nti-upload-choice">
       <span class="nti-upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13.5" r="3.5"/></svg></span>
       <span class="nti-upload-copy"><strong>${t('التقاط صورة بالكاميرا','Prendre une photo')}</strong><small>${t('تصوير لائحة التلاميذ','Photographier la liste')}</small></span>
       <input type="file" data-camera accept="image/*" capture="environment" aria-label="${t('تصوير لائحة التلاميذ','Photographier la liste des élèves')}">
       <output data-camera-feedback aria-live="polite"></output>
     </label>
   </div>
   <div data-reading-choice class="nti-reading-choice" hidden>
     <strong>${t('جاهز لاستخراج الأسماء','Prêt à extraire les noms')}</strong>
     <p class="nti-reading-hint">${t('يدعم الصور واللوائح المكتوبة بخط اليد أو المطبوعة.','Pour les listes manuscrites ou imprimées.')}</p>
     <p data-smart-disclosure class="nti-smart-disclosure"></p>
     <button type="button" data-read-smart class="nti-smart-choice">${t('✨ استخراج الأسماء والبيانات وأرقام أولياء الأمور','✨ Extraire les noms, informations et téléphones avec Gemini')}</button>
   </div>
   <p data-status class="nti-status" role="status" aria-live="polite"></p>
   <label class="nti-text-field"><strong>${t('الأسماء المستخرجة (اسم في كل سطر)','Noms extraits (un nom par ligne)')}</strong><textarea data-text rows="5" dir="auto" placeholder="${t('ستظهر الأسماء هنا، ويمكنك تعديلها أو لصقها يدويًا','Les noms apparaîtront ici. Vous pouvez les corriger ou les coller.')}"></textarea></label>
   <button type="button" class="nti-review-button" data-review>${t('متابعة إلى مراجعة الأسماء','Vérifier les noms')} <span aria-hidden="true">←</span></button>
   <div data-rows class="nti-review-list"></div>
   <button type="button" class="primary nti-save-button" data-save hidden>${t('حفظ التلاميذ في القسم','Enregistrer les élèves dans la classe')}</button>
 </div></div>`;
 document.body.append(wrap)
 const q=s=>wrap.querySelector(s),status=q('[data-status]'),review=q('[data-review]'),save=q('[data-save]');let cancelled=false,busy=false,saving=false,confidence=100,recognizedStudents=[];
 let cloud=false,pendingFile=null,choiceGeneration=0;
 const capabilities=fetch('/api/student-document/status')
  .then(r=>r.ok?r.json():{})
  .then(info=>{cloud=info.available===true&&info.provider==='Gemini'})
  .catch(()=>{cloud=false});
 // This information is displayed before the user chooses smart OCR.
 function explainSmartReading(){
   q('[data-smart-disclosure]').textContent=t(
     'بالضغط على استخراج، توافق على إرسال بيانات التلاميذ وأوليائهم في الصورة إلى Gemini لتحليلها. راجع كل رقم، ولا تُفعّل مراسلات واتساب دون موافقة ولي الأمر.',
     'En cliquant sur Extraire, vous acceptez l’envoi à Gemini des données des élèves et parents visibles. Vérifiez chaque numéro; le consentement parental est requis.'
   );
 }

 const setStep=number=>{
   for(const el of wrap.querySelectorAll('[data-step]')){
     const active=Number(el.dataset.step)===number;
     if(active)el.setAttribute('aria-current','step');
     else el.removeAttribute('aria-current');
     el.classList.toggle('is-current',active);
   }
 };
 setStep(1);
 save.disabled=true;const setSaveVisible=visible=>{save.hidden=!visible;save.style.display=visible?'':'none';save.disabled=!visible};setSaveVisible(false);
 const close=()=>{cancelled=true;wrap.remove()};q('[data-close]').onclick=()=>{if(!saving)close()};wrap.addEventListener('keydown',e=>{if(e.key==='Escape'&&!saving)close();if(e.key==='Tab'){const controls=[...wrap.querySelectorAll('button,input,textarea')].filter(x=>!x.disabled&&!x.hidden&&x.getClientRects().length);if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0]?.focus()}}});q('[data-close]').focus();
 async function processFile(file){
  if(!file||busy||cancelled)return;
  busy=true;
  pendingFile=null;
  q('[data-reading-choice]').hidden=true;
  setStep(1);setSaveVisible(false);review.disabled=true;
  q('[data-rows]').replaceChildren();
  for(const input of wrap.querySelectorAll('input[type=file]'))input.disabled=true;
  try{
    status.textContent=t('جارٍ استخراج الأسماء...','Extraction des noms en cours…');
    // Only the user's explicit smart-reading button authorizes cloud transfer.
    if(!cloud)throw Error(t('خدمة Gemini غير متاحة الآن. حاول مجددًا لاحقًا أو أدخل الأسماء يدويًا.','Gemini est indisponible. Réessayez plus tard ou saisissez les noms manuellement.'));
    const result=await extract(file,message=>{status.textContent=message},()=>cancelled,'both',true);
    confidence=result.confidence;recognizedStudents=result.students||[];
    q('[data-text]').value=result.text;
    if(!cancelled){
      status.textContent=t('راجع الأسماء المستخرجة قبل الحفظ.','Vérifiez les noms extraits avant l’enregistrement.');
      review.onclick();
    }
  }catch(err){
    if(!cancelled){
      status.textContent=t('تعذر قراءة الملف. جرّب صورة أوضح أو الصق الأسماء يدويًا. ','Lecture impossible. Essayez une photo plus nette ou collez les noms. ')+err.message;
    }
  }finally{
    busy=false;review.disabled=false;
    for(const input of wrap.querySelectorAll('input[type=file]')){input.disabled=false;input.value=''}
  }
 }
 async function read(e){
  const file=e.target.files?.[0];
  if(!file||busy||cancelled)return;
  const generation=++choiceGeneration;
  pendingFile=file;
  q('[data-text]').value='';recognizedStudents=[];
  q('[data-rows]').replaceChildren();
  setSaveVisible(false);setStep(1);
  const feedback=e.target.hasAttribute('data-camera')?q('[data-camera-feedback]'):q('[data-file-feedback]');
  feedback.textContent=file.name;
  e.target.value='';
  q('[data-reading-choice]').hidden=true;
  status.textContent=t('جارٍ تجهيز خيارات القراءة…','Préparation des options de lecture…');
  await capabilities;
  if(generation!==choiceGeneration||cancelled||pendingFile!==file)return;
  if(!cloud){
    pendingFile=null;
    q('[data-reading-choice]').hidden=true;
    status.textContent=t('Gemini غير متاح الآن. يمكنك كتابة الأسماء أو لصقها في الخانة أدناه ثم مراجعتها وحفظها.','Gemini est indisponible. Saisissez ou collez les noms ci-dessous, puis vérifiez-les et enregistrez-les.');
    return;
  }
  explainSmartReading();
  q('[data-reading-choice]').hidden=false;
  status.textContent=t('اضغط استخراج الأسماء لبدء تحليل الصورة.','Appuyez sur Extraire pour analyser l’image.');
  q('[data-read-smart]').focus();
 }
 q('[data-read-smart]').onclick=()=>{
  // Informed affirmative click: selecting a file alone never uploads it.
  if(!pendingFile||busy||!cloud)return;
  processFile(pendingFile);
 };
 q('[data-file]').onchange=read;q('[data-camera]').onchange=read;
 function normalizeLatin(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
 function frenchDifference(a,b){
  const x=normalizeLatin(a),y=normalizeLatin(b);if(!x||!y)return 0;if(x===y)return 0;
  let prev=Array.from({length:y.length+1},(_,i)=>i);for(let i=1;i<=x.length;i++){let row=[i];for(let j=1;j<=y.length;j++)row[j]=Math.min(prev[j]+1,row[j-1]+1,prev[j-1]+(x[i-1]===y[j-1]?0:1));prev=row}
  return prev[y.length]/Math.max(1,x.length,y.length)
 }
 const rowsContainer=q('[data-rows]');
 function inspectRow(row){
  const ar=row.querySelector('[data-ar]'),french=row.querySelector('[data-fr]'),hint=row.querySelector('[data-hint]'),regenerate=row.querySelector('[data-regenerate]');
  const proposal=ar.value.trim()?toFr(ar.value.trim()):'',current=french.value.trim(),manual=row.dataset.frManual==='true';
  const distinct=!!(proposal&&current&&frenchDifference(proposal,current)>0.48);
  hint.textContent=distinct?t('اختلاف بين الفرنسية والاقتراح؛ راجع الاسمين قبل الحفظ.','Vérifiez la transcription française proposée.'):manual?t('الفرنسية المصححة محفوظة ولن تُستبدل تلقائيًا.','La version française corrigée est conservée.'):t('الفرنسية المقترحة قابلة للتعديل.','Transcription française modifiable.');
  hint.hidden=!(distinct||manual);regenerate.hidden=!manual&&!distinct;
 }
 function synchronizeRow(row,changed){
  const source=row.querySelector('[data-source]'),ar=row.querySelector('[data-ar]'),french=row.querySelector('[data-fr]');
  if(changed==='source'){const raw=source.value.trim(),arabic=/[\u0600-\u06ff]/u.test(raw);if(row.dataset.arManual!=='true')ar.value=arabic?raw:toAr(raw);if(row.dataset.frManual!=='true')french.value=arabic?toFr(raw):raw}
  if(changed==='ar'){row.dataset.arManual='true';if(row.dataset.frManual!=='true')french.value=toFr(ar.value.trim())}
  if(changed==='fr')row.dataset.frManual=!!french.value.trim()?'true':'false';
  inspectRow(row)
 }
 review.onclick=()=>{
  const names=parse(q('[data-text]').value);if(names.length>800){status.textContent='الحد الأقصى 800 تلميذ / Maximum 800 élèves';return}
  const extracted=recognizedStudents.slice();
  rowsContainer.innerHTML=names.map(raw=>{const found=extracted.findIndex(x=>String(x.text||'').trim()===raw),info=found>=0?extracted.splice(found,1)[0]:{};const arabic=/[\u0600-\u06ff]/u.test(raw),nameAr=arabic?raw:toAr(raw),nameFr=arabic?toFr(raw):raw;return `<div data-row data-ar-manual="${arabic}" data-fr-manual="${!arabic}" style="padding:10px;border-bottom:1px solid #ddd"><label><input type="checkbox" data-selected ${confidence>=65?'checked':''}> ${t('إضافة','Ajouter')}</label><label>${t('الاسم كما في الملف','Nom original')}<input data-source maxlength="160" dir="auto" value="${esc(raw)}"></label><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px"><label>${t('الاسم بالعربية','Nom en arabe')}<input data-ar maxlength="160" dir="rtl" value="${esc(nameAr)}"></label><label>${t('الاسم بالفرنسية','Nom en français')}<input data-fr maxlength="160" dir="ltr" value="${esc(nameFr)}"></label></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">
<label>${t('الرقم المدرسي NNS (اختياري)','NNS (facultatif)')}<input data-nns maxlength="80" dir="ltr" value="${esc(info.nns||'')}"></label>
<label>${t('الجنس','Sexe')}<select data-sex><option value="">—</option><option value="male" ${/^(male|m|gar[cç]on|ذكر)$/i.test(info.sex||'')?'selected':''}>${t('ذكر','Garçon')}</option><option value="female" ${/^(female|f|fille|أنثى)$/i.test(info.sex||'')?'selected':''}>${t('أنثى','Fille')}</option></select></label>
<label>${t('تاريخ الميلاد','Date de naissance')}<input data-birth type="date" value="${esc(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(info.birthDate||'')?info.birthDate:'')}"></label>
<label>${t('واتساب ولي الأمر','WhatsApp du parent')}<input data-phone type="tel" inputmode="tel" maxlength="30" autocomplete="off" dir="ltr" placeholder="+222 34 12 34 56" value="${esc(info.phone||'')}"></label></div>
<label style="display:flex;align-items:center;gap:8px;margin:10px 0"><input type="checkbox" data-consent> ${t('أؤكد موافقة ولي الأمر على استقبال النتائج والتكريمات والمراسلات عبر واتساب.','Je confirme le consentement du parent pour les résultats, distinctions et messages WhatsApp.')}</label>
<small>${t('تأكد من أن الرقم يخص ولي أمر هذا التلميذ. لا إرسال تلقائي.','Vérifiez le numéro de ce parent. Aucun envoi automatique.')}</small><small data-hint role="status"></small><button type="button" data-regenerate>↻ ${t('تحديث الفرنسية من العربية','Actualiser depuis l’arabe')}</button></div>`}).join('');
  rowsContainer.querySelectorAll('[data-row]').forEach(inspectRow);setSaveVisible(!!names.length);
  setStep(names.length?2:1);
  status.textContent=`${confidence<65?t('قراءة ضعيفة: راجع كل اسم قبل اختياره. ','Lecture incertaine : vérifiez chaque nom. '):''}${names.length} — ${t('راجع الاسمين بالعربية والفرنسية قبل الحفظ','Vérifiez les noms en arabe et en français avant l’enregistrement')}`
 };
 rowsContainer.addEventListener('input',e=>{const row=e.target.closest('[data-row]');if(!row)return;const type=e.target.hasAttribute('data-source')?'source':e.target.hasAttribute('data-ar')?'ar':e.target.hasAttribute('data-fr')?'fr':null;if(type)synchronizeRow(row,type)});
 rowsContainer.addEventListener('click',e=>{const button=e.target.closest('[data-regenerate]');if(!button)return;const row=button.closest('[data-row]'),ar=row.querySelector('[data-ar]'),french=row.querySelector('[data-fr]');row.dataset.frManual='false';french.value=toFr(ar.value.trim());inspectRow(row)});
 q('[data-text]').oninput=()=>{
   ++choiceGeneration;pendingFile=null;q('[data-reading-choice]').hidden=true;
   confidence=100;recognizedStudents=[];setSaveVisible(false);setStep(1);q('[data-rows]').replaceChildren()
 };
 save.onclick=async()=>{
  const rows=[...rowsContainer.querySelectorAll('[data-row]')].filter(r=>r.querySelector('[data-selected]').checked).map(r=>({name:r.querySelector('[data-ar]').value.trim(),nameFr:r.querySelector('[data-fr]').value.trim(),nns:r.querySelector('[data-nns]').value.trim(),sex:r.querySelector('[data-sex]').value,birthDate:r.querySelector('[data-birth]').value,phone:r.querySelector('[data-phone]').value.trim(),guardianConsent:r.querySelector('[data-consent]').checked}));
  if(!rows.length||rows.some(r=>!r.name||!r.nameFr)){status.textContent=t('أكمل الأسماء المحددة قبل الحفظ','Complétez les noms sélectionnés avant l’enregistrement');return}
  const invalid=rows.find(r=>{const digits=r.phone.replace(/[^0-9]/g,'').replace(/^00/,'');return (r.phone&&(!r.guardianConsent||(!/^[0-9]{8}$/.test(digits)&&!/^222[0-9]{8}$/.test(digits))))||(!r.phone&&r.guardianConsent)});
  if(invalid){status.textContent=t('راجع رقم واتساب ولي الأمر وأكد موافقته، أو امسح الرقم لاستيراد التلميذ فقط.','Vérifiez le numéro WhatsApp et le consentement du parent, ou effacez le numéro pour importer seulement l’élève.');return}
  setStep(3);
  saving=true;save.disabled=true;review.disabled=true;for(const input of wrap.querySelectorAll('input'))input.disabled=true;
  try{await onSave(rows);close() }catch(err){setStep(2);status.textContent=err.message||'تعذر الحفظ / Enregistrement impossible'}
  finally{saving=false;save.disabled=false;review.disabled=false;for(const input of wrap.querySelectorAll('input'))input.disabled=false}
 };
}};
})();
