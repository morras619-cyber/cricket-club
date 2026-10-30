#!/usr/bin/env python3
"""Cuts the generated UI sheets (tools/ui/src) into the pieces tools/build_skin.py uses (tools/ui/*.png). usage: python3 tools/slice_ui.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
D = os.path.join(os.path.dirname(__file__), 'ui'); SRC = os.path.join(D, 'src')
def sheet(n): return Image.open(os.path.join(SRC, n + '.png')).convert('RGBA')
def trim(im):
    a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 30)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
def cut(im, box, name): out = trim(im.crop(box)); out.save(os.path.join(D, name + '.png')); return out.size
kit, bars, icons = sheet('kit'), sheet('bars-frames'), sheet('icons')
K = {'btn-yellow': (53, 18, 668, 130), 'btn-yellow-p': (686, 18, 1305, 130), 'btn-blue': (53, 134, 669, 249), 'btn-blue-p': (686, 134, 1305, 249), 'btn-red': (53, 253, 669, 369), 'btn-red-p': (686, 253, 1305, 369),
     'btn-grey': (53, 374, 668, 492), 'btn-grey-p': (686, 374, 1305, 492), 'round-yellow': (1340, 6, 1480, 133), 'round-blue': (1340, 136, 1480, 254), 'round-red': (1340, 256, 1480, 378), 'round-grey': (1340, 380, 1480, 502),
     'card-cream': (18, 504, 761, 844), 'panel-dark': (768, 504, 1516, 842), 'ribbon': (23, 857, 873, 995), 'tab-sel': (884, 860, 1142, 993), 'tab-off': (1146, 860, 1406, 993), 'dot-red': (1412, 870, 1520, 975)}
B = {'bar-empty': (46, 14, 1490, 96), 'frame-silver': (28, 441, 325, 726), 'frame-blue': (331, 443, 617, 724), 'frame-purple': (623, 443, 912, 724), 'frame-gold': (918, 443, 1206, 726), 'frame-round': (1208, 438, 1508, 736),
     'shield-gold': (48, 730, 270, 994), 'shield-silver': (283, 732, 502, 992), 'hex-gold': (516, 732, 741, 991), 'hex-silver': (757, 732, 974, 991), 'star-on': (994, 748, 1231, 979), 'star-off': (1240, 747, 1484, 982)}
for n, b in K.items(): print(n, cut(kit, b, n))
for n, b in B.items(): print(n, cut(bars, b, n))
# icons: the piece nearest each cell's centre
a = np.array(icons); lab, _ = ndi.label(ndi.binary_dilation(a[:, :, 3] > 20, iterations=2))
ROWS = [(145, ['coin', 'diamond', 'xp', 'clock', 'hammer', 'trophy', 'ball', 'bat', 'shoes'], [108, 255, 428, 600, 755, 910, 1075, 1240, 1395]),
        (330, ['grips', 'users', 'heart', 'chart', 'box', 'gear', 'plus', 'check', 'cross', 'up'], [110, 285, 440, 585, 745, 900, 1045, 1190, 1320, 1455]),
        (497, ['warn', 'lock', 'jersey', 'search', 'whistle', 'medkit', 'clipboard', 'target', 'megaphone', 'calendar'], [95, 240, 380, 530, 675, 825, 975, 1125, 1275, 1445]),
        (885, ['cash1', 'cash2', 'gems1', 'gems2', 'gems3', 'pencil', 'printer', 'undo', 'refresh'], [120, 305, 480, 665, 820, 925, 1100, 1275, 1435])]
for cy, names, xs in ROWS:
    for n, cx in zip(names, xs):
        cell = lab[cy - 80:cy + 80, cx - 60:cx + 60]; ids, counts = np.unique(cell[cell > 0], return_counts=True)
        m = lab == ids[np.argmax(counts)]; ys, xs_ = np.where(m); box = (xs_.min(), ys.min(), xs_.max() + 1, ys.max() + 1)
        sub = a[box[1]:box[3], box[0]:box[2]].copy(); sub[~m[box[1]:box[3], box[0]:box[2]], 3] = 0
        Image.fromarray(sub).save(os.path.join(D, 'ic-' + n + '.png'))
# the hammer is taken from the second icon sheet (a flatter head)
b2 = np.array(sheet('icons-b')); lab2, _ = ndi.label(ndi.binary_dilation(b2[:, :, 3] > 20, iterations=2)); cell = lab2[65:225, 680:800]; ids, counts = np.unique(cell[cell > 0], return_counts=True)
m = lab2 == ids[np.argmax(counts)]; ys, xs_ = np.where(m); box = (xs_.min(), ys.min(), xs_.max() + 1, ys.max() + 1); sub = b2[box[1]:box[3], box[0]:box[2]].copy(); sub[~m[box[1]:box[3], box[0]:box[2]], 3] = 0
Image.fromarray(sub).save(os.path.join(D, 'ic-hammer.png'))
print('icons done')
