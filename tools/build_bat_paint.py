#!/usr/bin/env python3
"""The painted batter from behind (img/kit/bat-paint.webp + -mask.png + -tone.png, and its entry in js/kitsheets.js).

usage: python3 tools/build_bat_paint.py

SOURCES: tools/kit/bat-paint-src/<id>.png (sheets of poses on flat magenta; plain blue-and-yellow kit, no crest, name or number) and
tools/kit/bat-ready-source.png (the stance). FRAMES below says which pose is which of the game's frames (kitsprite.js POSE_BAT); a pose may serve
several frames. A frame the sheet does not have is drawn from the old sheet (bat-back). Every pose is cut out, set on one scale (a sheet's
SCALE: the figures of a sheet were painted at one size) and packed into one atlas.
  mask  R skin, G shirt back (where the name and number print), B 255 where the kit is (blue or yellow)
  tone  G the yellow weight, B the brightness; meta.hsv holds the painted blue and yellow (kitsprite.js teamSheet repaints by hue/saturation/value)
Needs numpy, scipy and Pillow.
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'tools/kit/bat-paint-src/'
G = 0.85                                  # the whole set's size (1.0 = the stance at 840 px)
READY_SCALE = 840 / 1575 * G              # the stance (its source figure is 1575 px tall)
SCALE = {'464df84f': 1.10 * G, 'f628f0f7': 1.10 * G}   # sheets drawn on the wide canvas; every other sheet is on the 1536 x 1024 canvas
DEFAULT_SCALE = 0.94 * G
SCALE.update({'c0v1drv1': 0.81 * G, 'c0v2cut1': 0.81 * G, 'c0v3loft': 0.81 * G, 'c0v4str': 0.81 * G})   # (the 2576 x 1438 sheets)
DIL = {'f628f0f7': 2}                     # (its figures kneel close together: a small gap between them)
FRAMES = {
    'backlift': ('464df84f', 1), 'leave1': ('2965e2d6', 0), 'leave2': ('2965e2d6', 1),
    'drive1': ('935db8b9', 1), 'drive2': ('935db8b9', 2), 'drive3': ('935db8b9', 0),
    'straight1': ('f1c2ccd0', 0), 'straight2': ('f1c2ccd0', 2), 'ondrive1': ('5d11998b', 0), 'ondrive2': ('2236f518', 1), 'cover1': ('5d11998b', 1),
    'pull1': ('2236f518', 0), 'pull2': ('b506964d', 0), 'def1': ('df0bc565', 0), 'def2': ('df0bc565', 1), 'def3': ('c3007d6e', 1),
    'cut1': ('b506964d', 1), 'cut2': ('54ab15c9', 0), 'cut3': ('464df84f', 2), 'cut4': ('f1c2ccd0', 1),
    'rsweep1': ('f628f0f7', 0), 'rsweep2': ('f628f0f7', 1), 'rsweep3': ('f628f0f7', 2), 'celebrate': ('efc0e85c', 0),
    'cover0': ('c0v1drv1', 0), 'cover2': ('c0v1drv1', 1), 'cover3': ('c0v1drv1', 2), 'cutflat': ('c0v2cut1', 1), 'loft1': ('c0v3loft', 2), 'straight3': ('c0v4str', 2),
}
READY = 'tools/kit/bat-ready-source.png'
# where the shirt back is, for the poses the colours alone get wrong: (left, right, top, bottom) as fractions of the frame
SHIRT_AT = {'ondrive2': (0.30, 0.85, 0.27, 0.46), 'cut4': (0.02, 0.55, 0.12, 0.33), 'celebrate': (0.22, 0.72, 0.30, 0.50),
            'cut2': (0.08, 0.62, 0.12, 0.30), 'rsweep2': (0.10, 0.55, 0.20, 0.42)}
PAD = 6


def key(im):
    a = np.array(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    alpha = np.clip(1 - ((np.minimum(r, b) - g) - 60) / 100, 0, 1)
    mag = np.array([250, 0, 250], np.float32); part = (alpha > 0) & (alpha < 1); k = alpha[part][:, None]
    a[..., :3][part] = np.clip((a[..., :3][part] - (1 - k) * mag) / np.maximum(k, 0.25), 0, 255)
    return a, alpha


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return hue, (mx - mn) / (mx + 1e-6), mx


def figures(src):
    im = Image.open(SRC + src + '.png'); a, alpha = key(im)
    lab, n = ndi.label(ndi.binary_dilation(alpha > 0.5, iterations=DIL.get(src, 8)))
    objs = [(i + 1, bx) for i, bx in enumerate(ndi.find_objects(lab)) if (bx[0].stop - bx[0].start) > 150]
    objs.sort(key=lambda t: t[1][1].start)
    return [(a[bx], alpha[bx] * ndi.binary_dilation(lab[bx] == l, iterations=3)) for l, bx in objs]


def cutout(a, alpha, scale):
    # no pink glow left inside the figure (a soft blob of the magenta in the art): hue 280-345 with some colour in it
    hue, sat, mx = hsv(a)
    alpha = alpha * ~((hue > 280) & (hue < 345) & (sat > 0.06) & (alpha > 0.05))
    ys, xs = np.nonzero(alpha > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    a = a[y0:y1, x0:x1]; alpha = alpha[y0:y1, x0:x1]
    h, w = alpha.shape; W, H = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    rgb = np.array(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32)
    al = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    return rgb, al


def classify(rgb, al, rect=None):
    """the kit (blue or yellow), the skin and the shirt back, from the painted colours"""
    hue, sat, mx = hsv(rgb); lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    H, W = al.shape; op = al > 0.5
    blue = op & (hue > 200) & (hue < 255) & (sat > 0.4)
    yellow = op & (hue > 44) & (hue < 64) & (sat > 0.86) & (mx > 160)   # (the bat is a paler, more orange gold)
    kit = blue | yellow
    skin = op & (hue > 8) & (hue < 32) & (sat > 0.22) & (sat < 0.72) & (mx > 120) & ~kit
    skin = ndi.binary_closing(skin, iterations=2) & op & ~kit
    ye = np.clip((rgb[..., 0] + rgb[..., 1]) / 2 - rgb[..., 2], 0, None) / 255; bl = np.clip(rgb[..., 2] - (rgb[..., 0] + rgb[..., 1]) / 2, 0, None) / 255
    wy = ndi.gaussian_filter(np.where(kit, ye / (ye + bl + 1e-3), 0), 0.6) * kit
    # the belt: the widest flat yellow band; the collar: the highest yellow patch of some size; the shirt back lies between them
    lab, n = ndi.label(ndi.binary_closing(yellow, iterations=2))
    comps = []
    for i, bx in enumerate(ndi.find_objects(lab), 1):
        bh, bw = bx[0].stop - bx[0].start, bx[1].stop - bx[1].start
        comps.append(dict(bx=bx, bh=bh, bw=bw, area=int((lab[bx] == i).sum()), cy=(bx[0].start + bx[0].stop) / 2))
    belts = [c for c in comps if c['bw'] >= 0.15 * H and c['bh'] <= 0.7 * c['bw'] and 0.2 * H < c['cy'] < 0.78 * H]
    belt = max(belts, key=lambda c: c['area']) if belts else None
    cols = [c for c in comps if c['bw'] >= 0.05 * H and c['bh'] >= 0.022 * H and c['cy'] < 0.5 * H and c is not belt and (belt is None or c['cy'] < belt['cy'] - 0.08 * H)]
    collar = max(cols, key=lambda c: c['area']) if cols else None
    shirt = np.zeros_like(op); info = None
    top = c0 = None
    x_lo, x_hi = 0, W
    if rect:
        x_lo, x_hi = int(rect[0] * W), int(rect[1] * W); c0, top = int(rect[2] * H), int(rect[3] * H)
    if rect: pass
    elif collar:
        c0 = collar['bx'][0].stop + int(0.015 * H)
        top = belt['bx'][0].start if belt and belt['bx'][0].start > c0 + 0.1 * H else c0 + int(0.30 * H)
    elif belt:
        top = belt['bx'][0].start; c0 = max(0, top - int(0.3 * H))
    if top is not None:
        zone = np.zeros_like(op); zone[c0:top, x_lo:x_hi] = True
        shirt = kit & zone & ~skin
        ys, xs = np.nonzero(shirt)
        if len(xs) > 200:
            p25, p75 = np.percentile(xs, [25, 75]); band = shirt & (np.arange(W)[None, :] >= p25) & (np.arange(W)[None, :] <= p75)
            by, bx2 = np.nonzero(band); rows = {}
            for y, x in zip(by, bx2): rows.setdefault(y, []).append(x)
            ry = np.array(sorted(rows)); rx = np.array([np.mean(rows[y]) for y in ry])
            b1 = np.polyfit(ry, rx, 1)[0] if len(ry) > 3 else 0
            info = dict(cx=float((p25 + p75) / 2), cy=float(c0 + 0.5 * (top - c0)), w=float(p75 - p25), ang=float(-np.degrees(np.arctan(b1))))
    return dict(zone=(c0, top), collar=collar and collar['bx'], belt=belt and belt['bx'], kit=kit, blue=blue, yellow=yellow, skin=skin, shirt=shirt, wy=wy, lum=lum, hue=hue, sat=sat, mx=mx, info=info)


def hsv_to_rgb(h, s, v):
    h = (h % 360) / 60; c = v * s; x = c * (1 - np.abs(h % 2 - 1)); m = v - c; i = np.floor(h).astype(int) % 6
    r = np.choose(i, [c, x, 0 * c, 0 * c, x, c]); g = np.choose(i, [x, c, c, x, 0 * c, 0 * c]); b = np.choose(i, [0 * c, 0 * c, x, c, c, x])
    return np.stack([r + m, g + m, b + m], -1) * 255


def circ_mean(h):
    a = np.deg2rad(h); return float(np.rad2deg(np.arctan2(np.sin(a).mean(), np.cos(a).mean())) % 360)


def stats(rgb, c):
    out = {}
    for k in ('blue', 'yellow'):
        m = c[k]
        if m.sum() > 200: out[k] = (circ_mean(c['hue'][m]), float(np.median(c['sat'][m])), float(np.median(c['mx'][m])) / 255)
    return out


def level(rgb, al, c, ref):
    # the painted blue and yellow of this pose brought to the colour depth of the whole set (the sheets were painted one after another and drift a little)
    st = stats(rgb, c); out = rgb.copy()
    for k in ('blue', 'yellow'):
        if k not in st: continue
        h0, s0, v0 = st[k]; hr, sr, vr = ref[k]; m = c[k]
        hue, sat, mx = c['hue'][m], c['sat'][m], c['mx'][m] / 255
        out[m] = hsv_to_rgb(hue + (hr - h0), np.clip(sat * sr / max(s0, 0.05), 0, 1), np.clip(mx * vr / max(v0, 0.05), 0, 1))
    return out


def main():
    pieces = {}   # (src, k) -> (rgb, alpha)
    for src in sorted({s for s, _ in FRAMES.values()}):
        figs = figures(src)
        for k, (a, al) in enumerate(figs): pieces[(src, k)] = cutout(a, al, SCALE.get(src, DEFAULT_SCALE))
    a, al = key(Image.open(READY))
    pieces[('ready', 0)] = cutout(a, al, READY_SCALE)
    frames = dict(FRAMES, ready=('ready', 0))
    uniq = sorted(set(frames.values()), key=lambda p: -pieces[p][0].shape[0])
    # shelf packing, 2048 wide
    SW, x, y, rowh, pos = 2048, PAD, PAD, 0, {}
    for p in uniq:
        h, w = pieces[p][1].shape
        if x + w + PAD > SW: x, y, rowh = PAD, y + rowh + PAD, 0
        pos[p] = (x, y); x += w + PAD; rowh = max(rowh, h)
    SH = y + rowh + PAD
    art = np.zeros((SH, SW, 4), np.uint8); mask = np.zeros((SH, SW, 3), np.uint8); tone = np.zeros((SH, SW, 3), np.uint8)
    meta_frames, place, names, lums = {}, {}, {}, {'blue': [], 'yellow': [], 'skin': []}
    hsv_s = {'blue': [], 'yellow': []}
    info = {}
    # first the colour depth of every pose, then each pose brought to the median of them all
    pre = {}
    for p in uniq: pre[p] = stats(pieces[p][0], classify(*pieces[p]))
    ref = {k: (circ_mean(np.array([v[k][0] for v in pre.values() if k in v])), float(np.median([v[k][1] for v in pre.values() if k in v])), float(np.median([v[k][2] for v in pre.values() if k in v]))) for k in ('blue', 'yellow')}
    spread = lambda k, i: round(float(np.std([v[k][i] for v in pre.values() if k in v])), 3)
    print('colour spread before (blue hue, sat, value):', spread('blue', 0), spread('blue', 1), spread('blue', 2))
    for p in uniq:
        rgb0, al0 = pieces[p]; pieces[p] = (level(rgb0, al0, classify(rgb0, al0), ref), al0)
    post = {p: stats(pieces[p][0], classify(*pieces[p])) for p in uniq}
    print('colour spread after:', round(float(np.std([v['blue'][0] for v in post.values()])), 3), round(float(np.std([v['blue'][1] for v in post.values()])), 3), round(float(np.std([v['blue'][2] for v in post.values()])), 3))
    for p in uniq:
        rgb, al = pieces[p]; h, w = al.shape; px, py = pos[p]
        c = classify(rgb, al, next((SHIRT_AT[n] for n, q in frames.items() if q == p and n in SHIRT_AT), None)); info[p] = c['info']
        art[py:py + h, px:px + w] = np.dstack([np.clip(rgb, 0, 255), al * 255]).astype(np.uint8)
        mask[py:py + h, px:px + w, 0] = c['skin'] * 255; mask[py:py + h, px:px + w, 1] = c['shirt'] * 255; mask[py:py + h, px:px + w, 2] = c['kit'] * 255
        tone[py:py + h, px:px + w, 1] = np.clip(c['wy'] * 255, 0, 255); tone[py:py + h, px:px + w, 2] = np.where(c['kit'], np.clip(c['lum'], 1, 255), 0)
        for k_ in ('blue', 'yellow', 'skin'): lums[k_].append(c['lum'][c[k_]])
        for k_ in ('blue', 'yellow'):
            hh = c['hue'][c[k_]]; ang = np.deg2rad(hh)
            hsv_s[k_].append((np.rad2deg(np.arctan2(np.sin(ang).mean(), np.cos(ang).mean())) % 360, np.median(c['sat'][c[k_]]), np.median(c['mx'][c[k_]]) / 255, len(hh)))
        # the feet: the lowest pixel, half-way along the boots (the lowest 5 % of the figure)
        ys_, xs_ = np.nonzero(al > 0.5); low = ys_ >= ys_.max() - 0.05 * h
        meta_frames[p] = [px, py, w, h, round(float(xs_[low].mean()), 1), round(float(ys_.max()) - 0.01 * h, 1)]   # (the feet, in the frame)
    order = list(frames)
    out_frames, out_place = [], []
    for n in order:
        p = frames[n]; out_frames.append(meta_frames[p]); i = info[p]; px, py = pos[p]
        out_place.append([round(px + i['cx'], 1), round(py + i['cy'], 1), round(0.72 * i['w'], 1), 1, 1, round(i['ang'], 1), 0, 0, 0, 0] if i else [0, 0, 0, 1, 1, 0, 0, 0, 0, 0])
    wmean = lambda L: tuple(round(float(np.average([t[i] for t in L], weights=[t[3] for t in L])), 4) for i in range(3))
    med = lambda L: round(float(np.median(np.concatenate(L))) / 255, 4)
    meta = {'frames': out_frames, 'place': out_place, 'names': {n: i for i, n in enumerate(order)}, 'refPx': round(829.9 * G, 1),
            'suit': [0.0269, 0.3529, 0.5925], 'trim': [0.5451, 0.8592, 0.9209], 'skin': med(lums['skin']),
            'tones': [med(lums['blue']), med(lums['blue']) * 0.5, med(lums['yellow'])], 'hair': {}, 'size': [SW, SH],
            'hsv': [list(wmean(hsv_s['blue'])), list(wmean(hsv_s['blue'])), list(wmean(hsv_s['yellow']))]}
    Image.fromarray(art, 'RGBA').save('img/kit/bat-paint.webp', 'WEBP', quality=90, method=6)
    Image.fromarray(mask, 'RGB').save('img/kit/bat-paint-mask.png', optimize=True)
    Image.fromarray(tone, 'RGB').save('img/kit/bat-paint-tone.png', optimize=True)
    src = open('js/kitsheets.js').read()
    head, body = src.split('export const KIT_SHEETS = ')
    K = json.loads(body.rsplit(';', 1)[0]); K.pop('bat-ready', None); K['bat-paint'] = meta
    open('js/kitsheets.js', 'w').write(head + 'export const KIT_SHEETS = ' + json.dumps(K, separators=(',', ':')) + ';\n')
    print('atlas', (SW, SH), 'frames', len(order), 'unique poses', len(uniq), 'hsv', meta['hsv'], 'tones', meta['tones'])
    for n in order: i = info[frames[n]]; print(' ', n.ljust(10), 'print' if i else 'NO PRINT', {k: round(v, 1) for k, v in i.items()} if i else '')


if __name__ == '__main__':
    main()
