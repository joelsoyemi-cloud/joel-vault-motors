'use client';
import {memo,useRef,useState} from 'react';
import {CARS,Car,clamp} from '../lib/cars';
import {revealAt} from '../lib/timeline';
import Showroom from './Showroom';
export function Arrow({up=false}:{up?:boolean}){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={up?{transform:'rotate(180deg)'}:undefined}><path d="M12 4v15m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.2"/></svg>}
function CarChapter({car,index,active,motion,progress}:{car:Car;index:number;active:boolean;motion:boolean;progress:number}){
 const wrapper=useRef<HTMLElement>(null),[manual,setManual]=useState(1);
 const p=motion?progress:manual,Title=index===0?'h1':'h2',next=index<CARS.length-1?`#${CARS[index+1].id}`:'#stories';
 const phase=p<.03?'THE ARRIVAL':revealAt(p)<1?'THE UNVEILING':'THE DESIGN STUDY';
 return <section ref={wrapper} id={car.id} className="scroll-chapter" aria-labelledby={`${car.id}-title`}><div className="car-chapter" data-chapter={index}>
  <Showroom car={car} progress={p} angle="signature" active={active}/>
  <div className="chapter-topline"><p><span/>{car.brand.toUpperCase()} <i>/</i> {car.year}</p><span>STUDIO SESSION {String(index+1).padStart(2,'0')} <b>/ 05</b></span></div>
  <div className="chapter-prompt" style={{opacity:motion?clamp(1-p*9):0}} aria-hidden="true"><div className="drag-orbit"><span>↓</span></div><p>SCROLL TO UNCOVER</p><small>The collection moves with you.</small></div>
  <span className="chapter-year" aria-hidden="true">{car.year}</span>
  <div className="chapter-title"><span className="eyebrow">{car.edition}</span><Title id={`${car.id}-title`}>{car.name}</Title><p>{car.tagline}</p><a href={`#${car.id}-story`}>The story & details <span>↗</span></a></div>
  <div className="chapter-caption"><span>{car.path}</span><p>{car.body}<i/>{car.origin}</p></div>
  <div className="chapter-controls scroll-controls" aria-label={`${car.name} sequence controls`}><div className="scroll-instruction"><Arrow/><span>{motion?'SCROLL TO EXPLORE':'MOTION PAUSED'}<small>{motion?'Scroll up to retrace the reveal.':'Explore at your own pace.'}</small></span></div><div className="reveal-track scroll-track"><div><label htmlFor={`${car.id}-range`}>{motion?phase:'EXPLORE THE VIEW'}</label><span>{String(Math.round(p*100)).padStart(2,'0')} <i>/ 100</i></span></div>{motion?<progress id={`${car.id}-range`} max="1" value={p} aria-label={`${car.name} scroll sequence`}/>:<input id={`${car.id}-range`} aria-label={`${car.name} view`} type="range" min="0" max="1000" value={Math.round(p*1000)} style={{'--fill':`${p*100}%`} as React.CSSProperties} onChange={e=>setManual(Number(e.target.value)/1000)}/>}</div><button className="reset-button" aria-label={`Restart ${car.name} sequence`} onClick={()=>{if(motion)wrapper.current?.scrollIntoView({behavior:'smooth'});else setManual(0)}}>↺</button><a className="next-chapter" href={next}><span>{index<CARS.length-1?'NEXT STUDIO SESSION':'THE STORIES & DETAILS'}</span><Arrow/></a></div>
 </div></section>
}
export default memo(CarChapter);
