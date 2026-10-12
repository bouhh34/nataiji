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
fs.copyFileSync('native/android/NataijiPrintPlugin.java',path.join(directory,'NataijiPrintPlugin.java'));
console.log('Android printing installed; application ID and signing configuration unchanged');
