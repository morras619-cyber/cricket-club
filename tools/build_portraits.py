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
    # sheet 7: batch 1 of the missing players (its #7 came out wrong and was redrawn as sheet 8)
    'aryan-malhotra': (7, 1, 28), 'faraz-mirza': (7, 2, 28), 'saad-ahmed': (7, 3, 27), 'yasir-abbasi': (7, 4, 33),
    'hamza-iqbal': (7, 5, 19), 'shoaib-raza': (7, 6, 29), 'bilawal-gul': (8, 1, 29), 'danish-haider': (7, 8, 25),
    'nadir-sheikh': (7, 9, 35), 'bilal-akhtar': (7, 10, 22),
    # sheet 9: batch 2. Left out as lookalikes: #2 (Faisal Naqvi) and #4 (Nadir Sheikh)
    'shoaib-haider': (9, 1, 26), 'danish-iqbal': (9, 3, 24), 'rizwan-khan': (9, 5, 27), 'kashif-lone': (9, 6, 23),
    'hamza-nawaz': (9, 7, 34), 'ehan-rizvi': (9, 8, 24), 'hamid-usmani': (9, 9, 32), 'zain-mirza': (9, 10, 28),
    # sheet 10: those two redrawn
    'sameer-raza': (10, 1, 30), 'sameer-javed': (10, 2, 31),
    # sheet 11: batch 3, Indian players. #5 is left out (Rizwan Khan's lookalike); #8 is kept for
    # the negotiator, the agent who'll talk to you between seasons (img/people/negotiator.webp)
    'rohan-pillai': (11, 1, 27), 'ankit-desai': (11, 2, 25), 'varun-gill': (11, 3, 28), 'dev-kulkarni': (11, 4, 34),
    'harsh-reddy': (11, 6, 26), 'priyank-yadav': (11, 7, 22), 'ravi-malik': (11, 9, 29), 'neel-chawla': (11, 10, 28),
}
# not a player: portraits kept for other parts of the game, [sheet, number, file]
EXTRA = [(11, 8, 'img/people/negotiator.webp')]


def pieces(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    lab, _ = ndi.label(ndi.binary_erosion(a[..., 3] > 40, iterations=2))
    objs = [s for s in ndi.find_objects(lab) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 15000]
    objs.sort(key=lambda s: (round(s[0].start / 200), s[1].start))
    boxes = [(s[1].start, s[0].start, s[1].stop, s[0].stop) for s in objs]
    # portraits drawn touching come out as one wide box: split it where the fewest columns are
    # painted (the gap between the two), until every box in the rows of four is one portrait wide
    op = a[..., 3] > 40
    W = a.shape[1]
    if len(boxes) < 4:  # one or two portraits on their own: the big shapes, left to right
        big = max((b[2] - b[0]) * (b[3] - b[1]) for b in boxes)
        return [crop_one(im, b) for b in sorted((b for b in boxes if (b[2] - b[0]) * (b[3] - b[1]) > big * 0.4), key=lambda b: b[0])]
    out_boxes = []
    for b in boxes:
        todo = [b]
        while todo:
            x0, y0, x1, y1 = todo.pop()
            if (x1 - x0) < W * 0.37 or y0 > a.shape[0] * 0.62:
                out_boxes.append((x0, y0, x1, y1)); continue
            col = op[y0:y1, x0:x1].mean(0)
            lo, hi = int((x1 - x0) * 0.3), int((x1 - x0) * 0.7)
            cut = x0 + lo + int(np.argmin(col[lo:hi]))
            todo += [(cut, y0, x1, y1), (x0, y0, cut, y1)]
    boxes = sorted(out_boxes, key=lambda b: (round(b[1] / 200), b[0]))
    assert len(boxes) == 10, (path, len(boxes))
    return [crop_one(im, b) for b in boxes]


def crop_one(im, b):
    p = np.array(im.crop(b))
    # only this player: the biggest shape in the box (not a neighbour's bat poking in)
    lab, n = ndi.label(p[..., 3] > 30)
    if n > 1:
        big = lab == (np.argmax(ndi.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1)
        p[..., 3] = np.where(ndi.binary_dilation(big, iterations=3), p[..., 3], 0)
    p = Image.fromarray(p, 'RGBA')
    return p.crop(p.getbbox())


def main():
    sheets = [pieces(p) for p in sys.argv[1:]]
    for key, (s, n, _) in PICK.items():
        p = sheets[s - 1][n - 1]
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        p.save(f'img/cards/portraits/{key}.webp', 'WEBP', quality=88, method=6)
    for s, n, path in EXTRA:
        p = sheets[s - 1][n - 1]
        p.resize((400, round(p.height * 400 / p.width)), Image.LANCZOS).save(path, 'WEBP', quality=90, method=6)
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
