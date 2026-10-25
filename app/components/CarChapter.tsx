'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {CARS,Car,clamp} from '../lib/cars';
import Showroom from './Showroom';
export function Arrow({up=false}:{up?:boolean}){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={up?{transform:'rotate(180deg)'}:undefined}><path d="M12 4v15m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.2"/></svg>}
export default function CarChapter({car,index,active,motion,enableMotion}:{car:Car;index:number;active:boolean;motion:boolean;enableMotion:()=>void}){
 const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[direction,setDirection]=useState(1),[angle,setAngle]=useState('signature'),[mode,setMode]=useState('cinematic'),[dragging,setDragging]=useState(false);
 const pRef=useRef(0),drag=useRef<{x:number;p:number;id:number}|null>(null);pRef.current=progress;
 const onMode=useCallback((m:string)=>setMode(m),[]);
 useEffect(()=>{if(!active||!motion)setPlaying(false)},[active,motion]);
 useEffect(()=>{if(!playing||!active||!motion)return;let raf=0,before=0;
  const tick=(now:number)=>{if(document.hidden){before=0;raf=requestAnimationFrame(tick);return}if(!before)before=now;const dt=(now-before)/6500;before=now;const next=clamp(pRef.current+dt*direction);pRef.current=next;setProgress(next);if(dt>0&&(next===0||next===1))setPlaying(false);else raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[playing,active,motion,direction]);
 const play=()=>{if(playing){setPlaying(false);return}if(!motion)enableMotion();if(progress>=1)setDirection(-1);else if(progress<=0)setDirection(1);setPlaying(true)};
 const reverse=()=>{if(!motion)enableMotion();if(progress<=0){setProgress(1);pRef.current=1;setDirection(-1)}else if(progress>=1)setDirection(-1);else setDirection(d=>-d);setPlaying(true)};
 const begin=(e:React.PointerEvent<HTMLElement>)=>{if((e.target as HTMLElement).closest('button,input,a,select'))return;drag.current={x:e.clientX,p:pRef.current,id:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);setPlaying(false);setDragging(true)};
 const move=(e:React.PointerEvent<HTMLElement>)=>{if(!drag.current||drag.current.id!==e.pointerId)return;const p=clamp(drag.current.p+(e.clientX-drag.current.x)/(Math.min(innerWidth,1200)*.62));pRef.current=p;setProgress(p)};
 const end=()=>{drag.current=null;setDragging(false)};
 const Title=index===0?'h1':'h2';
 const next=index<4?`#${CARS[index+1].id}`:'#stories';
 return <section id={car.id} className={`car-chapter ${dragging?'is-dragging':''}`} aria-labelledby={`${car.id}-title`} data-chapter={index} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
  <Showroom car={car} progress={progress} angle={angle} active={active} onMode={onMode}/>
  <div className="chapter-topline"><p><span/>{car.brand.toUpperCase()} <i>/</i> {car.year}</p><span>REVEAL STUDY {String(index+1).padStart(2,'0')} <b>/ 05</b></span></div>
  <div className="chapter-prompt" style={{opacity:clamp(1-progress*4)}} aria-hidden="true"><div className="drag-orbit"><span>↔</span></div><p>DRAG TO REVEAL</p><small>A little curiosity goes a long way.</small></div>
  <span className="chapter-year" aria-hidden="true">{car.year}</span>
  <div className="chapter-title"><span className="eyebrow">{car.edition}</span><Title id={`${car.id}-title`}>{car.name}</Title><p>{car.tagline}</p><a href={`#${car.id}-story`}>The story & details <span>↗</span></a></div>
  <div className="chapter-caption"><span>{car.path}</span><p>{car.body}<i/>{car.origin}</p></div>
  {mode==='live'&&<div className="view-controls" aria-label={`${car.name} camera viewpoint`}><span>VIEW</span>{[['signature','Signature'],['front','Front'],['rear','Rear'],['top','Above'],['wheel','Wheel']].map(([id,label])=><button key={id} aria-pressed={angle===id} onClick={()=>{setAngle(id);setPlaying(false)}}>{label}</button>)}</div>}
  <div className="chapter-controls" aria-label={`${car.name} reveal controls`}>
   <button className="play-button" onClick={play} aria-label={playing?`Pause ${car.name} reveal`:`Play ${car.name} reveal`}><svg viewBox="0 0 20 20" aria-hidden="true">{playing?<path d="M6 5h2v10H6zm6 0h2v10h-2z"/>:<path d="m7 4 9 6-9 6z"/>}</svg></button>
   <div className="reveal-track"><div><label htmlFor={`${car.id}-range`}>THE REVEAL</label><span>{String(Math.round(progress*100)).padStart(2,'0')} <i>/ 100</i></span></div><input id={`${car.id}-range`} aria-label={`${car.name} reveal`} aria-valuetext={`${Math.round(progress*100)} percent revealed`} type="range" min="0" max="1000" step="1" value={Math.round(progress*1000)} style={{'--fill':`${progress*100}%`} as React.CSSProperties} onChange={e=>{setPlaying(false);pRef.current=Number(e.target.value)/1000;setProgress(pRef.current)}}/></div>
   <button className="reverse-button" onClick={reverse} aria-label={`Reverse ${car.name} reveal`}><span>↶</span> Reverse</button>
   <button className="reset-button" onClick={()=>{setPlaying(false);setProgress(0);setAngle('signature')}} aria-label={`Reset ${car.name} reveal`}>↺</button>
   <a className="next-chapter" href={next}><span>{index<4?'SCROLL TO THE NEXT ICON':'GO BEYOND THE SILHOUETTE'}</span><Arrow/></a>
  </div>
 </section>
}
