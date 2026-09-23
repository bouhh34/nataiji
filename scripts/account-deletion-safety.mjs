import assert from 'node:assert/strict';
import {ownedSchoolIdsForDeletion} from '../src/account-ownership.js';

assert.deepEqual(ownedSchoolIdsForDeletion({role:'teacher',schoolId:'school-shared'}),[]);
assert.deepEqual(ownedSchoolIdsForDeletion({baseRole:'teacher',role:'teacher',schoolId:'school-shared',ownedSchoolIds:['school-shared']}),[]);
assert.deepEqual(ownedSchoolIdsForDeletion({role:'professor',schoolId:'school-shared'}),[]);
assert.deepEqual(ownedSchoolIdsForDeletion({baseRole:'admin',role:'admin',schoolId:'legacy-school'}),['legacy-school']);
assert.deepEqual(ownedSchoolIdsForDeletion({baseRole:'admin',role:'admin',schoolId:'active',ownedSchoolIds:['school-a','school-b','school-a']}),['school-a','school-b']);
assert.deepEqual(ownedSchoolIdsForDeletion({baseRole:'owner',role:'owner',schoolId:'owner-school',ownedSchoolIds:['owner-school']}),['owner-school']);

console.log('Account deletion school-ownership safety checks passed');
