"""Cut a labelled wicket-keeper sheet (9 poses, transparent background) into an atlas.

usage: python3 tools/build_keeper_sprites.py SHEET.png OUT.webp

Poses, in sheet order: ready (crouch), rise, take at waist, take above head, dive left,
dive right, juggle, stumping, celebration. Works for the back view (keeper mode) and the
front view (seen from the bowling camera); both sheets share this layout.
Prints the frame table for js/bowlsprite.js: [x, y, w, h, anchorX, anchorY, helmetWidthPx].
The anchor is the bottom of the figure, centred on the feet (on the body for the dives).
Needs numpy, scipy and Pillow.
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = ['ready', 'rise', 'waist', 'high', 'diveL', 'diveR', 'juggle', 'stump', 'celebrate']
BANDS = [(0, 50), (390, 432), (646, 690)]  # label rows


def main():
    src, out = sys.argv[1:3]
    a = np.array(Image.open(src).convert('RGBA'))
    al = a[..., 3] > 40
    dark = al & (a[..., :3].astype(int).max(-1) < 80)
    mask = al.copy()
    for y0, y1 in BANDS:
        lab, _ = ndimage.label(ndimage.binary_closing(dark[y0:y1], iterations=3))
        for s in ndimage.find_objects(lab):
            if s[1].stop - s[1].start > 60:
                mask[y0 + s[0].start - 2:y0 + s[0].stop + 2, s[1].start - 3:s[1].stop + 3] = False
    lab, _ = ndimage.label(ndimage.binary_dilation(mask, iterations=2))
    objs = [(s[0].start, s[0].stop, s[1].start, s[1].stop, i + 1) for i, s in enumerate(ndimage.find_objects(lab))
            if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 3000]
    row = lambda o: 0 if (o[0] + o[1]) / 2 < 385 else 1 if (o[0] + o[1]) / 2 < 640 else 2
    objs.sort(key=lambda o: (row(o), o[2]))
    assert len(objs) == 9, len(objs)
    imgs = {}
    for name, (y0, y1, x0, x1, li) in zip(NAMES, objs):
        m = (lab[y0:y1, x0:x1] == li) & mask[y0:y1, x0:x1]
        c = a[y0:y1, x0:x1].copy()
        c[..., 3] = np.where(m, c[..., 3], 0)
        im = Image.fromarray(c)
        im = im.crop(im.getbbox())
        arr = np.array(im).astype(int)
        alp = arr[..., 3] > 40
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
        bottom = np.nonzero(alp.any(1))[0].max()
        if name.startswith('dive'):
            ax = im.width / 2
        else:
            xs = np.nonzero(alp[bottom - 14:bottom + 1].any(0))[0]
            ax = (xs.min() + xs.max()) / 2
        # helmet: the topmost blue blob of a decent size; its width sets the scale in game
        blue = alp & (b > r + 70) & (b > g + 30)
        hl, _ = ndimage.label(blue)
        cand = [(s[0].start, i + 1) for i, s in enumerate(ndimage.find_objects(hl)) if (hl[s] == i + 1).sum() > 250]
        top, hi = min(cand)
        hm = hl == hi
        hw = max(hm[y].sum() for y in range(top, min(top + 24, hm.shape[0])))
        imgs[name] = (im, round(ax, 1), int(bottom), int(hw))
    pad, W, x, y, rowh, table = 2, 1024, 0, 0, 0, {}
    for name, (im, ax, ay, hw) in imgs.items():
        w, h = im.size
        if x + w > W:
            x, y, rowh = 0, y + rowh + pad, 0
        table[name] = [x, y, w, h, ax, ay, hw]
        x += w + pad
        rowh = max(rowh, h)
    atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for name, (im, *_r) in imgs.items():
        atlas.alpha_composite(im, tuple(table[name][:2]))
    atlas.save(out, quality=88, method=6)
    print(json.dumps(table))


if __name__ == '__main__':
    main()
