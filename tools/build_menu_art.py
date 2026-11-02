#!/usr/bin/env python3
"""Cut the home-menu art into the pieces the hub uses (img/menu/*.webp).

usage: python3 tools/build_menu_art.py MOCKUP.png PASS.png TOPBAR.png TILES.png BUTTONS.png LOGO.png

MOCKUP is the full home screen (852 wide): the background (sky, stadium, batter) is taken from
its top, with the widgets of its top bar and its logo painted out (the hub draws both itself).
TILES are the four mode blocks with their titles; the small print under each title is painted
out, because the hub writes it (it changes: the league season, the money, the daily number).
The other sheets are transparent; each piece is cut to its own bounding box.
Needs numpy, scipy, Pillow and opencv-python-headless.
"""
import sys
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = 'img/menu/'
HELMET = (390, 447, 96, 110)  # the batter's helmet in the mockup: centre x, y and radii


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


def logo_spot(m, lg):
    """Where the mockup's logo is: (x, y, width) of the best edge match of LOGO over its top."""
    edges = lambda x: cv2.GaussianBlur(cv2.Canny(cv2.cvtColor(x, cv2.COLOR_RGB2GRAY), 60, 160).astype(np.float32), (5, 5), 0)
    pad = np.zeros((500, m.shape[1] + 250, 3), np.uint8)
    pad[:, 120:120 + m.shape[1]] = m[40:540]
    e = edges(pad)
    best = None
    for w in range(640, 900, 3):
        t = np.array(lg.resize((w, round(lg.height * w / lg.width)), Image.LANCZOS))
        rgb = t[..., :3].copy()
        rgb[t[..., 3] < 128] = 0
        _, score, _, (x, y) = cv2.minMaxLoc(cv2.matchTemplate(e, edges(rgb), cv2.TM_CCORR_NORMED))
        if best is None or score > best[0]:
            best = (score, x - 120, y + 40, w)
    _, x, y, w = best
    return max(0, x), y, w


def main():
    mock, pas, top, tiles, btns, logo = sys.argv[1:7]
    lg = Image.open(logo).convert('RGBA')
    lg = lg.crop(lg.getbbox())
    save(lg, 'logo', 900)

    # the background: paint out the mockup's top-bar widgets and its logo (found where the logo
    # matches best), leaving sky, stadium and batter
    m = np.array(Image.open(mock).convert('RGB'))[:826].copy()
    hole = np.zeros(m.shape[:2], np.uint8)
    for x0, y0, x1, y1 in [(14, 10, 338, 130), (340, 14, 512, 98), (514, 14, 664, 98), (668, 6, 760, 108), (762, 16, 840, 98)]:
        hole[y0:y1, x0:x1] = 1
    x, y, w = logo_spot(m, lg)
    a = np.array(lg.resize((w, round(lg.height * w / lg.width)), Image.LANCZOS))[..., 3] > 20
    a = a[:, :max(0, min(w, m.shape[1] - x))]
    hole = cv2.dilate(hole, np.ones((3, 3), np.uint8), iterations=6)
    # the logo's hole is grown more: the match is close, not exact, and the hub's logo goes back
    # on top of this spot (LOGO_SPOT in the stylesheet) so the smear never shows
    lh = np.zeros_like(hole)
    lh[y:y + a.shape[0], x:x + a.shape[1]] = a
    # but never into the batter's helmet, which the old logo only came close to
    yy, xx = np.mgrid[:hole.shape[0], :hole.shape[1]]
    r = ((xx - HELMET[0]) / HELMET[2]) ** 2 + ((yy - HELMET[1]) / HELMET[3]) ** 2
    lh = cv2.dilate(lh, np.ones((3, 3), np.uint8), iterations=14) & (r > 1)
    hole = (hole & (r > 1)) | lh
    print('logo spot in the background: x', x, 'y', y, 'width', w)
    bg = cv2.inpaint(m, hole * 255, 9, cv2.INPAINT_TELEA)
    # the logo's hole is sky: fill it with the blurred sky round it (not the helmet's outline,
    # which an inpaint drags up into streaks), the finest blur that reaches each pixel
    known = ((hole == 0) & (r > 1.25 ** 2)).astype(np.float32)
    fill = bg.astype(np.float32)
    left = lh.astype(bool)
    for sigma in (8, 16, 32, 64, 128):
        wsum = cv2.GaussianBlur(known, (0, 0), sigma)
        acc = cv2.GaussianBlur(m.astype(np.float32) * known[..., None], (0, 0), sigma)
        ok = left & (wsum > 0.15)
        fill[ok] = acc[ok] / wsum[ok][:, None]
        left &= ~ok
    soft = cv2.GaussianBlur(lh.astype(np.float32), (0, 0), 3)[..., None]
    bg = np.clip(fill * soft + bg.astype(np.float32) * (1 - soft), 0, 255).astype(np.uint8)
    save(Image.fromarray(bg), 'hero', q=88)

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

    t = Image.open(tiles).convert('RGBA')
    a = np.array(t)
    rgb = np.ascontiguousarray(a[..., :3])
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(int)
    hole = np.zeros(rgb.shape[:2], np.uint8)
    # the small print: dark on the yellow and green blocks, white on the blue and red ones
    for x0, y0, x1, y1, dark in [(165, 345, 500, 435, True), (950, 310, 1385, 445, False), (165, 775, 515, 855, False), (950, 765, 1230, 855, True)]:
        v, sat = hsv[y0:y1, x0:x1, 2], hsv[y0:y1, x0:x1, 1]
        hole[y0:y1, x0:x1] = (v < 110) if dark else ((v > 200) & (sat < 90))
    hole = cv2.dilate(hole, np.ones((5, 5), np.uint8), iterations=2)
    clean = np.dstack([cv2.inpaint(rgb, hole * 255, 7, cv2.INPAINT_TELEA), a[..., 3]])
    tmp = OUT + '_tiles.png'
    Image.fromarray(clean).save(tmp)
    ps = pieces(tmp)
    import os
    os.remove(tmp)
    for (x, y), n in zip([(115, 39), (908, 39), (115, 473), (908, 473)], ['quick', 'league', 'cup', 'daily']):
        save(near(ps, x, y), 'tile-' + n, 560, 88)

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
