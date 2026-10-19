#!/usr/bin/env python3
"""Composes the fielder source sheet (tools/kit/src/fielder.png) from the drawn sheets in
tools/kit/src/field-sheets/ (poses on magenta, in reading order), at the bowler's resolution (304 px
per metre), and writes where each back view's name and number go (tools/kit/field-print.json).

The sheets are drawn at slightly different sizes: each is scaled by its players' cap (a cap is the
same size on everyone), measured by eye against the running-away sheet. The drawn balls in flight
are dropped (the game draws its own); a ball already in his hands stays.
usage: python3 tools/kit/compose_fielder.py   (then tools/build_kit_sheets.py --field)
"""
import json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from compose_batter import poses, drop_balls, print_spot, MAG  # noqa: E402

D = os.path.join(os.path.dirname(__file__), 'src', 'field-sheets')
SHEETS = {1: '1-ready.png', 2: '2-run-away.png', 3: '3-run-side.png', 4: '4-run-turn.png', 5: '5-dive.png', 6: '6-catch.png'}
# per sheet: its cap against the running-away sheet's, then all to 304 px per metre (a 1.85 m
# player stands ~640 px on the running-away sheet)
G = 562 / 640
SCALE = {1: 0.82 * G, 2: 1.0 * G, 3: 1.11 * G, 4: 0.92 * G, 5: 0.87 * G, 6: 0.95 * G}
# the game's fielder frames (js/kitsprite.js POSE_FIELD): (name, sheet, pose, back view: name and number)
PICK = [
    ('ready_front', 1, 1, False), ('ready_side', 1, 2, False), ('ready_back', 1, 3, True),
    ('away1', 2, 1, True), ('away2', 2, 2, True), ('away3', 2, 3, True), ('away4', 2, 4, True),
    ('side1', 3, 1, False), ('side2', 3, 2, False), ('side3', 3, 3, False), ('reach', 3, 4, False),
    ('toward', 4, 1, False), ('turn', 4, 2, False), ('away3q', 4, 3, True), ('awayB', 4, 4, True),
    ('dive1', 5, 1, False), ('dive2', 5, 2, False), ('dive3', 5, 3, False), ('dive4', 5, 4, False),
    # a catch straight to him: hands up ready, taken above the head, held at the chest
    ('catch1', 6, 1, False), ('catch2', 6, 2, False), ('catch3', 6, 3, False),
]


def main():
    cache = {s: poses(os.path.join(D, f)) for s, f in SHEETS.items()}
    cuts = []
    for name, s, k, back in PICK:
        rgb, ps = cache[s]
        m = drop_balls(rgb, ps[k - 1][0])
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        tile = np.where(m[y0:y1, x0:x1, None], rgb[y0:y1, x0:x1], MAG).astype(np.uint8)
        al = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8))
        w, h = max(1, round((x1 - x0) * SCALE[s])), max(1, round((y1 - y0) * SCALE[s]))
        cuts.append((name, back, Image.fromarray(tile).resize((w, h), Image.LANCZOS), al.resize((w, h), Image.LANCZOS)))
    GAP, ROWH, PER = 40, 640, 5
    W = max(sum(c[2].width for c in cuts[i:i + PER]) + GAP * (PER + 1) for i in range(0, len(cuts), PER))
    H = ROWH * ((len(cuts) + PER - 1) // PER) + GAP
    sheet = Image.new('RGB', (W, H), tuple(MAG))
    prints, hips = {}, []
    for i, (name, back, tile, al) in enumerate(cuts):
        row, col = divmod(i, PER)
        x = GAP + sum(c[2].width + GAP for c in cuts[row * PER:i])
        y = GAP + row * ROWH
        mask = al.point(lambda v: 255 if v > 127 else 0)
        sheet.paste(tile, (x, y), mask)
        if back:
            prints[str(i + 1)] = print_spot(np.asarray(tile).astype(int), np.asarray(mask) > 127, x, y)
        else:
            prints[str(i + 1)] = [x, y, 0, 1, 1, 0, 0, 0, 0, 0]  # (no print on a front or side view)
        hips.append(round(x + hip_x(np.asarray(tile).astype(int), np.asarray(mask) > 127), 1))
    sheet.save(os.path.join(os.path.dirname(__file__), 'src', 'fielder.png'))
    json.dump({'_note': 'Where the name and number sit on each fielder pose (tools/kit/compose_fielder.py): [x, y, width, 1, 1, tilt, 0, 0, 0, 0] in fielder.png pixels; width 0 = none (front and side views).',
               'rowh': ROWH, 'frames': [p[0] for p in PICK], 'hips': hips, **prints},
              open(os.path.join(os.path.dirname(__file__), 'field-print.json'), 'w'), indent=1)
    print('sheet', sheet.size, 'poses', len(cuts))


def hip_x(rgb, m):
    """where his body is across the frame: the middle of his waistband (the widest yellow band in his
    top 60%), so a stride swaps feet under a still body instead of the body jumping to the new foot"""
    hsv = np.asarray(Image.fromarray(rgb.astype(np.uint8)).convert('HSV')).astype(float)
    H, S, V = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    yellow = m & (H > 40) & (H < 70) & (S > 0.5) & (V > 0.5)
    ys = np.nonzero(m.any(1))[0]
    rows = yellow.sum(1)
    top = ys.min()
    belt = top + int(np.argmax(rows[top: top + int((ys.max() - top) * 0.6)]))
    band = yellow[max(0, belt - 5): belt + 6]
    if band.sum() < 10:
        return float(np.nonzero(m)[1].mean())
    return float(np.nonzero(band)[1].mean())


if __name__ == '__main__':
    main()
