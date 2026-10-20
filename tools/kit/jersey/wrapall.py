import json, subprocess
import numpy as np
from PIL import Image
from scipy.interpolate import RBFInterpolator
from scipy import ndimage as ndi
from auto import pose
exec(open('wrap.py').read().split("POSES = [")[0].split("tiles = []")[0])
MK = json.load(open('marks.json'))
# each mock-up's shirt (its blue and yellow cloth, not the background): a sample off it takes the nearest shirt pixel
def cloth(M):
    r, g, b = M[..., 0], M[..., 1], M[..., 2]
    m = ((b > 150) & (r < 90) & (g < 120)) | ((r > 180) & (g > 150) & (b < 90))
    m = ndi.binary_fill_holes(ndi.binary_opening(m, iterations=2))
    lab, n = ndi.label(m); m = lab == (np.argmax(ndi.sum(m, lab, range(1, n + 1))) + 1)
    m = ndi.binary_erosion(m, iterations=4)       # (clear of the ink outline)
    _, (iy, ix) = ndi.distance_transform_edt(~m, return_indices=True)
    out = M.copy(); out[~m] = M[iy[~m], ix[~m]]
    return out
MOCK = {k: cloth(v) for k, v in MOCK.items()}
def wrap(view, k):
    im, mk, tn = pose(view, k)
    P = MK[f'{view}{k}']; names = [n for n in P if n in L[view]]
    src = np.array([P[n] for n in names], float); dst = np.array([L[view][n] for n in names], float)
    f = RBFInterpolator(src, dst, kernel='thin_plate_spline', smoothing=1.0)
    h, w = im.shape[:2]; yy, xx = np.mgrid[:h, :w]
    # the shirt: kit above the belt line through the hem points
    hl, hr = P['hemL'], P['hemR']
    line = hl[1] + (xx - hl[0]) * (hr[1] - hl[1]) / max(1, hr[0] - hl[0])
    beltband = ndi.binary_opening((tn[..., 1] > 127) & (mk[..., 2] > 0), structure=np.ones((1, 9)))
    # (the painted collar, cuffs and belt stay: only the shirt's cloth takes the design)
    shirt = (mk[..., 2] > 0) & (mk[..., 0] < 128) & (tn[..., 1] < 110) & (yy < line + 3) & (im[..., 3] > 0)
    pts = np.stack([xx[shirt], yy[shirt]], 1).astype(float)
    uv = f(pts); M = MOCK[view]
    col = np.stack([ndi.map_coordinates(M[..., c], [np.clip(uv[:, 1], 0, M.shape[0] - 1), np.clip(uv[:, 0], 0, M.shape[1] - 1)], order=1) for c in range(3)], 1)
    lum = im[..., :3] @ np.array([0.299, 0.587, 0.114])
    ref = np.median(lum[shirt & (mk[..., 2] == 255)])
    sh = np.clip(lum[shirt] / ref, 0, 1.35)[:, None]; sh = np.where(sh > 1, 1 + (sh - 1) * 0.6, sh ** 0.85)
    out = im.copy(); out[shirt, :3] = np.clip(col * sh, 0, 255)
    return im, out
if __name__ == '__main__':
    for view in ('back', 'front'):
        tiles = []
        for k in range(10):
            im, out = wrap(view, k)
            tiles.append(Image.fromarray(out.astype(np.uint8), 'RGBA'))
        H = max(t.height for t in tiles); W = sum(t.width for t in tiles) + 10 * 10
        o = Image.new('RGBA', (W, H), (42, 132, 66, 255)); x = 0
        for t in tiles: o.alpha_composite(t, (x, H - t.height)); x += t.width + 10
        o.save(f'all-{view}.png')
