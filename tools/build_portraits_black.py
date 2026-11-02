#!/usr/bin/env python3
"""Card portraits from the three black-background sheets (tools/portraits/black-1.png ... black-3.png: 1536 x 1024 each,
four panels of ten faces, two rows of five; the second and third have a country caption under each face).

Each pick below says which face (sheet, panel, place) goes to which player and how old he looks. The faces are cut out
of the black (cells found as shapes, touching ones split at their emptiest column, a caption cut off), grown to 300 px
wide and saved as img/cards/portraits/<key>.webp; the batch also goes into one picture, img/cards/portraits-more2.webp
(the game's file limit), and into js/portraits-list.js (keys, ages, where each is in the picture) and
js/portrait-faces.js (the square of the picture that is his head, for the small squad photos). Then run
tools/build_portrait_looks.py for the skin and hair the player on the pitch takes from his picture, and add his cut,
beard and headwear to js/portrait-styles.js.

These sheets repeat themselves: the same few men drawn again and again with another pose or a hat. A face is used only if
no other picked face is the same man and no portrait already in the game is (the ones left out for that: the turbans, the
pakol, the ginger beard, the blond headband, the long dreads, the bleached twists, the curly-top and quiff men with a
beard, the smiling curls, the black fringes, the second headband, the second brown beard).

usage: python3 tools/build_portraits_black.py            (from the repo root; needs numpy, scipy and Pillow)
"""
import json
import os
import re
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

SHEETS = {'S1': 'tools/portraits/black-1.png', 'S2': 'tools/portraits/black-2.png', 'S3': 'tools/portraits/black-3.png'}
# key: (face id 'S<sheet>_<row><column>_<place>' (panel row, panel column, 0-9 in reading order), age he looks)
PICKS = {
    # West Indies
    'jermaine-thorpe': ('S2_00_03', 24),   # cornrows, ball at his chin
    'tevin-baptiste': ('S2_00_04', 22),    # tight curls, a tuft on the chin
    'shamar-greaves': ('S1_00_04', 27),    # close fade, a strip of beard
    'shane-phillip': ('S2_01_05', 25),     # platinum buzz cut
    # Australia
    'flynn-brennan': ('S3_01_00', 22),     # blond waves, ball
    'riley-thornton': ('S2_01_04', 23),    # messy brown fringe, bat on the shoulder
    'cooper-thornton': ('S3_01_09', 29),   # brown top, short full beard, bat
    'kai-whitaker': ('S1_01_06', 24),      # brown fade, dark sunglasses
    # New Zealand
    'nikau-kerr': ('S1_01_09', 26),        # braids pulled back
    'blake-ruawai': ('S2_11_05', 22),      # golden curls
    # South Asia
    'ahsan-gondal': ('S1_11_02', 27),      # dark curls, a red headband, goatee
    'fazal-shinwari': ('S3_10_04', 29),    # wavy hair, full beard
    'aarav-menon': ('S1_00_08', 25),       # black waves, glasses, goatee
}
OUT = 'img/cards/portraits/'
ATLAS = 'img/cards/portraits-more2.webp'
ATLAS_NO = 1   # which of the game's portrait pictures (js/futcard.js PORTRAIT_FILES)
COLS = 5


def cells(path, sheet):
    """every face on a sheet as its own picture, by id 'S<n>_<row><col>_<place>'"""
    im = Image.open(path).convert('RGB')
    fg = np.array(im).max(2) > 14
    out = {}
    for qy in range(2):
        for qx in range(2):
            x0, x1 = qx * 768 + (4 if qx else 0), (qx + 1) * 768 - (0 if qx else 4)
            y0, y1 = qy * 512 + (4 if qy else 0), (qy + 1) * 512 - (0 if qy else 4)
            q = fg[y0:y1, x0:x1]
            lab, _ = ndi.label(ndi.binary_closing(q, iterations=3))
            boxes = [[s[1].start, s[0].start, s[1].stop, s[0].stop] for s in ndi.find_objects(lab)
                     if s[0].stop - s[0].start > 120 and s[1].stop - s[1].start > 60]
            todo, fin = list(boxes), []
            while todo:   # (faces drawn touching: cut where the picture is emptiest)
                b = todo.pop()
                w = b[2] - b[0]
                if w > 1.45 * 150:
                    k = round(w / 150)
                    ex = b[0] + w / k
                    lo, hi = int(ex - 25), int(ex + 25)
                    cut = lo + int(np.argmin(q[b[1]:b[3], lo:hi].mean(0)))
                    todo += [[b[0], b[1], cut, b[3]], [cut, b[1], b[2], b[3]]]
                else:
                    fin.append(b)
            fin.sort(key=lambda b: (b[1] > 120, b[0]))
            assert len(fin) == 10, (path, qy, qx, len(fin))
            for i, b in enumerate(fin):
                out[f'{sheet}_{qy}{qx}_{i:02d}'] = im.crop((x0 + b[0] + 2, y0 + b[1] + 2, x0 + b[2] - 2, y0 + b[3] - 2))
    return out


def cut_out(im, caption):
    """the face on its own: the black taken away from the edges in, a caption under it cut off, the biggest shape kept"""
    a = np.array(im.convert('RGB')).astype(np.int16)
    if caption:   # a black gap, then the country's name
        rowmax = a.max(2).max(1)
        y = int(len(rowmax) * 0.72)
        while y < len(rowmax) - 2:
            if rowmax[y] <= 14 and rowmax[y + 1] <= 14:
                im = im.crop((0, 0, im.width, y)); a = a[:y]
                break
            y += 1
    dark = a.max(2) <= 10
    core = ndi.binary_opening(dark, structure=np.ones((3, 3)), iterations=1)   # (a hair-thin dark channel is not background)
    lab, _ = ndi.label(core)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = ndi.binary_dilation(np.isin(lab, list(edge)), iterations=1) & dark
    fg = ~bg
    l2, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, l2, range(1, n + 1))
        fg = ndi.binary_dilation(l2 == (np.argmax(sizes) + 1), iterations=2) & fg
    fg = ndi.binary_fill_holes(fg)
    alpha = np.clip(ndi.gaussian_filter(fg.astype(np.float32), 0.7) * 1.5 - 0.1, 0, 1)
    out = np.dstack([np.array(im.convert('RGB')), (alpha * 255).astype(np.uint8)]).astype(np.uint8)
    p = Image.fromarray(out, 'RGBA')
    return p.crop(p.getbbox())


def face_square(p):
    """[x, y, size] of the square of the picture that holds his head and shoulders (the squad photos)."""
    a = np.array(p).astype(np.float32)
    H = a.shape[0]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    skin = (a[..., 3] > 200) & (r > g) & (g > b) & (r > 90) & (r - b > 35) & (r < 250)
    skin[int(H * 0.42):] = False
    xs = np.nonzero(skin)[1]
    cx = float(np.median(xs)) if xs.size > 50 else p.width / 2
    s = round(0.65 * H)
    return [round(cx - s / 2), -round(0.065 * H), s]


def main():
    faces = {}
    for sheet, path in SHEETS.items():
        faces.update(cells(path, sheet))
    assert len({v[0] for v in PICKS.values()}) == len(PICKS), 'a face used twice'
    made = {}
    for key, (fid, age) in PICKS.items():
        p = cut_out(faces[fid], caption=not fid.startswith('S1'))
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        a = p.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.4, percent=45, threshold=2))   # (grown 1.8 times: a little crispness back)
        p = Image.merge('RGBA', (*a.split(), p.getchannel('A')))
        p.save(f'{OUT}{key}.webp', 'WEBP', quality=90, method=6)
        made[key] = (p, age)
    cellh = max(p.height for p, _ in made.values())
    rows = -(-len(made) // COLS)
    atlas = Image.new('RGBA', (COLS * 300, rows * cellh), (0, 0, 0, 0))
    where = {}
    for i, (key, (p, _)) in enumerate(sorted(made.items())):
        x, y = (i % COLS) * 300, (i // COLS) * cellh
        atlas.paste(p, (x, y)); where[key] = [x, y, 300, p.height, ATLAS_NO]
    atlas.save(ATLAS, 'WEBP', quality=90, method=6)
    # the lists: what was there stays
    lst = open('js/portraits-list.js').read()
    keys = set(re.findall(r"'([a-z0-9-]+)'", lst.split('PORTRAIT_AGE')[0]))
    ages = dict((k, int(v)) for k, v in re.findall(r"'([a-z0-9-]+)': (\d+)", lst.split('PORTRAIT_AGE')[1].split('PORTRAIT_ATLAS')[0]))
    atlas_old = json.loads(lst.split('PORTRAIT_ATLAS =', 1)[1].strip().rstrip(';'))
    faces_js = json.loads(open('js/portrait-faces.js').read().split('=', 1)[1].strip().rstrip(';'))
    for key, (p, age) in made.items():
        keys.add(key); ages[key] = age; atlas_old[key] = where[key]; faces_js[key] = face_square(p)
    with open('js/portrait-faces.js', 'w') as f:
        f.write('export const PORTRAIT_FACES = ' + json.dumps(dict(sorted(faces_js.items())), separators=(',', ':')) + ';\n')
    with open('js/portraits-list.js', 'w') as f:
        f.write('// Players with a painted Super League card portrait (img/cards/portraits/<key>.webp).\n')
        f.write('// Made by tools/build_portraits.py, tools/build_portraits_more.py and tools/build_portraits_black.py.\n')
        f.write('export const PORTRAIT_KEYS = [' + ', '.join(f"'{k}'" for k in sorted(keys)) + '];\n')
        f.write('// how old each painted player looks: his Super League age in season 1\n')
        f.write('export const PORTRAIT_AGE = {' + ', '.join(f"'{k}': {v}" for k, v in ages.items()) + '};\n')
        f.write('// the last batches live in a few pictures (img/cards/portraits-more.webp, -more2.webp: js/futcard.js PORTRAIT_FILES): where each is, [x, y, w, h, picture]\n')
        f.write('export const PORTRAIT_ATLAS = ' + json.dumps(atlas_old, separators=(',', ':')) + ';\n')
    print(len(made), 'portraits added;', len(keys), 'in all')


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main()
