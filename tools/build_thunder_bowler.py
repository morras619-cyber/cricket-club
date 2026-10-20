#!/usr/bin/env python3
"""The Thunder Strikers' own bowler (img/kit/front-thunder, back-thunder): the painted Thunder kit
with its flame bolts (tools/kit/src/thunder/front.png, back.png: ten poses each, in a row, on
transparency), drawn as painted (no recolour); the game adds each player's skin, hair, crest and
name and number as on the plain-kit sheets.

Its poses: stand, run 1-3, gather, coil, front arm, release, follow-through, finish. The hair layers
are the plain-kit standing pose's, moved, scaled and turned onto each pose's head; the crest goes
on the left chest and the name and number across the upper back, found from each pose's shirt.
usage: python3 tools/build_thunder_bowler.py   (after tools/build_kit_sheets.py)
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
import build_kit_sheets as K  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)
SRC = 'tools/kit/src/thunder'


# (these sheets have real transparency: read as they are, not keyed off magenta)
K.keyed = lambda path: np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)


def load_sheets():
    src = open('js/kitsheets.js').read()
    return json.loads(src[src.index('= ') + 2:src.rindex(';')])


def tile(img, fr):
    x, y, w, h = fr[:4]
    return img[y:y + h, x:x + w]


# (heads the shape rule misses: a pose's head given by a point in it, atlas pixels)
BEARD_DROP = 0.11
HEAD_AT = {('front', 4): (940, 36), ('back', 7): (690, 714)}


def head_of(skin, at=None):
    """the head: the biggest roundish skin patch (arms are long, hands small), or the patch at a
    given point. Returns centre x, top y, width, tilt (radians, from the skull's axis), bottom y"""
    lab, n = ndi.label(skin)
    pick, best = None, -1
    for k, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == k
        if at is not None:
            if sl[0].start <= at[1] < sl[0].stop and sl[1].start <= at[0] < sl[1].stop and m[at[1] - sl[0].start, at[0] - sl[1].start]:
                pick = k; break
            continue
        a = m.sum()
        if a < 400: continue
        sc = a / (1 + max(0, K.elongation(m) - 1.6) * 3)
        if sc > best: pick, best = k, sc
    ys, xs = np.nonzero(lab == pick)
    top = ys.min()
    hh = ys.max() - top
    cap = ys < top + 0.45 * hh
    w = np.percentile(xs[cap], 97) - np.percentile(xs[cap], 3)
    up, lo = ys < top + 0.15 * hh, (ys >= top + 0.25 * hh) & (ys < top + 0.45 * hh)
    tilt = np.arctan2(xs[up].mean() - xs[lo].mean(), (ys[lo].mean() - ys[up].mean()) or 1)
    return xs[cap].mean(), top, w, tilt, ys.max()


def torso(mk, neck):
    """the shirt between the neck and the belt (the first band of trim yellow across the body
    below the neck): its rows, centre x and width"""
    suit, trim = mk[..., 2] == 255, mk[..., 2] == 128
    rows = range(int(neck) + 25, mk.shape[0])
    belt = None
    for y in rows:
        xs_t = np.nonzero(trim[y])[0]; xs_s = np.nonzero(suit[y])[0]
        if len(xs_t) > 25 and len(xs_s) and len(xs_t) > 0.35 * (len(xs_t) + len(xs_s)):
            belt = y; break
    belt = belt or int(neck + 160)
    sh = suit[int(neck):belt]
    ys, xs = np.nonzero(sh)
    upper = ys < (belt - neck) * 0.55
    return int(neck), belt, float(np.median(xs[upper])), float(np.percentile(xs[upper], 95) - np.percentile(xs[upper], 5))


def affine_tile(src, dst_shape, sx, sy, rot, src_pt, dst_pt):
    """src resampled onto a dst_shape canvas: scaled by sx across and sy down, turned by rot about
    src_pt, which lands on dst_pt"""
    c, sn = np.cos(rot), np.sin(rot)
    # dst -> src in (row, col): undo the turn, then the scale
    R = np.array([[c, sn], [-sn, c]])
    m = np.diag([1 / sy, 1 / sx]) @ R
    off = np.array(src_pt[::-1]) - m @ np.array(dst_pt[::-1])
    out = np.zeros(dst_shape + (4,), np.float32)
    for k in range(4):
        out[..., k] = ndi.affine_transform(src[..., k], m, offset=off, output_shape=dst_shape, order=1)
    return out


def main():
    old = load_sheets()
    out = dict(old)
    for view, path in (('front', f'{SRC}/front.png'), ('back', f'{SRC}/back.png')):
        nv = f'{view}-thunder'
        meta = K.build(nv, path, {}, [[0] * 10] * 10, rowh=900)
        om = old[view]
        oimg = np.asarray(Image.open(f'img/kit/{view}.webp').convert('RGBA')).astype(np.float32)
        omask = np.asarray(Image.open(f'img/kit/{view}-mask.png'))
        nmask = np.asarray(Image.open(f'img/kit/{nv}-mask.png'))
        AH, AW = meta['size'][1], meta['size'][0]
        hairs = {st: np.asarray(Image.open(f'img/kit/{view}-hair-{st}.webp').convert('RGBA')).astype(np.float32) for st in om['hair']}
        hout = {st: np.zeros((AH, AW, 4), np.float32) for st in hairs}
        place = []
        of = om['frames'][0]
        ohx, oht, ohw, otl, ohb = head_of(tile(omask, of)[..., 0] > 127)
        for k, nf in enumerate(meta['frames']):
            mk = tile(nmask, nf)
            at = HEAD_AT.get((view, k))
            nhx, nht, nhw, ntl, nhb = head_of(mk[..., 0] > 127, None if at is None else (at[0] - nf[0], at[1] - nf[1]))
            # hair: the standing pose's, onto this head (its width, its height from crown to collar,
            # so a beard lands on the chin; its tilt)
            for st, h in hairs.items():
                # (the painted faces sit lower in the skull than the plain sheet's: beards follow them)
                dy = BEARD_DROP * (nhb - nht) if st.startswith('beard') else 0
                warped = affine_tile(tile(h, of), (nf[3], nf[2]), nhw / ohw, (nhb - nht) / (ohb - oht), ntl - otl, (ohx, oht),
                                     (nhx - dy * np.sin(ntl), nht + dy * np.cos(ntl)))
                hout[st][nf[1]:nf[1] + nf[3], nf[0]:nf[0] + nf[2]] = warped
            # the crest on the left chest (front), the name and number across the upper back
            neck, belt, cx, sw = torso(mk, nhb)
            if view == 'front':
                q = [cx + 0.22 * sw, neck + 0.28 * (belt - neck), 0.24 * sw, 1, 1, 0]
            else:
                q = [cx, neck + 0.47 * (belt - neck), 0.72 * sw, 1, 1, 0, 0, 0, 0, 0]
            q[0] += nf[0]; q[1] += nf[1]
            place.append([round(float(v), 1) for v in q])
        meta['place'] = place
        meta['hair'] = dict(om['hair'])
        meta['own'] = True        # drawn in the Thunder's own colours: not repainted
        for st, ha in hout.items():
            Image.fromarray((np.clip(ha, 0, 255)).astype(np.uint8), 'RGBA').save(f'img/kit/{nv}-hair-{st}.webp', 'WEBP', quality=90, method=6)
        out[nv] = meta
        print(nv, meta['size'], 'refPx', meta['refPx'])
    K.write_sheets(out)


if __name__ == '__main__':
    main()
