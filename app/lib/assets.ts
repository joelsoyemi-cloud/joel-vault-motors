// Bump this when replacing scene binaries or rendered frames.
export const SCENE_VERSION='cloth-2';
export const sceneAsset=(path:string)=>`${path}?v=${SCENE_VERSION}`;
export const sceneFrame=(id:string,format:string,n:number)=>sceneAsset(`/films/${id}/${format}/${String(n).padStart(2,'0')}.webp`);
