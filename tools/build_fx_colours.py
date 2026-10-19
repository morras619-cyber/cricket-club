#!/usr/bin/env python3
"""Recolours Thunder's painted electric effects (img/fx/electric.webp) for every other club:
img/fx/fx-<club>.webp, the same pieces (js/fxatlas.js 'electric') in the club's own colour. Each
pixel keeps its brightness and how strongly coloured it is (the white-hot cores stay white); only
its hue turns to the club's. usage: python3 tools/build_fx_colours.py
"""
import numpy as np
from PIL import Image

# the effects' colour per club: hue in degrees, and how much of the original colour it keeps
# (the Titans' steel is nearly white)
CLUBS = {'cyclones': (128, 1.0), 'vipers': (2, 1.0), 'eagles': (46, 1.0), 'phoenix': (22, 1.0),
         'titans': (210, 0.32), 'storm': (275, 1.0), 'royals': (322, 1.0)}

src = Image.open('img/fx/electric.webp').convert('RGBA')
a = np.asarray(src)
hsv = np.asarray(src.convert('RGB').convert('HSV')).astype(float)
for club, (hue, sat) in CLUBS.items():
    h = hsv.copy()
    h[..., 0] = hue / 360 * 255
    h[..., 1] = h[..., 1] * sat
    # (yellow and gold read darker than blue at the same value: lift them a little)
    if 35 <= hue <= 60: h[..., 2] = np.minimum(255, h[..., 2] * 1.05)
    rgb = Image.fromarray(h.astype(np.uint8), 'HSV').convert('RGB')
    out = np.dstack([np.asarray(rgb), a[..., 3]])
    Image.fromarray(out).save(f'img/fx/fx-{club}.webp', quality=88, method=6)
    print('wrote', club)
