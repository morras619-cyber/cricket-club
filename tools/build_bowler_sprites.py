"""Cut a labelled bowler sheet (19 poses, transparent background) into an atlas.

usage: python3 tools/build_bowler_sprites.py SHEET.png OUT.webp [--back]

Front view (the batting camera, img/bowler.webp): pose 6 (coil) is left out, because the
bowling arm is already high and he holds a second ball.
Back view (--back, the bowling camera, img/bowler-back.webp): the sheet is drawn as a
left-arm bowler, so it is mirrored to match the right-arm front view; poses 6 and 7 both used.
In both, the ball drawn in pose 8 (release) is removed because the game draws the real ball.
Prints the frame table for js/bowlsprite.js. Needs numpy, scipy and Pillow.
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

USE = {1: 'start', 2: 'run1', 3: 'run2', 4: 'run3', 5: 'gather', 7: 'coil', 8: 'release',
       9: 'follow1', 10: 'follow2', 11: 'follow3', 12: 'finish', 16: 'field', 17: 'react',
       18: 'celebrate1', 19: 'celebrate2'}
BANDS = [(0, 40), (385, 420), (716, 752)]
ROW_SCALE = [1.0, 1.12, 1.0]  # row 2 is drawn about 12% smaller than rows 1 and 3


def main():
    src, out = sys.argv[1:3]
    back = '--back' in sys.argv
    use = {**USE, **({6: 'coil', 7: 'frontarm'} if back else {})}
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
    objs = []
    for i, s in enumerate(ndimage.find_objects(lab)):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 3000:
            objs.append((s[0].start, s[0].stop, s[1].start, s[1].stop, i + 1))
    row = lambda o: 0 if (o[0] + o[1]) / 2 < 380 else 1 if (o[0] + o[1]) / 2 < 712 else 2
    objs.sort(key=lambda o: (row(o), o[2]))
    assert len(objs) == 19, len(objs)
    imgs = {}
    for k, o in enumerate(objs, 1):
        if k not in use:
            continue
        y0, y1, x0, x1, li = o  # only the figure's own component: loose balls stay out
        m = (lab[y0:y1, x0:x1] == li) & mask[y0:y1, x0:x1]
        c = a[y0:y1, x0:x1].copy()
        c[..., 3] = np.where(m, c[..., 3], 0)
        im = Image.fromarray(c)
        im = im.crop(im.getbbox())
        if back:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        arr = np.array(im)
        bottom = np.nonzero((arr[..., 3] > 40).any(1))[0].max()
        xs = np.nonzero((arr[bottom - 14:bottom + 1, :, 3] > 40).any(0))[0]
        imgs[use[k]] = (im, round((xs.min() + xs.max()) / 2, 1), int(bottom), ROW_SCALE[row(o)])
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
