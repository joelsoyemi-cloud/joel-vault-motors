import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Car,cameraPose,smooth} from './cars';

export type Stage = {setProgress:(p:number,angle:string)=>void;dispose:()=>void};
export async function createShowroom(canvas:HTMLCanvasElement,car:Car,onReady:()=>void):Promise<Stage>{
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
 let disposed=false;let model:THREE.Group|undefined;let cloth:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>|undefined;let base:number[][]=[];let drapeWidth=1.5;let lastP=0,lastAngle='signature';
 const resize=()=>{if(disposed)return;const rect=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();render(lastP,lastAngle)};
 function render(p:number,angle:string){
  if(disposed)return;lastP=p;lastAngle=angle;
  const pose=cameraPose(car,p,angle);const fit=Math.max(1,1.45/camera.aspect);camera.position.set(pose.x*fit,pose.targetY+(pose.y-pose.targetY)*fit,pose.z*fit);camera.lookAt(0,pose.targetY,0);
  if(cloth&&base.length){const pos=cloth.geometry.getAttribute('position') as THREE.BufferAttribute;const width=drapeWidth;
   for(let i=0;i<base.length;i++){
    const [x,z,y]=base[i];const s=(((car.axis==='x'?x/3.05:z/width)*car.side)+1)/2;const q=smooth((p*1.75-s*.5)/1.25);const lift=Math.sin(q*Math.PI)*(1.25+.32*Math.sin(z*3+x*2));
    const ex=car.axis==='x'?car.side*4.05+x*.21:x*.45;const ez=car.axis==='x'?z*.42:car.side*(width+1.45)+z*.24;const ey=.12+.1*Math.sin(x*8+z*5)**2+.08*Math.sin(z*12)**2;
    pos.setXYZ(i,x+(ex-x)*q,y+(ey-y)*q+lift,-(z+(ez-z)*q));
   }pos.needsUpdate=true;cloth.geometry.computeVertexNormals();
  }
  renderer.render(scene,camera);
 }
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 try{
  const [gltf,drape]=await Promise.all([loader.loadAsync('/models/'+car.file+'.glb'),fetch('/drapes/'+car.id+'.json').then(r=>{if(!r.ok)throw new Error('Drape unavailable');return r.json()})]);
  if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});throw new Error('Stage disposed')}
  model=gltf.scene;const box=new THREE.Box3().setFromObject(model);let size=box.getSize(new THREE.Vector3());if(size.z>size.x)model.rotation.y=Math.PI/2;if(car.flip)model.rotation.y+=Math.PI;box.setFromObject(model);size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar(5.5/size.x);box.setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y+=.02-box.min.y;
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){if(!/glass/i.test(m.name))m.roughness=Math.max(.2,m.roughness);if(/chrome|silver/i.test(m.name)){m.metalness=.95;m.roughness=.23}m.envMapIntensity=.8}})}});scene.add(model);
  base=drape.base;drapeWidth=Math.max(...base.map(v=>Math.abs(v[1])));const nx=drape.nx as number,nz=drape.nz as number;const vertices=new Float32Array(base.length*3);const indices:number[]=[];
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const k=j*nx+i;indices.push(k,k+nx,k+1,k+1,k+nx,k+nx+1)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.setIndex(indices);
  const satin=new THREE.MeshStandardMaterial({color:'#aaa79f',metalness:.18,roughness:.58,side:THREE.DoubleSide});cloth=new THREE.Mesh(geometry,satin);cloth.castShadow=true;cloth.receiveShadow=true;cloth.frustumCulled=false;scene.add(cloth);render(lastP,lastAngle);onReady();
 }catch(error){dispose();throw error}
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose()})}});env.dispose();pmrem.dispose();renderer.dispose()}
 return {setProgress:render,dispose};
}
