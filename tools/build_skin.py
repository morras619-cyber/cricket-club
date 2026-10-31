#!/usr/bin/env python3
"""Builds the 'skin' block of css/style.css from the sliced UI art in tools/ui (the generated sheets, cut into pieces).
The block sits between the two markers in css/style.css and is rewritten whole; the pieces are embedded as data URIs (the published page is at its file limit).
usage: python3 tools/build_skin.py"""
import base64, io, json, os, re
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

# the fan card with other icons: the painted ones are cleaned off (tools/ui/src/fan-card-clean.png) and four others are painted on in their place
CARD_ICONS = {'train': ['xp', 'up', 'hammer', 'clock'], 'med': ['heart', 'medkit', 'warn', 'xp'], 'acad': ['xp', 'up', 'clock', 'trophy'], 'staff': ['xp', 'coin']}
def icon_variants():
    base = Image.open(os.path.join(D, 'src', 'fan-card-clean.png')).convert('RGBA').crop((35, 36, 1501, 983))
    out = {}
    for name, icons in CARD_ICONS.items():
        card = base.copy()
        for k, ic in enumerate(icons):
            im = Image.open(os.path.join(D, 'ic-' + ic + '.png')).convert('RGBA'); s = 128 / max(im.size)
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
            cy = (365, 513, 658, 801)[k]; card.alpha_composite(im, (1003 - 35 - im.width // 2, cy - 36 - im.height // 2))
        buf = io.BytesIO(); card.resize((460, round(460 * card.height / card.width)), Image.LANCZOS).save(buf, 'WEBP', quality=86, method=6)
        out[name] = f"url(data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()})"
    return out

def build():
    out = [A]
    ic, rows = atlas()
    out.append(f".ico[data-n] {{ background: {ic} no-repeat; background-size: {COLS * 100}% {rows * 100}%; }} .ico[data-n] svg {{ display: none; }}")
    m = {'coin': 'coin', 'users': 'users', 'clock': 'clock', 'warn': 'warn', 'plus': 'plus', 'heart': 'heart', 'up': 'up', 'check': 'check', 'trophy': 'trophy', 'chart': 'chart', 'star': 'star-on', 'ball': 'ball', 'search': 'search', 'cross': 'cross', 'jersey': 'jersey', 'box': 'box', 'gear': 'gear', 'factory': 'hammer', 'pencil': 'pencil', 'printer': 'printer', 'diamond': 'diamond', 'upgrade': 'upgrade', 'lock': 'lock'}
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
    gp, _ = uri('btn-grey', 440)
    out.append("SC .mf-big:disabled { border-image-source: %s; filter: none; color: #5b5f70; }" % gp)
    nine('SC .mf-card.empty', 'panel-dark', 80, 12, 440, 'color: #fff;')
    out.append("SC .mf-card.pick { filter: brightness(1.08) saturate(1.2); } SC .mf-card.empty .ico { filter: none; }")
    out.append("SC .mf-tab { min-height: 58px; padding: 0 2px; } SC .mf-tab.on { padding: 0 2px; } SC .mf-card { padding: 0 2px; } SC .mf-chip { padding: 0 2px; }")
    # the progress bars: a slim glossy pill (dark slot, thin gold ring, a lit fill with a highlight), the same finish as the buttons
    out.append("SC .mf-bar { position: relative; height: 13px; padding: 0; border: 2px solid #14102a; border-radius: 999px; background: linear-gradient(#050a2a, #121c5c); box-shadow: 0 0 0 1.5px #ffb800, inset 0 2px 3px rgba(0, 0, 0, .65); overflow: hidden; } SC .mf-bar i { position: relative; display: block; height: 100%; min-width: 0; margin: 0; border-radius: 999px; background: linear-gradient(#ffe97a 0%, #ffc21a 45%, #e68a00 100%); box-shadow: inset 0 -2px 2px rgba(120, 50, 0, .35); } SC .mf-bar i::after { content: ''; position: absolute; left: 6%; right: 6%; top: 12%; height: 32%; border-radius: 999px; background: linear-gradient(rgba(255, 255, 255, .75), rgba(255, 255, 255, .08)); } SC .mf-bar.green i { background: linear-gradient(#b4f58f 0%, #4fd04f 45%, #1f9a3a 100%); box-shadow: inset 0 -2px 2px rgba(0, 70, 20, .4); } SC .mf-bar.red i { background: linear-gradient(#ff9aa4 0%, #ff4d5e 45%, #c4162c 100%); box-shadow: inset 0 -2px 2px rgba(100, 0, 15, .4); }")
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
    for nme in ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'agent', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'o1', 'o2', 'o3', 'o4', 'sc1', 'sc2', 'sc3', 'sc4', 'sc5', 's1']:
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
    out.append(".title-topbar { width: 100%; justify-content: flex-end; } .title-topbar .tb-xp { min-width: 40px; }")
    # ---- the fan cards of the factory: the supplied gold card (its icons and slots painted in), the portrait on its left, the numbers in its slots ----
    FC = json.load(open(os.path.join(D, 'fan-card.json'))); fu, _ = uri('fan-card', 460, 86); variants = icon_variants()
    def at(n): q = FC[n]; return f"left: {q['l']}%; top: {q['t']}%; width: {q['w']}%; height: {q['h']}%;"
    out.append(f".mf .fc {{ position: relative; display: block; width: 100%; aspect-ratio: {FC['aspect']}; min-height: 0; padding: 0; border: 0; border-radius: 0; background: {fu} center / 100% 100% no-repeat; box-shadow: none; overflow: hidden; text-align: left; border-image: none; filter: drop-shadow(0 3px 3px rgba(0, 0, 0, .4)); }}")
    out.append(".mf .fc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: auto; gap: 6px; align-content: start; flex: 0 0 auto; }")
    out.append(f".mf .fc-art {{ position: absolute; {at('art')} display: block; overflow: hidden; border-radius: 6px; }} .mf .fc-art .face {{ position: absolute; inset: 0; width: 100% !important; height: 100% !important; object-fit: cover; object-position: 50% 30%; border: 0; border-radius: 0; }} .mf .fc-art .fut-pic {{ position: absolute; inset: 0; }} .mf .fc-art .fut-pic canvas {{ position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: auto; height: 108%; max-width: 135%; border: 0; border-radius: 0; }}")
    out.append(".mf .fc-info { position: absolute; inset: 0; margin: 0; padding: 0; display: block; }")
    out.append(f".mf .fc-bar {{ position: absolute; {at('bar')} height: {FC['bar']['h']}%; border-width: 0; border-radius: 999px; background: none; box-shadow: none; }} .mf .fc-bar i {{ border-radius: 999px; }}")
    for n in '1234':
        out.append(f".mf .fc-v{n} {{ position: absolute; {at('r' + n)} display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; line-height: 1; color: #14102a; }}")
    out.append(".mf .fc-v.dim { opacity: .55; }")
    out.append(".mf .fc-name { position: absolute; left: 6%; bottom: 7%; max-width: 46%; font-size: 14px; line-height: 1; color: #fff; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 2px 0 #14102a, 0 0 4px #14102a, 1px 1px 0 #14102a, -1px -1px 0 #14102a; }")
    out.append(".mf .fc-staff .fc-name { left: 55%; top: 60%; bottom: auto; width: 39%; max-width: none; text-align: center; font-size: 17px; font-weight: 900; color: #14102a; text-shadow: none; } .mf .fc-staff .fc-art { overflow: visible; } .mf .fc-staff .fc-art .stf { position: absolute; inset: 0; background-color: transparent; background-size: contain; background-position: 50% 100%; } .mf .fc-staff .fc-v1 { color: #ffb800; text-shadow: 0 1px 0 #14102a; font-size: 14px; }")
    out.append(".mf .fc.pick { filter: brightness(1.07) saturate(1.15) drop-shadow(0 3px 3px rgba(0, 0, 0, .4)); }")
    out.append('.mf[data-tight="2"] .fc-grid, .mf[data-tight="3"] .fc-grid, .mf[data-tight="4"] .fc-grid { width: 88%; margin: 0 auto; } .mf[data-tight="3"] .fc-grid, .mf[data-tight="4"] .fc-grid { width: 78%; gap: 3px; } .mf[data-tight="3"] .fc-v, .mf[data-tight="4"] .fc-v { font-size: 10px; } .mf[data-tight="3"] .fc-name, .mf[data-tight="4"] .fc-name { font-size: 11px; }')
    for vname, vu in variants.items():
        out.append(f".mf .fc.fcv-{vname} {{ background-image: {vu}; }}")
    out.append(".mf .fc-grid .mf-card.empty { aspect-ratio: 1.548; min-height: 0; border-width: 8px; border-image-width: 8px; }")
    # ---- the hire sheets and the staff lists: one big card. The stadium picture (with its gold frame) is the whole card; his picture stands on it, the header band, the About panel, a ribbon of stars, the wage chip and the button sit on top ----
    stad, _ = uri('stadium-card', 640, 82)
    ab = {n: uri('about-' + n, 520, 84)[0] for n in ('med', 'factory', 'coach', 'fin')}
    rb, _ = uri('ribbon-laurel', 640)
    out.append(".cand-wrap { min-width: 0; } .cand-row { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 2px 8px; scrollbar-width: none; -webkit-overflow-scrolling: touch; } .cand-row::-webkit-scrollbar { display: none; }")
    out.append(f".mf .mf-card.cand {{ position: relative; flex: 0 0 90%; scroll-snap-align: center; display: block; container-type: inline-size; aspect-ratio: 1.179; min-height: 0; padding: 0; border: 0; border-image: none; border-radius: 0; box-shadow: none; text-align: left; color: #fff; background: {stad} center / 100% 100% no-repeat; overflow: hidden; }}")
    out.append(".cand-top { position: absolute; left: 0; top: 0; width: 100%; height: 17%; display: block; } .cand-body { display: contents; }")
    out.append(".cand-name { position: absolute; left: 4.5%; top: 0; bottom: 0; width: 53%; display: flex; align-items: center; font-size: 7.4cqw; line-height: 1; white-space: nowrap; overflow: hidden; color: #fff; text-shadow: 0 2px 0 #0a1448, 1px 1px 0 #0a1448, -1px -1px 0 #0a1448; } .cand-name.long { font-size: 6cqw; } .cand-flag { position: absolute; left: 59.5%; top: 0; bottom: 0; width: 12%; display: flex; align-items: center; justify-content: center; font-size: 8cqw; line-height: 1; }")
    out.append(".cand-job { position: absolute; left: 73%; top: 14%; width: 25%; height: 70%; display: flex; align-items: center; justify-content: center; gap: 1.2cqw; border: 2px solid #e8f2ff; border-radius: 999px; background: linear-gradient(180deg, #2d79ff, #1246c8); box-shadow: 0 0 0 2px #14307e; color: #fff; font-size: 3.3cqw; font-weight: 900; letter-spacing: .2px; text-transform: uppercase; text-shadow: 0 1px 0 rgba(0, 0, 0, .5); white-space: nowrap; } .cand-job .ico { width: 5cqw; height: 5cqw; flex: none; }")
    out.append(".cand-art { position: absolute; left: 2.5%; top: 15%; width: 54%; height: 63%; } .cand-art .stf { position: absolute; inset: 0; background-color: transparent; background-size: contain; background-position: 50% 100%; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .45)); }")
    out.append(f".cand-stars {{ position: absolute; left: 3%; top: 67.5%; width: 47.5%; height: 9.5%; display: flex; align-items: center; justify-content: center; font-size: 6.4cqw; line-height: 1; letter-spacing: 1px; padding: 0 9%; background: {rb} center / 100% 100% no-repeat; text-shadow: 0 1px 0 #14102a; }}")
    out.append(".cand-aboutbox { position: absolute; left: 51.8%; top: 21.6%; width: 45.3%; height: 45.5%; display: flex; flex-direction: column; justify-content: center; padding: 11% 7% 4% 6.5%; background-size: 100% 100%; background-repeat: no-repeat; color: #14102a; overflow: hidden; } .cand-about { margin: 0; font-size: 4.1cqw; font-weight: 800; line-height: 1.2; color: #14102a; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }")
    for n, u in ab.items(): out.append(f".cand-aboutbox.ab-{n} {{ background-image: {u}; }}")
    out.append(".cand-wage { position: absolute; left: 16.8%; top: 82.4%; width: 15%; height: 7.6%; display: flex; align-items: center; justify-content: center; font-size: 3.9cqw; font-weight: 900; color: #fff; white-space: nowrap; text-shadow: 0 1px 0 #050d30; } .cand-age { position: absolute; left: 43.3%; top: 80.5%; width: 12%; height: 11%; display: flex; flex-direction: column; justify-content: center; line-height: 1.05; color: #fff; text-shadow: 0 1px 0 #050d30; } .cand-age small { font-size: 3.4cqw; font-weight: 800; opacity: .85; text-transform: uppercase; letter-spacing: .4px; } .cand-age b { font-size: 6cqw; font-weight: 900; }")
    out.append(".mf .mf-big.cand-hire { position: absolute; left: 58%; top: 72%; width: 39.5%; height: 21.5%; min-width: 0; min-height: 0; margin: 0; padding: 0 2%; font-size: 6.2cqw; white-space: nowrap; } .mf .mf-big.cand-hire .ico { width: 7.5cqw; height: 7.5cqw; }")
    out.append(".mf-card.cand.locked .cand-art, .mf-card.cand.locked .cand-aboutbox, .mf-card.cand.locked .cand-wage, .mf-card.cand.locked .cand-stars { filter: grayscale(.85) brightness(.85); } .cand-lock { position: absolute; left: 4%; top: 4%; z-index: 2; padding: .5cqw 2.5cqw; border-radius: 8px; background: rgba(20, 16, 42, .85); color: #ffd23f; font-size: 3.4cqw; font-weight: 900; } .mf-card.cand.mine { filter: saturate(.8); }")
    out.append(".mf-card.cand.free { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px; cursor: pointer; } .mf-card.cand.free .ico { width: 14cqw; height: 14cqw; } .mf-card.cand.free b { font-size: 7cqw; color: #fff; text-shadow: 0 2px 0 #0a1448; } .mf-card.cand.free small { font-size: 4cqw; font-weight: 800; color: #fff; opacity: .85; }")
    out.append(".cand-dots { display: flex; justify-content: center; gap: 6px; padding: 2px 0 0; } .cand-dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, .5); } .mf-sheet-card .cand-dots i { background: rgba(20, 16, 42, .25); } .cand-dots i.on { background: #ffb800; box-shadow: 0 0 0 1.5px #14102a; }")
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
