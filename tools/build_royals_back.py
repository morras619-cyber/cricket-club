#!/usr/bin/env python3
"""The Pink Royals' own bowler from behind (their kit is drawn, not recoloured from Thunder's): img/kit/royals-back.webp,
its mask img/kit/royals-back-mask.png, and its entry in js/kitsheets.js, from tools/kit/src/royals-back.png (10 poses on
white, in the same order as the pace bowler's back sheet: stance, three run-up poses, gather, arm up x2, follow-through x2,
finish; the kit reference sheet is tools/kit/src/royals-kit-reference.png).

The game then treats it as one more kit view (js/kitsprite.js, js/bowlsprite.js): the player's own skin tone painted over
the skin (the mask's R channel), and his surname and number printed on the back (the G channel says where a print may go,
meta.place per pose where it sits). The kit itself is left as drawn (the mask's B channel is empty), so no recolour. He is
bald, as drawn: hair layers would need their own drawing for this sheet.

usage (repo root): python3 tools/build_royals_back.py       needs numpy, scipy and Pillow
"""
import json
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'tools/kit/src/royals-back.png'
OUT = 'img/kit/royals-back'
BELT_BELOW_NECK = 118   # (px under the neck where the waistband is, on a standing pose: the print stays above it)

# back, over the crown); filled by tools/build_royals_back.py's auto placement, then trimmed by eye here
LIFT = 0.12            # (of the print's width: the block rides above the crown's middle, so the name clears its points)
TILT = {3: 6, 4: -10, 5: -14, 6: 10, 7: 12}   # the lean of the torso in the poses that bend


def white_bg_cut(im):
    """the 10 poses with the white taken away from the edges in (the figures have white boots and stripes, which are kept)"""
    a = np.array(im.convert('RGB')).astype(int)
    white = (a.min(2) >= 238) & ((a.max(2) - a.min(2)) < 14)
    lab, _ = ndi.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ndi.binary_fill_holes(~np.isin(lab, list(edge)))
    # two poses touch (the second row's second and the last row's second): a one-row gap between them
    gap = fg.copy()
    col = fg[1040:1110, 181:447].mean(1)
    gap[1040 + int(np.argmin(col)), 181:447] = False
    alpha = np.clip(ndi.gaussian_filter(fg.astype(np.float32), 0.7) * 1.5 - 0.1, 0, 1)
    rgba = np.dstack([a.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    lab2, n = ndi.label(gap)
    sl, sizes = ndi.find_objects(lab2), ndi.sum(gap, lab2, range(1, n + 1))
    poses = [(sl[i], i + 1) for i in range(n) if sizes[i] > 12000]
    assert len(poses) == 10, len(poses)
    poses.sort(key=lambda t: (0 if t[0][0].start < 515 else 1 if t[0][0].start < 1070 else 2, t[0][1].start))
    cells = []
    for s, i in poses:
        sub = rgba[s].copy()
        own = ndi.binary_dilation(lab2[s] == i, iterations=3) & fg[s]
        sub[..., 3] = np.where(own, sub[..., 3], 0)
        cells.append(Image.fromarray(sub, 'RGBA'))
    return cells


def skin_mask(a):
    """the skin: head, neck, arms, hands, in the drawn orange (and its shaded edges); not the peach in the crown"""
    r, g, b, al = (a[..., i].astype(float) for i in range(4))
    mx, mn = a[..., :3].max(2).astype(float), a[..., :3].min(2).astype(float)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = d / np.maximum(mx, 1)
    core = (al > 200) & (h > 12) & (h < 42) & (s > 0.25) & (s < 0.75) & (mx > 140)
    lab, n = ndi.label(core)
    core = np.isin(lab, 1 + np.nonzero(ndi.sum(core, lab, range(1, n + 1)) > 150)[0])
    wide = (al > 200) & (h > 8) & (h < 44) & (s > 0.2) & (mx > 90)   # (the darker edge of a fist belongs to the hand)
    lab, n = ndi.label(wide)
    hit = np.unique(lab[core & (lab > 0)])
    return np.isin(lab, hit[hit > 0])


def main():
    cells = white_bg_cut(Image.open(SRC))
    W = sum(c.width + 4 for c in cells)
    H = max(c.height for c in cells)
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mask = np.zeros((H, W, 3), np.uint8)
    frames, place, x = [], [], 0
    lum = lambda p: p @ np.array([0.299, 0.587, 0.114])
    skin_lums = []
    for k, c in enumerate(cells):
        atlas.paste(c, (x, 0))
        a = np.array(c)
        al = a[..., 3] > 128
        sk = skin_mask(a)
        ys = np.where(al.any(1))[0]
        yb = int(ys.max())
        xs = np.where(al[max(0, yb - 20):yb + 1].any(0))[0]
        frames.append([x, 0, c.width, c.height, round((xs.min() + xs.max()) / 2, 1), yb])
        # the head is the topmost skin piece: where the neck ends is where the shirt starts
        lab, n = ndi.label(sk)
        top = min(range(1, n + 1), key=lambda i: np.nonzero(lab == i)[0].min())
        head = lab == top
        hy, hx = np.nonzero(head)
        neck, cx = int(hy.max()), float(hx.mean())
        # the crown: the white of the shirt's back, close under the neck and near the head's middle line
        win = np.zeros_like(al)
        win[neck + 8:neck + 8 + 112, max(0, int(cx) - 70):int(cx) + 70] = True
        white = win & al & (a[..., :3].min(2) > 222) & ~sk
        wy, wx = np.nonzero(white)
        px, py = (float(wx.mean()), float(wy.mean())) if wy.size > 40 else (cx, neck + 60.0)
        # the shirt's width across that row, bare arms and the empty air left out
        row = al[int(py)] & ~sk[int(py)]
        cols = np.nonzero(row)[0]
        near = cols[(cols > px - 90) & (cols < px + 90)]
        w = float(near.max() - near.min()) * 0.5 if near.size else 70.0
        w0 = min(w, 76.0)
        px0, py0, ang = px, py - LIFT * w0, float(TILT.get(k, 0))
        place.append([round(px0 + x, 1), round(py0, 1), round(w0, 1), 1, 1, ang, 0, 0, 0, 0])
        # the mask: R skin, G where a print may go (the shirt: not the skin, in a box round the block), B empty (no recolour)
        m = mask[:, x:x + c.width]
        m[:c.height, :, 0] = np.where(sk, 255, 0)[:c.height]
        bx0, bx1, by0, by1 = int(px0 - w0 * 0.75), int(px0 + w0 * 0.75), int(py0 - w0 * 0.6), int(py0 + w0 * 0.6)
        box = np.zeros(al.shape, bool)
        box[max(0, by0):by1, max(0, bx0):bx1] = True
        shirt = box & al & ~ndi.binary_dilation(sk, iterations=2)
        m[:c.height, :, 1] = np.where(shirt, 255, 0)[:c.height]
        skin_lums.append(lum(a[..., :3][sk].astype(float)))
        x += c.width + 4
    atlas.save(OUT + '.webp', 'WEBP', quality=92, method=6)
    Image.fromarray(mask, 'RGB').save(OUT + '-mask.png', optimize=True)
    stand = frames[0][5] - int(np.nonzero(np.array(cells[0])[..., 3] > 128)[0].min()) + 1
    skin_ref = float(np.median(np.concatenate(skin_lums)) / 255)
    meta = {'frames': frames, 'place': place, 'refPx': stand, 'suit': [0, 0, 0], 'trim': [0, 0, 0], 'skin': round(skin_ref, 4), 'hair': {}, 'size': [W, H]}
    src = open('js/kitsheets.js').read()
    sheets = json.loads(src[src.index('= ') + 2:src.rindex(';')])
    sheets['royals-back'] = meta
    sys.path.insert(0, os.path.dirname(__file__))
    from build_kit_sheets import write_sheets  # noqa: E402
    write_sheets(sheets)
    print('royals-back', (W, H), 'poses', len(frames), 'standing', stand, 'skin', round(skin_ref, 3))


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main()
