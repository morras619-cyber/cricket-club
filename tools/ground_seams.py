#!/usr/bin/env python3
"""The first row of real art in each painted stand picture (img/ground/<club>/view-<view>.webp). The picture's top rows are a smooth, mirrored
extension of the sky; they start to show as a blurry band on a tall phone. The first row whose change from the row above is large is the seam.
Prints the table that js/scene.js SEAM holds.
usage: python3 tools/ground_seams.py"""
import json, os
import numpy as np
from PIL import Image
J = open('js/groundart.js').read()
art = json.loads(J[J.index('= ') + 2:J.rindex(';')])
out = {}
for club, m in art.items():
    if club.startswith('own'):
        continue
    out[club] = {}
    for view in ('bat', 'bowl'):
        a = np.array(Image.open(f'img/ground/{club}/view-{view}.webp').convert('RGB')).astype(float)
        d = np.abs(a[1:] - a[:-1]).mean(axis=(1, 2))
        base = np.median(d[:40])
        out[club][view] = next((i + 1 for i in range(30, 520) if d[i] > max(8, 6 * base)), None)
print(json.dumps(out))
