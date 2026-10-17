#!/usr/bin/env python3
"""The plain-kit bowler (bald master sheets) for the match: img/kit/<view>.webp + js/kitsheets.js.

usage: python3 tools/build_kit_sheets.py FRONT.png BACK.png HAIRDIR [SPIN_FRONT.png]

SPIN_FRONT: the spinner's bald front sheet (15 poses, three rows of five); its hair layers in
HAIRDIR are hair-<style>-spin-front.png and its crest placements tools/kit/crest-spin-front.json.

FRONT / BACK: the bald master sheets (10 poses each on magenta, blue #1f5fd6 kit with yellow
trim). HAIRDIR: one layer per hairstyle and view, hair-<style>-<view>.png (grey hair on
transparency, same size as the sheet, lifted off the filled-in hair template). Per view it writes
  img/kit/<view>.webp       the poses packed in a row-major atlas
  img/kit/<view>-mask.png   R skin, G shirt (where a crest or print may go), B kit: 255 suit, 128 trim
  img/kit/<view>-hair-<style>.webp  each hairstyle, lined up with the atlas
and js/kitsheets.js: per pose its atlas rect and feet anchor, the shading references for the
kit and skin repaint, and the crest (front) / name-and-number (back) placements from
tools/kit/*.json moved into atlas coordinates. Needs numpy, scipy and Pillow.
"""
import json
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from build_hair import keyed  # noqa: E402

LUM = np.array([0.299, 0.587, 0.114])


def hsv(a):
    h = np.array(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).convert('HSV')).astype(np.float32) / 255
    return h[..., 0] * 360, h[..., 1], h[..., 2]


def masks(a):
    H, S, V = hsv(a[..., :3])
    op = a[..., 3] > 0.3
    suit = op & (H > 195) & (H < 255) & (S > 0.3)
    trim = op & (H > 40) & (H < 70) & (S > 0.5) & (V > 0.45)
    skin = op & (H > 5) & (H < 40) & (S > 0.2) & (V > 0.3) & ~trim
    skin = ndi.binary_fill_holes(ndi.binary_closing(skin, iterations=1)) & op & ~trim & ~suit
    return suit, trim, skin


def frames_of(a, count=10, rowh=600):
    op = a[..., 3] > 0.25
    lab, n = ndi.label(op)
    sizes = ndi.sum(op, lab, range(1, n + 1))
    boxes = ndi.find_objects(lab)
    big = sorted((i for i in range(n) if sizes[i] > 15000), key=lambda i: (boxes[i][0].start // rowh, boxes[i][1].start))
    assert len(big) == count, f'expected {count} poses, found {len(big)}'
    return lab, [(i + 1, boxes[i]) for i in big]


def build(view, sheet, hairpaths, place, count=10, rowh=600):
    # (a margin all round, so a pose at the sheet's edge can still be cut with padding)
    M = 60
    a = np.pad(keyed(sheet) / 255, ((M, M), (M, M), (0, 0)))
    hairs = {st: np.pad(np.array(Image.open(hp).convert('RGBA')).astype(np.float32) / 255, ((M, M), (M, M), (0, 0))) for st, hp in hairpaths.items()}
    hair_any = np.max([h[..., 3] for h in hairs.values()], axis=0)
    suit, trim, skin = masks(a)
    L = a[..., :3] @ LUM
    lab, frames = frames_of(a, count, rowh)
    # each pixel belongs to the nearest pose (hair close to two poses goes to its own head only)
    dist, (iy, ix) = ndi.distance_transform_edt(lab == 0, return_indices=True)
    owner = np.where(dist <= 40, lab[iy, ix], 0)
    pad, gap, W = 6, 4, 1024
    cells, x, y, rowh = [], gap, gap, 0
    for k, (i, sl) in enumerate(frames):
        me = lab == i
        hm = (hair_any > 0.02) & (owner == i)
        ys, xs = np.nonzero(me | hm)
        y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad + 1, xs.min() - pad, xs.max() + pad + 1
        w, h = x1 - x0, y1 - y0
        if x + w > W:
            x, y, rowh = gap, y + rowh + gap, 0
        cells.append((k, i, sl, (x0, y0, w, h), (x, y)))
        x += w + gap
        rowh = max(rowh, h)
    AH = y + rowh + gap
    atlas = np.zeros((AH, W, 4), np.float32)
    hatlas = {st: np.zeros((AH, W, 4), np.float32) for st in hairs}
    mask = np.zeros((AH, W, 3), np.uint8)
    meta = {'frames': [], 'place': []}
    for k, i, sl, (x0, y0, w, h), (ax, ay) in cells:
        me = lab == i
        keep = ndi.binary_dilation(me, iterations=2)
        src = a[y0:y0 + h, x0:x0 + w].copy()
        src[..., 3] *= keep[y0:y0 + h, x0:x0 + w]
        atlas[ay:ay + h, ax:ax + w] = src
        near = (owner == i)[y0:y0 + h, x0:x0 + w]
        for st, hair in hairs.items():
            hs = hair[y0:y0 + h, x0:x0 + w].copy()
            hs[..., 3] *= near
            hatlas[st][ay:ay + h, ax:ax + w] = hs
        m = me[y0:y0 + h, x0:x0 + w]
        sk, su, tr = skin[y0:y0 + h, x0:x0 + w] & m, suit[y0:y0 + h, x0:x0 + w] & m, trim[y0:y0 + h, x0:x0 + w] & m
        # the shirt for a crest or print: fold lines included, arms and hands in front left out
        shirt = ndi.binary_closing(su, iterations=4) & m & ~ndi.binary_dilation(sk, iterations=2)
        mask[ay:ay + h, ax:ax + w, 0] = sk * 255
        mask[ay:ay + h, ax:ax + w, 1] = shirt * 255
        mask[ay:ay + h, ax:ax + w, 2] = np.where(su, 255, np.where(tr, 128, 0))
        # feet: the bottom of the pose, under the planted foot (the lowest 8% of it)
        ys, xs = np.nonzero(me)
        foot = ys >= ys.max() - (ys.max() - ys.min()) * 0.08
        meta['frames'].append([ax, ay, w, h, round(float(xs[foot].mean()) - x0, 1), int(ys.max()) - y0])
        # placements are in tile coordinates: origin = the pose's box left - 40, top
        p = place[k]
        tx, ty = sl[1].start - 40 - x0 + ax, sl[0].start - y0 + ay
        meta['place'].append([round(p[0] + tx, 1), round(p[1] + ty, 1)] + p[2:])
    meta['refPx'] = int(frames[0][1][0].stop - frames[0][1][0].start)
    pct = lambda m: [round(float(np.percentile(L[m], q)), 4) for q in (4, 50, 99)]
    meta['suit'], meta['trim'] = pct(suit), pct(trim)
    meta['skin'] = round(float(np.median(L[skin])), 4)
    meta['hair'] = {}
    for st, hair in hairs.items():
        hl = hair[..., :3] @ LUM
        v = hl[hair[..., 3] > 0.5]
        v = v[v > 0.15]
        if len(v) < 50:  # nothing in this view (a beard, from behind)
            continue
        meta['hair'][st] = round(float(np.median(v)), 4)
    meta['size'] = [W, AH]
    os.makedirs('img/kit', exist_ok=True)
    Image.fromarray((np.clip(atlas, 0, 1) * 255).astype(np.uint8), 'RGBA').save(f'img/kit/{view}.webp', 'WEBP', quality=90, method=6)
    for st, ha in hatlas.items():
        if st not in meta['hair']:
            continue
        Image.fromarray((np.clip(ha, 0, 1) * 255).astype(np.uint8), 'RGBA').save(f'img/kit/{view}-hair-{st}.webp', 'WEBP', quality=90, method=6)
    Image.fromarray(mask, 'RGB').save(f'img/kit/{view}-mask.png', optimize=True)
    print(view, (W, AH))
    return meta


def main():
    front, back, hairdir = sys.argv[1:4]
    spin_front = sys.argv[4] if len(sys.argv) > 4 else None
    hp = lambda view: {f[5:-len(f'-{view}.png')]: os.path.join(hairdir, f) for f in sorted(os.listdir(hairdir))
                       if f.startswith('hair-') and f.endswith(f'-{view}.png') and not (view == 'front' and f.endswith('-spin-front.png'))}
    crest = json.load(open('tools/kit/crest-front.json'))['frames']
    prints = json.load(open('tools/kit/shirt-print-back.json'))['frames']
    out = {
        'front': build('front', front, hp('front'), [crest[str(k + 1)] for k in range(10)]),
        'back': build('back', back, hp('back'), [prints[str(k + 1)]['print'] + prints[str(k + 1)]['name'] + prints[str(k + 1)]['number'] for k in range(10)]),
    }
    if spin_front:
        sc = json.load(open('tools/kit/crest-spin-front.json'))['frames']
        out['spin-front'] = build('spin-front', spin_front, hp('spin-front'), [sc[str(k + 1)] for k in range(15)], 15, 500)
    with open('js/kitsheets.js', 'w') as f:
        f.write('// The plain-kit bowler sheets in img/kit/ (tools/build_kit_sheets.py). Per view: frames\n'
                '// [x, y, w, h, feet x, feet y] in sheet order; place: the crest (front: [x, y, size, squash x,\n'
                '// squash y, tilt]) or the name-and-number print (back: [x, y, width, squash x, squash y, tilt,\n'
                '// name dx, dy, number dx, dy]) per frame; shading references for the repaint.\n')
        f.write('export const KIT_SHEETS = ' + json.dumps(out, separators=(',', ':'), default=lambda o: o.item()) + ';\n')


if __name__ == '__main__':
    main()
