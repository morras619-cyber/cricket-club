#!/usr/bin/env python3
"""Take the lightning bolt off the shirts (and helmets) on the front-view sheets, so the game
can put each club's own crest there instead.

The front sheets are all drawn in the Thunder kit with a yellow bolt on the chest. A bolt is a
patch of yellow trim colour surrounded by blue shirt; the side stripes and sleeves touch the
outline, so they aren't. Each bolt is painted over with the shirt around it and its place is
written to js/kitlogos.js as [centreX, centreY, size, squash] in sheet pixels; the game draws the crest
there when it repaints the sheet in a team's colours.

Run after the sheet builders (which put the bolts back):
    python3 tools/build_kit_logos.py
"""
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEETS = {
    'front': 'img/bowler.webp',
    'spin-front': 'img/spinner-front.webp',
    'batfront': 'img/batter-front.webp',
    'keeper-front': 'img/keeper-front.webp',
    'field-front': 'img/field-front.webp',
    'nonstriker': 'img/nonstriker.webp',
}

# The badges, picked by hand from the yellow patches the detector finds (the shoulder panels
# and stripes look much the same to it). Each entry is either one or more patches, named by the
# centre of their bounding box, or [x, y, size] for a badge half hidden behind an arm, where every
# yellow pixel in that box goes.
BADGES = {
    'front': {
      'chest': [
        (77, 100), (222, 95), (352, 95), (490, 96), (617, 100), (768, 156), (77, 437), (387, 411),
        [557, 416, 30], (698, 426), ((851, 421), (880, 421)), (107, 713), (326, 713), (515, 724),
      ],
      'cap': [

      ],
    },
    'spin-front': {
      'chest': [
        (112, 138), (300, 132), (492, 133), [678, 145, 48], (837, 175), (93, 620), (243, 560),
        (412, 555), (624, 577), (811, 580),
      ],
      'cap': [

      ],
    },
    'batfront': {
      'chest': [
        (56, 94), (188, 93), (306, 86), (573, 87), (759, 89), (900, 128),
        (62, 406), (191, 401), [412, 408, 26], [633, 405, 24], (801, 406), (906, 403), (95, 686),
        [260, 705, 18], [522, 695, 22], [780, 693, 26], (78, 957),
      ],
      'cap': [
        (53, 16), (188, 16), (307, 15), (430, 41), (574, 16), (761, 15), (876, 48), (67, 337),
        (192, 334), (413, 333), (604, 333), (806, 334), (909, 333), (95, 615), (258, 615),
        (509, 614), (787, 614), (97, 890),
      ],
    },
    'keeper-front': {
      'chest': [
        (142, 107), (414, 115), (683, 115), (156, 447), (496, 423), (380, 751), (740, 746),
        (579, 1069), [238, 1052, 30],
      ],
      'cap': [
        (145, 24), (415, 19), (685, 21), (157, 367), (450, 328), (428, 656), (741, 653),
        (265, 946), (579, 969),
      ],
    },
    'nonstriker': {
      'chest': [
        (127, 143), (425, 136), (713, 136), (131, 571), (378, 571), (698, 569), (97, 977), (363, 982), (623, 975),
        (127, 1394),
      ],
      'cap': [
        (127, 26), (426, 28), (714, 26), (132, 459), (381, 460), (699, 462), (93, 873), (368, 871), (617, 872),
        (127, 1280),
      ],
    },
    'field-front': {
      'chest': [
        (112, 96), (321, 87), (472, 91), (631, 96), (189, 409), (452, 419), (615, 421), (841, 380),
        (122, 632), (356, 630), (646, 630), (819, 626), (264, 884),
      ],
      'cap': [
        (116, 30), (331, 29), (478, 29), (628, 30), (124, 427), (457, 364), (615, 365), (850, 318),
        (144, 575), (373, 576), (654, 573), (833, 572), (100, 832), (280, 823),
      ],
    },
}
# seen from above, the chest badge is squashed top to bottom
SQUASH = {'field-front': 0.6}



def hsv(a):
    rgb = a[..., :3].astype(np.float32) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    nz = d > 1e-6
    hr = nz & (mx == r)
    hg = nz & (mx == g) & ~hr
    hb = nz & ~hr & ~hg
    h[hr] = ((g - b)[hr] / d[hr]) % 6
    h[hg] = (b - r)[hg] / d[hg] + 2
    h[hb] = (r - g)[hb] / d[hb] + 4
    return (h * 60) % 360, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def candidates(a):
    """Yellow patches with blue shirt all round them: {bbox centre: (y-slice, x-slice, mask)}."""
    h, s, v = hsv(a)
    alpha = a[..., 3] > 8
    blue = alpha & (h > 200) & (h < 250) & (s > 0.4)
    yellow = alpha & (h > 30) & (h < 66) & (s > 0.45) & (v > 0.4)
    lab, _ = ndi.label(yellow)
    found = {}
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        area = (lab[sl] == i).sum()
        if area < 12 or area > 2500:
            continue
        pad = 6
        y0, y1 = max(0, sl[0].start - pad), min(a.shape[0], sl[0].stop + pad)
        x0, x1 = max(0, sl[1].start - pad), min(a.shape[1], sl[1].stop + pad)
        c = lab[y0:y1, x0:x1] == i
        body = ndi.binary_dilation(c, iterations=2)
        ring = ndi.binary_dilation(body, iterations=3) & ~body
        if not ring.any() or blue[y0:y1, x0:x1][ring].mean() < 0.75:
            continue
        key = ((sl[1].start + sl[1].stop) // 2, (sl[0].start + sl[0].stop) // 2)
        found[key] = lab == i
    return found, blue, yellow


def near(found, xy):
    best = min(found, key=lambda k: abs(k[0] - xy[0]) + abs(k[1] - xy[1]), default=None)
    if best is None or abs(best[0] - xy[0]) + abs(best[1] - xy[1]) > 6:
        raise SystemExit(f'no badge near {xy}: has this sheet been done already? Rebuild it first.')
    return found[best]


def inpaint(out, region, known):
    """Fill region from the pixels around it, a ring at a time."""
    for _ in range(80):
        if not region.any():
            break
        w = ndi.uniform_filter(known.astype(np.float32), 3)
        acc = np.stack([ndi.uniform_filter(out[..., k] * known, 3) for k in range(3)], -1)
        edge = region & (w > 0.01)
        out[..., :3][edge] = acc[edge] / w[edge][:, None]
        known = known | edge
        region = region & ~edge


def badge_mask(e, found, yellow, trim):
    """The yellow pixels of one badge, its centre and its size."""
    if isinstance(e, list):  # a box round a half-hidden badge: only the pure trim yellow, not the arm
        x, y, size = e
        r = size * 0.6
        box = np.zeros(yellow.shape, bool)
        box[max(0, int(y - r)):int(y + r) + 1, max(0, int(x - r)):int(x + r) + 1] = True
        return trim & box, x, y, None
    parts = e if isinstance(e[0], tuple) else (e,)
    mask = np.zeros(yellow.shape, bool)
    for xy in parts:
        mask |= near(found, xy)
    ys, xs = np.nonzero(mask)
    size = max(xs.max() - xs.min(), ys.max() - ys.min()) * 1.2
    return mask, (xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2, size


def process(name, path):
    a = np.array(Image.open(path).convert('RGBA'))
    found, blue, yellow = candidates(a)
    h, s, v = hsv(a)
    trim = yellow & (h > 40) & (h < 62) & (s > 0.5) & (v > 0.45)
    keep = (v < 0.3) | ((h > 5) & (h < 38) & (s > 0.25))  # outlines and skin are never painted over
    out = a.astype(np.float32)
    spots = []
    for role, entries in BADGES[name].items():
        badges = [badge_mask(e, found, yellow, trim) for e in entries]
        # one size for every badge of a kind (the median of the whole ones)
        size = float(np.median([b[3] for b in badges if b[3]]))
        squash = SQUASH.get(name, 1) if role == 'chest' else 1
        for mask, cx, cy, _ in badges:
            spots.append([round(float(cx), 1), round(float(cy), 1), round(size, 1), squash])
            ys, xs = np.nonzero(mask)
            if not len(ys):
                continue  # nothing of the bolt shows, but the crest still goes on what shirt does
            y0, y1 = max(0, ys.min() - 8), ys.max() + 9
            x0, x1 = max(0, xs.min() - 8), xs.max() + 9
            m = ndi.binary_dilation(mask[y0:y1, x0:x1], iterations=2) & ~blue[y0:y1, x0:x1] & ~keep[y0:y1, x0:x1] & (a[y0:y1, x0:x1, 3] > 8)
            inpaint(out[y0:y1, x0:x1], m, blue[y0:y1, x0:x1].copy())
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=92, method=6)
    return spots


def main():
    # with sheet names (python3 tools/build_kit_logos.py nonstriker), only those are done and the
    # rest of js/kitlogos.js is kept: the other sheets have had their bolts painted out already
    only = sys.argv[1:]
    spots = {}
    if only:
        import re
        for m in re.finditer(r"^  '([\w-]+)': (\[.*\]),$", open('js/kitlogos.js').read(), re.M):
            spots[m.group(1)] = json.loads(m.group(2))
    for k, p in SHEETS.items():
        if not only or k in only:
            spots[k] = process(k, p)
    for k, v in spots.items():
        print(k, len(v), 'badges')
    with open('js/kitlogos.js', 'w') as f:
        f.write('// Where the club crest goes on each front-view sheet: [centreX, centreY, size, squash] in\n')
        f.write('// sheet pixels (the chest, and the helmet badge). Made by tools/build_kit_logos.py.\n')
        f.write('export const KIT_LOGOS = {\n')
        for k, v in spots.items():
            f.write(f"  '{k}': {json.dumps(v, separators=(',', ':'))},\n")
        f.write('};\n')



if __name__ == '__main__':
    main()
