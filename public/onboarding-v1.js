(()=>{
'use strict';
if(window.__nataijiOnboardingV1)return;window.__nataijiOnboardingV1=true;
const q=(s,r=document)=>r.querySelector(s),E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLASS_NAMES={
 '1AF':['السنة الأولى ابتدائية','1ère année fondamentale'],
 '2AF':['السنة الثانية ابتدائية','2e année fondamentale'],
 '3AF':['السنة الثالثة ابتدائية','3e année fondamentale'],
 '4AF':['السنة الرابعة ابتدائية','4e année fondamentale'],
 '5AF':['السنة الخامسة ابتدائية','5e année fondamentale'],
 '6AF':['السنة السادسة ابتدائية','6e année fondamentale']
};
const TERMS=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const AR_FR={
 'نواكشوط':'Nouakchott','نواذيبو':'Nouadhibou','آدرار':'Adrar','ادرار':'Adrar','لبراكنة':'Brakna','براكنة':'Brakna','الترارزة':'Trarza','اترارزة':'Trarza','الحوض الشرقي':'Hodh Ech Chargui','الحوض الغربي':'Hodh El Gharbi','لعصابة':'Assaba','كوركول':'Gorgol','كيدي ماغا':'Guidimakha','تكانت':'Tagant','تيرس زمور':'Tiris Zemmour','إنشيري':'Inchiri','انشيري':'Inchiri','داخلة نواذيبو':'Dakhlet Nouadhibou',
 'مال':'Mâl','بوكي':'Boghé','بوكيه':'Boghé','ألاك':'Aleg','الاك':'Aleg','مقطع لحجار':'Magta Lahjar','روصو':'Rosso','أطار':'Atar','اطار':'Atar','شنقيط':'Chinguetti','كرمسين':'Keur Macène',
 'مدرسة':'École','المدرسة':'École','النجاح':'Nejah','نجاح':'Nejah'
};
const FR_AR=Object.fromEntries(Object.entries(AR_FR).map(([a,f])=>[String(f).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),a]));
const AR_CHAR={'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'ch','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'ou','ؤ':'ou','ي':'i','ى':'a','ئ':'i','ء':''};
function arToFr(v){let z=String(v||'').trim();if(!z)return'';if(AR_FR[z])return AR_FR[z];for(const [a,f] of Object.entries(AR_FR).sort((x,y)=>y[0].length-x[0].length))z=z.replaceAll(a,f);if(!/[\u0600-\u06ff]/.test(z))return z;return z.split(/\s+/).map(w=>{let o='';for(const ch of w)o+=AR_CHAR[ch]??ch;return o?o[0].toUpperCase()+o.slice(1):o}).join(' ')}
function normFr(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function frWordToAr(w){let x=normFr(w);const exact=FR_AR[x];if(exact)return exact;x=x.replace(/ch/g,'ش').replace(/kh/g,'خ').replace(/gh/g,'غ').replace(/ou/g,'و').replace(/th/g,'ث').replace(/ph/g,'ف').replace(/dj/g,'ج').replace(/sh/g,'ش');const m={a:'ا',b:'ب',c:'ك',d:'د',e:'',f:'ف',g:'غ',h:'ه',i:'ي',j:'ج',k:'ك',l:'ل',m:'م',n:'ن',o:'و',p:'ب',q:'ق',r:'ر',s:'س',t:'ت',u:'و',v:'ف',w:'و',x:'كس',y:'ي',z:'ز'};let o='';for(const ch of x)o+=m[ch]??ch;return o}
function frToAr(v){let z=String(v||'').trim();if(!z)return'';const exact=FR_AR[normFr(z)];if(exact)return exact;return z.split(/\s+/).map(frWordToAr).join(' ')}
function bindBiPair(arSel,frSel){
 const a=q(arSel),f=q(frSel);if(!a||!f)return;
 if(a.value.trim()&&!f.value.trim())f.value=arToFr(a.value);
 else if(f.value.trim()&&!a.value.trim())a.value=frToAr(f.value);
 a.addEventListener('input',()=>{f.value=arToFr(a.value)});
 f.addEventListener('input',()=>{a.value=frToAr(f.value)});
}
let open=false,draft={};
function shouldOpen(){
 try{
  if(currentUser?.role!=='admin'||currentUser?.activeSharedGrant)return false;
  // Existing account data is authoritative. Never show first-run setup merely because
  // a transient client render has not populated the class selector yet.
  if(state?.onboardingComplete===true)return false;
  if((Array.isArray(state?.classes)&&state.classes.length>0)||(Array.isArray(state?.pupils)&&state.pupils.length>0)||String(state?.school||'').trim())return false;
  return state?.onboardingComplete===false;
 }catch{return false}
}
function defaultAcademicYear(){
 const d=new Date(),y=d.getFullYear(),start=d.getMonth()>=6?y:y-1;
 return start+' - '+(start+1);
}
function syncFromState(){
 draft.school=String(state?.school||'');draft.schoolFr=String(state?.schoolFr||'');draft.region=String(state?.region||'');draft.regionFr=String(state?.regionFr||'');draft.inspection=String(state?.inspection||'');draft.inspectionFr=String(state?.inspectionFr||'');draft.year=String(state?.year||'').trim()||defaultAcademicYear();draft.code=draft.code||'1AF';
}
function shell(step,body,footer=''){
 let root=q('#nataijiOnboarding');
 if(!root){root=document.createElement('div');root.id='nataijiOnboarding';document.body.appendChild(root)}
 root.innerHTML=`<div class="nw-card" role="dialog" aria-modal="true"><div class="nw-brand"><img src="/app-logo-nataiji.svg" alt=""><div><b>إعداد نتائجي</b><span>تهيئة المدرسة لأول مرة</span></div></div><div class="nw-progress"><i class="${step>=1?'on':''}"></i><i class="${step>=2?'on':''}"></i><i class="${step>=3?'on':''}"></i><i class="${step>=4?'on':''}"></i></div><div class="nw-step"><small>الخطوة ${Math.min(step,4)} من 4</small>${body}</div>${footer}</div>`;
 return root
}
function step1(){
 syncFromState();shell(1,`<h2>بيانات المدرسة</h2><p>أدخل البيانات الأساسية التي ستظهر في الكشوف والتقارير.</p>
 <label>اسم المدرسة بالعربية <input id="nwSchool" value="${E(draft.school)}" placeholder="مثال: مدرسة النجاح"><small class="nw-hint">يُكتب المقابل الفرنسي تلقائيًا ويمكن تعديله</small></label>
 <label>Nom de l’école en français <input id="nwSchoolFr" dir="ltr" value="${E(draft.schoolFr)}" placeholder="Écriture automatique modifiable"><small class="nw-hint">Si vous écrivez en français, l’arabe est proposé automatiquement</small></label>
 <div class="nw-two"><label>الإدارة الجهوية للتربية بولاية <input id="nwRegion" value="${E(draft.region)}" placeholder="مثال: لبراكنة"><small class="nw-hint">اكتب اسم الولاية فقط</small></label><label>Direction régionale de l’Éducation – Wilaya de <input id="nwRegionFr" dir="ltr" value="${E(draft.regionFr)}" placeholder="Ex. Brakna"><small class="nw-hint">Traduction/transcription automatique modifiable</small></label></div>
 <div class="nw-two"><label>المفتشية بمقاطعة <input id="nwInspection" value="${E(draft.inspection)}" placeholder="مثال: مال"><small class="nw-hint">اكتب اسم المقاطعة فقط</small></label><label>Inspection – Moughataa de <input id="nwInspectionFr" dir="ltr" value="${E(draft.inspectionFr)}" placeholder="Ex. Mâl"><small class="nw-hint">Traduction/transcription automatique modifiable</small></label></div>
 <label>السنة الدراسية <input id="nwYear" dir="ltr" value="${E(draft.year)}" placeholder="2026 - 2027"></label>
 <p class="nw-error"></p>`,`<div class="nw-actions"><button class="primary" id="nwNext1">التالي</button></div>`);
 bindBiPair('#nwSchool','#nwSchoolFr');bindBiPair('#nwRegion','#nwRegionFr');bindBiPair('#nwInspection','#nwInspectionFr');
 q('#nwNext1').onclick=async()=>{const btn=q('#nwNext1'),err=q('.nw-error'),school=q('#nwSchool').value.trim(),year=q('#nwYear').value.trim()||defaultAcademicYear();q('#nwYear').value=year;if(!school){err.textContent='اسم المدرسة مطلوب.';q('#nwSchool').focus();return}Object.assign(draft,{school,schoolFr:q('#nwSchoolFr').value.trim(),region:q('#nwRegion').value.trim(),regionFr:q('#nwRegionFr').value.trim(),inspection:q('#nwInspection').value.trim(),inspectionFr:q('#nwInspectionFr').value.trim(),year});btn.disabled=true;err.textContent='جارٍ تثبيت بيانات المدرسة…';try{await api('/api/settings',{method:'PUT',body:JSON.stringify({...draft,classId:''})});Object.assign(state,{school:draft.school,schoolFr:draft.schoolFr,region:draft.region,regionFr:draft.regionFr,inspection:draft.inspection,inspectionFr:draft.inspectionFr,year:draft.year});localStorage.setItem('nataiji-data',JSON.stringify(state));step2()}catch(e){btn.disabled=false;err.textContent='تعذر حفظ البيانات على الخادم. حاول مرة أخرى.'}}
}
function step2(){
 shell(2,`<h2>الفصول الدراسية</h2><p>سيتم إعداد الفصول الثلاثة الرسمية تلقائيًا، ويمكنك تعديلها لاحقًا من الإعدادات.</p><div class="nw-terms"><div><b>1</b><span>الفصل الأول</span></div><div><b>2</b><span>الفصل الثاني</span></div><div><b>3</b><span>الفصل الثالث</span></div></div>`,`<div class="nw-actions"><button id="nwBack2">السابق</button><button class="primary" id="nwNext2">التالي</button></div>`);
 q('#nwBack2').onclick=step1;q('#nwNext2').onclick=step3
}
function step3(){
 shell(3,`<h2>اختر القسم الأول</h2><p>اختر المستوى، وستُحمّل مواد هذا المستوى ودرجاتها القصوى تلقائيًا.</p><div class="nw-classes">${Object.entries(CLASS_NAMES).map(([code,n])=>`<label class="nw-class ${draft.code===code?'selected':''}"><input type="radio" name="nwClass" value="${code}" ${draft.code===code?'checked':''}><b>${code}</b><span>${n[0]}</span><small dir="ltr">${n[1]}</small></label>`).join('')}</div><p class="nw-error"></p>`,`<div class="nw-actions"><button id="nwBack3">السابق</button><button class="primary" id="nwFinish">إنشاء القسم وتحميل المواد</button></div>`);
 q('#nwBack3').onclick=step2;q('.nw-classes').onchange=e=>{draft.code=e.target.value;q('.nw-class.selected')?.classList.remove('selected');e.target.closest('.nw-class')?.classList.add('selected')};
 q('#nwFinish').onclick=finishSetup
}
async function finishSetup(){
 const btn=q('#nwFinish'),err=q('.nw-error'),code=String(draft.code||'1AF'),names=CLASS_NAMES[code],id='class-'+crypto.randomUUID(),structure={classes:[{id,name:`${code} - ${names[0]}`,nameFr:`${code} - ${names[1]}`,code}],terms:[...TERMS],activeClassId:id,term:TERMS[0]};btn.disabled=true;err.textContent='جارٍ إنشاء القسم وتحميل المواد الرسمية…';
 try{
  const existing=await api('/api/structure').catch(()=>({structure:{classes:[],terms:[]}})),old=existing?.structure||{},oldClasses=Array.isArray(old.classes)?old.classes:[],oldTerms=Array.isArray(old.terms)?old.terms:[],merged={classes:[...oldClasses.filter(x=>x.id!==id),...structure.classes],terms:[...new Set([...oldTerms,...TERMS])],activeClassId:id,term:old.term&&[...new Set([...oldTerms,...TERMS])].includes(old.term)?old.term:TERMS[0]};
  await api('/api/structure',{method:'PUT',body:JSON.stringify({structure:merged,deleteClassIds:[]})});
  await api('/api/settings',{method:'PUT',body:JSON.stringify({school:draft.school,schoolFr:draft.schoolFr,region:draft.region,regionFr:draft.regionFr,inspection:draft.inspection,inspectionFr:draft.inspectionFr,year:draft.year,classId:id,className:structure.classes[0].name,classNameFr:structure.classes[0].nameFr,classCode:code,onboardingComplete:true})});
  const r=await api('/api/state');currentUser=r.user||currentUser;const fresh=normalizeState(r.state);for(const k of Object.keys(state))delete state[k];Object.assign(state,fresh);localStorage.setItem('nataiji-data',JSON.stringify(state));render();step4()
 }catch(e){btn.disabled=false;err.textContent='تعذر إكمال الإعداد. لم نفقد بيانات المدرسة؛ أعد المحاولة.'}
}
function step4(){
 const n=state?.subjects?.length||0,cls=state?.className||'';shell(4,`<div class="nw-success">✓</div><h2>تم إعداد المدرسة بنجاح</h2><p>تم إنشاء <b>${E(cls)}</b> وتثبيت <b>${n}</b> مادة مع الدرجات القصوى الرسمية.</p><div class="nw-next"><b>الخطوة التالية</b><span>أضف التلاميذ، ثم ابدأ إدخال نتائج الفصل الأول.</span></div>`,`<div class="nw-actions"><button class="primary" id="nwStudents">إضافة التلاميذ الآن</button><button id="nwHome">الذهاب للرئيسية</button></div>`);
 q('#nwStudents').onclick=()=>closeTo('students');q('#nwHome').onclick=()=>closeTo('home')
}
function closeTo(view){q('#nataijiOnboarding')?.remove();open=false;try{setView(view)}catch{}}
function maybe(){if(open||!shouldOpen())return;open=true;syncFromState();step1()}
const prevRender=render;render=function(){prevRender();setTimeout(maybe,50)};
window.addEventListener('DOMContentLoaded',()=>{setTimeout(maybe,500);setTimeout(maybe,1400)});setTimeout(maybe,1800);
const style=document.createElement('style');style.textContent=`
#nataijiOnboarding{position:fixed;inset:0;z-index:100000;background:linear-gradient(180deg,#edf7fd,#f8fbfd);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;direction:rtl}
.nw-card{width:min(650px,100%);background:#fff;border:1px solid #dbe6ed;border-radius:24px;box-shadow:0 18px 55px #0f2f4b22;padding:22px;box-sizing:border-box}
.nw-brand{display:flex;align-items:center;gap:12px;margin-bottom:14px}.nw-brand img{width:48px;height:48px;border-radius:14px}.nw-brand div{display:flex;flex-direction:column}.nw-brand b{font-size:20px;color:#12314b}.nw-brand span{font-size:13px;color:#738495}
.nw-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0 22px;direction:ltr}.nw-progress i{height:5px;background:#e2e8ee;border-radius:20px}.nw-progress i.on{background:#168fe1}
.nw-step>small{color:#168fe1;font-weight:800}.nw-step h2{font-size:26px;margin:5px 0 6px;color:#12314b}.nw-step>p{color:#708090;margin:0 0 18px;line-height:1.7}
.nw-step label{display:block;font-weight:800;color:#24384a;margin:11px 0}.nw-step input{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #cedbe4;border-radius:12px;padding:13px 14px;background:#fbfdff;font:inherit;outline:none}.nw-step input:focus{border-color:#168fe1;box-shadow:0 0 0 3px #168fe118}.nw-hint{display:block;margin-top:5px;color:#7b8b98;font-size:11px;font-weight:500;line-height:1.45}
.nw-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nw-terms{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.nw-terms div{border:1px solid #d7e4ec;background:#f7fbfe;border-radius:15px;padding:16px;text-align:center;display:flex;flex-direction:column;gap:5px}.nw-terms b{color:#168fe1;font-size:22px}.nw-terms span{font-weight:800}
.nw-classes{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:16px 0}.nw-class{position:relative;border:1px solid #d5e2ea;border-radius:14px;padding:12px!important;margin:0!important;background:#fbfdff;cursor:pointer;display:grid!important;grid-template-columns:52px 1fr;grid-template-rows:auto auto;align-items:center;gap:2px 8px}.nw-class.selected{border-color:#168fe1;background:#eef8ff;box-shadow:0 0 0 2px #168fe116}.nw-class input{position:absolute;opacity:0;width:1px;height:1px}.nw-class b{grid-row:1/3;font-size:18px;color:#168fe1}.nw-class span{font-weight:800}.nw-class small{color:#7a8893}
.nw-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.nw-actions button{border:1px solid #cbd9e3;background:#fff;border-radius:12px;padding:12px 18px;font:inherit;font-weight:800;cursor:pointer;flex:1}.nw-actions .primary{background:#168fe1;color:#fff;border-color:#168fe1}.nw-actions button:disabled{opacity:.55}.nw-error{min-height:20px;color:#b45309!important;font-weight:700;margin:10px 0 0!important}
.nw-success{width:64px;height:64px;border-radius:50%;background:#e9f8ef;color:#169c52;display:grid;place-items:center;font-size:34px;font-weight:900;margin:6px auto 14px}.nw-step:has(.nw-success){text-align:center}.nw-next{background:#f4f9fc;border:1px solid #dce8ef;border-radius:14px;padding:14px;margin-top:18px;display:flex;flex-direction:column;gap:4px}.nw-next span{color:#6e7f8c}
@media(max-width:600px){#nataijiOnboarding{padding:0;align-items:flex-start;background:#f3f9fd}.nw-card{min-height:100dvh;border-radius:0;border:0;padding:20px 16px 28px}.nw-two,.nw-classes{grid-template-columns:1fr}.nw-step h2{font-size:24px}.nw-terms{gap:6px}.nw-terms div{padding:12px 5px}.nw-actions{position:sticky;bottom:0;background:#fff;padding-top:10px;padding-bottom:max(4px,env(safe-area-inset-bottom))}}
`;document.head.appendChild(style);
})();