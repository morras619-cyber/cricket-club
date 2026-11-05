#!/usr/bin/env python3
"""Replaces three league portraits that came out looking like the same man (tools/portraits/league-fix-1.png: three new tiles in a
row, Nanda, Iyer, Hashmi, each with its name plate; only the picture above the plate is used). The new face is cut out as in
tools/build_portraits_league.py, stood on a little extra shoulder (the picture ends at the plate; the squad tile fades it out), and
written over the old one in img/cards/portraits-more2.webp and in the lists. Run tools/build_portrait_looks.py afterwards.

usage: python3 tools/fix_league_portraits.py   (from the repo root)
"""
import json
import os
import re
import sys
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_portraits_sky as sky

# key: (x0, x1 of the picture in the row, age he now looks, cut / beard / headwear)
FIX = {'aarav-nanda': (46, 693, 27, 'long -'), 'vihaan-iyer': (760, 1407, 35, 'part moustache'), 'zain-hashmi': (1479, 2126, 31, 'part full')}
Y0, Y1 = 40, 553
TALL = 1.15   # the picture is made at least this much taller than wide, like the other portraits


def drop_sky(p):
    """GrabCut leaves bits of the blue backdrop between hair and shoulder: blue that touches the picture's edge goes"""
    a = np.array(p).astype(int)
    blue = (a[..., 2] > a[..., 0] + 50) & (a[..., 2] > a[..., 1] + 20) & (a[..., 3] > 0)
    lab, n = ndi.label(blue)
    edge = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
    gone = np.isin(lab, list(edge))
    gone = ndi.binary_dilation(gone, iterations=2) & blue
    a[..., 3][gone] = 0
    out = Image.fromarray(a.astype(np.uint8), 'RGBA')
    return out.crop(out.getbbox())


def more_shoulder(p, want):
    """the picture ends at the name plate: the last rows are mirrored down, blurred and faded out, so the squad tile has a body to fade"""
    add = want - p.height
    h = min(add, p.height // 3)
    tail = p.crop((0, p.height - h, 300, p.height)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(6))
    arr = np.array(tail).astype(np.float32)
    arr[..., 3] *= np.linspace(0.9, 0, h)[:, None]
    tail = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    out = Image.new('RGBA', (300, p.height + h), (0, 0, 0, 0))
    out.paste(p, (0, 0)); out.alpha_composite(tail, (0, p.height))
    return out


def main():
    sheet = Image.open('tools/portraits/league-fix-1.png').convert('RGB')
    atlas = Image.open(sky.ATLAS).convert('RGBA')
    lst = open('js/portraits-list.js').read()
    ages = dict((k, int(v)) for k, v in re.findall(r"'([a-z0-9-]+)': (\d+)", lst.split('PORTRAIT_AGE')[1].split('PORTRAIT_ATLAS')[0]))
    where = json.loads(lst.split('PORTRAIT_ATLAS =', 1)[1].strip().rstrip(';'))
    faces = json.loads(open('js/portrait-faces.js').read().split('=', 1)[1].strip().rstrip(';'))
    pitch = 0
    ys = sorted({w[1] for w in where.values() if w[4:] == [1]})
    pitch = max(b - a for a, b in zip(ys, ys[1:]))
    for key, (x0, x1, age, style) in FIX.items():
        p = sky.cut_out(sheet.crop((x0, Y0, x1, Y1)), 3)
        p = drop_sky(p)
        p = p.resize((300, round(p.height * 300 / p.width)), Image.LANCZOS)
        a = p.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.4, percent=45, threshold=2))
        p = Image.merge('RGBA', (*a.split(), p.getchannel('A')))
        want = round(300 * TALL)
        if p.height < want:
            p = more_shoulder(p, want)
        assert p.height <= pitch, (key, p.height, pitch)
        p.save(f'{sky.OUT}{key}.webp', 'WEBP', quality=90, method=6)
        x, y = where[key][0], where[key][1]
        atlas.paste(Image.new('RGBA', (300, pitch), (0, 0, 0, 0)), (x, y))
        atlas.paste(p, (x, y))
        where[key] = [x, y, 300, p.height, 1]
        faces[key] = sky.face_square(p)
        ages[key] = age
    atlas.save(sky.ATLAS, 'WEBP', quality=86, method=6)
    head = lst.split('PORTRAIT_AGE')[0]
    with open('js/portraits-list.js', 'w') as f:
        f.write(head + 'PORTRAIT_AGE = {' + ', '.join(f"'{k}': {v}" for k, v in ages.items()) + '};\n')
        f.write('// the last batches live in a few pictures (img/cards/portraits-more.webp, -more2.webp: js/futcard.js PORTRAIT_FILES): where each is, [x, y, w, h, picture]\n')
        f.write('export const PORTRAIT_ATLAS = ' + json.dumps(where, separators=(',', ':')) + ';\n')
    with open('js/portrait-faces.js', 'w') as f:
        f.write('export const PORTRAIT_FACES = ' + json.dumps(dict(sorted(faces.items())), separators=(',', ':')) + ';\n')
    st = open('js/portrait-styles.js').read()
    for key, (_, _, _, style) in FIX.items():
        st = re.sub(rf"  '{key}': '[^']*',\n", f"  '{key}': '{style}',\n", st)
    open('js/portrait-styles.js', 'w').write(st)
    print('replaced', ', '.join(FIX))


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    main()
