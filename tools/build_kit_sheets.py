#!/usr/bin/env python3
"""The plain-kit bowler (bald master sheets) for the match: img/kit/<view>.webp + js/kitsheets.js.

usage: python3 tools/build_kit_sheets.py FRONT.png BACK.png HAIRDIR [SPIN_FRONT.png [SPIN_BACK.png]]
       python3 tools/build_kit_sheets.py --bat   (the batter only)

SPIN_FRONT / SPIN_BACK: the spinner's bald sheets in the premium kit (15 poses, three rows of
five; blue with a navy yoke and side panels and yellow piping), repainted in three club colours
(img/kit/<view>-tone.png: R navy weight, G yellow weight, B brightness). Hair layers in HAIRDIR:
hair-<style>-spin-front.png / -spin-back.png; crest placements tools/kit/crest-spin-front.json,
print placements tools/kit/shirt-print-spin-back.json.

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
import math
import os
import sys
import numpy as np
from PIL import Image, ImageDraw
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


# the premium kit (a navy yoke and side panels, yellow piping): drawn main blue, navy and yellow
TONE_REF = np.array([[30, 110, 225], [22, 42, 110], [250, 225, 30]], float) / 255


def coverage(poly, shape, ss=4):
    """a polygon's anti-aliased coverage (0-1) on a grid of shape"""
    im = Image.new('L', (shape[1] * ss, shape[0] * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in poly], fill=255)
    return np.array(im.resize((shape[1], shape[0]), Image.BOX)).astype(np.float32) / 255


def seg_dist(shape, segs):
    """distance from each grid point to the nearest of the segments"""
    yy, xx = np.mgrid[:shape[0], :shape[1]].astype(np.float32)
    d = np.full(shape, 1e9, np.float32)
    for (x0, y0), (x1, y1) in segs:
        dx, dy = x1 - x0, y1 - y0
        t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / (dx * dx + dy * dy), 0, 1)
        d = np.minimum(d, np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy)))
    return d


def paint_design(a, design, off, pipe=3.2):
    """the premium design on a plain sheet: per pose, the shirt outside its main panel is navy, with
    piping along the panel's edge. design: frame -> {panel: 6 points, top: pipe the top edge too}
    in sheet pixels (off: the sheet's padding). Returns (navy, piping) weights."""
    suit = masks(a)[0]
    H, W = suit.shape
    lab, _ = ndi.label(a[..., 3] > 0.3)
    navy = np.zeros((H, W), np.float32); pip = np.zeros((H, W), np.float32); conv = np.zeros((H, W), bool)
    H_, S_, V_ = hsv(a[..., :3])
    yel = (a[..., 3] > 0.3) & (H_ > 35) & (H_ < 72) & (S_ > 0.4) & (V_ > 0.4)
    skin = masks(a)[2]
    for f in design.values():
        outline = f.get('outline')
        P = [(x + off, y + off) for x, y in (outline or f['panel'])]
        (wrx, wry), (wlx, wly) = (P[4], P[5]) if outline else (P[3], P[4])
        x0, x1 = max(0, int(min(p[0] for p in P)) - 120), min(W, int(max(p[0] for p in P)) + 120)
        y0, y1 = max(0, int(min(p[1] for p in P)) - 60), int(max(wry, wly)) + 6
        sl = (slice(y0, y1), slice(x0, x1))
        yy, xx = np.mgrid[y0:y1, x0:x1]
        # the shirt: this pose's kit blue above the belt line
        above = (yy - wly) * (wrx - wlx) - (xx - wlx) * (wry - wly) < 0
        cx, cy = int(np.mean([p[0] for p in P])), int(np.mean([p[1] for p in P]))
        shirt = suit[sl] & above & (lab[sl] == lab[cy, cx])
        if outline:
            # a drawn sheet with its own yellow seams (the batter): those outside the panel become
            # panel colour, all but the collar and the cuffs
            local = [(x - x0, y - y0) for x, y in P]
            inside = coverage(local, shirt.shape)
            dc = seg_dist(shirt.shape, [(local[0], local[1])])
            seams = yel[sl] & above & (lab[sl] == lab[cy, cx]) & (inside < 0.5) & (dc > 9) & ~ndi.binary_dilation(skin[sl], iterations=3)
            conv[sl] |= seams
            shirt = shirt | seams
            segs = [(local[i], local[(i + 1) % 8]) for i in (1, 2, 3, 5, 6, 7)]
            p = np.clip(pipe / 2 + 0.5 - seg_dist(shirt.shape, segs), 0, 1) * shirt
            navy[sl] = np.maximum(navy[sl], shirt * (1 - inside) * (1 - p))
            pip[sl] = np.maximum(pip[sl], p)
            continue
        if f.get('yoke'):
            # the spinner's shape: from each collar end out to a corner at the shoulder blades
            (ylx, yly), (yrx, yry) = [(x + off, y + off) for x, y in f['yoke']]
            P = [P[0], P[1], (yrx, yry), P[3], P[4], (ylx, yly)]
        local = [(x - x0, y - y0) for x, y in P]
        inside = coverage(local, shirt.shape)
        n = len(local)
        segs = [(local[i], local[(i + 1) % n]) for i in range(1, n) if not (n == 6 and i == 3) and not (n == 8 and i == 4)] + ([(local[0], local[1])] if f.get('top') else [])
        p = np.clip(pipe / 2 + 0.5 - seg_dist(shirt.shape, segs), 0, 1) * shirt
        navy[sl] = np.maximum(navy[sl], shirt * (1 - inside) * (1 - p))
        pip[sl] = np.maximum(pip[sl], p)
    return navy, pip, conv


def rework_yoke(a, kit, w, Ls, ref, marks, off, pipe=3.2):
    """a drawn premium back with a yoke, repainted to the pace design: inside the band between the
    collar and the yoke corners the cloth becomes the main colour (its brightness rescaled to the
    main colour's), and piping runs from each collar end to the yoke corner"""
    H_, S_, V_ = hsv(a[..., :3])
    yel = kit & (H_ > 38) & (H_ < 72) & (S_ > 0.45)
    thick = ndi.binary_dilation(ndi.binary_opening(yel, iterations=3), iterations=3) & yel  # collar, cuffs, belt
    cloth = kit & ~thick
    # (the old piping's anti-aliased edges are no kit colour: taken in with the cloth around them)
    edge = (a[..., 3] > 0.3) & ~kit & ndi.binary_dilation(cloth, iterations=2) & ~masks(a)[2]
    rm, rn, ry = ref
    to_main = w[..., 0] + w[..., 1] * rm / rn + w[..., 2] * rm / ry
    to_pipe = w[..., 0] * ry / rm + w[..., 1] * ry / rn + w[..., 2]
    for m in marks.values():
        (cl, cr), (yl, yr) = [[(x + off, y + off) for x, y in m[k]] for k in ('collar', 'yoke')]
        x0, x1 = int(min(cl[0], yl[0])) - 12, int(max(cr[0], yr[0])) + 12
        y0, y1 = int(min(cl[1], cr[1])) - 12, int(max(yl[1], yr[1])) + 12
        sl = (slice(y0, y1), slice(x0, x1))
        loc = lambda p: (p[0] - x0, p[1] - y0)
        shape = (y1 - y0, x1 - x0)
        poly = coverage([loc(cl), loc(cr), loc((yr[0], yr[1] + 4)), loc((yl[0], yl[1] + 4))], shape)
        kit[sl] |= (poly > 0.5) & edge[sl]
        cl_ = cloth[sl] | ((poly > 0.5) & edge[sl])
        band = poly * cl_
        p = np.clip(pipe / 2 + 0.5 - seg_dist(shape, [(loc(cl), loc(yl)), (loc(cr), loc(yr))]), 0, 1) * cl_
        band *= 1 - p
        ws = w[sl]
        new = ws * (1 - band - p)[..., None]
        new[..., 0] += band; new[..., 2] += p
        conv = np.where(cloth[sl], Ls[sl] * to_main[sl], 0)
        # brightness across the band from the cloth around each pixel (no trace of the old line)
        num, den = ndi.gaussian_filter(conv, 1.4), ndi.gaussian_filter(cloth[sl].astype(np.float32), 1.4)
        smooth = num / np.maximum(den, 1e-3)
        Ls[sl] = Ls[sl] * (1 - band - p) + smooth * band + Ls[sl] * to_pipe[sl] * p
        w[sl] = new
    return w, Ls, kit


def tones(a, design=None, off=0, marks=None):
    """soft class weights (navy, yellow; main = the rest) and lightly smoothed brightness. A sheet
    drawn in the premium kit is read as drawn; a plain one gets the design painted on (design)."""
    H, S, V = hsv(a[..., :3])
    rgb = a[..., :3]
    kit = (a[..., 3] > 0.3) & (((H > 190) & (H < 265) & (S > 0.25)) | ((H > 38) & (H < 72) & (S > 0.45)))
    chroma = lambda c: c / (c.sum(-1, keepdims=True) + 1e-3)
    L = rgb @ LUM
    # the main colour and navy share a hue: told apart by brightness (main L ~ 86, navy ~ 42 of 255)
    yel = np.clip((0.18 - np.linalg.norm(chroma(rgb) - chroma(TONE_REF[2]), axis=-1)) / 0.08, 0, 1)
    Ls = ndi.gaussian_filter(L, 0.6)
    if design:
        navy, pip, conv = paint_design(a, design, off)
        Ls0 = Ls.copy()
        yel = yel * ~conv
        pip *= 1 - yel
        w = np.stack([(1 - yel) * (1 - navy) * (1 - pip), (1 - yel) * navy, np.maximum(yel, pip)], -1)
        w /= w.sum(-1, keepdims=True) + 1e-6
        # the painted classes are shaded by the blue cloth under them: navy against the main
        # colour's brightness, the piping lifted to the drawn yellow's
        rm = float(np.median(L[kit & (w[..., 0] > 0.8)])); ry = float(np.median(L[kit & (yel > 0.8)]))
        Ls = Ls * (1 + pip * (ry / rm - 1))
        # drawn yellow seams turned panel colour: shaded as cloth, not as bright yellow
        Ls = np.where(conv, Ls0 * rm / ry, Ls)
        return kit, w, Ls, [round(rm, 4), round(rm, 4), round(ry, 4)]
    navy = np.clip((72 / 255 - ndi.gaussian_filter(L, 1.2)) / (20 / 255), 0, 1)
    w = np.stack([(1 - yel) * (1 - navy), (1 - yel) * navy, yel], -1)
    w = ndi.gaussian_filter(w, (0.8, 0.8, 0))
    w /= w.sum(-1, keepdims=True) + 1e-6
    ref = [round(float(np.median(L[kit & (w[..., k] > 0.8)])), 4) for k in range(3)]
    if marks:
        w, Ls, kit = rework_yoke(a, kit, w, Ls, ref, marks, off)
    return kit, w, Ls, ref


def clean_hair(h):
    """a lifted hair layer without what isn't hair: skin showing through a fade (it would turn
    white-grey in the recolour) becomes hair thinning out over the skin; bright slivers of the old
    sheet's outlines at the layer's edge and away from the head go"""
    H, S, V = hsv(h[..., :3])
    L = h[..., :3] @ LUM
    al = h[..., 3]
    op = al > 0.5
    skin = op & (H > 5) & (H < 45) & (S > 0.22) & (V > 0.35)
    dark = op & ~skin & (L < 0.66)
    lab, n = ndi.label(dark)
    if n:
        thick = ndi.sum(ndi.binary_erosion(dark, iterations=2), lab, range(1, n + 1))
        core = np.isin(lab, 1 + np.nonzero(thick > 30)[0])
    else:
        core = dark
    near = ndi.binary_fill_holes(ndi.binary_dilation(core, iterations=2))
    edge = ~ndi.binary_erosion(op, iterations=4)
    keep = near & ~(edge & (L > 0.8))
    out = h.copy()
    out[..., 3] = al * keep
    if skin.sum() > 20 and core.any():
        # a fade: each skin-toned pixel read as hair over skin, alpha = how much hair is in it
        ls, lh = float(np.percentile(L[skin], 75)), float(np.median(L[core]))
        f = np.clip((ls - L) / max(ls - lh, 0.05), 0, 1)
        out[..., 3] = np.where(skin, al * keep * f, out[..., 3])
        for k in range(3):
            out[..., k] = np.where(skin, lh, out[..., k])
    return out


def frames_of(a, count=10, rowh=600):
    op = a[..., 3] > 0.25
    lab, n = ndi.label(op)
    sizes = ndi.sum(op, lab, range(1, n + 1))
    boxes = ndi.find_objects(lab)
    big = sorted((i for i in range(n) if sizes[i] > 15000), key=lambda i: (boxes[i][0].start // rowh, boxes[i][1].start))
    assert len(big) == count, f'expected {count} poses, found {len(big)}'
    return lab, [(i + 1, boxes[i]) for i in big]


def build(view, sheet, hairpaths, place, count=10, rowh=600, premium=False, design=None, marks=None, place_abs=False):
    # (a margin all round, so a pose at the sheet's edge can still be cut with padding)
    M = 60
    a = np.pad(keyed(sheet) / 255, ((M, M), (M, M), (0, 0)))
    hairs = {st: clean_hair(np.pad(np.array(Image.open(hp).convert('RGBA')).astype(np.float32) / 255, ((M, M), (M, M), (0, 0)))) for st, hp in hairpaths.items()}
    hair_any = np.max([h[..., 3] for h in hairs.values()], axis=0) if hairs else np.zeros(a.shape[:2])
    suit, trim, skin = masks(a)
    L = a[..., :3] @ LUM
    if premium:
        kit, tw, tL, tref = tones(a, design, M, marks)
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
    tone = np.zeros((AH, W, 3), np.uint8)
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
        if premium:
            # one kit in three colours: R navy weight, G yellow weight, B brightness (main = the rest)
            kk = kit[y0:y0 + h, x0:x0 + w] & m
            mask[ay:ay + h, ax:ax + w, 2] = np.where(kk | su | tr, 255, 0)
            tone[ay:ay + h, ax:ax + w, 0] = np.round(tw[y0:y0 + h, x0:x0 + w, 1] * 255 * kk)
            tone[ay:ay + h, ax:ax + w, 1] = np.round(tw[y0:y0 + h, x0:x0 + w, 2] * 255 * kk)
            tone[ay:ay + h, ax:ax + w, 2] = np.round(np.clip(tL[y0:y0 + h, x0:x0 + w], 0, 1) * 255 * kk)
        # feet: the bottom of the pose, under the planted foot (the lowest 8% of it)
        ys, xs = np.nonzero(me)
        foot = ys >= ys.max() - (ys.max() - ys.min()) * 0.08
        meta['frames'].append([ax, ay, w, h, round(float(xs[foot].mean()) - x0, 1), int(ys.max()) - y0])
        # placements are in tile coordinates: origin = the pose's box left - 40, top
        p = place[k]
        tx, ty = (M - x0 + ax, M - y0 + ay) if place_abs else (sl[1].start - 40 - x0 + ax, sl[0].start - y0 + ay)
        meta['place'].append([round(p[0] + tx, 1), round(p[1] + ty, 1)] + p[2:])
    meta['refPx'] = int(frames[0][1][0].stop - frames[0][1][0].start)
    pct = lambda m: [round(float(np.percentile(L[m], q)), 4) for q in (4, 50, 99)]
    meta['suit'], meta['trim'] = pct(suit), pct(trim)
    meta['skin'] = round(float(np.median(L[skin])), 4)
    if premium:
        meta['tones'] = tref
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
    if premium:
        Image.fromarray(tone, 'RGB').save(f'img/kit/{view}-tone.png', optimize=True)
    print(view, (W, AH))
    return meta


def main():
    front, back, hairdir = sys.argv[1:4]
    spin_front = sys.argv[4] if len(sys.argv) > 4 else None
    hp = lambda view: {f[5:-len(f'-{view}.png')]: os.path.join(hairdir, f) for f in sorted(os.listdir(hairdir))
                       if f.startswith('hair-') and f.endswith(f'-{view}.png') and (view.startswith('spin') or '-spin-' not in f)}
    crest = json.load(open('tools/kit/crest-front.json'))['frames']
    prints = json.load(open('tools/kit/shirt-print-back.json'))['frames']
    # the pace bowler's sheets are drawn in the plain kit: the premium design is painted on
    design = json.load(open('tools/kit/premium-pace.json'))
    out = {
        'front': build('front', front, hp('front'), [crest[str(k + 1)] for k in range(10)], premium=True, design=design['front']),
        'back': build('back', back, hp('back'), [prints[str(k + 1)]['print'] + prints[str(k + 1)]['name'] + prints[str(k + 1)]['number'] for k in range(10)], premium=True, design=design['back']),
    }
    # the spinner, in the premium kit: bald sheets with hair-<style>-spin-front/-spin-back.png layers
    if spin_front:
        sc = json.load(open('tools/kit/crest-spin-front.json'))['frames']
        out['spin-front'] = build('spin-front', spin_front, hp('spin-front'), [sc[str(k + 1)] for k in range(15)], 15, 500, premium=True)
    if len(sys.argv) > 5:
        sp = json.load(open('tools/kit/shirt-print-spin-back.json'))['frames']
        out['spin-back'] = build('spin-back', sys.argv[5], hp('spin-back'),
                                 [sp[str(k + 1)]['print'] + sp[str(k + 1)]['name'] + sp[str(k + 1)]['number'] for k in range(15)], 15, 500, premium=True,
                                 marks={k: v for k, v in json.load(open('tools/kit/premium-spin-back.json')).items() if not k.startswith('_')})
    out['bat-back'] = build_bat()
    write_sheets(out)


def build_bat():
    """the batter from behind (tools/kit/compose_batter.py makes the sheet: drawn in the premium kit,
    read as drawn), his name and number where that tool found the shirt"""
    pr = json.load(open('tools/kit/bat-back-print.json'))
    n = len(pr['frames'])
    return build('bat-back', 'tools/kit/src/batter-back.png', {}, [pr[str(k + 1)] for k in range(n)], n, pr['rowh'],
                 premium=True, place_abs=True)


def write_sheets(out):
    with open('js/kitsheets.js', 'w') as f:
        f.write('// The plain-kit bowler sheets in img/kit/ (tools/build_kit_sheets.py). Per view: frames\n'
                '// [x, y, w, h, feet x, feet y] in sheet order; place: the crest (front: [x, y, size, squash x,\n'
                '// squash y, tilt]) or the name-and-number print (back: [x, y, width, squash x, squash y, tilt,\n'
                '// name dx, dy, number dx, dy]) per frame; shading references for the repaint.\n')
        f.write('export const KIT_SHEETS = ' + json.dumps(out, separators=(',', ':'), default=lambda o: o.item()) + ';\n')



if __name__ == '__main__':
    if sys.argv[1:] == ['--bat']:
        # only the batter: the other views as they were
        src = open('js/kitsheets.js').read()
        out = json.loads(src[src.index('= ') + 2:src.rindex(';')])
        out['bat-back'] = build_bat()
        write_sheets(out)
    else:
        main()
