#!/usr/bin/env python3
"""Super League card portraits: cut the painted head-and-shoulders portraits out of their sheets
(transparent background, rows of 4, 4 and 2) and save the chosen one for each player as
img/cards/portraits/<key>.webp, the key being his name in lower case with dashes. Writes the list
to js/portraits-list.js.

usage: python3 tools/build_portraits.py SHEET1.png ... SHEET6.png

PICK below says which portrait (sheet, number) goes to which player, and how old he looks: the
Super League gives him that age, so a young face is never 30. The same man drawn more than once is
used only once. Needs numpy, scipy and Pillow.
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

PICK = {
    # key: (sheet, number, age he looks)
    # Thunder Strikers
    'thunder-raja': (1, 3, 25),
    'jake-thornton': (2, 1, 23), 'dev-rana': (1, 1, 30), 'andre-belgrave': (1, 4, 29), 'sunny-bhatia': (1, 5, 29),
    'zubair-khan': (1, 8, 30), 'rocky-van-wyk': (1, 7, 28), 'aamir-lodhi': (2, 10, 28), 'rakibul-karim': (1, 6, 20),
    'hamid-noorzai': (3, 9, 27),
    # the rest of the league
    'jaspreet-dhillon': (2, 6, 29), 'sipho-nkosi': (2, 2, 27), 'james-whitfield': (2, 5, 31), 'oliver-hartley': (1, 2, 21),
    'mitchell-doyle': (2, 3, 28), 'callum-fraser': (1, 9, 26), 'siddharth-verma': (2, 7, 22), 'arjun-iyer': (3, 1, 23),
    'dinesh-wickramasinghe': (3, 4, 22),
    # sheet 4: young players, 19 to 24 (its #1 is Jake Thornton again and #3 Rakibul Karim, #9 is left out)
    'thabo-mthembu': (4, 2, 19), 'liam-buckley': (4, 4, 21), 'rizwan-akram': (4, 5, 22), 'finn-gallagher': (4, 6, 22),
    'aarav-nair': (4, 7, 23), 'shane-granger': (4, 8, 23), 'kunal-saini': (4, 10, 21),
    # sheets 5 and 6: experienced players, 29 and up. Left out as the same man again: 5#10 (5#1),
    # 6#1 (5#2), 6#3 (5#3), 6#6 (5#7); and as lookalikes of men already on cards: 5#2 (Mitchell
    # Doyle), 5#7 and 6#8 (Jake Thornton), 5#9 (Andre Belgrave), 6#4 (Finn Gallagher), 6#5 (Jaspreet Dhillon)
    'faisal-naqvi': (5, 1, 31), 'fawad-bhatt': (5, 3, 30), 'marlon-greaves': (5, 4, 32), 'henry-blackwood': (5, 5, 33),
    'yuvraj-sodhi': (5, 6, 30), 'tariq-mirza': (5, 8, 31), 'jermaine-alleyne': (6, 2, 29), 'tendai-moyo': (6, 7, 30),
    'ashik-talukder': (6, 9, 29), 'corbin-hayes': (6, 10, 31),
}


def pieces(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    lab, _ = ndi.label(ndi.binary_erosion(a[..., 3] > 40, iterations=2))
    objs = [s for s in ndi.find_objects(lab) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 15000]
    objs.sort(key=lambda s: (round(s[0].start / 200), s[1].start))
    boxes = [(s[1].start, s[0].start, s[1].stop, s[0].stop) for s in objs]
    if len(boxes) == 9:  # two portraits drawn touching: split the wide one down its middle
        i = max(range(4), key=lambda k: boxes[k][2] - boxes[k][0])
        x0, y0, x1, y1 = boxes[i]
        cut = {1: 523}.get(i, (x0 + x1) // 2)
        boxes[i:i + 1] = [(x0, y0, cut, y1), (cut, y0, x1, y1)]
    assert len(boxes) == 10, (path, len(boxes))
    out = []
    for b in boxes:
        p = np.array(im.crop(b))
        # only this player: the biggest shape in the box (not a neighbour's bat poking in)
        lab, n = ndi.label(p[..., 3] > 30)
        if n > 1:
            big = lab == (np.argmax(ndi.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1)
            p[..., 3] = np.where(ndi.binary_dilation(big, iterations=3), p[..., 3], 0)
        p = Image.fromarray(p, 'RGBA')
        out.append(p.crop(p.getbbox()))
    return out


def main():
    sheets = [pieces(p) for p in sys.argv[1:]]
    for key, (s, n, _) in PICK.items():
        p = sheets[s - 1][n - 1]
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        p.save(f'img/cards/portraits/{key}.webp', 'WEBP', quality=88, method=6)
    keys = sorted(f[:-5] for f in os.listdir('img/cards/portraits') if f.endswith('.webp'))
    with open('js/portraits-list.js', 'w') as f:
        f.write('// Players with a painted Super League card portrait (img/cards/portraits/<key>.webp).\n')
        f.write('// Made by tools/build_portraits.py.\n')
        f.write('export const PORTRAIT_KEYS = [' + ', '.join(f"'{k}'" for k in keys) + '];\n')
        f.write('// how old each painted player looks: his Super League age in season 1\n')
        f.write('export const PORTRAIT_AGE = {' + ', '.join(f"'{k}': {v[2]}" for k, v in PICK.items()) + '};\n')
    print(len(keys), 'portraits')


if __name__ == '__main__':
    main()
