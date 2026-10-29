#!/usr/bin/env python3
"""More hairstyles for the players on the pitch: appends pieces to img/hair/<view>.webp + js/hairatlas.js
without touching the pieces already there (build_hair.py made those from sheets that are no longer kept).

usage: python3 tools/add_hair.py FRONT.png BACK.png

FRONT / BACK: two rows of 5 hairstyles on magenta, the same style in the same slot on both. Needs numpy, scipy and Pillow.
Run again with a revised sheet or anchors: the pieces added before are replaced.
"""
import json
import os
import re
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from build_hair import keyed, cells, no_ears  # noqa: E402

NAMES = ['sweep', 'shag', 'wavy', 'ringlets', 'quiff', 'fuzz', 'fringe', 'slick', 'afro', 'swoop']
# The skull's width on the new sheets (the head they were drawn on), and where each piece sits on it:
# the skull's top-centre is at (left + cx * width, top + dy * skull) of the piece's box. Fitted by eye.
SKULL = {'front': 255, 'back': 270}
ANCHOR = {
    'front': {n: (0.5, 0.1) for n in NAMES},
    'back': {n: (0.5, 0.1) for n in NAMES},
}
ANCHOR_FILE = os.path.join(os.path.dirname(__file__), 'add_hair_anchors.json')
if os.path.exists(ANCHOR_FILE):
    with open(ANCHOR_FILE) as f:
        for view, d in json.load(f).items():
            ANCHOR[view].update({k: tuple(v) for k, v in d.items()})

ATLAS_JS = 'js/hairatlas.js'


def main():
    front, back = sys.argv[1:3]
    src = open(ATLAS_JS).read()
    meta = json.loads(re.search(r'HAIR_ATLAS = (\{.*\});', src).group(1))
    for view, path in (('front', front), ('back', back)):
        for n in NAMES:
            meta.pop(f'{view}:hair:{n}', None)
        old = {k: v for k, v in meta.items() if k.startswith(view + ':')}
        base = max(v[1] + v[3] for v in old.values())
        atlas = Image.open(f'img/hair/{view}.webp').convert('RGBA').crop((0, 0, 1024, base))
        cs = cells(keyed(path), 2)
        x, y, rowh, placed = 0, base + 2, 0, []
        for n, v in zip(NAMES, cs):
            if v is None:
                raise SystemExit(f'{view}: no piece found for {n}')
            if view == 'back':
                v = no_ears(v)
            im = Image.fromarray(v.astype(np.uint8), 'RGBA')
            im = im.resize((160, max(1, round(im.height * 160 / im.width))), Image.LANCZOS)
            if x + im.width > 1024:
                x, y, rowh = 0, y + rowh + 2, 0
            f = 160 / v.shape[1]
            cx, dy = ANCHOR[view][n]
            meta[f'{view}:hair:{n}'] = [x, y, im.width, im.height, round(cx * 160, 1), round(dy * SKULL[view] * f, 1), round(SKULL[view] * f, 1)]
            placed.append((im, x, y))
            x += im.width + 2
            rowh = max(rowh, im.height)
        out = Image.new('RGBA', (1024, y + rowh))
        out.alpha_composite(atlas)
        for im, px, py in placed:
            out.alpha_composite(im, (px, py))
        out.save(f'img/hair/{view}.webp', 'WEBP', quality=90, method=6)
        print(view, out.size, len(placed), 'new pieces')
    head = src[:src.index('export const')]
    with open(ATLAS_JS, 'w') as f:
        f.write(head + 'export const HAIR_ATLAS = ' + json.dumps(meta, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
