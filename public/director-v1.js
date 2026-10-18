(()=>{
'use strict';
const $=(q,root=document)=>root.querySelector(q);
const tr=(ar,fr)=>(localStorage.getItem('nataiji-lang')==='fr'?fr:ar);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REGISTERS=[
 ['student_enrolment','قيد التلاميذ','Registre des inscriptions'],
 ['correspondence','الصادرات والواردات','Courrier entrant et sortant'],
 ['visits','الزيارات','Registre des visites'],
 ['persons','قيد الأشخاص','Registre des personnes'],
 ['daily_attendance','الحضور اليومي','Présence quotidienne'],
 ['supervision','الرقابة','Registre de supervision'],
 ['student_absence','غياب التلاميذ','Absences des élèves'],
 ['meetings','اجتماعات المعلمين','Réunions du personnel'],
 ['furniture','الأثاث','Inventaire du mobilier'],
 ['referrals','الإحالات','Registre des renvois'],
 ['notices','المعلقات','Registre des affichages'],
 ['model_lessons','الدروس النموذجية','Leçons modèles'],
 ['teacher_health','صحة المعلمين','Santé du personnel'],
 ['student_health','صحة التلاميذ','Santé des élèves']
];
const NAV=[['home','الرئيسية','Accueil'],['students','التلاميذ','Élèves'],['registers','السجلات','Registres'],['members','المعلمون','Équipe']];
let currentUser=null,overview=null,view='home',registerType='correspondence',students=[],registers=[],members=[],pendingId=null,inviteCode='',errorText='',busy=false;
const label=id=>{const row=REGISTERS.find(r=>r[0]===id);return row?tr(row[1],row[2]):id};
async function request(url,options){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},...options});
 let json={};try{json=await response.json()}catch{}
 if(!response.ok)throw new Error(String(json.error||'request_failed'));
 return json;
}
function root(){
 let node=$('#nataijiDirectorRoot');
 if(!node){node=document.createElement('main');node.id='nataijiDirectorRoot';node.className='director-app';document.body.appendChild(node);}
 return node;
}
function notice(message,ok=false){
 const node=$('#directorNotice');if(!node)return;
 node.textContent=message;node.className='director-notice '+(ok?'ok':'error');node.hidden=!message;
}
async function refresh(){
 const result=await request('/api/director/overview');
 overview=result;return result;
}
function setMode(){
 document.documentElement.classList.remove('nataiji-professor-mode');
 document.documentElement.classList.add('nataiji-director-mode');
 $('.app-shell')?.style.setProperty('display','none');
 $('.bottom-nav')?.style.setProperty('display','none');
 $('#nataijiProfessorRoot')?.remove();
 document.documentElement.lang=localStorage.getItem('nataiji-lang')||'ar';
 document.documentElement.dir=localStorage.getItem('nataiji-lang')==='fr'?'ltr':'rtl';
}
function setup(){
 const el=root();el.innerHTML='<div class="director-onboarding"><div class="director-onboarding-card"><img src="/nataiji-brand-mark.png" alt="" width="72" height="72"><small>NATAIJI · DIRECTOR</small><h1>'+tr('تهيئة المؤسسة التعليمية','Configurer votre établissement')+'</h1><p>'+tr('يعمل المدير مستقلًا، ويمكنه ربط المعلمين لاحقًا بموافقتهم.','Le directeur travaille seul ou relie des enseignants avec leur accord.')+'</p><form id="directorSetupForm"><label>'+tr('اسم المؤسسة','Nom de l’établissement')+'<input name="name" required maxlength="160"></label><label>'+tr('الاسم بالفرنسية (اختياري)','Nom en français (facultatif)')+'<input name="nameFr" maxlength="160"></label><label>'+tr('المرحلة','Niveau')+'<select name="level" required><option value="primary">'+tr('ابتدائية','Primaire')+'</option><option value="middle">'+tr('إعدادية','Collège')+'</option><option value="secondary">'+tr('ثانوية','Lycée')+'</option></select></label><label>'+tr('الولاية','Wilaya')+'<input name="wilaya"></label><label>'+tr('المقاطعة','Moughataa')+'<input name="district"></label><label>'+tr('السنة الدراسية','Année scolaire')+'<input name="academicYear" value="2026-2027" pattern="20[0-9]{2}-20[0-9]{2}" required></label><button type="submit" class="director-primary">'+tr('إنشاء المؤسسة','Créer l’établissement')+'</button></form><p id="directorNotice" class="director-notice" hidden></p><button id="directorExit">'+tr('تسجيل الخروج','Se déconnecter')+'</button></div></div>';
 $('#directorSetupForm',el).onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,values=Object.fromEntries(new FormData(form));
  const btn=$('button[type=submit]',form);btn.disabled=true;
  try{await request('/api/director/institution',{method:'PUT',body:JSON.stringify(values)});await refresh();render();}
  catch(e){notice(tr('تعذر إنشاء المؤسسة: ','Création impossible : ')+e.message);}
  finally{btn.disabled=false;}
 };
 $('#directorExit',el).onclick=logout;
}
function cards(){
 const s=overview?.stats||{};
 return '<div class="director-stats"><article><strong>'+Number(s.students||0)+'</strong><span>'+tr('التلاميذ','Élèves')+'</span></article><article><strong>'+Number(s.members||0)+'</strong><span>'+tr('المعلمون المرتبطون','Enseignants reliés')+'</span></article><article><strong>'+Number(s.registers||0)+'</strong><span>'+tr('السجلات هذه السنة','Entrées cette année')+'</span></article></div>';
}
function home(){
 const inst=overview.institution;
 return '<section class="director-hero"><div><span>NATAIJI · DIRECTOR</span><h2>'+esc(inst.name)+'</h2><p>'+esc(inst.wilaya||'')+(inst.district?' · '+esc(inst.district):'')+' · '+esc(inst.academic_year)+'</p></div><div class="director-hero-icon">🏫</div></section>'+cards()+'<h2>'+tr('إدارة المؤسسة','Gestion de l’établissement')+'</h2><div class="director-tiles">'+
  '<button data-view="students"><span>👧</span>'+tr('قيد التلاميذ','Inscriptions')+'</button><button data-view="members"><span>👩‍🏫</span>'+tr('ربط المعلمين','Relier les enseignants')+'</button>'+
  REGISTERS.slice(1).map((r,i)=>'<button data-type="'+esc(r[0])+'"><span>'+(['✉️','📋','🪪','📆','🔎','🗓️','📝','🪑','📤','📌','📖','🩺','🏥'][i])+'</span>'+esc(label(r[0]))+'</button>').join('')+'</div>';
}
function studentsPage(){
 return '<section class="director-section"><h2>'+tr('سجل قيد التلاميذ','Registre des élèves')+'</h2><p>'+tr('قائمة خاصة بالمؤسسة والسنة الدراسية، ولا تغيّر كشوف المعلمين.','Registre propre à l’établissement et à son année scolaire.')+'</p><form id="directorStudentForm" class="director-form"><input name="registerNo" required maxlength="60" placeholder="'+tr('رقم القيد','N° inscription')+'"><input name="name" required maxlength="160" placeholder="'+tr('اسم التلميذ','Nom de l’élève')+'"><input name="nameFr" maxlength="160" placeholder="'+tr('الاسم بالفرنسية','Nom en français')+'"><input name="className" maxlength="120" placeholder="'+tr('القسم','Classe')+'"><button type="submit" class="director-primary">'+tr('إضافة تلميذ','Ajouter un élève')+'</button></form>'+
 '<div class="director-table-scroll"><table><thead><tr><th>#</th><th>'+tr('رقم القيد','Matricule')+'</th><th>'+tr('التلميذ','Élève')+'</th><th>'+tr('القسم','Classe')+'</th></tr></thead><tbody>'+students.map((s,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(s.registerNo)+'</td><td>'+esc(s.name)+'</td><td>'+esc(s.className||'—')+'</td></tr>').join('')+'</tbody></table></div></section>';
}
function registersPage(){
 const health=registerType.endsWith('_health');
 return '<section class="director-section"><h2>'+tr('السجلات الإدارية','Registres administratifs')+'</h2><label>'+tr('اختر السجل','Choisir le registre')+'<select id="directorRegisterType">'+REGISTERS.map(r=>'<option value="'+esc(r[0])+'"'+(r[0]===registerType?' selected':'')+'>'+esc(label(r[0]))+'</option>').join('')+'</select></label>'+
 (health?'<p class="director-sensitive">'+tr('بيانات صحية حساسة: صلاحية المدير فقط في هذه النسخة التجريبية. لا تدخل معلومات طبية حقيقية قبل استكمال مراجعة الأمان.','Données de santé sensibles : accès directeur uniquement. Ne saisissez pas de données réelles avant la validation de sécurité.')+'</p>':'')+
 '<form id="directorRegisterForm" class="director-form"><input name="subject" required maxlength="250" placeholder="'+tr('الموضوع / عنوان القيد','Objet / Intitulé')+'"><input name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"><input name="reference" maxlength="150" placeholder="'+tr('المرجع أو رقم المراسلة (اختياري)','Référence (facultatif)')+'"><input name="person" maxlength="180" placeholder="'+tr('الجهة أو الشخص المعني','Personne ou organisme')+'"><textarea name="notes" rows="3" maxlength="4000" placeholder="'+tr('الملاحظات والتفاصيل','Observations et détails')+'"></textarea><button class="director-primary" type="submit"'+(health?' disabled':'')+'>'+tr(health?'الإدخال موقوف لحماية البيانات':'حفظ القيد',health?'Saisie suspendue pour protéger les données':'Enregistrer')+'</button></form>'+
 '<div class="director-table-scroll"><table><thead><tr><th>'+tr('الرقم','N°')+'</th><th>'+tr('التاريخ','Date')+'</th><th>'+tr('الموضوع','Objet')+'</th><th>'+tr('المرجع','Référence')+'</th></tr></thead><tbody>'+registers.map(r=>'<tr><td>'+r.serial+'</td><td>'+esc(String(r.date).slice(0,10))+'</td><td>'+esc(r.subject)+'</td><td>'+esc(r.details?.reference||'—')+'</td></tr>').join('')+'</tbody></table></div><button id="directorPrint" class="director-secondary">'+tr('طباعة القائمة','Imprimer la liste')+'</button></section>';
}
function membersPage(){
 return '<section class="director-section"><h2>'+tr('المعلمون والأساتذة المرتبطون','Équipe rattachée')+'</h2><p>'+tr('ربط حساب المعلم لا يمنح المدير حق تعديل درجاته أو حذفها. مشاركة الأقسام والنتائج ستُفعَّل بصورة منفصلة.','Le lien ne permet pas au directeur de modifier les notes. Le partage des classes sera ajouté séparément.')+'</p>'+
 '<div class="director-invite"><button class="director-primary" id="directorInvite">'+tr('إنشاء رمز دعوة','Créer une invitation')+'</button>'+(inviteCode?'<div class="director-invite-code"><code>'+esc(inviteCode)+'</code><button id="directorCopy">'+tr('نسخ','Copier')+'</button><small>'+tr('صالح لمدة 7 أيام ولمرة واحدة','Valable 7 jours, un seul usage')+'</small></div>':'')+'</div>'+
 '<div class="director-members">'+members.map(m=>'<article><div><b>'+esc(m.name||m.role||'—')+'</b><small>'+esc(m.role||'')+'</small></div><button data-remove-member="'+esc(m.id)+'">'+tr('إلغاء الربط','Détacher')+'</button></article>').join('')+'</div></section>';
}
function render(){
 const el=root(),inst=overview?.institution;
 if(!inst){setup();return;}
 document.title=tr('لوحة المدير | نتائجي','Directeur | Nataiji');
 el.innerHTML='<div class="director-layout"><aside class="director-side"><div class="director-brand"><img src="/nataiji-brand-mark.png" width="42" height="42" alt=""><div><b>نتائجي</b><small>NATAIJI · DIRECTOR</small></div></div><nav>'+NAV.map(row=>'<button class="'+(view===row[0]?'active':'')+'" data-view="'+row[0]+'">'+tr(row[1],row[2])+'</button>').join('')+'</nav><button id="directorLanguage">العربية / Français</button><button id="directorLogout">'+tr('تسجيل الخروج','Déconnexion')+'</button></aside><div class="director-main"><header class="director-top"><span>'+tr('فضاء مدير المؤسسة','Espace direction')+'</span><span>'+esc(currentUser?.name||'')+'</span><div class="director-top-mobile"><button id="directorMobileLang">AR / FR</button><button id="directorMobileLogout">'+tr('خروج','Quitter')+'</button></div></header><div id="directorNotice" class="director-notice" hidden></div><div class="director-content">'+(view==='home'?home():view==='students'?studentsPage():view==='members'?membersPage():registersPage())+'</div></div></div>';
 el.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));
 el.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{registerType=b.dataset.type;go('registers');});
 $('#directorLanguage',el).onclick=()=>{localStorage.setItem('nataiji-lang',localStorage.getItem('nataiji-lang')==='fr'?'ar':'fr');document.documentElement.dir=localStorage.getItem('nataiji-lang')==='fr'?'ltr':'rtl';document.documentElement.lang=localStorage.getItem('nataiji-lang')||'ar';render();};
 $('#directorLogout',el).onclick=logout;
 $('#directorMobileLang',el).onclick=()=>$('#directorLanguage',el).click();
 $('#directorMobileLogout',el).onclick=logout;
 const select=$('#directorRegisterType',el);if(select)select.onchange=()=>{registerType=select.value;loadRegisters();};
 const studentForm=$('#directorStudentForm',el);if(studentForm)studentForm.onsubmit=saveStudent;
 const recordForm=$('#directorRegisterForm',el);if(recordForm)recordForm.onsubmit=saveRegister;
 const invite=$('#directorInvite',el);if(invite)invite.onclick=createInvite;
 const copy=$('#directorCopy',el);if(copy)copy.onclick=()=>navigator.clipboard?.writeText(inviteCode).catch(()=>{});
 const print=$('#directorPrint',el);if(print)print.onclick=()=>window.print();
 el.querySelectorAll('[data-remove-member]').forEach(b=>b.onclick=()=>removeMember(b.dataset.removeMember));
}
async function go(next){
 view=next;errorText='';try{
 if(next==='students')students=(await request('/api/director/students')).students||[];
 if(next==='members')members=(await request('/api/director/members')).members||[];
 if(next==='registers')registers=(await request('/api/director/registers?type='+encodeURIComponent(registerType))).registers||[];
 render();
 }catch(e){render();notice(tr('تعذر تحميل البيانات: ','Chargement impossible : ')+e.message);}
}
async function loadRegisters(){await go('registers');}
async function saveStudent(e){
 e.preventDefault();if(busy)return;busy=true;const form=e.currentTarget,button=$('button[type=submit]',form);button.disabled=true;
 try{
  await request('/api/director/students',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
  await refresh();await go('students');notice(tr('تم حفظ التلميذ.','Élève enregistré.'),true);
 }catch(ex){notice(tr('فشل الحفظ: ','Échec de l’enregistrement : ')+ex.message);}finally{busy=false;button.disabled=false;}
}
async function saveRegister(e){
 e.preventDefault();if(busy)return;busy=true;const form=e.currentTarget,button=$('button[type=submit]',form);button.disabled=true;
 if(!pendingId)pendingId=crypto.randomUUID();
 try{
 const fields=Object.fromEntries(new FormData(form));
 await request('/api/director/registers',{method:'POST',body:JSON.stringify({type:registerType,subject:fields.subject,date:fields.date,requestId:pendingId,details:{reference:fields.reference,person:fields.person,notes:fields.notes}})});
 pendingId=null;await refresh();await go('registers');notice(tr('تم حفظ القيد على الخادم.','Entrée enregistrée sur le serveur.'),true);
 }catch(ex){notice(tr('فشل الحفظ، احتفظ بالبيانات وحاول مجددًا: ','Enregistrement échoué. Réessayez : ')+ex.message);}finally{busy=false;button.disabled=false;}
}
async function createInvite(){
 try{inviteCode=(await request('/api/director/invites',{method:'POST',body:'{}'})).code;render();}catch(e){notice(tr('تعذر إنشاء الدعوة: ','Invitation impossible : ')+e.message);}
}
async function removeMember(id){
 if(!confirm(tr('هل تريد إلغاء الربط دون حذف بيانات المعلم؟','Détacher sans supprimer les données du professeur ?')))return;
 try{await request('/api/director/members/'+encodeURIComponent(id),{method:'DELETE'});await go('members');notice(tr('تم إلغاء الربط.','Lien retiré.'),true);}catch(e){notice(e.message);}
}
async function logout(){
 try{await request('/api/auth/logout',{method:'POST',body:'{}'});window.NataijiOfflineResume?.clear();location.reload();}
 catch(e){notice(tr('تعذر تسجيل الخروج مع الاتصال الحالي.','Déconnexion impossible sur cette connexion.'));}
}
async function activate(user){
 currentUser=user;setMode();root().innerHTML='<div class="director-loading">'+tr('جاري تحميل فضاء المدير…','Chargement de l’espace direction…')+'</div>';
 try{await refresh();render();}
 catch(e){root().innerHTML='<div class="director-loading"><h2>'+tr('تعذر فتح المسار','Espace indisponible')+'</h2><p>'+esc(e.message)+'</p><button onclick="location.reload()">'+tr('إعادة المحاولة','Réessayer')+'</button></div>';}
 return true;
}
function offerJoin(user){
 if(!['teacher','professor'].includes(user?.profileType))return;
 let b=$('#nataijiDirectorJoinButton');
 if(b)return;
 b=document.createElement('button');b.id='nataijiDirectorJoinButton';b.className='director-join-trigger';b.type='button';b.textContent=tr('ربط مؤسستي','Relier mon établissement');document.body.appendChild(b);
 b.onclick=async()=>{
 const code=prompt(tr('أدخل رمز الدعوة الذي أرسله المدير (18 رمزًا).','Saisir le code d’invitation du directeur (18 caractères).'));
 if(!code)return;
 try{const r=await request('/api/director/invites/accept',{method:'POST',body:JSON.stringify({code:code.trim()})});alert(tr('تم ربط حسابك بمؤسسة ','Compte relié à : ')+r.institutionName);}
 catch(e){alert(tr('لم ينجح الربط: ','Échec de liaison : ')+e.message);}
 };
}
window.NataijiDirector={activate,offerJoin};
})();