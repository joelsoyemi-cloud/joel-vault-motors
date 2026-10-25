"""Pack immutable model files and completed car sequences for source control."""
from pathlib import Path
import base64,gzip,hashlib,json,sys,shutil,os
root=Path(__file__).resolve().parents[1];public=root/'public'
ids=['corvette','camaro','gullwing','countach','turbo']
models=['chevrolet-corvette','chevrolet-camaro-pro','mercedes-benz-300sl-gullwing','lamborghini-countach-25th','porsche-911']
share=Path(os.environ['VAULT_ASSET_SHARE']) if os.environ.get('VAULT_ASSET_SHARE') else None
if share:share.mkdir(parents=True,exist_ok=True)
def bundle(name,files):
 file=root/(f'showroom-v2-{name}.json.gz')
 data={p.relative_to(public).as_posix():base64.b64encode(p.read_bytes()).decode() for p in sorted(files)}
 file.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),9,mtime=0))
 if share:shutil.copy(file,share/file.name)
 print(file.name,len(data),file.stat().st_size,flush=True)
mode=sys.argv[1] if len(sys.argv)>1 else 'all'
if mode in ['models','all']:
 for i,(id,model) in enumerate(zip(ids,models)):
  files=[public/'models'/(model+'.glb')]
  if i==0:files+=list((public/'fonts').glob('*'))
  bundle('model-'+id,files)
if mode in ['scenes','all']:
 for id in ids:
  files=list((public/'films'/id).rglob('*.webp'))
  if len(files)!=98:print('WAITING',id,len(files),flush=True);continue
  meta=public/'motion'/(id+'.json');m=json.loads(meta.read_text());m['source']='Blender cloth simulation; soft corner pull; self collision; 0.5 mm surface';meta.write_text(json.dumps(m,separators=(',',':')))
  files+=[meta,public/'motion'/(id+'.bin'),public/'posters'/(id+'-v2.webp')]
  bundle('scenes-'+id,files)
if mode=='manifest':
 parts=[];entries=[]
 for f in sorted(root.glob('showroom-v2-*.json.gz')):
  content=json.loads(gzip.decompress(f.read_bytes()));parts.append(dict(file=f.name,assets=len(content),bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest()))
  for name,value in content.items():
   b=base64.b64decode(value);entries.append((name,len(b),hashlib.sha256(b).hexdigest(),f.name))
 assert len(parts)==10,len(parts)
 assert len(entries)==516,len(entries)
 manifest=dict(version=2,totalAssets=len(entries),parts=parts)
 (root/'assets-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 text='# VAULT asset inventory\n\nFive models, five simulated cloth animations, 490 rendered scene frames, five posters and six self-hosted font files. Node restores the files from the ten versioned bundles before builds. See CREDITS.md for attribution.\n\n| File | Bytes | SHA-256 | Bundle |\n| --- | ---: | --- | --- |\n'
 for name,size,digest,part in sorted(entries):text+=f'| `{name}` | {size} | `{digest}` | `{part}` |\n'
 (root/'ASSETS.md').write_text(text)
 print('MANIFEST_READY',len(entries),flush=True)
