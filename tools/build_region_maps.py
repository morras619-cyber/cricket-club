#!/usr/bin/env python3
"""The neon world map on the Super League's region screen, one picture per region with that region
lit up (img/region/map-<region>.webp, transparent round the land). Countries: Natural Earth 1:110m
(public domain), in tools/regions/countries.json. usage: python3 tools/build_region_maps.py
"""
import json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'img', 'region')
COUNTRIES = json.load(open(os.path.join(HERE, 'regions', 'countries.json')))
# the game's regions: Natural Earth continents (Russia lit with Asia, where the league plays)
REGIONS = {
    'africa': lambda c: c['continent'] == 'Africa',
    'europe': lambda c: c['continent'] == 'Europe' and c['name'] != 'Russia',
    'asia': lambda c: c['continent'] == 'Asia' or c['name'] == 'Russia',
    'namerica': lambda c: c['continent'] == 'North America',
    'samerica': lambda c: c['continent'] == 'South America',
    'oceania': lambda c: c['continent'] == 'Oceania',
}
W, H, SS = 1200, 640, 2           # the picture, drawn at twice the size and scaled down (smooth edges)
LON0, LAT_TOP, LAT_BOT = -168, 82, -56


def miller(lon, lat):
    return lon, 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))


Y_TOP, Y_BOT = miller(0, LAT_TOP)[1], miller(0, LAT_BOT)[1]


def to_px(lon, lat):
    lon = (lon - LON0) % 360
    x, y = miller(lon, max(LAT_BOT - 5, min(LAT_TOP + 3, lat)))
    return (x / 360 * W * SS, (Y_TOP - y) / (Y_TOP - Y_BOT) * H * SS)


def rings(c):
    polys = c['coords'] if c['type'] == 'MultiPolygon' else [c['coords']]
    for poly in polys:
        ring = poly[0]
        pts = [to_px(lon, lat) for lon, lat in ring]
        # (a ring crossing the map's edge is split there, so it isn't smeared across the map)
        part = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            if abs(b[0] - a[0]) > W * SS / 2:
                yield part; part = []
            part.append(b)
        yield part


def layer(sel, fill, outline, inner, glow, glow_r, line_w):
    """one set of countries: its filled land, its coast lit in neon, the borders inside faint"""
    size = (W * SS, H * SS)
    land = Image.new('L', size, 0); dl = ImageDraw.Draw(land)
    edges = Image.new('L', size, 0); de = ImageDraw.Draw(edges)
    for c in COUNTRIES:
        if c['continent'] == 'Antarctica' or not sel(c): continue
        for r in rings(c):
            if len(r) > 2: dl.polygon(r, fill=255)
            de.line(r + r[:1] if len(r) > 2 else r, fill=255, width=int(1.4 * SS))
    coast = Image.fromarray(((np.asarray(land.filter(ImageFilter.MaxFilter(5))) > 0) & ~(np.asarray(land.filter(ImageFilter.MinFilter(5))) > 0)).astype(np.uint8) * 255)
    coast = coast.filter(ImageFilter.MaxFilter(line_w)) if line_w > 1 else coast
    halo = coast.filter(ImageFilter.GaussianBlur(glow_r * SS))
    return land, coast, edges, halo


def solid(rgb, mask, alpha=1.0):
    a = (np.asarray(mask).astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)
    im = Image.new('RGBA', mask.size, (*rgb, 0)); im.putalpha(Image.fromarray(a)); return im


def halftone(size, step, r, rgb):
    im = Image.new('RGBA', size, (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for y in range(0, size[1], step):
        for x in range((y // step) % 2 * step // 2, size[0], step):
            d.ellipse([x - r, y - r, x + r, y + r], fill=(*rgb, 255))
    return im


def render(region):
    size = (W * SS, H * SS)
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    lit = REGIONS[region]
    for sel, on in ((lambda c: not lit(c), False), (lit, True)):
        land, coast, edges, halo = layer(sel, None, None, None, None, 7 if on else 5, 5 if on else 3)
        if on:
            # the lit region: green, darker to the south, its coast and borders glowing yellow
            g = np.linspace(0, 1, size[1])[:, None]
            col = np.dstack([40 + 30 * (1 - g) + 0 * g, 170 - 50 * g + 0 * g, 40 + 0 * g])
            col = np.broadcast_to(col, (size[1], size[0], 3)).astype(np.uint8)
            fill = Image.fromarray(col).convert('RGBA'); fill.putalpha(land)
            out.alpha_composite(solid((255, 214, 40), halo, 2.6))
            out.alpha_composite(fill)
            out.alpha_composite(solid((190, 255, 140), Image.fromarray((np.asarray(edges) * (np.asarray(land) > 0)).astype(np.uint8)), 0.55))
            out.alpha_composite(solid((255, 236, 90), coast))
        else:
            fill = solid((8, 22, 92), land)
            dots = halftone(size, 9 * SS, int(1.3 * SS), (30, 64, 170)); dots.putalpha(Image.fromarray((np.asarray(land) * 0.55).astype(np.uint8)))
            out.alpha_composite(solid((40, 150, 255), halo, 2.4))
            out.alpha_composite(fill); out.alpha_composite(dots)
            out.alpha_composite(solid((90, 200, 255), Image.fromarray((np.asarray(edges) * (np.asarray(land) > 0)).astype(np.uint8)), 0.25))
            out.alpha_composite(solid((110, 225, 255), coast))
    out = out.resize((W, H), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    out.save(os.path.join(OUT, f'map-{region}.webp'), quality=88, method=6)
    print('wrote', region)


if __name__ == '__main__':
    for r in REGIONS: render(r)
