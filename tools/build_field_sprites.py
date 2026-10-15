"""Cut the labelled top-down fielding sheet into img/field-top.webp (Outfield Mode).

usage: python3 tools/build_field_sprites.py SHEET.png img/field-top.webp

Poses, in sheet order: ready, run x3, dive, catch x2, throw x3, then two batters running
with the bat (2 frames each). Players face up the image, except the dive. The batters are
drawn in purple; they are turned blue here so one repaint to the team kit covers every frame.
Prints the frame table for js/bowlsprite.js: [x, y, w, h, centreX, centreY, facing (degrees)].
Needs numpy, scipy and Pillow.
"""
import sys, json, colorsys
import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = ['ready', 'run1', 'run2', 'run3', 'dive', 'catch1', 'catch2', 'throw1', 'throw2', 'throw3',
         'batA1', 'batA2', 'batB1', 'batB2']
BANDS = [(0, 62), (336, 398), (650, 708), (930, 992)]  # label rows
FACING = {'dive': 145}  # screen angle the player faces; everyone else faces up (-90)


def purple_to_blue(c):
    rgb = c[..., :3].astype(float) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    h = np.where(m & (mx == r), ((g - b) / np.where(m, d, 1)) % 6, h)
    h = np.where(m & (mx == g), (b - r) / np.where(m, d, 1) + 2, h)
    h = np.where(m & (mx == b), (r - g) / np.where(m, d, 1) + 4, h)
    h = h * 60
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    sel = (c[..., 3] > 8) & (h > 250) & (h < 310) & (s > 0.3)
    nh = 222 / 60
    i = np.floor(nh) % 6; f = nh - np.floor(nh)
    v = mx; p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    # hue 222 lies in sector 3: (p, q, v)
    out = np.stack([p, q, v], -1) if i == 3 else np.stack([v, t, p], -1)
    c[..., :3] = np.where(sel[..., None], (out * 255).round(), c[..., :3]).astype(np.uint8)


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
                mask[y0 + s[0].start - 3:y0 + s[0].stop + 3, s[1].start - 4:s[1].stop + 4] = False
        # the gold label borders: anything in a label row much wider than a player's foot
        lab, _ = ndimage.label(al[y0:y1])
        for i, sl in enumerate(ndimage.find_objects(lab), 1):
            if sl[1].stop - sl[1].start > 120:
                mask[y0:y1][lab == i] = False
    lab, _ = ndimage.label(ndimage.binary_dilation(mask, iterations=2))
    objs = [(s[0].start, s[0].stop, s[1].start, s[1].stop, i + 1) for i, s in enumerate(ndimage.find_objects(lab))
            if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 3000]
    row = lambda o: 0 if (o[0] + o[1]) / 2 < 340 else 1 if (o[0] + o[1]) / 2 < 650 else 2
    objs.sort(key=lambda o: (row(o), o[2]))
    assert len(objs) == len(NAMES), len(objs)
    imgs = {}
    for name, (y0, y1, x0, x1, li) in zip(NAMES, objs):
        m = (lab[y0:y1, x0:x1] == li) & mask[y0:y1, x0:x1]
        c = a[y0:y1, x0:x1].copy()
        c[..., 3] = np.where(m, c[..., 3], 0)
        if name.startswith('bat'):
            purple_to_blue(c)
        im = Image.fromarray(c)
        im = im.crop(im.getbbox())
        imgs[name] = im
    pad, W, x, y, rowh, table = 2, 1024, 0, 0, 0, {}
    for name, im in imgs.items():
        w, h = im.size
        if x + w > W:
            x, y, rowh = 0, y + rowh + pad, 0
        table[name] = [x, y, w, h, round(w / 2, 1), round(h / 2, 1), FACING.get(name, -90)]
        x += w + pad
        rowh = max(rowh, h)
    atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for name, im in imgs.items():
        atlas.alpha_composite(im, tuple(table[name][:2]))
    atlas.save(out, quality=88, method=6)
    print(json.dumps(table))


if __name__ == '__main__':
    main()
