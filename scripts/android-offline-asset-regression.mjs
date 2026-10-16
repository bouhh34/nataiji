import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const native=read('native/android/NataijiOfflineWebViewClient.java');
const prepare=read('scripts/prepare-android-print.mjs');
const config=read('capacitor.config.ts');

test('offline Android assets preserve the remote origin used by authenticated WebView storage',()=>{
 assert.match(config,/url:\s*'https:\/\/nataiji\.onrender\.com'/);
 assert.match(native,/HOST\s*=\s*"nataiji\.onrender\.com"/);
 assert.match(native,/extends BridgeWebViewClient/);
 assert.match(native,/context\.getAssets\(\)\.open\(asset\)/);
 assert.match(native,/public\/.*index\.html/);
});
test('native fallback never intercepts or answers API, health or unrelated host requests',()=>{
 assert.match(native,/request\.getMethod\(\)/);
 assert.match(native,/uri\.getHost\(\)/);
 assert.match(native,/path\.startsWith\("\/api\/"\)/);
 assert.match(native,/path\.equals\("\/health"\)/);
 assert.match(native,/if \(!isOffline\(context\)\) return super\.shouldInterceptRequest/);
 assert.match(native,/return super\.shouldInterceptRequest\(view, request\)/);
 assert.match(native,/path\.contains\("\.\."\)/);
 assert.doesNotMatch(native,/CookieManager|WebStorage|DELETE|POST|PUT/);
});
test('build step installs fallback after Capacitor sync and keeps native printing intact',()=>{
 const wf=read('.github/workflows/mobile-android-release.yml');
 assert.match(wf,/npx cap sync android && node scripts\/prepare-android-print\.mjs/);
 assert.match(prepare,/NataijiOfflineWebViewClient\(getBridge\(\), this\)/);
 assert.match(prepare,/registerPlugin\(NataijiPrintPlugin\.class\)/);
 assert.match(prepare,/ACCESS_NETWORK_STATE/);
 assert.match(prepare,/android\/app\/src\/main\/assets\/public\/index\.html/);
 assert.match(prepare,/NataijiPrintPlugin\.java/);
});
test('the bundled public shell contains all scripts needed for school and professor offline resume',()=>{
 const html=read('public/index.html');
 for(const name of ['offline-session-v1.js','school-grade-journal.js','professor-v2.js','auth-access-v2.js'])assert.ok(html.includes('/'+name+'?'));
});
