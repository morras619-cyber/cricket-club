# Preview of the shirt print on the back sheet (mockup tool, see SHIRT_PRINT.md).
# usage: python3 tools/kit/shirt_print_preview.py OUTDIR  (needs the scratch helpers; placement in shirt-print-back.json)
# name + number as one print block, placed by hand per back-view frame
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
S = sys.argv[1]; sys.argv = ['x', S]; sys.path.insert(0, 'tools'); sys.path.insert(0, S)
import build_hair as B, proto as P
U = '/root/.claude/uploads/54ad0d67-eae6-5a96-ba09-24e3e4b2e539/'
FONT = '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
# per frame, in tile coordinates (tile origin = frame box left - 40, top):
# block centre x, y; width of the block (px); horizontal squash; vertical squash; tilt (deg, clockwise)
PLACE = json.load(open(S + '/place.json'))
base = B.keyed(U + '96d91d8c-image.png') / 255
Lh = np.array(Image.open(S + '/hair-part-back.png')).astype(np.float32) / 255
op = base[..., 3] > 0.25
lab, k = ndi.label(op); s = ndi.sum(op, lab, range(1, k + 1)); bx = ndi.find_objects(lab)
order = sorted([i for i in range(k) if s[i] > 20000], key=lambda i: (bx[i][0].start // 600, bx[i][1].start))
blue0, _, _ = P.masks(base)

def block(name, num, colour, edge, only=None):
    """The print laid out flat: name over number, fixed proportions, 400 px wide."""
    W = 400
    def line(txt, h, maxw):
        f = ImageFont.truetype(FONT, int(h * 1.4)); o = max(2, int(h * 0.07)) if edge else 0
        im = Image.new('RGBA', (int(f.getlength(txt)) + 40, int(h * 2)), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((20, 0), txt, font=f, fill=colour, stroke_width=o, stroke_fill=edge)
        im = im.crop(im.getbbox()); im = im.resize((int(im.width * 0.8), im.height), Image.LANCZOS)  # condensed
        if im.width > maxw: im = im.resize((maxw, im.height), Image.LANCZOS)
        return im
    n = line(name.upper(), 52, W); d = line(str(num), 190, W)
    out = Image.new('RGBA', (W, n.height + 26 + d.height), (0, 0, 0, 0))
    if only != 'number': out.alpha_composite(n, ((W - n.width) // 2, 0))
    if only != 'name': out.alpha_composite(d, ((W - d.width) // 2, n.height + 26))
    return out

def dress(f, j, name, num, suit, trim):
    p = PLACE[j]
    if not p: return
    cx, cy, w, sx, sy, ang = p[:6]
    nudge = {'name': p[6:8] if len(p) > 6 else [0, 0], 'number': p[8:10] if len(p) > 8 else [0, 0]}
    lum = lambda h: P.hx(h) @ np.array([0.299, 0.587, 0.114])
    edge = None if abs(lum(trim) - lum(suit)) > 0.35 else tuple(int(c * 255) for c in P.hx(suit) * 0.35) + (255,)
    col = tuple(int(c * 255) for c in P.hx(trim)) + (255,)
    i = order[j]; sl = bx[i]; ox, oy = sl[1].start - 40, sl[0].start
    H, Wd = base.shape[:2]
    layer = Image.new('RGBA', (Wd, H))
    for part in ('name', 'number'):
        b = block(name, num, col, edge, only=part)
        sc = w / b.width
        b = b.resize((max(1, int(b.width * sc * sx)), max(1, int(b.height * sc * sy))), Image.LANCZOS).rotate(-ang, expand=True, resample=Image.BICUBIC)
        dx, dy = nudge[part]
        layer.alpha_composite(b, (int(ox + cx + dx - b.width / 2), int(oy + cy + dy - b.height / 2)))
    a = np.array(layer).astype(np.float32) / 255
    me = lab == i + 1
    clip = ndi.binary_erosion(blue0 & me, iterations=1)
    alpha = a[..., 3] * clip
    Lc = f[..., :3] @ np.array([0.299, 0.587, 0.114]); med = np.median(Lc[blue0 & me])
    shade = np.clip(Lc / med, 0.55, 1.15)[..., None]
    f[..., :3] = f[..., :3] * (1 - alpha[..., None]) + np.clip(a[..., :3] * shade, 0, 1) * alpha[..., None]

def kitted(suit, trim, skin, hc, hair=True):
    f = base.copy(); blue, yel, sk = P.masks(f); L = f[..., :3] @ np.array([0.299, 0.587, 0.114])
    P.paint(f, blue, L, suit); P.paint(f, yel, L, trim)
    ref = np.median(L[sk]); t = P.hx(skin); rr = (L[sk] / ref)[:, None]
    f[..., :3][sk] = np.where(rr <= 1, t * rr, t + (1 - t) * np.minimum(0.85, (rr - 1) * 1.1))
    if hair:
        a = Lh[..., 3:]; lum = Lh[..., :3] @ np.array([0.299, 0.587, 0.114]); v = lum[Lh[..., 3] > 0.5]; mid = np.median(v[v > 0.15])
        to = P.hx(hc); q = (lum / mid)[..., None]; colh = np.where(q <= 1, to * q, to + (1 - to) * np.minimum(0.8, (q - 1) * 0.6))
        f[..., :3] = colh * a + f[..., :3] * (1 - a); f[..., 3] = np.maximum(f[..., 3], Lh[..., 3])
    return f

if __name__ == '__main__':
    mode = sys.argv[2] if len(sys.argv) > 2 else 'grid'
PLAYERS = [('van der Berg', 14, '#6a22c4', '#f2b21b', '#f1c6a3', '#b07a3a', True),
           ('Belgrave', 23, '#1f5fd6', '#ffd23f', '#7a4a2e', '#2a1a10', True),
           ('Raza', 7, '#1f1f26', '#e8262b', '#d99a6c', '#241817', True),
           ('Lockhart', 18, '#ec2f9a', '#ffffff', '#f1c6a3', '#c99a52', True),
           ('Sheikh', 9, '#ffcf1a', '#1a1a1a', '#c98e63', '#9a9a9a', False)]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
CHECK = len(sys.argv) > 2 or __import__('os').environ.get('CHECK')
TW, TH = 300, 330
sheet = Image.new('RGB', (TW * 10, len(PLAYERS) * (TH + 30)), (61, 122, 51)); d = ImageDraw.Draw(sheet)
for r, (name, num, suit, trim, skin, hc, hair) in enumerate(PLAYERS):
    f = kitted(suit, trim, skin, hc, hair)
    for j in range(10): dress(f, j, name, num, suit, trim)
    im = Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8), 'RGBA')
    for j in range(10):
        sl = bx[order[j]]; t = im.crop((sl[1].start - 40, sl[0].start, sl[1].start + 260, sl[0].start + TH))
        sheet.paste(t, (TW * j, r * (TH + 30) + 30), t)
        if CHECK:
            import json as _j
            (c1, c2) = _j.load(open(S + '/spine.json'))[j][:2]
            dd = ImageDraw.Draw(sheet); y0 = r * (TH + 30) + 30
            for (qx, qy) in (c1, c2): dd.ellipse((TW * j + qx - 3, y0 + qy - 3, TW * j + qx + 3, y0 + qy + 3), fill='red')
            dd.line((TW * j + c1[0], y0 + c1[1], TW * j + c2[0], y0 + c2[1]), fill='red', width=1)
    d.text((8, r * (TH + 30) + 4), f'{name} #{num}', fill='white', font=font)
sheet.save(S + '/backprint.png')
sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS).save(S + '/backprint-sm.png')
