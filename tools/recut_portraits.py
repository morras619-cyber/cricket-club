#!/usr/bin/env python3
"""Re-cuts the sky-sheet and league-sheet portraits with a smaller trim at the tile's edge. The first cut trimmed 6-7% off each side
of every tile to keep the gold frame out, which also took the ear off any close-up whose head fills the tile. Each portrait is cut
again, cleared of stray blue backdrop (tools/fix_league_portraits.drop_sky), and written over its old one in place: img/cards/portraits/,
the second portrait picture (img/cards/portraits-more2.webp), the head squares (js/portrait-faces.js). Ages, haircuts and colours stay.
The hand-replaced portraits (tools/fix_league_portraits.py) and imon-hossain are left alone.

usage: python3 tools/recut_portraits.py [key ...]   (from the repo root; no keys: all of them)
"""
import json
import os
import sys
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_portraits_sky as sky
import build_portraits_league as lg
import fix_league_portraits as fx

SKIP = set(fx.FIX) | {'imon-hossain'}
INSET = {'archie-holloway': 9}   # (its tile has a bright sunburst behind the head that a smaller trim lets in)


def main(only):
    tl = sky.tiles()
    jobs = {k: (tl[v[0]], INSET.get(k, 2)) for k, v in sky.PICKS.items()}
    jobs.update({k: (lg.tile(v[0], v[1]), 12) for k, v in lg.PICKS.items()})
    keys = [k for k in sorted(jobs) if k not in SKIP and (not only or k in only)]
    atlas = Image.open(sky.ATLAS).convert('RGBA')
    lst = open('js/portraits-list.js').read()
    where = json.loads(lst.split('PORTRAIT_ATLAS =', 1)[1].strip().rstrip(';'))
    faces = json.loads(open('js/portrait-faces.js').read().split('=', 1)[1].strip().rstrip(';'))
    rows = sorted({w[1] for w in where.values() if w[4:] == [1]})
    for k in keys:
        tile, inset = jobs[k]
        p = fx.drop_sky(sky.cut_out(tile, inset))
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        a = p.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.4, percent=45, threshold=2))
        p = Image.merge('RGBA', (*a.split(), p.getchannel('A')))
        x, y = where[k][0], where[k][1]
        nxt = min([r for r in rows if r > y], default=atlas.height)
        if p.height > nxt - y:   # would run into the picture below: scale down to the slot
            p = p.resize((round(p.width * (nxt - y) / p.height), nxt - y), Image.LANCZOS)
            print('squeezed', k)
        p.save(f'{sky.OUT}{k}.webp', 'WEBP', quality=90, method=6)
        atlas.paste(Image.new('RGBA', (300, nxt - y), (0, 0, 0, 0)), (x, y))
        atlas.paste(p, (x, y))
        where[k] = [x, y, p.width, p.height, 1]
        faces[k] = sky.face_square(p)
    atlas.save(sky.ATLAS, 'WEBP', quality=86, method=6)
    with open('js/portraits-list.js', 'w') as f:
        f.write(lst.split('PORTRAIT_ATLAS =', 1)[0] + 'PORTRAIT_ATLAS = ' + json.dumps(where, separators=(',', ':')) + ';\n')
    with open('js/portrait-faces.js', 'w') as f:
        f.write('export const PORTRAIT_FACES = ' + json.dumps(dict(sorted(faces.items())), separators=(',', ':')) + ';\n')
    print('re-cut', len(keys))


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main(set(sys.argv[1:]))
