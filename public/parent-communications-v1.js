/* Parent communications: official WhatsApp Business is used ONLY by the
 * authorised Nataiji operator on their own phone. No background sending. */
(()=>{
 'use strict';
 if(window.NataijiParentComms)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\x27':'&#39;'}[c]));
 const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
 const t=(a,b)=>fr()?b:a;
 let user=null,classes=[],students=[],chosenClass='',chosenPupil='',mine=[],outbox=[],tab='compose',status='pending',root=null,busy=false;
 const awards={excellence:['التفوق الدراسي','Excellence scolaire'],conduct:['حسن السلوك','Bonne conduite'],improvement:['التحسن الدراسي','Progrès scolaires'],attendance:['المواظبة','Assiduité'],effort:['الاجتهاد','Efforts remarquables']};
 const ratings={excellent:['ممتاز','Excellent'],very_good:['جيد جدًا','Très bien'],good:['جيد','Bien'],needs_support:['يحتاج إلى دعم','À renforcer'],not_evaluated:['لم يُقيّم','Non évalué']};
 const attendance={present:['حاضر','Présent'],absent:['غائب','Absent'],late:['متأخر','En retard'],not_recorded:['لم يسجل','Non renseigné']};
 const current=()=>students.find(x=>x.id===chosenPupil);
 const q=(s,r=root)=>r?.querySelector(s);
 function translated(map,key){return (map[key]||['—','—'])[fr()?1:0]}
 async function api(path,options){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'request_failed');
  return data;
 }
 function note(message,isError=false){const el=q('.nta-comms-notice');if(!el)return;el.textContent=message;el.classList.toggle('error',isError);el.hidden=!message}
 function lock(yes){busy=yes;q('.nta-comms-panel')?.classList.toggle('nta-busy',yes)}
 function shell(){
  document.querySelector('.nta-comms-overlay')?.remove();
  root=document.createElement('div');root.className='nta-comms-overlay';root.dir=fr()?'ltr':'rtl';
  root.innerHTML='<section class="nta-comms-panel" role="dialog" aria-modal="true" aria-label="'+esc(t('تواصل أولياء الأمور','Communication avec les familles'))+'">'+
   '<header class="nta-comms-head"><div><small>'+esc(t('نتائجي · هاتف فقط','Nataiji · sur téléphone'))+'</small><h2>'+esc(t('التواصل والتكريم','Communication et distinctions'))+'</h2></div><button type="button" data-nta="close" aria-label="'+esc(t('إغلاق','Fermer'))+'">×</button></header>'+
   '<nav class="nta-comms-tabs">'+(user?.isSuperAdmin?'<button data-nta-tab="outbox">'+esc(t('الرسائل الرسمية','Boîte officielle'))+'</button>':'')+
   '<button data-nta-tab="compose">'+esc(t('التقييم والتكريم','Évaluations et distinctions'))+'</button>'+
   '<button data-nta-tab="mine">'+esc(t('سجلي','Mon historique'))+'</button></nav>'+
   '<div class="nta-comms-notice" role="status" hidden></div><div class="nta-comms-body"></div></section>';
  document.body.appendChild(root);
  root.addEventListener('click',async e=>{
   const close=e.target.closest('[data-nta="close"]');if(close){root.remove();root=null;return}
   const b=e.target.closest('[data-nta-tab]');if(b){tab=b.dataset.ntaTab;await render();return}
   if(e.target===root){root.remove();root=null}
  });
  document.querySelectorAll('[data-nta-tab]').forEach(b=>b.classList.toggle('active',b.dataset.ntaTab===tab));
 }
 function setBody(html){q('.nta-comms-body').innerHTML=html;root.querySelectorAll('[data-nta-tab]').forEach(b=>b.classList.toggle('active',b.dataset.ntaTab===tab))}
 function button(label,id,extra=''){return '<button type="button" class="nta-action '+extra+'" id="'+id+'">'+esc(label)+'</button>'}
 function optionList(obj){return Object.entries(obj).map(([key,pair])=>'<option value="'+esc(key)+'">'+esc(pair[fr()?1:0])+'</option>').join('')}
 async function loadClasses(){
  const result=await api('/api/parent-communications/classes');classes=result.classes||[];
  if(!classes.some(c=>c.id===chosenClass))chosenClass=classes[0]?.id||'';
 }
 async function loadStudents(){
  students=chosenClass?(await api('/api/parent-communications/students?classId='+encodeURIComponent(chosenClass))).students||[]:[];
  if(!students.some(s=>s.id===chosenPupil))chosenPupil=students[0]?.id||'';
 }
 async function compose(){
  try{
   await loadClasses();await loadStudents();
   if(!classes.length){setBody('<div class="nta-empty">'+esc(t('لا توجد أقسام مخوّلة لهذا الحساب.','Aucune classe autorisée pour ce compte.'))+'</div>');return}
   let html='<p class="nta-hint">'+esc(t('يحرر المعلم أو الأستاذ التقارير وشهادات التكريم بنفسه. لا تحتاج الشهادة إلى اعتماد المدير. ويرسلها مسؤول نتائجي لاحقًا من الرقم الرسمي.','L’enseignant crée lui-même les évaluations et les distinctions, sans validation du directeur. L’opérateur Nataiji les envoie depuis le numéro officiel.'))+'</p>'+
   '<label>'+esc(t('القسم','Classe'))+'<select id="ntaClass">'+classes.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===chosenClass?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label>';
   html+='<label>'+esc(t('التلميذ','Élève'))+'<select id="ntaStudent">'+students.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===chosenPupil?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label>';
   if(!students.length){setBody(html+'<p class="nta-empty">'+esc(t('لا يوجد تلاميذ بهذا القسم.','Aucun élève dans cette classe.'))+'</p>');q('#ntaClass').onchange=async e=>{chosenClass=e.target.value;chosenPupil='';await compose()};return}
   const s=current();
   html+='<article class="nta-contact"><strong>'+esc(t('بيانات ولي الأمر','Contact du responsable légal'))+'</strong>'+
    '<label>'+esc(t('رقم واتساب الموريتاني','Numéro WhatsApp mauritanien'))+'<input id="ntaPhone" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="+222 12345678" value="'+esc(s.phone||'')+'"></label>'+
    '<label class="nta-check"><input type="checkbox" id="ntaConsent" '+(s.consent?'checked':'')+'><span>'+esc(t('أكد ولي الأمر موافقته على استقبال الرسائل المدرسية على هذا الرقم.','Le responsable légal a accepté de recevoir les messages scolaires à ce numéro.'))+'</span></label>'+
    button(t('حفظ الرقم والموافقة','Enregistrer le contact'),'ntaSaveContact')+'</article>'+
    '<article class="nta-compose"><h3>'+esc(t('إنشاء رسالة جديدة','Préparer un message'))+'</h3>'+
    '<label>'+esc(t('النوع','Type'))+'<select id="ntaKind"><option value="daily">'+esc(t('تقييم يومي','Évaluation quotidienne'))+'</option><option value="award">'+esc(t('شهادة تكريم','Distinction'))+'</option><option value="result">'+esc(t('إشعار بالنتائج','Notification des résultats'))+'</option></select></label>'+
    '<div id="ntaDaily"><label>'+esc(t('الحضور','Présence'))+'<select id="ntaAttendance">'+optionList(attendance)+'</select></label>'+
    '<label>'+esc(t('التقييم','Évaluation'))+'<select id="ntaRating">'+optionList(ratings)+'</select></label></div>'+
    '<div id="ntaAward" hidden><label>'+esc(t('نوع التكريم','Distinction'))+'<select id="ntaAwardType">'+optionList(awards)+'</select></label></div>'+
    '<div id="ntaResult" hidden class="nta-hint">'+esc(t('إشعار فقط دون كشف درجات أو أرقام حساسة. تأكد أولًا من نشر النتائج واعتمادها.','Notification uniquement, sans notes ni données sensibles. Assurez-vous que les résultats sont publiés.'))+'</div>'+
    '<label id="ntaNoteLabel">'+esc(t('ملاحظات (اختيارية)','Observation (facultative)'))+'<textarea id="ntaNote" rows="3" maxlength="500" placeholder="'+esc(t('اكتب ملاحظة مهنية موجزة','Saisissez une observation concise'))+'"></textarea></label>'+
    button(t('إضافة إلى رسائل نتائجي','Ajouter à la boîte Nataiji'),'ntaQueue','primary')+
    '<p class="nta-hint">'+esc(t('لا تُرسل الرسالة فورًا. ستظهر لمسؤول نتائجي فقط بعد حفظها؛ ولا يتم فتح واتساب المعلم.','Le message n’est pas envoyé immédiatement. Il apparaît dans la boîte de l’opérateur Nataiji.'))+'</p></article>';
   setBody(html);
   q('#ntaClass').onchange=async e=>{chosenClass=e.target.value;chosenPupil='';await compose()};
   q('#ntaStudent').onchange=async e=>{chosenPupil=e.target.value;await compose()};
   q('#ntaKind').onchange=()=>{
    const k=q('#ntaKind').value;q('#ntaDaily').hidden=k!=='daily';q('#ntaAward').hidden=k!=='award';q('#ntaResult').hidden=k!=='result';q('#ntaNoteLabel').hidden=k==='result';
   };
   q('#ntaSaveContact').onclick=saveContact;q('#ntaQueue').onclick=queue;
  }catch(e){setBody('<p class="nta-error">'+esc(t('تعذر تحميل بيانات القسم. تحقق من الاتصال والصلاحيات.','Impossible de charger les élèves. Vérifiez la connexion et les permissions.'))+'</p>')}
 }
 async function saveContact(){
  if(busy)return;
  lock(true);try{
   const r=await api('/api/parent-communications/contacts/'+encodeURIComponent(chosenPupil),{method:'PUT',body:JSON.stringify({classId:chosenClass,phone:q('#ntaPhone').value,consent:q('#ntaConsent').checked})});
   const s=current();s.phone=r.phone;s.consent=r.consent;
   note(t('تم حفظ بيانات ولي الأمر على الخادم.','Contact enregistré sur le serveur.'));
  }catch(e){note(e.message==='invalid_mauritania_phone'?t('أدخل 8 أرقام موريتانية صحيحة.','Saisissez 8 chiffres mauritaniens valides.'):t('فشل الحفظ؛ لم يتم تغيير البيانات.','Échec de l’enregistrement.'),true)}
  finally{lock(false)}
 }
 async function queue(){
  if(busy)return;
  if(!current()?.consent){note(t('احفظ رقم ولي الأمر وموافقته أولًا.','Enregistrez d’abord le numéro et le consentement.'),true);return}
  const kind=q('#ntaKind').value;
  if(kind==='result'&&!confirm(t('هل تم اعتماد النتائج ونشرها فعلًا؟','Les résultats ont-ils été validés et publiés ?')))return;
  lock(true);try{
   const data={classId:chosenClass,pupilKey:chosenPupil,kind};
   if(kind==='daily')Object.assign(data,{attendance:q('#ntaAttendance').value,rating:q('#ntaRating').value,note:q('#ntaNote').value});
   if(kind==='award')Object.assign(data,{award:q('#ntaAwardType').value,note:q('#ntaNote').value});
   await api('/api/parent-communications/queue',{method:'POST',body:JSON.stringify(data)});
   note(t('تم إعداد الرسالة وحفظها؛ مسؤول نتائجي سيرسلها من الهاتف الرسمي.','Message préparé et enregistré pour l’opérateur officiel.'));
   if(q('#ntaNote'))q('#ntaNote').value='';
  }catch(e){note(e.message==='guardian_consent_required'?t('تحتاج أولًا إلى موافقة ولي الأمر ورقم محفوظ.','Consentement et numéro requis.'):t('تعذر حفظ الرسالة. حاول من جديد.','Impossible d’enregistrer le message.'),true)}
  finally{lock(false)}
 }
 function message(item){
  const p=item.payload||{};
  const lines=[t('نتائجي | إشعار مدرسي','Nataiji | Communication scolaire')];
  lines.push(t('المؤسسة: ','Établissement : ')+item.school_name);
  lines.push(t('التلميذ: ','Élève : ')+item.pupil_name);
  lines.push(t('القسم: ','Classe : ')+item.class_name);
  if(item.kind==='daily'){
   lines.push(t('التقييم اليومي','Évaluation quotidienne'));
   lines.push(t('الحضور: ','Présence : ')+translated(attendance,p.attendance));
   lines.push(t('التقييم: ','Appréciation : ')+translated(ratings,p.rating));
  }else if(item.kind==='award'){
   lines.push(t('شهادة تكريم: ','Distinction : ')+translated(awards,p.award));
  }else{
   lines.push(t('تتوفر النتائج المعتمدة لدى المؤسسة؛ يرجى الاطلاع عليها عبر القنوات المدرسية.','Les résultats sont disponibles auprès de votre établissement.'));
  }
  if(p.note)lines.push(t('ملاحظة: ','Observation : ')+p.note);
  if(item.kind==='award')lines.push(t('صادرة عن المعلم/الأستاذ: ','Délivrée par : ')+item.issued_by_name);
  lines.push(t('رسالة من نظام نتائجي.','Message préparé par Nataiji.'));
  return lines.join('\n');
 }
 async function official(){
  if(!user?.isSuperAdmin){setBody('<p class="nta-error">'+esc(t('هذه اللوحة لمسؤول نتائجي فقط.','Réservé à l’opérateur Nataiji.'))+'</p>');return}
  try{
   outbox=(await api('/api/parent-communications/outbox?status='+status)).items||[];
   let html='<p class="nta-hint">'+esc(t('افتح هذه الشاشة من الهاتف المرتبط برقم WhatsApp Business الرسمي لنتائجي، وليس واتساب المعلم. فتح المحادثة لا يعني أن الرسالة أُرسلت.','Ouvrez depuis le téléphone lié au compte WhatsApp Business officiel, pas celui de l’enseignant. Ouvrir la conversation ne confirme pas l’envoi.'))+'</p>'+
    '<div class="nta-filter"><button id="ntaPending" class="'+(status==='pending'?'active':'')+'">'+esc(t('بانتظار الإرسال','En attente'))+'</button><button id="ntaSent" class="'+(status==='sent'?'active':'')+'">'+esc(t('وُسمت مرسلة','Marqués envoyés'))+'</button></div>';
   if(!outbox.length)html+='<p class="nta-empty">'+esc(t('لا توجد رسائل في هذه القائمة.','Aucun message dans cette liste.'))+'</p>';
   for(const item of outbox){
    html+='<article class="nta-message"><div class="nta-message-title"><b>'+esc(item.pupil_name)+'</b><small>'+esc(item.school_name)+' · '+esc(item.class_name)+'</small></div>'+
     '<small dir="ltr">'+esc(item.phone)+'</small><pre>'+esc(message(item))+'</pre>'+
     '<div class="nta-message-actions">'+button(t('نسخ الرسالة','Copier'),'ntaCopy-'+item.id)+
     (item.kind==='award'?button(t('عرض الشهادة','Voir le certificat'),'ntaOwnerCertificate-'+item.id):'')+
     (status==='pending'?button(t('فتح واتساب الأعمال','Ouvrir WhatsApp Business'),'ntaOpen-'+item.id,'primary')+button(t('تأكيد الإرسال','Confirmer envoi'),'ntaSent-'+item.id):'')+'</div></article>';
   }
   if(outbox.length===100)html+='<p class="nta-hint">'+esc(t('تظهر أول 100 رسالة؛ عالجها لعرض البقية.','Affichage des 100 premiers messages.'))+'</p>';
   setBody(html);
   q('#ntaPending').onclick=async()=>{status='pending';await official()};
   q('#ntaSent').onclick=async()=>{status='sent';await official()};
   for(const item of outbox){
    q('#ntaCopy-'+item.id).onclick=async()=>{try{await navigator.clipboard.writeText(message(item));note(t('تم نسخ الرسالة.','Message copié.'))}catch{note(t('تعذر النسخ.','Copie indisponible.'),true)}};
    if(item.kind==='award')q('#ntaOwnerCertificate-'+item.id).onclick=()=>certificate(item.id);
    if(status!=='pending')continue;
    q('#ntaOpen-'+item.id).onclick=()=>{
     const phone=String(item.phone||'').replace(/\D/g,'');
     if(!phone)return;
     // Trigger navigation in the direct click gesture; never mark sent here.
     const url='https://wa.me/'+phone+'?text='+encodeURIComponent(message(item));
     const opened=window.open(url,'_blank');
     if(opened)opened.opener=null;
     else location.href=url;
    };
    q('#ntaSent-'+item.id).onclick=async()=>{
     if(!confirm(t('هل أرسلت الرسالة فعلًا من حساب نتائجي الرسمي على هاتفك؟','Avez-vous réellement envoyé ce message depuis le compte officiel Nataiji ?')))return;
     try{await api('/api/parent-communications/outbox/'+encodeURIComponent(item.id),{method:'PATCH',body:JSON.stringify({status:'sent'})});note(t('تم تحديث الحالة يدويًا.','Statut mis à jour manuellement.'));await official()}catch{note(t('تعذر تحديث حالة الرسالة.','Mise à jour du statut impossible.'),true)}
    };
   }
  }catch(e){setBody('<p class="nta-error">'+esc(t('تعذر تحميل صندوق الإرسال.','Impossible de charger la boîte d’envoi.'))+'</p>')}
 }
 async function history(){
  try{
   mine=(await api('/api/parent-communications/mine')).items||[];
   let html='<p class="nta-hint">'+esc(t('الشهادات التي أصدرتها بنفسك، والتقييمات المحفوظة وحالة تسليمها اليدوية.','Distinctions que vous avez émises et messages préparés.'))+'</p>';
   if(!mine.length)html+='<p class="nta-empty">'+esc(t('لا توجد رسائل حتى الآن.','Aucun message.'))+'</p>';
   for(const item of mine){
    html+='<article class="nta-message"><div class="nta-message-title"><b>'+esc(item.pupil_name)+'</b><small>'+esc(item.class_name)+' · '+esc(String(item.created_at).slice(0,10))+'</small></div>'+
    '<p>'+esc(item.kind==='award'?translated(awards,item.payload?.award):item.kind==='daily'?t('تقييم يومي','Évaluation quotidienne'):t('إشعار بنتائج','Notification des résultats'))+'</p>'+
    '<small>'+esc(item.status==='sent'?t('وُسمت مرسلة يدويًا','Marqué envoyé manuellement'):t('بانتظار مسؤول نتائجي','En attente de l’opérateur'))+'</small>'+
    (item.kind==='award'?button(t('عرض / طباعة الشهادة','Voir / imprimer le certificat'),'ntaCertificate-'+item.id):'')+'</article>';
   }
   setBody(html);
   for(const item of mine)if(item.kind==='award')q('#ntaCertificate-'+item.id).onclick=()=>certificate(item.id);
  }catch{setBody('<p class="nta-error">'+esc(t('تعذر تحميل السجل.','Impossible de charger l’historique.'))+'</p>')}
 }
 async function certificate(id){
  try{
   const r=await api('/api/parent-communications/awards/'+encodeURIComponent(id)),a=r.award,p=a.payload||{};
   const wrap=document.createElement('div');wrap.className='nta-cert-preview';wrap.dir=fr()?'ltr':'rtl';
   wrap.innerHTML='<section class="nta-cert-sheet">'+
     '<img src="/app-logo-nataiji.svg" alt="Nataiji" width="68" height="68">'+
     '<h2>'+esc(a.school_name)+'</h2><p>'+esc(t('شهادة تكريم وتقدير','Certificat de distinction'))+'</p>'+
     '<h1>'+esc(a.pupil_name)+'</h1>'+
     '<h3>'+esc(translated(awards,p.award))+'</h3>'+
     (p.note?'<p class="nta-cert-note">'+esc(p.note)+'</p>':'')+
     '<p>'+esc(t('القسم','Classe'))+': '+esc(a.class_name)+'</p>'+
     '<footer>'+esc(t('الأستاذ / المعلم','Enseignant'))+': '+esc(a.issued_by_name)+' · '+esc(String(a.created_at).slice(0,10))+'</footer></section>'+
     '<div class="nta-cert-tools">'+button(t('طباعة / حفظ كـ PDF','Imprimer / Enregistrer PDF'),'ntaPrintCert','primary')+button(t('إغلاق','Fermer'),'ntaCloseCert')+'</div>';
   document.body.appendChild(wrap);
   q('#ntaPrintCert',wrap).onclick=()=>{document.body.classList.add('nta-printing-certificate');window.print()};
   q('#ntaCloseCert',wrap).onclick=()=>{document.body.classList.remove('nta-printing-certificate');wrap.remove()};
  }catch{note(t('تعذر تحميل الشهادة.','Impossible de charger le certificat.'),true)}
 }
 async function render(){
  if(!root)return;
  note('');
  if(tab==='outbox')await official();else if(tab==='mine')await history();else await compose();
 }
 async function open(){
  if(root){root.remove();root=null;return}
  try{
   const status=await api('/api/auth/status');
   user=status.user;
   if(!user)throw Error('not_authenticated');
   tab=user.isSuperAdmin?'outbox':'compose';
   shell();setBody('<p class="nta-hint">'+esc(t('جار تحميل البيانات...','Chargement…'))+'</p>');await render();
  }catch(e){alert(t('سجّل الدخول واتصل بالإنترنت أولًا.','Connectez-vous à votre compte et à Internet.'))}
 }
 document.getElementById('parentCommunicationsBtn')?.addEventListener('click',open);
 window.addEventListener('afterprint',()=>document.body.classList.remove('nta-printing-certificate'));
 window.NataijiParentComms={open};
})();
