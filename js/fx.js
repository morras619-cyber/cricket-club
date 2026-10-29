// Comic-book effects: onomatopoeia, speech bubbles, impact frames, flashes, shake, particles.
import { FX_ATLAS } from './fxatlas.js';

export const INK = '#141018';
export const FONT_DISPLAY = '"Bangers", "Impact", "Arial Black", sans-serif';
export const FONT_UI = '"Barlow Condensed", "Arial Narrow", "Trebuchet MS", sans-serif';
export const FONT_BODY = '"Baloo 2", "Trebuchet MS", system-ui, sans-serif';

// Hand-drawn 8-frame impact burst (img/burst.webp, tools/build_burst.py): [x, y, w, h, centreX, centreY]
const BURST = [[0, 0, 139, 137, 69.9, 68.3], [141, 0, 151, 149, 74.2, 77.5], [294, 0, 217, 212, 107.4, 109.6], [513, 0, 307, 274, 157.1, 143.8], [0, 276, 322, 294, 164.0, 165.5], [324, 276, 275, 244, 134.5, 133.9], [601, 276, 222, 228, 107.9, 127.4], [825, 276, 154, 174, 79.9, 102.9]];
const BURST_REF = 322; // widest frame, the full blast
let burstImg = null, burstReady = false;
const burstTints = new Map();
function loadBurst() {
  if (burstImg) return;
  burstImg = new Image();
  burstImg.onload = () => { burstReady = true; };
  burstImg.src = 'img/burst.webp';
}
// the gold sheet with its hue turned by `deg` (shading and the white-hot core kept)
function burstSheet(deg) {
  if (!deg) return burstImg;
  if (burstTints.has(deg)) return burstTints.get(deg);
  const c = document.createElement('canvas');
  c.width = burstImg.naturalWidth; c.height = burstImg.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(burstImg, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), p = img.data;
  const a = deg * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  // standard hue-rotation matrix
  const m = [0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072];
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 4) continue;
    const r = p[i], gg = p[i + 1], b = p[i + 2];
    p[i] = r * m[0] + gg * m[1] + b * m[2]; p[i + 1] = r * m[3] + gg * m[4] + b * m[5]; p[i + 2] = r * m[6] + gg * m[7] + b * m[8];
  }
  g.putImageData(img, 0, 0);
  burstTints.set(deg, c);
  return c;
}

// ---------- painted electric effects (img/fx/<set>.webp, tools/build_effects.py) ----------
// Glowing pieces added onto the scene (so their dark edges vanish), animated in code: they pop
// in, flicker and fade. Thunder's set is electric blue.
const fxSets = {};
function fxSheet(set) {
  if (!FX_ATLAS[set]) return null;
  if (!fxSets[set]) { const im = new Image(); im.src = `img/fx/${set}.webp`; fxSets[set] = im; }
  const im = fxSets[set];
  return im.complete && im.naturalWidth ? im : null;
}
export const preloadEffects = set => fxSheet(set);
// draw one piece now. (x, y) is where its anchor point goes (fractions of the piece: 0.5, 0.5 is
// its centre); w its width in px (h its height, if given, else in proportion); rot in radians.
export function drawEffect(ctx, set, name, x, y, { w = 120, h = null, rot = 0, alpha = 1, anchor = [0.5, 0.5], flip = false } = {}) {
  const im = fxSheet(set), f = FX_ATLAS[set]?.[name];
  if (!im || !f || alpha <= 0) return;
  const [sx, sy, sw, sh] = f, dw = w, dh = h ?? (w * sh) / sw;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  // painted on as it is (so it stays blue on a light pitch), then a glow pass for the hot core
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(im, sx, sy, sw, sh, -anchor[0] * dw, -anchor[1] * dh, dw, dh);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha) * 0.4;
  ctx.drawImage(im, sx, sy, sw, sh, -anchor[0] * dw, -anchor[1] * dh, dw, dh);
  ctx.restore();
}

export class FX {
  constructor() { this.reset(); loadBurst(); }
  reset() {
    this.words = []; this.bubbles = []; this.parts = []; this.bursts = []; this.blasts = []; this.effects = []; this.ripples = [];
    this.flashA = 0; this.flashColor = '#fff'; this.shakeA = 0; this.speed = 0; this.vignette = null;
  }

  word(text, x, y, { size = 64, color = '#ffd23f', stroke = '#e8343b', dur = 1100, rot = (Math.random() - 0.5) * 0.25 } = {}) {
    this.words.push({ text, x, y, size, color, stroke, dur, rot, t: 0 });
  }
  // (x, y): the speaker's mouth, where the tail points. name/color: who is speaking and his team's colour; safeTop: the bubble stays
  // below this (the scorecard)
  bubble(text, x, y, { dur = 1600, side = 1, name = null, color = null, safeTop = 8 } = {}) {
    // one speaker at a time: a new line replaces whatever was being said
    this.bubbles = [{ text, x, y, dur, side, name, color, safeTop, t: 0 }];
  }
  // the hand-drawn impact burst at (x, y), `size` px across at full blast; hue turns the gold
  blast(x, y, { size = 260, hue = 0, dur = 420 } = {}) { this.blasts.push({ x, y, size, hue, dur, t: 0 }); }
  // a painted effect that pops in, flickers and fades: effect('electric', 'burst1', x, y, { w, dur })
  effect(set, name, x, y, { w = 160, h = null, rot = 0, dur = 380, anchor = [0.5, 0.5], flip = false, grow = 1.15 } = {}) {
    this.effects.push({ set, name, x, y, w, h, rot, dur, anchor, flip, grow, t: 0 });
  }
  // rings spreading out across the crowd from (x, y), as people jump up
  ripple(x, y, { colors = ['#fff4da', '#ffd23f'], r = 90, dur = 700, squash = 0.78 } = {}) {
    colors.forEach((c, i) => this.ripples.push({ x, y, color: c, r, dur, squash, t: -i * 110 }));
  }
  flash(color = '#fff', a = 0.9) { this.flashColor = color; this.flashA = a; }
  shake(a = 10) { this.shakeA = Math.max(this.shakeA, a); }
  burst(x, y, { color = '#ffd23f', dur = 260, rays = 18, r = 300 } = {}) { this.bursts.push({ x, y, color, dur, rays, r, t: 0 }); }
  sparks(x, y, n = 16, colors = ['#ffd23f', '#fff4da', '#e8343b'], speed = 7) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 30 + Math.random() * 20, max: 50, r: 2 + Math.random() * 4, color: colors[i % colors.length] });
    }
  }

  update(dtMs) {
    const k = dtMs / 16.67;
    for (const w of this.words) w.t += dtMs;
    for (const b of this.bubbles) b.t += dtMs;
    for (const b of this.bursts) b.t += dtMs;
    for (const b of this.blasts) b.t += dtMs;
    this.blasts = this.blasts.filter(b => b.t < b.dur);
    for (const e of this.effects) e.t += dtMs;
    for (const r of this.ripples) r.t += dtMs;
    this.ripples = this.ripples.filter(r => r.t < r.dur);
    this.effects = this.effects.filter(e => e.t < e.dur);
    this.words = this.words.filter(w => w.t < w.dur);
    this.bubbles = this.bubbles.filter(b => b.t < b.dur);
    this.bursts = this.bursts.filter(b => b.t < b.dur);
    for (const p of this.parts) { p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.25 * k; p.life -= k; }
    this.parts = this.parts.filter(p => p.life > 0);
    this.flashA = Math.max(0, this.flashA - 0.006 * dtMs);
    this.shakeA = Math.max(0, this.shakeA - 0.04 * dtMs);
  }

  offset() {
    if (!this.shakeA) return [0, 0];
    return [(Math.random() - 0.5) * this.shakeA, (Math.random() - 0.5) * this.shakeA];
  }

  draw(ctx, W, H) {
    for (const b of this.bursts) drawBurst(ctx, b, W, H);
    if (burstReady) for (const b of this.blasts) {
      const [sx, sy, w, h, cx, cy] = BURST[Math.min(7, Math.floor((b.t / b.dur) * 8))];
      const k = b.size / BURST_REF;
      ctx.drawImage(burstSheet(b.hue), sx, sy, w, h, b.x - cx * k, b.y - cy * k, w * k, h * k);
    }
    for (const r of this.ripples) {
      if (r.t < 0) continue;
      const p = r.t / r.dur, rr = r.r * (0.15 + 0.85 * Math.sqrt(p));
      ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = r.color; ctx.lineWidth = 3 + 5 * (1 - p);
      ctx.setLineDash([4, 7]);
      ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr * r.squash, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    for (const e of this.effects) {
      const p = e.t / e.dur;
      const sc = p < 0.15 ? 0.6 + 0.4 * (p / 0.15) : 1 + (e.grow - 1) * (p - 0.15) / 0.85;
      const alpha = (p < 0.1 ? p / 0.1 : Math.pow(1 - (p - 0.1) / 0.9, 1.3)) * (0.75 + 0.25 * Math.random());
      drawEffect(ctx, e.set, e.name, e.x, e.y, { w: e.w * sc, h: e.h != null ? e.h * sc : null, rot: e.rot, alpha, anchor: e.anchor, flip: e.flip });
    }
    for (const p of this.parts) {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.speed > 0) drawSpeedLines(ctx, W, H, this.speed);
    // every bubble and word keeps clear of the ones already on screen (placed once, then it stays)
    const taken = [];
    for (const b of this.bubbles) taken.push(drawBubble(ctx, b, W, taken, H));
    for (const w of this.words) taken.push(drawWord(ctx, w, W, H, taken));
    if (this.flashA > 0) {
      ctx.globalAlpha = Math.min(1, this.flashA);
      ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}

const hits = (r, list) => list.find(q => q && r.x < q.x + q.w + 6 && r.x + r.w + 6 > q.x && r.y < q.y + q.h + 6 && r.y + r.h + 6 > q.y);
// move a box (x, y = its top left) to the nearest spot, above or below, clear of all of `taken`
function settle(r, taken, H) {
  const y0 = r.y, step = r.h + 6;
  for (const k of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const y = y0 + k * step;
    if (y < 8 || y + r.h > H - 8) continue;
    if (!hits({ ...r, y }, taken)) { r.y = y; return r; }
  }
  return r;
}

function drawWord(ctx, w, W, H, taken = []) {
  const p = w.t / w.dur;
  const pop = p < 0.12 ? p / 0.12 * 1.25 : p < 0.2 ? 1.25 - (p - 0.12) / 0.08 * 0.25 : 1;
  ctx.save();
  ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
  ctx.font = `${w.size}px ${FONT_DISPLAY}`;
  // keep the whole word on screen: shrink it if it's wider than the screen, then slide it inside
  const pad = 10, halfW = (ctx.measureText(w.text).width + w.size * 0.3) / 2, halfH = w.size * 0.62;
  const fit = W ? Math.min(1, (W / 2 - pad) / (halfW * 1.25)) : 1;
  let x = w.x, y = w.y;
  if (W) {
    const hx = halfW * 1.25 * fit, hy = halfH * 1.25 * fit;
    x = Math.max(pad + hx, Math.min(W - pad - hx, x));
    y = Math.max(pad + hy, Math.min(H - pad - hy, y));
  }
  const hx = halfW * 1.1 * fit, hy = halfH * 1.1 * fit;
  if (w.ly == null) w.ly = settle({ x: x - hx, y: y - hy, w: hx * 2, h: hy * 2 }, taken, H).y + hy; // its spot, kept
  y = w.ly;
  ctx.translate(x, y);
  ctx.rotate(w.rot);
  ctx.scale(pop * fit, pop * fit);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = w.size * 0.22; ctx.strokeStyle = INK; ctx.strokeText(w.text, 4, 5);
  ctx.lineWidth = w.size * 0.14; ctx.strokeStyle = w.stroke; ctx.strokeText(w.text, 0, 0);
  ctx.fillStyle = w.color; ctx.fillText(w.text, 0, 0);
  ctx.restore();
  return { x: x - hx, y: y - hy, w: hx * 2, h: hy * 2 };
}

// Where a bubble of size w x h sits for a speaker whose mouth is at (tx, ty): above his head with the tail pointing down at him, or
// below it when there is no room above (the scorecard); kept on the screen and below safeTop. Returns { x, y, below }.
export function bubbleLayout({ tx, ty, w, h, W, H = 9999, safeTop = 8, gap = 24 }) {
  const x = Math.max(8, Math.min(W - w - 8, tx - w / 2 + (tx < W / 2 ? w * 0.18 : -w * 0.18)));   // (a little off-centre, towards the middle of the screen)
  let y = ty - h - gap, below = false;
  if (y < safeTop) { y = ty + gap + 6; below = true; }
  y = Math.max(safeTop, Math.min(H - h - 8, y));
  return { x, y, below };
}

export function drawBubble(ctx, b, W, taken = [], H = 9999) {
  const p = b.t / b.dur;
  const a = p < 0.08 ? p / 0.08 : p > 0.85 ? (1 - p) / 0.15 : 1;
  // pops out of the speaker's mouth: a little overshoot
  const pop = p < 0.12 ? 0.55 + 0.6 * (p / 0.12) : p < 0.2 ? 1.05 - 0.05 * ((p - 0.12) / 0.08) : 1;
  ctx.save();
  ctx.globalAlpha = a;
  const font = size => `italic 800 ${size}px ${FONT_UI}`;
  ctx.font = font(19);
  const maxW = Math.min(230, W * 0.62);
  const lines = wrap(ctx, b.text, maxW);
  const lh = 21, padX = 12, padY = 8;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2;
  const h = lines.length * lh + padY * 2 - 2;
  const lay = bubbleLayout({ tx: b.x, ty: b.y, w, h, W, H, safeTop: b.safeTop ?? 8 });
  let { x, y, below } = lay;
  if (b.ly == null) { const r = settle({ x, y, w, h }, taken, H); b.ly = r.y; b.moved = r.y !== y; }   // its spot, kept clear of the others
  y = b.ly;
  ctx.translate(b.x, b.y); ctx.scale(pop, pop); ctx.translate(-b.x, -b.y);   // (grows from the speaker's mouth)
  ctx.lineJoin = 'round';
  // the tail: from the near edge of the bubble to his mouth (not when the bubble had to move: it would cross the others)
  const edgeY = below ? y : y + h;
  const bx = Math.min(Math.max(b.x, x + 20), x + w - 20);
  const tail = () => {
    ctx.moveTo(bx - 9, edgeY); ctx.quadraticCurveTo(bx - 2, (edgeY + b.y) / 2, b.x, b.y); ctx.quadraticCurveTo(bx + 5, (edgeY + b.y) / 2, bx + 9, edgeY);
  };
  ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#fff8e6'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 13);
  if (!b.moved) tail();
  ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  // (the bubble's own outline would run across the tail's root: cover it)
  if (!b.moved) { ctx.fillStyle = '#fff8e6'; ctx.fillRect(bx - 8, below ? y - 1 : y + h - 3, 16, 5); }
  ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = font(19);
  lines.forEach((l, i) => ctx.fillText(l, x + padX, y + padY + 15 + i * lh));
  // who is speaking, on a tab in his team's colour
  if (b.name) {
    ctx.font = font(12.5);
    const nw = ctx.measureText(b.name.toUpperCase()).width + 14, nh = 17, nx = x + 10, ny = y - nh + 3;
    ctx.fillStyle = b.color || '#e8262b'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(b.name.toUpperCase(), nx + 7, ny + 13);
  }
  ctx.restore();
  return { x, y: y - (b.name ? 14 : 0), w, h: h + (b.name ? 14 : 0) };
}

function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawBurst(ctx, b, W, H) {
  const p = b.t / b.dur;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.translate(b.x, b.y);
  ctx.fillStyle = b.color;
  for (let i = 0; i < b.rays; i++) {
    const a = (i / b.rays) * Math.PI * 2 + i * 0.37;
    const r0 = 30 + p * 60, r1 = b.r * (0.6 + 0.4 * ((i * 7) % 5) / 5) * (0.7 + p * 0.6);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.05) * r0, Math.sin(a - 0.05) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a + 0.05) * r0, Math.sin(a + 0.05) * r0);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpeedLines(ctx, W, H, a) {
  ctx.save();
  ctx.globalAlpha = 0.35 * a;
  ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 2;
  const cx = W / 2, cy = H * 0.45, R = Math.hypot(W, H) / 2;
  const t = performance.now() / 60;
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2 + ((i * 13 + Math.floor(t)) % 7) * 0.02;
    const r0 = R * (0.72 + ((i * 5 + Math.floor(t)) % 4) * 0.05);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    ctx.lineTo(cx + Math.cos(ang) * R * 1.1, cy + Math.sin(ang) * R * 1.1);
    ctx.stroke();
  }
  ctx.restore();
}

// A pre-rendered halftone dot tile used on skies and comic panels.
export function halftonePattern(ctx, color = 'rgba(255,255,255,0.07)', gap = 9, r = 1.6) {
  const c = document.createElement('canvas');
  c.width = c.height = gap * 2;
  const g = c.getContext('2d');
  g.fillStyle = color;
  for (const [x, y] of [[gap / 2, gap / 2], [gap * 1.5, gap * 1.5]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  return ctx.createPattern(c, 'repeat');
}
