(()=>{
'use strict';
if(window.__nataijiNativeReportPrint)return;
window.__nataijiNativeReportPrint=true;
const cap=window.Capacitor;
const native=cap?.isNativePlatform?.()===true||cap?.getPlatform?.()==='android'||cap?.getPlatform?.()==='ios';
if(!native)return;
function finish(){
 if(typeof window.nataijiFinishPrintLifecycle==='function')window.nataijiFinishPrintLifecycle();
 else{delete document.body.dataset.print;document.body.classList.remove('print-two-a4');window.dispatchEvent(new Event('nataiji-print-finished'))}
}
window.addEventListener('nataiji-native-print-finished',finish);
window.print=function(){
 const supported=Array.isArray(cap.PluginHeaders)&&cap.PluginHeaders.some(p=>p.name==='NataijiPrint');
 if(supported&&typeof cap.nativePromise==='function'){
  return cap.nativePromise('NataijiPrint','print',{}).catch(()=>{finish();showHelp(true)});
 }
 finish();showHelp(false);
};
function showHelp(failed){
 const french=localStorage.getItem('nataiji-lang')==='fr';
 const title=french?'Impression / PDF':'الطباعة / PDF';
 const text=failed?(french?'Impossible d’ouvrir l’impression. Réessayez ou utilisez le navigateur.':'تعذر فتح الطباعة. حاول مجددًا أو استخدم المتصفح.'):(french?'Cette version nécessite une mise à jour pour imprimer depuis l’application. Vous pouvez aussi ouvrir Nataiji dans Chrome, vous connecter au même compte et choisir « Enregistrer au format PDF ».':'تحتاج هذه النسخة إلى تحديث لتفعيل الطباعة من التطبيق. يمكنك أيضًا فتح نتائجي في Chrome والدخول بحسابك نفسه، ثم اختيار «حفظ بصيغة PDF».');
 const box=modal(title,`<p>${text}</p><input class="nataiji-print-browser-link" value="https://nataiji.onrender.com/" dir="ltr" readonly><button class="primary nataiji-copy-print-link">${french?'Copier le lien':'نسخ رابط نتائجي'}</button><p class="message"></p>`);
 const input=box.querySelector('input');input.onclick=()=>input.select();
 box.querySelector('button.nataiji-copy-print-link').onclick=async()=>{try{await navigator.clipboard.writeText(input.value);box.querySelector('.message').textContent=french?'Lien copié. Ouvrez-le dans Chrome.':'تم نسخ الرابط. افتحه في Chrome.'}catch{input.focus();input.select()}};
}
})();
