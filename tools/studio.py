"""Render the scroll sequence from licensed models and the existing cloth bake."""
import bpy,json,math,sys,os
from pathlib import Path
from mathutils import Vector
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
import render as base
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'tools/sim-cache/studio-3'
SURFACES=json.loads((ROOT/'app/lib/surfaces.json').read_text())
LAST=24

def linear(h):
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in [int(h[i:i+2],16)/255 for i in (1,3,5)])
def prepare(car):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for data in list(bpy.data.meshes):
  if data.users==0:bpy.data.meshes.remove(data)
 for data in list(bpy.data.materials):
  if data.users==0:bpy.data.materials.remove(data)
 scene,obj=base.setup(car)
 for item in list(scene.objects):
  if item!=obj:bpy.data.objects.remove(item,do_unlink=True)
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.mesh.customdata_custom_splitnormals_clear()
 for face in obj.data.polygons:face.use_smooth=True
 for material in obj.data.materials:
  if not material or not material.use_nodes:continue
  bs=material.node_tree.nodes.get('Principled BSDF');profile=SURFACES[car['id']].get(material.name)
  if not bs or not profile:continue
  nodes=material.node_tree.nodes;links=material.node_tree.links
  for key,socket in [('metalness','Metallic'),('roughness','Roughness')]:
   for link in list(bs.inputs[socket].links):links.remove(link)
   bs.inputs[socket].default_value=profile[key]
  if profile.get('color'):
   for link in list(bs.inputs['Base Color'].links):links.remove(link)
   bs.inputs['Base Color'].default_value=(*linear(profile['color']),1)
  if profile['kind']=='paint':bs.inputs['Coat Weight'].default_value=profile.get('clearcoat',.85);bs.inputs['Coat Roughness'].default_value=.19
  for node in nodes:
   if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=min(.6,node.inputs['Strength'].default_value)
  if profile['kind']=='glass':
   nodes.clear();t=nodes.new('ShaderNodeBsdfTransparent');t.inputs[0].default_value=(.9,.95,.96,1)
   g=nodes.new('ShaderNodeBsdfAnisotropic');g.inputs['Color'].default_value=(.98,.99,1,1);g.inputs['Roughness'].default_value=.055
   f=nodes.new('ShaderNodeFresnel');f.inputs['IOR'].default_value=1.48;m=nodes.new('ShaderNodeMixShader');o=nodes.new('ShaderNodeOutputMaterial');links.new(f.outputs[0],m.inputs[0]);links.new(t.outputs[0],m.inputs[1]);links.new(g.outputs[0],m.inputs[2]);links.new(m.outputs[0],o.inputs[0])
 scene.cycles.samples=8;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2;scene.cycles.glossy_bounces=2;scene.cycles.transmission_bounces=4;scene.cycles.transparent_max_bounces=8;scene.cycles.sample_clamp_indirect=3
 scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.05;scene.render.use_persistent_data=True
 scene.render.image_settings.file_format='WEBP';scene.render.image_settings.quality=92
 scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.15
 nodes=scene.world.node_tree.nodes;links=scene.world.node_tree.links;nodes.clear()
 env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'public/environment/studio-small-03.hdr'))
 light=nodes.new('ShaderNodeBackground');light.inputs['Strength'].default_value=.65;links.new(env.outputs['Color'],light.inputs['Color'])
 backdrop=nodes.new('ShaderNodeBackground');backdrop.inputs['Color'].default_value=(.19,.205,.21,1);backdrop.inputs['Strength'].default_value=.8
 path=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader');out=nodes.new('ShaderNodeOutputWorld');links.new(path.outputs['Is Camera Ray'],mix.inputs[0]);links.new(light.outputs[0],mix.inputs[1]);links.new(backdrop.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],out.inputs[0])
 ground=base.mat('Polished studio concrete',(.13,.145,.15),.025,.36);base.cube('Studio floor',(0,0,-.12),(200,200,.2),ground)
 nodes=ground.node_tree.nodes;links=ground.node_tree.links;n=nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=90;n.inputs['Detail'].default_value=2;b=nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.075;b.inputs['Distance'].default_value=.004;links.new(n.outputs['Fac'],b.inputs['Height']);links.new(b.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
 rings=[(8+3*math.sin(math.pi/2*i/16),3*(1-math.cos(math.pi/2*i/16))-.02) for i in range(17)]+[(11,15)];verts=[];faces=[];segments=96
 for radius,z in rings:
  for i in range(segments):a=i*math.tau/segments;verts.append((radius*math.cos(a),radius*math.sin(a),z))
 for j in range(len(rings)-1):
  for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
 mesh=bpy.data.meshes.new('Studio sweep');mesh.from_pydata(verts,[],faces);mesh.update();cove=bpy.data.objects.new('Cyclorama',mesh);scene.collection.objects.link(cove);mesh.materials.append(ground)
 for f in mesh.polygons:f.use_smooth=True
 base.area('Overhead diffusion',(0,-1,7),1100,(1,.965,.91),8,(0,0,.6),5);base.area('Camera softbox',(5,-5,4.5),700,(.92,.96,1),7,(0,0,.8),4);base.area('Edge separation',(-4,4,5),900,(1,.97,.91),7,(0,0,.8),3)
 meta=json.loads((ROOT/'public/motion'/f"{car['id']}.json").read_text());packed=np.fromfile(ROOT/'public/motion'/f"{car['id']}.bin",dtype='<u2').reshape(meta['frameCount'],meta['vertexCount'],3);data=np.asarray(meta['min'])+packed*np.asarray(meta['scale']);poses=data[:,:,[0,2,1]].copy();poses[:,:,1]*=-1
 nx,ny=meta['nx'],meta['ny'];faces=[]
 for j in range(ny-1):
  for i in range(nx-1):k=j*nx+i;faces.append((k,k+1,k+nx+1,k+nx))
 mesh=bpy.data.meshes.new('Baked satin');mesh.from_pydata(poses[0].tolist(),[],faces);mesh.update();cloth=bpy.data.objects.new('Satin cover',mesh);scene.collection.objects.link(cloth)
 silk=base.mat('Pearl satin',(.38,.4,.4),.03,.55);bs=silk.node_tree.nodes.get('Principled BSDF');bs.inputs['Transmission Weight'].default_value=.035;bs.inputs['Sheen Weight'].default_value=.6;bs.inputs['Sheen Roughness'].default_value=.5;mesh.materials.append(silk)
 for f in mesh.polygons:f.use_smooth=True
 sub=cloth.modifiers.new('Silk smoothing','SUBSURF');sub.levels=1;sub.render_levels=1;sol=cloth.modifiers.new('0.5mm weave','SOLIDIFY');sol.thickness=.0005
 return scene,obj,cloth,poses

def camera(car,p,scene,obj,portrait):
 t=base.smooth(p);a=car['start']+car['sweep']*t;h=car['elev']+car['height']*t+(1.5 if portrait else 0);r=5.8+2.4*t if car['id']=='countach' else 8.2
 center=Vector((0,0,obj.dimensions.z/2+.02));direction=(Vector((math.cos(a)*r,-math.sin(a)*r,h))-center).normalized();right=Vector((0,0,1)).cross(direction).normalized();up=direction.cross(right).normalized();aspect=scene.render.resolution_x/scene.render.resolution_y;tan_h=math.tan(math.radians(40)/2);tan_v=tan_h/aspect;distance=0
 for c in obj.bound_box:
  v=obj.matrix_world@Vector(c)-center;depth=v.dot(direction);distance=max(distance,depth+abs(v.dot(right))/(tan_h*.92),depth+abs(v.dot(up))/(tan_v*(.52 if portrait else .65)))
 if not scene.camera:bpy.ops.object.camera_add();scene.camera=bpy.context.object
 cam=scene.camera;cam.data.type='PERSP';cam.data.sensor_fit='HORIZONTAL';cam.data.sensor_width=36;cam.data.lens=36/(2*tan_h);cam.data.clip_end=100;cam.location=center+direction*distance;cam.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
only=args[0] if args else None
for car in base.CARS:
 if only and car['id']!=only:continue
 scene,obj,cloth,poses=prepare(car)
 for variant,w,h in [('landscape',1280,800),('portrait',640,1280)]:
  dest=DEST/'films'/car['id']/variant;dest.mkdir(parents=True,exist_ok=True);scene.render.resolution_x=w;scene.render.resolution_y=h
  for n in range(LAST+1):
   path=dest/f'{n:02d}.webp'
   if path.exists():
    cached=path.read_bytes()
    if len(cached)>=12 and cached[:4]==b'RIFF' and cached[8:12]==b'WEBP' and int.from_bytes(cached[4:8],'little')+8==len(cached):continue
    path.unlink()
   p=n/LAST;f=min(48,p/.72*48);lo=int(f);hi=min(48,lo+1);mix=f-lo;cloth.data.vertices.foreach_set('co',((1-mix)*poses[lo]+mix*poses[hi]).reshape(-1));cloth.data.update();camera(car,p,scene,obj,variant=='portrait');scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
   print('FRAME_DONE',car['id'],variant,n,flush=True)
 print('CAR_DONE',car['id'],flush=True)
print('STUDIO_READY',flush=True)
