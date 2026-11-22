# A contact sheet of the look's photographs (tools/look.py), for a quick look: python3 tools/sheet.py before [out.jpg]
import glob, os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fs = sorted(glob.glob(os.path.join(ROOT, 'docs/look', sys.argv[1], '*.jpg')))
ims = [Image.open(f) for f in fs]
w, h = ims[0].size[0] // 2, ims[0].size[1] // 2
cols = 7
sheet = Image.new('RGB', (cols * w, ((len(ims) + cols - 1) // cols) * h))
for i, im in enumerate(ims): sheet.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
sheet.save(sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'build/sheet.jpg'), quality=80)
print(' '.join(os.path.basename(f)[:-4] for f in fs))
