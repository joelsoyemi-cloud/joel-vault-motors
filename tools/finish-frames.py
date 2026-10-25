"""Convert finished Blender frames to WebP; optionally follow an active render."""
from pathlib import Path
from PIL import Image
import sys,time,shutil
root=Path(__file__).resolve().parents[1]
raw=root/'public/films';cache=root/'tools/sim-cache/renders';qa=root/'.sites-runtime/qa/out'
watch='--watch' in sys.argv
update_qa='--qa' in sys.argv
last=0
while True:
 for f in list(raw.rglob('*.png')):
  try:
   with Image.open(f) as check:check.verify()
   with Image.open(f) as image:image.save(f.with_suffix('.webp'),quality=89,method=4)
  except (OSError,SyntaxError):continue
  rel=f.relative_to(root/'public');dest=cache/f.relative_to(raw);dest.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(f),dest)
  if update_qa and qa.exists():
   q=qa/rel.with_suffix('.webp');q.parent.mkdir(parents=True,exist_ok=True);shutil.copy(f.with_suffix('.webp'),q)
  if f.stem=='48' and f.parent.name=='landscape':
   poster=root/'public/posters'/(f.parent.parent.name+'-v2.webp');shutil.copy(f.with_suffix('.webp'),poster)
   if update_qa and qa.exists():(qa/'posters').mkdir(exist_ok=True);shutil.copy(poster,qa/'posters'/poster.name)
 count=len(list(raw.rglob('*.webp')))
 if count//20!=last//20:print('RENDERED_WEBP',count,'/ 490',flush=True)
 last=count
 if not watch or count>=490:break
 time.sleep(2)
print('FRAME_CONVERSION_READY',last,flush=True)
