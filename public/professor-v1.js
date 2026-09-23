(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>localStorage.getItem('nataiji-lang')||'ar',fr=()=>lang()==='fr';
const tr=(ar,ff)=>fr()?ff:ar;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||('p-'+Date.now().toString(36)+Math.random().toString(36).slice(2));
let profile=null,professorUser=null;

function hideLegacy(){
 document.documentElement.classList.add('nataiji-professor-mode');
 const shell=q('.app-shell'),nav=q('.bottom-nav');
 if(shell)shell.style.display='none';
 if(nav)nav.style.display='none';
}
function showLegacy(){
 document.documentElement.classList.remove('nataiji-professor-mode');
 const shell=q('.app-shell'),nav=q('.bottom-nav');
 if(shell)shell.style.display='';
 if(nav)nav.style.display='';
 q('#nataijiProfessorRoot')?.remove();
}
function root(){
 let el=q('#nataijiProfessorRoot');
 if(!el){el=document.createElement('main');el.id='nataijiProfessorRoot';el.className='professor-app';document.body.appendChild(el)}
 return el;
}
function emptyProfile(){return{schoolName:'',year:'',classes:[],assignments:[],marks:{}}}
function normalize(p){
 const x=p&&typeof p==='object'?structuredClone(p):emptyProfile();
 x.schoolName=String(x.schoolName||'');x.year=String(x.year||'');
 x.classes=Array.isArray(x.classes)?x.classes:[];
 x.assignments=Array.isArray(x.assignments)?x.assignments:[];
 x.marks=x.marks&&typeof x.marks==='object'?x.marks:{};
 return x
}
async function saveProfile(message=''){
 const r=await api('/api/professor/profile',{method:'PUT',body:JSON.stringify({profile})});
 profile=normalize(r.profile);
 if(message)toast(message);
 return profile
}
function toast(text){
 let t=q('.professor-toast');if(!t){t=document.createElement('div');t.className='professor-toast';document.body.appendChild(t)}
 t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)
}
function profModal(title,body){
 const wrap=document.createElement('div');wrap.className='professor-modal';wrap.innerHTML=`<div class="professor-modal-card"><header><h2>${esc(title)}</h2><button type="button" class="professor-x">×</button></header><div class="professor-modal-body">${body}</div></div>`;document.body.appendChild(wrap);
 const close=()=>wrap.remove();q('.professor-x',wrap).onclick=close;wrap.onclick=e=>{if(e.target===wrap)close()};return{wrap,close}
}
function classById(id){return profile.classes.find(c=>String(c.id)===String(id))}
function studentsFor(classId){return classById(classId)?.students||[]}
function assignmentMarks(id){profile.marks[id]=profile.marks[id]&&typeof profile.marks[id]==='object'?profile.marks[id]:{};return profile.marks[id]}
function gradeStats(a){
 const marks=assignmentMarks(a.id),students=studentsFor(a.classId),avgs=[];
 for(const s of students){const m=marks[s.id]||{},t=Number(m.test),e=Number(m.exam);if(m.test!==''&&m.test!=null&&m.exam!==''&&m.exam!=null&&Number.isFinite(t)&&Number.isFinite(e))avgs.push((t+e)/2)}
 return{students:students.length,completed:avgs.length,avg:avgs.length?avgs.reduce((x,y)=>x+y,0)/avgs.length:null}
}
function dashboard(){
 const el=root(),assignments=profile.assignments||[];
 const cards=assignments.map(a=>{const cls=classById(a.classId),s=gradeStats(a);return `<article class="professor-assignment" data-assignment="${esc(a.id)}"><div class="professor-assignment-icon">📘</div><div class="professor-assignment-main"><small>${tr('المادة','Matière')}</small><h3>${esc(a.subject)}</h3><p>${esc(cls?.name||tr('قسم غير محدد','Classe non définie'))}</p><div class="professor-kpis"><span>${s.students} ${tr('تلميذ','élève(s)')}</span><span>${s.completed}/${s.students} ${tr('مكتمل','terminé')}</span><span>${s.avg==null?'—':s.avg.toFixed(2)} /20</span></div></div><div class="professor-card-actions"><button type="button" class="primary" data-open-grade="${esc(a.id)}">${tr('إدخال الدرجات','Saisir les notes')}</button><button type="button" data-remove-assignment="${esc(a.id)}">⋯</button></div></article>`}).join('');
 el.innerHTML=`
 <div class="professor-shell">
  <header class="professor-topbar">
   <div><img src="/nataiji-brand-mark.png" alt="" width="48" height="48"><span><small>${tr('حساب الأستاذ','Compte professeur')}</small><b>${esc(professorUser?.name||'')}</b></span></div>
   <button type="button" id="professorLogout">${tr('خروج','Déconnexion')}</button>
  </header>
  <section class="professor-hero">
   <div><span class="professor-badge">${tr('أستاذ','Professeur')}</span><h1>${esc(profile.schoolName||tr('أضف اسم المؤسسة','Ajoutez le nom de l’établissement'))}</h1><p>${profile.year?esc(profile.year):tr('أضف السنة الدراسية من الإعدادات','Ajoutez l’année scolaire dans les paramètres')}</p></div>
   <div class="professor-hero-actions"><button type="button" id="professorAddAssignment" class="primary">+ ${tr('إضافة مادة وقسم','Ajouter matière + classe')}</button><button type="button" id="professorSettings">⚙ ${tr('الإعدادات','Paramètres')}</button></div>
  </section>
  <section class="professor-summary">
   <article><strong>${assignments.length}</strong><span>${tr('مادة/قسم','Matière/classe')}</span></article>
   <article><strong>${profile.classes.length}</strong><span>${tr('أقسام','Classes')}</span></article>
   <article><strong>${new Set(profile.classes.flatMap(c=>(c.students||[]).map(s=>s.id))).size}</strong><span>${tr('تلاميذ','Élèves')}</span></article>
  </section>
  <section class="professor-content">
   <div class="professor-section-title"><div><h2>${tr('موادي وأقسامي','Mes matières et classes')}</h2><p>${tr('كل مادة مرتبطة بقسم محدد ولها اختبار واحد وامتحان واحد.','Chaque matière est liée à une classe avec un test et un examen.')}</p></div></div>
   <div class="professor-grid">${cards||`<div class="professor-empty"><div>📚</div><h3>${tr('لم تضف أي مادة بعد','Aucune matière ajoutée')}</h3><p>${tr('ابدأ بإضافة المادة والقسم الذي تدرّسه.','Commencez par ajouter la matière et la classe que vous enseignez.')}</p><button class="primary" id="professorEmptyAdd">+ ${tr('إضافة مادة وقسم','Ajouter matière + classe')}</button></div>`}</div>
  </section>
 </div>`;
 q('#professorLogout',el).onclick=logout;
 q('#professorAddAssignment',el).onclick=openAssignment;
 q('#professorEmptyAdd',el)?.addEventListener('click',openAssignment);
 q('#professorSettings',el).onclick=openSettings;
 qa('[data-open-grade]',el).forEach(b=>b.onclick=()=>openGrades(b.dataset.openGrade));
 qa('[data-remove-assignment]',el).forEach(b=>b.onclick=()=>removeAssignment(b.dataset.removeAssignment));
}
function openSettings(){
 const m=profModal(tr('إعدادات الأستاذ','Paramètres du professeur'),`<label>${tr('اسم المؤسسة','Établissement')}<input id="profSchool" value="${esc(profile.schoolName)}" maxlength="160"></label><label>${tr('السنة الدراسية','Année scolaire')}<input id="profYear" value="${esc(profile.year)}" maxlength="40" placeholder="2026-2027"></label><button class="primary professor-save-settings">${tr('حفظ','Enregistrer')}</button><p class="professor-msg"></p>`);
 q('.professor-save-settings',m.wrap).onclick=async()=>{const b=q('.professor-save-settings',m.wrap);b.disabled=true;profile.schoolName=q('#profSchool',m.wrap).value.trim();profile.year=q('#profYear',m.wrap).value.trim();try{await saveProfile(tr('تم حفظ الإعدادات','Paramètres enregistrés'));m.close();dashboard()}catch{q('.professor-msg',m.wrap).textContent=tr('تعذر الحفظ','Enregistrement impossible')}finally{b.disabled=false}}
}
function openAssignment(){
 const options=(profile.classes||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 const m=profModal(tr('إضافة مادة وقسم','Ajouter matière + classe'),`<label>${tr('المادة','Matière')}<input id="profSubject" maxlength="100" placeholder="${tr('مثال: الرياضيات','Ex. Mathématiques')}"></label><label>${tr('القسم','Classe')}<select id="profClassExisting"><option value="">${tr('قسم جديد','Nouvelle classe')}</option>${options}</select></label><label id="profNewClassLabel">${tr('اسم القسم الجديد','Nom de la nouvelle classe')}<input id="profNewClass" maxlength="100" placeholder="${tr('مثال: 1AS-A','Ex. 1AS-A')}"></label><button class="primary professor-save-assignment">${tr('إضافة','Ajouter')}</button><p class="professor-msg"></p>`);
 const sel=q('#profClassExisting',m.wrap),newLabel=q('#profNewClassLabel',m.wrap);sel.onchange=()=>newLabel.style.display=sel.value?'none':'grid';
 q('.professor-save-assignment',m.wrap).onclick=async()=>{const subject=q('#profSubject',m.wrap).value.trim(),classId=sel.value,className=q('#profNewClass',m.wrap).value.trim(),msg=q('.professor-msg',m.wrap);if(!subject||(!classId&&!className)){msg.textContent=tr('اختر المادة والقسم','Choisissez la matière et la classe');return}let cid=classId;if(!cid){const same=profile.classes.find(c=>String(c.name).trim().toLowerCase()===className.toLowerCase());if(same)cid=same.id;else{cid=uid();profile.classes.push({id:cid,name:className,students:[]})}}if(profile.assignments.some(a=>a.classId===cid&&String(a.subject).trim().toLowerCase()===subject.toLowerCase())){msg.textContent=tr('هذه المادة مضافة لهذا القسم بالفعل','Cette matière existe déjà pour cette classe');return}profile.assignments.push({id:uid(),subject,classId:cid});try{await saveProfile(tr('تمت إضافة المادة والقسم','Matière et classe ajoutées'));m.close();dashboard()}catch{msg.textContent=tr('تعذر الحفظ','Enregistrement impossible')}}
}
async function removeAssignment(id){
 const a=profile.assignments.find(x=>x.id===id);if(!a)return;
 if(!confirm(tr(`حذف ${a.subject} من هذا القسم؟ لن يتأثر أي تكليف آخر.`,`Supprimer ${a.subject} de cette classe ? Les autres affectations ne seront pas modifiées.`)))return;
 profile.assignments=profile.assignments.filter(x=>x.id!==id);delete profile.marks[id];await saveProfile(tr('تم حذف التكليف','Affectation supprimée'));dashboard()
}
function addStudent(classId,onDone){
 const m=profModal(tr('إضافة تلميذ','Ajouter un élève'),`<label>${tr('اسم التلميذ','Nom de l’élève')}<input id="profStudentName" maxlength="140"></label><label>NNS <small>${tr('(اختياري)','(facultatif)')}</small><input id="profStudentNns" maxlength="50"></label><button class="primary professor-save-student">${tr('إضافة','Ajouter')}</button><p class="professor-msg"></p>`);
 q('.professor-save-student',m.wrap).onclick=async()=>{const name=q('#profStudentName',m.wrap).value.trim(),nns=q('#profStudentNns',m.wrap).value.trim();if(!name){q('.professor-msg',m.wrap).textContent=tr('اكتب اسم التلميذ','Saisissez le nom de l’élève');return}const cls=classById(classId);cls.students=Array.isArray(cls.students)?cls.students:[];cls.students.push({id:uid(),name,nns});try{await saveProfile(tr('تمت إضافة التلميذ','Élève ajouté'));m.close();onDone?.()}catch{q('.professor-msg',m.wrap).textContent=tr('تعذر الحفظ','Enregistrement impossible')}}
}
function cleanGrade(v){const s=String(v??'').replace(',','.').trim();if(s==='')return'';const n=Number(s);if(!Number.isFinite(n))return'';return String(Math.max(0,Math.min(20,n)))}
function openGrades(id){
 const a=profile.assignments.find(x=>x.id===id);if(!a)return;const cls=classById(a.classId),students=studentsFor(a.classId),marks=assignmentMarks(a.id);
 const rows=students.map((s,i)=>{const m=marks[s.id]||{test:'',exam:''},has=m.test!==''&&m.test!=null&&m.exam!==''&&m.exam!=null,t=Number(m.test),e=Number(m.exam),sum=has&&Number.isFinite(t)&&Number.isFinite(e)?t+e:null,avg=sum==null?null:sum/2;return`<tr><td>${i+1}</td><td class="professor-student-name"><b>${esc(s.name)}</b><small>${esc(s.nns||'')}</small></td><td><input inputmode="decimal" data-grade="test" data-student="${esc(s.id)}" value="${esc(m.test??'')}" placeholder="—"></td><td><input inputmode="decimal" data-grade="exam" data-student="${esc(s.id)}" value="${esc(m.exam??'')}" placeholder="—"></td><td data-sum="${esc(s.id)}">${sum==null?'—':sum.toFixed(2)}</td><td data-avg="${esc(s.id)}">${avg==null?'—':avg.toFixed(2)}</td></tr>`}).join('');
 const el=root();el.innerHTML=`<div class="professor-shell professor-grades-view"><header class="professor-topbar"><div><button type="button" id="professorBack" class="professor-back">→</button><span><small>${tr('المادة والقسم','Matière et classe')}</small><b>${esc(a.subject)} — ${esc(cls?.name||'')}</b></span></div><button type="button" id="professorSaveGrades" class="primary">${tr('حفظ الدرجات','Enregistrer')}</button></header><section class="professor-content"><div class="professor-grade-head"><div><span class="professor-badge">${tr('اختبار واحد + امتحان واحد','Un test + un examen')}</span><h1>${esc(a.subject)}</h1><p>${esc(cls?.name||'')} · ${tr('المجموع من 40 والمعدل من 20','Total sur 40 et moyenne sur 20')}</p></div><button type="button" id="professorAddStudent">+ ${tr('إضافة تلميذ','Ajouter un élève')}</button></div><div class="professor-table-wrap"><table class="professor-grade-table"><thead><tr><th>#</th><th>${tr('التلميذ','Élève')}</th><th>${tr('الاختبار /20','Test /20')}</th><th>${tr('الامتحان /20','Examen /20')}</th><th>${tr('المجموع /40','Total /40')}</th><th>${tr('المعدل /20','Moyenne /20')}</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="professor-no-students">${tr('لا يوجد تلاميذ في هذا القسم بعد.','Aucun élève dans cette classe.')}</td></tr>`}</tbody></table></div><p class="professor-save-state" id="professorSaveState">${tr('لا توجد تغييرات غير محفوظة','Aucune modification non enregistrée')}</p></section></div>`;
 q('#professorBack',el).onclick=dashboard;q('#professorAddStudent',el).onclick=()=>addStudent(a.classId,()=>openGrades(id));
 const dirty=new Set();
 const recalc=sid=>{const m=marks[sid]||{},t=Number(m.test),e=Number(m.exam),ok=m.test!==''&&m.test!=null&&m.exam!==''&&m.exam!=null&&Number.isFinite(t)&&Number.isFinite(e),sum=ok?t+e:null;const se=q(`[data-sum="${CSS.escape(sid)}"]`,el),ae=q(`[data-avg="${CSS.escape(sid)}"]`,el);if(se)se.textContent=sum==null?'—':sum.toFixed(2);if(ae)ae.textContent=sum==null?'—':(sum/2).toFixed(2)};
 qa('[data-grade]',el).forEach(inp=>{inp.oninput=()=>{const sid=inp.dataset.student,kind=inp.dataset.grade;inp.value=cleanGrade(inp.value);marks[sid]=marks[sid]||{test:'',exam:''};marks[sid][kind]=inp.value;dirty.add(sid);q('#professorSaveState',el).textContent=tr('توجد تغييرات غير محفوظة','Modifications non enregistrées');recalc(sid)}});
 q('#professorSaveGrades',el).onclick=async()=>{const b=q('#professorSaveGrades',el);b.disabled=true;try{await saveProfile();q('#professorSaveState',el).textContent=tr('✓ تم حفظ الدرجات','✓ Notes enregistrées');dirty.clear()}catch{q('#professorSaveState',el).textContent=tr('تعذر الحفظ — أعد المحاولة','Échec de l’enregistrement — réessayez')}finally{b.disabled=false}}
}
async function logout(){try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}currentUser=null;location.reload()}
async function renderProfessor(user){
 professorUser=user;hideLegacy();const el=root();el.innerHTML=`<div class="professor-loading"><img src="/nataiji-brand-mark.png" width="64" height="64" alt=""><p>${tr('جاري تحميل حساب الأستاذ…','Chargement du compte professeur…')}</p></div>`;
 try{const r=await api('/api/professor/profile');profile=normalize(r.profile);dashboard()}catch(e){el.innerHTML=`<div class="professor-loading"><h2>${tr('تعذر تحميل حساب الأستاذ','Impossible de charger le compte professeur')}</h2><button class="primary" onclick="location.reload()">${tr('إعادة المحاولة','Réessayer')}</button></div>`}
}
function chooseAccountType(user){
 hideLegacy();const el=root();el.innerHTML=`<div class="professor-choice"><div class="professor-choice-card"><img src="/nataiji-brand-mark.png" width="72" height="72" alt=""><small>${tr('إعداد الحساب لأول مرة','Configuration initiale')}</small><h1>${tr('اختر طريقة استخدام نتائجي','Choisissez votre mode d’utilisation')}</h1><p>${tr('هذا الاختيار يتم مرة واحدة. لن نغيّر نظام المعلمين الحالي.','Ce choix se fait une seule fois. Le fonctionnement actuel des enseignants reste inchangé.')}</p><div class="professor-choice-grid"><button type="button" data-profile-type="teacher"><span>👨‍🏫</span><b>${tr('معلم','Enseignant')}</b><small>${tr('متابعة النظام الحالي كما هو','Continuer avec le système actuel')}</small></button><button type="button" data-profile-type="professor" class="featured"><span>🎓</span><b>${tr('أستاذ','Professeur')}</b><small>${tr('مواد وأقسام، اختبار واحد وامتحان واحد','Matières et classes, un test et un examen')}</small></button></div><p class="professor-choice-msg"></p></div></div>`;
 qa('[data-profile-type]',el).forEach(b=>b.onclick=async()=>{qa('[data-profile-type]',el).forEach(x=>x.disabled=true);const type=b.dataset.profileType,msg=q('.professor-choice-msg',el);try{const r=await api('/api/account/profile-type',{method:'POST',body:JSON.stringify({type})});currentUser=r.user;if(type==='professor')return renderProfessor(r.user);showLegacy();return startApp()}catch{msg.textContent=tr('تعذر حفظ الاختيار. أعد المحاولة.','Impossible d’enregistrer le choix. Réessayez.');qa('[data-profile-type]',el).forEach(x=>x.disabled=false)}})
}
window.NataijiProfessor={
 activate(user){
  if(user?.needsProfileChoice===true)return chooseAccountType(user);
  if(user?.role==='professor'||user?.profileType==='professor')return renderProfessor(user);
  return false
 }
};
})();