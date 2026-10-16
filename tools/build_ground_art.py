#!/usr/bin/env python3
"""Cut a club's painted ground into the pieces the match views draw (img/ground/<club>/).

usage: python3 tools/build_ground_art.py CLUB FAR.png NEAR.png PITCH.png GRASS.png STUMPS.png BROKEN.png

FAR / NEAR   the stand at the bowler's end (seen when batting) and behind the batter (seen when
             bowling): level panoramas, solid magenta below the advertising board.
PITCH        the strip seen from straight above (transparent or magenta round it).
GRASS        a top-down outfield tile with 4 mowing stripes running left to right.
STUMPS       the set of stumps from the front, on magenta.
BROKEN       4 frames of the stumps being knocked over, side by side, on magenta.

Writes the images and their measurements to js/groundart.js (merged with the other clubs').
Needs numpy, scipy and Pillow.
"""
import json
import re
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def keyed(path):
    """RGBA with the magenta background taken out (soft edge, magenta fringe removed)."""
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g  # how magenta: 240+ for the background, below 0 for wood, ink and red
    alpha = np.clip(1 - (m - 70) / 110, 0, 1) * (a[..., 3] / 255)
    mag = np.array([242, 8, 250], np.float32)
    part = (alpha > 0) & (alpha < 1)
    k = alpha[part][:, None]
    a[..., :3][part] = np.clip((a[..., :3][part] - (1 - k) * mag) / np.maximum(k, 0.2), 0, 255)
    a[..., 3] = alpha * 255
    return a.astype(np.uint8)


def crop(a):
    ys, xs = np.nonzero(a[..., 3] > 8)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], xs.min(), ys.min()


def save(a, path, q=88):
    Image.fromarray(a).save(path, 'WEBP', quality=q, method=6)
    print(path, a.shape[1], 'x', a.shape[0])


def backdrop(path, out, screen):
    a = keyed(path)
    op = a[..., 3] > 128
    bottom = int(np.nonzero(op.mean(1) > 0.97)[0].max()) + 1  # last fully painted row: the board's foot
    a = a[:bottom].copy()
    a[..., 3] = 255
    # the advertising board: the band of plain blue just above the foot
    rgb = a[..., :3].astype(int)
    blue = (rgb[..., 2] > 100) & (rgb[..., 0] < 30) & (rgb[..., 1] > 25) & (rgb[..., 1] < 80)
    rows = blue.mean(1) > 0.8
    top = bottom - 1
    while top > 0 and (rows[top - 1] or not rows[top]):
        top -= 1
        if rows[top] and not rows[top - 1]:
            break
    meta = {'w': a.shape[1], 'h': a.shape[0], 'board': [int(top), int(bottom)]}
    if screen:
        # the big screen: the columns that are near-black through the middle of the stand, then
        # the rows that are near-black across those columns
        dark = rgb.sum(-1) < 40
        mid = slice(int(top * 0.62), int(top * 0.87))
        xs = np.nonzero(dark[mid].mean(0) > 0.9)[0]
        xs = max(np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1), key=len)  # the widest run
        ys = np.nonzero(dark[:top, xs.min():xs.max() + 1].mean(1) > 0.9)[0]
        meta['screen'] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    save(a, out)
    return meta


def wood_top(a):
    """Height of the stumps (feet to the top of the wood) in a cut-out, in its pixels."""
    rgb = a[..., :3].astype(int)
    wood = (a[..., 3] > 128) & (rgb[..., 0] > 170) & (rgb[..., 1] > 120) & (rgb[..., 2] < 170) & (rgb[..., 0] - rgb[..., 2] > 50)
    ys = np.nonzero(wood.sum(1) >= max(6, a.shape[1] * 0.04))[0]  # rows with real wood, not a bail's glint
    return int(ys.max() - ys.min())


def foot_x(a):
    """Centre of the stumps' feet: the opaque pixels in the bottom 6% of a cut-out."""
    h = a.shape[0]
    xs = np.nonzero((a[int(h * 0.94):, :, 3] > 128).any(0))[0]
    return float((xs.min() + xs.max()) / 2)


def main():
    club, far, near, pitch, grass, stumps, broken = sys.argv[1:8]
    d = f'img/ground/{club}/'
    meta = {'far': backdrop(far, d + 'far.webp', True), 'near': backdrop(near, d + 'near.webp', False)}

    p = np.array(Image.open(pitch).convert('RGBA'))
    if (p[..., 3] > 250).all():
        p = keyed(pitch)
    p, _, _ = crop(p)
    p = np.array(Image.fromarray(p).resize((300, round(p.shape[0] * 300 / p.shape[1])), Image.LANCZOS)).astype(np.float32)
    # painted, not photographed: blur away the grit, halve the contrast, and flatten the colour
    # into a few bands like the rest of the game's comic art
    rgb = ndi.gaussian_filter(p[..., :3], (2.4, 2.4, 0))
    mean = rgb[p[..., 3] > 128].mean(0)
    rgb = mean + (rgb - mean) * 0.55
    rgb = np.round(rgb / 10) * 10
    p = np.dstack([np.clip(rgb, 0, 255), p[..., 3]]).astype(np.uint8)
    save(p, d + 'pitch.webp')

    # grass: blend the tile with itself shifted half a width, more towards the sides, so its
    # left and right edges meet; then turn it so the stripes run along the pitch
    g = np.array(Image.open(grass).convert('RGB')).astype(np.float32)
    W = g.shape[1]
    w = (np.abs(np.arange(W) - W / 2) / (W / 2)) ** 3
    g = g * (1 - w)[None, :, None] + np.roll(g, W // 2, axis=1) * w[None, :, None]
    # quieter than painted: soften the grain and halve the contrast, so the grass stays behind the play
    g = ndi.gaussian_filter(g, (1.6, 1.6, 0))
    mean = g.reshape(-1, 3).mean(0)
    g = mean + (g - mean) * 0.5
    g = Image.fromarray(np.clip(g, 0, 255).astype(np.uint8)).rotate(90, expand=True).resize((512, 512), Image.LANCZOS)
    g.save(d + 'grass.webp', 'WEBP', quality=88, method=6)
    print(d + 'grass.webp', g.size)

    s, _, _ = crop(keyed(stumps))
    s = np.array(Image.fromarray(s).resize((round(s.shape[1] * 400 / s.shape[0]), 400), Image.LANCZOS))
    save(s, d + 'stumps.webp')
    meta['stumps'] = {'w': s.shape[1], 'h': s.shape[0], 'wood': wood_top(s), 'foot': foot_x(s)}

    # the falling frames: split where a wide band of columns is empty
    b = keyed(broken)
    occ = (b[..., 3] > 128).any(0)
    runs, x = [], 0
    while x < len(occ):
        if occ[x]:
            x0 = x
            while x < len(occ) and (occ[x] or occ[x:x + 30].any()):
                x += 1
            runs.append((x0, x))
        x += 1
    assert len(runs) == 4, runs
    frames, sheet_w, pieces = [], 0, []
    scale = None
    for x0, x1 in runs:
        f, _, _ = crop(b[:, x0:x1])
        if scale is None:
            scale = 400 * (wood_top(s) / s.shape[0]) / wood_top(f)  # the first frame's stumps as tall as the standing ones
        f = np.array(Image.fromarray(f).resize((round(f.shape[1] * scale), round(f.shape[0] * scale)), Image.LANCZOS))
        pieces.append(f)
        frames.append([sheet_w, 0, f.shape[1], f.shape[0], round(foot_x(f), 1)])
        sheet_w += f.shape[1] + 2
    sheet = np.zeros((max(f.shape[0] for f in pieces), sheet_w, 4), np.uint8)
    for f, fr in zip(pieces, frames):
        sheet[:f.shape[0], fr[0]:fr[0] + f.shape[1]] = f
    save(sheet, d + 'stumps-broken.webp')
    meta['broken'] = frames  # [x, y, w, h, foot x]: each frame's feet are on its bottom edge

    # merge into js/groundart.js
    path = 'js/groundart.js'
    art = {}
    try:
        m = re.search(r'GROUND_ART = (\{.*\});', open(path).read(), re.S)
        art = json.loads(m.group(1)) if m else {}
    except FileNotFoundError:
        pass
    art[club] = meta
    with open(path, 'w') as fh:
        fh.write('// Painted grounds: sizes and measurements of the pieces in img/ground/<club>/, in their own\n')
        fh.write('// pixels. Made by tools/build_ground_art.py; clubs not listed are painted by scene.js.\n')
        fh.write('export const GROUND_ART = ' + json.dumps(art, indent=1) + ';\n')
    print(json.dumps(meta))


if __name__ == '__main__':
    main()
