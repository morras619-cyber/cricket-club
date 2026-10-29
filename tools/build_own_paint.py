#!/usr/bin/env python3
"""Your own club's ground at a level (1, 2 or 3), from its painted stand (tools/ground/own<level>-stand.png), for the three match cameras.

usage: python3 tools/build_own_paint.py [level ...]      (all three levels when none is named)

SOURCE: one picture per level: a night stand with its floodlights, trees and side stands, painted in one royal blue (seats, roof band, boards) and one golden
yellow (steps, rails, trim); below the stand's foot (row FOOT) flat magenta, which the game replaces.
OUT, per camera (bat, bowl, keeper) in img/ground/own<level>/ (the files js/ownground.js paints in the club's colours):
  view-<v>.webp       the ground: the stand with its blue and yellow turned into a grey ramp (so the club's colour multiplied on gives the
                      club's colour at the painted brightness), the sky carried up and the mown grass laid below the stand in this camera's perspective
  view-<v>-tint.webp  R the main colour's weight, G the trim's
  view-<v>-uv.webp    where the club's plate (crest and name) goes: on the big video screens, black elsewhere
and the cameras' entries for own<level> in js/groundart.js (the picture's focal length, its horizon row ...).
Needs numpy and Pillow.
"""
import json
import numpy as np
from PIL import Image

GREY = 0.7                         # ownground.js: the grey a club-coloured surface is rendered in
CY, BOARD_R = 10.0, 63.8
TOP_PAD = 420                      # more sky above the picture (a tall phone shows more of it)
# the levels: the picture's first magenta row (the foot of the stand's boards), the boards' height in picture pixels, the main stand's width
# in the picture and in metres (a small club ground, a bigger one, the big finished one), the top of the roof's blue band, and how the lit
# windows (golden, like the trim) are kept out of the trim colour: 'rows' (the trim starts at a row) or 'blobs' (the wide lit glass bands);
# and where the big video screens are (a box round each dark panel): the club's crest and name are laid on them (ownground.js picture 4)
LEVELS = {
    1: dict(foot=550, board_px=24, stand_px=660, stand_m=23.0, roof_row=421, glass=('rows', 488)),
    2: dict(foot=582, board_px=25, stand_px=788, stand_m=32.0, roof_row=330, glass=('blobs',), screens=[(1360, 250, 1570, 410)]),
    3: dict(foot=582, board_px=25, stand_px=842, stand_m=42.0, roof_row=241, glass=('blobs',), screens=[(170, 225, 325, 360), (1350, 225, 1510, 360)]),
}
# the cameras (scene.js Cam3D): height, which way it looks, the focal length of the phone-sized screen it is built for (the picture's own
# focal length is worked out from the stand's width), and where the horizon sits on the screen
CAMS = {
    'bat':    dict(cy=4.2, cz=-9.5, dir=1,  fcam=1053, hyk=0.30),
    'bowl':   dict(cy=2.6, cz=34,   dir=-1, fcam=1560, hyk=0.36),
    'keeper': dict(cy=4.6, cz=-9,   dir=1,  fcam=663,  hyk=0.28),
}


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return hue, d / (mx + 1e-6), mx / 255


def ramp(x, a, b):
    return np.clip((x - a) / (b - a), 0, 1)


def weights(rgb, L):
    """how much of each pixel is the main colour (blue) and the trim (yellow): soft, so the edges blend"""
    from scipy import ndimage as ndi
    hue, sat, v = hsv(rgb)
    H, W = hue.shape; rows = np.arange(H)[:, None] * np.ones((1, W))
    roof = L['roof_row']
    blue = ramp(hue, 198, 212) * (1 - ramp(hue, 240, 247)) * ramp(sat, 0.35, 0.6) * ramp(v, 0.12, 0.3) * ramp(rows, roof - 4, roof + 2)
    yel = ramp(hue, 34, 44) * (1 - ramp(hue, 60, 68)) * ramp(sat, 0.55, 0.8) * ramp(v, 0.5, 0.7)
    if L['glass'][0] == 'rows':
        yel = yel * ramp(rows, L['glass'][1], L['glass'][1] + 6)       # (not the lit windows under the roof)
    else:
        # the lit glass bands: wide, flat strips of golden light, whole panes joined across their mullions; the trim is thin lines, steps and posts
        m = yel > 0.5
        lab, n = ndi.label(ndi.binary_closing(m, structure=np.ones((3, 17))), structure=np.ones((3, 3)))
        glass = np.zeros_like(m)
        for i, bx in enumerate(ndi.find_objects(lab), 1):
            h, w = bx[0].stop - bx[0].start, bx[1].stop - bx[1].start
            if w >= 50 and h >= 9 and w / h >= 2.2 and bx[0].start < L['foot'] - 40:
                glass |= lab == i
        yel = yel * ~ndi.binary_dilation(glass, iterations=2)
        yel = ndi.gaussian_filter(yel, 0.6)
    return blue, yel


def screens_uv(rgb, boxes):
    """the uv picture (ownground.js: B 160 = picture 4, the club's plate; R, G where in it) for each dark video screen: the panel is found in
    its box, its four corners give the perspective, and the 2:1 plate is laid across the panel's width, centred, the rest of the glass left dark"""
    import cv2
    from scipy import ndimage as ndi
    H, W = rgb.shape[:2]
    uv = np.zeros((H, W, 3), np.uint8)
    val = rgb.max(-1) / 255
    for (x0, y0, x1, y1) in boxes:
        m = val[y0:y1, x0:x1] < 0.22
        lab, n = ndi.label(m)
        i = int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))) + 1
        ys, xs = np.nonzero(lab == i)
        pts = np.stack([xs + x0, ys + y0], 1).astype(np.float32)
        hull = cv2.convexHull(pts)
        quad = cv2.approxPolyDP(hull, 0.02 * cv2.arcLength(hull, True), True).reshape(-1, 2)
        if len(quad) != 4:
            quad = cv2.boxPoints(cv2.minAreaRect(hull)).astype(np.float32)
        quad = quad.astype(np.float32)
        s_, d_ = quad.sum(1), quad[:, 0] - quad[:, 1]          # corners: top-left, top-right, bottom-right, bottom-left
        tl, br, tr, bl = quad[np.argmin(s_)], quad[np.argmax(s_)], quad[np.argmax(d_)], quad[np.argmin(d_)]
        quad = np.array([tl, tr, br, bl], np.float32)
        c = quad.mean(0); quad = c + (quad - c) * 0.9           # a little inside the frame
        wq = (np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2 * 0.9; hq = (np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2 * 0.9
        band = min(1.0, (wq / 2) / hq)                          # the plate's height as a part of the panel's
        M = cv2.getPerspectiveTransform(quad, np.array([[0, 0], [1, 0], [1, 1], [0, 1]], np.float32))
        gx, gy = np.meshgrid(np.arange(int(quad[:, 0].min()) - 1, int(quad[:, 0].max()) + 2), np.arange(int(quad[:, 1].min()) - 1, int(quad[:, 1].max()) + 2))
        p = M @ np.stack([gx.ravel() + 0.5, gy.ravel() + 0.5, np.ones(gx.size)])
        u, v = (p[0] / p[2]).reshape(gx.shape), (p[1] / p[2]).reshape(gx.shape)
        lo = 0.5 - band / 2
        ok = (u >= 0) & (u <= 1) & (v >= lo) & (v <= lo + band)
        vv = (v - lo) / band
        uv[gy[ok], gx[ok], 0] = np.clip(u[ok] * 255, 0, 255).astype(np.uint8)
        uv[gy[ok], gx[ok], 1] = np.clip((1 - vv[ok]) * 255, 0, 255).astype(np.uint8)
        uv[gy[ok], gx[ok], 2] = 160
    return uv


def build(level):
    L = LEVELS[level]; FOOT, BOARD_PX, STAND_PX, STAND_M, ROOF_ROW = L['foot'], L['board_px'], L['stand_px'], L['stand_m'], L['roof_row']
    SRC = f'tools/ground/own{level}-stand.png'; OUT = f'img/ground/own{level}/'
    src = np.array(Image.open(SRC).convert('RGB')).astype(np.float32)[:FOOT]
    W = src.shape[1]
    blue, yel = weights(src, L)
    hue, sat, v = hsv(src)
    vb = float(np.median(v[blue > 0.9])); vy = float(np.median(v[yel > 0.9]))
    print('painted blue value', round(vb, 3), 'yellow', round(vy, 3), 'weights', int((blue > 0.5).sum()), int((yel > 0.5).sum()))
    # the colour parts as grey ramps (the club colour will be multiplied on: ownground.js paint)
    w = np.clip(blue + yel, 0, 1)[..., None]
    gb = np.clip(GREY * 255 * v / vb, 0, 255); gy = np.clip(GREY * 255 * v / vy, 0, 255)
    ramp_g = np.where(blue > yel, gb, gy)[..., None] * np.ones(3)
    base = src * (1 - w) + ramp_g * w
    # the sky carried up: the top row's colours darkened a little and starred
    rng = np.random.default_rng(7 + level)
    top_row = src[:6].mean(0)
    pad = np.zeros((TOP_PAD, W, 3), np.float32)
    for y in range(TOP_PAD):
        t = y / TOP_PAD
        pad[y] = top_row * (0.62 + 0.38 * t)
    star = rng.random((TOP_PAD, W)) < 0.0016
    pad[star] = np.clip(pad[star] + rng.uniform(120, 230, (star.sum(), 1)), 0, 255)
    rgb_all = np.concatenate([pad, base], 0)
    tint_all = np.concatenate([np.zeros((TOP_PAD, W, 3), np.float32), np.stack([blue * 255, yel * 255, np.zeros_like(blue)], -1)], 0)
    uv_pic = screens_uv(src.astype(np.uint8), L['screens']) if L.get('screens') else np.zeros(src.shape, np.uint8)
    uv_all = np.concatenate([np.zeros((TOP_PAD, W, 3), np.uint8), uv_pic], 0)
    foot = FOOT + TOP_PAD
    meta_views = {}
    for name, c in CAMS.items():
        D = (CY + BOARD_R) - c['cz'] if c['dir'] > 0 else c['cz'] - (CY - BOARD_R)
        fpic = STAND_PX * D / STAND_M                         # (the focal length at which the stand is that wide)
        board_m = BOARD_PX * D / fpic
        above = foot - c['cy'] * fpic / D                      # the picture's horizon row
        rows = int(np.ceil(960 * (1 - c['hyk']) * fpic / c['fcam'])) + 50   # grass down to the foot of the tallest phone
        H = foot + rows
        img = np.zeros((H, W, 3), np.float32); img[:foot] = rgb_all
        # the grass: 5 m mown bands across the ground, in this camera's perspective
        ys = np.arange(foot, H)
        d = c['cy'] * fpic / np.maximum(ys - above, 1)
        z = c['cz'] + c['dir'] * d
        band = (np.floor(z / 5).astype(int) % 2)[:, None]
        a, b = np.array([36, 112, 36], np.float32), np.array([31, 101, 31], np.float32)
        g = np.where(band[..., None] == 1, a, b) * np.ones((1, W, 1))
        fog = np.exp(-(ys - foot) / 60.0)[:, None, None]                 # darker and bluer into the distance, by the stand
        g = g * (1 - 0.35 * fog) + np.array([14, 28, 48]) * 0.35 * fog
        # (no darker sides: the picture is mirrored side by side on a wide screen, and a dark edge would show as a line at every join)
        g += rng.normal(0, 2.2, g.shape)
        img[foot:] = g
        tint = np.zeros((H, W, 3), np.float32); tint[:foot] = tint_all
        base_img = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
        base_img.save(OUT + f'view-{name}.webp', 'WEBP', quality=88, method=6)
        Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8), 'RGB').save(OUT + f'view-{name}-tint.webp', 'WEBP', lossless=True, method=6)
        uv = np.zeros((H, W, 3), np.uint8); uv[:foot] = uv_all
        Image.fromarray(uv, 'RGB').save(OUT + f'view-{name}-uv.webp', 'WEBP', lossless=True, exact=True)
        # the roof (r from the camera's own height and the roof row)
        roof_row = TOP_PAD + ROOF_ROW; r = BOARD_R + 2; Dr = D + 2
        roof_h = c['cy'] - (roof_row - above) * Dr / fpic
        top = '#%02x%02x%02x' % tuple(int(x) for x in img[0].mean(0))
        bottom = '#%02x%02x%02x' % tuple(int(x) for x in img[-1].mean(0))
        meta_views[name] = {'f': round(fpic), 'w': W, 'h': H, 'above': round(float(above), 1), 'top': top, 'bottom': bottom, 'tile': True,
                            'board': {'r': BOARD_R, 'h': round(float(board_m), 2)}, 'roof': {'r': r, 'h': round(float(roof_h), 1)}}
        print(name, meta_views[name])
    s = open('js/groundart.js').read()
    head, body = s.split('export const GROUND_ART = ', 1)
    K = json.loads(body.rsplit(';', 1)[0]); K[f'own{level}']['views'] = meta_views
    open('js/groundart.js', 'w').write(head + 'export const GROUND_ART = ' + json.dumps(K, indent=1) + ';\n')


def main():
    import sys
    for lv in ([int(x) for x in sys.argv[1:]] or sorted(LEVELS)):
        print('level', lv); build(lv)


if __name__ == '__main__':
    main()
