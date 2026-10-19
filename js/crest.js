// Crests painted in the game (the create-your-club builder): an emblem's grey layers
// (img/crest-masks.png, tools/build_crest_masks.py) in the club's two colours, the same recipe
// as the painted lower-division crests (tools/build_club_logos.py).
export const EMBLEM_IDS = ['wave', 'wing', 'tiger', 'lotus', 'mountain', 'anvil', 'comet', 'claw', 'anchor',
  'jaguar', 'crescent', 'bolt', 'kite', 'tusk', 'rocket', 'lantern'];
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
        res(true);
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
  const i = Math.max(0, EMBLEM_IDS.indexOf(emblem)), cx = i % 4 * 2 * T, cy = Math.floor(i / 4) * T;
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
