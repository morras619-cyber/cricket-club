#!/usr/bin/env python3
"""The off-spinner from behind in the plain kit: img/kit/spin-back.webp (+ -mask.png) and its entry in
js/kitsheets.js, built from tools/kit/src/spinner-back.png (10 poses on magenta, two rows of five: three run-up
strides, the gather, the coil with the arm up, the release, the arm swinging through, two bends of the follow-through
and a recovery stride).

The sheet has no standing pose, so two are taken from the pace bowler's own sheet (img/kit/back.webp: his stance and
his last, standing, pose), scaled to the spinner's size and put in a third row: they are the spinner's start, finish,
fielding and reacting poses. The poses are then cut and repainted like the pace bowler's (tools/build_kit_sheets.py: the
same masks, R skin, G shirt, B kit 255 suit / 128 trim), with no hair and no name and number print yet. The white ball the
generator drew in the hand is taken out first: the game draws its own.

usage (from the repo root): python3 tools/build_spin_back.py
"""
import json
import os
import sys
import tempfile
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from build_kit_sheets import build, write_sheets  # noqa: E402

SRC = 'tools/kit/src/spinner-back.png'
PACE = [0, 9]          # the pace sheet's stance and his last pose (both standing)
STAND_H = 455          # the standing pose's height in the spinner's sheet
EXTRA_Y = 1040         # the third row
ROWH = 520             # (build_kit_sheets orders the poses by this row height)
ARM_UP = (4, 5)        # the poses (0-based) with the ball in the hand


def without_ball(a, boxes):
    """the drawn white ball removed from the raised hand: its place gets the colours around it"""
    r, g, b = [a[..., k].astype(int) for k in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    white = (mn > 195) & (mx - mn < 40)
    out, removed = a.copy(), 0
    for k in ARM_UP:
        y0, y1, x0, x1 = boxes[k]
        top = np.zeros(white.shape, bool)
        top[y0:y0 + 42, x0:x1] = True       # (the hand is the highest thing on him: the head is lower, the boots far below)
        ball = ndi.binary_dilation(white & top, iterations=2) & top
        ball = ndi.binary_dilation(ball, iterations=2)
        _, (iy, ix) = ndi.distance_transform_edt(ball, return_indices=True)
        out[ball] = a[iy[ball], ix[ball]]
        removed += int(ball.sum())
    return out, removed


def pose_boxes(a):
    """the 10 poses of the generated sheet as (y0, y1, x0, x1)"""
    fg = ~((a[..., 0] > 180) & (a[..., 1] < 90) & (a[..., 2] > 150))
    lab, n = ndi.label(ndi.binary_opening(fg, iterations=2))
    big = [(o, i) for i, o in enumerate(ndi.find_objects(lab)) if (lab[o] == i + 1).sum() > 15000]
    boxes = [(o[0].start, o[0].stop, o[1].start, o[1].stop) for o, _ in big]
    boxes.sort(key=lambda b: ((b[0] + b[1]) // 2 // (a.shape[0] // 2), b[2]))   # (a raised arm may start above the row: sort by the middle)
    assert len(boxes) == 10, len(boxes)
    return boxes


def pace_pose(i, meta):
    """one pose of the pace bowler's sheet on magenta, scaled to the spinner's standing height"""
    x, y, w, h = meta['frames'][i][:4]
    im = Image.open('img/kit/back.webp').convert('RGBA').crop((x, y, x + w, y + h))
    bb = im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
    im = im.crop(bb)
    s = STAND_H / im.height
    im = im.resize((round(im.width * s), STAND_H), Image.LANCZOS)
    bg = Image.new('RGB', im.size, (255, 0, 255))
    bg.paste(im, (0, 0), im)
    return bg


def main():
    src = open('js/kitsheets.js').read()
    sheets = json.loads(src[src.index('= ') + 2:src.rindex(';')])
    a = np.array(Image.open(SRC).convert('RGB'))
    clean, n = without_ball(a, pose_boxes(a))
    print('ball pixels removed:', n)
    canvas = Image.new('RGB', (a.shape[1], EXTRA_Y + STAND_H + 80), (255, 0, 255))
    canvas.paste(Image.fromarray(clean), (0, 0))
    x = 60
    for i in PACE:
        p = pace_pose(i, sheets['back'])
        canvas.paste(p, (x, EXTRA_Y + 20))
        x += p.width + 120
    tmp = os.path.join(tempfile.mkdtemp(), 'spin-back.png')
    canvas.save(tmp)
    meta = build('spin-back', tmp, {}, [[0, 0, 0, 1, 1, 0, 0, 0, 0, 0]] * 12, 12, ROWH)
    meta['place'] = []  # no name and number on the back for now
    meta['refPx'] = meta['frames'][10][3] - 12  # (the standing pose: the box less its 6 px padding each side)
    sheets['spin-back'] = meta
    write_sheets(sheets)


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main()
