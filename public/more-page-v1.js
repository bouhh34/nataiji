(()=> {
'use strict';
if(window.__nataijiMorePageV1)return;
window.__nataijiMorePageV1=true;

const q=(s,r=document)=>r.querySelector(s);
const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const GROUPS=[
  {
    key:'academic',
    icon:'book-open',
    ar:'الإعدادات الأكاديمية',
    fr:'Paramètres académiques',
    subAr:'إدارة المحتوى الدراسي',
    subFr:'Gérez le contenu scolaire',
    ids:['structureBtn','subjectsBtn','schoolYearArchiveBtn']
  },
  {
    key:'collaboration',
    icon:'users',
    ar:'التعاون والمشاركة',
    fr:'Collaboration et partage',
    subAr:'تواصل مع فريقك وشارك الموارد',
    subFr:'Travaillez avec votre équipe et partagez les accès',
    ids:['inviteBtn','sharesBtn','joinInviteBtn']
  },
  {
    key:'account',
    icon:'briefcase',
    ar:'إدارة الحساب والمدرسة',
    fr:'Compte et école',
    subAr:'معلوماتك وإعدادات مدرستك',
    subFr:'Vos informations et réglages',
    ids:['ownerDashboardBtn','langSwitch','schoolsBtn','settingsBtn','subscriptionBtn','installAppBtn','shareAppBtn','supportBtn','changePasswordBtn','privacyPolicyBtn','termsPolicyBtn','logoutBtn','deleteAccountBtn']
  }
];

/* Presentation-only icons for cards not covered by the existing luxury icon layer.
   Reuse the original card nodes and click handlers; no extra controls are introduced. */
const MORE_ICONS=Object.freeze({
  structureBtn:'layers', subjectsBtn:'book-open',
  schoolYearArchiveBtn:'archive', teacherTimetableMoreBtn:'calendar',
  koutoubiResourcesBtn:'book-open', inviteBtn:'user-plus',
  sharesBtn:'share-2',joinInviteBtn:'link',ownerDashboardBtn:'shield',
  langSwitch:'globe',schoolsBtn:'briefcase',settingsBtn:'settings',
  subscriptionBtn:'credit-card',installAppBtn:'download',
  shareAppBtn:'share-2',supportBtn:'message-circle',
  changePasswordBtn:'lock',privacyPolicyBtn:'shield',
  termsPolicyBtn:'file-text',logoutBtn:'log-out',deleteAccountBtn:'trash-2'
});
function ensureCardIcon(card){
  const title=card.querySelector(':scope > b');
  const icon=MORE_ICONS[card.id];
  if(!title||!icon||title.querySelector(':scope > svg, :scope > [data-feather], :scope > .lux-feather'))return;
  const mark=document.createElement('i');
  mark.dataset.feather=icon;
  mark.setAttribute('aria-hidden','true');
  title.prepend(mark);
}

let timer=0,applying=false;
function hero(page){
  let h=q('.nataiji-more-hero',page);
  if(!h){
    h=document.createElement('section');
    h.className='nataiji-more-hero';
    h.innerHTML='<div class="nataiji-more-hero-copy"><small></small><h1></h1><p></p></div><div class="nataiji-more-hero-mark" aria-hidden="true"><i data-feather="grid"></i></div>';
    page.prepend(h);
  }
  setText(q('small',h),fr()?'OUTILS & RÉGLAGES':'أدوات وإعدادات');
  setText(q('h1',h),fr()?'Plus':'المزيد');
  setText(q('p',h),fr()?'Tout ce qu’il faut pour gérer votre école simplement.':'كل ما تحتاجه لإدارة مدرستك بسهولة ومن مكان واحد.');
}
function heading(group){
  let h=document.getElementById('moreGroup-'+group.key);
  if(!h){
    h=document.createElement('div');
    h.id='moreGroup-'+group.key;
    h.className='more-group-heading more-group-'+group.key;
    h.dataset.moreHeading=group.key;
    h.innerHTML='<span class="more-group-heading-icon"><i data-feather="'+group.icon+'"></i></span><span class="more-group-heading-copy"><b></b><small></small></span>';
  }
  setText(q('b',h),fr()?group.fr:group.ar);
  setText(q('small',h),fr()?group.subFr:group.subAr);
  return h;
}
/* Isolate Arabic and French without changing the timetable card action or its icon. */
function organizeTimetableTitle(card){
  const title=card.querySelector(':scope > b');
  if(!title)return;
  let label=title.querySelector(':scope > .nt-more-timetable-label');
  if(!label){
    // Preserve injected SVG icons and other controls; only replace text nodes.
    if(!/استعمال الزمن|Emploi du temps/.test(title.textContent||''))return;
    [...title.childNodes].filter(node=>node.nodeType===3).forEach(node=>node.remove());
    label=document.createElement('span');
    label.className='nt-more-timetable-label';
    const ar=document.createElement('span');
    ar.lang='ar';ar.dir='rtl';ar.textContent='استعمال الزمن';
    const sep=document.createElement('span');
    sep.className='nt-more-timetable-divider';sep.textContent='/';sep.setAttribute('aria-hidden','true');
    const french=document.createElement('span');
    french.lang='fr';french.dir='ltr';french.textContent='Emploi du temps';
    label.append(ar,sep,french);
    title.append(label);
  }
  const direction=fr()?'ltr':'rtl';
  if(label.dir!==direction)label.dir=direction;
}

/* Translate only known, static teacher More-card descriptions.
   Dynamic role-dependent copy, rich links and modal content remain untouched. */
const MORE_DESCRIPTION_COPY=Object.freeze({
  structureBtn:['إدارة الأقسام مع الفصول الدراسية الثلاثة الثابتة','Gérer les classes avec les trois trimestres fixes'],
  subjectsBtn:['تحديد درجة كل مادة والمجموع العام','Définir la note maximale de chaque matière et le total général'],
  schoolYearArchiveBtn:['حفظ النتائج السابقة وتنزيلها دون تغييرها','Conserver et exporter les résultats sans les modifier'],
  teacherTimetableMoreBtn:['الجدول الرسمي وتخصيص حصص القسم • طباعة PDF','Emploi du temps officiel et adaptation des séances • Impression PDF'],
  koutoubiResourcesBtn:['كتبي الرسمي • اختر السنة الدراسية','Koutoubi officiel • Choisissez l’année'],
  inviteBtn:['إنشاء رمز دعوة للقسم','Créer un code d’invitation pour la classe'],
  sharesBtn:['عرض من لديه وصول وإلغاء الصلاحية عند الحاجة','Voir les accès accordés et les retirer si nécessaire'],
  joinInviteBtn:['أضف قسمًا أو مواد جديدة إلى حسابك الحالي دون تسجيل الخروج','Ajoutez une classe ou de nouvelles matières à votre compte sans vous déconnecter'],
  schoolsBtn:['إضافة مساحة عمل أو الانتقال بين مساحات حسابك','Ajouter un espace de travail ou changer d’espace'],
  settingsBtn:['بيانات المدرسة والسنة الدراسية','Données de l’école et année scolaire'],
  shareAppBtn:['شارك نتائجي مع زملائك المعلمين','Partagez Nataiji avec vos collègues enseignants'],
  supportBtn:['تواصل مع إدارة تطبيق نتائجي أو أرسل ملاحظة','Contacter l’administration de Nataiji ou envoyer une remarque'],
  changePasswordBtn:['حماية حسابك وإنهاء الجلسات الأخرى','Protégez votre compte et fermez les autres sessions'],
  privacyPolicyBtn:['كيف نحمي بياناتك','Comment nous protégeons vos données'],
  termsPolicyBtn:['قواعد استخدام نتائجي','Règles d’utilisation de Nataiji'],
  logoutBtn:['إنهاء الجلسة الحالية','Fermer la session actuelle']
});
function localizeKnownMoreDescription(card){
  const copy=MORE_DESCRIPTION_COPY[card.id],subtitle=card.querySelector(':scope > span');
  if(!copy||!subtitle||subtitle.children.length)return;
  const existing=subtitle.textContent.trim();
  // Do not overwrite other components' customized or contextual descriptions.
  if(existing!==copy[0]&&existing!==copy[1])return;
  setText(subtitle,fr()?copy[1]:copy[0]);
}

function decorateCard(card,key){
  card.dataset.moreGroup=key;
  card.classList.add('more-row-card','more-row-'+key);
  ensureCardIcon(card);
  localizeKnownMoreDescription(card);
  if(card.id==='teacherTimetableMoreBtn')organizeTimetableTitle(card);
  if(card.id==='langSwitch'){
    const title=card.querySelector(':scope > b');
    if(title&&!title.querySelector(':scope > .lux-feather,:scope > [data-feather],:scope > svg')){
      const icon=document.createElement('i');
      icon.className='lux-feather';
      icon.dataset.feather='globe';
      title.prepend(icon);
    }
  }
  if(['supportBtn','changePasswordBtn','privacyPolicyBtn','termsPolicyBtn','installAppBtn','shareAppBtn','deleteAccountBtn','logoutBtn'].includes(card.id)){
    card.classList.add('more-row-compact');
  }
  if(['deleteAccountBtn','logoutBtn'].includes(card.id))card.classList.add('more-row-danger');
}
function sameOrder(grid,nodes){
  const current=[...grid.children];
  return current.length===nodes.length&&current.every((n,i)=>n===nodes[i]);
}
function apply(){
  if(applying)return;
  const page=q('[data-page="more"]'),grid=q('.settings-grid',page);
  if(!page||!grid)return;
  applying=true;
  try{
    page.classList.add('nataiji-more-page');
    grid.classList.add('nataiji-more-grid');
    hero(page);
    // Account verification can finish after DOMContentLoaded: mount only once
    // the authenticated admin workspace is actually being organized.
    window.nataijiMountSchoolYearArchive?.();

    const allCards=[...grid.querySelectorAll(':scope > .menu-card')];
    const known=new Set(GROUPS.flatMap(g=>g.ids));
    const unknown=allCards.filter(x=>!known.has(x.id));

    const nodes=[];
    GROUPS.forEach((g,gi)=>{
      const cards=g.ids.map(id=>document.getElementById(id)).filter(x=>x&&x.parentElement===grid);
      if(gi===0)cards.push(...unknown.filter(x=>x.parentElement===grid));
      if(!cards.length)return;
      const h=heading(g);
      nodes.push(h);
      cards.forEach(c=>{decorateCard(c,g.key);nodes.push(c)});
    });

    [...grid.querySelectorAll(':scope > .more-group-heading')].forEach(h=>{
      if(!nodes.includes(h))h.remove();
    });

    if(!sameOrder(grid,nodes)){
      const frag=document.createDocumentFragment();
      nodes.forEach(n=>frag.appendChild(n));
      grid.appendChild(frag);
    }

    if(window.feather&&document.querySelector('i[data-feather]'))window.feather.replace({class:'lux-feather','stroke-width':1.9});
  }finally{applying=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(apply,32)}
const observer=new MutationObserver(schedule);

function start(){
  apply();
  const page=q('[data-page="more"]');
  if(page)observer.observe(page,{childList:true,subtree:true});
  setTimeout(apply,350);
  setTimeout(apply,900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,180));
else setTimeout(start,180);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="more"]'))requestAnimationFrame(apply)},true);
window.addEventListener('storage',e=>{if(e.key==='nataiji-lang')setTimeout(apply,80)});
// Only throttle accidental rapid double taps on non-destructive dialog launchers.
// This does not delay the first click or intercept grades, reports, account actions,
// links, professor screens, or keyboard/screen-reader activations.
let lastMoreOpen=null,lastMoreOpenAt=0;
document.addEventListener('click',event=>{
  if(document.documentElement.classList.contains('nataiji-professor-mode')||event.detail===0)return;
  const card=event.target.closest?.('#koutoubiResourcesBtn,#schoolYearArchiveBtn,#teacherTimetableMoreBtn');
  if(!card||!card.closest('[data-page="more"]'))return;
  const now=Date.now();
  if(card===lastMoreOpen&&now-lastMoreOpenAt<500){
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  lastMoreOpen=card;
  lastMoreOpenAt=now;
},true);
})();