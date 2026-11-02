#!/usr/bin/env python3
"""The lower-division clubs' painted crests (tools/crests/src/division-2-3-v2.png, transparent) cut
out into img/logo-<id>.webp (192 px, like the Super League's).
usage: python3 tools/build_painted_crests.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'crests', 'src', 'division-2-3-v2.png')
OUT = os.path.join(HERE, '..', 'img')
# left to right, top row then bottom row, as painted
ROWS = [['monsoon', 'falcons', 'bengal', 'lotus', 'hawks', 'iron', 'comets'],
        ['tempest', 'harbour', 'jaguars', 'sultans', 'lagoon', 'kites', 'elephants', 'rockets', 'lanterns']]

src = np.asarray(Image.open(SRC).convert('RGBA')).astype(float)
a, A = src[..., :3], src[..., 3]
fg = ndi.binary_opening(A > 40, iterations=1)
lab2, n2 = ndi.label(fg)
sizes = ndi.sum(fg, lab2, range(1, n2 + 1))
pieces = []
# Where crests touch: their solid cores (and a cut at the narrowest column where even those meet),
# then every pixel of the whole picture goes to the nearest core, so the split runs through the gap
CUTS = {'top': [], 'bottom': [430, 625, 975, 1132]}
core = A > 250
for row, (y0, y1) in (('top', (0, a.shape[0] // 2)), ('bottom', (a.shape[0] // 2, a.shape[0]))):
    for c in CUTS[row]:
        col = core[y0:y1].sum(0); x = c - 45 + int(np.argmin(col[c - 45:c + 45]))
        core[y0:y1, x - 1:x + 2] = False
cl, cn = ndi.label(core)
big = [k + 1 for k, v in enumerate(ndi.sum(core, cl, range(1, cn + 1))) if v > 4000]
cl[~np.isin(cl, big)] = 0
# each core grows out through its own painting (not across the gap to a neighbour)
owner = cl.copy()
for _ in range(400):
    grow = ndi.grey_dilation(owner, size=3)
    add = (owner == 0) & fg & (grow > 0)
    if not add.any(): break
    owner[add] = grow[add]
for k in big:
    part = fg & (owner == k)
    pl, pn = ndi.label(part)
    if pn > 1:   # (stray specks go; a star beside its crescent stays)
        sz = ndi.sum(part, pl, range(1, pn + 1)); part = np.isin(pl, [j + 1 for j, v in enumerate(sz) if v > 300])
    ys, xs2 = np.nonzero(part)
    pieces.append(((slice(ys.min(), ys.max() + 1), slice(xs2.min(), xs2.max() + 1)), part))
pieces.sort(key=lambda p: (p[0][0].start > a.shape[0] / 2, p[0][1].start))
assert len(pieces) == 16, len(pieces)
ids = ROWS[0] + ROWS[1]
for cid, (s, k) in zip(ids, pieces):
    y0, y1, x0, x1 = s[0].start, s[0].stop, s[1].start, s[1].stop
    m = ndi.binary_fill_holes(k[y0:y1, x0:x1])
    al = A[y0:y1, x0:x1] * ndi.binary_dilation(m, iterations=2)
    rgba = np.dstack([a[y0:y1, x0:x1], al]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    # fit in the square with the same margin as the painted Super League crests
    k2 = 176 / max(im.size)
    im = im.resize((round(im.width * k2), round(im.height * k2)), Image.LANCZOS)
    sq = Image.new('RGBA', (192, 192), (0, 0, 0, 0)); sq.alpha_composite(im, ((192 - im.width) // 2, (192 - im.height) // 2))
    sq.save(os.path.join(OUT, f'logo-{cid}.webp'), quality=92)
    print(cid, x1 - x0, y1 - y0)
