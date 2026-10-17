#!/usr/bin/env python3
"""Super League card frames and ability icons.

usage: python3 tools/build_card_frames.py FRAMES_BIG.png FRAMES_TRANSPARENT.png ICONS.png

FRAMES_BIG is the 2x sheet of ten frames on white; FRAMES_TRANSPARENT the same sheet at half size
with a see-through background. The colours come from the big one, the edges (alpha) from the
transparent one scaled up, so the glow has no white halo. Writes img/cards/frames/<name>.webp and
img/cards/icons/<name>.webp. Needs numpy, scipy and Pillow.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FRAMES = [['legendary', 'epic', 'rare', 'inform', 'gold'], ['prospect', 'totw', 'common', 'event', 'bronze']]
ICONS = [['finisher', 'swingMaster', 'allrounder', 'deathKing', 'mystery'], ['pace', 'eagleEye', 'safeHands', 'risingStar', 'hero']]


def main():
    big, small, icons = sys.argv[1:4]
    B = Image.open(big).convert('RGB')
    S = Image.open(small).convert('RGBA').resize(B.size, Image.LANCZOS)
    rgb, al = np.array(B), np.array(S)[..., 3].astype(np.float32)
    H, W = al.shape
    for r in range(2):
        for c in range(5):
            x0, x1, y0, y1 = W * c // 5, W * (c + 1) // 5, H * r // 2, H * (r + 1) // 2
            a = al[y0:y1, x0:x1].copy()
            # this card only: the biggest solid shape in the cell and the glow round it
            lab, n = ndi.label(a > 128)
            keep = lab == (np.argmax(ndi.sum(np.ones_like(a), lab, range(1, n + 1))) + 1)
            # its glow: whatever faint shape is joined to it (not a neighbour's glow reaching in)
            lab2, _ = ndi.label(a > 6)
            ids = np.unique(lab2[keep])
            a = np.where(np.isin(lab2, ids[ids > 0]), a, 0)
            ys, xs = np.nonzero(a > 10)
            out = np.dstack([rgb[y0:y1, x0:x1], a.astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            im = Image.fromarray(out, 'RGBA')
            im = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
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
        name = ICONS[k // 5][k % 5]
        im.save(f'img/cards/icons/{name}.webp', 'WEBP', quality=88, method=6)
    print('icons ok')


if __name__ == '__main__':
    main()
