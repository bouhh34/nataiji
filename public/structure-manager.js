(()=>{
'use strict';
const clone=x=>structuredClone(x),q=s=>document.querySelector(s),esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalizeLocal(){
 state.classes=Array.isArray(state.classes)?state.classes:[];
 state.terms=Array.isArray(state.terms)?state.terms:[];
 state.activeClassId=state.classes.some(c=>c.id===state.activeClassId)?state.activeClassId:(state.classes[0]?.id||'');
 state.term=state.terms.includes(state.term)?state.term:(state.terms[0]||'');
 state.classData=state.classData&&typeof state.classData==='object'?state.classData:{};
 for(const c of state.classes)state.classData[c.id]=state.classData[c.id]||{pupils:[],subjects:[],marksByTerm:{}};
}
async function reloadCanonical(){
 const r=await api('/api/state');
 currentUser=r.user||currentUser;
 const fresh=typeof normalizeState==='function'?normalizeState(r.state):clone(r.state||{});
 for(const k of Object.keys(state))delete state[k];
 Object.assign(state,fresh);
 normalizeLocal();
 localStorage.setItem('nataiji-data',JSON.stringify(state));
 render();
 refreshSelectors();
}
async function saveStructure(structure){
 const r=await api('/api/structure',{method:'PUT',body:JSON.stringify({structure})});
 if(!r?.ok)throw new Error('structure_save_failed');
 await reloadCanonical();
 return r.structure;
}
function currentStructure(){normalizeLocal();return{classes:clone(state.classes),terms:clone(state.terms),activeClassId:state.activeClassId||'',term:state.term||''}}
function refreshSelectors(){
 normalizeLocal();
 const ct=q('#classTop'),tt=q('#term');
 if(ct){
   ct.innerHTML=state.classes.length?state.classes.map(c=>`<option value="${esc2(c.id)}" ${c.id===state.activeClassId?'selected':''}>${esc2(c.name)}</option>`).join(''):'<option value="">أضف قسمًا من الإعدادات</option>';
   ct.disabled=!state.classes.length||currentUser?.role==='teacher';
   ct.onchange=async e=>{
     const next=currentStructure();next.activeClassId=e.target.value;
     try{await saveStructure(next)}catch{e.target.value=state.activeClassId||''}
   };
 }
 if(tt){
   tt.innerHTML=state.terms.length?state.terms.map(t=>`<option ${t===state.term?'selected':''}>${esc2(t)}</option>`).join(''):'<option value="">أضف فصلًا دراسيًا</option>';
   tt.disabled=!state.terms.length;
   tt.onchange=async e=>{
     const next=currentStructure();next.term=e.target.value;
     try{await saveStructure(next)}catch{e.target.value=state.term||''}
   };
 }
}
function structureModal(draft=null){
 if(currentUser?.role!=='admin')return;
 const d=draft||currentStructure();
 const p=modal('الفصول الدراسية والأقسام',`<h3>الفصول الدراسية</h3><div id="termRows">${d.terms.length?d.terms.map((t,i)=>`<div class="subject-edit"><input data-term="${i}" value="${esc2(t)}"><button data-term-del="${i}">×</button></div>`).join(''):'<p class="message">لا يوجد فصل دراسي بعد.</p>'}</div><button id="addTerm">+ إضافة فصل دراسي</button><hr><h3>الأقسام</h3><div id="classRows">${d.classes.length?d.classes.map((c,i)=>`<div class="subject-edit"><input data-class-name="${i}" value="${esc2(c.name)}" placeholder="اسم القسم"><select data-class-code="${i}"><option value="">اختر القسم</option>${['1AF','2AF','3AF','4AF','5AF','6AF'].map(code=>`<option value="${code}" ${String(c.code||'').toUpperCase()===code?'selected':''}>${code}</option>`).join('')}</select><button data-class-del="${i}">×</button></div>`).join(''):'<p class="message">لا يوجد قسم بعد.</p>'}</div><button id="addClass">+ إضافة قسم</button><button class="primary action">حفظ وتثبيت</button><p class="message"></p>`);
 const syncDraft=()=>{p.querySelectorAll('[data-term]').forEach(x=>d.terms[+x.dataset.term]=x.value.trim());p.querySelectorAll('[data-class-name]').forEach(x=>d.classes[+x.dataset.className].name=x.value.trim());p.querySelectorAll('[data-class-code]').forEach(x=>{const z=d.classes[+x.dataset.classCode],code=x.value.trim();z.code=code;if(code&&(!z.name||z.name==='قسم جديد'))z.name=code+' - '+({1:'السنة الأولى ابتدائية',2:'السنة الثانية ابتدائية',3:'السنة الثالثة ابتدائية',4:'السنة الرابعة ابتدائية',5:'السنة الخامسة ابتدائية',6:'السنة السادسة ابتدائية'}[code[0]]||'')})};
 p.querySelector('#addTerm').onclick=()=>{syncDraft();d.terms.push('فصل جديد');if(!d.term)d.term=d.terms[0];p.remove();structureModal(d)};
 p.querySelector('#addClass').onclick=()=>{syncDraft();const id='class-'+crypto.randomUUID();d.classes.push({id,name:'قسم جديد',nameFr:'',code:''});if(!d.activeClassId)d.activeClassId=id;p.remove();structureModal(d)};
 p.querySelectorAll('[data-term-del]').forEach(b=>b.onclick=()=>{syncDraft();d.terms.splice(+b.dataset.termDel,1);if(!d.terms.includes(d.term))d.term=d.terms[0]||'';p.remove();structureModal(d)});
 p.querySelectorAll('[data-class-del]').forEach(b=>b.onclick=()=>{syncDraft();const i=+b.dataset.classDel,id=d.classes[i]?.id;d.classes.splice(i,1);if(d.activeClassId===id)d.activeClassId=d.classes[0]?.id||'';p.remove();structureModal(d)});
 p.querySelector('.action').onclick=async()=>{syncDraft();d.terms=d.terms.map(x=>x.trim()).filter(Boolean);d.classes=d.classes.filter(x=>String(x.name||'').trim()).map(x=>({...x,name:String(x.name).trim(),code:String(x.code||'').trim()}));if(!d.classes.some(x=>x.id===d.activeClassId))d.activeClassId=d.classes[0]?.id||'';if(!d.terms.includes(d.term))d.term=d.terms[0]||'';const msg=p.querySelector('.message'),btn=p.querySelector('.action');btn.disabled=true;msg.textContent='جارٍ الحفظ والتثبيت…';try{await saveStructure(d);msg.textContent='✓ تم حفظ الفصول والأقسام وتثبيتها';setTimeout(()=>p.remove(),220)}catch{btn.disabled=false;msg.textContent='تعذر تثبيت الفصول والأقسام على الخادم'}};
}
function joinModal(){const p=modal('استخدام رمز دعوة',`<p>أدخل رمز الدعوة الذي أرسله لك مدير المدرسة.</p><label>رمز الدعوة<input id="jc" placeholder="NT-XXXXXXXX" autocomplete="one-time-code"></label><button class="primary action">الدخول بالرمز</button><p class="message"></p>`);p.querySelector('.action').onclick=async()=>{const m=p.querySelector('.message'),code=q('#jc').value.trim();if(!code){m.textContent='أدخل رمز الدعوة';return}m.textContent='جارٍ التحقق...';try{await api('/api/auth/logout',{method:'POST'}).catch(()=>{});const r=await window.nataijiLoginByCode(code);currentUser=r.user;p.remove();await startApp()}catch(e){m.textContent=authError(e.code)}}}
function install(){
 normalizeLocal();
 const grid=q('.settings-grid');
 if(grid&&!q('#structureBtn')){const b=document.createElement('button');b.id='structureBtn';b.className='menu-card';b.innerHTML='<b>▦ الفصول الدراسية والأقسام</b><span>إضافة وتعديل الفصول والأقسام مع حفظ دائم</span>';grid.insertBefore(b,q('#subjectsBtn'));b.onclick=()=>structureModal()}
 if(grid&&!q('#joinCodeBtn')){const b=document.createElement('button');b.id='joinCodeBtn';b.className='menu-card';b.innerHTML='<b>⌁ لدي رمز دعوة</b><span>الدخول إلى المدرسة باستخدام رمز الدعوة فقط</span>';grid.insertBefore(b,q('#logoutBtn'));b.onclick=joinModal}
 refreshSelectors();
}
window.addEventListener('DOMContentLoaded',()=>setTimeout(install,700));
const oldRender=render;render=function(){oldRender();setTimeout(install,0)};
})();