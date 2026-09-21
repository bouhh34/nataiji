(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>localStorage.getItem('nataiji-lang')||'ar',fr=()=>lang()==='fr';
const tr=(ar,ff)=>fr()?ff:ar;
const stableText=(el,value)=>{if(el&&el.textContent!==String(value??''))el.textContent=String(value??'')};
const stableMarkup=(el,value)=>{if(el&&el.__authMarkup!==value){el.__authMarkup=value;el.innerHTML=value}};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const within=(promise,ms)=>Promise.race([Promise.resolve(promise),wait(ms).then(()=>{throw new Error('request_timeout')})]);
const esc3=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let authMode='login',lastStatus=null,lastLang=lang();
function authErr(code){return({bad_credentials:tr('البريد الإلكتروني أو كلمة المرور غير صحيحة','Adresse e-mail ou mot de passe incorrect'),account_suspended:tr('هذا الحساب موقوف مؤقتًا. تواصل مع إدارة نتائجي.','Ce compte est temporairement suspendu. Contactez l’administration de Nataiji.'),invalid_input:tr('تحقق من الحقول. كلمة المرور 8 أحرف على الأقل','Vérifiez les champs. Le mot de passe doit contenir au moins 8 caractères'),invalid_invite:tr('رمز الدعوة غير صحيح أو انتهت صلاحيته','Le code d’invitation est invalide ou expiré'),email_exists:tr('هذا البريد مستخدم مسبقًا','Cette adresse e-mail est déjà utilisée'),invalid_or_expired_reset:tr('رابط أو رمز الاستعادة غير صالح أو انتهت صلاحيته','Le lien ou code de réinitialisation est invalide ou expiré'),email_service_unconfigured:tr('خدمة البريد غير متاحة الآن؛ تواصل مع الإدارة للحصول على رمز استعادة','Le service e-mail est indisponible ; contactez l’administration pour obtenir un code'),email_delivery_failed:tr('تعذر إرسال رسالة الاستعادة الآن','Impossible d’envoyer l’e-mail de réinitialisation pour le moment'),account_login_required:tr('سجّل الدخول إلى حسابك أولًا ثم أضف رمز المشاركة من داخل الحساب','Connectez-vous d’abord à votre compte puis ajoutez le code de partage'),cannot_attach_own_invite:tr('لا يمكنك إضافة رمز مشاركة أنشأته من حسابك نفسه','Vous ne pouvez pas utiliser votre propre code de partage'),invite_in_use:tr('تم استخدام رمز المشاركة مسبقًا','Ce code de partage a déjà été utilisé'),shared_access_revoked:tr('تم إلغاء الوصول إلى هذا القسم','L’accès à cette classe a été retiré'),too_many_requests:tr('محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة','Trop de tentatives. Attendez un moment puis réessayez'),cross_site_request_blocked:tr('تم رفض الطلب لأسباب أمنية','Requête refusée pour des raisons de sécurité')}[code]||tr('تعذر إتمام العملية. حاول مرة أخرى','Impossible de terminer l’opération. Réessayez.'))}
function resetToken(){return new URLSearchParams(location.search).get('reset')||''}
function gate(){let g=q('.auth-gate');if(!g){g=document.createElement('div');g.className='auth-gate';document.body.appendChild(g)}return g}
function accountActivate(user){const prev=localStorage.getItem('nataiji-active-user');if(prev&&prev!==user.id)localStorage.removeItem('nataiji-data');localStorage.setItem('nataiji-active-user',user.id);currentUser=user;const g=q('.auth-gate');if(g)g.remove();document.documentElement.classList.add('nataiji-auth-ready');return startApp()}
function tabs(){return `<div class="auth2-tabs"><button data-auth2="login" class="${authMode==='login'?'on':''}">${tr('تسجيل الدخول','Connexion')}</button><button data-auth2="register" class="${authMode==='register'?'on':''}">${tr('إنشاء حساب','Créer un compte')}</button></div>`}
function loginForm(){return `<form class="auth-form auth2-form" id="auth2Form"><label>${tr('البريد الإلكتروني','Adresse e-mail')}<input name="email" type="email" autocomplete="email" required></label><label>${tr('كلمة المرور','Mot de passe')}<input name="password" type="password" autocomplete="current-password" required></label><button class="auth-submit">${tr('تسجيل الدخول','Se connecter')}</button><button type="button" class="auth2-link" id="forgotPassword">${tr('نسيت كلمة المرور؟','Mot de passe oublié ?')}</button><p class="auth-error"></p></form>`}
function registerForm(){return `<form class="auth-form auth2-form" id="auth2Form"><label>${tr('اسم المعلم','Nom de l’enseignant')}<input name="name" autocomplete="name" required></label><label>${tr('البريد الإلكتروني','Adresse e-mail')}<input name="email" type="email" autocomplete="email" required></label><label>${tr('كلمة المرور','Mot de passe')}<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><button class="auth-submit">${tr('إنشاء حساب مستقل','Créer un compte indépendant')}</button><p class="auth2-note">${tr('كل حساب جديد يبدأ فارغًا؛ أضف المدرسة والقسم والفصل والتلاميذ بعد الدخول.','Chaque nouveau compte commence vide ; ajoutez ensuite l’école, la classe, la période et les élèves.')}</p><p class="auth-error"></p></form>`}
function forgotForm(){return `<form class="auth-form auth2-form" id="auth2Form"><h2>${tr('استعادة كلمة المرور','Réinitialiser le mot de passe')}</h2><p>${tr('أدخل بريد حسابك لإرسال رابط الاستعادة، أو استخدم رمزًا حصلت عليه من الإدارة.','Saisissez votre e-mail pour recevoir un lien, ou utilisez un code fourni par l’administration.')}</p><label>${tr('البريد الإلكتروني','Adresse e-mail')}<input name="email" type="email" autocomplete="email"></label><button class="auth-submit">${tr('إرسال رابط الاستعادة','Envoyer le lien de réinitialisation')}</button><div class="auth2-recovery-divider"><span>${tr('أو','ou')}</span></div><label>${tr('رمز الاستعادة','Code de récupération')}<input name="code" dir="ltr" placeholder="NT-XXXXXXXX" autocomplete="one-time-code"></label><label>${tr('كلمة المرور الجديدة','Nouveau mot de passe')}<input name="newPassword" type="password" minlength="8" autocomplete="new-password"></label><button type="button" class="auth2-code-reset" id="resetWithCode">${tr('تغيير كلمة المرور بالرمز','Modifier avec le code')}</button><div class="auth2-help"><span>${tr('لم تستطع استعادة الحساب؟','Impossible de récupérer le compte ?')}</span><a target="_blank" rel="noopener" href="https://wa.me/22234280062?text=${encodeURIComponent(tr('السلام عليكم، فقدت كلمة مرور حسابي في تطبيق نتائجي.','Bonjour, j’ai perdu le mot de passe de mon compte Nataiji.'))}">WhatsApp</a><a href="mailto:bahmedou596@gmail.com?subject=${encodeURIComponent('Nataiji - Password recovery')}">Email</a></div><button type="button" class="auth2-link" id="backLogin">${tr('العودة لتسجيل الدخول','Retour à la connexion')}</button><p class="auth-error"></p></form>`}
function resetForm(token){return `<form class="auth-form auth2-form" id="auth2Form"><h2>${tr('كلمة مرور جديدة','Nouveau mot de passe')}</h2><label>${tr('كلمة المرور الجديدة','Nouveau mot de passe')}<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>${tr('تأكيد كلمة المرور','Confirmer le mot de passe')}<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label><button class="auth-submit">${tr('حفظ كلمة المرور','Enregistrer le mot de passe')}</button><input type="hidden" name="token" value="${esc3(token)}"><p class="auth-error"></p></form>`}
function shell(){const token=resetToken(),body=token?resetForm(token):(authMode==='register'?registerForm():authMode==='forgot'?forgotForm():loginForm());return `<div class="auth-box auth2-box"><div class="auth-brand"><div class="mark auth2-app-logo"><img src="/nataiji-brand-mark.png" alt="${tr('شعار نتائجي','Logo Nataiji')}" width="82" height="82"></div><h1>${tr('نتائجي','Nataiji')}</h1><p>${tr('نظام النتائج المدرسية','Système de résultats scolaires')}</p></div>${token?'':(authMode==='forgot'?'':tabs())}${body}${token?'':`<a class="auth2-download" href="/download.html">${tr('تحميل التطبيق للهاتف','Télécharger l’application')}</a>`}<div class="auth-storage"><span class="server-badge ${storageMode==='redis'||storageMode==='postgres'?'':'local'}">${storageMode==='postgres'?tr('تخزين آمن على قاعدة البيانات','Stockage sécurisé sur base de données'):storageMode==='redis'?tr('متصل بخادم البيانات','Connecté au serveur de données'):tr('وضع تخزين مؤقت','Mode de stockage temporaire')}</span></div></div>`}
async function renderAuth(mode='login',force=false){authMode=mode||'login';let status=lastStatus;if(!status||!force){try{status=await within(api('/api/auth/status'),4500);lastStatus=status;storageMode=status.storage||storageMode}catch{status={user:null,storage:'memory'};storageMode='memory'}}if(status.user&&!resetToken()&&!['register','forgot'].includes(authMode))return accountActivate(status.user);const g=gate();g.innerHTML=shell();bindAuth(g,status);document.documentElement.classList.add('nataiji-auth-ready');return null}
function bindAuth(g,status){qa('[data-auth2]',g).forEach(b=>b.onclick=()=>renderAuth(b.dataset.auth2,true));const back=q('#backLogin',g);if(back)back.onclick=()=>renderAuth('login',true);const forgot=q('#forgotPassword',g);if(forgot)forgot.onclick=()=>renderAuth('forgot',true);const form=q('#auth2Form',g);if(!form)return;const codeBtn=q('#resetWithCode',form);if(codeBtn)codeBtn.onclick=async()=>{const err=q('.auth-error',form),code=form.elements.code.value.trim(),password=form.elements.newPassword.value;codeBtn.disabled=true;err.textContent='';try{await api('/api/auth/reset-with-code',{method:'POST',body:JSON.stringify({code,password})});authMode='login';lastStatus=null;await renderAuth('login',true);const e2=q('.auth-error');if(e2){e2.className='auth-error auth2-success';e2.textContent=tr('تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.','Mot de passe modifié. Vous pouvez maintenant vous connecter.')}}catch(ex){err.textContent=authErr(ex.code)}finally{codeBtn.disabled=false}};form.onsubmit=async e=>{e.preventDefault();const btn=q('.auth-submit',form),err=q('.auth-error',form),fd=Object.fromEntries(new FormData(form));btn.disabled=true;err.textContent='';try{if(resetToken()){if(fd.password!==fd.confirm){err.textContent=tr('كلمتا المرور غير متطابقتين','Les mots de passe ne correspondent pas');return}await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({token:fd.token,password:fd.password})});history.replaceState({},'',location.pathname);lastStatus=null;authMode='login';await renderAuth('login');const e2=q('.auth-error');if(e2){e2.className='auth-error auth2-success';e2.textContent=tr('تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.','Mot de passe modifié. Vous pouvez maintenant vous connecter.')}return}if(authMode==='forgot'){if(!fd.email){err.textContent=tr('أدخل البريد الإلكتروني أو استخدم رمز الاستعادة','Saisissez l’e-mail ou utilisez le code de récupération');return}await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({email:fd.email,lang:lang()})});err.className='auth-error auth2-success';err.textContent=tr('إذا كان البريد مسجلًا فستصلك رسالة الاستعادة خلال لحظات.','Si cette adresse est enregistrée, vous recevrez le message de réinitialisation dans quelques instants.');return}let r;if(authMode==='register'){r=await api('/api/auth/register',{method:'POST',body:JSON.stringify(fd)})}else r=await api('/api/auth/login',{method:'POST',body:JSON.stringify(fd)});lastStatus=null;await accountActivate(r.user)}catch(ex){err.textContent=authErr(ex.code)}finally{btn.disabled=false}}}
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
    <label class="auth2-inline"><input type="radio" name="scope-${esc3(cls.id)}" value="selected" checked> ${tr('تعديل مواد محددة','Modifier certaines matières')}</label>
    <label class="auth2-inline"><input type="radio" name="scope-${esc3(cls.id)}" value="full"> ${tr('صلاحيات كاملة للقسم','Accès complet à la classe')}</label>
    <p class="auth2-note">${tr('المواد غير المحددة تبقى ظاهرة للقراءة. ويمكن إخفاؤها عند الحاجة.','Les matières non sélectionnées restent visibles en lecture seule. Vous pouvez aussi les masquer.')}</p>
    <div class="auth2-subject-list">${subs.map(s=>`<div class="auth2-subject-perm" data-subject-id="${esc3(s.id)}"><span>${esc3(s.name)}${s.fr?`<small dir="ltr">${esc3(s.fr)}</small>`:''}</span><select class="auth2-subject-mode"><option value="view">${tr('عرض فقط','Lecture')}</option><option value="edit">${tr('تعديل','Modifier')}</option><option value="hide">${tr('إخفاء','Masquer')}</option></select></div>`).join('')||`<p class="auth2-note">${tr('لا توجد مواد محفوظة لهذا القسم بعد.','Aucune matière enregistrée pour cette classe.')}</p>`}</div>
   </div>
 </section>`
}
function bindClassAccess(p){
 const syncCard=card=>{
  const on=q('.auth2-share-class',card)?.checked,scope=q('.auth2-class-scope',card),full=q('input[type="radio"][value="full"]:checked',card);
  scope?.classList.toggle('enabled',!!on);qa('.auth2-class-scope input,.auth2-class-scope select',card).forEach(x=>x.disabled=!on||!!full&&x.classList.contains('auth2-subject-mode'));
 };
 qa('.auth2-class-access',p).forEach(card=>{q('.auth2-share-class',card).onchange=()=>syncCard(card);qa('input[type="radio"]',card).forEach(x=>x.onchange=()=>syncCard(card));syncCard(card)})
}
function inviteModal2(){
 if(currentUser?.role!=='admin')return;
 const s=state||{},classes=Array.isArray(s.classes)&&s.classes.length?s.classes:[],initial=s.activeClassId;
 const p=modal(tr('دعوة معلم','Inviter un enseignant'),`<p>${tr('حدّد القسم ثم اختر لكل مادة: عرض فقط، تعديل، أو إخفاء. ويمكن منح صلاحيات كاملة للقسم.','Choisissez la classe puis, pour chaque matière : lecture, modification ou masquage. Vous pouvez aussi accorder un accès complet.')}</p>
 <label>${tr('اسم المعلم','Nom de l’enseignant')}<input id="auth2TeacherName" autocomplete="name" placeholder="${tr('مثال: محمد أحمد','Ex. Mohamed Ahmed')}"></label>
 <fieldset class="auth2-shared-classes"><legend>${tr('الأقسام المشتركة','Classes partagées')}</legend>${classes.map(cls=>classAccessCard(cls,cls.id===initial)).join('')||`<p class="auth2-note">${tr('أضف قسمًا أولًا.','Ajoutez d’abord une classe.')}</p>`}</fieldset>
 <fieldset class="auth2-perms"><legend>${tr('الصلاحيات','Autorisations')}</legend><label><input type="checkbox" value="grades" checked> ${tr('إدخال وتعديل الدرجات','Saisir et modifier les notes')}</label><label><input type="checkbox" value="pupils"> ${tr('إدارة تلاميذ الأقسام المشتركة','Gérer les élèves des classes partagées')}</label><label><input type="checkbox" value="reports"> ${tr('عرض وطباعة التقارير','Afficher et imprimer les rapports')}</label></fieldset>
 <button class="primary action">${tr('إنشاء رمز الدعوة','Créer le code d’invitation')}</button><div class="invite-code"></div><p class="message"></p>`);
 p.classList.add('auth2-invite');bindClassAccess(p);
 q('.action',p).onclick=async()=>{
  const permissions=qa('.auth2-perms input:checked',p).map(x=>x.value),msg=q('.message',p),teacherName=q('#auth2TeacherName',p).value.trim(),classAccess={};
  qa('.auth2-class-access',p).forEach(card=>{
   if(!q('.auth2-share-class',card)?.checked)return;
   const classId=card.dataset.classId,fullClass=q('input[type="radio"]:checked',card)?.value==='full',subjectIds=[],hiddenSubjectIds=[];
   qa('.auth2-subject-perm',card).forEach(row=>{const id=row.dataset.subjectId,mode=q('.auth2-subject-mode',row)?.value;if(mode==='edit')subjectIds.push(id);else if(mode==='hide')hiddenSubjectIds.push(id)});
   classAccess[classId]={allSubjects:fullClass,fullClass,subjectIds,hiddenSubjectIds}
  });
  if(!teacherName){msg.textContent=tr('اكتب اسم المعلم','Saisissez le nom de l’enseignant');return}
  if(!permissions.length){msg.textContent=tr('اختر صلاحية واحدة على الأقل','Sélectionnez au moins une autorisation');return}
  if(!Object.keys(classAccess).length){msg.textContent=tr('اختر قسمًا واحدًا على الأقل وحدد مواده','Sélectionnez au moins une classe et ses matières');return}
  q('.action',p).disabled=true;
  try{
   const rr=await api('/api/invites',{method:'POST',body:JSON.stringify({teacherName,permissions,classAccess})});
   const names=(rr.classes||[]).map(x=>esc3(x.name)).join('، ');
   q('.invite-code',p).innerHTML=`<small>${tr('رمز مشاركة القسم','Code de partage de classe')}</small><div class="auth2-code-copy"><input id="auth2InviteCode" dir="ltr" readonly value="${esc3(rr.code)}"><button type="button" id="auth2CopyInvite">${tr('نسخ الرمز','Copier')}</button></div><p><b>${esc3(rr.teacherName)}</b><br>${tr('الأقسام المشتركة','Classes partagées')}: ${names}<br>${tr('سيشاهد مواد القسم المسموح بعرضها، ولن يستطيع تعديل إلا المواد التي منحتها له.','L’enseignant verra les matières autorisées et ne pourra modifier que celles que vous lui avez accordées.')}<br>${tr('على المعلم تسجيل الدخول إلى حسابه أولًا، ثم إضافة هذا الرمز من داخل الحساب.','L’enseignant doit d’abord se connecter à son propre compte, puis ajouter ce code depuis son compte.')}</p>`;
   const input=q('#auth2InviteCode',p),copy=q('#auth2CopyInvite',p);input.onclick=()=>input.select();copy.onclick=()=>copyInviteCode(rr.code,input,copy)
  }catch(ex){msg.textContent=authErr(ex.code)}finally{q('.action',p).disabled=false}
 }
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
 const p=modal(tr('المشاركات','Partages'),`<p>${tr('الأقسام التي شاركتها مع الآخرين. راجع الصلاحيات بدقة ويمكنك إلغاء الوصول فورًا دون حذف أي بيانات مدرسية.','Classes partagées avec d’autres personnes. Vérifiez précisément les autorisations et retirez l’accès immédiatement sans supprimer les données scolaires.')}</p><p class="auth2-share-status" aria-live="polite"></p><div id="auth2Shares"><p class="message">${tr('جارٍ التحميل…','Chargement…')}</p></div>`);
 const permissionBadge=(ok,yes,no)=>`<span class="auth2-access-badge ${ok?'on':'off'}">${ok?yes:no}</span>`;
 const names=rows=>(rows||[]).map(x=>x.name||x.nameFr||'').filter(Boolean);
 const revokeConfirm=(grant,onDone)=>{
  const who=grant.recipientName||grant.teacherName||tr('المعلم','Enseignant'),cp=modal(tr('تأكيد إلغاء الوصول','Confirmer le retrait'),`<div class="auth2-revoke-confirm"><p>${tr('سيتم إلغاء وصول','L’accès de')} <b>${esc3(who)}</b> ${tr('فورًا من جميع الأقسام والمواد المشتركة في هذه المشاركة.','sera retiré immédiatement de toutes les classes et matières de ce partage.')}</p><p class="auth2-note">${tr('لن تُحذف أي درجات أو تلاميذ أو بيانات من المدرسة.','Aucune note, aucun élève et aucune donnée scolaire ne sera supprimé.')}</p><div class="auth2-revoke-actions"><button type="button" class="danger auth2-confirm-revoke">${tr('تأكيد إلغاء الوصول','Confirmer le retrait')}</button><button type="button" class="auth2-cancel-revoke">${tr('رجوع','Retour')}</button></div><p class="message"></p></div>`);
  q('.auth2-cancel-revoke',cp).onclick=()=>cp.remove();
  q('.auth2-confirm-revoke',cp).onclick=async()=>{
   const btn=q('.auth2-confirm-revoke',cp),msg=q('.message',cp);btn.disabled=true;msg.textContent=tr('جارٍ إلغاء الوصول…','Retrait de l’accès…');
   try{await api('/api/shares/'+encodeURIComponent(grant.grantId),{method:'DELETE'});cp.remove();await onDone(who)}
   catch(ex){msg.textContent=authErr(ex.code);btn.disabled=false}
  }
 };
 const draw=async()=>{
  const r=await api('/api/shares'),box=q('#auth2Shares',p),grants=r.grants||[];
  box.innerHTML=grants.map((g,gi)=>{
   const perms=new Set(g.permissions||[]),details=Array.isArray(g.classDetails)?g.classDetails:[],fallbackIds=Object.keys(g.classAccess||{});
   const classHtml=(details.length?details:fallbackIds.map(id=>({id,name:id,editSubjects:[],viewSubjects:[],hiddenSubjects:[],fullClass:!!g.classAccess?.[id]?.fullClass}))).map(d=>{
    const edit=names(d.editSubjects),view=names(d.viewSubjects),hidden=names(d.hiddenSubjects),grades=perms.has('grades');
    const gradeText=!grades?tr('الدرجات: غير مسموح','Notes : non autorisées'):d.fullClass?tr('الدرجات: تعديل جميع المواد','Notes : modification de toutes les matières'):edit.length?tr('الدرجات: تعديل ','Notes : modification ')+edit.length+tr(' مادة',' matière(s)'):tr('الدرجات: عرض فقط','Notes : lecture seule');
    const materialDetails=(edit.length||hidden.length||(view.length&&grades))?`<details class="auth2-share-details"><summary>${tr('عرض تفاصيل المواد','Voir le détail des matières')}</summary><div class="auth2-share-detail-body">${edit.length?`<p><strong>${tr('مواد قابلة للتعديل:','Matières modifiables :')}</strong> ${esc3(edit.join('، '))}</p>`:''}${hidden.length?`<p><strong>${tr('مواد مخفية:','Matières masquées :')}</strong> ${esc3(hidden.join('، '))}</p>`:''}${view.length&&grades?`<p><strong>${tr('عرض فقط:','Lecture seule :')}</strong> ${esc3(view.join('، '))}</p>`:''}</div></details>`:'';
    return `<div class="auth2-share-class-detail"><div class="auth2-share-class-head"><b>${esc3(d.name||d.code||tr('قسم','Classe'))}</b>${d.nameFr?`<small dir="ltr">${esc3(d.nameFr)}</small>`:''}</div><div class="auth2-share-class-badges">${permissionBadge(grades,esc3(gradeText),esc3(gradeText))}${permissionBadge(perms.has('pupils'),tr('التلاميذ: مسموح','Élèves : autorisés'),tr('التلاميذ: غير مسموح','Élèves : non autorisés'))}${permissionBadge(perms.has('reports'),tr('التقارير: مسموح','Rapports : autorisés'),tr('التقارير: غير مسموح','Rapports : non autorisés'))}</div>${materialDetails}</div>`
   }).join('');
   return `<article class="auth2-share-audit-card" data-grant-index="${gi}"><header><div><b>${esc3(g.recipientName||g.teacherName||tr('معلم','Enseignant'))}</b><small>${esc3(g.schoolName||'')} · ${details.length||fallbackIds.length} ${tr('قسم','classe(s)')}</small></div><button type="button" class="danger auth2-revoke" data-index="${gi}">${tr('إلغاء الوصول','Retirer l’accès')}</button></header><div class="auth2-share-classes">${classHtml}</div></article>`
  }).join('')||`<p class="auth2-note">${tr('لا توجد مشاركات نشطة.','Aucun partage actif.')}</p>`;
  qa('.auth2-revoke',box).forEach(b=>b.onclick=()=>{const grant=grants[Number(b.dataset.index)];if(!grant)return;revokeConfirm(grant,async who=>{const status=q('.auth2-share-status',p);if(status){status.textContent=tr('✓ تم إلغاء وصول ','✓ Accès retiré pour ')+who;status.classList.add('ok')}await draw()})})
 };
 await draw()
}
function bindShares(){
 const grid=q('.settings-grid');if(!grid)return;let b=q('#sharesBtn');if(currentUser?.baseRole!=='admin'||currentUser?.activeSharedGrant){b?.remove();return}
 if(!b){b=document.createElement('button');b.id='sharesBtn';b.className='menu-card';grid.insertBefore(b,q('#inviteBtn')?.nextSibling||q('#settingsBtn')||null)}
 stableMarkup(b,`<b>🔗 ${tr('المشاركات','Partages')}</b><span>${tr('عرض من لديه وصول وإلغاء الصلاحية عند الحاجة','Voir les accès accordés et les retirer si nécessaire')}</span>`);b.onclick=sharesModal
}
let workspaceSelectorRun=0,workspaceSelectorTimer=null;
function workspaceStamp(){const cls=(state?.classes||[]).map(x=>String(x?.id||'')+':'+String(x?.name||'')).join(',');return [currentUser?.id||'',currentUser?.schoolId||'',currentUser?.activeSharedGrant||'',state?.activeClassId||'',lang(),cls].join('|')}
async function bindUnifiedClassSelector(){
 const sel=q('#classTop');if(!sel||!currentUser)return;
 const run=++workspaceSelectorRun;
 sel.dataset.nataijiWorkspaceLoading='1';
 try{
  const r=await api('/api/workspaces');if(!r||run!==workspaceSelectorRun)return;
  const options=[],owned=r.owned||[],shared=r.shared||[],seen=new Set();
  const add=x=>{const k=x.kind+'|'+x.id+'|'+x.classId;if(!x.classId||seen.has(k))return;seen.add(k);options.push(x)};
  for(const school of owned)for(const cls of school.classes||[])add({kind:'own',id:school.schoolId,classId:cls.id,label:(owned.length>1?school.schoolName+' — ':'')+(fr()?(cls.nameFr||cls.code||cls.name):cls.name),selected:!currentUser.activeSharedGrant&&school.active&&state?.activeClassId===cls.id});
  for(const grant of shared)for(const cls of grant.classes||[])add({kind:'shared',id:grant.grantId,classId:cls.id,label:(grant.schoolName||tr('مدرسة','École'))+' — '+(fr()?(cls.nameFr||cls.code||cls.name):cls.name)+' — '+(grant.ownerName||tr('المعلم المالك','Enseignant propriétaire')),selected:currentUser.activeSharedGrant===grant.grantId&&state?.activeClassId===cls.id});
  // State is the fallback truth for the current workspace. This prevents an empty
  // workspace response or a repair race from erasing a class that is already loaded.
  const localClasses=(state?.classes||[]).filter(x=>x?.id);
  if(localClasses.length){
   if(currentUser.activeSharedGrant){
    const g=shared.find(x=>x.grantId===currentUser.activeSharedGrant)||currentUser.sharedGrants?.[currentUser.activeSharedGrant]||{};
    for(const cls of localClasses)add({kind:'shared',id:currentUser.activeSharedGrant,classId:cls.id,label:(g.schoolName||tr('مدرسة','École'))+' — '+(fr()?(cls.nameFr||cls.code||cls.name||state.classNameFr||state.className):(cls.name||state.className||tr('القسم الحالي','Classe actuelle')))+' — '+(g.ownerName||tr('المعلم المالك','Enseignant propriétaire')),selected:state?.activeClassId===cls.id})
   }else{
    const school=owned.find(x=>x.active)||owned.find(x=>x.schoolId===currentUser.schoolId);
    if(school)for(const cls of localClasses)add({kind:'own',id:school.schoolId,classId:cls.id,label:(owned.length>1?school.schoolName+' — ':'')+(fr()?(cls.nameFr||cls.code||cls.name||state.classNameFr||state.className):(cls.name||state.className||tr('القسم الحالي','Classe actuelle'))),selected:state?.activeClassId===cls.id})
   }
  }
  if(run!==workspaceSelectorRun)return;
  if(!options.length){
   window.nataijiUnifiedClassSelector=false;window.nataijiWorkspaceSelectorReady=false;
   delete sel.dataset.nataijiWorkspaceReady;delete sel.dataset.nataijiWorkspaceStamp;delete sel.dataset.nataijiWorkspaceLoading;
   window.nataijiRenderCoreSelectors?.();window.nataijiRefreshSelectors?.();return
  }
  const currentValue=sel.value;
  window.nataijiUnifiedClassSelector=true;window.nataijiWorkspaceSelectorReady=true;sel.dataset.nataijiWorkspaceReady='1';
  sel.innerHTML='';
  const addGroup=(label,kind)=>{const rows=options.filter(x=>x.kind===kind);if(!rows.length)return;const g=document.createElement('optgroup');g.label=label;for(const x of rows){const o=document.createElement('option');o.value=x.kind+'|'+x.id+'|'+x.classId;o.textContent=x.label;if(x.selected)o.selected=true;g.appendChild(o)}sel.appendChild(g)};
  addGroup(tr('أقسامي','Mes classes'),'own');addGroup(tr('الأقسام المشتركة معي','Classes partagées avec moi'),'shared');
  const preferred=String(window.__nataijiPendingClassId||state?.activeClassId||currentUser.preferredClassId||'');
  const pendingValue=String(sel.dataset.nataijiRequestedValue||'');
  const chosen=options.find(x=>(x.kind+'|'+x.id+'|'+x.classId)===pendingValue)||options.find(x=>x.classId===preferred&&(x.kind==='shared'?x.id===currentUser.activeSharedGrant:!currentUser.activeSharedGrant))||options.find(x=>x.selected)||options.find(x=>(x.kind+'|'+x.id+'|'+x.classId)===currentValue)||options[0];
  if(chosen)sel.value=chosen.kind+'|'+chosen.id+'|'+chosen.classId;
  sel.dataset.nataijiWorkspaceStamp=workspaceStamp();delete sel.dataset.nataijiWorkspaceLoading;
  sel.disabled=false;
  sel.onchange=async()=>{
   const requestedValue=sel.value;
   const previous=options.find(x=>(x.kind+'|'+x.id+'|'+x.classId)===sel.dataset.nataijiPrevious)||options.find(x=>x.selected)||chosen,[kind,id,classId]=requestedValue.split('|');
   sel.dataset.nataijiPrevious=previous?previous.kind+'|'+previous.id+'|'+previous.classId:'';
   sel.dataset.nataijiRequestedValue=requestedValue;
   sel.dataset.nataijiNavigationBusy='1';
   sel.setAttribute('aria-busy','true');
   sel.value=requestedValue;
   window.__nataijiPendingClassId=classId;
   try{
    if(kind==='shared'){
     if(currentUser.activeSharedGrant!==id){const rr=await api('/api/shared/switch',{method:'POST',body:JSON.stringify({grantId:id})});currentUser=rr.user;await accountActivate(currentUser);await window.nataijiSelectClass?.(classId)}
     else await window.nataijiSelectClass?.(classId);
    }else{
     if(currentUser.activeSharedGrant){const x=await api('/api/shared/switch',{method:'POST',body:JSON.stringify({grantId:''})});currentUser=x.user}
     if(currentUser.schoolId!==id){const x=await api('/api/schools/switch',{method:'POST',body:JSON.stringify({schoolId:id})});currentUser=x.user;await accountActivate(currentUser)}
     if(state?.activeClassId!==classId)await window.nataijiSelectClass?.(classId);
    }
    // Rebind once using the authoritative requested value after the new state is loaded.
    delete sel.dataset.nataijiNavigationBusy;
    await bindUnifiedClassSelector();
    const live=q('#classTop');
    if(live&&[...live.options].some(o=>o.value===requestedValue))live.value=requestedValue;
   }catch(e){
    console.error('workspace switch failed',e);
    if(previous)sel.value=previous.kind+'|'+previous.id+'|'+previous.classId
   }finally{
    const live=q('#classTop');
    if(live){
     live.removeAttribute('aria-busy');
     delete live.dataset.nataijiNavigationBusy;
     delete live.dataset.nataijiRequestedValue;
     live.disabled=false
    }
    delete window.__nataijiPendingClassId
   }
  };
 }catch(e){
  console.error('workspace selector load failed',e);
  if(run===workspaceSelectorRun){window.nataijiUnifiedClassSelector=false;window.nataijiWorkspaceSelectorReady=false;delete sel.dataset.nataijiWorkspaceReady;delete sel.dataset.nataijiWorkspaceStamp;delete sel.dataset.nataijiWorkspaceLoading;window.nataijiRenderCoreSelectors?.();window.nataijiRefreshSelectors?.()}
 }
}
function scheduleUnifiedSelector(force=false){
 const sel=q('#classTop');if(!sel||!currentUser)return;
 if(sel.dataset.nataijiNavigationBusy==='1')return;
 if(!force&&sel.dataset.nataijiWorkspaceStamp===workspaceStamp())return;
 clearTimeout(workspaceSelectorTimer);
 workspaceSelectorTimer=setTimeout(()=>bindUnifiedClassSelector(),20);
}
function ownerOverviewModal(){
 const x=document.createElement('div');x.className='modal owner-overview-modal';x.innerHTML=`<div class="modal-card"><div class="modal-head"><div><small class="owner-eyebrow">NATAIJI CONTROL</small><h2>${tr('إدارة المنصة','Administration de la plateforme')}</h2></div><button class="x" aria-label="${tr('إغلاق','Fermer')}">×</button></div><div class="owner-loading">${tr('جارٍ تحميل الملخص الآمن…','Chargement de la vue d’ensemble sécurisée…')}</div></div>`;document.body.appendChild(x);x.querySelector('.x').onclick=()=>x.remove();x.onclick=e=>{if(e.target===x)x.remove()};
 const load=()=>api('/api/owner/overview').then(r=>{const s=r.stats||{},labels=[['users','الحسابات','Comptes'],['schools','المدارس','Écoles'],['schoolAdmins','مديرو المدارس','Directeurs'],['teachers','المعلمون','Enseignants']],host=x.querySelector('.owner-loading,.owner-content');if(!host)return;host.outerHTML=`<div class="owner-content"><div class="owner-stats">${labels.map(([k,ar,ff])=>`<article><strong>${Number(s[k]||0)}</strong><span>${tr(ar,ff)}</span></article>`).join('')}</div><div class="owner-accounts"><h3>${tr('حسابات المنصة','Comptes de la plateforme')}</h3>${(r.accounts||[]).map(a=>`<article class="owner-account-row" data-account="${esc3(a.id)}"><span><b>${esc3(a.name||tr('دون اسم','Sans nom'))}</b><small dir="ltr">${esc3(a.email)}</small></span><div class="owner-account-meta"><em class="owner-role ${a.role}">${a.role==='owner'?tr('المدير العام','Super administrateur'):a.role==='teacher'?tr('معلم','Enseignant'):tr('مدير مدرسة','Directeur')}</em>${a.role!=='owner'?`<em class="owner-status ${a.suspended?'off':'on'}">${a.suspended?tr('موقوف','Suspendu'):tr('نشط','Actif')}</em>`:''}</div>${a.role!=='owner'?`<div class="owner-account-actions"><button data-action="${a.suspended?'activate':'suspend'}">${a.suspended?tr('تفعيل','Activer'):tr('تعطيل','Suspendre')}</button><button data-action="reset_code">${tr('رمز استعادة','Code de récupération')}</button><button class="danger" data-action="delete">${tr('حذف','Supprimer')}</button></div>`:''}</article>`).join('')||`<p>${tr('لا توجد حسابات بعد.','Aucun compte pour le moment.')}</p>`}</div></div>`;qa('.owner-account-actions button',x).forEach(b=>b.onclick=async()=>{const row=b.closest('.owner-account-row'),id=row.dataset.account,action=b.dataset.action;b.disabled=true;try{if(action==='delete'){if(!confirm(tr('سيُحذف الحساب ومدارسه وبياناته نهائيًا. هل أنت متأكد؟','Le compte, ses écoles et ses données seront définitivement supprimés. Continuer ?'))){b.disabled=false;return}await api('/api/owner/accounts/'+encodeURIComponent(id),{method:'DELETE',body:JSON.stringify({confirm:'DELETE'})});await load();return}const rr=await api('/api/owner/accounts/'+encodeURIComponent(id)+'/action',{method:'POST',body:JSON.stringify({action})});if(action==='reset_code'){modal(tr('رمز استعادة كلمة المرور','Code de récupération'),`<p>${tr('أرسل هذا الرمز لصاحب الحساب. صالح لمدة 30 دقيقة ويُستخدم مرة واحدة.','Envoyez ce code au titulaire. Il est valable 30 minutes et à usage unique.')}</p><div class="owner-reset-code" dir="ltr">${esc3(rr.code)}</div>`)}else await load()}catch(e){b.disabled=false;alert(authErr(e.code))}})}).catch(()=>{const el=x.querySelector('.owner-loading');if(el)el.textContent=tr('تعذر تحميل الملخص الآن.','Impossible de charger la vue d’ensemble pour le moment.')});load();
}
function bindOwnerDashboard(){
 const grid=q('.settings-grid');if(!grid)return;let b=q('#ownerDashboardBtn');
 if(!currentUser?.isSuperAdmin){b?.remove();document.body.classList.remove('nataiji-super-admin');return}
 document.body.classList.add('nataiji-super-admin');
 if(!b){b=document.createElement('button');b.id='ownerDashboardBtn';b.className='menu-card owner-card';grid.insertBefore(b,grid.firstChild)}
 stableMarkup(b,`<b><i>✦</i> ${tr('إدارة المنصة','Administration de la plateforme')} <small>SUPER ADMIN</small></b><span>${tr('نظرة شاملة آمنة على الحسابات والمدارس والصلاحيات','Vue d’ensemble sécurisée des comptes, écoles et autorisations')}</span>`);b.onclick=ownerOverviewModal
}
function bindSchools(){
 const grid=q('.settings-grid');if(!grid)return;let b=q('#schoolsBtn');
 if(currentUser?.baseRole!=='admin'||currentUser?.activeSharedGrant){b?.remove();return}
 if(!b){b=document.createElement('button');b.id='schoolsBtn';b.className='menu-card';grid.insertBefore(b,q('#structureBtn')||grid.firstChild)}
 stableMarkup(b,`<b>🏫 ${tr('مدارسي','Mes écoles')}</b><span>${tr('إضافة مدرسة أو الانتقال بين مدارس حسابك المستقلة','Ajouter une école ou changer d’espace scolaire indépendant')}</span>`);b.onclick=schoolsModal
}
function bindJoinCard(){
 const grid=q('.settings-grid');if(!grid)return;let btn=q('#joinInviteBtn');
 if(!currentUser){btn?.remove();return}
 if(!btn){btn=document.createElement('button');btn.id='joinInviteBtn';btn.className='menu-card';grid.insertBefore(btn,q('#settingsBtn')||q('#logoutBtn')||null)}
 stableMarkup(btn,`<b>⌁ ${tr('إضافة قسم مشترك برمز','Ajouter une classe partagée par code')}</b><span>${tr('أضف قسمًا أو مواد جديدة إلى حسابك الحالي دون تسجيل الخروج','Ajoutez une classe ou de nouvelles matières à votre compte sans vous déconnecter')}</span>`);
 btn.onclick=e=>{e.preventDefault();attachInviteModal()}
}
function bindInvite(){const b=q('#inviteBtn');if(!b)return;b.dataset.auth2Invite='1';b.onclick=e=>{e?.preventDefault?.();inviteModal2()}}
if(!window.__nataijiInviteClickGuard){
 window.__nataijiInviteClickGuard=true;
 document.addEventListener('click',e=>{
  const b=e.target?.closest?.('#inviteBtn');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  inviteModal2();
 },true)
}
function enforcePermissions(){if(!currentUser)return;const admin=currentUser.role==='admin'&&!currentUser.activeSharedGrant,perms=new Set(currentUser.permissions||[]),shared=!!currentUser.activeSharedGrant,scope=shared?(currentUser.classAccess?.[state?.activeClassId]||{}):{},full=!!scope.fullClass,canGrades=admin||perms.has('grades'),canPupils=admin||perms.has('pupils'),canReports=admin||perms.has('reports'),editable=new Set(full?(state?.subjects||[]).map(s=>String(s?.[4]||'')):(scope.subjectIds||[]).map(String));qa('[data-view="grades"]').forEach(x=>x.style.display=canGrades?'':'none');qa('[data-view="students"]').forEach(x=>x.style.display=canPupils?'':'none');qa('[data-view="reports"]').forEach(x=>x.style.display=canReports?'':'none');const add=q('#addStudent');if(add)add.style.display=canPupils?'':'none';const imp=q('#importBtn');if(imp)imp.style.display=canPupils?'':'none';const saveBtn=q('#saveGrades');if(saveBtn)saveBtn.style.display=canGrades?'':'none';qa('.mark,.mobile-mark').forEach(x=>{if(!shared){x.disabled=!canGrades;return}const j=Number(x.dataset?.subjectIndex??x.dataset?.j??-1),sid=String(state?.subjects?.[j]?.[4]||'');x.disabled=!full&&!editable.has(sid)});['#subjectsBtn','#inviteBtn','#settingsBtn','#structureBtn','#printHeaderBtn','#evaluationBtn'].forEach(s=>{const x=q(s);if(x)x.style.display=admin?'':'none'});const ct=q('#classTop');if(ct&&currentUser.activeSharedGrant){ct.disabled=false;ct.setAttribute('aria-label',tr('الأقسام المشتركة','Classes partagées'));if(!q('#sharedClassesLabel')){const lab=document.createElement('span');lab.id='sharedClassesLabel';lab.className='shared-classes-label';lab.textContent=tr('الأقسام المشتركة','Classes partagées');ct.parentNode?.insertBefore(lab,ct)}else q('#sharedClassesLabel').textContent=tr('الأقسام المشتركة','Classes partagées')}else q('#sharedClassesLabel')?.remove();const current=qa('.view').find(v=>!v.classList.contains('hidden'))?.dataset.page;if((current==='grades'&&!canGrades)||(current==='students'&&!canPupils)||(current==='reports'&&!canReports))setView('home')}
try{const old=applyPermissions;applyPermissions=function(){try{old()}catch{}enforcePermissions()}}catch{}
try{const oldSave=save;save=async function(silent=false){const p=new Set(currentUser?.permissions||[]),readOnly=currentUser?.role==='teacher'&&!p.has('grades')&&!p.has('pupils');if(readOnly){localStorage.setItem('nataiji-data',JSON.stringify(state));const s=q('#saveState');if(s){s.textContent=tr('حساب للعرض فقط','Compte en lecture seule');s.classList.remove('dirty')}return}return oldSave(silent)}}catch{}
function patchProfileRole(){
 const small=q('#teacherName small');if(!small||!currentUser)return;
 if(currentUser.isSuperAdmin&&!currentUser.activeSharedGrant){stableText(small,tr('المدير العام للمنصة','Super administrateur'));return}
 if(currentUser.role==='admin'&&!currentUser.activeSharedGrant){stableText(small,tr('معلم / أقسامي','Enseignant / Mes classes'));return}
 const p=new Set(currentUser.permissions||[]),parts=[];
 if(p.has('grades'))parts.push(tr('إدخال النتائج','Saisie des notes'));
 if(p.has('pupils'))parts.push(tr('إدارة التلاميذ','Gestion des élèves'));
 if(p.has('reports'))parts.push(tr('التقارير','Rapports'));
 stableText(small,tr('معلم','Enseignant')+(parts.length?' / '+parts.join(' + '):''));
}
function bindLogout(){const b=q('#logoutBtn');if(!b||b.dataset.auth2Logout)return;b.dataset.auth2Logout='1';b.onclick=async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}localStorage.removeItem('nataiji-data');localStorage.removeItem('nataiji-active-user');currentUser=null;lastStatus=null;await renderAuth('login')}}
function patchOfficialWording(root=document){qa('.doc-republic .doc-line',root).forEach(line=>{const sp=q('span',line),b=q('b',line);if(!sp||!b)return;const t=sp.textContent;if(/الإدارة الجهوية|Direction régionale/i.test(t)){stableText(sp,fr()?'Direction régionale de l’Éducation – Wilaya de':'الإدارة الجهوية بولاية');stableText(b,b.textContent.replace(/^\s*(ولاية|Wilaya(?:\s+de)?)\s*/i,''))}else if(/المفتشية|Inspection/i.test(t)){stableText(sp,fr()?'Inspection – Moughataa de':'المفتشية بمقاطعة');stableText(b,b.textContent.replace(/^\s*(مقاطعة|Moughataa(?:\s+de)?)\s*/i,''))}})}
function patchSettingsModal(){const r=q('#wf-sr'),i=q('#wf-si');if(r){const l=r.closest('label'),p=l?.querySelector('.workflow-prefix span');if(l?.firstChild)l.firstChild.nodeValue=tr('الإدارة الجهوية بولاية','Direction régionale de l’Éducation – Wilaya de');if(p)p.style.display='none'}if(i){const l=i.closest('label'),p=l?.querySelector('.workflow-prefix span');if(l?.firstChild)l.firstChild.nodeValue=tr('المفتشية بمقاطعة','Inspection – Moughataa de');if(p)p.style.display='none'}}
const css=document.createElement('style');css.id='auth-access-v2-style';css.textContent=`.auth2-app-logo{width:82px!important;height:82px!important;margin:0 auto 14px!important;border:0!important;border-radius:20px!important;background:transparent!important;overflow:hidden!important;display:grid!important;place-items:center!important}
.auth2-app-logo img{display:block!important;width:82px!important;height:82px!important;object-fit:contain!important;border-radius:20px!important}
.auth2-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#edf4f8;padding:5px;border-radius:12px;margin:16px 0}.auth2-tabs button{border:0;background:transparent;padding:11px 6px;border-radius:9px;font-weight:700;color:#50677a}.auth2-tabs button.on{background:#fff;color:#1288dd;box-shadow:0 1px 4px #0001}.auth2-link{border:0;background:transparent;color:#1288dd;font-weight:700;padding:8px;cursor:pointer}.auth2-note{font-size:12px;color:#718392;line-height:1.55}.auth2-success{color:#147a46!important}.auth2-perms{display:grid;gap:10px;border:1px solid #d6e1e8;border-radius:10px;padding:12px}.auth2-perms label{display:flex!important;align-items:center;gap:8px}.auth2-perms input{width:auto!important}.auth2-code-copy{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:10px 0}.auth2-code-copy input{font-size:22px!important;font-weight:900!important;letter-spacing:2px!important;text-align:center!important;background:#f7fbff!important;border:2px solid #b9d9ef!important;color:#0877b8!important}.auth2-code-copy button{border:0;border-radius:10px;background:#1288dd;color:#fff;font-weight:800;padding:12px 16px}.auth2-school-row{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:start;padding:13px;margin:7px 0;border:1px solid #d6e1e8;border-radius:12px;background:#fff}.auth2-school-row.active{border-color:#1288dd;background:#f1f9ff}.auth2-school-row span{display:grid;gap:3px}.auth2-school-row small,.auth2-school-row em{font-size:12px;color:#64748b;font-style:normal}
.auth2-share-status{min-height:0;margin:0 0 8px;font-size:12px;font-weight:800}.auth2-share-status.ok{color:#147a46}
.auth2-share-audit-card{border:1px solid #d8e3ea;border-radius:13px;background:#fff;padding:12px;margin:9px 0;box-shadow:0 1px 2px #00000008}
.auth2-share-audit-card>header{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin-bottom:10px}
.auth2-share-audit-card>header>div{display:grid;gap:3px;min-width:0;max-width:min(72%,360px)}.auth2-share-audit-card>header b{font-size:15px;color:#223b4d}
.auth2-share-audit-card>header small{font-size:11.5px;color:#718392}
.auth2-share-audit-card .auth2-revoke{flex:0 0 auto;min-height:32px!important;padding:5px 9px!important;border:1px solid #efc7c7!important;border-radius:9px!important;background:#fff7f7!important;color:#b42318!important;font-size:11px!important;font-weight:800!important;box-shadow:none!important}
.auth2-share-audit-card .auth2-revoke:active{background:#ffecec!important}
.auth2-share-classes{display:grid;gap:8px}.auth2-share-class-detail{border:1px solid #e5edf2;border-radius:10px;background:#f9fbfc;padding:9px}
.auth2-share-class-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:7px}.auth2-share-class-head b{font-size:13px}.auth2-share-class-head small{font-size:10.5px;color:#718392}
.auth2-share-class-badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}.auth2-access-badge{font-size:10.5px;font-weight:800;padding:4px 7px;border-radius:999px;border:1px solid}
.auth2-access-badge.on{color:#176b45;background:#eefaf4;border-color:#bee6d2}.auth2-access-badge.off{color:#7b8790;background:#f4f6f7;border-color:#dce2e6}
.auth2-share-details{margin-top:6px;border-top:1px solid #e7edf1;padding-top:6px}
.auth2-share-details summary{cursor:pointer;list-style:none;color:#3f657c;font-size:11px;font-weight:800;user-select:none}
.auth2-share-details summary::-webkit-details-marker{display:none}.auth2-share-details summary::before{content:'⌄';display:inline-block;margin-inline-end:6px;font-size:12px;transition:transform .15s ease}.auth2-share-details[open] summary::before{transform:rotate(180deg)}
.auth2-share-detail-body{padding-top:4px}.auth2-share-class-detail p{margin:4px 0 0;font-size:11px;line-height:1.45;color:#536b7a}.auth2-share-class-detail p strong{color:#294d65}
.auth2-revoke-confirm{display:grid;gap:10px}.auth2-revoke-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.auth2-revoke-actions button{min-height:42px;border-radius:10px;font-weight:800}.auth2-cancel-revoke{border:1px solid #d5e0e7;background:#fff;color:#36556a}.owner-card{position:relative;overflow:hidden!important;border:1px solid #d7b76a!important;background:radial-gradient(circle at 90% 10%,#2d67a9 0,transparent 35%),linear-gradient(135deg,#071a33,#0c315d 65%,#114b83)!important;color:#fff!important;box-shadow:0 18px 40px #0828482b!important}.owner-card:after{content:'✦';position:absolute;inset-inline-end:18px;bottom:-24px;font-size:74px;color:#ffffff12}.owner-card b,.owner-card span{position:relative;z-index:1;color:#fff!important}.owner-card b{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.owner-card b i{color:#f5cc6a;font-style:normal}.owner-card b small{padding:3px 7px;border:1px solid #f5cc6a88;border-radius:999px;color:#ffe39e;background:#0002;font-size:9px;letter-spacing:.08em}.owner-card span{color:#dcecff!important}.owner-overview-modal .modal-card{max-width:720px;background:linear-gradient(180deg,#fbfdff,#f4f8fc)}.owner-eyebrow{color:#b18425;font-weight:900;letter-spacing:.12em}.owner-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.owner-stats article{display:grid;gap:5px;padding:16px;border:1px solid #dce7ef;border-radius:14px;background:#fff;box-shadow:0 8px 24px #15334d0b}.owner-stats strong{font-size:28px;color:#0b4a7d}.owner-stats span{font-size:12px;color:#607789}.owner-accounts{max-height:45vh;overflow:auto}.owner-accounts>div{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border-bottom:1px solid #e5edf3}.owner-accounts>div>span{display:grid;gap:2px}.owner-accounts small{color:#718392}.owner-role{font-style:normal;font-size:11px;font-weight:900;padding:5px 8px;border-radius:999px;background:#edf3f7;color:#34566d;white-space:nowrap}.owner-role.owner{background:#fff4d6;color:#805d0f}.owner-loading{padding:28px;text-align:center;color:#607789}@media(max-width:560px){.owner-stats{grid-template-columns:1fr 1fr}.owner-accounts>div{align-items:flex-start;flex-direction:column}}
@media(max-width:520px){.auth2-share-audit-card>header{align-items:center;flex-direction:row;flex-wrap:nowrap;justify-content:flex-start;gap:7px}.auth2-share-audit-card>header>div{max-width:72%}.auth2-share-audit-card .auth2-revoke{width:auto!important;min-width:0!important;white-space:nowrap!important}.auth2-share-class-head{align-items:flex-start;flex-direction:column}}.auth2-subject-perm{display:grid;grid-template-columns:1fr 120px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #edf1f4}.auth2-subject-perm span{display:grid}.auth2-subject-perm small{font-size:11px;color:#718392}.auth2-subject-mode{margin:0!important;padding:8px!important}.auth2-subjects,.auth2-shared-classes{margin-top:12px;border:1px solid #d6e1e8;border-radius:10px;padding:12px}.auth2-class-access{border:1px solid #e2e8f0;border-radius:10px;padding:9px;margin:8px 0}.auth2-class-toggle{display:flex!important;gap:8px;align-items:center}.auth2-class-toggle input{width:auto!important}.auth2-class-scope{display:none;margin-top:9px;padding-top:8px;border-top:1px solid #edf2f7}.auth2-class-scope.enabled{display:grid;gap:8px}.shared-classes-label{font-size:11px;font-weight:800;color:#1288dd;align-self:center;white-space:nowrap}.auth2-subject-scope{display:grid;gap:9px}.auth2-inline{display:flex!important;align-items:center;gap:8px}.auth2-inline input{width:auto!important}.auth2-subject-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;opacity:.45;margin-top:5px}.auth2-subject-list.enabled{opacity:1}.auth2-subject-list label{display:flex!important;align-items:center;gap:7px;border:1px solid #e2e8f0;border-radius:8px;padding:8px}.auth2-subject-list input{width:auto!important}.auth2-subject-list small{display:block;color:#718392;margin-inline-start:auto}.workflow-prefix span[style*="display: none"]{display:none!important}@media(max-width:520px){.auth2-tabs button{font-size:12px;padding:10px 3px}.auth2-subject-list{grid-template-columns:1fr}}`;
css.textContent+=`.auth2-recovery-divider{display:flex;align-items:center;gap:10px;color:#8a9aa5}.auth2-recovery-divider:before,.auth2-recovery-divider:after{content:'';height:1px;flex:1;background:#dce5ea}.auth2-code-reset{min-height:46px;border:1px solid #0d9076;border-radius:12px;background:#f2fbf8;color:#087761;font-weight:850}.auth2-help{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12px;color:#657985}.auth2-help a{padding:6px 10px;border-radius:999px;background:#edf7f4;color:#087761;text-decoration:none;font-weight:800}.owner-account-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px 12px!important}.owner-account-meta{display:flex;gap:5px;align-items:center}.owner-status{font-style:normal;font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px;white-space:nowrap}.owner-status.on{background:#e8f8f2;color:#087761}.owner-status.off{background:#fff0f0;color:#aa2929}.owner-account-actions{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap}.owner-account-actions button{min-height:34px;padding:6px 10px;border:1px solid #d5e1e8;border-radius:9px;background:#fff;color:#294d65;font-weight:800}.owner-account-actions .danger{border-color:#efc5c5;color:#a62828;background:#fff7f7}.owner-reset-code{padding:18px;border:1px dashed #0d9076;border-radius:14px;background:#effaf7;color:#075b4c;text-align:center;font-size:25px;font-weight:950;letter-spacing:.12em}@media(max-width:560px){.owner-account-row{grid-template-columns:1fr!important}.owner-account-actions{grid-column:1!important}}`;
document.head.appendChild(css);
let timer;function refreshAll(){bindOwnerDashboard();bindSchools();bindJoinCard();bindInvite();bindShares();bindLogout();enforcePermissions();patchProfileRole();patchOfficialWording();patchSettingsModal();scheduleUnifiedSelector()}
new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refreshAll,35)}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('beforeprint',()=>patchOfficialWording());
window.addEventListener('DOMContentLoaded',()=>{setTimeout(async()=>{try{await Promise.race([Promise.resolve(window.__nataijiBootPromise).catch(()=>{}),wait(2500)])}catch{}if(!currentUser)renderAuth('login',true).catch(()=>document.documentElement.classList.add('nataiji-auth-ready'));refreshAll()},80)});
setInterval(()=>{const l=lang();if(l!==lastLang){lastLang=l;if(q('.auth-gate'))renderAuth(authMode,true);setTimeout(refreshAll,20)}},250);
setTimeout(refreshAll,0);
})();
