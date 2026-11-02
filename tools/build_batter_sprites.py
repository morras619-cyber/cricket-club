"""Cut the labelled batting sprite sheets into one atlas per team.

usage: python3 tools/build_batter_sprites.py REF_SHEET OUT_DIR team_id=sheet.png [team_id=sheet.png ...]

REF_SHEET is the original blue/yellow sheet (1536x1024, 19 labelled poses, transparent background).
The pose outlines, crop boxes and anchors all come from it; every team sheet shares that layout,
so each team's frames are cut with the reference masks and packed at the same atlas positions.
That keeps one frame table (js/batsprite.js FRAMES) valid for every team.
Needs numpy, scipy and Pillow.
"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

USE = {1: 'ready', 2: 'leave1', 3: 'leave2', 4: 'backlift', 5: 'drive1', 6: 'drive2', 7: 'drive3',
       8: 'pull0', 9: 'pull1', 10: 'pull2', 11: 'pull3', 12: 'def1', 13: 'def2', 14: 'def3',
       15: 'cut1', 16: 'cut2', 17: 'cut3', 18: 'bowled'}
BANDS = [(0, 38), (385, 418), (716, 750)]  # label rows
# pose 18 has stumps drawn in: keep only the bat blade to the right of the batter (frame coords)
BLADE = [(146, 147), (151, 141), (217, 200), (215, 212), (207, 219), (200, 215)]


def reference(path):
    a = np.array(Image.open(path).convert('RGBA'))
    al = a[..., 3] > 40
    rgb = a[..., :3].astype(int)
    dark = al & (rgb.max(-1) < 80)
    mask = al.copy()
    labels = []
    for y0, y1 in BANDS:
        lab, _ = ndimage.label(ndimage.binary_closing(dark[y0:y1], iterations=3))
        for s in ndimage.find_objects(lab):
            if s[1].stop - s[1].start > 60:
                r = (y0 + s[0].start - 2, y0 + s[0].stop + 2, s[1].start - 3, s[1].stop + 3)
                labels.append(r)
                mask[r[0]:r[1], r[2]:r[3]] = False
    lab, _ = ndimage.label(ndimage.binary_dilation(mask, iterations=2))
    objs = []
    for i, s in enumerate(ndimage.find_objects(lab)):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 3000:
            objs.append((s[0].start, s[0].stop, s[1].start, s[1].stop, i + 1))
    row = lambda o: 0 if (o[0] + o[1]) / 2 < 380 else 1 if (o[0] + o[1]) / 2 < 712 else 2
    objs.sort(key=lambda o: (row(o), o[2]))
    assert len(objs) == 19, f'expected 19 poses, found {len(objs)}'
    frames = {}
    for k, (y0, y1, x0, x1, li) in enumerate(objs, 1):
        if k not in USE:
            continue
        m = (lab[y0:y1, x0:x1] == li) & mask[y0:y1, x0:x1]
        if k == 18:
            keep = Image.new('L', (x1 - x0, y1 - y0), 0)
            ImageDraw.Draw(keep).polygon(BLADE, fill=255)
            xs = np.arange(x1 - x0)[None, :]
            m &= ~((xs >= 186) & ~(np.array(keep) > 0))
        ys, xs = np.nonzero(m & al[y0:y1, x0:x1])
        by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        frames[USE[k]] = dict(rect=(y0 + by0, y0 + by1, x0 + bx0, x0 + bx1), mask=m[by0:by1, bx0:bx1])
    return frames, labels


def cut(sheet, frames, labels, dilate):
    a = np.array(Image.open(sheet).convert('RGBA'))
    for r in labels:
        a[r[0]:r[1], r[2]:r[3], 3] = 0
    out = {}
    for name, f in frames.items():
        y0, y1, x0, x1 = f['rect']
        crop = a[y0:y1, x0:x1].copy()
        m = ndimage.binary_dilation(f['mask'], iterations=dilate) if dilate else f['mask']
        if name == 'bowled':  # never let the stumps back in
            m &= ndimage.binary_dilation(f['mask'], iterations=1)
        crop[..., 3] = np.where(m, crop[..., 3], 0)
        out[name] = Image.fromarray(crop)
    return out


def anchors(img):
    a = np.array(img).astype(int)
    al = a[..., 3] > 40
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    body = al & ~((r > 170) & (g > 130) & (b < 150) & (r - b > 50))
    bottom = np.nonzero(body.any(1))[0].max()
    xs = np.nonzero(body[bottom - 18:bottom + 1].any(0))[0]
    feet = (xs.min() + xs.max()) / 2
    blue = al & (b > r + 70) & (b > g + 30)
    lab, _ = ndimage.label(blue)
    cand = [(s[0].start, i + 1) for i, s in enumerate(ndimage.find_objects(lab)) if (lab[s] == i + 1).sum() > 200]
    if not cand:  # a black helmet (the Vipers): the dark and red parts, not the bat, gloves or skin
        helm = al & ((a[..., :3].max(-1) < 90) | ((r > 150) & (g < 70) & (b < 70)))
        helm = ndimage.binary_opening(helm, iterations=1)
        lab, _ = ndimage.label(helm)
        cand = [(s[0].start, i + 1) for i, s in enumerate(ndimage.find_objects(lab)) if (lab[s] == i + 1).sum() > 200]
    top, li = min(cand)
    hm = lab == li
    hw = max(hm[y].sum() for y in range(top, min(top + 22, hm.shape[0])))
    hcx = np.nonzero(hm[top:top + 22].any(0))[0].mean()
    return round(0.5 * hcx + 0.5 * feet, 1), int(bottom), round(max(0.92, min(1.08, 40 / hw)), 3)


def main():
    ref, out_dir, *teams = sys.argv[1:]
    frames, labels = reference(ref)
    ref_imgs = cut(ref, frames, labels, 0)
    pad, W, x, y, rowh, pos = 2, 1024, 0, 0, 0, {}
    for name in USE.values():
        w, h = ref_imgs[name].size
        if x + w > W:
            x, y, rowh = 0, y + rowh + pad, 0
        pos[name] = (x, y)
        x += w + pad
        rowh = max(rowh, h)
    H = y + rowh
    table = {}
    for name in USE.values():
        w, h = ref_imgs[name].size
        table[name] = [*pos[name], w, h, *anchors(ref_imgs[name])]
    for spec in teams:
        tid, path = spec.split('=', 1)
        imgs = ref_imgs if path == ref else cut(path, frames, labels, 4)
        atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for name, im in imgs.items():
            atlas.alpha_composite(im, pos[name])
        atlas.save(f'{out_dir}/batter-{tid}.webp', quality=88, method=6)
        print('wrote', tid)
    print(json.dumps(table))


if __name__ == '__main__':
    main()
