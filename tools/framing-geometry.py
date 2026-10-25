"""Extract convex silhouette points for consistent vehicle framing."""
import bpy,bmesh,json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
import render as studio
result={}
for car in studio.CARS:
 scene,obj=studio.setup(car)
 bm=bmesh.new();bm.from_mesh(obj.data)
 hull=bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
 verts={v for f in hull['geom'] if isinstance(f,bmesh.types.BMFace) for v in f.verts}
 points=sorted([[round(v.co.x,6),round(v.co.z,6),round(-v.co.y,6)] for v in verts])
 result[car['id']]={'size':[float(obj.dimensions.x),float(obj.dimensions.z),float(obj.dimensions.y)],'points':points}
 print('SILHOUETTE',car['id'],len(points),flush=True);bm.free()
p=Path(__file__).resolve().parents[1]/'app/lib/vehicle-geometry.json';p.write_text(json.dumps(result,separators=(',',':')))
print('FRAMING_GEOMETRY_READY',p.stat().st_size,flush=True)
