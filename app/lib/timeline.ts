import {clamp} from './cars';
export const revealAt=(p:number)=>clamp(p/.72);
export const chapterProgress=(top:number,height:number,viewport:number)=>clamp(-top/Math.max(1,height-viewport));
