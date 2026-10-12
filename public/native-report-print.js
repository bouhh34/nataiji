(()=>{
'use strict';
if(window.__nataijiNativeReportPrint)return;
window.__nataijiNativeReportPrint=true;
const cap=window.Capacitor;
const native=cap?.isNativePlatform?.()===true||cap?.getPlatform?.()==='android'||cap?.getPlatform?.()==='ios';
const supported=Array.isArray(cap?.PluginHeaders)&&cap.PluginHeaders.some(p=>p.name==='NataijiPrint');
// Existing installations keep their own browser/WebView PDF implementation.
// Only intercept printing when this binary actually includes our native plugin.
if(!native||!supported||typeof cap.nativePromise!=='function')return;
const originalPrint=window.print;
function finish(){
 if(typeof window.nataijiFinishPrintLifecycle==='function')window.nataijiFinishPrintLifecycle();
 else{delete document.body.dataset.print;document.body.classList.remove('print-two-a4');window.dispatchEvent(new Event('nataiji-print-finished'))}
}
window.addEventListener('nataiji-native-print-finished',finish);
window.print=function(){
 return cap.nativePromise('NataijiPrint','print',{}).catch(()=>{
  try{return originalPrint.call(window)}
  catch{finish();alert(localStorage.getItem('nataiji-lang')==='fr'?'Impossible d’ouvrir l’impression. Réessayez.':'تعذر فتح الطباعة. حاول مجددًا.')}
 });
};
})();
