#!/usr/bin/env python3
"""Hair, beard and headwear overlays for the players on the pitch (img/hair/<view>.webp + js/hairatlas.js).

usage: python3 tools/build_hair.py FRONT.png BACK.png HEADWEAR.png

FRONT / BACK: rows of 5 on magenta: hair 1-10 (two rows), beards 11-15 (third row; the back
sheet's moustache is empty). HEADWEAR: top row front, bottom row back: turban, pakol, cap,
headband, sunglasses (front only). Thin stray lines (the ear outlines drawn on the back views)
are dropped. Needs numpy, scipy and Pillow.
"""
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HAIR = ['part', 'messy', 'buzz', 'bald', 'long', 'ponytail', 'bun', 'dreads', 'curly', 'spiky']
BEARD = ['full', 'stubble', 'moustache', 'goatee', 'long']
WEAR = ['turban', 'pakol', 'cap', 'headband', 'shades']
# Where each piece sits on the head: the skull's top-centre is at (left + cx * width,
# top + dy * W) of the piece's box, W being the skull width the pieces were drawn on
# (the bald piece's width). Fitted by eye on the game's own head (tools preview).
SKULL = {'front': 244, 'back': 236, 'wear': 290}  # (the headwear sheet was drawn on a bigger head)
ANCHOR = {
    'hair:part': (0.5, 0.05), 'hair:messy': (0.5, 0.08), 'hair:buzz': (0.5, 0.0), 'hair:bald': (0.5, 0.0),
    'hair:long': (0.5, 0.02), 'hair:ponytail': (0.5, 0.03), 'hair:bun': (0.5, 0.3), 'hair:dreads': (0.5, 0.06),
    'hair:curly': (0.5, 0.1), 'hair:spiky': (0.5, 0.12),
    'beard:full': (0.5, -0.75), 'beard:stubble': (0.5, -0.8), 'beard:moustache': (0.5, -1.0),
    'beard:goatee': (0.5, -0.95), 'beard:long': (0.5, -0.75),
    'wear:turban': (0.5, 0.15), 'wear:pakol': (0.5, 0.1), 'wear:cap': (0.5, 0.05), 'wear:headband': (0.5, 0.12),
    'wear:shades': (0.5, -0.6),
}


def keyed(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g  # magenta-ness
    alpha = np.clip(1 - (m - 60) / 100, 0, 1)
    mag = np.array([250, 0, 250], np.float32)
    part = (alpha > 0) & (alpha < 1)
    k = alpha[part][:, None]
    a[..., :3][part] = np.clip((a[..., :3][part] - (1 - k) * mag) / np.maximum(k, 0.25), 0, 255)
    a[..., 3] = alpha * 255
    return a


def cells(a, rows):
    """Find the pieces as blobs and sort them into rows x 5 by their centres. Small specks
    near a piece join it; thin line-like blobs (the ear outlines drawn on the back views) go."""
    H, W = a.shape[:2]
    op = a[..., 3] > 60
    lab, n = ndi.label(op)
    sizes = ndi.sum(op, lab, range(1, n + 1))
    boxes = ndi.find_objects(lab)
    big = [i for i in range(n) if sizes[i] >= 1500]
    cy = np.array([(boxes[i][0].start + boxes[i][0].stop) / 2 for i in big])
    # rows: split the big blobs' centres at the widest gaps
    order = np.sort(cy)
    gaps = np.argsort(np.diff(order))[::-1][:rows - 1]
    cuts = sorted((order[g] + order[g + 1]) / 2 for g in gaps)
    groups = {}
    for i, y in zip(big, cy):
        box = boxes[i]
        fill = sizes[i] / ((box[0].stop - box[0].start) * (box[1].stop - box[1].start))
        r = sum(y > c for c in cuts)
        c = int((box[1].start + box[1].stop) / 2 * 5 / W)
        groups.setdefault((r, c), []).append((i, fill))
    out = []
    for r in range(rows):
        for c in range(5):
            g = groups.get((r, c))
            if not g:
                out.append(None); continue
            main = max(g, key=lambda t: sizes[t[0]])[0]
            keep = [i for i, fill in g if i == main or fill > 0.2]
            y0 = min(boxes[i][0].start for i in keep); y1 = max(boxes[i][0].stop for i in keep)
            x0 = min(boxes[i][1].start for i in keep); x1 = max(boxes[i][1].stop for i in keep)
            # specks (stubble dots, loose hairs) inside the piece's box
            for i in range(n):
                if i in keep or i in big:
                    continue
                b = boxes[i]
                if b[0].start >= y0 - 6 and b[0].stop <= y1 + 6 and b[1].start >= x0 - 6 and b[1].stop <= x1 + 6:
                    keep.append(i)
            m = np.isin(lab, [i + 1 for i in keep])
            cell = a.copy()
            cell[..., 3] *= ndi.binary_dilation(m, iterations=2)
            cell = cell[max(0, y0 - 2):y1 + 2, max(0, x0 - 2):x1 + 2]
            out.append(cell)
    return out


def no_ears(p):
    """Back views: drop thin lines (ear and neck outlines) from the lower part of a piece -
    anything more than a few pixels from the solid hair mass."""
    op = p[..., 3] > 60
    disc = np.hypot(*np.mgrid[-4:5, -4:5]) <= 4
    solid = ndi.binary_dilation(ndi.binary_opening(op, structure=disc), iterations=6)
    drop = op & ~solid
    drop[:int(p.shape[0] * 0.35)] = False
    p = p.copy()
    p[..., 3] *= ~ndi.binary_dilation(drop, iterations=1)
    ys, xs = np.nonzero(p[..., 3] > 20)
    return p[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def main():
    front, back, wear = sys.argv[1:4]
    pieces = {}
    for view, path in (('front', front), ('back', back)):
        cs = cells(keyed(path), 3)
        for i, name in enumerate(HAIR):
            pieces[f'{view}:hair:{name}'] = cs[i]
        for i, name in enumerate(BEARD):
            pieces[f'{view}:beard:{name}'] = cs[10 + i]
    cs = cells(keyed(wear), 2)
    for i, name in enumerate(WEAR):
        pieces[f'front:wear:{name}'] = cs[i]
        pieces[f'back:wear:{name}'] = cs[5 + i]
    for k, v in pieces.items():
        if v is not None and k.startswith('back:') and ':beard:' not in k:
            pieces[k] = no_ears(v)
    # one atlas per view, each piece at 160 px wide (its height in proportion)
    meta = {}
    for view in ('front', 'back'):
        items = [(k, v) for k, v in pieces.items() if k.startswith(view + ':') and v is not None]
        W, x, y, rowh, placed = 1024, 0, 0, 0, []
        for k, v in items:
            im = Image.fromarray(v.astype(np.uint8), 'RGBA')
            im = im.resize((160, max(1, round(im.height * 160 / im.width))), Image.LANCZOS)
            if x + im.width > W:
                x, y, rowh = 0, y + rowh + 2, 0
            placed.append((k, im, x, y))
            cx, dy = ANCHOR[k.split(':', 1)[1]]
            f = 160 / v.shape[1]
            sw = SKULL['wear' if ':wear:' in k else view]
            meta[k] = [x, y, im.width, im.height, round(cx * 160, 1), round(dy * sw * f, 1), round(sw * f, 1)]
            x += im.width + 2
            rowh = max(rowh, im.height)
        atlas = Image.new('RGBA', (W, y + rowh))
        for k, im, px, py in placed:
            atlas.alpha_composite(im, (px, py))
        atlas.save(f'img/hair/{view}.webp', 'WEBP', quality=90, method=6)
        print(view, atlas.size, len(placed), 'pieces')
    with open('js/hairatlas.js', 'w') as f:
        f.write('// Hair, beard and headwear overlays in img/hair/<view>.webp: [x, y, w, h, skull top-centre x, y\n// (in the piece), skull width].\n// Made by tools/build_hair.py.\n')
        f.write('export const HAIR_ATLAS = ' + json.dumps(meta, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
