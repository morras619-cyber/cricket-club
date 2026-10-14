import { CFG } from './config.js';
import { INK, FONT_DISPLAY, FONT_BODY, halftonePattern } from './fx.js';
import { drawFigure, POSES } from './figure.js';

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

  // night sky with halftone
  const sky = g.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, '#0d1240'); sky.addColorStop(0.7, '#2a1f63'); sky.addColorStop(1, '#5a2f7a');
  g.fillStyle = sky; g.fillRect(0, 0, W, hy);
  g.fillStyle = halftonePattern(g, 'rgba(255,255,255,0.06)', 10, 1.8); g.fillRect(0, 0, W, hy);

  // floodlights
  const rnd = seeded(7);
  for (const fx of [0.08, 0.92]) {
    const x = W * fx, top = hy * 0.18;
    g.fillStyle = 'rgba(255,240,180,0.18)';
    g.beginPath(); g.arc(x, top, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(x, top); g.lineTo(x + (fx < 0.5 ? 10 : -10), hy); g.stroke();
    g.fillStyle = '#fff4c2'; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x - 22, top - 10, 44, 20, 4); g.fill(); g.stroke();
    g.fillStyle = INK;
    for (let i = 0; i < 4; i++) g.fillRect(x - 18 + i * 10, top - 6, 2, 12);
  }

  // stands and crowd
  const standTop = hy - Math.min(H * 0.14, 110);
  g.fillStyle = '#1b1838'; g.fillRect(0, standTop, W, hy - standTop);
  const colors = ['#ffd23f', '#e8343b', '#3ec6ff', '#fff4da', '#2ecc71', '#ff8ad8', '#7a3fe0'];
  for (let i = 0; i < W * 1.4; i++) {
    const x = rnd() * W, y = standTop + 6 + rnd() * (hy - standTop - 16);
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.globalAlpha = 0.55 + rnd() * 0.45;
    g.fillRect(x, y, 3, 4);
  }
  g.globalAlpha = 1;
  // advertising boards
  g.fillStyle = '#ffd23f'; g.fillRect(0, hy - 13, W, 13);
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(-2, hy - 13, W + 4, 13);
  g.fillStyle = INK; g.font = `11px ${FONT_DISPLAY}`; g.textBaseline = 'middle';
  const ad = 'SIXCHARGE · SUPERHERO CRICKET   ';
  const adW = g.measureText(ad).width + 24;
  for (let x = 6; x < W; x += adW) g.fillText(ad, x, hy - 6);

  // grass
  const grass = g.createLinearGradient(0, hy, 0, H);
  grass.addColorStop(0, '#1f7a3e'); grass.addColorStop(1, '#2fa152');
  g.fillStyle = grass; g.fillRect(0, hy, W, H - hy);
  // mowing stripes across the pitch direction
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
  // rope and 30-yard circle
  ring(g, cam, R, '#fff4da', 3, []);
  ring(g, cam, 27, 'rgba(255,255,255,0.45)', 1.5, [6, 6]);
  // pitch
  quad(g, cam, -1.5, 1.5, -1.6, 21.6, '#d8b878');
  quad(g, cam, -1.5, 1.5, -1.6, 21.6, null, 'rgba(20,16,24,0.5)');
  for (const z of [1.22, 20 - 1.22]) line(g, cam, -1.4, z, 1.4, z, '#fff4da', 2);
  for (const z of [0, 20]) line(g, cam, -1.4, z, 1.4, z, '#fff4da', 1.5);
  for (const x of [-1.32, 1.32]) { line(g, cam, x, -1.2, x, 2.4, '#fff4da', 1.5); line(g, cam, x, 17.6, x, 21.2, '#fff4da', 1.5); }
  return c;
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
    ctx.fillStyle = halftonePattern(ctx, 'rgba(255,255,255,0.05)', 10, 1.8); ctx.fillRect(0, 0, W, H);
    const c = this.to(0, CY);
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

export { POSES };
