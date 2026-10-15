import { CFG } from './config.js';
import { INK, FONT_DISPLAY, FONT_BODY, halftonePattern } from './fx.js';
import { drawFigure, POSES } from './figure.js';
import { quality } from './quality.js';

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
      Object.assign(this, { cx: 0.55, cy: 1.7, cz: -7.6, dir: 1, f: Math.min(H * 0.85, W * 1.7), hy: H * (portrait ? 0.38 : 0.32) });
    }
    this.bg = null;
  }
  depth(z) { return this.dir > 0 ? z - this.cz : this.cz - z; }
  project(x, y, z) {
    const d = this.depth(z);
    if (d < 0.4) return null;
    const k = this.f / d;
    return { x: this.W / 2 + this.dir * (x - this.cx) * k, y: this.hy + (this.cy - y) * k, k };
  }
}

function seeded(n) { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function renderBackground(cam) {
  const { W, H, hy } = cam;
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const hi = quality.high;
  const rnd = seeded(7);
  const boardH = 18;
  const standTop = hy - boardH - Math.min(H * 0.135, 112);
  const roofY = standTop - 26;

  // night sky, stars and a halftone moon
  let gr = g.createLinearGradient(0, 0, 0, roofY);
  gr.addColorStop(0, '#07082a'); gr.addColorStop(0.6, '#24145c'); gr.addColorStop(1, '#6e2876');
  g.fillStyle = gr; g.fillRect(0, 0, W, roofY + 2);
  for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`; g.fillRect(rnd() * W, rnd() * roofY * 0.7, 1.4, 1.4); }
  const mx = W * 0.8, my = Math.max(36, roofY * 0.32), mr = Math.min(30, W * 0.07);
  g.save(); if (hi) { g.shadowColor = '#ffe9a8'; g.shadowBlur = 36; }
  g.fillStyle = '#fff1c2'; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill(); g.restore();
  g.save(); g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.clip();
  g.fillStyle = 'rgba(214,170,90,0.55)';
  for (let yy = my - mr; yy < my + mr; yy += 6) for (let xx = mx - mr + ((yy / 6) % 2) * 3; xx < mx + mr; xx += 6) {
    const r = 2.2 * Math.max(0, Math.min(1, (xx - mx + 10) / (mr * 1.3) + (yy - my) / (mr * 2)));
    if (r > 0.2) { g.beginPath(); g.arc(xx, yy, r, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.stroke();

  // city skyline with lit windows
  for (let x = -10; x < W;) {
    const w = 18 + rnd() * 26, h = 24 + rnd() * Math.min(70, roofY * 0.55);
    g.fillStyle = '#1b1246'; g.fillRect(x, roofY - h, w, h + 4);
    for (let wy = roofY - h + 6; wy < roofY - 4; wy += 7) for (let wx = x + 4; wx < x + w - 4; wx += 6) {
      if (rnd() < 0.33) { g.fillStyle = rnd() < 0.7 ? '#ffd86b' : '#7fd7ff'; g.fillRect(wx, wy, 2.4, 3); }
    }
    x += w + 2;
  }

  // roof canopy with trusses
  g.fillStyle = '#140f33'; g.fillRect(0, roofY, W, standTop - roofY);
  g.strokeStyle = '#2e2766'; g.lineWidth = 1.5;
  for (let i = -20; i < W + 20; i += 14) { g.beginPath(); g.moveTo(i, roofY); g.lineTo(i + 10, standTop - 2); g.stroke(); }
  g.fillStyle = '#0d0a24'; g.fillRect(0, standTop - 4, W, 4);

  // two tiers of crowd, brightest in the floodlit middle
  const mid = standTop + (hy - boardH - standTop) * 0.5;
  const cols = ['#ffd23f', '#e8343b', '#3ec6ff', '#fff4da', '#2ecc71', '#ff8ad8', '#ff9f1c', '#7a3fe0'];
  const tier = (y0, y1, base) => {
    g.fillStyle = base; g.fillRect(0, y0, W, y1 - y0);
    const step = hi ? 4.2 : 6;
    for (let yy = y0 + 3; yy < y1 - 2; yy += step) for (let xx = (yy * 7) % 4; xx < W; xx += step) {
      const lit = 0.45 + 0.55 * Math.exp(-((xx - W / 2) ** 2) / (W * W * 0.17));
      g.globalAlpha = lit * (0.55 + rnd() * 0.45);
      g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      g.beginPath(); g.arc(xx + rnd(), yy + rnd(), 1.5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y1 - 3, W, 3);
  };
  tier(standTop, mid - 2, '#221a4d');
  tier(mid + 2, hy - boardH, '#2a1f5a');
  // flags and banners in the crowd
  const flag = (fx, fy, col) => {
    g.strokeStyle = '#fff4da'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 16); g.stroke();
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(fx, fy - 16); g.lineTo(fx + 13, fy - 12); g.lineTo(fx, fy - 8); g.closePath(); g.fill(); g.stroke();
  };
  for (let i = 0; i < Math.round(W / 70); i++) flag(20 + rnd() * (W - 40), standTop + 18 + rnd() * (hy - boardH - standTop - 20), cols[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2]);
  const banner = (bx, by, text, fg, rot) => {
    g.save(); g.translate(bx, by); g.rotate(rot);
    g.font = `15px ${FONT_DISPLAY}`; const w = g.measureText(text).width + 16;
    g.fillStyle = '#fff4da'; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(-w / 2, -10, w, 20); g.strokeRect(-w / 2, -10, w, 20);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 1); g.restore();
  };
  banner(W * 0.38, mid + 18, 'SIXCHARGE!', '#1f6fe0', -0.06);
  banner(W * 0.78, standTop + 16, '6 6 6', '#e8343b', 0.05);

  // floodlights and their beams
  const towers = [W * 0.08, W * 0.92];
  const headY = Math.max(24, roofY - 46);
  if (hi) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const lx of towers) {
      const dir = lx < W / 2 ? 1 : -1;
      for (const [spread, a] of [[W * 0.38, 0.06], [W * 0.23, 0.06], [W * 0.1, 0.07]]) {
        g.fillStyle = `rgba(255,236,190,${a})`;
        g.beginPath(); g.moveTo(lx, headY + 12); g.lineTo(W / 2 - dir * 20 - spread, H * 0.64); g.lineTo(W / 2 - dir * 20 + spread, H * 0.64); g.closePath(); g.fill();
      }
    }
    g.restore();
  }
  for (const lx of towers) {
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(lx, headY + 20); g.lineTo(lx, standTop); g.stroke();
    g.save(); if (hi) { g.shadowColor = '#fff3c4'; g.shadowBlur = 28; }
    g.fillStyle = '#fffbe8'; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(lx - 24, headY); g.lineTo(lx + 24, headY); g.lineTo(lx + 20, headY + 24); g.lineTo(lx - 20, headY + 24); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.fillStyle = 'rgba(18,13,28,0.5)';
    for (let i = 0; i < 4; i++) g.fillRect(lx - 19 + i * 10, headY + 4, 1.6, 17);
    g.fillRect(lx - 21, headY + 12, 42, 1.6);
  }

  // grass, mowing stripes and the floodlight pool on the square
  gr = g.createLinearGradient(0, hy, 0, H);
  gr.addColorStop(0, '#1d7a3c'); gr.addColorStop(0.5, '#2b9b4b'); gr.addColorStop(1, '#1f7d3e');
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
  const pc = cam.project(0, 0, 10) || { x: W / 2, y: H * 0.6 };
  if (hi) {
    g.save(); g.globalCompositeOperation = 'lighter';
    gr = g.createRadialGradient(pc.x, pc.y + H * 0.1, 20, pc.x, pc.y + H * 0.1, H * 0.4);
    gr.addColorStop(0, 'rgba(255,240,190,0.2)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr; g.fillRect(0, hy, W, H - hy); g.restore();
  }
  // rope, sponsor triangles and the 30-yard circle
  ring(g, cam, R, '#fff4da', 3, []);
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const z = CY + Math.cos(a) * (R + 1.5);
    if (cam.depth(z) < 3) continue;
    const p = cam.project(Math.sin(a) * (R + 1.5), 0, z);
    if (!p) continue;
    const s = Math.max(3, Math.min(11, p.k * 0.9));
    g.fillStyle = k % 2 ? '#ffd23f' : '#e8343b'; g.strokeStyle = INK; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(p.x - s, p.y); g.lineTo(p.x + s, p.y); g.lineTo(p.x, p.y - s * 1.1); g.closePath(); g.fill(); g.stroke();
  }
  ring(g, cam, 27, 'rgba(255,255,255,0.45)', 1.5, [6, 6]);

  // the pitch: dry-earth texture, a worn strip down the middle, footmarks, creases
  quad(g, cam, -1.5, 1.5, -1.6, 21.6, '#d9b56f');
  const corners = [[-1.5, -1.6], [1.5, -1.6], [1.5, 21.6], [-1.5, 21.6]].map(([x, z]) => cam.project(x, 0, z));
  if (corners.every(Boolean)) {
    g.save(); g.beginPath(); corners.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.clip();
    for (let n = 0; n < (hi ? 1400 : 500); n++) {
      const x = -1.5 + rnd() * 3, z = -1.6 + rnd() * 23.2, p = cam.project(x, 0, z);
      if (!p) continue;
      g.fillStyle = rnd() < 0.5 ? 'rgba(120,80,30,0.18)' : 'rgba(255,240,200,0.22)';
      const sz = Math.max(1, p.k * 0.035);
      g.fillRect(p.x, p.y, sz * 1.4, sz);
    }
    quad(g, cam, -0.45, 0.45, 0, 20, 'rgba(160,110,50,0.18)');
    g.restore();
  }
  quad(g, cam, -1.5, 1.5, -1.6, 21.6, null, 'rgba(20,16,24,0.55)');
  for (const z of [1.22, 20 - 1.22]) line(g, cam, -1.4, z, 1.4, z, '#fffbe8', 2);
  for (const z of [0, 20]) line(g, cam, -1.4, z, 1.4, z, '#fffbe8', 1.5);
  for (const x of [-1.32, 1.32]) { line(g, cam, x, -1.2, x, 2.4, '#fffbe8', 1.5); line(g, cam, x, 17.6, x, 21.2, '#fffbe8', 1.5); }

  // vignette
  gr = g.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.78);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(6,4,20,0.5)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  cam.board = { y: hy - boardH, h: boardH };
  return c;
}

// The LED boundary board scrolls, so it's drawn every frame over the cached stadium.
const BOARD_TEXT = '★ SIXCHARGE ★   SUPERHERO CRICKET   ★ 6 ★ 4 ★ 6 ★   POWER UP!   ';
export function drawBoard(ctx, cam, t, message) {
  const b = cam.board;
  if (!b) return;
  const { W } = cam;
  const gr = ctx.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, '#ff2d6f'); gr.addColorStop(0.5, '#ff9f1c'); gr.addColorStop(1, '#ff2d6f');
  ctx.fillStyle = gr; ctx.fillRect(0, b.y, W, b.h);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, b.y, 1, b.h);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, b.y, W, b.h); ctx.clip();
  ctx.font = `${Math.round(b.h * 0.82)}px ${FONT_DISPLAY}`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fffbe8';
  if (quality.high) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; }
  const text = message ? `★ ${message} ★   `.repeat(6) : BOARD_TEXT;
  const tw = ctx.measureText(text).width;
  const off = -((t * 0.05) % tw);
  for (let x = off; x < W; x += tw) ctx.fillText(text, x, b.y + b.h / 2 + 1);
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(-2, b.y, W + 4, b.h);
}

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
export function drawStumps(ctx, cam, z, broken = null, glow = null) {
  const base = cam.project(0, 0, z);
  if (!base) return;
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

export function drawBall3D(ctx, cam, p, { trail = [], glow = null, ghost = false } = {}) {
  const s = cam.project(p.x, p.y, p.z);
  if (!s) return null;
  const sh = cam.project(p.x, 0, p.z);
  const r = Math.max(3.2, 0.05 * s.k);
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
  ctx.globalAlpha = ghost ? 0.75 : 1;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
  ctx.fillStyle = '#d7263d'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.35);
  ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff4da'; ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.55, -0.9, 0.9); ctx.stroke();
  ctx.globalAlpha = 1;
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
    // the stands: a ring of crowd around the rope
    if (!this.crowd) this.crowd = crowdPattern(ctx);
    ctx.save();
    ctx.fillStyle = this.crowd;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, (R + 26) * k, (R + 26) * k * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0d0a24'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(c.x, c.y, (R + 4) * k, (R + 4) * k * 0.78, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x, c.y, R * k + 2, R * k * 0.78 + 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#23853f'; ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = -R; x < R; x += 10) { const a = this.to(x, 0); ctx.fillRect(a.x, 0, 5 * k, H); }
    ctx.restore();
    ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, R * k, R * k * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 27 * k, 27 * k * 0.78, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const a = this.to(-1.5, 21.4), b = this.to(1.5, -1.4);
    ctx.fillStyle = '#d8b878'; ctx.strokeStyle = 'rgba(20,16,24,0.5)'; ctx.lineWidth = 1.5;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    for (const y of [0, 20]) {
      const s = this.to(0, y);
      ctx.fillStyle = '#fff4da'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(s.x - 0.25 * k - 2, s.y - 0.9 * k - 4, 0.5 * k + 4, 0.9 * k + 4, 2); ctx.fill(); ctx.stroke();
    }
  }
  figure(ctx, x, y, look, pose, opts = {}) {
    const p = this.to(x, y);
    drawFigure(ctx, p.x, p.y, Math.max(26, 1.85 * this.k * 1.5) * (opts.scale || 1), look, pose, opts);
    return p;
  }
  ball(ctx, b) {
    const sh = this.to(b.x, b.y), p = this.to(b.x, b.y, b.h);
    const r = Math.max(4, 0.35 * this.k);
    ctx.fillStyle = 'rgba(10,8,20,0.4)';
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.2, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d7263d'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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
  g.fillStyle = '#2a1f5a'; g.fillRect(0, 0, 48, 48);
  const rnd = seeded(11), cols = ['#ffd23f', '#e8343b', '#3ec6ff', '#fff4da', '#2ecc71', '#ff8ad8', '#ff9f1c'];
  for (let y = 2; y < 48; y += 4) for (let x = 2; x < 48; x += 4) {
    g.globalAlpha = 0.5 + rnd() * 0.5; g.fillStyle = cols[Math.floor(rnd() * cols.length)];
    g.beginPath(); g.arc(x + rnd(), y + rnd(), 1.4, 0, Math.PI * 2); g.fill();
  }
  return ctx.createPattern(c, 'repeat');
}

export { POSES };
