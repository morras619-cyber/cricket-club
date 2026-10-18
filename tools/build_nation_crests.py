#!/usr/bin/env python3
"""Crests for the national sides: a shield in the flag's design with a thick dark outline, like
the club logos. Writes img/logo-india.webp and img/logo-pakistan.webp (512 px)."""
import math
from PIL import Image, ImageDraw, ImageFilter

N, SS = 512, 4
INK = (20, 16, 32, 255)


def shield(d, s, inset=0):
    w = N * s
    pts = []
    top, side, tip = 0.10, 0.12, 0.93
    for k in range(41):
        t = k / 40  # down the right side: straight, then curving into the point
        if t < 0.45:
            pts.append((w * (1 - side), w * (top + 0.42 * t / 0.45)))
        else:
            u = (t - 0.45) / 0.55
            pts.append((w * (0.5 + (0.5 - side) * math.cos(u * math.pi / 2)), w * (0.52 + (tip - 0.52) * math.sin(u * math.pi / 2))))
    right = pts
    left = [(w - x, y) for x, y in reversed(right)]
    poly = [(w * side, w * top), (w * 0.5, w * (top - 0.035)), (w * (1 - side), w * top)] + right + left
    if inset:
        cx, cy = w / 2, w * 0.5
        poly = [(cx + (x - cx) * (1 - inset), cy + (y - cy) * (1 - inset)) for x, y in poly]
    return poly


def star(cx, cy, r, rot=-math.pi / 2):
    return [(cx + (r if k % 2 == 0 else r * 0.42) * math.cos(rot + k * math.pi / 5), cy + (r if k % 2 == 0 else r * 0.42) * math.sin(rot + k * math.pi / 5)) for k in range(10)]


def build(name, paint):
    big = Image.new('RGBA', (N * SS, N * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    d.polygon(shield(d, SS), fill=INK)                        # outline
    inner = Image.new('RGBA', big.size, (0, 0, 0, 0))
    paint(ImageDraw.Draw(inner), N * SS)
    m = Image.new('L', big.size, 0)
    ImageDraw.Draw(m).polygon(shield(d, SS, inset=0.075), fill=255)
    big.paste(inner, (0, 0), m)
    # a soft gloss across the top, like the drawn kit
    gl = Image.new('RGBA', big.size, (255, 255, 255, 0))
    ImageDraw.Draw(gl).ellipse([N * SS * 0.05, -N * SS * 0.55, N * SS * 0.95, N * SS * 0.36], fill=(255, 255, 255, 46))
    gm = Image.new('L', big.size, 0); gm.paste(m, (0, 0))
    big.paste(Image.alpha_composite(big, gl), (0, 0), gm)
    big.resize((N, N), Image.LANCZOS).save(f'img/logo-{name}.webp', 'WEBP', quality=92)


def india(d, w):
    for k, c in enumerate([(255, 153, 51), (255, 255, 255), (19, 136, 8)]):
        d.rectangle([0, w * (0.06 + k * 0.29), w, w * (0.06 + (k + 1) * 0.29)], fill=c)
    cx, cy, r = w / 2, w * 0.495, w * 0.115
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(0, 0, 128), width=int(w * 0.018))
    for k in range(24):
        a = k * math.pi / 12
        d.line([(cx, cy), (cx + r * 0.95 * math.cos(a), cy + r * 0.95 * math.sin(a))], fill=(0, 0, 128), width=int(w * 0.007))
    d.ellipse([cx - r * 0.2, cy - r * 0.2, cx + r * 0.2, cy + r * 0.2], fill=(0, 0, 128))


def pakistan(d, w):
    d.rectangle([0, 0, w, w], fill=(1, 102, 56))
    d.rectangle([0, 0, w * 0.27, w], fill=(255, 255, 255))
    cx, cy, r = w * 0.6, w * 0.47, w * 0.2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255))
    o = r * 0.86
    d.ellipse([cx + r * 0.28 - o, cy - r * 0.2 - o, cx + r * 0.28 + o, cy - r * 0.2 + o], fill=(1, 102, 56))
    d.polygon(star(cx + r * 0.62, cy - r * 0.42, r * 0.36, rot=-math.pi / 2 + 0.5), fill=(255, 255, 255))


if __name__ == '__main__':
    build('india', india)
    build('pakistan', pakistan)
