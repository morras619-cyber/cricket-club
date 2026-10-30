#!/usr/bin/env python3
"""The club map's empty building pads, painted out: each pad (bare ground and its kerb) becomes lawn, so a building stands on its own lawn and nothing of the pad shows round it.

usage: python3 tools/clear_pads.py in.png out.png      (used by tools/build_map.py)
The lawn is the colour of the grass round the pad (smoothed) with the grain of a real piece of lawn from the same picture laid over it.
Needs numpy, scipy, opencv.
"""
import sys
import cv2
import numpy as np
from scipy import ndimage as ndi


def pad_mask(a):
    """The pads: bare brown ground, wider by the kerb round it (a is a float RGB picture 0..255)."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dirt = (r > g) & (r > 110) & (r - b > 30) & (r < 200) & (g > 80)
    dirt = ndi.binary_opening(dirt, iterations=4)
    lab, n = ndi.label(ndi.binary_closing(dirt, iterations=5))
    big = [i for i in range(1, n + 1) if (lab == i).sum() > 15000 * (a.shape[0] / 1536) ** 2]
    m = np.isin(lab, big)
    return ndi.binary_dilation(m, iterations=round(14 * a.shape[0] / 3072) + 12), m


def lawn_grain(a, grass, size=192):
    """The most evenly grassy square of the picture, its fine grain (the picture minus its own blur)."""
    k = size
    frac = ndi.uniform_filter(grass.astype(float), size=k)
    frac[: k // 2] = 0; frac[-k // 2:] = 0; frac[:, : k // 2] = 0; frac[:, -k // 2:] = 0
    y, x = np.unravel_index(np.argmax(frac), frac.shape)
    crop = a[y - k // 2:y + k // 2, x - k // 2:x + k // 2]
    return crop - np.stack([ndi.gaussian_filter(crop[..., c], 7) for c in range(3)], -1)


def clear(a):
    pad, core = pad_mask(a)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    grass = (g > r * 1.15) & (g > b * 1.3) & (g > 70) & (g < 190) & ~ndi.binary_dilation(pad, iterations=4)
    grass = ndi.binary_erosion(grass, iterations=2)
    w = ndi.gaussian_filter(grass.astype(float), 40) + 1e-6
    base = np.stack([ndi.gaussian_filter(a[..., c] * grass, 40) / w for c in range(3)], -1)   # the grass colour round about
    grain = lawn_grain(a, grass)
    gh, gw = grain.shape[:2]
    rng = np.random.default_rng(7)
    tex = np.zeros_like(a)
    for y in range(0, a.shape[0], gh):
        for x in range(0, a.shape[1], gw):
            t = grain if rng.random() < .5 else grain[:, ::-1]
            t = t if rng.random() < .5 else t[::-1]
            h, ww = min(gh, a.shape[0] - y), min(gw, a.shape[1] - x)
            tex[y:y + h, x:x + ww] = t[:h, :ww]
    lawn = np.clip(base + tex, 0, 255)
    soft = ndi.gaussian_filter(pad.astype(float), 4)[..., None]
    out = np.clip(a * (1 - soft) + lawn * soft, 0, 255)
    # the round plot in the middle (the stadium's) becomes paving, so what the stadium does not cover reads as its forecourt, not as grass
    H, W = a.shape[:2]
    lab, _ = ndi.label(ndi.binary_opening((g > r * 1.25) & (g > b * 1.5) & (g > 90) & (g < 190), iterations=6))
    mid = lab == lab[int(.465 * H), int(.505 * W)]
    mid = ndi.binary_dilation(ndi.binary_fill_holes(mid), iterations=3)
    paving = np.clip(np.array([122, 108, 90]) + tex * 0.8 + ndi.gaussian_filter(rng.normal(0, 5, a.shape[:2]), 2)[..., None], 0, 255)
    soft = ndi.gaussian_filter(mid.astype(float), 2)[..., None]
    return np.clip(out * (1 - soft) + paving * soft, 0, 255)


if __name__ == '__main__':
    src = cv2.imread(sys.argv[1])[..., ::-1].astype(np.float32)
    cv2.imwrite(sys.argv[2], clear(src)[..., ::-1].astype(np.uint8))
