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
    b = io.BytesIO(); im.resize((min(w, 260), round(h * min(w, 260) / w)), Image.LANCZOS).save(b, 'WEBP', quality=88, method=6); return f"url(data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()})"
ICONS = ['coin', 'diamond', 'xp', 'clock', 'hammer', 'trophy', 'ball', 'bat', 'shoes', 'grips', 'users', 'heart', 'chart', 'box', 'gear', 'plus', 'check', 'cross', 'up', 'warn', 'lock', 'jersey', 'search', 'star-on', 'pencil', 'printer']
COLS, CELL = 6, 96
def atlas():
    rows = -(-len(ICONS) // COLS); sheet = Image.new('RGBA', (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    for i, n in enumerate(ICONS):
        im = Image.open(os.path.join(D, ('' if n == 'star-on' else 'ic-') + n + '.png')).convert('RGBA'); s = (CELL - 6) / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS); sheet.alpha_composite(im, ((i % COLS) * CELL + (CELL - im.width) // 2, (i // COLS) * CELL + (CELL - im.height) // 2))
    b = io.BytesIO(); sheet.save(b, 'WEBP', quality=90, method=6); return f"url(data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()})", rows
SC = '.mf'
def make_green():
    for src, dst in (('btn-yellow', 'btn-green'), ('btn-yellow-p', 'btn-green-p')):
        im = Image.open(os.path.join(D, src + '.png')).convert('RGBA'); a = im.getchannel('A'); h, sat, v = im.convert('RGB').convert('HSV').split()
        h = h.point(lambda x: (x + 46) % 256); g = Image.merge('HSV', (h, sat, v)).convert('RGB'); g.putalpha(a); g.save(os.path.join(D, dst + '.png'))
def build():
    make_green()
    out = [A]
    ic, rows = atlas()
    out.append(f".ico[data-n] {{ background: {ic} no-repeat; background-size: {COLS * 100}% {rows * 100}%; }} .ico[data-n] svg {{ display: none; }}")
    m = {'coin': 'coin', 'users': 'users', 'clock': 'clock', 'warn': 'warn', 'plus': 'plus', 'heart': 'heart', 'up': 'up', 'check': 'check', 'trophy': 'trophy', 'chart': 'chart', 'star': 'star-on', 'ball': 'ball', 'search': 'search', 'cross': 'cross', 'jersey': 'jersey', 'box': 'box', 'gear': 'gear', 'factory': 'hammer', 'pencil': 'pencil', 'printer': 'printer', 'diamond': 'diamond'}
    for name, key in m.items():
        i = ICONS.index(key); out.append(f".ico[data-n={name}] {{ background-position: {(i % COLS) / (COLS - 1) * 100:.3f}% {(i // COLS) / (rows - 1) * 100:.3f}%; }}")
    def nine(sel, name, slice_, bw, width=None, extra=''):
        u, size = uri(name, width); k = size[0] / Image.open(os.path.join(D, name + '.png')).width; sl = round(slice_ * k)
        out.append(f"{sel} {{ border: {bw}px solid transparent; border-image: {u} {sl} fill / {bw}px stretch; background: none; box-shadow: none; border-radius: 0; {extra} }}")
    nine('SC .mf-card', 'card-cream', 80, 12, 480)
    nine('SC .mf-chip', 'panel-dark', 80, 12, 440, 'color: #fff;')
    nine('SC .mf-tab', 'btn-blue', 46, 12, 440, 'color: #fff;')
    nine('SC .mf-tab.on', 'btn-yellow', 46, 12, 440, 'color: #14102a; transform: none;')
    nine('SC .mf-big', 'btn-green', 46, 16, 440, 'color: #fff; text-shadow: 0 2px 0 #14420f;')
    nine('SC .mf-big.alt', 'btn-blue', 46, 16, 440, 'color: #fff;')
    nine('SC .mf-big.red', 'btn-red', 46, 16, 440, 'color: #fff;')
    nine('SC .chipbtn', 'btn-yellow', 46, 9, 440, 'color: #14102a;')
    nine('SC .mf-lvl', 'btn-yellow', 46, 9, 440, 'color: #14102a;')
    nine('SC .mf-bar', 'bar-empty', 40, 6, 560)
    gp, _ = uri('btn-grey', 440)
    out.append("SC .mf-big:disabled { border-image-source: %s; filter: none; color: #5b5f70; }" % gp)
    nine('SC .mf-card.empty', 'panel-dark', 80, 12, 440, 'color: #fff;')
    out.append("SC .mf-card.pick { filter: brightness(1.08) saturate(1.2); } SC .mf-card.empty .ico { filter: none; }")
    out.append("SC .mf-tab { min-height: 58px; padding: 0 2px; } SC .mf-tab.on { padding: 0 2px; } SC .mf-card { padding: 0 2px; } SC .mf-chip { padding: 0 2px; }")
    out.append("SC .mf-bar { height: 16px; padding: 0; } SC .mf-bar i { margin: -2px 1px; height: calc(100% + 4px); border-radius: 6px; }")
    out.append("SC .mf-big { min-height: 54px; padding: 0 6px; } SC .chipbtn { min-height: 32px; padding: 0 4px; } SC .mf-lvl { min-height: 34px; padding: 0 4px; }")
    out.append(f"SC .mf-frame {{ position: relative; border: 0; box-shadow: none; border-radius: 0; background: none; overflow: visible; }} SC .mf-frame canvas, SC .mf-frame img {{ position: absolute; inset: 13%; width: 74% !important; height: 74% !important; border-radius: 4px; }} SC .mf-frame::after {{ content: ''; position: absolute; inset: 0; background: {window('frame-blue', 0.13)} center / 100% 100% no-repeat; pointer-events: none; }}")
    nine('SC .mf-sheet-card', 'card-cream', 80, 16, 480, 'padding: 0 4px calc(8px + var(--safe-b)); color: #14102a;')
    xr, _ = uri('x-red', 120)
    out.append(f"SC .mf-x {{ width: 38px; height: 38px; background: {xr} center / 100% 100% no-repeat; border: 0; box-shadow: none; font-size: 0; color: transparent; }}")
    bk, _ = uri('back-blue', 200)
    out.append(f"SC .pt-back {{ width: 50px; height: 50px; background: {bk} center / 100% 100% no-repeat; border: 0; box-shadow: none; font-size: 0; color: transparent; }}")
    dot, _ = uri('dot-red', 80)
    out.append(f"SC .mf-badge {{ background: {dot} center / 100% 100% no-repeat; border: 0; color: #fff; text-shadow: 0 1px 0 #7a0010; min-width: 22px; height: 22px; line-height: 22px; top: -8px; right: -5px; }}")
    out.append(".mf-pips .ico[data-n], .pace .ico[data-n] { filter: grayscale(1) brightness(.55); opacity: .5; } .mf-pips .ico.on[data-n], .pace .ico.on[data-n] { filter: none; opacity: 1; }")
    nine('SC .mf-fin', 'card-cream', 80, 12, 480)
    nine('SC .mf-role', 'card-cream', 80, 12, 480)
    nine('SC .mf-collect', 'btn-green', 46, 12, 440, 'color: #fff; text-shadow: 0 2px 0 #14420f;')
    nine('SC .mf-qty button', 'btn-blue', 46, 9, 440, 'color: #fff;')
    nine('SC .mf-qty button.on', 'btn-yellow', 46, 9, 440, 'color: #14102a;')
    out.append("SC .mf-fin, SC .mf-role { padding: 0 2px; } SC .mf-collect { min-height: 40px; } SC .mf-qty button { min-height: 38px; padding: 0 2px; }")
    out.append("SC .mf-card .mf-badge { background: linear-gradient(#ff7a85, #d6283c); border: 2px solid #fff; border-radius: 9px; min-width: 0; padding: 0 5px; height: 17px; line-height: 13px; font-size: 9px; top: 4px; right: 4px; text-shadow: none; }")
    # ---- the common components of every other screen (the hub, squad, records, settings, auction, results ...) ----
    def gnine(sel, name, slice_, bw, width, extra=''):
        u, size = uri(name, width); k = size[0] / Image.open(os.path.join(D, name + '.png')).width; sl = round(slice_ * k)
        out.append(f"{sel} {{ border: {bw}px solid transparent; border-image: {u} {sl} fill / {bw}px stretch; background: none; box-shadow: none; border-radius: 0; {extra} }}")
    gnine('.bigbtn', 'btn-blue', 46, 14, 440, 'color: #fff; padding: 2px 8px; min-height: 58px; text-shadow: 2px 2px 0 #14102a;')
    gnine('.bigbtn.primary', 'btn-yellow', 46, 14, 440, 'color: #14102a; text-shadow: none;')
    gnine('.bigbtn.ghost', 'panel-dark', 80, 12, 440, 'color: #fff; text-shadow: 2px 2px 0 #14102a;')
    gp2, _ = uri('btn-grey', 440)
    out.append(".bigbtn:disabled { border-image-source: %s; opacity: 1; color: #5b5f70; text-shadow: none; } .bigbtn:active { box-shadow: none; transform: translateY(2px); filter: brightness(1.08); } .bigbtn.whatsapp { background: #25d366; border-image: none; border: 3px solid #14102a; border-radius: 16px; min-height: 0; padding: 13px 16px; }" % gp2)
    gnine('.panel.paper', 'card-cream', 80, 12, 480, 'margin: 3px;')
    gnine('.panel:not(.paper)', 'panel-dark', 80, 12, 440)
    gnine('.tab', 'btn-blue', 46, 10, 440, 'color: #fff;')
    gnine('.tab.on', 'btn-yellow', 46, 10, 440, 'color: #14102a;')
    gnine('.map-tab', 'btn-blue', 46, 10, 440, 'color: #fff;')
    gnine('.map-tab:active', 'btn-yellow', 46, 10, 440, 'color: #14102a;')
    gnine('.chipbtn', 'btn-yellow', 46, 9, 440, 'color: #14102a; min-height: 32px; padding: 0 4px;')
    gnine('.hb-pill', 'panel-dark', 80, 8, 440, 'color: #fff;')
    gnine('.coach-bubble', 'card-cream', 80, 12, 480, 'padding: 0 4px;')
    gnine('.coach-btns button', 'btn-grey', 46, 9, 440, 'color: #14102a; min-width: 74px; height: auto; min-height: 38px; padding: 0 4px;')
    gnine('.coach-btns button.go', 'btn-yellow', 46, 9, 440, 'color: #14102a;')
    gnine('.coachbtn', 'panel-dark', 80, 8, 440, 'color: #fff; height: auto; min-height: 38px;')
    # the match screen: the scoreboard, the pause button and the power cards (the same art, kept small so the pitch stays in view)
    gnine('.scorecard', 'panel-dark', 80, 9, 440, 'color: #fff; transform: none;')
    gnine('.power', 'panel-dark', 80, 7, 440, 'color: #fff; padding: 0 3px 0 0;')
    gnine('.power.ready:not(:disabled), .power.armed', 'btn-yellow', 46, 8, 440, 'color: #14102a;')
    out.append(".power.ready:not(:disabled) .pname, .power.armed .pname { color: #14102a; } .power.ready:not(:disabled) .pcost, .power.armed .pcost { color: #b01a2c; }")
    rb, _ = uri('round-blue', 120)
    out.append(f".iconbtn {{ background: {rb} center / 100% 100% no-repeat; border: 0; box-shadow: none; color: #fff; }}")
    gnine('.pt-btn.ghost', 'panel-dark', 80, 12, 440, 'color: #fff; transform: none; height: auto; min-height: 56px; padding: 0 2px; font-size: 25px; letter-spacing: .5px; white-space: nowrap;')
    gnine('.pt-btn.go', 'btn-yellow', 46, 14, 440, 'color: #14102a; transform: none; height: auto; min-height: 56px; padding: 0 2px; font-size: 25px; letter-spacing: .5px; white-space: nowrap;')
    gp3, _ = uri('btn-grey', 440)
    out.append(".pt-btn.go:disabled { border-image-source: %s; filter: none; color: #5b5f70; } .pt-btn:active { transform: translateY(2px); box-shadow: none; }" % gp3)
    gnine('.chipbtn.ghostchip', 'btn-grey', 46, 9, 440, 'color: #14102a;')
    gnine('.banterbtn.smack', 'btn-red', 46, 12, 440, 'color: #fff; text-shadow: 2px 2px 0 #14102a; transform: none; padding: 0 4px; min-height: 50px;')
    gnine('.banterbtn.cool', 'btn-yellow', 46, 12, 440, 'color: #14102a; transform: none; padding: 0 4px; min-height: 50px;')
    gnine('.fieldbtn', 'btn-blue', 46, 9, 440, 'color: #fff; padding: 0;')
    # ---- the shell of a building's screen: the top bar and the hero picture ----
    sh, _ = uri('shield-gold', 120); rb, _ = uri('ribbon', 560)
    out.append(f".topbar {{ flex: none; display: flex; align-items: center; gap: 6px; min-height: 44px; }} .tb-shield {{ flex: none; width: 40px; height: 46px; background: {sh} center / contain no-repeat; display: grid; place-items: center; padding-bottom: 3px; font-family: Bangers, Impact, sans-serif; font-size: 21px; color: #fff; text-shadow: 0 2px 0 #14102a, 0 0 4px #14102a; }}")
    out.append(".tb-xp { position: relative; flex: 1; min-width: 50px; height: 20px; margin-left: -10px; border-radius: 10px; background: #0a1038; border: 2px solid #ffb800; box-shadow: 0 0 0 2px #14102a; overflow: hidden; } .tb-xp i { display: block; height: 100%; background: linear-gradient(#7fd6ff, #1f8fff 60%, #1566d8); } .tb-xp span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: 900; color: #fff; text-shadow: 0 1px 0 #14102a, 0 0 3px #14102a; }")
    out.append(".tb-pill { flex: none; display: flex; align-items: center; gap: 3px; padding: 0 2px 0 6px; height: 32px; border-radius: 12px; background: linear-gradient(#10206a, #080f40); border: 2px solid #ffb800; box-shadow: 0 0 0 2px #14102a; color: #fff; font-weight: 900; font-size: 13px; } .tb-pill .ico { width: 22px; height: 22px; } .tb-plus { width: 26px; height: 26px; padding: 0; border: 0; background: none; } .tb-plus .ico { width: 26px; height: 26px; } .tb-gear { flex: none; width: 36px; height: 36px; padding: 0; border: 0; background: none; } .tb-gear .ico { width: 36px; height: 36px; }")
    out.append(f".bhero {{ position: relative; flex: none; height: clamp(0px, calc(100vh - 560px), 220px); display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }} .bhero::before {{ content: ''; position: absolute; left: -4%; right: -4%; bottom: -2%; height: 62%; background: radial-gradient(ellipse at 50% 72%, rgba(255, 214, 120, .38), rgba(255, 214, 120, 0) 66%); pointer-events: none; }} .bhero > * {{ position: relative; z-index: 2; }} .bhero .bhero-art {{ position: absolute; z-index: 1; left: 50%; bottom: 0; transform: translateX(-50%); height: 100%; width: auto; max-width: 118%; object-fit: contain; background: none; border-radius: 0; filter: drop-shadow(0 8px 10px rgba(0, 0, 0, .55)); pointer-events: none; }}")
    out.append(f".bhero .mf-title {{ position: absolute; left: 50%; top: 0; transform: translateX(-50%); flex: none; min-width: 170px; align-items: center; text-align: center; padding: 6px 26px 12px; background: {rb} center / 100% 100% no-repeat; z-index: 3; }} .bhero .mf-title b {{ font-size: 30px; }} .bhero .mf-title small {{ display: none; }}")
    out.append(".mf > * { flex-shrink: 0; } .mf > .mf-body { flex-shrink: 1; }")
    out.append("@media (max-height: 720px) { .bhero { height: 52px; } .bhero .bhero-art, .bhero::before { display: none; } }")
    out.append(".mf-jersey { position: relative; flex: none; width: 56px; height: 56px; } .mf-jersey .ico.jer { width: 56px; height: 56px; } .mf-qty-badge { position: absolute; right: -4px; bottom: -2px; min-width: 22px; padding: 0 5px; height: 20px; line-height: 17px; border-radius: 10px; background: #14102a; color: #fff; border: 2px solid #ffd23f; font-style: normal; font-size: 11px; font-weight: 900; text-align: center; }")
    out.append("#merch .mf-grid.three .mf-card.stack .mf-frame { --fs: 54px; } #merch .mf-grid.three .mf-card.stack { gap: 2px; } #merch .mf-grid.three .mf-card.stack .mf-row { flex-wrap: nowrap; } @media (max-height: 720px) { #merch .mf-grid.three .mf-card.stack .mf-frame { --fs: 38px; } #merch .mf-grid.three { grid-auto-rows: minmax(0, 118px); } }")
    out.append(".tab { padding: 2px 4px; min-height: 40px; } .map-tab { min-height: 56px; padding: 0 2px; }")
    bk2, _ = uri('back-blue', 200)
    out.append(f".pt-back {{ width: 50px; height: 50px; background: {bk2} center / 100% 100% no-repeat; border: 0; box-shadow: none; font-size: 0; color: transparent; }}")
    out.append(B)
    return '\n'.join(out).replace('SC ', SC + ' ')
css = open(CSS).read()
blk = build()
if A in css: css = re.sub(re.escape(A) + r'.*?' + re.escape(B), lambda _: blk, css, flags=re.S)
else: css += '\n' + blk + '\n'
open(CSS, 'w').write(css); print('skin block', len(blk) // 1024, 'KB')
