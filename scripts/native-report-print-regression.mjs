import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const source=fs.readFileSync(new URL('../public/native-report-print.js',import.meta.url),'utf8');
function fixture(cap){
 let nativeCalls=0,finishes=0,help=0,printCalls=0;const events={},original=()=>{printCalls++};
 const node={value:'https://nataiji.onrender.com/',select(){},focus(){},textContent:''};
 const window={Capacitor:cap,print:original,addEventListener:(name,fn)=>events[name]=fn,nataijiFinishPrintLifecycle:()=>finishes++};
 if(cap?.nativePromise)cap.nativePromise=async(...args)=>{nativeCalls++;assert.equal(JSON.stringify(args),JSON.stringify(['NataijiPrint','print',{}]));return{}};
 const ctx=vm.createContext({window,localStorage:{getItem:()=>null},modal:()=>{help++;return{querySelector:()=>node}},navigator:{clipboard:{writeText:async()=>{}}},document:{body:{dataset:{},classList:{remove(){}}}},Event});vm.runInContext(source,ctx);return{window,events,original,get printCalls(){return printCalls},get nativeCalls(){return nativeCalls},get finishes(){return finishes},get help(){return help}};
}
test('web browser printing retains its original print function',()=>{const f=fixture();assert.equal(f.window.print,f.original)});
test('Android dispatches to PrintManager plugin and retains the report until returning',async()=>{const f=fixture({getPlatform:()=>'android',PluginHeaders:[{name:'NataijiPrint'}],nativePromise:()=>{}});await f.window.print();assert.equal(f.nativeCalls,1);assert.equal(f.finishes,0);f.events['nataiji-native-print-finished']();assert.equal(f.finishes,1);assert.equal(f.help,0)});
test('existing Android installations retain direct PDF printing with no update dialog',()=>{const f=fixture({getPlatform:()=>'android',PluginHeaders:[]});assert.equal(f.window.print,f.original);f.window.print();assert.equal(f.finishes,0);assert.equal(f.help,0);assert.equal(f.nativeCalls,0);assert.equal(f.printCalls,1)});
test('a failed native plugin falls back to the original print implementation',async()=>{const cap={getPlatform:()=>'android',PluginHeaders:[{name:'NataijiPrint'}],nativePromise:()=>{}};const f=fixture(cap);const original=f.window.print;cap.nativePromise=async()=>{throw Error('native unavailable')};await original();assert.equal(f.printCalls,1);assert.equal(f.finishes,0);assert.equal(f.help,0)});
