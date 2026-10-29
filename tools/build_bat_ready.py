#!/usr/bin/env python3
"""A painted "ready" stance for the batter from behind (img/kit/bat-ready.webp + -mask.png + -tone.png, and its entry in js/kitsheets.js).

usage: python3 tools/build_bat_ready.py [tools/kit/bat-ready-source.png]

SOURCE: one figure on flat magenta, plain blue-and-yellow kit (no crest, name or number). The blue is repainted in the club's main colour and the
yellow in its trim, keeping the painted light and shade; skin takes the player's tone; pads, gloves, bat and boots' white stay as drawn.
  mask  R skin, G shirt back (where the name and number may go), B 255 where the kit is (blue or yellow)
  tone  R 0 (no third colour), G the yellow weight, B the brightness; meta.hsv holds the painted blue and yellow, and the repaint (kitsprite.js teamSheet)
      turns each pixel's hue to the club's colour and scales its saturation and value by the ratio of the club's colour to the painted one
Needs numpy, scipy and Pillow.
"""
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1] if len(sys.argv) > 1 else 'tools/kit/bat-ready-source.png'
TARGET_H = 840   # the figure's height in the sheet (the old frame is 534: this is 1.6x as sharp)
PAD = 6

a = np.array(Image.open(SRC).convert('RGB')).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
alpha = np.clip(1 - ((np.minimum(r, b) - g) - 60) / 100, 0, 1)
mag = np.array([250, 0, 250], np.float32); part = (alpha > 0) & (alpha < 1); k = alpha[part][:, None]
a[..., :3][part] = np.clip((a[..., :3][part] - (1 - k) * mag) / np.maximum(k, 0.25), 0, 255)
ys, xs = np.nonzero(alpha > 0.5)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
a = a[y0:y1, x0:x1]; alpha = alpha[y0:y1, x0:x1]
H0, W0 = alpha.shape
s = TARGET_H / H0
W, H = int(round(W0 * s)), TARGET_H
rgb = np.array(Image.fromarray(a.astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32)
al = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255

R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
mx, mn = rgb.max(-1), rgb.min(-1); sat = (mx - mn) / (mx + 1e-6)
d = mx - mn + 1e-6
hue = np.where(mx == R, ((G - B) / d) % 6, np.where(mx == G, (B - R) / d + 2, (R - G) / d + 4)) * 60
lum = 0.299 * R + 0.587 * G + 0.114 * B
opaque = al > 0.5
blue = opaque & (hue > 200) & (hue < 255) & (sat > 0.4)
yellow = opaque & (hue > 38) & (hue < 64) & (sat > 0.55) & (mx > 140)
kit = blue | yellow
# skin: tan, but not the bat or the boots: only the neck and arms (upper half) and the ankles
yy, xx = np.mgrid[0:H, 0:W]
fy, fx = yy / H, xx / W
skin = opaque & (hue > 8) & (hue < 36) & (sat > 0.22) & (sat < 0.7) & (mx > 120) & ~kit & (((fy < 0.52) & (fx > 0.2)) | ((fy > 0.78) & (fy < 0.88) & (fx < 0.72)))
skin = ndi.binary_closing(skin, iterations=3) & opaque & ~kit   # (the painted lines inside an arm are skin too)
shirt = blue & (fy > 0.15) & (fy < 0.40) & (fx > 0.2) & (fx < 0.95)
# the soft weights: how yellow a kit pixel is, against how blue
ye = np.clip((R + G) / 2 - B, 0, None) / 255; bl = np.clip(B - (R + G) / 2, 0, None) / 255
wy = np.where(kit, ye / (ye + bl + 1e-3), 0)
wy = ndi.gaussian_filter(wy, 0.6) * kit

mask = np.zeros((H, W, 3), np.uint8)
mask[..., 0] = np.where(skin, 255, 0); mask[..., 1] = np.where(shirt, 255, 0); mask[..., 2] = np.where(kit, 255, 0)
tone = np.zeros((H, W, 3), np.uint8)
tone[..., 1] = np.clip(wy * 255, 0, 255); tone[..., 2] = np.where(kit, np.clip(lum, 1, 255), 0)

# the sheet: the figure with a small margin round it
SW, SH = W + 2 * PAD, H + 2 * PAD
def pad(arr, ch):
    out = np.zeros((SH, SW, ch), np.uint8); out[PAD:PAD + H, PAD:PAD + W] = arr; return out
art = np.dstack([np.clip(rgb, 0, 255), al * 255]).astype(np.uint8)
Image.fromarray(pad(art, 4), 'RGBA').save('img/kit/bat-ready.webp', 'WEBP', quality=92, method=6)
Image.fromarray(pad(mask, 3), 'RGB').save('img/kit/bat-ready-mask.png', optimize=True)
Image.fromarray(pad(tone, 3), 'RGB').save('img/kit/bat-ready-tone.png', optimize=True)

med = lambda m: round(float(np.median(lum[m])) / 255, 4) if m.any() else 0.5
def hsv_of(m):
    # the painted reference colour of a class (median hue, saturation, value): the repaint keeps each pixel's light and shade relative to it
    h_ = hue[m]; ang = np.deg2rad(h_); hm = float(np.rad2deg(np.arctan2(np.sin(ang).mean(), np.cos(ang).mean())) % 360)
    return [round(hm, 1), round(float(np.median(sat[m])), 4), round(float(np.median(mx[m])) / 255, 4)]
# where the feet are: the ground under the boots, x half-way between them as in the old frame (the old anchor sits a little right of his boots)
feet_y = PAD + H - 0.012 * H
shoes = opaque & (fy > 0.9)
sx = np.nonzero(shoes.any(0))[0]
feet_x = PAD + float(sx.mean()) + 0.10 * W
meta = {
    'frames': [[0, 0, SW, SH, round(feet_x, 1), round(feet_y, 1)]],
    'place': [[round(PAD + 0.50 * W, 1), round(PAD + 0.265 * H, 1), round(0.30 * W, 1), 1, 1, 16.3, 0, 0, 0, 0]],
    'refPx': round(feet_y - PAD, 1), 'suit': [0.0269, 0.3529, 0.5925], 'trim': [0.5451, 0.8592, 0.9209],
    'skin': med(skin), 'tones': [med(blue), med(blue) * 0.5, med(yellow)], 'hair': {}, 'size': [SW, SH],
    'hsv': [hsv_of(blue), hsv_of(blue), hsv_of(yellow)],   # (the repaint is by hue, saturation and value: it keeps the painted colour depth)
}
src = open('js/kitsheets.js').read()
head, body = src.split('export const KIT_SHEETS = ')
K = json.loads(body.rsplit(';', 1)[0])
K['bat-ready'] = meta
open('js/kitsheets.js', 'w').write(head + 'export const KIT_SHEETS = ' + json.dumps(K, separators=(',', ':')) + ';\n')
print('sheet', (SW, SH), 'refPx', meta['refPx'], 'tones', meta['tones'], 'skin', meta['skin'], 'kit px', int(kit.sum()), 'skin px', int(skin.sum()))
