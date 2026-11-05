#!/usr/bin/env python3
"""Card portraits for the 62 league-club players who had only a drawn face, from four sheets of gold-framed tiles on a flat
sky-blue background (tools/portraits/league-1..4.png: 4 x 4 tiles each, 1254 px square; the last has 14 faces) and one single
tile (league-2-pranav-nanda.png) that stands in for tile 15 of sheet 2.

Same pipeline as tools/build_portraits_sky.py (its cut-out, head square and list writers are reused): each tile is cut out with
GrabCut, grown to 300 px wide, saved as img/cards/portraits/<key>.webp and added under the others in the second portrait picture
(img/cards/portraits-more2.webp), with its age and where it is in js/portraits-list.js, its head square in js/portrait-faces.js
and its haircut in js/portrait-styles.js. Then run tools/build_portrait_looks.py.

usage: python3 tools/build_portraits_league.py   (from the repo root)
"""
import os
import sys
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_portraits_sky as sky

# key: (sheet, tile 1..16 in reading order, the age he looks, cut / beard / headwear (portrait-styles.js))
PICKS = {
    'sajid-karim': (1, 1, 27, 'part stubble'), 'javed-jalali': (1, 2, 29, 'messy full'), 'kyle-jacobs': (1, 3, 24, 'curly -'),
    'jack-whitlock': (1, 4, 31, 'messy stubble'), 'arif-alam': (1, 5, 22, 'part moustache'), 'hunter-fraser': (1, 6, 26, 'messy -'),
    'saad-paracha': (1, 7, 30, 'part full'), 'corbin-mckenzie': (1, 8, 23, 'bun stubble'), 'zain-hashmi': (1, 9, 21, 'messy -'),
    'ashik-rahman': (1, 10, 33, 'part full'), 'qais-wardak': (1, 11, 28, 'messy stubble'), 'kyle-van-wyk': (1, 12, 32, 'part stubble'),
    'zubair-mohmand': (1, 13, 25, 'messy goatee'), 'mitchell-dunlop': (1, 14, 20, 'messy -'), 'mpho-steyn-louw': (1, 15, 29, 'buzz stubble'),
    'farhan-chowdhury': (1, 16, 26, 'part -'),
    'shayan-bajwa': (2, 1, 24, 'part stubble'), 'tanvirul-khondaker': (2, 2, 27, 'buzz -'), 'sami-tarakai': (2, 3, 30, 'messy full'),
    'dilan-rajapaksa-perera': (2, 4, 25, 'long moustache'), 'pranav-rathore': (2, 5, 22, 'part -'), 'tanvirul-sarkar': (2, 6, 34, 'curly full'),
    'bilal-hotak': (2, 7, 28, 'buzz full'), 'ishaan-chadha': (2, 8, 26, 'ponytail stubble'), 'sahan-wickramasinghe': (2, 9, 23, 'curly -'),
    'sahil-nanda': (2, 10, 31, 'messy full headband #2f4a8a'), 'rohit-iyer': (2, 11, 29, 'part moustache'), 'ishaan-nanda': (2, 12, 20, 'spiky -'),
    'dilan-herath-senevi': (2, 13, 27, 'buzz full'), 'ishaan-sharma': (2, 14, 25, 'curly stubble'),
    'pranav-nanda': ('P', 0, 31, 'messy stubble'), 'tanvirul-rahman': (2, 16, 24, 'buzz -'),
    'zubair-kakar': (3, 1, 28, '- full turban #1f2430'), 'arif-chowdhury': (3, 2, 32, 'buzz stubble'), 'isuru-fonseka': (3, 3, 26, 'long goatee'),
    'toby-ashworth': (3, 4, 21, 'messy -'), 'muneeb-rind': (3, 5, 27, 'curly full'), 'aarav-nanda': (3, 6, 22, 'part -'),
    'daniyal-niazi': (3, 7, 29, 'part full'), 'aditya-chadha': (3, 8, 24, 'messy stubble'), 'vihaan-iyer': (3, 9, 20, 'curly -'),
    'hudson-thornton': (3, 10, 27, 'messy stubble'), 'varun-mathur': (3, 11, 30, 'part moustache'), 'naveed-hotak': (3, 12, 25, 'buzz full'),
    'ashik-sikder': (3, 13, 35, 'messy full'), 'ishaan-menon': (3, 14, 23, 'part -'), 'freddie-whitlock': (3, 15, 28, 'messy stubble'),
    'shohag-mia': (3, 16, 26, 'buzz moustache'),
    'dewald-van-wyk': (4, 1, 31, 'messy stubble'), 'yash-kulkarni': (4, 2, 24, 'curly -'), 'tanvirul-talukder': (4, 3, 29, 'messy full'),
    'sam-holloway': (4, 4, 22, 'messy -'), 'nikau-lockhart': (4, 5, 26, 'bun full'), 'sahan-fonseka': (4, 6, 33, 'curly full'),
    'jaxon-hargreaves': (4, 7, 25, 'long stubble'), 'sam-kendrick': (4, 8, 30, 'messy stubble'), 'ishaan-rathore': (4, 9, 21, 'spiky -'),
    'shohag-alam': (4, 10, 28, 'buzz full'), 'nuwan-fonseka': (4, 11, 27, 'long stubble'), 'qais-noorzai': (4, 12, 32, 'buzz full'),
    'tanmay-rathore': (4, 13, 23, 'part -'), 'usama-hashmi': (4, 14, 26, 'part stubble'),
}
PITCH, SIDE, TILE = 311, 8, 302   # the grid of each sheet


def tile(sheet, n):
    if sheet == 'P':
        return Image.open('tools/portraits/league-2-pranav-nanda.png').convert('RGB').resize((TILE, TILE), Image.LANCZOS)
    im = Image.open(f'tools/portraits/league-{sheet}.png').convert('RGB')
    r, c = divmod(n - 1, 4)
    x, y = SIDE + c * PITCH, SIDE + r * PITCH
    return im.crop((x, y, x + TILE, y + TILE))


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    assert len(PICKS) == 62 and len({(v[0], v[1]) for v in PICKS.values()}) == 62
    # the sky script's writers take (face id, age, style): hand it our tiles under our own ids
    cache = {}
    for key, (sh, n, age, style) in PICKS.items():
        cache[f'{sh}{n:02d}'] = tile(sh, n)
    sky.tiles = lambda: cache
    sky.PICKS = {key: (f'{sh}{n:02d}', age, style) for key, (sh, n, age, style) in PICKS.items()}
    _cut = sky.cut_out
    sky.cut_out = lambda t, inset=22: _cut(t, inset)
    sky.main()
