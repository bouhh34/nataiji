/* Nataiji teacher-only account sheet. Reuses existing security, school and
   logout actions; does not mutate grades, user privileges or stored names. */
(()=>{'use strict';
if(window.__nataijiTeacherAccountSheetV1)return;
window.__nataijiTeacherAccountSheetV1=true;

const q=(s,r=document)=>r.querySelector(s);
const lang=()=>localStorage.getItem('nataiji-lang')==='fr'?'fr':'ar';
const tr=(ar,fr)=>lang()==='fr'?fr:ar;
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=type=>{
 const d={
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  school:'<path d="M3 21V7l9-5 9 5v14H3Z"/><path d="M8 21v-7h8v7M7 9h.01M12 9h.01M17 9h.01"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  left:'<path d="m15 18-6-6 6-6"/>',
  back:'<path d="m9 18 6-6-6-6"/>',
  close:'<path d="M18 6 6 18M6 6l12 12"/>',
  lock:'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>'
 };
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(d[type]||d.user)+'</svg>';
};
const getUser=()=>typeof currentUser==='undefined'?null:currentUser;
const getState=()=>typeof state==='undefined'?null:state;
const allowed=()=>!!getUser()?.id&&!document.documentElement.classList.contains('nataiji-professor-mode');
const role=u=>{
 if(u.isSuperAdmin)return tr('المدير العام للمنصة','Super administrateur');
 if(u.role==='admin'||u.role==='owner')return tr('المعلم / إدارة أقسامه','Enseignant / Gestion des classes');
 return tr('المعلم / إدخال النتائج','Enseignant / Saisie des notes');
};
const fallback=()=>tr('غير محددة','Non renseigné');
function schoolData(){
 const u=getUser()||{},s=getState()||{},shared=u.activeSharedGrant&&(u.sharedGrants||{})[u.activeSharedGrant]||{};
 const owned=Array.isArray(u.ownedSchools)?u.ownedSchools.find(x=>x.active||x.schoolId===u.schoolId):null;
 const name=shared.schoolName||s.school||u.schoolName||owned?.schoolName||'';
 return {name,region:s.region||u.region||'',district:s.district||u.district||''};
}
const display=v=>escapeHtml(v||fallback());
const row=(type,title,sub,action,danger=false)=>`<button type="button" class="ntas-link${danger?' ntas-danger':''}" data-account-action="${action}">
 <span class="ntas-link-icon">${icon(type)}</span>
 <span class="ntas-link-copy"><strong>${title}</strong><small>${sub}</small></span>
 <span class="ntas-chevron">${icon('left')}</span>
</button>`;
const datum=(label,value,ltr=false)=>`<div class="ntas-datum"><small>${label}</small><strong${ltr?' dir="ltr"':''}>${display(value)}</strong></div>`;
let host=null,returnFocus=null,lastOverflow='',currentSection='menu';
const isAdmin=()=>{const u=getUser();return !!u&&u.role==='admin'&&!u.activeSharedGrant};
function content(){
 const u=getUser()||{},school=schoolData(),name=escapeHtml(u.name||getState()?.teacher||fallback()),email=escapeHtml(u.email||'');
 if(currentSection==='profile')return `<div class="ntas-details">
  ${datum(tr('الاسم','Nom'),u.name||getState()?.teacher)}
  ${datum(tr('البريد الإلكتروني','Adresse e-mail'),u.email,true)}
  ${datum(tr('نوع الحساب','Type de compte'),role(u))}
  <p class="ntas-note">${tr('تُعرض هنا بيانات حسابك المسجّلة. لا يمكن تعديل اسم حساب آخر أو صلاحياته من هذه القائمة.','Voici les informations de votre compte. Cette fenêtre ne permet pas de modifier le nom ou les droits d’un autre utilisateur.')}</p>
 </div>`;
 if(currentSection==='school')return `<div class="ntas-details">
  ${datum(tr('المؤسسة','Établissement'),school.name)}
  ${datum(tr('الإدارة الجهوية','Direction régionale'),school.region)}
  ${datum(tr('المقاطعة','Moughataa'),school.district)}
  ${isAdmin()&&q('#settingsBtn')?`<button type="button" class="ntas-primary" data-account-action="edit-school">${tr('تعديل إعدادات مدرستي','Modifier les paramètres de mon école')}</button>`:''}
  <p class="ntas-note">${tr('تُعرض معلومات المدرسة المرتبطة بالقسم الحالي. التعديل متاح فقط لصاحب الصلاحية.','Informations de l’école liée à la classe actuelle. La modification dépend des autorisations.')}</p>
 </div>`;
 if(currentSection==='security')return `<div class="ntas-details">
  ${datum(tr('بريد تسجيل الدخول','E-mail de connexion'),u.email,true)}
  <button type="button" class="ntas-primary" data-account-action="password">${icon('lock')}${tr('تغيير كلمة المرور','Changer le mot de passe')}</button>
  <p class="ntas-note">${tr('لن تظهر كلمة المرور الحالية. سيفتح النموذج الآمن الموجود في نتائجي لتغييرها.','Votre mot de passe actuel ne sera pas affiché. Le formulaire sécurisé de Nataiji sera ouvert.')}</p>
 </div>`;
 if(currentSection==='logout')return `<div class="ntas-details ntas-confirm">
  <span class="ntas-confirm-icon">${icon('logout')}</span>
  <strong>${tr('هل تريد تسجيل الخروج؟','Voulez-vous vous déconnecter ?')}</strong>
  <p>${tr('تأكد من حفظ أي درجات لم تتم مزامنتها قبل الخروج.','Vérifiez que toutes les notes ont été synchronisées avant de quitter.')}</p>
  <button type="button" class="ntas-logout-confirm" data-account-action="confirm-logout">${tr('تسجيل الخروج','Se déconnecter')}</button>
  <button type="button" class="ntas-cancel" data-account-action="back">${tr('إلغاء','Annuler')}</button>
 </div>`;
 return `<div class="ntas-identity">
  <span class="ntas-avatar">${icon('user')}</span><div><strong>${name}</strong><small>${escapeHtml(role(u))}</small>${email?`<small dir="ltr">${email}</small>`:''}</div>
 </div>
 <div class="ntas-links">
 ${row('user',tr('الملف الشخصي','Profil personnel'),tr('الاسم ومعلومات الحساب','Nom et informations du compte'),'profile')}
 ${row('school',tr('معلومات المؤسسة','Informations de l’établissement'),tr('المدرسة والإدارة الجهوية والمقاطعة','École, direction régionale et moughataa'),'school')}
 ${row('shield',tr('الأمان وتسجيل الدخول','Sécurité et connexion'),tr('كلمة المرور وحماية الحساب','Mot de passe et protection du compte'),'security')}
 ${row('logout',tr('تسجيل الخروج','Se déconnecter'),tr('إنهاء الجلسة الحالية','Fermer la session actuelle'),'logout',true)}
 </div>`;
}
const heading=()=>({menu:tr('إعدادات حسابي','Mon compte'),profile:tr('الملف الشخصي','Profil personnel'),school:tr('معلومات المؤسسة','Informations de l’établissement'),security:tr('الأمان وتسجيل الدخول','Sécurité et connexion'),logout:tr('تسجيل الخروج','Se déconnecter')})[currentSection];
function render(){
 if(!host)return;
 const card=q('.ntas-panel',host);
 card.dir=lang()==='fr'?'ltr':'rtl';
 card.innerHTML=`<div class="ntas-head">
  <div class="ntas-head-title">${currentSection!=='menu'?`<button type="button" class="ntas-back" data-account-action="back" aria-label="${tr('العودة','Retour')}">${icon('back')}</button>`:''}
  <div><small>${tr('نتائجي | الحساب الشخصي','Nataiji | Compte personnel')}</small><h2 id="ntas-dialog-title">${heading()}</h2></div></div>
  <button type="button" class="ntas-close" data-account-action="close" aria-label="${tr('إغلاق','Fermer')}">${icon('close')}</button>
 </div><div class="ntas-body">${content()}</div>`;
 card.setAttribute('aria-labelledby','ntas-dialog-title');
 q('.ntas-close',host)?.focus();
}
function close(){
 if(!host)return;
 host.remove();host=null;currentSection='menu';
 document.body.style.overflow=lastOverflow;
 q('main > header .profile')?.setAttribute('aria-expanded','false');
 if(returnFocus?.isConnected)returnFocus.focus();
}
function open(){
 if(!allowed())return;
 if(host){close();return}
 returnFocus=document.activeElement;
 const current=q('main > header .profile');
 host=document.createElement('div');host.className='nataiji-account-sheet';
 host.innerHTML='<div class="ntas-panel" role="dialog" aria-modal="true" tabindex="-1"></div>';
 lastOverflow=document.body.style.overflow;
 document.body.style.overflow='hidden';document.body.append(host);
 current?.setAttribute('aria-expanded','true');
 currentSection='menu';
 host.addEventListener('click',onHostClick);
 host.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();return}
  if(event.key!=='Tab')return;
  const controls=[...host.querySelectorAll('button:not([disabled])')].filter(x=>x.getClientRects().length);
  if(!controls.length)return;
  if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus()}
  else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus()}
 });
 render();
}
function onHostClick(event){
 if(event.target===host){close();return}
 const btn=event.target.closest('[data-account-action]');if(!btn||!host?.contains(btn))return;
 const action=btn.dataset.accountAction;
 if(action==='close'){close();return}
 if(action==='back'){currentSection='menu';render();return}
 if(['profile','school','security','logout'].includes(action)){currentSection=action;render();return}
 if(action==='edit-school'&&!isAdmin())return;
 if(action==='confirm-logout'){const logout=q('#logoutBtn');if(!logout){q('.ntas-note',host)?.replaceChildren();return}close();logout.click();return}
 if(action==='password'||action==='edit-school'){
  const original=q(action==='password'?'#changePasswordBtn':'#settingsBtn');
  if(original){close();original.click()}
  else{currentSection='menu';render();const body=q('.ntas-body',host);if(body){const note=document.createElement('p');note.className='ntas-note';note.textContent=tr('هذه الوظيفة غير متاحة الآن. افتح قسم المزيد للمحاولة.','Cette fonction est momentanément indisponible. Réessayez depuis Plus.');body.prepend(note)}}
 }
}
function trigger(event){
 if(!allowed())return;
 const entry=event.target.closest?.('main > header .profile.nataiji-account-entry');
 if(!entry)return;
 event.preventDefault();open();
}
function bind(){
 const p=q('main > header .profile');
 if(!p||p.classList.contains('nataiji-account-entry'))return;
 p.classList.add('nataiji-account-entry');
 p.tabIndex=0;
 p.setAttribute('role','button');
 p.setAttribute('aria-haspopup','dialog');
 p.setAttribute('aria-expanded','false');
 p.setAttribute('aria-label',tr('فتح إعدادات حسابي','Ouvrir les paramètres du compte'));
 p.setAttribute('title',tr('إعدادات حسابي','Paramètres du compte'));
}
document.addEventListener('click',trigger);
document.addEventListener('keydown',event=>{
 if((event.key==='Enter'||event.key===' ')&&event.target.matches?.('main > header .profile.nataiji-account-entry')){
  event.preventDefault();open();
 }
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.addEventListener('pageshow',bind);
})();
