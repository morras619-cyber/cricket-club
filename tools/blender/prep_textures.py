# Cuts the textures the Blender Thunderdome uses out of the painted ground art (img/ground/thunder)
# into tools/blender/tex: the crowd band, the skyline (mirrored so it wraps), grass, pitch, logos.
# Then, with Blender's bpy module: python thunderdome.py -- bat|bowl|keeper out.png [samples]
import os
from PIL import Image, ImageOps
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT, OUT = os.path.join(HERE, '..', '..'), os.path.join(HERE, 'tex')
os.makedirs(OUT, exist_ok=True)
g = lambda p: os.path.join(ROOT, p)
far = Image.open(g('img/ground/thunder/far.webp')).convert('RGB')
near = Image.open(g('img/ground/thunder/near.webp')).convert('RGB')
# the crowd: below the lights under the roof, above the boards, either side of the big screen
segs = []
for im, (s0, s1) in ((far, (825, 1341)), (near, (858, 1309))):
    segs += [im.crop((0, 290, s0, 398)), im.crop((s1, 290, im.width, 398))]
c = Image.new('RGB', (sum(s.width for s in segs), 108)); x = 0
for s in segs: c.paste(s, (x, 0)); x += s.width
c.save(os.path.join(OUT, 'crowd.png'))
# the skyline between the floodlights
parts = []
for im in (far, near):
    a = im.crop((262, 0, 1925, 206)); parts += [a, ImageOps.mirror(a)]
s = Image.new('RGB', (sum(p.width for p in parts), 206)); x = 0
for p in parts: s.paste(p, (x, 0)); x += p.width
s.save(os.path.join(OUT, 'skyline.png'))
for f in ('grass', 'pitch'): Image.open(g(f'img/ground/thunder/{f}.webp')).save(os.path.join(OUT, f + '.png'))
for f in ('logo-thunder', 'logo-sixcharge'): Image.open(g(f'img/{f}.webp')).save(os.path.join(OUT, f + '.png'))
