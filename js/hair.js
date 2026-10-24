// Hair, beards and headwear drawn onto the match sprites (img/hair/<view>.webp, cut by
// tools/build_hair.py), so the man on the pitch has his portrait's haircut. Each frame's head
// is found from the sheet's people mask (the drawn hair, and the skin below it), then the
// pieces are scaled to the skull, turned with the head and recoloured to the player's hair.
import { HAIR_ATLAS } from './hairatlas.js';

const atlases = {}; // view -> Image
export function loadHair() {
  for (const view of ['front', 'back']) {
    if (atlases[view]) continue;
    const img = new Image();
    img.src = `img/hair/${view}.webp`;
    atlases[view] = img;
  }
}
export const hairReady = view => atlases[view]?.complete && atlases[view].naturalWidth;

// the looks' style names onto the drawn pieces ('short' alternates between two cuts)
const CUTS = { crop: 'buzz', swept: 'messy', spiky: 'spiky', curly: 'curly', long: 'long', afro: 'curly', dreads: 'dreads', bald: 'bald' };
const CHINS = { stubble: 'stubble', moustache: 'moustache', beard: 'full', goatee: 'goatee' };
const WEARS = { patka: 'turban' };
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
// look -> { hair, beard, wear } piece names (look.cut / look.chin / look.wear, from a portrait, win)
export function piecesOf(look, seed = '') {
  if (!look) return null;
  const hair = look.cut || CUTS[look.style] || (look.style === 'patka' ? null : hashStr(seed) % 2 ? 'part' : 'messy');
  const beard = look.chin || CHINS[look.beard] || null;
  const wear = look.wear || WEARS[look.style] || null;
  return { hair, beard, wear, wearColour: look.wearColour || null };
}
export const piecesKey = pc => (pc ? `${pc.hair}/${pc.beard}/${pc.wear}/${pc.wearColour}` : '');

// ---------- where the heads are ----------
// Per frame: [x, y, skull width, angle] with (x, y) the top-centre of the skull on the sheet and
// angle the head's tilt (0 = upright). The drawn head is 37.5 px across on a 323 px figure.
const headCache = new Map();
export function headsOf(key, m, alpha, W, frames, refPx) {
  if (headCache.has(key)) return headCache.get(key);
  const out = {};
  for (const [name, f] of Object.entries(frames)) {
    const [sx, sy, w, h, , , s = 1] = f;
    const sk = 37.5 / 323 * refPx / s;
    let hx = 0, hy = 0, hn = 0;
    for (let y = sy; y < sy + h; y++) for (let x = sx; x < sx + w; x++) if (m[y * W + x] === 2) { hx += x; hy += y; hn++; }
    if (hn < 12) continue;
    hx /= hn; hy /= hn;
    // down the head: from the hair towards the face / neck skin close to it
    let cx = 0, cy = 0, cn = 0;
    const r = sk * 1.1;
    for (let y = Math.max(sy, Math.floor(hy - r)); y < Math.min(sy + h, hy + r); y++) {
      for (let x = Math.max(sx, Math.floor(hx - r)); x < Math.min(sx + w, hx + r); x++) {
        if (m[y * W + x] === 1 && (x - hx) ** 2 + (y - hy) ** 2 < r * r) { cx += x; cy += y; cn++; }
      }
    }
    let dx = 0, dy = 1;
    if (cn > 20) {
      dx = cx / cn - hx; dy = cy / cn - hy;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      // a head never hangs more than ~70 degrees from upright
      if (dy < 0.34) { const a = Math.sign(dx || 1) * 1.22; dx = Math.sin(a); dy = Math.cos(a); }
    }
    const opaque = (x, y) => {
      x = Math.round(x); y = Math.round(y);
      return x >= sx && x < sx + w && y >= sy && y < sy + h && alpha[(y * W + x) * 4 + 3] > 60;
    };
    // the top of the drawn hair, straight up the head from a point
    const top = (x, y) => {
      let t = 0, gap = 0;
      for (let k = 0; k < sk * 1.4; k++) {
        if (opaque(x - dx * k, y - dy * k)) { t = k; gap = 0; } else if (++gap > 2) break;
      }
      return t;
    };
    let t = top(hx, hy), tx = hx - dx * t, ty = hy - dy * t;
    // centre across the head, a little below its top (the widest part of the skull)
    const px = tx + dx * sk * 0.45, py = ty + dy * sk * 0.45;
    let a = 0, b = 0;
    while (a < sk * 0.75 && opaque(px + dy * (a + 1), py - dx * (a + 1))) a++;
    while (b < sk * 0.75 && opaque(px - dy * (b + 1), py + dx * (b + 1))) b++;
    const shift = (a - b) / 2;
    const mx = hx + dy * shift, my = hy - dx * shift;
    t = top(mx, my);
    // the drawn spikes stand above the skull
    out[name] = [mx - dx * t, my - dy * t, sk, Math.atan2(-dx, dy)];
  }
  headCache.set(key, out);
  return out;
}

// ---------- drawing ----------
const tinted = new Map(); // view|hex -> canvas
function tintedAtlas(view, hex, lref = 58) {
  const id = view + hex + lref;
  if (tinted.has(id)) return tinted.get(id);
  const img = atlases[view], c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return img;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const n = parseInt(hex.slice(1), 16), to = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const LREF = lref; // the pieces are drawn in #3a3a3a (the bald cap lighter, so it reads as skin)
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const ratio = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / LREF;
    for (let k = 0; k < 3; k++) p[i + k] = ratio <= 1 ? to[k] * ratio : to[k] + (255 - to[k]) * Math.min(0.85, (ratio - 1) * 0.5);
  }
  g.putImageData(d, 0, 0);
  tinted.set(id, c);
  while (tinted.size > 8) { const [k, old] = tinted.entries().next().value; tinted.delete(k); old.width = 0; old.height = 0; }
  return c;
}

// the pieces' shapes in one flat colour: a scalp a touch lighter than the skin (as the bald cap is)
function flatAtlas(view, hex) {
  const id = 'flat' + view + hex;
  if (tinted.has(id)) return tinted.get(id);
  const img = atlases[view], c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  if (!g) return img;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  const n = parseInt(hex.slice(1), 16), to = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * 0.05));
  g.fillStyle = `rgb(${to.join(',')})`;
  g.fillRect(0, 0, c.width, c.height);
  tinted.set(id, c);
  return c;
}

// Draw a player's pieces on every head of a sheet. view: 'front' (face to the camera) or 'back'.
export function dressSheet(g, pieces, heads, view, hairHex, skinHex) {
  if (!pieces || !hairReady(view)) return false;
  const hairAtlas = tintedAtlas(view, hairHex), wearAtlas = atlases[view];
  const list = [];
  if (pieces.hair && pieces.hair !== 'bald') {
    if (!(pieces.wear && pieces.wear !== 'shades')) list.push(['hair', pieces.hair, hairAtlas]);
  }
  // bald: a cap of scalp over the drawn hair
  // (a little big, to hide the drawn spikes; then a plain skin fill of its shape, lower down,
  // over the drawn fringe on the forehead)
  if (pieces.hair === 'bald' && !pieces.wear) {
    list.push(['hair', 'bald', tintedAtlas(view, skinHex, 112), -0.05, 1.14]);
    if (view === 'front') list.push(['hair', 'bald', flatAtlas(view, skinHex), 0.17, 0.82]);
  }
  if (pieces.beard && view === 'front') list.push(['beard', pieces.beard, hairAtlas]);
  // (headwear is drawn white; a coloured one is tinted like the hair, keeping its shading)
  if (pieces.wear) list.push(['wear', pieces.wear, pieces.wearColour ? tintedAtlas(view, pieces.wearColour, 215) : wearAtlas]);
  g.save();
  g.imageSmoothingQuality = 'high';
  const lift = view === 'back' ? 0.05 : 0.12; // the drawn spikes stand above the skull
  for (const [x0, y0, sk, ang] of Object.values(heads)) {
    const x = x0 - Math.sin(ang) * sk * lift, y = y0 + Math.cos(ang) * sk * lift;
    for (const [kind, name, src, down = 0, grow = 1] of list) {
      const a = HAIR_ATLAS[`${view}:${kind}:${name}`];
      if (!a) continue;
      const [ax, ay, aw, ah, ox, oy, hw] = a, k = sk / hw * grow;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.translate(x - Math.sin(ang) * sk * down, y + Math.cos(ang) * sk * down);
      g.rotate(ang);
      g.scale(k, k);
      g.drawImage(src, ax, ay, aw, ah, -ox, -oy, aw, ah);
    }
  }
  g.restore();
  return true;
}
