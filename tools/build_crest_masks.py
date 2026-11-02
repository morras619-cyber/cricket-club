#!/usr/bin/env python3
"""The crest builder's masks (img/crest-masks.png): every emblem of tools/build_club_logos.py as
grey layers, so the game can paint a crest in any two colours (js/crest.js). One cell per emblem
(4 across, in EMBLEMS order), two 192 px tiles side by side: RGB = body, trim details, ink outline |
outer trim ring, inner ink lines, unused.
usage: python3 tools/build_crest_masks.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from build_club_logos import EMBLEMS, S, HERE

T = 192


def layers(name):
    m, t = EMBLEMS[name]()
    M = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2))) / 255
    Tr = np.asarray(t.filter(ImageFilter.GaussianBlur(1))) / 255 * M
    r1 = np.asarray(m.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(1.5))) / 255
    r2 = np.asarray(m.filter(ImageFilter.MaxFilter(61)).filter(ImageFilter.GaussianBlur(2))) / 255
    edge = np.clip(np.asarray(t.filter(ImageFilter.MaxFilter(7))) / 255 - np.asarray(t) / 255, 0, 1) * M * 0.85
    # fitted in the square as the painted crests are (the outer ring's box, 176 of 192)
    ys, xs = np.nonzero(r2 > 0.004)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    k = 176 * 4 / max(x1 - x0, y1 - y0)
    out = []
    for a in (M, Tr, r1, r2, edge):
        im = Image.fromarray((a * 255).astype(np.uint8)).crop((x0, y0, x1, y1))
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        sq = Image.new('L', (S, S), 0); sq.paste(im, ((S - im.width) // 2, (S - im.height) // 2))
        out.append(sq.resize((T, T), Image.LANCZOS))
    return out


if __name__ == '__main__':
    names = list(EMBLEMS)
    atlas = Image.new('RGB', (4 * 2 * T, (len(names) + 3) // 4 * T))
    zero = Image.new('L', (T, T), 0)
    for i, n in enumerate(names):
        M, Tr, r1, r2, e = layers(n)
        x, y = i % 4 * 2 * T, i // 4 * T
        atlas.paste(Image.merge('RGB', (M, Tr, r1)), (x, y))
        atlas.paste(Image.merge('RGB', (r2, e, zero)), (x + T, y))
        print(i, n)
    atlas.save(os.path.join(HERE, '..', 'img', 'crest-masks.png'), optimize=True)
