(()=>{
'use strict';

const TERM_AR=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const TERM_FR={'الفصل الأول':'1er trimestre','الفصل الثاني':'2e trimestre','الفصل الثالث':'3e trimestre'};
const SEX_FR={'ذكر':'Garçon','أنثى':'Fille'};
const NAME_FR={
  'محمد':'Mohamed','أحمد':'Ahmed','احمد':'Ahmed','محمود':'Mahmoud','عبد الله':'Abdallahi','عبدالله':'Abdallahi',
  'عبد الرحمن':'Abderrahmane','فاطمة':'Fatimetou','خديجة':'Khadijetou','عائشة':'Aïcha','مريم':'Mariam','سارة':'Sara',
  'ياسين':'Yacine','إبراهيم':'Ibrahim','ابراهيم':'Ibrahim','علي':'Ali','سالم':'Salem','أمينة':'Amina','خالد':'Khaled'
};
const MODAL_FR={
  'إضافة تلميذ':'Ajouter un élève','اسم التلميذ':'Nom de l’élève','الجنس':'Sexe','تاريخ الميلاد':'Date de naissance',
  'إضافة التلميذ':'Ajouter l’élève','إعدادات المدرسة':'Paramètres de l’école','اسم المعلم في الكشف':'Nom de l’enseignant sur le bulletin',
  'اسم المدرسة':'Nom de l’école','الإدارة الجهوية':'Direction régionale','المفتشية':'Inspection','السنة الدراسية':'Année scolaire',
  'اسم القسم':'Nom de la classe','حفظ':'Enregistrer','المواد والمعاملات':'Matières et coefficients','مادة جديدة':'Nouvelle matière',
  '+ مادة جديدة':'+ Nouvelle matière','حفظ المواد':'Enregistrer les matières','رأسية الوثائق الرسمية':'En-tête des documents officiels',
  'البسملة':'Basmala','الجمهورية':'République','الوزارة':'Ministère','الرقم المدرسي للمؤسسة':'N° scolaire de l’établissement',
  'الشعار الوطني النصي':'Devise nationale','اسم المدير':'Nom du directeur','حفظ الرأسية':'Enregistrer l’en-tête',
  'إعدادات تقييم التلاميذ':'Paramètres d’évaluation des élèves','تفعيل التقييم التلقائي':'Activer l’évaluation automatique',
  'يظهر تقييم واحد فقط لكل تلميذ اعتمادًا على المعدل العام. ويمكن تعديل الحدود والتسميات.':'Une seule appréciation est affichée par élève selon la moyenne générale. Les seuils et libellés sont modifiables.',
  'إلى':'à','حفظ التغييرات':'Enregistrer les modifications','جارٍ الحفظ...':'Enregistrement…','تعذر الحفظ':'Échec de l’enregistrement',
  'راجع الحدود: يجب أن تكون مرتبة وغير متداخلة بين 0 و20':'Vérifiez les seuils : ils doivent être ordonnés, non chevauchants et compris entre 0 et 20',
  '✓ تم حفظ سلم التقييم':'✓ Échelle d’évaluation enregistrée','أدخل الرقم المدرسي والاسم':'Saisissez le NNS et le nom',
  'الرقم المدرسي موجود مسبقًا':'Ce NNS existe déjà','ذكر':'Garçon','أنثى':'Fille'
};

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const language=()=>localStorage.getItem('nataiji-lang')||'ar';
function getState(){try{return typeof state==='undefined'?null:state}catch{return null}}
function getUser(){try{return typeof currentUser==='undefined'?null:currentUser}catch{return null}}
function translit(v){
  const raw=String(v||'').trim(); if(!raw)return'';
  const m={'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'ch','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'ou','ؤ':'ou','ي':'i','ى':'a','ئ':'i','ء':'',' ':' ','-':'-'};
  let out=''; for(const ch of raw.replace(/[ًٌٍَُِّْـ]/g,'')) out+=m[ch]??ch;
  return out.replace(/\s+/g,' ').trim().replace(/(^|\s)([a-zà-ÿ])/g,(x,a,b)=>a+b.toUpperCase());
}
function latinName(v){
  const raw=String(v||'').trim(); if(!raw)return'';
  if(NAME_FR[raw])return NAME_FR[raw];
  return raw.split(/\s+/).map(x=>NAME_FR[x]||translit(x)).join(' ');
}
function dynamicText(el,value){if(!el)return;el.dataset.dynamicLang='1';if(el.textContent!==String(value??''))el.textContent=String(value??'')}

function syncTerm(){
  const sel=q('#term'),s=getState(); if(!sel||!s)return;
  const current=TERM_AR.includes(s.term)?s.term:(TERM_AR[sel.selectedIndex]||TERM_AR[0]);
  const fr=language()==='fr';
  if(sel.options.length!==TERM_AR.length){sel.innerHTML='';TERM_AR.forEach(ar=>sel.add(new Option(fr?TERM_FR[ar]:ar,ar)))}
  [...sel.options].forEach((o,i)=>{const ar=TERM_AR[i];o.value=ar;o.dataset.dynamicLang='1';o.dataset.termAr=ar;o.textContent=fr?TERM_FR[ar]:ar});
  sel.value=current;
  sel.dataset.dynamicLang='1';
}

function syncNames(){
  const s=getState(); if(!s)return; const fr=language()==='fr';
  const u=getUser(),teacher=u?.name||s.teacher||'';
  const tn=q('#teacherName');
  if(tn?.firstChild){tn.dataset.dynamicLang='1';const v=fr?latinName(teacher):teacher;if(tn.firstChild.nodeValue!==v)tn.firstChild.nodeValue=v}
  dynamicText(q('#welcomeName'),fr?latinName(teacher):teacher);
  qa('#mobileScores .score-row').forEach((row,i)=>{const p=s.pupils?.[i],b=q('span b',row);if(p&&b)dynamicText(b,`${i+1}. ${fr?(p[4]||latinName(p[1])):p[1]}`)});
  qa('#scores tr').forEach((row,i)=>{const p=s.pupils?.[i];if(p&&row.cells?.[1])dynamicText(row.cells[1],fr?(p[4]||latinName(p[1])):p[1])});
  qa('#list tr').forEach((row,i)=>{const p=s.pupils?.[i];if(!p)return;if(row.cells?.[2])dynamicText(row.cells[2],fr?(p[4]||latinName(p[1])):p[1]);if(row.cells?.[3])dynamicText(row.cells[3],fr?(SEX_FR[p[2]]||p[2]):p[2])});
  qa('#student option').forEach((o,i)=>{const p=s.pupils?.[i];if(p){o.dataset.dynamicLang='1';o.textContent=fr?(p[4]||latinName(p[1])):p[1]}});
}

function translateModal(modal){
  if(!modal)return; const fr=language()==='fr';
  const walker=document.createTreeWalker(modal,NodeFilter.SHOW_TEXT); let n;
  while(n=walker.nextNode()){
    const p=n.parentElement;if(!p||p.closest('script,style'))continue;
    const trimmed=n.nodeValue.trim();if(!trimmed)continue;
    if(n.__nataijiAr===undefined)n.__nataijiAr=trimmed;
    const ar=n.__nataijiAr;
    if(MODAL_FR[ar]){
      const replacement=fr?MODAL_FR[ar]:ar;
      n.nodeValue=n.nodeValue.replace(trimmed,replacement);
      p.dataset.dynamicLang='1';
    }
  }
  qa('option',modal).forEach(o=>{
    if(!o.dataset.modalAr){const t=o.textContent.trim();if(t==='ذكر'||t==='أنثى')o.dataset.modalAr=t}
    const ar=o.dataset.modalAr;if(!ar)return;o.value=ar;o.dataset.dynamicLang='1';o.textContent=fr?SEX_FR[ar]:ar;
  });
}

function enforceFooter(root){
  if(!root)return; let footer=q('footer',root);if(!footer){footer=document.createElement('footer');root.appendChild(footer)}
  const fr=language()==='fr';footer.className='official-signatures';footer.dataset.dynamicLang='1';
  footer.innerHTML=fr
    ?'<b>Signature de l’enseignant(e)</b><b>Signature du directeur adjoint</b><b>Signature du directeur</b>'
    :'<b>توقيع المعلم(ة)</b><b>توقيع الوكيل</b><b>توقيع المدير</b>';
  qa('b',footer).forEach(x=>x.dataset.dynamicLang='1');
}
function syncFooters(){enforceFooter(q('#officialSheet'));qa('#printBatch .batch-sheet').forEach(enforceFooter)}

function apply(){syncTerm();syncNames();qa('.modal').forEach(translateModal);syncFooters()}

const style=document.createElement('style');style.id='nataiji-professional-ui-fix';style.textContent=`
.official-sheet footer.official-signatures,.batch-sheet footer.official-signatures{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:8mm!important;align-items:end!important;margin-top:6mm!important;padding-top:0!important;text-align:center!important;direction:ltr!important;width:100%!important}
.official-signatures>b{display:block!important;font-weight:700!important;text-align:center!important;min-height:10mm!important;border:0!important;direction:rtl!important}
.lang-fr .official-signatures>b{direction:ltr!important}
@media print{.official-sheet footer.official-signatures,.batch-sheet footer.official-signatures{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:6mm!important;margin-top:4mm!important;font-size:8pt!important}.batch-page.two .batch-sheet footer.official-signatures{margin-top:1.3mm!important;font-size:6.4pt!important;gap:3mm!important}.batch-page.two .batch-sheet .official-signatures>b{min-height:6mm!important}}
`;document.head.appendChild(style);

let timer=null,applying=false;function schedule(delay=20){if(applying)return;clearTimeout(timer);timer=setTimeout(()=>{applying=true;try{apply()}finally{applying=false}},delay)}
new MutationObserver(()=>schedule(30)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('#langSwitch,#addStudent,#settingsBtn,#subjectsBtn,#evaluationBtn,#printHeaderBtn,#printResult'))schedule(80)},true);
document.addEventListener('change',e=>{if(e.target.matches?.('#term,#subjectPicker,#student'))schedule(20)},true);
window.addEventListener('beforeprint',()=>{apply();syncFooters()});
window.addEventListener('DOMContentLoaded',()=>schedule(180));
setTimeout(()=>schedule(0),0);
})();
