(()=> {
'use strict';
if(window.__nataijiPremiumV2)return;
window.__nataijiPremiumV2=true;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';

function icon(host,name,cls='npv2-icon'){
  if(!host)return;
  const direct=[...host.children].filter(el=>el.matches?.('svg.lux-feather,i[data-feather],.'+cls));
  const existing=host.querySelector(':scope > .'+cls);
  if(existing){
    direct.filter(el=>el!==existing).forEach(el=>el.remove());
    return;
  }
  if(direct.length){
    const keep=direct[0];
    direct.slice(1).forEach(el=>el.remove());
    keep.classList.add(cls);
    return;
  }
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
function subjectIconName(value){
  if(window.nataijiSubjectIconKey)return window.nataijiSubjectIconKey(value);
  const n=String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
  if(/اسلام|islam/.test(n))return'islamic';
  if(/عرب|arabe/.test(n))return'arabic';
  if(/حساب|رياضيات|math|calcul/.test(n))return'math';
  if(/مدني|civique/.test(n))return'civic';
  if(/فني|artist/.test(n))return'art';
  if(/فرنس|francais/.test(n))return'french';
  if(/بدني|رياضة|sport/.test(n))return'sport';
  if(/علوم|science|طبيع/.test(n))return'science';
  return'generic';
}
function getSubjects(){
  try{return (typeof state!=='undefined'&&Array.isArray(state?.subjects))?state.subjects:[]}catch{return[]}
}
const fallbackFrSubjects={
  'التربية الإسلامية':'Éducation islamique',
  'اللغة العربية':'Langue arabe',
  'الحساب':'Calcul',
  'الرياضيات':'Mathématiques',
  'التربية المدنية':'Éducation civique',
  'التربية الفنية':'Éducation artistique',
  'اللغة الفرنسية':'Français',
  'Français':'Français',
  'الرياضة':'Éducation physique',
  'التربية البدنية':'Éducation physique',
  'التربية المدنية والفنية':'Éducation civique et artistique',
  'العلوم الطبيعية':'Sciences naturelles'
};
function frenchSubjectName(sub){
  const ar=String(sub?.[0]||'').trim(),saved=String(sub?.[2]||'').trim();
  if(saved&&!/[\u0600-\u06ff]/.test(saved))return saved;
  return fallbackFrSubjects[ar]||saved||ar;
}
function localizeSubjectPicker(){
  const picker=q('#subjectPicker'),subjects=getSubjects();
  if(!picker||!subjects.length)return;
  qa('option',picker).forEach((o,i)=>{
    const idx=Number.isFinite(Number(o.value))?Number(o.value):i,sub=subjects[idx]||subjects[i];
    if(!sub)return;
    const label=fr()?frenchSubjectName(sub):String(sub?.[0]||'').trim();
    if(label&&o.textContent!==label)o.textContent=label;
    o.dir=fr()?'ltr':'rtl';
  });
}
function ensureSubjectLabel(row,i){
  if(!row)return;
  const subjects=getSubjects(),sub=subjects[i]||[],label=q(':scope > span',row);
  if(!label)return;
  const fallback=[...label.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent||'').join(' ').trim();
  const name=fr()?(String(window.nataijiSubjectFrLabel?.(sub,fallback)||sub?.[2]||sub?.[0]||fallback).trim()):(String(sub?.[0]||sub?.[2]||fallback).trim());
  let wrap=q(':scope > .subject-premium-icon',label);
  const iconKey=subjectIconName(String(sub?.[0]||'')+' '+String(sub?.[2]||fallback));
  if(!wrap){
    wrap=document.createElement('span');
    wrap.className='subject-premium-icon';
    wrap.setAttribute('aria-hidden','true');
    label.prepend(wrap);
  }
  if(wrap.dataset.icon!==iconKey||!wrap.querySelector('svg')){
    wrap.dataset.icon=iconKey;
    wrap.innerHTML=window.nataijiSubjectIconMarkup
      ?window.nataijiSubjectIconMarkup(iconKey)
      :'<i data-feather="bookmark"></i>';
  }
  let nameEl=q(':scope > .subject-progress-name',label);
  if(!nameEl){
    nameEl=document.createElement('b');
    nameEl.className='subject-progress-name';
    [...label.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());
    wrap.after(nameEl);
  }
  if(name&&nameEl.textContent!==name)nameEl.textContent=name;
  nameEl.dir=fr()?'ltr':'rtl';
}
function applySubjectTones(){
  qa('#subjectProgress > div').forEach((row,i)=>{
    row.classList.add('npv2-subject-tone-'+((i%6)+1));
    ensureSubjectLabel(row,i);
  });
}
function renderFeather(){
  if(window.feather&&document.querySelector('[data-feather]'))window.feather.replace({class:'lux-feather','stroke-width':1.9});
}
function apply(){
  try{
    applyBrand();applyHero();applyStats();applySections();applyStudents();applyReports();localizeSubjectPicker();applySubjectTones();
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