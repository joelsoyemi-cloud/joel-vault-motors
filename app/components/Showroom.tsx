'use client';
import {useEffect,useRef,useState} from 'react';
import {FILM_LAST,sceneFrame} from '../lib/assets';
import {Car,clamp} from '../lib/cars';
import {frameCar,VEHICLES} from '../lib/framing';
import {revealAt} from '../lib/timeline';
import type {Stage} from '../lib/showroom';
let gpuSupported:boolean|undefined;
function Frame({car,n,opacity=1}:{car:Car;n:number;opacity?:number}){
 const size=VEHICLES[car.id].size;
 return <picture style={{opacity,'--landscape-zoom':frameCar(car,n/FILM_LAST,1.6,size).zoom,'--portrait-zoom':frameCar(car,n/FILM_LAST,.5,size).zoom} as React.CSSProperties}><source media="(max-width:700px)" srcSet={sceneFrame(car.id,'portrait',n)}/><img src={sceneFrame(car.id,'landscape',n)} alt="" draggable={false}/></picture>
}
export default function Showroom({car,progress,angle,active}:{car:Car;progress:number;angle:string;active:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<Stage|null>(null),values=useRef({progress,angle});const [live,setLive]=useState(false);values.current={progress,angle};
 useEffect(()=>{
  if(!active){setLive(false);return}let cancelled=false,current:Stage|null=null;const el=canvas.current;
  const lost=(e:Event)=>{e.preventDefault();setLive(false);gpuSupported=false};el?.addEventListener('webglcontextlost',lost);
  if(gpuSupported!==false)import('../lib/showroom').then(({createShowroom})=>{
   if(cancelled||!el)return;const error=(e:unknown)=>{if(!cancelled){if(e instanceof Error&&/WebGL|context/i.test(e.message))gpuSupported=false;setLive(false)}};
   try{current=createShowroom(el,car,()=>{if(!cancelled){gpuSupported=true;setLive(true)}},error);stage.current=current;current.setProgress(values.current.progress,values.current.angle)}catch(e){error(e)}
  }).catch(()=>{if(!cancelled)setLive(false)});
  return()=>{cancelled=true;el?.removeEventListener('webglcontextlost',lost);stage.current=null;current?.dispose()};
 },[active,car]);
 useEffect(()=>{stage.current?.setProgress(progress,angle)},[progress,angle]);
 useEffect(()=>{
  if(!active||live)return;const format=matchMedia('(max-width:700px)').matches?'portrait':'landscape';let cancelled=false,next=0;
  const priority=[0,FILM_LAST,Math.round(FILM_LAST/2)];const order=[...priority,...Array.from({length:FILM_LAST+1},(_,i)=>i).filter(n=>!priority.includes(n))];const images:HTMLImageElement[]=[];
  const load=()=>{if(cancelled||next>=order.length)return;const img=new Image();img.onload=img.onerror=load;img.src=sceneFrame(car.id,format,order[next++]);images.push(img)};for(let i=0;i<3;i++)load();
  return()=>{cancelled=true;images.forEach(img=>{img.onload=null;img.onerror=null})};
 },[active,car.id,live]);
 const f=clamp(progress)*FILM_LAST,lo=Math.floor(f),hi=Math.min(FILM_LAST,lo+1);
 return <div className="showroom" role="img" aria-label={`${car.year} ${car.brand} ${car.name}, ${Math.round(revealAt(progress)*100)} percent revealed`}><img className="scene-ambience" src={`/posters/${car.id}-v3.webp`} alt="" loading="lazy" draggable={false}/><div className={`film ${live?'film-hidden':''}`}><Frame car={car} n={lo}/><Frame car={car} n={hi} opacity={f-lo}/></div>{active?<canvas ref={canvas} className={live?'stage-canvas ready':'stage-canvas'} aria-hidden="true"/>:null}<div className="stage-vignette"/></div>
}
