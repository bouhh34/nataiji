(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>localStorage.getItem('nataiji-lang')||'ar',fr=()=>lang()==='fr';
const tr=(ar,f)=>fr()?f:ar;
function syncProfessorLanguage(){const l=lang();document.documentElement.lang=l;document.documentElement.dir=l==='fr'?'ltr':'rtl';document.documentElement.classList.toggle('lang-fr',l==='fr');document.documentElement.classList.toggle('lang-ar',l!=='fr')}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||('p-'+Date.now().toString(36)+Math.random().toString(36).slice(2));
let profile={schoolName:'',year:'',classes:[],assignments:[],marks:{}},links={},professorUser=null,currentView='home',academicCatalog={version:'',levels:[]};
let homeClassId='';
let gradeSaveTimer=null,gradeEditRevision=0,gradeSavedRevision=0,gradeSaveInFlight=null;
let professorInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{try{e.preventDefault();professorInstallPrompt=e}catch{}});
window.addEventListener('appinstalled',()=>{professorInstallPrompt=null});
function professorRunsAsInstalledApp(){
 try{
  if(window.Capacitor?.isNativePlatform?.())return true;
  if(window.Capacitor?.getPlatform?.()&&window.Capacitor.getPlatform()!=='web')return true
 }catch{}
 if(window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true)return true;
 return /;\s*wv\)|\bwv\b/i.test(String(navigator.userAgent||''))&&/Android/i.test(String(navigator.userAgent||''))
}
function professorIsWebsite(){return !professorRunsAsInstalledApp()}


function hideLegacy(){
 document.documentElement.classList.add('nataiji-professor-mode');
 q('.app-shell')?.style.setProperty('display','none');
 q('.bottom-nav')?.style.setProperty('display','none');
}
function showLegacy(){
 document.documentElement.classList.remove('nataiji-professor-mode');
 q('.app-shell')?.style.removeProperty('display');q('.bottom-nav')?.style.removeProperty('display');q('#nataijiProfessorRoot')?.remove()
}
function root(){let el=q('#nataijiProfessorRoot');if(!el){el=document.createElement('main');el.id='nataijiProfessorRoot';el.className='professor-app professor-v2';document.body.appendChild(el)}return el}
function normalize(p){const x=p&&typeof p==='object'?structuredClone(p):{};x.schoolName=String(x.schoolName||'');x.schoolNameFr=String(x.schoolNameFr||'');x.region=String(x.region||'');x.regionFr=String(x.regionFr||'');x.inspection=String(x.inspection||'');x.inspectionFr=String(x.inspectionFr||'');x.schoolNns=String(x.schoolNns||'');x.year=String(x.year||'');x.classes=Array.isArray(x.classes)?x.classes:[];x.assignments=Array.isArray(x.assignments)?x.assignments:[];x.marks=x.marks&&typeof x.marks==='object'?x.marks:{};return x}

const PROF_SUBJECT_FR={
 'التربية الإسلامية':'Éducation islamique','اللغة العربية':'Langue arabe','العربية':'Langue arabe','الرياضيات':'Mathématiques',
 'اللغة الفرنسية':'Français','الفرنسية':'Français','اللغة الإنجليزية':'Anglais','الإنجليزية':'Anglais',
 'الفيزياء':'Physique','العلوم الفيزيائية':'Sciences physiques','الكيمياء':'Chimie','العلوم الطبيعية':'Sciences naturelles','علوم الحياة والأرض':'Sciences de la vie et de la Terre',
 'التاريخ والجغرافيا':'Histoire et géographie','التاريخ':'Histoire','الجغرافيا':'Géographie','التربية المدنية':'Éducation civique',
 'الفلسفة':'Philosophie','الفكر الإسلامي':'Pensée islamique','التشريع والتفسير':'Législation et exégèse','الإعلام الآلي':'Informatique','المعلوماتية':'Informatique','التربية البدنية':'Éducation physique',
 'الرياضة':'Éducation physique','الرسم':'Arts plastiques'
};
const PROF_NAME_FR={'محمد':'Mohamed','أحمد':'Ahmed','احمد':'Ahmed','محمود':'Mahmoud','عبد الله':'Abdallahi','عبدالله':'Abdallahi','عبد الرحمن':'Abderrahmane','فاطمة':'Fatimetou','خديجة':'Khadijetou','عائشة':'Aïcha','مريم':'Mariam','سارة':'Sara','ياسين':'Yacine','إبراهيم':'Ibrahim','ابراهيم':'Ibrahim','علي':'Ali','سالم':'Salem','أمينة':'Amina','خالد':'Khaled'};
const PROF_PLACE_FR={'الحوض الشرقي':'Hodh Ech Chargui','الحوض الغربي':'Hodh El Gharbi','العصابة':'Assaba','كوركول':'Gorgol','براكنة':'Brakna','البراكنة':'Brakna','لبراكنة':'Brakna','اترارزة':'Trarza','الترارزة':'Trarza','آدرار':'Adrar','داخلت نواذيبو':'Dakhlet Nouadhibou','تكانت':'Tagant','كيديماغا':'Guidimakha','تيرس زمور':'Tiris Zemmour','إنشيري':'Inchiri','انشيري':'Inchiri','نواكشوط الشمالية':'Nouakchott Nord','نواكشوط الغربية':'Nouakchott Ouest','نواكشوط الجنوبية':'Nouakchott Sud','نواكشوط':'Nouakchott','نواذيبو':'Nouadhibou','كرمسين':'Keur Macène','مال':'Mâl','بوتلميت':'Boutilimit','روصو':'Rosso','ألاك':'Aleg','كيهيدي':'Kaédi','كيفة':'Kiffa','النعمة':'Néma','لعيون':'Aioun','أطار':'Atar','ازويرات':'Zouerate','سيلبابي':'Sélibabi','تجكجة':'Tidjikja','بوكي':'Boghé'};
function profTranslit(v){
 const raw=String(v||'').trim();if(!raw)return'';if(PROF_PLACE_FR[raw])return PROF_PLACE_FR[raw];if(PROF_NAME_FR[raw])return PROF_NAME_FR[raw];
 const s=raw.replace(/^ب?ولاية\s+/,'').replace(/^مقاطعة\s+/,'').replace(/[ًٌٍَُِّْـ]/g,'');if(PROF_PLACE_FR[s])return PROF_PLACE_FR[s];
 const m={'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'ch','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'ou','ؤ':'ou','ي':'i','ى':'a','ئ':'i','ء':'',' ':' ','-':'-'};
 let out='';for(const ch of s)out+=m[ch]??ch;return out.replace(/\s+/g,' ').trim().replace(/(^|\s)([a-zà-ÿ])/g,(x,a,b)=>a+b.toUpperCase())
}
function profNameFr(v){const raw=String(v||'').trim();if(!raw)return'';return raw.split(/\s+/).map(x=>PROF_NAME_FR[x]||profTranslit(x)).join(' ')}
const PROF_NAME_AR=Object.fromEntries(Object.entries(PROF_NAME_FR).map(([ar,latin])=>[String(latin).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),ar]));
function profLatinNorm(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function profLatinWordAr(v){
 let x=profLatinNorm(v);if(!x)return'';if(PROF_NAME_AR[x])return PROF_NAME_AR[x];
 x=x.replace(/ch/g,'ش').replace(/kh/g,'خ').replace(/gh/g,'غ').replace(/ou/g,'و').replace(/th/g,'ث').replace(/ph/g,'ف').replace(/dj/g,'ج').replace(/sh/g,'ش');
 const map={a:'ا',b:'ب',c:'ك',d:'د',e:'',f:'ف',g:'غ',h:'ه',i:'ي',j:'ج',k:'ك',l:'ل',m:'م',n:'ن',o:'و',p:'ب',q:'ق',r:'ر',s:'س',t:'ت',u:'و',v:'ف',w:'و',x:'كس',y:'ي',z:'ز'};
 let out='';for(const ch of x)out+=map[ch]??ch;return out
}
function profNameAr(v){
 const raw=String(v||'').trim();if(!raw)return'';if(/[\u0600-\u06ff]/u.test(raw))return raw;
 try{const converted=window.nataijiFrToAr?.(raw);if(converted&&/[\u0600-\u06ff]/u.test(converted))return converted}catch{}
 return raw.split(/\s+/).map(profLatinWordAr).join(' ').replace(/\s+/g,' ').trim()
}
function profName(v){const raw=String(v||'').trim();return fr()?profNameFr(raw):raw}
function profSubjectFr(v){const raw=String(v||'').trim();return PROF_SUBJECT_FR[raw]||profTranslit(raw)}
function profSubject(v){const raw=String(v||'').trim();return fr()?profSubjectFr(raw):raw}
function profClassFr(v){const raw=String(v||'').trim();const map={'السنة الأولى ابتدائية':'1re année primaire','السنة الثانية ابتدائية':'2e année primaire','السنة الثالثة ابتدائية':'3e année primaire','السنة الرابعة ابتدائية':'4e année primaire','السنة الخامسة ابتدائية':'5e année primaire','السنة السادسة ابتدائية':'6e année primaire'};return map[raw]||(/^[0-9A-Z-]+$/i.test(raw)?raw:profTranslit(raw))}
function profClass(v){const raw=String(v||'').trim();return fr()?profClassFr(raw):raw}
function profSchoolFrAuto(v){
 const raw=String(v||'').trim();if(!raw)return'';
 const rules=[
  [/^(?:الإعدادية|الاعدادية|إعدادية|اعدادية)\s*/u,'Collège'],
  [/^(?:الثانوية|ثانوية)\s*/u,'Lycée'],
  [/^(?:المدرسة|مدرسة)\s*/u,'École']
 ];
 for(const [re,prefix] of rules)if(re.test(raw)){const rest=raw.replace(re,'').trim();return prefix+(rest?' '+profTranslit(rest):'')}
 return profTranslit(raw)
}
function profSchool(){return fr()?(profile.schoolNameFr||profSchoolFrAuto(profile.schoolName)):profile.schoolName}
function profRegion(){return fr()?(profile.regionFr||PROF_PLACE_FR[profile.region]||profTranslit(profile.region)):profile.region}
function profInspection(){return fr()?(profile.inspectionFr||profTranslit(profile.inspection)):profile.inspection}
function profNamePair(v){const raw=String(v||'').trim(),hasArabic=/[\u0600-\u06ff]/u.test(raw);return{ar:hasArabic?raw:'',fr:hasArabic?profNameFr(raw):raw}}
function profStudentName(student){const ar=String(student?.name||'').trim(),manual=String(student?.nameFr||'').trim();return fr()?(manual||profNameFr(ar)):(ar||profNameAr(manual))}
function profStudentNamePair(student){const rawAr=String(student?.name||'').trim(),manual=String(student?.nameFr||'').trim(),ar=rawAr||profNameAr(manual);return{ar,fr:manual||profNameFr(ar)}}
function profClassPair(v){const raw=String(v||'').trim();return{ar:raw,fr:profClassFr(raw)}}
function profSchoolPair(){const ar=String(profile.schoolName||'').trim(),frName=String(profile.schoolNameFr||'').trim()||profSchoolFrAuto(ar);return{ar,fr:frName}}
function profRegionPair(){const ar=String(profile.region||'').trim(),frName=String(profile.regionFr||'').trim()||PROF_PLACE_FR[ar]||profTranslit(ar);return{ar,fr:frName}}
function profInspectionPair(){const ar=String(profile.inspection||'').trim(),frName=String(profile.inspectionFr||'').trim()||profTranslit(ar);return{ar,fr:frName}}
function profSubjectPair(subject,subjectKey='',levelCode='',branchCode=''){const spec=catalogSubject(levelCode,subjectKey||subject,branchCode),raw=String(subject||'').trim();return{ar:String(spec?.ar||raw),fr:String(spec?.fr||profSubjectFr(raw)),abbr:String(spec?.abbr||'')}}

function catalogLevel(code){return (academicCatalog.levels||[]).find(x=>x.code===String(code||'').toUpperCase())||null}
function inferredLevelCode(name){const m=String(name||'').toUpperCase().replace(/\s+/g,'').match(/^([123567])AS/);return m?m[1]+'AS':''}
function classLevel(cls){return catalogLevel(cls?.levelCode||inferredLevelCode(cls?.name))}
function normalizedBranchCode(value){const code=String(value||'').trim().toUpperCase(),aliases={M:'C',SN:'D',LM:'A',LO:'O'};return aliases[code]||code}
function catalogBranch(levelCode,branchCode=''){const level=catalogLevel(levelCode),code=normalizedBranchCode(branchCode);return (level?.branches||[]).find(b=>String(b.code||'').toUpperCase()===code)||null}
function catalogSubjects(levelCode,branchCode=''){const level=catalogLevel(levelCode);if(!level)return[];const branch=catalogBranch(levelCode,branchCode);return branch?.subjects?.length?branch.subjects:(level.subjects||[])}
function normalizedSubjectKey(value){
 const raw=String(value||'').trim().toLowerCase();if(!raw)return'';
 for(const level of academicCatalog.levels||[]){
  const all=[...(level.subjects||[]),...(level.branches||[]).flatMap(b=>b.subjects||[])];
  for(const s of all)if(raw===String(s.key||'').toLowerCase()||raw===String(s.ar||'').toLowerCase()||raw===String(s.fr||'').toLowerCase())return s.key
 }
 return''
}
function catalogSubject(levelCode,keyOrName,branchCode=''){const key=normalizedSubjectKey(keyOrName)||String(keyOrName||'');return catalogSubjects(levelCode,branchCode).find(s=>s.key===key)||null}
function levelLabel(cls){const l=classLevel(cls),b=catalogBranch(cls?.levelCode||inferredLevelCode(cls?.name),cls?.branchCode);if(!l)return'';const base=fr()?l.fr:l.ar;return b?base+' · '+(fr()?b.fr:b.ar):base}
function classById(id){return profile.classes.find(c=>String(c.id)===String(id))}
function displayClasses(){return [...(profile.classes||[])].sort((a,b)=>String(a?.name||'').localeCompare(String(b?.name||''),fr()?'fr':'ar',{numeric:true,sensitivity:'base'}))}
function assignmentsForClass(id){
 const cls=classById(id),order=new Map(catalogSubjects(cls?.levelCode||inferredLevelCode(cls?.name),cls?.branchCode).map((s,i)=>[String(s.key),i]));
 return profile.assignments.filter(a=>String(a.classId)===String(id)).sort((a,b)=>{
  const ak=normalizedSubjectKey(a.subjectKey||a.subject),bk=normalizedSubjectKey(b.subjectKey||b.subject),ai=order.has(ak)?order.get(ak):999,bi=order.has(bk)?order.get(bk):999;
  return ai-bi||profSubject(a.subject).localeCompare(profSubject(b.subject),fr()?'fr':'ar',{sensitivity:'base'})
 })
}
function classDisplayName(cls){
 const name=profClass(cls?.name||''),code=String(cls?.levelCode||'').trim(),branch=String(cls?.branchCode||'').trim(),norm=v=>String(v||'').toLowerCase().replace(/[\s._-]+/g,'');
 let out=code&&name&&!norm(name).includes(norm(code))?name+' · '+code:name||code;
 if(branch&&out&&!norm(out).includes(norm(branch)))out+=' · '+branch;
 return out||branch
}
function subjectStatsForTerm(a,term){
 const students=classById(a.classId)?.students||[],marks=marksFor(a.id),values=[];
 for(const student of students){const value=termResult(marks[student.id]||{},term);if(value!=null)values.push(value)}
 const avg=values.length?values.reduce((x,y)=>x+y,0)/values.length:null;
 return{students:students.length,done:values.length,avg,percent:students.length?Math.round(values.length/students.length*100):0}
}
function latestClassTerm(classId){
 const assignments=assignmentsForClass(classId),students=classById(classId)?.students||[];
 for(let term=3;term>=1;term--)for(const a of assignments){const marks=marksFor(a.id);if(students.some(student=>termResult(marks[student.id]||{},term)!=null))return term}
 return 1
}
function homeMetrics(classId){
 const cls=classById(classId),assignments=assignmentsForClass(classId),students=cls?.students||[],term=latestClassTerm(classId);
 const subjectStats=assignments.map(a=>({assignment:a,...subjectStatsForTerm(a,term)}));
 const totalSlots=assignments.length*students.length,completedSlots=subjectStats.reduce((n,x)=>n+x.done,0),completion=totalSlots?Math.round(completedSlots/totalSlots*100):0;
 const studentAverages=[];
 for(const student of students){let weighted=0,coefTotal=0;for(const a of assignments){const value=termResult(marksFor(a.id)[student.id]||{},term);if(value==null)continue;const coef=coefficientOf(a);weighted+=value*coef;coefTotal+=coef}if(coefTotal>0)studentAverages.push(weighted/coefTotal)}
 const average=studentAverages.length?studentAverages.reduce((a,b)=>a+b,0)/studentAverages.length:null,needs=studentAverages.filter(v=>v<10).length;
 return{cls,assignments,students,term,subjectStats,completion,average,needs,completedSlots,totalSlots}
}
function marksFor(id){profile.marks[id]=profile.marks[id]&&typeof profile.marks[id]==='object'?profile.marks[id]:{};return profile.marks[id]}
function linkFor(localId){return links?.[localId]||null}
function coefficientOf(a){const cls=classById(a?.classId),spec=catalogSubject(cls?.levelCode||inferredLevelCode(cls?.name),a?.subjectKey||a?.subject,cls?.branchCode);if(spec?.official&&Number(spec.coefficient)>0)return Number(spec.coefficient);const n=Number(a?.coefficient);return Number.isFinite(n)&&n>0?n:1}
function professorIsAbsent(v){return /^(ABSENT|غائب|غائبة|absent|absente|a)$/i.test(String(v??'').trim())}
function professorAbsentLabel(student){const female=String(student?.sex||'').toLowerCase()==='female';return fr()?(female?'Absente':'Absent'):(female?'غائبة':'غائب')}
function professorGradeDisplay(v,student){return professorIsAbsent(v)?professorAbsentLabel(student):String(v??'')}
function markNumber(v){if(v===''||v==null)return null;if(professorIsAbsent(v))return 0;const n=Number(v);return Number.isFinite(n)?n:null}
function ensureProfessorTerm(m,term){
 m.terms=m.terms&&typeof m.terms==='object'?m.terms:{};
 const key=String(term),raw=m.terms[key]&&typeof m.terms[key]==='object'?m.terms[key]:{},tests=Array.isArray(raw.tests)?raw.tests:[];
 m.terms[key]={tests:[tests[0]??''],exam:raw.exam??''};return m.terms[key]
}
function termRecord(m,term){
 const raw=m?.terms?.[String(term)]||m?.terms?.[term]||{},tests=Array.isArray(raw?.tests)?raw.tests:[],rawTest=tests[0]??'',rawExam=raw?.exam??'',test=markNumber(rawTest),exam=markNumber(rawExam);
 return{test,tests:[test],exam,displayTest:professorIsAbsent(rawTest)?'ABSENT':test,displayExam:professorIsAbsent(rawExam)?'ABSENT':exam}
}
function termResult(m,term){
 const rec=termRecord(m,term);if(rec.test==null||rec.exam==null)return null;
 return(rec.test+rec.exam)/2
}
function annualSubjectResult(m){
 const f1=termResult(m,1),f2=termResult(m,2),f3=termResult(m,3);
 if([f1,f2,f3].some(v=>v==null))return null;
 return((f1*1)+(f2*2)+(f3*3))/6
}
function latestTermResult(m){for(let term=3;term>=1;term--){const value=termResult(m,term);if(value!=null)return{term,value}}return{term:0,value:null}}
function statsFor(a){const students=classById(a.classId)?.students||[],marks=marksFor(a.id),byTerm={1:[],2:[],3:[]};for(const s of students){const m=marks[s.id]||{};for(let term=1;term<=3;term++){const value=termResult(m,term);if(value!=null)byTerm[term].push(value)}}let term=0;for(let t=3;t>=1;t--)if(byTerm[t].length){term=t;break}const values=term?byTerm[term]:[],avg=values.length?values.reduce((x,y)=>x+y,0)/values.length:null,coefficient=coefficientOf(a);return{students:students.length,done:values.length,avg,term,coefficient,weighted:avg==null?null:avg*coefficient}}
function iconFor(subject){const s=String(subject||'').toLowerCase();if(/math|رياض/.test(s))return'∑';if(/fran|فرنس/.test(s))return'FR';if(/anglais|english|إنج/.test(s))return'EN';if(/phys|فيز/.test(s))return'⚛';if(/chim|كيم/.test(s))return'⚗';if(/arab|عرب/.test(s))return'ع';if(/islam|إسلام/.test(s))return'☾';return'✦'}
function toast(text){let t=q('.professor-toast');if(!t){t=document.createElement('div');t.className='professor-toast';document.body.appendChild(t)}t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function modal(title,body){const w=document.createElement('div');w.className='professor-modal';w.innerHTML=`<div class="professor-modal-card"><header><h2>${esc(title)}</h2><button type="button" class="professor-x" aria-label="${esc(tr('إغلاق','Fermer'))}">×</button></header><div class="professor-modal-body">${body}</div></div>`;document.body.appendChild(w);const close=()=>w.remove();q('.professor-x',w).onclick=close;w.onclick=e=>{if(e.target===w)close()};return{wrap:w,close}}
async function refreshProfile(){const [r,cat]=await Promise.all([api('/api/professor/profile'),api('/api/professor/catalog').catch(()=>null)]);profile=normalize(r.profile);links=r.classLinks||{};if(cat?.catalog)academicCatalog=cat.catalog;return r}
async function saveProfile(message=''){
 if(gradeSaveTimer||gradeSaveInFlight||gradeSavedRevision<gradeEditRevision)await flushGradeAutosave();
 const sent=structuredClone(profile),sentJson=JSON.stringify(sent);
 const r=await api('/api/professor/profile',{method:'PUT',body:JSON.stringify({profile:sent})});
 // Never let an older server response overwrite marks typed while this request
 // was still in flight. A later autosave will persist the newer local revision.
 if(JSON.stringify(profile)===sentJson)profile=normalize(r.profile);
 links=r.classLinks||links||{};if(message)toast(message);return r
}
function gradeStatus(text){
 const el=q('#pv2SaveState');if(el)el.textContent=text
}
function currentGradeSaveContext(){
 const m=String(currentView||'').match(/^grade:([^:]+):([123])$/);return m?{assignmentId:m[1],term:Number(m[2])}:null
}
function professorGradeRows(ctx){
 const a=profile.assignments.find(x=>String(x.id)===String(ctx?.assignmentId)),cls=a?classById(a.classId):null,marks=a?marksFor(a.id):{};
 return (cls?.students||[]).map(student=>{const rec=ensureProfessorTerm(marks[student.id]||(marks[student.id]={terms:{}}),ctx.term);return{studentId:String(student.id),test:rec.tests[0]??'',exam:rec.exam??''}})
}
async function saveProfessorGradeContext(ctx,target){
 if(!ctx)return true;
 const rows=professorGradeRows(ctx),confirmed=[];
 for(const row of rows){
  const r=await api('/api/professor/assignments/'+encodeURIComponent(ctx.assignmentId)+'/students/'+encodeURIComponent(row.studentId)+'/grades',{method:'PUT',body:JSON.stringify({term:ctx.term,test:row.test,exam:row.exam})});
  if(!r?.ok||r.verified!==true||String(r.studentId)!==String(row.studentId))throw new Error('professor_grade_verification_failed');
  confirmed.push(r)
 }
 if(gradeEditRevision===target){
  const assignmentMarks=marksFor(ctx.assignmentId);
  for(const r of confirmed){
   assignmentMarks[r.studentId]=assignmentMarks[r.studentId]&&typeof assignmentMarks[r.studentId]==='object'?assignmentMarks[r.studentId]:{terms:{}};
   assignmentMarks[r.studentId].terms=assignmentMarks[r.studentId].terms&&typeof assignmentMarks[r.studentId].terms==='object'?assignmentMarks[r.studentId].terms:{};
   assignmentMarks[r.studentId].terms[String(ctx.term)]=structuredClone(r.record||{tests:[''],exam:''})
  }
 }
 return{ok:true,rowCount:confirmed.length}
}
function scheduleGradeAutosave(){
 gradeEditRevision++;if(gradeSaveTimer)clearTimeout(gradeSaveTimer);
 gradeStatus(tr('جارٍ انتظار الحفظ التلقائي…','En attente de l’enregistrement automatique…'));
 gradeSaveTimer=setTimeout(()=>{gradeSaveTimer=null;void flushGradeAutosave()},450)
}
async function flushGradeAutosave(){
 if(gradeSaveTimer){clearTimeout(gradeSaveTimer);gradeSaveTimer=null}
 if(gradeSaveInFlight){try{await gradeSaveInFlight}catch{}}
 if(gradeSavedRevision>=gradeEditRevision)return true;
 const ctx=currentGradeSaveContext();if(!ctx)return true;
 const target=gradeEditRevision;gradeStatus(tr('جارٍ الحفظ والتحقق على الخادم…','Enregistrement et vérification sur le serveur…'));
 gradeSaveInFlight=(async()=>{try{await saveProfessorGradeContext(ctx,target);gradeSavedRevision=Math.max(gradeSavedRevision,target);gradeStatus(tr('✓ تم الحفظ والتحقق من الخادم','✓ Enregistré et vérifié sur le serveur'));return true}catch{gradeStatus(tr('تعذر تثبيت النتائج على الخادم — أعد المحاولة','Impossible de confirmer les notes sur le serveur — réessayez'));return false}finally{gradeSaveInFlight=null}})();
 const ok=await gradeSaveInFlight;
 if(ok&&gradeSavedRevision<gradeEditRevision)return flushGradeAutosave();
 return ok
}
async function forceProfessorGradeSave(){
 if(gradeSaveTimer){clearTimeout(gradeSaveTimer);gradeSaveTimer=null}
 if(gradeSaveInFlight){try{await gradeSaveInFlight}catch{}}
 const ctx=currentGradeSaveContext();if(!ctx)return true;
 const target=gradeEditRevision,rows=professorGradeRows(ctx);
 gradeStatus(tr('جارٍ تثبيت '+rows.length+' تلميذًا واحدًا واحدًا…','Enregistrement vérifié de '+rows.length+' élève(s), un par un…'));
 try{
  const result=await saveProfessorGradeContext(ctx,target);
  if(!result?.ok||Number(result.rowCount)!==rows.length)throw new Error('professor_grade_verification_failed');
  if(gradeEditRevision!==target)return forceProfessorGradeSave();
  await refreshProfile();
  const persisted=professorGradeRows(ctx);
  const wanted=new Map(rows.map(x=>[x.studentId,JSON.stringify([String(x.test??''),String(x.exam??'')])]));
  const verified=persisted.length===rows.length&&persisted.every(x=>wanted.get(x.studentId)===JSON.stringify([String(x.test??''),String(x.exam??'')]));
  if(!verified)throw new Error('professor_grade_reload_verification_failed');
  gradeSavedRevision=gradeEditRevision;
  gradeStatus(tr('✓ تم تثبيت '+rows.length+'/'+rows.length+' تلميذًا على الخادم','✓ '+rows.length+'/'+rows.length+' élève(s) confirmés sur le serveur'));
  return true
 }catch{
  gradeStatus(tr('تعذر تثبيت جميع النتائج على الخادم — لم يتم اعتماد الحفظ','Impossible de confirmer toutes les notes sur le serveur — enregistrement non validé'));
  return false
 }
}
function toggleLanguage(){const next=fr()?'ar':'fr';localStorage.setItem('nataiji-lang',next);syncProfessorLanguage();renderCurrent()}

function topbar(title='',subtitle='',home=false){
 const accountName=profName(professorUser?.name||'')||tr('الأستاذ','Professeur'),classes=displayClasses();
 if(home&&(!homeClassId||!classes.some(c=>String(c.id)===String(homeClassId))))homeClassId=classes[0]?.id||'';
 const active=home?classById(homeClassId):null,classOptions=classes.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(homeClassId)?'selected':''}>${esc(classDisplayName(c))}</option>`).join('');
 return `<header class="professor-topbar professor-reference-topbar">
  <div class="professor-reference-main">
   <div class="professor-account"><span class="prof-account-avatar">${professorMoreIcon('account')}</span><span><b>${esc(accountName)}</b><small>${tr('أستاذ','Professeur')}${profSchool()?' · '+esc(profSchool()):''}</small></span></div>
   <div class="professor-brand"><span><b>${tr('نتائجي','Nataiji')}</b><small>${tr('مستقبلي يبدأ من هنا','Mon avenir commence ici')}</small></span><img src="/nataiji-brand-mark.png" width="46" height="46" alt=""></div>
   <div class="prof-utility"><button type="button" id="profUtilityToggle" class="prof-utility-toggle" aria-label="${tr('خيارات الحساب','Options du compte')}">⋯</button><div class="professor-top-actions" id="profUtilityMenu"><button type="button" id="profLang" class="ghost prof-lang">${fr()?'العربية':'Français'}</button><button type="button" id="profRefresh" class="ghost prof-icon-action" aria-label="${tr('تحديث البيانات','Actualiser les données')}">↻</button><button type="button" id="profLogout" class="ghost prof-logout">${tr('تسجيل الخروج','Déconnexion')}</button></div></div>
  </div>
  ${home?`<div class="prof-home-context"><button type="button" id="profHomeYear" class="prof-home-context-item"><span>${professorMoreIcon('calendar')}</span><div><small>${tr('السنة الدراسية','Année scolaire')}</small><b dir="ltr">${esc(profile.year||'…')}</b></div></button><label class="prof-home-context-item prof-home-class-select"><span>${professorMoreIcon('class')}</span><div><small>${tr('القسم الحالي','Classe actuelle')}</small><select id="profHomeClass">${classOptions||`<option value="">${tr('لا يوجد قسم','Aucune classe')}</option>`}</select></div></label></div>`:''}
 </header>`
}
function bindTop(el){
 const menu=q('#profUtilityMenu',el),toggle=q('#profUtilityToggle',el);
 toggle?.addEventListener('click',()=>menu?.classList.toggle('open'));
 q('#profLang',el)?.addEventListener('click',async()=>{await flushGradeAutosave();toggleLanguage()});
 q('#profRefresh',el)?.addEventListener('click',async()=>{const b=q('#profRefresh',el);b.disabled=true;try{await flushGradeAutosave();await refreshProfile();toast(tr('تم التحديث','Actualisé'));renderCurrent()}finally{b.disabled=false}});
 q('#profLogout',el)?.addEventListener('click',async()=>{await flushGradeAutosave();logout()});
 q('#profHomeYear',el)?.addEventListener('click',openSettings);
 q('#profHomeClass',el)?.addEventListener('change',e=>{homeClassId=e.target.value;renderHome()})
}

function nav(active='home'){return `<nav class="professor-nav">
 <button class="${active==='home'?'on':''}" data-prof-nav="home"><span>${professorMoreIcon('home')}</span>${tr('الرئيسية','Accueil')}</button>
 <button class="${active==='grades'?'on':''}" data-prof-nav="grades"><span>${professorMoreIcon('grades')}</span>${tr('الدرجات','Notes')}</button>
 <button class="${active==='students'?'on':''}" data-prof-nav="students"><span>${professorMoreIcon('students')}</span>${tr('التلاميذ','Élèves')}</button>
 <button class="${active==='reports'?'on':''}" data-prof-nav="reports"><span>${professorMoreIcon('reports')}</span>${tr('التقارير','Rapports')}</button>
 <button class="${active==='more'?'on':''}" data-prof-nav="more"><span>${professorMoreIcon('more')}</span>${tr('المزيد','Plus')}</button>
 </nav>`}
function bindNav(el){qa('[data-prof-nav]',el).forEach(b=>b.onclick=async()=>{await flushGradeAutosave();currentView=b.dataset.profNav;renderCurrent()})}

function assignmentCard(a){
 const cls=classById(a.classId),s=statsFor(a),linked=linkFor(a.classId),avg=s.avg==null?'—':s.avg.toFixed(2),percent=s.students?Math.round((s.done/s.students)*100):0,teachers=linked?.memberCount||1;
 return `<article class="prof-v2-assignment prof-luxe-subject-card">
  <div class="prof-luxe-subject-top">
   <div class="prof-luxe-subject-identity">
    <div class="prof-subject-icon">${esc(iconFor(a.subject))}</div>
    <div class="prof-luxe-subject-copy">
     <div class="prof-card-eyebrow">
      <em class="coef-chip">${professorMoreIcon('books')}<span>${tr('المعامل','Coef.')} ×${coefficientOf(a)}</span></em>
      <em class="teacher-chip">${professorMoreIcon('students')}<span>${teachers} ${tr('أستاذ','professeur(s)')}</span></em>
     </div>
     <h3>${esc(profSubject(a.subject))}</h3>
    </div>
   </div>
  </div>
  <div class="prof-progress"><i style="width:${percent}%"></i></div>
  <div class="prof-card-meta"><strong class="prof-grade-outof" dir="ltr"><span>${avg}</span><span>/20</span></strong><span>${s.done}/${s.students} ${tr('مكتمل','terminé')}${s.term?' · '+tr('الفصل','T')+' '+s.term:''}</span></div>
  <div class="prof-card-actions prof-luxe-subject-actions"><button class="prof-list-action" data-subject-list-id="${esc(a.id)}">${professorMoreIcon('reports')}<span>${tr('لائحة مادتي','Liste de ma matière')}</span></button><button class="prof-open-grade" data-grade-id="${esc(a.id)}">${professorMoreIcon('grades')}<span>${tr('إدخال الدرجات','Saisir les notes')}</span></button></div>
 </article>`
}

function renderCurrent(){
 if(currentView==='grades')return renderGrades();
 if(currentView==='students'||currentView==='classes')return renderClasses();
 if(currentView==='reports')return renderReportsHub();
 if(currentView==='results')return renderResults();
 if(currentView==='more')return renderMore();
 if(currentView.startsWith('results:')){const [,id,term]=currentView.split(':');return renderResults(id,Number(term)||1)}
 if(currentView.startsWith('class:'))return openClass(currentView.slice(6));
 if(currentView.startsWith('grade:')){const [,id,term]=currentView.split(':');return openGrades(id,Number(term)||1)}
 return renderHome()
}

function professorHeroIllustration(){
 return `<svg class="prof-home-hero-svg" viewBox="0 0 260 210" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="profBook1" x1="0" x2="1"><stop offset="0" stop-color="#0d6f68"/><stop offset="1" stop-color="#13a083"/></linearGradient>
   <linearGradient id="profBook2" x1="0" x2="1"><stop offset="0" stop-color="#123f57"/><stop offset="1" stop-color="#0d7d77"/></linearGradient>
   <linearGradient id="profPaper" x1="0" x2="1"><stop offset="0" stop-color="#dff7ef"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
   <linearGradient id="profGold" x1="0" x2="1"><stop offset="0" stop-color="#f5d777"/><stop offset="1" stop-color="#d49d2d"/></linearGradient>
   <filter id="profShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#002d35" flood-opacity=".28"/></filter>
  </defs>
  <g filter="url(#profShadow)">
   <g transform="translate(54 130) rotate(-4)">
    <rect x="0" y="27" rx="9" ry="9" width="151" height="27" fill="url(#profBook2)"/>
    <rect x="13" y="31" rx="4" width="123" height="18" fill="url(#profPaper)" opacity=".95"/>
    <path d="M9 38h132" stroke="#b8ddd5" stroke-width="2" opacity=".7"/>
    <rect x="18" y="0" rx="9" ry="9" width="151" height="29" fill="url(#profBook1)"/>
    <rect x="31" y="4" rx="4" width="123" height="20" fill="url(#profPaper)" opacity=".97"/>
    <path d="M30 12h126M30 18h126" stroke="#b7dcd4" stroke-width="1.7" opacity=".7"/>
   </g>
   <g transform="translate(86 67)">
    <path d="M0 22 72 0l74 25-73 28z" fill="#0e6670" stroke="#7bd5c8" stroke-width="2"/>
    <path d="M17 30v28c33 22 72 23 109 2V31L73 53z" fill="#084e62"/>
    <path d="M73 53c18 8 36 8 53 1v16c-33 19-73 16-109-3V53c19 8 37 9 56 0z" fill="#0b5f6e" opacity=".78"/>
    <circle cx="73" cy="24" r="4.5" fill="#e8c45d"/>
    <path d="M74 25c42 4 54 20 55 56" fill="none" stroke="url(#profGold)" stroke-width="4" stroke-linecap="round"/>
    <path d="m126 80 8 12-6 17-7-17z" fill="url(#profGold)"/>
   </g>
   <g transform="translate(170 35) rotate(11)">
    <rect x="0" y="0" width="62" height="92" rx="12" fill="rgba(255,255,255,.17)" stroke="rgba(255,255,255,.42)" stroke-width="2"/>
    <path d="M15 24h13M15 42h32M15 56h32M15 70h25" stroke="#d9fff6" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <circle cx="18" cy="19" r="4" fill="#f5d777"/>
   </g>
  </g>
  <g fill="#f3d66b">
   <path d="m36 42 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>
   <path d="m226 18 2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>
   <path d="m224 136 3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5z"/>
  </g>
 </svg>`
}

function renderHome(){
 currentView='home';const el=root(),classes=displayClasses();if(!homeClassId||!classes.some(c=>String(c.id)===String(homeClassId)))homeClassId=classes[0]?.id||'';
 const m=homeMetrics(homeClassId),className=classDisplayName(m.cls),statusRows=m.subjectStats.map(({assignment:a,students,done,percent})=>`<button type="button" class="prof-home-subject-row" data-home-grade-id="${esc(a.id)}"><div class="prof-home-subject-main"><span class="prof-home-subject-icon">${esc(iconFor(a.subject))}</span><div><b>${esc(profSubject(a.subject))}</b><small>${done}/${students}</small></div></div><div class="prof-home-subject-progress"><span>${percent}%</span><div><i style="width:${percent}%"></i></div></div></button>`).join('');
 const averageText=m.average==null?'—':m.average.toFixed(1);
 el.innerHTML=`<div class="professor-shell prof-home-shell">${topbar('','',true)}
 <section class="prof-v2-hero prof-reference-hero"><div class="prof-home-hero-art" aria-hidden="true">${professorHeroIllustration()}</div><div class="prof-hero-copy"><small class="prof-home-kicker">${tr('لوحة النتائج','Tableau des résultats')}</small><h1>${tr('مرحباً، ','Bonjour, ')}${esc(profName(professorUser?.name||''))}</h1><p>${tr('تابع إدخال النتائج واكتمالها من مكان واحد.','Suivez la saisie et l’avancement des résultats depuis un seul endroit.')}</p><button class="primary" id="profGoGrades"><span>✎</span>${tr('إدخال النتائج','Saisir les résultats')}</button></div></section>
 <section class="prof-v2-stats prof-reference-stats"><article class="students"><span class="prof-stat-icon">${professorMoreIcon('students')}</span><div><strong>${m.students.length}</strong><small>${tr('التلاميذ','Élèves')}</small></div></article><article class="average"><span class="prof-stat-icon">${professorMoreIcon('average')}</span><div><strong class="prof-grade-outof" dir="ltr"><span>${averageText}</span><span>/20</span></strong><small>${tr('معدل القسم','Moyenne de la classe')}</small><em>${tr('مؤقت حسب الدرجات المدخلة','Provisoire selon les notes saisies')}</em></div></article><article class="complete"><span class="prof-stat-icon">${professorMoreIcon('complete')}</span><div><strong>${m.completion}%</strong><small>${tr('اكتمال الدرجات','Notes complètes')}</small></div></article><article class="needs"><span class="prof-stat-icon">${professorMoreIcon('alert')}</span><div><strong>${m.needs}</strong><small>${tr('أقل من 10/20','Sous 10/20')}</small><em>${tr('مؤقت حسب الدرجات المدخلة','Provisoire selon les notes saisies')}</em></div></article></section>
 <section class="professor-content prof-home-status"><div class="prof-home-status-head"><div><span class="prof-home-status-icon">${professorMoreIcon('results')}</span><div><h2>${tr('حالة الفصل','État du trimestre')}</h2><p>${tr('نسبة إدخال الدرجات لكل مادة','Progression de la saisie pour chaque matière')} · ${tr('الفصل','T')} ${m.term}${className?' · '+esc(className):''}</p></div></div><button id="profShowAllGrades">${tr('عرض الكل','Tout afficher')}</button></div><div class="prof-home-subject-list">${statusRows||`<div class="professor-empty compact"><div>✎</div><h3>${tr('ابدأ بإضافة مادة','Ajoutez votre première matière')}</h3><p>${tr('بعد إضافة المادة ستظهر نسبة إدخال نتائجها هنا.','Après ajout, sa progression apparaîtra ici.')}</p><div class="prof-home-empty-actions"><button class="primary" id="profEmptyAdd">+ ${tr('إضافة مادة أو قسم','Ajouter une matière ou une classe')}</button><button id="profJoinClass">🔗 ${tr('الانضمام برمز القسم','Rejoindre avec un code')}</button></div></div>`}</div></section>
 ${nav('home')}</div>`;
 bindTop(el);bindNav(el);requestAnimationFrame(()=>{try{window.scrollTo({top:0,left:0,behavior:'instant'})}catch{window.scrollTo(0,0)}});q('#profGoGrades',el).onclick=()=>{currentView='grades';renderGrades()};q('#profShowAllGrades',el)?.addEventListener('click',()=>{currentView='grades';renderGrades()});q('#profEmptyAdd',el)?.addEventListener('click',openAssignment);q('#profJoinClass',el)?.addEventListener('click',openJoinClass);qa('[data-home-grade-id]',el).forEach(b=>b.onclick=()=>openGrades(b.dataset.homeGradeId))
}

function renderGrades(){
 currentView='grades';const el=root(),assignments=profile.assignments||[];
 const groups=displayClasses().filter(cls=>assignments.some(a=>String(a.classId)===String(cls.id))).map(cls=>{
  const subs=assignmentsForClass(cls.id),linked=linkFor(cls.id),teacherCount=linked?.memberCount||1;
  return `<section class="prof-class-subject-group prof-luxe-class-group">
   <div class="prof-class-subject-head">
    <div class="prof-luxe-class-title"><span class="prof-luxe-class-icon">${professorMoreIcon('students')}</span><div><small>${tr('القسم','Classe')}</small><h2>${esc(classDisplayName(cls))}</h2><p>${subs.length} ${tr('مادة في حسابك','matière(s) dans votre compte')} · ${teacherCount} ${tr('أستاذ','professeur(s)')}</p></div></div>
    <button data-add-subject-to-class="${esc(cls.id)}"><span>+</span>${tr('إضافة مادة لهذا القسم','Ajouter une matière à cette classe')}</button>
   </div>
   <div class="prof-assignment-list">${subs.map(assignmentCard).join('')}</div>
  </section>`
 }).join('');
 el.innerHTML=`<div class="professor-shell prof-grades-reference">${topbar(tr('الدرجات','Notes'),tr('القسم أولًا ثم المادة','Classe puis matière'))}<section class="prof-page-head prof-grades-head"><div><span class="prof-grades-head-icon">${professorMoreIcon('average')}</span><div><h1>${tr('درجات موادي','Notes de mes matières')}</h1><p>${tr('القسم يُنشأ مرة واحدة. أضف داخله مادة أو أكثر، وتستخدم جميع المواد نفس قائمة التلاميذ مع درجات مستقلة لكل مادة.','Une classe est créée une seule fois. Ajoutez-y une ou plusieurs matières ; toutes utilisent la même liste d’élèves avec des notes indépendantes.')}</p></div></div><div><button class="primary" id="profGradesAddSubject"><span>+</span>${tr('مادة أو قسم','Matière ou classe')}</button></div></section><section class="professor-content prof-grades-content">${groups||`<div class="professor-empty"><div>✎</div><h3>${tr('لا توجد مواد بعد','Aucune matière')}</h3><p>${tr('أنشئ قسمًا مع أول مادة، وبعد ذلك أضف بقية المواد إلى نفس القسم دون تكرار التلاميذ.','Créez une classe avec sa première matière, puis ajoutez les autres matières à la même classe sans répéter les élèves.')}</p><button class="primary" id="profGradesEmptyAdd">+ ${tr('إضافة أول مادة','Ajouter la première matière')}</button></div>`}</section>${nav('grades')}</div>`;
 bindTop(el);bindNav(el);['#profGradesAddSubject','#profGradesEmptyAdd'].forEach(s=>q(s,el)?.addEventListener('click',openAssignment));qa('[data-add-subject-to-class]',el).forEach(b=>b.onclick=()=>openAssignment(b.dataset.addSubjectToClass));qa('[data-grade-id]',el).forEach(b=>b.onclick=()=>openGrades(b.dataset.gradeId));qa('[data-subject-list-id]',el).forEach(b=>b.onclick=()=>{void openSubjectList(b.dataset.subjectListId,1)})
}
function renderClasses(){
 currentView='students';const el=root();
 const cards=displayClasses().map(c=>{
  const l=linkFor(c.id),subs=assignmentsForClass(c.id),studentCount=(c.students||[]).length,teacherCount=l?.memberCount||1;
  const subjectTags=subs.map(a=>`<span class="prof-student-subject-chip"><i>${esc(iconFor(a.subject))}</i><b>${esc(profSubject(a.subject))}</b><small>${tr('معامل','Coef.')} ${coefficientOf(a)}</small></span>`).join('')||`<span class="prof-student-subject-chip muted">${tr('لا توجد مادة مرتبطة بعد','Aucune matière liée')}</span>`;
  return `<article class="prof-class-card prof-student-class-card">
   <header class="prof-student-class-head">
    <span class="prof-class-avatar">${professorMoreIcon('students')}</span>
    <div class="prof-student-class-title"><h3>${esc(classDisplayName(c))}</h3><p><span>${studentCount} ${tr('تلميذ','élève(s)')}</span><i>•</i><span>${subs.length} ${tr('مواد','matière(s)')}</span></p></div>
    <button class="prof-student-class-arrow" data-manage-class="${esc(c.id)}" aria-label="${tr('فتح القسم','Ouvrir la classe')}">›</button>
   </header>
   <div class="prof-class-tags prof-student-subject-tags">${subjectTags}</div>
   <div class="prof-class-link-state prof-student-link-state">
    <span class="prof-student-link-icon">${professorMoreIcon(l?'students':'link')}</span>
    <div>${l?`<span class="linked">${tr('قسم جماعي','Classe collective')}</span><small>${teacherCount} ${tr('أساتذة مرتبطون','professeurs liés')}</small>`:`<span>${tr('قسم خاص بحسابك','Classe privée')}</span><small>${tr('يمكنك إنشاء رمز جماعي لربط أساتذة هذا القسم','Vous pouvez créer un code collectif pour relier les professeurs de cette classe')}</small>`}</div>
   </div>
   <footer class="prof-student-class-actions">
    <button class="primary" data-manage-class="${esc(c.id)}">${professorMoreIcon('students')}<span>${tr('إدارة التلاميذ','Gérer les élèves')}</span></button>
    <button data-share-class="${esc(c.id)}">${professorMoreIcon('link')}<span>${l?tr('الرمز الجماعي','Code collectif'):tr('إنشاء رمز جماعي','Créer un code collectif')}</span></button>
   </footer>
  </article>`
 }).join('');
 el.innerHTML=`<div class="professor-shell prof-students-reference">${topbar(tr('التلاميذ','Élèves'),tr('إدارة قوائم الأقسام والربط','Listes de classes et liaison'))}
  <section class="prof-page-head prof-students-head">
   <div class="prof-students-head-copy"><span class="prof-students-head-icon">${professorMoreIcon('students')}</span><div><h1>${tr('التلاميذ','Élèves')}</h1><p>${tr('اختر القسم لإضافة التلاميذ أو حذفهم. القائمة نفسها تُستخدم في جميع مواد ذلك القسم.','Choisissez une classe pour ajouter ou retirer des élèves. La même liste sert à toutes les matières de la classe.')}</p></div></div>
   <div class="prof-students-head-actions"><button id="profClassJoin">${professorMoreIcon('link')}<span>${tr('الانضمام برمز القسم','Rejoindre avec un code')}</span></button><button class="primary" id="profClassAddSubject"><span class="plus">+</span><span>${tr('قسم جديد مع مادة','Nouvelle classe + matière')}</span></button></div>
  </section>
  <section class="prof-class-grid prof-students-class-grid">${cards||`<div class="professor-empty"><div>${professorMoreIcon('students')}</div><h3>${tr('لا توجد أقسام بعد','Aucune classe')}</h3><p>${tr('أنشئ القسم مع أول مادة من تبويب الدرجات، أو انضم إلى قسم جماعي بالرمز.','Créez la classe avec sa première matière depuis Notes, ou rejoignez une classe collective avec son code.')}</p><button class="primary" id="profStudentsCreate">${tr('اذهب إلى الدرجات','Aller aux notes')}</button></div>`}</section>
  ${nav('students')}
 </div>`;
 bindTop(el);bindNav(el);
 q('#profClassAddSubject',el).onclick=openAssignment;
 q('#profClassJoin',el).onclick=openJoinClass;
 q('#profStudentsCreate',el)?.addEventListener('click',()=>{currentView='grades';renderGrades()});
 qa('[data-manage-class]',el).forEach(b=>b.onclick=()=>openClass(b.dataset.manageClass));
 qa('[data-share-class]',el).forEach(b=>b.onclick=()=>shareClass(b.dataset.shareClass))
}
function professorMoreIcon(name){
 const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
 const icons={
  account:`<svg ${common}><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.6-4.1 3.2-6.3 7.5-6.3s6.9 2.2 7.5 6.3"/></svg>`,
  home:`<svg ${common}><path d="m4 10 8-6 8 6v10H4z"/><path d="M9 20v-6h6v6"/></svg>`,
  grades:`<svg ${common}><path d="m4 18 10-10 3 3L7 21H4z"/><path d="m13 9 2-2 3 3-2 2"/></svg>`,
  students:`<svg ${common}><circle cx="12" cy="8" r="3"/><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"/><path d="M5 9.5a2.4 2.4 0 0 0-2 2.4M19 9.5a2.4 2.4 0 0 1 2 2.4"/></svg>`,
  reports:`<svg ${common}><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
  more:`<svg ${common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`,
  calendar:`<svg ${common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
  class:`<svg ${common}><path d="M4 19V8l8-4 8 4v11"/><path d="M8 19v-5h8v5M9 10h.01M15 10h.01"/></svg>`,
  results:`<svg ${common}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h8"/></svg>`,
  spark:`<svg ${common}><path d="m12 3 1.2 3.3L16.5 8l-3.3 1.2L12 12.5l-1.2-3.3L7.5 8l3.3-1.7z"/></svg>`,
  average:`<svg ${common}><path d="M5 18V9M10 18V5M15 18v-7M20 18V7"/></svg>`,
  complete:`<svg ${common}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>`,
  alert:`<svg ${common}><path d="M12 4 21 20H3z"/><path d="M12 9v5M12 17h.01"/></svg>`,
  school:`<svg ${common}><path d="M4 20V8l8-4 8 4v12"/><path d="M8 20v-5h3v5M14 11h2M14 15h2M7 11h1"/></svg>`,
  books:`<svg ${common}><path d="M4 5c3-.7 5.5-.1 8 1.7V20c-2.5-1.8-5-2.4-8-1.7z"/><path d="M20 5c-3-.7-5.5-.1-8 1.7V20c2.5-1.8 5-2.4 8-1.7z"/></svg>`,
  link:`<svg ${common}><path d="M9.5 14.5 14.5 9.5"/><path d="M7.3 17.7 5.2 19.8a4 4 0 0 1-5.6-5.6l3.1-3.1a4 4 0 0 1 5.6 0"/><path d="m16.7 6.3 2.1-2.1a4 4 0 0 1 5.6 5.6l-3.1 3.1a4 4 0 0 1-5.6 0"/></svg>`,
  refresh:`<svg ${common}><path d="M20 11a8 8 0 0 0-14.8-4L3 10"/><path d="M3 5v5h5"/><path d="M4 13a8 8 0 0 0 14.8 4L21 14"/><path d="M21 19v-5h-5"/></svg>`,
  language:`<svg ${common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
  shield:`<svg ${common}><path d="M12 3 19 6v5c0 4.8-2.7 8-7 10-4.3-2-7-5.2-7-10V6z"/><path d="m9.5 12 1.7 1.7 3.6-4"/></svg>`,
  chat:`<svg ${common}><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>`,
  install:`<svg ${common}><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/></svg>`,
  logout:`<svg ${common}><path d="M10 4H5v16h5"/><path d="M13 8l4 4-4 4"/><path d="M17 12H8"/></svg>`,
  share:`<svg ${common}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4"/></svg>`,
  settings:`<svg ${common}><circle cx="12" cy="12" r="3"/><path d="M19.2 13.5a7.8 7.8 0 0 0 0-3l2-1.2-2-3.4-2.3.7a7.8 7.8 0 0 0-2.6-1.5L13.8 2H10l-.5 3.1a7.8 7.8 0 0 0-2.6 1.5l-2.3-.7-2 3.4 2 1.2a7.8 7.8 0 0 0 0 3l-2 1.2 2 3.4 2.3-.7a7.8 7.8 0 0 0 2.6 1.5l.5 3.1h3.8l.5-3.1a7.8 7.8 0 0 0 2.6-1.5l2.3.7 2-3.4z"/></svg>`,
  trash:`<svg ${common}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>`
 };return icons[name]||''
}

function openProfessorAccountSettings(){
 const email=String(professorUser?.email||'').trim(),name=profName(professorUser?.name||'');
 const m=modal(tr('إعدادات الحساب','Paramètres du compte'),`<div class="prof-account-settings">
  <div class="prof-account-summary"><span>${professorMoreIcon('account')}</span><div><b>${esc(name||tr('الأستاذ','Professeur'))}</b><small dir="ltr">${esc(email||'—')}</small></div></div>
  <div class="prof-link-explain"><b>${tr('تغيير كلمة المرور','Changer le mot de passe')}</b><p>${tr('أدخل كلمة المرور الحالية ثم كلمة مرور جديدة لا تقل عن 8 أحرف.','Saisissez le mot de passe actuel puis un nouveau mot de passe d’au moins 8 caractères.')}</p></div>
  <label>${tr('كلمة المرور الحالية','Mot de passe actuel')}<input id="profCurrentPassword" type="password" autocomplete="current-password"></label>
  <label>${tr('كلمة المرور الجديدة','Nouveau mot de passe')}<input id="profNewPassword" type="password" autocomplete="new-password" minlength="8"></label>
  <label>${tr('تأكيد كلمة المرور الجديدة','Confirmer le nouveau mot de passe')}<input id="profConfirmPassword" type="password" autocomplete="new-password" minlength="8"></label>
  <button class="primary" id="profSavePassword">${tr('حفظ كلمة المرور','Enregistrer le mot de passe')}</button><p class="professor-msg"></p>
 </div>`);
 q('#profSavePassword',m.wrap).onclick=async()=>{
  const currentPassword=q('#profCurrentPassword',m.wrap).value,password=q('#profNewPassword',m.wrap).value,confirmPassword=q('#profConfirmPassword',m.wrap).value,msg=q('.professor-msg',m.wrap),btn=q('#profSavePassword',m.wrap);
  if(password.length<8){msg.textContent=tr('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.','Le nouveau mot de passe doit contenir au moins 8 caractères.');return}
  if(password!==confirmPassword){msg.textContent=tr('تأكيد كلمة المرور غير مطابق.','La confirmation du mot de passe ne correspond pas.');return}
  btn.disabled=true;try{const r=await api('/api/account/password',{method:'POST',body:JSON.stringify({currentPassword,password})});if(r?.user)professorUser=r.user;m.close();toast(tr('تم تغيير كلمة المرور','Mot de passe modifié'))}catch(e){msg.textContent=e.code==='bad_password'?tr('كلمة المرور الحالية غير صحيحة.','Mot de passe actuel incorrect.'):tr('تعذر تغيير كلمة المرور.','Impossible de modifier le mot de passe.')}finally{btn.disabled=false}
 }
}

function openProfessorPrivacy(){
 const m=modal(tr('سياسة البرنامج','Politique de l’application'),`<div class="prof-info-sheet prof-policy-sheet">
  <span class="prof-info-icon privacy">${professorMoreIcon('shield')}</span>
  <h3>${tr('سياسة برنامج نتائجي','Politique de Nataiji')}</h3>
  <p><b>${tr('استخدام البرنامج:','Utilisation :')}</b> ${tr('نتائجي مخصص لإدارة الأقسام والتلاميذ والدرجات والتقارير المدرسية وفق صلاحيات الحساب.','Nataiji est destiné à la gestion des classes, élèves, notes et rapports scolaires selon les autorisations du compte.')}</p>
  <p><b>${tr('البيانات:','Données :')}</b> ${tr('تُستخدم بيانات الحساب والمؤسسة والأقسام والتلاميذ والدرجات لتشغيل وظائف التطبيق وحفظها ومزامنتها مع الحسابات المصرح لها فقط.','Les données du compte, de l’établissement, des classes, des élèves et des notes servent au fonctionnement, à la sauvegarde et à la synchronisation avec les comptes autorisés.')}</p>
  <p><b>${tr('المسؤولية:','Responsabilité :')}</b> ${tr('على المستخدم التأكد من صحة البيانات المدخلة والمحافظة على سرية كلمة المرور وعدم مشاركة صلاحياته مع غير المخولين.','L’utilisateur doit vérifier l’exactitude des données saisies, protéger son mot de passe et ne pas partager ses accès avec des personnes non autorisées.')}</p>
  <p><b>${tr('الحذف:','Suppression :')}</b> ${tr('يمكن حذف الحساب وبياناته من خيار حذف الحساب. الحذف النهائي لا يمكن التراجع عنه.','Le compte et ses données peuvent être supprimés depuis l’option correspondante. La suppression définitive est irréversible.')}</p>
  <button class="primary professor-x-inline">${tr('حسنًا','Fermer')}</button>
 </div>`);q('.professor-x-inline',m.wrap).onclick=m.close
}

function openProfessorSupport(){
 const wa='22234280062',email='bahmedou596@gmail.com',msg=encodeURIComponent('السلام عليكم، لدي ملاحظة أو أحتاج مساعدة في تطبيق نتائجي.');
 const m=modal(tr('الدعم والملاحظات','Support et commentaires'),`<div class="prof-support-sheet">
  <span class="prof-info-icon support">${professorMoreIcon('chat')}</span>
  <h3>${tr('الدعم والملاحظات','Support et commentaires')}</h3>
  <p>${tr('لأي مشكلة أو اقتراح أو ملاحظة، تواصل مباشرة مع إدارة تطبيق نتائجي.','Pour tout problème, suggestion ou commentaire, contactez directement l’administration de Nataiji.')}</p>
  <div class="prof-support-contact"><b>WhatsApp</b><span dir="ltr">+222 34 28 00 62</span></div>
  <a class="prof-support-link whatsapp" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${msg}">${tr('مراسلة الإدارة عبر WhatsApp','Contacter l’administration sur WhatsApp')}</a>
  <div class="prof-support-contact"><b>Email</b><span dir="ltr">${email}</span></div>
  <a class="prof-support-link email" href="mailto:${email}?subject=${encodeURIComponent('ملاحظة حول تطبيق نتائجي')}">${tr('إرسال بريد إلى الإدارة','Envoyer un e-mail à l’administration')}</a>
 </div>`);
 return m
}

async function openProfessorInstall(){
 if(!professorIsWebsite())return;
 if(professorInstallPrompt){
  try{professorInstallPrompt.prompt();const choice=await professorInstallPrompt.userChoice;if(choice?.outcome==='accepted')professorInstallPrompt=null;return}catch{}
 }
 const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/i.test(ua);
 const m=modal(tr('تحميل التطبيق','Installer l’application'),`<div class="prof-info-sheet">
  <span class="prof-info-icon install">${professorMoreIcon('install')}</span>
  <h3>${tr('تحميل تطبيق نتائجي','Installer Nataiji')}</h3>
  <p>${ios?tr('في Safari اضغط زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».','Dans Safari, touchez Partager puis « Sur l’écran d’accueil ».'):tr('إذا ظهر خيار «تثبيت التطبيق» في المتصفح استخدمه، أو اختر «إضافة إلى الشاشة الرئيسية».','Utilisez « Installer l’application » si votre navigateur le propose, sinon choisissez « Ajouter à l’écran d’accueil ».')}</p>
  <button class="primary professor-x-inline">${tr('فهمت','Compris')}</button>
 </div>`);q('.professor-x-inline',m.wrap).onclick=m.close
}

function professorShareUrl(){
 try{return new URL('/',window.location.href).href}catch{return window.location.href}
}
async function shareNataiji(){
 const url=professorShareUrl(),title='Nataiji | نتائجي',shareText=tr('جرّب تطبيق نتائجي لإدارة الأقسام والتلاميذ والدرجات والتقارير بسهولة.','Découvrez Nataiji pour gérer facilement les classes, les élèves, les notes et les rapports.');
 try{
  if(typeof navigator.share==='function'){
   await navigator.share({title,text:shareText,url});
   return
  }
 }catch(e){if(e?.name==='AbortError')return}
 try{
  if(navigator.clipboard?.writeText){
   await navigator.clipboard.writeText(shareText+'\n'+url);
   toast(tr('تم نسخ رابط نتائجي للمشاركة','Le lien Nataiji a été copié'));
   return
  }
 }catch{}
 const wa='https://wa.me/?text='+encodeURIComponent(shareText+'\n'+url);
 const m=modal(tr('مشاركة نتائجي','Partager Nataiji'),`<div class="prof-share-sheet">
  <span class="prof-info-icon share">${professorMoreIcon('share')}</span>
  <h3>${tr('شارك نتائجي','Partager Nataiji')}</h3>
  <p>${tr('أرسل رابط نتائجي إلى زملائك أو انسخه لمشاركته في أي تطبيق.','Envoyez le lien Nataiji à vos collègues ou copiez-le pour le partager dans toute application.')}</p>
  <label>${tr('رابط نتائجي','Lien Nataiji')}<input id="profShareUrl" readonly dir="ltr" value="${esc(url)}"></label>
  <div class="prof-share-actions"><a class="prof-support-link whatsapp" target="_blank" rel="noopener" href="${wa}">${tr('مشاركة عبر WhatsApp','Partager via WhatsApp')}</a><button class="primary" id="profCopyShareUrl">${tr('نسخ الرابط','Copier le lien')}</button></div>
  <p class="professor-msg"></p>
 </div>`);
 q('#profCopyShareUrl',m.wrap).onclick=async()=>{
  const input=q('#profShareUrl',m.wrap),msg=q('.professor-msg',m.wrap);
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
   else{input.focus();input.select();document.execCommand('copy')}
   msg.textContent=tr('تم نسخ الرابط','Lien copié')
  }catch{input.focus();input.select();msg.textContent=tr('حدد الرابط وانسخه يدويًا','Sélectionnez le lien et copiez-le manuellement')}
 }
}

function openProfessorDeleteAccount(){
 const m=modal(tr('حذف الحساب','Supprimer le compte'),`<div class="prof-delete-sheet">
  <span class="prof-info-icon delete">${professorMoreIcon('trash')}</span>
  <h3>${tr('حذف الحساب نهائيًا','Supprimer définitivement le compte')}</h3>
  <p>${tr('سيتم حذف الحساب وبيانات الأستاذ المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.','Le compte et les données professeur qui lui sont associées seront supprimés. Cette action est irréversible.')}</p>
  <label>${tr('كلمة المرور','Mot de passe')}<input id="profDeletePassword" type="password" autocomplete="current-password"></label>
  <label>${tr('اكتب «حذف» للتأكيد','Saisissez « DELETE » pour confirmer')}<input id="profDeleteConfirm" autocomplete="off" placeholder="${fr()?'DELETE':'حذف'}"></label>
  <button class="prof-delete-confirm" id="profDeleteAccountNow">${tr('حذف الحساب نهائيًا','Supprimer définitivement')}</button><p class="professor-msg"></p>
 </div>`);
 q('#profDeleteAccountNow',m.wrap).onclick=async()=>{
  const password=q('#profDeletePassword',m.wrap).value,confirm=q('#profDeleteConfirm',m.wrap).value.trim(),msg=q('.professor-msg',m.wrap),btn=q('#profDeleteAccountNow',m.wrap);
  if(!password||!confirm){msg.textContent=tr('أدخل كلمة المرور وكلمة التأكيد.','Saisissez le mot de passe et la confirmation.');return}
  btn.disabled=true;try{await api('/api/account',{method:'DELETE',body:JSON.stringify({password,confirm})});location.reload()}catch(e){msg.textContent=e.code==='bad_password'?tr('كلمة المرور غير صحيحة.','Mot de passe incorrect.'):tr('تعذر حذف الحساب. تحقق من كلمة التأكيد ثم أعد المحاولة.','Impossible de supprimer le compte. Vérifiez la confirmation puis réessayez.')}finally{btn.disabled=false}
 }
}

function renderMore(){
 currentView='more';const el=root();
 const row=(id,icon,title,subtitle,tone='')=>`<button type="button" id="${id}" class="prof-more-list-row ${tone}"><span class="prof-more-row-icon">${professorMoreIcon(icon)}</span><span class="prof-more-row-copy"><b>${title}</b><small>${subtitle}</small></span><span class="prof-more-chevron">‹</span></button>`;
 el.innerHTML=`<div class="professor-shell prof-more-reference">${topbar('','')}
  <section class="prof-more-reference-hero"><div><small>${tr('المزيد','Plus')}</small><h1>${tr('الإعدادات والأدوات','Paramètres et outils')}</h1><p>${tr('جميع الخيارات المهمة لحسابك في مكان واحد.','Toutes les options importantes de votre compte au même endroit.')}</p></div><span class="prof-more-hero-icon">${professorMoreIcon('settings')}</span></section>
  <section class="prof-more-list">
   ${row('profMoreAccount','account',tr('إعدادات الحساب','Paramètres du compte'),tr('الملف الشخصي، كلمة المرور وتفضيلات الحساب','Profil, mot de passe et préférences du compte'))}
   ${row('profMoreSettings','school',tr('إعدادات المؤسسة','Paramètres de l’établissement'),tr('معلومات المؤسسة والجهات الرسمية','Informations de l’établissement et autorités officielles'))}
   ${row('profMoreSubjects','books',tr('إدارة المواد والأقسام','Gestion des matières et classes'),tr('إضافة وإدارة المواد والأقسام','Ajouter et gérer les matières et les classes'))}
   ${row('profMoreJoin','link',tr('الانضمام برمز القسم','Rejoindre avec un code de classe'),tr('ربط أستاذ آخر بنفس القسم','Relier un autre professeur à la même classe'))}
   ${row('profMoreRefresh','refresh',tr('تحديث البيانات','Actualiser les données'),tr('تحميل أحدث نسخة محفوظة من الخادم','Charger la dernière version enregistrée sur le serveur'))}
   ${row('profMoreLang','language',tr('اللغة','Langue'),fr()?'العربية / Français':'العربية / Français')}
   ${row('profMoreShare','share',tr('مشاركة نتائجي','Partager Nataiji'),tr('شارك التطبيق مع زملائك عبر الهاتف أو الرابط','Partagez l’application avec vos collègues ou par lien'),'share')}
   ${row('profMorePrivacy','shield',tr('سياسة البرنامج','Politique de l’application'),tr('شروط الاستخدام وحماية البيانات','Conditions d’utilisation et protection des données'))}
   ${row('profMoreSupport','chat',tr('الدعم والملاحظات','Support et commentaires'),tr('تواصل مع إدارة نتائجي عبر WhatsApp أو البريد','Contactez Nataiji par WhatsApp ou e-mail'))}
   ${professorIsWebsite()?row('profMoreInstall','install',tr('تحميل التطبيق','Installer l’application'),tr('تحميل نتائجي أو إضافته إلى الشاشة الرئيسية','Installer Nataiji ou l’ajouter à l’écran d’accueil')):''}
   ${row('profMoreLogout','logout',tr('تسجيل الخروج','Déconnexion'),tr('إنهاء الجلسة الحالية','Fermer la session actuelle'),'logout')}
   ${row('profMoreDelete','trash',tr('حذف الحساب','Supprimer le compte'),tr('حذف حسابك وجميع بياناته نهائيًا','Supprimer définitivement votre compte et ses données'),'danger')}
  </section>
  ${nav('more')}
 </div>`;
 bindTop(el);bindNav(el);
 q('#profMoreAccount',el).onclick=openProfessorAccountSettings;
 q('#profMoreSettings',el).onclick=openSettings;
 q('#profMoreSubjects',el).onclick=()=>{currentView='grades';renderGrades()};
 q('#profMoreJoin',el).onclick=openJoinClass;
 q('#profMoreRefresh',el).onclick=async()=>{const b=q('#profMoreRefresh',el);b.disabled=true;try{await flushGradeAutosave();await refreshProfile();toast(tr('تم التحديث','Actualisé'));renderMore()}finally{b.disabled=false}};
 q('#profMoreLang',el).onclick=async()=>{await flushGradeAutosave();toggleLanguage()};
 q('#profMoreShare',el).onclick=shareNataiji;
 q('#profMorePrivacy',el).onclick=openProfessorPrivacy;
 q('#profMoreSupport',el).onclick=openProfessorSupport;
 q('#profMoreInstall',el)?.addEventListener('click',openProfessorInstall);
 q('#profMoreLogout',el).onclick=async()=>{await flushGradeAutosave();logout()};
 q('#profMoreDelete',el).onclick=openProfessorDeleteAccount
}

function openSettings(){
 const generatedSchoolFr=profile.schoolNameFr||profSchoolFrAuto(profile.schoolName);
 const m=modal(tr('إعدادات الأستاذ','Paramètres du professeur'),`<div class="prof-link-explain"><b>${tr('بيانات الكشوف الرسمية','Informations des relevés officiels')}</b><p>${tr('ستظهر هذه البيانات في كشف التلميذ ولائحة القسم. اسم المؤسسة بالفرنسية يُنشأ تلقائيًا: إعدادية = Collège، ثانوية = Lycée، مدرسة = École.','Ces informations apparaîtront sur les bulletins et listes. Le nom français est généré automatiquement : إعدادية = Collège, ثانوية = Lycée, مدرسة = École.')}</p></div><label>${tr('اسم المؤسسة','Établissement')}<input id="pv2School" value="${esc(profile.schoolName)}" maxlength="160"></label><label>${tr('اسم المؤسسة بالفرنسية','Établissement en français')}<input id="pv2SchoolFr" value="${esc(generatedSchoolFr)}" maxlength="160"><small>${tr('يُحدّث تلقائيًا ما لم تعدّله يدويًا.','Mis à jour automatiquement sauf modification manuelle.')}</small></label><label>${tr('الإدارة الجهوية للتربية','Direction régionale de l’Éducation')}<input id="pv2Region" value="${esc(profile.region)}" maxlength="160"></label><label>${tr('الإدارة الجهوية بالفرنسية (اختياري — تُولد تلقائيًا إذا تُركت فارغة)','Direction régionale en français (facultatif — générée automatiquement si vide)')}<input id="pv2RegionFr" value="${esc(profile.regionFr)}" maxlength="160"></label><label>${tr('المفتشية','Inspection')}<input id="pv2Inspection" value="${esc(profile.inspection)}" maxlength="160"></label><label>${tr('المفتشية بالفرنسية (اختياري — تُولد تلقائيًا إذا تُركت فارغة)','Inspection en français (facultatif — générée automatiquement si vide)')}<input id="pv2InspectionFr" value="${esc(profile.inspectionFr)}" maxlength="160"></label><label>${tr('الرقم المدرسي للمؤسسة (اختياري)','N° scolaire de l’établissement (facultatif)')}<input id="pv2SchoolNns" value="${esc(profile.schoolNns)}" maxlength="80" dir="ltr"></label><label>${tr('السنة الدراسية','Année scolaire')}<input id="pv2Year" value="${esc(profile.year)}" maxlength="40" dir="ltr" placeholder="2026-2027"></label><button class="primary" id="pv2SaveSettings">${tr('حفظ','Enregistrer')}</button><p class="professor-msg"></p>`);
 const schoolAr=q('#pv2School',m.wrap),schoolFr=q('#pv2SchoolFr',m.wrap);
 let schoolFrManual=!!String(profile.schoolNameFr||'').trim();
 schoolAr.addEventListener('input',()=>{if(!schoolFrManual)schoolFr.value=profSchoolFrAuto(schoolAr.value)});
 schoolFr.addEventListener('input',()=>{schoolFrManual=schoolFr.value.trim()!==''});
 q('#pv2SaveSettings',m.wrap).onclick=async()=>{
  const b=q('#pv2SaveSettings',m.wrap),msg=q('.professor-msg',m.wrap);b.disabled=true;
  profile.schoolName=schoolAr.value.trim();profile.schoolNameFr=schoolFr.value.trim()||profSchoolFrAuto(profile.schoolName);
  profile.region=q('#pv2Region',m.wrap).value.trim();profile.regionFr=q('#pv2RegionFr',m.wrap).value.trim();
  profile.inspection=q('#pv2Inspection',m.wrap).value.trim();profile.inspectionFr=q('#pv2InspectionFr',m.wrap).value.trim();
  profile.schoolNns=q('#pv2SchoolNns',m.wrap).value.trim();profile.year=q('#pv2Year',m.wrap).value.trim();
  try{await saveProfile(tr('تم حفظ الإعدادات','Paramètres enregistrés'));m.close();renderCurrent()}catch{msg.textContent=tr('تعذر الحفظ','Enregistrement impossible')}finally{b.disabled=false}
 }
}
function openAssignment(preselectClass=''){
 if(typeof preselectClass!=='string')preselectClass='';const returnView=currentView,levels=academicCatalog.levels||[];
 const opts=displayClasses().map(c=>`<option value="${esc(c.id)}" ${preselectClass===c.id?'selected':''}>${esc(classDisplayName(c))}${linkFor(c.id)?' 🔗':''}</option>`).join('');
 const levelOpts=levels.map(l=>`<option value="${esc(l.code)}">${esc(l.code)} — ${esc(fr()?l.fr:l.ar)}</option>`).join('');
 const m=modal(preselectClass?tr('إضافة مادة إلى القسم','Ajouter une matière à la classe'):tr('إضافة مادة أو قسم','Ajouter une matière ou une classe'),`
 <div class="prof-link-explain"><b>${tr('المستوى والشعبة والمادة والمعامل','Niveau, filière, matière et coefficient')}</b><p>${tr('1AS–3AS تستخدم المواد والمعاملات الرسمية الجديدة للإعدادية. في 5AS و6AS و7AS اختر الشعبة الرسمية A أو C أو D أو O، ثم تظهر موادها ومعاملاتها تلقائيًا.','Les niveaux 1AS–3AS utilisent la grille officielle actuelle du collège. En 5AS, 6AS et 7AS, choisissez la section officielle A, C, D ou O ; ses matières et coefficients s’affichent automatiquement.')}</p></div>
 <label>${tr('القسم','Classe')}<select id="pv2Class"><option value="">${tr('إنشاء قسم جديد','Créer une nouvelle classe')}</option>${opts}</select></label>
 <label id="pv2NewClassLabel">${tr('اسم القسم','Nom de la classe')}<input id="pv2NewClass" maxlength="100" placeholder="${tr('مثال: 5AS-C-A','Ex. 5AS-C-A')}"></label>
 <label id="pv2LevelLabel">${tr('المستوى','Niveau')}<select id="pv2Level"><option value="">${tr('اختر المستوى','Choisir le niveau')}</option>${levelOpts}</select><small>${tr('المستويات المتاحة للأساتذة: 1AS، 2AS، 3AS، 5AS، 6AS، 7AS.','Niveaux disponibles : 1AS, 2AS, 3AS, 5AS, 6AS et 7AS.')}</small></label>
 <label id="pv2BranchLabel" style="display:none">${tr('الشعبة','Filière')}<select id="pv2Branch"></select><small id="pv2BranchHint"></small></label>
 <label>${tr('المادة','Matière')}<select id="pv2Subject"><option value="">${tr('اختر المادة','Choisir la matière')}</option></select></label>
 <label id="pv2CustomSubjectLabel" style="display:none">${tr('مادة أخرى','Autre matière')}<input id="pv2CustomSubject" maxlength="100"></label>
 <label>${tr('المعامل','Coefficient')}<input id="pv2Coefficient" type="number" inputmode="decimal" min="0.25" max="20" step="0.25" value="1"><small id="pv2CoefficientHint"></small></label>
 <button class="primary" id="pv2SaveAssignment">${tr('إضافة المادة','Ajouter la matière')}</button><p class="professor-msg"></p>`);
 const sel=q('#pv2Class',m.wrap),newLabel=q('#pv2NewClassLabel',m.wrap),levelSel=q('#pv2Level',m.wrap),levelLabel=q('#pv2LevelLabel',m.wrap),branchLabel=q('#pv2BranchLabel',m.wrap),branchSel=q('#pv2Branch',m.wrap),branchHint=q('#pv2BranchHint',m.wrap),subjectSel=q('#pv2Subject',m.wrap),customLabel=q('#pv2CustomSubjectLabel',m.wrap),customInput=q('#pv2CustomSubject',m.wrap),coef=q('#pv2Coefficient',m.wrap),coefHint=q('#pv2CoefficientHint',m.wrap);
 if(preselectClass)sel.value=preselectClass;
 const currentBranch=()=>{const cls=sel.value?classById(sel.value):null;return normalizedBranchCode(cls?.branchCode||branchSel.value||'')};
 const syncCoefficient=()=>{
  customLabel.style.display=subjectSel.value==='__other__'?'grid':'none';
  const cls=sel.value?classById(sel.value):null,levelCode=cls?.levelCode||inferredLevelCode(cls?.name)||levelSel.value,branchCode=currentBranch(),spec=catalogSubject(levelCode,subjectSel.value,branchCode);
  if(spec?.official){coef.value=spec.coefficient;coef.readOnly=true;coefHint.textContent=tr('معامل الشعبة الرسمي يُطبق تلقائيًا.','Coefficient officiel de la filière appliqué automatiquement.')}
  else{coef.readOnly=false;if(!Number(coef.value)||Number(coef.value)<=0)coef.value='1';coefHint.textContent=subjectSel.value?tr('المعامل اليدوي متاح فقط للمادة الأخرى التي تضيفها خارج القائمة.','Le coefficient manuel est réservé à une matière ajoutée hors de la liste.') : ''}
 };
 const syncSubjects=()=>{
  const cls=sel.value?classById(sel.value):null,knownLevel=cls?.levelCode||inferredLevelCode(cls?.name),levelCode=knownLevel||levelSel.value,level=catalogLevel(levelCode);
  newLabel.style.display=sel.value?'none':'grid';levelLabel.style.display='grid';levelSel.disabled=!!knownLevel;if(knownLevel)levelSel.value=knownLevel;
  const branches=Array.isArray(level?.branches)?level.branches:[],previousBranch=currentBranch();
  branchLabel.style.display=branches.length?'grid':'none';
  if(branches.length){
   branchSel.innerHTML=branches.map(b=>`<option value="${esc(b.code)}">${esc(b.code)} — ${esc(fr()?b.fr:b.ar)}</option>`).join('');
   const desired=normalizedBranchCode(cls?.branchCode||previousBranch||branches[0]?.code||'');
   if([...branchSel.options].some(o=>o.value===desired))branchSel.value=desired;
   branchSel.disabled=!!cls?.branchCode;
   const selected=branches.find(b=>b.code===branchSel.value);branchHint.textContent=selected?.expectedCoefficientTotal?tr('مجموع معاملات الشعبة: ','Total des coefficients : ')+selected.expectedCoefficientTotal:''
  }else{branchSel.innerHTML='';branchSel.disabled=false;branchHint.textContent=''}
  const branchCode=branches.length?branchSel.value:'',subjects=catalogSubjects(levelCode,branchCode),previous=subjectSel.value;
  subjectSel.innerHTML=`<option value="">${tr('اختر المادة','Choisir la matière')}</option>`+subjects.map(s=>`<option value="${esc(s.key)}">${esc(fr()?s.fr:s.ar)}${s.official?' · ×'+s.coefficient:''}</option>`).join('')+`<option value="__other__">${tr('مادة أخرى…','Autre matière…')}</option>`;
  if([...subjectSel.options].some(o=>o.value===previous))subjectSel.value=previous;
  syncCoefficient()
 };
 sel.onchange=()=>{const cls=sel.value?classById(sel.value):null;if(!cls)levelSel.disabled=false;syncSubjects()};
 levelSel.onchange=syncSubjects;branchSel.onchange=syncSubjects;subjectSel.onchange=syncCoefficient;syncSubjects();
 q('#pv2SaveAssignment',m.wrap).onclick=async()=>{
  const msg=q('.professor-msg',m.wrap),className=q('#pv2NewClass',m.wrap).value.trim(),existing=sel.value?classById(sel.value):null,levelCode=existing?.levelCode||inferredLevelCode(existing?.name)||levelSel.value,level=catalogLevel(levelCode),branches=Array.isArray(level?.branches)?level.branches:[],branchCode=normalizedBranchCode(existing?.branchCode||branchSel.value||''),spec=catalogSubject(levelCode,subjectSel.value,branchCode),custom=customInput.value.trim(),subjectKey=spec?.key||'',subject=spec?.ar||(subjectSel.value==='__other__'?custom:''),official=spec?.official?Number(spec.coefficient):null,coefficient=official??Number(coef.value);
  if(!levelCode||!level){msg.textContent=tr('اختر المستوى أولًا','Choisissez d’abord le niveau');return}
  if(branches.length&&!branchCode){msg.textContent=tr('اختر الشعبة أولًا','Choisissez d’abord la filière');return}
  if(!subject){msg.textContent=tr('اختر المادة أو اكتب مادة أخرى','Choisissez une matière ou saisissez une autre matière');return}
  if(!existing&&!className){msg.textContent=tr('اكتب اسم القسم','Saisissez le nom de la classe');return}
  if(!Number.isFinite(coefficient)||coefficient<=0||coefficient>20){msg.textContent=tr('أدخل معاملًا صحيحًا أكبر من 0','Saisissez un coefficient valide supérieur à 0');return}
  const snapshot=structuredClone(profile);
  let cls=existing,classId=existing?.id||'';
  if(!cls){
   const same=profile.classes.find(x=>x.name.trim().toLowerCase()===className.toLowerCase());
   if(same){cls=same;classId=same.id}else{classId=uid();cls={id:classId,name:className,levelCode,branchCode,students:[],sharedClassId:''};profile.classes.push(cls)}
  }
  cls.levelCode=levelCode;if(branches.length)cls.branchCode=branchCode;else cls.branchCode='';
  if(profile.assignments.some(a=>a.classId===classId&&((subjectKey&&a.subjectKey===subjectKey)||(!subjectKey&&a.subject.trim().toLowerCase()===subject.toLowerCase())))){msg.textContent=tr('هذه المادة موجودة في هذا القسم بالفعل','Cette matière existe déjà pour cette classe');return}
  profile.assignments.push({id:uid(),subject,classId,subjectKey,coefficient:Math.round(coefficient*100)/100,coefficientSource:official!=null?'official':'manual'});
  try{await saveProfile(tr('تمت إضافة المادة للقسم','Matière ajoutée à la classe'));m.close();if(preselectClass)return openClass(classId);if(returnView==='grades')return renderGrades();if(returnView==='students'||returnView==='classes')return renderClasses();if(returnView==='more')return renderMore();renderHome()}catch(e){profile=normalize(snapshot);msg.textContent=e.code==='shared_subject_taken'?tr('هذه المادة مسجلة بالفعل عند أستاذ آخر داخل نفس القسم الجماعي. لا يمكن تكرار مالك المادة.','Cette matière appartient déjà à un autre professeur dans la même classe collective. Un seul propriétaire est autorisé.'):tr('تعذر الحفظ','Enregistrement impossible')}
 }
}
function openJoinClass(){
 const opts=profile.classes.filter(c=>!linkFor(c.id)).map(c=>`<option value="${esc(c.id)}">${esc(profClass(c.name))}</option>`).join('');
 const m=modal(tr('الانضمام إلى قسم جماعي','Rejoindre une classe collective'),`<div class="prof-link-explain"><b>🔗 ${tr('ما الذي تتم مشاركته؟','Qu’est-ce qui est partagé ?')}</b><p>${tr('الرمز يوحّد القسم وقائمة التلاميذ والنتائج النهائية. تبقى موادك ودرجاتك خاصة بحسابك ولا يستطيع أستاذ آخر تعديلها.','Le code unifie la classe, la liste des élèves et les résultats finaux. Vos matières et vos notes restent propres à votre compte et aucun autre professeur ne peut les modifier.')}</p></div><label>${tr('رمز القسم','Code de classe')}<input id="pv2JoinCode" dir="ltr" maxlength="11" placeholder="CL-XXXXXXXX"></label><label>${tr('اربطه بقسم موجود عندي (اختياري)','Le relier à une classe existante (facultatif)')}<select id="pv2JoinLocal"><option value="">${tr('إنشاء القسم تلقائيًا','Créer la classe automatiquement')}</option>${opts}</select></label><button class="primary" id="pv2JoinNow">${tr('الانضمام إلى القسم','Rejoindre la classe')}</button><p class="professor-msg"></p>`);
 q('#pv2JoinNow',m.wrap).onclick=async()=>{const b=q('#pv2JoinNow',m.wrap),msg=q('.professor-msg',m.wrap),code=q('#pv2JoinCode',m.wrap).value.trim().toUpperCase();if(!/^CL-[A-F0-9]{8}$/.test(code)){msg.textContent=tr('اكتب رمزًا صحيحًا مثل CL-XXXXXXXX','Saisissez un code valide de type CL-XXXXXXXX');return}b.disabled=true;try{const r=await api('/api/professor/classes/join',{method:'POST',body:JSON.stringify({code,localClassId:q('#pv2JoinLocal',m.wrap).value})});profile=normalize(r.profile);links=r.classLinks||{};m.close();toast(tr('تم ربط القسم بنجاح','Classe liée avec succès'));currentView='students';renderClasses()}catch(e){msg.textContent=e.code==='invalid_class_code'?tr('الرمز غير صحيح أو لم يعد صالحًا','Code invalide ou indisponible'):e.code==='professor_class_already_linked'?tr('هذا القسم مرتبط بالفعل بقسم آخر','Cette classe est déjà liée à une autre classe'):tr('تعذر ربط القسم','Impossible de lier la classe')}finally{b.disabled=false}}
}
async function shareClass(localClassId){
 const cls=classById(localClassId);if(!cls)return;const m=modal(tr('مشاركة القسم','Partager la classe'),`<div class="prof-code-loading">${tr('جاري إنشاء/تحميل رمز الربط…','Création/chargement du code…')}</div>`);
 try{const r=await api('/api/professor/classes/'+encodeURIComponent(localClassId)+'/share',{method:'POST',body:'{}'});profile=normalize(r.profile||profile);await refreshProfile();const code=r.code||linkFor(localClassId)?.joinCode||'';q('.professor-modal-body',m.wrap).innerHTML=`<div class="prof-share-success"><span>🔗</span><h3>${esc(profClass(cls.name))}</h3><p>${tr('أرسل هذا الرمز لكل أستاذ يدرّس نفس القسم. سيظهر لهم نفس التلاميذ، وتُجمع نتائج موادهم تلقائيًا في لائحة واحدة، مع بقاء درجات كل أستاذ مستقلة.','Envoyez ce code à chaque professeur de la même classe. Ils verront les mêmes élèves et les résultats de leurs matières seront regroupés automatiquement dans une seule liste, tout en gardant les notes de chacun indépendantes.')}</p><div class="prof-class-code" dir="ltr">${esc(code)}</div><button class="primary" id="pv2CopyCode">${tr('نسخ الرمز','Copier le code')}</button><small>${Number(r.memberCount||1)} ${tr('أستاذ مرتبط حاليًا','professeur(s) lié(s) actuellement')}</small></div>`;q('#pv2CopyCode',m.wrap).onclick=async()=>{try{await navigator.clipboard.writeText(code);toast(tr('تم نسخ الرمز','Code copié'))}catch{toast(code)}};renderCurrent()}catch{q('.professor-modal-body',m.wrap).innerHTML=`<p class="professor-msg">${tr('تعذر إنشاء رمز الربط','Impossible de créer le code')}</p>`}
}
function openClass(id){
 const cls=classById(id);if(!cls)return;currentView='class:'+id;const el=root(),l=linkFor(id),subs=assignmentsForClass(id),canManageRoster=!l||l.role==='owner';
 const studentCards=(cls.students||[]).map((s,i)=>{const names=profStudentNamePair(s),call=Number(s.callNumber)||i+1,gender=s.sex==='female'?tr('أنثى','Fille'):s.sex==='male'?tr('ذكر','Garçon'):tr('غير محدد','Non précisé'),search=[names.ar,names.fr,s.nns,call].join(' ').toLowerCase(),primaryName=fr()?(names.fr||names.ar):(names.ar||names.fr),secondaryName=fr()?(names.ar||names.fr):(names.fr||names.ar),primaryDir=fr()?'ltr':'rtl',secondaryDir=fr()?'rtl':'ltr',nameMode=fr()?'is-fr':'is-ar';return `<article class="prof-student-row prof-student-card" data-prof-student-card data-call="${esc(call)}" data-name="${esc(String(primaryName||'').toLowerCase())}" data-search="${esc(search)}">
  <div class="prof-student-card-main"><span class="prof-student-number">${esc(call)}</span><div class="prof-student-names ${nameMode}"><b dir="${primaryDir}">${esc(primaryName||'—')}</b><small dir="${secondaryDir}">${esc(secondaryName||'—')}</small></div><span class="prof-student-gender">${esc(gender)}</span></div>
  <div class="prof-student-meta"><span><small>NNS / الرقم المدرسي</small><b dir="ltr">${esc(s.nns||'—')}</b></span><span><small>${tr('تاريخ الميلاد','Date de naissance')}</small><b dir="ltr">${esc(s.birthDate||'—')}</b></span></div>
  ${canManageRoster?`<footer class="prof-student-actions"><button type="button" class="prof-student-edit" data-edit-student="${esc(s.id)}"><span>✎</span>${tr('تعديل','Modifier')}</button><button type="button" class="prof-student-delete" data-remove-student="${esc(s.id)}"><span>⌫</span>${tr('حذف','Supprimer')}</button></footer>`:`<div class="prof-student-locked">🔒 ${tr('القائمة يديرها منشئ رمز القسم','Liste gérée par le créateur du code')}</div>`}
 </article>`}).join('');
 const sharedBanner=l?(l.role==='owner'?`<div class="prof-shared-banner"><b>🔗 ${tr('هذا هو القسم الموحد الذي أنشأت رمزه','Classe unifiée dont vous avez créé le code')}</b><span>${l.memberCount} ${tr('أساتذة مرتبطون. أنت تدير قائمة التلاميذ، وكل أستاذ يدير مادته ودرجاته فقط.','professeurs liés. Vous gérez la liste des élèves ; chaque professeur gère uniquement sa matière et ses notes.')}</span></div>`:`<div class="prof-shared-banner"><b>🔗 ${tr('أنت مرتبط بقسم موحد','Vous êtes lié à une classe unifiée')}</b><span>${l.memberCount} ${tr('أساتذة مرتبطون. قائمة التلاميذ يديرها منشئ الرمز؛ أضف مادتك ودرجاتك وستظهر تلقائيًا في النتائج الموحدة.','professeurs liés. La liste des élèves est gérée par le créateur du code ; ajoutez votre matière et vos notes, elles apparaîtront automatiquement dans les résultats unifiés.')}</span></div>`):'';
 el.innerHTML=`<div class="professor-shell">${topbar(profClass(cls.name),tr('إدارة القسم','Gestion de la classe'))}<section class="prof-page-head"><div><button id="pv2BackClasses" class="prof-back-inline">‹ ${tr('الأقسام','Classes')}</button><h1>${esc(profClass(cls.name))}</h1><p>${(cls.students||[]).length} ${tr('تلميذ','élève(s)')} · ${subs.length} ${tr('مواد عندي','matière(s) à moi')}</p></div><div>${l?`<button class="primary" id="pv2ClassResults">▤ ${tr('النتائج الجماعية','Résultats collectifs')}</button>`:''}<button id="pv2AddClassSubject">+ ${tr('مادة','Matière')}</button><button id="pv2ShareClass">🔗 ${l?tr('رمز القسم','Code de classe'):tr('إنشاء رمز القسم','Créer le code')}</button></div></section>${sharedBanner}<div class="prof-v2-layout prof-student-layout"><section class="professor-content prof-student-roster-card">
  <div class="prof-student-roster-head"><div><small>${tr('القسم الحالي','Classe actuelle')}</small><h2>${tr('لائحة التلاميذ','Liste des élèves')}</h2><p>${esc(classDisplayName(cls))}</p></div>${canManageRoster?`<button class="primary prof-add-student" id="pv2AddStudent"><span>♙＋</span>${tr('إضافة تلميذ','Ajouter un élève')}</button>`:''}</div>
  <div class="prof-student-toolbar"><label class="prof-student-search"><span>⌕</span><input id="profStudentSearch" type="search" autocomplete="off" placeholder="${tr('بحث بالاسم أو الرقم المدرسي','Rechercher par nom ou NNS')}"></label><select id="profStudentSort" aria-label="${tr('ترتيب التلاميذ','Trier les élèves')}"><option value="call">${tr('رقم النداء','N° d’appel')}</option><option value="name">${tr('الاسم','Nom')}</option></select><small id="profStudentCount">${(cls.students||[]).length} / ${(cls.students||[]).length} ${tr('تلميذ','élève(s)')}</small></div>
  <div class="prof-student-list">${studentCards||`<div class="professor-empty compact"><p>${canManageRoster?tr('لا يوجد تلاميذ بعد.','Aucun élève pour le moment.'):tr('لا توجد أسماء في القائمة الموحدة بعد. ينتظر هذا القسم أن يضيف منشئ الرمز التلاميذ.','La liste unifiée est encore vide. Le créateur du code doit ajouter les élèves.')}</p></div>`}</div>
 </section><aside class="prof-side-card"><h2>${tr('موادي في هذا القسم','Mes matières dans cette classe')}</h2><div class="prof-subject-chip-list">${subs.map(a=>`<button data-class-grade="${esc(a.id)}"><b>${esc(profSubject(a.subject))} <small>· ${tr('معامل','coef.')} ${coefficientOf(a)}</small></b><span>›</span></button>`).join('')||`<p class="prof-muted">${tr('لم تضف مادة بعد.','Aucune matière ajoutée.')}</p>`}</div></aside></div>${nav('students')}</div>`;
 bindTop(el);bindNav(el);q('#pv2BackClasses',el).onclick=()=>{currentView='students';renderClasses()};q('#pv2ClassResults',el)?.addEventListener('click',()=>renderResults(id,1));if(canManageRoster)q('#pv2AddStudent',el).onclick=()=>addStudent(id,()=>openClass(id));q('#pv2AddClassSubject',el).onclick=()=>openAssignment(id);q('#pv2ShareClass',el).onclick=()=>shareClass(id);qa('[data-class-grade]',el).forEach(b=>b.onclick=()=>openGrades(b.dataset.classGrade));
 const applyRosterView=()=>{const cards=qa('[data-prof-student-card]',el),query=String(q('#profStudentSearch',el)?.value||'').trim().toLowerCase(),mode=q('#profStudentSort',el)?.value||'call',list=q('.prof-student-list',el);cards.sort((a,b)=>mode==='name'?String(a.dataset.name||'').localeCompare(String(b.dataset.name||''),fr()?'fr':'ar',{sensitivity:'base'}):(Number(a.dataset.call)||0)-(Number(b.dataset.call)||0)).forEach(card=>list?.appendChild(card));let shown=0;cards.forEach(card=>{const visible=!query||String(card.dataset.search||'').includes(query);card.hidden=!visible;if(visible)shown++});const count=q('#profStudentCount',el);if(count)count.textContent=`${shown} / ${cards.length} ${tr('تلميذ','élève(s)')}`};
 q('#profStudentSearch',el)?.addEventListener('input',applyRosterView);q('#profStudentSort',el)?.addEventListener('change',applyRosterView);applyRosterView();
 if(canManageRoster){qa('[data-edit-student]',el).forEach(b=>b.onclick=()=>editStudent(id,b.dataset.editStudent,()=>openClass(id)));qa('[data-remove-student]',el).forEach(b=>b.onclick=async()=>{const sid=b.dataset.removeStudent;if(!confirm(tr('حذف هذا التلميذ من القسم الموحد؟ سيختفي من قائمة جميع الأساتذة المرتبطين.','Supprimer cet élève de la classe unifiée ? Il disparaîtra de la liste de tous les professeurs liés.')))return;cls.students=cls.students.filter(s=>s.id!==sid);for(const a of subs)delete profile.marks?.[a.id]?.[sid];await saveProfile(tr('تم تحديث قائمة القسم الموحدة','Liste unifiée mise à jour'));openClass(id)})}
}
function nextProfessorCallNumber(cls){
 const used=new Set((cls?.students||[]).map(s=>Number(s?.callNumber)).filter(n=>Number.isInteger(n)&&n>0));let n=1;while(used.has(n))n++;return n
}
function addStudent(classId,onDone){return studentEditor(classId,'',onDone)}
function editStudent(classId,studentId,onDone){return studentEditor(classId,studentId,onDone)}
function studentEditor(classId,studentId,onDone){
 const cls=classById(classId);if(!cls)return;cls.students=Array.isArray(cls.students)?cls.students:[];const existing=studentId?cls.students.find(s=>String(s.id)===String(studentId)):null;
 const nextCall=existing?.callNumber||nextProfessorCallNumber(cls),names=profStudentNamePair(existing||{}),m=modal(existing?'Modifier l’élève / تعديل التلميذ':'Ajouter un élève / إضافة تلميذ',`<div class="prof-student-form">
  <label class="prof-student-field"><b>الاسم الكامل بالعربية</b><input id="pv2StudentName" maxlength="160" dir="rtl" autocomplete="off" value="${esc(names.ar||'')}"><small id="pv2StudentArHint">يمكنك البدء بالعربية أو الفرنسية؛ سيقترح التطبيق اللغة الأخرى تلقائيًا، ويمكن تعديل الاقتراح يدويًا.</small></label>
  <label class="prof-student-field"><b>Nom complet en français</b><input id="pv2StudentNameFr" maxlength="160" dir="ltr" autocomplete="off" value="${esc(names.fr||'')}"><small id="pv2StudentFrHint" dir="ltr">Commencez en arabe ou en français : l’autre langue est proposée automatiquement et reste modifiable.</small></label>
  <label class="prof-student-field"><b>NNS / الرقم المدرسي</b><span class="prof-field-optional">Facultatif / اختياري — يمكن تركه فارغًا</span><input id="pv2StudentNns" maxlength="80" dir="ltr" autocomplete="off" value="${esc(existing?.nns||'')}"></label>
  <label class="prof-student-field"><b>N° d’appel / رقم النداء</b><input id="pv2StudentCall" type="number" inputmode="numeric" min="1" max="9999" step="1" value="${esc(nextCall)}" dir="ltr"><small>رقم ثابت بعد الحفظ وقابل للتعديل يدويًا / Numéro modifiable manuellement.</small></label>
  <label class="prof-student-field"><b>Sexe / الجنس</b><select id="pv2StudentSex"><option value="male" ${existing?.sex==='male'?'selected':''}>Garçon / ذكر</option><option value="female" ${existing?.sex==='female'?'selected':''}>Fille / أنثى</option></select></label>
  <label class="prof-student-field"><b>Date de naissance / تاريخ الميلاد</b><span class="prof-field-optional">Facultatif / اختياري — يمكن تركه فارغًا</span><input id="pv2StudentBirthDate" type="date" dir="ltr" value="${esc(existing?.birthDate||'')}"></label>
  <div class="prof-student-save-row"><button class="primary" id="pv2StudentSave">${existing?'Enregistrer les modifications / حفظ التعديلات':'Enregistrer / حفظ'}</button></div>
  <p class="professor-msg prof-student-msg"></p>
 </div>`);
 m.wrap.classList.add('prof-student-modal');
 const ar=q('#pv2StudentName',m.wrap),frInput=q('#pv2StudentNameFr',m.wrap),arHint=q('#pv2StudentArHint',m.wrap),frHint=q('#pv2StudentFrHint',m.wrap);let arManual=false,frenchManual=false,syncing=false;
 const fromArabic=()=>{if(frenchManual)return;syncing=true;frInput.value=profNameFr(ar.value);syncing=false};
 const fromFrench=()=>{if(arManual)return;syncing=true;ar.value=profNameAr(frInput.value);syncing=false};
 ar.addEventListener('input',()=>{if(syncing)return;arManual=!!ar.value.trim();fromArabic();arHint.textContent=arManual?'تم اعتماد الاسم العربي يدويًا / Nom arabe saisi manuellement':'يمكنك البدء بالعربية أو الفرنسية؛ سيقترح التطبيق اللغة الأخرى تلقائيًا.';arHint.classList.toggle('locked',arManual)});
 frInput.addEventListener('input',()=>{if(syncing)return;frenchManual=!!frInput.value.trim();fromFrench();frHint.textContent=frenchManual?'Nom français saisi manuellement / تم اعتماد الاسم الفرنسي يدويًا':'Commencez en arabe ou en français : l’autre langue est proposée automatiquement.';frHint.classList.toggle('locked',frenchManual)});
 const resolvedNames=()=>{
  let name=ar.value.trim(),nameFr=frInput.value.trim();
  if(!arManual&&nameFr)name=profNameAr(nameFr);
  if(!frenchManual&&name)nameFr=profNameFr(name);
  if(!name&&nameFr)name=profNameAr(nameFr);
  if(!nameFr&&name)nameFr=profNameFr(name);
  if(name&&ar.value!==name)ar.value=name;if(nameFr&&frInput.value!==nameFr)frInput.value=nameFr;
  return{name,nameFr}
 };
 ar.addEventListener('blur',()=>{if(!frenchManual&&ar.value.trim()){syncing=true;frInput.value=profNameFr(ar.value);syncing=false}});
 frInput.addEventListener('blur',()=>{if(!arManual&&frInput.value.trim()){syncing=true;ar.value=profNameAr(frInput.value);syncing=false}});
 q('#pv2StudentSave',m.wrap).onclick=async()=>{
  let {name,nameFr}=resolvedNames();const nns=q('#pv2StudentNns',m.wrap).value.trim(),callNumber=Number(q('#pv2StudentCall',m.wrap).value),sex=q('#pv2StudentSex',m.wrap).value,birthDate=q('#pv2StudentBirthDate',m.wrap).value.trim(),msg=q('.professor-msg',m.wrap);
  if(!name&&!nameFr){msg.textContent='اكتب الاسم الكامل بالعربية أو الفرنسية / Saisissez le nom complet en arabe ou en français';return}
  if(nns&&cls.students.some(s=>String(s.id)!==String(existing?.id||'')&&String(s.nns||'')===nns)){msg.textContent='هذا NNS موجود في القسم / Ce NNS existe déjà dans la classe';return}
  if(!Number.isInteger(callNumber)||callNumber<1||callNumber>9999){msg.textContent='رقم النداء غير صحيح / Numéro d’appel invalide';return}
  if(cls.students.some(s=>String(s.id)!==String(existing?.id||'')&&Number(s.callNumber)===callNumber)){msg.textContent='رقم النداء مستخدم بالفعل / Ce numéro d’appel est déjà utilisé';return}
  const snapshot=structuredClone(profile),payload={id:existing?.id||uid(),name:name||profNameAr(nameFr),nameFr:nameFr||profNameFr(name),nns,callNumber,sex:['male','female'].includes(sex)?sex:'',birthDate};
  if(existing)Object.assign(existing,payload);else cls.students.push(payload);
  try{await saveProfile(existing?tr('تم تعديل التلميذ','Élève modifié'):tr('تمت إضافة التلميذ','Élève ajouté'));m.close();onDone?.()}
  catch{profile=normalize(snapshot);msg.textContent=existing?'تعذر حفظ التعديلات على الخادم / Impossible d’enregistrer les modifications':'تعذر تثبيت الطالب على الخادم — لم يتم الحفظ / Impossible d’enregistrer l’élève sur le serveur'}
 }
}

function cleanGrade(v){const s=String(v??'').replace(',','.').trim();if(s==='')return'';if(professorIsAbsent(s))return'ABSENT';const n=Number(s);if(!Number.isFinite(n))return'';return String(Math.max(0,Math.min(20,n)))}
function editCoefficient(id){
 const a=profile.assignments.find(x=>x.id===id);if(!a)return;const cls=classById(a.classId),levelCode=cls?.levelCode||inferredLevelCode(cls?.name),spec=catalogSubject(levelCode,a.subjectKey||a.subject,cls?.branchCode),official=spec?.official?Number(spec.coefficient):null;
 if(official!=null){const m=modal(tr('معامل المادة','Coefficient de la matière'),`<div class="prof-link-explain"><b>${esc(profSubject(a.subject))} · ${esc(levelCode)}</b><p>${tr('المعامل الرسمي لهذه المادة يُطبق تلقائيًا في الدرجات والكشف والترتيب ولا يحتاج إلى تعديل يدوي.','Le coefficient officiel de cette matière est appliqué automatiquement aux notes, bulletins et classement.')}</p></div><div class="prof-official-coefficient">×${official}</div><button class="primary professor-x-inline">${tr('حسنًا','Fermer')}</button>`);q('.professor-x-inline',m.wrap).onclick=m.close;return}
 const m=modal(tr('تعديل معامل المادة','Modifier le coefficient'),`<label>${tr('المادة','Matière')}<input value="${esc(profSubject(a.subject))}" disabled></label><label>${tr('المعامل','Coefficient')}<input id="pv2EditCoefficient" type="number" inputmode="decimal" min="0.25" max="20" step="0.25" value="${coefficientOf(a)}"></label><small>${tr('هذا المعامل يدوي لأن الكتالوج الحالي لا يحتوي معاملًا رسميًا مثبتًا لهذه المادة/المستوى.','Coefficient manuel : le catalogue actuel ne contient pas encore de coefficient officiel confirmé pour cette matière/niveau.')}</small><button class="primary" id="pv2SaveCoefficient">${tr('حفظ المعامل','Enregistrer le coefficient')}</button><p class="professor-msg"></p>`);
 q('#pv2SaveCoefficient',m.wrap).onclick=async()=>{const n=Number(q('#pv2EditCoefficient',m.wrap).value),msg=q('.professor-msg',m.wrap);if(!Number.isFinite(n)||n<=0||n>20){msg.textContent=tr('أدخل معاملًا صحيحًا أكبر من 0','Saisissez un coefficient valide supérieur à 0');return}a.coefficient=Math.round(n*100)/100;a.coefficientSource='manual';try{await saveProfile(tr('تم حفظ المعامل','Coefficient enregistré'));m.close();openGrades(id)}catch{msg.textContent=tr('تعذر الحفظ','Enregistrement impossible')}}
}
function termFormula(term){
 const label=term===1?tr('الفصل الأول','1er trimestre'):term===2?tr('الفصل الثاني','2e trimestre'):tr('الفصل الثالث','3e trimestre');
 const base=tr('كل فصل: اختبار واحد /20 + امتحان واحد /20. معدل الفصل = (الاختبار + الامتحان) ÷ 2.','Chaque trimestre : une interrogation /20 + une composition /20. Moyenne du trimestre = (interrogation + composition) ÷ 2.');
 const annual=tr('المعدل العام للمادة = (معدل الفصل الأول ×1 + معدل الفصل الثاني ×2 + معدل الفصل الثالث ×3) ÷ 6.','Moyenne générale de la matière = (moyenne T1 ×1 + moyenne T2 ×2 + moyenne T3 ×3) ÷ 6.');
 return base+' · '+label+(term===3?' · '+annual:'')
}
function termAverageLabel(term){return term===1?tr('معدل الفصل الأول','Moyenne du 1er trimestre'):term===2?tr('معدل الفصل الثاني','Moyenne du 2e trimestre'):tr('معدل الفصل الثالث','Moyenne du 3e trimestre')}

function professorSubjectListRows(a,term){
 const cls=classById(a.classId),marks=marksFor(a.id),students=cls?.students||[],annual=term===3;
 return students.map((s,i)=>{const m=marks[s.id]||{},rec=termRecord(m,term),avg=termResult(m,term),annualAvg=annual?annualSubjectResult(m):null,name=profStudentNamePair(s);return`<tr><td>${esc(s.callNumber||i+1)}</td><td class="name">${dualReportLabel(name.ar||s.name,name.fr||s.name)}${s.nns?`<small dir="ltr">NNS: ${esc(s.nns)}</small>`:''}</td><td>${reportMark(rec.displayTest,s)}</td><td>${reportMark(rec.displayExam,s)}</td><td>${resultText(avg)}</td>${annual?`<td>${resultText(annualAvg)}</td>`:''}</tr>`}).join('')
}
function professorSubjectListTable(a,term){
 const annual=term===3,rows=professorSubjectListRows(a,term),avgLabel=term===1?['معدل الفصل الأول','Moyenne du 1er trimestre']:term===2?['معدل الفصل الثاني','Moyenne du 2e trimestre']:['معدل الفصل الثالث','Moyenne du 3e trimestre'];
 return`<table class="result-table professor-own-list-table" data-own-subject-list="${esc(a.id)}" data-term="${term}"><thead><tr><th>${dualReportLabel('رقم النداء','N° d’appel')}</th><th>${dualReportLabel('اسم التلميذ','Élève')}</th><th>${dualReportLabel('الاختبار /20','Interrogation /20')}</th><th>${dualReportLabel(term===3?'الامتحان النهائي /20':'امتحان الفصل /20',term===3?'Examen final /20':'Composition /20')}</th><th>${dualReportLabel(avgLabel[0],avgLabel[1])}</th>${annual?`<th>${dualReportLabel('المعدل العام للمادة','Moyenne générale de la matière')}</th>`:''}</tr></thead><tbody>${rows||`<tr><td colspan="${annual?6:5}">${dualReportLabel('لا يوجد تلاميذ','Aucun élève')}</td></tr>`}</tbody></table>`
}
function professorMySubjectsTable(classId,term){
 const cls=classById(classId),assignments=assignmentsForClass(classId),students=cls?.students||[],annual=term===3;
 const top=assignments.map(a=>{const subject=profSubjectPair(a.subject,a.subjectKey,cls?.levelCode);return `<th colspan="${annual?4:3}" class="own-subject-group">${dualReportLabel(subject.ar,subject.fr)}<small>×${coefficientOf(a)}</small></th>`}).join('');
 const sub=assignments.map(()=>`<th>${dualReportLabel('اختبار /20','Test /20')}</th><th>${dualReportLabel(term===3?'الامتحان النهائي /20':'الامتحان /20',term===3?'Examen final /20':'Composition /20')}</th><th>${dualReportLabel('معدل الفصل','Moy. trimestre')}</th>${annual?`<th>${dualReportLabel('المعدل العام','Moy. générale')}</th>`:''}`).join('');
 const rows=students.map((student,i)=>{const name=profStudentNamePair(student),cells=assignments.map(a=>{const mark=marksFor(a.id)?.[student.id]||{},rec=termRecord(mark,term),avg=termResult(mark,term),finalAvg=annual?annualSubjectResult(mark):null;return `<td>${reportMark(rec.displayTest,student)}</td><td>${reportMark(rec.displayExam,student)}</td><td>${resultText(avg)}</td>${annual?`<td>${resultText(finalAvg)}</td>`:''}`}).join('');return `<tr><td>${esc(student.callNumber||i+1)}</td><td class="name">${dualReportLabel(name.ar||student.name,name.fr||student.name)}</td>${cells}</tr>`}).join('');
 const colspan=2+(assignments.length*(annual?4:3));
 return `<table class="result-table professor-my-subjects-table" data-term="${term}"><thead><tr><th rowspan="2">${dualReportLabel('رقم النداء','N°')}</th><th rowspan="2">${dualReportLabel('التلميذ','Élève')}</th>${top}</tr><tr>${sub}</tr></thead><tbody>${rows||`<tr><td colspan="${colspan}">${dualReportLabel('لا يوجد تلاميذ','Aucun élève')}</td></tr>`}</tbody></table>`
}
function printProfessorMySubjectsList(classId,term){
 const cls=classById(classId),assignments=assignmentsForClass(classId),t=professorTermPair(term),teacher=profNamePair(professorUser?.name||''),table=professorMySubjectsTable(classId,term),landscape=professorOwnListLandscape(assignments.length),layoutClass=landscape?'professor-own-list-doc':'professor-own-list-doc professor-own-list-portrait professor-own-list-'+Math.min(assignments.length,2)+'-subject';
 const subjectNames=assignments.map(a=>profSubjectPair(a.subject,a.subjectKey,cls?.levelCode)),arNames=subjectNames.map(x=>x.ar).join('، '),frNames=subjectNames.map(x=>x.fr).join(', ');
 const titleAr='لائحة موادي – '+t.ar,titleFr='Liste de mes matières – '+t.fr;
 const body=`<div class="report-subtitle professor-own-list-meta"><div class="dual-line"><span dir="rtl"><b>الأستاذ(ة):</b> ${esc(teacher.ar||professorUser?.name||'—')} · <b>المواد:</b> ${esc(arNames||'—')}</span><span dir="ltr"><b>Professeur :</b> ${esc(teacher.fr||professorUser?.name||'—')} · <b>Matières :</b> ${esc(frNames||'—')}</span></div></div>${table}${term===3?`<p class="own-list-annual-note">${dualReportLabel('المعدل العام لكل مادة محسوب تلقائيًا من معدلات الفصول الثلاثة بأوزان 1 و2 و3.','La moyenne générale de chaque matière est calculée automatiquement à partir des moyennes des trois trimestres pondérées 1, 2 et 3.')}</p>`:''}`;
 printProfessorDocument(fr()?titleFr:titleAr,body,{className:cls?.name||'',term,subjectCount:assignments.length,titleAr,titleFr,layoutClass,compact:true,landscape})
}
async function openMySubjectsList(classId,term=1){
 await flushGradeAutosave();try{await refreshProfile()}catch{toast(tr('تعذر تحديث النتائج من الخادم','Impossible d’actualiser les résultats depuis le serveur'));return}
 term=Math.max(1,Math.min(3,Number(term)||1));const cls=classById(classId),assignments=assignmentsForClass(classId);if(!cls||!assignments.length)return;const t=professorTermPair(term),table=professorMySubjectsTable(classId,term),title=tr('لائحة موادي','Liste de mes matières');
 const names=assignments.map(a=>profSubject(a.subject)).join(' · ');
 const m=modal(title,`<div class="prof-own-list-preview"><div class="prof-report-meta"><b>${esc(names)}</b><span>${esc(profClass(cls.name))} · ${esc(t.ar)} / ${esc(t.fr)}</span></div><div class="professor-table-wrap">${table}</div><button class="primary" id="pv2PrintMySubjects">🖨 ${tr('طباعة لائحة موادي / PDF','Imprimer mes matières / PDF')}</button></div>`);
 q('#pv2PrintMySubjects',m.wrap).onclick=()=>printProfessorMySubjectsList(classId,term)
}

function printProfessorSubjectList(a,term){return printProfessorMySubjectsList(a.classId,term)}
async function openSubjectList(id,term=1){
 await flushGradeAutosave();try{await refreshProfile()}catch{toast(tr('تعذر تحديث النتائج من الخادم','Impossible d’actualiser les résultats depuis le serveur'));return}
 term=Math.max(1,Math.min(3,Number(term)||1));const a=profile.assignments.find(x=>x.id===id);if(!a)return;const cls=classById(a.classId),subject=profSubjectPair(a.subject,a.subjectKey,cls?.levelCode),t=professorTermPair(term),table=professorSubjectListTable(a,term),title=tr('لائحة مادتي','Liste de ma matière');
 const m=modal(title,`<div class="prof-own-list-preview"><div class="prof-report-meta"><b>${esc(subject.ar)} / ${esc(subject.fr)}</b><span>${esc(profClass(cls?.name||''))} · ${esc(t.ar)} / ${esc(t.fr)}</span></div><div class="professor-table-wrap">${table}</div><button class="primary" id="pv2PrintOwnSubject">🖨 ${tr('طباعة لائحة موادي / PDF','Imprimer mes matières / PDF')}</button></div>`);
 q('#pv2PrintOwnSubject',m.wrap).onclick=()=>printProfessorSubjectList(a,term)
}
function openGrades(id,term=1){
 term=Math.max(1,Math.min(3,Number(term)||1));const a=profile.assignments.find(x=>x.id===id);if(!a)return;currentView='grade:'+id+':'+term;
 const cls=classById(a.classId),students=cls?.students||[],marks=marksFor(id),l=linkFor(a.classId),canManageRoster=!l||l.role==='owner',coefficient=coefficientOf(a),showAnnual=term===3,avgHead=termAverageLabel(term);
 const cards=students.map((s,i)=>{
  const m=marks[s.id]||{},rec=ensureProfessorTerm(m,term),avg=termResult(m,term),annualAvg=showAnnual?annualSubjectResult(m):null,names=profStudentNamePair(s),mainName=fr()?(names.fr||names.ar):(names.ar||names.fr),subName=fr()?(names.ar||names.fr):(names.fr||names.ar),mainDir=fr()?'ltr':'rtl',subDir=fr()?'rtl':'ltr';
  const testAbsent=professorIsAbsent(rec.tests[0]),examAbsent=professorIsAbsent(rec.exam);
  return `<article class="prof-grade-student-card" data-prof-grade-card="${esc(s.id)}">
   <header class="prof-grade-student-head"><span class="prof-grade-call">${esc(s.callNumber||i+1)}</span><div class="prof-grade-student-copy"><b dir="${mainDir}">${esc(mainName||'—')}</b><small dir="${subDir}">${esc(subName||'—')}</small>${s.nns?`<em dir="ltr">NNS: ${esc(s.nns)}</em>`:''}</div></header>
   <div class="prof-grade-assessments">
    <div class="prof-grade-assessment ${testAbsent?'is-absent':''}" data-grade-assessment="test">
     <div class="prof-grade-assessment-label"><b>${tr('الاختبار','Interrogation')}</b><small dir="ltr">/20</small></div>
     <div class="prof-grade-score-controls"><div class="prof-grade-score-field" dir="ltr"><input inputmode="decimal" data-test-index="0" data-sid="${esc(s.id)}" value="${esc(professorGradeDisplay(rec.tests[0],s))}" placeholder="—"><em>/20</em></div><button type="button" class="prof-grade-absent" data-absent-kind="test" data-sid="${esc(s.id)}" aria-pressed="${testAbsent?'true':'false'}">${esc(professorAbsentLabel(s))}</button></div>
    </div>
    <div class="prof-grade-assessment ${examAbsent?'is-absent':''}" data-grade-assessment="exam">
     <div class="prof-grade-assessment-label"><b>${term===3?tr('الامتحان النهائي','Examen final'):tr('امتحان الفصل','Composition')}</b><small dir="ltr">/20</small></div>
     <div class="prof-grade-score-controls"><div class="prof-grade-score-field" dir="ltr"><input inputmode="decimal" data-exam="1" data-sid="${esc(s.id)}" value="${esc(professorGradeDisplay(rec.exam,s))}" placeholder="—"><em>/20</em></div><button type="button" class="prof-grade-absent" data-absent-kind="exam" data-sid="${esc(s.id)}" aria-pressed="${examAbsent?'true':'false'}">${esc(professorAbsentLabel(s))}</button></div>
    </div>
   </div>
   <footer class="prof-grade-student-results ${showAnnual?'has-annual':''}"><span class="term-average"><small>${esc(avgHead)}</small><b data-avg="${esc(s.id)}">${avg==null?'—':avg.toFixed(2)}${avg==null?'':'/20'}</b></span>${showAnnual?`<span class="annual-average"><small>${tr('المعدل العام للمادة','Moyenne générale de la matière')}</small><b data-annual="${esc(s.id)}">${annualAvg==null?'—':annualAvg.toFixed(2)}${annualAvg==null?'':'/20'}</b></span>`:''}</footer>
  </article>`
 }).join('');
 const termTabs=[1,2,3].map(t=>`<button class="${t===term?'on':''}" data-prof-term="${t}">${tr('الفصل '+t,'Trimestre '+t)}</button>`).join('');
 const siblingSubjects=assignmentsForClass(a.classId),subjectSwitcher=siblingSubjects.length>1?`<div class="prof-subject-switch"><span>${tr('مواد هذا القسم','Matières de cette classe')}</span><div>${siblingSubjects.map(s=>`<button class="${s.id===a.id?'on':''}" data-switch-subject="${esc(s.id)}">${esc(profSubject(s.subject))}</button>`).join('')}</div></div>`:'';
 const el=root();el.innerHTML=`<div class="professor-shell prof-grade-reference">${topbar(profSubject(a.subject),profClass(cls?.name||''))}<section class="prof-page-head"><div><button id="pv2BackGrade" class="prof-back-inline">‹ ${tr('رجوع','Retour')}</button><span class="professor-badge">${tr('اختبار واحد /20 + امتحان واحد /20 لكل فصل','Une interrogation /20 + une composition /20 par trimestre')}</span><h1>${esc(profSubject(a.subject))}</h1><p>${esc(profClass(cls?.name||''))} · ${tr('المعامل','Coefficient')} ${coefficient} ${l?'· 🔗 '+l.memberCount+' '+tr('أساتذة','professeurs'):''}</p></div><div><button class="primary" id="pv2SaveGrades">${tr('حفظ الدرجات','Enregistrer les notes')}</button><button id="pv2OwnSubjectList">▤ ${tr('لائحة مادتي','Liste de ma matière')}</button><button id="pv2EditCoefficient">${tr('المعامل','Coefficient')} ×${coefficient}</button>${canManageRoster?`<button id="pv2AddStudentGrade">+ ${tr('تلميذ','Élève')}</button>`:''}</div></section><section class="professor-content prof-grade-teacher-style">${subjectSwitcher}<div class="prof-term-tabs">${termTabs}</div><div class="prof-term-formula"><b>${tr('تنظيم الفصل','Organisation du trimestre')}</b><span>${esc(termFormula(term))}</span><small>${term===3?tr('الفصل الثالث يعرض خانتين محسوبتين: معدل الفصل الثالث، ثم المعدل العام للمادة المعتمد في اللائحة النهائية.','Le troisième trimestre affiche deux résultats calculés : la moyenne du 3e trimestre, puis la moyenne générale de la matière utilisée dans la liste finale.'):tr('لا يُسمى هذا المعدل “المعدل العام”؛ هو معدل هذا الفصل فقط.','Cette moyenne est celle du trimestre, pas la moyenne générale annuelle.')}</small></div><div class="prof-grade-entry-list">${cards||`<div class="professor-empty compact"><p>${canManageRoster?tr('أضف تلاميذ القسم أولًا.','Ajoutez d’abord les élèves de la classe.'):tr('قائمة القسم الموحدة فارغة حاليًا. منشئ الرمز هو من يدير التلاميذ.','La liste unifiée est vide. Le créateur du code gère les élèves.')}</p></div>`}</div><div class="prof-save-bar"><span id="pv2SaveState">${tr('لا توجد تغييرات غير محفوظة','Aucune modification non enregistrée')}</span><small>${tr('هذا إدخال مادة الأستاذ فقط. زر الغياب يتبع جنس التلميذ ولغة التطبيق.','Cette saisie concerne uniquement la matière du professeur. Le bouton d’absence suit le sexe de l’élève et la langue de l’application.')}</small></div></section>${nav('grades')}</div>`;
 bindTop(el);bindNav(el);
 q('#pv2BackGrade',el).onclick=async()=>{await flushGradeAutosave();openClass(a.classId)};
 q('#pv2OwnSubjectList',el).onclick=()=>{void openSubjectList(id,term)};
 q('#pv2EditCoefficient',el).onclick=async()=>{await flushGradeAutosave();editCoefficient(id)};
 if(canManageRoster)q('#pv2AddStudentGrade',el).onclick=async()=>{await flushGradeAutosave();addStudent(a.classId,()=>openGrades(id,term))};
 qa('[data-switch-subject]',el).forEach(b=>b.onclick=async()=>{await flushGradeAutosave();openGrades(b.dataset.switchSubject,term)});
 qa('[data-prof-term]',el).forEach(b=>b.onclick=async()=>{await flushGradeAutosave();openGrades(id,Number(b.dataset.profTerm))});
 const studentFor=sid=>students.find(s=>String(s.id)===String(sid))||{};
 const recalc=sid=>{
  const m=marks[sid]||{},avg=termResult(m,term),annualAvg=showAnnual?annualSubjectResult(m):null,avgEl=q(`[data-avg="${CSS.escape(sid)}"]`,el),annualEl=showAnnual?q(`[data-annual="${CSS.escape(sid)}"]`,el):null;
  if(avgEl)avgEl.textContent=avg==null?'—':avg.toFixed(2)+'/20';if(annualEl)annualEl.textContent=annualAvg==null?'—':annualAvg.toFixed(2)+'/20'
 };
 const syncAssessment=(sid,kind)=>{
  const s=studentFor(sid),rec=ensureProfessorTerm(marks[sid]||(marks[sid]={terms:{}}),term),raw=kind==='test'?rec.tests[0]:rec.exam,box=q(`[data-prof-grade-card="${CSS.escape(sid)}"] [data-grade-assessment="${kind}"]`,el),inp=kind==='test'?q(`[data-test-index][data-sid="${CSS.escape(sid)}"]`,el):q(`[data-exam][data-sid="${CSS.escape(sid)}"]`,el),btn=q(`[data-absent-kind="${kind}"][data-sid="${CSS.escape(sid)}"]`,el),isAbsent=professorIsAbsent(raw);
  box?.classList.toggle('is-absent',isAbsent);if(btn){btn.textContent=professorAbsentLabel(s);btn.setAttribute('aria-pressed',isAbsent?'true':'false')}if(inp&&document.activeElement!==inp)inp.value=professorGradeDisplay(raw,s)
 };
 const commitVisibleGradeInputs=()=>{
  qa('[data-test-index]',el).forEach(inp=>{const sid=inp.dataset.sid,k=Number(inp.dataset.testIndex),value=cleanGrade(inp.value);marks[sid]=marks[sid]||{terms:{}};ensureProfessorTerm(marks[sid],term).tests[k]=value;recalc(sid);syncAssessment(sid,'test')});
  qa('[data-exam]',el).forEach(inp=>{const sid=inp.dataset.sid,value=cleanGrade(inp.value);marks[sid]=marks[sid]||{terms:{}};ensureProfessorTerm(marks[sid],term).exam=value;recalc(sid);syncAssessment(sid,'exam')})
 };
 qa('[data-test-index]',el).forEach(inp=>{
  inp.onfocus=()=>{const sid=inp.dataset.sid,rec=ensureProfessorTerm(marks[sid]||(marks[sid]={terms:{}}),term);if(professorIsAbsent(rec.tests[0]))inp.select()};
  inp.oninput=()=>{const sid=inp.dataset.sid,k=Number(inp.dataset.testIndex),value=cleanGrade(inp.value);marks[sid]=marks[sid]||{terms:{}};const rec=ensureProfessorTerm(marks[sid],term);rec.tests[k]=value;inp.value=professorGradeDisplay(value,studentFor(sid));recalc(sid);syncAssessment(sid,'test');scheduleGradeAutosave()}
 });
 qa('[data-exam]',el).forEach(inp=>{
  inp.onfocus=()=>{const sid=inp.dataset.sid,rec=ensureProfessorTerm(marks[sid]||(marks[sid]={terms:{}}),term);if(professorIsAbsent(rec.exam))inp.select()};
  inp.oninput=()=>{const sid=inp.dataset.sid,value=cleanGrade(inp.value);marks[sid]=marks[sid]||{terms:{}};const rec=ensureProfessorTerm(marks[sid],term);rec.exam=value;inp.value=professorGradeDisplay(value,studentFor(sid));recalc(sid);syncAssessment(sid,'exam');scheduleGradeAutosave()}
 });
 qa('[data-absent-kind]',el).forEach(btn=>btn.onclick=()=>{
  const sid=btn.dataset.sid,kind=btn.dataset.absentKind;marks[sid]=marks[sid]||{terms:{}};const rec=ensureProfessorTerm(marks[sid],term),current=kind==='test'?rec.tests[0]:rec.exam,next=professorIsAbsent(current)?'':'ABSENT';
  if(kind==='test')rec.tests[0]=next;else rec.exam=next;const inp=kind==='test'?q(`[data-test-index][data-sid="${CSS.escape(sid)}"]`,el):q(`[data-exam][data-sid="${CSS.escape(sid)}"]`,el);if(inp)inp.value=professorGradeDisplay(next,studentFor(sid));recalc(sid);syncAssessment(sid,kind);scheduleGradeAutosave()
 });
 q('#pv2SaveGrades',el).onclick=async()=>{const b=q('#pv2SaveGrades',el),fields=qa('.prof-grade-entry-list input,.prof-grade-entry-list button',el);commitVisibleGradeInputs();gradeEditRevision++;b.disabled=true;fields.forEach(x=>x.disabled=true);try{const ok=await forceProfessorGradeSave();if(ok){const ctx=currentGradeSaveContext(),count=ctx?professorGradeRows(ctx).length:0;q('#pv2SaveState',el).textContent=tr('✓ تم حفظ والتحقق من جميع النتائج ('+count+' تلميذًا)','✓ Toutes les notes ont été enregistrées et vérifiées ('+count+' élève(s))');toast(tr('تم حفظ جميع النتائج','Toutes les notes sont enregistrées'))}}finally{fields.forEach(x=>x.disabled=false);b.disabled=false}}
}

function resultText(v){return v==null?'—':Number(v).toFixed(2)}
function professorRankPair(rank){
 const n=Number(rank);if(!Number.isFinite(n)||n<1)return{ar:'—',fr:'—'};
 const arMap=['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر','السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون'];
 return{ar:arMap[n]||('الرتبة '+n),fr:n===1?'1er':(n+'e')}
}
function professorRankLabel(rank){const n=Number(rank);return Number.isFinite(n)&&n>=1?esc(String(n)):'—'}
function curriculumProgressText(data){if(data?.curriculumComplete&&data?.expectedCoefficientTotal)return String(data.expectedCoefficientTotal);return data?.expectedCoefficientTotal?String(data.assignedCoefficientTotal??0)+' / '+String(data.expectedCoefficientTotal):String(data?.assignedCoefficientTotal??0)}
function curriculumNotice(data){if(data?.curriculumComplete)return'';return tr('النتيجة ما زالت مؤقتة: مجموع معاملات المواد المضافة هو ','Résultat provisoire : la somme des coefficients ajoutés est de ')+curriculumProgressText(data)+tr('. يثبت المعدل والترتيب الرسميان عند اكتمال معاملات مواد القسم.','. La moyenne et le rang deviennent officiels lorsque tous les coefficients de la classe sont complets.')}

function professorRemark(avg){
 if(avg==null)return'—';
 try{const v=window.nataijiRemark?.(avg);if(v)return v}catch{}
 if(avg>=16)return tr('ممتاز','Excellent');if(avg>=14)return tr('جيد جدا','Très bien');if(avg>=12)return tr('جيد','Bien');if(avg>=10)return tr('مقبول','Passable');return tr('ضعيف','Insuffisant')
}
function professorRemarkPair(avg){
 if(avg==null)return{ar:'—',fr:'—'};
 if(avg>=16)return{ar:'ممتاز',fr:'Excellent'};
 if(avg>=14)return{ar:'جيد جدا',fr:'Très bien'};
 if(avg>=12)return{ar:'جيد',fr:'Bien'};
 if(avg>=10)return{ar:'مقبول',fr:'Passable'};
 return{ar:'ضعيف',fr:'Insuffisant'}
}
function professorTermLabel(term){return fr()?'Trimestre '+term:'الفصل '+term}
function professorTermPair(term){return{ar:'الفصل '+term,fr:'Trimestre '+term}}
function professorBulletinTitlePair(term){
 const t=Math.max(1,Math.min(3,Number(term)||1));
 return t===1?{ar:'كشف درجات الفصل الأول',fr:'Bulletin de Notes du premier trimestre'}:t===2?{ar:'كشف درجات الفصل الثاني',fr:'Bulletin de Notes du deuxième trimestre'}:{ar:'كشف درجات الفصل الثالث',fr:'Bulletin de Notes du troisième trimestre'}
}
function professorOrdinalPair(i){
 const n=Number(i)||1;return n===1?{ar:'الأول',fr:'1ère'}:n===2?{ar:'الثاني',fr:'2ème'}:{ar:'الثالث',fr:'3ème'}
}
function reportMark(v,student=null){
 if(v==null||v==='')return'—';if(professorIsAbsent(v))return professorAbsentLabel(student);const n=Number(v);if(!Number.isFinite(n))return'—';return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')
}
function professorSecondaryBulletinTable(data,row){
 const term=Math.max(1,Math.min(3,Number(data?.term)||1)),subjects=Array.isArray(data?.subjects)?data.subjects:[],results=Array.isArray(row?.subjectResults)?row.subjectResults:[],annual=term===3;
 const rows=subjects.map((s,i)=>{
  const r=results[i]||{},name=profSubjectPair(s.subject,s.subjectKey,data.levelCode,data.branchCode),remark=professorRemarkPair(annual?r.annualAverage:r.average);
  return `<tr><td class="name">${dualReportLabel(name.ar,name.fr)}</td><td>${reportMark(r.tests?.[0],row.student)}</td><td>${reportMark(r.exam,row.student)}</td><td class="mean-cell">${resultText(r.average)}</td>${annual?`<td class="mean-cell">${resultText(r.annualAverage)}</td>`:''}<td class="coef-cell">${s.coefficient}</td><td class="weighted-cell">${resultText(r.weighted)}</td><td class="observation-cell">${dualReportLabel(remark.ar,remark.fr)}</td></tr>`
 }).join('');
 const colspan=annual?8:7,avgLabel=term===1?['معدل الفصل الأول','Moyenne du 1er trimestre']:term===2?['معدل الفصل الثاني','Moyenne du 2e trimestre']:['معدل الفصل الثالث','Moyenne du 3e trimestre'];
 return `<table class="result-table secondary-bulletin-table" data-term="${term}"><thead><tr><th class="discipline-head">${dualReportLabel('المواد الدراسية','Disciplines')}</th><th>${dualReportLabel('الاختبار /20','Interrogation /20')}</th><th class="assessment-col">${dualReportLabel(term===3?'الامتحان النهائي /20':'امتحان الفصل /20',term===3?'Examen final /20':'Composition /20')}</th><th class="mean-head">${dualReportLabel(avgLabel[0],avgLabel[1])}</th>${annual?`<th class="mean-head">${dualReportLabel('المعدل العام للمادة','Moyenne générale de la matière')}</th>`:''}<th class="coef-head">${dualReportLabel('المعامل','Coef.')}</th><th class="weighted-head">${dualReportLabel('النقاط الموزونة','Points pondérés')}</th><th class="obs-head">${dualReportLabel('ملاحظات الأستاذ','Observations du professeur')}</th></tr></thead><tbody>${rows||`<tr><td colspan="${colspan}">${dualReportLabel('لا توجد مواد','Aucune matière')}</td></tr>`}</tbody></table>`
}
function professorCurriculumNoticePair(data){
 if(data?.curriculumComplete)return{ar:'',fr:''};
 const p=curriculumProgressText(data);
 return{ar:'النتيجة ما زالت مؤقتة: مجموع معاملات المواد المضافة هو '+p+'. يثبت المعدل والترتيب الرسميان عند اكتمال معاملات مواد القسم.',fr:'Résultat provisoire : la somme des coefficients ajoutés est de '+p+'. La moyenne et le rang deviennent officiels lorsque tous les coefficients de la classe sont complets.'}
}
function dualReportLabel(ar,fr){return `<span class="dual-ar" dir="rtl" lang="ar">${esc(ar)}</span><span class="dual-fr" dir="ltr" lang="fr">${esc(fr)}</span>`}
function professorOfficialHeader(className='',term=1){
 const school=profSchoolPair(),region=profRegionPair(),inspection=profInspectionPair(),cls=profClassPair(className),t=professorTermPair(term);
 const nns=String(profile.schoolNns||'').trim(),year=String(profile.year||'').trim();
 return `<header class="official-head">
  <section class="official-side official-fr" dir="ltr" lang="fr">
   <b class="official-strong">République Islamique de Mauritanie</b>
   <strong>Honneur - Fraternité - Justice</strong>
   <span>Ministère de l’Éducation et de la Réforme du Système Éducatif</span>
   ${region.fr?`<span>Direction régionale : <b>${esc(region.fr)}</b></span>`:''}
   ${inspection.fr?`<span>Inspection : <b>${esc(inspection.fr)}</b></span>`:''}
   ${school.fr?`<span>Établissement : <b>${esc(school.fr)}</b></span>`:''}
   ${nns?`<span>N° scolaire : <b dir="ltr">${esc(nns)}</b></span>`:''}
   ${year?`<span>Année scolaire : <b dir="ltr">${esc(year)}</b></span>`:''}
   ${className?`<span>Classe : <b>${esc(cls.fr)}</b></span>`:''}
   <span>Trimestre : <b>${esc(t.fr)}</b></span>
  </section>
  <section class="official-center"><div class="basmala" lang="ar" dir="rtl">بسم الله الرحمن الرحيم</div><img src="${location.origin}/1280px-National_Seal_of_Mauritania.svg.png" alt="شعار الجمهورية الإسلامية الموريتانية"></section>
  <section class="official-side official-ar" dir="rtl" lang="ar">
   <b class="official-strong">الجمهورية الإسلامية الموريتانية</b>
   <strong>شرف - إخاء - عدل</strong>
   <span>وزارة التربية وإصلاح النظام التعليمي</span>
   ${region.ar?`<span>الإدارة الجهوية: <b>${esc(region.ar)}</b></span>`:''}
   ${inspection.ar?`<span>المفتشية: <b>${esc(inspection.ar)}</b></span>`:''}
   ${school.ar?`<span>المؤسسة: <b>${esc(school.ar)}</b></span>`:''}
   ${nns?`<span>الرقم المدرسي: <b dir="ltr">${esc(nns)}</b></span>`:''}
   ${year?`<span>السنة الدراسية: <b dir="ltr">${esc(year)}</b></span>`:''}
   ${className?`<span>القسم: <b>${esc(cls.ar)}</b></span>`:''}
   <span>الفصل: <b>${esc(t.ar)}</b></span>
  </section>
 </header>`
}
function professorSignatures(){
 return `<div class="official-signatures school-signatures">
  <div class="signature-zone"><b>الأستاذ(ة)</b><span dir="ltr">Le Professeur</span><small>التوقيع / Signature</small><i></i></div>
  <div class="official-date-line"><b>التاريخ / Date</b><span dir="ltr">.... / .... / ........</span></div>
  <div class="signature-zone director-zone"><b>المدير</b><span dir="ltr">Le Directeur</span><small>التوقيع / Signature</small><i></i></div>
 </div>`
}
function printProfessorDocument(title,body,opts={}){
 const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;document.body.appendChild(frame);
 const className=opts.className||'',term=Number(opts.term)||1,compact=opts.compact?' compact':'',subjectCount=Math.max(0,Number(opts.subjectCount)||0),studentCount=Math.max(0,Number(opts.studentCount)||0),density=subjectCount&&subjectCount<=3?' few':subjectCount<=7?' medium':subjectCount?' dense':'',studentDensity=studentCount&&studentCount<=10?' class-list-students-few':studentCount<=20?' class-list-students-medium':studentCount?' class-list-students-many':'',twoCopies=opts.twoCopies===true,copyBodies=Array.isArray(opts.copyBodies)?opts.copyBodies.filter(Boolean):[],singlePages=opts.singlePages===true,twoUp=twoCopies||(copyBodies.length>0&&!singlePages),landscape=opts.landscape===true,layoutClass=String(opts.layoutClass||'').trim();
 frame.style.cssText='position:fixed;left:-12000px;top:0;width:'+(landscape?'297mm':'210mm')+';height:'+(landscape?'210mm':'297mm')+';border:0;pointer-events:none;z-index:-1';
 const titleAr=String(opts.titleAr||(!fr()?title:'')),titleFr=String(opts.titleFr||(fr()?title:'')),windowTitle=[titleFr,titleAr].filter(Boolean).join(' | '),pageSize=landscape?'A4 landscape':'A4',paperWidth=landscape?'291mm':'202mm',pageMargin=String(opts.pageMargin||((layoutClass==='class-list-doc'&&landscape)?'3mm':(twoUp?'5mm':'7mm')));
 const html=`<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><title>${esc(windowTitle||title)}</title><style>
 @page{size:${pageSize};margin:${pageMargin}}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Tahoma,Arial,sans-serif}html,body{width:${landscape?'297mm':'210mm'};min-height:${landscape?'210mm':'297mm'}}body{direction:ltr}.paper{width:100%;max-width:${paperWidth};margin:0 auto;padding:0 3mm;direction:ltr}.official-head{display:grid;grid-template-columns:minmax(0,1fr) 34mm minmax(0,1fr);grid-template-areas:"fr center ar";gap:5mm;align-items:start;width:100%;font-size:8.7pt;line-height:1.34;margin-bottom:3mm}.official-side{min-width:0;display:flex;flex-direction:column;gap:.35mm}.official-fr{grid-area:fr;text-align:left;direction:ltr}.official-ar{grid-area:ar;text-align:right;direction:rtl}.official-strong{font-weight:800}.official-center{grid-area:center;display:flex;flex-direction:column;align-items:center;text-align:center}.basmala{width:100%;font-size:8.7pt;font-weight:800;line-height:1.3;margin:0 0 .8mm;white-space:nowrap;text-align:center;direction:rtl}.official-center img{width:23mm;height:23mm;object-fit:contain}.report-title{display:flex;justify-content:center;align-items:center;gap:4mm;text-align:center;font-size:15.5pt;margin:2mm 0 1.2mm;font-weight:800}.report-title .dual-fr{font-size:.82em}.report-subtitle{text-align:center;font-size:8.5pt;margin:0 0 2mm;color:#333}.report-subtitle .dual-line{display:flex;justify-content:center;gap:3mm}.student-name{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1.2px solid #111;padding:0;margin:.8mm 0 0;font-size:9.6pt}.student-name>span{padding:1.15mm 1.7mm}.student-name>span+span{border-left:1px solid #222}.student-name [dir=rtl]{text-align:right}.student-name [dir=ltr]{text-align:left}.student-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;font-size:7.5pt;margin:0 0 1.2mm;border-left:1.2px solid #111;border-top:0}.student-info .dual-info{display:flex;justify-content:space-between;gap:2mm;border-right:1px solid #222;border-bottom:1px solid #222;padding:.75mm 1mm;min-height:5.2mm}.student-info .dual-info span:last-child{text-align:right}.result-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.4pt;direction:ltr;border:1.25px solid #111}.result-table th,.result-table td{border:1px solid #222;padding:.8mm .55mm;text-align:center;vertical-align:middle}.result-table th{font-weight:800;background:#fff}.result-table thead tr:first-child th{border-top:1.25px solid #111}.result-table tr>*:first-child{border-left:1.25px solid #111}.result-table tr>*:last-child{border-right:1.25px solid #111}.result-table tbody tr:last-child td{border-bottom:1.25px solid #111}.result-table .name{text-align:center;font-weight:700}.result-table .name .dual-ar,.result-table .name .dual-fr,.result-table th .dual-ar,.result-table th .dual-fr{display:block;line-height:1.15}.result-table .name .dual-fr,.result-table th .dual-fr{font-size:.84em;font-weight:600;margin-top:.35mm}.result-table small{font-size:6.4pt}.secondary-bulletin-table{font-size:6.7pt}.secondary-bulletin-table thead th{padding:.7mm .35mm;line-height:1.05}.secondary-bulletin-table .discipline-head{width:20%}.secondary-bulletin-table .assessment-col{width:5.5%}.secondary-bulletin-table .mean-head,.secondary-bulletin-table .coef-head,.secondary-bulletin-table .weighted-head{width:7%}.secondary-bulletin-table .obs-head{width:14%}.secondary-bulletin-table .group-head{font-size:7pt}.secondary-bulletin-table td{padding:.8mm .35mm;height:6.1mm}.secondary-bulletin-table .observation-cell .dual-fr,.secondary-bulletin-table .observation-cell .dual-ar{font-size:.78em}.secondary-summary{display:grid;grid-template-columns:1fr 1.35fr .8fr;gap:0;margin-top:0;border:1.2px solid #111;border-top:0}.secondary-summary>div{display:grid;grid-template-columns:1fr auto;align-items:center;gap:1.5mm;padding:.9mm 1.3mm;border-inline-end:1px solid #222;font-size:7.4pt}.secondary-summary>div:last-child{border-inline-end:0}.secondary-summary b .dual-ar,.secondary-summary b .dual-fr{display:block}.secondary-summary strong{font-size:8.3pt}.secondary-observation{margin-top:0;border:1.2px solid #111;border-top:0;padding:1mm 1.3mm;display:grid;grid-template-columns:auto 1fr 1fr;align-items:center;gap:2mm;min-height:7mm;font-size:7.4pt}.secondary-observation b .dual-ar,.secondary-observation b .dual-fr{display:block}.dual-ar{direction:rtl}.dual-fr{direction:ltr}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin:2.5mm 0 0;font-size:8.8pt;font-weight:800;text-align:center}.summary span{display:block}.summary .dual-summary{border:1px solid #ddd;padding:1.2mm;border-radius:2mm}.summary .dual-summary .dual-fr{font-size:.82em;margin-top:.4mm}.incomplete{font-size:7.1pt;text-align:center;color:#111;margin:1mm 0;display:grid;gap:.35mm}.official-signatures{display:grid;grid-template-columns:1fr .72fr 1fr;gap:9mm;margin:3.5mm 8mm 0;text-align:center;break-inside:avoid;direction:rtl;align-items:end}.official-signatures>div{display:flex;flex-direction:column;align-items:center;gap:.35mm}.official-signatures b{font-size:8.2pt}.official-signatures span{font-size:6.9pt}.official-signatures small{font-size:6.1pt;font-weight:600}.official-signatures i{display:block;width:30mm;height:4.5mm;margin:auto;border-bottom:1px dotted #444}.official-date-line{align-self:start;padding-top:1.2mm}.official-date-line span{font-weight:700;letter-spacing:.25mm}.stamp-zone{width:22mm;height:9mm;border:1px dashed #777;display:grid!important;place-items:center;font-size:5.8pt;margin:.4mm 0;color:#333}.director-zone i{height:2.5mm}.compact .official-signatures{margin-top:5mm}.compact .report-title{font-size:14pt;margin-top:1.5mm}.few .result-table{font-size:8.8pt}.few .result-table th,.few .result-table td{padding:1.35mm .9mm;height:8mm}.few .official-signatures{margin-top:9mm}.medium .result-table{font-size:7.5pt}.medium .result-table th,.medium .result-table td{padding:.9mm .55mm;height:6.8mm}.dense .result-table{font-size:6.2pt}.dense .result-table th,.dense .result-table td{padding:.45mm .28mm;height:5.5mm}.dense .official-signatures{margin-top:3.5mm}.class-list-doc .result-table{font-size:9pt}.class-list-doc .result-table th,.class-list-doc .result-table td{padding:1.35mm .85mm}.class-list-doc .report-subtitle{font-size:9pt}.professor-own-list-doc .result-table{font-size:8.4pt}.professor-own-list-doc .result-table th,.professor-own-list-doc .result-table td{padding:1.15mm .65mm}.professor-own-list-doc .report-subtitle{font-size:8.6pt;margin-bottom:2mm}.professor-own-list-doc .own-list-annual-note{font-size:7.2pt;text-align:center;margin:2mm 0 0}.professor-own-list-portrait{padding:0 1.5mm}.professor-own-list-portrait .official-head{grid-template-columns:minmax(0,1fr) 31mm minmax(0,1fr);gap:4mm;font-size:9pt;line-height:1.3;margin-bottom:1.5mm}.professor-own-list-portrait .official-center img{width:24mm;height:24mm}.professor-own-list-portrait .basmala{font-size:9pt;margin-bottom:.45mm}.professor-own-list-portrait .report-title{font-size:16pt;margin:.8mm 0 .8mm}.professor-own-list-portrait .report-subtitle{font-size:9pt;margin-bottom:1.4mm}.professor-own-list-portrait .result-table{font-size:8.8pt}.professor-own-list-portrait .result-table th,.professor-own-list-portrait .result-table td{padding:1.35mm .7mm;height:7.6mm}.professor-own-list-portrait .result-table tr>*:first-child{width:7%}.professor-own-list-portrait .result-table tr>*:nth-child(2){width:19%}.professor-own-list-portrait.professor-own-list-1-subject .result-table{font-size:10pt}.professor-own-list-portrait.professor-own-list-1-subject .result-table th,.professor-own-list-portrait.professor-own-list-1-subject .result-table td{padding:1.7mm 1mm;height:8.8mm}.professor-own-list-portrait.professor-own-list-2-subject .result-table{font-size:8.7pt}.professor-own-list-portrait.professor-own-list-2-subject .result-table th,.professor-own-list-portrait.professor-own-list-2-subject .result-table td{padding:1.35mm .6mm}.professor-own-list-portrait .official-signatures{margin-top:7mm}.professor-own-list-portrait .official-signatures b{font-size:8.8pt}.professor-own-list-portrait .official-signatures span{font-size:7.5pt}.professor-own-list-portrait .official-signatures small{font-size:6.8pt}.professor-own-list-portrait .stamp-zone{width:25mm;height:10mm}.professor-own-list-portrait .own-list-annual-note{font-size:8pt;margin-top:2.5mm}.class-list-doc{padding:0 .5mm}.class-list-doc .official-head{font-size:9.1pt;line-height:1.25;margin-bottom:1.2mm}.class-list-doc .official-center img{width:22mm;height:22mm}.class-list-doc .report-title{font-size:16.5pt;margin:.7mm 0}.class-list-doc .report-subtitle{font-size:9.8pt;margin-bottom:1.2mm}.class-list-doc .incomplete{font-size:8pt;margin:.6mm 0 1mm}.class-list-doc .result-table{font-size:9.6pt}.class-list-doc .result-table th,.class-list-doc .result-table td{padding:1.8mm .7mm;height:8.4mm}.class-list-doc .collective-class-table .rank-head,.class-list-doc .collective-class-table .rank-cell{width:4.5%;font-weight:800}.class-list-doc .collective-class-table .student-head,.class-list-doc .collective-class-table td.name:nth-child(2){width:20%}.class-list-doc .collective-class-table .average-head{width:7.5%}.class-list-doc .collective-class-table .appreciation-head{width:10%}.class-list-doc .collective-class-table th b{font-size:9.6pt}.class-list-doc .collective-class-table .collective-subject-ar{display:block;font-size:6.3pt;line-height:1.05;margin:.25mm 0;white-space:normal}.class-list-doc .collective-class-table th small{display:block;font-size:7.3pt;margin-top:.25mm}.class-list-doc .summary{font-size:9.4pt;margin-top:1.4mm}.class-list-doc .official-signatures{margin-top:3.5mm}.class-list-doc.class-list-students-few .result-table{font-size:12.5pt}.class-list-doc.class-list-students-few .result-table th,.class-list-doc.class-list-students-few .result-table td{padding:2.8mm .5mm;height:14mm}.class-list-doc.class-list-students-few .collective-class-table th b{font-size:12.5pt}.class-list-doc.class-list-students-few .collective-class-table .collective-subject-ar{font-size:7.2pt}.class-list-doc.class-list-students-few .collective-class-table th small{font-size:8.6pt}.class-list-doc.class-list-students-few .collective-class-table td.name{font-size:11.5pt;line-height:1.22}.class-list-doc.class-list-students-few .rank-cell{font-size:14pt}.class-list-doc.class-list-students-medium .result-table{font-size:9.7pt}.class-list-doc.class-list-students-medium .result-table th,.class-list-doc.class-list-students-medium .result-table td{padding:1.65mm .65mm;height:8mm}.class-list-doc.class-list-students-many .result-table{font-size:8.2pt}.class-list-doc.class-list-students-many .result-table th,.class-list-doc.class-list-students-many .result-table td{padding:1mm .45mm;height:6.2mm}.official-student-bulletin-doc{padding:0 1mm}.official-student-bulletin-doc .official-head{grid-template-columns:minmax(0,1fr) 36mm minmax(0,1fr);gap:5mm;font-size:9.2pt;line-height:1.3;margin-bottom:2mm}.official-student-bulletin-doc .official-center img{width:25mm;height:25mm}.official-student-bulletin-doc .basmala{font-size:9.4pt;margin-bottom:.6mm}.official-student-bulletin-doc .report-title{font-size:16.5pt;margin:1mm 0 1.5mm}.official-student-bulletin-doc .student-name{font-size:10pt;margin-top:.6mm}.official-student-bulletin-doc .student-name>span{padding:1.35mm 1.6mm}.official-student-bulletin-doc .student-info{font-size:8.3pt;margin-bottom:1.8mm}.official-student-bulletin-doc .student-info .dual-info{padding:1mm 1.2mm;min-height:6mm}.official-student-bulletin-doc .secondary-bulletin-table{font-size:8.2pt;border-width:1.35px}.official-student-bulletin-doc .secondary-bulletin-table th{padding:1.05mm .35mm;line-height:1.08}.official-student-bulletin-doc .secondary-bulletin-table td{padding:1mm .35mm;height:7.7mm}.official-student-bulletin-doc .secondary-bulletin-table .discipline-head{width:22%}.official-student-bulletin-doc .secondary-bulletin-table .assessment-col{width:9%}.official-student-bulletin-doc .secondary-bulletin-table .mean-head{width:9%}.official-student-bulletin-doc .secondary-bulletin-table .coef-head{width:6%}.official-student-bulletin-doc .secondary-bulletin-table .weighted-head{width:9%}.official-student-bulletin-doc .secondary-bulletin-table .obs-head{width:15%}.official-student-bulletin-doc .secondary-bulletin-table .name .dual-ar{font-size:8.3pt}.official-student-bulletin-doc .secondary-bulletin-table .name .dual-fr{font-size:7.3pt}.official-student-bulletin-doc .official-bulletin-summary{display:grid;grid-template-columns:1fr 1.35fr .8fr 1fr;border:1.35px solid #111;border-top:0}.official-student-bulletin-doc .official-bulletin-summary>div{min-height:10mm;padding:1.2mm 1.4mm;border-inline-end:1px solid #222;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6mm;text-align:center}.official-student-bulletin-doc .official-bulletin-summary>div:last-child{border-inline-end:0}.official-student-bulletin-doc .official-bulletin-summary b{font-size:7.7pt}.official-student-bulletin-doc .official-bulletin-summary strong{font-size:10.2pt}.official-student-bulletin-doc .director-observations{border:1.35px solid #111;border-top:0;min-height:23mm;padding:2mm 2.5mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm}.official-student-bulletin-doc .director-observations .obs-label{font-size:8pt;font-weight:800}.official-student-bulletin-doc .director-observations .obs-lines{border-bottom:1px dotted #555;height:6mm;margin-top:1.5mm}.official-student-bulletin-doc .official-signatures{margin:7mm 8mm 0;gap:12mm}.official-student-bulletin-doc .official-signatures b{font-size:9pt}.official-student-bulletin-doc .official-signatures span{font-size:7.5pt}.official-student-bulletin-doc .official-signatures small{font-size:6.8pt}.official-student-bulletin-doc .official-signatures i{width:36mm;height:7mm}.student-page{min-height:281mm;padding:0 1mm;break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid}.student-page:last-child{break-after:auto;page-break-after:auto}.two-up{padding:0 1.5mm}.student-copy{height:138.2mm;overflow:hidden;padding:0 1mm;break-inside:avoid;page-break-inside:avoid}.student-copy .official-head{grid-template-columns:minmax(0,1fr) 27mm minmax(0,1fr);gap:3.5mm;font-size:7.1pt;line-height:1.22;margin-bottom:1mm}.student-copy .basmala{font-size:7.2pt;margin-bottom:.35mm}.student-copy .official-center img{width:17.5mm;height:17.5mm}.student-copy .report-title{font-size:10.8pt;margin:.45mm 0 .6mm;gap:2.2mm}.student-copy .student-name{font-size:6.9pt;margin:.25mm 0 0}.student-copy .student-name>span{padding:.45mm .8mm}.student-copy .student-info{font-size:5.5pt;margin:0 0 .45mm;gap:0}.student-copy .student-info .dual-info{padding:.3mm .55mm;min-height:3.5mm}.student-copy .secondary-bulletin-table{font-size:5.6pt}.student-copy .secondary-bulletin-table thead th{padding:.28mm .15mm;line-height:1}.student-copy .secondary-bulletin-table .group-head{font-size:5.8pt}.student-copy .secondary-bulletin-table td{padding:.32mm .16mm;height:4.1mm}.student-copy .secondary-bulletin-table .name .dual-fr,.student-copy .secondary-bulletin-table th .dual-fr{font-size:.78em;margin-top:.15mm}.student-copy .secondary-summary{margin-top:.65mm}.student-copy .secondary-summary>div{gap:1mm;padding:.45mm .7mm;font-size:5.9pt}.student-copy .secondary-summary strong{font-size:6.8pt}.student-copy .secondary-observation{margin-top:.65mm;padding:.4mm .7mm;gap:1.5mm;font-size:5.8pt}.student-copy .incomplete{font-size:5.1pt;margin:.4mm 0;gap:.2mm}.student-copy .official-signatures{grid-template-columns:1fr .65fr 1fr;gap:5mm;margin:.8mm 5mm 0}.student-copy .official-signatures b{font-size:5.8pt}.student-copy .official-signatures span{font-size:5pt}.student-copy .official-signatures small{font-size:4.6pt}.student-copy .official-signatures i{width:22mm;height:2.4mm}.student-copy .official-date-line{padding-top:.4mm}.student-copy .stamp-zone{width:16mm;height:4.8mm;font-size:4.4pt;margin:.15mm 0}.student-copy .director-zone i{height:1.6mm}.cut-line{height:3.4mm;display:flex;align-items:center;gap:2mm;color:#666;font-size:6.4pt}.cut-line::before,.cut-line::after{content:"";flex:1;border-top:1px dashed #777}.cut-line span{white-space:nowrap}.student-pair{break-after:page;page-break-after:always}.student-pair:last-child{break-after:auto;page-break-after:auto}.landscape-doc .official-head{grid-template-columns:minmax(0,1fr) 30mm minmax(0,1fr);font-size:8pt}.landscape-doc .official-center img{width:20mm;height:20mm}@media print{button{display:none}.paper{max-width:none}.result-table tr{break-inside:avoid}.official-head,.official-signatures,.student-name,.student-copy{break-inside:avoid}.two-up{page-break-after:avoid}}
 </style></head><body>${(()=>{const titleMarkup=`<h1 class="report-title"><span class="dual-fr" dir="ltr" lang="fr">${esc(titleFr||title)}</span><span class="dual-ar" dir="rtl" lang="ar">${esc(titleAr||title)}</span></h1>`,wrapCopy=(copyBody,n)=>`<section class="student-copy" data-copy="${n}">${professorOfficialHeader(className,term)}${titleMarkup}${copyBody}${professorSignatures()}</section>`,copy=`${professorOfficialHeader(className,term)}${titleMarkup}${body}${professorSignatures()}`,classes=['paper',compact.trim(),density.trim(),layoutClass,landscape?'landscape-doc':'',studentDensity.trim(),twoUp?'two-up':''].filter(Boolean).join(' ');if(copyBodies.length){if(singlePages){const pages=copyBodies.map((copyBody,i)=>`<section class="student-page" data-copy="${i+1}">${professorOfficialHeader(className,term)}${titleMarkup}${copyBody}${professorSignatures()}</section>`).join('');return`<main class="${classes}">${pages}</main>`}let pairs='';for(let i=0;i<copyBodies.length;i+=2){const first=wrapCopy(copyBodies[i],i+1),second=copyBodies[i+1]?wrapCopy(copyBodies[i+1],i+2):'';pairs+=`<section class="student-pair">${first}${second?`<div class="cut-line" aria-hidden="true"><span>✂ قص / Découper</span></div>${second}`:''}</section>`}return`<main class="${classes}">${pairs}</main>`}return twoCopies?`<main class="${classes}"><section class="student-copy" data-copy="1">${copy}</section><div class="cut-line" aria-hidden="true"><span>✂ قص / Découper</span></div><section class="student-copy" data-copy="2">${copy}</section></main>`:`<main class="${classes}">${copy}</main>`})()}</body></html>`;
 const doc=frame.contentDocument||frame.contentWindow?.document;if(!doc){frame.remove();toast(tr('تعذر فتح معاينة PDF','Impossible d’ouvrir l’aperçu PDF'));return}
 let printed=false;const cleanup=()=>setTimeout(()=>frame.remove(),1600),run=()=>{if(printed)return;printed=true;try{frame.contentWindow?.focus();frame.contentWindow?.print();cleanup()}catch{frame.remove();toast(tr('تعذر فتح PDF على هذا المتصفح','Impossible d’ouvrir le PDF dans ce navigateur'))}};
 frame.onload=()=>setTimeout(run,80);doc.open();doc.write(html);doc.close();setTimeout(run,700)
}
function professorStudentBulletinBody(data,row){
 const studentName=profStudentNamePair(row.student),className=profClassPair(data.className),term=professorTermPair(data.term),remark=professorRemarkPair(row.general),table=professorSecondaryBulletinTable(data,row),weightedValues=(row.subjectResults||[]).map(r=>r.weighted).filter(v=>v!=null),weightedTotal=weightedValues.length===(data.subjects||[]).length&&weightedValues.length?weightedValues.reduce((a,b)=>a+Number(b),0):null,avgAr=data.term===3?'المعدل العام':'معدل الفصل',avgFr=data.term===3?'Moyenne générale':'Moyenne du trimestre';
 return`<div class="student-name"><span dir="ltr" lang="fr"><b>Nom complet :</b> ${esc(studentName.fr||row.student.name)}</span><span dir="rtl" lang="ar"><b>الاسم الكامل:</b> ${esc(studentName.ar||row.student.name)}</span></div><div class="student-info"><div class="dual-info"><span dir="ltr"><b>NNS :</b> ${esc(row.student.nns||'—')}</span><span dir="rtl"><b>الرقم المدرسي:</b> ${esc(row.student.nns||'—')}</span></div><div class="dual-info"><span dir="ltr"><b>Année scolaire :</b> ${esc(profile.year||'—')}</span><span dir="rtl"><b>السنة الدراسية:</b> ${esc(profile.year||'—')}</span></div><div class="dual-info"><span dir="ltr"><b>Classe :</b> ${esc(className.fr)}</span><span dir="rtl"><b>القسم:</b> ${esc(className.ar)}</span></div><div class="dual-info"><span dir="ltr"><b>Trimestre :</b> ${esc(term.fr)}</span><span dir="rtl"><b>الفصل:</b> ${esc(term.ar)}</span></div></div>${table}<div class="official-bulletin-summary"><div><b>${dualReportLabel('المجموع','Total')}</b><strong>${weightedTotal==null?'—':Number(weightedTotal).toFixed(2)}</strong></div><div><b>${dualReportLabel(avgAr,avgFr)}</b><strong>${resultText(row.general)} /20</strong></div><div><b>${dualReportLabel('الرتبة','Rang')}</b><strong>${professorRankLabel(row.rank)}</strong></div><div><b>${dualReportLabel('القرار','Décision')}</b><strong>${dualReportLabel(remark.ar,remark.fr)}</strong></div></div><div class="director-observations"><div dir="rtl"><div class="obs-label">ملاحظات المدير</div><div class="obs-lines"></div><div class="obs-lines"></div></div><div dir="ltr"><div class="obs-label">Observations du Directeur</div><div class="obs-lines"></div><div class="obs-lines"></div></div></div>`
}
function studentBulletin(data,row){
 const studentName=profStudentNamePair(row.student),className=profClassPair(data.className),term=professorTermPair(data.term),notice=professorCurriculumNoticePair(data),titlePair=professorBulletinTitlePair(data.term),title=fr()?titlePair.fr:titlePair.ar,table=professorSecondaryBulletinTable(data,row),body=professorStudentBulletinBody(data,row);
 const previewName=`<span dir="rtl">${esc(studentName.ar||row.student.name)}</span><small dir="ltr">${esc(studentName.fr||row.student.name)}</small>`;
 const m=modal(title,`<div class="prof-bulletin-preview prof-bilingual-preview prof-secondary-preview"><div class="prof-report-meta"><b class="prof-bilingual-name">${previewName}</b><span>${esc(className.ar)} / ${esc(className.fr)} · ${esc(term.ar)} / ${esc(term.fr)}</span></div><div class="professor-table-wrap">${table}</div><div class="prof-report-summary"><b>${dualReportLabel(data.term===3?(data.curriculumComplete?'المعدل العام':'المعدل العام المؤقت'):(data.curriculumComplete?'معدل الفصل':'معدل الفصل المؤقت'),data.term===3?(data.curriculumComplete?'Moyenne générale':'Moyenne générale provisoire'):(data.curriculumComplete?'Moyenne du trimestre':'Moyenne du trimestre provisoire'))}<span> ${resultText(row.general)}</span></b><b>${dualReportLabel(data.curriculumComplete?'الترتيب':'الترتيب المؤقت',data.curriculumComplete?'Rang':'Rang provisoire')}<span> ${professorRankLabel(row.rank)}</span></b></div>${!data.curriculumComplete?`<p class="prof-report-warning"><span dir="rtl">${esc(notice.ar)}</span><br><span dir="ltr">${esc(notice.fr)}</span></p>`:''}${row.complete?'':`<p class="prof-report-warning"><span dir="rtl">المواد التي لم تُدخل درجاتها تظهر بقيمة 0 في الحساب الجماعي.</span><br><span dir="ltr">Les matières non saisies sont comptées à 0 dans le calcul collectif.</span></p>`}<button class="primary" id="pv2PrintStudent">🖨 ${tr('طباعة الكشف / PDF','Imprimer / PDF')}</button></div>`);
 q('#pv2PrintStudent',m.wrap).onclick=()=>printProfessorDocument(title,body,{className:data.className,term:data.term,subjectCount:data.subjects.length,titleAr:titlePair.ar,titleFr:titlePair.fr,layoutClass:'student-bulletin-doc official-student-bulletin-doc',pageMargin:'7mm'})
}
function printAllStudentBulletins(data){
 const rows=Array.isArray(data?.students)?data.students:[];if(!rows.length){toast(tr('لا يوجد تلاميذ للطباعة','Aucun élève à imprimer'));return}
 const titlePair=professorBulletinTitlePair(data.term),title=fr()?titlePair.fr:titlePair.ar,bodies=rows.map(row=>professorStudentBulletinBody(data,row));
 printProfessorDocument(title,'',{className:data.className,term:data.term,subjectCount:data.subjects.length,titleAr:titlePair.ar,titleFr:titlePair.fr,layoutClass:'student-bulletin-doc official-student-bulletin-doc',copyBodies:bodies,singlePages:true,pageMargin:'7mm'})
}

function professorOwnListLandscape(subjectCount){return Number(subjectCount)>=3}
function professorClassListLandscape(){return false}
function professorCollectiveSubjectArabic(subjectKey,name=''){
 const key=String(subjectKey||'').trim().toLowerCase(),map={
  islamic:'الإسلامية',arabic:'العربية',french:'الفرنسية',english:'الإنجليزية',
  history_geo:'التاريخ والجغرافيا',civic:'المدنية',math:'الرياضيات',
  natural_sciences:'العلوم الطبيعية',physical_sciences:'الفيزياء والكيمياء',
  technology_informatics:'التكنولوجيا والمعلوماتية',technology:'التكنولوجيا',
  informatics:'المعلوماتية',eps:'البدنية',philosophy:'الفلسفة',
  legislation_exegesis:'التشريع والتفسير',islamic_thought:'الفكر الإسلامي'
 };
 return map[key]||String(name||'').trim()
}
function printClassList(data){
 const className=profClassPair(data.className),term=professorTermPair(data.term),notice=professorCurriculumNoticePair(data);
 const subjectHeads=data.subjects.map(s=>{const name=profSubjectPair(s.subject,s.subjectKey,data.levelCode,data.branchCode),abbr=name.abbr||String(s.subjectKey||'').toUpperCase().slice(0,6),ar=professorCollectiveSubjectArabic(s.subjectKey,name.ar);return `<th title="${esc(name.ar)} / ${esc(name.fr)}"><b dir="ltr">${esc(abbr)}</b><span class="collective-subject-ar" dir="rtl">${esc(ar)}</span><small>×${s.coefficient}</small></th>`}).join('');
 const orderedStudents=[...(data.students||[])].sort((a,b)=>(Number(a.rank)||9999)-(Number(b.rank)||9999)||String(a.student?.name||'').localeCompare(String(b.student?.name||''),'ar'));
 const rows=orderedStudents.map(row=>{const studentName=profStudentNamePair(row.student),remark=professorRemarkPair(row.general),rank=Number(row.rank);return `<tr><td class="rank-cell">${Number.isFinite(rank)&&rank>=1?esc(String(rank)):'—'}</td><td class="name">${dualReportLabel(studentName.ar||row.student.name,studentName.fr||row.student.name)}${row.student.nns?`<small dir="ltr">NNS: ${esc(row.student.nns)}</small>`:''}</td>${row.subjectResults.map(r=>`<td>${reportMark(data.term===3?r.annualAverage:r.average)}</td>`).join('')}<td>${resultText(row.general)}</td><td class="name">${dualReportLabel(remark.ar,remark.fr)}</td></tr>`}).join('');
 const avgAr=data.term===3?(data.curriculumComplete?'المعدل العام':'المعدل العام المؤقت'):(data.curriculumComplete?'معدل الفصل':'معدل الفصل المؤقت'),avgFr=data.term===3?(data.curriculumComplete?'Moyenne générale':'Moyenne générale provisoire'):(data.curriculumComplete?'Moyenne du trimestre':'Moyenne du trimestre provisoire');
 const body=`<div class="report-subtitle"><div class="dual-line"><span dir="rtl">${esc(className.ar)} · ${esc(term.ar)} · مجموع المعاملات ${curriculumProgressText(data)}</span><span dir="ltr">${esc(className.fr)} · ${esc(term.fr)} · Total coefficients ${curriculumProgressText(data)}</span></div></div>${!data.curriculumComplete?`<p class="incomplete"><span dir="rtl">${esc(notice.ar)}</span><span dir="ltr">${esc(notice.fr)}</span></p>`:''}<table class="result-table collective-class-table"><thead><tr><th class="rank-head">${dualReportLabel(data.curriculumComplete?'الرتبة':'رتبة مؤقتة',data.curriculumComplete?'Rang':'Rang provisoire')}</th><th class="student-head">${dualReportLabel('التلميذ','Élève')}</th>${subjectHeads}<th class="average-head">${dualReportLabel(avgAr,avgFr)}</th><th class="appreciation-head">${dualReportLabel('التقييم','Appréciation')}</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><div class="dual-summary"><span class="dual-ar" dir="rtl">${avgAr}: ${resultText(data.classAverage)} /20</span><span class="dual-fr" dir="ltr">${avgFr}: ${resultText(data.classAverage)} /20</span></div></div>`;
 printProfessorDocument(tr('اللائحة الجماعية للقسم','Liste collective de la classe'),body,{className:data.className,term:data.term,compact:true,subjectCount:data.subjects.length,titleAr:'اللائحة الجماعية للقسم',titleFr:'Liste collective de la classe',layoutClass:'class-list-doc',landscape:false,studentCount:data.students?.length||0,pageMargin:'3mm'})
}

function professorReportSwitcher(active='own'){return `<div class="prof-report-switcher prof-report-switcher-premium"><button class="${active==='own'?'on':''}" data-report-section="own"><span>${professorMoreIcon('reports')}</span><b>${tr('لائحة موادي','Listes de mes matières')}</b><small>${tr('نتائج موادي فقط','Mes matières uniquement')}</small></button><button class="${active==='collective'?'on':''}" data-report-section="collective"><span>${professorMoreIcon('students')}</span><b>${tr('النتائج الجماعية','Résultats collectifs')}</b><small>${tr('كشف جماعي + اللائحة','Bulletin collectif + liste')}</small></button></div>`}

function renderReportsHub(term=1){
 term=Math.max(1,Math.min(3,Number(term)||1));currentView='reports';const el=root(),shared=displayClasses().filter(x=>!!linkFor(x.id)).length;
 const classCards=displayClasses().map(cls=>({cls,subjects:assignmentsForClass(cls.id)})).filter(x=>x.subjects.length).map(({cls,subjects})=>{const names=subjects.map(a=>`<span><i>${esc(iconFor(a.subject))}</i><b>${esc(profSubject(a.subject))}</b><small>×${coefficientOf(a)}</small></span>`).join('');return `<article class="prof-report-subject-card prof-report-class-card prof-report-class-card-premium">
  <div class="prof-report-card-top"><span class="prof-report-subject-icon">${professorMoreIcon('reports')}</span><div><small>${esc(profClass(cls.name))}</small><h3>${tr('لائحة موادي','Liste de mes matières')}</h3></div></div>
  <div class="prof-report-class-subjects">${names}</div>
  <button data-open-own-class-report="${esc(cls.id)}"><span>${professorMoreIcon('reports')}</span><b>${tr('فتح اللائحة','Ouvrir la liste')}</b><em>‹</em></button>
 </article>`}).join('');
 el.innerHTML=`<div class="professor-shell prof-reports-reference">${topbar(tr('التقارير والطباعة','Rapports et impression'),tr('فضاء الأستاذ','Espace professeur'))}<section class="professor-content prof-reports-content">${professorReportSwitcher('own')}<div class="prof-term-tabs prof-report-term-tabs">${[1,2,3].map(t=>`<button class="${t===term?'on':''}" data-own-report-term="${t}"><span>${professorMoreIcon('class')}</span><b>${tr('الفصل '+t,'Trimestre '+t)}</b></button>`).join('')}</div><div class="prof-report-section-title prof-report-section-title-premium"><div><small>${tr('تقاريري الفردية','Mes rapports individuels')}</small><h2>${tr('لائحة موادي','Liste de mes matières')}</h2><p>${tr('كل موادك في القسم نفسه تظهر داخل لائحة واحدة وPDF واحد. لكل فصل اختبار واحد /20 وامتحان واحد /20، ويظهر المعدل العام للمادة في الفصل الثالث.','Toutes vos matières d’une même classe apparaissent dans une seule liste et un seul PDF. Chaque trimestre comporte un test /20 et une composition /20 ; la moyenne générale de la matière apparaît au troisième trimestre.')}</p></div></div><div class="prof-report-subject-grid">${classCards||`<div class="professor-empty compact"><h3>${tr('لا توجد مواد بعد','Aucune matière')}</h3><p>${tr('أضف مادة لتظهر لائحتها هنا.','Ajoutez une matière pour voir sa liste ici.')}</p></div>`}</div><aside class="prof-collective-entry prof-collective-entry-premium"><span class="prof-collective-entry-icon">${professorMoreIcon('students')}</span><div><b>${tr('النتائج الجماعية','Résultats collectifs')}</b><small>${shared?tr('تجمع جميع مواد الأساتذة المرتبطين، وتظهر المادة بدرجة 0 إلى أن يُدخل أستاذها الدرجات.','Regroupe toutes les matières des professeurs liés ; une matière reste à 0 tant que son professeur n’a saisi aucune note.'):tr('تظهر بعد ربط القسم بالأساتذة.','Disponibles après liaison de la classe.')}</small><div class="prof-collective-tags"><em>${tr('كشف جماعي','Bulletin collectif')}</em><em>${tr('اللائحة','Liste')}</em></div></div><button data-report-section="collective"><b>${tr('فتح','Ouvrir')}</b><span>‹</span></button></aside></section>${nav('reports')}</div>`;
 bindTop(el);bindNav(el);qa('[data-own-report-term]',el).forEach(b=>b.onclick=()=>renderReportsHub(Number(b.dataset.ownReportTerm)));qa('[data-open-own-class-report]',el).forEach(b=>b.onclick=()=>{void openMySubjectsList(b.dataset.openOwnClassReport,term)});qa('[data-report-section="collective"]',el).forEach(b=>b.onclick=()=>renderResults('',term))
}

async function renderResults(classId='',term=1){
 term=Math.max(1,Math.min(3,Number(term)||1));
 const classes=displayClasses().filter(x=>!!linkFor(x.id));
 if(!classId||!classes.some(x=>x.id===classId))classId=classes[0]?.id||'';
 currentView=classId?'results:'+classId+':'+term:'reports';
 const el=root();
 const icon=(name)=>{
  const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const icons={
   file:`<svg ${common}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 12h5M10 16h5"/></svg>`,
   group:`<svg ${common}><circle cx="9" cy="8" r="3"/><path d="M3.8 19c.4-3.7 2.4-5.5 5.2-5.5s4.8 1.8 5.2 5.5"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 14.2c3.2-.5 5.1 1.1 5.5 4.8"/></svg>`,
   book:`<svg ${common}><path d="M4 5.5c2.8-.8 5.2-.2 8 1.6v12.2c-2.8-1.8-5.2-2.3-8-1.5z"/><path d="M20 5.5c-2.8-.8-5.2-.2-8 1.6v12.2c2.8-1.8 5.2-2.3 8-1.5z"/></svg>`,
   check:`<svg ${common}><rect x="5" y="5" width="14" height="15" rx="2"/><path d="M9 5V3h6v2"/><path d="m8.5 13 2.2 2.2 4.8-5"/></svg>`,
   chart:`<svg ${common}><path d="M5 20V11M10 20V7M15 20V13M20 20V4"/></svg>`,
   warn:`<svg ${common}><path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5"/><path d="M12 17h.01"/></svg>`,
   class:`<svg ${common}><circle cx="9" cy="8" r="2.7"/><path d="M4 19c.4-3.2 2.1-4.9 5-4.9s4.6 1.7 5 4.9"/><path d="M17 7v6M14 10h6"/></svg>`,
   print:`<svg ${common}><path d="M7 9V3h10v6"/><rect x="5" y="14" width="14" height="7" rx="1"/><path d="M5 17H3V9h18v8h-2"/><path d="M17 12h.01"/></svg>`
  };return icons[name]||''
 };
 const switcher=`<div class="prof-collective-switcher">
  <button type="button" data-report-section="own"><span>${icon('file')}</span><b>${tr('نتائج موادي','Mes résultats')}</b></button>
  <button type="button" class="on" data-report-section="collective"><span>${icon('group')}</span><b>${tr('النتائج الجماعية','Résultats collectifs')}</b></button>
 </div>`;
 if(!classes.length){
  el.innerHTML=`<div class="professor-shell prof-collective-reference">${topbar('','')}<section class="professor-content prof-collective-card">${switcher}<div class="professor-empty prof-collective-empty"><div>🔗</div><h3>${tr('لا يوجد قسم جماعي بعد','Aucune classe collective')}</h3><p>${tr('أنشئ رمز قسم مشترك أو انضم إليه لعرض النتائج الجماعية.','Créez ou rejoignez un code de classe partagé pour afficher les résultats collectifs.')}</p><button class="primary" id="profReportsGoClasses">${tr('إدارة الأقسام','Gérer les classes')}</button></div></section>${nav('reports')}</div>`;
  bindTop(el);bindNav(el);q('[data-report-section="own"]',el).onclick=()=>renderReportsHub(term);q('#profReportsGoClasses',el).onclick=()=>{currentView='students';renderClasses()};return
 }
 const options=classes.map(x=>`<option value="${esc(x.id)}" ${x.id===classId?'selected':''}>${esc(profClass(x.name))}</option>`).join('');
 const safeTabs=[1,2,3].map(t=>`<button class="${t===term?'on':''}" data-results-term="${t}">${tr('الفصل '+t,'Trimestre '+t)}</button>`).join('');
 el.innerHTML=`<div class="professor-shell prof-collective-reference">${topbar('','')}
  <section class="professor-content prof-collective-card">
   ${switcher}
   <div class="prof-collective-title-block">
    <h1>${tr('النتائج الجماعية','Résultats collectifs')}</h1>
    <p>${tr('يجمع القسم المشترك مواد جميع الأساتذة. من هنا تحصل على كشف جماعي لكل تلميذ وعلى اللائحة الجماعية للقسم.','La classe partagée regroupe les matières de tous les professeurs. Vous y trouvez le bulletin collectif de chaque élève et la liste collective de la classe.')}</p>
   </div>
   <label class="prof-collective-class-picker"><span class="prof-class-picker-icon">${icon('class')}</span><select id="pv2ResultsClass">${options}</select><span class="prof-class-picker-arrow">⌄</span></label>
   <div class="prof-term-tabs prof-collective-tabs">${safeTabs}</div>
   <div id="pv2ResultsBody" class="prof-results-loading">${tr('جاري تجميع النتائج…','Agrégation des résultats…')}</div>
  </section>
  ${nav('reports')}
 </div>`;
 bindTop(el);bindNav(el);
 q('[data-report-section="own"]',el).onclick=()=>renderReportsHub(term);
 q('#pv2ResultsClass',el).onchange=e=>renderResults(e.target.value,term);
 qa('[data-results-term]',el).forEach(b=>b.onclick=()=>renderResults(classId,Number(b.dataset.resultsTerm)));
 try{
  const data=await api('/api/professor/classes/'+encodeURIComponent(classId)+'/results?term='+term),body=q('#pv2ResultsBody',el);if(!body)return;
  const avgLabel=term===3?(data.curriculumComplete?tr('المعدل العام','Moyenne générale'):tr('معدل عام مؤقت','Moyenne générale provisoire')):(data.curriculumComplete?tr('معدل الفصل','Moyenne du trimestre'):tr('معدل فصل مؤقت','Moyenne provisoire du trimestre'));
  const studentRows=data.students.map((row,i)=>`<tr><td>${esc(row.student.callNumber||i+1)}</td><td>${esc(profStudentName(row.student))}</td></tr>`).join('');
  const warning=!data.curriculumComplete?`<div class="prof-curriculum-warning prof-collective-warning"><span class="prof-warning-icon">${icon('warn')}</span><div><b>${tr('الكشف لم يكتمل بعد','Le relevé n’est pas encore complet')}</b><p>${tr('مجموع معاملات المواد المضافة هو ','Le total des coefficients ajoutés est de ')}<strong dir="ltr">${esc(curriculumProgressText(data))}</strong>.<br>${tr('يثبت المعدل والترتيب الرسميان عند اكتمال معاملات مواد القسم.','La moyenne et le classement officiels seront établis lorsque tous les coefficients de la classe seront complets.')}</p></div></div>`:'';
  body.innerHTML=`
   <div class="prof-results-summary prof-collective-summary">
    <article class="stat-subjects"><span>${icon('book')}</span><div><small>${tr('المواد','Matières')}</small><strong>${data.subjects.length}</strong></div></article>
    <article class="stat-members"><span>${icon('group')}</span><div><small>${tr('الأساتذة المرتبطون','Professeurs liés')}</small><strong>${data.memberCount}</strong></div></article>
    <article class="stat-average"><span>${icon('chart')}</span><div><small>${avgLabel}</small><strong>${resultText(data.classAverage)}</strong></div></article>
    <article class="stat-complete"><span>${icon('check')}</span><div><small>${tr('نتائج مكتملة','Résultats complets')}</small><strong>${data.completeStudents}/${data.totalStudents}</strong></div></article>
   </div>
   ${warning}
   <div class="prof-collective-section-title"><span>${icon('group')}</span><b>${tr('الفصل','Classe')} – ${esc(profClass(data.className))}</b></div>
   <div class="prof-results-print-actions prof-collective-print-actions">
    <button id="pv2PrintAllStudents">${icon('print')}<b>${tr('كشوف التلاميذ الرسمية – طالب واحد لكل A4','Bulletins officiels – 1 élève par A4')}</b></button>
    <button class="primary" id="pv2PrintClass">${icon('file')}<b>${tr('اللائحة الجماعية / PDF','Liste collective / PDF')}</b></button>
   </div>
   <div class="prof-collective-roster"><table><thead><tr><th>#</th><th>${tr('اسم التلميذ','Nom de l’élève')}</th></tr></thead><tbody>${studentRows||`<tr><td colspan="2">${tr('لا يوجد تلاميذ في القسم.','Aucun élève dans cette classe.')}</td></tr>`}</tbody></table></div>
  `;
  q('#pv2PrintClass',body).onclick=()=>printClassList(data);
  q('#pv2PrintAllStudents',body).onclick=()=>printAllStudentBulletins(data)
 }catch(e){
  const body=q('#pv2ResultsBody',el);if(body)body.innerHTML=`<div class="professor-empty compact"><p>${tr('تعذر تحميل النتائج. أعد المحاولة.','Impossible de charger les résultats. Réessayez.')}</p></div>`
 }
}

function chooseAccountType(user){
 hideLegacy();const el=root();el.innerHTML=`<div class="professor-choice"><div class="professor-choice-card"><img src="/nataiji-brand-mark.png" width="76" height="76" alt=""><small>${tr('إعداد الحساب لأول مرة','Configuration initiale')}</small><h1>${tr('كيف ستستخدم نتائجي؟','Comment utiliserez-vous Nataiji ?')}</h1><p>${tr('اختر مرة واحدة نوع حسابك. نظام المعلمين الحالي يبقى كما هو.','Choisissez une seule fois votre type de compte. Le système actuel des enseignants reste inchangé.')}</p><div class="professor-choice-grid"><button data-profile-type="teacher"><span>👨‍🏫</span><b>${tr('معلم','Enseignant')}</b><small>${tr('النظام الحالي للأقسام والفصول والنتائج','Système actuel des classes, trimestres et résultats')}</small></button><button data-profile-type="professor" class="featured"><span>🎓</span><b>${tr('أستاذ','Professeur')}</b><small>${tr('عدة مواد وأقسام، اختبار واحد وامتحان واحد لكل فصل','Plusieurs matières/classes, une interrogation et une composition par trimestre')}</small></button></div><p class="professor-choice-msg"></p></div></div>`;
 qa('[data-profile-type]',el).forEach(b=>b.onclick=async()=>{qa('[data-profile-type]',el).forEach(x=>x.disabled=true);const type=b.dataset.profileType,msg=q('.professor-choice-msg',el);try{const r=await api('/api/account/profile-type',{method:'POST',body:JSON.stringify({type})});currentUser=r.user;if(type==='professor')return renderProfessor(r.user);showLegacy();return startApp()}catch{msg.textContent=tr('تعذر حفظ الاختيار. أعد المحاولة.','Impossible d’enregistrer le choix. Réessayez.');qa('[data-profile-type]',el).forEach(x=>x.disabled=false)}});return true
}
async function renderProfessor(user){professorUser=user;syncProfessorLanguage();hideLegacy();const el=root();el.innerHTML=`<div class="professor-loading"><img src="/nataiji-brand-mark.png" width="64" height="64" alt=""><p>${tr('جاري تجهيز فضاء الأستاذ…','Préparation de l’espace professeur…')}</p></div>`;try{await refreshProfile();currentView='home';renderHome()}catch{el.innerHTML=`<div class="professor-loading"><h2>${tr('تعذر تحميل حساب الأستاذ','Impossible de charger le compte professeur')}</h2><button class="primary" onclick="location.reload()">${tr('إعادة المحاولة','Réessayer')}</button></div>`}}
async function logout(){try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}currentUser=null;location.reload()}
window.NataijiProfessor={activate(user){if(user?.needsProfileChoice===true)return chooseAccountType(user);if(user?.role==='professor'||user?.profileType==='professor')return renderProfessor(user);return false},_calculateTerm:termResult,_calculateAnnual:annualSubjectResult,_ownListLandscape:professorOwnListLandscape,_classListLandscape:professorClassListLandscape};
})();