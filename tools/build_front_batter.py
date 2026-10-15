"""Cut the labelled front-view batting sheet (19 poses, transparent background) into an atlas.

usage: python3 tools/build_front_batter.py SHEET.png img/batter-front.webp [--mirror 15,16,17] [--blade x,y;x,y;... --cut-x N] [--dump DIR]

--mirror flips the listed poses (the cut is often drawn the left-hander's way round).
--blade gives the bat blade outline in pose 18's frame, kept when its stumps (everything
from x = --cut-x rightwards) are erased.
--dump writes each cut pose as a PNG for checking.

Pose 18 (bowled) has stumps drawn in: they are erased, keeping the bat blade that crosses
them. Pose 19 is the opposing keeper, not a batting pose, and is left out.
Prints the frame table for js/batsprite.js (FRONT). Needs numpy, scipy and Pillow.
"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

USE = {1: 'ready', 2: 'leave1', 3: 'leave2', 4: 'backlift', 5: 'drive1', 6: 'drive2', 7: 'drive3',
       8: 'pull0', 9: 'pull1', 10: 'pull2', 11: 'pull3', 12: 'def1', 13: 'def2', 14: 'def3',
       15: 'cut1', 16: 'cut2', 17: 'cut3', 18: 'bowled'}
# label rows; these cover both sheets drawn so far
BANDS = [(0, 40), (355, 396), (690, 735)]
# pose 18 (frame coords) for the first sheet: everything right of the batter's pad is erased except the bat blade
BLADE = [(93, 154), (109, 146), (172, 237), (170, 244), (156, 247)]


def opt(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    src, out = sys.argv[1:3]
    mirror = {int(k) for k in opt('--mirror', '').split(',') if k}
    blade = [tuple(int(v) for v in p.split(',')) for p in opt('--blade').split(';')] if opt('--blade') else BLADE
    dump = opt('--dump')
    a = np.array(Image.open(src).convert('RGBA'))
    al = a[..., 3] > 40
    dark = al & (a[..., :3].astype(int).max(-1) < 80)
    mask = al.copy()
    for y0, y1 in BANDS:
        lab, _ = ndimage.label(ndimage.binary_closing(dark[y0:y1], iterations=3))
        for s in ndimage.find_objects(lab):
            if s[1].stop - s[1].start > 60:
                mask[y0 + s[0].start - 2:y0 + s[0].stop + 2, s[1].start - 3:s[1].stop + 3] = False
    lab, _ = ndimage.label(ndimage.binary_dilation(mask, iterations=2))
    objs = [(s[0].start, s[0].stop, s[1].start, s[1].stop, i + 1) for i, s in enumerate(ndimage.find_objects(lab))
            if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 3000]
    row = lambda o: 0 if (o[0] + o[1]) / 2 < 360 else 1 if (o[0] + o[1]) / 2 < 700 else 2
    objs.sort(key=lambda o: (row(o), o[2]))
    assert len(objs) == 19, len(objs)
    imgs = {}
    for k, (y0, y1, x0, x1, li) in enumerate(objs, 1):
        if k not in USE:
            continue
        m = (lab[y0:y1, x0:x1] == li) & mask[y0:y1, x0:x1]
        c = a[y0:y1, x0:x1].copy()
        c[..., 3] = np.where(m, c[..., 3], 0)
        if dump:
            Image.fromarray(c).save(f'{dump}/f{k:02d}.png')
        if k == 18:
            keep = Image.new('L', (x1 - x0, y1 - y0), 0)
            ImageDraw.Draw(keep).polygon(blade, fill=255)
            xs = np.arange(x1 - x0)[None, :]
            cut_x = int(opt('--cut-x', 134))
            c[..., 3] = np.where((xs >= cut_x) & ~(np.array(keep) > 0), 0, c[..., 3])
        im = Image.fromarray(c)
        im = im.crop(im.getbbox())
        if k in mirror:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        arr = np.array(im).astype(int)
        alp = arr[..., 3] > 40
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
        bat = (r > 170) & (g > 130) & (b < 150) & (r - b > 50)
        body = alp & ~bat
        bottom = np.nonzero(body.any(1))[0].max()
        xs = np.nonzero(body[bottom - 14:bottom + 1].any(0))[0]
        feet = (xs.min() + xs.max()) / 2
        # helmet: topmost blue blob; its width evens out the scale between poses
        blue = alp & (b > r + 70) & (b > g + 30)
        hl, _ = ndimage.label(blue)
        top, hi = min((s[0].start, i + 1) for i, s in enumerate(ndimage.find_objects(hl)) if (hl[s] == i + 1).sum() > 200)
        hm = hl == hi
        hw = max(hm[y].sum() for y in range(top, min(top + 22, hm.shape[0])))
        hcx = np.nonzero(hm[top:top + 22].any(0))[0].mean()
        imgs[USE[k]] = (im, round(0.5 * hcx + 0.5 * feet, 1), int(bottom), round(max(0.9, min(1.1, 40 / hw)), 3))
    pad, W, x, y, rowh, table = 2, 1024, 0, 0, 0, {}
    for name, (im, ax, ay, s) in imgs.items():
        w, h = im.size
        if x + w > W:
            x, y, rowh = 0, y + rowh + pad, 0
        table[name] = [x, y, w, h, ax, ay, s]
        x += w + pad
        rowh = max(rowh, h)
    atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for name, (im, *_r) in imgs.items():
        atlas.alpha_composite(im, tuple(table[name][:2]))
    atlas.save(out, quality=88, method=6)
    print(json.dumps(table))


if __name__ == '__main__':
    main()
