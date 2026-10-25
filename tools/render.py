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
 scene.render.threads_mode='FIXED';scene.render.threads=6
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
 # Sample the actual body for a reversible, draped surface.
 verts=[v.co.copy() for v in obj.data.vertices];polys=[list(p.vertices) for p in obj.data.polygons];bvh=BVHTree.FromPolygons(verts,polys)
 print('CAR_BOUNDS',car['id'],[(round(v,3)) for v in obj.dimensions],flush=True)
 coords=[v.co for v in obj.data.vertices];width=max(abs(v.y) for v in coords)+.4;length=3.05
 nx,nz=65,39;base=[];faces=[]
 for j in range(nz):
  z=-width+2*width*j/(nz-1)
  for i in range(nx):
   x=-length+2*length*i/(nx-1);hit=bvh.ray_cast(Vector((x,z,5)),Vector((0,0,-1)),10);h=hit[0].z+.09 if hit[0] else .17
   # Bridge small gaps in the hood and window geometry.
   h=max(h,.15+math.exp(-((x/2.5)**8))*max(0,1-(abs(z)/width)**6)*.5)
   h+=.028*math.sin(x*19+z*11)+.015*math.sin(x*32-z*18)
   base.append((x,z,h))
   if i<nx-1 and j<nz-1:
    k=j*nx+i;faces.append((k,k+1,k+nx+1,k+nx))
 # Expand and relax the sampled surface so protruding details stay beneath the cover.
 heights=[v[2] for v in base];expanded=[]
 for j in range(nz):
  for i in range(nx):
   expanded.append(max(heights[y*nx+x] for y in range(max(0,j-2),min(nz,j+3)) for x in range(max(0,i-2),min(nx,i+3))))
 for repeat in range(3):
  relaxed=[]
  for j in range(nz):
   for i in range(nx):
    avg=sum(expanded[y*nx+x] for y in range(max(0,j-1),min(nz,j+2)) for x in range(max(0,i-1),min(nx,i+2)))/((min(nz,j+2)-max(0,j-1))*(min(nx,i+2)-max(0,i-1)))
    relaxed.append(max(heights[j*nx+i],avg))
  expanded=relaxed
 base=[(x,z,expanded[k]+.10+.018*math.sin(x*13+z*16)) for k,(x,z,h) in enumerate(base)]
 os.makedirs(ROOT+'/drapes',exist_ok=True)
 with open(ROOT+'/drapes/'+car['id']+'.json','w') as f:json.dump(dict(nx=nx,nz=nz,base=base),f,separators=(',',':'))
 me=bpy.data.meshes.new('Reversible satin');me.from_pydata(base,[],faces);me.update();cloth=bpy.data.objects.new('Satin cover',me);bpy.context.collection.objects.link(cloth);cloth.data.materials.append(mat('Pearl satin',(.54,.53,.50),.18,.52))
 for f in me.polygons:f.use_smooth=True
 sol=cloth.modifiers.new('Fabric edge','SOLIDIFY');sol.thickness=.012
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.lens=42;cam.data.sensor_width=36;cam.data.clip_end=100
 return scene,cam,cloth,base,width

def frame(car,p,scene,cam,cloth,base,width):
 t=smooth(p);a=car['start']+car['sweep']*t;h=car['elev']+car['height']*t;r=8.2+.8*t
 if car['id']=='countach':r=5.2+4*t
 cam.location=(math.cos(a)*r,-math.sin(a)*r,h);cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler()
 side=car['side'];axis=car['axis']
 for v,(x,z,y) in zip(cloth.data.vertices,base):
  s=((x/3.05 if axis=='x' else z/width)*side+1)/2;q=smooth((p*1.75-s*.5)/1.25);lift=math.sin(q*math.pi)*(1.25+.32*math.sin(z*3+x*2))
  ex=side*4.05+x*.21 if axis=='x' else x*.45
  ez=z*.42 if axis=='x' else side*(width+1.45)+z*.24
  ey=.12+.1*(math.sin(x*8+z*5)**2)+.08*math.sin(z*12)**2
  v.co=(x+(ex-x)*q,z+(ez-z)*q,y+(ey-y)*q+lift)
 cloth.data.update()

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
mode=args[0] if args else 'posters'
only=args[1] if len(args)>1 else None
for car in CARS:
 if only and only!=car['id']:continue
 scene,cam,cloth,base,width=setup(car);os.makedirs(ROOT+'/posters',exist_ok=True);os.makedirs(ROOT+'/reveals/'+car['id'],exist_ok=True)
 if mode=='posters':
  frame(car,1,scene,cam,cloth,base,width);scene.render.filepath=ROOT+'/posters/'+car['id']+'.png';bpy.ops.render.render(write_still=True)
 else:
  scene.render.resolution_x=800;scene.render.resolution_y=450;scene.cycles.samples=6
  for n in range(33):
   out=ROOT+'/reveals/'+car['id']+'/'+str(n).zfill(2)+'.png'
   if os.path.exists(out):continue
   frame(car,n/32,scene,cam,cloth,base,width);scene.render.filepath=out;bpy.ops.render.render(write_still=True)
 print('CAR_DONE',car['id'],flush=True)
