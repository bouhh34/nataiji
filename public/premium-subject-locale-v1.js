(()=>{
'use strict';
if(window.__nataijiPremiumSubjectLocaleV1)return;
window.__nataijiPremiumSubjectLocaleV1=true;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const setText=(el,value)=>{if(el&&el.textContent!==String(value??''))el.textContent=String(value??'')};
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const stateValue=()=>{try{return state}catch{return null}};
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const SUBJECT_FR={
 'التربية الإسلامية':'Éducation islamique','التربيه الاسلاميه':'Éducation islamique',
 'اللغة العربية':'Langue arabe','اللغه العربيه':'Langue arabe',
 'الحساب':'Calcul','الرياضيات':'Mathématiques',
 'التربية المدنية':'Éducation civique','التربيه المدنيه':'Éducation civique',
 'التربية الفنية':'Éducation artistique','التربيه الفنيه':'Éducation artistique',
 'الفرنسية':'Français','اللغة الفرنسية':'Français','Français':'Français',
 'الرياضة':'Éducation physique','التربية البدنية':'Éducation physique','التربيه البدنيه':'Éducation physique',
 'العلوم':'Sciences','العلوم الطبيعية':'Sciences naturelles'
};
function subjectFr(sub,fallback=''){
 const candidates=[sub?.[2],sub?.[1]].map(v=>String(v??'').trim()).filter(v=>v&&/[A-Za-zÀ-ÿ]/.test(v));
 if(candidates.length)return candidates[0];
 const ar=String(sub?.[0]||fallback||'').trim();
 if(SUBJECT_FR[ar])return SUBJECT_FR[ar];
 const n=normalize(ar);
 if(/اسلام/.test(n))return'Éducation islamique';
 if(/عرب/.test(n))return'Langue arabe';
 if(/حساب/.test(n))return'Calcul';
 if(/رياضيات/.test(n))return'Mathématiques';
 if(/مدني/.test(n))return'Éducation civique';
 if(/فني/.test(n))return'Éducation artistique';
 if(/فرنس/.test(n))return'Français';
 if(/رياض|بدني/.test(n))return'Éducation physique';
 if(/علوم/.test(n))return'Sciences';
 return /[\u0600-\u06ff]/.test(ar)?'Matière':ar;
}
window.nataijiSubjectFrLabel=subjectFr;
const subjectIcon=v=>{
 const n=normalize(v);
 if(/اسلام|islam/.test(n))return'islamic';
 if(/عرب|arabe|lecture|قراءة|كتاب|ecriture|كتابة|expression|تعبير/.test(n))return'arabic';
 if(/حساب|رياضيات|math|calcul/.test(n))return'math';
 if(/مدني|civique|citoy/.test(n))return'civic';
 if(/فني|artist|dessin/.test(n))return'art';
 if(/فرنس|francais/.test(n))return'french';
 if(/بدني|رياضة|education physique|sport/.test(n))return'sport';
 if(/فيزياء|physique|physics/.test(n))return'physics';
 if(/علوم|science|طبيع/.test(n))return'science';
 return'generic';
};
const subjectIconMarkup=key=>{
 const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
 const icons={
  islamic:`<svg ${common}><path d="M5 20h14"/><path d="M7 20v-7.2c0-2.2 1.5-4.2 3.7-4.8"/><path d="M17 20v-7.2c0-2.2-1.5-4.2-3.7-4.8"/><path d="M12 3.2c1.2 1.1 1.8 2.2 1.8 3.3 0 1-.8 1.9-1.8 1.9s-1.8-.9-1.8-1.9c0-1.1.6-2.2 1.8-3.3Z"/><path d="M9.2 20v-4.4a2.8 2.8 0 0 1 5.6 0V20"/></svg>`,
  arabic:`<svg ${common}><path d="M4 5.5c2.8-.8 5.1-.2 8 1.6v12.2c-2.9-1.8-5.2-2.3-8-1.5V5.5Z"/><path d="M20 5.5c-2.8-.8-5.1-.2-8 1.6v12.2c2.9-1.8 5.2-2.3 8-1.5V5.5Z"/></svg>`,
  math:`<svg ${common}><rect x="5" y="3.5" width="14" height="17" rx="2.2"/><path d="M8 7.5h8"/><path d="M8.2 12h1.6M14.2 12h1.6M8.2 15.5h1.6M14.2 15.5h1.6M8.2 18.5h1.6M14.2 18.5h1.6"/></svg>`,
  civic:`<svg ${common}><path d="M6 21V4"/><path d="M6 5c4-2.2 7 2 12 0v9c-5 2-8-2.2-12 0"/></svg>`,
  art:`<svg ${common}><path d="M12 3.2c-5.2 0-9 3.5-9 8.1 0 4.7 4.1 8.5 9.1 8.5h1.1c1.4 0 2.1-.9 2.1-1.9 0-.8-.5-1.3-.5-2 0-.9.8-1.5 1.8-1.5H18c2 0 3-1.4 3-3.3 0-4.5-3.7-7.9-9-7.9Z"/><circle cx="7.7" cy="9.2" r=".8" fill="currentColor" stroke="none"/><circle cx="10.5" cy="6.8" r=".8" fill="currentColor" stroke="none"/><circle cx="14.2" cy="7.3" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.1" r=".8" fill="currentColor" stroke="none"/></svg>`,
  french:`<svg ${common}><path d="M4.2 5.5h15.6v10.2a3 3 0 0 1-3 3H10l-4.4 2v-2.8a3 3 0 0 1-1.4-2.5V5.5Z"/><path d="M8 9.3h8M8 12.7h5.5"/></svg>`,
  sport:`<svg ${common}><circle cx="14.7" cy="4.8" r="1.8"/><path d="m12.5 9.2 2.4 2.2 2.7.7"/><path d="m12.7 8.4-2.2 3.4-3.1 1.4"/><path d="m12 12.5-1.1 4.1-3.2 3"/><path d="m13.2 12.4 3 3.2 3.1 1.1"/></svg>`,
  physics:`<svg ${common}><path d="m13 2-7 12h6l-1 8 7-12h-6l1-8Z"/></svg>`,
  science:`<svg ${common}><path d="M9 3h6M10 3v5.2l-4.6 8A2.5 2.5 0 0 0 7.6 20h8.8a2.5 2.5 0 0 0 2.2-3.8l-4.6-8V3"/><path d="M8.2 14h7.6"/></svg>`,
  generic:`<svg ${common}><path d="M6 4.5h9a3 3 0 0 1 3 3v12H9a3 3 0 0 1-3-3v-12Z"/><path d="M9 8h6M9 11h6"/></svg>`
 };
 return icons[key]||icons.generic;
};
window.nataijiSubjectIconKey=subjectIcon;
window.nataijiSubjectIconMarkup=subjectIconMarkup;
const fallbackNames={'محمد':'Mohamed','محمود':'Mahmoud','أحمد':'Ahmed','احمد':'Ahmed','عمر':'Oumar','علي':'Ali','إبراهيم':'Ibrahim','ابراهيم':'Ibrahim','مريم':'Mariem','سيدي':'Sidi','سالم':'Salem','منى':'Mouna','فاطمة':'Fatimetou','أمين':'Amine','امين':'Amine','فاضل':'Fadel','الشيخ':'Cheikh','المختار':'Moctar'};
const letters={'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'ch','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'ou','ؤ':'ou','ي':'i','ى':'a','ئ':'i','ء':''};
function latinName(v){return String(v||'').trim().split(/\s+/).map(w=>fallbackNames[w]||([...w].map(c=>letters[c]??c).join('').replace(/^./,c=>c.toUpperCase()))).join(' ')}
function localizedPupil(p){if(!p)return'';return isFr()?(String(p?.[4]||'').trim()||latinName(p?.[1])):String(p?.[1]||p?.[4]||'').trim()}
function addIcon(host,key){if(!host)return;let wrap=host.querySelector(':scope > .subject-premium-icon');if(!wrap){wrap=document.createElement('span');wrap.className='subject-premium-icon';wrap.setAttribute('aria-hidden','true');host.prepend(wrap)}if(wrap.dataset.icon===key&&wrap.querySelector('svg'))return;wrap.dataset.icon=key;wrap.innerHTML=subjectIconMarkup(key)}
function localizeGradeRows(s){
 const rows=qa('#mobileScores .compact-score-row');
 rows.forEach((row,i)=>{const p=s.pupils?.[i],b=q('.score-student b',row);if(!p||!b)return;const name=localizedPupil(p),next=`${i+1}. ${name}`;if(b.textContent!==next)b.textContent=next;b.dir=isFr()?'ltr':'rtl';const input=q('.mobile-mark',row);if(input)input.setAttribute('aria-label',`${name} — ${isFr()?'note':'النتيجة'}`)});
}
function localizeSubjects(s){
 const picker=q('#subjectPicker'),fr=isFr();
 if(picker)qa('option',picker).forEach(o=>{const x=s.subjects?.[Number(o.value)];if(!x)return;setText(o,fr?subjectFr(x,o.textContent):x?.[0]);o.dir=fr?'ltr':'rtl'});
 const j=Number(picker?.value)||0,sub=s.subjects?.[j];
 if(sub){const title=q('#mobileScores .grade-subject-copy b')||q('#mobileScores .subject-title b');if(title){setText(title,fr?subjectFr(sub,title.textContent):sub?.[0]);const host=title.closest('.grade-subject-copy')||title.parentElement;addIcon(host,subjectIcon(`${sub?.[0]} ${sub?.[2]}`))}}
 qa('#subjectProgress>div').forEach((row,i)=>{const x=s.subjects?.[i];if(!x)return;const label=q(':scope > span',row)||row;addIcon(label,subjectIcon(`${x?.[0]} ${x?.[2]}`));let name=q(':scope > .subject-progress-name',label);if(!name){name=document.createElement('b');name.className='subject-progress-name';[...label.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());const icon=q(':scope > .subject-premium-icon',label);icon?.after(name)}setText(name,isFr()?subjectFr(x,name.textContent):x?.[0]);name.dir=isFr()?'ltr':'rtl'});
}
function localizePrintControls(){
 const fr=isFr(),all=q('#printAllStudents');setText(all,fr?'Imprimer tous les bulletins (2 élèves / A4)':'طباعة جميع الكشوف (تلميذان / A4)');
 const choice=q('.print-choice');if(choice){const h=q('h2',choice),one=q('[data-x="one"]',choice),all2=q('[data-x="all2"]',choice),all1=q('[data-x="all1"]',choice);if(h)h.textContent=fr?'Impression des bulletins':'طباعة كشوف الدرجات';if(one)one.textContent=fr?'Élève sélectionné — 1 bulletin par A4':'التلميذ المحدد — كشف واحد في A4';if(all2)all2.textContent=fr?'Tous les élèves — 2 bulletins par A4':'جميع التلاميذ — كشفان في كل A4';if(all1)all1.textContent=fr?'Tous les élèves — 1 bulletin par A4':'جميع التلاميذ — كشف واحد في كل A4'}
 const labels={'student':fr?'Imprimer / PDF':'طباعة / PDF','class':fr?'Imprimer le relevé / PDF':'طباعة كشف القسم / PDF','list':fr?'Imprimer la liste / PDF':'طباعة اللائحة / PDF'};
 qa('.report-print[data-print]').forEach(b=>{const key=b.dataset.print;if(labels[key])setText(b,labels[key])});
}
function apply(){const s=stateValue();if(!s)return;observer.disconnect();try{localizeGradeRows(s);localizeSubjects(s);localizePrintControls();if(window.feather&&document.querySelector('i[data-feather]'))window.feather.replace({class:'lux-feather','stroke-width':1.8})}finally{observer.observe(document.documentElement,{childList:true,subtree:true})}}
let timer;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,50)});observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target?.matches('#subjectPicker,#term,#classTop'))setTimeout(apply,20)},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-report],#printResult,#printAllStudents,.report-print'))setTimeout(apply,20)},true);
window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250));setTimeout(apply,600);

const css=document.createElement('style');css.id='premium-subject-locale-style';css.textContent=`
.grade-subject-copy{position:relative;padding-inline-start:39px!important}.grade-subject-copy>.subject-premium-icon{position:absolute;inset-inline-start:0;top:50%;transform:translateY(-50%)}
.subject-premium-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:30px!important;height:30px!important;flex:0 0 30px!important;border-radius:9px!important;background:linear-gradient(145deg,#fff,#eaf7f3)!important;border:1px solid rgba(12,136,108,.18)!important;color:#087d67!important;box-shadow:0 4px 10px rgba(8,43,75,.07)!important;vertical-align:middle!important;margin-inline-end:8px!important}
.subject-premium-icon svg{width:16px!important;height:16px!important;stroke-width:1.9!important}
#subjectProgress>div{display:grid!important;grid-template-columns:minmax(145px,1fr) minmax(120px,2.4fr) 48px!important;align-items:center!important;gap:12px!important}
#subjectProgress>div>span{display:grid!important;grid-template-columns:30px minmax(0,1fr)!important;grid-template-rows:auto auto!important;align-items:center!important;column-gap:8px!important;row-gap:2px!important;min-width:0!important;line-height:1.22!important}
#subjectProgress>div>span>.subject-premium-icon{grid-column:1!important;grid-row:1/3!important;margin:0!important}
#subjectProgress .subject-progress-name{grid-column:2!important;grid-row:1!important;min-width:0!important;font:inherit!important;font-weight:800!important;overflow-wrap:anywhere!important}
#subjectProgress>div>span{overflow-wrap:anywhere!important}
#subjectProgress>div>span>small{grid-column:2!important;grid-row:2!important;display:block!important;white-space:nowrap!important;color:#8797a2!important;margin:0!important}
.lang-fr #mobileScores .score-student b{direction:ltr!important;text-align:left!important}.lang-fr #mobileScores .score-student small{text-align:left!important}
html[dir="rtl"] #mobileScores .score-student b{direction:rtl!important;text-align:right!important}
@media(max-width:520px){.subject-premium-icon{width:28px!important;height:28px!important;flex-basis:28px!important}.grade-subject-copy{padding-inline-start:36px!important}#subjectProgress>div{grid-template-columns:minmax(132px,1fr) minmax(90px,2fr) 42px!important;gap:8px!important}#subjectProgress>div>span{grid-template-columns:28px minmax(0,1fr)!important;column-gap:6px!important;font-size:12px!important}#subjectProgress>div>span>small{font-size:10px!important}}
`;
document.head.appendChild(css);
})();
