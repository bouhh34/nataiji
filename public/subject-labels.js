(()=>{
'use strict';
const defaults={'التربية الإسلامية':'Education Islamique','اللغة العربية':'Langue Arabe','القراءة':'Lecture','التعبير':'Expression','الكتابة':'Ecriture','الرياضيات':'Mathématiques','التربية المدنية':'Education Civique','التربية الفنية':'Education Artistique','الرياضة':'Education Sportive','التربية البدنية':'Education Sportive','التاريخ والجغرافيا':'Histoire et Géographie','اللغة الفرنسية':'Langue Française','العلوم الطبيعية':'Sciences Naturelles'};
function ensure(){if(!window.state?.subjects)return;state.subjects.forEach(s=>{if(!s[2])s[2]=defaults[s[0]]||''})}
function decorate(){ensure();document.querySelectorAll('#sheet tr').forEach((tr,i)=>{if(i>=state.subjects.length)return;const td=tr.cells?.[0],s=state.subjects[i];if(td&&s?.[2])td.innerHTML=`<span class="subject-ar">${s[0]}</span><small class="subject-fr" dir="ltr">${s[2]}</small>`})}
window.nataijiSubjectFrench=defaults;new MutationObserver(()=>setTimeout(decorate,60)).observe(document.body,{childList:true,subtree:true});window.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,900));
})();