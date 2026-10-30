#!/usr/bin/env python3
"""The club map: the base picture and the eight buildings (tools/map/*.png), cut out and made ready to be painted in the club's colours.

usage: python3 tools/build_map.py [name ...]      (all of them when none is named)

SOURCE (tools/map): base.png (the empty estate, 2048 x 3072) and one picture per building at level 1 (stadium, training, office, apartment, medical,
academy, clubhouse, shop), each on flat magenta (or already transparent). Roofs, awnings and seats are one royal blue; trim is one golden yellow.
OUT (img/map): base.webp, and per building <name>.webp (the cut-out, the blue and yellow turned into a grey ramp, so the club's colour multiplied
on gives the club's colour at the painted brightness) and <name>-tint.webp (R the main colour's weight, G the trim's), plus map.json (each
building's size in its picture; where it sits on the map is in js/clubmap.js).
Needs numpy, Pillow and scipy.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'map'), os.path.join(HERE, '..', 'img', 'map')
NAMES = ['stadium', 'training', 'office', 'apartment', 'medical', 'academy', 'clubhouse', 'shop']
GREY = 0.7              # js/clubmap.js: the grey a club-coloured surface is made in
BLUE_V, YEL_V = 0.84, 1.0   # the brightness (V) of the painted blue (#1f5fd6) and yellow (#ffd23f)
WIDTH = 1100            # a building's width in the game (the pictures are 1448 wide; the map is seen at most about this big)


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, np.where(mx > 0, d / (mx + 1e-9), 0), mx


def ramp(x, lo, hi):
    return np.clip((x - lo) / (hi - lo), 0, 1)


def cutout(im):
    """RGB float 0..1 and alpha, the magenta taken out (a picture that already has alpha keeps it)."""
    a = np.array(im.convert('RGBA')).astype(float) / 255
    rgb, al = a[..., :3], a[..., 3]
    if im.mode != 'RGBA':
        mag = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]           # magenta: red and blue high, green low
        al = 1 - ramp(mag, 0.30, 0.62)
        # the edge: the magenta taken out of the colour
        spill = np.clip(mag, 0, 1) * (al < 0.999)
        m = np.minimum(rgb[..., 0], rgb[..., 2])
        for c in (0, 2):
            rgb[..., c] = np.where(spill > 0, np.minimum(rgb[..., c], np.maximum(rgb[..., 1], m - spill)), rgb[..., c])
    return rgb, al


def build(name):
    rgb, al = cutout(Image.open(os.path.join(SRC, name + '.png')))
    ys, xs = np.where(al > 0.5)
    pad = 6
    x0, x1, y0, y1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, al.shape[1]), max(ys.min() - pad, 0), min(ys.max() + pad + 1, al.shape[0])
    rgb, al = rgb[y0:y1, x0:x1], al[y0:y1, x0:x1]
    h, s, v = hsv(rgb)
    blue = ramp(s, 0.40, 0.60) * ramp(v, 0.18, 0.32) * (1 - ramp(abs(h - 222), 22, 34))
    blue *= (h > 190) & (h < 255)
    yel_raw = ramp(s, 0.70, 0.84) * ramp(v, 0.62, 0.76) * (1 - ramp(abs(h - 46), 5, 11))
    # the trim sits against the blue: a golden surface far from any blue is a lit window, a lamp or a bat
    near = ndi.binary_dilation(blue > 0.5, iterations=7)
    yel = yel_raw * near
    blue = ndi.gaussian_filter(blue, 0.6)
    yel = ndi.gaussian_filter(yel, 0.6)
    tot = blue + yel
    scale = np.where(tot > 1, 1 / np.maximum(tot, 1e-6), 1)
    blue, yel = blue * scale, yel * scale
    # the grey ramp: the brightness relative to the painted colour, times the grey every club-coloured surface is made in
    k = np.clip(v / BLUE_V, 0, 1.4)[..., None]
    ky = np.clip(v / YEL_V, 0, 1.4)[..., None]
    grey = np.clip(GREY * (blue[..., None] * k + yel[..., None] * ky) / np.maximum(tot[..., None], 1e-6), 0, 1)
    out = rgb * (1 - np.clip(tot, 0, 1))[..., None] + grey * np.clip(tot, 0, 1)[..., None]
    tint = np.zeros(rgb.shape)
    tint[..., 0], tint[..., 1] = blue, yel
    w = WIDTH if rgb.shape[1] > WIDTH else rgb.shape[1]
    sz = (w, round(rgb.shape[0] * w / rgb.shape[1]))
    base = Image.fromarray((np.dstack([out, al]) * 255 + .5).astype(np.uint8), 'RGBA').resize(sz, Image.LANCZOS)
    tn = Image.fromarray((tint * 255 + .5).astype(np.uint8), 'RGB').resize(sz, Image.LANCZOS)
    base.save(os.path.join(OUT, name + '.webp'), quality=90, method=6)
    tn.save(os.path.join(OUT, name + '-tint.webp'), quality=90, method=6)
    return dict(w=sz[0], h=sz[1])


def main():
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or ['base'] + NAMES
    meta = json.load(open(os.path.join(OUT, 'map.json'))) if os.path.exists(os.path.join(OUT, 'map.json')) else {}
    for n in names:
        if n == 'base':
            im = Image.open(os.path.join(SRC, 'base.png')).convert('RGB')
            im.resize((1536, 2304), Image.LANCZOS).save(os.path.join(OUT, 'base.webp'), quality=84, method=6)
            meta['base'] = dict(w=1536, h=2304)
        else:
            meta[n] = build(n)
        print(n, meta[n])
    json.dump(meta, open(os.path.join(OUT, 'map.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
