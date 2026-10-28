#!/usr/bin/env python3
"""The Pink Royals' own bowler from behind (their kit is drawn, not recoloured from Thunder's): img/kit/royals-back.webp,
its mask img/kit/royals-back-mask.png, its hairstyles img/kit/royals-back-hair-<style>.webp and its entry in js/kitsheets.js,
from tools/kit/src/royals-back.png (10 poses on a transparent background, in the same order as the pace bowler's back sheet:
stance, three run-up poses, gather, arm up x2, follow-through x2, finish; the kit reference sheet is
tools/kit/src/royals-kit-reference.png).

The game then treats it as one more kit view (js/kitsprite.js, js/bowlsprite.js): the player's own skin tone painted over the
skin (the mask's R channel), his hairstyle over the head, and his surname and number printed on the back (the G channel says
where a print may go, meta.place per pose where it sits). The kit itself is left as drawn (the mask's B channel is empty), so no
recolour.

The poses are the same drawings as the Thunder back sheet (img/kit/back.webp), smaller, so the Thunder hairstyle layers
(img/kit/back-hair-<style>.webp) are carried over: each pose's layer is scaled and shifted to sit on the Royals head (ALIGN
below, found by matching the two outlines' head areas: they overlap 88 to 99%). Each pose has empty room round it for hair that
stands up or hangs.

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
PAD_T, PAD_S, PAD_B = 46, 16, 6   # room round each pose (hair that stands up, hangs, or is wider than the head)
LIFT = 0.12            # (of the print's width: the block rides above the crown's middle, so the name clears its points)
TILT = {3: 6, 4: -10, 5: -14, 6: 10, 7: 12}   # the lean of the torso in the poses that bend
# per pose: scale and shift (x, y) that put the Thunder pose's hair onto this pose, in this pose's own box before the room is added
ALIGN = [(0.88, -5, -21), (0.88, -7, -22), (0.88, -8, -21), (0.90, -7, -24), (0.87, -8, -8),
         (0.91, -2, -9), (0.93, -8, -21), (0.97, -3, -23), (0.94, -8, -23), (0.92, -5, -24)]


def cut_poses(im):
    """the 10 poses of the transparent sheet (two touch: a one-row gap between them), each only its own pixels"""
    a = np.array(im.convert('RGBA'))
    fg = a[..., 3] > 40
    gap = fg.copy()
    col = fg[1040:1110, 181:447].mean(1)
    gap[1040 + int(np.argmin(col)), 181:447] = False
    lab, n = ndi.label(gap)
    sl, sizes = ndi.find_objects(lab), ndi.sum(gap, lab, range(1, n + 1))
    poses = [(sl[i], i + 1) for i in range(n) if sizes[i] > 12000]
    assert len(poses) == 10, len(poses)
    poses.sort(key=lambda t: (0 if t[0][0].start < 515 else 1 if t[0][0].start < 1070 else 2, t[0][1].start))
    cells = []
    for s, i in poses:
        sub = a[s].copy()
        own = ndi.binary_dilation(lab[s] == i, iterations=3) & fg[s]
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
    cells = cut_poses(Image.open(SRC))
    raw = [(c.width, c.height) for c in cells]
    cw = [w + 2 * PAD_S for w, _ in raw]
    ch = [h + PAD_T + PAD_B for _, h in raw]
    W, H = sum(w + 4 for w in cw), max(ch)
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mask = np.zeros((H, W, 3), np.uint8)
    frames, place, offs, x = [], [], [], 0
    lum = lambda p: p @ np.array([0.299, 0.587, 0.114])
    skin_lums = []
    for k, c in enumerate(cells):
        atlas.paste(c, (x + PAD_S, PAD_T))
        offs.append(x)
        box = Image.new('RGBA', (cw[k], ch[k]), (0, 0, 0, 0))
        box.paste(c, (PAD_S, PAD_T))
        a = np.array(box)
        al = a[..., 3] > 128
        sk = skin_mask(a)
        ys = np.where(al.any(1))[0]
        yb, ytop = int(ys.max()), int(ys.min())
        xs = np.where(al[max(0, yb - 20):yb + 1].any(0))[0]
        frames.append([x, 0, cw[k], ch[k], round((xs.min() + xs.max()) / 2, 1), yb])
        # the head is the topmost skin piece: where the neck ends is where the shirt starts
        lab, n = ndi.label(sk)
        top = min(range(1, n + 1), key=lambda i: np.nonzero(lab == i)[0].min())
        hy, hx = np.nonzero(lab == top)
        neck, cx = int(hy.max()), float(hx.mean())
        # the crown: the white of the shirt's back, close under the neck and near the head's middle line
        win = np.zeros_like(al)
        win[neck + 8:neck + 8 + 112, max(0, int(cx) - 70):int(cx) + 70] = True
        wy, wx = np.nonzero(win & al & (a[..., :3].min(2) > 222) & ~sk)
        px, py = (float(wx.mean()), float(wy.mean())) if wy.size > 40 else (cx, neck + 60.0)
        # the shirt's width across that row, bare arms and the empty air left out
        cols = np.nonzero(al[int(py)] & ~sk[int(py)])[0]
        near = cols[(cols > px - 90) & (cols < px + 90)]
        w0 = min(float(near.max() - near.min()) * 0.5 if near.size else 70.0, 76.0)
        py0, ang = py - LIFT * w0, float(TILT.get(k, 0))
        place.append([round(px + x, 1), round(py0, 1), round(w0, 1), 1, 1, ang, 0, 0, 0, 0])
        # the mask: R skin, G where a print may go (the shirt: not the skin, in a box round the block), B empty (no recolour)
        m = mask[:ch[k], x:x + cw[k]]
        m[..., 0] = np.where(sk, 255, 0)
        bx0, bx1, by0, by1 = int(px - w0 * 0.75), int(px + w0 * 0.75), int(py0 - w0 * 0.6), int(py0 + w0 * 0.6)
        bb = np.zeros(al.shape, bool)
        bb[max(0, by0):by1, max(0, bx0):bx1] = True
        m[..., 1] = np.where(bb & al & ~ndi.binary_dilation(sk, iterations=2), 255, 0)
        skin_lums.append(lum(a[..., :3][sk].astype(float)))
        x += cw[k] + 4
    atlas.save(OUT + '.webp', 'WEBP', quality=92, method=6)
    Image.fromarray(mask, 'RGB').save(OUT + '-mask.png', optimize=True)
    # the hairstyles: the Thunder layers, each pose scaled and shifted onto this pose's head
    src = open('js/kitsheets.js').read()
    sheets = json.loads(src[src.index('= ') + 2:src.rindex(';')])
    back = sheets['back']
    styles = sorted(back['hair'])
    for st in styles:
        full = Image.open(f'img/kit/back-hair-{st}.webp').convert('RGBA')
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for k, tf in enumerate(back['frames']):
            sc, ox, oy = ALIGN[k]
            part = full.crop((tf[0], tf[1], tf[0] + tf[2], tf[1] + tf[3]))
            part = part.resize((max(1, round(part.width * sc)), max(1, round(part.height * sc))), Image.LANCZOS)
            tmp = Image.new('RGBA', (cw[k], ch[k]), (0, 0, 0, 0))
            tmp.alpha_composite(part, (PAD_S + ox, PAD_T + oy)) if (PAD_S + ox >= 0 and PAD_T + oy >= 0) else tmp.paste(part, (PAD_S + ox, PAD_T + oy))
            layer.alpha_composite(tmp, (offs[k], 0))
        layer.save(f'{OUT}-hair-{st}.webp', 'WEBP', quality=90, method=6)
    stand = int(np.nonzero(np.array(cells[0])[..., 3] > 128)[0].max() - np.nonzero(np.array(cells[0])[..., 3] > 128)[0].min() + 1)
    skin_ref = float(np.median(np.concatenate(skin_lums)) / 255)
    sheets['royals-back'] = {'frames': frames, 'place': place, 'refPx': stand, 'suit': [0, 0, 0], 'trim': [0, 0, 0], 'skin': round(skin_ref, 4), 'hair': back['hair'], 'size': [W, H]}
    sys.path.insert(0, os.path.dirname(__file__))
    from build_kit_sheets import write_sheets  # noqa: E402
    write_sheets(sheets)
    print('royals-back', (W, H), 'poses', len(frames), 'standing', stand, 'skin', round(skin_ref, 3), 'hairstyles', len(styles))


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main()
