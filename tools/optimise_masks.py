"""Re-save img/mask-*.png (from build_people_masks.mjs) as 2-bit palette PNGs: black, red
(skin), green (hair). About 6x smaller; the game reads the red and green channels as before."""
import glob
import numpy as np
from PIL import Image

for f in sorted(glob.glob('img/mask-*.png')):
    a = np.array(Image.open(f).convert('RGB'))
    idx = np.zeros(a.shape[:2], np.uint8)
    idx[a[..., 0] > 127] = 1
    idx[(a[..., 1] > 127) & (a[..., 0] <= 127)] = 2
    im = Image.fromarray(idx, 'P')
    im.putpalette([0, 0, 0, 255, 0, 0, 0, 255, 0] + [0] * (253 * 3))
    im.save(f, optimize=True, bits=2)
