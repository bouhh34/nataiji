(()=> {
'use strict';
if(window.__nataijiHomeReferenceV1)return;
window.__nataijiHomeReferenceV1=true;

const q=(s,r=document)=>r.querySelector(s);
const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';

function feather(host,name,cls){
  if(!host)return;
  const old=host.querySelector(':scope > .'+cls+', :scope > svg.'+cls);
  if(old)old.remove();
  const i=document.createElement('i');
  i.className=cls;
  i.dataset.feather=name;
  i.setAttribute('aria-hidden','true');
  host.prepend(i);
}
function render(){
  if(window.feather&&document.querySelector('i[data-feather]'))window.feather.replace({class:'lux-feather','stroke-width':1.9});
}
/* The native class selector remains unchanged; reveal its full selected label
   briefly on focus, tapping or changing class (especially on narrow phones). */
function enhanceClassNameReveal(select,wrap){
  if(!select||!wrap)return;
  let tooltip=q('.nt-class-full-name',wrap);
  if(!tooltip){
    tooltip=document.createElement('div');
    tooltip.className='nt-class-full-name';
    tooltip.id='ntClassFullName';
    tooltip.setAttribute('role','status');
    tooltip.setAttribute('aria-live','polite');
    tooltip.setAttribute('aria-atomic','true');
    wrap.appendChild(tooltip);
  }
  const update=()=>{
    const full=String(select.selectedOptions?.[0]?.textContent||'').trim();
    const usable=full&&full!=='…'&&full!=='...';
    if(select.title!==(usable?full:''))select.title=usable?full:'';
    if(tooltip.textContent!==(usable?full:''))tooltip.textContent=usable?full:'';
    tooltip.dir=isFr()?'ltr':'rtl';
  };
  if(wrap.dataset.ntClassHintReady!=='1'){
    wrap.dataset.ntClassHintReady='1';
    let hideTimer;
    const reveal=()=>{
      update();
      if(!tooltip.textContent)return;
      clearTimeout(hideTimer);
      wrap.classList.add('nt-class-name-revealed');
      hideTimer=setTimeout(()=>wrap.classList.remove('nt-class-name-revealed'),4000);
    };
    const conceal=()=>{
      clearTimeout(hideTimer);
      wrap.classList.remove('nt-class-name-revealed');
    };
    select.addEventListener('focus',reveal);
    select.addEventListener('pointerdown',reveal);
    select.addEventListener('change',reveal);
    select.addEventListener('blur',conceal);
    select.addEventListener('keydown',event=>{if(event.key==='Escape')conceal()});
  }
  update();
}

function decorateHeader(){
  const header=q('main > header');
  if(!header)return;
  header.classList.add('np-home-header');
  const brand=q('.npv2-brand',header);
  const profile=q('.profile',header);
  const year=q('#yearTop',header);
  const cls=q('#classTop',header);
  if(brand)brand.classList.add('np-home-brand');
  if(profile)profile.classList.add('np-home-profile');

  [[year,'calendar','np-home-year'],[cls,'users','np-home-class']].forEach(([select,iconName,extra])=>{
    if(!select)return;
    let wrap=select.parentElement?.classList.contains('np-home-select')?select.parentElement:null;
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='np-home-select '+extra;
      select.before(wrap);
      wrap.appendChild(select);
      const i=document.createElement('i');
      i.className='np-home-select-icon';
      i.dataset.feather=iconName;
      i.setAttribute('aria-hidden','true');
      wrap.prepend(i);
    }
  });
  enhanceClassNameReveal(cls,cls?.closest('.np-home-class'));
}
function decorateHero(){
  const hero=q('[data-page="home"] .welcome');
  if(!hero)return;
  hero.classList.add('np-home-hero');
  let art=q('.np-home-hero-art',hero);
  if(!art){
    art=document.createElement('div');
    art.className='np-home-hero-art';
    art.setAttribute('aria-hidden','true');
    art.innerHTML='<i data-feather="book-open"></i><i data-feather="award"></i><i data-feather="star"></i><i data-feather="star"></i>';
    hero.appendChild(art);
  }
  const cta=q('button',hero);
  if(cta)cta.classList.add('np-home-cta');
  const small=q('small',hero);
  if(small)setText(small,isFr()?'Tableau de bord':'لوحة النتائج');
}
function decorateStats(){
  const config={
    statStudents:['users','students'],
    statAverage:['bar-chart-2','average'],
    statComplete:['award','complete'],
    statNeeds:['alert-circle','needs']
  };
  Object.entries(config).forEach(([id,[iconName,key]])=>{
    const value=q('#'+id),card=value?.closest('article');
    if(!card)return;
    card.classList.add('np-home-stat','np-home-stat-'+key);
    const existing=q('.npv2-stat-icon',card);
    if(existing)existing.classList.add('np-home-stat-icon');
  });
}
function subjectIcon(name){
  const n=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/اسلام|islam/.test(n))return'book-open';
  if(/عرب|arabe/.test(n))return'book';
  if(/حساب|رياضيات|calcul|math/.test(n))return'divide-square';
  if(/مدني|civique/.test(n))return'flag';
  if(/فني|artist/.test(n))return'edit-3';
  if(/فرنس|franc/.test(n))return'message-circle';
  if(/رياضة|بدني|sport|physique/.test(n))return'activity';
  return'bookmark';
}
function decorateProgress(){
  const list=q('#subjectProgress');
  const card=list?.closest('.card');
  if(!list||!card)return;
  card.classList.add('np-home-progress-card');

  let head=q('.np-home-progress-head',card);
  const oldTitle=q(':scope > h2',card);
  if(!head){
    head=document.createElement('div');
    head.className='np-home-progress-head';
    head.innerHTML='<div class="np-home-progress-heading"><span class="np-home-progress-heading-icon"><i data-feather="bar-chart-2"></i></span><div><h2></h2><p></p></div></div><button type="button" class="np-home-show-all"></button>';
    if(oldTitle)oldTitle.replaceWith(head); else card.prepend(head);
  }
  const h2=q('h2',head),p=q('p',head),btn=q('.np-home-show-all',head);
  if(h2)setText(h2,isFr()?'État du trimestre':'حالة الفصل');
  if(p)setText(p,isFr()?'Progression de la saisie pour chaque matière':'نسبة إدخال الدرجات لكل مادة');
  if(btn){
    setText(btn,card.classList.contains('np-home-expanded')?(isFr()?'Réduire':'عرض أقل'):(isFr()?'Tout afficher':'عرض الكل'));
    btn.onclick=()=>{
      card.classList.toggle('np-home-expanded');
      setText(btn,card.classList.contains('np-home-expanded')?(isFr()?'Réduire':'عرض أقل'):(isFr()?'Tout afficher':'عرض الكل'));
    };
  }

  Array.from(list.children).filter(row=>row.tagName==='DIV').forEach((row,i)=>{
    row.classList.add('np-home-subject-row','np-home-subject-'+((i%7)+1));
    const label=q(':scope > span',row);
    if(!label)return;
    let name=q('.subject-progress-name',label);
    const raw=name?.textContent || [...label.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent||'').join(' ').trim();
    const icon=q('.subject-premium-icon',label);
    if(icon)icon.classList.add('np-home-subject-icon');
  });
}
function apply(){
  try{
    decorateHeader();
    decorateHero();
    decorateStats();
    decorateProgress();
    render();
  }catch(e){console.warn('Nataiji home reference decoration skipped',e)}
}
let timer;
const observer=new MutationObserver(()=>{
  clearTimeout(timer);
  timer=setTimeout(apply,55);
});
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,140));
window.addEventListener('storage',e=>{if(e.key==='nataiji-lang')setTimeout(apply,50)});
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="home"],#langSwitch'))setTimeout(apply,80);
},true);
setTimeout(apply,500);
})();