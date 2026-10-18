import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('public/index.html'),sw=read('public/sw.js');
const css=read('public/director-premium-v1.css'),js=read('public/director-v1.js');

test('director visuals ship to both web and Android offline shell',()=>{
 for(const asset of ['director-premium-v1.css?v=1','director-v1.js?v=3']){
  assert.ok(html.includes('/'+asset),'index missing '+asset);
  assert.ok(sw.includes('/'+asset),'offline cache missing '+asset);
 }
 assert.match(sw,/nataiji-shell-v173/);
 assert.match(html,/<link rel="stylesheet" href="\/director-v1\.css\?v=2" \/>[\s\S]*<link rel="stylesheet" href="\/director-premium-v1\.css\?v=1" \/>/);
});
test('all fourteen registers have semantic SVG icons, medical records remain locked',()=>{
 for(const id of ['enrolment','correspondence','visits','visitor-log','daily-attendance','supervision','student-absence','staff-meetings','inventory','referrals','notice-board','model-lessons','teacher-health','student-health']){
  assert.match(js,new RegExp("(?:'"+id+"'|"+id+")\\s*:\\s*\\["));
 }
 assert.match(js,/directorSvgPaths=/);
 assert.match(js,/directorIcon=\(name,size=20\)/);
 assert.match(js,/stroke="currentColor"/);
 assert.match(js,/health\.has\(key\)/);
 assert.doesNotMatch(js,/health\.has\(key\)\?'🔒':'▤'/);
});
test('mobile responsive tiles, RTL controls, and accessibility markers are present',()=>{
 for(const c of ['.director-app .director-card{','.director-app .director-card-icon{','.director-app .director-top{','@media(max-width:530px)','@media(max-width:350px)','director-tone-blue','director-tone-purple','director-tone-amber','director-tone-locked'])assert.ok(css.includes(c),c);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(js,/aria-disabled="true"/);
 assert.match(js,/aria-hidden="true"/);
 assert.match(js,/id="directorTeacherArea"/);
 assert.match(js,/id="directorLogout"/);
});
test('director visuals remain scoped and legacy print and offline sync survive',()=>{
 assert.doesNotMatch(css,/(^|\n)\s*(?:body|button|article|h1|div)\s*\{/);
 assert.match(css,/@media print/);
 assert.match(js,/window\.NataijiDirectorOutbox/);
 assert.match(js,/function printDirectorRecord\(/);
});