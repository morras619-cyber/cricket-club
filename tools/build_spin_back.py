#!/usr/bin/env python3
"""The off-spinner from behind in the plain kit: img/kit/spin-back.webp (+ -mask.png) and its entry in
js/kitsheets.js, built from tools/kit/src/spinner-back.png (14 poses on magenta, two rows of seven:
five run-up poses, the gather, two deliveries, the release, three follow-throughs, three standing).

The poses are cut and repainted like the pace bowler's (tools/build_kit_sheets.py: the same masks,
R skin, G shirt, B kit 255 suit / 128 trim), but with no hair and no name and number print yet. The
red ball the generator drew in the hand is taken out first: the game draws its own.

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
STAND = 12  # the pose the figure's height is measured on (a standing one, 0-based)


def without_ball(a):
    """the drawn red ball removed: a hand gets the skin around it, the air behind a floating one goes"""
    r, g, b = [a[..., k].astype(int) for k in range(3)]
    red = (r > 150) & (g < 40) & (b < 55)
    lab, n = ndi.label(ndi.binary_dilation(red, iterations=2))
    ball = np.zeros(red.shape, bool)
    for i in range(1, n + 1):
        m = lab == i
        if (red & m).sum() > 30:  # a ball, not a fleck of red
            ball |= m
    ball = ndi.binary_dilation(ball, iterations=2)
    _, (iy, ix) = ndi.distance_transform_edt(ball, return_indices=True)
    out = a.copy()
    out[ball] = a[iy[ball], ix[ball]]
    return out, int(ball.sum())


def main():
    a = np.array(Image.open(SRC).convert('RGB'))
    clean, n = without_ball(a)
    print('ball pixels removed:', n)
    tmp = os.path.join(tempfile.mkdtemp(), 'spin-back.png')
    Image.fromarray(clean).save(tmp)
    meta = build('spin-back', tmp, {}, [[0, 0, 0, 1, 1, 0, 0, 0, 0, 0]] * 14, 14, 440)
    meta['place'] = []  # no name and number on the back for now
    meta['refPx'] = meta['frames'][STAND][3] - 12  # (the box less its 6 px padding each side)
    src = open('js/kitsheets.js').read()
    out = json.loads(src[src.index('= ') + 2:src.rindex(';')])
    out['spin-back'] = meta
    write_sheets(out)


if __name__ == '__main__':
    main()
