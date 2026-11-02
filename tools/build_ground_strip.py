#!/usr/bin/env python3
"""A close-up strip of a ground's stands (img/ground/<club>/strip.webp and the 'strip' entry in js/groundart.js),
from tools/ground/src/<club>/strip.png: a front-on picture of the boundary edge and the stands, seen straight on, the
field's edge at the bottom. js/scene.js wraps it round the rope when the top view is zoomed right in, so the
stands there are as crisp as the front and back views (the ring painting alone is a few pixels a metre).
The strip is made to repeat: its right end is dissolved into its left, so TILES copies close the ring with no
seam. Its top fades to nothing, into the ring painting beyond. The row with the rope's dotted line (621) is put
at the game's rope (R + 1.5 m); the game's own grass covers the strip from there in.
usage: python3 tools/build_ground_strip.py <club> [rope_row]
"""
import json, os, sys
import numpy as np
from PIL import Image

CLUB = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ground', 'src', CLUB, 'strip.png')
OUT = os.path.join(HERE, '..', 'img', 'ground', CLUB, 'strip.webp')
TILES = 6              # copies round the ring (about 78 m of ring each, at 75 m out)
BLEND = 160            # px: the right end dissolves into the left
FADE = 0.16            # the top share of the strip that fades out
R_REF, R_GRASS = 75.0, 63.5        # (the rope: row 621 of the strip is its dotted line)

a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64)
H, W = a.shape[:2]
grass = int(sys.argv[2]) if len(sys.argv) > 2 else 621   # (the rope's row)
# the tile: a[:, b:W-b] then the seam (the end fading out as the start fades in), so it wraps with no seam
b = BLEND
t = np.linspace(0, 1, b)[None, :, None]
seam = a[:, W - b:] * (1 - t) + a[:, :b] * t
tile = np.concatenate([a[:, b:W - b], seam], 1)
tw = tile.shape[1]
alpha = np.ones((H, tw))
fr = int(H * FADE)
alpha[:fr] = np.linspace(0, 1, fr)[:, None] ** 1.5
rgba = np.dstack([np.clip(tile, 0, 255), alpha * 255]).astype(np.uint8)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
Image.fromarray(rgba, 'RGBA').save(OUT, 'WEBP', quality=90, method=6)
ppm = tw / (2 * np.pi * R_REF / TILES)        # px a metre along the strip
meta = dict(w=tw, h=H, ppm=round(float(ppm), 3), grass=grass, tiles=TILES, rRef=R_REF, rGrass=R_GRASS)
print('strip', tw, 'x', H, 'ppm', meta['ppm'], 'covers', round(H / ppm, 1), 'm out from', round(R_GRASS - (H - grass) / ppm, 1), 'm', os.path.getsize(OUT) // 1024, 'KB')
p = os.path.join(HERE, '..', 'js', 'groundart.js')
src = open(p).read(); head, body = src.split('export const GROUND_ART = ', 1)
art = json.loads(body.rstrip().rstrip(';'))
art[CLUB]['strip'] = meta
open(p, 'w').write(head + 'export const GROUND_ART = ' + json.dumps(art, indent=1) + ';\n')
