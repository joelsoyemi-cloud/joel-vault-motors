import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {BufferGeometry,BufferAttribute} from 'three';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const profiles=JSON.parse(await fs.readFile(path.join(root,'app/lib/surfaces.json'),'utf8'));
const files={corvette:'chevrolet-corvette',camaro:'chevrolet-camaro-pro',gullwing:'mercedes-benz-300sl-gullwing',countach:'lamborghini-countach-25th',turbo:'porsche-911'};
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const [id,file]of Object.entries(files)){
 const doc=await io.read(path.join(root,'public/models',file+'.glb'));const names=new Set(doc.getRoot().listMaterials().map(m=>m.getName()));let vertices=0;
 for(const name of Object.keys(profiles[id]))if(!names.has(name))throw Error('Unknown surface '+id+'/'+name);
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const geometry=new BufferGeometry();const a=p.getAttribute('POSITION');geometry.setAttribute('position',new BufferAttribute(a.getArray(),3,a.getNormalized()));
  const old=p.getAttribute('NORMAL');if(old)geometry.setAttribute('normal',new BufferAttribute(old.getArray(),3,old.getNormalized()));
  const index=p.getIndices();if(index)geometry.setIndex(new BufferAttribute(index.getArray(),1));
  geometry.deleteAttribute('normal');geometry.deleteAttribute('tangent');geometry.computeVertexNormals();const n=geometry.getAttribute('normal');
  if(!(n.array instanceof Float32Array))throw Error('Normals are not full precision');
  for(let i=0;i<n.count;i++){const length=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));if(!Number.isFinite(length)||(length>1e-5&&Math.abs(length-1)>.001))throw Error('Invalid normals in '+id)}
  vertices+=n.count;geometry.dispose();
 }
 console.log('GEOMETRY_VERIFIED',id,vertices,'vertices; Float32 normals; all surface names valid');
}
