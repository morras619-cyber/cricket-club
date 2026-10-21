#!/usr/bin/env python3
"""The Thunderdome's painted stands (img/ground/thunder/view-*.webp and js/groundart.js), from
tools/ground/src/thunder/:
  stand-screen.jpg, stand-arch.jpg  the stand ahead when batting / when bowling (2576 px wide: the
                                    painted stand, its sky above it, magenta below where the field goes)
  ground-<view>.webp                the rendered ground (grass, pitch, rope, boards: Blender, tools/blender)
  top-ring.png                      the stadium seen from above, magenta where the field goes
Each view's picture is the rendered ground with the painted stand laid above its boards, sized as the
stand shows on a phone (the stand's middle 60% across the screen), the painting mirrored out to the
sides for wider screens and its sky carried up past its top edge. The top view is the ring squashed to
the game's 0.78 tilt, with its inner edge on the grass the game draws. Needs numpy, scipy and Pillow.
usage: python3 tools/build_thunderdome_art.py
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SRC = os.path.join(HERE, 'ground', 'src', 'thunder')
OUT = os.path.join(ROOT, 'img', 'ground', 'thunder')
CY, BOARD_R, BOARD_H, ROPE_R, GRASS_R = 10.0, 63.8, 0.95, 62.0, 63.5
# each camera (js/scene.js Cam3D): render focal length, pixels above the horizon, height, pitch-end
# distance, direction, the painting seen, and the focal length a 390 x 844 phone gives it (the scale
# the stand is drawn at)
VIEWS = {
    'bat':    dict(f=1600, above=480, cy=4.2, cz=-9.5, dir=1,  stand='stand-screen.jpg', phone_f=1053),
    'bowl':   dict(f=2400, above=576, cy=2.6, cz=34.0, dir=-1, stand='stand-arch.jpg',   phone_f=1560),
    'keeper': dict(f=1200, above=480, cy=4.6, cz=-9.0, dir=1,  stand='stand-screen.jpg', phone_f=663),
}


def painting(name):
    a = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGB')).astype(np.float64)
    mag = (a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 90)
    return a[:int(np.nonzero(mag.mean(1) > 0.97)[0].min())]          # down to where the field begins


def structure_top(a):
    """the first row where something other than sky begins (a spire, a flag, the stand)"""
    notsky = a[..., 2] < 125                                         # (the sky, clouds and flags are all bright blue)
    return int(np.nonzero(notsky.mean(1) > 0.015)[0].min())


def build_view(name, v):
    g = np.asarray(Image.open(os.path.join(SRC, f'ground-{name}.webp')).convert('RGB')).astype(np.float64)
    H, W = g.shape[:2]
    st = painting(v['stand'])
    sh, sw = st.shape[:2]
    p = 390 / (sw * 0.6) * v['f'] / v['phone_f']                      # render pixels per painting pixel
    depth = v['dir'] * ((CY + v['dir'] * BOARD_R) - v['cz'])
    bt = int(round(v['above'] + (v['cy'] - BOARD_H) * v['f'] / depth))   # the boards' top row
    ph, pw = int(round(sh * p)), int(round(sw * p))
    img = Image.fromarray(st.astype(np.uint8)).resize((pw, ph), Image.LANCZOS)
    s = np.asarray(img).astype(np.float64)
    # across the whole width: the painting in the middle, mirrored out either side
    x0 = W / 2 - pw / 2
    t = np.mod(np.arange(W) - x0, 2 * pw)
    cols = np.where(t < pw, t, 2 * pw - 1 - t).astype(int)
    stand = s[:, cols]
    out = g.copy()
    top = bt - ph
    if top >= 0:
        out[top:bt] = stand
        if top > 0:
            # the sky carried up: the painting's top rows turned over and softened
            need = top
            src = stand[:min(ph, 160)][::-1]
            ext = np.concatenate([src] * int(np.ceil(need / len(src))), 0)[:need][::-1]
            ext = ndi.gaussian_filter(ext, (5, 3, 0))
            out[:top] = ext
    else:
        out[:bt] = stand[-top:]
    meta_top = '#%02x%02x%02x' % tuple(int(c) for c in out[:4].mean((0, 1)))
    meta_bottom = '#%02x%02x%02x' % tuple(int(c) for c in g[-4:].mean((0, 1)))
    # where the stand's structure begins, as the radius and height the game's sky effects use (r = 94)
    row_struct = top + structure_top(st) * p
    d94 = v['dir'] * ((CY + v['dir'] * 94) - v['cz'])
    roof_h = v['cy'] - (row_struct - v['above']) * d94 / v['f']
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'view-{name}.webp'), 'WEBP', quality=90, method=6)
    print(name, 'painting', (pw, ph), 'boards row', bt, 'top', top, 'stand structure at', round(row_struct), 'roof h', round(roof_h, 1))
    return dict(top=meta_top, bottom=meta_bottom, roof=dict(r=94, h=round(roof_h, 1)), w=W, h=H, f=v['f'], above=v['above'])


def build_top():
    a = np.asarray(Image.open(os.path.join(SRC, 'top-ring.png')).convert('RGB')).astype(np.float64)
    mag = (a[..., 0] > 180) & (a[..., 2] > 180) & (a[..., 1] < 110)    # (a JPEG: its magenta isn't pure)
    lab, n = ndi.label(mag)
    hole = lab == (np.argmax(ndi.sum(mag, lab, range(1, n + 1))) + 1)
    ys, xs = np.nonzero(hole)
    hw, hh = xs.max() - xs.min(), ys.max() - ys.min()
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    a[ndi.binary_dilation(hole, iterations=5)] = (38, 120, 52)         # (the game draws the grass over it; the pink fringe goes too)
    squash = 0.78 * hw / hh                                           # the hole becomes the game's 0.78 tilt
    h2 = int(round(a.shape[0] * squash))
    img = Image.fromarray(a.astype(np.uint8)).resize((a.shape[1], h2), Image.LANCZOS)
    img.save(os.path.join(OUT, 'view-top.webp'), 'WEBP', quality=90, method=6)
    px = hw / (2 * GRASS_R)
    print('top', img.size, 'px per m', round(px, 2), 'centre', (round(cx), round(cy * squash)))
    return dict(px=round(px, 3), w=img.width, h=img.height, c=[round(cx, 1), round(cy * squash, 1)])


if __name__ == '__main__':
    meta = {n: build_view(n, v) for n, v in VIEWS.items()}
    top = build_top()
    p = os.path.join(ROOT, 'js', 'groundart.js')
    src = open(p).read(); head, body = src.split('export const GROUND_ART = ', 1)
    art = json.loads(body.rstrip().rstrip(';'))
    t = art['thunder']
    for n, m in meta.items():
        t['views'][n].update(top=m['top'], bottom=m['bottom'], roof=m['roof'])
    t['top'] = top
    open(p, 'w').write(head + 'export const GROUND_ART = ' + json.dumps(art, indent=1) + ';\n')
    print('wrote js/groundart.js')
