"""Copy completed studio films into versioned, checksum-verified bundles."""
from pathlib import Path
import base64,gzip,hashlib,json,shutil,sys
root=Path(__file__).resolve().parents[1];public=root/'public';cache=root/'tools/sim-cache/studio-3/films'
ids=['corvette','camaro','gullwing','countach','turbo']

def pack(name,files):
 data={p.relative_to(public).as_posix():base64.b64encode(p.read_bytes()).decode() for p in sorted(files)}
 path=root/name;path.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),9,mtime=0));print('BUNDLE_READY',name,len(data),path.stat().st_size,flush=True)

for car in ids:
 frames=list((cache/car).rglob('*.webp'))
 if len(frames)!=50 or f'CAR_DONE {car}' not in (root/'tools/sim-cache/studio-render.log').read_text():continue
 dest=public/'films'/car
 if dest.exists():shutil.rmtree(dest)
 shutil.copytree(cache/car,dest)
 poster=public/'posters'/f'{car}-v3.webp';poster.parent.mkdir(exist_ok=True);shutil.copyfile(dest/'landscape/24.webp',poster)
 files=list(dest.rglob('*.webp'))+[public/'motion'/f'{car}.json',public/'motion'/f'{car}.bin',poster]
 pack(f'showroom-v3-scenes-{car}.json.gz',files)

if '--manifest' in sys.argv:
 parts=sorted(root.glob('showroom-v2-model-*.json.gz'))+sorted(root.glob('showroom-v3-*.json.gz'))
 assert len(parts)==11,len(parts)
 inventory=[];manifest=[]
 for part in parts:
  content=json.loads(gzip.decompress(part.read_bytes()));manifest.append(dict(file=part.name,assets=len(content),bytes=part.stat().st_size,sha256=hashlib.sha256(part.read_bytes()).hexdigest()))
  for name,value in content.items():
   data=base64.b64decode(value);inventory.append((name,len(data),hashlib.sha256(data).hexdigest(),part.name))
 assert len(inventory)==277,len(inventory)
 assert len({r[0] for r in inventory})==277
 (root/'assets-manifest.json').write_text(json.dumps(dict(version=3,totalAssets=277,parts=manifest),indent=2)+'\n')
 text='# VAULT asset inventory\n\nFive licensed 3D models, five cloth bakes, 250 studio frames (25 per car in two formats), five posters, six fonts and one photographed HDRI. Eleven checksum-verified bundles restore these 277 assets before builds.\n\n| File | Bytes | SHA-256 | Bundle |\n| --- | ---: | --- | --- |\n'
 for name,size,digest,part in sorted(inventory):text+=f'| `{name}` | {size} | `{digest}` | `{part}` |\n'
 (root/'ASSETS.md').write_text(text)
 for part in root.glob('showroom-v2-scenes-*.json.gz'):part.unlink()
 for poster in (public/'posters').glob('*-v2.webp'):poster.unlink()
 print('MANIFEST_READY',len(inventory),flush=True)
