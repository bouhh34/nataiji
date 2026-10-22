/* Manual mobile WhatsApp from the teacher, professor or director's own account. */
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
   if(!r.ok)throw Object.assign(Error(data.error||'request_failed'),{status:r.status});
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
   const body=win.body;let contacts={},cachedClass='',history=[],outbox=[],contactsLoaded=false;
   body.innerHTML=`<p class="family-hint">${t('أنشئ الشهادة وإعلان التميز معًا. يمكنك حفظ الشهادة دون رقم ولي الأمر، ثم إرسال الإعلان وملف الشهادة من شاشة واحدة عبر واتساب هاتفك.','Créez le certificat et son annonce ensemble, puis partagez-les depuis le même écran.')}</p>
    <label>${t('القسم','Classe')}<select id="familyClass"></select></label>
    <label>${t('التلميذ','Élève')}<select id="familyStudent"></select></label>
    <fieldset class="family-kind"><legend>${t('نوع العملية','Type')}</legend>
      <label><input type="radio" name="familyKind" value="daily" checked> ${t('تقييم يومي','Évaluation quotidienne')}</label>
      <label><input type="radio" name="familyKind" value="award"> ${t('شهادة التميز وإعلان التكريم','Certificat et annonce de distinction')}</label>
      <label><input type="radio" name="familyKind" value="results"> ${t('إشعار نتائج','Avis de résultats')}</label></fieldset>
    <div id="familyFields"></div>
    <section class="family-contact"><h3>${t('بيانات ولي الأمر','Contact du parent')}</h3>
      <label>${t('رقم واتساب ولي الأمر (موريتانيا)','WhatsApp du parent (Mauritanie)')}<input id="familyPhone" type="tel" inputmode="tel" autocomplete="off" placeholder="+222 34 00 00 00"></label>
      <label class="family-checkbox"><input id="familyConsent" type="checkbox"> ${t('أؤكد موافقة ولي الأمر على استقبال الرسائل المدرسية من المعلم أو الإدارة عبر نتائجي.','Le parent accepte les messages scolaires de son enseignant ou de la direction via Nataiji.')}</label>
      <button type="button" id="familySavePhone" class="family-primary">${t('حفظ رقم ولي الأمر','Enregistrer le numéro du parent')}</button>
      <button type="button" id="familyRevoke" class="family-secondary">${t('إلغاء موافقة ولي الأمر وإيقاف الرسائل','Révoquer le consentement et bloquer les messages')}</button>
      <p class="family-tiny">${t('يظهر رقم واتساب المُرسل للولي. حفظ التقييم لا يرسل شيئًا تلقائيًا.','Le parent voit le numéro WhatsApp de l’expéditeur. Pas d’envoi automatique.')}</p></section>
    <div id="familySync" class="family-sync-status" role="status" aria-live="polite"><span id="familySyncText"></span><button id="familyRetry" type="button" class="family-retry-button">${t('إعادة المحاولة','Réessayer')}</button></div>
    <section class="family-roster"><div class="family-roster-title"><h3>قائمة أولياء التلاميذ · Liste des parents</h3><button type="button" id="familyOpenOutbox" class="family-secondary">الرسائل الجاهزة · Messages prêts</button></div><p class="family-tiny">اضغط إرسال بجانب كل تلميذ دون حفظ الأرقام في الهاتف. حضّر تقييمه أو شهادته أولًا.</p><div id="familyRosterList"></div></section>
    <button type="button" id="familyQueue" class="family-primary">${t('حفظ وتجهيز الرسالة لإرسالها من هاتفي','Enregistrer et préparer le message')}</button>
    <p class="family-message" aria-live="polite"></p>
    <section class="family-history"><h3>${t('أحدث العمليات','Dernières opérations')}</h3><div id="familyHistory">${t('جارٍ التحميل','Chargement…')}</div></section>`;
   const classEl=$('#familyClass',body),studentEl=$('#familyStudent',body),phone=$('#familyPhone',body),consent=$('#familyConsent',body),syncEl=$('#familySync',body);
   const errorMessage=e=>{
     if(e?.status===401)return t('انتهت جلسة تسجيل الدخول. سجّل الدخول مجددًا.','Votre session a expiré. Reconnectez-vous.');
     if(e?.status===403)return t('لا يتيح الخادم الوصول إلى بيانات هذا القسم. تحقق من ربط القسم بالحساب وأعد المزامنة.','Accès refusé aux données de cette classe. Vérifiez les droits et synchronisez.');
     if(e?.status===404||e?.message==='not_found')return t('واجهة المراسلات غير متاحة على الخادم حاليًا. يلزم نشر نسخة الخادم المحدّثة.','Le serveur ne dispose pas encore de cette fonction. Déployez la mise à jour.');
     if(e?.status===503)return t('قاعدة البيانات غير متاحة حاليًا. لم تُحفظ أي أرقام جديدة.','La base de données est indisponible. Aucun nouveau numéro enregistré.');
     if(navigator.onLine===false)return t('الهاتف غير متصل بالإنترنت. أعد المحاولة بعد الاتصال.','Vous êtes hors ligne. Réessayez après connexion.');
     return t('تعذر الاتصال بخدمة أرقام أولياء الأمور.','Impossible de joindre le service des contacts.')+(e?.status?' (HTTP '+e.status+')':'');
   };
   const syncMessage=message=>{syncEl.classList.toggle('is-visible',!!message);$('#familySyncText',body).textContent=message||''};
   classEl.innerHTML=classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
   function fillStudents(){
     const cls=classes.find(c=>String(c.id)===classEl.value),students=studentInfo(cls?.students||[]),previous=studentEl.value;
     studentEl.innerHTML=students.map(st=>'<option value="'+esc(st.id)+'">'+esc(st.name)+'</option>').join('');
     if(students.some(st=>String(st.id)===previous))studentEl.value=previous;
     syncContact();renderRoster();
   }
   function syncContact(){
     const x=contacts[studentEl.value];phone.value=x?'+ '+x.phone:'';consent.checked=!!x?.consent
   }
   function findSendable(id){return outbox.find(rec=>rec.class_id===classEl.value&&String(rec.student_key)===String(id))}
   function renderRoster(){
     const host=$('#familyRosterList',body);if(!host)return;
     const cls=classes.find(c=>String(c.id)===classEl.value),students=studentInfo(cls?.students||[]);
     host.innerHTML=students.length?students.map((st,i)=>{
       const c=contacts[st.id],rec=findSendable(st.id),label=rec?t('إرسال','Envoyer'):c?.consent?t('إعداد','Préparer'):t('إضافة رقم','Ajouter');
       return '<article class="family-roster-row"><span><b>'+esc(st.name)+'</b><small>'+(c?.consent?t('رقم ولي الأمر مسجل','Numéro enregistré'):contactsLoaded?t('الرقم غير مسجل','Numéro manquant'):t('لم يُتحقق من الرقم بعد','Numéro non vérifié'))+'</small></span><button type="button" class="family-secondary" data-family-edit="'+i+'">'+t('تعديل','Modifier')+'</button><button type="button" class="family-primary" data-family-send="'+i+'">'+label+'</button></article>';
     }).join(''):'<p class="family-tiny">'+t('لا يوجد تلاميذ','Aucun élève')+'</p>';
     const focus=i=>{studentEl.value=students[i].id;syncContact();phone.scrollIntoView({behavior:'smooth',block:'center'});phone.focus({preventScroll:true})};
     $$('[data-family-edit]',host).forEach(b=>b.onclick=()=>focus(Number(b.dataset.familyEdit)));
     $$('[data-family-send]',host).forEach(b=>b.onclick=()=>{const i=Number(b.dataset.familySend),st=students[i],rec=findSendable(st.id),c=contacts[st.id];
       if(rec&&c?.consent){if(rec.kind==='award')void showAward({...rec,guardian_phone:c.phone});else openWhatsApp(rec,c.phone);return}
       focus(i);note(body,c?.consent?t('أنشئ تقييمًا أو شهادة لهذا التلميذ أولًا.','Préparez un rapport ou certificat pour cet élève.'):t('أضف رقم الولي وموافقته أولًا.','Ajoutez le numéro et le consentement du parent.'));
     });
   }
   async function refreshOutbox(){
     try{const a=await Promise.all(['pending','opened'].map(status=>request('/api/family/outbox?status='+status)));outbox=a.flatMap(v=>v.records||[])}catch{outbox=[]}
     renderRoster();
   }
   $('#familyOpenOutbox',body).onclick=()=>openOutbox();
   async function changeClass(){
     cachedClass=classEl.value;const targetClass=cachedClass;
     contactsLoaded=false;contacts={};outbox=[];fillStudents();note(body,'');syncMessage('');
     try{
       if(!targetClass)throw Object.assign(Error('missing_class'),{status:400});
       const r=await request('/api/family/contacts?classId='+encodeURIComponent(targetClass));
       if(targetClass!==classEl.value||!body.isConnected)return;
       contacts=Object.fromEntries((r.contacts||[]).map(x=>[String(x.student_key),x]));
       contactsLoaded=true;syncContact();renderRoster();await refreshOutbox();
     }catch(e){
       if(targetClass!==classEl.value||!body.isConnected)return;
       contactsLoaded=false;renderRoster();syncMessage(errorMessage(e));
     }
   }
   $('#familyRetry',body).onclick=()=>void changeClass();
   $('#familySavePhone',body).onclick=async()=>{
     const button=$('#familySavePhone',body),classId=classEl.value,studentKey=studentEl.value;
     const digits=phoneNum(phone.value);
     if(!classId||!studentKey){note(body,t('اختر القسم والتلميذ أولًا.','Choisissez d’abord une classe et un élève.'));return}
     if(!/^[0-9]{8}$/.test(digits)){note(body,t('أدخل رقم واتساب موريتانيًا صحيحًا من 8 أرقام.','Saisissez un numéro mauritanien de 8 chiffres.'));return}
     if(!consent.checked){note(body,t('أكد موافقة ولي الأمر قبل الحفظ.','Confirmez le consentement du parent.'));return}
     button.disabled=true;
     try{
       await request('/api/family/contacts','PUT',{classId,studentKey,phone:digits,consent:true});
       contacts[studentKey]={phone:'222'+digits,consent:true};contactsLoaded=true;
       if(studentEl.value===studentKey)syncContact();
       renderRoster();await refreshOutbox();syncMessage('');
       note(body,t('✓ حُفظ رقم ولي الأمر في الخادم ويمكن استخدامه للإرسال دون إضافته لجهات الاتصال.','✓ Numéro enregistré sur le serveur, sans ajout aux contacts du téléphone.'),true);
     }catch(e){note(body,errorMessage(e))}
     finally{button.disabled=false}
   };
   const fields=$('#familyFields',body);
   function drawFields(){
     const kind=$('input[name=familyKind]:checked',body)?.value||'daily';
     if(kind==='daily')fields.innerHTML=`<label>${t('التاريخ','Date')}<input id="familyDate" type="date" value="${today()}"></label>
       <label>${t('الحضور','Présence')}<select id="familyAttendance">${Object.keys(ATT).map(k=>`<option value="${k}">${pair(ATT,k)}</option>`).join('')}</select></label>
       <label>${t('التقييم','Évaluation')}<select id="familyAssessment">${Object.keys(RATE).map(k=>`<option value="${k}">${pair(RATE,k)}</option>`).join('')}</select></label>
       <label>${t('ملاحظة المعلم أو الأستاذ','Observation')}<textarea id="familyNote" maxlength="600" rows="3" placeholder="${t('ملاحظة موجزة ومحترمة','Observation brève et respectueuse')}"></textarea></label>`;
     else if(kind==='award')fields.innerHTML=`<label>${t('نوع الشهادة','Type de certificat')}<select id="familyAwardType">${Object.keys(AWARDS).map(k=>`<option value="${k}">${pair(AWARDS,k)}</option>`).join('')}</select></label>
       <label>${t('سبب التكريم (اختياري)','Motif (facultatif)')}<textarea id="familyReason" maxlength="350" rows="2"></textarea></label>
       <button id="familyAwardCreate" type="button" class="family-primary">${t('إنشاء الشهادة وإعلان التميز','Créer le certificat et son annonce')}</button>
       <button id="familyPreview" type="button" class="family-secondary">${t('معاينة شهادة التكريم على الهاتف','Aperçu du certificat')}</button>`;
     else fields.innerHTML=`<label>${t('الفصل الدراسي','Trimestre')}<input id="familyTerm" maxlength="100" placeholder="${t('الفصل الأول','Premier trimestre')}"></label>
       <label>${t('ملاحظة حول نشر النتائج','Note sur la publication')}<textarea id="familyNote" maxlength="300" rows="2"></textarea></label>
       <p class="family-tiny">${t('هذا إشعار بصدور النتائج؛ لا يرفق كشف درجات قبل التحقق من اعتماده.','Notification de disponibilité, sans bulletin avant validation.')}</p>`;
     body.classList.toggle('family-award-mode',kind==='award');
     $('#familyQueue',body).hidden=kind==='award';
     $('#familyAwardCreate',fields)?.addEventListener('click',()=>$('#familyQueue',body).click());
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
       list.innerHTML=history.length?history.slice(0,12).map((x,i)=>`<article class="family-history-row"><span><b>${esc(x.student_name)}</b><small>${x.kind==='award'?t('شهادة تكريم','Certificat'):x.kind==='daily'?t('تقييم يومي','Évaluation'):t('إشعار نتائج','Résultats')} · ${esc(x.status)}</small></span>${(x.kind==='award'?`<button type="button" data-award-history="${i}">${t('الشهادة','Certificat')}</button>`:'')+(x.status==='private'?`<button type="button" data-ready-history="${i}">${t('إعداد الإرسال','Préparer l’envoi')}</button>`:'')}</article>`).join(''):`<p class="family-tiny">${t('لا توجد عمليات بعد','Aucune opération pour le moment')}</p>`;
       $$('[data-award-history]',list).forEach(btn=>btn.onclick=()=>{const x=history[Number(btn.dataset.awardHistory)];void showAward({...x,actor_name:user.name})});
       $$('[data-ready-history]',list).forEach(btn=>btn.onclick=async()=>{
         const x=history[Number(btn.dataset.readyHistory)],ph=phoneNum(phone.value);
         if(x.class_id!==classEl.value||x.student_key!==studentEl.value){note(body,t('اختر التلميذ صاحب الشهادة أو التقييم أولًا.','Sélectionnez d’abord l’élève concerné.'));return}
         if(!/^[0-9]{8}$/.test(ph)||!consent.checked){note(body,t('أدخل رقم ولي الأمر ووافق على التواصل قبل إعداد الرسالة.','Numéro et consentement requis.'));return}
         btn.disabled=true;
         try{
           await request('/api/family/contacts','PUT',{classId:classEl.value,studentKey:studentEl.value,phone:ph,consent:true});
           contacts[studentEl.value]={phone:'222'+ph,consent:true};
           await request('/api/family/records/'+encodeURIComponent(x.id)+'/queue','POST');
           note(body,t('تمت إضافة الرسالة إلى رسائلك الجاهزة؛ لم تُرسل بعد.','Message ajouté à votre boîte d’envoi, non envoyé.'),true);
           await refreshHistory();await refreshOutbox()
         }catch{note(body,t('تعذر تجهيز الرسالة. تحقق من الرقم والموافقة.','Impossible de préparer le message.'))}
         finally{btn.disabled=false}
       });
     }catch{const list=$('#familyHistory',body);if(list)list.textContent=t('تعذر جلب السجل الآن','Historique indisponible')}
   }
   $('button#familyQueue',body).onclick=async()=>{
     const btn=$('#familyQueue',body),kind=$('input[name=familyKind]:checked',body).value,id=uuid();
     const classId=classEl.value,studentKey=studentEl.value,ph=phoneNum(phone.value);
     if(!studentKey){note(body,t('اختر التلميذ أولًا.','Sélectionnez un élève.'));return}
     const withConsent=/^[0-9]{8}$/.test(ph)&&consent.checked;
     if(kind==='results'&&!withConsent){note(body,t('يجب إدخال رقم ولي الأمر وموافقته لإشعار النتائج.','Numéro et consentement requis pour les résultats.'));return}
     if(navigator.onLine===false){note(body,t('يلزم الإنترنت لحفظ الرسالة لدى نتائجي. لم تُرسل أي رسالة.','Une connexion est nécessaire pour enregistrer le message. Aucun message envoyé.'));return}
     btn.disabled=true;
     try{
       if(withConsent){
         await request('/api/family/contacts','PUT',{classId,studentKey,phone:ph,consent:true});
         contacts[studentKey]={phone:'222'+ph,consent:true};
       }
       const saved=await request('/api/family/records','POST',{id,classId,studentKey,kind,data:bodyData(kind)});
       note(body,saved.queued?t('✓ حُفظت العملية وأُضيفت إلى رسائلك الجاهزة، ولم تُرسل بعد.','✓ Enregistré dans votre boîte de messages, non envoyé.'):t('✓ حُفظت الشهادة أو التقييم باسمك دون الحاجة إلى موافقة المدير، ولم تُرسل إلى ولي الأمر.','✓ Certificat ou évaluation enregistré indépendamment, sans envoi WhatsApp.'),true);
       await refreshHistory();await refreshOutbox();
       if(kind==='award'){void showAward({id,kind:'award',class_id:classId,student_key:studentKey,guardian_phone:contacts[studentKey]?.phone||'',status:saved.status,student_name:saved.studentName,class_name:saved.className,school_name:saved.schoolName,actor_name:user.name||'',data:saved.data})}
     }catch(error){
       const errors={parent_contact_and_consent_required:t('يجب تسجيل موافقة ولي الأمر أولًا','Consentement requis'),student_not_authorized:t('ليس لديك صلاحية على هذا التلميذ','Accès non autorisé'),durable_storage_required:t('قاعدة البيانات غير متاحة','Base de données indisponible')};
       note(body,errors[error.message]||t('تعذر حفظ العملية. حاول لاحقًا.','Enregistrement impossible. Réessayez.'))
     }finally{btn.disabled=false}
   };
   $('#familyRevoke',body).onclick=async()=>{
     const classId=classEl.value,studentKey=studentEl.value;
     if(!contacts[studentKey]){note(body,t('لا توجد موافقة محفوظة لهذا التلميذ.','Aucun consentement enregistré pour cet élève.'));return}
     if(!confirm(t('ستُلغى الموافقة وتُوقف الرسائل المعلقة على هذا الرقم. تأكيد؟','Le consentement et les messages en attente seront annulés. Confirmer ?')))return;
     try{
       await request('/api/family/contacts','DELETE',{classId,studentKey});
       delete contacts[studentKey];syncContact();await refreshOutbox();
       note(body,t('أُلغي الإذن وأُوقفت الرسائل التي لم تُرسل.','Consentement révoqué et messages non envoyés bloqués.'),true)
     }catch{note(body,t('تعذر إلغاء الموافقة. تحقق من الاتصال.','Révocation impossible. Vérifiez la connexion.'))}
   };
   classEl.onchange=changeClass;studentEl.onchange=syncContact;
   phone.oninput=()=>{if(phoneNum(phone.value)!==phoneNum(contacts[studentEl.value]?.phone))consent.checked=false};
   $$('input[name=familyKind]',body).forEach(x=>x.onchange=drawFields);
   drawFields();fillStudents();void changeClass();void refreshHistory();
 }
 function svgSafe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]))}
 function premiumAwardSVG(record){
 const d=record?.data||{},awards={
  excellence:['شهادة التفوق الدراسي',"Certificat d’excellence scolaire"],
  effort:['شهادة الاجتهاد',"Certificat d’effort"],
  behavior:['شهادة حسن السلوك',"Certificat de bonne conduite"],
  attendance:['شهادة المواظبة',"Certificat d’assiduité"],
  progress:['شهادة التحسن',"Certificat de progrès"],
  subject:['شهادة التميز في مادة',"Certificat de distinction"]};
 const title=awards[d.awardType]||awards.excellence;
 const school=String(record?.school_name||'').trim().slice(0,82)||'اسم المدرسة';
 const student=String(record?.student_name||'').trim().slice(0,82);
 const cls=String(record?.class_name||'').trim().slice(0,90);
 const teacher=String(record?.actor_name||'').trim().slice(0,70);
 const reason=String(d.reason||'تقديرًا لاجتهاده وتميّزه وإسهامه في الحياة المدرسية').trim().slice(0,105);
 const date=String(d.date||new Date().toISOString().slice(0,10)).slice(0,10);
 const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]));
 const ar=(y,s,size=27,fill='#0c403a')=>`<text x="800" y="${y}" text-anchor="middle" direction="rtl" unicode-bidi="plaintext" font-family="'Noto Naskh Arabic',Tahoma,Arial,sans-serif" font-size="${size}" font-weight="700" fill="${fill}">${clean(s)}</text>`;
 const fr=(y,s,size=20,fill='#335950')=>`<text x="800" y="${y}" text-anchor="middle" font-family="Georgia,serif" font-size="${size}" fill="${fill}">${clean(s)}</text>`;
 const schoolSize=school.length>48?29:school.length>28?38:47,studentSize=student.length>45?39:student.length>25?48:61;
 const leaves=Array.from({length:7},(_,i)=>{
  const y=94+i*19,x=675+i*3,a=-42+i*7,xr=1600-x;
  return `<ellipse cx="${x}" cy="${y}" rx="8" ry="18" fill="url(#gold)" transform="rotate(${a} ${x} ${y})"/><ellipse cx="${xr}" cy="${y}" rx="8" ry="18" fill="url(#gold)" transform="rotate(${-a} ${xr} ${y})"/>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1131" viewBox="0 0 1600 1131">
 <defs>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#96631b"/><stop offset=".24" stop-color="#e5c07b"/><stop offset=".52" stop-color="#fff0ba"/><stop offset=".75" stop-color="#c28a32"/><stop offset="1" stop-color="#8f581b"/></linearGradient>
 <linearGradient id="deep" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#0a4d43"/><stop offset="1" stop-color="#012b26"/></linearGradient>
 <radialGradient id="paper"><stop stop-color="#fff"/><stop offset="1" stop-color="#fcf8ec"/></radialGradient>
 <pattern id="filigree" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 14Q14 -1 28 14Q14 29 0 14Z" fill="none" stroke="#d0b97c" stroke-opacity=".13" stroke-width=".8"/></pattern>
 </defs>
 <rect width="1600" height="1131" fill="url(#paper)"/><rect width="1600" height="1131" fill="url(#filigree)"/>
 <path d="M0 0H520Q390 99 240 127L0 325Z" fill="url(#deep)"/><path d="M0 0H600Q408 107 241 141L0 362V337L231 126Q405 90 543 0Z" fill="url(#gold)"/>
 <path d="M1600 1131H1075Q1219 1024 1373 990L1600 785Z" fill="url(#deep)"/><path d="M1600 1131H1025Q1197 1008 1363 979L1600 756V785L1378 999Q1213 1035 1078 1131Z" fill="url(#gold)"/>
 <rect x="22" y="22" width="1556" height="1087" fill="none" stroke="url(#gold)" stroke-width="9"/>
 <rect x="43" y="43" width="1514" height="1045" fill="none" stroke="#0d5348" stroke-width="3"/>
 <rect x="58" y="58" width="1484" height="1015" fill="none" stroke="#d7b36b" stroke-width="1.8"/>
 <g fill="none" stroke="url(#gold)" stroke-width="3"><path d="M1479 85q-84 5-71 72q55-6 34-44q-30-28-57 18M1489 88q-17 43 33 55q14 52-24 68"/><path d="M121 1047q84-5 71-72q-55 6-34 44q30 28 57-18M111 1044q17-43-33-55q-14-52 24-68"/></g>
 <g opacity=".2" fill="none" stroke="#dbc692" stroke-width="3"><circle cx="165" cy="615" r="130"/><circle cx="165" cy="615" r="104"/><circle cx="1435" cy="615" r="130"/><circle cx="1435" cy="615" r="104"/><path d="M165 474Q220 610 165 756Q110 610 165 474ZM35 615Q165 553 295 615Q165 677 35 615Z"/><path d="M1435 474Q1490 610 1435 756Q1380 610 1435 474ZM1305 615Q1435 553 1565 615Q1435 677 1305 615Z"/></g>
 <circle cx="800" cy="167" r="108" fill="#fff5db" stroke="url(#gold)" stroke-width="10"/>
 <circle cx="800" cy="167" r="93" fill="#063e35" stroke="#bb8b37" stroke-width="3"/>
 <circle cx="800" cy="167" r="84" fill="none" stroke="#d3b06c" stroke-width="2" stroke-dasharray="3 8"/>
 <path d="M686 145L800 100L914 145L800 191Z" fill="url(#gold)" stroke="#ffefc8" stroke-width="3"/>
 <path d="M730 168V212Q800 249 870 212V168L800 194Z" fill="#f9d896" stroke="#a07327" stroke-width="3"/>
 <path d="M800 187L883 152V233" stroke="#fdf0c4" stroke-width="5" fill="none"/>
 <circle cx="883" cy="233" r="9" fill="url(#gold)"/>
 <path d="M883 240L873 265H893Z" fill="#f9d896"/>
 <path d="M667 155Q641 222 701 263M933 155Q959 222 899 263" stroke="url(#gold)" stroke-width="5" fill="none"/>
 <path d="M778 75L800 49L822 75L800 67Z" fill="url(#gold)"/>
 ${ar(309,school,schoolSize)}
 ${fr(342,'ÉTABLISSEMENT SCOLAIRE',17,'#7f6939')}
 <path d="M505 366H755M845 366H1095" stroke="url(#gold)" stroke-width="2.6"/><path d="M800 355l13 11-13 11-13-11Z" fill="url(#gold)"/>
 ${ar(448,title[0],title[0].length>26?58:65,'#a46c23')}
 ${fr(493,title[1],23,'#25534a')}
 <path d="M545 515H747M853 515H1055" stroke="#d4ab5e" stroke-width="2"/><path d="M800 504l11 11-11 11-11-11Z" fill="url(#gold)"/>
 ${ar(578,'تُقدَّم هذه الشهادة للتلميذ/ة',31)}
 <rect x="285" y="608" width="1030" height="116" rx="26" fill="#fffdf5" stroke="url(#gold)" stroke-width="5"/>
 <rect x="297" y="620" width="1006" height="92" rx="19" fill="none" stroke="#dab777" stroke-width="1.6"/>
 <path d="M326 664l16-16 16 16-16 16ZM1274 664l-16-16-16 16 16 16Z" fill="url(#gold)"/>
 ${ar(688,student,studentSize,'#06463c')}
 ${ar(786,reason,reason.length>70?21:26,'#23554b')}
 <path d="M530 815H755M845 815H1070" stroke="#d6b87c" stroke-width="2"/><path d="M800 807l9 9-9 9-9-9Z" fill="url(#gold)"/>
 ${ar(879,'القسم: '+cls,28)}
 ${ar(932,'المعلم / الأستاذ: '+teacher,25)}
 ${ar(985,'التاريخ: '+date,25)}
 ${ar(1036,'مع أطيب التهاني والتشجيع',23,'#926b33')}
 <path d="M498 1048H708M892 1048H1102" stroke="#c7a15a" stroke-width="2"/>
 </svg>`;
}
  function awardSVG(record){return premiumAwardSVG(record)}
  async function awardCanvas(svg){
   const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
   try{
     const img=new Image();
     await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
     const canvas=document.createElement('canvas');
     canvas.width=1600;canvas.height=1131;
     const ctx=canvas.getContext('2d');
     if(!ctx)throw Error('canvas_unavailable');
     ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
     ctx.drawImage(img,0,0,canvas.width,canvas.height);
     return canvas;
   }finally{URL.revokeObjectURL(url)}
 }
 async function imageBlob(svg){
   const canvas=await awardCanvas(svg);
   return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('png_failed')),'image/png'));
 }
 function pdfFromJpeg(jpegBytes,imageWidth=1600,imageHeight=1131){
   // A physical A4 landscape page, independent of Android print-dialog orientation.
   const bytes=jpegBytes instanceof Uint8Array?jpegBytes:new Uint8Array(jpegBytes);
   if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error('invalid_jpeg');
   const enc=new TextEncoder(),parts=[],offsets=[0];let position=0;
   const add=value=>{const arr=typeof value==='string'?enc.encode(value):value;parts.push(arr);position+=arr.byteLength};
   const obj=(num,body)=>{offsets[num]=position;add(num+' 0 obj\n'+body+'\nendobj\n')};
   add('%PDF-1.4\n%NATAIJI\n');
   obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
   obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
   obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
   const drawing='q\n841.89 0 0 595.28 0 0 cm\n/Im0 Do\nQ\n';
   obj(4,'<< /Length '+enc.encode(drawing).byteLength+' >>\nstream\n'+drawing+'endstream');
   offsets[5]=position;
   add('5 0 obj\n<< /Type /XObject /Subtype /Image /Width '+imageWidth+' /Height '+imageHeight+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.byteLength+' >>\nstream\n');
   add(bytes);add('\nendstream\nendobj\n');
   const xref=position;
   add('xref\n0 6\n0000000000 65535 f \n');
   for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
   add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
   return new Blob(parts,{type:'application/pdf'});
 }
 async function awardPdfBlob(svg){
   const canvas=await awardCanvas(svg);
   const jpg=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('jpeg_failed')),'image/jpeg',0.88));
   return pdfFromJpeg(new Uint8Array(await jpg.arrayBuffer()),canvas.width,canvas.height);
 }
 function saveLocalFile(blob,filename){
   const a=document.createElement('a'),url=URL.createObjectURL(blob);
   a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 async function showAward(record,preview=false){
 const w=modal(t('شهادة التميز وإعلان التكريم','Certificat et annonce de distinction')),body=w.body,raw=awardSVG(record);
 const announce=formatMessage({...record,kind:'award'}),filename='Certificat-'+today()+'.pdf';
 const native=window.Capacitor?.isNativePlatform?.()===true||['android','ios'].includes(window.Capacitor?.getPlatform?.());
 let prepared;
 const pdf=()=>prepared||=awardPdfBlob(raw).catch(e=>{prepared=null;throw e});
 const pdfFile=async()=>new File([await pdf()],filename,{type:'application/pdf'});
 const supportsShare=file=>Boolean(navigator.share&&navigator.canShare?.({files:[file]}));
 body.innerHTML=`<p class="family-hint">${preview?t('معاينة شهادة التميز قبل إنشاء الإعلان والشهادة.','Aperçu du certificat avant création.'):t('الشهادة وإعلان التميز معًا. اختر واتساب والمستلم من هاتفك بعد الضغط على مشاركة.','Certificat et annonce ensemble. Sélectionnez WhatsApp et son destinataire.')}</p>
 <div class="family-award-preview"></div>
 <div class="family-award-actions"><button id="familyAwardOpenPDF" type="button" class="family-primary">${t('فتح شهادة PDF','Ouvrir PDF')}</button>
 <button id="familyAwardPDF" type="button" class="family-secondary">${t('حفظ شهادة PDF','Enregistrer PDF')}</button>
 <button id="familyAwardDownload" type="button" class="family-secondary">${t('حفظ صورة','Enregistrer PNG')}</button></div>
 ${preview?'':`<section class="family-award-send"><h3>${t('إرسال إعلان التميز والشهادة معًا','Partager le certificat et son annonce')}</h3>
 <div id="familyAwardMessage" class="family-message-preview"></div>
 <label>${t('رقم واتساب ولي الأمر (اختياري عند المشاركة في مجموعة)','Numéro WhatsApp du parent (facultatif pour groupe)')}<input id="familyAwardPhone" type="tel" inputmode="tel" placeholder="+222 34 00 00 00" value="${esc(String(record.guardian_phone||'').replace(/^222/,''))}"></label>
 <label class="family-checkbox"><input type="checkbox" id="familyAwardConsent"> ${t('أؤكد موافقة ولي الأمر على مشاركة شهادة التلميذ وإعلان تميزه.','Je confirme le consentement du parent.')}</label>
 <button id="familyAwardSaveContact" type="button" class="family-secondary">${t('حفظ رقم الولي','Enregistrer le numéro')}</button>
 <button id="familyAwardShare" type="button" class="family-primary">${t('مشاركة PDF وإعلان التميز عبر واتساب','Partager PDF et annonce par WhatsApp')}</button>
 <button id="familyAwardWhatsApp" type="button" class="family-secondary">${t('فتح محادثة ولي الأمر','Ouvrir la discussion du parent')}</button>
 <button id="familyAwardCopy" type="button" class="family-secondary">${t('نسخ إعلان التميز','Copier l’annonce')}</button>
 <p class="family-tiny">${t('قد لا يعرض واتساب النص مع PDF على بعض الهواتف. تحقّق قبل الإرسال، وألصق الإعلان في المحادثة نفسها إذا لزم. لا إرسال تلقائي.','Sur certains téléphones, WhatsApp peut ignorer le texte joint au PDF. Vérifiez et collez le message si besoin. Aucun envoi automatique.')}</p>
 </section>`}
 <p class="family-message" aria-live="polite"></p>`;
 $('.family-award-preview',body).innerHTML=raw.replace('<svg ','<svg role="img" aria-label="'+t('شهادة تكريم','Certificat')+'" ');
 if(!preview)$('#familyAwardMessage',body).textContent=announce;
 const feedback=(ar,fr,ok=false)=>note(body,t(ar,fr),ok);
 const protect=async(button,action)=>{button.disabled=true;try{await action()}catch(e){if(e?.name!=='AbortError')feedback('تعذر إتمام العملية؛ يمكنك حفظ PDF وإعادة المحاولة.','Opération impossible. Enregistrez le PDF et réessayez.')}finally{button.disabled=false}};
 $('#familyAwardOpenPDF',body).onclick=()=>{
   const button=$('#familyAwardOpenPDF',body),tab=!native?window.open('about:blank','_blank'):null;
   void protect(button,async()=>{
     const file=await pdfFile();
     if(native&&supportsShare(file))await navigator.share({files:[file],title:filename});
     else if(tab){const url=URL.createObjectURL(file);tab.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),120000)}
     else{saveLocalFile(file,filename);feedback('تم تجهيز PDF؛ افتحه من ملفات الهاتف.','Ouvrez le PDF dans vos fichiers.',true)}
   });
 };
 $('#familyAwardPDF',body).onclick=()=>{
   const button=$('#familyAwardPDF',body);
   void protect(button,async()=>{const file=await pdfFile();if(native&&supportsShare(file))await navigator.share({files:[file],title:filename});else saveLocalFile(file,filename)});
 };
 $('#familyAwardDownload',body).onclick=()=>{
   const button=$('#familyAwardDownload',body);
   void protect(button,async()=>{const file=new File([await imageBlob(raw)],'Certificat-'+today()+'.png',{type:'image/png'});if(native&&supportsShare(file))await navigator.share({files:[file],title:file.name});else saveLocalFile(file,file.name)});
 };
 if(preview)return;
 const phone=$('#familyAwardPhone',body),consent=$('#familyAwardConsent',body);
 const number=()=>{const n=phoneNum(phone.value);return /^[0-9]{8}$/.test(n)?'222'+n:null};
 const approve=()=>{if(consent.checked)return true;feedback('أكد موافقة ولي الأمر قبل المشاركة.','Confirmez le consentement avant partage.');return false};
 $('#familyAwardSaveContact',body).onclick=()=>{
   if(!approve()||!number()||!record.class_id||!record.student_key){feedback('أدخل رقمًا موريتانيًا صحيحًا لحفظه.','Numéro mauritanien valide requis.');return}
   const button=$('#familyAwardSaveContact',body);
   void protect(button,async()=>{await request('/api/family/contacts','PUT',{classId:record.class_id,studentKey:record.student_key,phone:number(),consent:true});record.guardian_phone=number();feedback('تم حفظ رقم ولي الأمر.','Numéro enregistré.',true)});
 };
 $('#familyAwardCopy',body).onclick=async()=>{try{await navigator.clipboard.writeText(announce);feedback('تم نسخ الإعلان.','Annonce copiée.',true)}catch{window.prompt(t('انسخ الإعلان','Copiez l’annonce'),announce)}};
 $('#familyAwardWhatsApp',body).onclick=()=>{
   if(!approve())return;
   const dest=number()||(/^222[0-9]{8}$/.test(String(record.guardian_phone||''))?record.guardian_phone:null);
   if(!dest){feedback('أدخل رقم ولي الأمر الصحيح.','Saisissez le numéro du parent.');return}
   const a=document.createElement('a');a.href='https://wa.me/'+dest+'?text='+encodeURIComponent(announce);a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();
   feedback('أرفق PDF من زر المشاركة في هذه الشاشة إذا لم يظهر في المحادثة.','Joignez le PDF si nécessaire.',true);
 };
 $('#familyAwardShare',body).onclick=()=>{
   if(!approve())return;
   const button=$('#familyAwardShare',body);
   void protect(button,async()=>{
     const file=await pdfFile();
     if(supportsShare(file)){await navigator.share({files:[file],text:announce,title:t('شهادة وإعلان التميز','Certificat et annonce')});feedback('تحقق من وجود PDF وإعلان التميز في واتساب قبل إرسال الرسالة.','Vérifiez la présence du PDF et du texte dans WhatsApp.',true)}
     else{saveLocalFile(file,filename);try{await navigator.clipboard.writeText(announce)}catch{}feedback('حُفظ PDF وتم تجهيز الإعلان؛ أرفقهما في محادثة واتساب واحدة.','PDF préparé : partagez-le avec le texte dans la même discussion.',true)}
   });
 };
}
  function formatMessage(rec){
   const d=rec.data||{},name=rec.student_name,school=rec.school_name||'اسم المدرسة';
   if(rec.kind==='award')return '🏆 إعلان التميز | '+school+'\nيسعدنا تكريم التلميذ/ة '+name+'\n'+(AWARDS[d.awardType]?.[0]||'شهادة تكريم')+(d.reason?'\nالسبب: '+d.reason:'')+'\nالشهادة الرسمية مرفقة بصيغة PDF.\nمع تحيات المدرسة والمعلم أو الأستاذ.';
   if(rec.kind==='daily')return '📚 '+school+'\nالتقرير اليومي للتلميذ/ة: '+name+'\nالتاريخ: '+(d.date||'')+'\nالحضور: '+pair(ATT,d.attendance)+'\nالتقييم: '+pair(RATE,d.assessment)+(d.note?'\nالملاحظة: '+d.note:'')+'\nمع تحيات المعلم أو الأستاذ.';
   return '📄 '+school+'\nإشعار بنتائج التلميذ/ة: '+name+(d.term?'\nالفصل: '+d.term:'')+(d.note?'\n'+d.note:'')+'\nيمكنكم التواصل مع المؤسسة للاطلاع على الكشف المعتمد.';
 }
 function openWhatsApp(rec,phone){
   if(!rec||!/^222[0-9]{8}$/.test(String(phone||'')))return;
   const a=document.createElement('a');a.href='https://wa.me/'+phone+'?text='+encodeURIComponent(formatMessage(rec));a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();
   void request('/api/family/records/'+encodeURIComponent(rec.id)+'/status','POST',{status:'opened'}).catch(()=>{});
 }
 async function openOutbox(){
   const w=modal(t('إرسال فردي لأولياء الأمور','Envoi individuel aux parents'));
   const body=w.body;let rows=[],selected='pending';
   body.innerHTML=`<p class="family-hint">${t('هذه رسائلك أنت. يفتح زر الإرسال محادثة ولي الأمر في واتساب هاتفك؛ تأكد من الحساب الذي اخترته.','Ce sont vos messages. Le bouton ouvre le parent dans WhatsApp de votre téléphone ; vérifiez le compte choisi.')}</p>
     <div class="family-tabs"><button data-status="pending" class="on">${t('جاهزة','En attente')}</button><button data-status="opened">${t('فُتحت','Ouvertes')}</button><button data-status="sent">${t('أرسلت يدويًا','Marquées envoyées')}</button></div>
     <p class="family-message" aria-live="polite"></p><div id="familyQueueList"></div>`;
   async function refresh(){
     const list=$('#familyQueueList',body);list.textContent=t('جارٍ التحميل…','Chargement…');
     try{
       const data=await request('/api/family/outbox?status='+selected);rows=data.records||[];
       list.innerHTML=rows.length?rows.map((rec,i)=>`<article class="family-queue-card" data-i="${i}">
          <b>${esc(rec.student_name)}</b><small>${esc(rec.school_name)} · ${esc(rec.class_name)} · ${esc(rec.actor_name)} · ${esc(rec.created_at?.slice(0,16)||'')}</small>
          <div class="family-message-preview">${esc(formatMessage(rec))}</div>
          <div class="family-actions"><button data-open="${i}" class="family-primary">${t('فتح في واتساب','Ouvrir WhatsApp')}</button>
          <button data-sent="${i}" class="family-secondary">${t('تأكيد الإرسال','Confirmer l’envoi')}</button>
          <button data-copy="${i}" class="family-secondary">${t('نسخ الرسالة','Copier le message')}</button>
          ${rec.kind==='award'?`<button data-certificate="${i}" class="family-primary">${t('الشهادة + إعلان التميز','Certificat + annonce')}</button>`:''}</div>
          </article>`).join(''):`<p class="family-tiny">${t('لا توجد رسائل في هذه القائمة','Aucun message dans cette liste')}</p>`;
       $$('[data-open]',list).forEach(button=>button.onclick=async()=>{
         const rec=rows[Number(button.dataset.open)];
         openWhatsApp(rec,rec.guardian_phone);
         try{await request('/api/family/records/'+encodeURIComponent(rec.id)+'/status','POST',{status:'opened'});await refresh()}catch{note(body,t('فتحت واتساب، لكن تعذر تحديث حالة الرسالة.','WhatsApp ouvert, mais mise à jour impossible.'))}
       });
       $$('[data-copy]',list).forEach(button=>button.onclick=async()=>{const rec=rows[Number(button.dataset.copy)],value=formatMessage(rec);try{await navigator.clipboard.writeText(value);note(body,t('تم نسخ الرسالة. الصقها داخل حساب واتساب الذي تستخدمه.','Message copié. Collez-le dans votre WhatsApp.'),true)}catch{window.prompt(t('انسخ الرسالة من هنا','Copiez le message'),value)}});
       $$('[data-sent]',list).forEach(button=>button.onclick=async()=>{
         const rec=rows[Number(button.dataset.sent)];
         if(!confirm(t('هل ضغطت إرسال بالفعل من واتساب هاتفك؟','Avez-vous effectivement envoyé le message depuis votre WhatsApp ?')))return;
         try{await request('/api/family/records/'+encodeURIComponent(rec.id)+'/status','POST',{status:'sent'});await refresh()}catch{note(body,t('تعذر تأكيد الحالة.','Mise à jour impossible.'))}
       });
       $$('[data-certificate]',list).forEach(button=>button.onclick=()=>void showAward(rows[Number(button.dataset.certificate)]));
     }catch{list.textContent=t('تعذر تحميل الرسائل. تحقق من الاتصال والحساب.','Impossible de charger la file.')}
   }
   $$('[data-status]',body).forEach(btn=>btn.onclick=()=>{selected=btn.dataset.status;$$('[data-status]',body).forEach(x=>x.classList.toggle('on',x===btn));void refresh()});
   await refresh()
 }
 async function openTeacher(user,state){
   if(!state)return;
   try{
     const server=await request('/api/family/classes');
     if(server.classes?.length)return openAuthor({user,classes:server.classes});
   }catch{}
   const cid=String(state.activeClassId||'');
   const cls=(state.classes||[]).find(c=>String(c.id)===cid);
   const students=(state.pupils||[]).map(p=>({id:String(p?.[7]||p?.[0]||''),name:String(p?.[1]||'')}));
   return openAuthor({user,classes:[{id:cid,name:String(cls?.name||state.className||''),schoolName:String(state.school||''),students}]});
 }
 async function openDirector(user){
   if(!user?.id||user.role!=='admin'){alert(t('غير مصرح بالدخول','Accès non autorisé'));return}
   try{
     const data=await request('/api/family/classes');
     if(!data.classes?.length){alert(t('لم يُعثر على تلاميذ مرتبطين بحسابك.','Aucun élève lié à votre compte.'));return}
     return openAuthor({user,classes:data.classes});
   }catch{alert(t('تعذر تحميل تلاميذ المؤسسة. تحقق من الاتصال.','Impossible de charger les élèves de votre établissement.'))}
 }
 function openProfessor(user,profile){
   const classes=(profile?.classes||[]).map(c=>({id:String(c.id),name:String(c.name),schoolName:String(profile.schoolName||''),students:(c.students||[]).map(s=>({id:String(s.id),name:String(s.name||s.nameFr||'')}))}));
   return openAuthor({user,classes});
 }
 window.NataijiFamily={openTeacher,openProfessor,openDirector,openOutbox,_message:formatMessage,_awardSVG:awardSVG};
})();
