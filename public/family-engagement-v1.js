/* Family engagement: mobile-only manual relay + independent teacher/professor awards.
 * No sender impersonation: teachers never open a parent WhatsApp chat.
 * Only the signed-in platform owner can open prepared WhatsApp messages. */
(()=>{
 'use strict';
 if(window.NataijiFamily)return;
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
 const t=(ar,f)=>fr()?f:ar;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const AWARDS={
  excellence:['شهادة التفوق الدراسي','Certificat d’excellence'],
  effort:['شهادة الاجتهاد','Certificat d’effort'],
  behavior:['شهادة حسن السلوك','Certificat de bonne conduite'],
  attendance:['شهادة المواظبة','Certificat d’assiduité'],
  progress:['شهادة التحسن','Certificat de progrès'],
  subject:['شهادة التميز في مادة','Certificat de distinction']
 };
 const ATT={present:['حاضر','Présent'],late:['متأخر','En retard'],absent:['غائب','Absent'],excused:['غياب مبرر','Absence justifiée'],'not-recorded':['لم يسجل','Non renseigné']};
 const RATE={excellent:['ممتاز','Excellent'],'very-good':['جيد جدًا','Très bien'],good:['جيد','Bien'],'needs-support':['يحتاج دعمًا','À accompagner'],'not-recorded':['لم يسجل','Non renseigné']};
 const pair=(map,key)=>map[key]?.[fr()?1:0]||String(key||'');
 const today=()=>new Date().toISOString().slice(0,10);
 const uuid=()=>crypto.randomUUID();
 const phoneNum=v=>{const digits=String(v||'').replace(/[^0-9]/g,'').replace(/^00/,'');return digits.startsWith('222')&&digits.length===11?digits.slice(3):digits};
 async function request(url,method='GET',body){
   const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||'request_failed');
   return data;
 }
 function modal(title){
   const o=document.createElement('div');o.className='family-overlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
   o.innerHTML='<div class="family-dialog"><header><div><small>NATAIJI · '+t('التواصل الأسري','Communication familles')+'</small><h2>'+esc(title)+'</h2></div><button type="button" class="family-close" aria-label="'+t('إغلاق','Fermer')+'">×</button></header><div class="family-body"></div></div>';
   document.body.appendChild(o);
   $('.family-close',o).onclick=()=>o.remove();
   o.addEventListener('click',e=>{if(e.target===o)o.remove()});
   return {root:o,body:$('.family-body',o),close:()=>o.remove()};
 }
 function note(body,msg,ok=false){const e=$('.family-message',body);if(e){e.textContent=msg;e.className='family-message '+(ok?'good':'bad')}}
 function studentInfo(rows){return rows.filter(x=>x?.id&&x?.name)}
 async function openAuthor({user,classes}){
   if(!user?.id||!classes?.length){alert(t('أضف قسمًا وتلاميذ أولًا','Ajoutez une classe et des élèves'));return}
   const win=modal(t('التقييم والتكريم','Évaluation et récompenses'));
   const body=win.body;let contacts={},cachedClass='',history=[];
   body.innerHTML=`<p class="family-hint">${t('أنت تصدر التكريم بنفسك دون موافقة المدير. تُرسل الرسائل فقط من هاتف المسؤول المخصص لواتساب أعمال نتائجي.','Vous délivrez les certificats sans validation du directeur. Seul le responsable Nataiji envoie les messages depuis WhatsApp Business.')}</p>
    <label>${t('القسم','Classe')}<select id="familyClass"></select></label>
    <label>${t('التلميذ','Élève')}<select id="familyStudent"></select></label>
    <fieldset class="family-kind"><legend>${t('نوع العملية','Type')}</legend>
      <label><input type="radio" name="familyKind" value="daily" checked> ${t('تقييم يومي','Évaluation quotidienne')}</label>
      <label><input type="radio" name="familyKind" value="award"> ${t('شهادة تكريم','Certificat')}</label>
      <label><input type="radio" name="familyKind" value="results"> ${t('إشعار نتائج','Avis de résultats')}</label></fieldset>
    <div id="familyFields"></div>
    <section class="family-contact"><h3>${t('بيانات ولي الأمر','Contact du parent')}</h3>
      <label>${t('رقم واتساب ولي الأمر (موريتانيا)','WhatsApp du parent (Mauritanie)')}<input id="familyPhone" type="tel" inputmode="tel" autocomplete="off" placeholder="+222 34 00 00 00"></label>
      <label class="family-checkbox"><input id="familyConsent" type="checkbox"> ${t('أؤكد أن ولي الأمر وافق على استقبال الرسائل المدرسية من نتائجي على هذا الرقم.','Je confirme le consentement du parent à recevoir les messages scolaires de Nataiji.')}</label>
      <p class="family-tiny">${t('لا يظهر رقم المعلم لولي الأمر. ولا تُرسل رسالة بمجرد الحفظ.','Le numéro de l’enseignant n’est pas partagé. L’enregistrement ne déclenche aucun envoi.')}</p></section>
    <button type="button" id="familyQueue" class="family-primary">${t('حفظ وتجهيز رسالة لنتائجي','Enregistrer et préparer le message')}</button>
    <p class="family-message" aria-live="polite"></p>
    <section class="family-history"><h3>${t('أحدث العمليات','Dernières opérations')}</h3><div id="familyHistory">${t('جارٍ التحميل','Chargement…')}</div></section>`;
   const classEl=$('#familyClass',body),studentEl=$('#familyStudent',body),phone=$('#familyPhone',body),consent=$('#familyConsent',body);
   classEl.innerHTML=classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
   function fillStudents(){
     const cls=classes.find(c=>String(c.id)===classEl.value),students=studentInfo(cls?.students||[]);
     studentEl.innerHTML=students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
     syncContact();
   }
   function syncContact(){
     const x=contacts[studentEl.value];phone.value=x?'+ '+x.phone:'';consent.checked=!!x?.consent
   }
   async function changeClass(){
     cachedClass=classEl.value;contacts={};fillStudents();note(body,'');
     try{
       const r=await request('/api/family/contacts?classId='+encodeURIComponent(cachedClass));
       if(cachedClass!==classEl.value||!body.isConnected)return;
       contacts=Object.fromEntries((r.contacts||[]).map(x=>[String(x.student_key),x]));syncContact()
     }catch{note(body,t('تعذر تحميل أرقام أولياء الأمور. تحقق من الإنترنت.','Chargement des numéros impossible. Vérifiez votre connexion.'))}
   }
   const fields=$('#familyFields',body);
   function drawFields(){
     const kind=$('input[name=familyKind]:checked',body)?.value||'daily';
     if(kind==='daily')fields.innerHTML=`<label>${t('التاريخ','Date')}<input id="familyDate" type="date" value="${today()}"></label>
       <label>${t('الحضور','Présence')}<select id="familyAttendance">${Object.keys(ATT).map(k=>`<option value="${k}">${pair(ATT,k)}</option>`).join('')}</select></label>
       <label>${t('التقييم','Évaluation')}<select id="familyAssessment">${Object.keys(RATE).map(k=>`<option value="${k}">${pair(RATE,k)}</option>`).join('')}</select></label>
       <label>${t('ملاحظة المعلم أو الأستاذ','Observation')}<textarea id="familyNote" maxlength="600" rows="3" placeholder="${t('ملاحظة موجزة ومحترمة','Observation brève et respectueuse')}"></textarea></label>`;
     else if(kind==='award')fields.innerHTML=`<label>${t('نوع الشهادة','Type de certificat')}<select id="familyAwardType">${Object.keys(AWARDS).map(k=>`<option value="${k}">${pair(AWARDS,k)}</option>`).join('')}</select></label>
       <label>${t('سبب التكريم (اختياري)','Motif (facultatif)')}<textarea id="familyReason" maxlength="350" rows="2"></textarea></label>
       <button id="familyPreview" type="button" class="family-secondary">${t('معاينة شهادة التكريم على الهاتف','Aperçu du certificat')}</button>`;
     else fields.innerHTML=`<label>${t('الفصل الدراسي','Trimestre')}<input id="familyTerm" maxlength="100" placeholder="${t('الفصل الأول','Premier trimestre')}"></label>
       <label>${t('ملاحظة حول نشر النتائج','Note sur la publication')}<textarea id="familyNote" maxlength="300" rows="2"></textarea></label>
       <p class="family-tiny">${t('هذا إشعار بصدور النتائج؛ لا يرفق كشف درجات قبل التحقق من اعتماده.','Notification de disponibilité, sans bulletin avant validation.')}</p>`;
     $('#familyPreview',fields)?.addEventListener('click',()=>{const cls=classes.find(c=>String(c.id)===classEl.value),st=cls?.students.find(x=>String(x.id)===studentEl.value);if(!st)return;void showAward({student_name:st.name,class_name:cls.name,school_name:cls.schoolName||'',actor_name:user.name||'',data:{awardType:$('#familyAwardType',fields).value,reason:$('#familyReason',fields).value,date:today()}},true)});
   }
   function bodyData(kind){
     if(kind==='award')return{awardType:$('#familyAwardType',fields).value,reason:$('#familyReason',fields).value};
     if(kind==='daily')return{attendance:$('#familyAttendance',fields).value,assessment:$('#familyAssessment',fields).value,note:$('#familyNote',fields).value,date:$('#familyDate',fields).value};
     return{term:$('#familyTerm',fields).value,note:$('#familyNote',fields).value};
   }
   async function refreshHistory(){
     try{
       const r=await request('/api/family/records');history=r.records||[];
       const list=$('#familyHistory',body);if(!list)return;
       list.innerHTML=history.length?history.slice(0,12).map((x,i)=>`<article class="family-history-row"><span><b>${esc(x.student_name)}</b><small>${x.kind==='award'?t('شهادة تكريم','Certificat'):x.kind==='daily'?t('تقييم يومي','Évaluation'):t('إشعار نتائج','Résultats')} · ${esc(x.status)}</small></span>${x.kind==='award'?`<button type="button" data-award-history="${i}">${t('الشهادة','Certificat')}</button>`:''}</article>`).join(''):`<p class="family-tiny">${t('لا توجد عمليات بعد','Aucune opération pour le moment')}</p>`;
       $$('[data-award-history]',list).forEach(btn=>btn.onclick=()=>{const x=history[Number(btn.dataset.awardHistory)];void showAward({...x,actor_name:user.name})});
     }catch{const list=$('#familyHistory',body);if(list)list.textContent=t('تعذر جلب السجل الآن','Historique indisponible')}
   }
   $('button#familyQueue',body).onclick=async()=>{
     const btn=$('#familyQueue',body),kind=$('input[name=familyKind]:checked',body).value,id=uuid();
     const classId=classEl.value,studentKey=studentEl.value,ph=phoneNum(phone.value);
     if(!studentKey||!/^[0-9]{8}$/.test(ph)||!consent.checked){note(body,t('اختر التلميذ وأدخل رقمًا موريتانيًا صحيحًا مع تأكيد موافقة ولي الأمر.','Choisissez un élève, indiquez 8 chiffres et confirmez le consentement.'));return}
     if(navigator.onLine===false){note(body,t('يلزم الإنترنت لحفظ الرسالة لدى نتائجي. لم تُرسل أي رسالة.','Une connexion est nécessaire pour enregistrer le message. Aucun message envoyé.'));return}
     btn.disabled=true;
     try{
       await request('/api/family/contacts','PUT',{classId,studentKey,phone:ph,consent:true});
       contacts[studentKey]={phone:'222'+ph,consent:true};
       const saved=await request('/api/family/records','POST',{id,classId,studentKey,kind,data:bodyData(kind)});
       note(body,t('✓ حُفظت العملية في نتائجي، وأُضيف الإشعار إلى قائمة المسؤول. لم تُرسل رسالة واتساب بعد.','✓ Enregistré et placé dans la file du responsable. Aucun message WhatsApp envoyé.'),true);
       await refreshHistory();
       if(kind==='award'){const cls=classes.find(c=>String(c.id)===classId);void showAward({student_name:saved.studentName,class_name:saved.className,school_name:saved.schoolName,actor_name:user.name||'',data:saved.data})}
     }catch(error){
       const errors={parent_contact_and_consent_required:t('يجب تسجيل موافقة ولي الأمر أولًا','Consentement requis'),student_not_authorized:t('ليس لديك صلاحية على هذا التلميذ','Accès non autorisé'),durable_storage_required:t('قاعدة البيانات غير متاحة','Base de données indisponible')};
       note(body,errors[error.message]||t('تعذر حفظ العملية. حاول لاحقًا.','Enregistrement impossible. Réessayez.'))
     }finally{btn.disabled=false}
   };
   classEl.onchange=changeClass;studentEl.onchange=syncContact;
   phone.oninput=()=>{if(phoneNum(phone.value)!==phoneNum(contacts[studentEl.value]?.phone))consent.checked=false};
   $$('input[name=familyKind]',body).forEach(x=>x.onchange=drawFields);
   drawFields();fillStudents();void changeClass();void refreshHistory();
 }
 function svgSafe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]))}
 function awardSVG(record){
   const d=record.data||{},name=String(record.student_name||'').slice(0,75),school=String(record.school_name||'نتائجي').slice(0,75),cls=String(record.class_name||'').slice(0,70),issuer=String(record.actor_name||'').slice(0,70),reason=String(d.reason||'تقديرًا لجهوده وتميزه').slice(0,95),date=String(d.date||today()),title=AWARDS[d.awardType]?.[0]||AWARDS.effort[0];
   const txt=(y,val,size=28,color='#0e4d63')=>`<text x="800" y="${y}" text-anchor="middle" direction="rtl" unicode-bidi="plaintext" fill="${color}" font-family="Arial, sans-serif" font-weight="700" font-size="${size}">${svgSafe(val)}</text>`;
   return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1131" viewBox="0 0 1600 1131">
   <rect width="1600" height="1131" fill="#fffdf8"/><rect x="40" y="40" width="1520" height="1051" rx="24" fill="none" stroke="#b49350" stroke-width="11"/>
   <rect x="61" y="61" width="1478" height="1009" rx="16" fill="none" stroke="#0b6d6c" stroke-width="3"/>
   <path d="M0 0H480L0 340ZM1600 1131H1100L1600 780Z" fill="#e8f4ee"/>
   <circle cx="800" cy="156" r="69" fill="#e9c678" stroke="#b78a35" stroke-width="7"/><path d="M765 163l25 25 46-55" fill="none" stroke="#0b625d" stroke-width="13" stroke-linecap="round"/>
   ${txt(270,'نتائجي | Nataiji',39,'#0b6d6c')}${txt(337,school,28)}
   ${txt(458,title,58,'#b08132')}${txt(542,'تُمنح هذه الشهادة للتلميذ / للتلميذة',27)}
   ${txt(632,name,55,'#0e3d59')}<path d="M420 663H1180" stroke="#c6a453" stroke-width="3"/>
   ${txt(734,reason,25)}${txt(812,'القسم: '+cls,26)}
   ${txt(903,'المعلم / الأستاذ: '+issuer,23)}${txt(975,'التاريخ: '+date,23)}
   <text x="800" y="1040" text-anchor="middle" fill="#69817d" font-family="Arial,sans-serif" font-size="21">NATAIJI · CERTIFICAT DE RECONNAISSANCE</text></svg>`;
 }
 async function imageBlob(svg){
   const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
   try{
     const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
     const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1131;
     canvas.getContext('2d').drawImage(img,0,0);
     return new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('png_failed')),'image/png'))
   }finally{URL.revokeObjectURL(url)}
 }
 async function showAward(record,preview=false){
   const w=modal(t('شهادة تكريم','Certificat de distinction'));
   w.body.innerHTML=`<p class="family-hint">${preview?t('معاينة فقط: لم تُحفظ الشهادة بعد.','Aperçu uniquement, non enregistré.'):t('تم إنشاء الشهادة من طرف المعلم أو الأستاذ دون اعتماد المدير.','Certificat créé par l’enseignant sans validation du directeur.')}</p>
   <div class="family-award-preview"></div><button type="button" id="familyAwardDownload" class="family-primary">${t('حفظ شهادة PNG على الهاتف','Enregistrer le certificat PNG')}</button>
   <p class="family-message" aria-live="polite"></p>`;
   const raw=awardSVG(record),previewHost=$('.family-award-preview',w.body);
   previewHost.innerHTML=raw.replace('<svg ','<svg role="img" aria-label="'+t('شهادة تكريم','Certificat')+'" ');
   $('#familyAwardDownload',w.body).onclick=async()=>{
     const button=$('#familyAwardDownload',w.body);button.disabled=true;
     try{
       const blob=await imageBlob(raw),fileName='nataiji-award-'+today()+'.png',file=new File([blob],fileName,{type:'image/png'});
       const a=document.createElement('a'),url=URL.createObjectURL(file);a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
       note(w.body,t('تم طلب حفظ صورة الشهادة على الهاتف.','Enregistrement du certificat demandé.'),true);
     }catch{note(w.body,t('تعذر حفظ الصورة على هذا الجهاز.','Enregistrement impossible sur cet appareil.'))}
     finally{button.disabled=false}
   }
 }
 function formatMessage(rec){
   const d=rec.data||{},name=rec.student_name,school=rec.school_name||'نتائجي';
   if(rec.kind==='award')return '🏅 نتائجي | Nataiji\n'+school+'\nيسعدنا تكريم التلميذ/ة '+name+'\n'+(AWARDS[d.awardType]?.[0]||'شهادة تكريم')+(d.reason?'\nالسبب: '+d.reason:'')+'\nمع تحيات فريق نتائجي.';
   if(rec.kind==='daily')return '📚 نتائجي | Nataiji\n'+school+'\nالتقرير اليومي للتلميذ/ة: '+name+'\nالتاريخ: '+(d.date||'')+'\nالحضور: '+pair(ATT,d.attendance)+'\nالتقييم: '+pair(RATE,d.assessment)+(d.note?'\nالملاحظة: '+d.note:'')+'\nمع تحيات نتائجي.';
   return '📄 نتائجي | Nataiji\n'+school+'\nإشعار بنتائج التلميذ/ة: '+name+(d.term?'\nالفصل: '+d.term:'')+(d.note?'\n'+d.note:'')+'\nيمكنكم التواصل مع المؤسسة للاطلاع على الكشف المعتمد.';
 }
 async function openOutbox(){
   const w=modal(t('صندوق رسائل نتائجي الرسمي','Boîte d’envoi Nataiji'));
   const body=w.body;let rows=[],selected='pending';
   body.innerHTML=`<p class="family-hint">${t('لا ترسل إلا من هاتف مرتبط بحساب WhatsApp Business الرسمي لنتائجي. فتح رابط واتساب وحده لا يضمن اختيار حساب الأعمال إذا كان لديك أكثر من حساب. تحقق من الحساب قبل الإرسال.','Envoyez uniquement depuis le téléphone connecté au WhatsApp Business officiel. Vérifiez le compte actif avant l’envoi.')}</p>
     <label class="family-checkbox"><input type="checkbox" id="familyOfficial"> ${t('أؤكد أن هذا الهاتف سيستخدم حساب واتساب أعمال نتائجي الرسمي فقط','Je confirme utiliser exclusivement WhatsApp Business Nataiji sur ce téléphone')}</label>
     <div class="family-tabs"><button data-status="pending" class="on">${t('جاهزة','En attente')}</button><button data-status="opened">${t('فُتحت','Ouvertes')}</button><button data-status="sent">${t('أرسلت يدويًا','Marquées envoyées')}</button></div>
     <p class="family-message" aria-live="polite"></p><div id="familyQueueList"></div>`;
   async function refresh(){
     const list=$('#familyQueueList',body);list.textContent=t('جارٍ التحميل…','Chargement…');
     try{
       const data=await request('/api/family/owner/queue?status='+selected);rows=data.records||[];
       list.innerHTML=rows.length?rows.map((rec,i)=>`<article class="family-queue-card" data-i="${i}">
          <b>${esc(rec.student_name)}</b><small>${esc(rec.school_name)} · ${esc(rec.class_name)} · ${esc(rec.actor_name)} · ${esc(rec.created_at?.slice(0,16)||'')}</small>
          <div class="family-message-preview">${esc(formatMessage(rec))}</div>
          <div class="family-actions"><button data-open="${i}" class="family-primary">${t('فتح في واتساب','Ouvrir WhatsApp')}</button>
          <button data-sent="${i}" class="family-secondary">${t('تأكيد الإرسال','Confirmer l’envoi')}</button>
          <button data-copy="${i}" class="family-secondary">${t('نسخ الرسالة','Copier le message')}</button>
          ${rec.kind==='award'?`<button data-certificate="${i}" class="family-secondary">${t('الشهادة','Certificat')}</button>`:''}</div>
          </article>`).join(''):`<p class="family-tiny">${t('لا توجد رسائل في هذه القائمة','Aucun message dans cette liste')}</p>`;
       $$('[data-open]',list).forEach(button=>button.onclick=async()=>{
         const rec=rows[Number(button.dataset.open)];
         if(!$('#familyOfficial',body).checked){note(body,t('أكد استخدام حساب واتساب أعمال نتائجي أولًا.','Confirmez le compte WhatsApp Business officiel.'));return}
         const url='https://wa.me/'+rec.guardian_phone+'?text='+encodeURIComponent(formatMessage(rec));
         // No automated sending, and we NEVER claim WhatsApp successfully sent.
         const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();
         try{await request('/api/family/owner/records/'+encodeURIComponent(rec.id)+'/status','POST',{status:'opened'});await refresh()}catch{note(body,t('فتحت واتساب، لكن تعذر تحديث حالة الرسالة.','WhatsApp ouvert, mais mise à jour impossible.'))}
       });
       $('[data-copy]',list).forEach(button=>button.onclick=async()=>{const rec=rows[Number(button.dataset.copy)],value=formatMessage(rec);try{await navigator.clipboard.writeText(value);note(body,t('تم نسخ الرسالة. الصقها داخل واتساب أعمال نتائجي.','Message copié. Collez-le dans WhatsApp Business Nataiji.'),true)}catch{window.prompt(t('انسخ الرسالة من هنا','Copiez le message'),value)}});
       $('[data-sent]',list).forEach(button=>button.onclick=async()=>{
         const rec=rows[Number(button.dataset.sent)];
         if(!confirm(t('هل تحققت بنفسك من إرسال هذه الرسالة من واتساب أعمال نتائجي الرسمي؟','Avez-vous réellement envoyé ce message depuis WhatsApp Business Nataiji ?')))return;
         try{await request('/api/family/owner/records/'+encodeURIComponent(rec.id)+'/status','POST',{status:'sent'});await refresh()}catch{note(body,t('تعذر تأكيد الحالة.','Mise à jour impossible.'))}
       });
       $$('[data-certificate]',list).forEach(button=>button.onclick=()=>void showAward(rows[Number(button.dataset.certificate)]));
     }catch{list.textContent=t('تعذر تحميل الرسائل. تحقق من الاتصال والحساب.','Impossible de charger la file.')}
   }
   $$('[data-status]',body).forEach(btn=>btn.onclick=()=>{selected=btn.dataset.status;$$('[data-status]',body).forEach(x=>x.classList.toggle('on',x===btn));void refresh()});
   await refresh()
 }
 function openTeacher(user,state){
   if(!state)return;
   const cid=String(state.activeClassId||'');
   const cls=(state.classes||[]).find(c=>String(c.id)===cid);
   const students=(state.pupils||[]).map(p=>({id:String(p?.[7]||p?.[0]||''),name:String(p?.[1]||'')}));
   return openAuthor({user,classes:[{id:cid,name:String(cls?.name||state.className||''),schoolName:String(state.school||''),students}]});
 }
 function openProfessor(user,profile){
   const classes=(profile?.classes||[]).map(c=>({id:String(c.id),name:String(c.name),schoolName:String(profile.schoolName||''),students:(c.students||[]).map(s=>({id:String(s.id),name:String(s.name||s.nameFr||'')}))}));
   return openAuthor({user,classes});
 }
 window.NataijiFamily={openTeacher,openProfessor,openOutbox,_message:formatMessage,_awardSVG:awardSVG};
})();
