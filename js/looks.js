// What every player looks like: skin tone, hair colour and style, facial hair. Used to draw
// a comic face for each player in the menus, and to repaint the hand-drawn match sprites
// (skin and hair) so the man at the crease looks like himself.
import { PORTRAIT_LOOKS } from './portrait-looks.js';
import { INK } from './fx.js';
import { makeRng } from './rng.js';

export const SKIN = ['#f3cfb0', '#e8b48c', '#c98e63', '#a8714f', '#7f4f33', '#553322'];
export const HAIR = ['#17110d', '#3b2414', '#6e4524', '#d8b25a', '#a6451c', '#a7a7a7'];
export const STYLES = ['short', 'crop', 'swept', 'spiky', 'curly', 'long', 'afro', 'dreads', 'bald', 'patka'];
export const BEARDS = ['none', 'stubble', 'moustache', 'beard', 'goatee'];

// The squads' players, set by hand: "skin hair style beard" (indexes into SKIN, HAIR, BEARDS).
const APPEAR = {
  'thunder-0': '2 0 swept 1', 'thunder-1': '0 3 short 1', 'thunder-2': '3 0 spiky 0', 'thunder-3': '5 0 crop 3', 'thunder-4': '2 1 short 2',
  'thunder-5': '1 0 short 3', 'thunder-6': '0 2 short 1', 'thunder-7': '2 0 swept 0', 'thunder-8': '3 0 short 2', 'thunder-9': '1 0 long 3',
  'cyclones-0': '4 0 curly 2', 'cyclones-1': '1 1 swept 1', 'cyclones-2': '0 4 short 3', 'cyclones-3': '2 0 crop 3', 'cyclones-4': '0 2 long 0',
  'cyclones-5': '2 0 short 0', 'cyclones-6': '2 0 short 3', 'cyclones-7': '0 1 swept 1', 'cyclones-8': '2 0 patka 3', 'cyclones-9': '3 0 short 1',
  'vipers-0': '2 0 spiky 1', 'vipers-1': '1 0 short 3', 'vipers-2': '4 0 curly 2', 'vipers-3': '2 1 swept 0', 'vipers-4': '3 0 short 0',
  'vipers-5': '4 0 short 1', 'vipers-6': '3 0 crop 4', 'vipers-7': '2 0 long 3', 'vipers-8': '1 0 short 3', 'vipers-9': '1 1 crop 1',
  'eagles-0': '4 0 swept 2', 'eagles-1': '2 0 short 1', 'eagles-2': '0 2 short 0', 'eagles-3': '5 0 afro 4', 'eagles-4': '4 0 curly 0',
  'eagles-5': '5 0 crop 0', 'eagles-6': '1 0 swept 3', 'eagles-7': '3 0 short 2', 'eagles-8': '0 4 short 1', 'eagles-9': '2 0 short 3',
  'phoenix-0': '2 0 spiky 1', 'phoenix-1': '2 1 swept 1', 'phoenix-2': '1 0 short 3', 'phoenix-3': '5 0 dreads 3', 'phoenix-4': '3 0 short 0',
  'phoenix-5': '4 0 crop 1', 'phoenix-6': '0 3 swept 1', 'phoenix-7': '1 1 short 0', 'phoenix-8': '3 0 short 0', 'phoenix-9': '2 0 bald 3',
  'titans-0': '2 0 short 3', 'titans-1': '0 3 short 0', 'titans-2': '0 1 short 1', 'titans-3': '5 0 crop 1', 'titans-4': '4 0 crop 3',
  'titans-5': '2 0 short 2', 'titans-6': '0 2 bald 3', 'titans-7': '5 0 crop 4', 'titans-8': '1 0 swept 1', 'titans-9': '2 5 short 2',
  'storm-0': '3 0 swept 1', 'storm-1': '1 0 long 1', 'storm-2': '4 0 curly 0', 'storm-3': '3 0 short 2', 'storm-4': '3 0 spiky 1',
  'storm-5': '4 0 short 0', 'storm-6': '2 1 swept 0', 'storm-7': '2 0 short 3', 'storm-8': '1 0 swept 0', 'storm-9': '1 1 short 3',
  'royals-0': '0 4 swept 1', 'royals-1': '2 0 short 3', 'royals-2': '2 0 spiky 0', 'royals-3': '3 0 curly 1', 'royals-4': '2 0 short 2',
  'royals-5': '0 3 short 0', 'royals-6': '4 0 short 1', 'royals-7': '5 0 dreads 3', 'royals-8': '1 0 swept 1', 'royals-9': '2 5 short 3',
};
export const hasOwnLook = id => !!APPEAR[id];
const parse = s => { const [k, h, style, b] = s.split(' '); return { skin: +k, hair: +h, style, beard: BEARDS[+b] }; };

// Plausible looks for a nation's academy graduates (skin weights, then hair by skin tone).
const NATION_SKIN = {
  IN: [0, 0, 3, 4, 3, 0], PK: [0, 3, 4, 2, 0, 0], BD: [0, 0, 1, 4, 3, 0], LK: [0, 0, 1, 3, 4, 1], AF: [0, 3, 3, 1, 0, 0],
  EN: [6, 2, 1, 1, 1, 1], AU: [6, 2, 1, 1, 1, 0], NZ: [5, 2, 1, 2, 1, 0], ZA: [3, 1, 1, 1, 2, 4], WI: [0, 0, 1, 2, 3, 5],
  IE: [8, 1, 0, 0, 0, 0], ZW: [1, 0, 0, 0, 2, 6],
};
function weighted(rng, ws) { let r = rng.next() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < ws.length; i++) if ((r -= ws[i]) <= 0) return i; return 0; }
export function randomLook(nation, rng) {
  const skin = weighted(rng, NATION_SKIN[nation] || NATION_SKIN.IN);
  const hair = skin <= 1 ? weighted(rng, [2, 3, 3, 2, 1, 0]) : weighted(rng, [6, 2, 1, 0, 0, 0]);
  // academy teenagers don't go bald
  const style = skin >= 4 ? rng.pick(['crop', 'crop', 'short', 'curly', 'afro', 'dreads']) : rng.pick(['short', 'short', 'swept', 'spiky', 'crop', 'curly', 'long']);
  const beard = weighted(rng, [5, 3, 1, 2, 1]);
  return { skin, hair, style, beard: BEARDS[beard] };
}
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// A player's appearance: his own (career youngsters), the squads' table, a hero's look, or
// one made up from his nation and id (always the same for the same player).
export function lookOf(p) {
  if (!p) return null;
  // a player with a painted portrait has its skin tone and hair colour on the pitch too
  const painted = PORTRAIT_LOOKS[portraitKey(p.name || '')];
  const base = baseLook(p);
  return painted ? { ...base, skin: painted.skin, hair: painted.hair } : base;
}
const portraitKey = name => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function baseLook(p) {
  if (p.app) return p.app;
  if (APPEAR[p.id]) return parse(APPEAR[p.id]);
  const hero = p.hero && typeof p.hero === 'object' ? p.hero : null;
  if (hero?.look) return { skin: hero.look.skin, hair: hero.look.hair, style: 'short', beard: 'none' };
  return randomLook(p.nation || 'IN', makeRng(hashStr(p.id || p.name || 'x')));
}
export const skinHex = l => (typeof l.skin === 'string' ? l.skin : SKIN[l.skin] || SKIN[2]);
export const hairHex = (l, age = 0) => (age >= 35 ? HAIR[5] : typeof l.hair === 'string' ? l.hair : HAIR[l.hair] ?? HAIR[0]);

// ---------- colour helpers ----------
export function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
export const hexHsv = hex => { const n = parseInt(hex.slice(1), 16); return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255); };
export function rgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `rgb(${c.join(',')})`;
};

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const hexRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// ---------- repainting the match sprites ----------
// The drawn players all have the same light-tan skin and dark-brown hair. Skin is a narrow
// orange-tan band and hair the same hue, darker. Kits can share that colour at their edges
// (the orange Phoenix kit, shading on pads and shoes), so the masks are cleaned up by shape:
// thin edges are opened away, tiny specks dropped, and the bat (a brighter, yellower patch)
// left alone. The masks depend only on the sheet, so they're worked out once per sheet.
const REF_SKIN = [28, 0.55, 0.95], REF_HAIR = [25, 0.5, 0.32];
const cache = new Map(); // key -> canvas, newest last
const masks = new Map(); // sheet key -> Uint8Array (1 skin, 2 hair)

// 3x3 erode (grow = false) or dilate (grow = true), done as a row pass then a column pass
function morph(m, w, h, grow) {
  const t = new Uint8Array(m.length), out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    const r = y * w;
    for (let x = 0; x < w; x++) {
      const a = x > 0 ? m[r + x - 1] : 0, b = m[r + x], c = x < w - 1 ? m[r + x + 1] : 0;
      t[r + x] = grow ? a | b | c : a & b & c;
    }
  }
  for (let y = 0; y < h; y++) {
    const r = y * w;
    for (let x = 0; x < w; x++) {
      const a = y > 0 ? t[r - w + x] : 0, b = t[r + x], c = y < h - 1 ? t[r + w + x] : 0;
      out[r + x] = grow ? a | b | c : a & b & c;
    }
  }
  return out;
}
function open(m, w, h, n) { let r = m; for (let i = 0; i < n; i++) r = morph(r, w, h, false); for (let i = 0; i < n; i++) r = morph(r, w, h, true); return r; }
// keep the connected patches that pass keep(area, meanHue, meanV, share of pixels marked in B)
function filterParts(m, w, h, H, V, keep, B = null) {
  const seen = new Uint8Array(m.length), out = new Uint8Array(m.length), stack = [], pix = [];
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || seen[i]) continue;
    pix.length = 0; let sh = 0, sv = 0, sb = 0;
    stack.push(i); seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(); pix.push(j); sh += H[j]; sv += V[j]; if (B) sb += B[j];
      const x = j % w;
      if (x > 0 && m[j - 1] && !seen[j - 1]) { seen[j - 1] = 1; stack.push(j - 1); }
      if (x < w - 1 && m[j + 1] && !seen[j + 1]) { seen[j + 1] = 1; stack.push(j + 1); }
      if (j >= w && m[j - w] && !seen[j - w]) { seen[j - w] = 1; stack.push(j - w); }
      if (j + w < m.length && m[j + w] && !seen[j + w]) { seen[j + w] = 1; stack.push(j + w); }
    }
    if (keep(pix.length, sh / pix.length, sv / pix.length, sb / pix.length)) for (const j of pix) out[j] = 1;
  }
  return out;
}
// the connected patches of m smaller than maxArea that touch the mask near
function smallTouching(m, near, w, h, maxArea) {
  const n = m.length, seen = new Uint8Array(n), out = new Uint8Array(n), stack = [], pix = [];
  for (let i = 0; i < n; i++) {
    if (!m[i] || seen[i]) continue;
    pix.length = 0; let touches = false;
    stack.push(i); seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(); pix.push(j); if (near[j]) touches = true;
      const x = j % w;
      if (x > 0 && m[j - 1] && !seen[j - 1]) { seen[j - 1] = 1; stack.push(j - 1); }
      if (x < w - 1 && m[j + 1] && !seen[j + 1]) { seen[j + 1] = 1; stack.push(j + 1); }
      if (j >= w && m[j - w] && !seen[j - w]) { seen[j - w] = 1; stack.push(j - w); }
      if (j + w < n && m[j + w] && !seen[j + w]) { seen[j + w] = 1; stack.push(j + w); }
    }
    if (touches && pix.length < maxArea) for (const j of pix) out[j] = 1;
  }
  return out;
}
// set the small gaps in m (patches under maxArea that touch nothing but m) to 1
function fillHoles(m, w, h, maxArea) {
  const n = m.length, seen = new Uint8Array(n), stack = [], pix = [];
  for (let i = 0; i < n; i++) {
    if (m[i] || seen[i]) continue;
    pix.length = 0; let open = false;
    stack.push(i); seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(); pix.push(j);
      const x = j % w;
      if (x === 0 || x === w - 1 || j < w || j >= n - w) { open = true; continue; }
      for (const k of [j - 1, j + 1, j - w, j + w]) if (!m[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
    }
    if (!open && pix.length < maxArea) for (const j of pix) m[j] = 1;
  }
}
// The skin patches of m that sit on a bat blade, removed. Each patch is matched with the wood-toned
// region around it (skin and bat share those colours; outlines and gloves cut them apart), and a
// region long and thin like a blade (length x stretch >= 105 px) is the bat: arms come to <= 97.
function dropBlades(m, p, w, h, H, S, V) {
  const n = m.length, woody = new Uint8Array(n);
  for (let q = 0; q < n; q++) woody[q] = p[q * 4 + 3] > 70 && H[q] >= 8 && H[q] <= 46 && S[q] > 0.2 && V[q] > 0.45 ? 1 : 0;
  const label = (mask) => {
    const lab = new Int32Array(n), stack = [];
    let id = 0;
    for (let i = 0; i < n; i++) {
      if (!mask[i] || lab[i]) continue;
      id++; lab[i] = id; stack.push(i);
      while (stack.length) {
        const j = stack.pop(), x = j % w;
        if (x > 0 && mask[j - 1] && !lab[j - 1]) { lab[j - 1] = id; stack.push(j - 1); }
        if (x < w - 1 && mask[j + 1] && !lab[j + 1]) { lab[j + 1] = id; stack.push(j + 1); }
        if (j >= w && mask[j - w] && !lab[j - w]) { lab[j - w] = id; stack.push(j - w); }
        if (j + w < n && mask[j + w] && !lab[j + w]) { lab[j + w] = id; stack.push(j + w); }
      }
    }
    return { lab, count: id };
  };
  const W = label(woody);
  // shape of each wood region: length (4 sd along its long axis) times how stretched it is
  const k = W.count + 1, a = new Float64Array(k), sx = new Float64Array(k), sy = new Float64Array(k), sxx = new Float64Array(k), syy = new Float64Array(k), sxy = new Float64Array(k);
  for (let q = 0; q < n; q++) { const i = W.lab[q]; if (!i) continue; const x = q % w, y = (q / w) | 0; a[i]++; sx[i] += x; sy[i] += y; sxx[i] += x * x; syy[i] += y * y; sxy[i] += x * y; }
  const blade = new Uint8Array(k);
  for (let i = 1; i < k; i++) {
    if (a[i] < 150) continue;
    const mx = sx[i] / a[i], my = sy[i] / a[i], cxx = sxx[i] / a[i] - mx * mx, cyy = syy[i] / a[i] - my * my, cxy = sxy[i] / a[i] - mx * my;
    const tr = cxx + cyy, d = Math.sqrt(Math.max(0, tr * tr / 4 - (cxx * cyy - cxy * cxy)));
    const big = tr / 2 + d, small = Math.max(1e-3, tr / 2 - d);
    if (4 * Math.sqrt(big) * Math.sqrt(big / small) >= 105) blade[i] = 1;
  }
  // a skin patch goes with the wood region it mostly lies in
  const P = label(m), votes = new Map();
  for (let q = 0; q < n; q++) {
    const i = P.lab[q]; if (!i) continue;
    const key = i * k + W.lab[q]; votes.set(key, (votes.get(key) || 0) + 1);
  }
  const best = new Int32Array(P.count + 1), bestN = new Int32Array(P.count + 1);
  for (const [key, c] of votes) { const i = Math.floor(key / k), j = key % k; if (j && c > bestN[i]) { bestN[i] = c; best[i] = j; } }
  // ...but a forearm laid along the handle (the defensive stance) fills a long wood region of its
  // own: it's the bat only if the patch is a small part of the wood, or is itself blade-thin
  const pk = P.count + 1, pa = new Float64Array(pk), px = new Float64Array(pk), py = new Float64Array(pk), pxx = new Float64Array(pk), pyy = new Float64Array(pk), pxy = new Float64Array(pk);
  for (let q = 0; q < n; q++) { const i = P.lab[q]; if (!i) continue; const x = q % w, y = (q / w) | 0; pa[i]++; px[i] += x; py[i] += y; pxx[i] += x * x; pyy[i] += y * y; pxy[i] += x * y; }
  const isBat = new Uint8Array(pk);
  for (let i = 1; i < pk; i++) {
    if (!blade[best[i]]) continue;
    const mx = px[i] / pa[i], my = py[i] / pa[i], cxx = pxx[i] / pa[i] - mx * mx, cyy = pyy[i] / pa[i] - my * my, cxy = pxy[i] / pa[i] - mx * my;
    const tr = cxx + cyy, d = Math.sqrt(Math.max(0, tr * tr / 4 - (cxx * cyy - cxy * cxy)));
    const stretch = Math.sqrt((tr / 2 + d) / Math.max(1e-3, tr / 2 - d));
    if (bestN[i] / a[best[i]] < 0.6 || stretch >= 2.5) isBat[i] = 1;
  }
  const out = new Uint8Array(n);
  for (let q = 0; q < n; q++) { const i = P.lab[q]; if (i && !isBat[i]) out[q] = 1; }
  return out;
}
// 1 where a pixel lies in the top `share` of its figure (each separate drawing on the sheet)
function upperBody(p, w, h, share) {
  const n = w * h, seen = new Int32Array(n).fill(-1), out = new Uint8Array(n), stack = [], pix = [];
  for (let i = 0; i < n; i++) {
    if (p[i * 4 + 3] < 70 || seen[i] >= 0) continue;
    pix.length = 0; let top = h, bot = 0;
    stack.push(i); seen[i] = i;
    while (stack.length) {
      const j = stack.pop(); pix.push(j);
      const y = (j / w) | 0, x = j - y * w;
      if (y < top) top = y; if (y > bot) bot = y;
      // 2-pixel reach, so a figure split by a thin gap stays one figure
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
        const k = yy * w + xx;
        if (seen[k] < 0 && p[k * 4 + 3] >= 70) { seen[k] = i; stack.push(k); }
      }
    }
    const lim = top + (bot - top) * share;
    for (const j of pix) if ((j / w | 0) <= lim) out[j] = 1;
  }
  return out;
}
function sheetMasks(key, p, w, h) {
  if (masks.has(key)) return masks.get(key);
  const n = w * h, skin = new Uint8Array(n), hair = new Uint8Array(n), H = new Float32Array(n), V = new Float32Array(n);
  // where a skin or hair area may spread to: the same family of colours, stopped by the ink outlines
  const looseSkin = new Uint8Array(n), looseHair = new Uint8Array(n), warmSkin = new Uint8Array(n), ink = new Uint8Array(n);
  let orangeKit = 0, opaque = 0;
  const hasBat = /^bat/.test(key) || key === 'nonstriker'; // only the batting sheets have a bat to protect
  const darkWarm = new Uint8Array(n), darkBrown = new Uint8Array(n), sat = new Float32Array(n);
  let bat = new Uint8Array(n);
  for (let i = 0, q = 0; q < n; i += 4, q++) {
    if (p[i + 3] < 70) continue;
    // hue, saturation, value inline (no allocation: this runs over a million pixels)
    const r = p[i], g = p[i + 1], b = p[i + 2], mx = r > g ? (r > b ? r : b) : (g > b ? g : b), mn = r < g ? (r < b ? r : b) : (g < b ? g : b), d = mx - mn;
    if (mx < 64) ink[q] = 1; // the black outlines
    // skin is outlined and shaded with dark red-brown strokes, not pure black
    if (d && mx < 105 && d / mx > 0.45) { const h0 = ((mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360; if (h0 <= 45 || h0 >= 340) darkWarm[q] = 1; }
    if (d && mx >= 8 && mx < 80 && d / mx > 0.4) { const h0 = ((mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360; if (h0 <= 40 || h0 >= 345) darkBrown[q] = 1; } // dark brown and reddish-black hair
    if (!d || mx < 30) continue;
    const s = d / mx, v = mx / 255;
    let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh = (hh * 60 + 360) % 360;
    if (hh > 50) continue;
    H[q] = hh; V[q] = v; sat[q] = s;
    // skin's highlights and deep shadows: warm, not white, not a vivid kit orange, not the bright bat
    // bat wood is hue 33-45; a yellow kit (the Eagles, hue 50+) is not the bat
    const batWood = hasBat && hh > 33 && hh < 45 && v > 0.9 && s > 0.45;
    if (batWood) bat[q] = 1;
    if (hh <= 48 && s >= 0.12 && v >= 0.24 && !(s > 0.85 && v > 0.6) && !batWood) looseSkin[q] = 1;
    // some sheets shade skin with vivid orange (the Phoenix one): allowed, but only inside the outlines
    if (hh >= 8 && hh <= 40 && s >= 0.12 && v >= 0.24 && !batWood) warmSkin[q] = 1; // not red kit trim
    if (hh >= 12 && hh <= 34 && s > 0.8 && v > 0.55) orangeKit++;
    opaque++;
    if (hh <= 50 && s >= 0.1 && v >= 0.08 && v < 0.62) looseHair[q] = 1;
    if (hh >= 10 && hh < 35 && s >= 0.28 && s <= 0.8 && v >= 0.5) skin[q] = 1;
    else if (hh >= 8 && hh < 45 && s >= 0.25 && v >= 0.12 && v < 0.5) hair[q] = 1;
  }
  // solid patches only, then grow back one pixel into the original mask to keep clean edges
  const fix = (raw, keep) => {
    const core = filterParts(open(raw, w, h, 2), w, h, H, V, keep, bat);
    const grown = morph(core, w, h, true);
    for (let q = 0; q < n; q++) grown[q] &= raw[q];
    return grown;
  };
  // the bat is yellower and brighter than skin (only the batting sheets have one). A patch is the bat
  // when most of it is bat-wood coloured, not just when it's bright on average: a sunlit forearm is too
  const notBat = (hue, v, batShare = 0) => !(hasBat && hue > 30.5 && v > 0.92 && batShare > 0.3);
  const orangeSheet = orangeKit > opaque * 0.08;
  // the front views, where faces and throats show (other sheets have gold kit trim close to skin)
  const facing = key === 'front' || key === 'spin-front' || key === 'batfront';
  let sk;
  if (key !== 'batfront') sk = fix(skin, (area, hue, v, b) => area >= 30 && notBat(hue, v, b));
  else {
    // the front-view batter's face is cut into small pieces by the helmet grille, so small
    // pieces count here. Keep clear of the bat (its brown edge is skin-coloured), and keep small pieces only where
    // they sit among others (the grille-cut face), not a lone speck on a pad
    if (hasBat) {
      let near = bat;
      for (let k = 0; k < 4; k++) near = morph(near, w, h, true);
      for (let q = 0; q < n; q++) if (near[q]) skin[q] = 0;
    }
    const pieces = filterParts(skin, w, h, H, V, (area, hue, v, b) => area >= 6 && notBat(hue, v, b), bat);
    let group = pieces;
    for (let k = 0; k < 3; k++) group = morph(group, w, h, true);
    const keepGroup = filterParts(group, w, h, H, V, area => area >= 180);
    sk = new Uint8Array(n);
    for (let q = 0; q < n; q++) sk[q] = pieces[q] & keepGroup[q];
  }
  if (key === 'field-front') {
    // seen from above, the face is a few pixels of skin in the hat brim's shadow, broken up by the
    // shading: small pieces count when they sit together
    const pieces = filterParts(skin, w, h, H, V, area => area >= 3);
    let group = pieces;
    for (let k = 0; k < 2; k++) group = morph(group, w, h, true);
    const keepGroup = filterParts(group, w, h, H, V, area => area >= 40);
    const head = upperBody(p, w, h, 0.32); // not the bat or the trim lower down
    for (let q = 0; q < n; q++) sk[q] |= pieces[q] & keepGroup[q] & head[q];
  }
  // the front-view batter's hair is all under his helmet: shadows on his face are not hair
  let hr = key === 'batfront' ? new Uint8Array(n) : fix(hair, area => area >= 40);
  // the non-striker's hair is under his helmet: only the beard shows, on his face, not the arms
  if (key === 'nonstriker') { const head = upperBody(p, w, h, 0.22); for (let q = 0; q < n; q++) hr[q] &= head[q]; }
  // spread each area over its own shading until the outlines stop it, so the whole arm or face is repainted
  const spread = (core, loose, other, steps) => {
    let m = core;
    for (let k = 0; k < steps; k++) {
      const g2 = morph(m, w, h, true);
      let changed = 0;
      for (let q = 0; q < n; q++) { const v = g2[q] & loose[q] & (other[q] ^ 1) | m[q]; if (v !== m[q]) changed++; g2[q] = v; }
      m = g2;
      if (!changed) break;
    }
    return m;
  };
  // small patches of skin boxed in by lines next to the hair (ears, the nape, a bit of forehead)
  // are too thin to survive the clean-up above: skin-coloured pixels right beside the hair are skin
  // (the hair zone includes very dark brown hair, too dark to count as hair, except on an orange kit,
  // whose shading is dark brown too)
  let byHair = hr.slice();
  if (!orangeSheet) for (let q = 0; q < n; q++) if (darkBrown[q]) byHair[q] = 1;
  byHair = open(byHair, w, h, 2); // solid dark areas only, not the thin warm strokes along arms
  for (let k = 0; k < 10; k++) byHair = morph(byHair, w, h, true); // a turned head's cheek sits a few pixels below
  // only on the upper part of each figure: dark studs on the shoes can pass for hair too
  const upper = upperBody(p, w, h, 0.42);
  for (let q = 0; q < n; q++) if (byHair[q] && upper[q] && skin[q] && !hr[q] && !bat[q]) sk[q] = 1;
  let careful = spread(sk, looseSkin, hr, 8);
  // fingertips and knuckles the fill didn't reach: small skin-toned pieces touching the skin
  // (kit trim can be the same colours, but comes in long strips, and yellower)
  if (!orangeSheet) {
    const rest = new Uint8Array(n);
    let batZone = bat;
    for (let k = 0; k < 4; k++) batZone = morph(batZone, w, h, true); // not the bat handle either
    for (let q = 0; q < n; q++) rest[q] = looseSkin[q] & (careful[q] ^ 1) & (hr[q] ^ 1) & (batZone[q] ^ 1);
    const tips = smallTouching(rest, morph(careful, w, h, true), w, h, 450);
    // and almost none of it yellower (trim, bat) or redder (bat stickers) than skin
    const offTone = new Uint8Array(n);
    for (let q = 0; q < n; q++) if (tips[q] && V[q] > 0.3 && sat[q] > 0.3 && (H[q] > 31 || (H[q] < 8 && V[q] > 0.6))) offTone[q] = 1;
    const ok = filterParts(tips, w, h, H, V, (area, hue, v, off) => hue <= 28 && (area <= 120 || off <= 0.12), offTone);
    for (let q = 0; q < n; q++) careful[q] |= ok[q];
  }
  // vivid orange shading on the skin (the Phoenix sheet): small orange patches touching the skin
  // are part of it; big ones are the shirt and trousers
  // (reaching across a thin outline: the throat in the collar is cut off from the face by the chin line)
  let touch = careful;
  for (let k = 0; k < (facing && !orangeSheet ? 4 : 1); k++) touch = morph(touch, w, h, true);
  const vivid = new Uint8Array(n);
  for (let q = 0; q < n; q++) vivid[q] = warmSkin[q] & (looseSkin[q] ^ 1) & (careful[q] ^ 1);
  // on a sheet whose kit is orange, only small patches can be skin; elsewhere orange is always skin shading
  const patches = smallTouching(vivid, touch, w, h, orangeSheet ? 350 : 6000);
  let skinAll = new Uint8Array(n);
  for (let q = 0; q < n; q++) skinAll[q] = careful[q] | patches[q];
  // warm pixels mostly surrounded by skin (fingertips drawn over the orange trousers) are skin too
  for (let k = 0; k < 3; k++) {
    const next = skinAll.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const q = y * w + x;
      if (skinAll[q] || !warmSkin[q]) continue;
      let sk2 = 0, in2 = 0, other = 0;
      for (const j of [q - w - 1, q - w, q - w + 1, q - 1, q + 1, q + w - 1, q + w, q + w + 1]) {
        if (skinAll[j]) sk2++; else if (ink[j]) in2++; else if (warmSkin[j]) other++;
      }
      // hemmed in by skin and outline (a finger), not part of a big orange area (the trousers)
      if (sk2 >= 1 && other <= 3 && sk2 + in2 >= 4) next[q] = 1;
    }
    skinAll = next;
  }
  // bright highlights inside an arm or face (small gaps with skin all round them) are skin too
  fillHoles(skinAll, w, h, 150);
  // the dark red-brown strokes on and around the skin take the new tone too (kept dark)
  const ring = morph(morph(skinAll, w, h, true), w, h, true);
  for (let q = 0; q < n; q++) if (ring[q] && darkWarm[q] && !hr[q]) skinAll[q] = 1;
  // patches lying on the bat (its shaded edge, its stickers) are not skin, however they got in.
  // Told apart by shape: the bat is one long straight piece of wood, an arm is short. (Counting
  // bat-coloured pixels doesn't work: lit skin, the Eagles' especially, is speckled with them.)
  if (hasBat && key !== 'batfront') skinAll = dropBlades(skinAll, p, w, h, H, sat, V);
  else if (hasBat) {
    // (the front-view batter: his arms and face join up with the bat's colours, so the old rule)
    let nearBat = bat;
    for (let k = 0; k < 2; k++) nearBat = morph(nearBat, w, h, true);
    skinAll = filterParts(skinAll, w, h, H, V, (area, hue, v, b) => b <= 0.3, nearBat);
  }
  const hairAll = spread(hr, looseHair, skinAll, 5);
  const m = new Uint8Array(n);
  for (let q = 0; q < n; q++) m[q] = skinAll[q] ? 1 : hairAll[q] ? 2 : 0;
  masks.set(key, m);
  while (masks.size > 10) masks.delete(masks.keys().next().value);
  return m;
}

// The masks are worked out ahead of time (tools/build_people_masks.mjs) and shipped as
// img/mask-<sheet>.png (red = skin, green = hair), so a phone never has to compute them.
// If a mask file can't load, it's computed here as a fallback.
const pre = new Map(); // mask name -> { img, ready, failed }
export function loadPeopleMask(name) {
  if (pre.has(name)) return pre.get(name).done;
  const P = { img: new Image(), ready: false, failed: false };
  P.done = new Promise(res => {
    P.img.onload = () => { P.ready = true; res(); };
    P.img.onerror = () => { P.failed = true; res(); };
  });
  P.img.src = `img/mask-${name}.png`;
  pre.set(name, P);
  return P.done;
}
// every skin map asked for so far has arrived (or failed), or ms have passed
export function masksReady(ms = 4000) {
  return Promise.race([Promise.all([...pre.values()].map(P => P.done)), new Promise(r => setTimeout(r, ms))]);
}
function pixelsOf(src) {
  const w = src?.naturalWidth || src?.width, h = src?.naturalHeight || src?.height;
  if (!w || !h) return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  try { g.drawImage(src, 0, 0); } catch { return null; }
  const d = g.getImageData(0, 0, w, h).data;
  c.width = 0; c.height = 0;
  return { d, w, h };
}
// the mask for a sheet: shipped, still loading (null: draw the sheet as drawn for now), or computed
function getMask(name, src) {
  if (masks.has(name)) return masks.get(name);
  const P = pre.get(name);
  if (P && !P.ready && !P.failed) return null;
  if (P?.ready) {
    const px = pixelsOf(P.img);
    if (px) {
      const m = new Uint8Array(px.w * px.h);
      for (let q = 0; q < m.length; q++) m[q] = px.d[q * 4] > 127 ? 1 : px.d[q * 4 + 1] > 127 ? 2 : 0;
      masks.set(name, m);
      return m;
    }
  }
  const px = pixelsOf(src);
  return px ? sheetMasks(name, px.d, px.w, px.h) : null;
}
// for the build tool: a sheet's mask as an image (red skin, green hair)
export function maskCanvas(src, name) {
  const px = pixelsOf(src);
  const m = sheetMasks(name, px.d, px.w, px.h);
  const c = document.createElement('canvas');
  c.width = px.w; c.height = px.h;
  const g = c.getContext('2d'), img = g.createImageData(px.w, px.h);
  for (let q = 0; q < m.length; q++) { img.data[q * 4] = m[q] === 1 ? 255 : 0; img.data[q * 4 + 1] = m[q] === 2 ? 255 : 0; img.data[q * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}

// src: the sheet to draw (maybe already repainted in a team's kit); key: its cache name;
// maskName / maskSrc: which mask, and the plain sheet to compute it from if it isn't shipped
export function peopleSheet(src, key, look, maskName = key, maskSrc = src) {
  if (!look) return src;
  const sk = skinHex(look), hr = hairHex(look);
  const id = `${key}|${sk}|${hr}`;
  if (cache.has(id)) { const c = cache.get(id); cache.delete(id); cache.set(id, c); return c; }
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
  if (!w || !h) return src;
  const m = getMask(maskName, maskSrc);
  if (!m) return src;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return src;
  try { g.drawImage(src, 0, 0); } catch { return src; }
  const img = g.getImageData(0, 0, w, h), p = img.data;
  // repaint by brightness: each pixel keeps how light or dark it was relative to the drawn skin
  // (or hair), so the shading survives and the new tone is smooth
  const T = [hexRgb(sk), hexRgb(hr)], LREF = [lum(...rgb(...REF_SKIN)), lum(...rgb(...REF_HAIR))];
  for (let i = 0, q = 0; i < p.length; i += 4, q++) {
    if (!m[q]) continue;
    const t = T[m[q] - 1], ratio = lum(p[i], p[i + 1], p[i + 2]) / LREF[m[q] - 1];
    for (let k = 0; k < 3; k++) {
      p[i + k] = ratio <= 1 ? t[k] * ratio : t[k] + (255 - t[k]) * Math.min(0.85, (ratio - 1) * 1.1);
    }
  }
  g.putImageData(img, 0, 0);
  cache.set(id, c);
  // keep only a handful (the batter and bowler on screen): free the rest at once on iPhones
  while (cache.size > 6) { const [k, old] = cache.entries().next().value; cache.delete(k); old.width = 0; old.height = 0; }
  return c;
}

// One pose of a sheet repainted with a player's skin and hair, as a small canvas of its own:
// for scenes with many players at once (the top-down field), where repainting whole sheets per
// player would use too much memory. rect: [x, y, w, h] on the sheet.
const frameCache = new Map();
export function peopleFrame(src, key, look, rect, maskName, maskSrc = src) {
  if (!look) return null;
  const sk = skinHex(look), hr = hairHex(look);
  const [x0, y0, w, h] = rect;
  const id = `${key}|${x0},${y0}|${sk}|${hr}`;
  if (frameCache.has(id)) { const c = frameCache.get(id); frameCache.delete(id); frameCache.set(id, c); return c; }
  const W = maskSrc.naturalWidth || maskSrc.width;
  const m = getMask(maskName, maskSrc);
  if (!m || !W) return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  try { g.drawImage(src, x0, y0, w, h, 0, 0, w, h); } catch { return null; }
  const img = g.getImageData(0, 0, w, h), p = img.data;
  const T = [hexRgb(sk), hexRgb(hr)], LREF = [lum(...rgb(...REF_SKIN)), lum(...rgb(...REF_HAIR))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = m[(y0 + y) * W + x0 + x];
    if (!v) continue;
    const i = (y * w + x) * 4, t = T[v - 1], ratio = lum(p[i], p[i + 1], p[i + 2]) / LREF[v - 1];
    for (let k = 0; k < 3; k++) p[i + k] = ratio <= 1 ? t[k] * ratio : t[k] + (255 - t[k]) * Math.min(0.85, (ratio - 1) * 1.1);
  }
  g.putImageData(img, 0, 0);
  frameCache.set(id, c);
  while (frameCache.size > 160) { const [k, old] = frameCache.entries().next().value; frameCache.delete(k); old.width = 0; old.height = 0; }
  return c;
}

// ---------- comic faces ----------
const faces = new Map();
// A head-and-shoulders portrait in the player's kit. kit: { suit, trim }.
// bare: no rounded backdrop (the face sits straight on a player card)
export function faceCanvas(p, kit, size = 64, bare = false) {
  const look = lookOf(p);
  const age = p.age || 26;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const key = `${p.id}|${kit?.suit}|${size}|${age >= 35}|${bare}|${JSON.stringify(look)}`;
  if (faces.has(key)) return faces.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  const g = c.getContext('2d');
  g.scale(dpr * size / 100, dpr * size / 100);
  drawFace(g, look, kit || { suit: '#f3efe2', trim: '#3a3a4a' }, age, bare);
  faces.set(key, c);
  if (faces.size > 300) faces.delete(faces.keys().next().value);
  return c;
}
// A fresh canvas element showing a face (a canvas can only sit in the page once).
export function faceEl(p, kit, size = 64, cls = 'face', bare = false) {
  const src = faceCanvas(p, kit, size, bare);
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height; c.className = cls;
  c.style.width = c.style.height = `${size}px`;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function drawFace(g, look, kit, age, bare = false) {
  const skin = skinHex(look), hair = hairHex(look, age), dark = shade(skin, -0.22);
  const lw = 3.2;
  g.lineJoin = 'round'; g.lineCap = 'round';
  // backdrop in the kit colour
  const bg = g.createLinearGradient(0, 0, 0, 100);
  bg.addColorStop(0, shade(kit.suit, 0.35)); bg.addColorStop(1, shade(kit.suit, -0.25));
  if (!bare) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, 100, 100, 16); g.fill(); }
  const ink = (fill) => { if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); };
  const style = look.style || 'short';
  // hair that sits behind the head
  if (style === 'afro') { g.beginPath(); g.ellipse(50, 36, 31, 27, 0, 0, Math.PI * 2); ink(hair); }
  if (style === 'long') { g.beginPath(); g.roundRect(26, 30, 48, 46, 12); ink(hair); }
  if (style === 'dreads') {
    g.strokeStyle = INK; g.lineWidth = 9;
    for (const x of [27, 33, 67, 73]) { g.beginPath(); g.moveTo(x, 34); g.lineTo(x + (x < 50 ? -2 : 2), 82); g.stroke(); }
    g.strokeStyle = hair; g.lineWidth = 6;
    for (const x of [27, 33, 67, 73]) { g.beginPath(); g.moveTo(x, 34); g.lineTo(x + (x < 50 ? -2 : 2), 82); g.stroke(); }
  }
  // shoulders and shirt
  g.beginPath(); g.moveTo(4, 102); g.quadraticCurveTo(8, 80, 30, 77); g.lineTo(70, 77); g.quadraticCurveTo(92, 80, 96, 102); g.closePath(); ink(kit.suit);
  g.beginPath(); g.moveTo(37, 77); g.lineTo(50, 92); g.lineTo(63, 77); g.closePath(); ink(kit.trim);
  // neck, ears, head
  g.beginPath(); g.roundRect(41, 58, 18, 24, 4); ink(dark);
  for (const x of [29, 71]) { g.beginPath(); g.ellipse(x, 50, 5.5, 7.5, 0, 0, Math.PI * 2); ink(skin); }
  g.beginPath(); g.ellipse(50, 47, 21, 25, 0, 0, Math.PI * 2); ink(skin);
  // facial hair (under the features)
  const beard = look.beard || 'none';
  if (beard === 'stubble' || beard === 'beard') {
    g.save(); g.beginPath(); g.ellipse(50, 47, 21, 25, 0, 0, Math.PI * 2); g.clip();
    g.globalAlpha = beard === 'stubble' ? 0.28 : 1;
    g.fillStyle = hair;
    g.beginPath(); g.moveTo(28, 50); g.quadraticCurveTo(31, 62, 37, 60); g.quadraticCurveTo(50, 66, 63, 60); g.quadraticCurveTo(69, 62, 72, 50); g.lineTo(74, 80); g.lineTo(26, 80); g.closePath(); g.fill();
    g.restore();
    if (beard === 'beard') { g.beginPath(); g.ellipse(50, 47, 21, 25, 0, 0.15, Math.PI - 0.15); g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); }
  }
  if (beard === 'goatee') { g.beginPath(); g.ellipse(50, 68, 6.5, 5, 0, 0, Math.PI * 2); ink(hair); }
  // eyes, brows, nose, mouth
  for (const x of [42, 58]) {
    g.beginPath(); g.ellipse(x, 47, 4.2, 3.2, 0, 0, Math.PI * 2); ink('#fffdf6');
    g.fillStyle = INK; g.beginPath(); g.arc(x + 0.6, 47.4, 1.9, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = hair; g.lineWidth = 3.6;
  g.beginPath(); g.moveTo(37, 40.5); g.quadraticCurveTo(42, 38, 46.5, 40); g.stroke();
  g.beginPath(); g.moveTo(53.5, 40); g.quadraticCurveTo(58, 38, 63, 40.5); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.moveTo(50, 50); g.lineTo(47.5, 57); g.lineTo(51.5, 57.5); g.stroke();
  if (beard === 'moustache' || beard === 'beard' || beard === 'goatee') {
    g.beginPath(); g.moveTo(41, 62); g.quadraticCurveTo(50, 56, 59, 62); g.quadraticCurveTo(50, 60.5, 41, 62); ink(hair);
  }
  g.strokeStyle = INK; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(44, 64); g.quadraticCurveTo(50, 68, 56, 64); g.stroke();
  // hair on top
  const cap = (yCut, fill) => {
    g.save(); g.beginPath(); g.rect(0, 0, 100, yCut); g.clip();
    g.beginPath(); g.ellipse(50, 44, 23, 26, 0, 0, Math.PI * 2); ink(fill);
    g.restore();
    g.beginPath(); g.moveTo(27.5, yCut); g.lineTo(72.5, yCut); g.strokeStyle = INK; g.lineWidth = lw; g.stroke();
  };
  if (style === 'short' || style === 'swept' || style === 'long' || style === 'spiky' || style === 'dreads') cap(31, hair);
  if (style === 'crop') cap(28, hair);
  if (style === 'swept') { g.beginPath(); g.moveTo(30, 31); g.quadraticCurveTo(44, 24, 62, 37); g.quadraticCurveTo(58, 28, 70, 31); g.closePath(); ink(hair); }
  if (style === 'spiky') {
    g.beginPath(); g.moveTo(29, 28);
    for (let k = 0; k < 6; k++) { const x = 31 + k * 7.6; g.lineTo(x + 2, 13 + (k % 2) * 5); g.lineTo(x + 7, 26); }
    g.closePath(); ink(hair);
  }
  if (style === 'curly' || style === 'afro') {
    for (let k = 0; k < 8; k++) { const a = Math.PI * (1.05 + k * 0.12); g.beginPath(); g.arc(50 + Math.cos(a) * 20, 38 + Math.sin(a) * 18, 7, 0, Math.PI * 2); ink(hair); }
  }
  if (style === 'bald') { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(42, 30, 6, 3, -0.4, 0, Math.PI * 2); g.fill(); }
  if (style === 'patka') {
    g.beginPath(); g.ellipse(50, 30, 22, 13, 0, Math.PI, 0); g.lineTo(72, 34); g.lineTo(28, 34); g.closePath(); ink(shade(kit.trim === '#ffffff' ? kit.suit : kit.trim, -0.1));
    g.beginPath(); g.ellipse(50, 17, 8, 6, 0, 0, Math.PI * 2); ink(shade(kit.trim === '#ffffff' ? kit.suit : kit.trim, -0.1));
  }
  // a little grey at the temples for the veterans
  if (age >= 33 && age < 35 && style !== 'bald') {
    g.fillStyle = 'rgba(220,220,220,0.75)';
    for (const x of [29.5, 70.5]) { g.beginPath(); g.ellipse(x, 38, 2.5, 5, 0, 0, Math.PI * 2); g.fill(); }
  }
}
