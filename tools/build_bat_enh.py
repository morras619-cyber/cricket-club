#!/usr/bin/env python3
"""The batter's redrawn poses (img/kit/bat-enh.webp + -mask.png + -tone.png, and their entry in js/kitsheets.js).

usage: python3 tools/build_bat_enh.py

SOURCE: tools/kit/bat-enh-src/<nn>-<pose>.png, a pose of the old batter sheet (img/kit/bat-back.*) redrawn in the cut-scene style on flat magenta: plain kit (no name,
number or crest), the same pose, camera and aspect ratio as the old one. Each is cut out, scaled so that its figure is SCALE x the old pose's height, its kit, skin
and shirt back are found from its own colours (tools/build_bat_paint.py classify(); SHIRT says where the shirt back is where the colours alone get it wrong), and
they are packed in one sheet. kitsprite.js draws a pose from this sheet when it has it and the old sheet's otherwise.
Needs numpy, scipy and Pillow.
"""
import glob, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, 'tools')
import build_bat_paint as bp
SHIRT = {'ready': (0.17, 0.78, 0.16, 0.36), 'leave1': (0.24, 0.76, 0.16, 0.36)}   # where the shirt back is, as fractions of the frame
SRC = 'tools/kit/bat-enh-src/'; SCALE = 1.5; PAD = 4
OLD = ['ready','leave1','leave2','backlift','drive1','drive2','drive3','pull1','pull2','def1','def2','def3','cut1','cut2','cut3','cut4','bowled','celebrate','rsweep1','rsweep2','rsweep3','straight1','straight2','ondrive1','ondrive2','cover1']
K = json.loads(open('js/kitsheets.js').read().split('export const KIT_SHEETS = ', 1)[1].rsplit(';', 1)[0]); m = K['bat-back']
def figs(path, idx):
    x, y, w, h = m['frames'][idx][:4]
    im = Image.open(path).convert('RGB'); a, alpha = bp.key(im)
    ys, xs = np.nonzero(alpha > 0.5); fh = ys.max() - ys.min()
    # the old pose's figure height (scale the new one to it, times SCALE)
    old = Image.open('img/kit/bat-back.webp').convert('RGBA').crop((x, y, x + w, y + h)); oa = np.array(old)[..., 3] > 127; oy = np.nonzero(oa.any(1))[0]; oh = oy.max() - oy.min()
    sc = oh * SCALE / fh
    rgb, al = bp.cutout(a, alpha, sc)
    return rgb, al
poses = []
for p in sorted(glob.glob(SRC + '*.png')):
    name = os.path.basename(p)[3:-4]; idx = OLD.index(name)
    rgb, al = figs(p, idx); c = bp.classify(rgb, al, SHIRT.get(name))
    # skin again, from the colours alone: the warm brown-orange of the forearm and neck (the painted highlights run to orange), joined into whole patches
    hue, sat, mx = bp.hsv(rgb); op = al > 0.5
    sk = op & (hue > 6) & (hue < 38) & (sat > 0.2) & (sat < 0.9) & (mx > 110) & ~c['blue'] & ~(c['yellow'] & (hue > 40))
    sk = ndi.binary_closing(sk, iterations=3); lab, n = ndi.label(sk); sizes = ndi.sum(sk, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v > 250]); keep = ndi.binary_fill_holes(keep) & op & ~c['kit']
    c['skin'] = keep
    h, w = al.shape; ys_, xs_ = np.nonzero(al > 0.5); low = ys_ >= ys_.max() - 0.05 * h
    poses.append(dict(name=name, idx=idx, rgb=rgb, al=al, c=c, feet=(float(xs_[low].mean()), float(ys_.max()) - 0.01 * h), W=w, H=h))
    print(name, w, h, 'shirt print', {k: round(v, 1) for k, v in c['info'].items()} if c['info'] else None)
# shelf pack
SW, x, y, rowh, pos = 2048, PAD, PAD, 0, []
for P in sorted(poses, key=lambda t: -t['H']):
    if x + P['W'] + PAD > SW: x, y, rowh = PAD, y + rowh + PAD, 0
    P['x'], P['y'] = x, y; x += P['W'] + PAD; rowh = max(rowh, P['H'])
SH = y + rowh + PAD
art = np.zeros((SH, SW, 4), np.uint8); mask = np.zeros((SH, SW, 3), np.uint8); tone = np.zeros((SH, SW, 3), np.uint8)
lb, ly, ls = [], [], []
for P in poses:
    c, rgb, al, x, y, h, w = P['c'], P['rgb'], P['al'], P['x'], P['y'], P['H'], P['W']
    art[y:y+h, x:x+w] = np.dstack([np.clip(rgb, 0, 255), al * 255]).astype(np.uint8)
    mask[y:y+h, x:x+w, 0] = c['skin'] * 255; mask[y:y+h, x:x+w, 1] = c['shirt'] * 255; mask[y:y+h, x:x+w, 2] = c['kit'] * 255
    tone[y:y+h, x:x+w, 1] = np.clip(c['wy'] * 255, 0, 255); tone[y:y+h, x:x+w, 2] = np.where(c['kit'], np.clip(c['lum'], 1, 255), 0)
    lb.append(c['lum'][c['blue']]); ly.append(c['lum'][c['yellow']]); ls.append(c['lum'][c['skin']])
med = lambda L: round(float(np.median(np.concatenate(L))) / 255, 4)
frames, place, names = [], [], {}
for i, P in enumerate(poses):
    frames.append([P['x'], P['y'], P['W'], P['H'], round(P['feet'][0], 1), round(P['feet'][1], 1)])
    info = P['c']['info']
    place.append([round(P['x'] + info['cx'], 1), round(P['y'] + info['cy'], 1), round(m['place'][P['idx']][2] * SCALE, 1), 1, 1, round(info['ang'], 1), 0, 0, 0, 0] if info else [0, 0, 0, 1, 1, 0, 0, 0, 0, 0]); names[P['name']] = i
Image.fromarray(art, 'RGBA').save('img/kit/bat-enh.webp', 'WEBP', quality=92, method=6)
Image.fromarray(mask, 'RGB').save('img/kit/bat-enh-mask.png'); Image.fromarray(tone, 'RGB').save('img/kit/bat-enh-tone.png')
K['bat-enh'] = {'frames': frames, 'place': place, 'names': names, 'refPx': round(m['refPx'] * SCALE, 1), 'suit': m['suit'], 'trim': m['trim'], 'skin': med(ls),
                'tones': [med(lb), med(lb) * 0.5, med(ly)], 'hair': {}, 'size': [SW, SH], 'crisp': True}
head = open('js/kitsheets.js').read().split('export const KIT_SHEETS = ')[0]
open('js/kitsheets.js', 'w').write(head + 'export const KIT_SHEETS = ' + json.dumps(K, separators=(',', ':')) + ';\n')
print('sheet', (SW, SH), 'tones', K['bat-enh']['tones'], 'skin', K['bat-enh']['skin'])
