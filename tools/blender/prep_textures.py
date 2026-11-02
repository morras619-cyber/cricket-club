# Cuts the textures the Blender grounds use. Thunder: out of its painted ground art (img/ground/thunder)
# into tools/blender/tex: the crowd band, the skyline (mirrored so it wraps), grass, pitch, logos.
# Other clubs (python prep_textures.py cyclones): from their painted pieces in tools/blender/src/<club>
# into tools/blender/tex/<club>, plus the game's own pitch and grass (img/ground/<club>).
# Then, with Blender's bpy module: CLUB=<club> python thunderdome.py -- bat|bowl|keeper|top out.png [samples]
import os, sys
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFilter


def ndi_open(m):
    from scipy import ndimage as ndi
    return ndi.binary_opening(m, iterations=2)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT, OUT = os.path.join(HERE, '..', '..'), os.path.join(HERE, 'tex')
os.makedirs(OUT, exist_ok=True)
g = lambda p: os.path.join(ROOT, p)
if len(sys.argv) > 1:
    CLUB = sys.argv[1]
else:
    CLUB = 'thunder'
far = None if CLUB != 'thunder' else Image.open(g('img/ground/thunder/far.webp')).convert('RGB')
def stand_sections(paths, out, stair=76, crowd_end=1220):
    """painted stand sections (steps at the left, then the crowd, front row at the bottom, back
    row at the top: the whole stand in one picture) side by side, then again mirrored, each
    keeping its steps on the left; the back rows a shade darker under the roof"""
    secs = []
    for mirror in (False, True):
        for path in paths:
            im = Image.open(path).convert('RGB')
            st, cr = im.crop((0, 0, stair, im.height)), im.crop((stair, 0, crowd_end, im.height))
            sec = Image.new('RGB', (crowd_end, im.height)); sec.paste(st, (0, 0)); sec.paste(ImageOps.mirror(cr) if mirror else cr, (stair, 0))
            secs.append(sec)
    h = secs[0].height
    strip = Image.new('RGB', (sum(x.width for x in secs), h)); x = 0
    for sec in secs: strip.paste(sec, (x, 0)); x += sec.width
    a = np.asarray(strip).astype(float) * np.linspace(0.8, 1.0, h)[:, None, None]
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(os.path.join(out, 'crowd.png'))
    print('stand strip', strip.size)


if CLUB == 'thunder':
    near = Image.open(g('img/ground/thunder/near.webp')).convert('RGB')
    # the crowd: below the lights under the roof, above the boards, either side of the big screen
    segs = []
    for im, (s0, s1) in ((far, (825, 1341)), (near, (858, 1309))):
        segs += [im.crop((0, 290, s0, 398)), im.crop((s1, 290, im.width, 398))]
    c = Image.new('RGB', (sum(s.width for s in segs), 108)); x = 0
    for s in segs: c.paste(s, (x, 0)); x += s.width
    c.save(os.path.join(OUT, 'crowd.png'))
    # the skyline between the floodlights
    parts = []
    for im in (far, near):
        a = im.crop((262, 0, 1925, 206)); parts += [a, ImageOps.mirror(a)]
    s = Image.new('RGB', (sum(p.width for p in parts), 206)); x = 0
    for p in parts: s.paste(p, (x, 0)); x += p.width
    s.save(os.path.join(OUT, 'skyline.png'))
    for f in ('grass', 'pitch'): Image.open(g(f'img/ground/thunder/{f}.webp')).save(os.path.join(OUT, f + '.png'))
    for f in ('logo-thunder', 'logo-sixcharge'): Image.open(g(f'img/{f}.webp')).save(os.path.join(OUT, f + '.png'))


def club(name):
    """a club's pieces from tools/blender/src/<club>: crowd1-3, skyline, pitch, grass (see the prompts)"""
    src, out = os.path.join(HERE, 'src', name), os.path.join(OUT, name)
    game = os.path.join(ROOT, 'img', 'ground', name)
    os.makedirs(out, exist_ok=True); os.makedirs(game, exist_ok=True)
    s = lambda f: os.path.join(src, f)
    if os.path.exists(s('arena.jpg')):
        arena(s('arena.jpg'), out)
    else:
        crowds(s, out)
    # the grass: 4 mowing stripes left to right
    gr = Image.open(s('grass.png')).convert('RGB')
    gr.resize((1024, 1024), Image.LANCZOS).save(os.path.join(out, 'grass.png'))
    gr.resize((512, 512), Image.LANCZOS).save(os.path.join(game, 'grass.webp'), quality=90)
    # the pitch: z −2..22 down the strip (the bowling creases at 0 and 20), x ±1.52 m on the middle
    # 92% of its width (as the game draws it), the painted creases taken out (the game draws its own)
    import cv2
    p = np.asarray(Image.open(s('pitch.png')).convert('RGB'))
    lines = (p.min(2) > 205)
    lines = cv2.dilate(lines.astype(np.uint8), np.ones((5, 5), np.uint8))
    p = cv2.inpaint(np.ascontiguousarray(p), lines, 7, cv2.INPAINT_TELEA)
    pg = p.astype(int)
    ys = [y for y in range(pg.shape[0]) if (np.asarray(Image.open(s('pitch.png')).convert('L'))[y] > 215).sum() > 200]
    zb0, zb1 = min(ys), max(ys)                  # the bowling creases (the far one at the top)
    pxm_z = (zb1 - zb0) / 20.0
    col = np.asarray(Image.open(s('pitch.png')).convert('L'))[(zb0 + 20):(zb0 + 60)]
    xs = np.nonzero((col > 215).sum(0) > 30)[0]
    xl, xr = xs.min(), xs.max()                   # the return creases, ±1.32 m
    pxm_x = (xr - xl) / 2.64; cx = (xl + xr) / 2
    half = 1.52 / 0.92 * pxm_x
    top, bot = zb0 - 2 * pxm_z, zb1 + 2 * pxm_z
    img = Image.fromarray(p)
    pad = int(max(0, -top)) + 4
    if pad:
        ext = np.concatenate([p[pad * 2:pad:-1][:pad], p], 0); img = Image.fromarray(ext); top += pad; bot += pad
    crop = img.crop((round(cx - half), round(top), round(cx + half), round(bot)))
    # see-through past the painted ends (magenta) and along its grassy edges, so the strip melts
    # into the outfield drawn under it
    c = np.asarray(crop).astype(float)
    hsv = np.asarray(crop.convert('HSV')).astype(float)
    H, S = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
    mag = (np.minimum(c[..., 0], c[..., 2]) - c[..., 1]) > 90
    green = (H > 55) & (H < 150) & (S > 0.3)
    keep = ~(mag | ndi_open(green))
    # (and nothing beyond the magenta past each end: the padding mirrored in at the top)
    mrows = np.nonzero(mag.mean(1) > 0.5)[0]
    n = len(keep)
    if len(mrows[mrows < n * 0.1]): keep[:mrows[mrows < n * 0.1].max()] = False
    if len(mrows[mrows > n * 0.9]): keep[mrows[mrows > n * 0.9].min():] = False
    al = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
    c[mag] = np.array([196, 160, 110])           # (no magenta fringe at the soft edge)
    rgba = Image.fromarray(c.astype(np.uint8)).convert('RGBA'); rgba.putalpha(al)
    rgba.resize((600, 1950), Image.LANCZOS).save(os.path.join(out, 'pitch.png'))
    rgba.resize((300, 975), Image.LANCZOS).save(os.path.join(game, 'pitch.webp'), quality=90)
    for f in (f'logo-{name}', 'logo-sixcharge'): Image.open(os.path.join(ROOT, f'img/{f}.webp')).save(os.path.join(out, f + '.png'))
    print('wrote', out, 'pitch px/m', round(pxm_z, 1), round(pxm_x, 1))


def crowds(s, out):
    """the daylight crowd: three paintings side by side, and the skyline painting"""
    # the crowd: the three paintings side by side, each also mirrored, an aisle of steps at every join
    # and a walkway along the top of each tier (the strip is tiled three tiers up the stand)
    tiles = [Image.open(s(f'crowd{k}.png')).convert('RGB') for k in (1, 2, 3)]
    h = tiles[0].height
    tiles = [t.resize((round(t.width * h / t.height), h)) for t in tiles]
    seq = [tiles[0], ImageOps.mirror(tiles[1]), tiles[2], ImageOps.mirror(tiles[0]), tiles[1], ImageOps.mirror(tiles[2])]
    strip = Image.new('RGB', (sum(t.width for t in seq), h))
    x, joins = 0, []
    for t in seq:
        strip.paste(t, (x, 0)); joins.append(x); x += t.width
    a = np.asarray(strip).astype(float)
    # (a touch darker and calmer, the back rows of each tier in the stand's shade)
    shade = np.linspace(0.86, 1.0, h)[:, None, None]
    a = a * shade
    grey = a.mean(2, keepdims=True); a = grey + (a - grey) * 1.05
    strip = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(strip)
    AW, STEP, WALK = 64, h // 7, 26
    for j in joins:
        for x0 in ((j - AW // 2) % strip.width, ):
            for k in range(0, h, STEP):
                d.rectangle([x0, k, x0 + AW, k + STEP], fill=(92, 98, 90))
                d.rectangle([x0, k, x0 + AW, k + STEP // 5], fill=(150, 156, 146))
                d.line([x0, k + STEP // 5, x0 + AW, k + STEP // 5], fill=(20, 16, 24), width=2)
            for e in (x0, x0 + AW):
                d.line([e, 0, e, h], fill=(20, 16, 24), width=4)
    d.rectangle([0, 0, strip.width, WALK], fill=(52, 60, 52))
    d.line([0, WALK, strip.width, WALK], fill=(20, 16, 24), width=3)
    d.line([0, WALK // 2, strip.width, WALK // 2], fill=(255, 210, 31), width=3)
    strip.save(os.path.join(out, 'crowd.png'))
    # the skyline: the painting and its mirror, so it wraps round without a seam
    sk = Image.open(s('skyline.png')).convert('RGB')
    w2 = Image.new('RGB', (sk.width * 2, sk.height)); w2.paste(sk, (0, 0)); w2.paste(ImageOps.mirror(sk), (sk.width, 0))
    w2.save(os.path.join(out, 'skyline.png'))


def arena(path, out):
    """the night arena painting (the stand at one end, the sky behind, magenta below the boards): its
    lower-tier crowd straightened into a strip, the sky between the floodlights, the club's sign"""
    import cv2
    from scipy import ndimage as ndi
    im = Image.open(path).convert('RGB'); a = np.asarray(im)
    W = a.shape[1]
    # the crowd between the rail (which bows down to the middle) and the boards, each column
    # stretched to the same height, then the strip and its mirror so it wraps without a seam
    rail = lambda x: 448 + 56 * (1 - ((x - W / 2) / (W / 2)) ** 2) + 4
    BOARD, HT = 590, 120
    band = np.zeros((HT, W, 3), np.uint8)
    for x in range(W):
        col = a[int(rail(x)):BOARD, x]
        band[:, x] = np.asarray(Image.fromarray(col[:, None]).resize((1, HT), Image.BICUBIC))[:, 0]
    band = Image.fromarray(band)
    strip = Image.new('RGB', (W * 2, HT)); strip.paste(band, (0, 0)); strip.paste(ImageOps.mirror(band), (W, 0))
    strip.save(os.path.join(out, 'crowd.png'))
    # the sign over the big screen: its yellow and green letters and bolts, filled, with the ink round them
    x0, y0, x1, y1 = 1000, 150, 1580, 380
    c = a[y0:y1, x0:x1]
    hsv = cv2.cvtColor(np.ascontiguousarray(c), cv2.COLOR_RGB2HSV).astype(float)
    H, Sa, V = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    lab, n = ndi.label(ndi.binary_closing((H > 40) & (H < 150) & (Sa > 0.45) & (V > 0.35), iterations=3))
    big = np.isin(lab, 1 + np.nonzero(ndi.sum(np.ones_like(lab), lab, range(1, n + 1)) > 400)[0])
    m = ndi.binary_dilation(ndi.binary_fill_holes(ndi.binary_closing(big, iterations=6)), iterations=4)
    ys, xs = np.nonzero(m)
    sign = np.dstack([c, (m * 255).astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(sign).save(os.path.join(out, 'sign.png'))
    # the sky between the floodlights, down to the roof; the sign's top painted out (the 3D sign covers it)
    sx0, sx1, sy1 = 300, 2280, 215
    sky = np.ascontiguousarray(a[:sy1, sx0:sx1])
    hole = np.zeros(sky.shape[:2], np.uint8)
    hole[max(0, y0 + ys.min() - sy1 + sy1 - 4 - (sy1 - (y0 + ys.min()))):, max(0, x0 + xs.min() - sx0 - 4):x0 + xs.max() - sx0 + 4] = 1
    hole[:max(0, y0 + ys.min() - 4), :] = 0
    sky = cv2.inpaint(sky, hole, 9, cv2.INPAINT_TELEA)
    sk = Image.fromarray(sky)
    w2 = Image.new('RGB', (sk.width * 2, sk.height)); w2.paste(sk, (0, 0)); w2.paste(ImageOps.mirror(sk), (sk.width, 0))
    w2.save(os.path.join(out, 'skyline.png'))
    print('arena: crowd', strip.size, 'sign', sign.shape[1::-1], 'sky', w2.size)


if CLUB != 'thunder':
    club(CLUB)

# Thunder's own painted stand sections, when they're there, replace the crowd cut from its ground art
if CLUB == 'thunder' and os.path.exists(os.path.join(HERE, 'src', 'thunder', 'crowd1.jpg')):
    stand_sections([os.path.join(HERE, 'src', 'thunder', f'crowd{k}.jpg') for k in (1, 2, 3)], OUT)
