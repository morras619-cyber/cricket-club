// Hand-drawn bowler and fielders: the front view faces the batting camera, the back view
// is seen from the bowling camera. Both sheets are in the blue/yellow kit (cut by
// tools/build_bowler_sprites.py) and repainted at load to the fielding team's colours.

const REF_HEIGHT_M = 1.85;  // the "start" stance, head to feet
const SHEET = { suit: '#1f5fd6', trim: '#ffd23f' };

// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const FRONT = {
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
// back view, one sheet per team (img/bowler-back-<team>.webp), each with its own cut
// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const BACK = {
  thunder: {
    start: [0, 0, 137, 318, 68.0, 317, 1.0],
    run1: [139, 0, 128, 295, 55.0, 294, 1.0],
    run2: [269, 0, 125, 291, 77.5, 290, 1.0],
    run3: [396, 0, 128, 303, 47.5, 302, 1.0],
    gather: [526, 0, 142, 324, 110.5, 323, 1.0],
    coil: [670, 0, 171, 339, 130.0, 338, 1.0],
    frontarm: [0, 341, 211, 338, 101.5, 337, 1.0],
    release: [213, 341, 242, 280, 108.5, 279, 1.12],
    follow1: [457, 341, 156, 224, 88.5, 223, 1.12],
    follow2: [615, 341, 194, 235, 100.5, 234, 1.12],
    follow3: [811, 341, 133, 253, 60.5, 252, 1.12],
    finish: [0, 681, 141, 272, 82.0, 271, 1.12],
    field: [143, 681, 220, 240, 109.5, 239, 1.0],
    react: [365, 681, 208, 241, 103.5, 240, 1.0],
    celebrate1: [575, 681, 207, 239, 108.5, 238, 1.0],
    celebrate2: [784, 681, 201, 262, 102.0, 261, 1.0],
  },
  cyclones: {
    start: [0, 0, 141, 318, 70.0, 317, 1.0],
    run1: [143, 0, 129, 296, 59.5, 295, 1.0],
    run2: [274, 0, 124, 294, 79.0, 293, 1.0],
    run3: [400, 0, 133, 301, 53.0, 300, 1.0],
    gather: [535, 0, 144, 323, 113.5, 322, 1.0],
    coil: [681, 0, 174, 339, 132.0, 338, 1.0],
    frontarm: [0, 341, 208, 338, 100.0, 337, 1.0],
    release: [210, 341, 239, 281, 110.0, 280, 1.12],
    follow1: [451, 341, 157, 231, 91.0, 230, 1.12],
    follow2: [610, 341, 196, 241, 104.5, 240, 1.12],
    follow3: [808, 341, 133, 254, 60.5, 253, 1.12],
    finish: [0, 681, 141, 275, 86.0, 274, 1.12],
    field: [143, 681, 237, 241, 118.0, 240, 1.0],
    react: [382, 681, 238, 247, 118.5, 246, 1.0],
    celebrate1: [622, 681, 215, 232, 116.5, 231, 1.0],
    celebrate2: [0, 958, 223, 264, 111.0, 263, 1.0],
  },
  vipers: {
    start: [0, 0, 141, 316, 70.0, 315, 1.0],
    run1: [143, 0, 129, 297, 59.0, 296, 1.0],
    run2: [274, 0, 127, 293, 78.0, 292, 1.0],
    run3: [403, 0, 129, 305, 49.0, 304, 1.0],
    gather: [534, 0, 144, 320, 109.0, 319, 1.0],
    coil: [680, 0, 172, 338, 130.0, 337, 1.0],
    frontarm: [0, 340, 210, 337, 100.0, 336, 1.0],
    release: [212, 340, 242, 281, 109.0, 280, 1.12],
    follow1: [456, 340, 158, 228, 91.5, 227, 1.12],
    follow2: [616, 340, 195, 239, 106.5, 238, 1.12],
    follow3: [813, 340, 132, 252, 59.0, 251, 1.12],
    finish: [0, 679, 140, 275, 83.0, 274, 1.12],
    field: [142, 679, 228, 239, 113.5, 238, 1.0],
    react: [372, 679, 236, 239, 117.5, 238, 1.0],
    celebrate1: [610, 679, 210, 240, 110.0, 239, 1.0],
    celebrate2: [0, 956, 208, 261, 103.5, 260, 1.0],
  },
  eagles: {
    start: [0, 0, 143, 316, 71.0, 315, 1.0],
    run1: [145, 0, 128, 298, 57.0, 297, 1.0],
    run2: [275, 0, 127, 294, 78.0, 293, 1.0],
    run3: [404, 0, 132, 308, 50.5, 307, 1.0],
    gather: [538, 0, 142, 326, 109.5, 325, 1.0],
    coil: [682, 0, 173, 338, 131.0, 337, 1.0],
    frontarm: [0, 340, 211, 337, 100.5, 336, 1.0],
    release: [213, 340, 243, 283, 110.0, 282, 1.12],
    follow1: [458, 340, 159, 230, 92.0, 229, 1.12],
    follow2: [619, 340, 196, 238, 104.5, 237, 1.12],
    follow3: [817, 340, 133, 254, 60.0, 253, 1.12],
    finish: [0, 679, 142, 276, 85.0, 275, 1.12],
    field: [144, 679, 233, 244, 116.0, 243, 1.0],
    react: [379, 679, 243, 246, 121.0, 245, 1.0],
    celebrate1: [624, 679, 209, 240, 108.5, 239, 1.0],
    celebrate2: [0, 957, 213, 266, 106.0, 265, 1.0],
  },
  phoenix: {
    start: [0, 0, 142, 316, 70.5, 315, 1.0],
    run1: [144, 0, 130, 296, 59.5, 295, 1.0],
    run2: [276, 0, 127, 293, 79.0, 292, 1.0],
    run3: [405, 0, 130, 308, 51.0, 307, 1.0],
    gather: [537, 0, 145, 324, 109.5, 323, 1.0],
    coil: [684, 0, 174, 338, 131.5, 337, 1.0],
    frontarm: [0, 340, 211, 337, 100.0, 336, 1.0],
    release: [213, 340, 245, 281, 112.0, 280, 1.12],
    follow1: [460, 340, 157, 229, 92.0, 228, 1.12],
    follow2: [619, 340, 196, 237, 105.0, 236, 1.12],
    follow3: [817, 340, 132, 250, 59.0, 249, 1.12],
    finish: [0, 679, 141, 275, 84.5, 274, 1.12],
    field: [143, 679, 231, 242, 115.0, 241, 1.0],
    react: [376, 679, 240, 243, 119.5, 242, 1.0],
    celebrate1: [618, 679, 210, 240, 109.0, 239, 1.0],
    celebrate2: [0, 956, 212, 264, 105.5, 263, 1.0],
  },
  titans: {
    start: [0, 0, 142, 315, 70.5, 314, 1.0],
    run1: [144, 0, 129, 297, 58.5, 296, 1.0],
    run2: [275, 0, 129, 293, 79.5, 292, 1.0],
    run3: [406, 0, 132, 307, 50.5, 306, 1.0],
    gather: [540, 0, 143, 324, 110.5, 323, 1.0],
    coil: [685, 0, 172, 337, 130.5, 336, 1.0],
    frontarm: [0, 339, 212, 338, 101.0, 337, 1.0],
    release: [214, 339, 244, 281, 109.0, 280, 1.12],
    follow1: [460, 339, 158, 229, 91.0, 228, 1.12],
    follow2: [620, 339, 198, 237, 106.0, 236, 1.12],
    follow3: [820, 339, 132, 251, 59.5, 250, 1.12],
    finish: [0, 679, 141, 274, 84.0, 273, 1.12],
    field: [143, 679, 231, 242, 115.0, 241, 1.0],
    react: [376, 679, 240, 243, 119.5, 242, 1.0],
    celebrate1: [618, 679, 210, 241, 109.0, 240, 1.0],
    celebrate2: [0, 955, 209, 264, 104.0, 263, 1.0],
  },
  storm: {
    start: [0, 0, 146, 318, 72.5, 317, 1.0],
    run1: [148, 0, 129, 298, 59.0, 297, 1.0],
    run2: [279, 0, 127, 294, 79.0, 293, 1.0],
    run3: [408, 0, 133, 308, 53.0, 307, 1.0],
    gather: [543, 0, 144, 324, 111.5, 323, 1.0],
    coil: [689, 0, 176, 339, 133.5, 338, 1.0],
    frontarm: [0, 341, 210, 338, 100.0, 337, 1.0],
    release: [212, 341, 245, 283, 112.0, 282, 1.12],
    follow1: [459, 341, 161, 230, 96.0, 229, 1.12],
    follow2: [622, 341, 196, 240, 107.0, 239, 1.12],
    follow3: [820, 341, 134, 255, 60.5, 254, 1.12],
    finish: [0, 681, 143, 275, 85.5, 274, 1.12],
    field: [145, 681, 236, 244, 117.5, 243, 1.0],
    react: [383, 681, 243, 248, 121.0, 247, 1.0],
    celebrate1: [628, 681, 218, 233, 118.0, 232, 1.0],
    celebrate2: [0, 958, 221, 265, 110.0, 264, 1.0],
  },
  royals: {
    start: [0, 0, 145, 318, 72.0, 317, 1.0],
    run1: [147, 0, 130, 299, 59.0, 298, 1.0],
    run2: [279, 0, 129, 294, 79.5, 293, 1.0],
    run3: [410, 0, 132, 307, 51.0, 306, 1.0],
    gather: [544, 0, 143, 323, 109.5, 322, 1.0],
    coil: [689, 0, 177, 338, 136.5, 337, 1.0],
    frontarm: [0, 340, 210, 336, 100.5, 335, 1.0],
    release: [212, 340, 245, 283, 112.0, 282, 1.12],
    follow1: [459, 340, 159, 231, 94.5, 230, 1.12],
    follow2: [620, 340, 197, 239, 108.0, 238, 1.12],
    follow3: [819, 340, 134, 254, 60.5, 253, 1.12],
    finish: [0, 678, 145, 276, 87.5, 275, 1.12],
    field: [147, 678, 233, 243, 116.0, 242, 1.0],
    react: [382, 678, 242, 245, 120.5, 244, 1.0],
    celebrate1: [626, 678, 212, 241, 110.5, 240, 1.0],
    celebrate2: [0, 956, 216, 266, 107.5, 265, 1.0],
  },
};
// the opposing batter seen from the bowling camera (tools/build_front_batter.py); same frame
// names as the back-view batter in batsprite.js, so batFrame() drives both
const BAT_FRONT = {
  ready: [0, 0, 177, 274, 92.0, 273, 1.1],
  leave1: [179, 0, 177, 292, 89.8, 291, 1.1],
  leave2: [358, 0, 235, 271, 92.2, 270, 1.1],
  backlift: [595, 0, 194, 301, 103.8, 300, 1.1],
  drive1: [791, 0, 152, 271, 44.8, 270, 1.1],
  drive2: [0, 303, 212, 268, 109.0, 267, 1.1],
  drive3: [214, 303, 172, 302, 74.0, 301, 1.1],
  pull0: [388, 303, 198, 287, 100.5, 286, 1.1],
  pull1: [588, 303, 195, 264, 96.2, 263, 1.1],
  pull2: [0, 607, 245, 267, 109.0, 266, 1.1],
  pull3: [247, 607, 188, 280, 139.2, 279, 1.053],
  def1: [437, 607, 178, 274, 91.0, 273, 1.1],
  def2: [617, 607, 129, 271, 64.8, 270, 1.1],
  def3: [748, 607, 193, 273, 95.2, 272, 1.1],
  cut1: [0, 889, 218, 265, 124.0, 264, 1.1],
  cut2: [220, 889, 273, 260, 121.5, 259, 1.1],
  cut3: [495, 889, 256, 259, 116.5, 258, 1.1],
  bowled: [753, 889, 171, 247, 97.5, 246, 1.1],
};
const VIEWS = {
  front: { src: 'img/bowler.webp', frames: FRONT, refPx: 323 },
  // the ready stance is 1.72 m tall, as for the back-view batter
  batfront: { src: 'img/batter-front.webp', frames: BAT_FRONT, refPx: Math.round(274 * 1.1 * 1.85 / 1.72) },
};
for (const [id, frames] of Object.entries(BACK)) {
  VIEWS['back-' + id] = { src: `img/bowler-back-${id}.webp`, frames, refPx: frames.start[5], own: true };
}
const RUN_CYCLE = ['run1', 'run2', 'run3', 'run2'];
// after release (ms of game time): release, follow-through, then he stands and watches
const DELIVERY = [['release', 90], ['follow1', 120], ['follow2', 140], ['follow3', 170], ['finish', Infinity]];

const tinted = new Map();

// the front sheet plus the back sheets of the teams in this match
export function loadBowlSprites(...teamIds) {
  for (const key of ['front', 'batfront', ...teamIds.map(id => 'back-' + id)]) {
    const v = VIEWS[key];
    if (!v || v.img) continue;
    v.img = new Image();
    v.img.onload = () => { v.ready = true; };
    v.img.src = v.src;
  }
}

// Which frame the bowler shows. spr: { anim: 'start'|'run'|'deliver'|'react'|'celebrate', p, t0 }
// The back view has a fuller load-up: gather, coil, then front arm up.
export function bowlFrame(spr, gameTime, realTime, view = 'front') {
  if (!spr) return 'start';
  switch (spr.anim) {
    case 'run':
      if (view === 'back') return spr.p < 0.74 ? RUN_CYCLE[Math.floor(spr.p * 14) % 4] : spr.p < 0.83 ? 'gather' : spr.p < 0.92 ? 'coil' : 'frontarm';
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
function sheetFor(view, team) {
  const atlas = VIEWS[view].img;
  if (VIEWS[view].own || !team || (team.suit === SHEET.suit && team.trim === SHEET.trim)) return atlas;
  const key = view + team.id;
  if (tinted.has(key)) return tinted.get(key);
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
  tinted.set(key, c);
  return c;
}

// Draw a frame with its feet at (px, py); kPerM is pixels per metre at that depth. False until loaded.
export function drawBowlSprite(ctx, px, py, kPerM, frame, team, flip = false, view = 'front') {
  if (view === 'back') view = 'back-' + (team?.id || 'thunder');
  const v = VIEWS[view];
  if (!v || !v.ready) return false;
  const img = sheetFor(view, team);
  const [sx, sy, w, h, ax, ay, s] = v.frames[frame];
  const k = kPerM * REF_HEIGHT_M / v.refPx * s;
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,20,0.26)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.5 * kPerM, 0.11 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(px, py);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, w, h, -ax * k, -ay * k, w * k, h * k);
  ctx.restore();
  return true;
}
