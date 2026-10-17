/* Teacher-only student roster shortcut. Reuse both existing importer handlers and
   the original #addStudent element, icon, click action and visual styling untouched. */
(()=>{
'use strict';
if(window.__nataijiStudentQuickImportV1)return;
window.__nataijiStudentQuickImportV1=true;
const q=(selector,root=document)=>root.querySelector(selector);
const isFrench=()=>localStorage.getItem('nataiji-lang')==='fr';
function canManageStudents(){
  if(document.documentElement.classList.contains('nataiji-professor-mode'))return false;
  try{
    return typeof currentUser!=='undefined'&&!!currentUser&&
      (currentUser.role==='admin'||currentUser.permissions?.includes('pupils'));
  }catch{return false}
}
function label(ar,fr){return isFrench()?fr:ar}
function closeMenu(){
  const menu=q('#studentImportChoices'),btn=q('#studentImportQuickBtn');
  if(menu)menu.hidden=true;
  if(btn)btn.setAttribute('aria-expanded','false');
}
function sync(){
  const page=q('[data-page="students"]'),header=q('.section-head',page);
  const add=q('#addStudent',header);
  if(!page||!header||!add)return;
  const allowed=canManageStudents();
  let btn=q('#studentImportQuickBtn',header);
  let menu=q('#studentImportChoices',header);
  if(!allowed){
    if(btn)btn.hidden=true;
    if(menu)menu.hidden=true;
    header.classList.remove('student-quick-import-ready');
    return;
  }
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';btn.id='studentImportQuickBtn';
    btn.className='student-import-quick-button';
    btn.setAttribute('aria-controls','studentImportChoices');
    btn.setAttribute('aria-haspopup','true');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<i data-feather="upload-cloud" aria-hidden="true"></i><span></span>';
    add.insertAdjacentElement('afterend',btn);
    btn.addEventListener('click',()=>{
      if(btn.hidden)return;
      const wasHidden=menu.hidden;
      menu.hidden=!wasHidden;
      btn.setAttribute('aria-expanded',wasHidden?'true':'false');
      if(wasHidden)menu.querySelector('button')?.focus();
    });
  }
  if(!menu){
    menu=document.createElement('div');
    menu.id='studentImportChoices';
    menu.className='student-import-quick-choices';
    menu.hidden=true;
    menu.setAttribute('role','group');
    menu.innerHTML='<button type="button" data-student-import="document"><i data-feather="file-text" aria-hidden="true"></i><span></span></button><button type="button" data-student-import="spreadsheet"><i data-feather="grid" aria-hidden="true"></i><span></span></button>';
    btn.insertAdjacentElement('afterend',menu);
    menu.addEventListener('click',e=>{
      const choice=e.target.closest?.('button[data-student-import]');
      if(!choice)return;
      const target=q(choice.dataset.studentImport==='document'?'#importDocumentBtn':'#importBtn',page);
      closeMenu();
      if(target && !target.disabled)target.click(); // existing PDF/OCR or CSV import path
    });
  }
  btn.hidden=false;
  q('span',btn).textContent=label('استيراد ملف','Importer un fichier');
  btn.title=label('استيراد PDF أو صورة أو Excel / CSV','Importer PDF, photo, Excel ou CSV');
  menu.setAttribute('aria-label',label('خيارات استيراد التلاميذ','Options d’importation des élèves'));
  q('[data-student-import="document"] span',menu).textContent=label('PDF أو صورة','PDF ou photo');
  q('[data-student-import="spreadsheet"] span',menu).textContent=label('Excel أو CSV','Excel ou CSV');
  header.classList.add('student-quick-import-ready');
  if(window.feather)window.feather.replace({class:'lux-feather','stroke-width':1.8});
}
document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-view="students"]'))setTimeout(sync,60);
  if(!event.target.closest?.('#studentImportQuickBtn,#studentImportChoices'))closeMenu();
},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!q('#studentImportChoices')?.hidden){
    closeMenu();q('#studentImportQuickBtn')?.focus();
  }
});
window.addEventListener('pageshow',()=>setTimeout(sync,80));
window.addEventListener('storage',event=>{
  if(event.key==='nataiji-lang')setTimeout(sync,30);
});
document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,180));
setTimeout(sync,450);setTimeout(sync,1400);
})();