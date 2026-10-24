import json, math, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import detect
WIN = 200
for view in ('front', 'back'):
    hs, a, objs = detect.heads(f'../src/spin2-{view}.png', view)
    patches = detect.heads.patches
    json.dump([[float(v) for v in h] for h in hs], open(f'out/heads-{view}.json', 'w'))
    strip = np.zeros((WIN, WIN * len(hs), 3), np.uint8)
    for i, (h, patch) in enumerate(zip(hs, patches)):
        x, y, sk, ang = h[:4]
        dx, dy = -math.sin(ang), math.cos(ang); px, py = math.cos(ang), math.sin(ang)
        ox, oy = int(round(x)) - WIN // 2, int(round(y)) - 60
        Y, X = np.mgrid[oy:oy + WIN, ox:ox + WIN]
        inside = (Y >= 0) & (Y < patch.shape[0]) & (X >= 0) & (X < patch.shape[1])
        P = np.zeros((WIN, WIN), bool); P[inside] = patch[Y[inside], X[inside]]
        Pd = ndi.binary_dilation(P, iterations=3)
        t = (X - x) * dx + (Y - y) * dy; l = (X - x) * px + (Y - y) * py
        if view == 'front':
            Z = Pd & (t <= 0.42 * sk) & (np.abs(l) <= 0.62 * sk)
            F = P & (t >= 0.58 * sk) & (np.abs(l) <= 0.28 * sk)
        else:   # from behind there is no face: the hair covers the whole back of the head
            Z = Pd & (t <= 0.8 * sk) & (np.abs(l) <= 0.62 * sk)
            F = np.zeros_like(P)
        strip[:, i * WIN:(i + 1) * WIN, 0] = Z * 255; strip[:, i * WIN:(i + 1) * WIN, 1] = F * 255
    Image.fromarray(strip).save(f'out/zones-{view}.png'); print(view, len(hs), 'zones ok')
