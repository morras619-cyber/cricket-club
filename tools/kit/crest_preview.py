# Preview of the club crest on the front sheet (mockup tool, see SHIRT_PRINT.md).
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
S = sys.argv[1]; sys.argv = ['x', S]; sys.path.insert(0, 'tools'); sys.path.insert(0, S)
import build_hair as B, proto as P
U = '/root/.claude/uploads/54ad0d67-eae6-5a96-ba09-24e3e4b2e539/'
PL = json.load(open(S + '/crest-front.json'))['frames']
base = B.keyed(U + 'ef476cc3-image.png') / 255
Lh = np.array(Image.open(S + '/hair-part-front.png')).astype(np.float32) / 255
op = base[..., 3] > 0.25
lab, k = ndi.label(op); s = ndi.sum(op, lab, range(1, k + 1)); bx = ndi.find_objects(lab)
order = sorted([i for i in range(k) if s[i] > 20000], key=lambda i: (bx[i][0].start // 600, bx[i][1].start))
blue0, _, skin0 = P.masks(base)

def crest_img(team, size):
    c = Image.open(f'img/logo-{team}.webp').convert('RGBA'); c = c.crop(c.getbbox())
    big = 200; c.thumbnail((big, big), Image.LANCZOS)
    o = 7; W, H = c.width + 2 * o, c.height + 2 * o
    sil = Image.new('RGBA', (W, H)); a = np.array(c)[..., 3]
    rim = ndi.binary_dilation(a > 40, iterations=o)
    rimim = np.zeros((H, W, 4), np.uint8); rimim[o:o + c.height, o:o + c.width][..., 3] = 0
    rr = np.zeros((H, W), bool); rr[o:o + c.height, o:o + c.width] = a > 40; rr = ndi.binary_dilation(rr, iterations=o)
    rimim[rr] = [14, 12, 24, 230]
    out = Image.fromarray(rimim, 'RGBA'); out.alpha_composite(c, (o, o))
    sc = size / max(out.width, out.height)
    return out.resize((max(1, round(out.width * sc)), max(1, round(out.height * sc))), Image.LANCZOS)

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

def stamp(f, j, team):
    cx, cy, size, sx, sy, ang = PL[str(j + 1)]
    c = crest_img(team, size * 1.0)
    c = c.resize((max(1, round(c.width * sx)), max(1, round(c.height * sy))), Image.LANCZOS).rotate(-ang, expand=True, resample=Image.BICUBIC)
    i = order[j]; sl = bx[i]; ox, oy = sl[1].start - 40, sl[0].start
    layer = Image.new('RGBA', (base.shape[1], base.shape[0])); layer.alpha_composite(c, (round(ox + cx - c.width / 2), round(oy + cy - c.height / 2)))
    a = np.array(layer).astype(np.float32) / 255
    me = lab == i + 1
    # the shirt, its fold lines included (they'd cut the crest), not arms or hands in front
    clip = ndi.binary_closing(blue0 & me, iterations=4) & me & ~ndi.binary_dilation(skin0, iterations=2)
    alpha = a[..., 3] * clip
    Lc = f[..., :3] @ np.array([0.299, 0.587, 0.114]); med = np.median(Lc[blue0 & me])
    shade = np.clip(Lc / max(med, 1e-3), 0.6, 1.12)[..., None]
    f[..., :3] = f[..., :3] * (1 - alpha[..., None]) + np.clip(a[..., :3] * shade, 0, 1) * alpha[..., None]

PLAYERS = [('Thunder', 'thunder', '#1f5fd6', '#ffd23f', '#7a4a2e', '#2a1a10'),
           ('Vipers', 'vipers', '#1f1f26', '#e8262b', '#d99a6c', '#241817'),
           ('Royals', 'royals', '#ec2f9a', '#ffffff', '#f1c6a3', '#c99a52'),
           ('Eagles', 'eagles', '#ffcf1a', '#1a1a1a', '#c98e63', '#9a9a9a'),
           ('Storm', 'storm', '#6a22c4', '#f2b21b', '#f1c6a3', '#b07a3a')]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
TW, TH = 300, 320
sheet = Image.new('RGB', (TW * 10, len(PLAYERS) * (TH + 30)), (61, 122, 51)); d = ImageDraw.Draw(sheet)
for r, (label, team, suit, trim, skin, hc) in enumerate(PLAYERS):
    f = kitted(suit, trim, skin, hc)
    for j in range(10): stamp(f, j, team)
    im = Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8), 'RGBA')
    for j in range(10):
        sl = bx[order[j]]; t = im.crop((sl[1].start - 40, sl[0].start, sl[1].start + 260, sl[0].start + TH))
        sheet.paste(t, (TW * j, r * (TH + 30) + 30), t)
    d.text((8, r * (TH + 30) + 4), label, fill='white', font=font)
sheet.save(S + '/crest-front.png')
for r in range(len(PLAYERS)):
    o = Image.new('RGB', (5 * 240, 2 * 240), 'white')
    for j in range(10):
        y = r * (TH + 30) + 30 + (60 if j in (4, 5) else 0); o.paste(sheet.crop((TW * j + 30 + (30 if j == 5 else 0), y, TW * j + 270 + (30 if j == 5 else 0), y + 240)), (240 * (j % 5), 240 * (j // 5)))
    o.save(S + f'/crest-{PLAYERS[r][1]}.png')
