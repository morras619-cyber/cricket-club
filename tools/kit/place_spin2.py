#!/usr/bin/env python3
"""Where the club crest (front) and the name and number (back) go on the new spinner's 15 poses
(tools/kit/src/spin2-front.png, spin2-back.png), in the sheet's own pixels, from the head table
(spin2-heads.json) and the drawn kit: the collar sits under the head, the belt is the widest
yellow band below it, the print is 42% of the way down the shirt (tools/kit/SHIRT_PRINT.md), the
crest on his left chest (the viewer's right), a little below the collar points.
usage: python3 tools/kit/place_spin2.py [--debug]   (writes crest-spin2-front.json, shirt-print-spin2-back.json,
       and with --debug out PNGs in tools/kit/headfit/out/ to check them by eye)"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(__file__)
HEADS = json.load(open(os.path.join(HERE, 'spin2-heads.json')))
PRINT_W, CREST = 57.0, 23.0
# the bent-over and turned poses, where the belt line can't be read: placed by eye on the sheet, at 2x zoom
CREST_BY_EYE = {9: (180, 566), 10: (440, 568), 11: (700, 568), 12: (978, 558)}
PRINT_BY_EYE = {9: (135, 556, 46, 15), 10: (395, 548, 50, -6), 11: (700, 545, 52, 0), 12: (975, 530, 50, 0)}   # px on this sheet's 365 px figure (the bowler's: 88 px and 36 px on 563 / 580)


def pose_masks(path):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    mag = (a[..., 0] > 180) & (a[..., 1] < 90) & (a[..., 2] > 150)
    lab, n = ndi.label(ndi.binary_opening(~mag, iterations=2))
    H = a.shape[0]
    objs = [(o, i + 1) for i, o in enumerate(ndi.find_objects(lab)) if (o[0].stop - o[0].start) > 120]
    objs.sort(key=lambda t: (0 if (t[0][0].start + t[0][0].stop) / 2 < H * 0.5 else 1, t[0][1].start))
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    suit = (b > 110) & (r < 120) & (b - r > 60)                               # main blue and navy
    trim = (r > 200) & (g > 190) & (b < 120)                                  # yellow
    return lab, objs, suit, trim


def place(view):
    path = os.path.join(HERE, 'src', f'spin2-{view}.png')
    lab, objs, suit, trim = pose_masks(path)
    hs = HEADS[view]['hair']
    out = []
    for k, ((sl, i), h) in enumerate(zip(objs, hs)):
        m = lab == i
        x, y, sk, ang = h
        dx, dy = -math.sin(ang), math.cos(ang)
        collar = y + 1.15 * sk
        # the belt: the row with most yellow in the body between 2.4 and 4.2 skulls below the head
        rows = np.arange(m.shape[0])
        cnt = np.array([(trim[r] & m[r]).sum() for r in range(m.shape[0])], float)
        lo, hi = int(y + 2.4 * sk), int(y + 4.2 * sk)
        cnt_s = ndi.uniform_filter1d(cnt, 5)
        belt = lo + int(np.argmax(cnt_s[lo:hi]))
        shirt = suit & m
        # the spine: midpoints of the shirt's rows between the collar and the belt
        ys = np.arange(int(collar), int(belt))
        mids, widths, yy = [], [], []
        for r in ys:
            xs = np.nonzero(shirt[r])[0]
            if len(xs) > 8:
                mids.append((xs.min() + xs.max()) / 2); widths.append(xs.max() - xs.min()); yy.append(r)
        if len(yy) < 5:
            mids, widths, yy = [x] * 5, [PRINT_W / 0.6] * 5, [collar + 1, collar + 2, collar + 3, collar + 4, collar + 5]
        slope = np.polyfit(yy, mids, 1)[0] if len(yy) > 5 else 0.0
        py = collar + 0.42 * (belt - collar)
        px = float(np.polyval(np.polyfit(yy, mids, 1), py)) if len(yy) > 5 else x
        w = min(PRINT_W, float(np.median(widths)) * 0.62)
        out.append(dict(px=round(px, 1), py=round(py, 1), w=round(w, 1), tilt=round(math.degrees(math.atan(-slope)), 1) if view == 'back' else 0,
                        belt=int(belt), collar=round(collar, 1), width=float(np.median(widths))))
    return out


def main():
    debug = '--debug' in sys.argv
    front = place('front'); back = place('back')
    crest = {}
    for k, f in enumerate(front, 1):
        # his left chest (the viewer's right): a quarter of the shirt's width across from its middle, a little below the collar points
        cx = f['px'] + 0.27 * f['width']
        cy = f['collar'] + 0.30 * (f['belt'] - f['collar'])
        if k in CREST_BY_EYE: cx, cy = CREST_BY_EYE[k]
        crest[str(k)] = [round(cx, 1), round(cy, 1), CREST, 1, 1, 0]
    prints = {}
    for k, b in enumerate(back, 1):
        pr = [b['px'], b['py'], b['w'], 1, 1, b['tilt']]
        if k in PRINT_BY_EYE: pr = [PRINT_BY_EYE[k][0], PRINT_BY_EYE[k][1], PRINT_BY_EYE[k][2], 1, 1, PRINT_BY_EYE[k][3]]
        prints[str(k)] = {'print': pr, 'name': [0, 0], 'number': [0, 0]}
    json.dump({'frames': crest}, open(os.path.join(HERE, 'crest-spin2-front.json'), 'w'), separators=(',', ':'))
    json.dump({'frames': prints}, open(os.path.join(HERE, 'shirt-print-spin2-back.json'), 'w'), separators=(',', ':'))
    if debug:
        os.makedirs(os.path.join(HERE, 'headfit', 'out'), exist_ok=True)
        for view, rows in (('front', front), ('back', back)):
            im = Image.open(os.path.join(HERE, 'src', f'spin2-{view}.png')).convert('RGB'); d = ImageDraw.Draw(im)
            for k, r in enumerate(rows, 1):
                d.line([r['px'] - 60, r['belt'], r['px'] + 60, r['belt']], fill=(255, 255, 255), width=1)
                if view == 'front':
                    cx, cy, s = crest[str(k)][:3]; d.ellipse([cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2], outline=(255, 0, 0), width=3)
                else:
                    p = prints[str(k)]['print']; t = math.radians(p[5]); w = p[2]; h = w * 0.67
                    c, s_ = math.cos(t), math.sin(t)
                    pts = [(p[0] + c * dx - s_ * dy, p[1] + s_ * dx + c * dy) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
                    d.polygon(pts, outline=(255, 0, 0)); d.text((p[0] - 4, p[1] - 5), str(k), fill=(255, 255, 255))
            im.save(os.path.join(HERE, 'headfit', 'out', f'place-{view}.png'))
    print('placements written')


if __name__ == '__main__':
    main()
