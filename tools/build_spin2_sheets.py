#!/usr/bin/env python3
"""The second spinner action (15 poses, front and back; drawn bald in the premium kit): img/kit/spin2-front.webp,
spin2-back.webp (+ -mask.png, -tone.png) and their entries in js/kitsheets.js.

usage: python3 tools/build_spin2_sheets.py
Needs tools/kit/src/spin2-front.png and spin2-back.png (the drawn sheets on magenta), the crest and print
placements (tools/kit/place_spin2.py) and the head tables (tools/kit/spin2-heads.json: tools/kit/headfit/).
No hair layers: his haircut, beard and cap are put on the head at run time (js/hair.js dressSheet, js/kitsprite.js).
Run it from the repo's root."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import build_kit_sheets as kit  # noqa: E402

K = 'tools/kit/'
COUNT = {'front': 13, 'back': 14}


def star(name, out, rowh):
    """a named player's own sheets (drawn with his hair, no head tables): img/kit/<name>-front/back"""
    crest = json.load(open(K + f'crest-{name}-front.json'))['frames']
    prints = json.load(open(K + f'shirt-print-{name}-back.json'))['frames']
    for view, place in (('front', [crest[str(k + 1)] for k in range(len(crest))]),
                        ('back', [prints[str(k + 1)]['print'] + prints[str(k + 1)]['name'] + prints[str(k + 1)]['number'] for k in range(len(prints))])):
        out[f'{name}-{view}'] = kit.build(f'{name}-{view}', K + f'src/{name}-{view}.png', {}, place, len(place), rowh, premium=True, place_abs=True, hard=True)


def main():
    heads = json.load(open(K + 'spin2-heads.json'))
    crest = json.load(open(K + 'crest-spin2-front.json'))['frames']
    prints = json.load(open(K + 'shirt-print-spin2-back.json'))['frames']
    src = open('js/kitsheets.js').read()
    out = json.loads(src[src.index('= ') + 2:src.rindex(';')])
    for view, place in (('front', [crest[str(k + 1)] for k in range(COUNT['front'])]),
                        ('back', [prints[str(k + 1)]['print'] + prints[str(k + 1)]['name'] + prints[str(k + 1)]['number'] for k in range(COUNT['back'])])):
        name = f'spin2-{view}'
        meta = kit.build(name, K + f'src/spin2-{view}.png', {}, place, COUNT[view], 830, premium=True, place_abs=True, hard=True)
        # the head tables move with each pose into the atlas: the crest/print placements moved by (tx, ty), so do they
        shift = [(m[0] - p[0], m[1] - p[1]) for m, p in zip(meta['place'], place)]
        tbl = heads[view]
        meta['heads'] = [[round(h[0] + tx, 1), round(h[1] + ty, 1), h[2], h[3]] for h, (tx, ty) in zip(tbl['hair'], shift)]
        if 'beard' in tbl:
            meta['beardHeads'] = [[round(h[0] + tx, 1), round(h[1] + ty, 1), h[2], h[3]] for h, (tx, ty) in zip(tbl['beard'], shift)]
        meta['dress'] = heads['opts'][view]
        out[name] = meta
    star('karim', out, 860)
    kit.write_sheets(out)


if __name__ == '__main__':
    main()
