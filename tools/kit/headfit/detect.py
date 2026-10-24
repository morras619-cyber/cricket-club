"""Find each pose's head on a bald-bowler sheet: [x, y, skull width, angle] (top-centre of the skull, 0 = upright),
the same record hair.js's headsOf returns, so the game's own dressSheet can draw the hair on it."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def load(path):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    mag = (a[..., 0] > 180) & (a[..., 1] < 90) & (a[..., 2] > 150)
    return a, ~mag

def poses(a, fg):
    H = a.shape[0]
    lab, n = ndi.label(ndi.binary_opening(fg, iterations=2))
    objs = [(o, i + 1) for i, o in enumerate(ndi.find_objects(lab)) if (o[0].stop - o[0].start) > 120]
    objs.sort(key=lambda t: (int((t[0][0].start + t[0][0].stop) / 2 // 830), t[0][1].start))   # (rows of 980 px: tools/assemble)
    return lab, objs

# poses where the fattest skin patch is not the head (back pose 10: the elbow is fatter than the head half hidden behind the shoulder):
# the head is searched for in this box (x0, y0, x1, y1) of the sheet
WINDOWS = {('back', 7): (610, 1110, 720, 1235), ('back', 8): (1040, 1130, 1150, 1255)}


def heads(path, view):
    a, fg = load(path)
    lab, objs = poses(a, fg)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    skin = (r > 200) & (g > 130) & (g < 215) & (b > 70) & (b < 180) & (r - b > 60)
    dark = (a @ np.array([.299, .587, .114])) < 70
    kit = (b > 120) & (r < 120)                       # the blue kit and its darker yoke
    out = []; patches = []
    for k, (o, i) in enumerate(objs):
        m = lab == i
        ys, xs = np.nonzero(m); top, bot = ys.min(), ys.max(); fh = bot - top
        sk = skin & m
        # fill the face's lines (eyes, brows, mouth, outline) so the head reads as one patch
        filled = ndi.binary_fill_holes(ndi.binary_closing(sk | (dark & m & ndi.binary_dilation(sk, iterations=4)), iterations=3))
        dt = ndi.distance_transform_edt(filled)
        # the head is the fattest skin patch (forearms and hands are much thinner)
        upper = np.arange(a.shape[0])[:, None] < top + 0.45 * fh      # the head is never in the lower half (a swinging fist can be fat too)
        if (view, k + 1) in WINDOWS:
            x0w, y0w, x1w, y1w = WINDOWS[(view, k + 1)]
            upper = upper & (np.arange(a.shape[0])[:, None] >= y0w) & (np.arange(a.shape[0])[:, None] < y1w) & (np.arange(a.shape[1])[None, :] >= x0w) & (np.arange(a.shape[1])[None, :] < x1w)
        cy, cx = np.unravel_index(np.argmax(dt * upper), dt.shape)
        rad = dt[cy, cx]
        # refine: centroid of the filled patch connected to that point within 1.15 r
        yy, xx = np.nonzero(filled & ((np.arange(a.shape[0])[:, None] - cy) ** 2 + (np.arange(a.shape[1])[None, :] - cx) ** 2 < (rad * 1.25) ** 2))
        hx, hy = xx.mean(), yy.mean()
        # which way is down the head: towards the kit pixels of the shoulders / collar close below
        R = rad * 3.2
        ky, kx = np.nonzero(kit & m & (((np.arange(a.shape[0])[:, None] - hy) ** 2 + (np.arange(a.shape[1])[None, :] - hx) ** 2) < R * R) & (((np.arange(a.shape[0])[:, None] - hy) ** 2 + (np.arange(a.shape[1])[None, :] - hx) ** 2) > (rad * 1.1) ** 2))
        if len(kx) > 30:
            dx, dy = kx.mean() - hx, ky.mean() - hy
        else:
            dx, dy = 0, 1
        l = np.hypot(dx, dy) or 1; dx /= l; dy /= l
        if dy < 0.34:
            ang = np.sign(dx or 1) * 1.22; dx, dy = np.sin(ang), np.cos(ang)
        # the head's width across: measure the filled patch across the 'down' direction through the centre
        def run(sx, sy):
            n = 0
            while n < rad * 2 and filled[int(round(hy + sy * (n + 1))), int(round(hx + sx * (n + 1)))]: n += 1
            return n
        wa, wb = run(dy, -dx), run(-dy, dx)
        width = wa + wb
        shift = (wa - wb) / 2
        mx, my = hx + dy * shift, hy - dx * shift
        # top of the skull: straight 'up' from the centre until the patch ends
        t = 0
        while t < rad * 2 and filled[int(round(my - dy * (t + 1))), int(round(mx - dx * (t + 1)))]: t += 1
        topx, topy = mx - dx * t, my - dy * t
        patches.append(filled & m)
        wid = []
        for step in range(0, int(rad * 3.4)):
            cx2, cy2 = topx + dx * step, topy + dy * step
            n1 = n2 = 0
            while n1 < rad * 1.6 and 0 <= int(round(cy2 + dx * (n1 + 1))) < filled.shape[0] and 0 <= int(round(cx2 + dy * (n1 + 1))) < filled.shape[1] and filled[int(round(cy2 + dx * (n1 + 1))), int(round(cx2 + dy * (n1 + 1)))]: n1 += 1
            while n2 < rad * 1.6 and 0 <= int(round(cy2 - dx * (n2 + 1))) < filled.shape[0] and 0 <= int(round(cx2 - dy * (n2 + 1))) < filled.shape[1] and filled[int(round(cy2 - dx * (n2 + 1))), int(round(cx2 - dy * (n2 + 1)))]: n2 += 1
            wid.append(n1 + n2 + 1)
        wid = np.array(wid, float); wmax = wid.max(); imax = int(wid.argmax())
        chin = next((i for i in range(imax, len(wid)) if wid[i] < 0.66 * wmax), len(wid) - 1)
        out.append([round(mx - dx * t, 1), round(my - dy * t, 1), round(float(width), 1), round(float(np.arctan2(-dx, dy)), 3), round(float(rad), 1), round(float(t), 1), int(chin)])
    med = float(np.median([h[2] for h in out]))
    for h in out:
        h[2] = round(float(min(max(h[2], med * 0.9), med * 1.1)), 1)   # a head is the same size in every pose: clamp the odd one out
    heads.patches = patches
    return out, a, objs

if __name__ == '__main__':
    for view in ('back', 'front'):
        hs, a, objs = heads(f'../src/spin2-{view}.png', view)
        json.dump(hs, open(f'out/heads-{view}.json', 'w'))
        print(view, len(hs))
        for k, h in enumerate(hs, 1): print(' ', k, h)
