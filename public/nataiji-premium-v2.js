(()=> {
'use strict';
if(window.__nataijiPremiumV2)return;
window.__nataijiPremiumV2=true;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';

function icon(host,name,cls='npv2-icon'){
  if(!host||host.querySelector(':scope > .'+cls))return;
  const i=document.createElement('i');
  i.className=cls;
  i.setAttribute('data-feather',name);
  i.setAttribute('aria-hidden','true');
  host.prepend(i);
}
function replaceLegacyIcon(btn,name){
  if(!btn)return;
  const old=btn.querySelector(':scope > span');
  if(old&&/^[✎⌫]$/.test(old.textContent.trim()))old.remove();
  icon(btn,name,'npv2-action-icon');
}
function applyBrand(){
  const header=q('main > header'); if(!header)return;
  let brand=q('.npv2-brand',header);
  if(!brand){
    brand=document.createElement('div');
    brand.className='npv2-brand';
    brand.innerHTML='<img src="/nataiji-brand-mark.png" alt=""><span><b></b><small></small></span>';
    header.prepend(brand);
  }
  q('b',brand).textContent=fr()?'Nataiji':'نتائجي';
  q('small',brand).textContent=fr()?'Mon avenir commence ici':'مستقبلي يبدأ من هنا';
}
function applyHero(){
  const hero=q('[data-page="home"] .welcome'); if(!hero)return;
  if(!q('.npv2-hero-art',hero)){
    const img=document.createElement('img');
    img.className='npv2-hero-art';
    img.src='/nataiji-brand-mark.png';
    img.alt='';
    img.setAttribute('aria-hidden','true');
    hero.appendChild(img);
  }
  const cta=q('button',hero); icon(cta,'edit-3','npv2-button-icon');
}
function applyStats(){
  const map={statStudents:'users',statAverage:'bar-chart-2',statComplete:'check-circle',statNeeds:'alert-circle'};
  Object.entries(map).forEach(([id,name],idx)=>{
    const el=q('#'+id),card=el?.closest('article'); if(!card)return;
    card.classList.add('npv2-stat','npv2-stat-'+(idx+1));
    icon(card,name,'npv2-stat-icon');
  });
}
function applySections(){
  const configs=[
    ['[data-page="grades"] .section-head','edit-3'],
    ['[data-page="students"] .section-head','users'],
    ['[data-page="reports"] .section-head','printer']
  ];
  configs.forEach(([sel,name])=>{
    const head=q(sel),title=head?.querySelector('h2'); if(title)icon(title,name,'npv2-title-icon');
  });
}
function applyStudents(){
  qa('.student-mobile-actions .mobile-edit-pupil').forEach(b=>replaceLegacyIcon(b,'edit-3'));
  qa('.student-mobile-actions .mobile-delete-pupil').forEach(b=>replaceLegacyIcon(b,'trash-2'));
  const add=q('#addStudent'); icon(add,'user-plus','npv2-button-icon');
  const search=q('[data-page="students"] .pupil-tools input');
  if(search)search.classList.add('npv2-search');
}
function applyReports(){
  const tabs=qa('[data-page="reports"] .report-tabs button');
  const names=['user','users','list'];
  tabs.forEach((b,i)=>icon(b,names[i]||'file-text','npv2-tab-icon'));
  const print=q('#printResult'); icon(print,'printer','npv2-button-icon');
  qa('[data-page="reports"] .workflow-tools button').forEach(b=>{
    const t=(b.textContent||'').toLowerCase();
    const name=/pdf|شارك|partag/.test(t)?'share-2':/معاينة|aperçu/.test(t)?'eye':'file-text';
    icon(b,name,'npv2-button-icon');
  });
  qa('[data-page="reports"] .report-print').forEach(b=>icon(b,'printer','npv2-button-icon'));
}
function applySubjectTones(){
  qa('#subjectProgress > div').forEach((row,i)=>row.classList.add('npv2-subject-tone-'+((i%6)+1)));
}
function renderFeather(){
  if(window.feather&&document.querySelector('[data-feather]'))window.feather.replace({class:'lux-feather','stroke-width':1.9});
}
function apply(){
  try{
    applyBrand();applyHero();applyStats();applySections();applyStudents();applyReports();applySubjectTones();
    renderFeather();
  }catch(e){console.warn('Premium v2 decoration skipped',e)}
}
let timer;
const observer=new MutationObserver(()=>{
  clearTimeout(timer); timer=setTimeout(apply,45);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,160));
window.addEventListener('storage',e=>{if(e.key==='nataiji-lang')setTimeout(apply,40)});
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view],[data-report],#langSwitch,#addStudent'))setTimeout(apply,80);
},true);
setTimeout(apply,600);
})();