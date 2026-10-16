#!/usr/bin/env python3
"""Cut the non-striker sheet (10 unlabelled poses in two rows, front view, transparent background)
into an atlas for the batting view: the batter at the bowler's end, facing the camera.

usage: python3 tools/build_nonstriker.py SHEET.png img/nonstriker.webp

Poses are named ns1..ns10 in sheet order (top row left to right, then the bottom row). Prints the
frame table for js/bowlsprite.js: name: [x, y, w, h, anchorX, anchorY (feet), scale].
Needs numpy, scipy and Pillow.
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    src, out = sys.argv[1:3]
    a = np.array(Image.open(src).convert('RGBA'))
    al = a[..., 3] > 40
    lab, _ = ndimage.label(ndimage.binary_dilation(al, iterations=2))
    objs = [(s, i + 1) for i, s in enumerate(ndimage.find_objects(lab)) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 3000]
    mid = a.shape[0] / 2
    objs.sort(key=lambda o: (0 if (o[0][0].start + o[0][0].stop) / 2 < mid else 1, o[0][1].start))
    assert len(objs) == 10, len(objs)
    imgs = []
    for s, li in objs:
        c = a[s].copy()
        c[..., 3] = np.where(lab[s] == li, c[..., 3], 0)
        im = Image.fromarray(c)
        im = im.crop(im.getbbox())
        arr = np.array(im)
        bottom = int(np.nonzero((arr[..., 3] > 40).any(1))[0].max())
        xs = np.nonzero((arr[bottom - 14:bottom + 1, :, 3] > 40).any(0))[0]
        imgs.append((im, round((xs.min() + xs.max()) / 2, 1), bottom))
    pad, W, x, y, rowh, table = 2, 1024, 0, 0, 0, {}
    for k, (im, ax, ay) in enumerate(imgs, 1):
        w, h = im.size
        if x + w > W:
            x, y, rowh = 0, y + rowh + pad, 0
        table[f'ns{k}'] = [x, y, w, h, ax, ay, 1.0]
        x += w + pad
        rowh = max(rowh, h)
    atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for k, (im, *_r) in enumerate(imgs, 1):
        atlas.alpha_composite(im, tuple(table[f'ns{k}'][:2]))
    atlas.save(out, quality=88, method=6)
    print(json.dumps(table))


if __name__ == '__main__':
    main()
