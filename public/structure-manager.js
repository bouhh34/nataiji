(()=>{
'use strict';
const clone=x=>structuredClone(x),q=s=>document.querySelector(s),esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FIXED_TERMS=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
const uiFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const TERM_FR={'الفصل الأول':'1er trimestre','الفصل الثاني':'2e trimestre','الفصل الثالث':'3e trimestre'};
const CLASS_AR={'1AF':'السنة الأولى ابتدائية','2AF':'السنة الثانية ابتدائية','3AF':'السنة الثالثة ابتدائية','4AF':'السنة الرابعة ابتدائية','5AF':'السنة الخامسة ابتدائية','6AF':'السنة السادسة ابتدائية'};
const CLASS_FR={'1AF':'1re année fondamentale','2AF':'2e année fondamentale','3AF':'3e année fondamentale','4AF':'4e année fondamentale','5AF':'5e année fondamentale','6AF':'6e année fondamentale'};
const termUi=t=>uiFr()?(TERM_FR[t]||t):t;
const canonicalClassNames=code=>{code=String(code||'').toUpperCase();return{ar:code&&CLASS_AR[code]?code+' - '+CLASS_AR[code]:'',fr:code&&CLASS_FR[code]?code+' - '+CLASS_FR[code]:''}};
const classUi=c=>{const code=String(c?.code||'').toUpperCase(),known=canonicalClassNames(code);return uiFr()?(known.fr||String(c?.nameFr||c?.name||code)):(known.ar||String(c?.name||c?.nameFr||code))};
function normalizeLocal(){
 let classes=(Array.isArray(state.classes)?state.classes:[]).filter(x=>x&&x.id);
 if(!classes.length){const id=String(state.activeClassId||currentUser?.preferredClassId||currentUser?.classIds?.[0]||'');if(id&&(String(state.className||state.classCode||'').trim()||(state.pupils||[]).length||(state.subjects||[]).length))classes=[{id,name:String(state.className||state.classCode||'القسم الحالي'),nameFr:String(state.classNameFr||''),code:String(state.classCode||'')}]}
 state.classes=classes;
 let terms=[...new Set((Array.isArray(state.terms)?state.terms:[]).map(x=>String(x||'').trim()).filter(Boolean))];
 if(!terms.length&&state.marksByTerm&&typeof state.marksByTerm==='object')terms=[...new Set(Object.keys(state.marksByTerm).map(x=>String(x||'').trim()).filter(Boolean))];
 if(state.term&&!terms.includes(String(state.term)))terms.unshift(String(state.term));
 state.terms=terms;
 state.activeClassId=state.classes.some(c=>c.id===state.activeClassId)?state.activeClassId:(state.classes[0]?.id||'');
 state.term=state.terms.includes(state.term)?state.term:(state.terms[0]||'');
 state.classData=state.classData&&typeof state.classData==='object'?state.classData:{};
 for(const c of state.classes)state.classData[c.id]=state.classData[c.id]||{pupils:[],subjects:[],marksByTerm:{}};
}
async function reloadCanonical(){
 const teacher=currentUser?.role==='teacher',url=teacher?('/api/state?classId='+encodeURIComponent(state.activeClassId||'')+'&term='+encodeURIComponent(state.term||'')):'/api/state';
 const r=await api(url);
 currentUser=r.user||currentUser;
 const fresh=typeof normalizeState==='function'?normalizeState(r.state):clone(r.state||{});
 for(const k of Object.keys(state))delete state[k];
 Object.assign(state,fresh);
 normalizeLocal();
 localStorage.setItem('nataiji-data',JSON.stringify(state));
 render();
 refreshSelectors();
 setTimeout(()=>{window.nataijiRefreshOfficialReports?.();window.nataijiFinalizeReports?.()},0);
}
async function loadTeacherView(classId,term){
 const requestedClass=String(classId||''),requestedTerm=String(term||'');
 const url='/api/state?classId='+encodeURIComponent(requestedClass)+'&term='+encodeURIComponent(requestedTerm);
 const r=await api(url);currentUser=r.user||currentUser;
 const fresh=typeof normalizeState==='function'?normalizeState(r.state):clone(r.state||{});
 // The requested selector values are the source of truth for this navigation.
 // Some state responses can still carry the previous active selection for one render,
 // which made the page switch correctly while the select box displayed the old value.
 if(requestedClass)fresh.activeClassId=requestedClass;
 if(requestedTerm)fresh.term=requestedTerm;
 for(const k of Object.keys(state))delete state[k];Object.assign(state,fresh);normalizeLocal();
 localStorage.setItem('nataiji-data',JSON.stringify(state));render();refreshSelectors();
 const liveClass=q('#classTop'),liveTerm=q('#term');
 if(liveTerm&&requestedTerm)liveTerm.value=requestedTerm;
 setTimeout(()=>{window.nataijiRefreshOfficialReports?.();window.nataijiFinalizeReports?.()},0);
 return state
}
async function saveStructure(structure,deleteClassIds=[]){
 const r=await api('/api/structure',{method:'PUT',body:JSON.stringify({structure,deleteClassIds})});
 if(!r?.ok)throw new Error(r?.error||'structure_save_failed');
 const saved=r.structure||structure;
 state.classes=clone(saved.classes||[]);state.terms=clone(saved.terms||[]);state.activeClassId=saved.activeClassId||state.classes[0]?.id||'';state.term=saved.term||state.terms[0]||'';
 state.classData=state.classData&&typeof state.classData==='object'?state.classData:{};
 for(const cls of state.classes)state.classData[cls.id]=state.classData[cls.id]||{pupils:[],subjects:[],marksByTerm:{}};
 const keep=new Set(state.classes.map(x=>x.id));for(const id of Object.keys(state.classData))if(!keep.has(id))delete state.classData[id];
 localStorage.setItem('nataiji-data',JSON.stringify(state));render();refreshSelectors();
 try{await reloadCanonical()}catch(e){console.warn('Canonical reload after structure save failed',e)}
 return saved;
}
function currentStructure(){normalizeLocal();const term=FIXED_TERMS.includes(state.term)?state.term:FIXED_TERMS[0];return{classes:clone(state.classes),terms:clone(FIXED_TERMS),activeClassId:state.activeClassId||'',term}}
function refreshSelectors(){
 normalizeLocal();
 const ct=q('#classTop'),tt=q('#term'),teacher=currentUser?.role==='teacher';
 // classTop is owned by the unified workspace selector when available.
 // Do not overwrite its "My classes / Shared classes" groups during render.
 if(ct&&!window.nataijiWorkspaceSelectorReady){
   ct.innerHTML=state.classes.length?state.classes.map(c=>`<option value="${esc2(c.id)}" ${c.id===state.activeClassId?'selected':''}>${esc2(classUi(c))}</option>`).join(''):`<option value="">${uiFr()?'Ajoutez une classe dans les paramètres':'أضف قسمًا من الإعدادات'}</option>`;
   ct.disabled=!state.classes.length||(teacher&&state.classes.length<2);
   ct.onchange=async e=>{
     const selected=e.target.value,previous=state.activeClassId||'';
     if(!selected||selected===previous)return;
     // Keep the native select enabled. Disabling it inside Android's change event
     // can visually restore the previous option even though the page already switched.
     ct.setAttribute('aria-busy','true');
     ct.value=selected;
     try{await window.nataijiSelectClass(selected)}
     catch(err){console.error('class switch failed',err);ct.value=previous}
     finally{
       const live=q('#classTop');
       if(live&&!window.nataijiWorkspaceSelectorReady){
         live.removeAttribute('aria-busy');
         live.disabled=!state.classes.length||(teacher&&state.classes.length<2);
         if(state.activeClassId)live.value=state.activeClassId
       }
     }
   };
 }
 if(tt){
   const availableTerms=FIXED_TERMS;tt.innerHTML=availableTerms.map(t=>`<option value="${esc2(t)}" ${t===state.term?'selected':''}>${esc2(termUi(t))}</option>`).join('');
   tt.disabled=false;
   tt.onchange=async e=>{
     const selected=e.target.value,previous=String(state.term||''),classId=String(state.activeClassId||''),seq=(window.__nataijiTermNavigationSeq=(window.__nataijiTermNavigationSeq||0)+1);
     if(!selected||selected===previous)return;
     window.__nataijiPendingTerm=selected;
     tt.value=selected;
     tt.setAttribute('aria-busy','true');
     try{
       if(teacher){
         await api('/api/active-selection',{method:'POST',body:JSON.stringify({classId,term:selected})});
         if(seq!==window.__nataijiTermNavigationSeq)return;
         await loadTeacherView(classId,selected);
       }else{
         await api('/api/active-selection',{method:'POST',body:JSON.stringify({classId,term:selected})});
         if(seq!==window.__nataijiTermNavigationSeq)return;
         const rr=await api('/api/state?classId='+encodeURIComponent(classId)+'&term='+encodeURIComponent(selected));
         if(seq!==window.__nataijiTermNavigationSeq)return;
         if(!rr?.state)throw new Error('term_load_failed');
         const fresh=typeof normalizeState==='function'?normalizeState(rr.state):clone(rr.state||{});
         fresh.activeClassId=classId;
         fresh.term=selected;
         const termMarks=fresh.marksByTerm?.[selected]??fresh.classData?.[classId]?.marksByTerm?.[selected];
         if(Array.isArray(termMarks))fresh.marks=clone(termMarks);
         for(const k of Object.keys(state))delete state[k];
         Object.assign(state,fresh);normalizeLocal();
         localStorage.setItem('nataiji-data',JSON.stringify(state));
         render();refreshSelectors();
       }
     }catch(err){
       console.error('term switch failed',err);
       if(seq===window.__nataijiTermNavigationSeq){const live=q('#term');if(live)live.value=previous}
     }finally{
       if(seq===window.__nataijiTermNavigationSeq){
         delete window.__nataijiPendingTerm;
         const live=q('#term');
         if(live){live.removeAttribute('aria-busy');live.disabled=false;if(state.term)live.value=state.term}
       }
     }
   };
 }
}
window.nataijiRefreshSelectors=refreshSelectors;
let classNavigationSeq=0;
window.nataijiSelectClass=async function(classId){
 if(!classId)return;
 const requestedClass=String(classId),requestedTerm=String(state.term||''),previousClass=String(state.activeClassId||''),seq=++classNavigationSeq;
 window.__nataijiPendingClassId=requestedClass;
 try{
  if(currentUser?.role==='teacher'){
   const saved=await api('/api/active-selection',{method:'POST',body:JSON.stringify({classId:requestedClass,term:requestedTerm})});
   if(saved?.user)currentUser=saved.user;
   if(seq!==classNavigationSeq)return;
   await loadTeacherView(requestedClass,requestedTerm);
  }else{
   await api('/api/active-selection',{method:'POST',body:JSON.stringify({classId:requestedClass,term:requestedTerm})});
   if(seq!==classNavigationSeq)return;
   const rr=await api('/api/state?classId='+encodeURIComponent(requestedClass)+'&term='+encodeURIComponent(requestedTerm));
   if(seq!==classNavigationSeq)return;
   if(!rr?.state)throw new Error('class_load_failed');
   const fresh=typeof normalizeState==='function'?normalizeState(rr.state):clone(rr.state||{});
   fresh.activeClassId=requestedClass;
   if(requestedTerm)fresh.term=requestedTerm;
   const termMarks=fresh.marksByTerm?.[fresh.term]??fresh.classData?.[requestedClass]?.marksByTerm?.[fresh.term];
   if(Array.isArray(termMarks))fresh.marks=clone(termMarks);
   for(const k of Object.keys(state))delete state[k];
   Object.assign(state,fresh);normalizeLocal();
   localStorage.setItem('nataiji-data',JSON.stringify(state));
   render();refreshSelectors();
  }
 }catch(err){
  if(seq===classNavigationSeq){const live=q('#classTop');if(live&&!window.nataijiWorkspaceSelectorReady)live.value=previousClass}
  throw err
 }finally{
  if(seq===classNavigationSeq){
   delete window.__nataijiPendingClassId;
   const live=q('#classTop');
   if(live&&!window.nataijiWorkspaceSelectorReady&&state.activeClassId)live.value=state.activeClassId
  }
 }
};
function structureModal(draft=null){
 if(currentUser?.role!=='admin')return;
 const d=draft||currentStructure(),fr=uiFr();
 d.terms=clone(FIXED_TERMS);
 if(!FIXED_TERMS.includes(d.term))d.term=FIXED_TERMS[0];
 const title=fr?'Trimestres et classes':'الفصول الدراسية والأقسام';
 const termsTitle=fr?'Trimestres':'الفصول الدراسية';
 const classesTitle=fr?'Classes':'الأقسام';
 const classPlaceholder=fr?'Nom de la classe':'اسم القسم';
 const selectPlaceholder=fr?'Choisir la classe':'اختر القسم';
 const addClassLabel=fr?'+ Ajouter une classe':'+ إضافة قسم';
 const saveLabel=fr?'Enregistrer et confirmer':'حفظ وتثبيت';
 const p=modal(title,`<h3>${termsTitle}</h3><div id="termRows">${FIXED_TERMS.map((t,i)=>`<div class="subject-edit fixed-term-row"><input data-term="${i}" value="${esc2(termUi(t))}" readonly aria-readonly="true"></div>`).join('')}</div><hr><h3>${classesTitle}</h3><div id="classRows">${d.classes.length?d.classes.map((c,i)=>`<div class="subject-edit"><input data-class-name="${i}" value="${esc2(classUi(c))}" placeholder="${classPlaceholder}"><select data-class-code="${i}"><option value="">${selectPlaceholder}</option>${['1AF','2AF','3AF','4AF','5AF','6AF'].map(code=>`<option value="${code}" ${String(c.code||'').toUpperCase()===code?'selected':''}>${code}</option>`).join('')}</select><button data-class-del="${i}">×</button></div>`).join(''):`<p class="message">${fr?'Aucune classe pour le moment.':'لا يوجد قسم بعد.'}</p>`}</div><button id="addClass">${addClassLabel}</button><button class="primary action">${saveLabel}</button><p class="message"></p>`);
 const syncDraft=()=>{
   p.querySelectorAll('[data-class-name]').forEach(x=>{const z=d.classes[+x.dataset.className],code=String(z?.code||'').toUpperCase(),known=canonicalClassNames(code);if(known.ar){z.name=known.ar;z.nameFr=known.fr}else if(fr)z.nameFr=x.value.trim();else z.name=x.value.trim()});
   p.querySelectorAll('[data-class-code]').forEach(x=>{const z=d.classes[+x.dataset.classCode],code=x.value.trim().toUpperCase();z.code=code;const known=canonicalClassNames(code);if(known.ar){z.name=known.ar;z.nameFr=known.fr}});
 };
 p.querySelector('#addClass').onclick=()=>{syncDraft();const id='class-'+crypto.randomUUID();d.classes.push({id,name:'',nameFr:'',code:''});if(!d.activeClassId)d.activeClassId=id;p.remove();structureModal(d)};
 p.querySelectorAll('[data-class-code]').forEach(sel=>sel.onchange=()=>{const i=+sel.dataset.classCode,z=d.classes[i],known=canonicalClassNames(sel.value);z.code=sel.value;if(known.ar){z.name=known.ar;z.nameFr=known.fr;const input=p.querySelector(`[data-class-name="${i}"]`);if(input)input.value=fr?known.fr:known.ar}});
 p.querySelectorAll('[data-class-del]').forEach(b=>b.onclick=()=>{syncDraft();const i=+b.dataset.classDel,id=d.classes[i]?.id;d.classes.splice(i,1);if(d.activeClassId===id)d.activeClassId=d.classes[0]?.id||'';p.remove();structureModal(d)});
 p.querySelector('.action').onclick=async()=>{syncDraft();d.terms=clone(FIXED_TERMS);d.classes=d.classes.filter(x=>String(x.name||x.nameFr||'').trim()).map(x=>({...x,name:String(x.name||'').trim(),nameFr:String(x.nameFr||'').trim(),code:String(x.code||'').trim().toUpperCase()}));if(!d.classes.some(x=>x.id===d.activeClassId))d.activeClassId=d.classes[0]?.id||'';if(!FIXED_TERMS.includes(d.term))d.term=FIXED_TERMS[0];const msg=p.querySelector('.message'),btn=p.querySelector('.action');btn.disabled=true;msg.textContent=fr?'Enregistrement en cours…':'جارٍ الحفظ والتثبيت…';try{const nextIds=new Set(d.classes.map(x=>x.id)),deleteClassIds=(state.classes||[]).map(x=>x.id).filter(id=>!nextIds.has(id));await saveStructure(d,deleteClassIds);msg.textContent=fr?'✓ Trimestres et classes enregistrés':'✓ تم حفظ الفصول والأقسام وتثبيتها';setTimeout(()=>p.remove(),220)}catch(e){btn.disabled=false;msg.textContent=(fr?'Impossible d’enregistrer les classes':'تعذر تثبيت الفصول والأقسام على الخادم')+(e?.code?(' — '+e.code):'')}};
}
function install(){
 normalizeLocal();
 const grid=q('.settings-grid');
 if(grid&&!q('#structureBtn')){const b=document.createElement('button');b.id='structureBtn';b.className='menu-card';b.innerHTML=uiFr()?'<b>Trimestres et classes</b><span>Gérer les classes avec les trois trimestres fixes</span>':'<b>الفصول الدراسية والأقسام</b><span>إدارة الأقسام مع الفصول الدراسية الثلاثة الثابتة</span>';grid.insertBefore(b,q('#subjectsBtn'));b.onclick=()=>structureModal()}
 refreshSelectors();
}
function installWhenReady(){install()}
window.addEventListener('DOMContentLoaded',installWhenReady);
const oldRender=render;render=function(){oldRender();install()};
})();