#!/usr/bin/env python3
"""The coin toss's art (img/toss/), cut from the painted sheets in tools/toss/src on their magenta
backgrounds: the stadium behind, the coin (heads, tails and the flip frames between), its gold
effects, and the HEADS / TAILS buttons. Magenta is taken out by how far each pixel is from it,
and the colour under a soft edge or a glow is recovered as if it had been laid over nothing.
usage: python3 tools/build_toss_art.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'toss', 'src'), os.path.join(HERE, '..', 'img', 'toss')
os.makedirs(OUT, exist_ok=True)
M = np.array([251, 2, 251], float)


def cut(sheet, box, soft, name, scale=1.0, one=False, disc=False):
    """box on the sheet -> a transparent webp. soft: how far from magenta is fully opaque (bigger
    for glows, so their faint parts stay faint)"""
    a = np.asarray(Image.open(os.path.join(SRC, sheet)).convert('RGB').crop(box)).astype(float)
    d = np.linalg.norm(a - M, axis=2)
    al = np.clip((d - 18) / soft, 0, 1)
    rgb = M + (a - M) / np.maximum(al, 1e-3)[..., None]       # the colour without the magenta in it
    rgb = np.where(al[..., None] > 0.02, np.clip(rgb, 0, 255), 0)
    if one:
        # only the main piece (and its glow): neighbours' stray bits on the sheet go
        from scipy import ndimage as ndi
        lab, n = ndi.label(ndi.binary_dilation(al > 0.04, iterations=2))
        if n > 1:
            keep = lab == (np.argmax(ndi.sum(al, lab, range(1, n + 1))) + 1)
            al = al * keep
    if disc:
        # a coin seen face on: a round mask (its label on the sheet sits just under it)
        cols = np.nonzero((al[:al.shape[0] // 2] > 0.5).any(0))[0]; rows = np.nonzero((al > 0.5).any(1))[0]
        r = (cols[-1] - cols[0] + 1) / 2; cx = (cols[0] + cols[-1]) / 2; cy = rows[0] + r * 0.99
        yy, xx = np.mgrid[:al.shape[0], :al.shape[1]]
        al = al * np.clip((r * 0.99 + 1.5 - np.hypot(xx - cx, (yy - cy) / 0.99)) / 2, 0, 1)
    im = Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8), 'RGBA')
    bb = im.getbbox(); im = im.crop(bb)
    if disc: im = im.crop((0, 0, im.width, im.height - 7))   # (the last of its label)
    if scale != 1: im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), quality=90, method=6)
    return im.size


sizes = {}
# the coin: its two faces large, and the flip from heads (1) to tails (7)
sizes['heads'] = cut('coins.png', (408, 8, 761, 400), 90, 'coin-heads', disc=True)
sizes['tails'] = cut('coins.png', (770, 8, 1126, 400), 90, 'coin-tails', disc=True)
for i, box in enumerate([(23, 433, 255, 668), (274, 434, 472, 668), (496, 434, 663, 668), (734, 434, 796, 666),
                         (864, 434, 1036, 668), (1066, 434, 1262, 668), (1280, 432, 1515, 668)], 1):
    sizes[f'flip{i}'] = cut('coins.png', box, 90, f'coin-flip{i}')
# the effects
for name, box in {'swirl': (8, 13, 515, 338), 'swirl2': (539, 8, 987, 288), 'ring': (767, 197, 1102, 399), 'spiral': (1121, 17, 1522, 468),
                  'star': (991, 72, 1101, 191), 'streak': (14, 330, 460, 450), 'dust': (831, 376, 1126, 481),
                  'burst': (180, 545, 400, 676), 'pad': (1090, 500, 1272, 540), 'rays': (1296, 512, 1520, 628)}.items():
    sizes[name] = cut('fx.png', box, 230, 'fx-' + name)
# the stadium
Image.open(os.path.join(SRC, 'bg.png')).convert('RGB').save(os.path.join(OUT, 'bg.webp'), quality=86, method=6)
for k, v in sizes.items(): print(k, v)
