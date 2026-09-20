(()=>{
'use strict';
if(window.__nataijiPremiumSubjectLocaleV1)return;
window.__nataijiPremiumSubjectLocaleV1=true;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const stateValue=()=>{try{return state}catch{return null}};
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const subjectIcon=v=>{
 const n=normalize(v);
 if(/اسلام|islam/.test(n))return'book-open';
 if(/عرب|arabe|lecture|قراءة|كتاب|ecriture|كتابة|expression|تعبير/.test(n))return'book';
 if(/حساب|رياضيات|math|calcul/.test(n))return'hash';
 if(/مدني|civique|citoy/.test(n))return'flag';
 if(/فني|artist|dessin/.test(n))return'edit-3';
 if(/فرنس|francais/.test(n))return'message-circle';
 if(/بدني|رياضة|physique|sport/.test(n))return'activity';
 if(/علوم|science/.test(n))return'globe';
 return'bookmark';
};
const fallbackNames={'محمد':'Mohamed','محمود':'Mahmoud','أحمد':'Ahmed','احمد':'Ahmed','عمر':'Oumar','علي':'Ali','إبراهيم':'Ibrahim','ابراهيم':'Ibrahim','مريم':'Mariem','سيدي':'Sidi','سالم':'Salem','منى':'Mouna','فاطمة':'Fatimetou','أمين':'Amine','امين':'Amine','فاضل':'Fadel','الشيخ':'Cheikh','المختار':'Moctar'};
const letters={'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'ch','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'ou','ؤ':'ou','ي':'i','ى':'a','ئ':'i','ء':''};
function latinName(v){return String(v||'').trim().split(/\s+/).map(w=>fallbackNames[w]||([...w].map(c=>letters[c]??c).join('').replace(/^./,c=>c.toUpperCase()))).join(' ')}
function localizedPupil(p){if(!p)return'';return isFr()?(String(p?.[4]||'').trim()||latinName(p?.[1])):String(p?.[1]||p?.[4]||'').trim()}
function addIcon(host,name){if(!host)return;let wrap=host.querySelector(':scope > .subject-premium-icon');if(!wrap){wrap=document.createElement('span');wrap.className='subject-premium-icon';wrap.setAttribute('aria-hidden','true');host.prepend(wrap)}if(wrap.dataset.icon===name)return;wrap.dataset.icon=name;wrap.innerHTML=`<i data-feather="${name}"></i>`}
function localizeGradeRows(s){
 const rows=qa('#mobileScores .compact-score-row');
 rows.forEach((row,i)=>{const p=s.pupils?.[i],b=q('.score-student b',row);if(!p||!b)return;const name=localizedPupil(p),next=`${i+1}. ${name}`;if(b.textContent!==next)b.textContent=next;b.dir=isFr()?'ltr':'rtl';const input=q('.mobile-mark',row);if(input)input.setAttribute('aria-label',`${name} — ${isFr()?'note':'النتيجة'}`)});
}
function localizeSubjects(s){
 const picker=q('#subjectPicker'),j=Number(picker?.value)||0,sub=s.subjects?.[j];
 if(sub){const title=q('#mobileScores .grade-subject-copy b')||q('#mobileScores .subject-title b');if(title){title.textContent=isFr()?(sub?.[2]||sub?.[0]):sub?.[0];const host=title.closest('.grade-subject-copy')||title.parentElement;addIcon(host,subjectIcon(`${sub?.[0]} ${sub?.[2]}`))}}
 qa('#subjectProgress>div').forEach((row,i)=>{const x=s.subjects?.[i];if(!x)return;const label=q('span',row)||row;addIcon(label,subjectIcon(`${x?.[0]} ${x?.[2]}`))});
}
function localizePrintControls(){
 const fr=isFr(),all=q('#printAllStudents');if(all)all.textContent=fr?'Imprimer tous les bulletins (2 élèves / A4)':'طباعة جميع الكشوف (تلميذان / A4)';
 const choice=q('.print-choice');if(choice){const h=q('h2',choice),one=q('[data-x="one"]',choice),all2=q('[data-x="all2"]',choice),all1=q('[data-x="all1"]',choice);if(h)h.textContent=fr?'Impression des bulletins':'طباعة كشوف الدرجات';if(one)one.textContent=fr?'Élève sélectionné — 1 bulletin par A4':'التلميذ المحدد — كشف واحد في A4';if(all2)all2.textContent=fr?'Tous les élèves — 2 bulletins par A4':'جميع التلاميذ — كشفان في كل A4';if(all1)all1.textContent=fr?'Tous les élèves — 1 bulletin par A4':'جميع التلاميذ — كشف واحد في كل A4'}
 const labels={'student':fr?'Imprimer / PDF':'طباعة / PDF','class':fr?'Imprimer le relevé / PDF':'طباعة كشف القسم / PDF','list':fr?'Imprimer la liste / PDF':'طباعة اللائحة / PDF'};
 qa('.report-print[data-print]').forEach(b=>{const key=b.dataset.print;if(labels[key])b.textContent=labels[key]});
}
function apply(){const s=stateValue();if(!s)return;localizeGradeRows(s);localizeSubjects(s);localizePrintControls();if(window.feather)window.feather.replace({class:'lux-feather','stroke-width':1.8})}
let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,50)}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target?.matches('#subjectPicker,#term,#classTop'))setTimeout(apply,20)},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-report],#printResult,#printAllStudents,.report-print'))setTimeout(apply,20)},true);
window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250));setTimeout(apply,600);

const css=document.createElement('style');css.id='premium-subject-locale-style';css.textContent=`
.grade-subject-copy{position:relative;padding-inline-start:39px!important}.grade-subject-copy>.subject-premium-icon{position:absolute;inset-inline-start:0;top:50%;transform:translateY(-50%)}
.subject-premium-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:30px!important;height:30px!important;flex:0 0 30px!important;border-radius:9px!important;background:linear-gradient(145deg,#fff,#eaf7f3)!important;border:1px solid rgba(12,136,108,.18)!important;color:#087d67!important;box-shadow:0 4px 10px rgba(8,43,75,.07)!important;vertical-align:middle!important;margin-inline-end:8px!important}
.subject-premium-icon svg{width:16px!important;height:16px!important;stroke-width:1.9!important}
#subjectProgress>div>span{display:flex!important;align-items:center!important;min-width:0!important}
.lang-fr #mobileScores .score-student b{direction:ltr!important;text-align:left!important}.lang-fr #mobileScores .score-student small{text-align:left!important}
html[dir="rtl"] #mobileScores .score-student b{direction:rtl!important;text-align:right!important}
@media(max-width:520px){.subject-premium-icon{width:28px!important;height:28px!important;flex-basis:28px!important}.grade-subject-copy{padding-inline-start:36px!important}}
`;
document.head.appendChild(css);
})();
