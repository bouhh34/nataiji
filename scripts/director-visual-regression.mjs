import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('public/index.html'),sw=read('public/sw.js'),css=read('public/director-v1.css'),js=read('public/director-v1.js');

test('the original director theme, not the premium redesign, loads on web and Android offline',()=>{
 for(const asset of ['director-v1.css?v=9','director-v1.js?v=15']){
  assert.ok(html.includes('/'+asset),'index missing '+asset);
  assert.ok(sw.includes('/'+asset),'offline shell missing '+asset);
 }
 assert.doesNotMatch(html,/director-premium-v1\.css/);
 assert.doesNotMatch(sw,/director-premium-v1\.css/);
 assert.match(sw,/nataiji-shell-v196/);
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

test('collective attendance print includes every teacher and escapes user text',()=>{
 const context={esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};
 vm.createContext(context);vm.runInContext(js.slice(js.indexOf('const staffStatuses='),js.indexOf('async function editStaffAttendance')),context);
 const output=context.staffAttendanceTable({record_date:'2026-10-20',details:{staff:[{name:'محمد',status:'present',time:'08:00',notes:'<script>bad</script>'},{name:'Fatima',status:'absent',time:'',notes:''}]}});
 assert.match(output,/محمد/);assert.match(output,/Fatima/);assert.match(output,/حاضر \/ Présent/);assert.match(output,/غائب \/ Absent/);assert.match(output,/<thead>/);assert.match(output,/2026-10-20/);assert.doesNotMatch(output,/<script>/);assert.match(output,/&lt;script&gt;/);
});

test('director reads share in-flight requests and writes invalidate short-lived cache',async()=>{
 let calls=0;
 const ctx={api:async()=>{calls++;return {ok:true}},navigator:{onLine:true},user:{id:'director-a'},institution:{id:'school-a'},Date,Map,Promise,Error};
 vm.createContext(ctx);
 vm.runInContext(js.slice(js.indexOf('const directorReadCache='),js.indexOf('function apiPost')),ctx);
 await Promise.all([ctx.network('/api/director/overview'),ctx.network('/api/director/overview')]);assert.equal(calls,1);
 await ctx.network('/api/director/overview');assert.equal(calls,1);
 await ctx.network('/api/director/registers/one',{method:'DELETE'});
 await ctx.network('/api/director/overview');assert.equal(calls,3);
 ctx.user={id:'director-b'};await ctx.network('/api/director/overview');assert.equal(calls,4);
 ctx.navigator.onLine=false;await assert.rejects(()=>ctx.network('/api/director/overview'),/offline/);
});


test('director record actions present edit, delete, and PDF in that order',()=>{
 const row=js.slice(js.indexOf('const savedHtml='),js.indexOf("$('#directorRecords').innerHTML="));
 assert.ok(row.indexOf('data-director-edit')<row.indexOf('data-director-delete'));
 assert.ok(row.indexOf('data-director-delete')<row.indexOf('data-director-print'));
 assert.match(js,/confirm\(t\('حذف هذا السجل من القائمة؟'/);
 assert.ok(js.includes("$('[data-director-delete]').forEach"));
});
