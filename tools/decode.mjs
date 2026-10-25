import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dequantize} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dir=path.dirname(fileURLToPath(import.meta.url));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const root=path.resolve(dir,'..');
await fs.mkdir(path.join(dir,'render-models'),{recursive:true});
for(const f of await fs.readdir(root+'/public/models')){
 const doc=await io.read(root+'/public/models/'+f);
 for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
 await doc.transform(dequantize());
 await io.write(path.join(dir,'render-models',f),doc);
 console.log('Decoded',f);
}
