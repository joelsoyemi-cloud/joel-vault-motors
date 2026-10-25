import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Car,clamp} from './cars';
import {sceneAsset} from './assets';
import {frameCar} from './framing';

export type Stage = {setProgress:(p:number,angle:string)=>void;dispose:()=>void};
export function createShowroom(canvas:HTMLCanvasElement,car:Car,onReady:()=>void,onError:(error:unknown)=>void):Stage{
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#101416');scene.fog=new THREE.FogExp2('#101416',.025);
 const camera=new THREE.PerspectiveCamera(47,1,.1,100);
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);room.dispose();scene.environment=env.texture;scene.environmentIntensity=.75;
 const hemisphere=new THREE.HemisphereLight('#c5d2df','#28231d',1.4);scene.add(hemisphere);
 const key=new THREE.DirectionalLight('#e5edff',3);key.position.set(3,7,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.001;scene.add(key);
 const rim=new THREE.DirectionalLight('#ffc892',4);rim.position.set(-4,3,-5);scene.add(rim);
 const fill=new THREE.DirectionalLight('#c3d5ef',2);fill.position.set(-4,2,4);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#343638',roughness:.34,metalness:.35}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(50,10,.2),new THREE.MeshStandardMaterial({color:'#222729',roughness:.9}));wall.position.set(0,4,-12);scene.add(wall);
 const warm=new THREE.Mesh(new THREE.BoxGeometry(40,.045,.04),new THREE.MeshBasicMaterial({color:'#bc9167'}));warm.position.set(0,.65,-11.85);scene.add(warm);
 const stripMat=new THREE.MeshBasicMaterial({color:'#fff5df'});
 for(let i=0;i<4;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.06,.025,12),stripMat);bar.position.set(-5+i*3.5,3.6,-1);bar.rotation.y=.5;scene.add(bar)}
 let disposed=false;let cloth:THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>|undefined;
 let packed:Uint16Array|undefined;let meta:{frameCount:number;vertexCount:number;nx:number;ny:number;min:number[];scale:number[];carSize:[number,number,number]}|undefined;
 let lastP=0,lastAngle='signature';const abort=new AbortController();
 function render(p:number,angle:string){
  if(disposed)return;lastP=p;lastAngle=angle;
  const pose=frameCar(car,p,camera.aspect,meta?.carSize??[5.5,1.5,2.3],angle);camera.fov=pose.fov;camera.zoom=pose.zoom;camera.updateProjectionMatrix();camera.position.set(...pose.position);camera.lookAt(...pose.target);
  if(cloth&&packed&&meta){
   const f=clamp(p)*(meta.frameCount-1),lo=Math.floor(f),hi=Math.min(meta.frameCount-1,lo+1),mix=f-lo,stride=meta.vertexCount*3;
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
  const [modelData,motionData,positionData]=await Promise.all([asset('/models/'+car.file+'.glb').then(r=>r.arrayBuffer()),asset('/motion/'+car.id+'.json').then(r=>r.json()),asset('/motion/'+car.id+'.bin').then(r=>r.arrayBuffer())]);
  if(disposed)return;const gltf=await loader.parseAsync(modelData,'/models/');
  if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose()})}});return}
  const model=gltf.scene;const box=new THREE.Box3().setFromObject(model);let size=box.getSize(new THREE.Vector3());if(size.z>size.x)model.rotation.y=Math.PI/2;if(car.flip)model.rotation.y+=Math.PI;box.setFromObject(model);size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar(5.5/size.x);box.setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y+=.02-box.min.y;
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){if(!/glass/i.test(m.name))m.roughness=Math.max(.2,m.roughness);if(/chrome|silver/i.test(m.name)){m.metalness=.95;m.roughness=.23}m.envMapIntensity=.8}})}});scene.add(model);
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
