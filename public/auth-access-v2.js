(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>localStorage.getItem('nataiji-lang')||'ar',fr=()=>lang()==='fr';
const tr=(ar,ff)=>fr()?ff:ar;
const esc3=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let authMode='login',lastStatus=null,lastLang=lang();
function authErr(code){return({bad_credentials:tr('البريد الإلكتروني أو كلمة المرور غير صحيحة','Adresse e-mail ou mot de passe incorrect'),invalid_input:tr('تحقق من الحقول. كلمة المرور 8 أحرف على الأقل','Vérifiez les champs. Le mot de passe doit contenir au moins 8 caractères'),invalid_invite:tr('رمز الدعوة غير صحيح أو انتهت صلاحيته','Le code d’invitation est invalide ou expiré'),email_exists:tr('هذا البريد مستخدم مسبقًا','Cette adresse e-mail est déjà utilisée'),invalid_or_expired_reset:tr('رابط الاستعادة غير صالح أو انتهت صلاحيته','Le lien de réinitialisation est invalide ou expiré'),email_service_unconfigured:tr('خدمة إرسال رسائل الاستعادة غير مفعلة بعد','Le service d’envoi des e-mails de réinitialisation n’est pas encore configuré'),email_delivery_failed:tr('تعذر إرسال رسالة الاستعادة الآن','Impossible d’envoyer l’e-mail de réinitialisation pour le moment')}[code]||tr('تعذر إتمام العملية. حاول مرة أخرى','Impossible de terminer l’opération. Réessayez.'))}
function resetToken(){return new URLSearchParams(location.search).get('reset')||''}
function gate(){let g=q('.auth-gate');if(!g){g=document.createElement('div');g.className='auth-gate';document.body.appendChild(g)}return g}
function accountActivate(user){const prev=localStorage.getItem('nataiji-active-user');if(prev&&prev!==user.id)localStorage.removeItem('nataiji-data');localStorage.setItem('nataiji-active-user',user.id);currentUser=user;const g=q('.auth-gate');if(g)g.remove();return startApp()}
function tabs(){return `<div class="auth2-tabs"><button data-auth2="login" class="${authMode==='login'?'on':''}">${tr('تسجيل الدخول','Connexion')}</button><button data-auth2="register" class="${authMode==='register'?'on':''}">${tr('إنشاء حساب','Créer un compte')}</button><button data-auth2="join" class="${authMode==='join'?'on':''}">${tr('رمز دعوة','Code d’invitation')}</button></div>`}
function loginForm(){return `<form class="auth-form auth2-form" id="auth2Form"><label>${tr('البريد الإلكتروني','Adresse e-mail')}<input name="email" type="email" autocomplete="email" required></label><label>${tr('كلمة المرور','Mot de passe')}<input name="password" type="password" autocomplete="current-password" required></label><button class="auth-submit">${tr('تسجيل الدخول','Se connecter')}</button><button type="button" class="auth2-link" id="forgotPassword">${tr('نسيت كلمة المرور؟','Mot de passe oublié ?')}</button><p class="auth-error"></p></form>`}
function registerForm(){return `<form class="auth-form auth2-form" id="auth2Form"><label>${tr('اسم المدير','Nom du directeur')}<input name="name" autocomplete="name" required></label><label>${tr('البريد الإلكتروني','Adresse e-mail')}<input name="email" type="email" autocomplete="email" required></label><label>${tr('كلمة المرور','Mot de passe')}<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><button class="auth-submit">${tr('إنشاء حساب مستقل','Créer un compte indépendant')}</button><p class="auth2-note">${tr('كل حساب جديد يبدأ فارغًا؛ أضف المدرسة والقسم والفصل والتلاميذ بعد الدخول.','Chaque nouveau compte commence vide ; ajoutez ensuite l’école, la classe, la période et les élèves.')}</p><p class="auth-error"></p></form>`}
function joinForm(){return `<form class="auth-form auth2-form" id="auth2Form"><label>${tr('رمز الدعوة','Code d’invitation')}<input name="code" dir="ltr" placeholder="NT-XXXXXXXXXXXX" autocomplete="one-time-code" required></label><button class="auth-submit">${tr('الدخول بالرمز','Accéder avec le code')}</button><p class="auth2-note">${tr('يكفي إدخال الرمز الذي أرسله المدير. سيظهر لك فقط القسم والمواد والصلاحيات المحددة في الدعوة.','Il suffit de saisir le code envoyé par le directeur. Seuls la classe, les matières et les autorisations définies dans l’invitation seront accessibles.')}</p><p class="auth-error"></p></form>`}
function forgotForm(){return `<form class="auth-form auth2-form" id="auth2Form"><h2>${tr('استعادة كلمة المرور','Réinitialiser le mot de passe')}</h2><p>${tr('أدخل بريد حسابك وسنرسل لك رابط استعادة صالحًا لمدة 30 دقيقة.','Saisissez l’adresse e-mail de votre compte. Un lien valable 30 minutes vous sera envoyé.')}</p><label>${tr('البريد الإلكتروني','Adresse e-mail')}<input name="email" type="email" autocomplete="email" required></label><button class="auth-submit">${tr('إرسال رابط الاستعادة','Envoyer le lien de réinitialisation')}</button><button type="button" class="auth2-link" id="backLogin">${tr('العودة لتسجيل الدخول','Retour à la connexion')}</button><p class="auth-error"></p></form>`}
function resetForm(token){return `<form class="auth-form auth2-form" id="auth2Form"><h2>${tr('كلمة مرور جديدة','Nouveau mot de passe')}</h2><label>${tr('كلمة المرور الجديدة','Nouveau mot de passe')}<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>${tr('تأكيد كلمة المرور','Confirmer le mot de passe')}<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label><button class="auth-submit">${tr('حفظ كلمة المرور','Enregistrer le mot de passe')}</button><input type="hidden" name="token" value="${esc3(token)}"><p class="auth-error"></p></form>`}
function shell(){const token=resetToken(),body=token?resetForm(token):(authMode==='register'?registerForm():authMode==='join'?joinForm():authMode==='forgot'?forgotForm():loginForm());return `<div class="auth-box auth2-box"><div class="auth-brand"><div class="mark">◆</div><h1>${tr('نتائجي','Nataiji')}</h1><p>${tr('نظام النتائج المدرسية','Système de résultats scolaires')}</p></div>${token?'':(authMode==='forgot'?'':tabs())}${body}<div class="auth-storage"><span class="server-badge ${storageMode==='redis'||storageMode==='postgres'?'':'local'}">${storageMode==='postgres'?tr('تخزين آمن على قاعدة البيانات','Stockage sécurisé sur base de données'):storageMode==='redis'?tr('متصل بخادم البيانات','Connecté au serveur de données'):tr('وضع تخزين مؤقت','Mode de stockage temporaire')}</span></div></div>`}
async function renderAuth(mode='login',force=false){authMode=mode||'login';let status=lastStatus;if(!status||!force){try{status=await api('/api/auth/status');lastStatus=status;storageMode=status.storage||storageMode}catch{status={user:null,storage:'memory'};storageMode='memory'}}if(status.user&&!resetToken()&&!['register','forgot'].includes(authMode))return accountActivate(status.user);const g=gate();g.innerHTML=shell();bindAuth(g,status);return null}
function bindAuth(g,status){qa('[data-auth2]',g).forEach(b=>b.onclick=()=>renderAuth(b.dataset.auth2,true));const back=q('#backLogin',g);if(back)back.onclick=()=>renderAuth('login',true);const forgot=q('#forgotPassword',g);if(forgot)forgot.onclick=()=>renderAuth('forgot',true);const form=q('#auth2Form',g);if(!form)return;form.onsubmit=async e=>{e.preventDefault();const btn=q('.auth-submit',form),err=q('.auth-error',form),fd=Object.fromEntries(new FormData(form));btn.disabled=true;err.textContent='';try{if(resetToken()){if(fd.password!==fd.confirm){err.textContent=tr('كلمتا المرور غير متطابقتين','Les mots de passe ne correspondent pas');return}await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({token:fd.token,password:fd.password})});history.replaceState({},'',location.pathname);lastStatus=null;authMode='login';await renderAuth('login');const e2=q('.auth-error');if(e2){e2.className='auth-error auth2-success';e2.textContent=tr('تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.','Mot de passe modifié. Vous pouvez maintenant vous connecter.')}return}if(authMode==='forgot'){await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({email:fd.email,lang:lang()})});err.className='auth-error auth2-success';err.textContent=tr('إذا كان البريد مسجلًا فستصلك رسالة الاستعادة خلال لحظات.','Si cette adresse est enregistrée, vous recevrez le message de réinitialisation dans quelques instants.');return}let r;if(authMode==='register'){r=await api('/api/auth/register',{method:'POST',body:JSON.stringify(fd)})}else if(authMode==='join'){fd.code=String(fd.code||'').trim().toUpperCase();r=await api('/api/auth/code-login',{method:'POST',body:JSON.stringify({code:fd.code})})}else r=await api('/api/auth/login',{method:'POST',body:JSON.stringify(fd)});lastStatus=null;await accountActivate(r.user)}catch(ex){err.textContent=authErr(ex.code)}finally{btn.disabled=false}}}
try{showAuth=renderAuth}catch{}window.showAuth=renderAuth;
function copyTextFallback(input){
 try{input.focus();input.select();input.setSelectionRange(0,input.value.length);return document.execCommand('copy')}catch{return false}
}
async function copyInviteCode(code,input,btn){
 let ok=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code);ok=true}}catch{}
 if(!ok&&input)ok=copyTextFallback(input);
 if(btn){const old=btn.textContent;btn.textContent=ok?tr('✓ تم النسخ','✓ Copié'):tr('حدد الرمز وانسخه','Sélectionnez et copiez');setTimeout(()=>btn.textContent=old,1500)}
 return ok
}
function classSubjectsFor(classId){
 const s=state||{},d=s.classData?.[classId],rows=Array.isArray(d?.subjects)?d.subjects:(classId===s.activeClassId?(s.subjects||[]):[]);
 return rows.filter(x=>Array.isArray(x)&&x[0]).map(x=>({id:String(x[4]||''),name:String(x[0]||''),fr:String(x[2]||'')}));
}
function classAccessCard(cls,checked=false){
 const subs=classSubjectsFor(cls.id);
 return `<section class="auth2-class-access" data-class-id="${esc3(cls.id)}">
   <label class="auth2-class-toggle"><input type="checkbox" class="auth2-share-class" ${checked?'checked':''}> <b>${esc3(cls.name)}</b></label>
   <div class="auth2-class-scope ${checked?'enabled':''}">
    <label class="auth2-inline"><input type="radio" name="scope-${esc3(cls.id)}" value="all" checked> ${tr('جميع المواد','Toutes les matières')}</label>
    <label class="auth2-inline"><input type="radio" name="scope-${esc3(cls.id)}" value="selected"> ${tr('مواد محددة فقط','Matières sélectionnées uniquement')}</label>
    <div class="auth2-subject-list">${subs.map(s=>`<label><input type="checkbox" class="auth2-subject-choice" value="${esc3(s.id)}"> <span>${esc3(s.name)}</span>${s.fr?`<small dir="ltr">${esc3(s.fr)}</small>`:''}</label>`).join('')||`<p class="auth2-note">${tr('لا توجد مواد محفوظة لهذا القسم بعد.','Aucune matière enregistrée pour cette classe.')}</p>`}</div>
   </div>
 </section>`
}
function bindClassAccess(p){
 const syncCard=card=>{
  const on=q('.auth2-share-class',card)?.checked,scope=q('.auth2-class-scope',card),selected=q('input[type="radio"][value="selected"]:checked',card);
  scope?.classList.toggle('enabled',!!on);qa('.auth2-class-scope input',card).forEach(x=>x.disabled=!on);
  qa('.auth2-subject-choice',card).forEach(x=>x.disabled=!on||!selected);q('.auth2-subject-list',card)?.classList.toggle('enabled',!!on&&!!selected)
 };
 qa('.auth2-class-access',p).forEach(card=>{
  q('.auth2-share-class',card).onchange=()=>syncCard(card);
  qa('input[type="radio"]',card).forEach(x=>x.onchange=()=>syncCard(card));
  syncCard(card)
 })
}
function inviteModal2(){
 if(currentUser?.role!=='admin')return;
 const s=state||{},classes=Array.isArray(s.classes)&&s.classes.length?s.classes:[],initial=s.activeClassId;
 const p=modal(tr('دعوة معلم','Inviter un enseignant'),`<p>${tr('حدّد الأقسام المشتركة، ثم اختر في كل قسم جميع المواد أو مواد محددة فقط. بعد ذلك يكفي أن يدخل المعلم الرمز.','Choisissez les classes partagées, puis toutes les matières ou seulement certaines matières pour chaque classe. Ensuite, le code seul suffit.')}</p>
 <label>${tr('اسم المعلم','Nom de l’enseignant')}<input id="auth2TeacherName" autocomplete="name" placeholder="${tr('مثال: محمد أحمد','Ex. Mohamed Ahmed')}"></label>
 <fieldset class="auth2-shared-classes"><legend>${tr('الأقسام المشتركة','Classes partagées')}</legend>${classes.map(cls=>classAccessCard(cls,cls.id===initial)).join('')||`<p class="auth2-note">${tr('أضف قسمًا أولًا.','Ajoutez d’abord une classe.')}</p>`}</fieldset>
 <fieldset class="auth2-perms"><legend>${tr('الصلاحيات','Autorisations')}</legend><label><input type="checkbox" value="grades" checked> ${tr('إدخال وتعديل الدرجات','Saisir et modifier les notes')}</label><label><input type="checkbox" value="pupils"> ${tr('إدارة تلاميذ الأقسام المشتركة','Gérer les élèves des classes partagées')}</label><label><input type="checkbox" value="reports"> ${tr('عرض وطباعة التقارير','Afficher et imprimer les rapports')}</label></fieldset>
 <button class="primary action">${tr('إنشاء رمز الدعوة','Créer le code d’invitation')}</button><div class="invite-code"></div><p class="message"></p>`);
 p.classList.add('auth2-invite');bindClassAccess(p);
 q('.action',p).onclick=async()=>{
  const permissions=qa('.auth2-perms input:checked',p).map(x=>x.value),msg=q('.message',p),teacherName=q('#auth2TeacherName',p).value.trim(),classAccess={};
  qa('.auth2-class-access',p).forEach(card=>{
   if(!q('.auth2-share-class',card)?.checked)return;
   const classId=card.dataset.classId,allSubjects=q('input[type="radio"]:checked',card)?.value!=='selected',subjectIds=allSubjects?[]:qa('.auth2-subject-choice:checked',card).map(x=>x.value);
   if(allSubjects||subjectIds.length)classAccess[classId]={allSubjects,subjectIds}
  });
  if(!teacherName){msg.textContent=tr('اكتب اسم المعلم','Saisissez le nom de l’enseignant');return}
  if(!permissions.length){msg.textContent=tr('اختر صلاحية واحدة على الأقل','Sélectionnez au moins une autorisation');return}
  if(!Object.keys(classAccess).length){msg.textContent=tr('اختر قسمًا واحدًا على الأقل وحدد مواده','Sélectionnez au moins une classe et ses matières');return}
  q('.action',p).disabled=true;
  try{
   const rr=await api('/api/invites',{method:'POST',body:JSON.stringify({teacherName,permissions,classAccess})});
   const names=(rr.classes||[]).map(x=>esc3(x.name)).join('، ');
   q('.invite-code',p).innerHTML=`<small>${tr('رمز دخول المعلم','Code d’accès enseignant')}</small><div class="auth2-code-copy"><input id="auth2InviteCode" dir="ltr" readonly value="${esc3(rr.code)}"><button type="button" id="auth2CopyInvite">${tr('نسخ الرمز','Copier')}</button></div><p><b>${esc3(rr.teacherName)}</b><br>${tr('الأقسام المشتركة','Classes partagées')}: ${names}<br>${tr('لن تظهر للمعلم إلا الأقسام والمواد المحددة هنا.','L’enseignant ne verra que les classes et matières sélectionnées ici.')}<br>${tr('يكفي أن يدخل المعلم هذا الرمز.','L’enseignant n’a qu’à saisir ce code.')}</p>`;
   const input=q('#auth2InviteCode',p),copy=q('#auth2CopyInvite',p);input.onclick=()=>input.select();copy.onclick=()=>copyInviteCode(rr.code,input,copy)
  }catch(ex){msg.textContent=authErr(ex.code)}finally{q('.action',p).disabled=false}
 }
}
function joinSchoolModal(){
 const p=modal(tr('الدخول برمز الدعوة','Accès par code d’invitation'),`<p>${tr('أدخل الرمز فقط. سيتم فتح حساب المعلم بالصلاحيات والقسم والمواد التي حددها المدير.','Saisissez uniquement le code. Le compte enseignant s’ouvrira avec la classe, les matières et les autorisations définies par le directeur.')}</p><label>${tr('رمز الدعوة','Code d’invitation')}<input id="auth2JoinCode" dir="ltr" placeholder="NT-XXXXXXXXXXXX" autocomplete="one-time-code"></label><button class="primary action">${tr('الدخول بالرمز','Accéder avec le code')}</button><p class="message"></p>`);p.classList.add('auth2-join-modal');q('.action',p).onclick=async()=>{const btn=q('.action',p),msg=q('.message',p),code=String(q('#auth2JoinCode',p).value||'').trim().toUpperCase();if(!code){msg.textContent=tr('أدخل رمز الدعوة','Saisissez le code d’invitation');return}btn.disabled=true;msg.textContent=tr('جارٍ التحقق من الرمز…','Vérification du code…');try{const rr=await api('/api/auth/code-login',{method:'POST',body:JSON.stringify({code})});p.remove();lastStatus=null;await accountActivate(rr.user)}catch(ex){msg.textContent=authErr(ex.code);btn.disabled=false}}
}
function attachInviteModal(){
 const p=modal(tr('إضافة قسم مشترك برمز','Ajouter une classe partagée par code'),`<p>${tr('أدخل رمز دعوة إضافيًا. سيُضاف القسم أو المواد الجديدة إلى حسابك الحالي دون تسجيل الخروج.','Saisissez un autre code d’invitation. La nouvelle classe ou les nouvelles matières seront ajoutées à votre compte actuel sans déconnexion.')}</p><label>${tr('رمز الدعوة','Code d’invitation')}<input id="auth2AttachCode" dir="ltr" placeholder="NT-XXXXXXXXXXXX" autocomplete="one-time-code"></label><button class="primary action">${tr('إضافة إلى حسابي','Ajouter à mon compte')}</button><p class="message"></p>`);
 p.classList.add('auth2-join-modal');
 q('.action',p).onclick=async()=>{
  const btn=q('.action',p),msg=q('.message',p),code=String(q('#auth2AttachCode',p).value||'').trim().toUpperCase();
  if(!code){msg.textContent=tr('أدخل رمز الدعوة','Saisissez le code d’invitation');return}
  btn.disabled=true;msg.textContent=tr('جارٍ إضافة الصلاحية…','Ajout de l’accès…');
  try{
   const rr=await api('/api/access/attach',{method:'POST',body:JSON.stringify({code})});
   currentUser=rr.user||currentUser;lastStatus=null;p.remove();
   await accountActivate(currentUser)
  }catch(ex){
   if(ex.code==='different_school_invite')msg.textContent=tr('هذا الرمز تابع لمدرسة أخرى. يلزم تسجيل الخروج للدخول إلى مدرسة أخرى.','Ce code appartient à une autre école. Déconnectez-vous pour changer d’école.');
   else if(ex.code==='invite_in_use')msg.textContent=tr('هذا الرمز مرتبط بحساب معلم آخر.','Ce code est déjà lié à un autre compte enseignant.');
   else msg.textContent=authErr(ex.code);
   btn.disabled=false
  }
 }
}
async function schoolsModal(){
 const p=modal(tr('مدارسي','Mes écoles'),`<p>${tr('كل مدرسة مساحة مستقلة تمامًا بأقسامها وتلاميذها ونتائجها.','Chaque école est un espace totalement indépendant avec ses classes, élèves et résultats.')}</p><div id="auth2Schools"><p class="message">${tr('جارٍ التحميل…','Chargement…')}</p></div><hr><h3>${tr('إضافة مدرسة','Ajouter une école')}</h3><label>${tr('اسم المدرسة بالعربية','Nom de l’école en arabe')}<input id="auth2SchoolAr"></label><label>Nom de l’établissement<input id="auth2SchoolFr" dir="ltr"></label><button class="primary" id="auth2AddSchool">${tr('إضافة وفتح المدرسة','Ajouter et ouvrir l’école')}</button><p class="message" id="auth2SchoolMsg"></p>`);
 const draw=async()=>{const r=await api('/api/schools');q('#auth2Schools',p).innerHTML=(r.schools||[]).map(s=>`<button type="button" class="auth2-school-row ${s.active?'active':''}" data-school="${esc3(s.id)}"><span><b>${esc3(s.name)}</b>${s.nameFr?`<small dir="ltr">${esc3(s.nameFr)}</small>`:''}</span><em>${s.active?tr('مفتوحة الآن','Ouverte'):tr('فتح','Ouvrir')}</em></button>`).join('')||`<p class="auth2-note">${tr('لا توجد مدرسة بعد.','Aucune école.')}</p>`;qa('.auth2-school-row',p).forEach(b=>b.onclick=async()=>{if(b.classList.contains('active'))return;try{const rr=await api('/api/schools/switch',{method:'POST',body:JSON.stringify({schoolId:b.dataset.school})});currentUser=rr.user;p.remove();await accountActivate(currentUser)}catch(e){q('#auth2SchoolMsg',p).textContent=authErr(e.code)}})};
 await draw();
 q('#auth2AddSchool',p).onclick=async()=>{const name=q('#auth2SchoolAr',p).value.trim(),nameFr=q('#auth2SchoolFr',p).value.trim(),msg=q('#auth2SchoolMsg',p);if(!name){msg.textContent=tr('اكتب اسم المدرسة','Saisissez le nom de l’école');return}try{const rr=await api('/api/schools',{method:'POST',body:JSON.stringify({name,nameFr})});currentUser=rr.user;p.remove();await accountActivate(currentUser)}catch(e){msg.textContent=authErr(e.code)}}
}
async function sharesModal(){
 const p=modal(tr('المشاركات','Partages'),`<p>${tr('الأقسام التي شاركتها مع الآخرين. يمكنك إلغاء الوصول فورًا دون حذف بيانات القسم.','Classes partagées avec d’autres personnes. Vous pouvez retirer l’accès immédiatement sans supprimer les données.')}</p><div id="auth2Shares"><p class="message">${tr('جارٍ التحميل…','Chargement…')}</p></div>`);
 const draw=async()=>{const r=await api('/api/shares'),box=q('#auth2Shares',p);box.innerHTML=(r.grants||[]).map(g=>`<div class="auth2-school-row"><span><b>${esc3(g.recipientName||g.teacherName||tr('معلم','Enseignant'))}</b><small>${esc3(g.schoolName||'')} · ${Object.keys(g.classAccess||{}).length} ${tr('قسم','classe(s)')}</small></span><button class="danger auth2-revoke" data-id="${esc3(g.grantId)}">${tr('إلغاء الوصول','Retirer')}</button></div>`).join('')||`<p class="auth2-note">${tr('لا توجد مشاركات نشطة.','Aucun partage actif.')}</p>`;qa('.auth2-revoke',box).forEach(b=>b.onclick=async()=>{if(!confirm(tr('إلغاء وصول هذا المستخدم؟','Retirer l’accès à cet utilisateur ?')))return;await api('/api/shares/'+encodeURIComponent(b.dataset.id),{method:'DELETE'});await draw()})};await draw()
}
function bindShares(){
 const grid=q('.settings-grid');if(!grid)return;let b=q('#sharesBtn');if(currentUser?.baseRole!=='admin'||currentUser?.activeSharedGrant){b?.remove();return}
 if(!b){b=document.createElement('button');b.id='sharesBtn';b.className='menu-card';grid.insertBefore(b,q('#inviteBtn')?.nextSibling||q('#settingsBtn')||null)}
 b.innerHTML=`<b>🔗 ${tr('المشاركات','Partages')}</b><span>${tr('عرض من لديه وصول وإلغاء الصلاحية عند الحاجة','Voir les accès accordés et les retirer si nécessaire')}</span>`;b.onclick=sharesModal
}
async function bindUnifiedClassSelector(){
 const sel=q('#classTop');if(!sel||!currentUser)return;
 try{const r=await api('/api/workspaces');if(!r)return;sel.innerHTML='';
  const own=document.createElement('optgroup');own.label=tr('أقسامي','Mes classes');
  for(const s of r.owned||[])for(const cls of s.classes||[]){const o=document.createElement('option');o.value='own|'+s.schoolId+'|'+cls.id;o.textContent=((r.owned||[]).length>1?s.schoolName+' — ':'')+cls.name;if(s.active&&state?.activeClassId===cls.id)o.selected=true;own.appendChild(o)}
  if(own.children.length)sel.appendChild(own);
  const sh=document.createElement('optgroup');sh.label=tr('الأقسام المشتركة معي','Classes partagées avec moi');
  for(const g of r.shared||[])for(const cls of g.classes||[]){const o=document.createElement('option');o.value='shared|'+g.grantId+'|'+cls.id;o.textContent=(g.schoolName||tr('مدرسة','École'))+' — '+cls.name;if(g.active&&state?.activeClassId===cls.id)o.selected=true;sh.appendChild(o)}
  if(sh.children.length)sel.appendChild(sh);
  sel.onchange=async()=>{const [kind,id,classId]=sel.value.split('|');try{
    if(kind==='shared'){if(currentUser.activeSharedGrant!==id){const rr=await api('/api/shared/switch',{method:'POST',body:JSON.stringify({grantId:id})});currentUser=rr.user;await accountActivate(currentUser);setTimeout(()=>window.nataijiSelectClass?.(classId),180)}else await window.nataijiSelectClass?.(classId);return}
    if(currentUser.activeSharedGrant||currentUser.schoolId!==id){if(currentUser.activeSharedGrant){const x=await api('/api/shared/switch',{method:'POST',body:JSON.stringify({grantId:''})});currentUser=x.user}if(currentUser.schoolId!==id){const x=await api('/api/schools/switch',{method:'POST',body:JSON.stringify({schoolId:id})});currentUser=x.user}await accountActivate(currentUser);setTimeout(()=>window.nataijiSelectClass?.(classId),180);return}
    if(state?.activeClassId!==classId)await window.nataijiSelectClass?.(classId)
  }catch(e){alert(authErr(e.code))}
  }
 }catch{}
}
function bindSchools(){
 const grid=q('.settings-grid');if(!grid)return;let b=q('#schoolsBtn');
 if(currentUser?.role!=='admin'){b?.remove();return}
 if(!b){b=document.createElement('button');b.id='schoolsBtn';b.className='menu-card';grid.insertBefore(b,q('#structureBtn')||grid.firstChild)}
 b.innerHTML=`<b>🏫 ${tr('مدارسي','Mes écoles')}</b><span>${tr('إضافة مدرسة أو الانتقال بين مدارس حسابك المستقلة','Ajouter une école ou changer d’espace scolaire indépendant')}</span>`;b.onclick=schoolsModal
}
function bindJoinCard(){
 const grid=q('.settings-grid');if(!grid)return;let btn=q('#joinInviteBtn');
 if(!currentUser){btn?.remove();return}
 if(!btn){btn=document.createElement('button');btn.id='joinInviteBtn';btn.className='menu-card';grid.insertBefore(btn,q('#settingsBtn')||q('#logoutBtn')||null)}
 btn.innerHTML=`<b>⌁ ${tr('إضافة قسم مشترك برمز','Ajouter une classe partagée par code')}</b><span>${tr('أضف قسمًا أو مواد جديدة إلى حسابك الحالي دون تسجيل الخروج','Ajoutez une classe ou de nouvelles matières à votre compte sans vous déconnecter')}</span>`;
 btn.onclick=e=>{e.preventDefault();attachInviteModal()}
}
function bindInvite(){const b=q('#inviteBtn');if(b&&!b.dataset.auth2Invite){b.dataset.auth2Invite='1';b.onclick=e=>{e?.preventDefault?.();inviteModal2()}}}
function enforcePermissions(){if(!currentUser)return;const admin=currentUser.role==='admin',perms=new Set(currentUser.permissions||[]),canGrades=admin||perms.has('grades'),canPupils=admin||perms.has('pupils'),canReports=admin||perms.has('reports');qa('[data-view="grades"]').forEach(x=>x.style.display=canGrades?'':'none');qa('[data-view="students"]').forEach(x=>x.style.display=canPupils?'':'none');qa('[data-view="reports"]').forEach(x=>x.style.display=canReports?'':'none');const add=q('#addStudent');if(add)add.style.display=canPupils?'':'none';const imp=q('#importBtn');if(imp)imp.style.display=canPupils?'':'none';const saveBtn=q('#saveGrades');if(saveBtn)saveBtn.style.display=canGrades?'':'none';qa('.mark,.mobile-mark').forEach(x=>x.disabled=!canGrades);['#subjectsBtn','#inviteBtn','#settingsBtn','#structureBtn','#printHeaderBtn','#evaluationBtn'].forEach(s=>{const x=q(s);if(x)x.style.display=admin?'':'none'});const ct=q('#classTop');if(ct&&currentUser.role==='teacher'){ct.disabled=(state?.classes?.length||0)<2;ct.setAttribute('aria-label',tr('الأقسام المشتركة','Classes partagées'));if(!q('#sharedClassesLabel')){const lab=document.createElement('span');lab.id='sharedClassesLabel';lab.className='shared-classes-label';lab.textContent=tr('الأقسام المشتركة','Classes partagées');ct.parentNode?.insertBefore(lab,ct)}else q('#sharedClassesLabel').textContent=tr('الأقسام المشتركة','Classes partagées')}else q('#sharedClassesLabel')?.remove();const current=qa('.view').find(v=>!v.classList.contains('hidden'))?.dataset.page;if((current==='grades'&&!canGrades)||(current==='students'&&!canPupils)||(current==='reports'&&!canReports))setView('home')}
try{const old=applyPermissions;applyPermissions=function(){try{old()}catch{}enforcePermissions()}}catch{}
try{const oldSave=save;save=async function(silent=false){const p=new Set(currentUser?.permissions||[]),readOnly=currentUser?.role==='teacher'&&!p.has('grades')&&!p.has('pupils');if(readOnly){localStorage.setItem('nataiji-data',JSON.stringify(state));const s=q('#saveState');if(s){s.textContent=tr('حساب للعرض فقط','Compte en lecture seule');s.classList.remove('dirty')}return}return oldSave(silent)}}catch{}
function patchProfileRole(){
 const small=q('#teacherName small');if(!small||!currentUser)return;
 if(currentUser.role==='admin'){small.textContent=tr('مدير / صلاحيات كاملة','Directeur / Accès complet');return}
 const p=new Set(currentUser.permissions||[]),parts=[];
 if(p.has('grades'))parts.push(tr('إدخال النتائج','Saisie des notes'));
 if(p.has('pupils'))parts.push(tr('إدارة التلاميذ','Gestion des élèves'));
 if(p.has('reports'))parts.push(tr('التقارير','Rapports'));
 small.textContent=tr('معلم','Enseignant')+(parts.length?' / '+parts.join(' + '):'');
}
function bindLogout(){const b=q('#logoutBtn');if(!b||b.dataset.auth2Logout)return;b.dataset.auth2Logout='1';b.onclick=async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}localStorage.removeItem('nataiji-data');localStorage.removeItem('nataiji-active-user');currentUser=null;lastStatus=null;await renderAuth('login')}}
function patchOfficialWording(root=document){qa('.doc-republic .doc-line',root).forEach(line=>{const sp=q('span',line),b=q('b',line);if(!sp||!b)return;const t=sp.textContent;if(/الإدارة الجهوية|Direction régionale/i.test(t)){sp.textContent=fr()?'Direction régionale de l’Éducation – Wilaya de':'الإدارة الجهوية بولاية';b.textContent=b.textContent.replace(/^\s*(ولاية|Wilaya(?:\s+de)?)\s*/i,'')}else if(/المفتشية|Inspection/i.test(t)){sp.textContent=fr()?'Inspection – Moughataa de':'المفتشية بمقاطعة';b.textContent=b.textContent.replace(/^\s*(مقاطعة|Moughataa(?:\s+de)?)\s*/i,'')}})}
function patchSettingsModal(){const r=q('#wf-sr'),i=q('#wf-si');if(r){const l=r.closest('label'),p=l?.querySelector('.workflow-prefix span');if(l?.firstChild)l.firstChild.nodeValue=tr('الإدارة الجهوية بولاية','Direction régionale de l’Éducation – Wilaya de');if(p)p.style.display='none'}if(i){const l=i.closest('label'),p=l?.querySelector('.workflow-prefix span');if(l?.firstChild)l.firstChild.nodeValue=tr('المفتشية بمقاطعة','Inspection – Moughataa de');if(p)p.style.display='none'}}
const css=document.createElement('style');css.id='auth-access-v2-style';css.textContent=`.auth2-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#edf4f8;padding:5px;border-radius:12px;margin:16px 0}.auth2-tabs button{border:0;background:transparent;padding:11px 6px;border-radius:9px;font-weight:700;color:#50677a}.auth2-tabs button.on{background:#fff;color:#1288dd;box-shadow:0 1px 4px #0001}.auth2-link{border:0;background:transparent;color:#1288dd;font-weight:700;padding:8px;cursor:pointer}.auth2-note{font-size:12px;color:#718392;line-height:1.55}.auth2-success{color:#147a46!important}.auth2-perms{display:grid;gap:10px;border:1px solid #d6e1e8;border-radius:10px;padding:12px}.auth2-perms label{display:flex!important;align-items:center;gap:8px}.auth2-perms input{width:auto!important}.auth2-code-copy{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:10px 0}.auth2-code-copy input{font-size:22px!important;font-weight:900!important;letter-spacing:2px!important;text-align:center!important;background:#f7fbff!important;border:2px solid #b9d9ef!important;color:#0877b8!important}.auth2-code-copy button{border:0;border-radius:10px;background:#1288dd;color:#fff;font-weight:800;padding:12px 16px}.auth2-school-row{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:start;padding:13px;margin:7px 0;border:1px solid #d6e1e8;border-radius:12px;background:#fff}.auth2-school-row.active{border-color:#1288dd;background:#f1f9ff}.auth2-school-row span{display:grid;gap:3px}.auth2-school-row small,.auth2-school-row em{font-size:12px;color:#64748b;font-style:normal}.auth2-subjects,.auth2-shared-classes{margin-top:12px;border:1px solid #d6e1e8;border-radius:10px;padding:12px}.auth2-class-access{border:1px solid #e2e8f0;border-radius:10px;padding:9px;margin:8px 0}.auth2-class-toggle{display:flex!important;gap:8px;align-items:center}.auth2-class-toggle input{width:auto!important}.auth2-class-scope{display:none;margin-top:9px;padding-top:8px;border-top:1px solid #edf2f7}.auth2-class-scope.enabled{display:grid;gap:8px}.shared-classes-label{font-size:11px;font-weight:800;color:#1288dd;align-self:center;white-space:nowrap}.auth2-subject-scope{display:grid;gap:9px}.auth2-inline{display:flex!important;align-items:center;gap:8px}.auth2-inline input{width:auto!important}.auth2-subject-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;opacity:.45;margin-top:5px}.auth2-subject-list.enabled{opacity:1}.auth2-subject-list label{display:flex!important;align-items:center;gap:7px;border:1px solid #e2e8f0;border-radius:8px;padding:8px}.auth2-subject-list input{width:auto!important}.auth2-subject-list small{display:block;color:#718392;margin-inline-start:auto}.workflow-prefix span[style*="display: none"]{display:none!important}@media(max-width:520px){.auth2-tabs button{font-size:12px;padding:10px 3px}.auth2-subject-list{grid-template-columns:1fr}}`;
document.head.appendChild(css);
let timer;function refreshAll(){const legacy=q('#joinCodeBtn');if(legacy)legacy.remove();bindSchools();bindJoinCard();bindInvite();bindShares();bindLogout();enforcePermissions();patchProfileRole();patchOfficialWording();patchSettingsModal();bindUnifiedClassSelector()}
new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refreshAll,35)}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('beforeprint',()=>patchOfficialWording());
window.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{renderAuth('login').catch(()=>{});refreshAll()},80)});
setInterval(()=>{const l=lang();if(l!==lastLang){lastLang=l;if(q('.auth-gate'))renderAuth(authMode,true);setTimeout(refreshAll,20)}},250);
setTimeout(refreshAll,0);
})();
