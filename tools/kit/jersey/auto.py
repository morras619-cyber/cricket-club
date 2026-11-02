# Landmarks found on each pose from the kit masks: the collar, the cuffs and the belt are the
# trim's thick bands; the shoulders are the shirt's top edge between collar and cuff.
import json, subprocess
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
ROOT = '/home/user/cricket-club/'
META = json.loads(subprocess.check_output(['node', '-e', "import('/home/user/cricket-club/js/kitsheets.js').then(m=>console.log(JSON.stringify(m.KIT_SHEETS)))"]))
def tile(a, fr): x, y, w, h = fr[:4]; return a[y:y + h, x:x + w]
def pose(view, k):
    fr = META[view]['frames'][k]
    im = tile(np.asarray(Image.open(ROOT + f'img/kit/{view}.webp').convert('RGBA')).astype(float), fr)
    mk = tile(np.asarray(Image.open(ROOT + f'img/kit/{view}-mask.png')), fr)
    tn = tile(np.asarray(Image.open(ROOT + f'img/kit/{view}-tone.png')).astype(float), fr)
    return im, mk, tn
def landmarks(view, k):
    im, mk, tn = pose(view, k)
    kit = mk[..., 2] > 0
    trim = kit & (tn[..., 1] > 127)
    skin = mk[..., 0] > 127
    thick = ndi.binary_opening(trim, iterations=2)
    lab, n = ndi.label(thick)
    comps = []
    for j, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab == j; a = m.sum()
        if a < 60: continue
        ys, xs = np.nonzero(m)
        comps.append(dict(j=j, a=a, y0=ys.min(), y1=ys.max(), x0=xs.min(), x1=xs.max(), cx=xs.mean(), cy=ys.mean(), ys=ys, xs=xs))
    # the head: the topmost big skin patch; the collar: the trim band nearest under it
    hl, hn = ndi.label(skin)
    heads = [(sl[0].start, j) for j, sl in enumerate(ndi.find_objects(hl), 1) if (hl[sl] == j).sum() > 600]
    hy0, hj = min(heads); hys, hxs = np.nonzero(hl == hj)
    hx, hb = hxs.mean(), hys.max()
    col = min(comps, key=lambda c: abs(c['cy'] - hb) + abs(c['cx'] - hx) * 0.6)
    # the belt: horizontal runs of trim only (not the trousers' side stripes), the widest well below the collar
    hb_ = ndi.binary_opening(trim, structure=np.ones((1, 13)))
    bl, bn = ndi.label(ndi.binary_closing(hb_, structure=np.ones((3, 9))))
    bands = []
    for j, sl in enumerate(ndi.find_objects(bl), 1):
        m = bl == j; ys, xs = np.nonzero(m)
        if ys.mean() < col['cy'] + 45 or np.ptp(xs) < 30: continue
        bands.append(dict(a=m.sum(), w=np.ptp(xs), cy=ys.mean(), cx=xs.mean(), xs=xs, ys=ys, x0=xs.min(), x1=xs.max()))
    belt = max(bands, key=lambda c: c['w'])
    sw = belt['w']
    # the cuffs: the remaining bands above the belt, one each side of the collar (the biggest)
    rest = [c for c in comps if c is not col and c['cy'] < belt['cy'] - 15 and c['a'] > 120 and not (c['y1'] - c['y0'] > 3 * (c['x1'] - c['x0']) and c['a'] < 400)]
    L = {}
    nx = col['cx']
    for side, sgn in (('L', -1), ('R', 1)):
        cs = [c for c in rest if (c['cx'] - nx) * sgn > 0.15 * sw]
        if not cs: continue
        c = max(cs, key=lambda c: c['a'])
        pts = np.stack([c['xs'], c['ys']], 1).astype(float)
        d = np.hypot(pts[:, 0] - nx, pts[:, 1] - col['cy'])
        L['cuf' + side] = tuple(pts[np.argmax(d)])               # the cuff's far end
        L['arm' + side] = tuple(pts[np.argmin(np.hypot(pts[:, 0] - nx, pts[:, 1] - belt['cy']))])  # nearest the body
    # the collar's ends (front) and its middle (back)
    cy_ = col['ys']; cx_ = col['xs']
    if view == 'front':
        L['colL'] = (cx_.min(), cy_[np.argmin(cx_)]); L['colR'] = (cx_.max(), cy_[np.argmax(cx_)])
    else:
        L['neck'] = (nx, float(np.percentile(cy_, 80)))
    # the belt: its top-left, top-right, top-middle
    bx, by = belt['xs'], belt['ys']
    L['hemL'] = (bx.min(), by[bx < bx.min() + 6].min()); L['hemR'] = (bx.max(), by[bx > bx.max() - 6].min())
    mxm = (bx.min() + bx.max()) / 2; L['hemC'] = (mxm, by[np.abs(bx - mxm) < 5].min())
    top = col['cy']
    # the shoulders: the shirt's top edge halfway between the collar and each cuff
    shirt = kit & ~trim & ~ndi.binary_dilation(skin, iterations=2)
    for side in ('L', 'R'):
        if 'cuf' + side not in L: continue
        x = int((nx + L['cuf' + side][0]) / 2)
        colm = shirt[:, max(0, x - 2):x + 3].any(1)
        ys = np.nonzero(colm)[0]
        ys = ys[ys > col['y0'] - 6]
        if len(ys): L['sh' + side] = (float(x), float(ys.min()))
    L['mid'] = ((nx + L['hemC'][0]) / 2, (top + L['hemC'][1]) / 2)
    return {k_: (float(v[0]), float(v[1])) for k_, v in L.items()}, im
if __name__ == '__main__':
    out = {}
    tiles = []
    for view in ('back', 'front'):
        for k in range(10):
            try:
                L, im = landmarks(view, k)
            except Exception as e:
                print(view, k, 'FAIL', e); L, im = {}, pose(view, k)[0]
            out[f'{view}{k}'] = L
            t = Image.fromarray(im.astype(np.uint8), 'RGBA'); bg = Image.new('RGBA', t.size, (255, 255, 255, 255)); bg.alpha_composite(t)
            d = ImageDraw.Draw(bg)
            for n, (x, y) in L.items():
                c = 'red' if n.endswith('L') else 'magenta' if n.endswith('R') else 'lime'
                d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=c); d.text((x + 5, y - 5), n, fill='black')
            tiles.append(bg.crop((0, 0, bg.width, min(bg.height, 330))))
    json.dump(out, open('landmarks.json', 'w'), indent=1)
    for r in range(2):
        ts = tiles[r * 10:(r + 1) * 10]
        o = Image.new('RGB', (sum(t.width for t in ts) + 10 * 10, 330), 'white'); x = 0
        for t in ts: o.paste(t.convert('RGB'), (x, 0)); x += t.width + 10
        o.save(f'lm-{r}.png')
