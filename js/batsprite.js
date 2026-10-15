// Hand-drawn batter frames (back view) for the batting and keeper cameras.
// One atlas drawn in Raja's kit; other heroes get the kit recoloured to their suit and trim.

const SRC = 'img/batter-raja.webp';
const REF_HEIGHT_PX = 286;   // helmet top to feet in the "ready" frame
const REF_HEIGHT_M = 1.72;   // that same stance in world metres (stumps reach mid-thigh)

// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const FRAMES = {
  ready: [0, 0, 187, 294, 93.2, 291, 1.0],
  leave1: [189, 0, 162, 337, 66.0, 334, 1.053],
  leave2: [353, 0, 123, 337, 48.2, 334, 1.08],
  backlift: [478, 0, 189, 331, 100.8, 328, 1.026],
  drive1: [669, 0, 238, 275, 96.8, 272, 1.053],
  drive2: [0, 339, 293, 269, 140.2, 266, 1.0],
  drive3: [295, 339, 128, 334, 83.8, 331, 1.08],
  pull0: [425, 339, 240, 276, 122.0, 273, 1.0],
  pull1: [667, 339, 202, 276, 83.2, 273, 1.026],
  pull2: [0, 675, 226, 267, 97.0, 264, 1.0],
  pull3: [228, 675, 176, 290, 68.2, 287, 1.08],
  def1: [406, 675, 200, 271, 109.8, 268, 0.976],
  def2: [608, 675, 159, 267, 76.8, 264, 0.93],
  def3: [769, 675, 203, 276, 105.2, 273, 1.0],
  cut1: [0, 967, 251, 291, 111.5, 288, 0.976],
  cut2: [253, 967, 267, 258, 109.0, 255, 0.952],
  cut3: [522, 967, 243, 257, 87.2, 254, 1.0],
};

// frame, ms on screen. The swing starts when the finger lifts, which is the moment of contact,
// so the downswing is brief and the contact frame lands almost at once.
const SEQ = {
  drive: [['drive1', 45], ['drive2', 120], ['drive3', Infinity]],
  pull: [['pull0', 35], ['pull1', 45], ['pull2', 110], ['pull3', Infinity]],
  cut: [['cut1', 45], ['cut2', 120], ['cut3', Infinity]],
  block: [['def1', 60], ['def2', 220], ['def3', Infinity]],
  leave: [['leave1', 170], ['leave2', Infinity]],
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
