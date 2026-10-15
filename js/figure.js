import { INK, FONT_DISPLAY } from './fx.js';

// Comic-style cricketers drawn from a handful of joints. Local units: feet at y = 0, head top ≈ −100.

const base = () => ({
  hipL: [-6, -48], hipR: [6, -48], kneeL: [-8, -25], kneeR: [8, -25], footL: [-10, 0], footR: [10, 0],
  shL: [-11, -78], shR: [11, -78], elL: [-16, -62], elR: [16, -62], hdL: [-15, -47], hdR: [15, -47],
  head: [0, -91], torsoTop: -82, torsoBot: -46, bat: null, gloves: false, rot: 0, lift: 0,
});

export const POSES = {
  stand: () => base(),

  // a: bat angle. 0 = bat pointing at the ground, −2.6 = full backlift, +2.4 = follow-through.
  bat(a) {
    const p = base();
    Object.assign(p, { hipL: [-7, -44], hipR: [7, -44], kneeL: [-11, -22], kneeR: [10, -22], footL: [-14, 0], footR: [13, 0] });
    const hx = 2 + 11 * Math.sin(a * 0.55), hy = -55 - 9 * Math.cos(a * 0.55);
    p.hdL = [hx - 2, hy]; p.hdR = [hx + 2, hy + 3];
    p.elL = [(p.shL[0] + hx) / 2 - 7, (p.shL[1] + hy) / 2 + 2];
    p.elR = [(p.shR[0] + hx) / 2 + 6, (p.shR[1] + hy) / 2 + 4];
    p.bat = { x: hx, y: hy, a };
    p.torsoTop = -79; p.torsoBot = -43; p.head = [0, -88];
    return p;
  },

  run(ph) {
    const p = base();
    const s = Math.sin(ph), c = Math.cos(ph);
    p.footL = [-4 + 13 * s, -Math.max(0, 9 * c)]; p.footR = [4 - 13 * s, -Math.max(0, -9 * c)];
    p.kneeL = [-5 + 9 * s + 4, -26]; p.kneeR = [5 - 9 * s + 4, -26];
    p.hdL = [-14 - 10 * s, -52]; p.hdR = [14 + 10 * s, -52];
    p.elL = [-16 - 5 * s, -64]; p.elR = [16 + 5 * s, -64];
    return p;
  },

  // p: 0 → 1 through the delivery stride. Right arm wheels over the top.
  bowl(t) {
    const p = base();
    const th = -2.6 + t * 5.0;
    p.hdR = [p.shR[0] + 30 * Math.sin(th), p.shR[1] - 30 * Math.cos(th)];
    p.elR = [p.shR[0] + 15 * Math.sin(th), p.shR[1] - 15 * Math.cos(th)];
    p.hdL = [-26 + t * 20, -96 + t * 40]; p.elL = [-20, -86 + t * 20];
    p.footL = [-14 - 6 * t, 0]; p.kneeL = [-12, -24]; p.footR = [12, -4 * (1 - t)]; p.kneeR = [10, -26];
    return p;
  },

  crouch() {
    const p = base();
    Object.assign(p, { hipL: [-7, -40], hipR: [7, -40], kneeL: [-13, -20], kneeR: [13, -20], footL: [-14, 0], footR: [14, 0],
      hdL: [-8, -44], hdR: [8, -44], elL: [-17, -56], elR: [17, -56], torsoTop: -74, torsoBot: -40, head: [0, -84] });
    return p;
  },

  keeper(reach = [0, 0]) {
    const p = base();
    Object.assign(p, { hipL: [-8, -30], hipR: [8, -30], kneeL: [-17, -20], kneeR: [17, -20], footL: [-15, 0], footR: [15, 0],
      torsoTop: -64, torsoBot: -30, head: [0, -74], shL: [-11, -61], shR: [11, -61] });
    const hx = reach[0], hy = -36 + reach[1];
    p.hdL = [hx - 6, hy]; p.hdR = [hx + 6, hy];
    p.elL = [(p.shL[0] + hx) / 2 - 8, (p.shL[1] + hy) / 2]; p.elR = [(p.shR[0] + hx) / 2 + 8, (p.shR[1] + hy) / 2];
    p.gloves = true;
    return p;
  },

  dive(dir) {
    const p = base();
    p.hdL = [-6, -122]; p.hdR = [6, -122]; p.elL = [-10, -102]; p.elR = [10, -102];
    p.footR = [6, 2]; p.kneeR = [8, -24];
    p.rot = dir * 1.2; p.lift = 12;
    return p;
  },

  celebrate() {
    const p = base();
    p.hdL = [-22, -118]; p.hdR = [22, -118]; p.elL = [-20, -98]; p.elR = [20, -98];
    return p;
  },

  sad() {
    const p = base();
    p.hdL = [-6, -92]; p.hdR = [6, -92]; p.elL = [-18, -82]; p.elR = [18, -82]; p.head = [0, -88];
    return p;
  },
};

// tag every pose with its name (and first argument) so sprite renderers know what it is
for (const [name, fn] of Object.entries(POSES)) POSES[name] = (...args) => Object.assign(fn(...args), { name, arg: args[0] });

// ---- colour helpers ----
const shadeCache = new Map();
export function shade(hex, k = 0.32) {
  const key = hex + k;
  if (shadeCache.has(key)) return shadeCache.get(key);
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.round(c * (1 - k)));
  const out = `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}
const RIM = 'rgba(255,248,214,0.85)';
const PAD = '#fff4da', PAD_SHADE = '#d9cfb5';

// A limb as a thick inked stroke with a cel-shaded side and a rim light.
function limb(ctx, a, b, c, color, w, lw, opts = {}) {
  const segs = [[a, b], [b, c]];
  const path = () => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); };
  ctx.strokeStyle = INK; ctx.lineWidth = w + lw * 2; path(); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; path(); ctx.stroke();
  for (const [p, q] of segs) {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L; // left normal
    ctx.strokeStyle = shade(color); ctx.lineWidth = w * 0.42;
    ctx.beginPath(); ctx.moveTo(p[0] + nx * w * 0.22, p[1] + ny * w * 0.22); ctx.lineTo(q[0] + nx * w * 0.22, q[1] + ny * w * 0.22); ctx.stroke();
    if (opts.rim !== false) {
      ctx.strokeStyle = RIM; ctx.lineWidth = w * 0.13;
      ctx.beginPath(); ctx.moveTo(p[0] - nx * w * 0.36, p[1] - ny * w * 0.36); ctx.lineTo(q[0] - nx * w * 0.36, q[1] - ny * w * 0.36); ctx.stroke();
    }
  }
}

// Batting pads over the shin, with the ridges and a knee roll.
function pad(ctx, k, f, lw) {
  ctx.strokeStyle = INK; ctx.lineWidth = 12 + lw * 2;
  ctx.beginPath(); ctx.moveTo(...k); ctx.lineTo(f[0], f[1] - 3); ctx.stroke();
  ctx.strokeStyle = PAD; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(...k); ctx.lineTo(f[0], f[1] - 3); ctx.stroke();
  const dx = f[0] - k[0], dy = f[1] - 3 - k[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  ctx.strokeStyle = PAD_SHADE; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(k[0] + nx * 3.5, k[1] + ny * 3.5); ctx.lineTo(f[0] + nx * 3.5, f[1] - 3 + ny * 3.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(18,13,28,0.45)'; ctx.lineWidth = 1.1;
  for (const t of [0.3, 0.55, 0.8]) {
    const cx = k[0] + dx * t, cy = k[1] + dy * t;
    ctx.beginPath(); ctx.moveTo(cx + nx * 5.5, cy + ny * 5.5); ctx.lineTo(cx - nx * 5.5, cy - ny * 5.5); ctx.stroke();
  }
}

function boot(ctx, f, look, lw) {
  ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(f[0], f[1] - 2.5, 7.5, 4.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(look.trim, 0.35); ctx.fillRect(f[0] - 7, f[1] - 1.2, 14, 1.6);
}

// Hero symbols for chest and cape.
export function emblem(ctx, x, y, r, look, sym, lw) {
  ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const c = look.suit;
  ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
  const k = r / 10;
  ctx.beginPath();
  switch (sym) {
    case 'bolt': [[2, -8], [-5, 1], [0, 1], [-3, 8], [5, -2], [0, -2], [3, -8]].forEach(([a, b], i) => (i ? ctx.lineTo(x + a * k, y + b * k) : ctx.moveTo(x + a * k, y + b * k))); ctx.closePath(); ctx.fill(); break;
    case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 3.4 : 7.6) * k; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); break;
    case 'crescent': ctx.arc(x, y, 6.5 * k, 0.5, Math.PI * 2 - 0.5); ctx.arc(x + 3 * k, y, 5 * k, Math.PI * 2 - 0.75, 0.75, true); ctx.closePath(); ctx.fill(); break;
    case 'swirl': ctx.arc(x, y, 6 * k, 0, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 3 * k, Math.PI, Math.PI * 2.6); ctx.stroke(); break;
    case 'eye': ctx.ellipse(x, y, 7 * k, 4 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = look.trim; ctx.beginPath(); ctx.arc(x, y, 2.2 * k, 0, Math.PI * 2); ctx.fill(); break;
    case 'hex': for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * 6.5 * k, y + Math.sin(a) * 6.5 * k); } ctx.closePath(); ctx.fill(); ctx.fillStyle = look.trim; ctx.beginPath(); ctx.arc(x, y, 2.6 * k, 0, Math.PI * 2); ctx.fill(); break;
    case 'wing': ctx.moveTo(x - 7 * k, y + 3 * k); ctx.lineTo(x, y - 4 * k); ctx.lineTo(x + 7 * k, y + 3 * k); ctx.moveTo(x - 5 * k, y + 7 * k); ctx.lineTo(x, y + 2 * k); ctx.lineTo(x + 5 * k, y + 7 * k); ctx.stroke(); break;
    case 'spring': ctx.moveTo(x - 6 * k, y + 6 * k); for (let i = 0; i < 5; i++) ctx.lineTo(x + (i % 2 ? 6 : -6) * k, y + (4 - i * 2.6) * k); ctx.stroke(); break;
    default: ctx.fillStyle = INK; ctx.font = `${r * 1.5}px ${FONT_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sym, x, y + r * 0.08);
  }
  ctx.lineCap = 'round';
}

// Hair styles drawn over the top of the head (front or back view).
export function hair(ctx, hx, hy, look, back, lw) {
  const st = look.style || 'short';
  ctx.fillStyle = look.hair; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  switch (st) {
    case 'spiky':
      [[-10, -1], [-11, -9], [-6, -7], [-5, -15], [0, -9], [4, -16], [6, -8], [11, -11], [10, -1]].forEach(([a, b], i) => (i ? ctx.lineTo(hx + a, hy + b) : ctx.moveTo(hx + a, hy + b)));
      ctx.quadraticCurveTo(hx, hy - 6, hx - 10, hy - 1); break;
    case 'long':
      ctx.moveTo(hx - 11, hy + 8); ctx.quadraticCurveTo(hx - 12, hy - 12, hx, hy - 11); ctx.quadraticCurveTo(hx + 12, hy - 12, hx + 11, hy + 8);
      ctx.lineTo(hx + 7, hy + (back ? 10 : -2)); ctx.quadraticCurveTo(hx, hy - 7, hx - 7, hy + (back ? 10 : -2)); ctx.closePath(); break;
    case 'ponytail':
      ctx.arc(hx, hy - 1, 10, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 7, hy - 6); ctx.quadraticCurveTo(hx + 20, hy - 4, hx + 15, hy + 10); ctx.quadraticCurveTo(hx + 14, hy, hx + 6, hy - 2); ctx.closePath(); break;
    case 'bun':
      ctx.arc(hx, hy - 1, 10, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy - 12, 4.5, 0, Math.PI * 2); break;
    case 'beard':
      ctx.arc(hx, hy - 1, 10, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
      if (!back) { ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx - 8, hy + 2); ctx.quadraticCurveTo(hx - 7, hy + 14, hx, hy + 15); ctx.quadraticCurveTo(hx + 7, hy + 14, hx + 8, hy + 2); ctx.quadraticCurveTo(hx, hy + 7, hx - 8, hy + 2); }
      break;
    case 'fins':
      ctx.arc(hx, hy - 1, 10.5, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = look.trim;
      ctx.beginPath(); ctx.moveTo(hx - 10, hy - 3); ctx.lineTo(hx - 17, hy - 12); ctx.lineTo(hx - 8, hy - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 10, hy - 3); ctx.lineTo(hx + 17, hy - 12); ctx.lineTo(hx + 8, hy - 9); ctx.closePath(); break;
    case 'swept':
      ctx.moveTo(hx - 10, hy - 1); ctx.quadraticCurveTo(hx - 9, hy - 13, hx + 4, hy - 12); ctx.lineTo(hx + 17, hy - 14); ctx.lineTo(hx + 10, hy - 7); ctx.lineTo(hx + 15, hy - 5); ctx.lineTo(hx + 10, hy - 1); ctx.quadraticCurveTo(hx, hy - 6, hx - 10, hy - 1); break;
    default:
      ctx.arc(hx, hy - 1, 10, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
}

// look: { suit, trim, cape, skin, hair, mask, style }. opts: { back, emblem, flip, noShadow, glow, helmet, batGlow, scale }
export function drawFigure(ctx, x, y, h, look, pose = POSES.stand(), opts = {}) {
  if (h < 3) return;
  const s = h / 100;
  const lw = Math.max(1.1 / s, 2.6);
  const P = pose;
  const small = h < 40; // far-away figures skip the fine detail
  ctx.save();
  ctx.translate(x, y);
  if (opts.flip) ctx.scale(-1, 1);
  ctx.scale(s, s);
  if (!opts.noShadow) {
    ctx.fillStyle = 'rgba(10,8,20,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 0, 25, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, -P.lift);
  if (P.rot) { ctx.translate(0, -40); ctx.rotate(P.rot); ctx.translate(0, 40); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 18 / s; }
  const helmet = !!opts.helmet;
  const pads = !!P.bat || opts.pads;

  const cape = () => {
    if (!look.cape) return;
    const sway = Math.sin(performance.now() / 260) * 3;
    const bottom = P.torsoBot + (opts.back ? 17 : 24);
    const pts = () => {
      ctx.beginPath();
      ctx.moveTo(P.shL[0] - 3, P.shL[1] - 1);
      ctx.lineTo(P.shR[0] + 3, P.shR[1] - 1);
      ctx.quadraticCurveTo(P.shR[0] + 15, P.torsoBot + 8, P.shR[0] + 11 + sway, bottom);
      ctx.lineTo(P.shL[0] - 13 + sway * 1.4, bottom + 4);
      ctx.quadraticCurveTo(P.shL[0] - 16, P.torsoBot + 8, P.shL[0] - 3, P.shL[1] - 1);
      ctx.closePath();
    };
    ctx.fillStyle = look.cape; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    pts(); ctx.fill();
    if (!small) {
      ctx.save(); pts(); ctx.clip();
      ctx.fillStyle = shade(look.cape, 0.38);
      ctx.fillRect(P.shL[0] - 20, P.shL[1] - 4, (P.shR[0] - P.shL[0]) * 0.45 + 14, bottom - P.shL[1] + 10);
      ctx.strokeStyle = 'rgba(8,10,40,0.45)'; ctx.lineWidth = 1.6;
      for (const fx of [-6, 3, 10]) { ctx.beginPath(); ctx.moveTo(fx, P.shL[1] + 4); ctx.quadraticCurveTo(fx - 4 + sway * 0.5, (P.shL[1] + bottom) / 2, fx - 2 + sway, bottom); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = lw; pts(); ctx.stroke();
    if (!small) {
      ctx.strokeStyle = look.trim; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(P.shR[0] + 11 + sway, bottom - 1); ctx.lineTo(P.shL[0] - 13 + sway * 1.4, bottom + 3); ctx.stroke();
    }
    if (opts.back && opts.emblem) emblem(ctx, sway * 0.3, (P.shL[1] + bottom) / 2, 8, look, opts.emblem, lw);
  };

  if (!opts.back) cape();
  // legs: thighs in the suit, then pads (batters) or boots
  if (pads) {
    limb(ctx, P.hipL, P.kneeL, P.kneeL, look.suit, 10.5, lw);
    limb(ctx, P.hipR, P.kneeR, P.kneeR, look.suit, 10.5, lw);
    pad(ctx, P.kneeL, P.footL, lw); pad(ctx, P.kneeR, P.footR, lw);
    if (!small) for (const k of [P.kneeL, P.kneeR]) { ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.roundRect(k[0] - 6.5, k[1] - 3, 13, 5, 2); ctx.fill(); ctx.stroke(); }
  } else {
    limb(ctx, P.hipL, P.kneeL, P.footL, look.suit, 10.5, lw);
    limb(ctx, P.hipR, P.kneeR, P.footR, look.suit, 10.5, lw);
  }
  boot(ctx, P.footL, look, lw); boot(ctx, P.footR, look, lw);

  // torso: a heroic V with a shaded side and a rim of floodlight
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(P.shL[0] - 4, P.torsoTop + 3);
    ctx.quadraticCurveTo(0, P.torsoTop - 4, P.shR[0] + 4, P.torsoTop + 3);
    ctx.lineTo(P.hipR[0] + 2, P.torsoBot);
    ctx.lineTo(P.hipL[0] - 2, P.torsoBot);
    ctx.closePath();
  };
  ctx.fillStyle = look.suit; torso(); ctx.fill();
  if (!small) {
    ctx.save(); torso(); ctx.clip();
    ctx.fillStyle = shade(look.suit);
    ctx.beginPath(); ctx.moveTo(P.shL[0] - 6, P.torsoTop - 4); ctx.lineTo(P.shL[0] + 7, P.torsoTop - 4); ctx.lineTo(P.hipL[0] + 3, P.torsoBot + 1); ctx.lineTo(P.hipL[0] - 6, P.torsoBot + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = RIM; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(P.shR[0] + 2.5, P.torsoTop + 4); ctx.lineTo(P.hipR[0] + 1, P.torsoBot - 1); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = lw; torso(); ctx.stroke();
  ctx.fillStyle = look.trim;
  ctx.fillRect(P.hipL[0] - 3, P.torsoBot - 5, P.hipR[0] - P.hipL[0] + 6, 5);
  ctx.strokeRect(P.hipL[0] - 3, P.torsoBot - 5, P.hipR[0] - P.hipL[0] + 6, 5);
  if (!opts.back && opts.emblem && !small) emblem(ctx, 0, (P.torsoTop + P.torsoBot) / 2 - 3, 7.5, look, opts.emblem, lw);
  if (opts.back) cape(); // seen from behind, the cape hangs over the back but under the arms and head

  // arms and gloves
  limb(ctx, P.shL, P.elL, P.hdL, look.suit, 8, lw);
  limb(ctx, P.shR, P.elR, P.hdR, look.suit, 8, lw);
  const gloveR = P.gloves ? 7.5 : P.bat ? 4.8 : 4.4;
  for (const hd of [P.hdL, P.hdR]) {
    ctx.fillStyle = P.gloves ? '#f3efe2' : look.trim; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(hd[0], hd[1], gloveR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // head: helmet for batters, otherwise hair and a mask
  const [hx, hy] = P.head;
  ctx.fillStyle = shade(look.skin, 0.15); ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.fillRect(hx - 3.5, hy + 6, 7, 6);
  ctx.fillStyle = look.skin;
  ctx.beginPath(); ctx.ellipse(hx, hy, 9.5, 10.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (helmet) {
    const hc = shade(look.suit, 0.25);
    ctx.fillStyle = hc;
    ctx.beginPath(); ctx.arc(hx, hy - 1, 11.5, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(hx + 11, hy + 5); ctx.lineTo(hx - 11, hy + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = look.trim; ctx.fillRect(hx - 2.2, hy - 12.5, 4.4, 14);
    ctx.fillRect(hx - 11.5, hy + 2, 23, 3.4); ctx.strokeRect(hx - 11.5, hy + 2, 23, 3.4);
    if (!opts.back) {
      ctx.strokeStyle = '#d9dee6'; ctx.lineWidth = 1.4;
      for (const yy of [hy + 7, hy + 10.5]) { ctx.beginPath(); ctx.moveTo(hx - 8, yy); ctx.lineTo(hx + 8, yy); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(hx - 4, hy + 5); ctx.lineTo(hx - 4, hy + 12); ctx.moveTo(hx + 4, hy + 5); ctx.lineTo(hx + 4, hy + 12); ctx.stroke();
    }
    if (!small) { ctx.strokeStyle = RIM; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hx, hy - 1, 10, -1.3, -0.2); ctx.stroke(); }
  } else {
    hair(ctx, hx, hy, look, !!opts.back, lw);
    if (!opts.back) {
      if (look.mask) {
        ctx.fillStyle = look.mask; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8;
        ctx.beginPath(); ctx.moveTo(hx - 10.5, hy - 3.5); ctx.lineTo(hx + 10.5, hy - 3.5); ctx.lineTo(hx + 9.5, hy + 2.5); ctx.lineTo(hx + 2, hy + 2); ctx.lineTo(hx, hy + 0.5); ctx.lineTo(hx - 2, hy + 2); ctx.lineTo(hx - 9.5, hy + 2.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath(); ctx.moveTo(hx - 7.5, hy + 0.8); ctx.lineTo(hx - 2.5, hy - 0.2); ctx.lineTo(hx - 3, hy - 2.4); ctx.lineTo(hx - 7.2, hy - 1.8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx + 7.5, hy + 0.8); ctx.lineTo(hx + 2.5, hy - 0.2); ctx.lineTo(hx + 3, hy - 2.4); ctx.lineTo(hx + 7.2, hy - 1.8); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(hx - 3.5, hy, 1.4, 0, Math.PI * 2); ctx.arc(hx + 3.5, hy, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      if (!small) { ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx - 3, hy + 6); ctx.quadraticCurveTo(hx + 1, hy + 7.5, hx + 4, hy + 5.5); ctx.stroke(); }
    } else if (look.mask) {
      ctx.strokeStyle = look.mask; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hx - 9, hy); ctx.lineTo(hx + 9, hy); ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;

  // bat
  if (P.bat) {
    const { x: bx, y: by, a } = P.bat;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-a);
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.fillStyle = '#2b2b33'; ctx.fillRect(-2, -4, 4, 14); ctx.strokeRect(-2, -4, 4, 14);
    if (opts.batGlow) { ctx.shadowColor = opts.batGlow; ctx.shadowBlur = 14 / s; }
    ctx.fillStyle = opts.batColor || '#f0c27a';
    ctx.beginPath(); ctx.roundRect(-5, 9, 10, 34, 3); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#c98a3e'; ctx.fillRect(-4, 11, 2.5, 30);
    ctx.fillStyle = look.trim; ctx.fillRect(-0.8, 13, 1.6, 26);
    if (opts.batGlow) {
      ctx.strokeStyle = opts.batGlow; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(-7.5, 6, 15, 40, 5); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

// A hero portrait on its own small canvas (for squad cards and buttons).
export function portrait(hero, size = 96, pose = 'celebrate') {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = size * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const P = pose === 'bat' ? POSES.bat(-1.4) : pose === 'bowl' ? POSES.bowl(0.45) : pose === 'keeper' ? POSES.keeper() : POSES.celebrate();
  drawFigure(g, size / 2, size * 0.98, size * 0.78, hero.look, P, { emblem: hero.emblem, noShadow: true });
  return c;
}
