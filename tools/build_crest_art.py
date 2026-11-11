#!/usr/bin/env python3
"""The painted crests of the club builder (img/crest-art.webp, and inside js/crest.js): twenty finished emblems (red and gold on dark ink) cut out of a
sheet (2 rows of 10, each on a dark blue tile), as transparent 192 px tiles, 5 across and 4 down, in ART order (js/crest.js).
The game recolours them at run time: the red becomes the club's main colour, the gold its trim, the ink stays.
usage: python3 tools/build_crest_art.py <sheet.png>
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'img', 'crest-art.webp')
T, FIT = 192, 176
COLS, ROWS = 10, 2
X0, X1, Y0 = 57, 1936, [162, 416]   # (the sheet's tile grid, measured: the tiles' left edge, right edge, and each row's top)
CELL_W, CELL_H = (X1 - X0) / COLS, 234


def cutout(rgb):
    """alpha: 1 where the picture is, 0 on the dark blue tile (the tile is blue, the emblems are red, gold and near-black ink)"""
    r, g, b = [rgb[..., i].astype(float) for i in range(3)]
    blue = np.clip((b - r - 5) / 22, 0, 1) * np.clip((b - 18) / 22, 0, 1)   # how much like the tile (its shadow under the emblem is dark blue-grey too: the ink is not blue at all)
    a = 1 - blue
    im = Image.fromarray((a * 255).astype(np.uint8))
    # no specks on the tile, no pinholes in the emblem: open then close
    im = im.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    a = np.asarray(im).astype(float) / 255
    # keep the pieces that matter (the emblem, or its parts: crossed swords), not specks of the tile's corners
    from scipy import ndimage
    lab, n = ndimage.label(a > 0.3)
    if n:
        areas = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
        keep = [i + 1 for i, ar in enumerate(areas) if ar > 0.15 * areas.max()]
        a = a * np.isin(lab, keep)
    return a


def main(src):
    sheet = np.asarray(Image.open(src).convert('RGB'))
    out = Image.new('RGBA', (5 * T, 4 * T), (0, 0, 0, 0))
    for n in range(COLS * ROWS):
        col, row = n % COLS, n // COLS
        x = int(X0 + col * CELL_W) + 3
        y = Y0[row] + 3
        w, h = int(CELL_W) - 6, int(CELL_H) - 6
        tile = sheet[y:y + h, x:x + w]
        a = cutout(tile)
        ys, xs = np.nonzero(a > 0.3)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rgba = np.dstack([tile, (a * 255).astype(np.uint8)]).astype(np.uint8)
        crop = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
        s = FIT / max(crop.width, crop.height)
        crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)
        cell = Image.new('RGBA', (T, T), (0, 0, 0, 0))
        cell.paste(crop, ((T - crop.width) // 2, (T - crop.height) // 2), crop)
        out.paste(cell, ((n % 5) * T, (n // 5) * T))
    out.save(OUT, 'WEBP', quality=92, method=6)
    # and into js/crest.js, between its markers, as a data URI: the picture ships inside the script
    import base64, re
    js = os.path.join(HERE, '..', 'js', 'crest.js')
    src = open(js).read()
    data = base64.b64encode(open(OUT, 'rb').read()).decode()
    src = re.sub(r"// <crest-art>\nconst ART_DATA = '.*?';\n// </crest-art>", lambda m: "// <crest-art>\nconst ART_DATA = 'data:image/webp;base64," + data + "';\n// </crest-art>", src, flags=re.S)
    open(js, 'w').write(src)
    print('wrote', os.path.relpath(OUT), out.size, os.path.getsize(OUT), 'bytes, and js/crest.js')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
