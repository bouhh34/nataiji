import fs from 'node:fs';
import path from 'node:path';
const directory=path.resolve('android/app/src/main/java/mr/nataiji/app');
const activity=path.join(directory,'MainActivity.java');
if(!fs.existsSync(activity))throw new Error('Generate the existing mr.nataiji.app Android project first');
const source=fs.readFileSync(activity,'utf8');
if(!/package mr\.nataiji\.app;/.test(source))throw new Error('Unexpected Android application package');
if(!source.includes('registerPlugin(NataijiPrintPlugin.class)')){
 if(!/extends BridgeActivity\s*\{\s*\}/.test(source))throw new Error('Review custom MainActivity before installing printing');
 fs.writeFileSync(activity,source.replace('import com.getcapacitor.BridgeActivity;', 'import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;').replace(/extends BridgeActivity\s*\{\s*\}/,'extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(NataijiPrintPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}'));
}
// Keep the existing Capacitor remote origin for cookies, grade journals and printing.
// Serve bundled *public* assets only when the Android device is offline.
let nativeActivity=fs.readFileSync(activity,'utf8');
if(!nativeActivity.includes('NataijiOfflineWebViewClient(getBridge(), this)')){
 const init='super.onCreate(savedInstanceState);';
 if(!nativeActivity.includes(init))throw new Error('Review unexpected MainActivity before adding offline fallback');
 nativeActivity=nativeActivity.replace(init,`super.onCreate(savedInstanceState);
        getBridge().getWebView().setWebViewClient(new NataijiOfflineWebViewClient(getBridge(), this));
        // BridgeActivity starts navigation during super.onCreate. Restart it
        // after installing the interceptor only if the device has no network.
        if (NataijiOfflineWebViewClient.isOffline(this)) {
            getBridge().getWebView().loadUrl("https://nataiji.onrender.com/");
        }`);
 fs.writeFileSync(activity,nativeActivity);
}
fs.copyFileSync('native/android/NataijiOfflineWebViewClient.java',
 path.join(directory,'NataijiOfflineWebViewClient.java'));
const manifestPath=path.resolve('android/app/src/main/AndroidManifest.xml');
let manifest=fs.readFileSync(manifestPath,'utf8');
if(!manifest.includes('android.permission.ACCESS_NETWORK_STATE')){
 if(!manifest.includes('<application'))throw new Error('Unexpected generated AndroidManifest.xml');
 manifest=manifest.replace('<application',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\\n    <application');
 manifest=manifest.replace(' />\\n    <application',' />\n    <application');
 fs.writeFileSync(manifestPath,manifest);
}
if(!fs.existsSync('android/app/src/main/assets/public/index.html'))
 throw new Error('Android bundle missing public/index.html; refusing offline release');
fs.copyFileSync('native/android/NataijiPrintPlugin.java',path.join(directory,'NataijiPrintPlugin.java'));
console.log('Android printing and offline static asset fallback installed; user identity and signing unchanged');
