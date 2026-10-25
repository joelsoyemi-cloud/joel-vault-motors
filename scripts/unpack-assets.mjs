import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {gunzipSync} from 'node:zlib';
// GitHub stores the binary showroom assets in one lossless bundle.
// Sites checkouts already contain the extracted public files.
const file=resolve('showroom-assets.json.gz');
if(existsSync(file)){
 const root=resolve('public');
 const assets=JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'));
 for(const [name,base64] of Object.entries(assets)){
  const dest=resolve(root,name);
  if(!dest.startsWith(root+sep)||typeof base64!=='string')throw new Error('Invalid asset path');
  mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,Buffer.from(base64,'base64'));
 }
 console.log(`Prepared ${Object.keys(assets).length} showroom assets.`);
}
