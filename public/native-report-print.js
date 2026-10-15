(()=>{
'use strict';
if(window.__nataijiNativeReportPrint)return;
window.__nataijiNativeReportPrint=true;
function native(){const c=window.Capacitor;return c?.isNativePlatform?.()===true||c?.getPlatform?.()==='android'||c?.getPlatform?.()==='ios'}
function supported(){const c=window.Capacitor;return typeof c?.nativePromise==='function'&&(c?.isPluginAvailable?.('NataijiPrint')===true||Array.isArray(c?.PluginHeaders)&&c.PluginHeaders.some(p=>p.name==='NataijiPrint'))}
function landscapeForCurrentPrint(){
 const type=document.body?.dataset?.print||'';
 if(document.querySelector?.('#teacherTimetable:not(.hidden)'))return true;
 if(type==='class'||(type==='portal'&&document.body?.dataset?.portalType==='class')){
  const count=typeof state==='object'&&Array.isArray(state?.subjects)?state.subjects.length:0;
  return count>=10;
 }
 return false;
}
let busy=false;
const originalPrint=window.print;
function currentPrintDocument(){
 const timetable=document.querySelector?.('#teacherTimetable:not(.hidden)');
 const roots={student:'#officialSheet',class:'#classReport .paper',list:'#listReport .paper','two-a4':'#twoStudentsA4',batch:'#printBatch',portal:'#printPortal'};
 const selector=timetable?'#teacherTimetable':roots[document.body.dataset.print];
 if(!selector)return null;
 window.dispatchEvent(new Event('beforeprint'));
 const source=document.querySelector(selector);if(!source)throw Error('Print document is unavailable');
 // RC4 already supports printHtml. Its separate WebView avoids the app WebView's
 // native dark background, which cannot be overridden reliably by page CSS.
 const doc=document.implementation.createHTMLDocument('Nataiji');
 for(const attr of document.documentElement.attributes)doc.documentElement.setAttribute(attr.name,attr.value);
 const base=doc.createElement('base');base.href=document.baseURI;doc.head.appendChild(base);
 for(const style of document.querySelectorAll('style,link[rel="stylesheet"]'))doc.head.appendChild(style.cloneNode(true));
 for(const attr of document.body.attributes)doc.body.setAttribute(attr.name,attr.value);
 const sourceCopy=source.cloneNode(true);
 // Form values live in properties after editing. Include unsaved timetable edits
 // in the print snapshot without writing them to the account or changing the UI.
 const originals=source.querySelectorAll('input,textarea,select');
 sourceCopy.querySelectorAll('input,textarea,select').forEach((control,i)=>{
  const value=originals[i].value;
  if(control.tagName==='TEXTAREA')control.textContent=value;
  else if(control.tagName==='SELECT')[...control.options].forEach(option=>option.toggleAttribute('selected',option.value===value));
  else control.setAttribute('value',value);
 });
 let content=sourceCopy;
 for(let parent=source.parentElement;parent&&parent!==document.body;parent=parent.parentElement){const wrapper=parent.cloneNode(false);wrapper.appendChild(content);content=wrapper}
 doc.body.appendChild(content);
 doc.querySelectorAll('script,iframe,object,embed').forEach(el=>el.remove());
 return {html:'<!doctype html>'+doc.documentElement.outerHTML,title:'Nataiji',landscape:landscapeForCurrentPrint()};
}
function finish(){
 busy=false;
 document.documentElement?.removeAttribute?.('data-nataiji-native-print');
 if(typeof window.nataijiFinishPrintLifecycle==='function')window.nataijiFinishPrintLifecycle();
 else{delete document.body.dataset.print;document.body.classList.remove('print-two-a4');window.dispatchEvent(new Event('nataiji-print-finished'))}
}
function failed(){finish();alert(localStorage.getItem('nataiji-lang')==='fr'?'La version Android installée ne prend pas en charge cette impression. Mettez à jour Nataiji depuis Google Play, puis réessayez.':'نسخة أندرويد المثبتة لا تدعم هذه الطباعة. حدّث نتائجي من Google Play ثم أعد المحاولة.')}
window.addEventListener('nataiji-native-print-finished',finish);
// Keep checking capabilities at the time of the click, after the native bridge is ready.
window.nataijiPrintDocument=async function({html,title='Nataiji',landscape=false}={}){
 if(!native())return false;
 if(!supported()){failed();return true}
 if(busy)return true;busy=true;
 try{await window.Capacitor.nativePromise('NataijiPrint','printHtml',{html,title,landscape})}
 catch(error){console.error('Native document printing failed',error);failed()}
 return true;
};
if(native())window.print=async function(){
 if(!supported()){failed();return}
 if(busy)return;busy=true;
 // Native WebView can include the app's dark background in the PDF page; isolate print roots.
 document.documentElement?.setAttribute?.('data-nataiji-native-print','');
 try{
  const report=currentPrintDocument();
  await window.Capacitor.nativePromise('NataijiPrint',report?'printHtml':'print',report||{landscape:landscapeForCurrentPrint()});
 }catch(error){console.error('Native printing failed',error);failed()}
};
})();
