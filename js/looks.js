// What every player looks like: skin tone, hair colour and style, facial hair. Used to draw
// a comic face for each player in the menus, and to repaint the hand-drawn match sprites
// (skin and hair) so the man at the crease looks like himself.
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

// ---------- repainting the match sprites ----------
// The drawn players all have the same light-tan skin and dark-brown hair. Skin pixels are a
// narrow orange-tan band (kits, pads and the bat sit outside it); hair is the same hue, darker.
const REF_SKIN = [28, 0.55, 0.95], REF_HAIR = [25, 0.5, 0.32];
const cache = new Map(); // key -> canvas, newest last
export function peopleSheet(src, key, look) {
  if (!look) return src;
  const sk = skinHex(look), hr = hairHex(look);
  const id = `${key}|${sk}|${hr}`;
  if (cache.has(id)) { const c = cache.get(id); cache.delete(id); cache.set(id, c); return c; }
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
  if (!w || !h) return src;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return src;
  try { g.drawImage(src, 0, 0); } catch { return src; }
  const img = g.getImageData(0, 0, w, h), p = img.data;
  const S = hexHsv(sk), H = hexHsv(hr);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 70) continue;
    const [hh, s, v] = hsv(p[i], p[i + 1], p[i + 2]);
    let out = null;
    if (hh >= 10 && hh < 35 && s >= 0.28 && s <= 0.8 && v >= 0.5) {
      out = rgb((S[0] + (hh - REF_SKIN[0]) * 0.5 + 360) % 360, Math.min(1, S[1] * (s / REF_SKIN[1])), Math.min(1, S[2] * (v / REF_SKIN[2])));
    } else if (hh >= 8 && hh < 45 && s >= 0.25 && v >= 0.12 && v < 0.5) {
      out = rgb(H[0], Math.min(1, H[1] * Math.min(1.5, s / REF_HAIR[1])), Math.min(1, Math.max(0.06, H[2] * (v / REF_HAIR[2]))));
    }
    if (out) { p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2]; }
  }
  g.putImageData(img, 0, 0);
  cache.set(id, c);
  // keep only a handful (the batter and bowler on screen): free the rest at once on iPhones
  while (cache.size > 6) { const [k, old] = cache.entries().next().value; cache.delete(k); old.width = 0; old.height = 0; }
  return c;
}

// ---------- comic faces ----------
const faces = new Map();
// A head-and-shoulders portrait in the player's kit. kit: { suit, trim }.
export function faceCanvas(p, kit, size = 64) {
  const look = lookOf(p);
  const age = p.age || 26;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const key = `${p.id}|${kit?.suit}|${size}|${age >= 35}|${JSON.stringify(look)}`;
  if (faces.has(key)) return faces.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  const g = c.getContext('2d');
  g.scale(dpr * size / 100, dpr * size / 100);
  drawFace(g, look, kit || { suit: '#f3efe2', trim: '#3a3a4a' }, age);
  faces.set(key, c);
  if (faces.size > 300) faces.delete(faces.keys().next().value);
  return c;
}
// A fresh canvas element showing a face (a canvas can only sit in the page once).
export function faceEl(p, kit, size = 64, cls = 'face') {
  const src = faceCanvas(p, kit, size);
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height; c.className = cls;
  c.style.width = c.style.height = `${size}px`;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function drawFace(g, look, kit, age) {
  const skin = skinHex(look), hair = hairHex(look, age), dark = shade(skin, -0.22);
  const lw = 3.2;
  g.lineJoin = 'round'; g.lineCap = 'round';
  // backdrop in the kit colour
  const bg = g.createLinearGradient(0, 0, 0, 100);
  bg.addColorStop(0, shade(kit.suit, 0.35)); bg.addColorStop(1, shade(kit.suit, -0.25));
  g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, 100, 100, 16); g.fill();
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
