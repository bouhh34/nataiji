(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>localStorage.getItem('nataiji-lang')==='fr';
const t=(ar,fr)=>lang()?fr:ar;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=[
 ['enrolment','قيد التلاميذ','Inscription des élèves','users'],
 ['correspondence','الصادرات والواردات','Courrier entrant et sortant','mail'],
 ['visits','الزيارات','Visites','calendar'],
 ['visitor-log','قيد الأشخاص','Registre des visiteurs','contact'],
 ['daily-attendance','الحضور اليومي','Présences quotidiennes','check'],
 ['supervision','الرقابة','Suivi et inspection','clipboard'],
 ['student-absence','غياب التلاميذ','Absences des élèves','user-x'],
 ['staff-meetings','اجتماع المعلمين','Réunions pédagogiques','users'],
 ['inventory','الأثاث','Inventaire du mobilier','archive'],
 ['referrals','الإحالات','Orientations et renvois','file-text'],
 ['notice-board','المعلقات','Affichages','bell'],
 ['model-lessons','الدروس النموذجية','Leçons modèles','book-open'],
 ['teacher-health','الصحي للمعلمين','Santé du personnel','heart'],
 ['student-health','الصحي للتلاميذ','Santé des élèves','heart']
];
let user=null,institution=null,currentCategory='enrolment',overview=null,records=[];
const health=new Set(['teacher-health','student-health']);
const cacheKey=()=> 'nataiji-director-cache-v1:'+(user?.id||'');
function saveCachedHome(){if(!institution||!overview||window.__nataijiOfflineActive)return;try{localStorage.setItem(cacheKey(),JSON.stringify({institution,overview,verifiedAt:Date.now()}));window.NataijiOfflineResume?.remember(user)}catch{}}
function readCachedHome(){try{const d=JSON.parse(localStorage.getItem(cacheKey())||'null');return d?.institution?.director_user_id===user?.id&&d?.overview?.institution?.id===d.institution.id?d:null}catch{return null}}
function readCachedRecords(category){try{const d=JSON.parse(localStorage.getItem(cacheKey()+':'+category)||'null');return d?.institutionId===institution?.id&&Array.isArray(d.records)?d.records:null}catch{return null}}
function storeCachedRecords(category,data){if(window.__nataijiOfflineActive)return;try{localStorage.setItem(cacheKey()+':'+category,JSON.stringify({institutionId:institution.id,records:data}))}catch{}}

function root(){let el=$('#nataijiDirectorRoot');if(!el){el=document.createElement('main');el.id='nataijiDirectorRoot';el.className='director-app';document.body.appendChild(el)}return el}
function show(){document.documentElement.classList.add('nataiji-director-mode');$('#nataijiProfessorRoot')?.setAttribute('hidden','');return root()}
function hide(){document.documentElement.classList.remove('nataiji-director-mode');$('#nataijiDirectorRoot')?.remove()}
function err(e){return ({director_institution_missing:t('أنشئ المؤسسة أولًا','Créez votre établissement'),institution_already_exists:t('توجد مؤسسة مرتبطة بهذا الحساب','Un établissement est déjà associé'),record_version_conflict:t('تم تعديل السجل على جهاز آخر؛ أعد تحميله','Ce registre a été modifié sur un autre appareil'),sensitive_register_not_enabled:t('سيُفعّل السجل الصحي بعد توفير الحماية المطلوبة','Ce registre sera activé après sécurisation'),durable_storage_required:t('قاعدة البيانات غير متاحة حاليًا','Base de données indisponible')})[e?.code]||t('تعذر الحفظ؛ تحقق من الاتصال وأعد المحاولة','Enregistrement impossible, vérifiez votre connexion')}
function message(value,bad=false){const el=$('#directorMessage');if(el){el.textContent=value;el.classList.toggle('bad',bad)}}
function network(url,options={}){if(navigator.onLine===false)throw Object.assign(Error('offline'),{code:'offline'});return api(url,options)}
function apiPost(url,data,method='POST'){return network(url,{method,body:JSON.stringify(data)})}
const formField=(name,label,value='',kind='text')=>'<label>'+label+'<input name="'+name+'" type="'+kind+'" value="'+esc(value)+'" maxlength="160" required></label>';
function frame(title,contents){const el=show();el.innerHTML='<div class="director-shell"><header class="director-top"><div class="director-brand"><img src="/nataiji-brand-mark.png" alt="" width="46" height="46"><div><b>'+t('نتائجي | الإدارة','Nataiji | Direction')+'</b><small>'+esc(user?.name||'')+'</small></div></div><div class="director-actions"><button id="directorHome" type="button">'+t('الرئيسية','Accueil')+'</button><button id="directorLogout" type="button">'+t('الخروج','Quitter')+'</button></div></header><div class="director-wrap"><h1>'+esc(title)+'</h1><p id="directorMessage" role="status"></p>'+contents+'</div></div>';$('#directorHome',el).onclick=()=>{void dashboard()};$('#directorLogout',el).onclick=logout;return el}
async function logout(){try{await apiPost('/api/auth/logout',{})}catch{message(t('لإنهاء الجلسة بأمان اتصل بالإنترنت أولًا.','Reconnectez-vous pour vous déconnecter en toute sécurité.'),true);return}window.NataijiOfflineResume?.clear();currentUser=null;hide();location.reload()}
function institutionForm(){
 const d=institution||{},edit=!!d.id;
 const body='<p class="director-intro">'+t('ابدأ بتسجيل مؤسستك، ويمكنك العمل دون ربط أي معلم.','Enregistrez votre établissement. Le lien avec les enseignants est facultatif.')+'</p><form id="directorSchoolForm" class="director-form">'+
  '<label>'+t('المرحلة التعليمية','Niveau')+'<select name="level" required>'+
  [['primary',t('ابتدائي','Primaire')],['middle',t('إعدادي','Collège')],['secondary',t('ثانوي','Lycée')]].map(([k,v])=>'<option value="'+k+'"'+(d.level===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
  formField('name',t('اسم المؤسسة بالعربية','Nom de l’établissement (arabe)'),d.name)+
  '<label>'+t('اسم المؤسسة بالفرنسية (اختياري)','Nom en français (facultatif)')+'<input name="nameFr" value="'+esc(d.name_fr||'')+'" maxlength="160"></label>'+
  '<label>'+t('الولاية','Wilaya')+'<input name="region" value="'+esc(d.region||'')+'" maxlength="160"></label>'+
  '<label>'+t('المقاطعة','Moughataa')+'<input name="district" value="'+esc(d.district||'')+'" maxlength="160"></label>'+
  '<label>'+t('السنة الدراسية','Année scolaire')+'<input name="academicYear" value="'+esc(d.academic_year||'2026-2027')+'" maxlength="20"></label>'+
  '<button class="director-primary" type="submit">'+t('حفظ المؤسسة','Enregistrer')+'</button></form>';
 const el=frame(edit?t('إعدادات المؤسسة','Paramètres de l’établissement'):t('إنشاء مؤسسة','Créer un établissement'),body);
 $('#directorSchoolForm',el).onsubmit=async e=>{e.preventDefault();const btn=$('button[type=submit]',e.currentTarget);btn.disabled=true;const data=Object.fromEntries(new FormData(e.currentTarget));try{const result=await apiPost('/api/director/institution',data,edit?'PATCH':'POST');institution=result.institution;await dashboard()}catch(error){message(err(error),true);btn.disabled=false}};
}
function cardButtons(){
 const count=overview?.registerCounts||{};
 return labels.map(([key,ar,fr])=>'<button class="director-card" type="button" data-director-register="'+key+'"><span class="director-card-icon">'+(health.has(key)?'🔒':'▤')+'</span><b>'+t(ar,fr)+'</b><small>'+(health.has(key)?t('قريبًا · حماية خاصة','Bientôt · Accès protégé'):t('السجلات','Registres')+' · '+(count[key]||0))+'</small></button>').join('')
}
async function dashboard(){
 const el=show();el.innerHTML='<div class="director-loading">'+t('جاري تحميل الإدارة...','Chargement...')+'</div>';
 try{
  try{
   const r=await network('/api/director/institution');institution=r.institution;
   if(!institution)return institutionForm();
   overview=await network('/api/director/overview');saveCachedHome();
  }catch(error){const cached=readCachedHome();if(!cached)throw error;institution=cached.institution;overview=cached.overview}

  const body=(window.__nataijiOfflineActive||navigator.onLine===false?'<p class="director-offline-notice">'+t('وضع دون إنترنت: البيانات المحفوظة متاحة للقراءة، ويلزم الاتصال لحفظ التعديلات.','Hors connexion : consultation disponible, enregistrement après reconnexion.')+'</p>':'')+'<div class="director-welcome"><div><small>'+t('لوحة المدير','Espace direction')+'</small><h2>'+esc(institution.name)+'</h2><p>'+esc(institution.academic_year||'')+' · '+t('إدارة مستقلة مع ربط اختياري للمعلمين','Gestion autonome et partage facultatif')+'</p></div><button type="button" id="directorSettings">'+t('الإعدادات','Paramètres')+'</button></div>'+
  '<div class="director-stats"><article><b>'+Number(overview.memberCount||0)+'</b><span>'+t('معلمون مرتبطون','Enseignants liés')+'</span></article><article><b>'+Object.values(overview.registerCounts||{}).reduce((a,b)=>a+Number(b||0),0)+'</b><span>'+t('قيود محفوظة','Entrées enregistrées')+'</span></article></div>'+
  '<div class="director-tools"><button type="button" id="directorInvite">＋ '+t('دعوة معلم','Inviter un enseignant')+'</button><button type="button" id="directorMembers">'+t('الحسابات المرتبطة','Comptes liés')+'</button></div>'+
  '<h3>'+t('السجلات الإدارية','Registres administratifs')+'</h3><div class="director-grid">'+cardButtons()+'</div>';
  frame(t('الإدارة المدرسية','Administration scolaire'),body);
  $('#directorSettings').onclick=institutionForm;
  $('#directorInvite').onclick=invite;
  $('#directorMembers').onclick=members;
  $$('[data-director-register]').forEach(b=>b.onclick=()=>{currentCategory=b.dataset.directorRegister;if(health.has(currentCategory)){message(t('السجلات الصحية غير مفعلة حتى توفير الحماية والخصوصية اللازمة.','Registres médicaux désactivés jusqu’à mise en place des protections.'),true);return}void openRegister()});
 }catch(e){frame(t('الإدارة المدرسية','Administration scolaire'),'<p class="director-intro">'+err(e)+'</p><button type="button" id="directorRetry">'+t('إعادة المحاولة','Réessayer')+'</button>');$('#directorRetry').onclick=()=>void dashboard()}
}
async function invite(){
 frame(t('دعوة معلم أو أستاذ','Inviter un enseignant'),'<p class="director-intro">'+t('يستخدم المعلم حسابه الحالي ويدخل الرمز بنفسه للموافقة. لا يحصل المدير على درجات المعلم تلقائيًا.','L’enseignant accepte depuis son compte. Ses notes ne sont pas partagées automatiquement.')+'</p><button type="button" class="director-primary" id="generateInvite">'+t('إنشاء رمز دعوة','Créer un code')+'</button><p id="inviteResult"></p>');
 $('#generateInvite').onclick=async e=>{e.target.disabled=true;try{const r=await apiPost('/api/director/invitations',{});$('#inviteResult').innerHTML='<b dir="ltr">'+esc(r.code)+'</b><p>'+t('صالح لمدة سبعة أيام ولشخص واحد. انسخ الرمز الآن.','Valide sept jours, à usage unique. Copiez-le.')+'</p><button type="button" id="copyInvite">'+t('نسخ الرمز','Copier le code')+'</button>';$('#copyInvite').onclick=()=>navigator.clipboard?.writeText(r.code)}catch(error){message(err(error),true);e.target.disabled=false}};
}
async function members(){
 frame(t('المعلمون المرتبطون','Enseignants associés'),'<p class="director-intro">'+t('لكل معلم حسابه المستقل. إلغاء الربط لا يحذف نتائجه.','Chaque enseignant garde son compte et ses résultats.')+'</p><div id="directorMembersList">'+t('جاري التحميل...','Chargement...')+'</div>');
 try{const r=await network('/api/director/members');$('#directorMembersList').innerHTML=r.members.length?r.members.map(m=>'<article class="director-member"><div><b>'+esc(m.name||t('حساب معلم','Compte enseignant'))+'</b><small>'+esc(m.member_role==='professor'?t('أستاذ','Professeur'):t('معلم','Enseignant'))+'</small></div><button type="button" data-unlink="'+esc(m.user_id)+'">'+t('فصل','Dissocier')+'</button></article>').join(''):'<p>'+t('لا توجد حسابات مرتبطة بعد','Aucun compte associé')+'</p>';$$('[data-unlink]').forEach(b=>b.onclick=async()=>{if(!confirm(t('إلغاء الربط دون حذف بيانات المعلم؟','Dissocier sans supprimer les données ?')))return;try{await network('/api/director/members/'+encodeURIComponent(b.dataset.unlink),{method:'DELETE'});await members()}catch(error){message(err(error),true)}})}catch(e){message(err(e),true)}
}
async function openRegister(){
 const row=labels.find(r=>r[0]===currentCategory);
 frame(t(row[1],row[2]),'<div class="director-tools"><button type="button" class="director-primary" id="directorNewEntry">＋ '+t('إضافة قيد','Nouvelle entrée')+'</button></div><div id="directorRecords">'+t('جاري تحميل السجلات...','Chargement...')+'</div>');
 $('#directorNewEntry').onclick=()=>editEntry();
 try{try{const r=await network('/api/director/registers?category='+encodeURIComponent(currentCategory));records=r.records||[];storeCachedRecords(currentCategory,records)}catch(error){const cached=readCachedRecords(currentCategory);if(!cached)throw error;records=cached}
 $('#directorRecords').innerHTML=records.length?records.map(x=>'<article class="director-record"><div><b>'+esc(x.subject)+'</b><small>'+esc(String(x.record_date).slice(0,10))+' · '+esc(x.reference||'—')+'</small></div><button data-director-edit="'+esc(x.id)+'" type="button">'+t('تعديل','Modifier')+'</button></article>').join(''):'<div class="director-empty">'+t('لا توجد قيود في هذا السجل. ابدأ بإضافة أول قيد.','Aucune entrée. Ajoutez la première.')+'</div>';
 $$('[data-director-edit]').forEach(b=>b.onclick=()=>editEntry(records.find(x=>x.id===b.dataset.directorEdit)));
 }catch(e){message(err(e),true)}
}
function editEntry(row=null){
 const category=labels.find(r=>r[0]===currentCategory),title=row?t('تعديل القيد','Modifier une entrée'):t('إضافة قيد','Ajouter une entrée'),details=row?.details||{};
 const body='<form class="director-form" id="directorRecordForm">'+
  '<label>'+t('التاريخ','Date')+'<input name="recordDate" type="date" required value="'+esc(String(row?.record_date||new Date().toISOString()).slice(0,10))+'"></label>'+
  '<label>'+t('رقم القيد / المرجع','Référence')+'<input name="reference" maxlength="100" value="'+esc(row?.reference||'')+'"></label>'+
  formField('subject',t('الموضوع / الوصف','Objet / description'),row?.subject||'')+
  '<label>'+t('ملاحظات','Observations')+'<textarea name="notes" maxlength="4000" rows="5">'+esc(details.notes||'')+'</textarea></label>'+
  '<p class="director-intro">'+t('هذا نموذج قيود أولي؛ ستضاف الحقول الرسمية الخاصة بكل سجل لاحقًا.','Formulaire initial; des champs spécialisés seront ajoutés ultérieurement.')+'</p>'+
  '<button type="submit" class="director-primary">'+t('حفظ','Enregistrer')+'</button></form>';
 frame(title+' · '+t(category[1],category[2]),body);
 $('#directorRecordForm').onsubmit=async e=>{
  e.preventDefault();const btn=$('button[type=submit]',e.currentTarget);btn.disabled=true;
  const f=Object.fromEntries(new FormData(e.currentTarget)),payload={category:currentCategory,subject:f.subject,reference:f.reference,recordDate:f.recordDate,details:{notes:f.notes}};
  if(row)payload.version=row.version;else payload.clientMutationId=crypto.randomUUID();
  try{await apiPost(row?'/api/director/registers/'+encodeURIComponent(row.id):'/api/director/registers',payload,row?'PATCH':'POST');await openRegister()}catch(error){message(err(error),true);btn.disabled=false}
 };
}
function staffLink(user){
 if(!['teacher','professor'].includes(user?.profileType)||$('#directorStaffJoin'))return;
 const b=document.createElement('button');b.id='directorStaffJoin';b.type='button';b.textContent=t('ربط بمؤسسة','Rejoindre une école');document.body.appendChild(b);
 b.onclick=async()=>{const code=prompt(t('أدخل رمز المؤسسة الذي وصلك من المدير','Saisissez le code reçu du directeur'));if(!code)return;try{await apiPost('/api/director/invitations/accept',{code:code.trim()});alert(t('تم ربط حسابك بالمؤسسة. بقيت نتائجك مستقلة.','Votre compte est associé. Vos résultats restent indépendants.'))}catch(e){alert(err(e))}};
}
window.NataijiDirector={
 activate(next){if(next?.profileType==='director'&&next?.role==='director'){user=next;void dashboard();return true}hide();return false},
 staffLink
};
})();