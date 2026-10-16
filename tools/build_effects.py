#!/usr/bin/env python3
"""Cut a sheet of glowing effects (5 rows of 5, transparent or black background) into an atlas
for the game's electric effects: img/fx/<name>.webp and js/fxatlas.js.

usage: python3 tools/build_effects.py SHEET.png electric

Pieces are named by row, in the order the sheet was drawn:
  bolt1-5 (lightning), burst1-5 (impact stars), ring1-5 (crackling rings), arc, fork, zigzag,
  shards, spray (row 4), comet1, comet2, streak, vortex, speed (row 5).
Needs numpy, scipy and Pillow.
"""
import json
import re
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

NAMES = [[f'bolt{i}' for i in range(1, 6)], [f'burst{i}' for i in range(1, 6)], [f'ring{i}' for i in range(1, 6)],
         ['arc', 'fork', 'zigzag', 'shards', 'spray'], ['comet1', 'comet2', 'streak', 'vortex', 'speed']]


def main():
    src, set_name = sys.argv[1:3]
    im = Image.open(src).convert('RGBA')
    a = np.array(im).astype(np.float32)
    if (a[..., 3] > 250).mean() > 0.9:  # on black: the brightness is the coverage
        a[..., 3] = a[..., :3].max(-1)
    op = a[..., 3] > 20
    H, W = op.shape
    # the five rows and five columns: split at the emptiest bands
    def cuts(profile, n):
        smooth = ndi.uniform_filter1d(profile.astype(np.float32), 9)
        size = len(profile)
        out = []
        for k in range(1, n):
            c = int(size * k / n)
            lo, hi = c - size // (n * 3), c + size // (n * 3)
            out.append(lo + int(np.argmin(smooth[lo:hi])))
        return [0] + out + [size]
    rows = cuts(op.sum(1), 5)
    pieces, meta = [], {}
    for r in range(5):
        band = op[rows[r]:rows[r + 1]]
        cols = cuts(band.sum(0), 5)
        for c in range(5):
            y0, y1, x0, x1 = rows[r], rows[r + 1], cols[c], cols[c + 1]
            blk = a[y0:y1, x0:x1]
            ys, xs = np.nonzero(blk[..., 3] > 20)
            blk = blk[max(0, ys.min() - 4):ys.max() + 5, max(0, xs.min() - 4):xs.max() + 5]
            pieces.append((NAMES[r][c], blk))
    # one atlas, two rows' worth per line
    pad, AW = 2, 1024
    x = y = rowh = 0
    for name, blk in pieces:
        h, w = blk.shape[:2]
        if x + w > AW:
            x, y, rowh = 0, y + rowh + pad, 0
        meta[name] = [x, y, w, h]
        x += w + pad
        rowh = max(rowh, h)
    atlas = np.zeros((y + rowh, AW, 4), np.float32)
    for name, blk in pieces:
        fx, fy, w, h = meta[name]
        atlas[fy:fy + h, fx:fx + w] = blk
    Image.fromarray(np.clip(atlas, 0, 255).astype(np.uint8), 'RGBA').save(f'img/fx/{set_name}.webp', 'WEBP', quality=86, method=6)
    path = 'js/fxatlas.js'
    sets = {}
    try:
        m = re.search(r'FX_ATLAS = (\{.*\});', open(path).read(), re.S)
        sets = json.loads(m.group(1)) if m else {}
    except FileNotFoundError:
        pass
    sets[set_name] = meta
    with open(path, 'w') as f:
        f.write('// Glowing effect pieces in img/fx/<set>.webp: [x, y, w, h]. Made by tools/build_effects.py.\n')
        f.write('export const FX_ATLAS = ' + json.dumps(sets, separators=(',', ':')) + ';\n')
    print(set_name, len(meta), 'pieces,', AW, 'x', y + rowh)


if __name__ == '__main__':
    main()
