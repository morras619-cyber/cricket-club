"""Cut the team-logo sheet into img/logo-<team>.webp (labels left out).

usage: python3 tools/build_logos.py SHEET.png img
Logos are matched to teams in sheet order: top row left to right, then the bottom row.
Needs numpy, scipy and Pillow.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

TEAMS = ['thunder', 'cyclones', 'vipers', 'eagles', 'phoenix', 'storm', 'titans', 'royals']
SIZE = 192


def main():
    src, out = sys.argv[1:3]
    a = np.array(Image.open(src).convert('RGBA'))
    al = a[..., 3] > 40
    # drop the name pills: short, wide shapes (their text sits inside their outline)
    pl, _ = ndimage.label(ndimage.binary_closing(al, iterations=4))
    for i, sl in enumerate(ndimage.find_objects(pl), 1):
        if sl[0].stop - sl[0].start < 75 and sl[1].stop - sl[1].start > 150:
            al[sl] = False
    al[455:520] = False; al[868:940] = False  # the two rows of name pills
    a[..., 3] = np.where(al, a[..., 3], 0)
    lab, _ = ndimage.label(ndimage.binary_dilation(al, iterations=6))
    objs = []
    for i, s in enumerate(ndimage.find_objects(lab), 1):
        h, w = s[0].stop - s[0].start, s[1].stop - s[1].start
        if h < 120:  # the label pills are short and wide
            continue
        objs.append((s, i))
    objs.sort(key=lambda o: ((o[0][0].start + o[0][0].stop) / 2 > a.shape[0] / 2, o[0][1].start))
    assert len(objs) == 8, len(objs)
    for team, (s, li) in zip(TEAMS, objs):
        c = a[s].copy()
        c[..., 3] = np.where(lab[s] == li, c[..., 3], 0)
        # the sheet's background removal also ate the black inside some logos (Eagles' wing
        # stripes, Titans' triangle): put solid ink back everywhere the outline encloses
        m = c[..., 3] > 40
        inside = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=4))
        inside = ndimage.binary_erosion(inside, iterations=1)
        al = c[..., 3:4].astype(float) / 255
        ink = np.array([20, 16, 24], float)
        blended = c[..., :3] * al + ink * (1 - al)
        c[..., :3] = np.where(inside[..., None], blended, c[..., :3]).astype(np.uint8)
        c[..., 3] = np.where(inside, 255, c[..., 3])
        im = Image.fromarray(c)
        im = im.crop(im.getbbox())
        k = SIZE / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        sq = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        sq.alpha_composite(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
        sq.save(f'{out}/logo-{team}.webp', quality=90, method=6)
        print(team, im.size)


if __name__ == '__main__':
    main()
