'use client';
import {useEffect,useRef,useState} from 'react';
import {sceneFrame} from '../lib/assets';
import {Car,clamp} from '../lib/cars';
import {frameCar,VEHICLES} from '../lib/framing';
import type {Stage} from '../lib/showroom';
let gpuSupported:boolean|undefined;
function Frame({car,n,opacity=1}:{car:Car;n:number;opacity?:number}){
 const size=VEHICLES[car.id].size;const landscape=frameCar(car,n/48,1.6,size).zoom,portrait=frameCar(car,n/48,.5,size).zoom;
 return <picture style={{opacity,'--landscape-zoom':landscape,'--portrait-zoom':portrait} as React.CSSProperties}><source media="(max-width:700px)" srcSet={sceneFrame(car.id,'portrait',n)}/><img src={sceneFrame(car.id,'landscape',n)} alt="" draggable={false}/></picture>
}
export default function Showroom({car,progress,angle,active,onMode}:{car:Car;progress:number;angle:string;active:boolean;onMode:(m:string)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<Stage|null>(null),values=useRef({progress,angle});const [live,setLive]=useState(false);
 values.current={progress,angle};
 useEffect(()=>{
  if(!active){setLive(false);return}let cancelled=false;let current:Stage|null=null;onMode('cinematic');
  const lost=(e:Event)=>{e.preventDefault();setLive(false);gpuSupported=false;onMode('cinematic')};const el=canvas.current;el?.addEventListener('webglcontextlost',lost);
  if(gpuSupported!==false)import('../lib/showroom').then(({createShowroom})=>{
   if(cancelled||!el)return;
   const error=(e:unknown)=>{if(!cancelled){if(e instanceof Error&&/WebGL|context/i.test(e.message))gpuSupported=false;setLive(false);onMode('cinematic')}};
   try{current=createShowroom(el,car,()=>{if(!cancelled){gpuSupported=true;setLive(true);onMode('live')}},error);stage.current=current;current.setProgress(values.current.progress,values.current.angle)}catch(e){error(e)}
  }).catch(()=>{if(!cancelled)onMode('cinematic')});
  return()=>{cancelled=true;el?.removeEventListener('webglcontextlost',lost);stage.current=null;current?.dispose()};
 },[active,car,onMode]);
 useEffect(()=>{stage.current?.setProgress(progress,angle)},[progress,angle]);
 useEffect(()=>{if(!active||live)return;const folder=matchMedia('(max-width:700px)').matches?'portrait':'landscape';const images:HTMLImageElement[]=[];let cancelled=false;
  // Fetch a few at a time rather than flooding the mobile connection.
  let next=0;const load=()=>{if(cancelled||next>48)return;const img=new Image();img.onload=img.onerror=load;img.src=sceneFrame(car.id,folder,next++);images.push(img)};for(let i=0;i<4;i++)load();
  return()=>{cancelled=true;images.forEach(img=>{img.onload=null;img.onerror=null})};
 },[active,car.id,live]);
 const f=clamp(progress)*48,lo=Math.floor(f),hi=Math.min(48,lo+1);
 return <div className="showroom" role="img" aria-label={`${car.year} ${car.brand} ${car.name}, ${Math.round(progress*100)} percent revealed`}>
  <img className="scene-ambience" src={`/posters/${car.id}-v2.webp`} alt="" loading="lazy" draggable={false}/>
  <div className={`film ${live?'film-hidden':''}`}><Frame car={car} n={lo}/><Frame car={car} n={hi} opacity={f-lo}/></div>
  {active&&<canvas ref={canvas} className={live?'stage-canvas ready':'stage-canvas'} aria-hidden="true"/>}
  <div className="stage-vignette"/>
 </div>
}
