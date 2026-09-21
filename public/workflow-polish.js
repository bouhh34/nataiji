/* View-only tools: pupil indices and official report contents stay canonical. */
(()=>{
'use strict';
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const fr=()=>document.documentElement.lang==='fr';
const t=(ar,f)=>fr()?f:ar;
const setText=(el,v)=>{if(el&&el.textContent!==v)el.textContent=v};
const appState=()=>{try{return state}catch{return null}};
let activeGrade=null;
function moveGrade(delta){
 const fields=qa('#mobileScores .mobile-mark');
 const active=document.activeElement?.matches('.mobile-mark')?document.activeElement:activeGrade;
 if(active?.classList.contains('grade-invalid')){active.focus();return}
 const i=fields.indexOf(active),next=fields[Math.max(0,Math.min(fields.length-1,i<0?0:i+delta))];
 if(next){next.focus();next.select();next.scrollIntoView({block:'center',behavior:'smooth'})}
}
document.addEventListener('focusin',e=>{if(e.target.matches('.mobile-mark,.mark')){activeGrade=e.target;e.target.select()}});
document.addEventListener('keydown',e=>{
 if(!e.target.matches('.mobile-mark')||!['Enter','ArrowDown','ArrowUp'].includes(e.key))return;
 e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}));moveGrade(e.key==='ArrowUp'?-1:1);
});
function grades(){
 const host=q('#mobileScores');if(!host||q('#gradeNavigation'))return;
 const nav=document.createElement('div');nav.id='gradeNavigation';nav.className='workflow-tools';
 const previous=document.createElement('button'),next=document.createElement('button');
 previous.type=next.type='button';previous.textContent=t('التلميذ السابق','Élève précédent');next.textContent=t('التلميذ التالي','Élève suivant');
 previous.onclick=()=>moveGrade(-1);next.onclick=()=>moveGrade(1);
 // Keep the active field through a touch on the navigation controls.
 for(const b of [previous,next])b.addEventListener('pointerdown',()=>{document.activeElement?.blur()});
 nav.append(previous,next);host.before(nav);
 const status=q('#saveState');if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite');nav.after(status)}
}
function pupils(){
 const page=q('[data-page="students"] .card');if(!page||q('#pupilSearch'))return;
 const toolbar=document.createElement('div');toolbar.className='workflow-tools pupil-tools';
 const search=document.createElement('input');search.id='pupilSearch';search.type='search';search.autocomplete='off';search.placeholder=t('بحث بالاسم أو الرقم المدرسي','Rechercher un nom ou un NNS');search.setAttribute('aria-label',search.placeholder);
 const sort=document.createElement('select');sort.id='pupilSort';sort.setAttribute('aria-label',t('ترتيب التلاميذ','Trier les élèves'));
 for(const [value,label] of [['call',t('رقم النداء','N° d’appel')],['name',t('الاسم أ ← ي','Nom A → Z')]])sort.add(new Option(label,value));
 const count=document.createElement('small');count.id='pupilSearchCount';count.setAttribute('role','status');
 toolbar.append(search,sort,count);q('[data-page="students"] .section-head').after(toolbar);
 function filter(){
  const s=appState(),needle=search.value.trim().toLocaleLowerCase();if(!s)return;
  const cards=qa('#mobileStudentCards>.student-mobile-card'),rows=qa('#list>tr');let visible=0;
  rows.forEach((row,i)=>{if(!row.hasAttribute('data-pupil-view-index'))row.dataset.pupilViewIndex=String(i)});
  const indexedRows=new Map(rows.map(row=>[Number(row.dataset.pupilViewIndex),row]));
  const order=(s.pupils||[]).map((p,i)=>({p,i}));
  if(sort.value==='name')order.sort((a,b)=>String(fr()?(a.p[4]||a.p[1]):a.p[1]).localeCompare(String(fr()?(b.p[4]||b.p[1]):b.p[1]),fr()?'fr':'ar'));
  order.forEach(({p,i},rank)=>{const show=[p[0],p[1],p[4],p[5]].join(' ').toLocaleLowerCase().includes(needle);if(show)visible++;
   if(cards[i]){cards[i].classList.toggle('hidden',!show);cards[i].style.order=String(rank)}
   const row=indexedRows.get(i);if(row)row.classList.toggle('hidden',!show);
  });
  const orderedRows=order.map(({i})=>indexedRows.get(i)).filter(Boolean);
  if(orderedRows.some((row,i)=>rows[i]!==row))q('#list').append(...orderedRows);
  setText(count,`${visible} / ${(s.pupils||[]).length} ${t('تلميذ','élèves')}`);
 }
 search.addEventListener('input',filter);sort.addEventListener('change',filter);
 const host=q('#mobileStudentCards');if(host)new MutationObserver(filter).observe(host,{childList:true});
 const list=q('#list');if(list)new MutationObserver(filter).observe(list,{childList:true});filter();
}
function passwordDialog(){
 const modal=document.createElement('div');modal.className='modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML=`<form class="modal-card"><div class="modal-head"><h2>${t('تغيير كلمة المرور','Changer le mot de passe')}</h2><button class="x" type="button" aria-label="${t('إغلاق','Fermer')}">×</button></div><label>${t('كلمة المرور الحالية','Mot de passe actuel')}<input name="currentPassword" type="password" autocomplete="current-password" required maxlength="256"></label><label>${t('كلمة المرور الجديدة (8 أحرف على الأقل)','Nouveau mot de passe (8 caractères minimum)')}<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="256"></label><label>${t('تأكيد كلمة المرور','Confirmer le mot de passe')}<input name="confirmation" type="password" autocomplete="new-password" required minlength="8"></label><p role="status" aria-live="polite"></p><button class="primary action" type="submit">${t('حفظ كلمة المرور','Enregistrer')}</button></form>`;
 const close=()=>{modal.remove();q('#changePasswordBtn')?.focus()};modal.querySelector('.x').onclick=close;
 modal.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 modal.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,values=new FormData(form),status=form.querySelector('[role=status]'),button=form.querySelector('[type=submit]');
  if(values.get('password')!==values.get('confirmation')){status.textContent=t('كلمتا المرور غير متطابقتين','Les mots de passe ne correspondent pas');return}
  button.disabled=true;status.textContent=t('جارٍ الحفظ…','Enregistrement…');
  try{const response=await fetch('/api/account/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:values.get('currentPassword'),password:values.get('password')})});const result=await response.json();if(!response.ok)throw new Error(result.error);form.reset();status.textContent=t('تم التغيير. تم إنهاء الجلسات الأخرى.','Mot de passe modifié. Les autres sessions sont déconnectées.')}catch(error){status.textContent=error.message==='bad_password'?t('كلمة المرور الحالية غير صحيحة','Le mot de passe actuel est incorrect'):t('تعذر الحفظ، حاول مجددًا','Impossible d’enregistrer. Réessayez.')}finally{button.disabled=false}
 };
 document.body.append(modal);modal.querySelector('input').focus();
}
function settings(){
 const grid=q('.settings-grid');if(!grid||q('#changePasswordBtn'))return;
 for(const [id,label,detail,action] of [
  ['changePasswordBtn',t('تغيير كلمة المرور','Changer le mot de passe'),t('حماية حسابك وإنهاء الجلسات الأخرى','Sécuriser le compte et fermer les autres sessions'),passwordDialog],
  ['privacyPolicyBtn',t('الخصوصية','Confidentialité'),t('كيف نحمي بياناتك','Protection de vos données'),()=>window.open('/privacy.html','_blank','noopener')],
  ['termsPolicyBtn',t('شروط الاستخدام','Conditions d’utilisation'),t('قواعد استخدام نتائجي','Règles d’utilisation de Nataiji'),()=>window.open('/terms.html','_blank','noopener')]
 ]){const button=document.createElement('button');button.id=id;button.type='button';button.className='menu-card';const title=document.createElement('b'),desc=document.createElement('span');title.textContent=label;desc.textContent=detail;button.append(title,desc);button.onclick=action;grid.insertBefore(button,q('#logoutBtn'))}
}
function localizeReportPicker(){const s=appState();if(!s)return;qa('#student option').forEach(o=>{const p=s.pupils?.[Number(o.value)];if(p)setText(o,String(fr()?(p[4]||p[1]):(p[1]||p[4])))})}
function reports(){
 const tabs=q('.report-tabs');if(!tabs||q('#reportExtraTools'))return;
 const tools=document.createElement('div');tools.id='reportExtraTools';tools.className='workflow-tools';
 const preview=document.createElement('button');preview.type='button';preview.textContent=t('معاينة مكبرة','Agrandir l’aperçu');
 preview.onclick=()=>{const kind=q('.report-tabs .active')?.dataset.report||'student',source=q(kind==='student'?'#officialSheet':kind==='class'?'#classReport .paper':'#listReport .paper');if(!source)return;
  const overlay=document.createElement('div');overlay.className='report-expanded';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',preview.textContent);
  const close=document.createElement('button');close.type='button';close.className='preview-close';close.textContent=t('إغلاق المعاينة','Fermer l’aperçu');const dismiss=()=>{overlay.remove();preview.focus()};close.onclick=dismiss;
  const copy=source.cloneNode(true);copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));overlay.append(close,copy);overlay.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});document.body.append(overlay);close.focus();
 };
 tools.append(preview);
 if(navigator.share){
  const choose=document.createElement('input');choose.type='file';choose.accept='application/pdf';choose.hidden=true;
  const share=document.createElement('button');share.type='button';share.textContent=t('مشاركة PDF محفوظ','Partager un PDF enregistré');
  const message=document.createElement('small');message.className='report-share-note';message.setAttribute('role','status');
  share.onclick=()=>{if(!choose.files?.length){message.textContent=t('احفظ التقرير بصيغة PDF عبر زر الطباعة ثم اختر الملف.','Enregistrez le rapport en PDF avec Imprimer, puis choisissez le fichier.');choose.click();return}
   const files=[choose.files[0]];if(!navigator.canShare?.({files})){message.textContent=t('شارك الملف من تطبيق الملفات على هاتفك.','Partagez ce fichier depuis l’application Fichiers.');return}
   navigator.share({files,title:'Nataiji'}).catch(e=>{if(e.name!=='AbortError')message.textContent=t('تعذرت المشاركة. استخدم تطبيق الملفات.','Partage indisponible. Utilisez l’application Fichiers.')});
  };
  choose.onchange=()=>{if(choose.files?.length){share.textContent=t('مشاركة الملف المختار','Partager le fichier choisi');message.textContent=choose.files[0].name}};
  tools.append(share,choose,message);
 }
 tabs.after(tools);
}
function start(){grades();pupils();settings();reports();localizeReportPicker();const picker=q('#student');if(picker)new MutationObserver(localizeReportPicker).observe(picker,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
document.addEventListener('click',e=>{if(e.target.closest('[data-view]')){grades();pupils();settings();localizeReportPicker()}});
})();
