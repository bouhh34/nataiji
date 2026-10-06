import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postgresConnectionString,postgresSslOptions} from '../src/postgres-ssl.js';

test('local PostgreSQL stays usable without TLS',()=>{
 assert.equal(postgresSslOptions('postgres://user:pass@localhost:5432/nataiji'),false);
 assert.equal(postgresSslOptions('postgres://user:pass@[::1]:5432/nataiji'),false);
});
test('remote PostgreSQL verifies certificates by default',()=>{
 assert.deepEqual(postgresSslOptions('postgres://user:pass@db.example.test/nataiji'),{rejectUnauthorized:true});
});
test('provider CA PEM is supported, including escaped newlines',()=>{
 assert.deepEqual(postgresSslOptions('postgres://db.example.test/nataiji','line1\\nline2'),{rejectUnauthorized:true,ca:'line1\nline2'});
});

test('connection string cannot override TLS verification with ssl query options',()=>{
 const clean=new URL(postgresConnectionString('postgres://db.example.test/nataiji?sslmode=no-verify&sslrootcert=/tmp/ca.pem&application_name=nataiji'));
 assert.equal(clean.searchParams.has('sslmode'),false);assert.equal(clean.searchParams.has('sslrootcert'),false);assert.equal(clean.searchParams.get('application_name'),'nataiji');
});
