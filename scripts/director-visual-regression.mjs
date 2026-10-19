import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('public/index.html'),sw=read('public/sw.js'),css=read('public/director-v1.css'),js=read('public/director-v1.js');

test('the original director theme, not the premium redesign, loads on web and Android offline',()=>{
 for(const asset of ['director-v1.css?v=7','director-v1.js?v=10']){
  assert.ok(html.includes('/'+asset),'index missing '+asset);
  assert.ok(sw.includes('/'+asset),'offline shell missing '+asset);
 }
 assert.doesNotMatch(html,/director-premium-v1\.css/);
 assert.doesNotMatch(sw,/director-premium-v1\.css/);
 assert.match(sw,/nataiji-shell-v187/);
});
test('the classic large register cards and original dashboard are restored',()=>{
 assert.match(css,/\.director-card\{[^}]*min-height:130px/);
 assert.match(css,/\.director-welcome\{/);
 assert.match(css,/\.director-stats\{/);
 assert.match(css,/\.director-top\{/);
 assert.match(js,/class="director-welcome"/);
 assert.match(js,/class="director-tools"/);
 assert.match(js,/class="director-card"/);
 assert.match(js,/<b>'\+t\(ar,fr\)\+'<\/b>/);
 assert.doesNotMatch(js,/class="director-card-arrow"/);
});
test('meaningful local SVG icons remain for all 14 registers without external font dependencies',()=>{
 for(const id of ['enrolment','correspondence','visits','visitor-log','daily-attendance','supervision','student-absence','staff-meetings','inventory','referrals','notice-board','model-lessons','teacher-health','student-health'])assert.match(js,new RegExp("(?:'"+id+"'|"+id+")\\s*:\\s*\\["));
 assert.match(js,/directorSvgPaths=/);
 assert.match(js,/directorIcon\(graphic,23\)/);
 assert.match(js,/stroke="currentColor"/);
 assert.match(js,/aria-disabled="true"/);
 assert.match(js,/health\.has\(currentCategory\)/);
});
test('school level routing and administrative features survive the presentation rollback',()=>{
 assert.match(js,/function directorTeachingAreaLabel\(/);
 assert.match(js,/institution\.level==='middle'\|\|institution\.level==='secondary'/);
 assert.match(js,/window\.NataijiProfessor\.openDirector\(user\)/);
 assert.match(js,/window\.NataijiDirectorOutbox/);
 assert.match(js,/function printDirectorRecord\(/);
 assert.match(css,/@media\(max-width:420px\)/);
});


test('every director subpage offers visible RTL-aware navigation without changing the homepage',()=>{
 assert.match(js,/function frame\(title,contents,options=\{\}\)/);
 assert.match(js,/id="directorBack"/);
 assert.match(js,/options\.backAction\?options\.backAction\(\):void dashboard\(\)/);
 assert.match(js,/directorTeachingAreaLabel\(\)/);
 assert.match(js,/class="director-empty director-empty-register"/);
 assert.match(js,/id="directorEmptyAdd"/);
 assert.match(js,/\{home:true\}/);
 assert.match(css,/\.director-app \.director-back\{/);
 assert.match(css,/\.director-app\.director-subpage \.director-wrap>h1\{/);
 assert.match(css,/\.director-app \.director-empty-register\{/);
 assert.match(css,/@media\(max-width:540px\)/);
});
