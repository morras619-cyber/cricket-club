# Clean shirt templates (front, back) in the game's shirt proportions: the shape to paint a kit
# design on. Drawn at 4x and scaled down for smooth edges.
from PIL import Image, ImageDraw, ImageFont
import math
K = 4; C = 1024
INK, BODY, TRIM, GUIDE = (20, 16, 24, 255), (238, 238, 238, 255), (255, 232, 140, 255), (160, 160, 185, 255)
def mirror(pts): return pts + [(C - x, y) for x, y in reversed(pts)]
def S(pts): return [(x * K, y * K) for x, y in pts]
def bez(p0, p1, p2, n=12): return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (i / n for i in range(n + 1))]
# the left half, from the neck round the outside to the hem's middle
def half(neck_y):
    return ([(430, neck_y)] + bez((430, neck_y), (330, 200), (240, 240)) + bez((240, 240), (150, 290), (112, 420))
            + [(96, 572), (262, 606), (282, 640)] + bez((282, 640), (268, 760), (282, 862)) + [(512, 866)])
def shirt(kind):
    im = Image.new('RGBA', (C * K, C * K), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    out = mirror(half(150 if kind == 'front' else 160))
    d.polygon(S(out), fill=BODY)
    # the trim: cuffs, the hem band, the collar
    for sgn in (1, -1):
        cx = (lambda x: x) if sgn == 1 else (lambda x: C - x)
        d.polygon(S([(cx(100), 540), (cx(266), 576), (cx(262), 606), (cx(96), 572)]), fill=TRIM)
    d.polygon(S([(282, 838), (742, 838), (742, 866), (282, 866)]), fill=TRIM)
    if kind == 'front':
        # an open polo collar: two flaps, a V to the placket
        for sgn in (1, -1):
            f = (lambda x: x) if sgn == 1 else (lambda x: C - x)
            d.polygon(S([(f(432), 152), (f(468), 152), (f(512), 330), (f(486), 372), (f(402), 222), (f(388), 176)]), fill=TRIM)
        d.polygon(S([(512, 330), (530, 368), (530, 470), (494, 470), (494, 368)]), fill=BODY)
        d.line(S([(494, 372), (494, 470), (530, 470), (530, 372)]), fill=INK, width=3 * K)
        for yy in (400, 440): d.ellipse(S([(506, yy - 6), (518, yy + 6)]), fill=INK)
    else:
        d.polygon(S([(432, 162), (592, 162), (598, 204)] + bez((598, 204), (512, 222), (426, 204))[1:]), fill=TRIM)
    d.line(S(out + [out[0]]), fill=INK, width=7 * K, joint='curve')
    # a dashed centre line, a guide only
    for yy in range(240 if kind == 'front' else 230, 830, 28): d.line(S([(512, yy), (512, yy + 12)]), fill=GUIDE, width=2 * K)
    return im.resize((C, C), Image.LANCZOS)
for k in ('front', 'back'): shirt(k).save(f'template-{k}.png')
a, b = Image.open('template-front.png'), Image.open('template-back.png')
o = Image.new('RGBA', (2048, 1024), (90, 90, 110, 255)); o.alpha_composite(a, (0, 0)); o.alpha_composite(b, (1024, 0)); o.resize((1024, 512)).save('tpl-view.png')
