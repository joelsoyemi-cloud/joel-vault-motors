import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import profiles from './surfaces.json';
import {revealAt} from './timeline';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Car,clamp} from './cars';
import {sceneAsset} from './assets';
import {frameCar} from './framing';

type Surface={kind:string;metalness:number;roughness:number;clearcoat?:number;color?:string};
function finishMaterial(source:THREE.MeshStandardMaterial,profile:Surface|undefined){
 if(!profile){source.envMapIntensity=.85;return source}
 const m=new THREE.MeshPhysicalMaterial({name:source.name,color:source.color,map:source.map,vertexColors:source.vertexColors,normalMap:source.normalMap,normalScale:source.normalScale,aoMap:source.aoMap,aoMapIntensity:source.aoMapIntensity,emissive:source.emissive,emissiveMap:source.emissiveMap,emissiveIntensity:source.emissiveIntensity,alphaMap:source.alphaMap,alphaTest:source.alphaTest,opacity:source.opacity,transparent:source.transparent,side:source.side,depthWrite:source.depthWrite,metalness:profile.metalness,roughness:profile.roughness,envMapIntensity:.85});m.normalScale.multiplyScalar(.6);
 if(profile.color){m.color.set(profile.color);m.map=null}
 if(profile.kind==='paint'){m.clearcoat=profile.clearcoat??.85;m.clearcoatRoughness=.19}
 if(profile.kind==='glass'){m.color.set('#e1e9e8');m.map=null;m.opacity=1;m.transparent=false;m.depthWrite=true;m.transmission=.94;m.ior=1.48;m.thickness=0}
 return m;
}
export type Stage = {setProgress:(p:number,angle:string)=>void;dispose:()=>void};
export function createShowroom(canvas:HTMLCanvasElement,car:Car,onReady:()=>void,onError:(error:unknown)=>void):Stage{
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#758084');scene.fog=new THREE.FogExp2('#758084',.025);
 const camera=new THREE.PerspectiveCamera(47,1,.1,100);
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();let env=pmrem.fromScene(room,.04);room.dispose();scene.environment=env.texture;scene.environmentIntensity=.65;
 const hemisphere=new THREE.HemisphereLight('#e4eaf0','#444948',.55);scene.add(hemisphere);
 const key=new THREE.DirectionalLight('#fff6e9',2.2);key.position.set(3,7,3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.0004;key.shadow.normalBias=.025;key.shadow.radius=4;scene.add(key);
 const rim=new THREE.DirectionalLight('#fff7ec',1.4);rim.position.set(-4,5,-4);scene.add(rim);
 const fill=new THREE.DirectionalLight('#edf4ff',.8);fill.position.set(5,4,5);scene.add(fill);
 const ground=new THREE.MeshStandardMaterial({color:'#656e72',roughness:.36,metalness:.025,side:THREE.DoubleSide});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),ground);floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const sweep=Array.from({length:17},(_,i)=>new THREE.Vector2(8+3*Math.sin(Math.PI/2*i/16),3*(1-Math.cos(Math.PI/2*i/16))-.02));sweep.push(new THREE.Vector2(11,15));const cove=new THREE.Mesh(new THREE.LatheGeometry(sweep,96),ground);cove.receiveShadow=true;scene.add(cove);
 let disposed=false;let cloth:THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>|undefined;
 let packed:Uint16Array|undefined;let meta:{frameCount:number;vertexCount:number;nx:number;ny:number;min:number[];scale:number[];carSize:[number,number,number]}|undefined;
 let lastP=0,lastAngle='signature';const abort=new AbortController();
 function render(p:number,angle:string){
  if(disposed)return;lastP=p;lastAngle=angle;
  const pose=frameCar(car,p,camera.aspect,meta?.carSize??[5.5,1.5,2.3],angle);camera.fov=pose.fov;camera.zoom=pose.zoom;camera.updateProjectionMatrix();camera.position.set(...pose.position);camera.lookAt(...pose.target);
  if(cloth&&packed&&meta){
   const f=revealAt(clamp(p))*(meta.frameCount-1),lo=Math.floor(f),hi=Math.min(meta.frameCount-1,lo+1),mix=f-lo,stride=meta.vertexCount*3;
   const pos=cloth.geometry.getAttribute('position') as THREE.BufferAttribute;const out=pos.array as Float32Array;
   for(let i=0;i<stride;i++){const axis=i%3;out[i]=meta.min[axis]+(packed[lo*stride+i]*(1-mix)+packed[hi*stride+i]*mix)*meta.scale[axis]}
   pos.needsUpdate=true;cloth.geometry.computeVertexNormals();
  }
  renderer.render(scene,camera);
 }
 const resize=()=>{if(disposed)return;const rect=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=rect.width/Math.max(1,rect.height);render(lastP,lastAngle)};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 async function asset(path:string){const r=await fetch(sceneAsset(path),{signal:abort.signal});if(!r.ok)throw new Error('Showroom asset unavailable');return r}
 void (async()=>{
  const [modelData,motionData,positionData,environmentData]=await Promise.all([asset('/models/'+car.file+'.glb').then(r=>r.arrayBuffer()),asset('/motion/'+car.id+'.json').then(r=>r.json()),asset('/motion/'+car.id+'.bin').then(r=>r.arrayBuffer()),asset('/environment/studio-small-03.hdr').then(r=>r.arrayBuffer())]);
  if(disposed)return;const hdr=new HDRLoader().parse(environmentData);const texture=new THREE.DataTexture(hdr.data,hdr.width,hdr.height,THREE.RGBAFormat,hdr.type);texture.colorSpace=THREE.LinearSRGBColorSpace;texture.flipY=true;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;const nextEnv=pmrem.fromEquirectangular(texture);texture.dispose();env.dispose();env=nextEnv;scene.environment=env.texture;
  if(disposed)return;const gltf=await loader.parseAsync(modelData,'/models/');
  if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose()})}});return}
  const model=gltf.scene;const box=new THREE.Box3().setFromObject(model);let size=box.getSize(new THREE.Vector3());if(size.z>size.x)model.rotation.y=Math.PI/2;if(car.flip)model.rotation.y+=Math.PI;box.setFromObject(model);size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar(5.5/size.x);box.setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y+=.02-box.min.y;
  const surfaces=profiles[car.id as keyof typeof profiles] as Record<string,Surface>;const finished=new Map<THREE.Material,THREE.Material>();
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.deleteAttribute('normal');o.geometry.deleteAttribute('tangent');o.geometry.computeVertexNormals();o.castShadow=true;o.receiveShadow=true;const finish=(m:THREE.Material)=>{if(finished.has(m))return finished.get(m)!;const result=m instanceof THREE.MeshStandardMaterial?finishMaterial(m,surfaces[m.name]):m;finished.set(m,result);return result};o.material=Array.isArray(o.material)?o.material.map(finish):finish(o.material)}});for(const [source,result]of finished)if(source!==result)source.dispose();scene.add(model);
  meta=motionData;packed=new Uint16Array(positionData);
  if(!meta||packed.length!==meta.frameCount*meta.vertexCount*3)throw new Error('Incomplete cloth motion');
  const indices:number[]=[];for(let j=0;j<meta.ny-1;j++)for(let i=0;i<meta.nx-1;i++){const k=j*meta.nx+i;indices.push(k,k+1,k+meta.nx+1,k,k+meta.nx+1,k+meta.nx)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(meta.vertexCount*3),3));geometry.setIndex(indices);
  const silk=new THREE.MeshPhysicalMaterial({color:'#a6aaa9',metalness:.03,roughness:.55,transmission:.035,thickness:.0005,sheen:.6,sheenColor:new THREE.Color('#fff5e0'),sheenRoughness:.5,side:THREE.DoubleSide});
  cloth=new THREE.Mesh(geometry,silk);cloth.castShadow=true;cloth.receiveShadow=true;cloth.frustumCulled=false;scene.add(cloth);render(lastP,lastAngle);onReady();
 })().catch(error=>{if(!disposed){dispose();onError(error)}});
 function dispose(forceLoss=false){if(disposed)return;disposed=true;abort.abort();observer.disconnect();packed=undefined;scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose()})}});env.dispose();pmrem.dispose();renderer.dispose();if(forceLoss)renderer.forceContextLoss()}
 return {setProgress:render,dispose:()=>dispose(true)};
}
