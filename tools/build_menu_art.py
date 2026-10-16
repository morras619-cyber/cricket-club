#!/usr/bin/env python3
"""Cut the home-menu art into the pieces the hub uses (img/menu/*.webp).

usage: python3 tools/build_menu_art.py MOCKUP.png PASS.png TOPBAR.png TILES.png BUTTONS.png

MOCKUP is the full home screen (852 wide): only the hero art (logo and batter) is taken from it.
The other sheets are transparent; each piece is cut to its own bounding box.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = 'img/menu/'


def pieces(path):
    """The sheet's pieces, top row first, each row left to right: [(x0, y0, image)]."""
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    lab, _ = ndi.label(ndi.binary_dilation(a[..., 3] > 40, iterations=3))
    out = []
    for i, s in enumerate(ndi.find_objects(lab), 1):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 1500:
            c = a[s].copy()
            c[..., 3] = np.where(lab[s] == i, c[..., 3], 0)  # only this piece, not a neighbour's edge
            piece = Image.fromarray(c)
            out.append((s[1].start, s[0].start, piece.crop(piece.getbbox())))
    return out


def save(im, name, width=None, q=90):
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT + name + '.webp', quality=q, method=6)
    print(name, im.size)


def near(ps, x, y):
    return min(ps, key=lambda p: abs(p[0] - x) + abs(p[1] - y))[2]


def main():
    mock, pas, top, tiles, btns = sys.argv[1:6]
    m = Image.open(mock).convert('RGB')
    save(m.crop((0, 128, m.width, 826)), 'hero', q=88)

    ps = pieces(pas)
    save(near(ps, 59, 48), 'pass-banner', 900)
    shop = near(ps, 1859, 125)
    w, h = shop.size  # the cart without its frame: the hub draws the frame round it, with the word Shop
    save(shop.crop((int(w * 0.17), int(h * 0.17), int(w * 0.83), int(h * 0.8))), 'cart', 110)
    save(near(ps, 300, 445), 'pass-track', 700)
    save(near(ps, 537, 603), 'pass-fill', 600)

    ps = pieces(top)
    save(near(ps, 37, 186), 'frame-badge', 420)
    save(near(ps, 666, 186), 'frame-pill', 260)
    save(near(ps, 204, 374), 'frame-bar', 600)
    save(near(ps, 388, 524), 'xp-fill', 500)
    save(near(ps, 267, 660), 'coin', 96)
    save(near(ps, 541, 668), 'gem', 96)
    save(near(ps, 845, 674), 'plus', 80)
    save(near(ps, 1073, 663), 'gear', 110)

    ps = pieces(tiles)
    for (x, y), n in zip([(29, 114), (771, 114), (29, 527), (771, 527)], ['quick', 'league', 'cup', 'daily']):
        save(near(ps, x, y), 'tile-' + n, 520, 86)

    ps = pieces(btns)
    for (x, n) in [(44, 'team'), (411, 'trophies'), (769, 'stats'), (1132, 'tutorial')]:
        b = near(ps, x, 216)
        if n == 'trophies':
            # the count under TROPHIES changes: paint it out with the button's cream, the hub writes it
            a = np.array(b)
            cream = a[int(a.shape[0] * 0.5), int(a.shape[1] * 0.12)].copy()
            y0, y1 = int(a.shape[0] * 0.765), int(a.shape[0] * 0.93)
            x0, x1 = int(a.shape[1] * 0.3), int(a.shape[1] * 0.7)
            a[y0:y1, x0:x1] = cream
            b = Image.fromarray(a)
        save(b, 'btn-' + n, 300)
    for (x, n) in [(203, 'sound'), (578, 'haptics'), (999, 'fielding')]:
        save(near(ps, x, 600), 'icon-' + n, 120)


if __name__ == '__main__':
    main()
