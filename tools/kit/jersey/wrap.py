# Test: the mock-up jersey wrapped onto three bowler poses by matching landmarks (a smooth thin-plate
# warp), lit by each pose's own cloth shading and ink lines.
import json, subprocess
import numpy as np
from PIL import Image
from scipy.interpolate import RBFInterpolator
ROOT = '/home/user/cricket-club/'
META = json.loads(subprocess.check_output(['node', '-e', "import('/home/user/cricket-club/js/kitsheets.js').then(m=>console.log(JSON.stringify(m.KIT_SHEETS)))"]))
sheet = np.asarray(Image.open('../decal/sheet3.png').convert('RGB')).astype(float)
MOCK = {'back': sheet[40:445, 570:1000], 'front': sheet[40:445, 90:540]}
# landmarks: name -> (mock x, y), and per pose (x, y)
L = {
 'back': {'neck': (213, 40), 'shL': (75, 75), 'shR': (357, 75), 'cufL': (15, 205), 'cufR': (412, 205), 'armL': (100, 215), 'armR': (330, 215),
          'hemL': (97, 385), 'hemR': (330, 385), 'hemC': (213, 392), 'mid': (213, 215)},
 'front': {'colL': (145, 40), 'colR': (290, 40), 'shL': (65, 75), 'shR': (380, 75), 'cufL': (12, 220), 'cufR': (430, 205), 'armL': (92, 210), 'armR': (345, 210),
           'hemL': (97, 380), 'hemR': (345, 380), 'hemC': (215, 388), 'mid': (215, 220)},
}
POSES = [
 ('back', 0, {'neck': (113, 98), 'shL': (43, 120), 'shR': (182, 120), 'cufL': (18, 187), 'cufR': (202, 185), 'armL': (62, 200), 'armR': (160, 200),
              'hemL': (65, 238), 'hemR': (157, 238), 'hemC': (111, 238), 'mid': (111, 170)}),
 ('back', 2, {'neck': (120, 85), 'shL': (52, 110), 'shR': (187, 113), 'cufL': (66, 152), 'cufR': (208, 170), 'armL': (80, 187), 'armR': (167, 187),
              'hemL': (73, 230), 'hemR': (167, 230), 'hemC': (120, 230), 'mid': (118, 160)}),
 ('front', 0, {'colL': (78, 110), 'colR': (152, 110), 'shL': (37, 127), 'shR': (190, 127), 'cufL': (22, 188), 'cufR': (205, 188), 'armL': (60, 197), 'armR': (170, 197),
               'hemL': (65, 253), 'hemR': (162, 253), 'hemC': (113, 253), 'mid': (113, 190)}),
]
tiles = []
for view, k, P in POSES:
    x, y, w, h = META[view]['frames'][k][:4]
    im = np.asarray(Image.open(ROOT + f'img/kit/{view}.webp').convert('RGBA')).astype(float)[y:y + h, x:x + w]
    mk = np.asarray(Image.open(ROOT + f'img/kit/{view}-mask.png'))[y:y + h, x:x + w]
    names = list(P)
    src = np.array([P[n] for n in names], float); dst = np.array([L[view][n] for n in names], float)
    f = RBFInterpolator(src, dst, kernel='thin_plate_spline', smoothing=0.5)
    yy, xx = np.mgrid[:h, :w]
    belt = P['hemC'][1] + 2
    shirt = (mk[..., 2] > 0) & (mk[..., 0] < 128) & (yy < belt) & (im[..., 3] > 0)
    pts = np.stack([xx[shirt], yy[shirt]], 1).astype(float)
    uv = f(pts)
    M = MOCK[view]
    u = np.clip(uv[:, 0], 0, M.shape[1] - 1).astype(int); v = np.clip(uv[:, 1], 0, M.shape[0] - 1).astype(int)
    col = M[v, u]
    lum = im[..., :3] @ np.array([0.299, 0.587, 0.114])
    ref = np.median(lum[shirt & (mk[..., 2] == 255)])
    sh = np.clip(lum[shirt] / ref, 0, 1.35)[:, None]
    sh = np.where(sh > 1, 1 + (sh - 1) * 0.6, sh ** 0.85)
    out = im.copy()
    new = np.clip(col * sh, 0, 255)
    out[shirt, :3] = new
    before = Image.fromarray(im.astype(np.uint8), 'RGBA'); after = Image.fromarray(out.astype(np.uint8), 'RGBA')
    t = Image.new('RGBA', (w * 2 + 20, h), (42, 132, 66, 255)); t.alpha_composite(before, (0, 0)); t.alpha_composite(after, (w + 20, 0))
    tiles.append(t.crop((0, 0, t.width, 330)))
W = sum(t.width for t in tiles) + 30 * len(tiles)
o = Image.new('RGBA', (W, 330), (42, 132, 66, 255)); xo = 0
for t in tiles: o.alpha_composite(t, (xo, 0)); xo += t.width + 30
o.resize((o.width * 2, 660), Image.LANCZOS).save('wrap-test.png')
