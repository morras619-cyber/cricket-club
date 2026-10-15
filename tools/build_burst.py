"""Cut the 8-frame comic impact burst sheet into img/burst.webp.

usage: python3 tools/build_burst.py SHEET.png img/burst.webp

Frames are taken in reading order, scaled to 60%, and each is centred on its white-hot core
so the burst stays put on the point of impact. Prints the frame table for js/fx.js:
[x, y, w, h, centreX, centreY]. Needs numpy, scipy and Pillow.
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

SCALE = 0.6


def main():
    src, out = sys.argv[1:3]
    a = np.array(Image.open(src).convert('RGBA'))
    al = a[..., 3] > 30
    lab, _ = ndimage.label(ndimage.binary_dilation(al, iterations=12))
    objs = [(s, i + 1) for i, s in enumerate(ndimage.find_objects(lab)) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 5000]
    objs.sort(key=lambda o: ((o[0][0].start + o[0][0].stop) // 2 > a.shape[0] // 2, o[0][1].start))
    assert len(objs) == 8, len(objs)
    frames = []
    for s, li in objs:
        c = a[s].copy()
        c[..., 3] = np.where(lab[s] == li, c[..., 3], 0)
        # core: the brightest, near-white pixels
        rgb = c[..., :3].astype(int)
        core = (c[..., 3] > 200) & (rgb.min(-1) > 225)
        ys, xs = np.nonzero(core) if core.sum() > 10 else np.nonzero(c[..., 3] > 200)
        cx, cy = xs.mean(), ys.mean()
        im = Image.fromarray(c)
        w, h = round(im.width * SCALE), round(im.height * SCALE)
        frames.append((im.resize((w, h), Image.LANCZOS), cx * SCALE, cy * SCALE))
    pad, W, x, y, rowh, table = 2, 1024, 0, 0, 0, []
    for im, cx, cy in frames:
        w, h = im.size
        if x + w > W:
            x, y, rowh = 0, y + rowh + pad, 0
        table.append([x, y, w, h, round(cx, 1), round(cy, 1)])
        x += w + pad
        rowh = max(rowh, h)
    atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for (im, *_r), t in zip(frames, table):
        atlas.alpha_composite(im, (t[0], t[1]))
    atlas.save(out, quality=88, method=6)
    print(json.dumps(table))


if __name__ == '__main__':
    main()
