#!/usr/bin/env python3
"""Your own club's level-1 ground, from the painted stand (tools/ground/own1-stand.png), for the three match cameras.

usage: python3 tools/build_own1_paint.py

SOURCE: one portrait picture (1024 x 1536): a small night stand, painted in one royal blue (seats, roof band, boards) and one golden
yellow (steps, rails, trim); below the stand's foot (row FOOT) flat magenta, which the game replaces.
OUT, per camera (bat, bowl, keeper) in img/ground/own1/ (the files js/ownground.js paints in the club's colours):
  view-<v>.webp       the ground: the stand with its blue and yellow turned into a grey ramp (so the club's colour multiplied on gives the
                      club's colour at the painted brightness), the sky carried up and the mown grass laid below the stand in this camera's perspective
  view-<v>-tint.webp  R the main colour's weight, G the trim's
  view-<v>-uv.webp    black (no crest pictures on this stand)
and the cameras' entries for own1 in js/groundart.js (the picture's focal length, its horizon row ...).
Needs numpy and Pillow.
"""
import json
import numpy as np
from PIL import Image

SRC = 'tools/ground/own1-stand.png'
OUT = 'img/ground/own1/'
FOOT = 575                         # the first magenta row: the foot of the stand's boards
BOARD_H = 32                       # the boards, in picture pixels (0.95 m on the real thing)
GREY = 0.7                         # ownground.js: the grey a club-coloured surface is rendered in
CY, BOARD_R, BOARD_M = 10.0, 63.8, 0.95
TOP_PAD = 420                      # more sky above the picture (a tall phone shows more of it)
# the cameras (scene.js Cam3D): height, depth of the far boards, the picture's focal length (so the boards come out 0.95 m high), the
# rows of grass wanted below the stand (the tallest phone, at that camera's scale), and which way it looks
CAMS = {
    'bat':    dict(cy=4.2, cz=-9.5, dir=1,  fcam=1053, hyk=0.30, rows=1900),
    'bowl':   dict(cy=2.6, cz=34,   dir=-1, fcam=1560, hyk=0.36, rows=1250),
    'keeper': dict(cy=4.6, cz=-9,   dir=1,  fcam=663,  hyk=0.28, rows=2900),
}


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return hue, d / (mx + 1e-6), mx / 255


def ramp(x, a, b):
    return np.clip((x - a) / (b - a), 0, 1)


def weights(rgb):
    """how much of each pixel is the main colour (blue) and the trim (yellow): soft, so the edges blend"""
    hue, sat, v = hsv(rgb)
    H, W = hue.shape; rows = np.arange(H)[:, None] * np.ones((1, W))
    blue = ramp(hue, 198, 212) * (1 - ramp(hue, 244, 256)) * ramp(sat, 0.35, 0.6) * ramp(v, 0.12, 0.3) * ramp(rows, 410, 425)
    yel = ramp(hue, 36, 44) * (1 - ramp(hue, 60, 68)) * ramp(sat, 0.55, 0.8) * ramp(v, 0.5, 0.7) * ramp(rows, 498, 506)   # (not the lit windows under the roof)
    return blue, yel


def main():
    src = np.array(Image.open(SRC).convert('RGB')).astype(np.float32)[:FOOT]
    W = src.shape[1]
    blue, yel = weights(src)
    hue, sat, v = hsv(src)
    vb = float(np.median(v[blue > 0.9])); vy = float(np.median(v[yel > 0.9]))
    print('painted blue value', round(vb, 3), 'yellow', round(vy, 3), 'weights', int((blue > 0.5).sum()), int((yel > 0.5).sum()))
    # the colour parts as grey ramps (the club colour will be multiplied on: ownground.js paint)
    w = np.clip(blue + yel, 0, 1)[..., None]
    gb = np.clip(GREY * 255 * v / vb, 0, 255); gy = np.clip(GREY * 255 * v / vy, 0, 255)
    ramp_g = np.where(blue > yel, gb, gy)[..., None] * np.ones(3)
    base = src * (1 - w) + ramp_g * w
    # the sky carried up: the top row's colours darkened a little and starred
    rng = np.random.default_rng(7)
    top_row = src[:6].mean(0)
    pad = np.zeros((TOP_PAD, W, 3), np.float32)
    for y in range(TOP_PAD):
        t = y / TOP_PAD
        pad[y] = top_row * (0.62 + 0.38 * t)
    star = rng.random((TOP_PAD, W)) < 0.0016
    pad[star] = np.clip(pad[star] + rng.uniform(120, 230, (star.sum(), 1)), 0, 255)
    rgb_all = np.concatenate([pad, base], 0)
    tint_all = np.concatenate([np.zeros((TOP_PAD, W, 3), np.float32), np.stack([blue * 255, yel * 255, np.zeros_like(blue)], -1)], 0)
    foot = FOOT + TOP_PAD
    meta_views = {}
    for name, c in CAMS.items():
        D = c['cz'] * -1 + CY + BOARD_R if c['dir'] > 0 else c['cz'] - (CY - BOARD_R)   # depth of the far boards
        D = (CY + BOARD_R) - c['cz'] if c['dir'] > 0 else c['cz'] - (CY - BOARD_R)
        fpic = BOARD_H * D / BOARD_M
        above = foot - c['cy'] * fpic / D                      # the picture's horizon row
        rows = c['rows']
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
        xs = np.linspace(-1, 1, W)[None, :, None]
        g = g * (1 - 0.18 * xs ** 2)                                     # the sides a little darker
        g += rng.normal(0, 2.2, g.shape)
        img[foot:] = g
        tint = np.zeros((H, W, 3), np.float32); tint[:foot] = tint_all
        base_img = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
        base_img.save(OUT + f'view-{name}.webp', 'WEBP', quality=88, method=6)
        Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8), 'RGB').save(OUT + f'view-{name}-tint.webp', 'WEBP', lossless=True, method=6)
        Image.fromarray(np.zeros((H, W, 3), np.uint8), 'RGB').save(OUT + f'view-{name}-uv.webp', 'WEBP', lossless=True)
        # the roof (r from the camera's own height and the roof row)
        roof_row = TOP_PAD + 425; r = BOARD_R + 2; Dr = D + 2
        roof_h = c['cy'] - (roof_row - above) * Dr / fpic
        top = '#%02x%02x%02x' % tuple(int(x) for x in img[0].mean(0))
        bottom = '#%02x%02x%02x' % tuple(int(x) for x in img[-1].mean(0))
        meta_views[name] = {'f': round(fpic), 'w': W, 'h': H, 'above': round(float(above), 1), 'top': top, 'bottom': bottom, 'tile': True,
                            'board': {'r': BOARD_R, 'h': BOARD_M}, 'roof': {'r': r, 'h': round(float(roof_h), 1)}}
        print(name, meta_views[name])
    s = open('js/groundart.js').read()
    head, body = s.split('export const GROUND_ART = ', 1)
    K = json.loads(body.rsplit(';', 1)[0]); K['own1']['views'] = meta_views
    open('js/groundart.js', 'w').write(head + 'export const GROUND_ART = ' + json.dumps(K, indent=1) + ';\n')


if __name__ == '__main__':
    main()
