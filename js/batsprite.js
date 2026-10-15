// Hand-drawn batter frames (back view) for the batting and keeper cameras.
// One atlas drawn in Raja's kit; other heroes get the kit recoloured to their suit and trim.

const SRC = 'img/batter-raja.webp';
const REF_HEIGHT_PX = 286;   // helmet top to feet in the "ready" frame
const REF_HEIGHT_M = 1.72;   // that same stance in world metres (stumps reach mid-thigh)

// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const FRAMES = {
  ready: [0, 0, 183, 290, 91.2, 289, 1.0],
  leave1: [185, 0, 158, 333, 64.0, 332, 1.053],
  leave2: [345, 0, 119, 333, 46.2, 332, 1.08],
  backlift: [466, 0, 185, 327, 98.8, 326, 1.026],
  drive1: [653, 0, 234, 271, 94.8, 270, 1.053],
  drive2: [0, 335, 289, 265, 138.2, 264, 1.0],
  drive3: [291, 335, 124, 330, 81.8, 329, 1.08],
  pull0: [417, 335, 236, 272, 120.0, 271, 1.0],
  pull1: [655, 335, 198, 272, 81.2, 271, 1.026],
  pull2: [0, 667, 222, 263, 95.0, 262, 1.0],
  pull3: [224, 667, 172, 286, 66.2, 285, 1.08],
  def1: [398, 667, 196, 267, 107.8, 266, 0.976],
  def2: [596, 667, 155, 263, 74.8, 262, 0.93],
  def3: [753, 667, 199, 272, 103.2, 271, 1.0],
  cut1: [0, 955, 247, 287, 109.5, 286, 0.976],
  cut2: [249, 955, 263, 254, 107.0, 253, 0.952],
  cut3: [514, 955, 239, 253, 85.2, 252, 1.0],
  bowled: [755, 955, 215, 238, 107.5, 237, 0.976],
};

// frame, ms on screen. The swing starts when the finger lifts, which is the moment of contact,
// so the downswing is brief and the contact frame lands almost at once.
const SEQ = {
  drive: [['drive1', 45], ['drive2', 120], ['drive3', Infinity]],
  pull: [['pull0', 35], ['pull1', 45], ['pull2', 110], ['pull3', Infinity]],
  cut: [['cut1', 45], ['cut2', 120], ['cut3', Infinity]],
  block: [['def1', 60], ['def2', 220], ['def3', Infinity]],
  leave: [['leave1', 170], ['leave2', Infinity]],
  bowled: [['bowled', Infinity]], // beaten: looking back at the stumps
};
const BLEND_MS = 40;

// which animation a swipe plays: straight and cover drives, pulls to leg, cuts to off
export function shotAnim(shot) {
  if (!shot) return 'drive';
  if (shot.kind === 'block') return 'block';
  if (shot.kind === 'leave') return 'leave';
  if (shot.angle < -0.55) return 'pull';
  if (shot.angle > 0.95) return 'cut';
  return 'drive';
}

const RAJA = { suit: '#1f6fe0', trim: '#ffd23f' };
let atlas = null, ready = false;
const tinted = new Map();

export function loadBatSprites() {
  if (atlas) return;
  atlas = new Image();
  atlas.onload = () => { ready = true; };
  atlas.src = SRC;
}
export const batSpritesReady = () => ready;

function hexHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  return rgbHsv((n >> 16) & 255, (n >> 8) & 255, n & 255);
}
function rgbHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
function hsvRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Repaint the blue kit as the hero's suit and the yellow trim as their trim, keeping the shading.
function tintFor(look) {
  if (!look || (look.suit === RAJA.suit && look.trim === RAJA.trim)) return atlas;
  const key = look.suit + look.trim;
  if (tinted.has(key)) return tinted.get(key);
  const c = document.createElement('canvas');
  c.width = atlas.naturalWidth; c.height = atlas.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(atlas, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), p = img.data;
  const suit = hexHsv(look.suit), trim = hexHsv(look.trim);
  const refBlue = hexHsv(RAJA.suit), refGold = hexHsv(RAJA.trim);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 8) continue;
    const [h, s, v] = rgbHsv(p[i], p[i + 1], p[i + 2]);
    let to = null, ref = null;
    if (h > 200 && h < 250 && s > 0.4) { to = suit; ref = refBlue; }
    else if (h > 38 && h < 62 && s > 0.62 && v > 0.45) { to = trim; ref = refGold; }
    if (!to) continue;
    const ns = Math.min(1, to[1] * (s / ref[1]));
    const nv = Math.min(1, to[2] * (v / ref[2]));
    const [r, gg, b] = hsvRgb(to[0], ns, nv);
    p[i] = r; p[i + 1] = gg; p[i + 2] = b;
  }
  g.putImageData(img, 0, 0);
  tinted.set(key, c);
  return c;
}

// The frame (and the one before it, for a short cross-fade) for the batter right now.
export function batFrame(b, now) {
  if (b.anim === 'celebrate') return { f: 'drive3' };
  if (b.shot) {
    const seq = SEQ[b.shot.anim] || SEQ.drive;
    let t = now - b.shot.t0, prev = b.shot.from || 'backlift';
    for (const [f, ms] of seq) {
      if (t < ms) return { f, prev, a: Math.min(1, t / BLEND_MS) };
      t -= ms; prev = f;
    }
  }
  return { f: b.angle <= -2 ? 'backlift' : 'ready' };
}

function drawOne(ctx, img, name, px, py, k, alpha) {
  const [sx, sy, w, h, ax, ay, s] = FRAMES[name];
  const sc = k * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, sx, sy, w, h, px - ax * sc, py - ay * sc, w * sc, h * sc);
}

// Draw at the projected feet position (px, py); kPerM is pixels per metre at that depth.
export function drawBatSprite(ctx, px, py, kPerM, b, now, opts = {}) {
  if (!ready) return false;
  const img = tintFor(b.look);
  const k = kPerM * REF_HEIGHT_M / REF_HEIGHT_PX;
  const { f, prev, a = 1 } = batFrame(b, now);
  ctx.save();
  // ground shadow
  ctx.fillStyle = 'rgba(10,8,20,0.28)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.55 * kPerM, 0.12 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 22; }
  // the previous frame fades out underneath, which reads as motion blur on a fast swing
  if (prev && a < 1) drawOne(ctx, img, prev, px, py, k, (1 - a) * 0.6);
  drawOne(ctx, img, f, px, py, k, 1);
  ctx.restore();
  return true;
}
