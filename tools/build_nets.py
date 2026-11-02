#!/usr/bin/env python3
"""The cricket nets, level 1 (img/ground/nets1/): the practice ground painted beyond the nets (tools/ground/nets1-scene.png) with the net
lane drawn over it in each match camera's perspective: side nets, roof net, end nets, posts and kickboards.

usage: python3 tools/build_nets.py

The painted scene has no nets in it. Here they are drawn, 3D to the picture, so they line up with the pitch, the batter and the ball: the cage runs
from 12 m behind the batter's stumps to 40 m beyond them (the bowler's run-up is inside), 3.8 m wide and 5 m tall. Posts and the roof frame are the
trim colour (golden yellow, recoloured to the club's second colour), the kickboards along the foot of the side nets the main colour (blue).
Outputs: view-<cam>.webp and -tint.webp (no -uv: the nets carry no crest pictures), and the entry 'nets1' in js/groundart.js.
Needs numpy, scipy and Pillow.
"""
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
sys.path.insert(0, 'tools')
from build_own_paint import hsv, ramp, GREY, TOP_PAD, CY

SRC, OUT = 'tools/ground/nets1-scene.png', 'img/ground/nets1/'
FOOT = 567                 # the first magenta row: the foot of the fence
BOARD_PX, BOARD_M, BOARD_R = 60, 1.0, 40.0      # the fence: its height in the picture and in metres, and how far from the pitch centre it stands
ROOF_ROW = 392             # the top of the hut roof's blue band
Z0, Z1, HALF, TALL, CELL, POST_EVERY = -12.0, 40.0, 1.9, 5.0, 0.6, 6.0
SS = 2                     # the nets are drawn at twice the size and brought down, for smooth lines
CAMS = {
    'bat':    dict(cx=0.25, cy=4.2, cz=-9.5, dir=1,  fcam=1053, hyk=0.30),
    'bowl':   dict(cx=0.2,  cy=2.6, cz=34,   dir=-1, fcam=1560, hyk=0.36),
    'keeper': dict(cx=0.55, cy=4.6, cz=-9,   dir=1,  fcam=663,  hyk=0.28),
}


def weights(rgb):
    """the painted blue and yellow, soft; the lit hut windows and the floodlight lamps are golden too, and stay as painted"""
    hue, sat, v = hsv(rgb)
    H, W = hue.shape; rows = np.arange(H)[:, None] * np.ones((1, W))
    blue = ramp(hue, 198, 212) * (1 - ramp(hue, 240, 247)) * ramp(sat, 0.35, 0.6) * ramp(v, 0.12, 0.3) * ramp(rows, ROOF_ROW - 4, ROOF_ROW + 2)
    yel = ramp(hue, 34, 44) * (1 - ramp(hue, 60, 68)) * ramp(sat, 0.55, 0.8) * ramp(v, 0.5, 0.7) * ramp(rows, 300, 306)   # (nothing above the hut: the lamps)
    lab, n = ndi.label(ndi.binary_closing(yel > 0.5, structure=np.ones((3, 5))), structure=np.ones((3, 3)))
    glass = np.zeros(yel.shape, bool)
    for i, bx in enumerate(ndi.find_objects(lab), 1):
        h, w = bx[0].stop - bx[0].start, bx[1].stop - bx[1].start
        if w >= 40 and h >= 18 and w / h >= 1.3:
            glass |= lab == i
    yel = ndi.gaussian_filter(yel * ~ndi.binary_dilation(glass, iterations=2), 0.6)
    return blue, yel


def net_layers(c, fpic, above, W, H):
    """the nets for one camera, as four pictures (each H x W): the thin dark mesh (alpha), the kickboards (blue mask), the posts' dark outline,
    the posts and the roof frame (yellow mask)"""
    mesh = Image.new('L', (W * SS, H * SS), 0); kick = Image.new('L', (W * SS, H * SS), 0)
    pout = Image.new('L', (W * SS, H * SS), 0); post = Image.new('L', (W * SS, H * SS), 0); veil = Image.new('L', (W * SS, H * SS), 0)
    dm, dk, do, dp, dv = ImageDraw.Draw(mesh), ImageDraw.Draw(kick), ImageDraw.Draw(pout), ImageDraw.Draw(post), ImageDraw.Draw(veil)
    dr, cx, cy, cz = c['dir'], c['cx'], c['cy'], c['cz']
    depth = lambda z: (z - cz) * dr
    def P(x, y, z):
        k = fpic / depth(z)
        return ((W / 2 + dr * (x - cx) * k) * SS, (above + (cy - y) * k) * SS, k)
    near = 0.7                                                    # nothing nearer than this to the camera is drawn
    zs, ze = (max(Z0, cz + near), Z1) if dr > 0 else (Z0, min(Z1, cz - near))
    far_z = Z1 if dr > 0 else Z0                                  # the end net in front of the camera (the one behind it is not seen)
    def line_z(d, x, y, za, zb, w):                               # a line along the lane at (x, y), from za to zb
        a, b = P(x, y, za), P(x, y, zb); d.line([a[:2], b[:2]], fill=255, width=w)
    mw = lambda z: int(np.clip(0.014 * fpic / depth(z), 2.6, 5.0) * SS)   # (the mesh's line width at depth)
    # a faint veil over the net faces (the netting itself): the side nets, the roof and the end net
    for sx in (-HALF, HALF):
        q = [P(sx, 0, zs), P(sx, TALL, zs), P(sx, TALL, ze), P(sx, 0, ze)]; dv.polygon([p[:2] for p in q], fill=255)
    q = [P(-HALF, TALL, zs), P(HALF, TALL, zs), P(HALF, TALL, ze), P(-HALF, TALL, ze)]; dv.polygon([p[:2] for p in q], fill=255)
    q = [P(-HALF, 0, far_z), P(HALF, 0, far_z), P(HALF, TALL, far_z), P(-HALF, TALL, far_z)]; dv.polygon([p[:2] for p in q], fill=255)
    # the mesh: side nets and roof lines along the lane, the cross lines across it
    for j in range(1, int(TALL / CELL) + 1):
        for sx in (-HALF, HALF):
            line_z(dm, sx, j * CELL, zs, ze, mw((zs + ze) / 2))
    for i in range(0, int(2 * HALF / CELL) + 1):
        line_z(dm, -HALF + i * CELL, TALL, zs, ze, mw((zs + ze) / 2))
    zz = zs
    while zz <= ze:
        w = mw(zz)
        for sx in (-HALF, HALF):
            a, b = P(sx, 0, zz), P(sx, TALL, zz); dm.line([a[:2], b[:2]], fill=255, width=w)
        a, b = P(-HALF, TALL, zz), P(HALF, TALL, zz); dm.line([a[:2], b[:2]], fill=255, width=w)
        zz += CELL
    # the end net
    w = mw(far_z)
    for i in range(0, int(2 * HALF / CELL) + 1):
        a, b = P(-HALF + i * CELL, 0, far_z), P(-HALF + i * CELL, TALL, far_z); dm.line([a[:2], b[:2]], fill=255, width=w)
    for j in range(0, int(TALL / CELL) + 1):
        a, b = P(-HALF, j * CELL, far_z), P(HALF, j * CELL, far_z); dm.line([a[:2], b[:2]], fill=255, width=w)
    # the kickboards: a blue band along the foot of each side net
    for sx in (-HALF, HALF):
        a0, a1, b1, b0 = P(sx, 0, zs), P(sx, 0.45, zs), P(sx, 0.45, ze), P(sx, 0, ze)
        dk.polygon([a0[:2], a1[:2], b1[:2], b0[:2]], fill=255)
    # the posts (and the roof frame across the lane at each), far to near so that the near ones cover the far
    zp = [Z0 + i * POST_EVERY for i in range(int((Z1 - Z0) / POST_EVERY) + 1)]
    for z in sorted([z for z in zp if depth(z) >= near], key=lambda z: -depth(z)):
        k = fpic / depth(z); pw = max(0.07 * k * SS, 2.0 * SS)
        for sx in (-HALF, HALF):
            x, yb, _ = P(sx, 0, z); _, yt, _ = P(sx, TALL, z)
            for dd, ww in ((do, pw + 3 * SS), (dp, pw)):
                dd.rectangle([x - ww / 2, yt - (ww - pw) / 2, x + ww / 2, yb + (ww - pw) / 2], fill=255)
        a, b = P(-HALF, TALL, z), P(HALF, TALL, z)
        do.line([a[:2], b[:2]], fill=255, width=int(max(0.045 * k * SS, 1.5 * SS) + 2 * SS))   # (the roof frame: dark steel, not the club's trim)
    return [np.array(im.reduce(SS)).astype(np.float32) / 255 for im in (mesh, kick, pout, post, veil)]


def main():
    src = np.array(Image.open(SRC).convert('RGB')).astype(np.float32)[:FOOT]
    W = src.shape[1]
    blue, yel = weights(src)
    hue, sat, v = hsv(src)
    vb = float(np.median(v[blue > 0.9])); vy = float(np.median(v[yel > 0.9]))
    print('painted blue value', round(vb, 3), 'yellow', round(vy, 3), 'weights', int((blue > 0.5).sum()), int((yel > 0.5).sum()))
    w = np.clip(blue + yel, 0, 1)[..., None]
    gb = np.clip(GREY * 255 * v / vb, 0, 255); gy = np.clip(GREY * 255 * v / vy, 0, 255)
    base = src * (1 - w) + (np.where(blue > yel, gb, gy)[..., None] * np.ones(3)) * w
    rng = np.random.default_rng(11)
    top_row = src[:6].mean(0)
    pad = np.stack([top_row * (0.62 + 0.38 * y / TOP_PAD) for y in range(TOP_PAD)])
    star = rng.random((TOP_PAD, W)) < 0.0016
    pad[star] = np.clip(pad[star] + rng.uniform(120, 230, (star.sum(), 1)), 0, 255)
    rgb_all = np.concatenate([pad, base], 0)
    tint_all = np.concatenate([np.zeros((TOP_PAD, W, 3), np.float32), np.stack([blue * 255, yel * 255, np.zeros_like(blue)], -1)], 0)
    foot = FOOT + TOP_PAD
    GREYV = GREY * 255
    meta_views = {}
    for name, c in CAMS.items():
        D = (CY + BOARD_R) - c['cz'] if c['dir'] > 0 else c['cz'] - (CY - BOARD_R)
        fpic = BOARD_PX * D / BOARD_M
        above = foot - c['cy'] * fpic / D
        rows = int(np.ceil(960 * (1 - c['hyk']) * fpic / c['fcam'])) + 50
        H = foot + rows
        img = np.zeros((H, W, 3), np.float32); img[:foot] = rgb_all
        ys = np.arange(foot, H)
        d = c['cy'] * fpic / np.maximum(ys - above, 1)
        z = c['cz'] + c['dir'] * d
        band = (np.floor(z / 5).astype(int) % 2)[:, None]
        a, b = np.array([36, 112, 36], np.float32), np.array([31, 101, 31], np.float32)
        g = np.where(band[..., None] == 1, a, b) * np.ones((1, W, 1))
        fog = np.exp(-(ys - foot) / 60.0)[:, None, None]
        g = g * (1 - 0.35 * fog) + np.array([14, 28, 48]) * 0.35 * fog
        g += rng.normal(0, 2.2, g.shape)
        img[foot:] = g
        tint = np.zeros((H, W, 3), np.float32); tint[:foot] = tint_all
        mesh, kick, pout, post, veil = net_layers(c, fpic, above, W, H)
        # the layers one over the other: kickboards, the mesh, the posts' outline, the posts
        inkc = np.array([18, 22, 38], np.float32)
        img = img * (1 - 0.16 * veil[..., None]) + np.array([8, 12, 30], np.float32) * 0.16 * veil[..., None]
        img = img * (1 - kick[..., None]) + GREYV * kick[..., None]
        img = img * (1 - 0.8 * mesh[..., None]) + inkc * 0.8 * mesh[..., None]
        img = img * (1 - pout[..., None]) + np.array([10, 10, 20], np.float32) * pout[..., None]
        img = img * (1 - post[..., None]) + GREYV * post[..., None]
        cov_b, cov_y = np.clip(kick - pout, 0, 1), post
        cover = np.maximum(pout, np.maximum(kick, post))
        tint[..., 0] = np.maximum(tint[..., 0] * (1 - cover), kick * 255 * (1 - pout))
        tint[..., 1] = np.maximum(tint[..., 1] * (1 - cover), post * 255)
        Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').save(OUT + f'view-{name}.webp', 'WEBP', quality=88, method=6)
        Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8), 'RGB').save(OUT + f'view-{name}-tint.webp', 'WEBP', lossless=True, method=6)
        roof_row = TOP_PAD + ROOF_ROW; Dr = D + 2
        roof_h = c['cy'] - (roof_row - above) * Dr / fpic
        meta_views[name] = {'f': round(fpic), 'w': W, 'h': H, 'above': round(float(above), 1), 'top': '#%02x%02x%02x' % tuple(int(x) for x in img[0].mean(0)),
                            'bottom': '#%02x%02x%02x' % tuple(int(x) for x in img[-1].mean(0)), 'tile': True,
                            'board': {'r': BOARD_R, 'h': BOARD_M}, 'roof': {'r': BOARD_R + 2, 'h': round(float(roof_h), 1)}}
        print(name, meta_views[name])
    s = open('js/groundart.js').read()
    head, body = s.split('export const GROUND_ART = ', 1)
    K = json.loads(body.rsplit(';', 1)[0])
    K['nets1'] = {'views': meta_views, 'stumps': K['own1']['stumps'], 'broken': K['own1']['broken'], 'top': K['own1']['top']}
    open('js/groundart.js', 'w').write(head + 'export const GROUND_ART = ' + json.dumps(K, indent=1) + ';\n')


if __name__ == '__main__':
    main()
