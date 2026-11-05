#!/usr/bin/env python3
"""The sheet portraits are cut out from a sky-blue backdrop, and some of it stays trapped between strands of hair, a ponytail or a bun.
The game recolours every saturated blue to the club's shirt colour, so it shows up as blue behind the hair. This turns that blue into dark
hair in every close-up portrait (a head and neck, no blue shirt below it). Body shots (blue shirts) and headwear that is meant to be blue
(a headband, cap, turban or helmet in portrait-styles.js, or a listed key) are left alone. Rewrites img/cards/portraits/, the second portrait
picture, and nothing else. Run tools/build_portrait_looks.py afterwards (hair colour is read from the picture).

usage: python3 tools/clean_portrait_blue.py [key ...]   (from the repo root)
"""
import json
import os
import re
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

KEEP = {'rohit-grewal', 'varun-grewal', 'zubair-kakar', 'ehan-rizvi', 'tariq-mirza', 'callum-fraser', 'faizan-paracha', 'thunder-raja',
        'tanmay-bhalla', 'jermaine-granger', 'rhys-mckenzie', 'varun-menon', 'nuwan-jayasena', 'talha-hashmi', 'vihaan-mathur', 'rayyan-rind',
        'tanvirul-bhuiyan', 'sahil-nanda', 'nuwan-fonseka'}   # headwear in blue


def saturated_blue(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (b > 120) & (b > r + 60) & (b >= g + 15) & (a[..., 3] > 0)


def main(only):
    d = 'img/cards/portraits/'
    lst = open('js/portraits-list.js').read()
    where = json.loads(lst.split('PORTRAIT_ATLAS =', 1)[1].strip().rstrip(';'))
    atlas = Image.open('img/cards/portraits-more2.webp').convert('RGBA')
    st = open('js/portrait-styles.js').read()
    worn = set(re.findall(r"'([a-z0-9-]+)': '[^']*? (?:headband|cap|turban|pakol|helmet)", st))
    done = []
    for f in sorted(os.listdir(d)):
        k = f[:-5]
        if (only and k not in only) or k in KEEP or k in worn:
            continue
        a = np.array(Image.open(d + f).convert('RGBA')).astype(int)
        H = a.shape[0]
        sb = saturated_blue(a)
        if sb.sum() > 5000:   # a blue shirt (or helmet) takes far more blue than a few trapped patches: a body shot
            continue
        low = np.zeros(sb.shape, bool)
        low[int(H * 0.68):] = True
        sb &= ~(low & (a[..., 1] < 105))   # the shirt's dark collar at the bottom of a close-up stays blue; bright cyan backdrop does not
        # grow a little to take the blue's antialiased edge, but only through pixels that lean blue
        grow = ndi.binary_dilation(sb, iterations=3) & (a[..., 2] > a[..., 0] + 18) & (a[..., 3] > 0)
        m = sb | grow
        if m.sum() < 12:
            continue
        # the colour to use: the dark hair beside it
        dark = (a[..., 3] > 200) & ~m & (a.max(2) < 110)
        a[..., 0][m], a[..., 1][m], a[..., 2][m] = 26, 18, 16
        im = Image.fromarray(a.astype(np.uint8), 'RGBA')
        im.save(d + f, 'WEBP', quality=90, method=6)
        if k in where:
            x, y, w, h, n = where[k] if len(where[k]) == 5 else (*where[k], 0)
            if n == 1:
                atlas.paste(Image.new('RGBA', (w, h), (0, 0, 0, 0)), (x, y))
                atlas.paste(im, (x, y))
        done.append((k, int(m.sum())))
    atlas.save('img/cards/portraits-more2.webp', 'WEBP', quality=86, method=6)
    print(len(done), 'cleaned:', ', '.join(f'{k}({n})' for k, n in done))


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main(set(sys.argv[1:]))
