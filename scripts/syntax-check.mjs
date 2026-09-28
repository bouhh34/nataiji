import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const directory of ['src','public']) {
 for(const file of readdirSync(new URL('../'+directory+'/',import.meta.url))) {
  if(!file.endsWith('.js'))continue;
  const result=spawnSync(process.execPath,['--check',directory+'/'+file],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
 }
}
console.log('All server and frontend JavaScript syntax checks passed');
