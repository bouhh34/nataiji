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
function finish(){
 busy=false;
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
if(native())window.print=function(){
 if(!supported()){failed();return}
 if(busy)return;busy=true;
 return window.Capacitor.nativePromise('NataijiPrint','print',{landscape:landscapeForCurrentPrint()}).catch(error=>{console.error('Native printing failed',error);failed()});
};
})();
