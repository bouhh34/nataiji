import assert from 'node:assert/strict';
import {test} from 'node:test';
import {preserveArchivedAssignments,snapshotDepartingResults} from '../src/professor-collaboration.js';
const profile=()=>({classes:[{id:'local',name:'1AS',sharedClassId:'room',students:[{id:'p1',name:'أحمد'}]}],assignments:[{id:'a1',classId:'local',subject:'الرياضيات',subjectKey:'math',archived:true}],marks:{a1:{p1:{terms:{1:{tests:['0'],exam:'ABSENT'},2:{tests:['13'],exam:'16'}}}}}});
test('stale saves cannot reactivate or erase an archived subject and its marks',()=>{
 const before=profile(),candidate=profile();candidate.assignments[0].archived=false;candidate.marks.a1={};
 const result=preserveArchivedAssignments(before,candidate);assert.deepEqual(result,before);
 candidate.assignments=[];candidate.classes=[];candidate.marks={};assert.deepEqual(preserveArchivedAssignments(before,candidate),before);
});
test('generic profile saves cannot forge archival status',()=>{
 const before=profile();before.assignments[0].archived=false;const next=profile();assert.equal(preserveArchivedAssignments(before,next).assignments[0].archived,false);
});
test('departing snapshots preserve existing classroom data, all terms, zero and absence',()=>{
 const p=profile(),room={name:'1AS',students:[{id:'p1'}],resultArchives:[{key:'other:a2',marks:{}}],removedUserIds:['old']};
 const snap=snapshotDepartingResults(room,p,'teacher','room');assert.equal(snap.resultArchives.length,2);assert.deepEqual(snap.resultArchives[1].marks,p.marks.a1);assert.deepEqual(snap.students,room.students);assert.deepEqual(snap.removedUserIds,['old']);
 p.marks.a1.p1.terms[1].tests[0]='20';assert.equal(snap.resultArchives[1].marks.p1.terms[1].tests[0],'0');assert.equal(room.resultArchives.length,1);
 assert.equal(snapshotDepartingResults(snap,p,'teacher','room').resultArchives.length,2);
 assert.equal(snapshotDepartingResults(room,p,'teacher','unrelated').resultArchives.length,1);
});
