"""Cut a labelled spin-bowler sheet (10 poses in two rows, transparent background) into an atlas.

usage: python3 tools/build_spinner_sprites.py SHEET.png OUT.webp [--back]

Poses, in sheet order: start, run up 1, run up 2, gather, coil, delivery, follow-through 1
and 2, recovery, finish. They take the pace bowler's frame names, so the game animates a
spinner with the same code (frames the sheet lacks, such as celebrations, come from the
pace sheet). The back view is drawn as a left-arm bowler, so --back mirrors it into a
right-armer like the front view. Prints the frame table for js/bowlsprite.js.
Needs numpy, scipy and Pillow.
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = ['start', 'run1', 'run2', 'gather', 'coil', 'release', 'follow1', 'follow2', 'follow3', 'finish']
SCALE = {'release': 1.0, 'follow1': 1.0, 'follow2': 1.0}


def main():
    src, out = sys.argv[1:3]
    back = '--back' in sys.argv
    a = np.array(Image.open(src).convert('RGBA'))
    H = a.shape[0]
    al = a[..., 3] > 40
    mask = al.copy()
    # the label boxes: the wide rows of components in the strip above each row of poses.
    # A raised fist can touch a label's border, so skin-coloured pixels are kept.
    r, g, b = (a[..., i].astype(int) for i in range(3))
    skin = (r > 150) & (r > b + 40) & (g > 90) & (g < r - 25) & (b > 80)  # not the yellow border
    for y0, y1 in [(0, int(H * 0.07)), (int(H * 0.49), int(H * 0.56))]:
        lab, _ = ndimage.label(al[y0:y1])
        for i, s in enumerate(ndimage.find_objects(lab), 1):
            if s[1].stop - s[1].start <= 120:
                continue
            rows = [y for y in range(s[0].start, s[0].stop) if (lab[y, s[1]] == i).sum() > 100]
            if len(rows) < 20:
                continue
            ys, ye = y0 + rows[0] - 2, y0 + rows[-1] + 3
            xs, xe = s[1].start - 3, s[1].stop + 3
            mask[ys:ye, xs:xe] &= skin[ys:ye, xs:xe]
    # drop any specks the labels left behind
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    for i, sz in enumerate(sizes, 1):
        if sz < 60:
            mask[lab == i] = False
    lab, _ = ndimage.label(ndimage.binary_dilation(mask, iterations=2))
    objs = [(s[0].start, s[0].stop, s[1].start, s[1].stop, i + 1) for i, s in enumerate(ndimage.find_objects(lab))
            if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 3000]
    row = lambda o: 0 if (o[0] + o[1]) / 2 < H / 2 else 1
    objs.sort(key=lambda o: (row(o), o[2]))
    assert len(objs) == 10, len(objs)
    imgs = {}
    for name, (y0, y1, x0, x1, li) in zip(NAMES, objs):
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
        imgs[name] = (im, round((xs.min() + xs.max()) / 2, 1), int(bottom), SCALE.get(name, 1.0))
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
