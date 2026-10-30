#!/usr/bin/env python3
"""Fits each building to its lawn so that none of it goes over a road: for every building the size and place with the least of the building outside its lawn (and its hedges), the largest one that fits.

usage: python3 tools/fit_map_sites2.py [preview.png]      (prints SITES for js/clubmap.js; starts from tools/fit_map_sites.py's answer)
"""
import os, sys, json, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + os.sep
W, H = 1536, 2304
start = json.loads(subprocess.check_output([sys.executable, R + 'tools/fit_map_sites.py', '1.05', '/tmp/claude-0/-home-user-cricket-club/54ad0d67-eae6-5a96-ba09-24e3e4b2e539/scratchpad/shots/_s.png']).decode().strip().splitlines()[-1])
ATLAS = {"stadium": [0, 681], "training": [681, 714], "office": [1395, 704], "apartment": [2099, 732], "medical": [2831, 660], "academy": [3491, 743], "clubhouse": [4234, 702], "shop": [4936, 709]}
base = Image.open(R + 'img/map/base.webp').convert('RGB').resize((W, H))
a = np.array(base).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
# the ground a building may stand on: lawn and paving (green, or the paved plot), and the hedges and trees on it (dark green), not the road (grey, low colour) or its kerb
lawn = (g > r * 1.1) & (g > b * 1.25) & (g > 55)
mx = a.max(-1); sat = (mx - a.min(-1)) / (mx + 1e-6)
road = (sat < 0.26) & (mx > 38) & (mx < 185)
road = ndi.binary_opening(road, iterations=1)
ok = ndi.binary_closing(lawn, iterations=6) & ~ndi.binary_dilation(road & ~ndi.binary_dilation(lawn, iterations=3), iterations=2)
# the stadium's round plot is paving (not lawn): allowed too
pave = (abs(r - 122) < 30) & (abs(g - 108) < 30) & (abs(b - 90) < 30)
ok |= ndi.binary_fill_holes(ndi.binary_closing(pave, iterations=4))
atlas = np.array(Image.open(R + 'img/map/buildings.webp').convert('RGBA'))[..., 3]
flip = []   # (the atlas already has the right-hand buildings turned)
out = {}
for k, v in start.items():
    row, h = ATLAS[k]; al = atlas[row:row + h] > 60
    if k in flip: al = al[:, ::-1]
    best = None
    for sc in np.arange(1.0, 0.64, -0.04):
        w = v['w'] * W * sc / 1.0; s = w / 1100; hh = int(h * s)
        sm = np.array(Image.fromarray((al * 255).astype(np.uint8)).resize((int(w), hh))) > 100
        # only the building's lower part must be on the lawn: its roof may stand over the hedges behind it
        low = sm.copy(); low[:int(hh * 0.5)] = False
        for dy in range(-70, 71, 14):
            for dx in range(-70, 71, 14):
                x0 = int(v['x'] * W - w / 2 + dx); y0 = int(v['y'] * H - hh / 2 + dy)
                if x0 < 0 or y0 < 0 or x0 + sm.shape[1] > W or y0 + hh > H: continue
                o = ok[y0:y0 + hh, x0:x0 + sm.shape[1]]
                bad = (low & ~o).sum() / max(1, low.sum())
                bad2 = (sm & ~o).sum() / max(1, sm.sum())
                cost = bad * 4 + bad2 + (abs(dx) + abs(dy)) / 4000
                if best is None or cost < best[0] - 1e-9: best = (cost, sc, dx, dy, bad, bad2)
        if best and best[4] < 0.03: break
    cost, sc, dx, dy, bad, bad2 = best
    out[k] = dict(x=round(v['x'] + dx / W, 3), y=round(v['y'] + dy / H, 3), w=round(v['w'] * sc, 3))
    print(k, 'scale', round(sc, 2), 'shift', dx, dy, 'base outside', round(bad, 3), 'all outside', round(bad2, 3), file=sys.stderr)
print(json.dumps(out))
if len(sys.argv) > 1:
    cv = base.convert('RGBA'); at = Image.open(R + 'img/map/buildings.webp').convert('RGBA')
    for k, v in out.items():
        row, h = ATLAS[k]; w = round(v['w'] * W); hh = round(h * w / 1100)
        sp = at.crop((0, row, 1100, row + h))
        if k in flip: sp = sp.transpose(Image.FLIP_LEFT_RIGHT)
        cv.alpha_composite(sp.resize((w, hh), Image.LANCZOS), (round(v['x'] * W - w / 2), round(v['y'] * H - hh / 2)))
    cv.convert('RGB').resize((768, 1152)).save(sys.argv[1])
