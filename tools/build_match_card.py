#!/usr/bin/env python3
"""The match pop-up card: the empty frame (the right-hand card of the sheet, on magenta) cut out
to img/cards/match-frame.webp. The game recolours it to each team and puts the player's painted
portrait, rating, name and role on it.

usage: python3 tools/build_match_card.py SHEET.png
Needs numpy, scipy and Pillow.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def main():
    a = np.array(Image.open(sys.argv[1]).convert('RGBA')).astype(np.float32)
    a = a[:, a.shape[1] // 2:]  # the empty card
    bg = np.array([250, 3, 250], np.float32)
    dist = np.abs(a[..., :3] - bg).max(-1)
    # the background: magenta joined to the edges (the frame's own purples are inside its outline)
    near = dist < 90
    lab, _ = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    back = np.isin(lab, list(edge))
    # soft edge: alpha by how far a border pixel is from the magenta, magenta tint removed
    alpha = np.where(back, 0, 1).astype(np.float32)
    ring = ndi.binary_dilation(back, iterations=2) & ~back
    k = np.clip((dist[ring] - 20) / 120, 0, 1)
    alpha[ring] = k
    rgb = a[..., :3]
    rgb[ring] = np.clip((rgb[ring] - (1 - k[:, None]) * bg) / np.maximum(k[:, None], 0.25), 0, 255)
    a[..., 3] = alpha * 255
    out = Image.fromarray(a.astype(np.uint8), 'RGBA')
    out = out.crop(out.getbbox())
    out = out.resize((480, round(out.height * 480 / out.width)), Image.LANCZOS)
    out.save('img/cards/match-frame.webp', 'WEBP', quality=90, method=6)
    print(out.size)


if __name__ == '__main__':
    main()
