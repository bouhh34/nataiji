(()=>{
'use strict';
if(window.__nataijiAdminUxPolishV1)return;
window.__nataijiAdminUxPolishV1=true;

const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const setLabelText=(label,text)=>{
  if(!label)return;
  const node=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&String(n.nodeValue||'').trim());
  if(node)node.nodeValue=text;
};
const normalizeEducation=v=>String(v||'')
  .replace(/^Education islamique$/i,'Éducation islamique')
  .replace(/^Education civique$/i,'Éducation civique')
  .replace(/^Education artistique$/i,'Éducation artistique')
  .replace(/^Education physique$/i,'Éducation physique');

function enhanceSubjects(modal){
 if(!modal||!q('#biSubjectRows',modal))return;
 modal.classList.add('nataiji-subjects-compact');
 const rows=q('#biSubjectRows',modal);
 qa('.bi-subject',rows).forEach((row,idx)=>{
   const head=q('.bi-subject-head',row),ar=q('[data-sa]',row),fv=q('[data-sf]',row),mx=q('[data-sm]',row);
   if(fv&&fv.value){const n=normalizeEducation(fv.value);if(n!==fv.value)fv.value=n}
   if(!head)return;
   let toggle=q('.bi-subject-toggle',head);
   if(!toggle){
     toggle=document.createElement('button');
     toggle.type='button';toggle.className='bi-subject-toggle';
     const del=q('.bi-subject-delete',head);head.insertBefore(toggle,del||null);
     const isNew=/مادة جديدة|nouvelle matière/i.test(String(ar?.value||''));
     row.classList.toggle('collapsed',!isNew);
     toggle.addEventListener('click',e=>{
       e.preventDefault();e.stopPropagation();
       row.classList.toggle('collapsed');
       update();
       if(!row.classList.contains('collapsed'))setTimeout(()=>ar?.focus({preventScroll:true}),30)
     });
   }
   const update=()=>{
     const arName=String(ar?.value||'').trim()||'مادة';
     const frName=normalizeEducation(String(fv?.value||'').trim());
     const max=String(mx?.value||'').trim();
     const title=q('.bi-subject-head b',row);
     if(title)title.textContent=(idx+1)+'. '+arName+(frName?' — '+frName:'')+(max?' · /'+max:'');
     toggle.textContent=row.classList.contains('collapsed')?'⌄':'⌃';
     toggle.setAttribute('aria-expanded',String(!row.classList.contains('collapsed')));
     toggle.setAttribute('aria-label',row.classList.contains('collapsed')?'فتح المادة':'طي المادة');
   };
   [ar,fv,mx].filter(Boolean).forEach(el=>{if(!el.dataset.uxPolish){el.dataset.uxPolish='1';el.addEventListener('input',update)}});
   update();
 });
 const add=q('#biAddSubject',modal);
 if(add){add.textContent=fr()?'+ Ajouter une matière':'+ إضافة مادة';add.classList.add('ux-secondary-action')}
 const save=q('.bi-subject-actions .bi-save',modal);if(save)save.classList.add('ux-primary-action');
}

function inviteSummary(modal){
 if(!modal?.classList.contains('auth2-invite'))return;
 let box=q('.auth2-invite-summary',modal);
 const action=q('.action',modal);if(!action)return;
 if(!box){box=document.createElement('div');box.className='auth2-invite-summary';action.parentNode.insertBefore(box,action)}
 const update=()=>{
   const classParts=[];
   qa('.auth2-class-access',modal).forEach(card=>{
     if(!q('.auth2-share-class',card)?.checked)return;
     const name=q('.auth2-class-toggle b',card)?.textContent?.trim()||'';
     const full=!!q('input[type="radio"][value="full"]:checked',card);
     if(full){classParts.push((fr()?'Accès complet: ':'صلاحيات كاملة: ')+name);return}
     let edit=0,view=0,hide=0;
     qa('.auth2-subject-mode',card).forEach(sel=>{if(sel.value==='edit')edit++;else if(sel.value==='hide')hide++;else view++});
     classParts.push(fr()?name+`: ${edit} modif., ${view} lecture, ${hide} masquée(s)`:name+`: تعديل ${edit}، عرض ${view}، إخفاء ${hide}`);
   });
   const perms=qa('.auth2-perms input:checked',modal).map(x=>({grades:fr()?'Notes':'الدرجات',pupils:fr()?'Élèves':'التلاميذ',reports:fr()?'Rapports':'التقارير'}[x.value]||x.value));
   box.innerHTML='<b>'+(fr()?'Résumé avant création':'ملخص الصلاحيات قبل إنشاء الرمز')+'</b><span>'+(
     classParts.length?classParts.join(' • '):(fr()?'Aucune classe sélectionnée':'لم يتم اختيار قسم')
   )+'</span><small>'+(
     fr()?'Autorisations générales : ':'الصلاحيات العامة: '
   )+(perms.length?perms.join(' + '):(fr()?'aucune':'لا توجد'))+'</small>';
 };
 if(!modal.dataset.uxInviteSummary){
   modal.dataset.uxInviteSummary='1';
   modal.addEventListener('change',update,true);
   modal.addEventListener('input',update,true);
 }
 update();
}

function translateModal(modal){
 if(!modal)return;
 qa('label',modal).forEach(label=>{
   const txt=String(label.textContent||'').trim();
   if(txt.startsWith('Établissement en français'))setLabelText(label,'Nom de l’établissement en français');
   else if(txt.startsWith('Direction régionale de l’Éducation – Wilaya de'))setLabelText(label,'Nom de la direction régionale de l’Éducation');
   else if(txt.startsWith('Inspection – Moughataa de'))setLabelText(label,'Nom de l’inspection');
   else if(txt.startsWith('Classe en français'))setLabelText(label,'Nom de la classe en français');
 });
 const schoolBtn=q('#auth2AddSchool',modal);
 if(schoolBtn)schoolBtn.textContent=fr()?'Créer et ouvrir l’école':'إنشاء المدرسة وفتحها';
 qa('[data-sf]',modal).forEach(inp=>{const n=normalizeEducation(inp.value);if(n!==inp.value)inp.value=n});
}

function polishStructure(modal){
 const addTerm=q('#addTerm',modal),addClass=q('#addClass',modal);
 if(addTerm){addTerm.classList.add('ux-secondary-action');addTerm.textContent='+ إضافة فصل دراسي'}
 if(addClass){addClass.classList.add('ux-secondary-action');addClass.textContent='+ إضافة قسم'}
 const save=q('.action.primary',modal);if(save)save.classList.add('ux-primary-action');
}

function enhance(root=document){
 const modals=root?.matches?.('.modal')?[root]:qa('.modal',root);
 modals.forEach(modal=>{
   translateModal(modal);
   enhanceSubjects(modal);
   inviteSummary(modal);
   polishStructure(modal);
 });
}
const css=document.createElement('style');css.id='nataiji-admin-ux-polish-v1-style';css.textContent=`
.ux-secondary-action{
 width:100%!important;min-height:44px!important;border:1px solid #cbdbe5!important;border-radius:11px!important;
 background:#fff!important;color:#274e69!important;font-weight:800!important;padding:10px 14px!important;
 box-shadow:none!important
}
.ux-primary-action{min-height:46px!important;border-radius:11px!important;font-weight:800!important}
.nataiji-subjects-compact .modal-card{padding-bottom:26px!important}
.nataiji-subjects-compact .bi-subject{
 display:block!important;padding:9px 10px!important;margin:7px 0!important;border-radius:12px!important
}
.nataiji-subjects-compact .bi-subject-head{min-height:38px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 34px 34px!important;gap:6px!important}
.nataiji-subjects-compact .bi-subject-head b{
 min-width:0!important;font-size:13.5px!important;line-height:1.35!important;overflow-wrap:anywhere!important
}
.nataiji-subjects-compact .bi-subject-toggle,.nataiji-subjects-compact .bi-subject-delete{
 width:34px!important;height:34px!important;border-radius:9px!important
}
.nataiji-subjects-compact .bi-subject-toggle{
 border:1px solid #d6e2ea!important;background:#f7fafc!important;color:#41647c!important;font-weight:900!important;font-size:16px!important
}
.nataiji-subjects-compact .bi-subject.collapsed>label{display:none!important}
.nataiji-subjects-compact .bi-subject:not(.collapsed)>label{display:block!important;margin:7px 0!important}
.nataiji-subjects-compact .bi-subject:not(.collapsed) input{height:42px!important;border-radius:9px!important}
.nataiji-subjects-compact .bi-subject-total{bottom:58px!important;margin:8px 0!important;padding:8px 10px!important}
.nataiji-subjects-compact .bi-subject-actions{padding-top:6px!important}
.nataiji-subjects-compact #biSubjectRows{padding-bottom:4px!important}
.auth2-invite .modal-card{max-height:92dvh!important}
.auth2-invite .auth2-class-access{padding:8px!important;margin:7px 0!important}
.auth2-invite .auth2-class-scope{gap:5px!important;margin-top:6px!important;padding-top:6px!important}
.auth2-invite .auth2-subject-list{grid-template-columns:1fr!important;gap:0!important;opacity:1!important;margin-top:2px!important}
.auth2-invite .auth2-subject-perm{grid-template-columns:minmax(0,1fr) 104px!important;padding:5px 0!important}
.auth2-invite .auth2-subject-perm small{font-size:10.5px!important}
.auth2-invite .auth2-subject-mode{height:38px!important;padding:5px 7px!important;font-size:12px!important}
.auth2-invite .auth2-perms{gap:7px!important;padding:10px!important}
.auth2-invite-summary{
 margin:10px 0 8px!important;padding:10px 11px!important;border:1px solid #cfe3ef!important;border-radius:11px!important;
 background:#f5fbff!important;color:#294d65!important;display:grid!important;gap:4px!important;line-height:1.45!important
}
.auth2-invite-summary b{color:#0c7fc5!important;font-size:12.5px!important}
.auth2-invite-summary span{font-size:12px!important;font-weight:700!important}
.auth2-invite-summary small{font-size:11px!important;color:#657c8c!important}
.auth2-invite>.modal-card>.action,.auth2-invite .modal-card>.action{width:100%!important;min-height:46px!important;border-radius:11px!important}
@media(max-width:650px){
 .nataiji-subjects-compact .modal-card{max-height:92dvh!important}
 .auth2-invite .modal-card{padding-bottom:22px!important}
}
`;document.head.appendChild(css);

new MutationObserver(m=>{for(const x of m){for(const n of x.addedNodes){if(n.nodeType!==1)continue;const modal=n.matches?.('.modal')?n:n.closest?.('.modal');if(modal)enhance(modal)}}}).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('DOMContentLoaded',()=>enhance());
setTimeout(()=>enhance(),500);
})();