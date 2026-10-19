import { CFG } from './config.js';
import { INK, FONT_DISPLAY, FONT_BODY, halftonePattern } from './fx.js';
import { drawFigure, POSES } from './figure.js';
import { quality } from './quality.js';
import { groundOf } from './grounds.js';
import { teamById } from './teams.js';
import { GROUND_ART } from './groundart.js';

const { boundaryR: R, centerY: CY } = CFG.ground;

// ---------- 3D broadcast cameras ----------
// World: x lateral (+off side), y up, z along the pitch (striker's stumps at 0, bowler's at 20).
export class Cam3D {
  constructor(kind) { this.kind = kind; }
  resize(W, H) {
    this.W = W; this.H = H;
    const portrait = H > W;
    if (this.kind === 'bat') {
      Object.assign(this, { cx: 0.25, cy: 4.2, cz: -9.5, dir: 1, f: Math.min(H * 1.25, W * 2.7), hy: H * (portrait ? 0.3 : 0.22) });
    } else if (this.kind === 'bowl') {
      Object.assign(this, { cx: 0.2, cy: 2.6, cz: 34, dir: -1, f: Math.min(H * 1.9, W * 4), hy: H * (portrait ? 0.36 : 0.3) });
    } else {
      // high over-the-shoulder view so the keeper never hides the ball's path
      Object.assign(this, { cx: 0.55, cy: 4.6, cz: -9, dir: 1, f: Math.min(H * 0.85, W * 1.7), hy: H * (portrait ? 0.28 : 0.22) });
    }
    this.bg = null;
  }
  depth(z) { return this.dir > 0 ? z - this.cz : this.cz - z; }
  // the point on the ground (y = 0) at screen point (sx, sy), or null above the horizon
  groundAt(sx, sy) {
    const k = (sy - this.hy) / this.cy;
    if (k <= 0) return null;
    return { x: this.cx + (sx - this.W / 2) / (this.dir * k), z: this.cz + this.dir * (this.f / k) };
  }
  // the ground x under screen x, at depth z (where the ring sits)
  xAt(sx, z) {
    const k = this.f / this.depth(z);
    return this.cx + (sx - this.W / 2) / (this.dir * k);
  }
  project(x, y, z) {
    const d = this.depth(z);
    if (d < 0.4) return null;
    const k = this.f / d;
    return { x: this.W / 2 + this.dir * (x - this.cx) * k, y: this.hy + (this.cy - y) * k, k };
  }
}

function seeded(n) { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------- the home ground ----------
// The match is played at the home side's ground: its sky, crowd, colours, landmark and pitch.
let HOME = 'thunder';
let logo = null;
let groundListener = null;
export function setGround(teamId, onChange) {
  HOME = teamId;
  groundListener = onChange;
  logo = new Image();
  logo.onload = () => groundListener?.(); // repaint once the club's crest has loaded
  logo.src = `img/logo-${teamId}.webp`;
  loadArt(teamId);
  onChange?.();
}

// ---------- painted grounds ----------
// A club with painted art (js/groundart.js) gets its own stands, pitch, grass and stumps; the
// rest are painted by code below. The pieces load in the background: until they all have, the
// code-painted ground stands in.
const ART = {};
function loadArt(team) {
  const meta = GROUND_ART[team];
  if (!meta || ART[team]) return;
  const a = (ART[team] = { meta, ready: false });
  const files = { far: 'far', near: 'near', pitch: 'pitch', grass: 'grass', stumps: 'stumps', broken: 'stumps-broken' };
  // a ground built in Blender: one finished background per camera (tools/blender)
  for (const v of Object.keys(meta.views || {})) files['view-' + v] = 'view-' + v;
  if (meta.top) files.topView = 'view-top';
  let left = Object.keys(files).length + 1;
  const done = () => { if (--left === 0) { a.ready = true; if (HOME === team) groundListener?.(); } };
  for (const [k, f] of Object.entries(files)) { const im = new Image(); im.onload = done; im.onerror = () => { a.failed = true; }; im.src = `img/ground/${team}/${f}.webp`; a[k] = im; }
  a.logo = new Image(); a.logo.onload = done; a.logo.onerror = done; a.logo.src = 'img/menu/logo.webp';
}
// the average colour along the top of a stand picture, for the sky above it
function skyTop(art, side) {
  art.top = art.top || {};
  if (!art.top[side]) {
    const c = document.createElement('canvas'); c.width = 8; c.height = 1;
    const g = c.getContext('2d'), im = art[side];
    g.drawImage(im, 0, 0, im.naturalWidth, 6, 0, 0, 8, 1);
    const d = g.getImageData(0, 0, 8, 1).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < 32; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    art.top[side] = `rgb(${Math.round(r / 8)},${Math.round(gg / 8)},${Math.round(b / 8)})`;
  }
  return art.top[side];
}
const artFor = () => (ART[HOME]?.ready && !ART[HOME].failed ? ART[HOME] : null);

// The grass tile at halving sizes, so the far outfield is drawn from a small copy (no glitter).
const TILE_M = 20; // the grass tile covers 20 m: four 5 m mowing stripes
function grassMips(art) {
  if (art.mips) return art.mips;
  const out = [];
  let src = art.grass, size = art.grass.naturalWidth;
  while (size >= 8) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, size, size);
    out.push(c);
    src = c; size >>= 1;
  }
  return (art.mips = out);
}
const mipFor = (mips, pxPerM) => {
  let i = 0;
  while (i < mips.length - 1 && mips[i].width / TILE_M > pxPerM * 1.3) i++;
  return mips[i];
};

// The stand at the far end (or behind the batter, for the bowling view), its board's foot on the
// horizon; then the grass and pitch from the top-down art, laid into the camera's perspective one
// screen row at a time, so the ball and the players always meet the painted pitch.
function renderPainted(cam, art) {
  if (art.meta.views?.[cam.kind]) return renderBuilt(cam, art, art.meta.views[cam.kind], art['view-' + cam.kind]);
  const { W, H, hy } = cam;
  const G = groundOf(HOME), T = teamById(HOME);
  const night = NIGHT[G.time] ?? 1;
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.imageSmoothingQuality = 'high';

  const side = cam.dir > 0 ? 'far' : 'near', m = art.meta[side], img = art[side];
  // the middle 60% of the stand across a portrait screen (all of it is never narrower than the
  // screen), the board's foot on the horizon; open sky above it if the picture stops short
  const s = W / (m.w * Math.min(1, 0.6 * Math.max(1, (H / W) / 1.6)));
  const dw = m.w * s, dh = m.h * s, dx = (W - dw) / 2, dy = hy - m.board[1] * s;
  if (dy > 0) {
    const top = skyTop(art, side);
    const gr = g.createLinearGradient(0, 0, 0, dy + 2);
    gr.addColorStop(0, G.sky[0]); gr.addColorStop(1, top);
    g.fillStyle = gr; g.fillRect(0, 0, W, dy + 2);
    if (night >= 0.6) for (let i = 0; i < 40; i++) { const r = ((i * 7919) % 997) / 997, q = ((i * 104729) % 991) / 991; g.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * q})`; g.fillRect(r * W, q * dy, 1.3, 1.3); }
  }
  g.drawImage(img, dx, dy, dw, dh);
  if (dy > 0) {
    // melt the picture's top edge into the sky
    const gr = g.createLinearGradient(0, dy, 0, dy + dh * 0.14);
    gr.addColorStop(0, skyTop(art, side)); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, dy, W, dh * 0.14);
  }
  if (m.screen && art.logo.naturalWidth) {
    // the big screen shows the game's logo
    const [x0, y0, x1, y1] = m.screen.map((v, i) => (i % 2 ? dy : dx) + v * s);
    const sw = x1 - x0, sh = y1 - y0;
    let gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#0b1a4a'); gr.addColorStop(1, '#050a22');
    g.fillStyle = gr; g.fillRect(x0, y0, sw, sh);
    const lw = Math.min(sw * 0.86, sh * 0.8 * art.logo.naturalWidth / art.logo.naturalHeight);
    const lh = lw * art.logo.naturalHeight / art.logo.naturalWidth;
    g.drawImage(art.logo, x0 + (sw - lw) / 2, y0 + (sh - lh) / 2, lw, lh);
  }

  // the outfield and the pitch, row by row: each screen row is one line across the ground, cut
  // from the art (plain drawImage calls: pattern transforms are unreliable on iPhone Safari)
  const mips = grassMips(art);
  const pt = art.pitch, PZ0 = -2, PZ1 = 22, PX = 1.52; // the painted strip covers 24 m; its ragged sides are trimmed
  const ptx0 = pt.naturalWidth * 0.04, ptw = pt.naturalWidth * 0.92;
  const rowH = 1 / dpr;
  for (let y = hy; y < H; y += rowH) {
    const gp = cam.groundAt(W / 2, y + rowH / 2);
    if (!gp) continue;
    const d = cam.depth(gp.z), k = cam.f / d;
    const tex = mipFor(mips, k * dpr), TS = tex.width;
    const row = Math.min(TS - 1, Math.floor((((gp.z / TILE_M) * TS) % TS + TS) % TS));
    // the tiles across this row: tile n starts at world x = n·20 + o, so a dark stripe runs under
    // the pitch (seen from the other end the tile reads backwards: one stripe further over)
    const o = cam.dir > 0 ? -2.5 : -7.5;
    const xa = cam.xAt(0, gp.z), xb = cam.xAt(W, gp.z);
    const n0 = Math.floor((Math.min(xa, xb) - o) / TILE_M), n1 = Math.floor((Math.max(xa, xb) - o) / TILE_M);
    const tw = TILE_M * k;
    for (let n = n0; n <= n1; n++) {
      const sx = W / 2 + cam.dir * (n * TILE_M + o - cam.cx) * k;
      g.drawImage(tex, 0, row, TS, 1, cam.dir > 0 ? sx : sx - tw, y, tw + 0.6, rowH + 0.4);
    }
    if (gp.z > PZ0 && gp.z < PZ1) {
      const v = ((PZ1 - gp.z) / (PZ1 - PZ0)) * pt.naturalHeight;
      const a = cam.project(-PX, 0, gp.z), b = cam.project(PX, 0, gp.z);
      if (a && b) {
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
        const span = Math.max(1, (pt.naturalHeight / (PZ1 - PZ0)) * (rowH * d * d) / (cam.cy * cam.f));
        g.drawImage(pt, ptx0, Math.min(v, pt.naturalHeight - span), ptw, span, x0, y, x1 - x0, rowH + 0.4);
      }
    }
  }
  // an ink outline round the pitch, like everything else in the game
  const ends = [[-PX, PZ0], [PX, PZ0], [PX, PZ1], [-PX, PZ1]].map(([x, z]) => cam.project(x, 0, Math.max(z, cam.dir > 0 ? cam.cz + 1 : z)));
  if (ends.every(Boolean)) {
    g.save();
    g.strokeStyle = INK; g.lineJoin = 'round'; g.lineWidth = 1.4;
    g.beginPath(); ends.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.stroke();
    g.restore();
  }
  // floodlight pool after dark
  const pc = cam.project(0, 0, 10) || { x: W / 2, y: H * 0.6 };
  if (quality.high && night >= 0.6) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(pc.x, pc.y + H * 0.1, 20, pc.x, pc.y + H * 0.1, H * 0.45);
    gr.addColorStop(0, 'rgba(255,240,190,0.12)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr; g.fillRect(0, hy, W, H - hy); g.restore();
  }
  // rope, 30-yard circle and creases (crease lines are 5 cm wide)
  // the 30-yard circle (in the Power Burst only two fielders may stand outside it); the rope
  // shows only in the outfield view from above
  ring(g, cam, 27, 'rgba(255,255,255,0.5)', 1.6, [8, 7]);
  // creases, kept on the pitch: white, with a fine ink edge only where they're big enough to
  // carry one (far away an edge turns a crease into a stack of stripes)
  const crease = (x0, z0, x1, z1) => {
    const p = cam.project(0, 0, (z0 + z1) / 2);
    if (!p) return;
    const w = 0.045 * p.k;
    g.lineCap = 'butt';
    if (w >= 3) line(g, cam, x0, z0, x1, z1, 'rgba(20,16,24,0.7)', w + 1.2);
    line(g, cam, x0, z0, x1, z1, w >= 3 ? '#fffdf0' : 'rgba(255,253,240,0.7)', Math.max(0.9, w));
  };
  const PE = PX - 0.06;
  for (const [z, d] of [[0, 1], [20, -1]]) {
    crease(-PE, z + 1.22 * d, PE, z + 1.22 * d); // popping crease
    crease(-1.32, z, 1.32, z); // bowling crease, through the stumps
    for (const x of [-1.32, 1.32]) crease(x, z + 1.22 * d, x, z - 1.22 * d); // return creases
  }
  // vignette, darker after dark
  const gr = g.createRadialGradient(W / 2, H * 0.55, H * 0.32, W / 2, H * 0.55, H * 0.8);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(6,4,20,${0.12 + 0.22 * night})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);

  const bh = (m.board[1] - m.board[0]) * s;
  cam.board = { y: hy - bh, h: bh, painted: true };
  cam.layout = { roofY: Math.max(0, dy + dh * 0.42), standTop: dy + dh * 0.45, hy, spots: G.landmark === 'bolts' ? { lightning: true } : {} };
  return c;
}
// A ground rendered in Blender from this very camera (tools/blender/thunderdome.py): the picture
// was taken with focal length v.f px, the horizon v.above px from its top, so scaled by f / v.f and
// pinned on the horizon it lines up with everything the game projects (players, ball, stumps).
function renderBuilt(cam, art, v, im) {
  const { W, H, hy, f } = cam;
  const G = groundOf(HOME), night = NIGHT[G.time] ?? 1;
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.imageSmoothingQuality = 'high';
  const k = f / v.f, dw = v.w * k, dh = v.h * k, dx = W / 2 - dw / 2, dy = hy - v.above * k;
  if (dy > 0) {
    const gr = g.createLinearGradient(0, 0, 0, dy + 2);
    gr.addColorStop(0, G.sky[0]); gr.addColorStop(1, v.top);
    g.fillStyle = gr; g.fillRect(0, 0, W, dy + 2);
    if (night >= 0.6) for (let i = 0; i < 40; i++) { const r = ((i * 7919) % 997) / 997, q = ((i * 104729) % 991) / 991; g.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * q})`; g.fillRect(r * W, q * dy, 1.3, 1.3); }
  }
  if (dy + dh < H) { g.fillStyle = v.bottom; g.fillRect(0, dy + dh - 1, W, H - dy - dh + 1); }
  g.drawImage(im, dx, dy, dw, dh);
  if (dy > 0) {
    const gr = g.createLinearGradient(0, dy, 0, dy + dh * 0.06);
    gr.addColorStop(0, v.top); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, dy, W, dh * 0.06);
  }
  const gr = g.createRadialGradient(W / 2, H * 0.55, H * 0.32, W / 2, H * 0.55, H * 0.8);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(6,4,20,${0.1 + 0.18 * night})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // the boards along the far rope carry the scrolling words; the roof line for the sky effects
  const at = (r, h) => { const d = cam.depth(CY + cam.dir * r); return hy + (cam.cy - h) * f / d; };
  const by = at(v.board.r, v.board.h);
  cam.board = { y: by, h: at(v.board.r, 0) - by, painted: true };
  cam.layout = { roofY: Math.max(0, at(v.roof.r, v.roof.h)), standTop: at(v.roof.r, v.roof.h - 1.5), hy, spots: G.landmark === 'bolts' ? { lightning: true } : {} };
  return c;
}

export const groundTeam = () => HOME;
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `rgb(${c.join(',')})`;
};
const NIGHT = { night: 1, storm: 1, dusk: 0.7, evening: 0.6, sunset: 0.3, overcast: 0, day: 0 };

function renderBackground(cam) {
  const art = artFor();
  if (art) return renderPainted(cam, art);
  const { W, H, hy } = cam;
  const G = groundOf(HOME), T = teamById(HOME);
  const night = NIGHT[G.time] ?? 1;
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const hi = quality.high;
  const rnd = seeded(7 + HOME.length * 13);
  const boardH = 18;
  const standTop = hy - boardH - Math.min(H * 0.135, 112);
  const roofY = standTop - 26;
  const spots = {};

  // the sky: the ground's own time of day and weather
  let gr = g.createLinearGradient(0, 0, 0, roofY);
  gr.addColorStop(0, G.sky[0]); gr.addColorStop(0.6, G.sky[1]); gr.addColorStop(1, G.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, roofY + 2);
  if (night >= 0.6) for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${(0.2 + rnd() * 0.6) * night})`; g.fillRect(rnd() * W, rnd() * roofY * 0.6, 1.4, 1.4); }
  const mx = W * 0.8, my = Math.max(36, roofY * 0.32), mr = Math.min(30, W * 0.07);
  if (G.time === 'night' || G.time === 'evening' || G.time === 'dusk') {
    g.save(); if (hi) { g.shadowColor = '#ffe9a8'; g.shadowBlur = 36; }
    g.fillStyle = '#fff1c2'; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill(); g.restore();
    g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.stroke();
  } else if (G.time === 'day' || G.time === 'sunset') {
    const sy = G.time === 'sunset' ? roofY - 30 : my, sr = G.time === 'sunset' ? mr * 1.6 : mr * 1.1;
    g.save(); if (hi) { g.shadowColor = G.time === 'sunset' ? '#ff7a1a' : '#fff6b0'; g.shadowBlur = 50; }
    g.fillStyle = G.time === 'sunset' ? '#ffcf5a' : '#fff7c2'; g.beginPath(); g.arc(W * 0.22, sy, sr, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // clouds for the grey and stormy grounds, a few puffs on the sunny one
  const cloud = (x, y, s, col) => { g.fillStyle = col; for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.2, 0.8], [-0.9, 0.25, 0.75], [0.4, -0.45, 0.7], [-0.4, -0.35, 0.65]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } };
  if (G.time === 'overcast' || G.time === 'storm') {
    for (let i = 0; i < 9; i++) cloud(rnd() * W, rnd() * roofY * 0.55, 22 + rnd() * 30, G.time === 'storm' ? `rgba(40,16,80,${0.6 + rnd() * 0.3})` : `rgba(${200 + rnd() * 30},${206 + rnd() * 30},${212 + rnd() * 30},0.85)`);
  } else if (G.time === 'day') {
    for (let i = 0; i < 4; i++) cloud(W * (0.35 + i * 0.18), roofY * (0.18 + (i % 2) * 0.12), 14 + rnd() * 8, 'rgba(255,255,255,0.9)');
  }

  // the skyline behind the ground (mountains at Eagle's Nest)
  if (G.landmark === 'eagle') {
    g.fillStyle = G.skyline;
    g.beginPath(); g.moveTo(0, roofY);
    for (let x = 0; x <= W; x += W / 7) g.lineTo(x + W / 14, roofY - 40 - rnd() * Math.min(80, roofY * 0.5)), g.lineTo(x + W / 7, roofY - 20 - rnd() * 20);
    g.lineTo(W, roofY); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
  } else {
    for (let x = -10; x < W;) {
      const w = 18 + rnd() * 26, h = 24 + rnd() * Math.min(70, roofY * 0.55);
      g.fillStyle = G.skyline; g.fillRect(x, roofY - h, w, h + 4);
      if (G.windows.length) for (let wy = roofY - h + 6; wy < roofY - 4; wy += 7) for (let wx = x + 4; wx < x + w - 4; wx += 6) {
        if (rnd() < 0.33) { g.fillStyle = G.windows[rnd() < 0.7 ? 0 : G.windows.length - 1]; g.fillRect(wx, wy, 2.4, 3); }
      }
      x += w + 2;
    }
  }
  drawLandmark(g, G.landmark, { W, roofY, standTop, hy, rnd, T, spots, hi });

  // the roof: a fascia in the club's colours with its crest and the ground's name
  g.fillStyle = shade(T.suit, -0.7); g.fillRect(0, roofY, W, standTop - roofY);
  g.strokeStyle = shade(T.suit, -0.4); g.lineWidth = 1.5;
  for (let i = -20; i < W + 20; i += 14) { g.beginPath(); g.moveTo(i, roofY); g.lineTo(i + 10, standTop - 2); g.stroke(); }
  g.fillStyle = T.suit; g.fillRect(0, standTop - 9, W, 9);
  g.fillStyle = T.trim; g.fillRect(0, standTop - 9, W, 2.5);
  g.fillStyle = '#0d0a24'; g.fillRect(0, standTop - 1, W, 2);
  const name = G.name.toUpperCase();
  g.font = `${Math.min(17, (standTop - roofY) * 0.7)}px ${FONT_DISPLAY}`;
  const tw = g.measureText(name).width, lw = Math.min(30, standTop - roofY + 6);
  const px = W / 2 - (tw + lw + 10) / 2, py = roofY + (standTop - 9 - roofY) / 2;
  g.fillStyle = shade(T.suit, -0.55); g.fillRect(px - 8, roofY + 1, tw + lw + 26, standTop - roofY - 10);
  if (logo?.complete && logo.naturalWidth) g.drawImage(logo, px, py - lw / 2, lw, lw);
  g.fillStyle = T.trim === '#ffffff' || T.trim === '#1c1c1c' || T.trim === '#1a1a1a' ? '#fff4da' : T.trim;
  g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(name, px + lw + 6, py + 1);

  // two tiers of crowd, mostly in home colours
  const mid = standTop + (hy - boardH - standTop) * 0.5;
  const mix = ['#ffd23f', '#e8343b', '#3ec6ff', '#fff4da', '#2ecc71', '#ff8ad8', '#ff9f1c', '#7a3fe0'];
  const home = [T.suit, T.suit, T.trim, shade(T.suit, 0.3)];
  const base = night >= 0.6 ? 0 : 0.25;
  const tier = (y0, y1, col) => {
    g.fillStyle = col; g.fillRect(0, y0, W, y1 - y0);
    const step = hi ? 4.2 : 6;
    for (let yy = y0 + 3; yy < y1 - 2; yy += step) for (let xx = (yy * 7) % 4; xx < W; xx += step) {
      const lit = night ? 0.45 + 0.55 * Math.exp(-((xx - W / 2) ** 2) / (W * W * 0.17)) : 0.9;
      g.globalAlpha = lit * (0.55 + rnd() * 0.45);
      g.fillStyle = rnd() < 0.68 ? home[Math.floor(rnd() * home.length)] : mix[Math.floor(rnd() * mix.length)];
      g.beginPath(); g.arc(xx + rnd(), yy + rnd(), 1.5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y1 - 3, W, 3);
  };
  tier(standTop, mid - 2, base ? shade(T.suit, -0.55) : shade(T.suit, -0.78));
  tier(mid + 2, hy - boardH, base ? shade(T.suit, -0.5) : shade(T.suit, -0.72));
  const flag = (fx, fy, col) => {
    g.strokeStyle = '#fff4da'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 16); g.stroke();
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(fx, fy - 16); g.lineTo(fx + 13, fy - 12); g.lineTo(fx, fy - 8); g.closePath(); g.fill(); g.stroke();
  };
  for (let i = 0; i < Math.round(W / 55); i++) flag(20 + rnd() * (W - 40), standTop + 18 + rnd() * (hy - boardH - standTop - 20), i % 2 ? T.suit : T.trim);
  const banner = (bx, by, text, fg, rot) => {
    g.save(); g.translate(bx, by); g.rotate(rot);
    g.font = `15px ${FONT_DISPLAY}`; const w = g.measureText(text).width + 16;
    g.fillStyle = '#fff4da'; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(-w / 2, -10, w, 20); g.strokeRect(-w / 2, -10, w, 20);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 1); g.restore();
  };
  const cheer = `GO ${T.name.split(' ').slice(-1)[0].toUpperCase()}!`;
  banner(W * 0.3, mid + 18, cheer, T.suit === '#ffcf1a' ? '#1a1a1a' : T.suit, -0.06);

  // floodlights (lit only after dark) — the Thunderdome's are lightning bolts
  const towers = [W * 0.08, W * 0.92];
  const headY = Math.max(24, roofY - 46);
  if (hi && night >= 0.6) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const lx of towers) {
      const dir = lx < W / 2 ? 1 : -1;
      for (const [spread, a] of [[W * 0.38, 0.06], [W * 0.23, 0.06], [W * 0.1, 0.07]]) {
        g.fillStyle = `rgba(255,236,190,${a * night})`;
        g.beginPath(); g.moveTo(lx, headY + 12); g.lineTo(W / 2 - dir * 20 - spread, H * 0.64); g.lineTo(W / 2 - dir * 20 + spread, H * 0.64); g.closePath(); g.fill();
      }
    }
    g.restore();
  }
  for (const lx of towers) {
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(lx, headY + 20); g.lineTo(lx, standTop); g.stroke();
    g.save(); if (hi && night >= 0.6) { g.shadowColor = '#fff3c4'; g.shadowBlur = 28; }
    g.fillStyle = night >= 0.6 ? '#fffbe8' : '#c9ccd6'; g.strokeStyle = INK; g.lineWidth = 2.5;
    if (G.landmark === 'bolts') {
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.moveTo(lx + 4, headY - 30); g.lineTo(lx - 16, headY + 4); g.lineTo(lx - 2, headY + 4); g.lineTo(lx - 8, headY + 30); g.lineTo(lx + 16, headY - 6); g.lineTo(lx + 2, headY - 6); g.lineTo(lx + 10, headY - 30); g.closePath(); g.fill(); g.stroke();
    } else {
      g.beginPath(); g.moveTo(lx - 24, headY); g.lineTo(lx + 24, headY); g.lineTo(lx + 20, headY + 24); g.lineTo(lx - 20, headY + 24); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }

  // grass in the ground's own green, mowing stripes, and a crest painted on the outfield
  gr = g.createLinearGradient(0, hy, 0, H);
  gr.addColorStop(0, G.grass[0]); gr.addColorStop(0.5, G.grass[1]); gr.addColorStop(1, G.grass[0]);
  g.fillStyle = gr; g.fillRect(0, hy, W, H - hy);
  const near = cam.dir > 0 ? cam.cz + 1 : cam.cz - 1;
  const far = cam.dir > 0 ? cam.cz + 90 : cam.cz - 90;
  const step = 5 * cam.dir;
  let i = 0;
  for (let z = Math.round(near / 5) * 5; cam.dir > 0 ? z < far : z > far; z += step, i++) {
    if (i % 2) continue;
    const a = cam.project(-90, 0, z), b = cam.project(90, 0, z), c2 = cam.project(90, 0, z + step), d = cam.project(-90, 0, z + step);
    if (!a || !c2) continue;
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c2.x, c2.y); g.lineTo(d.x, d.y); g.fill();
  }
  if (logo?.complete && logo.naturalWidth) {
    const zc = cam.dir > 0 ? 40 : -16;
    const front = cam.project(0, 0, zc - 6 * cam.dir), back = cam.project(0, 0, zc + 6 * cam.dir), mid0 = cam.project(0, 0, zc);
    if (front && back && mid0) {
      const w = 14 * mid0.k, h = Math.abs(front.y - back.y);
      g.save(); g.globalAlpha = 0.28; g.drawImage(logo, mid0.x - w / 2, Math.min(front.y, back.y), w, h); g.restore();
    }
  }
  const pc = cam.project(0, 0, 10) || { x: W / 2, y: H * 0.6 };
  if (hi && night >= 0.6) {
    g.save(); g.globalCompositeOperation = 'lighter';
    gr = g.createRadialGradient(pc.x, pc.y + H * 0.1, 20, pc.x, pc.y + H * 0.1, H * 0.4);
    gr.addColorStop(0, 'rgba(255,240,190,0.2)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr; g.fillRect(0, hy, W, H - hy); g.restore();
  }
  // rope (home colours) and the 30-yard circle
  ring(g, cam, R, T.trim === '#1c1c1c' || T.trim === '#1a1a1a' ? T.suit : T.trim, 3, []);
  ring(g, cam, 27, 'rgba(255,255,255,0.45)', 1.5, [6, 6]);

  // the pitch in its own colour: dust and cracks on the turner, a green tinge on the seamer
  quad(g, cam, -1.5, 1.5, -1.6, 21.6, G.pitchCol);
  const corners = [[-1.5, -1.6], [1.5, -1.6], [1.5, 21.6], [-1.5, 21.6]].map(([x, z]) => cam.project(x, 0, z));
  if (corners.every(Boolean)) {
    g.save(); g.beginPath(); corners.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.clip();
    const green = G.pitch.id === 'green';
    for (let n = 0; n < (hi ? 1400 : 500); n++) {
      const x = -1.5 + rnd() * 3, z = -1.6 + rnd() * 23.2, p = cam.project(x, 0, z);
      if (!p) continue;
      g.fillStyle = green ? (rnd() < 0.6 ? 'rgba(40,110,40,0.3)' : 'rgba(255,240,200,0.15)') : rnd() < 0.5 ? 'rgba(120,80,30,0.18)' : 'rgba(255,240,200,0.22)';
      const sz = Math.max(1, p.k * 0.035);
      g.fillRect(p.x, p.y, sz * 1.4, sz);
    }
    if (G.pitch.id === 'turner') {
      g.strokeStyle = 'rgba(90,55,20,0.55)'; g.lineWidth = 1;
      for (let n = 0; n < 26; n++) {
        let x = -1.3 + rnd() * 2.6, z = rnd() * 21;
        let p = cam.project(x, 0, z);
        if (!p) continue;
        g.beginPath(); g.moveTo(p.x, p.y);
        for (let s = 0; s < 4; s++) { x += (rnd() - 0.5) * 0.4; z += (rnd() - 0.5) * 0.8; p = cam.project(x, 0, z); if (p) g.lineTo(p.x, p.y); }
        g.stroke();
      }
    }
    quad(g, cam, -0.45, 0.45, 0, 20, 'rgba(160,110,50,0.18)');
    g.restore();
  }
  quad(g, cam, -1.5, 1.5, -1.6, 21.6, null, 'rgba(20,16,24,0.55)');
  for (const z of [1.22, 20 - 1.22]) line(g, cam, -1.4, z, 1.4, z, '#fffbe8', 2);
  for (const z of [0, 20]) line(g, cam, -1.4, z, 1.4, z, '#fffbe8', 1.5);
  for (const x of [-1.32, 1.32]) { line(g, cam, x, -1.2, x, 2.4, '#fffbe8', 1.5); line(g, cam, x, 17.6, x, 21.2, '#fffbe8', 1.5); }

  // vignette, darker after dark
  gr = g.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.78);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(6,4,20,${0.2 + 0.3 * night})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  cam.board = { y: hy - boardH, h: boardH };
  cam.layout = { roofY, standTop, hy, spots };
  return c;
}

// The landmark that tells you whose ground it is, painted above the stands.
function drawLandmark(g, kind, { W, roofY, standTop, rnd, T, spots, hi }) {
  g.lineJoin = 'round';
  if (kind === 'turbines') {
    // wind turbine towers (the blades turn in drawAtmosphere)
    spots.turbines = [];
    for (const fx of [0.18, 0.42, 0.7]) {
      const x = W * fx, top = roofY - Math.min(90, roofY * 0.65) * (0.8 + rnd() * 0.25);
      g.strokeStyle = '#eef2f4'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, roofY); g.lineTo(x, top); g.stroke();
      g.strokeStyle = 'rgba(20,16,24,0.5)'; g.lineWidth = 1; g.stroke();
      spots.turbines.push({ x, y: top, r: Math.min(30, roofY * 0.25) });
    }
  } else if (kind === 'snake') {
    // a huge coiled snake lying along the roof, fangs out, eyes glowing
    const y0 = roofY - 6;
    g.strokeStyle = INK; g.lineWidth = 22; g.lineCap = 'round';
    const end = W * 0.66;
    const path = () => { g.beginPath(); g.moveTo(-20, y0); for (let x = -20; x <= end; x += 6) g.lineTo(x, y0 - 16 * Math.sin(x / 38) - 8); };
    g.lineWidth = 26; path(); g.stroke();
    g.strokeStyle = '#e8262b'; g.lineWidth = 20; path(); g.stroke();
    g.strokeStyle = '#1f1f26'; g.lineWidth = 8; g.setLineDash([12, 10]); path(); g.stroke(); g.setLineDash([]);
    const hx = end + 6, hyy = y0 - 16 * Math.sin(end / 38) - 12;
    g.fillStyle = '#e8262b'; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(hx + 12, hyy - 6, 24, 15, -0.3, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#fff4da';
    g.beginPath(); g.moveTo(hx + 22, hyy + 4); g.lineTo(hx + 25, hyy + 16); g.lineTo(hx + 28, hyy + 3); g.fill();
    g.beginPath(); g.moveTo(hx + 30, hyy + 1); g.lineTo(hx + 33, hyy + 12); g.lineTo(hx + 35, hyy - 1); g.fill();
    g.strokeStyle = '#e8262b'; g.lineWidth = 2; g.beginPath(); g.moveTo(hx + 34, hyy - 4); g.lineTo(hx + 46, hyy - 2); g.lineTo(hx + 50, hyy - 7); g.moveTo(hx + 46, hyy - 2); g.lineTo(hx + 51, hyy + 2); g.stroke();
    spots.eyes = [{ x: hx + 14, y: hyy - 11 }, { x: hx + 24, y: hyy - 14 }];
    g.lineCap = 'butt';
  } else if (kind === 'eagle') {
    // a golden eagle statue, wings spread, on a plinth above the stand
    const x = W * 0.6, base = roofY, s = Math.min(1.2, roofY / 110);
    g.fillStyle = '#9a7a3a'; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.fillRect(x - 16 * s, base - 22 * s, 32 * s, 22 * s); g.strokeRect(x - 16 * s, base - 22 * s, 32 * s, 22 * s);
    const by = base - 22 * s;
    g.fillStyle = '#ffcf1a';
    g.beginPath();
    g.moveTo(x, by - 40 * s);
    g.quadraticCurveTo(x - 40 * s, by - 80 * s, x - 78 * s, by - 62 * s);
    for (let k = 0; k < 5; k++) g.lineTo(x - (70 - k * 11) * s, by - (50 - k * 6) * s + (k % 2 ? 6 * s : 0));
    g.lineTo(x - 10 * s, by - 18 * s); g.lineTo(x - 6 * s, by);
    g.lineTo(x + 6 * s, by); g.lineTo(x + 10 * s, by - 18 * s);
    for (let k = 4; k >= 0; k--) g.lineTo(x + (70 - k * 11) * s, by - (50 - k * 6) * s + (k % 2 ? 6 * s : 0));
    g.lineTo(x + 78 * s, by - 62 * s);
    g.quadraticCurveTo(x + 40 * s, by - 80 * s, x, by - 40 * s);
    g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(x, by - 46 * s, 9 * s, 11 * s, 0, 0, Math.PI * 2); g.fillStyle = '#fff4da'; g.fill(); g.stroke();
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(x + 4 * s, by - 46 * s); g.lineTo(x + 16 * s, by - 42 * s); g.lineTo(x + 4 * s, by - 40 * s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(x + 2 * s, by - 49 * s, 1.8 * s, 0, Math.PI * 2); g.fill();
  } else if (kind === 'cauldrons') {
    // fire cauldrons on the roof (the flames burn in drawAtmosphere)
    spots.cauldrons = [];
    for (const fx of [0.2, 0.5, 0.8]) {
      const x = W * fx, y = roofY - 4;
      g.fillStyle = '#2a1a14'; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x - 18, y - 16); g.lineTo(x + 18, y - 16); g.lineTo(x + 11, y); g.lineTo(x - 11, y); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#f2711c'; g.fillRect(x - 18, y - 18, 36, 4); g.strokeRect(x - 18, y - 18, 36, 4);
      spots.cauldrons.push({ x, y: y - 18 });
    }
  } else if (kind === 'foundry') {
    // steel girders, a crane and smokestacks
    g.strokeStyle = '#5a6270'; g.lineWidth = 3;
    for (const fx of [0.12, 0.88]) {
      const x = W * fx, top = roofY - Math.min(80, roofY * 0.6);
      g.strokeRect(x - 10, top, 20, roofY - top);
      for (let y = top; y < roofY; y += 12) { g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y + 12); g.moveTo(x + 10, y); g.lineTo(x - 10, y + 12); g.stroke(); }
    }
    const cx = W * 0.62, ct = roofY - Math.min(100, roofY * 0.75);
    g.strokeStyle = '#ffb347'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, roofY); g.lineTo(cx, ct); g.lineTo(cx - W * 0.22, ct + 8); g.moveTo(cx, ct); g.lineTo(cx + 26, ct + 6); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - W * 0.2, ct + 8); g.lineTo(cx - W * 0.2, ct + 34); g.stroke();
    g.fillStyle = '#ffb347'; g.fillRect(cx - W * 0.2 - 6, ct + 34, 12, 8);
    spots.stacks = [];
    for (const fx of [0.3, 0.4]) {
      const x = W * fx, top = roofY - Math.min(70, roofY * 0.5);
      g.fillStyle = '#3a3f48'; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(x - 7, top, 14, roofY - top); g.strokeRect(x - 7, top, 14, roofY - top);
      g.fillStyle = '#e8343b'; g.fillRect(x - 7, top + 6, 14, 4);
      spots.stacks.push({ x, y: top });
    }
  } else if (kind === 'storm') {
    // the eye of the storm: a swirling vortex of lit cloud over the ground
    const x = W * 0.5, y = roofY * 0.42, r = Math.min(W * 0.32, roofY * 0.5);
    for (let k = 0; k < 5; k++) {
      g.strokeStyle = ['#b98cff', '#8f5ce0', '#d9c2ff', '#7a3fe0', '#f2b21b'][k]; g.lineWidth = 7 - k; g.globalAlpha = 0.85;
      g.beginPath();
      for (let a = 0; a < Math.PI * 3.2; a += 0.08) {
        const rr = r * (1 - a / (Math.PI * 3.6)) * (1 - k * 0.06), ang = a + k * 1.25;
        const px = x + Math.cos(ang) * rr * 1.5, py = y + Math.sin(ang) * rr * 0.55;
        if (a === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = '#f2b21b'; g.beginPath(); g.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2); g.fill();
    spots.rain = true; spots.eye = { x, y };
  } else if (kind === 'palace') {
    // palace domes and spires, strung with bunting
    const dome = (x, w, h, col) => {
      g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.fillRect(x - w / 2, roofY - h * 0.45, w, h * 0.45); g.strokeRect(x - w / 2, roofY - h * 0.45, w, h * 0.45);
      g.beginPath(); g.moveTo(x - w / 2, roofY - h * 0.45); g.quadraticCurveTo(x - w / 2, roofY - h, x, roofY - h * 1.15); g.quadraticCurveTo(x + w / 2, roofY - h, x + w / 2, roofY - h * 0.45); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, roofY - h * 1.15); g.lineTo(x, roofY - h * 1.35); g.stroke();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, roofY - h * 1.37, 3, 0, Math.PI * 2); g.fill();
    };
    const h = Math.min(80, roofY * 0.55);
    dome(W * 0.5, 70, h * 1.1, '#ec2f9a'); dome(W * 0.32, 40, h * 0.75, '#f6c6e0'); dome(W * 0.68, 40, h * 0.75, '#f6c6e0');
    dome(W * 0.15, 26, h * 0.55, '#ec2f9a'); dome(W * 0.85, 26, h * 0.55, '#ec2f9a');
    g.strokeStyle = '#fff4da'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, roofY - 30); g.quadraticCurveTo(W * 0.25, roofY - 8, W * 0.5, roofY - 30); g.quadraticCurveTo(W * 0.75, roofY - 8, W, roofY - 30); g.stroke();
    for (let k = 0; k < 24; k++) {
      const t = k / 24, x = t * W, u = (t * 2) % 1, y = roofY - 30 + 22 * 4 * u * (1 - u) * 0.5 + 0;
      g.fillStyle = k % 2 ? T.suit : '#ffd23f';
      g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.lineTo(x, y + 8); g.closePath(); g.fill();
    }
    spots.fireworks = true;
  } else if (kind === 'bolts') {
    spots.lightning = true;
  }
  if (!hi) delete spots.rain;
}

// Moving parts of the ground, drawn every frame over the painted stadium.
export function drawAtmosphere(ctx, cam, t, flare = 0) {
  const L = cam.layout;
  if (!L) return;
  const { W, H } = cam, s = L.spots, hi = quality.high;
  ctx.save();
  if (s.turbines) {
    ctx.strokeStyle = '#f5f8fa'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    s.turbines.forEach((tb, i) => {
      const a0 = t * 0.0012 * (1 + i * 0.15) + i;
      for (let k = 0; k < 3; k++) { const a = a0 + k * 2.094; ctx.beginPath(); ctx.moveTo(tb.x, tb.y); ctx.lineTo(tb.x + Math.cos(a) * tb.r, tb.y + Math.sin(a) * tb.r); ctx.stroke(); }
      ctx.fillStyle = '#f5f8fa'; ctx.beginPath(); ctx.arc(tb.x, tb.y, 3.5, 0, Math.PI * 2); ctx.fill();
    });
  }
  if (s.cauldrons) {
    const big = flare > 0 ? 1 + 1.6 * flare : 1;
    for (const [i, cd] of s.cauldrons.entries()) {
      for (let k = 0; k < 3; k++) {
        const fl = (0.75 + 0.25 * Math.sin(t * 0.012 + i * 2 + k * 1.7)) * big;
        ctx.fillStyle = ['#ff3b1a', '#ff8a1a', '#ffe14d'][k];
        const w = (14 - k * 4) * Math.min(big, 1.8), h = (24 - k * 6) * fl;
        ctx.beginPath(); ctx.moveTo(cd.x - w, cd.y); ctx.quadraticCurveTo(cd.x - w * 0.6, cd.y - h * 0.6, cd.x + Math.sin(t * 0.02 + i) * 3, cd.y - h); ctx.quadraticCurveTo(cd.x + w * 0.6, cd.y - h * 0.6, cd.x + w, cd.y); ctx.fill();
      }
    }
  }
  if (s.stacks && hi) {
    for (const [i, st] of s.stacks.entries()) for (let k = 0; k < 5; k++) {
      const p = ((t * 0.0004 + k / 5 + i * 0.3) % 1);
      ctx.fillStyle = `rgba(160,165,175,${0.45 * (1 - p)})`;
      ctx.beginPath(); ctx.arc(st.x + p * 26, st.y - p * 50, 6 + p * 14, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (s.eyes) {
    const glow = 0.6 + 0.4 * Math.sin(t * 0.004);
    ctx.fillStyle = `rgba(255,${60 + 80 * glow},40,1)`;
    if (hi) { ctx.shadowColor = '#ff2d1a'; ctx.shadowBlur = 10 * glow; }
    for (const e of s.eyes) { ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0;
  }
  // lightning: the Thunderdome and the Eye of the Storm
  if (s.lightning || s.rain) {
    const period = s.rain ? 5200 : 6800, ph = t % period;
    if (ph < 180 || (ph > 260 && ph < 330)) {
      const seed = Math.floor(t / period);
      let x = W * (0.2 + ((seed * 0.37) % 0.6)), y = 0;
      ctx.strokeStyle = s.rain ? '#e6d3ff' : '#fff9c4'; ctx.lineWidth = 2.5;
      if (hi) { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 1; k < 8; k++) { x += ((seed * 13 + k * 7) % 11 - 5) * 3; y = (L.roofY * k) / 8; ctx.lineTo(x, y); }
      ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, W, H);
    }
  }
  if (s.rain) {
    ctx.strokeStyle = 'rgba(200,190,255,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 70; k++) {
      const x = ((k * 97.3 + t * 0.25) % (W + 40)) - 20, y = ((k * 53.7 + t * 0.9) % H);
      ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12);
    }
    ctx.stroke();
  }
  // fireworks over the palace (and on every six)
  if (s.fireworks) {
    const n = flare > 0 ? 3 : 1;
    for (let f = 0; f < n; f++) {
      const period = 3200 + f * 700, ph = (t + f * 900) % period;
      if (ph > 900 && !(flare > 0)) continue;
      const k = Math.floor((t + f * 900) / period), p = Math.min(1, (ph % 900) / 900);
      const x = W * (0.2 + ((k * 0.41 + f * 0.3) % 0.6)), y = L.roofY * (0.25 + ((k * 0.23) % 0.3));
      ctx.strokeStyle = ['#ffd23f', '#ff8ad8', '#3ec6ff', '#fff4da'][(k + f) % 4]; ctx.globalAlpha = 1 - p; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let r = 0; r < 12; r++) { const a = (r / 12) * Math.PI * 2; ctx.moveTo(x + Math.cos(a) * p * 10, y + Math.sin(a) * p * 10); ctx.lineTo(x + Math.cos(a) * p * 30, y + Math.sin(a) * p * 30); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// The LED boundary board scrolls, so it's drawn every frame over the cached stadium.
const BOARD_TEXT = '★ SIXCHARGE ★   SUPERHERO CRICKET   ★ 6 ★ 4 ★ 6 ★   POWER UP!   ';
export function drawBoard(ctx, cam, t, message) {
  const b = cam.board;
  if (!b) return;
  const { W } = cam;
  if (b.painted) return drawPaintedBoard(ctx, cam, t, message);
  const gr = ctx.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, '#ff2d6f'); gr.addColorStop(0.5, '#ff9f1c'); gr.addColorStop(1, '#ff2d6f');
  ctx.fillStyle = gr; ctx.fillRect(0, b.y, W, b.h);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, b.y, 1, b.h);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, b.y, W, b.h); ctx.clip();
  ctx.font = `${Math.round(b.h * 0.82)}px ${FONT_DISPLAY}`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fffbe8';
  if (quality.high) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; }
  const G = groundOf(HOME), T = teamById(HOME);
  const text = message ? `★ ${message} ★   `.repeat(6) : `★ WELCOME TO ${G.name.toUpperCase()} ★   HOME OF THE ${T.name.toUpperCase()}   ${BOARD_TEXT}`;
  const tw = ctx.measureText(text).width;
  const off = -((t * 0.025) % tw);
  for (let x = off; x < W; x += tw) ctx.fillText(text, x, b.y + b.h / 2 + 1);
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(-2, b.y, W + 4, b.h);
}

// The painted ground's own board: the scrolling words light up on it, LED style.
function drawPaintedBoard(ctx, cam, t, message) {
  const b = cam.board, { W } = cam;
  const G = groundOf(HOME), T = teamById(HOME);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, b.y, W, b.h); ctx.clip();
  ctx.font = `${Math.round(b.h * 0.72)}px ${FONT_DISPLAY}`; ctx.textBaseline = 'middle';
  ctx.fillStyle = message ? '#fffbe8' : '#ffd23f';
  if (quality.high) { ctx.shadowColor = message ? '#fff' : '#ffb000'; ctx.shadowBlur = 8; }
  const text = message ? `★ ${message} ★   `.repeat(6) : `★ WELCOME TO ${G.name.toUpperCase()} ★   HOME OF THE ${T.name.toUpperCase()}   ${BOARD_TEXT}`;
  const tw = ctx.measureText(text).width;
  const off = -((t * 0.025) % tw);
  for (let x = off; x < W; x += tw) ctx.fillText(text, x, b.y + b.h / 2 + 1);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,10,40,0.28)';
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, b.y, 1, b.h);
  ctx.restore();
}

const ropeColour = () => teamById(HOME).suit;

function ring(g, cam, r, color, w, dash) {
  g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash);
  g.beginPath();
  let pen = false;
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const p = cam.project(Math.sin(a) * r, 0, CY + Math.cos(a) * r);
    if (!p || cam.depth(CY + Math.cos(a) * r) < 1.5) { pen = false; continue; }
    if (pen) g.lineTo(p.x, p.y); else { g.moveTo(p.x, p.y); pen = true; }
  }
  g.stroke(); g.setLineDash([]);
}
function quad(g, cam, x0, x1, z0, z1, fill, stroke) {
  const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => cam.project(x, 0, z));
  if (pts.some(p => !p)) return;
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
}
function line(g, cam, x0, z0, x1, z1, color, w) {
  const a = cam.project(x0, 0, z0), b = cam.project(x1, 0, z1);
  if (!a || !b) return;
  g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
}

export function drawBackground(ctx, cam) {
  if (!cam.bg) cam.bg = renderBackground(cam);
  ctx.drawImage(cam.bg, 0, 0, cam.W, cam.H);
}

// Stumps at z (0 or 20). broken: { t, dir } when the wicket has been hit.
export function drawStumps(ctx, cam, z, broken = null, glow = null, t = 0) {
  const base = cam.project(0, 0, z);
  if (!base) return;
  const art = artFor();
  if (art) {
    // the painted stumps, 71 cm of wood; knocked over, they fall through four frames
    const m = art.meta.stumps, sc = (0.71 * base.k) / m.wood;
    ctx.save();
    if (glow && quality.high) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
    if (!broken) {
      ctx.drawImage(art.stumps, base.x - m.foot * sc, base.y - m.h * sc, m.w * sc, m.h * sc);
    } else {
      if (broken.t == null) broken.t = t;
      const [fx, fy, fw, fh, foot] = art.meta.broken[Math.min(3, Math.max(0, Math.floor((t - broken.t) / 110)))];
      ctx.translate(base.x, base.y);
      if (broken.dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(art.broken, fx, fy, fw, fh, -foot * sc, -fh * sc, fw * sc, fh * sc);
    }
    ctx.restore();
    return;
  }
  const k = base.k;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [i, x] of [-0.11, 0, 0.11].entries()) {
    const b = cam.project(x, 0, z), t = cam.project(x, 0.71, z);
    let tx = t.x, ty = t.y;
    if (broken) {
      const ang = (i - 1) * 0.35 + broken.dir * 0.5;
      const len = 0.71 * k;
      tx = b.x + Math.sin(ang) * len; ty = b.y - Math.cos(ang) * len;
    }
    if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = Math.max(4, 0.08 * k); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tx, ty); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, 0.05 * k);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#fff4da'; ctx.lineWidth = Math.max(1.4, 0.032 * k);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tx, ty); ctx.stroke();
  }
  if (!broken) {
    const l = cam.project(-0.12, 0.73, z), r = cam.project(0.12, 0.73, z);
    ctx.strokeStyle = '#e8343b'; ctx.lineWidth = Math.max(1.5, 0.025 * k);
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
  }
  ctx.restore();
}

// ---------- the ball ----------
// The painted ball (img/ball.webp, tools/build_ball.py). It spins with the distance it covers, so
// the seam turns in flight and it rolls along the ground; a thin ink rim keeps it crisp.
const BALL = new Image();
BALL.src = 'img/ball.webp';
const BALL_R = 0.036; // a real ball: 7.2 cm across
export function paintBall(ctx, x, y, r, spin, { glow = null, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
  if (BALL.complete && BALL.naturalWidth) {
    ctx.translate(x, y); ctx.rotate(spin);
    ctx.drawImage(BALL, -r, -r, r * 2, r * 2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(20,16,24,0.85)'; ctx.lineWidth = Math.max(0.8, r * 0.16);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillStyle = '#d7263d'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.3);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
// how far it has turned, from the distance it has covered: about six turns from the bowler's
// hand to the bat (fast enough to read as spin, slow enough to see the seam go round)
export const ballSpin = (...d) => d.reduce((a, v) => a + (v || 0), 0) * 2;

export function drawBall3D(ctx, cam, p, { trail = [], glow = null, ghost = false } = {}) {
  const s = cam.project(p.x, p.y, p.z);
  if (!s) return null;
  const sh = cam.project(p.x, 0, p.z);
  const r = Math.max(3.4, BALL_R * s.k);
  if (sh) { ctx.fillStyle = 'rgba(10,8,20,0.35)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
  if (trail.length > 1) {
    ctx.strokeStyle = glow || 'rgba(255,244,218,0.5)'; ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = cam.project(trail[i - 1].x, trail[i - 1].y, trail[i - 1].z), b = cam.project(trail[i].x, trail[i].y, trail[i].z);
      if (!a || !b) continue;
      ctx.globalAlpha = i / trail.length * 0.8;
      ctx.lineWidth = r * 1.4 * (i / trail.length);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  paintBall(ctx, s.x, s.y, r, ballSpin(p.z, p.x * 0.7, p.y * 0.5), { glow, alpha: ghost ? 0.75 : 1 });
  return s;
}

// A figure standing at world (x, z) with a given height in metres.
export function drawFigure3D(ctx, cam, x, z, look, pose, opts = {}, heightM = 1.85) {
  const p = cam.project(x, 0, z);
  if (!p) return null;
  drawFigure(ctx, p.x, p.y, heightM * p.k * (opts.scale || 1), look, pose, opts);
  return p;
}

// ---------- Top-down outfield view ----------
export class OutfieldView {
  constructor() { this.cx = 0; this.cy = 20; this.k = 4; this.tk = 4; this.tcx = 0; this.tcy = 20; }
  resize(W, H) { this.W = W; this.H = H; this.bg = null; }
  focus(points, snap = false) {
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    this.tcx = (minX + maxX) / 2; this.tcy = (minY + maxY) / 2;
    const span = Math.max((maxX - minX) / (this.W * 0.75), (maxY - minY) / (this.H * 0.5 * 0.78), 1e-3);
    this.tk = Math.max(2.4, Math.min(9, 1 / span));
    if (snap) { this.cx = this.tcx; this.cy = this.tcy; this.k = this.tk; }
  }
  update(dt) {
    const a = 1 - Math.exp(-dt / 220);
    this.cx += (this.tcx - this.cx) * a; this.cy += (this.tcy - this.cy) * a; this.k += (this.tk - this.k) * a;
  }
  from(sx, sy) {
    return { x: this.cx + (sx - this.W / 2) / this.k, y: this.cy - (sy - this.H * 0.5) / (this.k * 0.78) };
  }
  to(x, y, h = 0) {
    return { x: this.W / 2 + (x - this.cx) * this.k, y: this.H * 0.5 - (y - this.cy) * this.k * 0.78 - h * this.k * 0.85 };
  }
  drawGround(ctx) {
    const { W, H, k } = this;
    ctx.fillStyle = '#1b1838'; ctx.fillRect(0, 0, W, H);
    const c = this.to(0, CY);
    const art = artFor(), top = art?.meta.top && art.topView;
    if (top) {
      // a ground built in Blender: the stadium rendered from this very angle (tools/blender, view
      // 'top': top.px pixels a metre, the pitch centre at top.c), the stands, boards and lights
      // around the grass the game draws below
      const t = art.meta.top, s = k / t.px;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(top, c.x - t.c[0] * s, c.y - t.c[1] * s, t.w * s, t.h * s);
    } else {
      // the stands: a ring of crowd around the rope
      if (!this.crowd || this.crowdFor !== HOME) { this.crowd = crowdPattern(ctx); this.crowdFor = HOME; }
      ctx.save();
      ctx.fillStyle = this.crowd;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, (R + 26) * k, (R + 26) * k * 0.78, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0d0a24'; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    // (with the rendered stadium the grass stops just past the rope: its boards stand beyond)
    const gr = top ? R + 1.9 : R + 4;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, gr * k, gr * k * 0.78, 0, 0, Math.PI * 2);
    if (art) {
      // the painted grass right up to the stands, its stripes along the pitch as in the match
      // views: whole tiles with drawImage (pattern transforms are unreliable on iPhone Safari)
      ctx.clip();
      const tex = mipFor(grassMips(art), k), tw = TILE_M * k, th = TILE_M * k * 0.78;
      const o = this.to(-2.5, 0);
      for (let x = o.x - Math.ceil(o.x / tw) * tw; x < W; x += tw) for (let y = o.y - Math.ceil(o.y / th) * th; y < H; y += th) ctx.drawImage(tex, x, y, tw + 0.5, th + 0.5);
      ctx.restore();
      // the boundary rope in the home side's colour
      const rw = Math.max(5, 0.5 * k);
      // a four that crosses it sets the rope wobbling: a bulge that rings out and settles
      const wave = this.ropeWave, age = wave ? (performance.now() - wave.t0) / 1000 : 9;
      const bump = age < 1.4 ? a => {
        let d = a - wave.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
        return 1.6 * Math.exp(-((d / 0.09) ** 2)) * Math.cos(age * 26 - Math.abs(d) * 40) * Math.exp(-age * 3);
      } : null;
      ctx.save();
      for (const [style, w] of [[INK, rw + 3], [ropeColour(), rw], ['rgba(255,255,255,0.4)', Math.max(1.2, rw * 0.28)]]) {
        ctx.strokeStyle = style; ctx.lineWidth = w;
        const lift = w < rw ? rw * 0.18 : 0;
        ctx.beginPath();
        if (!bump) ctx.ellipse(c.x, c.y - lift, (R + 1.5) * k, (R + 1.5) * k * 0.78, 0, 0, Math.PI * 2);
        else for (let i = 0; i <= 360; i++) {
          const a = (i / 360) * Math.PI * 2, r = (R + 1.5 + bump(a)) * k;
          const x = c.x + Math.cos(a) * r, y = c.y - lift - Math.sin(a) * r * 0.78;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd23f'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x, c.y, R * k + 2, R * k * 0.78 + 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = groundOf(HOME).grass[1]; ctx.fill();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = -R; x < R; x += 10) { const a = this.to(x, 0); ctx.fillRect(a.x, 0, 5 * k, H); }
      ctx.restore();
      ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, R * k, R * k * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 27 * k, 27 * k * 0.78, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (art) {
      const a = this.to(-1.52, 22), b = this.to(1.52, -2), pt = art.pitch;
      ctx.drawImage(pt, pt.naturalWidth * 0.04, 0, pt.naturalWidth * 0.92, pt.naturalHeight, a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeStyle = 'rgba(20,16,24,0.35)'; ctx.lineWidth = 0.6; ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else {
      const a = this.to(-1.5, 21.4), b = this.to(1.5, -1.4);
      ctx.fillStyle = groundOf(HOME).pitchCol; ctx.strokeStyle = 'rgba(20,16,24,0.5)'; ctx.lineWidth = 1.5;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    // the creases: popping crease 1.22 m in front of each set of stumps, return creases either side
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, 0.06 * k);
    for (const [y, dir] of [[0, 1], [20, -1]]) {
      const pc = y + 1.22 * dir;
      const l = this.to(-1.5, pc), r = this.to(1.5, pc), bl = this.to(-1.32, y), br = this.to(1.32, y);
      ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y);
      for (const x of [-1.32, 1.32]) { const a2 = this.to(x, pc + 0.6 * dir), b2 = this.to(x, y - 0.6 * dir); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); }
      ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); // the bowling crease, through the stumps
      ctx.stroke();
    }
    for (const y of [0, 20]) this.wicket(ctx, y);
  }
  // A set of stumps seen from high up and a little in front: three stumps standing up from their
  // shadow on the pitch, two bails across the top. Small, as the real thing is from up here.
  wicket(ctx, y) {
    const k = this.k, base = this.to(0, y);
    const hgt = Math.max(6, 0.71 * k * 0.85 * 1.1), gap = Math.max(1.7, 0.11 * k * 1.2), sw = Math.max(1.3, 0.045 * k * 1.3);
    ctx.save();
    // shadow falling back along the pitch
    ctx.fillStyle = 'rgba(20,16,10,0.28)';
    ctx.beginPath(); ctx.ellipse(base.x + gap * 0.4, base.y + 1.5, gap * 1.9, Math.max(2, gap * 0.55), 0, 0, Math.PI * 2); ctx.fill();
    // three stumps: varnished wood with a dark outline and a lit edge
    for (const i of [-1, 0, 1]) {
      const x = base.x + i * gap;
      ctx.fillStyle = '#e9c98f'; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.roundRect(x - sw / 2, base.y - hgt, sw, hgt, sw / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(x - sw / 2 + 0.6, base.y - hgt + 1.5, Math.max(0.8, sw * 0.28), hgt - 3);
    }
    // two bails resting in the grooves on top
    const bh = Math.max(1.1, sw * 0.7);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
    for (const [a, b] of [[-1, 0], [0, 1]]) {
      const x0 = base.x + a * gap - sw * 0.3, x1 = base.x + b * gap + sw * 0.3;
      ctx.beginPath(); ctx.roundRect(x0, base.y - hgt - bh * 0.6, x1 - x0, bh, bh / 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  figure(ctx, x, y, look, pose, opts = {}) {
    const p = this.to(x, y);
    drawFigure(ctx, p.x, p.y, Math.max(26, 1.85 * this.k * 1.5) * (opts.scale || 1), look, pose, opts);
    return p;
  }
  // set the rope wobbling where the ball crossed it (world x, y)
  shakeRope(x, y) { this.ropeWave = { ang: Math.atan2(y - CY, x), t0: performance.now() }; }
  ball(ctx, b) {
    const sh = this.to(b.x, b.y), p = this.to(b.x, b.y, b.h);
    // from up here a real ball would be a speck: drawn a little bigger (about a fielder's fist), a shadow under it
    const r = Math.max(2, 0.07 * this.k);
    ctx.fillStyle = 'rgba(10,8,20,0.4)';
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.1, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    paintBall(ctx, p.x, p.y, r * (1 + Math.min(0.35, (b.h || 0) * 0.025)), ballSpin(b.x, b.y * 1.1, (b.h || 0) * 0.5));
    return p;
  }
  label(ctx, x, y, text, color = '#ffd23f', size = 12) {
    const p = this.to(x, y);
    ctx.font = `600 ${size}px ${FONT_BODY}`;
    const w = ctx.measureText(text).width + size;
    const h = size + 6;
    ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y + 6, w, h, h / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, p.x, p.y + 6 + h / 2 + 0.5);
  }
}

// A small tile of coloured crowd dots, repeated around the top-down ground.
function crowdPattern(ctx) {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = shade(teamById(HOME).suit, -0.72); g.fillRect(0, 0, 48, 48);
  const T = teamById(HOME);
  const rnd = seeded(11), cols = ['#ffd23f', '#e8343b', '#3ec6ff', '#fff4da', '#2ecc71', '#ff8ad8', '#ff9f1c'], home = [T.suit, T.suit, T.trim];
  for (let y = 2; y < 48; y += 4) for (let x = 2; x < 48; x += 4) {
    g.globalAlpha = 0.5 + rnd() * 0.5; g.fillStyle = rnd() < 0.65 ? home[Math.floor(rnd() * 3)] : cols[Math.floor(rnd() * cols.length)];
    g.beginPath(); g.arc(x + rnd(), y + rnd(), 1.4, 0, Math.PI * 2); g.fill();
  }
  return ctx.createPattern(c, 'repeat');
}

export { POSES };
