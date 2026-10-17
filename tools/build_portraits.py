#!/usr/bin/env python3
"""Super League card portraits: cut the painted head-and-shoulders portraits out of their sheets
(transparent background, rows of 4, 4 and 2) and save the chosen one for each player as
img/cards/portraits/<key>.webp, the key being his name in lower case with dashes. Writes the list
to js/portraits-list.js.

usage: python3 tools/build_portraits.py SHEET1.png SHEET2.png SHEET3.png

PICK below says which portrait (sheet, number) goes to which player. The same man drawn more than
once is used only once. Needs numpy, scipy and Pillow.
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

PICK = {
    # Thunder Strikers
    'thunder-raja': (1, 3),
    'jake-thornton': (2, 1), 'dev-rana': (1, 1), 'andre-belgrave': (1, 4), 'sunny-bhatia': (1, 5),
    'zubair-khan': (1, 8), 'rocky-van-wyk': (1, 7), 'aamir-lodhi': (2, 10), 'rakibul-karim': (1, 6),
    'hamid-noorzai': (3, 9),
    # the rest of the league
    'jaspreet-dhillon': (2, 6), 'sipho-nkosi': (2, 2), 'james-whitfield': (2, 5), 'oliver-hartley': (1, 2),
    'mitchell-doyle': (2, 3), 'callum-fraser': (1, 9), 'siddharth-verma': (2, 7), 'arjun-iyer': (3, 1),
    'dinesh-wickramasinghe': (3, 4),
}


def pieces(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    lab, _ = ndi.label(ndi.binary_erosion(a[..., 3] > 40, iterations=2))
    objs = [s for s in ndi.find_objects(lab) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 15000]
    objs.sort(key=lambda s: (round(s[0].start / 200), s[1].start))
    boxes = [(s[1].start, s[0].start, s[1].stop, s[0].stop) for s in objs]
    if len(boxes) == 9:  # two portraits drawn touching: split them where they meet
        x0, y0, x1, y1 = boxes[1]
        boxes[1:2] = [(x0, y0, 523, y1), (523, y0, x1, y1)]
    assert len(boxes) == 10, (path, len(boxes))
    out = []
    for b in boxes:
        p = im.crop(b)
        out.append(p.crop(p.getbbox()))
    return out


def main():
    sheets = [pieces(p) for p in sys.argv[1:4]]
    for key, (s, n) in PICK.items():
        p = sheets[s - 1][n - 1]
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        p.save(f'img/cards/portraits/{key}.webp', 'WEBP', quality=88, method=6)
    keys = sorted(f[:-5] for f in os.listdir('img/cards/portraits') if f.endswith('.webp'))
    with open('js/portraits-list.js', 'w') as f:
        f.write('// Players with a painted Super League card portrait (img/cards/portraits/<key>.webp).\n')
        f.write('// Made by tools/build_portraits.py.\n')
        f.write('export const PORTRAIT_KEYS = [' + ', '.join(f"'{k}'" for k in keys) + '];\n')
    print(len(keys), 'portraits')


if __name__ == '__main__':
    main()
