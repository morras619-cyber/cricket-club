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
}


# skin misread (a lit face on a dark painting): the tone to use instead
SKIN_FIX = {'andre-belgrave': '#7a4a2e', 'captain-comet': '#c27a52', 'cyclone-zaheer': '#cd8458',
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


def main():
    d = 'img/cards/portraits/'
    out = {}
    for f in sorted(os.listdir(d)):
        if not f.endswith('.webp'):
            continue
        k = f[:-5]
        sk, hr = look(d + f)
        out[k] = {'skin': SKIN_FIX.get(k, sk), 'hair': HAIR_FIX.get(k, hr)}
    with open('js/portrait-looks.js', 'w') as fh:
        fh.write('// Skin tone and hair colour read off each painted portrait, so the player on the pitch\n')
        fh.write('// matches his picture. Made by tools/build_portrait_looks.py.\n')
        fh.write('export const PORTRAIT_LOOKS = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    print(len(out), 'looks')


if __name__ == '__main__':
    main()
