#!/usr/bin/env python3
"""Super League card frames and ability icons.

usage: python3 tools/build_card_frames.py FRAMES.png ICONS.png

FRAMES is the sheet of ten frames (5 x 2) on a transparent background. Every pixel of glow goes to
the card whose solid body is nearest, so no card keeps a sliver of its neighbour's glow along its
edge. Writes img/cards/frames/<name>.webp and img/cards/icons/<name>.webp.
Needs numpy, scipy and Pillow.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FRAMES = [['legendary', 'epic', 'rare', 'inform', 'gold'], ['prospect', 'totw', 'common', 'event', 'bronze']]
ICONS = [['finisher', 'swingMaster', 'allrounder', 'deathKing', 'mystery'], ['pace', 'eagleEye', 'safeHands', 'risingStar', 'hero']]


def main():
    frames, icons = sys.argv[1:3]
    F = np.array(Image.open(frames).convert('RGBA'))
    H, W = F.shape[:2]
    al = F[..., 3]
    # each card's solid body: the biggest opaque shape in its cell of the 5 x 2 grid
    owner = np.zeros((H, W), np.int32)
    bodies = []
    for r in range(2):
        for c in range(5):
            x0, x1, y0, y1 = W * c // 5, W * (c + 1) // 5, H * r // 2, H * (r + 1) // 2
            lab, n = ndi.label(al[y0:y1, x0:x1] > 200)
            big = lab == (np.argmax(ndi.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1)
            body = np.zeros((H, W), bool)
            body[y0:y1, x0:x1] = ndi.binary_fill_holes(big)
            bodies.append(body)
            owner[body] = len(bodies)
    # every other pixel belongs to the nearest body
    _, (iy, ix) = ndi.distance_transform_edt(owner == 0, return_indices=True)
    owner = owner[iy, ix]
    for k, body in enumerate(bodies):
        r, c = divmod(k, 5)
        a = np.where(owner == k + 1, al, 0)
        # the same framing for every card: its solid body fills the same box (glow round it), so
        # the name, rating and stats sit in the same places on all of them
        ys, xs = np.nonzero(body)
        bw, bh = xs.max() - xs.min(), ys.max() - ys.min()
        X0, X1 = int(xs.min() - bw * 0.06), int(xs.max() + bw * 0.06)
        Y0, Y1 = int(ys.min() - bh * 0.05), int(ys.max() + bh * 0.04)
        out = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8)
        sy0, sx0 = max(0, Y0), max(0, X0)
        sy1, sx1 = min(H, Y1), min(W, X1)
        out[sy0 - Y0:sy1 - Y0, sx0 - X0:sx1 - X0] = F[sy0:sy1, sx0:sx1]
        out[sy0 - Y0:sy1 - Y0, sx0 - X0:sx1 - X0, 3] = a[sy0:sy1, sx0:sx1]
        # and fade the outermost strip on each side, where a neighbour's glow can still reach in
        w = out.shape[1]
        ramp = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w * 0.05), 0, 1)
        out[..., 3] = (out[..., 3] * ramp[None, :]).astype(np.uint8)
        im = Image.fromarray(out, 'RGBA').resize((480, 800), Image.LANCZOS)
        im.save(f'img/cards/frames/{FRAMES[r][c]}.webp', 'WEBP', quality=88, method=6)
        print(FRAMES[r][c], im.size)
    I = np.array(Image.open(icons).convert('RGBA'))
    lab, _ = ndi.label(ndi.binary_dilation(I[..., 3] > 60, iterations=3))
    objs = [(s, i + 1) for i, s in enumerate(ndi.find_objects(lab)) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 20000]
    mid = I.shape[0] / 2
    objs.sort(key=lambda o: (0 if (o[0][0].start + o[0][0].stop) / 2 < mid else 1, o[0][1].start))
    assert len(objs) == 10, len(objs)
    for k, (s, i) in enumerate(objs):
        piece = I[s].copy()
        piece[..., 3] = np.where(lab[s] == i, piece[..., 3], 0)
        im = Image.fromarray(piece, 'RGBA').resize((128, round(128 * (s[0].stop - s[0].start) / (s[1].stop - s[1].start))), Image.LANCZOS)
        im.save(f'img/cards/icons/{ICONS[k // 5][k % 5]}.webp', 'WEBP', quality=88, method=6)
    print('icons ok')


if __name__ == '__main__':
    main()
