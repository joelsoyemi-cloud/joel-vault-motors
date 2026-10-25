import bpy, math, os, sys, json, time
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
ROOT=str(Path(__file__).resolve().parents[1]/'public')
MODELS=str(Path(__file__).resolve().parent/'render-models')
CARS=[
 dict(id='corvette',file='chevrolet-corvette',start=.55,sweep=1.9,elev=1.35,height=.8,axis='x',side=1),
 dict(id='camaro',file='chevrolet-camaro-pro',start=3.5,sweep=-2.6,elev=1.4,height=.65,axis='x',side=-1),
 dict(id='gullwing',file='mercedes-benz-300sl-gullwing',start=1.25,sweep=-1.75,elev=7.8,height=-5.8,axis='z',side=1),
 dict(id='countach',file='lamborghini-countach-25th',start=2.7,sweep=-2.3,elev=.75,height=1.15,axis='z',side=-1),
 dict(id='turbo',file='porsche-911',start=4,sweep=2.7,elev=4.5,height=-2.7,axis='x',side=1),
]
def smooth(v):
 v=max(0,min(1,v));return v*v*(3-2*v)
def mat(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough;return m
def cube(name,loc,scale,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m);return o
def area(name,loc,power,color,size,target=(0,0,0),size_y=None):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='RECTANGLE';d.size=size;d.size_y=size_y or size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o

def setup(car):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=10;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4;scene.cycles.transparent_max_bounces=4
 scene.render.threads_mode='FIXED';scene.render.threads=8
 scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.film_transparent=False
 scene.world.color=(.09,.09,.09);scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.12,.14,.18,1);bg.inputs[1].default_value=.12
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0
 bpy.ops.import_scene.gltf(filepath=MODELS+'/'+car['file']+'.glb')
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();obj=bpy.context.object;obj.name='Vintage car';world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 obj.rotation_mode='XYZ'
 coords=[obj.matrix_world@Vector(c) for c in obj.bound_box];mi=Vector(tuple(min(v[i] for v in coords) for i in range(3)));ma=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
 if ma.y-mi.y>ma.x-mi.x:obj.rotation_euler.z=math.pi/2;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 obj.rotation_mode='XYZ'
 if car['id']=='camaro':obj.rotation_euler.z+=math.pi;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 coords=[obj.matrix_world@Vector(c) for c in obj.bound_box];mi=Vector(tuple(min(v[i] for v in coords) for i in range(3)));ma=Vector(tuple(max(v[i] for v in coords) for i in range(3)));fac=5.5/(ma.x-mi.x);obj.scale=(fac,)*3;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 coords=[obj.matrix_world@Vector(c) for c in obj.bound_box];mi=Vector(tuple(min(v[i] for v in coords) for i in range(3)));ma=Vector(tuple(max(v[i] for v in coords) for i in range(3)));obj.location+=Vector((-(mi.x+ma.x)/2,-(mi.y+ma.y)/2,.02-mi.z));bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
 for p in obj.data.polygons:p.use_smooth=True
 for m in obj.data.materials:
  if not m or not m.use_nodes:continue
  bs=m.node_tree.nodes.get('Principled BSDF')
  if bs and 'glass' not in m.name.lower() and not bs.inputs['Roughness'].is_linked:bs.inputs['Roughness'].default_value=max(.2,bs.inputs['Roughness'].default_value)
  if bs and ('chrome' in m.name.lower() or 'silver' in m.name.lower()):bs.inputs['Metallic'].default_value=.95;bs.inputs['Roughness'].default_value=.23
 ground=mat('Charcoal concrete',(.016,.018,.02),.35,.36)
 floor=cube('Monolithic floor',(0,0,-.12),(60,60,.2),ground)
 nodes=ground.node_tree.nodes;links=ground.node_tree.links;n=nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=18;n.inputs['Detail'].default_value=2;bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.15;bump.inputs['Distance'].default_value=.035;links.new(n.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
 wall=mat('Smoked concrete',(.035,.039,.042),.05,.75);cube('Back wall',(0,12,3),(45,.3,9),wall)
 glow=bpy.data.materials.new('Warm architectural light');glow.use_nodes=True;gb=glow.node_tree.nodes.get('Principled BSDF');gb.inputs['Base Color'].default_value=(1,.64,.3,1);gb.inputs['Emission Color'].default_value=(1,.64,.3,1);gb.inputs['Emission Strength'].default_value=5
 cube('Wall horizon',(0,11.7,.6),(40,.05,.065),glow)
 lightmat=bpy.data.materials.new('White overhead strips');lightmat.use_nodes=True;bs=lightmat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Emission Color'].default_value=(1,.94,.82,1);bs.inputs['Emission Strength'].default_value=8
 for i in range(4):
  bar=cube('Ceiling strip',(-5+i*3.5,1,3.6),(.1,12,.035),lightmat);bar.rotation_euler.z=-.5
 area('Main softbox',(0,-1,6),850,(.86,.9,1),7,(0,0,0),2)
 area('Warm rim',(-2,5,4),1000,(1,.75,.48),6,(0,0,.5),1.5)
 area('Front fill',(6,-4,3.2),550,(.8,.87,1),5,(0,0,.7),2)
 area('Rear strip',(-6,-2,2.8),600,(.82,.87,1),5,(0,0,.5),1)
 return scene,obj

# This renderer bakes Blender cloth physics once, then exports the sampled mesh
# for deterministic, reversible playback in the browser.
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
CACHE=Path(__file__).resolve().parent/'sim-cache'
NX,NY=73,49
FIRST,LAST,STEP=80,176,2

def create_cover(car,obj):
 proxy=obj.copy();proxy.data=obj.data.copy();bpy.context.collection.objects.link(proxy);proxy.name='Body collision';proxy.hide_render=True
 bpy.context.view_layer.objects.active=proxy
 dec=proxy.modifiers.new('Simplified body','DECIMATE');dec.ratio=.16
 bpy.ops.object.modifier_apply(modifier=dec.name)
 inflate=proxy.modifiers.new('Body clearance','DISPLACE');inflate.strength=.035;inflate.mid_level=0
 bpy.ops.object.modifier_apply(modifier=inflate.name)
 proxy.modifiers.new('Body collision','COLLISION');proxy.collision.thickness_outer=.018;proxy.collision.thickness_inner=.02;proxy.collision.cloth_friction=4
 floor=bpy.data.objects['Monolithic floor'];floor.modifiers.new('Floor collision','COLLISION');floor.collision.thickness_outer=.012;floor.collision.cloth_friction=3
 verts=[];faces=[]
 for j in range(NY):
  for i in range(NX):
   x=-3.7+7.4*i/(NX-1);y=-2.3+4.6*j/(NY-1)
   verts.append((x,y,2.25+.012*math.sin(x*7+y*6)))
   if i<NX-1 and j<NY-1:
    k=j*NX+i;faces.append((k,k+1,k+NX+1,k+NX))
 mesh=bpy.data.meshes.new('Fine woven satin');mesh.from_pydata(verts,[],faces);mesh.update()
 cloth=bpy.data.objects.new('Silk cover',mesh);bpy.context.collection.objects.link(cloth)
 silk=mat('Ivory silk',(.38,.4,.4),.03,.55);bs=silk.node_tree.nodes.get('Principled BSDF');bs.inputs['Transmission Weight'].default_value=.035;bs.inputs['Sheen Weight'].default_value=.6;bs.inputs['Sheen Roughness'].default_value=.5
 cloth.data.materials.append(silk)
 for f in mesh.polygons:f.use_smooth=True
 side=car['side'];axis=car['axis'];pins=[]
 for j in range(NY):
  for i in range(NX):
   if axis=='x':select=(i>=NX-3 if side>0 else i<3) and j<4
   else:select=(j<3 if side>0 else j>=NY-3) and i>=NX-4
   if select:pins.append(j*NX+i)
 group=cloth.vertex_groups.new(name='Lift corner');group.add(pins,1,'REPLACE')
 puller=bpy.data.objects.new('Soft corner pull',None);bpy.context.collection.objects.link(puller)
 hook=cloth.modifiers.new('Corner lift','HOOK');hook.object=puller;hook.vertex_indices_set(pins);hook.strength=1
 dx,dy=(side,-.1) if axis=='x' else (.15,-side);length=math.hypot(dx,dy);dx/=length;dy/=length
 for frame,dist,z in [(1,0,0),(45,0,-2.17),(80,0,-2.17),(104,1.8,1.0),(140,6.5,.6),(176,14,-1.5)]:
  puller.location=(dx*dist,dy*dist,z);puller.keyframe_insert(data_path='location',frame=frame)
 mod=cloth.modifiers.new('Physical silk','CLOTH');s=mod.settings;s.quality=7;s.mass=.035;s.air_damping=1.2;s.tension_stiffness=16;s.compression_stiffness=12;s.shear_stiffness=7;s.bending_stiffness=.008;s.tension_damping=5;s.compression_damping=5;s.shear_damping=4;s.bending_damping=.2;s.vertex_group_mass=group.name;s.pin_stiffness=1
 c=mod.collision_settings;c.use_collision=True;c.distance_min=.018;c.collision_quality=4;c.use_self_collision=True;c.self_distance_min=.012;c.self_friction=2
 mod.point_cache.frame_start=1;mod.point_cache.frame_end=LAST
 bpy.ops.object.effector_add(type='TURBULENCE',location=(0,0,1.5));breeze=bpy.context.object;breeze.name='Gentle fabric air';breeze.field.size=.8;breeze.field.noise=1.3
 for f,value in [(1,0),(80,0),(96,1.2),(150,.7),(176,.2)]:breeze.field.strength=value;breeze.field.keyframe_insert(data_path='strength',frame=f)
 return cloth,mod

def save_motion(car,poses,size):
 # Three uses Y up; Blender uses Z up.
 data=poses[:,:,[0,2,1]].copy();data[:,:,2]*=-1
 low=data.min(axis=(0,1));span=data.max(axis=(0,1))-low;scale=np.maximum(span/65535,1e-8)
 packed=np.rint((data-low)/scale).astype('<u2')
 p=Path(ROOT)/'motion';p.mkdir(exist_ok=True)
 (p/(car['id']+'.bin')).write_bytes(packed.tobytes())
 meta=dict(frameCount=len(data),vertexCount=NX*NY,nx=NX,ny=NY,min=low.tolist(),scale=scale.tolist(),carSize=[float(size.x),float(size.z),float(size.y)],encoding='uint16-le',source='Blender cloth simulation; soft corner pull; self collision; 0.5 mm surface')
 (p/(car['id']+'.json')).write_text(json.dumps(meta,separators=(',',':')))

def simulate(car,scene,obj):
 CACHE.mkdir(exist_ok=True);cache=CACHE/(car['id']+'.npz')
 if cache.exists():
  a=np.load(cache);poses=a['poses'];print('USING_CLOTH_CACHE',car['id'],flush=True)
  # Recreate only the render surface.
  mesh=bpy.data.meshes.new('Baked silk');faces=[]
  for j in range(NY-1):
   for i in range(NX-1):k=j*NX+i;faces.append((k,k+1,k+NX+1,k+NX))
  mesh.from_pydata(poses[0].tolist(),[],faces);mesh.update();cloth=bpy.data.objects.new('Silk cover',mesh);bpy.context.collection.objects.link(cloth)
  silk=mat('Ivory silk',(.38,.4,.4),.03,.55);bs=silk.node_tree.nodes.get('Principled BSDF');bs.inputs['Transmission Weight'].default_value=.035;bs.inputs['Sheen Weight'].default_value=.6;bs.inputs['Sheen Roughness'].default_value=.5;cloth.data.materials.append(silk)
 else:
  cloth,mod=create_cover(car,obj);poses=[];started=time.time();scene.render.fps=24
  for f in range(1,LAST+1):
   scene.frame_set(f);deps=bpy.context.evaluated_depsgraph_get();ev=cloth.evaluated_get(deps);me=ev.to_mesh()
   if f>=FIRST and (f-FIRST)%STEP==0:
    arr=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',arr);poses.append(arr.reshape(-1,3).copy())
   ev.to_mesh_clear()
   if f%20==0:print('CLOTH_FRAME',car['id'],f,round(time.time()-started,2),flush=True)
  poses=np.stack(poses);assert np.isfinite(poses).all();np.savez_compressed(cache,poses=poses)
  for modifier in list(cloth.modifiers):cloth.modifiers.remove(modifier)
  save_motion(car,poses,obj.dimensions)
 for f in cloth.data.polygons:f.use_smooth=True
 sub=cloth.modifiers.new('Silk surface smoothing','SUBSURF');sub.levels=1;sub.render_levels=1
 sol=cloth.modifiers.new('Woven edge 0.5 mm','SOLIDIFY');sol.thickness=.0005
 return cloth,poses

def camera(car,p,scene,obj,portrait=False):
 t=smooth(p);a=car['start']+car['sweep']*t;h=car['elev']+car['height']*t+(1.5 if portrait else 0);r=8.2
 if car['id']=='countach':r=5.8+2.4*t
 center=Vector((0,0,obj.dimensions.z/2+.02));direction=(Vector((math.cos(a)*r,-math.sin(a)*r,h))-center).normalized()
 right=Vector((0,0,1)).cross(direction).normalized();up=direction.cross(right).normalized()
 aspect=scene.render.resolution_x/scene.render.resolution_y;hfov=math.radians(48);tan_h=math.tan(hfov/2);tan_v=tan_h/aspect
 distance=0
 for c in obj.bound_box:
  v=obj.matrix_world@Vector(c)-center;depth=v.dot(direction)
  distance=max(distance,depth+abs(v.dot(right))/(tan_h*.92),depth+abs(v.dot(up))/(tan_v*(.52 if portrait else .65)))
 cam=scene.camera
 if not cam:
  bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
 cam.data.type='PERSP';cam.data.sensor_fit='HORIZONTAL';cam.data.sensor_width=36;cam.data.lens=36/(2*tan_h);cam.data.clip_end=100
 cam.location=center+direction*distance;cam.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if __name__=='__main__':
 mode=args[0] if args else 'all';only=args[1] if len(args)>1 else None
 for car in CARS:
  if only and only!=car['id']:continue
  scene,obj=setup(car);cloth,poses=simulate(car,scene,obj);save_motion(car,poses,obj.dimensions)
  if mode=='simulate':continue
  variants=[('landscape',960,600,4),('portrait',480,960,4)]
  if mode=='sample':variants=[('landscape',1080,675,10)]
  for variant,w,h,samples in variants:
   scene.render.resolution_x=w;scene.render.resolution_y=h;scene.cycles.samples=samples
   dest=Path(ROOT)/'films'/car['id']/variant;dest.mkdir(parents=True,exist_ok=True)
   steps=[0,12,24,36,48] if mode=='sample' else range(49)
   for n in steps:
    out=dest/(str(n).zfill(2)+'.png')
    if out.exists() or out.with_suffix('.webp').exists():continue
    cloth.data.vertices.foreach_set('co',poses[n].reshape(-1));cloth.data.update();camera(car,n/48,scene,obj,variant=='portrait');scene.render.filepath=str(out);bpy.ops.render.render(write_still=True)
  print('CAR_DONE',car['id'],flush=True)
