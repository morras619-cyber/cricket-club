#!/usr/bin/env python3
"""Builds the 'skin' block of css/style.css from the sliced UI art in tools/ui (the generated sheets, cut into pieces).
The block sits between the two markers in css/style.css and is rewritten whole; the pieces are embedded as data URIs (the published page is at its file limit).
usage: python3 tools/build_skin.py"""
import base64, io, os, re
from PIL import Image
D = os.path.join(os.path.dirname(__file__), 'ui'); CSS = os.path.join(os.path.dirname(__file__), '..', 'css', 'style.css')
A, B = '/* ==== skin: start (tools/build_skin.py) ==== */', '/* ==== skin: end ==== */'
def uri(name, width=None, q=88):
    im = Image.open(os.path.join(D, name + '.png')).convert('RGBA')
    if width and im.width > width: im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return f"url(data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()})", im.size
def window(name, inset):   # a frame with its middle cut out, so a portrait shows through
    im = Image.open(os.path.join(D, name + '.png')).convert('RGBA'); w, h = im.size; px = im.load(); t = round(w * inset)
    for y in range(t, h - t):
        for x in range(t, w - t): px[x, y] = (0, 0, 0, 0)
    b = io.BytesIO(); im.resize((w // 2, h // 2), Image.LANCZOS).save(b, 'WEBP', quality=88, method=6); return f"url(data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()})"
ICONS = ['coin', 'diamond', 'xp', 'clock', 'hammer', 'trophy', 'ball', 'bat', 'shoes', 'grips', 'users', 'heart', 'chart', 'box', 'gear', 'plus', 'check', 'cross', 'up', 'warn', 'lock', 'jersey', 'search', 'star-on']
COLS, CELL = 6, 96
def atlas():
    rows = -(-len(ICONS) // COLS); sheet = Image.new('RGBA', (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    for i, n in enumerate(ICONS):
        im = Image.open(os.path.join(D, ('' if n == 'star-on' else 'ic-') + n + '.png')).convert('RGBA'); s = (CELL - 6) / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS); sheet.alpha_composite(im, ((i % COLS) * CELL + (CELL - im.width) // 2, (i // COLS) * CELL + (CELL - im.height) // 2))
    b = io.BytesIO(); sheet.save(b, 'WEBP', quality=90, method=6); return f"url(data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()})", rows
def build():
    out = [A]
    ic, rows = atlas()
    out.append(f"#training .ico[data-n] {{ background: {ic} no-repeat; background-size: {COLS * 100}% {rows * 100}%; }} #training .ico[data-n] svg {{ display: none; }}")
    m = {'coin': 'coin', 'users': 'users', 'clock': 'clock', 'warn': 'warn', 'plus': 'plus', 'heart': 'heart', 'up': 'up', 'check': 'check', 'trophy': 'trophy', 'chart': 'chart', 'star': 'star-on', 'ball': 'ball', 'search': 'search', 'cross': 'cross', 'jersey': 'jersey', 'box': 'box', 'gear': 'gear', 'factory': 'hammer'}
    for name, key in m.items():
        i = ICONS.index(key); out.append(f"#training .ico[data-n={name}] {{ background-position: {(i % COLS) / (COLS - 1) * 100:.3f}% {(i // COLS) / (rows - 1) * 100:.3f}%; }}")
    def nine(sel, name, slice_, bw, width=None, extra=''):
        u, size = uri(name, width); k = size[0] / Image.open(os.path.join(D, name + '.png')).width; sl = round(slice_ * k)
        out.append(f"{sel} {{ border: {bw}px solid transparent; border-image: {u} {sl} fill / {bw}px stretch; background: none; box-shadow: none; border-radius: 0; {extra} }}")
    nine('#training .mf-card', 'card-cream', 70, 12, 360)
    nine('#training .mf-chip', 'panel-dark', 70, 12, 340, 'color: #fff;')
    nine('#training .mf-tab', 'btn-blue', 34, 12, 280, 'color: #fff;')
    nine('#training .mf-tab.on', 'btn-yellow', 34, 12, 300, 'color: #14102a; transform: none;')
    nine('#training .mf-big', 'btn-yellow', 34, 16, 300, 'color: #14102a;')
    nine('#training .mf-big.alt', 'btn-blue', 34, 16, 280, 'color: #fff;')
    nine('#training .mf-big.red', 'btn-red', 34, 16, 278, 'color: #fff;')
    nine('#training .chipbtn', 'btn-yellow', 34, 9, 300, 'color: #14102a;')
    nine('#training .mf-lvl', 'btn-yellow', 34, 9, 300, 'color: #14102a;')
    nine('#training .mf-bar', 'bar-empty', 37, 6, 400)
    gp, _ = uri('btn-grey', 263)
    out.append("#training .mf-big:disabled { border-image-source: %s; filter: none; color: #5b5f70; }" % gp)
    nine('#training .mf-card.empty', 'panel-dark', 70, 12, 340, 'color: #fff;')
    out.append("#training .mf-card.pick { filter: brightness(1.08) saturate(1.2); } #training .mf-card.empty .ico { filter: none; }")
    out.append("#training .mf-tab { min-height: 58px; padding: 0 2px; } #training .mf-tab.on { padding: 0 2px; } #training .mf-card { padding: 0 2px; } #training .mf-chip { padding: 0 2px; }")
    out.append("#training .mf-bar { height: 16px; padding: 0; } #training .mf-bar i { margin: -2px 1px; height: calc(100% + 4px); border-radius: 6px; }")
    out.append("#training .mf-big { min-height: 54px; padding: 0 6px; } #training .chipbtn { min-height: 32px; padding: 0 4px; } #training .mf-lvl { min-height: 34px; padding: 0 4px; }")
    out.append(f"#training .mf-frame {{ position: relative; border: 0; box-shadow: none; border-radius: 0; background: none; overflow: visible; }} #training .mf-frame canvas, #training .mf-frame img {{ position: absolute; inset: 13%; width: 74% !important; height: 74% !important; border-radius: 4px; }} #training .mf-frame::after {{ content: ''; position: absolute; inset: 0; background: {window('frame-blue', 0.13)} center / 100% 100% no-repeat; pointer-events: none; }}")
    nine('#training .mf-sheet-card', 'card-cream', 70, 16, 360, 'padding: 0 4px calc(8px + var(--safe-b)); color: #14102a;')
    xr, _ = uri('x-red', 120)
    out.append(f"#training .mf-x {{ width: 38px; height: 38px; background: {xr} center / 100% 100% no-repeat; border: 0; box-shadow: none; font-size: 0; color: transparent; }}")
    bk, _ = uri('back-blue', 200)
    out.append(f"#training .pt-back {{ width: 50px; height: 50px; background: {bk} center / 100% 100% no-repeat; border: 0; box-shadow: none; font-size: 0; color: transparent; }}")
    dot, _ = uri('dot-red', 80)
    out.append(f"#training .mf-badge {{ background: {dot} center / 100% 100% no-repeat; border: 0; color: #fff; text-shadow: 0 1px 0 #7a0010; min-width: 22px; height: 22px; line-height: 22px; top: -8px; right: -5px; }}")
    out.append(B)
    return '\n'.join(out)
css = open(CSS).read()
blk = build()
if A in css: css = re.sub(re.escape(A) + r'.*?' + re.escape(B), lambda _: blk, css, flags=re.S)
else: css += '\n' + blk + '\n'
open(CSS, 'w').write(css); print('skin block', len(blk) // 1024, 'KB')
