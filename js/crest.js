// Crests painted in the game (the create-your-club builder): an emblem's grey layers
// (img/crest-masks.png, tools/build_crest_masks.py) in the club's two colours, the same recipe
// as the painted lower-division crests (tools/build_club_logos.py).
// the painted crests (img/crest-art.webp, tools/build_crest_art.py): finished emblems, the red recoloured to the club's main colour and the gold to its trim
export const ART_IDS = ['lion', 'bull', 'hawk', 'cobra', 'phoenix', 'spartan', 'crown', 'shield', 'swords', 'trident',
  'dragon', 'wolf', 'stallion', 'flame', 'sun', 'tornado', 'gem', 'lotus2', 'lightning', 'vortex'];
const MASK_IDS = ['wave', 'wing', 'tiger', 'lotus', 'mountain', 'anvil', 'comet', 'claw', 'anchor',
  'jaguar', 'crescent', 'bolt', 'kite', 'tusk', 'rocket', 'lantern'];
export const EMBLEM_IDS = [...ART_IDS, ...MASK_IDS];
const T = 192, INK = [20, 16, 24];
let atlas = null, masks = null;

// the masks' pixels, once (resolves to false if they can't be had)
export function loadCrestMasks() {
  if (!atlas) {
    atlas = new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        masks = { w: c.width, d: g.getImageData(0, 0, c.width, c.height).data };
        loadArt().then(() => res(true));
      };
      img.onerror = () => res(false);
      img.src = 'img/crest-masks.png';
    });
  }
  return atlas;
}

const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// a 192 px crest on a canvas (null until the masks are in)
export function paintCrest(emblem, suit, trim) {
  if (!masks) return null;
  if (ART_IDS.includes(emblem)) return paintArt(emblem, suit, trim);
  const i = Math.max(0, MASK_IDS.indexOf(emblem)), cx = i % 4 * 2 * T, cy = Math.floor(i / 4) * T;
  const su = rgbOf(suit), tr = rgbOf(trim), { w, d } = masks;
  const c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d'), out = g.createImageData(T, T), o = out.data;
  for (let y = 0; y < T; y++) {
    const yy = y / (T - 1), shade = 1.25 - 0.5 * yy;
    for (let x = 0; x < T; x++) {
      const a = ((cy + y) * w + cx + x) * 4, b = a + T * 4;
      const M = d[a] / 255, Tr = d[a + 1] / 255, r1 = d[a + 2] / 255, r2 = d[b] / 255, e = d[b + 1] / 255;
      const al = Math.max(r2, r1, M);
      if (al <= 0) continue;
      // a gloss across the upper part of the body
      const gl = Math.max(0, Math.min(1, 1 - Math.abs((yy * 2 - 1) * 3 + (x / (T - 1) * 2 - 1) * 1.2 + 1.3))) * 0.28;
      const p = (y * T + x) * 4;
      for (let k = 0; k < 3; k++) {
        let body = Math.min(255, su[k] * shade);
        body = body * (1 - Tr) + tr[k] * Tr;
        body += (255 - body) * gl;
        // the trim ring, the ink outline inside it, the body, its inner ink lines
        let v = tr[k];
        v = v * (1 - r1) + INK[k] * r1;
        v = v * (1 - M) + body * M;
        o[p + k] = v * (1 - e) + INK[k] * e;
      }
      o[p + 3] = al * 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

// ---------- the painted crests ----------
let art = null, artRef = null;
function loadArt() {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      art = { w: c.width, d: g.getImageData(0, 0, c.width, c.height).data };
      artRef = reference(art.d);
      res(true);
    };
    img.onerror = () => res(false);
    img.src = 'img/crest-art.webp';
  });
}
function hsvOf(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx ? d / mx : 0, mx];
}
function rgbOfHsv(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
// how red (towards 1) and how gold (towards 0) a colourful pixel is: red is the hues round 0, gold the ones round 50
const redness = h => (h <= 22 || h >= 340 ? 1 : h < 38 ? (38 - h) / 16 : h >= 320 ? (h - 320) / 20 : 0);
// the art's own typical saturation and value for its red and its gold, so a club's colour lands as bright as the painted one was
function reference(d) {
  const t = { r: [0, 0, 0], g: [0, 0, 0] };
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 250) continue;
    const [h, s, v] = hsvOf(d[i], d[i + 1], d[i + 2]);
    if (s < 0.5 || v < 0.45) continue;
    const k = redness(h) > 0.5 ? t.r : t.g;
    k[0] += s; k[1] += v; k[2]++;
  }
  const m = k => (k[2] ? [k[0] / k[2], k[1] / k[2]] : [0.9, 0.85]);
  return { r: m(t.r), g: m(t.g) };
}
function paintArt(emblem, suit, trim) {
  if (!art) return null;
  const i = Math.max(0, ART_IDS.indexOf(emblem)), cx = (i % 5) * T, cy = Math.floor(i / 5) * T, { d, w } = art;
  const tg = [suit, trim].map(hex => { const [r, g, b] = rgbOf(hex), [h, s, v] = hsvOf(r, g, b); return { h, s, v, rgb: [r, g, b] }; });
  const c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d'), out = g.createImageData(T, T), o = out.data;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const a = ((cy + y) * w + cx + x) * 4, p = (y * T + x) * 4, al = d[a + 3];
    if (!al) continue;
    let r = d[a], gg = d[a + 1], b = d[a + 2];
    const [h, s, v] = hsvOf(r, gg, b);
    // only the colourful, lit pixels are club colours; the ink outline and the dark shading stay as drawn
    const k = Math.max(0, Math.min(1, (s - 0.3) / 0.3)) * Math.max(0, Math.min(1, (v - 0.14) / 0.22));
    if (k > 0) {
      const wr = redness(h), mix = [0, 0, 0];
      for (const [t, wt, ref] of [[tg[0], wr, artRef.r], [tg[1], 1 - wr, artRef.g]]) {
        if (!wt) continue;
        const col = rgbOfHsv(t.h, Math.min(1, s * (t.s / ref[0])), Math.min(1, v * (t.v / ref[1])));
        for (let q = 0; q < 3; q++) mix[q] += col[q] * wt;
      }
      r += (mix[0] - r) * k; gg += (mix[1] - gg) * k; b += (mix[2] - b) * k;
    }
    o[p] = r; o[p + 1] = gg; o[p + 2] = b; o[p + 3] = al;
  }
  g.putImageData(out, 0, 0);
  return c;
}
