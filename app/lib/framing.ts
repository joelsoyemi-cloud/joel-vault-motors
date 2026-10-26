import {Car,smooth} from './cars';
import geometry from './vehicle-geometry.json';
type V=[number,number,number];
const vector=(p:number[]):V=>[p[0],p[1],p[2]];
export const VEHICLES:Record<string,{size:V;points:V[]}>=Object.fromEntries(Object.entries(geometry).map(([id,item])=>[id,{size:vector(item.size),points:item.points.map(vector)}]));
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit=(a:V):V=>{const n=Math.hypot(...a);return a.map(v=>v/n) as V};
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Fit the actual vehicle bounds to 92% of the screen width at every angle. */
export function frameCar(car:Car,p:number,aspect:number,size:V,angle='signature'){
 const portrait=aspect<.9,t=smooth(p);let az=car.start+car.sweep*t,h=car.elevation+car.height*t+(portrait?1.5:0),r=car.id==='countach'?5.8+2.4*t:8.2;
 if(angle==='front'){az=.55;h=1.9+(portrait?1.5:0);r=8.2}if(angle==='rear'){az=3.55;h=2.1+(portrait?1.5:0);r=8.2}if(angle==='top'){az=1.5;h=10;r=3.3}if(angle==='wheel'){az=2.4;h=.75;r=8.2}
 const center:V=[0,size[1]/2+.02,0];const dir=unit([Math.cos(az)*r,h-center[1],Math.sin(az)*r]);
 const right=unit(cross([0,1,0],dir)),up=unit(cross(dir,right));const tanH=Math.tan(40*Math.PI/360),tanV=tanH/aspect;
 let distance=0;
 for(const x of [-size[0]/2,size[0]/2])for(const y of [-size[1]/2,size[1]/2])for(const z of [-size[2]/2,size[2]/2]){const v:V=[x,y,z],depth=dot(v,dir);distance=Math.max(distance,depth+Math.abs(dot(v,right))/(tanH*.92),depth+Math.abs(dot(v,up))/(tanV*(portrait?.52:.65)))}
 let maxX=0,maxY=0;
 for(const point of VEHICLES[car.id].points){const v=point.map((n,i)=>n-center[i]) as V,depth=distance-dot(v,dir);maxX=Math.max(maxX,Math.abs(dot(v,right)/depth/tanH));maxY=Math.max(maxY,Math.abs(dot(v,up)/depth/tanV))}
 const zoom=Math.min(.94/Math.max(maxX,.01),(portrait?.55:.68)/Math.max(maxY,.01));
 return {position:dir.map((v,i)=>center[i]+v*distance) as V,target:center,fov:Math.atan(tanV)*360/Math.PI,zoom};
}
