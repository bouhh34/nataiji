(()=>{
'use strict';

const BASMALA='بسم الله الرحمن الرحيم';
const NAME_FR={
  'محمد':'Mohamed','أحمد':'Ahmed','احمد':'Ahmed','محمود':'Mahmoud','عبد الله':'Abdallahi','عبدالله':'Abdallahi',
  'عبد الرحمن':'Abderrahmane','فاطمة':'Fatimetou','خديجة':'Khadijetou','عائشة':'Aïcha','مريم':'Mariam','سارة':'Sara',
  'ياسين':'Yacine','إبراهيم':'Ibrahim','ابراهيم':'Ibrahim','علي':'Ali','سالم':'Salem','أمينة':'Amina','خالد':'Khaled'
};
const SUBJECT_FR={
  'التربية الإسلامية':'Éducation islamique','اللغة العربية':'Langue arabe','القراءة':'Lecture','التعبير':'Expression',
  'الكتابة':'Écriture','الرياضيات':'Mathématiques','التربية المدنية':'Éducation civique','التربية الفنية':'Éducation artistique',
  'الرياضة':'Éducation physique','التربية البدنية':'Éducation physique','التاريخ والجغرافيا':'Histoire et géographie',
  'اللغة الفرنسية':'Langue française','العلوم الطبيعية':'Sciences naturelles'
};
const SEX_FR={'ذكر':'Garçon','أنثى':'Fille'};
let timer=null;

const q=s=>document.querySelector(s);
const qa=s=>[...document.querySelectorAll(s)];
const language=()=>localStorage.getItem('nataiji-lang')||'ar';
function getState(){try{return typeof state==='undefined'?null:state}catch{return null}}
function getUser(){try{return typeof currentUser==='undefined'?null:currentUser}catch{return null}}
function latinName(v){
  const raw=String(v||'').trim();
  if(NAME_FR[raw]) return NAME_FR[raw];
  return raw.split(/\s+/).map(x=>NAME_FR[x]||x).join(' ');
}
function classFr(v){
  return String(v||'')
    .replace('السنة الأولى ابتدائية','1re année primaire')
    .replace('السنة الثانية ابتدائية','2e année primaire')
    .replace('السنة الثالثة ابتدائية','3e année primaire')
    .replace('السنة الرابعة ابتدائية','4e année primaire')
    .replace('السنة الخامسة ابتدائية','5e année primaire')
    .replace('السنة السادسة ابتدائية','6e année primaire');
}
function subjectFr(s){return s?.[2]||SUBJECT_FR[s?.[0]]||s?.[0]||''}
function setDynamic(el,ar,fr){
  if(!el)return;
  el.dataset.dynamicLang='1';
  const value=language()==='fr'?fr:ar;
  if(el.textContent!==String(value??''))el.textContent=String(value??'');
}

function enforceBasmala(){
  qa('.doc-basmala').forEach(el=>{
    if(el.textContent!==BASMALA) el.textContent=BASMALA;
    if(el.lang!=='ar') el.lang='ar';
    if(el.dir!=='rtl') el.dir='rtl';
    if(el.dataset.dynamicLang!=='1') el.dataset.dynamicLang='1';
    el.setAttribute('aria-label',BASMALA);
  });
}

function syncDynamicLanguage(){
  const st=getState();
  if(!st)return;
  const fr=language()==='fr';
  const user=getUser();
  const teacher=user?.name||st.teacher||'';

  setDynamic(q('#welcomeName'),teacher,latinName(teacher));
  const teacherNode=q('#teacherName');
  if(teacherNode?.firstChild){
    const wanted=fr?latinName(teacher):teacher;
    if(teacherNode.firstChild.nodeValue!==wanted)teacherNode.firstChild.nodeValue=wanted;
  }
  const role=q('#teacherName small');
  if(role){
    const admin=user?.role==='admin';
    setDynamic(role,admin?'مدير / صلاحيات كاملة':'معلم / إدخال النتائج',admin?'Directeur / accès complet':'Enseignant / saisie des notes');
  }

  const classSelect=q('#classTop');
  const selectedClass=classSelect?.selectedOptions?.[0]||classSelect?.options?.[0];
  if(selectedClass)setDynamic(selectedClass,st.className||selectedClass.textContent,classFr(st.className||selectedClass.textContent));

  qa('#subjectPicker option').forEach((o,i)=>{const s=st.subjects?.[i];if(s)setDynamic(o,s[0],subjectFr(s))});
  qa('#subjectProgress>div').forEach((row,i)=>{
    const s=st.subjects?.[i],sp=row.querySelector('span');
    if(!s||!sp)return;
    const small=sp.querySelector('small'),suffix=small?.textContent||'';
    sp.dataset.dynamicLang='1';
    if(sp.firstChild)sp.firstChild.nodeValue=fr?subjectFr(s):s[0];
    if(small)small.textContent=suffix;
  });

  qa('#list tr').forEach((r,i)=>{
    const p=st.pupils?.[i];if(!p)return;
    if(r.cells?.[2])setDynamic(r.cells[2],p[1],p[4]||latinName(p[1]));
    if(r.cells?.[3])setDynamic(r.cells[3],p[2],SEX_FR[p[2]]||p[2]);
  });
  qa('#student option').forEach((o,i)=>{const p=st.pupils?.[i];if(p)setDynamic(o,p[1],p[4]||latinName(p[1]))});

  const studentSelect=q('#student');
  const pupilIndex=Math.max(0,studentSelect?.selectedIndex??0);
  const pupil=st.pupils?.[pupilIndex];
  if(pupil)setDynamic(q('#sheetName'),pupil[1],pupil[4]||latinName(pupil[1]));
  qa('#sheet tr').forEach((r,i)=>{const s=st.subjects?.[i];if(s&&r.cells?.[0])setDynamic(r.cells[0],s[0],subjectFr(s))});

  qa('#paperList tr').forEach((r,i)=>{
    const p=st.pupils?.[i];if(!p)return;
    if(r.cells?.[2])setDynamic(r.cells[2],p[1],p[4]||latinName(p[1]));
    if(r.cells?.[3])setDynamic(r.cells[3],p[2],SEX_FR[p[2]]||p[2]);
  });
  qa('#paperResults tbody tr').forEach((r,i)=>{
    const p=st.pupils?.[i];if(p&&r.cells?.[1])setDynamic(r.cells[1],p[1],p[4]||latinName(p[1]));
  });

  const portalType=document.body.dataset.portalType;
  if(portalType){
    qa('#printPortal .portal-paper tbody tr').forEach((r,i)=>{
      const p=st.pupils?.[i];if(!p)return;
      if(portalType==='list'){
        if(r.cells?.[2])setDynamic(r.cells[2],p[1],p[4]||latinName(p[1]));
        if(r.cells?.[3])setDynamic(r.cells[3],p[2],SEX_FR[p[2]]||p[2]);
      }else if(portalType==='class'&&r.cells?.[1])setDynamic(r.cells[1],p[1],p[4]||latinName(p[1]));
    });
  }

  qa('#printBatch .batch-sheet').forEach((sheet,i)=>{
    const p=st.pupils?.[i];if(!p)return;
    const name=sheet.querySelector('h3');
    if(name)setDynamic(name,p[1],p[4]||latinName(p[1]));
    sheet.querySelectorAll('.sheet tbody tr').forEach((r,j)=>{
      const s=st.subjects?.[j];if(s&&r.cells?.[0])setDynamic(r.cells[0],s[0],subjectFr(s));
    });
  });
}

function normalizeOfficialHeads(){
  qa('.paperhead.official-document-head,.official-head.enhanced-head').forEach(el=>{
    el.style.width='100%';
  });
}

function apply(){
  enforceBasmala();
  syncDynamicLanguage();
  normalizeOfficialHeads();
}

const style=document.createElement('style');
style.id='nataiji-final-report-layout';
style.textContent=`
.paperhead.official-document-head,.official-head.enhanced-head{display:block!important;width:100%!important;max-width:100%!important}
.doc-head{display:grid!important;grid-template-columns:minmax(0,1fr) 40mm minmax(0,1fr)!important;gap:4mm!important;align-items:start!important;width:100%!important;max-width:none!important}
.doc-right,.doc-left{min-width:0!important;overflow-wrap:break-word!important}
.doc-right{text-align:start!important}.doc-left{text-align:end!important}
.doc-center{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;min-width:0!important;text-align:center!important}
.doc-basmala{display:block!important;width:100%!important;margin:0 0 1mm!important;font-weight:700!important;font-size:9pt!important;line-height:1.35!important;text-align:center!important;direction:rtl!important;unicode-bidi:isolate!important;white-space:nowrap!important;font-family:Tahoma,Arial,sans-serif!important}
.doc-center img{display:block!important;width:24mm!important;height:24mm!important;object-fit:contain!important;margin:0 auto!important}
.lang-fr .doc-head{direction:ltr!important}.lang-fr .doc-right{text-align:left!important}.lang-fr .doc-left{text-align:right!important}.lang-fr .doc-basmala{direction:rtl!important;text-align:center!important}
.lang-switch{top:max(12px,env(safe-area-inset-top))!important;left:12px!important;right:auto!important}
.lang-fr .lang-switch{left:auto!important;right:12px!important}

@media(max-width:760px){
  .doc-head{grid-template-columns:minmax(0,1fr) 31% minmax(0,1fr)!important;gap:5px!important;font-size:9px!important;line-height:1.35!important}
  .doc-basmala{font-size:9px!important;white-space:normal!important;margin-bottom:3px!important}
  .doc-center img{width:58px!important;height:58px!important}
  .lang-switch{top:10px!important}
}

@media print{
  .lang-switch{display:none!important}
  .paperhead.official-document-head,.official-head.enhanced-head{display:block!important;width:100%!important;max-width:100%!important;margin:0 0 3.5mm!important}
  .doc-head{grid-template-columns:minmax(0,1fr) 38mm minmax(0,1fr)!important;gap:4mm!important;font-size:9.2pt!important;line-height:1.35!important}
  .doc-basmala{font-size:8.8pt!important;line-height:1.25!important;white-space:nowrap!important;margin-bottom:.8mm!important}
  .doc-center img{width:23mm!important;height:23mm!important}

  body[data-print="portal"] #printPortal{width:190mm!important}
  body[data-print="portal"] #printPortal .portal-paper{box-sizing:border-box!important;width:190mm!important;max-width:190mm!important;padding:5mm 6mm!important}
  body[data-print="portal"] #printPortal .paperhead.official-document-head{display:block!important;width:100%!important;margin-bottom:4mm!important}
  body[data-print="portal"] #printPortal .doc-head{grid-template-columns:minmax(0,1fr) 38mm minmax(0,1fr)!important;gap:4mm!important;width:100%!important;font-size:9.2pt!important;line-height:1.35!important}
  body[data-print="portal"] #printPortal .doc-basmala{font-size:8.8pt!important;white-space:nowrap!important}
  body[data-print="portal"] #printPortal .doc-center img{width:23mm!important;height:23mm!important}
  body[data-print="portal"] #printPortal h2{font-size:18pt!important;line-height:1.2!important;margin:4mm 0 5mm!important;text-align:center!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal table{font-size:10pt!important}
  body[data-print="portal"][data-portal-type="list"] #printPortal th,body[data-print="portal"][data-portal-type="list"] #printPortal td{height:8.5mm!important;padding:1.2mm!important;line-height:1.2!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal table{font-size:7.8pt!important}
  body[data-print="portal"][data-portal-type="class"] #printPortal th,body[data-print="portal"][data-portal-type="class"] #printPortal td{height:6.6mm!important;padding:.75mm!important;line-height:1.15!important}

  body[data-print="batch"] .batch-page.two .doc-head{grid-template-columns:minmax(0,1fr) 29mm minmax(0,1fr)!important;gap:2mm!important}
  body[data-print="batch"] .batch-page.two .doc-basmala{font-size:6.8pt!important;white-space:nowrap!important;margin-bottom:.4mm!important}
  body[data-print="batch"] .batch-page.two .doc-center img{width:17mm!important;height:17mm!important}
}
`;
document.head.appendChild(style);

new MutationObserver(()=>{
  clearTimeout(timer);
  timer=setTimeout(apply,0);
}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});

document.addEventListener('click',e=>{
  if(e.target.closest?.('#langSwitch')) setTimeout(apply,100);
},true);
document.addEventListener('change',()=>setTimeout(apply,20),true);
window.addEventListener('beforeprint',apply);
window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,50));
setTimeout(apply,0);
})();
