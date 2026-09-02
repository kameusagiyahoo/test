import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

async function collectJavaScript(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const path=join(dir,entry.name);
    if(entry.isDirectory())files.push(...await collectJavaScript(path));
    else if(entry.isFile()&&(entry.name.endsWith('.js')||entry.name.endsWith('.mjs')))files.push(path);
  }
  return files;
}

const files=[
  ...await collectJavaScript('src'),
  ...await collectJavaScript('scripts'),
  'sw.js'
].sort();

for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}

console.log(`Syntax OK: ${files.length} JavaScript files`);
