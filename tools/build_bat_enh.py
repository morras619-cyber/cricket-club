#!/usr/bin/env python3
"""The batter's redrawn poses (img/kit/bat-enh.webp + -mask.png + -tone.png, and their entry in js/kitsheets.js).

usage: python3 tools/build_bat_enh.py

SOURCE: tools/kit/bat-enh-src/<nn>-<pose>.png, the pose of the old batter sheet (img/kit/bat-back.*) redrawn richly (in the style of the cut-scenes) on flat
magenta, plain kit (no name, number or crest), the same silhouette and aspect ratio as the old pose. Each is aligned to the old pose (the best whole-pixel
shift), shrunk to SCALE x the old pose's size and packed in one sheet. The old pose's mask and tone are brought to the new size for the skin, the shirt back
and the yoke weights; the kit itself (blue and yellow) is found again from the new colours, with the trim kept to where the old art had trim (so the
warm rim light on the blue does not turn into the club's second colour). kitsprite.js draws a pose from this sheet when it has it, the old sheet otherwise.
Needs numpy, scipy and Pillow.
"""
import glob
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'tools/kit/bat-enh-src/'
SCALE = 1.5
PAD = 4
OLD_POSES = ['ready', 'leave1', 'leave2', 'backlift', 'drive1', 'drive2', 'drive3', 'pull1', 'pull2', 'def1', 'def2', 'def3', 'cut1', 'cut2', 'cut3', 'cut4', 'bowled',
             'celebrate', 'rsweep1', 'rsweep2', 'rsweep3', 'straight1', 'straight2', 'ondrive1', 'ondrive2', 'cover1']   # (their order in the old sheet)


def sil(a):
    return ~((a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 100))


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return hue, d / (mx + 1e-6), mx / 255


def pose(path, K, oldimg, oldmask, oldtone):
    name = os.path.basename(path)[3:-4]; idx = OLD_POSES.index(name)
    m = K['bat-back']; x, y, w, h = m['frames'][idx][:4]
    new = Image.open(path).convert('RGB')
    old = oldimg.crop((x, y, x + w, y + h)).convert('RGBA')
    bg = Image.new('RGBA', old.size, (255, 0, 255, 255)); bg.alpha_composite(old)
    so = np.array(Image.fromarray((sil(np.array(bg.convert('RGB')).astype(float)) * 255).astype('uint8')).resize((w * 4, h * 4))) > 0
    big = new.resize((w * 4, h * 4), Image.LANCZOS); sn = sil(np.array(big).astype(float))
    best = (0, 0, 0)
    for dx in range(-24, 25, 2):
        for dy in range(-24, 25, 2):
            s = np.roll(np.roll(sn, dy, 0), dx, 1); iou = (s & so).sum() / (s | so).sum()
            if iou > best[0]: best = (iou, dx, dy)
    _, dx, dy = best
    a8 = np.array(big)
    a8 = np.roll(np.roll(a8, dy, 0), dx, 1)
    if dx > 0: a8[:, :dx] = [255, 0, 255]
    if dx < 0: a8[:, dx:] = [255, 0, 255]
    if dy > 0: a8[:dy] = [255, 0, 255]
    if dy < 0: a8[dy:] = [255, 0, 255]
    W, H = round(w * SCALE), round(h * SCALE)
    a = np.array(Image.fromarray(a8).resize((W, H), Image.LANCZOS)).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    alpha = np.clip(1 - ((np.minimum(r, b) - g) - 60) / 100, 0, 1)
    mag = np.array([250, 0, 250], np.float32); part = (alpha > 0) & (alpha < 1); k = alpha[part][:, None]
    a[part] = np.clip((a[part] - (1 - k) * mag) / np.maximum(k, 0.25), 0, 255)
    rgb = a; op = alpha > 0.5
    hue, sat, v = hsv(rgb)
    mk = np.array(oldmask.crop((x, y, x + w, y + h)).resize((W, H), Image.BILINEAR)).astype(np.float32) / 255
    tn = np.array(oldtone.crop((x, y, x + w, y + h)).resize((W, H), Image.BILINEAR)).astype(np.float32)
    skin = (mk[..., 0] > 0.5) & op; shirt = (mk[..., 1] > 0.5) & op
    blue = (hue > 195) & (hue < 255) & (sat > 0.3) & (v > 0.07); yel = (hue > 38) & (hue < 66) & (sat > 0.55) & (v > 0.45)
    near = ndi.binary_dilation(mk[..., 2] > 0.5, iterations=2)
    kit = ndi.binary_closing(near & op & (blue | yel) & ~skin, iterations=1) & op & ~skin
    lum = rgb @ np.array([.299, .587, .114], np.float32)
    wy = ndi.gaussian_filter(np.where(kit & yel, 1.0, 0), 0.8) * kit * ndi.binary_dilation(tn[..., 1] > 20, iterations=3)
    mask = np.zeros((H, W, 3), np.uint8); mask[..., 0] = skin * 255; mask[..., 1] = shirt * 255; mask[..., 2] = kit * 255
    tone = np.zeros((H, W, 3), np.uint8)
    tone[..., 0] = np.clip(tn[..., 0], 0, 255); tone[..., 1] = np.clip(wy * 255, 0, 255); tone[..., 2] = np.where(kit, np.clip(lum, 1, 255), 0)
    art = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
    print(f'{name:10s} {W}x{H}  overlap with the old pose {best[0]:.3f}  shift ({dx / 4:+.1f}, {dy / 4:+.1f}) px')
    return name, idx, (art, mask, tone), (W, H)


def main():
    K = json.loads(open('js/kitsheets.js').read().split('export const KIT_SHEETS = ', 1)[1].rsplit(';', 1)[0])
    m = K['bat-back']
    oldimg = Image.open('img/kit/bat-back.webp'); oldmask = Image.open('img/kit/bat-back-mask.png').convert('RGB'); oldtone = Image.open('img/kit/bat-back-tone.png').convert('RGB')
    poses = [pose(p, K, oldimg, oldmask, oldtone) for p in sorted(glob.glob(SRC + '*.png'))]
    # shelf packing, 2048 wide
    SW, x, y, rowh, pos = 2048, PAD, PAD, 0, []
    for name, idx, layers, (W, H) in sorted(poses, key=lambda t: -t[3][1]):
        if x + W + PAD > SW: x, y, rowh = PAD, y + rowh + PAD, 0
        pos.append((name, idx, layers, W, H, x, y)); x += W + PAD; rowh = max(rowh, H)
    SH = y + rowh + PAD
    art = np.zeros((SH, SW, 4), np.uint8); mask = np.zeros((SH, SW, 3), np.uint8); tone = np.zeros((SH, SW, 3), np.uint8)
    frames, place, names = [], [], {}
    for i, (name, idx, (ar, mk, tn), W, H, px, py) in enumerate(pos):
        art[py:py + H, px:px + W] = ar; mask[py:py + H, px:px + W] = mk; tone[py:py + H, px:px + W] = tn
        fx, fy = m['frames'][idx][4:6]; ox, oy, ow, sx, sy, ang = m['place'][idx][:6]
        frames.append([px, py, W, H, round(fx * SCALE, 1), round(fy * SCALE, 1)])
        place.append([round(px + ox * SCALE, 1), round(py + oy * SCALE, 1), round(ow * SCALE, 1), sx, sy, ang, 0, 0, 0, 0] if ow else [0, 0, 0, 1, 1, 0, 0, 0, 0, 0])
        names[name] = i
    Image.fromarray(art, 'RGBA').save('img/kit/bat-enh.webp', 'WEBP', quality=92, method=6)
    Image.fromarray(mask, 'RGB').save('img/kit/bat-enh-mask.png', optimize=True); Image.fromarray(tone, 'RGB').save('img/kit/bat-enh-tone.png', optimize=True)
    K['bat-enh'] = {'frames': frames, 'place': place, 'names': names, 'refPx': round(m['refPx'] * SCALE, 1), 'suit': m['suit'], 'trim': m['trim'], 'skin': m['skin'],
                    'tones': m['tones'], 'hair': {}, 'size': [SW, SH], 'crisp': True}
    src = open('js/kitsheets.js').read(); head = src.split('export const KIT_SHEETS = ')[0]
    open('js/kitsheets.js', 'w').write(head + 'export const KIT_SHEETS = ' + json.dumps(K, separators=(',', ':')) + ';\n')
    print('sheet', (SW, SH), 'poses', len(pos))


if __name__ == '__main__':
    main()
