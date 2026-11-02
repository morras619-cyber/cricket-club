# The textures for your own club's grounds (ownground.py) in tools/blender/tex/own: the Thunderdome's
# painted crowd with its blue and yellow shirts (and the blue seats) turned grey, plus a mask of where
# they were (R: main colour, G: trim), so the game can paint the fans in your club's colours; and the
# shared skyline, grass, pitch and game logo.
#   python prep_own.py   (after prep_textures.py, which makes tex/crowd.png)
import os, shutil
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
T, OUT = os.path.join(HERE, 'tex'), os.path.join(HERE, 'tex', 'own')
os.makedirs(OUT, exist_ok=True)
GREY = 0.7   # a tinted surface's grey: the game multiplies it by colour / 0.7

a = np.asarray(Image.open(os.path.join(T, 'crowd.png')).convert('RGB')).astype(float) / 255
mx, mn = a.max(2), a.min(2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
d = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
blue = (hue > 195) & (hue < 250) & (sat > 0.3) & (mx > 0.12)
yellow = (hue > 38) & (hue < 64) & (sat > 0.5) & (mx > 0.45)
soft = lambda m: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255
S, Y = soft(blue), soft(yellow)
# each class's shading, about its own typical brightness
shade = lambda m: np.clip((mx / np.median(mx[m])) ** 1.7, 0, 1.0 / GREY) * GREY  # (the darks deeper: seats stay seats)
grey = a.copy()
for m, w in ((blue, S), (yellow, Y)):
    sh = shade(m)
    grey = grey * (1 - w[..., None]) + sh[..., None] * w[..., None]
Image.fromarray((np.clip(grey, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, 'crowd.png'))
Image.fromarray((np.stack([S, Y, np.zeros_like(S)], 2) * 255).astype(np.uint8)).save(os.path.join(OUT, 'crowd-mask.png'))
for f in ('skyline.png', 'grass.png', 'pitch.png', 'logo-sixcharge.png'):
    shutil.copy(os.path.join(T, f), os.path.join(OUT, f))
print('blue', blue.mean(), 'yellow', yellow.mean())
