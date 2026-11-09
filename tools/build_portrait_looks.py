#!/usr/bin/env python3
"""Read each painted portrait's skin tone and hair colour (img/cards/portraits/*.webp) and write
them to js/portrait-looks.js, so the player on the pitch has the same complexion and hair as his
picture. A list of hand fixes covers caps, helmets and turbans that hide the hair.

usage: python3 tools/build_portrait_looks.py
Needs numpy and Pillow.
"""
import json
import os
import numpy as np
from PIL import Image

# hair hidden or misread: the colour to use instead (or 'none' for a shaved head)
HAIR_FIX = {
    'tariq-mirza': '#1a1210', 'ehan-rizvi': '#241812', 'farid-jalali': '#1c1410', 'jaspreet-dhillon': '#141010',
    'callum-fraser': '#3a2a1c', 'nadir-sheikh': '#5a5652', 'sameer-javed': '#1e1814', 'thunder-raja': '#1b1410',
    'andre-belgrave': '#2a1a10', 'dev-kulkarni': '#1e1612', 'corbin-hayes': '#5a4028', 'sipho-nkosi': '#141010',
    'yasir-abbasi': '#8a8580', 'ethan-van-der-berg': '#a8844e', 'tendai-moyo': '#1a1412', 'marco-pienaar': '#b89a64',
    # the last batch: a turban, a helmet and a headband hide the hair
    'rohit-grewal': '#141010', 'faizan-paracha': '#141010', 'rhys-mckenzie': '#9a7a48',
    # (a flat cap, a headband and a bat)
    'bilal-noorzai': '#1c1410', 'jermaine-granger': '#141010', 'captain-comet': '#2a1a14', 'iron-wall-ian': '#2a1a14',
    # the black-background sheets: a red headband over dark hair, and golden curls the outline darkens
    'ahsan-gondal': '#2a1612', 'blake-ruawai': '#b5873f',
    # the sky-background sheets: two turbans and four caps/hats hide the hair
    'varun-grewal': '#141010', 'sahil-bhalla': '#141010', 'varun-menon': '#1e1612', 'nuwan-jayasena': '#1e1612',
    'sajid-sikder': '#2a1c14', 'vihaan-mathur': '#2a1c14', 'talha-hashmi': '#241812',
    # the league sheets: a turban and a headband hide the hair
    'zubair-kakar': '#141010', 'sahil-nanda': '#241812',
}


# skin misread (a lit face on a dark painting): the tone to use instead
# the black players: the painted faces are lit warm, so the face reads lighter than the man is, and they came out a light brown (or white) on the pitch. Each is set by eye
BLACK_FIX = {k: '#6b412a' for k in [
    'dwayne-hollis', 'jermaine-alleyne', 'jermaine-belgrave', 'jermaine-granger', 'jermaine-thorpe', 'marlon-greaves', 'marlon-thorpe', 'mpho-ndlovu', 'mpho-nkosi',
    'mpho-steyn-louw', 'romario-clarke', 'ruan-mokoena', 'shamar-greaves', 'shane-granger', 'shane-phillip', 'sipho-nkosi', 'tendai-moyo', 'tevin-baptiste', 'tevin-clarke',
    'tevin-hollis', 'thabo-botha', 'thabo-mthembu', 'andre-granger']}
BROWN_FIX = {k: '#8a5a3a' for k in ['akeem-bascombe', 'kyle-jacobs', 'qais-safi', 'nuwan-jayasena']}
SKIN_FIX = {**BLACK_FIX, **BROWN_FIX, 'callum-fraser': '#f0ac82', 'thunder-raja': '#c98e63', 'andre-belgrave': '#7a4a2e', 'captain-comet': '#c27a52', 'cyclone-zaheer': '#cd8458',
            'iron-wall-ian': '#f0ac82', 'rubber-rocket-rory': '#f0ac82'}   # (the two Westerners: the peach of their painted faces, a fair tone between the game's two lightest)


def hsv(rgb):
    r, g, b = [rgb[..., i] / 255 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    hr = m & (mx == r); hg = m & (mx == g) & ~hr; hb = m & ~hr & ~hg
    h[hr] = ((g - b)[hr] / d[hr]) % 6; h[hg] = (b - r)[hg] / d[hg] + 2; h[hb] = (r - g)[hb] / d[hb] + 4
    return (h * 60) % 360, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


SKIN_PALETTE = ['#f3cfb0', '#e8b48c', '#c98e63', '#a8714f', '#7f4f33', '#553322']   # (js/looks.js SKIN, light to dark)
# the painted face is lit warm and its highlights run orange, so its colours are not a skin tone to paint a figure with. What it does say is how light or dark the person is:
# the middle of the cheeks and forehead (not the hair's edge, the beard or a highlight), as a lightness, read onto the game's own skin palette
TONE_FROM = [90, 105, 120, 140, 160, 180]      # the face's lightness in the painting ...
TONE_TO = [58, 80, 105, 140, 172, 205]         # ... and the lightness of the skin to paint the figure with


def palette_at(lum):
    cols = [np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) for c in SKIN_PALETTE]
    ls = [float(c @ np.array([0.3, 0.59, 0.11])) for c in cols]     # (214 .. 55)
    if lum >= ls[0]:
        return cols[0]
    if lum <= ls[-1]:
        return cols[-1]
    for i in range(len(cols) - 1):
        if ls[i] >= lum >= ls[i + 1]:
            t = (ls[i] - lum) / (ls[i] - ls[i + 1])
            return cols[i] * (1 - t) + cols[i + 1] * t


def face_tone(path, fr):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    H, W = a.shape[:2]
    op = a[..., 3] > 200
    top = np.nonzero(op.any(1))[0].min()
    cx, fw = fr
    x0, x1 = max(0, int((cx - fw * 0.18) * W)), int((cx + fw * 0.18) * W)
    y0, y1 = top + int(H * 0.10), top + int(H * 0.26)
    box = a[y0:y1, x0:x1]
    h, s, v = hsv(box[..., :3])
    m = (box[..., 3] > 200) & (h > 8) & (h < 34) & (s > 0.3) & (s < 0.78) & (v > 0.45)
    if m.sum() < 30:
        return None
    return float(np.median(box[..., :3][m] @ np.array([0.3, 0.59, 0.11])))


def natural_skin(path, fr, fallback):
    lp = face_tone(path, fr)
    if lp is None:
        return fallback
    ls = float(np.interp(lp, TONE_FROM, TONE_TO))
    return hexof(palette_at(ls))


# The painted faces are all lit warm, so how light a face is says little (an Indian's painted face is as bright as a white man's); what tells them apart in these
# paintings is how orange the skin is: a fair face is pinker and less saturated, a darker complexion is more saturated and a little deeper in value. So the tone comes from the
# median colour of the middle of the face (cheeks, nose, forehead; skin-coloured pixels only): its saturation first, its depth second, read onto a ramp from a fair tone to a brown
# one. The black players are set by hand (BLACK_FIX), the faces below them are all lit alike.
SAT_FAIR, SAT_DEEP = 0.47, 0.74          # the saturation of the fairest and of the most saturated non-black face
VAL_DEEP, VAL_LIGHT = 0.74, 0.99         # the value of the deepest and the brightest
RAMP = [(0.00, (241, 197, 163)), (0.25, (226, 170, 130)), (0.50, (200, 138, 90)), (0.75, (180, 118, 76)), (1.00, (160, 100, 62))]   # fair '#f1c5a3' .. a deep orange-brown '#a0643e' (a painted Indian face is as orange as this; a pale peach reads as a white man on the pitch)


def face_colour(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    ys, xs = np.nonzero(a[..., 3] > 200)
    if len(ys) < 100:
        return None
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    H, W = y1 - y0, x1 - x0
    box = a[y0 + int(.10 * H):y0 + int(.40 * H), x0 + int(.30 * W):x0 + int(.70 * W)]
    h, s, v = hsv(box[..., :3])
    m = (box[..., 3] > 200) & (h > 5) & (h < 40) & (s > 0.2) & (s < 0.75) & (v > 0.25)
    if m.sum() < 50:
        return None
    return np.median(box[..., :3][m], 0)


def calibrated_skin(path, fallback):
    c = face_colour(path)
    if c is None:
        return fallback
    r, g, b = c / 255
    mx, mn = max(r, g, b), min(r, g, b)
    sat, val = (mx - mn) / mx if mx else 0.0, mx
    d = 0.6 * min(1, max(0, (sat - SAT_FAIR) / (SAT_DEEP - SAT_FAIR))) + 0.4 * min(1, max(0, (VAL_LIGHT - val) / (VAL_LIGHT - VAL_DEEP)))
    for (d0, c0), (d1, c1) in zip(RAMP, RAMP[1:]):
        if d <= d1:
            t = (d - d0) / (d1 - d0)
            return hexof(np.array(c0) * (1 - t) + np.array(c1) * t)
    return hexof(np.array(RAMP[-1][1]))


def hexof(c):
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)


def look(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    H = a.shape[0]
    op = a[..., 3] > 200
    h, s, v = hsv(a[..., :3])
    ys = np.nonzero(op.any(1))[0]
    top = ys.min()
    head = np.zeros_like(op)
    head[top:top + int(H * 0.42)] = True  # the head sits at the top of every portrait
    # skin: warm, fairly saturated, not the yellow kit nor the pale bat
    skin = op & head & (h > 5) & (h < 38) & (s > 0.22) & (s < 0.78) & (v > 0.22) & (v < 0.97)
    # the face's own tone, not its painted highlights: the middle of the darker half
    if skin.sum() > 50:
        px = a[..., :3][skin]
        lum = px @ np.array([0.3, 0.59, 0.11])
        # a darker face's highlights wash it out; a fair face's shadows make it look tanned
        sk = np.median(px[lum <= np.median(lum)], 0) if np.median(lum) < 125 else np.median(px[lum >= np.percentile(lum, 35)], 0)
    else:
        sk = np.array([160, 110, 80])
    # hair: the top band of the figure, minus skin, kit and outline
    band = np.zeros_like(op)
    band[top:top + int(H * 0.16)] = True
    hair = op & band & ~skin & (v > 0.06) & ~((h > 40) & (h < 70) & (s > 0.5)) & ~((h > 200) & (h < 260) & (s > 0.4))
    hr = np.median(a[..., :3][hair], 0) if hair.sum() > 40 else np.array([30, 22, 18])
    return hexof(sk), hexof(hr)


def frame(path):
    """[x of the face's centre, width of the face], each as a share of the picture's width: the skin of the head's band, ears to
    ears. The portraits are cut out to their hair, so a close-cropped man fills the picture and a man with big hair does not;
    the squad tiles use this to draw every face the same size."""
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    H, W = a.shape[:2]
    op = a[..., 3] > 200
    h, s, v = hsv(a[..., :3])
    top = np.nonzero(op.any(1))[0].min()
    band = np.zeros_like(op)
    band[top:top + int(H * 0.42)] = True
    skin = op & band & (h > 5) & (h < 38) & (s > 0.22) & (s < 0.78) & (v > 0.22) & (v < 0.97)
    xs = np.nonzero(skin)[1]
    if xs.size < 200:
        return [0.5, 0.7]
    lo, hi = np.percentile(xs, 3), np.percentile(xs, 97)
    return [round(float((lo + hi) / 2 / W), 3), round(float((hi - lo) / W), 3)]


def main():
    d = 'img/cards/portraits/'
    out, frames = {}, {}
    for f in sorted(os.listdir(d)):
        if not f.endswith('.webp'):
            continue
        k = f[:-5]
        sk, hr = look(d + f)
        frames[k] = frame(d + f)
        sk = calibrated_skin(d + f, natural_skin(d + f, frames[k], sk))
        out[k] = {'skin': SKIN_FIX.get(k, sk), 'hair': HAIR_FIX.get(k, hr)}
    with open('js/portrait-looks.js', 'w') as fh:
        fh.write('// Skin tone and hair colour read off each painted portrait, so the player on the pitch\n')
        fh.write('// matches his picture. Made by tools/build_portrait_looks.py.\n')
        fh.write('export const PORTRAIT_LOOKS = ' + json.dumps(out, separators=(',', ':')) + ';\n')
        fh.write('// where each face is in its picture: [x of its centre, its width], as shares of the picture width (the squad tiles)\n')
        fh.write('export const PORTRAIT_FRAMES = ' + json.dumps(frames, separators=(',', ':')) + ';\n')
    print(len(out), 'looks')


if __name__ == '__main__':
    main()
