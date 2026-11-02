#!/usr/bin/env python3
"""Your own club's grounds (img/ground/own1-3): the Blender renders of tools/blender/ownground.py,
three passes for each view, cut for the game, and their measurements into js/groundart.js.
usage: python3 tools/build_own_ground.py <renders dir>   (files <level>-<view>-<base|tint|uv>.png)
"""
import json, os, re, shutil, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SRC = sys.argv[1]
ROOF = {1: (86.5, 9.6), 2: (94, 14.4), 3: (94, 14.4)}
VIEWS = {'bat': (1600, 480), 'bowl': (2400, 576), 'keeper': (1200, 480)}   # f, pixels above the horizon
TOP_PX = 10    # the outfield view's stadium, pixels a metre (rendered at 14: smaller for the phone)
def hexc(a): return '#' + ''.join(f'{int(round(v)):02x}' for v in a)

def save(level, name, im, lossless):
    im.save(os.path.join(ROOT, 'img', 'ground', f'own{level}', name + '.webp'), lossless=lossless, quality=100 if lossless else 88, method=6)

src = open(os.path.join(ROOT, 'js', 'groundart.js')).read()
head, body = src.split('export const GROUND_ART = ', 1)
ART = json.loads(body.rstrip().rstrip(';'))
for L in [int(x) for x in os.environ.get('LEVELS', '1,2,3').split(',')]:
    out = os.path.join(ROOT, 'img', 'ground', f'own{L}'); os.makedirs(out, exist_ok=True)
    for f in ('pitch', 'grass', 'stumps', 'stumps-broken'):
        shutil.copy(os.path.join(ROOT, 'img', 'ground', 'thunder', f + '.webp'), os.path.join(out, f + '.webp'))
    meta = {'views': {}, 'stumps': ART['thunder']['stumps'], 'broken': ART['thunder']['broken']}
    for v in ('bat', 'bowl', 'keeper', 'top'):
        ims = {p: Image.open(os.path.join(SRC, f'{L}-{v}-{p}.png')).convert('RGB') for p in ('base', 'tint', 'uv')}
        if v == 'top':
            k = TOP_PX / 14
            size = (round(ims['base'].width * k), round(ims['base'].height * k))
            ims = {p: im.resize(size, Image.NEAREST if p == 'uv' else Image.LANCZOS) for p, im in ims.items()}
            meta['top'] = {'px': TOP_PX, 'w': size[0], 'h': size[1], 'c': [size[0] / 2, size[1] / 2]}
        else:
            a = np.asarray(ims['base']).astype(float)
            f, above = VIEWS[v]
            meta['views'][v] = {'f': f, 'w': a.shape[1], 'h': a.shape[0], 'above': above, 'top': hexc(a[:4].mean((0, 1))), 'bottom': hexc(a[-4:].mean((0, 1))),
                                'board': {'r': 63.8, 'h': 0.95}, 'roof': {'r': ROOF[L][0], 'h': ROOF[L][1]}}
        save(L, f'view-{v}', ims['base'], False)
        save(L, f'view-{v}-tint', ims['tint'], True)
        save(L, f'view-{v}-uv', ims['uv'], True)
        if v == 'bat':
            # the stadium card's picture: the stands from the batter's end
            for p, im in ims.items():
                th = im.crop((0, 0, im.width, 1100)).resize((720, 330), Image.NEAREST if p == 'uv' else Image.LANCZOS)
                save(L, 'thumb' + ('' if p == 'base' else '-' + p), th, p != 'base')
    ART[f'own{L}'] = meta
    print('own', L, 'done')
open(os.path.join(ROOT, 'js', 'groundart.js'), 'w').write(head + 'export const GROUND_ART = ' + json.dumps(ART, indent=1) + ';\n')
