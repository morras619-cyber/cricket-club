#!/usr/bin/env python3
"""The match ball: cut the painted ball out of its sheet as a clean circle and warm its shadowed
patches to red, so it reads as a red ball all over. Writes img/ball.webp (the game spins it).

usage: python3 tools/build_ball.py BALL.png
Needs numpy, scipy and Pillow.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def main():
    a = np.array(Image.open(sys.argv[1]).convert('RGBA')).astype(np.float32)
    rgb = a[..., :3]
    # the ball: the biggest bright red-ish blob; fit a circle to it
    m = (a[..., 3] > 100) & (rgb.max(-1) > 60) & (rgb[..., 0] > rgb[..., 2] + 20)
    lab, n = ndi.label(ndi.binary_closing(m, iterations=4))
    big = lab == (np.argmax(ndi.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1)
    big = ndi.binary_fill_holes(big)
    ys, xs = np.nonzero(big)
    cx, cy = xs.mean(), ys.mean()
    r = np.sqrt(big.sum() / np.pi) * 0.985
    yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
    d = np.hypot(xx - cx, yy - cy)
    alpha = np.clip(r - d + 1, 0, 1)
    # the shadowed patches (dark, or black at the rim): lift them to a deep red, highlights and
    # the cream seam kept as they are
    lum = rgb.max(-1)
    seam = (rgb[..., 1] > 150) & (rgb[..., 2] > 110)
    dark = np.clip((150 - lum) / 150, 0, 1) * (~seam)
    red = np.array([150, 18, 14], np.float32)
    lifted = rgb * (1 - dark[..., None]) + np.maximum(rgb, red * (0.55 + 0.45 * (1 - d / r))[..., None]) * dark[..., None]
    out = np.dstack([np.clip(lifted, 0, 255), alpha * 255])
    s = int(np.ceil(r))
    crop = out[int(cy) - s:int(cy) + s, int(cx) - s:int(cx) + s]
    Image.fromarray(crop.astype(np.uint8), 'RGBA').resize((128, 128), Image.LANCZOS).save('img/ball.webp', 'WEBP', quality=92, method=6)
    print('ball r', round(r), 'at', round(cx), round(cy))


if __name__ == '__main__':
    main()
