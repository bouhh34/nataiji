(()=>{
'use strict';
if(window.__nataijiOwnerStaffV1)return;
window.__nataijiOwnerStaffV1=true;

const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const t=(ar,ff)=>fr()?ff:ar;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleLabel=role=>role==='professor'?t('أستاذ','Professeur'):role==='teacher'?t('معلم','Enseignant'):role;
const statusBadge=a=>`<em class="staff-status ${a.suspended?'off':'on'}">${a.suspended?t('موقوف','Suspendu'):t('نشط','Actif')}</em>`;

function shell(){
 const x=document.createElement('div');x.className='modal owner-staff-modal';x.innerHTML=`
 <div class="modal-card">
  <div class="modal-head"><div><small class="owner-eyebrow">NATAIJI CONTROL</small><h2>${t('الطاقم التعليمي','Personnel éducatif')}</h2><p>${t('إدارة المعلمين والأساتذة دون الوصول إلى درجاتهم الخام','Gérez enseignants et professeurs sans accéder à leurs notes brutes')}</p></div><button class="x" aria-label="${t('إغلاق','Fermer')}">×</button></div>
  <div class="staff-loading">${t('جارٍ تحميل الطاقم التعليمي…','Chargement du personnel éducatif…')}</div>
 </div>`;document.body.appendChild(x);q('.x',x).onclick=()=>x.remove();x.onclick=e=>{if(e.target===x)x.remove()};return x
}
function accountActions(a){
 return `<div class="staff-account-actions" data-account-actions="${esc(a.id)}">
  <button data-staff-action="${a.suspended?'activate':'suspend'}">${a.suspended?t('تفعيل','Activer'):t('تعطيل','Suspendre')}</button>
  <button data-staff-action="reset_code">${t('رمز استعادة','Code de récupération')}</button>
  <button class="danger" data-staff-action="delete">${t('حذف الحساب','Supprimer')}</button>
 </div>`
}
function card(a,type){
 const professor=type==='professor';
 return `<article class="staff-card" data-staff-id="${esc(a.id)}" data-staff-role="${type}">
  <header><div class="staff-avatar">${professor?'🎓':'👨‍🏫'}</div><div class="staff-identity"><b>${esc(a.name||t('دون اسم','Sans nom'))}</b><small dir="ltr">${esc(a.email||'')}</small></div><div class="staff-badges"><em class="staff-role ${type}">${roleLabel(type)}</em>${statusBadge(a)}</div></header>
  <div class="staff-card-meta">
   <span><small>${t('المؤسسة','Établissement')}</small><b>${esc(a.schoolName||t('غير محددة','Non défini'))}</b></span>
   ${professor?`<span><small>${t('الأقسام','Classes')}</small><b>${Number(a.classCount||0)}</b></span><span><small>${t('المواد','Matières')}</small><b>${Number(a.assignmentCount||0)}</b></span><span><small>${t('أقسام مشتركة','Classes liées')}</small><b>${Number(a.linkedClassCount||0)}</b></span>`:`<span><small>${t('الأقسام المخولة','Classes autorisées')}</small><b>${Number(a.classCount||0)}</b></span>`}
  </div>
  <footer>${professor?`<button class="primary" data-prof-detail>${t('فتح ملف الأستاذ','Ouvrir le dossier')}</button>`:''}${accountActions(a)}</footer>
 </article>`
}
async function runAccountAction(id,role,action,root,reload){
 const button=q(`[data-staff-id="${CSS.escape(id)}"] [data-staff-action="${action}"]`,root);if(button)button.disabled=true;
 try{
  if(action==='delete'){
   const msg=role==='professor'?t('سيُحذف حساب الأستاذ وملفه فقط. لن تُحذف مدرسة أو بيانات حسابات أخرى. المتابعة؟','Le compte et le dossier du professeur seront supprimés sans supprimer une école ni les données des autres comptes. Continuer ?'):t('سيُحذف حساب المعلم فقط ولن تُحذف المدرسة. المتابعة؟','Le compte enseignant sera supprimé sans supprimer l’école. Continuer ?');
   if(!confirm(msg)){if(button)button.disabled=false;return}
   await api('/api/owner/accounts/'+encodeURIComponent(id),{method:'DELETE',body:JSON.stringify({confirm:'DELETE'})});await reload();return
  }
  const r=await api('/api/owner/accounts/'+encodeURIComponent(id)+'/action',{method:'POST',body:JSON.stringify({action})});
  if(action==='reset_code')modal(t('رمز استعادة كلمة المرور','Code de récupération'),`<p>${t('أرسل هذا الرمز لصاحب الحساب. صالح لمدة 30 دقيقة.','Envoyez ce code au titulaire. Il est valable 30 minutes.')}</p><div class="owner-reset-code" dir="ltr">${esc(r.code)}</div>`);
  else await reload()
 }catch(e){if(button)button.disabled=false;alert(t('تعذر تنفيذ العملية.','Impossible d’effectuer l’opération.'))}
}
function curriculumOptions(catalog,selected=''){
 return (catalog?.levels||[]).map(l=>`<option value="${esc(l.code)}" ${l.code===selected?'selected':''}>${esc(l.code)} — ${esc(fr()?l.fr:l.ar)}</option>`).join('')
}
function subjectOptions(catalog,level,selected=''){
 const l=(catalog?.levels||[]).find(x=>x.code===level);return (l?.subjects||[]).map(s=>`<option value="${esc(s.key)}" ${s.key===selected?'selected':''}>${esc(fr()?s.fr:s.ar)} · ×${s.coefficient}</option>`).join('')
}
async function professorDetail(id,onChanged){
 const x=document.createElement('div');x.className='modal owner-professor-detail';x.innerHTML=`<div class="modal-card"><div class="modal-head"><div><small class="owner-eyebrow">PROFESSOR PROFILE</small><h2>${t('ملف الأستاذ','Dossier professeur')}</h2></div><button class="x">×</button></div><div class="staff-loading">${t('جارٍ تحميل الملف…','Chargement du dossier…')}</div></div>`;document.body.appendChild(x);q('.x',x).onclick=()=>x.remove();x.onclick=e=>{if(e.target===x)x.remove()};
 const load=async()=>{
  const r=await api('/api/owner/professors/'+encodeURIComponent(id)),p=r.professor,cat=r.catalog,host=q('.staff-loading,.prof-detail-content',x);if(!host)return;
  const assignmentByClass=new Map();for(const a of p.assignments||[]){const list=assignmentByClass.get(a.classId)||[];list.push(a);assignmentByClass.set(a.classId,list)}
  host.outerHTML=`<div class="prof-detail-content">
   <section class="prof-detail-hero"><div><b>${esc(p.account.name)}</b><small dir="ltr">${esc(p.account.email)}</small><span>${esc(p.schoolName||t('المؤسسة غير محددة','Établissement non défini'))}${p.year?' · '+esc(p.year):''}</span></div>${statusBadge(p.account)}</section>
   <div class="prof-detail-stats"><article><strong>${p.classes.length}</strong><span>${t('الأقسام','Classes')}</span></article><article><strong>${p.assignments.length}</strong><span>${t('المواد','Matières')}</span></article><article><strong>${p.versionCount}</strong><span>${t('نسخ حماية','Versions de sécurité')}</span></article></div>
   <div class="prof-detail-toolbar"><button class="primary" id="staffAddAssignment">+ ${t('إضافة مادة','Ajouter une matière')}</button><button id="staffAddClass">+ ${t('إضافة قسم فارغ','Ajouter une classe vide')}</button></div>
   <div class="prof-privacy-note">🔒 ${t('إدارة المنصة ترى الأقسام والمواد والمعاملات فقط؛ درجات الاختبارات والامتحانات غير معروضة هنا.','L’administration voit les classes, matières et coefficients uniquement ; les notes brutes ne sont pas affichées ici.')}</div>
   <div class="prof-admin-classes">${p.classes.map(cls=>`<article class="prof-admin-class"><header><div><b>${esc(cls.name)}</b><small>${esc(cls.levelCode||'—')} · ${cls.studentCount} ${t('تلميذ','élève(s)')}${cls.linkedProfessorCount>1?' · 🔗 '+cls.linkedProfessorCount+' '+t('أساتذة','professeurs'):''}</small></div><button class="danger ghost" data-remove-class="${esc(cls.id)}">${t('حذف القسم الفارغ','Supprimer classe vide')}</button></header><div class="prof-admin-assignments">${(assignmentByClass.get(cls.id)||[]).map(a=>`<div><span><b>${esc(a.subject)}</b><small>${t('المعامل','Coefficient')} ×${a.coefficient} ${a.coefficientSource==='official'?'✓':''}${a.hasGrades?' · '+t('به درجات محفوظة','notes enregistrées'):''}</small></span><button class="danger ghost" data-remove-assignment="${esc(a.id)}" ${a.hasGrades?'disabled title="'+esc(t('لا يمكن حذف مادة تحتوي درجات','Impossible de supprimer une matière contenant des notes'))+'"':''}>×</button></div>`).join('')||`<p>${t('لا توجد مواد في هذا القسم.','Aucune matière dans cette classe.')}</p>`}</div></article>`).join('')||`<div class="staff-empty">${t('لا توجد أقسام في ملف الأستاذ.','Aucune classe dans le dossier du professeur.')}</div>`}</div>
  </div>`;
  q('#staffAddClass',x).onclick=()=>addClassModal(cat,async payload=>{await api('/api/owner/professors/'+encodeURIComponent(id)+'/classes',{method:'POST',body:JSON.stringify(payload)});await load();await onChanged?.()});
  q('#staffAddAssignment',x).onclick=()=>addAssignmentModal(cat,p.classes,async payload=>{await api('/api/owner/professors/'+encodeURIComponent(id)+'/assignments',{method:'POST',body:JSON.stringify(payload)});await load();await onChanged?.()});
  qa('[data-remove-assignment]',x).forEach(b=>b.onclick=async()=>{if(b.disabled)return;if(!confirm(t('إزالة المادة من ملف الأستاذ؟ لن يُسمح بذلك إذا كانت تحتوي درجات.','Retirer cette matière du dossier ? L’opération sera refusée si elle contient des notes.')))return;b.disabled=true;try{await api('/api/owner/professors/'+encodeURIComponent(id)+'/assignments/'+encodeURIComponent(b.dataset.removeAssignment),{method:'DELETE',body:JSON.stringify({confirm:'REMOVE_ASSIGNMENT'})});await load();await onChanged?.()}catch(e){alert(e.code==='assignment_has_grades'?t('لا يمكن حذف المادة لأنها تحتوي درجات محفوظة.','Impossible : cette matière contient des notes enregistrées.'):t('تعذر حذف المادة.','Impossible de supprimer la matière.'));b.disabled=false}});
  qa('[data-remove-class]',x).forEach(b=>b.onclick=async()=>{if(!confirm(t('لا يُحذف القسم إلا إذا كان فارغًا تمامًا وغير مربوط بأستاذ آخر. المتابعة؟','La classe ne sera supprimée que si elle est totalement vide et non liée. Continuer ?')))return;b.disabled=true;try{await api('/api/owner/professors/'+encodeURIComponent(id)+'/classes/'+encodeURIComponent(b.dataset.removeClass),{method:'DELETE',body:JSON.stringify({confirm:'REMOVE_EMPTY_CLASS'})});await load();await onChanged?.()}catch(e){alert(e.code==='professor_class_not_empty'?t('القسم ليس فارغًا؛ لم يتم حذف أي بيانات.','La classe n’est pas vide ; aucune donnée n’a été supprimée.'):t('تعذر حذف القسم.','Impossible de supprimer la classe.'));b.disabled=false}})
 };
 load().catch(()=>{const el=q('.staff-loading',x);if(el)el.textContent=t('تعذر تحميل ملف الأستاذ.','Impossible de charger le dossier professeur.')})
}
function addClassModal(catalog,onSave){
 const x=modal(t('إضافة قسم للأستاذ','Ajouter une classe au professeur'),`<label>${t('اسم القسم','Nom de la classe')}<input id="staffClassName" maxlength="120" placeholder="2AS-A"></label><label>${t('المستوى','Niveau')}<select id="staffClassLevel">${curriculumOptions(catalog,'1AS')}</select></label><button class="primary" id="staffClassSave">${t('إضافة القسم','Ajouter la classe')}</button><p class="message"></p>`);
 q('#staffClassSave',x).onclick=async()=>{const name=q('#staffClassName',x).value.trim(),levelCode=q('#staffClassLevel',x).value,msg=q('.message',x);if(!name){msg.textContent=t('اكتب اسم القسم.','Saisissez le nom de la classe.');return}try{await onSave({name,levelCode});x.remove()}catch(e){msg.textContent=e.code==='professor_class_exists'?t('هذا القسم موجود بالفعل.','Cette classe existe déjà.'):t('تعذر إضافة القسم.','Impossible d’ajouter la classe.')}}
}
function addAssignmentModal(catalog,classes,onSave){
 if(!classes.length)return alert(t('أضف قسمًا أولًا.','Ajoutez d’abord une classe.'));
 const first=classes[0],x=modal(t('إضافة مادة للأستاذ','Ajouter une matière au professeur'),`<label>${t('القسم','Classe')}<select id="staffAssignmentClass">${classes.map(c=>`<option value="${esc(c.id)}" data-level="${esc(c.levelCode||'')}">${esc(c.name)} · ${esc(c.levelCode||'—')}</option>`).join('')}</select></label><label>${t('المادة','Matière')}<select id="staffAssignmentSubject"></select></label><label id="staffCustomSubjectLabel" style="display:none">${t('مادة أخرى','Autre matière')}<input id="staffCustomSubject" maxlength="120"></label><label id="staffManualCoefLabel" style="display:none">${t('المعامل اليدوي','Coefficient manuel')}<input id="staffManualCoef" type="number" min=".25" max="20" step=".25" value="1"></label><div id="staffCoefHint" class="staff-coef-hint"></div><button class="primary" id="staffAssignmentSave">${t('إضافة المادة','Ajouter la matière')}</button><p class="message"></p>`);
 const clsSel=q('#staffAssignmentClass',x),subSel=q('#staffAssignmentSubject',x),customLabel=q('#staffCustomSubjectLabel',x),coefLabel=q('#staffManualCoefLabel',x),hint=q('#staffCoefHint',x);
 const sync=()=>{const opt=clsSel.selectedOptions[0],level=opt?.dataset.level||'',l=(catalog?.levels||[]).find(v=>v.code===level);subSel.innerHTML=(l?.subjects||[]).map(s=>`<option value="${esc(s.key)}" data-coef="${s.coefficient}">${esc(fr()?s.fr:s.ar)} · ×${s.coefficient}</option>`).join('')+`<option value="__other__">${t('مادة أخرى…','Autre matière…')}</option>`;syncSub()};
 const syncSub=()=>{const other=subSel.value==='__other__';customLabel.style.display=other?'grid':'none';coefLabel.style.display=other?'grid':'none';hint.textContent=other?t('المعامل اليدوي متاح فقط للمادة الإضافية خارج القائمة الرسمية.','Le coefficient manuel est réservé à une matière ajoutée hors catalogue.'):t('المعامل الرسمي سيطبق تلقائيًا.','Le coefficient officiel sera appliqué automatiquement.')};
 clsSel.onchange=sync;subSel.onchange=syncSub;sync();
 q('#staffAssignmentSave',x).onclick=async()=>{const classId=clsSel.value,subjectKey=subSel.value==='__other__'?'':subSel.value,subject=subSel.value==='__other__'?q('#staffCustomSubject',x).value.trim():'',coefficient=subSel.value==='__other__'?Number(q('#staffManualCoef',x).value):undefined,msg=q('.message',x);if(subSel.value==='__other__'&&!subject){msg.textContent=t('اكتب اسم المادة.','Saisissez le nom de la matière.');return}try{await onSave({classId,subjectKey,subject,coefficient});x.remove()}catch(e){msg.textContent=e.code==='professor_assignment_exists'?t('هذه المادة موجودة بالفعل في القسم.','Cette matière existe déjà dans la classe.'):t('تعذر إضافة المادة.','Impossible d’ajouter la matière.')}}
}
function teacherSchoolGroups(staff){
 const teachers=Array.isArray(staff?.teachers)?staff.teachers:[],schools=Array.isArray(staff?.schools)?staff.schools:[],used=new Set(),groups=[];
 for(const school of schools){
  const rows=teachers.filter(a=>String(a.schoolId||'')===String(school.schoolId||''));rows.forEach(a=>used.add(String(a.id)+'|'+String(a.grantId||a.schoolId||'')));
  groups.push(`<section class="staff-school-group" data-school-id="${esc(school.schoolId||'')}">
   <header class="staff-school-head"><div class="staff-school-icon">🏫</div><div><b>${esc(school.schoolName||t('مدرسة','École'))}</b>${school.schoolNameFr?`<small>${esc(school.schoolNameFr)}</small>`:''}<small>${t('الحساب المسؤول','Compte responsable')}: ${esc(school.ownerName||'—')} · <span dir="ltr">${esc(school.ownerEmail||'')}</span></small></div><div class="staff-school-counts"><span><strong>${Number(school.teacherCount||rows.length)}</strong><small>${t('معلمون','Enseignants')}</small></span><span><strong>${Number(school.classCount||0)}</strong><small>${t('أقسام','Classes')}</small></span></div></header>
   <div class="staff-school-teachers">${rows.map(a=>card(a,'teacher')).join('')||`<div class="staff-empty compact">${t('لا يوجد معلمون مرتبطون بهذه المدرسة بعد.','Aucun enseignant lié à cette école pour le moment.')}</div>`}</div>
  </section>`)
 }
 const orphans=teachers.filter(a=>!used.has(String(a.id)+'|'+String(a.grantId||a.schoolId||'')));
 if(orphans.length)groups.push(`<section class="staff-school-group"><header class="staff-school-head"><div class="staff-school-icon">👨‍🏫</div><div><b>${t('معلمون غير مرتبطين بمدرسة ظاهرة','Enseignants sans école visible')}</b><small>${t('حسابات معلم قديمة أو صلاحيات لم تعد مرتبطة بمدرسة في القائمة.','Anciens comptes enseignants ou accès sans école visible.')}</small></div></header><div class="staff-school-teachers">${orphans.map(a=>card(a,'teacher')).join('')}</div></section>`);
 return groups.join('')||`<div class="staff-empty">${t('لا توجد مدارس أو حسابات معلمين بعد.','Aucune école ni aucun compte enseignant pour le moment.')}</div>`
}
function renderStaff(root,overview,staff,tab){
 const host=q('.staff-loading,.staff-content',root);if(!host)return;const s=overview.stats||{},items=tab==='professor'?staff.professors:staff.teachers,body=tab==='professor'?(items.map(a=>card(a,tab)).join('')||`<div class="staff-empty">${t('لا توجد حسابات في هذا القسم.','Aucun compte dans cette catégorie.')}</div>`):teacherSchoolGroups(staff);
 host.outerHTML=`<div class="staff-content">
  <div class="staff-stats"><article><strong>${Number(s.teachers||0)}</strong><span>${t('المعلمون','Enseignants')}</span></article><article><strong>${Number(s.professors||0)}</strong><span>${t('الأساتذة','Professeurs')}</span></article><article><strong>${Number(s.schools||0)}</strong><span>${t('المدارس','Écoles')}</span></article><article><strong>${Number(s.users||0)}</strong><span>${t('الحسابات','Comptes')}</span></article></div>
  <div class="staff-tabs"><button data-staff-tab="teacher" class="${tab==='teacher'?'on':''}">👨‍🏫 ${t('المعلمون','Enseignants')} <b>${staff.teachers.length}</b></button><button data-staff-tab="professor" class="${tab==='professor'?'on':''}">🎓 ${t('الأساتذة','Professeurs')} <b>${staff.professors.length}</b></button></div>
  <div class="staff-toolbar"><div><h3>${tab==='professor'?t('الأساتذة','Professeurs'):t('المدارس والمعلمون','Écoles et enseignants')}</h3><p>${tab==='professor'?t('المواد والأقسام والمعاملات وحالة الربط، دون عرض الدرجات الخام.','Matières, classes, coefficients et liaisons, sans afficher les notes brutes.'):t('كل مدرسة تظهر هنا ومعها المعلمون المرتبطون بها وصلاحياتهم.','Chaque école apparaît ici avec ses enseignants liés et leurs accès.')}</p></div><input id="staffSearch" type="search" placeholder="${t('بحث بالمدرسة أو المعلم أو البريد…','Rechercher école, enseignant ou e-mail…')}"></div>
  <div class="staff-list">${body}</div>
 </div>`;
 qa('[data-staff-tab]',root).forEach(b=>b.onclick=()=>renderStaff(root,overview,staff,b.dataset.staffTab));
 const search=q('#staffSearch',root);search.oninput=()=>{const v=search.value.trim().toLowerCase();if(tab==='teacher'){qa('.staff-school-group',root).forEach(group=>group.style.display=group.textContent.toLowerCase().includes(v)?'':'none')}else qa('.staff-card',root).forEach(row=>row.style.display=row.textContent.toLowerCase().includes(v)?'':'none')};
 const reload=async()=>{const [o,st]=await Promise.all([api('/api/owner/overview'),api('/api/owner/staff')]);renderStaff(root,o,st,tab)};
 qa('[data-staff-action]',root).forEach(b=>{b.onclick=()=>{const row=b.closest('.staff-card');runAccountAction(row.dataset.staffId,row.dataset.staffRole,b.dataset.staffAction,root,reload)}});
 qa('[data-prof-detail]',root).forEach(b=>b.onclick=()=>{const row=b.closest('.staff-card');professorDetail(row.dataset.staffId,reload)})
}
async function open(){
 if(!currentUser?.isSuperAdmin)return;const root=shell();
 try{const [overview,staff]=await Promise.all([api('/api/owner/overview'),api('/api/owner/staff')]);renderStaff(root,overview,staff,'professor')}catch{const el=q('.staff-loading',root);if(el)el.textContent=t('تعذر تحميل الطاقم التعليمي الآن.','Impossible de charger le personnel éducatif.')}
}
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('#ownerDashboardBtn');if(!b||!currentUser?.isSuperAdmin)return;
 e.preventDefault();e.stopImmediatePropagation();open();
},true);

const style=document.createElement('style');style.id='owner-staff-v1-style';style.textContent=`
.owner-staff-modal .modal-card{width:min(980px,calc(100vw - 24px));max-width:980px;max-height:92vh;overflow:auto;background:linear-gradient(180deg,#fbfdff,#f4f8fc)}
.owner-staff-modal .modal-head p{margin:4px 0 0;color:#657b8b;font-size:12px}.staff-loading{padding:38px;text-align:center;color:#607789}
.staff-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.staff-stats article{display:grid;gap:3px;padding:13px;border:1px solid #dce7ef;border-radius:14px;background:#fff}.staff-stats strong{font-size:25px;color:#0b4a7d}.staff-stats span{font-size:11px;color:#607789}
.staff-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;background:#eaf1f6;border-radius:13px;padding:5px}.staff-tabs button{border:0;background:transparent;padding:11px;border-radius:9px;font-weight:800;color:#49677a}.staff-tabs button.on{background:#fff;color:#0d6d9f;box-shadow:0 2px 8px #17384d10}.staff-tabs b{margin-inline-start:5px}
.staff-toolbar{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:15px 0 9px}.staff-toolbar h3{margin:0}.staff-toolbar p{margin:3px 0 0;color:#647987;font-size:11px}.staff-toolbar input{width:min(280px,100%);border:1px solid #d4e0e7;border-radius:11px;padding:10px 12px;background:#fff}
.staff-list{display:grid;gap:10px}.staff-school-group{display:grid;gap:9px;border:1px solid #d7e4eb;border-radius:16px;background:#f8fbfd;padding:10px}.staff-school-head{display:flex;align-items:center;gap:10px;padding:4px 2px}.staff-school-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#e9f4fb;font-size:21px}.staff-school-head>div:nth-child(2){display:grid;gap:2px;min-width:0;flex:1}.staff-school-head>div:nth-child(2)>b{font-size:14px;color:#123f5d}.staff-school-head small{font-size:9.5px;color:#6b7f8d;overflow-wrap:anywhere}.staff-school-counts{display:flex!important;gap:6px!important;flex:0 0 auto!important}.staff-school-counts span{min-width:58px;display:grid;place-items:center;padding:6px 8px;border-radius:10px;background:#fff;border:1px solid #dce8ee}.staff-school-counts strong{font-size:16px;color:#0d6d9f}.staff-school-teachers{display:grid;gap:8px}.staff-empty.compact{padding:16px}.staff-card{border:1px solid #dce6ec;border-radius:15px;background:#fff;padding:12px;box-shadow:0 7px 20px #203c4f0a}.staff-card>header{display:flex;align-items:center;gap:10px}.staff-avatar{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#eef7f3;font-size:20px}.staff-identity{display:grid;gap:2px;min-width:0;flex:1}.staff-identity b{font-size:14px}.staff-identity small{color:#6b7e8b;overflow:hidden;text-overflow:ellipsis}.staff-badges{display:flex;gap:5px;flex-wrap:wrap;justify-content:end}.staff-role,.staff-status{font-style:normal;font-size:10px;font-weight:900;padding:4px 7px;border-radius:999px}.staff-role.professor{background:#eceafb;color:#5a49a2}.staff-role.teacher{background:#e9f7f0;color:#146b4d}.staff-status.on{background:#eaf8ef;color:#167245}.staff-status.off{background:#fff0f0;color:#a93232}
.staff-card-meta{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:7px;margin:10px 0}.staff-card-meta span{display:grid;gap:2px;border:1px solid #e6edf1;background:#f9fbfc;border-radius:10px;padding:8px}.staff-card-meta small{font-size:9.5px;color:#718391}.staff-card-meta b{font-size:11.5px;overflow-wrap:anywhere}.staff-card>footer{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.staff-card>footer>.primary{margin-inline-end:auto}.staff-account-actions{display:flex;gap:6px;flex-wrap:wrap}.staff-account-actions button,.staff-card footer button{min-height:34px;border:1px solid #d5e1e7;background:#fff;border-radius:9px;padding:6px 10px;font-weight:800}.staff-card footer .primary{background:#137bb4;color:#fff;border-color:#137bb4}.staff-card .danger{color:#b42318;border-color:#efcaca;background:#fff8f8}.staff-empty{padding:30px;text-align:center;color:#718391}
.owner-professor-detail .modal-card{width:min(820px,calc(100vw - 24px));max-width:820px;max-height:92vh;overflow:auto}.prof-detail-hero{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;border-radius:13px;background:#f2f7fa;border:1px solid #dde9ef}.prof-detail-hero>div{display:grid;gap:3px}.prof-detail-hero small,.prof-detail-hero span{color:#677b89;font-size:11px}.prof-detail-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.prof-detail-stats article{display:grid;gap:2px;text-align:center;padding:10px;border:1px solid #e0e9ee;border-radius:11px}.prof-detail-stats strong{font-size:21px;color:#135e86}.prof-detail-stats span{font-size:10px;color:#6a7d89}.prof-detail-toolbar{display:flex;gap:7px;margin:10px 0}.prof-detail-toolbar button{min-height:38px;border-radius:9px;border:1px solid #d5e1e7;background:#fff;font-weight:800}.prof-detail-toolbar .primary{background:#1578ad;color:#fff;border-color:#1578ad}.prof-privacy-note{padding:9px 11px;border-radius:10px;background:#eef8f4;border:1px solid #d3eae0;color:#476c5d;font-size:10.5px;line-height:1.5;margin-bottom:10px}.prof-admin-classes{display:grid;gap:9px}.prof-admin-class{border:1px solid #dee8ed;border-radius:12px;padding:10px;background:#fff}.prof-admin-class>header{display:flex;justify-content:space-between;gap:9px;align-items:start}.prof-admin-class header>div{display:grid;gap:2px}.prof-admin-class header small{color:#70828e;font-size:10px}.prof-admin-assignments{display:grid;gap:6px;margin-top:8px}.prof-admin-assignments>div{display:flex;justify-content:space-between;gap:8px;align-items:center;background:#f8fbfc;border-radius:9px;padding:7px 9px}.prof-admin-assignments span{display:grid}.prof-admin-assignments small{font-size:9.5px;color:#6f818d}.ghost{padding:5px 8px!important;min-height:30px!important}.ghost:disabled{opacity:.45;cursor:not-allowed}.staff-coef-hint{padding:8px 9px;border-radius:9px;background:#f3f8fa;color:#5e7583;font-size:10px}
@media(max-width:650px){.staff-school-head{align-items:flex-start}.staff-school-counts{display:grid!important;grid-template-columns:1fr 1fr}.staff-school-counts span{min-width:48px;padding:5px}.staff-stats{grid-template-columns:1fr 1fr}.staff-toolbar{display:grid;align-items:stretch}.staff-toolbar input{width:100%}.staff-card-meta{grid-template-columns:1fr 1fr}.staff-card>header{align-items:flex-start}.staff-badges{max-width:42%}.staff-card>footer{display:grid}.staff-card>footer>.primary{width:100%;margin:0}.staff-account-actions{display:grid;grid-template-columns:1fr 1fr 1fr}.staff-account-actions button{padding:6px 4px;font-size:10px}.prof-detail-toolbar{display:grid;grid-template-columns:1fr 1fr}.prof-admin-class>header{display:grid}.prof-admin-class>header button{justify-self:start}}
`;document.head.appendChild(style);
window.NataijiOwnerStaff={open};
})();