#!/usr/bin/env python3
"""Bake the kit sheets' tone smoothing into img/kit/<view>-tone.png.

The game used to smooth every tone picture when the first match started (js/kitsprite.js smoothTone / smoothWeights: a masked box blur that takes the
painted blotches out of the cloth's brightness and the colour weights). That took seconds on a phone and the answer never changes, so it is done here once:
the raw pictures (tools/kit/raw-tones) are smoothed and written over img/kit/*-tone.png with the smoothed weights in R and G and the smoothed brightness in B.
Same algorithm as the game's, in numpy. Run from the repository root: python3 tools/bake_tone_smoothing.py
"""
import json, re, sys
import numpy as np
from PIL import Image

VIEWS = ['front', 'back', 'spin-front', 'spin-back', 'bat-back', 'field']   # (bat-paint is a painted sheet, with no smoothing)
meta = json.loads(re.search(r'KIT_SHEETS = (\{.*\});', open('js/kitsheets.js').read(), re.S).group(1))

def box(a, R):
    """sum of a over the window [-R, R] along each axis, clipped at the edges (the game's running sums)"""
    for ax in (1, 0):
        c = np.cumsum(a, axis=ax, dtype=np.float64)
        n = a.shape[ax]
        z = np.zeros_like(c.take([0], axis=ax))
        c = np.concatenate([z, c], axis=ax)                      # c[k] = sum of the first k
        hi = np.minimum(np.arange(n) + R + 1, n); lo = np.maximum(np.arange(n) - R, 0)
        a = c.take(hi, axis=ax) - c.take(lo, axis=ax)
    return a

def smooth_field(val, cnt, R, lo, hi):
    sv, sc = box(val, R), box(cnt, R)
    out = np.zeros_like(val)
    on = cnt > 0
    b = np.where(on, sv / np.maximum(sc, 1e-9), 0)
    d = val - b; a = np.abs(d)
    k = np.clip((a - lo) / np.maximum(hi - lo, 1e-9), 0, 1)
    out = np.where(on, b + d * k * k * (3 - 2 * k), 0)
    return out

for view in VIEWS:
    tn = np.asarray(Image.open(f'tools/kit/raw-tones/{view}-tone.png').convert('RGB')).astype(np.float64)
    m = np.asarray(Image.open(f'img/kit/{view}-mask.png').convert('RGB'))
    H, W = tn.shape[:2]
    kit = (m[..., 2] == 255) & (tn[..., 2] > 0)
    cnt = kit.astype(np.float64)
    helmet = np.zeros((H, W), bool)
    for fx, fy, fw, fh, *_ in meta[view]['frames']:
        helmet[fy:fy + round(fh * 0.15), fx:fx + fw] = True
    L = smooth_field(np.where(kit, tn[..., 2], 0), cnt, 3, np.where(helmet, 18, 10), np.where(helmet, 50, 30))
    out = np.zeros((H, W, 3), np.uint8)
    for ch in (0, 1):
        w = smooth_field(np.where(kit, tn[..., ch], 0), cnt, 2, 45, 120)
        out[..., ch] = np.clip(np.rint(w), 0, 255)
    # (a kit pixel must stay non-zero in the brightness: the game skips a pixel whose brightness is zero)
    out[..., 2] = np.where(kit, np.clip(np.rint(L), 1, 255), 0)
    Image.fromarray(out, 'RGB').save(f'img/kit/{view}-tone.png', optimize=True)
    print(view, 'baked', W, H)
