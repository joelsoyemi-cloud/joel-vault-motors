'use client';
import {useEffect,useRef,useState} from 'react';
import {Car,clamp} from '../lib/cars';
import type {Stage} from '../lib/showroom';
export default function Showroom({car,progress,angle,onMode}:{car:Car;progress:number;angle:string;onMode:(m:string)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null);const stage=useRef<Stage|null>(null);const values=useRef({progress,angle});const [live,setLive]=useState(false);const [frames,setFrames]=useState(false);const [failed,setFailed]=useState(false);
 values.current={progress,angle};
 useEffect(()=>{let cancelled=false;let current:Stage|null=null;setLive(false);setFrames(false);setFailed(false);onMode('loading');
  const lost=(e:Event)=>{e.preventDefault();setLive(false);onMode('cinematic')};const el=canvas.current;el?.addEventListener('webglcontextlost',lost);
  const preload=new Image();preload.onload=()=>{if(!cancelled)setFrames(true)};preload.onerror=()=>{if(!cancelled)setFailed(true)};preload.src=`/reveals/${car.id}/00.webp`;
  import('../lib/showroom').then(async({createShowroom})=>{
   if(cancelled||!canvas.current)return;
   try{current=await createShowroom(canvas.current,car,()=>{if(!cancelled){setLive(true);onMode('live')}});if(cancelled){current.dispose();return}stage.current=current;current.setProgress(values.current.progress,values.current.angle)}catch{if(!cancelled)onMode('cinematic')}
  }).catch(()=>{if(!cancelled)onMode('cinematic')});
  return()=>{cancelled=true;el?.removeEventListener('webglcontextlost',lost);stage.current=null;current?.dispose()};
 },[car,onMode]);
 useEffect(()=>{stage.current?.setProgress(progress,angle)},[progress,angle]);
 useEffect(()=>{if(live||!frames)return;const images:HTMLImageElement[]=[];for(let i=0;i<=32;i++){const img=new Image();img.src=`/reveals/${car.id}/${String(i).padStart(2,'0')}.webp`;images.push(img)}return()=>{images.length=0}},[car.id,live,frames]);
 const f=clamp(progress)*32,lo=Math.floor(f),hi=Math.min(32,lo+1);
 return <div className="showroom" aria-label={`${car.year} ${car.brand} ${car.name} in a cinematic showroom`} role="img">
  <img className="stage-poster" src={failed?`/posters/${car.id}.webp`:`/reveals/${car.id}/00.webp`} alt="" draggable={false}/>
  {frames&&!live&&<div className="sequence"><img src={`/reveals/${car.id}/${String(lo).padStart(2,'0')}.webp`} alt="" draggable={false}/><img src={`/reveals/${car.id}/${String(hi).padStart(2,'0')}.webp`} style={{opacity:f-lo}} alt="" draggable={false}/></div>}
  <canvas ref={canvas} className={live?'stage-canvas ready':'stage-canvas'} aria-hidden="true" />
  <div className="stage-vignette"/>
  {failed&&!live&&<span className="asset-note">Showroom preview · use a WebGL enabled browser for the live reveal</span>}
 </div>
}
