// Hand-drawn front-view bowler (and fielders) for the batting camera.
// One sheet in the blue/yellow kit (img/bowler.webp, cut by tools/build_bowler_sprites.py),
// repainted at load to the bowling team's suit and trim colours.

const SRC = 'img/bowler.webp';
const REF_HEIGHT_PX = 323;  // the "start" stance, head to feet
const REF_HEIGHT_M = 1.85;
const SHEET = { suit: '#1f5fd6', trim: '#ffd23f' };

// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const FRAMES = {
  start: [0, 0, 149, 324, 74.0, 323, 1.0],
  run1: [151, 0, 140, 304, 56.5, 303, 1.0],
  run2: [293, 0, 127, 280, 42.0, 279, 1.0],
  run3: [422, 0, 136, 301, 45.0, 300, 1.0],
  gather: [560, 0, 109, 307, 52.0, 306, 1.0],
  coil: [671, 0, 181, 333, 90.0, 332, 1.0],
  release: [0, 335, 175, 273, 105.0, 272, 1.12],
  follow1: [177, 335, 146, 243, 74.5, 242, 1.12],
  follow2: [325, 335, 147, 236, 123.5, 235, 1.12],
  follow3: [474, 335, 149, 255, 47.5, 254, 1.12],
  finish: [625, 335, 120, 280, 59.5, 279, 1.12],
  field: [747, 335, 262, 227, 130.5, 226, 1.0],
  react: [0, 617, 219, 233, 109.0, 232, 1.0],
  celebrate1: [221, 617, 179, 239, 88.0, 238, 1.0],
  celebrate2: [402, 617, 229, 266, 114.0, 265, 1.0],
};
const RUN_CYCLE = ['run1', 'run2', 'run3', 'run2'];
// after release (ms of game time): release, follow-through, then he stands and watches
const DELIVERY = [['release', 90], ['follow1', 120], ['follow2', 140], ['follow3', 170], ['finish', Infinity]];

let atlas = null, ready = false;
const tinted = new Map();

export function loadBowlSprites() {
  if (atlas) return;
  atlas = new Image();
  atlas.onload = () => { ready = true; };
  atlas.src = SRC;
}

// Which frame the bowler shows. spr: { anim: 'start'|'run'|'deliver'|'react'|'celebrate', p, t0 }
export function bowlFrame(spr, gameTime, realTime) {
  if (!spr) return 'start';
  switch (spr.anim) {
    case 'run':
      return spr.p < 0.8 ? RUN_CYCLE[Math.floor(spr.p * 14) % 4] : spr.p < 0.9 ? 'gather' : 'coil';
    case 'deliver': {
      let t = (gameTime - spr.t0) * 1000;
      for (const [f, ms] of DELIVERY) { if (t < ms) return f; t -= ms; }
      return 'finish';
    }
    case 'react': return 'react';
    case 'celebrate': return realTime - spr.t0 < 650 ? 'celebrate2' : 'celebrate1';
    default: return 'start';
  }
}

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
const hexHsv = hex => { const n = parseInt(hex.slice(1), 16); return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255); };
function rgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// the sheet repainted in a team's kit: blue suit -> suit colour, yellow trim -> trim colour, shading kept
function sheetFor(team) {
  if (!team || (team.suit === SHEET.suit && team.trim === SHEET.trim) || team.id === 'thunder') return atlas;
  if (tinted.has(team.id)) return tinted.get(team.id);
  const c = document.createElement('canvas');
  c.width = atlas.naturalWidth; c.height = atlas.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(atlas, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), p = img.data;
  const suit = hexHsv(team.suit), trim = hexHsv(team.trim), rs = hexHsv(SHEET.suit), rt = hexHsv(SHEET.trim);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 8) continue;
    const [h, s, v] = hsv(p[i], p[i + 1], p[i + 2]);
    let to, ref;
    if (h > 200 && h < 250 && s > 0.4) { to = suit; ref = rs; }
    else if (h > 38 && h < 62 && s > 0.62 && v > 0.45) { to = trim; ref = rt; }
    else continue;
    const out = rgb(to[0], Math.min(1, to[1] * (s / ref[1])), Math.min(1, to[2] * (v / ref[2])));
    p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2];
  }
  g.putImageData(img, 0, 0);
  tinted.set(team.id, c);
  return c;
}

// Draw a frame with its feet at (px, py); kPerM is pixels per metre at that depth. False until loaded.
export function drawBowlSprite(ctx, px, py, kPerM, frame, team, flip = false) {
  if (!ready) return false;
  const img = sheetFor(team);
  const [sx, sy, w, h, ax, ay, s] = FRAMES[frame];
  const k = kPerM * REF_HEIGHT_M / REF_HEIGHT_PX * s;
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,20,0.26)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.5 * kPerM, 0.11 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(px, py);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, w, h, -ax * k, -ay * k, w * k, h * k);
  ctx.restore();
  return true;
}
