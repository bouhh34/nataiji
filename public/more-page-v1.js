(()=> {
'use strict';
if(window.__nataijiMorePageV1)return;
window.__nataijiMorePageV1=true;

const q=(s,r=document)=>r.querySelector(s);
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const GROUPS=[
  {
    key:'account',
    icon:'briefcase',
    ar:'إدارة الحساب والمدرسة',
    fr:'Compte et école',
    subAr:'معلوماتك وإعدادات مدرستك',
    subFr:'Vos informations et réglages',
    ids:['ownerDashboardBtn','langSwitch','schoolsBtn','settingsBtn','subscriptionBtn','installAppBtn','supportBtn','changePasswordBtn','privacyPolicyBtn','termsPolicyBtn','logoutBtn','deleteAccountBtn']
  },
  {
    key:'academic',
    icon:'book-open',
    ar:'الإعدادات الأكاديمية',
    fr:'Paramètres académiques',
    subAr:'إدارة المحتوى الدراسي',
    subFr:'Gérez le contenu scolaire',
    ids:['structureBtn','subjectsBtn']
  },
  {
    key:'collaboration',
    icon:'users',
    ar:'التعاون والمشاركة',
    fr:'Collaboration et partage',
    subAr:'تواصل مع فريقك وشارك الموارد',
    subFr:'Travaillez avec votre équipe et partagez les accès',
    ids:['inviteBtn','sharesBtn','joinInviteBtn']
  }
];

let timer=0,applying=false;
function hero(page){
  let h=q('.nataiji-more-hero',page);
  if(!h){
    h=document.createElement('section');
    h.className='nataiji-more-hero';
    h.innerHTML='<div class="nataiji-more-hero-copy"><small></small><h1></h1><p></p></div><div class="nataiji-more-hero-mark" aria-hidden="true"><i data-feather="grid"></i></div>';
    page.prepend(h);
  }
  q('small',h).textContent=fr()?'OUTILS & RÉGLAGES':'أدوات وإعدادات';
  q('h1',h).textContent=fr()?'Plus':'المزيد';
  q('p',h).textContent=fr()?'Tout ce qu’il faut pour gérer votre école simplement.':'كل ما تحتاجه لإدارة مدرستك بسهولة ومن مكان واحد.';
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
  q('b',h).textContent=fr()?group.fr:group.ar;
  q('small',h).textContent=fr()?group.subFr:group.subAr;
  return h;
}
function decorateCard(card,key){
  card.dataset.moreGroup=key;
  card.classList.add('more-row-card','more-row-'+key);
  if(['supportBtn','changePasswordBtn','privacyPolicyBtn','termsPolicyBtn','installAppBtn','deleteAccountBtn','logoutBtn'].includes(card.id)){
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

    if(window.feather)window.feather.replace({class:'lux-feather','stroke-width':1.9});
  }finally{applying=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(apply,90)}
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
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="more"]'))setTimeout(apply,120)},true);
window.addEventListener('storage',e=>{if(e.key==='nataiji-lang')setTimeout(apply,80)});
})();