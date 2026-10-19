#!/usr/bin/env python3
"""Composes the batter-from-behind source sheet (tools/kit/src/batter-back.png) from the drawn shot
sheets in tools/kit/src/bat-sheets/ (one shot per sheet, poses on magenta), picking one pose per
frame the game plays, and writes where each pose's name and number go (tools/kit/bat-back-print.json).

Every sheet opens with the same standing pose, so each is scaled by its own standing pose's height:
all the poses come out at one size whichever sheet they're from. The drawn balls are dropped.
usage: python3 tools/kit/compose_batter.py   (then tools/build_kit_sheets.py rebuilds img/kit/bat-back*)
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

D = os.path.join(os.path.dirname(__file__), 'src', 'bat-sheets')
SHEETS = {1: '1-cover-drive.png', 2: '2-reverse-sweep.png', 3: '3-defence-leave.png', 4: '4-stance.png', 5: '5-cut.png', 6: '6-pull.png', 7: '7-stance-leave.png', 8: '8-forward-drive.png', 9: '9-cover-drive.png', 10: '10-straight-drive.png'}
# the game's frames in sheet order (js/kitsprite.js POSE_BAT): (sheet, pose number in reading order)
# or (sheet, (x, y)): the pose drawn at that point of the sheet (two poses drawn touching are split)
PICK = [
    ('ready', 7, 1), ('leave1', 7, 2), ('leave2', 7, 3), ('backlift', 7, 4),
    # the forward drive (its own sheet): stance, stride and backlift, through the line, high finish
    ('drive1', 8, 1), ('drive2', 8, 2), ('drive3', 8, 3), ('drive4', 8, 4),
    # the pull: bat cocked, swung across to leg, contact, through, wrapped round the shoulder
    ('pull0', 6, (920, 300)), ('pull1', 6, (330, 830)), ('pull2', 6, (620, 830)), ('pull3', 6, (880, 830)), ('pull4', 6, (120, 1300)), ('pull5', 6, (520, 1300)),
    ('def1', 3, 7), ('def2', 3, 9), ('def3', 3, 10),
    # the cut: rocking back, the bat across, contact square on the off side, through, finish
    ('cut1', 5, (110, 800)), ('cut2', 5, (320, 800)), ('cut3', 5, (550, 800)), ('cut4', 5, (850, 850)), ('cut5', 5, (330, 1300)), ('cut6', 5, (720, 1300)),
    ('bowled', 1, 8), ('celebrate', 3, 15),
    ('rsweep1', 2, 4), ('rsweep2', 2, 7), ('rsweep3', 2, 11),
    # the cover drive (its own sheet: poses 5, 6, 2, 3): bat on the ball, through, up into the finish
    # the straight drive (its own sheet: pose 2 then pose 1): bat through the line, high finish
    ('straight1', 10, 2), ('straight2', 10, 1),
    ('cover1', 9, (150, 1150)), ('cover2', 9, (380, 1150)), ('cover3', 9, (360, 450)), ('cover4', 9, (600, 480)),
]
STAND_PX = 330          # the standing pose (each sheet's first) comes out this tall
# a sheet with no standing pose: scaled so its pose matches one already sized (sheet, pose, its pose)
MATCH = {7: (4, 4, 1), 8: (7, 1, 1), 9: (8, 3, (150, 1150)), 10: (8, 3, 2)}  # 9: its contact pose sized as the forward drive's
MAG = np.array([250, 0, 250], np.uint8)


def poses(path):
    """the poses on a sheet in reading order: [(mask, box)], small blobs (the balls) left out"""
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    fg = ~((np.minimum(r, b) - g) > 110)                 # not magenta
    fg = ndi.binary_opening(fg, iterations=1)
    lab, n = ndi.label(ndi.binary_closing(fg, iterations=3))
    sizes = ndi.sum(fg, lab, range(1, n + 1)); boxes = ndi.find_objects(lab)
    items = sorted(((boxes[i][0].start + boxes[i][0].stop) / 2, boxes[i][1].start, i) for i in range(n) if sizes[i] > 4000)
    rows = []
    for it in items:
        if rows and abs(rows[-1][0][0] - it[0]) < 120: rows[-1].append(it)
        else: rows.append([it])
    out = []
    for row in rows:
        for _, _, i in sorted(row, key=lambda t: t[1]):
            # the pose's own pixels, plus a pixel of its soft edge
            out.append(((lab == i + 1) & ndi.binary_dilation(fg, iterations=1), boxes[i]))
    return im.astype(np.uint8), out


def at_point(path, x, y):
    """the pose drawn at (x, y); two poses drawn touching are split, each pixel to the nearer body"""
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    fg = ndi.binary_opening(~((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 110), iterations=1)
    lab, _ = ndi.label(fg)
    ys, xs = np.nonzero(lab)
    i = np.argmin((ys - y) ** 2 + (xs - x) ** 2)
    m = lab == lab[ys[i], xs[i]]
    for it in (9, 13, 17, 21, 25):
        core = ndi.binary_erosion(m, iterations=it)
        cl, cn = ndi.label(core)
        if cn > 1 and sorted(ndi.sum(core, cl, range(1, cn + 1)))[-2] > 1500:
            break
    if cn > 1:
        sizes = ndi.sum(core, cl, range(1, cn + 1))
        big = [k + 1 for k in np.argsort(sizes)[::-1][:2] if sizes[k] > 1500]
        if len(big) == 2:
            dist = [ndi.distance_transform_edt(cl != k) for k in big]
            mine = 0 if dist[0][y, x] < dist[1][y, x] else 1
            m = m & (dist[mine] <= dist[1 - mine])
    return m


def drop_balls(rgb, m):
    """a drawn ball touching the pose: a small, round, near-white blob joined to it by a sliver"""
    white = m & (rgb.min(-1) > 225)
    lab, n = ndi.label(white)
    for k in range(1, n + 1):
        b = lab == k
        a = b.sum()
        if 60 < a < 900:
            ys, xs = np.nonzero(b)
            h, w = np.ptp(ys) + 1, np.ptp(xs) + 1
            if 0.7 < h / w < 1.4 and a > 0.6 * h * w:   # round and filled: a ball, not a glove or pad
                m = m & ~ndi.binary_dilation(b, iterations=4)
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = lab == 1 + int(np.argmax(sizes))
    return m


def main():
    cache, scale = {}, {}
    for s, f in SHEETS.items():
        rgb, ps = poses(os.path.join(D, f))
        cache[s] = (rgb, ps)
        if s not in MATCH:
            box = ps[0][1]
            scale[s] = STAND_PX / (box[0].stop - box[0].start)
    def hgt(s, k):
        if isinstance(k, tuple):
            ys = np.nonzero(at_point(os.path.join(D, SHEETS[s]), *k).any(1))[0]
            return ys.max() + 1 - ys.min()
        return cache[s][1][k - 1][1][0].stop - cache[s][1][k - 1][1][0].start
    for s, (rs, rk, k) in sorted(MATCH.items()):
        scale[s] = scale[rs] * hgt(rs, rk) / hgt(s, k)
    cuts = []
    for name, s, k in PICK:
        rgb, ps = cache[s]
        m = at_point(os.path.join(D, SHEETS[s]), *k) if isinstance(k, tuple) else ps[k - 1][0]
        m = drop_balls(rgb, m)
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        tile = np.where(m[y0:y1, x0:x1, None], rgb[y0:y1, x0:x1], MAG).astype(np.uint8)
        alpha = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8))
        sc = scale[s]
        w, h = max(1, round((x1 - x0) * sc)), max(1, round((y1 - y0) * sc))
        cuts.append((name, Image.fromarray(tile).resize((w, h), Image.LANCZOS), alpha.resize((w, h), Image.LANCZOS)))
    # rows of six, tops level (the kit tool sorts poses into rows by their tops), on magenta
    GAP, ROWH, PER = 40, 520, 6
    W = max(sum(c[1].width for c in cuts[i:i + PER]) + GAP * (PER + 1) for i in range(0, len(cuts), PER))
    H = ROWH * ((len(cuts) + PER - 1) // PER) + GAP
    sheet = Image.new('RGB', (W, H), tuple(MAG))
    prints = {}
    for i, (name, tile, al) in enumerate(cuts):
        row, col = divmod(i, PER)
        x = GAP + sum(c[1].width + GAP for c in cuts[row * PER:i])
        y = GAP + row * ROWH
        sheet.paste(tile, (x, y), al.point(lambda v: 255 if v > 127 else 0))
        prints[str(i + 1)] = print_spot(np.asarray(tile).astype(int), np.asarray(al) > 127, x, y)
    sheet.save(os.path.join(os.path.dirname(__file__), 'src', 'batter-back.png'))
    json.dump({'_note': 'Where the name and number sit on each batter pose (tools/kit/compose_batter.py): [x, y, width, 1, 1, tilt, 0, 0, 0, 0] in batter-back.png pixels, found from the yellow waistband and the shirt between it and the collar.',
               'rowh': ROWH, 'frames': [p[0] for p in PICK], **prints},
              open(os.path.join(os.path.dirname(__file__), 'bat-back-print.json'), 'w'), indent=1)
    print('sheet', sheet.size, 'poses', len(cuts))


def print_spot(rgb, m, ox, oy):
    """the name and number on the back: centred on the shirt a third of the way up from the
    waistband to the top of the helmet, about half the shirt's width there"""
    im = Image.fromarray(rgb.astype(np.uint8)).convert('HSV')
    hsv = np.asarray(im).astype(float)
    H, S, V = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    yellow = m & (H > 40) & (H < 70) & (S > 0.5) & (V > 0.5)
    blue = m & (H > 195) & (H < 255) & (S > 0.3)
    ys = np.nonzero(m.any(1))[0]
    top = np.nonzero(blue.any(1))[0].min()   # the helmet's top (a bat held up goes higher)
    rows = yellow.sum(1)
    upper = rows[: top + int((ys.max() - top) * 0.6)]
    belt = int(np.argmax(upper))          # the widest band of yellow in the top 60%: the waistband
    y = int(top + (belt - top) * 0.62)
    band = blue[max(0, y - 6): y + 6]
    xs = np.nonzero(band.any(0))[0]
    if len(xs) < 4:
        xs = np.nonzero(m[y])[0]
    cx = float(np.median(np.nonzero(band)[1])) if band.any() else float(xs.mean())
    # half the shirt's width there, kept to a back's size (an arm across the shirt widens the row)
    w = float(np.clip((xs.max() - xs.min()) * 0.5, 40, 50))
    return [round(cx + ox, 1), round(y + oy, 1), round(float(w), 1), 1, 1, 0, 0, 0, 0, 0]


if __name__ == '__main__':
    main()
