import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const manifestFile=resolve('assets-manifest.json');
if(!existsSync(manifestFile))throw new Error('The showroom asset manifest is missing.');
const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
const root=resolve('public');let count=0;
for(const part of manifest.parts){
 if(!/^showroom-v[23]-(?:(?:model|scenes)-[a-z-]+|environment)\.json\.gz$/.test(part.file))throw new Error('Invalid asset bundle name.');
 const file=resolve(part.file);if(!existsSync(file))throw new Error(`Missing showroom bundle: ${part.file}`);
 const bytes=readFileSync(file);if(createHash('sha256').update(bytes).digest('hex')!==part.sha256)throw new Error(`Showroom bundle checksum failed: ${part.file}`);
 const assets=JSON.parse(gunzipSync(bytes).toString('utf8'));
 if(Object.keys(assets).length!==part.assets)throw new Error(`Incomplete showroom bundle: ${part.file}`);
 for(const [name,base64] of Object.entries(assets)){
  const dest=resolve(root,name);if(!dest.startsWith(root+sep)||typeof base64!=='string')throw new Error('Invalid asset path.');
  mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,Buffer.from(base64,'base64'));count++;
 }
}
if(count!==manifest.totalAssets)throw new Error('The showroom asset count does not match the manifest.');
console.log(`Prepared ${count} verified showroom assets.`);
