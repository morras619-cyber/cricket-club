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
ICONS = ['coin', 'diamond', 'xp', 'clock', 'hammer', 'trophy', 'ball', 'bat', 'shoes', 'grips', 'users', 'heart', 'chart', 'box', 'gear', 'plus', 'check', 'cross', 'up', 'warn', 'lock', 'jersey', 'search', 'star-on', 'pencil', 'printer', 'upgrade']
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
    out = [A]
    ic, rows = atlas()
    out.append(f".ico[data-n] {{ background: {ic} no-repeat; background-size: {COLS * 100}% {rows * 100}%; }} .ico[data-n] svg {{ display: none; }}")
    m = {'coin': 'coin', 'users': 'users', 'clock': 'clock', 'warn': 'warn', 'plus': 'plus', 'heart': 'heart', 'up': 'up', 'check': 'check', 'trophy': 'trophy', 'chart': 'chart', 'star': 'star-on', 'ball': 'ball', 'search': 'search', 'cross': 'cross', 'jersey': 'jersey', 'box': 'box', 'gear': 'gear', 'factory': 'hammer', 'pencil': 'pencil', 'printer': 'printer', 'diamond': 'diamond', 'upgrade': 'upgrade'}
    for name, key in m.items():
        i = ICONS.index(key); out.append(f".ico[data-n={name}] {{ background-position: {(i % COLS) / (COLS - 1) * 100:.3f}% {(i // COLS) / (rows - 1) * 100:.3f}%; }}")
    def nine(sel, name, slice_, bw, width=None, extra=''):
        u, size = uri(name, width); k = size[0] / Image.open(os.path.join(D, name + '.png')).width; sl = round(slice_ * k)
        out.append(f"{sel} {{ border: {bw}px solid transparent; border-image: {u} {sl} fill / {bw}px stretch; background: none; box-shadow: none; border-radius: 0; {extra} }}")
    nine('SC .mf-card', 'card-cream', 80, 12, 480)
    nine('SC .mf-chip', 'panel-dark', 80, 12, 440, 'color: #fff;')
    nine('SC .mf-tab', 'btn-blue', 46, 12, 440, 'color: #fff;')
    nine('SC .mf-tab.on', 'btn-yellow', 46, 12, 440, 'color: #14102a; transform: none;')
    nine('SC .mf-big', 'btn-yellow', 46, 16, 440, 'color: #14102a; text-shadow: 0 1px 0 rgba(255, 255, 255, .5);')
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
    xc, _ = uri('x-circle', 200)
    out.append(f"SC .mf-x {{ width: 54px; height: 54px; padding: 0; background: {xc} center / contain no-repeat; border: 0; box-shadow: none; font-size: 0; color: transparent; }} SC .mf-x .ico {{ display: none; }}")
    bk, _ = uri('back-blue', 200)
    out.append(f"SC .pt-back {{ width: 50px; height: 50px; background: {bk} center / 100% 100% no-repeat; border: 0; box-shadow: none; font-size: 0; color: transparent; }}")
    dot, _ = uri('dot-red', 80)
    out.append(f"SC .mf-badge {{ background: {dot} center / 100% 100% no-repeat; border: 0; color: #fff; text-shadow: 0 1px 0 #7a0010; min-width: 22px; height: 22px; line-height: 22px; top: -8px; right: -5px; }}")
    out.append(".mf-pips .ico[data-n], .pace .ico[data-n] { filter: grayscale(1) brightness(.55); opacity: .5; } .mf-pips .ico.on[data-n], .pace .ico.on[data-n] { filter: none; opacity: 1; }")
    nine('SC .mf-fin', 'card-cream', 80, 12, 480)
    nine('SC .mf-role', 'card-cream', 80, 12, 480)
    nine('SC .mf-collect', 'btn-yellow', 46, 12, 440, 'color: #14102a;')
    nine('SC .mf-qty button', 'btn-blue', 46, 9, 440, 'color: #fff;')
    nine('SC .mf-qty button.on', 'btn-yellow', 46, 9, 440, 'color: #14102a;')
    out.append("SC .mf-fin { border-width: 7px; border-image-width: 7px; } SC .mf-fin .ico { width: 22px; height: 22px; } SC .mf-fin-t { gap: 1px; }")
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
    out.append(f".bhero {{ position: relative; flex: 0 1 var(--hh, 170px); min-height: 52px; height: auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }} .bhero::before {{ content: ''; position: absolute; left: -4%; right: -4%; bottom: -2%; height: 62%; background: radial-gradient(ellipse at 50% 72%, rgba(255, 214, 120, .38), rgba(255, 214, 120, 0) 66%); pointer-events: none; }} .bhero > * {{ position: relative; z-index: 2; }} .bhero .bhero-art {{ position: absolute; z-index: 1; left: 50%; bottom: 0; transform: translateX(-50%); height: 100%; width: auto; max-width: 118%; object-fit: contain; background: none; border-radius: 0; filter: drop-shadow(0 8px 10px rgba(0, 0, 0, .55)); pointer-events: none; }}")
    out.append(f".bhero .mf-title {{ position: absolute; left: 50%; top: 0; transform: translateX(-50%); flex: none; min-width: 170px; align-items: center; text-align: center; padding: 6px 26px 12px; background: {rb} center / 100% 100% no-repeat; z-index: 3; }} .bhero .mf-title b {{ font-size: 30px; }} .bhero .mf-title small {{ display: none; }}")
    out.append(".bhero ~ .mf-body .mf-card.stack .mf-frame { --fs: 52px; }")
    # a screen whose content does not fit asks main.js (fitScreen) for tighter steps: the hero first, then the stat tiles, then smaller cards, and at last the body scrolls
    T2 = '.mf[data-tight="2"], .mf[data-tight="3"], .mf[data-tight="4"]'; T3 = '.mf[data-tight="3"], .mf[data-tight="4"]'
    out.append('.mf[data-tight] .bhero { flex-basis: 52px; } ' + ', '.join(f'{x} .mf-stats' for x in T2.split(', ')) + ' { display: none; } ' + ', '.join(f'{x}#merch .mf-stats' for x in ['.mf[data-tight="2"]'] ) .replace('.mf[data-tight="2"]#merch', '#merch .mf[data-tight="2"]') + ' { display: flex; }')
    out.append(', '.join(f'{x} .mf-card, {x} .mf-card.empty' for x in T3.split(', ')) + ' { border-width: 7px; border-image-width: 7px; } ' + ', '.join(f'{x} .mf-frame' for x in T3.split(', ')) + ' { --fs: 38px !important; } ' + ', '.join(f'{x} .mf-bar' for x in T3.split(', ')) + ' { height: 12px; } ' + ', '.join(f'{x} .mf-tab, {x} .mf-tab.on' for x in T3.split(', ')) + ' { min-height: 44px; border-width: 8px; border-image-width: 8px; } ')
    out.append('.mf[data-tight="4"] .mf-body { flex: 1 1 0; min-height: 0; overflow-y: auto; scrollbar-width: none; } .mf[data-tight="4"] .mf-body::-webkit-scrollbar { display: none; }')
    out.append(".mf { overflow: hidden; } .mf > * { flex-shrink: 0; } .mf > .mf-body { flex: 1 0 auto; min-height: auto; overflow: visible; } .mf-body > .mf-grid { flex: 0 0 auto; min-height: auto; grid-auto-rows: auto; } .mf-body > .mf-grid.three, .mf-body > .mf-grid.one, .mf-body > .mf-grid.four { grid-auto-rows: auto; align-content: start; }")
    out.append(".bhero[data-size=big] { --hh: 220px; } .bhero[data-size=mid] { --hh: 170px; } .bhero[data-size=small] { --hh: 112px; } .bhero[data-size=tiny] { --hh: 52px; } .bhero[data-compact] .bhero-art, .bhero[data-compact]::before { display: none; } .mf-big .ico.big { width: 30px; height: 30px; }")
    out.append("@media (max-height: 720px) { .mf .mf-card, .mf .mf-card.empty { border-width: 8px; border-image-width: 8px; } .mf .mf-fin { border-width: 5px; border-image-width: 5px; } .mf .mf-tab, .mf .mf-tab.on { min-height: 44px; border-width: 9px; border-image-width: 9px; } .mf .mf-tab .ico { width: 20px; height: 20px; } .topbar { min-height: 38px; } .tb-shield { height: 40px; width: 35px; } .mf { gap: 5px; } .mf-body { gap: 5px; } .mf-col { gap: 5px; } .mf .mf-test { padding: 1px 6px; } .mf .mf-test .chipbtn { min-height: 26px; } }")
    out.append("@media (max-height: 720px) { #office .mf-stats, #clubhouse .mf-stats, #apartment .mf-stats { display: none; } }")
    out.append(".mf-jersey { position: relative; flex: none; width: 56px; height: 56px; } .mf-jersey .ico.jer { width: 56px; height: 56px; } .mf-qty-badge { position: absolute; right: -4px; bottom: -2px; min-width: 22px; padding: 0 5px; height: 20px; line-height: 17px; border-radius: 10px; background: #14102a; color: #fff; border: 2px solid #ffd23f; font-style: normal; font-size: 11px; font-weight: 900; text-align: center; }")
    out.append("#merch .mf-grid.three .mf-card.stack .mf-frame { --fs: 54px; } #merch .mf-grid.three .mf-card.stack { gap: 2px; } #merch .mf-grid.three .mf-card.stack .mf-row { flex-wrap: nowrap; } @media (max-height: 720px) { #merch .mf-grid.three .mf-card.stack .mf-frame { --fs: 38px; } #merch .mf-grid.three { grid-auto-rows: minmax(0, 118px); } }")
    # ---- the map header and the career pages: the same top bar, and the title as the same sign ----
    out.append(".map-top { flex-wrap: wrap; row-gap: 4px; } .map-topbar { flex: 0 0 100%; } .map-topbar[hidden] { display: none; } .map-gear { display: none; } .map-title .map-pace { margin-top: 0; } .map-title b { font-size: 22px; }")
    out.append(".topbar .ico { display: inline-flex; flex: none; } .menu.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; } .menu.row .bigbtn { min-width: 0; font-size: 20px; padding: 2px 2px; white-space: nowrap; letter-spacing: 0; }")
    out.append(".screen-inner > .topbar { flex: none; } .topbar[hidden] { display: none; } .lg-logo { display: none; }")
    out.append(f".leaguescreen .title, #records .title, #daily .title, #trophies .title, #stats .title {{ align-self: center; display: inline-block; margin: 0; padding: 8px 34px 16px; font-size: 28px; line-height: 1; color: #ffe94d; -webkit-text-stroke: 0; transform: none; text-shadow: 0 2px 0 rgba(0, 0, 0, .55); background: {rb} center / 100% 100% no-repeat; }}")
    out.append(".leaguescreen .lede, #records .lede { margin-top: -6px; }")
    # ---- painted staff portraits, the contract cards, the role badges ----
    for nme in ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'agent', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'o1', 'o3', 'o4', 'sc1', 'sc2', 'sc3', 'sc4', 'sc5', 's1']:
        u, _ = uri('staff/' + nme, 170, 78)
        out.append(f".stf-{nme} {{ background-image: {u}; }}")
    out.append(".stf { display: block; background-color: #20358a; background-size: cover; background-position: 50% 12%; background-repeat: no-repeat; } .mf-frame .stf { position: absolute; inset: 13%; border-radius: 4px; }")
    for key, nm in (('bat', 'blue'), ('bowl', 'red'), ('all', 'green'), ('wk', 'purple')):
        u, size = uri('badge-' + nm, 320); k = size[0] / Image.open(os.path.join(D, 'badge-' + nm + '.png')).width
        out.append(f".role-{key} {{ border: 6px solid transparent; border-image: {u} {round(90 * k)} fill / 6px stretch; }}")
    out.append(".role-badge { display: inline-block; align-self: flex-start; padding: 0 5px; line-height: 14px; font-size: 10px; font-weight: 900; letter-spacing: .3px; text-transform: uppercase; color: #fff; text-shadow: 0 1px 0 rgba(0, 0, 0, .55); white-space: nowrap; }")
    go, _ = uri('btn-go', 110)
    out.append(f".btn-go {{ flex: none; width: 38px; height: 38px; background: {go} center / contain no-repeat; }}")
    out.append(".cc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: auto !important; align-content: start; flex: 0 0 auto; } .mf-card.cc { flex-direction: row; text-align: left; gap: 6px; padding: 0 2px; } .mf-card.cc .mf-frame { --fs: 52px; } .mf-card.cc .mf-info { overflow: hidden; } .mf-card.cc .role-badge { max-width: 100%; overflow: hidden; font-size: 9px; } .mf-card.cc .btn-go { width: 32px; height: 32px; } .mf-card.cc .mf-info b { font-size: 14px; } .mf-card.cc .mf-row { gap: 4px; font-size: 11px; flex-wrap: nowrap; } .mf-card.cc .mf-row .ico { width: 14px; height: 14px; }")
    out.append(".mf-card.mf-agent { position: relative; padding: 0 6px 0 92px; min-height: 70px; } .mf-agent .mf-agent-art { position: absolute; left: 2px; bottom: 0; width: 86px; height: 92px; background-color: transparent; background-size: contain; background-position: 50% 100%; } .mf-agent .mf-info b { font-size: 16px; } .mf-agent .mf-info small { font-size: 11px; font-weight: 700; opacity: .8; line-height: 1.2; } .mf-agent > .ico { width: 24px; height: 24px; flex: none; }")
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
