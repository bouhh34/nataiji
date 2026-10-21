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
 ['staff-meetings','محاضر اجتماعات المعلمين','Réunions pédagogiques','users'],
 ['inventory','الأثاث','Inventaire du mobilier','archive'],
 ['referrals','الإحالات','Orientations et renvois','file-text'],
 ['notice-board','المعلقات','Affichages','bell'],
 ['model-lessons','الدروس النموذجية','Leçons modèles','book-open'],
 ['teacher-health','السجل الصحي للمعلمين','Santé du personnel','heart'],
 ['student-health','السجل الصحي للتلاميذ','Santé des élèves','heart']
];
let user=null,institution=null,currentCategory='enrolment',overview=null,records=[];

/* Local SVGs render in web browsers and Android WebView even without icon fonts. */
const directorSvgPaths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l-1.9 1.9a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.48V22h-2.7v-2.17a1.6 1.6 0 0 0-1-1.48 1.6 1.6 0 0 0-1.77.32l-1.9-1.9A1.6 1.6 0 0 0 8 15a1.6 1.6 0 0 0-1.48-1H4v-2.7h2.52A1.6 1.6 0 0 0 8 10.3a1.6 1.6 0 0 0-.32-1.77l1.9-1.9a1.6 1.6 0 0 0 1.77.32 1.6 1.6 0 0 0 1-1.48V3h2.7v2.47a1.6 1.6 0 0 0 1 1.48 1.6 1.6 0 0 0 1.77-.32l1.9 1.9a1.6 1.6 0 0 0-.32 1.77 1.6 1.6 0 0 0 1.48 1H23V14h-2.12a1.6 1.6 0 0 0-1.48 1z"/>',
 school:'<path d="M3 21V8l9-5 9 5v13H3zM9 21v-6h6v6M7 10h2m6 0h2M7 13h2m6 0h2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
 bookmark:'<path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-5-7 5z"/>',
 list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
 arrow:'<path d="m15 18-6-6 6-6"/>',
 enrolment:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 8h6M20 5v6"/>',
 correspondence:'<path d="M4 7h16M4 17h16m-4-4 4 4-4 4M8 3 4 7l4 4"/>',
 visits:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M9 15h6"/>',
 visitor:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="10" cy="10" r="2"/><path d="M6 17c0-3 8-3 8 0M16 8h3M16 12h3"/>',
 attendance:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m5 6 2 2 4-4"/>',
 supervision:'<path d="M12 22c5-2 8-6 8-11V5l-8-3-8 3v6c0 5 3 9 8 11z"/><path d="m9 12 2 2 4-4"/>',
 absence:'<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 12-4M16 19h6"/>',
 meeting:'<circle cx="12" cy="7" r="3"/><path d="M7 19v-2a5 5 0 0 1 10 0v2M3 9a2 2 0 1 0 0 4M21 9a2 2 0 1 1 0 4M2 21v-3a3 3 0 0 1 3-3M22 21v-3a3 3 0 0 0-3-3"/>',
 inventory:'<path d="M5 13h14v7H5zM7 13V5h10v8M4 20v2m16-2v2M7 9h10"/>',
 referrals:'<path d="M6 2h9l5 5v15H6zM15 2v6h5M9 13h8M9 17h6"/>',
 notices:'<path d="M3 11v3l4 1 10 6V4L7 10l-4 1zM7 15l1 6h4l-2-5M20 9l2-2m-2 9 2 2"/>',
 lesson:'<path d="m2 10 10-6 10 6-10 6zM6 12v5c3 3 9 3 12 0v-5M22 10v7"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'
};
const directorIcon=(name,size=20)=>'<svg class="director-svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(directorSvgPaths[name]||directorSvgPaths.list)+'</svg>';
const directorCardVisuals={
 enrolment:['enrolment','teal'],correspondence:['correspondence','blue'],visits:['visits','amber'],'visitor-log':['visitor','purple'],
 'daily-attendance':['attendance','blue'],supervision:['supervision','teal'],'student-absence':['absence','red'],'staff-meetings':['meeting','purple'],
 inventory:['inventory','amber'],referrals:['referrals','blue'],'notice-board':['notices','purple'],'model-lessons':['lesson','teal'],
 'teacher-health':['lock','locked'],'student-health':['lock','locked']
};

let pendingSyncBusy=false;
const health=new Set(['teacher-health','student-health']);
const registerFields={
 enrolment:[['studentName','اسم التلميذ','Nom de l’élève'],['className','القسم','Classe'],['studentCode','رقم القيد','N° matricule'],['birthDate','تاريخ الميلاد','Date de naissance'],['guardian','ولي الأمر','Responsable légal']],
 correspondence:[['direction','وارد أم صادر','Entrant ou sortant'],['sender','الجهة المرسلة','Expéditeur'],['recipient','الجهة المستقبلة','Destinataire']],
 visits:[['visitor','الزائر','Visiteur'],['visitPurpose','الغرض','Objet de la visite'],['visitTime','وقت الزيارة','Heure']],
 'visitor-log':[['personName','الاسم','Nom'],['purpose','سبب الدخول','Motif'],['entryTime','وقت الدخول','Entrée'],['exitTime','وقت الخروج','Sortie']],
 'daily-attendance':[['personName','اسم المعلم أو الموظف','Nom du personnel'],['status','حاضر / غائب / متأخر','Présent / absent / en retard'],['arrivalTime','وقت الحضور','Heure d’arrivée']],
 supervision:[['teacherName','اسم المعلم','Enseignant'],['className','القسم','Classe'],['observations','ملاحظات الرقابة','Observations']],
 'student-absence':[['studentName','اسم التلميذ','Élève'],['className','القسم','Classe'],['status','مبرر / غير مبرر','Justifiée / non justifiée']],
 'staff-meetings':[['participants','الحاضرون','Participants'],['agenda','جدول الأعمال','Ordre du jour'],['decisions','القرارات','Décisions']],
 inventory:[['itemName','اسم الأثاث','Désignation'],['quantity','الكمية','Quantité'],['condition','الحالة','État'],['location','الموقع','Emplacement']],
 referrals:[['studentName','اسم التلميذ','Élève'],['recipient','جهة الإحالة','Destinataire'],['reason','سبب الإحالة','Motif']],
 'notice-board':[['postedBy','المعلق من طرف','Publié par'],['displayLocation','مكان التعليق','Lieu']],
 'model-lessons':[['teacherName','المعلم','Enseignant'],['className','القسم','Classe'],['subjectName','المادة','Matière'],['topic','الدرس','Leçon']]
};
function registerCustomFields(category,details){
 const choices={direction:[['وارد','Entrant'],['صادر','Sortant']],status:category==='daily-attendance'?[['حاضر','Présent'],['غائب','Absent'],['متأخر','En retard']]:category==='student-absence'?[['مبرر','Justifiée'],['غير مبرر','Non justifiée']]:null};
 const longFields=new Set(['participants','agenda','decisions','observations','reason']);
 return (registerFields[category]||[]).map(([key,ar,fr])=>{
  const value=String(details[key]??''),required=category==='enrolment'&&key==='studentName',name='custom-'+key;
  let control;
  if(choices[key]){
   const options=choices[key],known=options.some(pair=>pair.includes(value));
   control='<select name="'+name+'"><option value="">'+t('اختر الحالة','Choisir')+'</option>'+
    (value&&!known?'<option selected value="'+esc(value)+'">'+esc(value)+'</option>':'')+
    options.map(([ar,fr])=>'<option value="'+ar+'"'+([ar,fr].includes(value)?' selected':'')+'>'+t(ar,fr)+'</option>').join('')+'</select>';
  }else if(longFields.has(key)){
   control='<textarea name="'+name+'" rows="3" maxlength="1000">'+esc(value)+'</textarea>';
  }else{
   let type=key==='birthDate'?'date':/Time$/.test(key)?'time':key==='quantity'?'number':'text';
   // Keep legacy free-text dates/times intact when editing an older record.
   if(value&&((type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(value))||(type==='time'&&!/^\d{2}:\d{2}(:\d{2})?$/.test(value))||(type==='number'&&!/^\d+$/.test(value))))type='text';
   control='<input name="'+name+'" type="'+type+'" '+(required?'required ':'')+(type==='number'?'min="0" step="1" ':'')+'maxlength="180" value="'+esc(value)+'">';
  }
  return '<label>'+t(ar,fr)+(required?' *':'')+control+'</label>';
 }).join('');
}
function directorOfficialHeader(className=''){
 const d=institution||{},school={ar:d.name||'',fr:d.name_fr||d.name||''},region={ar:d.region||'',fr:d.region||''},district={ar:d.district||'',fr:d.district||''},cls={ar:className,fr:className};
 const nns='',year=String(d.academic_year||'');
 return `<header class="official-head">
  <section class="official-side official-fr" dir="ltr" lang="fr">
   <b class="official-strong">République Islamique de Mauritanie</b>
   <strong>Honneur - Fraternité - Justice</strong>
   <span>Ministère de l’Éducation et de la Réforme du Système Éducatif</span>
   ${region.fr?`<span>Direction régionale de l’Éducation : <b>${esc(region.fr)}</b></span>`:''}
   ${district.fr?`<span>Moughataa : <b>${esc(district.fr)}</b></span>`:''}
   ${school.fr?`<span>Établissement : <b>${esc(school.fr)}</b></span>`:''}
   ${nns?`<span>N° scolaire : <b dir="ltr">${esc(nns)}</b></span>`:''}
   ${year?`<span>Année scolaire : <b dir="ltr">${esc(year)}</b></span>`:''}
   ${className?`<span>Classe : <b>${esc(cls.fr)}</b></span>`:''}
  </section>
  <section class="official-center"><div class="basmala" lang="ar" dir="rtl">بسم الله الرحمن الرحيم</div><img src="${location.origin}/1280px-National_Seal_of_Mauritania.svg.png" alt="شعار الجمهورية الإسلامية الموريتانية"></section>
  <section class="official-side official-ar" dir="rtl" lang="ar">
   <b class="official-strong">الجمهورية الإسلامية الموريتانية</b>
   <strong>شرف - إخاء - عدل</strong>
   <span>وزارة التربية وإصلاح النظام التعليمي</span>
   ${region.ar?`<span>الإدارة الجهوية للتربية بولاية: <b>${esc(region.ar)}</b></span>`:''}
   ${district.ar?`<span>المقاطعة: <b>${esc(district.ar)}</b></span>`:''}
   ${school.ar?`<span>المؤسسة: <b>${esc(school.ar)}</b></span>`:''}
   ${nns?`<span>الرقم المدرسي: <b dir="ltr">${esc(nns)}</b></span>`:''}
   ${year?`<span>السنة الدراسية: <b dir="ltr">${esc(year)}</b></span>`:''}
   ${className?`<span>القسم: <b>${esc(cls.ar)}</b></span>`:''}
  </section>
 </header>`
}

function printDirectorRecord(record){
 return printRegisterDocument(record,record.details?.kind==='staff-attendance-v1'?staffAttendanceTable(record):null);
}
function printRegisterDocument(record,tableHtml=null){
 const category=labels.find(x=>x[0]===record.category),rows=[...Object.entries(record.details||{}).filter(([key])=>!['studentRef','staff','kind'].includes(key)).map(([key,value])=>{
  const field=(registerFields[record.category]||[]).find(x=>x[0]===key);
  return [key==='notes'?'ملاحظات / Observations':field?field[1]+' / '+field[2]:key,String(value??'')];
 })].filter(([_,v])=>v);
 const html='<!doctype html><html lang="'+(lang()?'fr':'ar')+'" dir="'+(lang()?'ltr':'rtl')+'"><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#183943;font-size:12pt}.official-head{direction:ltr;display:grid;grid-template-columns:minmax(0,1fr) 34mm minmax(0,1fr);grid-template-areas:"fr center ar";gap:5mm;align-items:start;width:100%;font-size:8.7pt;line-height:1.34;margin-bottom:3mm}.official-side{min-width:0;display:flex;flex-direction:column;gap:.35mm}.official-fr{grid-area:fr;text-align:left;direction:ltr}.official-ar{grid-area:ar;text-align:right;direction:rtl}.official-strong{font-weight:800}.official-center{grid-area:center;display:flex;flex-direction:column;align-items:center;text-align:center}.basmala{width:100%;font-size:8.7pt;font-weight:800;line-height:1.3;margin:0 0 .8mm;white-space:nowrap;text-align:center;direction:rtl}.official-center img{width:23mm;height:23mm;object-fit:contain}h1{text-align:center;border-bottom:2px solid #174e65;padding-bottom:12px}tr{break-inside:avoid}h1{font-size:19pt}h2{font-size:15pt}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{border:1px solid #b9c8ce;padding:12px;text-align:start;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#eef5f2}thead{display:table-header-group}.attendance-print{font-size:10pt}.attendance-print th,.attendance-print td{padding:8px}.attendance-print td:first-child{width:5%}.foot{margin-top:48px;text-align:center}</style></head><body>'+directorOfficialHeader(record.details?.className||'')+'<h1>'+esc(category?category[1]+' / '+category[2]:'')+'</h1>'+ (tableHtml||'<table>'+
  [['التاريخ','Date',String(record.record_date||'').slice(0,10)],['الرقم','Référence',record.reference||'—'],['الموضوع','Objet',record.subject||''],...rows.map(([key,val])=>[key,key,val])]
  .map(([ar,fr,val])=>'<tr><th>'+esc(ar===fr?ar:ar+' / '+fr)+'</th><td>'+esc(val)+'</td></tr>').join('')+'</table>')+'<p class="foot">'+'ختم وتوقيع الإدارة / Cachet et signature de la direction'+'</p></body></html>';
 const iframe=document.createElement('iframe');iframe.setAttribute('title',t('طباعة سجل','Imprimer le registre'));iframe.style.cssText='position:fixed;inset:auto;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(iframe);
 const remove=()=>setTimeout(()=>iframe.remove(),1200);iframe.onload=()=>{try{iframe.contentWindow.onafterprint=remove;iframe.contentWindow.focus();iframe.contentWindow.print();setTimeout(remove,60000)}catch{remove();message(t('تعذر فتح الطباعة على هذا الجهاز','Impression indisponible'),true)}};
 iframe.srcdoc=html;
}

const cacheKey=()=> 'nataiji-director-cache-v1:'+(user?.id||'');
function saveCachedHome(){if(!institution||!overview||window.__nataijiOfflineActive)return;try{localStorage.setItem(cacheKey(),JSON.stringify({institution,overview,verifiedAt:Date.now()}));window.NataijiOfflineResume?.remember(user)}catch{}}
function readCachedHome(){try{const d=JSON.parse(localStorage.getItem(cacheKey())||'null');return d?.institution?.director_user_id===user?.id&&d?.overview?.institution?.id===d.institution.id?d:null}catch{return null}}
function readCachedRecords(category){try{const d=JSON.parse(localStorage.getItem(cacheKey()+':'+category)||'null');return d?.institutionId===institution?.id&&Array.isArray(d.records)?d.records:null}catch{return null}}
function storeCachedRecords(category,data){if(window.__nataijiOfflineActive)return;try{localStorage.setItem(cacheKey()+':'+category,JSON.stringify({institutionId:institution.id,records:data}))}catch{}}
async function pendingEntries(){
 if(!institution?.id||!user?.id)return [];
 return window.NataijiDirectorOutbox?.pending?.(user.id,institution.id)||[]
}
async function flushPending(){
 if(pendingSyncBusy||window.__nataijiOfflineActive||navigator.onLine===false||!institution?.id||!user?.id)return;
 if(!window.NataijiDirectorOutbox)return;
 const ownerId=String(user.id),schoolId=String(institution.id);
 pendingSyncBusy=true;
 try{
  const result=await window.NataijiDirectorOutbox.flush({
   userId:ownerId,institutionId:schoolId,
   isCurrent:()=>!window.__nataijiOfflineActive&&navigator.onLine!==false&&String(currentUser?.id)===ownerId&&String(user?.id)===ownerId&&String(institution?.id)===schoolId,
   submit:payload=>apiPost('/api/director/registers',payload)
  });
  if(result.sent&&String(user?.id)===ownerId){
   message(t(result.sent+' قيد تمت مزامنته مع الخادم',result.sent+' entrée(s) synchronisée(s)'));
   if($('#directorRecords'))void openRegister();
  }else if(result.error&&result.remaining){
   message(t('هناك قيود محلية لم تُزامن بعد. ستظل محفوظة على هذا الجهاز.','Des entrées restent enregistrées sur cet appareil et attendent la synchronisation.'),true)
  }
 }catch{message(t('تعذر فحص القيود المحلية. لن نحذف أي قيد.','Lecture des entrées locales impossible. Aucune donnée effacée.'),true)}finally{pendingSyncBusy=false}
}
window.addEventListener('online',()=>{setTimeout(()=>{if(!window.__nataijiOfflineActive)void flushPending()},1500)});


function root(){let el=$('#nataijiDirectorRoot');if(!el){el=document.createElement('main');el.id='nataijiDirectorRoot';el.className='director-app';document.body.appendChild(el)}return el}
function show(){document.documentElement.classList.add('nataiji-director-mode');$('#directorReturnButton')?.remove();$('#nataijiProfessorRoot')?.setAttribute('hidden','');const el=root();el.style.display='';return el}
function hide(){document.documentElement.classList.remove('nataiji-director-mode');$('#directorReturnButton')?.remove();$('#nataijiDirectorRoot')?.remove()}
function directorTeachingAreaLabel(){
 const level=institution?.level;
 return level==='middle'||level==='secondary'?t('الانتقال إلى مساحة الأستاذ','Passer à l’espace professeur'):level==='primary'?t('الانتقال إلى مساحة المعلم','Passer à l’espace enseignant'):t('الانتقال إلى مساحة التدريس','Passer à l’espace pédagogique')
}
function openTeacherArea(){
 if(!institution?.id){message(t('سجّل المؤسسة أولًا لتحديد مساحة التدريس المناسبة.','Enregistrez d’abord votre établissement.'),true);return}
 const professorSpace=institution.level==='middle'||institution.level==='secondary';
 if(professorSpace&&!window.NataijiProfessor?.openDirector){
  message(t('مساحة الأستاذ غير متاحة حاليًا. أعد فتح التطبيق بعد التحديث.','Espace professeur indisponible. Rechargez l’application.'),true);return
 }
 document.documentElement.classList.remove('nataiji-director-mode');const panel=root();panel.style.display='none';
 let back=$('#directorReturnButton');if(!back){back=document.createElement('button');back.id='directorReturnButton';back.type='button';document.body.appendChild(back)}
 back.textContent=t('↩ إدارة المؤسسة','↩ Direction');
 back.onclick=()=>{
  if(professorSpace&&window.NataijiProfessor?.leaveToDirector?.()===false)return;
  back.remove();void dashboard()
 };
 try{
  if(professorSpace)return window.NataijiProfessor.openDirector(user);
  if(typeof startApp==='function')return startApp();
 }catch(error){console.warn('Cannot open teaching workspace',error)}
 back.remove();panel.style.display='';document.documentElement.classList.add('nataiji-director-mode');
 message(t('تعذر فتح مساحة التدريس، أعد المحاولة.','Impossible d’ouvrir l’espace pédagogique.'),true)
}
function err(e){return ({director_institution_missing:t('أنشئ المؤسسة أولًا','Créez votre établissement'),institution_already_exists:t('توجد مؤسسة مرتبطة بهذا الحساب','Un établissement est déjà associé'),record_version_conflict:t('تم تعديل السجل على جهاز آخر؛ أعد تحميله','Ce registre a été modifié sur un autre appareil'),sensitive_register_not_enabled:t('سيُفعّل السجل الصحي بعد توفير الحماية المطلوبة','Ce registre sera activé après sécurisation'),durable_storage_required:t('قاعدة البيانات غير متاحة حاليًا','Base de données indisponible')})[e?.code]||t('تعذر الحفظ؛ تحقق من الاتصال وأعد المحاولة','Enregistrement impossible, vérifiez votre connexion')}
function message(value,bad=false){const el=$('#directorMessage');if(el){el.textContent=value;el.classList.toggle('bad',bad)}}
const directorReadCache=new Map(),directorReadPending=new Map();
let directorReadEpoch=0;
function clearDirectorReads(){directorReadEpoch++;directorReadCache.clear();directorReadPending.clear()}
async function network(url,options={}){
 if(navigator.onLine===false)throw Object.assign(Error('offline'),{code:'offline'});
 const method=String(options.method||'GET').toUpperCase();
 if(method!=='GET'){clearDirectorReads();try{return await api(url,options)}finally{clearDirectorReads()}}
 const cacheable=['/api/director/overview','/api/director/members'].includes(url)||url.startsWith('/api/director/registers?');
 if(!cacheable)return api(url,options);
 const key=String(user?.id||'')+':'+String(institution?.id||'')+':'+url,cached=directorReadCache.get(key);
 if(cached&&Date.now()-cached.time<20000)return cached.data;
 if(directorReadPending.has(key))return directorReadPending.get(key);
 const epoch=directorReadEpoch;
 const pending=Promise.resolve().then(()=>api(url,options)).then(data=>{
  const value={...data,_directorFetchedAt:Date.now()};
  if(epoch===directorReadEpoch)directorReadCache.set(key,{data:value,time:Date.now()});
  return value;
 }).finally(()=>{if(directorReadPending.get(key)===pending)directorReadPending.delete(key)});
 directorReadPending.set(key,pending);return pending;
}
function apiPost(url,data,method='POST'){return network(url,{method,body:JSON.stringify(data)})}
const formField=(name,label,value='',kind='text')=>'<label>'+label+'<input name="'+name+'" type="'+kind+'" value="'+esc(value)+'" maxlength="160" required></label>';
function frame(title,contents,options={}){
 const isHome=options.home===true,el=show();
 el.classList.toggle('director-subpage',!isHome);
 const backButton=isHome?'':'<div class="director-subpage-nav"><button id="directorBack" class="director-back" type="button">'+(lang()?'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>':'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>')+'<span>'+t('رجوع','Retour')+'</span></button><span class="director-page-breadcrumb">'+t('الإدارة المدرسية','Administration scolaire')+'</span></div>';
 el.innerHTML='<div class="director-shell"><header class="director-top"><div class="director-brand"><img src="/nataiji-brand-mark.png" alt="" width="46" height="46"><div><b>'+t('نتائجي | الإدارة','Nataiji | Direction')+'</b><small>'+esc(user?.name||'')+'</small></div></div><div class="director-actions"><button id="directorHome" type="button">'+t('الرئيسية','Accueil')+'</button><button id="directorTeacherArea" type="button">'+directorTeachingAreaLabel()+'</button><details class="director-account"><summary>'+t('الحساب','Compte')+'</summary><div class="director-account-menu"><button id="directorLogout" type="button">'+t('الخروج','Quitter')+'</button></div></details></div></header><div class="director-wrap">'+backButton+'<h1>'+esc(title)+'</h1><p id="directorMessage" role="status"></p>'+contents+'</div></div>';
 $('#directorHome',el).onclick=()=>{void dashboard()};
 $('#directorTeacherArea',el).onclick=openTeacherArea;
 $('#directorLogout',el).onclick=logout;
 const back=$('#directorBack',el);
 if(back)back.onclick=()=>options.backAction?options.backAction():void dashboard();
 return el
}
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
 const el=frame(edit?t('إعدادات المؤسسة','Paramètres de l’établissement'):t('إنشاء مؤسسة','Créer un établissement'),body,{home:!edit});
 $('#directorSchoolForm',el).onsubmit=async e=>{e.preventDefault();const btn=$('button[type=submit]',e.currentTarget);btn.disabled=true;const data=Object.fromEntries(new FormData(e.currentTarget));try{const result=await apiPost('/api/director/institution',data,edit?'PATCH':'POST');institution=result.institution;await dashboard()}catch(error){message(err(error),true);btn.disabled=false}};
}
function cardButtons(){
 const count=overview?.registerCounts||{};
 return labels.map(([key,ar,fr])=>{
  const locked=health.has(key),graphic=directorCardVisuals[key]?.[0]||'list';
  return '<button class="director-card" type="button" data-director-register="'+key+'"'+(locked?' aria-disabled="true"':'')+'><span class="director-card-icon" aria-hidden="true">'+directorIcon(graphic,23)+'</span><b>'+t(ar,fr)+'</b><small>'+(locked?t('قريبًا · حماية خاصة','Bientôt · Accès protégé'):t('السجلات','Registres')+' · '+(count[key]||0))+'</small></button>'
 }).join('')
}
async function dashboard(){
 const el=show();el.innerHTML='<div class="director-loading">'+t('جاري تحميل الإدارة...','Chargement...')+'</div>';
 try{
  try{
   overview=await network('/api/director/overview');institution=overview.institution;
   if(!institution)return institutionForm();
   saveCachedHome();
  }catch(error){if(error?.status===404)return institutionForm();const cached=readCachedHome();if(!cached)throw error;institution=cached.institution;overview=cached.overview}

  const body=(window.__nataijiOfflineActive||navigator.onLine===false?'<p class="director-offline-notice">'+t('وضع دون إنترنت: البيانات المحفوظة متاحة للقراءة، ويلزم الاتصال لحفظ التعديلات.','Hors connexion : consultation disponible, enregistrement après reconnexion.')+'</p>':'')+'<div class="director-welcome"><div><small>'+t('لوحة المدير','Espace direction')+'</small><h2>'+esc(institution.name)+'</h2><p>'+esc(institution.academic_year||'')+' · '+t('إدارة مستقلة مع ربط اختياري للمعلمين','Gestion autonome et partage facultatif')+'</p></div><button type="button" id="directorSettings">'+t('الإعدادات','Paramètres')+'</button></div>'+
  '<div class="director-stats"><article><b>'+Number(overview.memberCount||0)+'</b><span>'+t('معلمون مرتبطون','Enseignants liés')+'</span></article><article><b>'+Object.values(overview.registerCounts||{}).reduce((a,b)=>a+Number(b||0),0)+'</b><span>'+t('قيود محفوظة','Entrées enregistrées')+'</span></article></div>'+
  '<div class="director-tools"><button type="button" id="directorInvite">＋ '+t('دعوة معلم','Inviter un enseignant')+'</button><button type="button" id="directorMembers">'+t('الحسابات المرتبطة','Comptes liés')+'</button><button type="button" id="directorFamily">🏅 '+t('التكريم ومراسلة أولياء الأمور','Certificats et messages aux parents')+'</button></div>'+
  '<div class="director-timetable-link"><button id="directorTimetables" type="button"><span class="director-card-icon" aria-hidden="true">'+directorIcon('visits',23)+'</span><span><b>'+t('الجدول الدراسي للأقسام','Emplois du temps des classes')+'</b><small>'+t('جدول مستقل لكل قسم · الحصص والمواد والأساتذة','Un emploi du temps par classe · matières, horaires et enseignants')+'</small></span><span aria-hidden="true">'+directorIcon('arrow',18)+'</span></button></div>'+'<h3>'+t('السجلات الإدارية','Registres administratifs')+'</h3><div class="director-grid">'+cardButtons()+'</div>';
  frame(t('الإدارة المدرسية','Administration scolaire'),body,{home:true});
  if(!window.__nataijiOfflineActive)void flushPending();
  $('#directorSettings').onclick=institutionForm;
  $('#directorInvite').onclick=invite;
  $('#directorMembers').onclick=members;
  $('#directorFamily').onclick=()=>{if(!window.NataijiFamily?.openDirector){message(t('حدّث التطبيق لفتح التواصل الأسري.','Actualisez l’application pour ouvrir la communication familiale.'),true);return}void window.NataijiFamily.openDirector(user)};
  $('#directorTimetables').onclick=()=>{if(!window.NataijiDirectorTimetables?.open){message(t('حدّث التطبيق لفتح الجداول الدراسية.','Actualisez pour ouvrir les emplois du temps.'),true);return}window.NataijiDirectorTimetables.open({frame,institution,user,t,esc,network,apiPost,icon:directorIcon,message})};
  $$('[data-director-register]').forEach(b=>b.onclick=()=>{currentCategory=b.dataset.directorRegister;if(health.has(currentCategory)){message(t('السجلات الصحية غير مفعلة حتى توفير الحماية والخصوصية اللازمة.','Registres médicaux désactivés jusqu’à mise en place des protections.'),true);return}void openRegister()});
 }catch(e){frame(t('الإدارة المدرسية','Administration scolaire'),'<p class="director-intro">'+err(e)+'</p><button type="button" id="directorRetry">'+t('إعادة المحاولة','Réessayer')+'</button>',{home:true});$('#directorRetry').onclick=()=>void dashboard()}
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
 const category=currentCategory,row=labels.find(r=>r[0]===category);
 frame(t(row[1],row[2]),'<p class="director-register-intro">'+t('حفظ قيود المؤسسة وتنظيمها مع إمكانية التعديل والطباعة.','Enregistrez et organisez les documents, avec modification et impression.')+'</p><div class="director-tools director-register-tools"><button type="button" class="director-primary" id="directorNewEntry">'+directorIcon('plus',17)+t('إضافة قيد','Nouvelle entrée')+'</button><button type="button" id="directorSyncEntries">'+directorIcon('link',16)+t('مزامنة القيود','Synchroniser')+'</button></div><details class="director-sync-help"><summary>'+t('كيف تعمل المزامنة؟','Comment synchroniser ?')+'</summary><p class="director-sync-hint">'+t('ترسل المزامنة القيود المحفوظة على هذا الجهاز إلى حساب مؤسستك، ثم تُحدّث القائمة من الخادم.','La synchronisation envoie les entrées locales à votre établissement, puis actualise la liste depuis le serveur.')+'</p></details><p id="directorSyncStatus" role="status"></p><div id="directorRecords" aria-live="polite">'+t('جاري تحميل السجلات...','Chargement...')+'</div>');
 $('#directorNewEntry').onclick=()=>editEntry();
 if(category==='daily-attendance')$('#directorNewEntry').textContent=t('فتح سجل يوم','Ouvrir un registre journalier');
 $('#directorSyncEntries').onclick=async()=>{clearDirectorReads();await flushPending();if($('#directorRecords'))await openRegister()};
 try{
  try{
   const result=await network('/api/director/registers?category='+encodeURIComponent(category));records=result.records||[];
   storeCachedRecords(category,records);const status=$('#directorSyncStatus');if(status)status.textContent=t('آخر تحديث من الخادم: ','Dernière actualisation : ')+new Date(result._directorFetchedAt||Date.now()).toLocaleTimeString(lang()?'fr':'ar',{hour:'2-digit',minute:'2-digit'})
  }catch(error){
   const cached=readCachedRecords(category);
   records=cached||[];const status=$('#directorSyncStatus');if(status)status.textContent=t('تعذر الاتصال بالخادم؛ لم تُؤكّد المزامنة.','Serveur indisponible ; synchronisation non confirmée.');
   if(!cached)message(t('الاتصال غير متاح؛ القيود الجديدة محفوظة على هذا الجهاز إن وجدت.','Connexion indisponible ; les nouvelles entrées restent sur cet appareil.'),true)
  }
  if(currentCategory!==category||!$('#directorRecords'))return;
  const entries=(await pendingEntries().catch(()=>[])).filter(x=>x.payload?.category===category);
  const pendingHtml=entries.map(item=>'<article class="director-record director-pending"><div><b>'+esc(item.payload.subject)+'</b><small>'+t('محفوظ على الجهاز — بانتظار المزامنة','Enregistré sur cet appareil — en attente de synchronisation')+'</small></div></article>').join('');
  const savedHtml=records.map(x=>'<article class="director-record"><div><b>'+esc(x.subject)+'</b><small>'+esc(String(x.record_date).slice(0,10))+' · '+esc(x.reference||'—')+'</small></div><button data-director-edit="'+esc(x.id)+'" type="button">'+t('تعديل','Modifier')+'</button><button class="director-delete" data-director-delete="'+esc(x.id)+'" type="button">'+t('حذف','Supprimer')+'</button><button data-director-print="'+esc(x.id)+'" type="button">'+t('طباعة / PDF','Imprimer / PDF')+'</button></article>').join('');
  $('#directorRecords').innerHTML=pendingHtml+savedHtml||'<div class="director-empty director-empty-register"><span class="director-empty-symbol" aria-hidden="true">'+directorIcon('bookmark',27)+'</span><h2>'+t('لا توجد قيود بعد','Aucune entrée pour le moment')+'</h2><p>'+t('ابدأ بإضافة أول قيد، وسيظهر هنا مع خيارات التعديل والطباعة.','Ajoutez une première entrée : elle apparaîtra ici avec les options de modification et d’impression.')+'</p><button id="directorEmptyAdd" class="director-primary" type="button">'+directorIcon('plus',18)+t('إضافة أول قيد','Ajouter la première entrée')+'</button></div>';
  if(records.length||entries.length){
   const container=$('#directorRecords'),search=document.createElement('label');search.className='director-search';
   search.innerHTML='<span>'+t('البحث في السجلات المحمّلة','Rechercher dans les entrées chargées')+'</span><input type="search" id="directorRecordSearch" placeholder="'+t('الاسم أو المرجع أو بيانات السجل','Nom, référence ou contenu')+'"><small id="directorSearchCount" role="status"></small>';
   container.before(search);
   const cards=$$('.director-record',container),data=[...entries.map(x=>x.payload),...records];
   const update=()=>{const query=$('#directorRecordSearch').value.trim().toLocaleLowerCase();let count=0;
    cards.forEach((card,i)=>{const row=data[i];const hay=[row.subject,row.reference,...Object.values(row.details||{}).filter(v=>typeof v==='string'),...(row.details?.staff||[]).map(r=>r.name)].join(' ').toLocaleLowerCase();card.hidden=!!query&&!hay.includes(query);if(!card.hidden)count++});
    $('#directorSearchCount').textContent=t('السجلات الظاهرة: ','Entrées affichées : ')+count+' / '+cards.length;
   };$('#directorRecordSearch').oninput=update;update();
  }
  $('#directorEmptyAdd')?.addEventListener('click',()=>editEntry());
  if(category==='daily-attendance'&&$('#directorEmptyAdd'))$('#directorEmptyAdd').textContent=t('إنشاء سجل حضور الجميع','Créer le registre collectif');
  $$('[data-director-edit]').forEach(b=>b.onclick=()=>editEntry(records.find(x=>x.id===b.dataset.directorEdit)));
  $('[data-director-delete]').forEach(b=>b.onclick=async()=>{
   const item=records.find(x=>x.id===b.dataset.directorDelete);
   if(!item||!confirm(t('حذف هذا السجل من القائمة؟','Supprimer ce registre de la liste ?')+'\n'+item.subject))return;
   b.disabled=true;
   try{
    const response=await apiPost('/api/director/registers/'+encodeURIComponent(item.id),{version:item.version},'DELETE');
    if(!response?.ok)throw Error('delete_not_verified');
    records=records.filter(x=>x.id!==item.id);storeCachedRecords(category,records);
    if(currentCategory===category&&b.isConnected)await openRegister();
   }catch(error){b.disabled=false;message(error.status===409?t('عُدّل السجل. حدّث القائمة قبل الحذف.','Registre modifié. Actualisez avant de supprimer.'):err(error),true)}
  });
  $('[data-director-print]').forEach(b=>b.onclick=()=>{const item=records.find(x=>x.id===b.dataset.directorPrint);if(item)printDirectorRecord(item)});
 }catch(error){message(err(error),true)}
}
function editEntry(row=null){
 if(currentCategory==='daily-attendance'&&(!row||row.details?.kind==='staff-attendance-v1'))return editStaffAttendance(row);
 if(row&&(window.__nataijiOfflineActive||navigator.onLine===false)){message(t('تعديل قيد موجود يتطلب الاتصال لمنع تضارب النسخ.','La modification nécessite une connexion pour éviter les conflits.'),true);return}
 const category=currentCategory,isEnrolment=category==='enrolment',title=row?t('تعديل القيد','Modifier une entrée'):t('إضافة قيد','Ajouter une entrée'),details=row?.details||{};
 const wantsPupil=['enrolment','student-absence','referrals'].includes(category);
 const rosterField=wantsPupil?'<label id="directorRosterLabel">'+t('اختيار من تلاميذ المؤسسة (اختياري)','Choisir un élève déjà inscrit (facultatif)')+'<select id="directorRosterPicker"><option value="">'+t('تحميل قائمة التلاميذ...','Chargement des élèves...')+'</option></select></label>':'';
 const registrationFields='<label>'+t(isEnrolment?'تاريخ التسجيل *':'التاريخ *',isEnrolment?'Date d’inscription *':'Date *')+'<input name="recordDate" type="date" required value="'+esc(String(row?.record_date||new Date().toISOString()).slice(0,10))+'"></label>'+
  '<label>'+t(isEnrolment?'مرجع الوثيقة (اختياري)':'رقم القيد / المرجع',isEnrolment?'Référence du document (facultatif)':'Référence')+'<input name="reference" maxlength="100" value="'+esc(row?.reference||'')+'"></label>';
 const body='<form class="director-form" id="directorRecordForm"><p class="director-form-hint">'+t('الحقول المميزة بـ * مطلوبة.','Les champs marqués * sont obligatoires.')+'</p>'+
  (isEnrolment?'<fieldset class="director-form-section"><legend>'+t('بيانات التلميذ','Informations de l’élève')+'</legend>'+rosterField+registerCustomFields(category,details)+'</fieldset><fieldset class="director-form-section"><legend>'+t('بيانات التسجيل','Inscription')+'</legend>'+registrationFields+'</fieldset>':registrationFields+rosterField+formField('subject',t('الموضوع / الوصف *','Objet / description *'),row?.subject||'')+registerCustomFields(category,details))+
  '<label>'+t('ملاحظات','Observations')+'<textarea name="notes" maxlength="4000" rows="3">'+esc(details.notes||'')+'</textarea></label>'+
  '<p class="director-intro">'+t('السجلات الإدارية قابلة للتعديل والطباعة. تُراجع نماذج المؤسسة الرسمية قبل اعتمادها.','Registres modifiables et imprimables, à adapter aux modèles officiels de votre établissement.')+'</p>'+
  '<div class="director-save-bar"><button type="submit" class="director-primary">'+t('حفظ السجل','Enregistrer le registre')+'</button></div></form>';
 frame(isEnrolment?(row?t('تعديل تسجيل التلميذ','Modifier l’inscription'):t('تسجيل تلميذ جديد','Inscrire un élève')):(row?t('تعديل: ','Modifier : '):t('إضافة: ','Ajouter : '))+t(labels.find(x=>x[0]===category)[1],labels.find(x=>x[0]===category)[2]),body,{backAction:()=>{const form=$('#directorRecordForm');if(form?.dataset.dirty==='true'&&!confirm(t('لديك تعديلات لم تُحفظ. هل تريد الرجوع؟','Vos modifications ne sont pas enregistrées. Revenir ?')))return;void openRegister()}});
 $('#directorRecordForm')?.addEventListener('input',()=>{$('#directorRecordForm').dataset.dirty='true'});
 let selectedStudentRef=row?.details?.studentRef||null;
 if(wantsPupil){
  const picker=$('#directorRosterPicker');
  (async()=>{
   try{
    const result=await network('/api/director/roster');
    if(!picker?.isConnected)return;
    const pupils=result.students||[];
    picker.innerHTML='<option value="">'+t('إدخال يدوي','Saisie manuelle')+'</option>'+pupils.map((p,i)=>'<option value="'+i+'">'+esc(p.name+' — '+(p.className||p.classId))+'</option>').join('');
    const current=pupils.findIndex(p=>p.studentKey===selectedStudentRef?.studentKey&&p.classId===selectedStudentRef?.classId);
    if(current>=0)picker.value=String(current);
    picker.onchange=()=>{
     const item=pupils[Number(picker.value)];
     selectedStudentRef=picker.value!==''&&item?{studentKey:item.studentKey,classId:item.classId}:null;
     if(!selectedStudentRef)return;
     const nm=$('[name="custom-studentName"]'),cls=$('[name="custom-className"]');
     if(nm)nm.value=item.name;if(cls)cls.value=item.className||item.classId;$('#directorRecordForm').dataset.dirty='true'
    }
   }catch(error){if(picker?.isConnected){picker.innerHTML='<option value="">'+t('إدخال يدوي — القائمة غير متاحة','Saisie manuelle — liste indisponible')+'</option>';picker.disabled=true}}
  })()
 }
 const mutationId=crypto.randomUUID(); // Stable id across an ambiguous network retry.
 $('#directorRecordForm').onsubmit=async e=>{
  e.preventDefault();const button=$('button[type=submit]',e.currentTarget);button.disabled=true;
  const fields=Object.fromEntries(new FormData(e.currentTarget)),recordDetails={notes:fields.notes};
  for(const field of registerFields[category]||[])recordDetails[field[0]]=fields['custom-'+field[0]]||'';
  if(selectedStudentRef)recordDetails.studentRef=selectedStudentRef;
  if(JSON.stringify(recordDetails).length>8000){message(t('النص طويل جدًا؛ اختصر الملاحظات أو تفاصيل المحضر قبل الحفظ.','Texte trop long : raccourcissez les observations ou le compte rendu.'),true);button.disabled=false;return}
  const payload={category,subject:isEnrolment?(row?.subject||recordDetails.studentName.trim()):fields.subject,reference:fields.reference,recordDate:fields.recordDate,details:recordDetails};
  if(row)payload.version=row.version;else payload.clientMutationId=mutationId;
  try{
   const response=await apiPost(row?'/api/director/registers/'+encodeURIComponent(row.id):'/api/director/registers',payload,row?'PATCH':'POST');
   if(!response?.ok||!response?.record)throw Error('save_not_verified');
   await openRegister();
  }catch(error){
   const transient=!error?.status||[502,503,504].includes(error.status);
   if(!row&&transient&&window.NataijiDirectorOutbox&&user?.id&&institution?.id){
    try{
     await window.NataijiDirectorOutbox.enqueue({userId:user.id,institutionId:institution.id,payload});
     await openRegister();
     message(t('تم حفظ القيد على هذا الجهاز. سيُرسل للخادم بعد عودة الاتصال وتأكيد الجلسة.','Entrée enregistrée sur cet appareil. Synchronisation après reconnexion et vérification de la session.'));
     return
    }catch(storageError){message(t('لم يمكن حفظ القيد على الجهاز؛ احتفظ بالمعلومات وأعد المحاولة.','Stockage local indisponible ; conservez les informations et réessayez.'),true)}
   }else message(err(error),true);
   button.disabled=false
  }
 };
}
const staffStatuses={present:['حاضر','Présent'],absent:['غائب','Absent'],late:['متأخر','En retard']};
function staffAttendanceTable(record){
 return '<p style="text-align:center">التاريخ / Date: '+esc(String(record.record_date).slice(0,10))+'</p><table class="attendance-print" dir="rtl"><thead><tr>'+['رقم / N°','المعلم / Enseignant','الحالة / Présence','الوقت / Heure','ملاحظات / Observations'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+record.details.staff.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(r.name)+'</td><td>'+esc((staffStatuses[r.status]||['—','—']).join(' / '))+'</td><td dir="ltr">'+esc(r.time||'—')+'</td><td>'+esc(r.notes||'—')+'</td></tr>').join('')+'</tbody></table>';
}
async function editStaffAttendance(existing=null,selectedDate=null){
 if(window.__nataijiOfflineActive||navigator.onLine===false){message(t('السجل الجماعي يحتاج اتصالًا للتحقق من سجل اليوم وحفظ الجميع معًا.','Une connexion est nécessaire pour vérifier et enregistrer le registre collectif.'),true);return}
 const date=selectedDate||String(existing?.record_date||new Date().toISOString()).slice(0,10),schoolId=institution.id;
 let row=existing,staff=[],membersList=[],membersFailed=false;
 frame(t('حضور المعلمين — سجل جماعي','Présences — registre collectif'),'<p id="staffLoading" role="status">'+t('تحميل سجل اليوم والمعلمين...','Chargement du registre et des enseignants...')+'</p>',{backAction:()=>void openRegister()});
 const root=$('#staffLoading');
 try{
  if(row){staff=row.details.staff.map(r=>({...r}))}
  else{
   const [result,recent,membersResult]=await Promise.all([
    network('/api/director/registers?category=daily-attendance&recordDate='+encodeURIComponent(date)+'&limit=100'),
    network('/api/director/registers?category=daily-attendance&limit=100'),
    network('/api/director/members').catch(()=>{membersFailed=true;return {members:[]}})
   ]);
   row=(result.records||[]).find(r=>r.details?.kind==='staff-attendance-v1');
   const previous=(recent.records||[]).find(r=>r.details?.kind==='staff-attendance-v1');
   staff=row?row.details.staff.map(r=>({...r})):(previous?.details.staff||[]).map(r=>({...r,status:'',time:'',notes:''}));
   membersList=membersResult.members||[];
  }
  if(institution?.id!==schoolId||!root.isConnected||currentCategory!=='daily-attendance')return;
  // Saved days are historical snapshots. New days include linked staff and the previous manual list.
  if(!row)for(const m of membersList){if(!staff.some(r=>r.key==='user:'+m.user_id))staff.push({key:'user:'+m.user_id,name:m.name||t('معلم','Enseignant'),status:'',time:'',notes:''})}
 }catch(error){message(t('تعذر تحميل سجل اليوم. أعد المحاولة لتجنب إنشاء سجل مكرر.','Chargement impossible. Réessayez pour éviter un doublon.'),true);return}
 let dirty=false,busy=false;
 const leave=()=>{if(busy)return;if(dirty&&!confirm(t('الرجوع دون حفظ التعديلات؟','Quitter sans enregistrer ?')))return;void openRegister()};
 frame(t('حضور المعلمين — سجل جماعي','Présences — registre collectif'),'<form id="staffAttendanceForm" class="director-form"><label>'+t('تاريخ السجل','Date du registre')+'<input id="staffDate" type="date" required value="'+esc(date)+'"></label><p>'+t('جميع المعلمين في سجل واحد. اختر حالة كل معلم ثم احفظ الجميع. تُستعاد الأسماء في اليوم التالي.','Tous les enseignants dans un registre. Indiquez chaque présence puis enregistrez. Les noms seront repris le jour suivant.')+'</p>'+(membersFailed?'<p role="alert">'+t('تعذر تحميل الحسابات المرتبطة؛ تحقق من اكتمال الأسماء قبل الحفظ.','Comptes liés indisponibles ; vérifiez la liste avant de sauvegarder.')+'</p>':'')+'<div class="director-tools"><button type="button" id="staffAdd">＋ '+t('إضافة معلم','Ajouter un enseignant')+'</button><button type="button" id="staffImport">'+t('إضافة المعلمين المرتبطين','Ajouter les enseignants liés')+'</button></div><div class="staff-attendance-scroll"><table class="staff-attendance-table"><thead><tr><th>'+t('المعلم','Enseignant')+'</th><th>'+t('الحالة','Présence')+'</th><th>'+t('الوقت','Heure')+'</th><th>'+t('ملاحظات','Observations')+'</th><th>'+t('حذف','Retirer')+'</th></tr></thead><tbody id="staffRows"></tbody></table></div><p id="staffCount" role="status"></p><div class="director-save-bar"><button class="director-primary" type="submit">'+t('حفظ حضور الجميع','Enregistrer toutes les présences')+'</button></div></form>',{backAction:leave});
 const form=$('#staffAttendanceForm');
 const read=()=>$$('#staffRows tr').map(tr=>({key:tr.dataset.key,name:$('[data-field="name"]',tr).value.trim(),status:$('[data-field="status"]',tr).value,time:$('[data-field="time"]',tr).value,notes:$('[data-field="notes"]',tr).value.trim()}));
 const render=()=>{
  $('#staffRows').innerHTML=staff.map(r=>'<tr data-key="'+esc(r.key)+'"><td><input data-field="name" aria-label="'+t('اسم المعلم','Nom')+'" required maxlength="160" value="'+esc(r.name)+'"></td><td><select data-field="status" aria-label="'+t('حالة الحضور','Présence')+'" required><option value="">'+t('اختر','Choisir')+'</option>'+Object.entries(staffStatuses).map(([key,pair])=>'<option value="'+key+'"'+(r.status===key?' selected':'')+'>'+t(...pair)+'</option>').join('')+'</select></td><td><input data-field="time" aria-label="'+t('وقت الحضور','Heure')+'" type="time" value="'+esc(r.time)+'"></td><td><input data-field="notes" aria-label="'+t('ملاحظات','Observations')+'" maxlength="300" value="'+esc(r.notes)+'"></td><td><button type="button" data-remove>'+t('حذف','Retirer')+'</button></td></tr>').join('');
  $('#staffCount').textContent=t('عدد المعلمين: ','Enseignants : ')+staff.length;
  $$('[data-remove]',form).forEach(b=>b.onclick=()=>{if(busy)return;staff=read().filter(r=>r.key!==b.closest('tr').dataset.key);dirty=true;render()});
 };
 render();form.addEventListener('input',e=>{if(e.target.id!=='staffDate')dirty=true});
 $('#staffDate').onchange=()=>{const next=$('#staffDate').value;if(!next)return;if(dirty&&!confirm(t('تغيير اليوم دون حفظ التعديلات؟','Changer de date sans enregistrer ?'))){$('#staffDate').value=date;return}void editStaffAttendance(null,next)};
 $('#staffAdd').onclick=()=>{staff=read();if(staff.length>=200){message(t('الحد الأقصى 200 معلم في السجل.','Maximum de 200 enseignants.'),true);return}staff.push({key:'manual:'+crypto.randomUUID(),name:'',status:'',time:'',notes:''});dirty=true;render();$$('[data-field="name"]',form).at(-1)?.focus()};
 $('#staffImport').onclick=async()=>{try{const m=(await network('/api/director/members')).members||[];if(!form.isConnected)return;staff=read();for(const x of m)if(!staff.some(r=>r.key==='user:'+x.user_id))staff.push({key:'user:'+x.user_id,name:x.name||'',status:'',time:'',notes:''});dirty=true;render()}catch(e){message(err(e),true)}};
 form.onsubmit=async e=>{
  e.preventDefault();if(busy)return;staff=read();if(!staff.length||staff.length>200){message(t('أضف من 1 إلى 200 معلم.','Ajoutez entre 1 et 200 enseignants.'),true);return}
  busy=true;const controls=$$('input,select,button',form);controls.forEach(c=>c.disabled=true);
  const payload={category:'daily-attendance',recordDate:date,subject:'حضور المعلمين / Présences des enseignants',reference:'',details:{kind:'staff-attendance-v1',staff},...(row?{version:row.version}:{clientMutationId:'staff-attendance:'+date})};
  try{const result=await apiPost(row?'/api/director/registers/'+encodeURIComponent(row.id):'/api/director/registers',payload,row?'PATCH':'POST');if(!result?.ok||!result.record)throw Error('save_not_verified');dirty=false;await openRegister();message(t('تم حفظ حضور الجميع في سجل واحد.','Toutes les présences sont enregistrées dans un seul registre.'))}
  catch(error){message(error.status===409?t('حُفظ أو عُدّل سجل هذا اليوم من جلسة أخرى. احتفظ بتعديلاتك ثم أعد فتح سجل اليوم.','Ce registre a été enregistré ou modifié ailleurs. Conservez vos changements puis rouvrez le registre.'):err(error),true);controls.forEach(c=>c.disabled=false)}finally{busy=false}
 };
}
function staffLink(user){
 if(!['teacher','professor'].includes(user?.profileType)||$('#directorStaffJoin'))return;
 const b=document.createElement('button');b.id='directorStaffJoin';b.type='button';b.textContent=t('ربط بمؤسسة','Rejoindre une école');document.body.appendChild(b);
 b.onclick=async()=>{const code=prompt(t('أدخل رمز المؤسسة الذي وصلك من المدير','Saisissez le code reçu du directeur'));if(!code)return;try{await apiPost('/api/director/invitations/accept',{code:code.trim()});alert(t('تم ربط حسابك بالمؤسسة. بقيت نتائجك مستقلة.','Votre compte est associé. Vos résultats restent indépendants.'))}catch(e){alert(err(e))}};
}
window.NataijiDirector={
 activate(next){if(next?.profileType==='director'&&next?.role==='admin'){user=next;void dashboard();return true}hide();return false},
 staffLink
};
})();