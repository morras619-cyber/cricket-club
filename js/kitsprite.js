// The plain-kit bowler (img/kit/, tools/build_kit_sheets.py): one bald body per view, repainted
// for each club (kit), then for each player (skin, hair), with the club crest on the front of the
// shirt and the player's last name and number on the back (style: tools/kit/SHIRT_PRINT.md).
import { KIT_SHEETS } from './kitsheets.js';
import { skinHex, hairHex, hsv, rgb } from './looks.js';
import { buildOf } from './builds.js';

const REF_HEIGHT_M = 1.85;
// the game's frame names -> the sheet's poses (0-9, left to right, top row first)
const POSE = {
  start: 0, run1: 1, run2: 2, run3: 8, gather: 3, coil: 4, frontarm: 4, release: 5,
  follow1: 6, follow2: 7, follow3: 7, finish: 8, field: 9, react: 9, celebrate1: 5, celebrate2: 5,
};
const POSE_FRONT = { celebrate2: 4 };
// the spinner (front, 15 poses): stance, three walking strides, the arm going up (4-7), release (8),
// follow-through (9-12), walking back (13), standing (14)
const POSE_SPIN = {
  start: 0, run1: 1, run2: 2, run3: 3, gather: 4, coil: 6, frontarm: 6, release: 8,
  follow1: 9, follow2: 10, follow3: 11, finish: 12, field: 14, react: 14, celebrate1: 14, celebrate2: 14,
};

// the spinner from behind (15 poses)
const POSE_SPIN_BACK = {
  start: 0, run1: 1, run2: 2, run3: 3, gather: 4, coil: 6, frontarm: 7, release: 8,
  follow1: 10, follow2: 11, follow3: 12, finish: 13, field: 14, react: 9, celebrate1: 14, celebrate2: 14,
};
// the batter from behind (30 poses, tools/kit/compose_batter.py: ready, leave x2, backlift, drive x4,
// pull x3, defend x3, cut x6, bowled, celebration, reverse sweep x3, straight drive x2, cover drive x3), named as batsprite.js names them
const POSE_BAT = Object.fromEntries(['ready', 'leave1', 'leave2', 'backlift', 'drive1', 'drive2', 'drive3', 'drive4',
  'pull1', 'pull2', 'pull3', 'def1', 'def2', 'def3', 'cut1', 'cut2', 'cut3', 'cut4', 'cut5', 'cut6',
  'bowled', 'celebrate', 'rsweep1', 'rsweep2', 'rsweep3', 'straight1', 'straight2', 'cover1', 'cover2', 'cover3'].map((n, i) => [n, i]));
const BAT_HEIGHT_M = 1.72; // the ready stance, helmet to feet
const views = {}; // view -> { img, mask, tone, hair: { style: img }, data }
let fontReady = false;
const crestImgs = new Map();

function image(src) {
  const img = new Image();
  img.src = src;
  return img;
}
const loaded = img => img && img.complete && img.naturalWidth > 0;

export function loadKitSprites(...teamIds) {
  for (const view of ['front', 'back', 'bat-back']) if (!views[view] && KIT_SHEETS[view]) views[view] = openView(view);
  for (const id of teamIds) if (id && !crestImgs.has(id)) crestImgs.set(id, image(`img/logo-${id}.webp`));
  if (!fontReady && typeof document !== 'undefined' && document.fonts?.load) {
    document.fonts.load('800 100px "Barlow Condensed"').then(() => { fontReady = true; }, () => { fontReady = true; });
  }
}

function pixels(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  c.width = 0; c.height = 0;
  return d;
}
// (a premium kit has a tone map too: its three colours' weights and the cloth's brightness)
const openView = view => ({ img: image(`img/kit/${view}.webp`), mask: image(`img/kit/${view}-mask.png`), tone: KIT_SHEETS[view].tones ? image(`img/kit/${view}-tone.png`) : null, hair: {} });
// the view's pixel data, once its images are in
function viewData(view) {
  if (!views[view] && KIT_SHEETS[view]) views[view] = openView(view);
  const v = views[view];
  if (!v || !loaded(v.img) || !loaded(v.mask) || (v.tone && !loaded(v.tone))) return null;
  if (!v.data) v.data = { mask: pixels(v.mask), tone: v.tone && pixels(v.tone), hair: {} };
  return v.data;
}
// a hairstyle's layer for the view (loaded the first time a player with it is drawn); undefined
// while it loads
function hairData(view, style) {
  const v = views[view], d = v.data;
  if (d.hair[style]) return d.hair[style];
  if (!v.hair[style]) v.hair[style] = image(`img/kit/${view}-hair-${style}.webp`);
  if (!loaded(v.hair[style])) return undefined;
  return (d.hair[style] = pixels(v.hair[style]));
}

// The player's hairstyle: from his portrait (tools: js/portrait-styles.js), else from his look.
// His beard (front views only: from behind there's nothing of it to see) and a backwards cap.
const CHIN = { full: 'beard_full', beard: 'beard_full', stubble: 'beard_stubble', moustache: 'beard_moustache', goatee: 'beard_goatee', long: 'beard_long' };
export const beardOf = look => CHIN[look.chin] || (look.chin === undefined ? CHIN[look.beard] : null) || null;
export const wearOf = look => (look.wear === 'cap' ? 'cap' : null);
const CUT = { part: 'part', messy: 'messy', buzz: 'buzz', curly: 'curly', spiky: 'spiky', long: 'long', ponytail: 'ponytail', dreads: 'dreads', bun: 'bun' };
const STYLE = { crop: 'buzz', swept: 'messy', spiky: 'spiky', curly: 'curly', long: 'long', afro: 'curly', dreads: 'dreads', patka: 'buzz' };
export function hairStyleOf(look) {
  if (look.wear === 'cap') return null; // the cap's drawing has his short sides under it
  if (look.cut === 'bald' || (!look.cut && look.style === 'bald')) return null;
  if (CUT[look.cut]) return CUT[look.cut];
  if (look.wear) return 'buzz'; // short hair under a cap or wrap
  return STYLE[look.style] || (hashStr(look.seed || look.who || 'x') % 2 ? 'part' : 'messy');
}

const hexRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// a kit colour's shadow, middle and light tones (0-255), so a yellow shirt shades to warm brown
// rather than olive and a black one still shows its folds
function ramp(hex) {
  const c = hexRgb(hex), [h, s, v] = hsv(...c), l = lum(...c) / 255;
  if (l < 0.18) {
    const mid = rgb(h, s, Math.max(v, 0.2));
    return [mid.map(x => x * 0.35), mid, mid.map((x, k) => x + ([158, 163, 184][k] - x) * 0.75)];
  }
  if (s < 0.15) return [c.map((x, k) => x * 0.45 * [0.95, 0.97, 1.05][k]), c, c.map(x => x + (255 - x) * 0.8)];
  // a richer, more saturated main colour (a match shirt, not a training top), deep shadows and a
  // bright, still-coloured light side
  const mid = rgb(h, Math.min(1, s * 1.14 + 0.04), Math.min(1, v * 1.06 + 0.03));
  const shadow = rgb((h + (l > 0.5 ? -12.6 : 0) + 360) % 360, Math.min(1, s * 1.18 + 0.05), v * 0.36);
  return [shadow, mid, mid.map(x => x + (255 - x) * 0.5)];
}

// The premium kit's three colours per club: the main shirt, the yoke and side panels, the piping
// (collar, cuffs, belt, trouser stripe). Another club: its suit, a deep shade of it and its trim.
const PREMIUM = {
  thunder: ['#1f5fd6', '#0c2a6e', '#ffd23f'], cyclones: ['#1e8a3a', '#0b3d1b', '#ffd21f'],
  vipers: ['#1c1c22', '#3b3c47', '#e8262b'], eagles: ['#ffcc12', '#16161a', '#ffffff'],
  phoenix: ['#f2711c', '#1c1c1c', '#ffd23f'], titans: ['#9a9da3', '#2b2d33', '#ffffff'],
  storm: ['#6a22c4', '#2a0b5a', '#f2b21b'], royals: ['#ec2f9a', '#5c0c3a', '#ffffff'],
  india: ['#1c5ad6', '#0b2a6e', '#ff9933'], pakistan: ['#0d7a3c', '#063d1d', '#ffffff'],
};
function premiumOf(team) {
  if (PREMIUM[team.id]) return PREMIUM[team.id].map(hexRgb);
  const c = hexRgb(team.suit);
  return [c, c.map(x => x * 0.38), hexRgb(team.trim)];
}

// ---------- the club's kit ----------
const teamCache = new Map();
function teamSheet(view, team) {
  const key = view + '|' + team.id;
  if (teamCache.has(key)) return teamCache.get(key);
  const v = views[view], meta = KIT_SHEETS[view], data = viewData(view);
  const c = document.createElement('canvas');
  c.width = v.img.naturalWidth; c.height = v.img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(v.img, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), p = img.data, m = data.mask;
  if (data.tone) {
    // each colour shaded by the cloth's brightness against that colour's drawn brightness, then
    // mixed by the soft weights (so panel edges and piping blend, no patches)
    const tn = data.tone, pal = premiumOf(team), ref = meta.tones.map(x => x * 255), w = [0, 0, 0];
    for (let i = 0; i < p.length; i += 4) {
      if (m[i + 2] !== 255 || !p[i + 3] || !tn[i + 2]) continue;
      w[1] = tn[i] / 255; w[2] = tn[i + 1] / 255; w[0] = Math.max(0, 1 - w[1] - w[2]);
      const L = tn[i + 2];
      let r = 0, gg = 0, b = 0;
      for (let k = 0; k < 3; k++) {
        if (!w[k]) continue;
        const t = pal[k], q = L / ref[k], sh = q <= 1 ? q ** 0.9 : 0, hi = q > 1 ? Math.min(0.7, (q - 1) * 0.8) : 0;
        r += w[k] * (q <= 1 ? t[0] * sh : t[0] + (255 - t[0]) * hi);
        gg += w[k] * (q <= 1 ? t[1] * sh : t[1] + (255 - t[1]) * hi);
        b += w[k] * (q <= 1 ? t[2] * sh : t[2] + (255 - t[2]) * hi);
      }
      p[i] = r; p[i + 1] = gg; p[i + 2] = b;
    }
    g.putImageData(img, 0, 0);
    teamCache.set(key, c);
    while (teamCache.size > 4) { const [k, old] = teamCache.entries().next().value; teamCache.delete(k); old.width = 0; old.height = 0; }
    return c;
  }
  const tones = { 255: [ramp(team.suit), meta.suit], 128: [ramp(team.trim), meta.trim] };
  for (let i = 0; i < p.length; i += 4) {
    const t = tones[m[i + 2]];
    if (!t || !p[i + 3]) continue;
    const [[sh, md, li], [lo, mid, hi]] = t, l = lum(p[i], p[i + 1], p[i + 2]) / 255;
    let x = l < mid ? (l - lo) / Math.max(mid - lo, 1e-3) - 1 : (l - mid) / Math.max(hi - mid, 1e-3);
    x = Math.max(-1.15, Math.min(1, x));
    // the fabric's sheen: the drawn highlight streaks stay crisp and bright, like a polyester shirt
    const gloss = x > 0.7 ? (x - 0.7) / 0.3 * 0.55 : 0;
    for (let k = 0; k < 3; k++) {
      const v = x < 0 ? md[k] + (md[k] - sh[k]) * x : md[k] + (li[k] - md[k]) * x;
      p[i + k] = v + (255 - v) * gloss;
    }
  }
  g.putImageData(img, 0, 0);
  teamCache.set(key, c);
  while (teamCache.size > 4) { const [k, old] = teamCache.entries().next().value; teamCache.delete(k); old.width = 0; old.height = 0; }
  return c;
}

// ---------- the player ----------
const PARTICLES = new Set(['van', 'der', 'de', 'du', 'da', 'le', 'la', 'von', 'ter', 'ten', 'al', 'el', 'bin']);
export function shirtName(name = '') {
  const w = name.trim().split(/\s+/);
  const i = w.findIndex((x, k) => k > 0 && PARTICLES.has(x.toLowerCase()));
  return (i > 0 ? w.slice(i) : w.slice(-1)).join(' ').toUpperCase();
}
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export const shirtNumber = look => look.num || (hashStr(look.seed || look.who || 'x') % 99) + 1;

// the crest with a thin dark rim, so it reads on any kit colour
const crestCache = new Map();
function crestCanvas(id) {
  if (crestCache.has(id)) return crestCache.get(id);
  const img = crestImgs.get(id);
  if (!loaded(img)) return null;
  const s = 200 / Math.max(img.naturalWidth, img.naturalHeight), w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s), o = 7;
  const sil = document.createElement('canvas'), c = document.createElement('canvas');
  sil.width = c.width = w + 2 * o; sil.height = c.height = h + 2 * o;
  const gs = sil.getContext('2d'), g = c.getContext('2d');
  gs.drawImage(img, o, o, w, h);
  gs.globalCompositeOperation = 'source-in';
  gs.fillStyle = 'rgba(14,12,24,0.9)'; gs.fillRect(0, 0, sil.width, sil.height);
  for (let a = 0; a < 16; a++) g.drawImage(sil, Math.cos(a * Math.PI / 8) * o, Math.sin(a * Math.PI / 8) * o);
  g.drawImage(img, o, o, w, h);
  crestCache.set(id, c);
  return c;
}

// the name and number, laid out as one block 400 units wide (centre at 0, 0): name cap height
// 52, gap 26, number cap height 190; each line squeezed only if wider than the block
const BLOCK = { w: 400, name: 52, gap: 26, num: 190 };
function printLine(g, text, cap, cy, fill, edge) {
  g.font = `800 ${Math.round(cap / 0.7)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  const asc = g.measureText('H').actualBoundingBoxAscent || cap, size = Math.round(cap / 0.7) * cap / asc;
  g.font = `800 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  const wid = g.measureText(text).width, sx = Math.min(1, BLOCK.w / wid);
  g.save();
  g.translate(0, cy + cap / 2);
  g.scale(sx, 1);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  if (edge) { g.lineJoin = 'round'; g.lineWidth = cap * 0.14; g.strokeStyle = edge; g.strokeText(text, 0, 0); }
  g.fillStyle = fill;
  g.fillText(text, 0, 0);
  g.restore();
}

const playerCache = new Map();
function playerSheet(view, team, look, mirror) {
  const meta = KIT_SHEETS[view], data = viewData(view);
  if (!data || !fontReady) return null;
  const sk = skinHex(look), hr = hairHex(look), style = hairStyleOf(look);
  const facing = view.endsWith('front');
  const beard = facing ? beardOf(look) : null, wear = wearOf(look);
  const hp = style && meta.hair?.[style] ? hairData(view, style) : null;
  const bp = beard && meta.hair?.[beard] ? hairData(view, beard) : null;
  const wp = wear && meta.hair?.[wear] ? hairData(view, wear) : null;
  if (hp === undefined || bp === undefined || wp === undefined) return null;
  const name = shirtName(look.who), num = shirtNumber(look);
  const key = [view, team.id, team.suit, team.trim, sk, hr, style, beard, wear, name, num, mirror].join('|');
  if (playerCache.has(key)) { const c = playerCache.get(key); playerCache.delete(key); playerCache.set(key, c); return c; }
  if (facing && !crestCanvas(team.id)) return null;
  const kit = teamSheet(view, team);
  if (!kit) return null;
  const W = kit.width, H = kit.height;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(kit, 0, 0);
  // skin, then his hair (none if he's bald)
  let img = g.getImageData(0, 0, W, H), p = img.data;
  const m = data.mask, st = hexRgb(sk), ht = hexRgb(hr), sref = meta.skin * 255;
  // hair and beard in his hair colour (shading kept); the cap as drawn
  const layers = [[hp, style], [bp, beard], [wp, null]].filter(([d]) => d).map(([d, s2]) => [d, s2 ? meta.hair[s2] * 255 : 0]);
  for (let i = 0; i < p.length; i += 4) {
    if (m[i] > 127 && p[i + 3]) {
      const r = lum(p[i], p[i + 1], p[i + 2]) / sref;
      for (let k = 0; k < 3; k++) p[i + k] = r <= 1 ? st[k] * r : st[k] + (255 - st[k]) * Math.min(0.85, (r - 1) * 1.1);
    }
    for (const [d, href] of layers) {
      const a = d[i + 3] / 255;
      if (a <= 0.01) continue;
      if (href) {
        const q = lum(d[i], d[i + 1], d[i + 2]) / href;
        for (let k = 0; k < 3; k++) p[i + k] = (q <= 1 ? ht[k] * q : ht[k] + (255 - ht[k]) * Math.min(0.8, (q - 1) * 0.6)) * a + p[i + k] * (1 - a);
      } else for (let k = 0; k < 3; k++) p[i + k] = d[i + k] * a + p[i + k] * (1 - a);
      p[i + 3] = Math.max(p[i + 3], d[i + 3]);
    }
  }
  g.putImageData(img, 0, 0);
  // a left-armer: the whole sheet mirrored (the crest and print are drawn after, so they read right)
  if (mirror) {
    const flipped = document.createElement('canvas');
    flipped.width = W; flipped.height = H;
    const fg = flipped.getContext('2d');
    fg.translate(W, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0);
    g.clearRect(0, 0, W, H);
    g.drawImage(flipped, 0, 0);
    flipped.width = 0; flipped.height = 0;
  }
  // the crest (front) or the name and number (back), on a layer of their own
  const layer = document.createElement('canvas');
  layer.width = W; layer.height = H;
  const lg = layer.getContext('2d', { willReadFrequently: true });
  const mx = (x) => (mirror ? W - x : x), ma = (a) => (mirror ? -a : a);
  if (facing) {
    const cr = crestCanvas(team.id);
    for (const [x, y, size, sx, sy, ang] of meta.place) {
      const s = size / Math.max(cr.width, cr.height);
      lg.save();
      lg.translate(mx(x), y); lg.rotate(ma(ang) * Math.PI / 180); lg.scale(sx, sy);
      lg.drawImage(cr, -cr.width * s / 2, -cr.height * s / 2, cr.width * s, cr.height * s);
      lg.restore();
    }
  } else {
    // the print in the trim colour, blended a little into the shirt so it sits in the cloth (a very
    // dark trim, black on orange, becomes a deep shade of the shirt rather than stark black)
    const tr = hexRgb(team.trim), su = hexRgb(team.suit), dark = lum(...tr) < 0.2 * 255, mixK = dark ? 0.42 : 0.12;
    const fill = `rgb(${tr.map((v, k) => Math.round(v + (su[k] * (dark ? 0.45 : 1) - v) * mixK)).join(',')})`, close = Math.abs(lum(...hexRgb(team.trim)) - lum(...hexRgb(team.suit))) <= 0.35 * 255;
    const edge = close ? `rgb(${hexRgb(team.suit).map(x => Math.round(x * 0.35)).join(',')})` : null;
    const hb = BLOCK.name + BLOCK.gap + BLOCK.num;
    for (const [x, y, w, sx, sy, ang, ndx, ndy, udx, udy] of meta.place) {
      for (const [text, cap, cy, dx, dy] of [[name, BLOCK.name, -hb / 2 + BLOCK.name / 2, ndx, ndy], [String(num), BLOCK.num, hb / 2 - BLOCK.num / 2, udx, udy]]) {
        lg.save();
        lg.translate(mx(x + dx), y + dy); lg.rotate(ma(ang) * Math.PI / 180); lg.scale(w / BLOCK.w * sx, w / BLOCK.w * sy);
        printLine(lg, text, cap, cy, fill, edge);
        lg.restore();
      }
    }
  }
  // onto the shirt only (an arm in front hides it), shaded with the cloth's folds
  const lp = lg.getImageData(0, 0, W, H).data;
  img = g.getImageData(0, 0, W, H); p = img.data;
  const ref = (meta.tones ? lum(...premiumOf(team)[0]) : lum(...ramp(team.suit)[1])) || 1, [lo, hi] = facing ? [0.6, 1.12] : [0.55, 1.15];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!lp[i + 3]) continue;
      const mi = (y * W + (mirror ? W - 1 - x : x)) * 4;
      if (m[mi + 1] < 128) continue;
      // (long hair hanging over the back hides the print)
      const a = lp[i + 3] / 255 * (hp ? 1 - hp[mi + 3] / 255 : 1), f = Math.max(lo, Math.min(hi, lum(p[i], p[i + 1], p[i + 2]) / ref));
      for (let k = 0; k < 3; k++) p[i + k] = p[i + k] * (1 - a) + Math.min(255, lp[i + k] * f) * a;
    }
  }
  g.putImageData(img, 0, 0);
  layer.width = 0; layer.height = 0;
  playerCache.set(key, c);
  while (playerCache.size > 4) { const [k, old] = playerCache.entries().next().value; playerCache.delete(k); old.width = 0; old.height = 0; }
  return c;
}

// The bowler in the plain kit, feet at (px, py). False if it isn't ready (the old sprite is drawn).
export function drawKitSprite(ctx, px, py, kPerM, frame, team, flip, view, look) {
  if (!team || !look?.who) return false;
  const sheet = playerSheet(view, team, look, !!flip);
  if (!sheet) return false;
  const meta = KIT_SHEETS[view];
  const pose = (view === 'spin-back' ? POSE_SPIN_BACK[frame] : view === 'spin-front' ? POSE_SPIN[frame] : view === 'front' && POSE_FRONT[frame] !== undefined ? POSE_FRONT[frame] : POSE[frame]) ?? 0;
  let [sx, sy, w, h, ax, ay] = meta.frames[pose];
  if (flip) { sx = sheet.width - sx - w; ax = w - ax; }
  // his own build: taller or shorter, broader or slighter, about his feet
  const [bh, bw] = buildOf(look), k = kPerM * REF_HEIGHT_M / meta.refPx * bh, kx = k * bw;
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,20,0.26)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.5 * kPerM * bw, 0.11 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(sheet, sx, sy, w, h, px - ax * kx, py - ay * k, w * kx, h * k);
  ctx.restore();
  return true;
}

// The batter from behind in his club's kit, feet at (px, py): frame f, with the frame before it
// faded out underneath (a fast swing reads as motion). False until the sheet is ready.
export function drawKitBatter(ctx, px, py, kPerM, f, prev, a, team, look, glow) {
  if (!team || !look?.who || !KIT_SHEETS['bat-back']) return false;
  const sheet = playerSheet('bat-back', team, look, false);
  if (!sheet) return false;
  const [bh, bw] = buildOf(look), meta = KIT_SHEETS['bat-back'], k = kPerM * BAT_HEIGHT_M / meta.refPx * bh, kx = k * bw;
  const one = (name, alpha) => {
    const [sx, sy, w, h, ax, ay] = meta.frames[POSE_BAT[name] ?? 0];
    ctx.globalAlpha = alpha;
    ctx.drawImage(sheet, sx, sy, w, h, px - ax * kx, py - ay * k, w * kx, h * k);
  };
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,20,0.28)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.55 * kPerM * bw, 0.12 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 22; }
  if (prev && a < 1) one(prev, (1 - a) * 0.6);
  one(f, 1);
  ctx.restore();
  return true;
}
