#!/usr/bin/env python3
"""More Super League card portraits: the last batch, cut out of six sheets (A: South Asian style, W: Western style) and
saved for the pictureless players it was matched to, as img/cards/portraits/<key>.webp (300 px wide, transparent
background). Adds them to js/portraits-list.js (the keys, and how old each looks: the career gives him that age) and
js/portrait-faces.js (the square of the picture that is his head, for the small squad photos). Then run
tools/build_portrait_looks.py for the skin and hair the player on the pitch takes from his picture.

usage: python3 tools/build_portraits_more.py S1 S2 S3 S7 S8 S9     (the six sheet files, in that order)

Each picture sits in a cell of its sheet (row, column of a grid; sheet 7 by pixels). The background is the sheet's white
(A) or its painted-on checkerboard (W): taken away from the edges in, up to the dark outline of the figure. Needs numpy,
scipy and Pillow.
"""
import json
import os
import re
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# face: (sheet, how to cut the cell, background, age he looks)
#   grid cell: ('g', row, col, columns, rows)      sheet 7: ('px', x0, y0, x1, y1)   keep: optional fractions of the figure to keep
# who gets it: key -> face
PLAYERS = {
    # India
    'rohit-grewal': 'A8', 'varun-iyer': 'A3', 'pranav-iyer': 'A14', 'aditya-nanda': 'A17', 'reyansh-saxena': 'A19',
    # Bangladesh
    'sajid-chowdhury': 'A5', 'sajid-bhuiyan': 'A13', 'nazmul-bhuiyan': 'A18', 'imon-molla': 'A12',
    # Sri Lanka
    'malith-jayasena': 'A9', 'chathura-wickramasinghe': 'A10', 'tharindu-wickramasinghe': 'A15',
    # Pakistan
    'haris-paracha': 'A1', 'muneeb-awan': 'A7', 'faizan-paracha': 'A11',
    # Afghanistan
    'zubair-noorzai': 'A4', 'naveed-barakzai': 'A6', 'wahid-noorzai': 'A2',
    # New Zealand
    'corbin-galloway': 'W2', 'rhys-mckenzie': 'W8', 'ollie-dunlop': 'W6',
    # South Africa
    'tristan-coetzee': 'W1', 'dewald-pienaar': 'W3', 'wiaan-coetzee': 'W7',
    # Australia
    'mason-barlow': 'W5', 'darcy-penrith': 'W4',
    # England
    'archie-holloway': 'W9', 'oscar-marsden': 'W10',
}
FACES = {
    'A1': (1, ('g', 0, 0, 4, 2), 'white', 34), 'A2': (1, ('g', 0, 1, 4, 2), 'white', 38), 'A3': (1, ('g', 0, 2, 4, 2), 'white', 28),
    'A4': (1, ('g', 0, 3, 4, 2), 'white', 31), 'A5': (1, ('g', 1, 0, 4, 2), 'white', 27), 'A6': (1, ('g', 1, 1, 4, 2), 'white', 30),
    'A7': (1, ('g', 1, 2, 4, 2), 'white', 33), 'A8': (1, ('g', 1, 3, 4, 2), 'white', 26),
    'A9': (2, ('g', 0, 0, 4, 2), 'white', 27), 'A10': (2, ('g', 0, 2, 4, 2), 'white', 21), 'A11': (2, ('g', 0, 3, 4, 2), 'white', 29),
    'A12': (2, ('g', 1, 1, 4, 2), 'white', 24), 'A13': (2, ('g', 1, 2, 4, 2), 'white', 22),
    'A14': (3, ('g', 0, 0, 4, 2), 'white', 25), 'A15': (3, ('g', 0, 1, 4, 2), 'white', 26),
    'A17': (7, ('px', 10, 10, 411, 840), 'white', 25), 'A18': (7, ('px', 1275, 880, 1676, 1690), 'white', 21),
    'A19': (7, ('px', 10, 1710, 833, 2498), 'white', 23, (0.2, 0.0, 0.88, 1.0)),
    'W1': (8, ('g', 0, 0, 3, 2), 'checker', 31, (0.0, 0.0, 0.88, 1.0)), 'W2': (8, ('g', 0, 1, 3, 2), 'checker', 25), 'W3': (8, ('g', 0, 2, 3, 2), 'checker', 36),
    'W4': (8, ('g', 1, 0, 3, 2), 'checker', 29), 'W5': (8, ('g', 1, 1, 3, 2), 'checker', 28), 'W6': (8, ('g', 1, 2, 3, 2), 'checker', 27),
    'W7': (9, ('g', 0, 1, 3, 2), 'checker', 32), 'W8': (9, ('g', 0, 2, 3, 2), 'checker', 25), 'W9': (9, ('g', 1, 0, 3, 2), 'checker', 29),
    'W10': (9, ('g', 1, 2, 3, 2), 'checker', 27),
}
HOLES = {'A17', 'A18'}   # the white seen through the crook of an arm is background too (nothing white is held in them)
SHEETS = {1: 0, 2: 1, 3: 2, 7: 3, 8: 4, 9: 5}   # sheet number -> its place on the command line


def cell(im, spec):
    w, h = im.size
    if spec[0] == 'px':
        return im.crop(spec[1:])
    _, r, c, cols, rows = spec
    cw, ch = w / cols, h / rows
    m, mt = 10, (34 if r else 10)   # (a second row starts under the first row's hands: leave out the bit of it that reaches down)
    return im.crop((int(c * cw) + m, int(r * ch) + mt, int((c + 1) * cw) - m, int((r + 1) * ch) - m))


def cut_out(im, kind, holes=False):
    a = np.array(im.convert('RGB')).astype(np.int16)
    lo = a.min(2)
    chroma = a.max(2) - lo
    like = (lo >= 232) & (chroma < 16) if kind == 'white' else (lo >= 196) & (chroma < 24)
    lab, _ = ndi.label(like)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    if holes:
        soft = (lo >= 205) & (chroma < 34) & ~bg   # (the white in a crook is a little greyed by its outline)
        enclosed, k = ndi.label(soft)
        for i, n in enumerate(ndi.sum(soft, enclosed, range(1, k + 1)), 1):
            if n > 250: bg |= ndi.binary_dilation(enclosed == i, iterations=2) & (lo >= 150) & (chroma < 60)
    fg = ~bg
    # only this man: the biggest shape, a little grown (a ball or a neighbour's bat on its own goes)
    lab2, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, lab2, range(1, n + 1))
        fg = ndi.binary_dilation(lab2 == (np.argmax(sizes) + 1), iterations=2) & fg
    fg = ndi.binary_fill_holes(fg)
    alpha = np.clip(ndi.gaussian_filter(fg.astype(np.float32), 0.8) * 1.6 - 0.15, 0, 1)
    # the edge keeps the colour of the figure, not of the white behind it
    inner = ndi.binary_erosion(fg, iterations=2)
    idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    rgb = np.array(im.convert('RGB'))
    rgb = rgb[idx[0], idx[1]] * (~inner)[..., None] + rgb * inner[..., None]
    out = np.dstack([rgb, (alpha * 255).astype(np.uint8)]).astype(np.uint8)
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
    paths = sys.argv[1:]
    sheets = {n: Image.open(paths[i]) for n, i in SHEETS.items()}
    faces = json.loads(open('js/portrait-faces.js').read().split('=', 1)[1].strip().rstrip(';'))
    lst = open('js/portraits-list.js').read()
    keys = set(re.findall(r"'([a-z0-9-]+)'", lst.split('PORTRAIT_AGE')[0]))
    ages = dict((k, int(v)) for k, v in re.findall(r"'([a-z0-9-]+)': (\d+)", lst.split('PORTRAIT_AGE')[1]))
    assert len(set(PLAYERS.values())) == len(PLAYERS), 'a face used twice'
    for key, fid in PLAYERS.items():
        sheet, spec, kind, age, *keep = FACES[fid]
        p = cut_out(cell(sheets[sheet], spec), kind, fid in HOLES)
        if keep:
            x0, y0, x1, y1 = keep[0]
            p = p.crop((int(p.width * x0), int(p.height * y0), int(p.width * x1), int(p.height * y1)))
            p = p.crop(p.getbbox())
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        p.save(f'img/cards/portraits/{key}.webp', 'WEBP', quality=88, method=6)
        faces[key] = face_square(p)
        keys.add(key); ages[key] = age
    with open('js/portrait-faces.js', 'w') as f:
        f.write('export const PORTRAIT_FACES = ' + json.dumps(dict(sorted(faces.items())), separators=(',', ':')) + ';\n')
    with open('js/portraits-list.js', 'w') as f:
        f.write('// Players with a painted Super League card portrait (img/cards/portraits/<key>.webp).\n')
        f.write('// Made by tools/build_portraits.py and tools/build_portraits_more.py.\n')
        f.write('export const PORTRAIT_KEYS = [' + ', '.join(f"'{k}'" for k in sorted(keys)) + '];\n')
        f.write('// how old each painted player looks: his Super League age in season 1\n')
        f.write('export const PORTRAIT_AGE = {' + ', '.join(f"'{k}': {v}" for k, v in ages.items()) + '};\n')
    print(len(PLAYERS), 'portraits added;', len(keys), 'in all')


if __name__ == '__main__':
    main()
