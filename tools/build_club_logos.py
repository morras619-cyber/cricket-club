#!/usr/bin/env python3
"""The lower-division clubs' crests (img/logo-<id>.webp, 192 px): a bold emblem in the club's
colours, ink outline, a gloss, like the eight painted logos. Emblems are drawn from shapes here.
usage: python3 tools/build_club_logos.py
"""
import math, os, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
S = 768                       # drawn at 4x, saved at 192
INK = (20, 16, 24)


def clubs():
    src = open(os.path.join(HERE, '..', 'js', 'teams.js')).read()
    for m in re.finditer(r"club\('(\w+)', '(d\d)', '([^']+)', '(#\w+)', '(#\w+)', '\w+', '(\w+)'", src):
        yield dict(id=m[1], name=m[3], suit=m[4], trim=m[5], emblem=m[6])


def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def canvas(): return Image.new('L', (S, S), 0)


def poly(d, pts, fill=255): d.polygon([(x * S, y * S) for x, y in pts], fill=fill)


def ell(d, cx, cy, rx, ry, fill=255): d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)


def arcband(d, cx, cy, r0, r1, a0, a1, fill=255, n=60):
    """a curved band between radii r0 and r1, from angle a0 to a1 (degrees)"""
    out = [(cx + r1 * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r1 * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    inn = [(cx + r0 * math.cos(math.radians(a1 - (a1 - a0) * i / n)), cy + r0 * math.sin(math.radians(a1 - (a1 - a0) * i / n))) for i in range(n + 1)]
    poly(d, out + inn, fill)


def rot(pts, cx, cy, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in pts]


# each emblem: (main shape, trim details) as masks
def wave():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    # a curling wave: a big disc with a bite out of it, over a base
    ell(d, 0.5, 0.47, 0.34, 0.34)
    ell(d, 0.6, 0.4, 0.18, 0.18, 0)
    poly(d, [(0.12, 0.62), (0.88, 0.62), (0.9, 0.82), (0.1, 0.82)])
    for k in range(3): arcband(e, 0.5, 0.47, 0.22 + k * 0.035, 0.24 + k * 0.035, 120, 300)
    poly(e, [(0.14, 0.7), (0.86, 0.7), (0.86, 0.74), (0.14, 0.74)])
    return m, t


def wing():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    for k in range(5):
        y = 0.24 + k * 0.11
        poly(d, rot([(0.16, y), (0.86 - k * 0.08, y - 0.08), (0.84 - k * 0.1, y + 0.06), (0.2, y + 0.08)], 0.5, 0.5, -12))
    poly(e, rot([(0.18, 0.3), (0.8, 0.22), (0.8, 0.25), (0.2, 0.33)], 0.5, 0.5, -12))
    ell(d, 0.22, 0.52, 0.12, 0.28)
    return m, t


def tiger():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    ell(d, 0.5, 0.52, 0.36, 0.34)
    poly(d, [(0.2, 0.3), (0.26, 0.1), (0.4, 0.24)]); poly(d, [(0.8, 0.3), (0.74, 0.1), (0.6, 0.24)])
    for sx in (-1, 1):
        for k in range(3):
            y = 0.36 + k * 0.12
            poly(e, [(0.5 + sx * 0.34, y), (0.5 + sx * 0.18, y + 0.03), (0.5 + sx * 0.33, y + 0.06)])
    poly(e, [(0.5, 0.22), (0.46, 0.38), (0.54, 0.38)])
    ell(e, 0.38, 0.5, 0.05, 0.035); ell(e, 0.62, 0.5, 0.05, 0.035)
    poly(e, [(0.44, 0.66), (0.56, 0.66), (0.5, 0.74)])
    return m, t


def lotus():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    for deg in (-60, -30, 0, 30, 60):
        pts = [(0.5 + 0.13 * math.cos(math.radians(a)), 0.5 + 0.34 * math.sin(math.radians(a))) for a in range(0, 360, 10)]
        poly(d, rot([(x, y - 0.12) for x, y in pts], 0.5, 0.72, deg))
        pts2 = [(0.5 + 0.05 * math.cos(math.radians(a)), 0.5 + 0.22 * math.sin(math.radians(a))) for a in range(0, 360, 10)]
        poly(e, rot([(x, y - 0.12) for x, y in pts2], 0.5, 0.72, deg))
    poly(d, [(0.18, 0.74), (0.82, 0.74), (0.7, 0.86), (0.3, 0.86)])
    return m, t


def mountain():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    poly(d, [(0.08, 0.82), (0.38, 0.22), (0.56, 0.5), (0.68, 0.34), (0.92, 0.82)])
    poly(e, [(0.38, 0.22), (0.29, 0.4), (0.34, 0.37), (0.38, 0.42), (0.43, 0.36), (0.47, 0.39)])
    poly(e, [(0.68, 0.34), (0.62, 0.43), (0.67, 0.41), (0.71, 0.45), (0.74, 0.42)])
    return m, t


def anvil():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    poly(d, [(0.1, 0.3), (0.86, 0.3), (0.86, 0.42), (0.66, 0.46), (0.6, 0.62), (0.72, 0.72), (0.72, 0.82), (0.28, 0.82), (0.28, 0.72), (0.4, 0.62), (0.36, 0.46), (0.22, 0.42)])
    poly(e, [(0.14, 0.3), (0.86, 0.3), (0.86, 0.34), (0.14, 0.34)])
    poly(e, [(0.62, 0.12), (0.7, 0.12), (0.66, 0.26)]); poly(e, [(0.48, 0.16), (0.54, 0.14), (0.52, 0.26)])
    return m, t


def comet():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    ell(d, 0.64, 0.38, 0.2, 0.2)
    for k, w in enumerate((0.09, 0.07, 0.05)):
        off = (k - 1) * 0.13
        poly(d, [(0.52 + off * 0.3, 0.3 + off), (0.12 + off * 0.2, 0.82 + off * 0.3), (0.6 + off * 0.3, 0.48 + off)])
    ell(e, 0.68, 0.33, 0.07, 0.06)
    return m, t


def claw():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    ell(d, 0.5, 0.5, 0.38, 0.38)
    for k in range(3):
        x = 0.32 + k * 0.16
        poly(e, [(x + 0.06, 0.2), (x + 0.1, 0.22), (x - 0.02, 0.8), (x - 0.06, 0.78)])
    return m, t


def anchor():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    ell(d, 0.5, 0.17, 0.08, 0.08); ell(d, 0.5, 0.17, 0.035, 0.035, 0)
    poly(d, [(0.46, 0.24), (0.54, 0.24), (0.54, 0.8), (0.46, 0.8)])
    poly(d, [(0.28, 0.34), (0.72, 0.34), (0.72, 0.41), (0.28, 0.41)])
    arcband(d, 0.5, 0.52, 0.28, 0.36, 15, 165)
    poly(d, [(0.1, 0.62), (0.2, 0.52), (0.24, 0.66)]); poly(d, [(0.9, 0.62), (0.8, 0.52), (0.76, 0.66)])
    poly(e, [(0.48, 0.42), (0.52, 0.42), (0.52, 0.78), (0.48, 0.78)])
    return m, t


def jaguar():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    ell(d, 0.5, 0.64, 0.2, 0.17)
    for x, y in ((0.27, 0.4), (0.41, 0.28), (0.59, 0.28), (0.73, 0.4)): ell(d, x, y, 0.085, 0.1)
    ell(e, 0.5, 0.66, 0.08, 0.06)
    return m, t


def crescent():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    ell(d, 0.46, 0.5, 0.34, 0.34); ell(d, 0.58, 0.44, 0.27, 0.27, 0)
    star = [(0.7 + (0.13 if k % 2 == 0 else 0.055) * math.cos(math.radians(-90 + k * 36)), 0.5 + (0.13 if k % 2 == 0 else 0.055) * math.sin(math.radians(-90 + k * 36))) for k in range(10)]
    poly(d, star); poly(e, [(x * 0.6 + 0.7 * 0.4, y * 0.6 + 0.5 * 0.4) for x, y in star])
    return m, t


def bolt():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    b = [(0.56, 0.08), (0.24, 0.52), (0.46, 0.52), (0.36, 0.92), (0.78, 0.4), (0.55, 0.4), (0.68, 0.08)]
    poly(d, b)
    poly(e, [(0.6, 0.12), (0.34, 0.48), (0.4, 0.48), (0.62, 0.16)])
    return m, t


def kite():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    poly(d, [(0.5, 0.08), (0.8, 0.38), (0.5, 0.72), (0.2, 0.38)])
    poly(e, [(0.5, 0.08), (0.5, 0.72), (0.47, 0.72), (0.47, 0.1)]); poly(e, [(0.21, 0.37), (0.79, 0.37), (0.79, 0.4), (0.21, 0.4)])
    for k, (x, y) in enumerate(((0.47, 0.78), (0.42, 0.86), (0.5, 0.93))):
        poly(d, [(x - 0.06, y - 0.03), (x + 0.06, y + 0.03), (x - 0.06, y + 0.03), (x + 0.06, y - 0.03)])
    poly(d, [(0.495, 0.7), (0.51, 0.7), (0.47, 0.95), (0.455, 0.95)])
    return m, t


def tusk():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    ell(d, 0.5, 0.4, 0.3, 0.26)
    ell(d, 0.24, 0.42, 0.14, 0.2); ell(d, 0.76, 0.42, 0.14, 0.2)
    poly(d, [(0.42, 0.55), (0.58, 0.55), (0.56, 0.86), (0.5, 0.9), (0.44, 0.86)])
    arcband(e, 0.32, 0.56, 0.1, 0.15, 30, 160); arcband(e, 0.68, 0.56, 0.1, 0.15, 20, 150)
    ell(e, 0.4, 0.38, 0.03, 0.03); ell(e, 0.6, 0.38, 0.03, 0.03)
    return m, t


def rocket():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    body = [(0.5, 0.06), (0.62, 0.24), (0.62, 0.66), (0.38, 0.66), (0.38, 0.24)]
    poly(d, rot(body, 0.5, 0.5, 35))
    poly(d, rot([(0.38, 0.5), (0.26, 0.7), (0.38, 0.66)], 0.5, 0.5, 35)); poly(d, rot([(0.62, 0.5), (0.74, 0.7), (0.62, 0.66)], 0.5, 0.5, 35))
    poly(d, rot([(0.42, 0.66), (0.58, 0.66), (0.5, 0.92)], 0.5, 0.5, 35))
    ell(e, *rot([(0.5, 0.34)], 0.5, 0.5, 35)[0], 0.06, 0.06)
    poly(e, rot([(0.45, 0.68), (0.55, 0.68), (0.5, 0.86)], 0.5, 0.5, 35))
    return m, t


def lantern():
    m, t = canvas(), canvas(); d, e = ImageDraw.Draw(m), ImageDraw.Draw(t)
    poly(d, [(0.38, 0.1), (0.62, 0.1), (0.62, 0.18), (0.38, 0.18)])
    poly(d, [(0.3, 0.2), (0.7, 0.2), (0.76, 0.5), (0.7, 0.8), (0.3, 0.8), (0.24, 0.5)])
    poly(d, [(0.36, 0.82), (0.64, 0.82), (0.6, 0.9), (0.4, 0.9)])
    ell(e, 0.5, 0.5, 0.14, 0.22)
    for x in (0.37, 0.63): poly(e, [(x - 0.01, 0.22), (x + 0.01, 0.22), (x + 0.01, 0.78), (x - 0.01, 0.78)])
    return m, t


EMBLEMS = dict(wave=wave, wing=wing, tiger=tiger, lotus=lotus, mountain=mountain, anvil=anvil, comet=comet, claw=claw, anchor=anchor,
               jaguar=jaguar, crescent=crescent, bolt=bolt, kite=kite, tusk=tusk, rocket=rocket, lantern=lantern)


def render(c):
    m, t = EMBLEMS[c['emblem']]()
    M = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2))) / 255
    T = np.asarray(t.filter(ImageFilter.GaussianBlur(1))) / 255 * M
    suit, trim = np.array(hexrgb(c['suit']), float), np.array(hexrgb(c['trim']), float)
    yy = np.linspace(0, 1, S)[:, None, None]
    # the body: lighter at the top, darker at the bottom, the trim details on it
    body = np.clip(suit * (1.25 - 0.5 * yy) + 0, 0, 255) * np.ones((S, S, 3))
    body = body * (1 - T[..., None]) + trim * T[..., None]
    # a gloss across the upper part
    gloss = np.clip(1 - np.abs(np.linspace(-1, 1, S)[:, None] * 3 + np.linspace(-1, 1, S)[None, :] * 1.2 + 1.3), 0, 1) * 0.28
    body = body + (255 - body) * gloss[..., None]
    # an ink outline, and round that a thin ring of the trim colour
    ring1 = np.asarray(m.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(1.5))) / 255
    ring2 = np.asarray(m.filter(ImageFilter.MaxFilter(61)).filter(ImageFilter.GaussianBlur(2))) / 255
    out = np.zeros((S, S, 4))
    out[..., :3] = trim * (ring2[..., None]); out[..., 3] = ring2
    out[..., :3] = out[..., :3] * (1 - ring1[..., None]) + np.array(INK) * ring1[..., None]; out[..., 3] = np.maximum(out[..., 3], ring1)
    out[..., :3] = out[..., :3] * (1 - M[..., None]) + body * M[..., None]
    # (the emblem's own inner ink lines between body and details)
    edge = np.asarray(t.filter(ImageFilter.MaxFilter(7))) / 255 - np.asarray(t) / 255
    edge = np.clip(edge, 0, 1) * M * 0.85
    out[..., :3] = out[..., :3] * (1 - edge[..., None]) + np.array(INK) * edge[..., None]
    out[..., 3] = np.maximum(out[..., 3], M) * 255
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    # fit it in the square with a small margin
    bb = im.getbbox(); im = im.crop(bb)
    k = 176 * 4 / max(im.size); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    sq = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sq.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
    sq.resize((192, 192), Image.LANCZOS).save(os.path.join(HERE, '..', 'img', f"logo-{c['id']}.webp"), quality=92)


if __name__ == '__main__':
    for c in clubs():
        render(c); print('wrote', c['id'], c['emblem'])
