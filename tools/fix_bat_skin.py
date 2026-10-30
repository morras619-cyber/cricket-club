#!/usr/bin/env python3
"""Takes the bat out of the skin map of the old batter sheet (img/kit/bat-back-mask.png, the R channel).

usage: python3 tools/fix_bat_skin.py

The sheet's skin map also marked the willow of the bat in several poses (the cover drive's whole blade, the straight and on drives' blades ...), so a batter with dark
skin had his bat repainted dark brown in those poses. The blade is found as a long, pale, orange-hued stretch inside the skin map (hue above that of skin, very bright,
at least BLADE px long) and taken out of it. Run once; it only ever removes pixels from R, and says how many.
Needs numpy, scipy and Pillow.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BLADE = 55          # a stretch of willow at least this long (px, in the sheet) is the bat
MIN_AREA = 450


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return hue, d / (mx + 1e-6), mx / 255


def main():
    K = json.loads(open('js/kitsheets.js').read().split('export const KIT_SHEETS = ', 1)[1].rsplit(';', 1)[0]); m = K['bat-back']
    im = np.array(Image.open('img/kit/bat-back.webp').convert('RGB')).astype(float)
    mask = np.array(Image.open('img/kit/bat-back-mask.png').convert('RGB'))
    total = 0
    for i, (x, y, w, h, *_ ) in enumerate(m['frames']):
        a = im[y:y + h, x:x + w]; sk = mask[y:y + h, x:x + w, 0] > 127
        hue, sat, v = hsv(a)
        pale = sk & (hue >= 33) & (v >= 0.9)
        lab, n = ndi.label(ndi.binary_closing(pale, iterations=2) & sk)
        bat = np.zeros_like(sk)
        for c in range(1, n + 1):
            mm = lab == c; area = int(mm.sum())
            if area < MIN_AREA: continue
            ys, xs = np.nonzero(mm); ext = max(np.ptp(xs), np.ptp(ys)) + 1
            if ext >= BLADE and area / ext ** 2 < 0.5: bat |= mm
        bat = ndi.binary_dilation(bat, iterations=1) & sk
        mask[y:y + h, x:x + w, 0][bat] = 0
        total += int(bat.sum())
        if bat.sum(): print('frame', i, 'bat px taken out', int(bat.sum()))
    Image.fromarray(mask, 'RGB').save('img/kit/bat-back-mask.png', optimize=True)
    print('total', total)


if __name__ == '__main__':
    main()
