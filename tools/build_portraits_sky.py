#!/usr/bin/env python3
"""Card portraits from the two sky-background sheets (tools/portraits/sky-1.png and sky-2.png: 1586 x 992 each, five rows of
gold-framed tiles: 9, 9, 9, 10, 10 on the first sheet and 8 x 5 on the second).

Each tile is found as a column run between the dark gaps of its row; the painted sky behind the head is taken away with
OpenCV's GrabCut (the head and shoulders are the foreground, the frame's edge and the corners the background), the head is
grown to 300 px wide and saved as img/cards/portraits/<key>.webp. The batch is also added to the bottom of the second
portrait picture (img/cards/portraits-more2.webp: the game's file limit means no new picture), to js/portraits-list.js (keys,
ages, where each is in the picture), js/portrait-faces.js (the head square, for the small squad photos) and
js/portrait-styles.js (haircut, beard and headwear, read by eye). Then run tools/build_portrait_looks.py for the skin and hair
the player on the pitch takes from his picture.

The sheets repeat the same men with another smile, hat or pose: only one face of each man was used, so no two players share a
face, and none is a man already in the game. 87 faces on the sheets, 54 used; the rest are repeats or were not needed.

usage: python3 tools/build_portraits_sky.py            (from the repo root; needs numpy, scipy, Pillow and opencv-python)
"""
import json
import os
import re
import cv2
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

SHEETS = {'A': ('tools/portraits/sky-1.png', [(4, 207, 9), (211, 411, 9), (416, 607, 9), (611, 794, 10), (798, 987, 10)]),
          'B': ('tools/portraits/sky-2.png', [(10, 202, 8), (207, 404, 8), (409, 602, 8), (611, 791, 8), (795, 988, 8)])}
# key: (face id 'A<n>' / 'B<n>' counted in reading order from 1, the age he looks, his cut, beard and headwear (portrait-styles.js))
PICKS = {
    'aarav-sharma': ('A12', 22, 'curly -'),
    'andre-granger': ('B28', 22, 'spiky -'),
    'archie-holloway': ('B01', 22, 'messy -'),
    'arif-mia': ('A13', 24, 'buzz -'),
    'arif-sikder': ('A20', 25, 'curly goatee'),
    'ashik-molla': ('B34', 29, 'curly full'),
    'charlie-fairbairn': ('B08', 28, 'messy full'),
    'corbin-kerr': ('B02', 23, 'part -'),
    'dewald-pienaar': ('B12', 29, 'messy full'),
    'dinesh-fonseka': ('A24', 27, 'part full'),
    'farhan-sarkar': ('A15', 23, 'curly stubble'),
    'haris-hashmi': ('A08', 27, 'curly full'),
    'haris-paracha': ('A01', 26, 'messy full'),
    'imon-hossain': ('A33', 26, 'buzz goatee'),
    'imon-molla': ('A04', 21, 'curly -'),
    'ishaan-saxena': ('A16', 22, 'part -'),
    'kasun-fonseka': ('A23', 21, 'curly -'),
    'lachie-pollock': ('B07', 23, 'curly -'),
    'malith-bandara': ('A19', 26, 'part stubble shades'),
    'marlon-thorpe': ('B10', 25, 'buzz -'),
    'mason-mcallister': ('B39', 25, 'messy -'),
    'mpho-ndlovu': ('B13', 27, 'curly stubble'),
    'mpho-nkosi': ('B05', 23, 'buzz -'),
    'niroshan-ekanayake': ('A06', 25, 'messy goatee'),
    'niroshan-rajapaksa-perera': ('B24', 23, 'spiky -'),
    'nuwan-jayasena': ('A29', 27, 'messy moustache cap #2f5fc4'),
    'qais-safi': ('A41', 32, 'bald full'),
    'qais-tarakai': ('A45', 28, 'messy full shades'),
    'rafiq-talukder': ('A18', 29, 'bun full'),
    'ravindu-ekanayake': ('A31', 25, 'part moustache'),
    'ravindu-wickramasinghe': ('A47', 29, 'curly -'),
    'rayyan-rind': ('A22', 28, 'curly full headband #3a5ca8'),
    'reyansh-nanda': ('A39', 23, 'buzz -'),
    'reyansh-saxena': ('A11', 29, 'part full'),
    'ruan-mokoena': ('B25', 24, 'dreads -'),
    'saad-hashmi': ('A03', 27, 'buzz full'),
    'sahil-bhalla': ('A25', 30, '- full turban'),
    'sahil-sharma': ('A09', 28, 'part moustache'),
    'sajid-khondaker': ('B30', 24, 'curly -'),
    'sajid-sikder': ('A38', 28, 'messy goatee cap #2e6b4a'),
    'sajid-talukder': ('A02', 24, 'part stubble'),
    'talha-hashmi': ('B21', 27, 'messy full cap #2f5fc4'),
    'tane-galloway': ('B22', 24, 'long -'),
    'tanmay-kulkarni': ('A10', 24, 'curly stubble'),
    'tanvirul-bhuiyan': ('B06', 24, 'curly - headband #26407a'),
    'thabo-botha': ('B38', 26, 'ponytail -'),
    'tharindu-ekanayake': ('B23', 28, 'curly full'),
    'varun-grewal': ('A05', 27, '- full turban #26407a'),
    'varun-menon': ('A14', 25, 'messy stubble cap #2f5fc4'),
    'vihaan-mathur': ('B16', 24, 'messy - cap #2f5fc4'),
    'wahid-noorzai': ('A17', 28, 'messy full'),
    'yash-menon': ('B29', 28, 'buzz full'),
    'zain-awan': ('A28', 30, 'buzz full'),
    'zubair-noorzai': ('A07', 38, 'part full'),
}
OUT = 'img/cards/portraits/'
ATLAS = 'img/cards/portraits-more2.webp'
ATLAS_NO = 1   # which of the game's portrait pictures (js/futcard.js PORTRAIT_FILES)
COLS = 5


def runs(mask):
    out, s = [], None
    for i, v in enumerate(mask):
        if v and s is None:
            s = i
        if not v and s is not None:
            out.append((s, i)); s = None
    if s is not None:
        out.append((s, len(mask)))
    return out


def tiles():
    """every face on the sheets as its own picture, by id"""
    out = {}
    for sheet, (path, rows) in SHEETS.items():
        im = Image.open(path).convert('RGB')
        lum = np.asarray(im).max(2)
        i = 0
        for y0, y1, n in rows:
            band = lum[y0 + 8:y1 - 8]
            cols = [r for r in runs(~((band < 70).mean(0) > 0.9)) if r[1] - r[0] > 90]
            assert len(cols) == n, (sheet, y0, len(cols))
            for x0, x1 in cols:
                a0 = max(0, y0 - 6)
                bright = (lum[a0:y1 + 6, x0:x1] >= 70).mean(1) > 0.5
                ys = np.nonzero(bright)[0]
                i += 1
                out[f'{sheet}{i:02d}'] = im.crop((x0, a0 + int(ys.min()), x1, a0 + int(ys.max()) + 1))
    return out


def cut_out(tile, inset=9):
    """the head and shoulders on their own: GrabCut with the middle as the foreground and the edges as the sky"""
    w, h = tile.size
    im = tile.crop((inset, inset, w - inset, h - inset))
    a = np.asarray(im)[:, :, ::-1].copy()
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    m = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
    cx, cy = W * 0.5, H * 0.50
    m[((xx - cx) / (W * 0.46)) ** 2 + ((yy - cy) / (H * 0.60)) ** 2 < 1] = cv2.GC_PR_FGD   # (hair and hats reach the top edge)
    m[((xx - cx) / (W * 0.30)) ** 2 + ((yy - cy * 0.9) / (H * 0.38)) ** 2 < 1] = cv2.GC_FGD
    m[(xx < W * 0.03) | (xx > W * 0.97)] = cv2.GC_BGD
    m[(yy > H * 0.86) & (xx > W * 0.15) & (xx < W * 0.85)] = cv2.GC_PR_FGD
    cv2.grabCut(a, m, None, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_MASK)
    fg = (m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)
    lab, n = ndi.label(fg)
    if n > 1:
        fg = lab == (np.argmax(ndi.sum(fg, lab, range(1, n + 1))) + 1)
    fg = ndi.binary_opening(ndi.binary_fill_holes(fg), iterations=2)
    alpha = np.clip(ndi.gaussian_filter(fg.astype(np.float32), 1.0) * 1.4 - 0.1, 0, 1)
    p = Image.fromarray(np.dstack([np.asarray(im), (alpha * 255).astype(np.uint8)]), 'RGBA')
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
    faces = tiles()
    assert len({v[0] for v in PICKS.values()}) == len(PICKS), 'a face used twice'
    made = {}
    for key, (fid, age, _) in PICKS.items():
        p = cut_out(faces[fid])
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        a = p.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.4, percent=45, threshold=2))   # (grown 1.7 times: a little crispness back)
        p = Image.merge('RGBA', (*a.split(), p.getchannel('A')))
        p.save(f'{OUT}{key}.webp', 'WEBP', quality=90, method=6)
        made[key] = (p, age)
    # the new portraits go under the old ones in the second picture; the old ones stay where they are
    old = Image.open(ATLAS).convert('RGBA')
    cellh = max(p.height for p, _ in made.values())
    rows = -(-len(made) // COLS)
    atlas = Image.new('RGBA', (max(old.width, COLS * 300), old.height + rows * cellh), (0, 0, 0, 0))
    atlas.paste(old, (0, 0))
    where = {}
    for i, (key, (p, _)) in enumerate(sorted(made.items())):
        x, y = (i % COLS) * 300, old.height + (i // COLS) * cellh
        atlas.paste(p, (x, y)); where[key] = [x, y, 300, p.height, ATLAS_NO]
    atlas.save(ATLAS, 'WEBP', quality=86, method=6)
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
        f.write('// Made by tools/build_portraits.py, tools/build_portraits_more.py, tools/build_portraits_black.py and tools/build_portraits_sky.py.\n')
        f.write('export const PORTRAIT_KEYS = [' + ', '.join(f"'{k}'" for k in sorted(keys)) + '];\n')
        f.write('// how old each painted player looks: his Super League age in season 1\n')
        f.write('export const PORTRAIT_AGE = {' + ', '.join(f"'{k}': {v}" for k, v in ages.items()) + '};\n')
        f.write('// the last batches live in a few pictures (img/cards/portraits-more.webp, -more2.webp: js/futcard.js PORTRAIT_FILES): where each is, [x, y, w, h, picture]\n')
        f.write('export const PORTRAIT_ATLAS = ' + json.dumps(atlas_old, separators=(',', ':')) + ';\n')
    # the haircuts (js/portrait-styles.js): added above the closing of the table
    st = open('js/portrait-styles.js').read()
    add = ''.join(f"  '{k}': '{PICKS[k][2]}',\n" for k in sorted(made) if f"'{k}':" not in st)
    st = st.replace('}).map(([k, v]) => [k, S(v)]));', add + '}).map(([k, v]) => [k, S(v)]));')
    open('js/portrait-styles.js', 'w').write(st)
    print(len(made), 'portraits added;', len(keys), 'in all')


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main()
