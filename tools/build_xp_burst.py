#!/usr/bin/env python3
"""The XP burst: 8 frames (4 x 2) of a burst growing and fading, cleaned and packed to img/fx/xp-burst.webp.

The supplied sheet had a red and yellow fringe round the edges (colour left over from removing the background). Every pixel that is not fully opaque takes the
colour of the nearest solid pixel instead, so the edge is the burst's own colour at a lower opacity. Source: tools/art/xp-burst-source.png.
Run from the repository root: python3 tools/build_xp_burst.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT, SCALE = 'tools/art/xp-burst-source.png', 'img/fx/xp-burst.webp', 0.75
im = Image.open(SRC).convert('RGBA')
a = np.asarray(im).astype(np.float32)
H, W = a.shape[:2]
res = a.copy()
for r in range(2):
    for c in range(4):
        y0, y1, x0, x1 = r * H // 2, (r + 1) * H // 2, c * W // 4, (c + 1) * W // 4
        cell = a[y0:y1, x0:x1]
        alpha = cell[..., 3] / 255
        top = max(float(alpha.max()), 1e-3)      # (the last frames fade out: "solid" is relative to the frame's own strongest pixel)
        rel = alpha / top
        solid = rel > 0.92
        idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
        rgb = cell[..., :3][idx[0], idx[1]]
        lo, span = (0.12, 0.25) if r * 4 + c >= 6 else (0.5, 0.42)   # (the two faded frames keep their own colour down to a much lower opacity)
        w = np.clip((rel - lo) / span, 0, 1)[..., None]
        res[y0:y1, x0:x1, :3] = cell[..., :3] * w + rgb * (1 - w)
res = res.clip(0, 255).astype(np.uint8)
img = Image.fromarray(res, 'RGBA')
img = img.resize((round(img.width * SCALE), round(img.height * SCALE)), Image.LANCZOS)
img.save(OUT, 'WEBP', quality=88, method=6)
print(OUT, img.size)
