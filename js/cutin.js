import { INK, FONT_DISPLAY, FONT_BODY } from './fx.js';
import { emblem, hair, shade } from './figure.js';
import { quality } from './quality.js';

// Fighting-game style comic panel that flashes up when a hero fires a signature power.
const DURATION = 1350;

export class CutIn {
  constructor() { this.active = null; }
  start(hero, power, now) { this.active = { hero, power, t0: now, seed: Math.floor(now) % 9973 + 1 }; }
  get busy() { return !!this.active; }

  // A cut-in that cannot be drawn must never leave the canvas clipped and shifted for the rest of the match: every save is paired with a
  // restore even if the drawing throws, and the cut-in is dropped.
  draw(ctx, W, H, now) {
    if (!this.active) return;
    let depth = 0;
    const save = ctx.save, restore = ctx.restore;
    ctx.save = function () { depth++; return save.call(this); };
    ctx.restore = function () { depth--; return restore.call(this); };
    try { this.paint(ctx, W, H, now); }
    catch (e) { this.active = null; console.error('cut-in', e); }
    finally {
      while (depth > 0) { restore.call(ctx); depth--; }
      delete ctx.save; delete ctx.restore;
    }
  }

  paint(ctx, W, H, now) {
    const c = this.active;
    if (!c) return;
    const t = now - c.t0;
    if (t > DURATION) { this.active = null; return; }
    const inP = Math.min(1, t / 160), outP = Math.max(0, (t - (DURATION - 170)) / 170);
    const slide = (1 - easeOut(inP)) * -W * 1.2 + easeIn(outP) * W * 1.2;
    let s = (Math.floor(now / 80) * 7919 + c.seed) % 2147483647 || 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const { hero, power } = c;
    const look = hero.look;

    ctx.save();
    ctx.fillStyle = `rgba(6,4,20,${0.62 * Math.min(1, t / 120) * (1 - outP)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(slide, 0);
    const up = H < 720 ? 0.05 : 0, y0 = H * (0.23 - up), y1 = H * (0.73 - up), sk = W * 0.18;   // (a short phone: the panel rides higher, so its caption clears the power bar)
    const band = () => { ctx.beginPath(); ctx.moveTo(-20, y0 + sk); ctx.lineTo(W + 20, y0); ctx.lineTo(W + 20, y1 - sk); ctx.lineTo(-20, y1); ctx.closePath(); };

    ctx.save(); band(); ctx.clip();
    const cx = W * 0.6, cy = (y0 + y1) / 2;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + t / 2400;
      ctx.fillStyle = i % 2 ? look.suit : shade(look.suit, 0.45);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * W * 2, cy + Math.sin(a) * W * 2); ctx.lineTo(cx + Math.cos(a + Math.PI / 36) * W * 2, cy + Math.sin(a + Math.PI / 36) * W * 2); ctx.fill();
    }
    if (quality.high) {
      ctx.fillStyle = hexA(look.trim, 0.22);
      for (let yy = y0 - 20; yy < y1 + 20; yy += 9) for (let xx = ((yy / 9) % 2) * 4.5; xx < W; xx += 9) {
        const r = 3 * Math.min(1, Math.hypot(xx - cx, yy - cy) / (W * 0.65));
        if (r > 0.3) { ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.strokeStyle = 'rgba(255,251,232,0.55)'; ctx.lineWidth = 2;
    for (let i = 0; i < 22; i++) { const y = y0 + rnd() * (y1 - y0), l = 40 + rnd() * 120; ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(l, y - l * 0.16); ctx.stroke(); }

    const sc = Math.min(W / 390, H / 844) * 2.15;
    const hx = W * 0.5, hy = y0 + (y1 - y0) * 0.62;
    const draw = (x, k = 1) => (hero.face ? portraitCard(ctx, hero.face, x, (y0 + y1) / 2, Math.min(W * 0.6, (y1 - y0) * 0.78) * k, t) : bust(ctx, x, hy, sc * k, hero, rnd));
    if (power.kind === 'mirror') {
      ctx.globalAlpha = 0.35; draw(hx - 60 * sc / 2.15); draw(hx + 60 * sc / 2.15); ctx.globalAlpha = 1;
    }
    draw(hx);
    effect(ctx, power.kind, hx, hy, sc, rnd, t, W, H);
    ctx.restore();

    // panel borders
    ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-20, y0 + sk); ctx.lineTo(W + 20, y0); ctx.moveTo(-20, y1); ctx.lineTo(W + 20, y1 - sk); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, y0 + sk + 5); ctx.lineTo(W + 20, y0 + 5); ctx.moveTo(-20, y1 - 5); ctx.lineTo(W + 20, y1 - sk - 5); ctx.stroke();

    // name plate, power name and what it does
    ctx.save(); ctx.translate(14, y0 + sk * 0.55); ctx.rotate(-Math.atan2(sk, W));
    ctx.font = `24px ${FONT_DISPLAY}`;
    const nw = ctx.measureText(hero.name.toUpperCase()).width + 22;
    ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(nw, 0); ctx.lineTo(nw - 10, 32); ctx.lineTo(0, 32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.fillText(hero.name.toUpperCase(), 10, 17);
    ctx.restore();
    const words = power.name.toUpperCase().split(' ');
    const last = words.pop();
    const rot = -Math.atan2(sk, W);
    // what it does: a cream box clear below the power's name (drawn first, so the name overlaps it rather than being cut off)
    const lastSize = Math.min(80, W * 0.2, H * 0.09), firstSize = Math.min(52, W * 0.13, H * 0.062);
    const lastY = y1 - sk * 0.95 + lastSize * 0.78;
    ctx.font = `700 13px ${FONT_BODY}`;
    const lines = wrap(ctx, power.desc, Math.min(300, W - 60));
    const bh = lines.length * 17 + 14, by = Math.max(y1 + 8, lastY + lastSize * 0.5 + 14);
    ctx.fillStyle = '#fff4da'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 22;
    ctx.fillRect(16, by, bw, bh); ctx.strokeRect(16, by, bw, bh);
    ctx.fillStyle = INK; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, 27, by + 8 + i * 17));
    if (words.length) comicText(ctx, words.join(' '), W * 0.42, y1 - sk * 0.95, firstSize, look.trim, '#e8343b', rot, W * 0.8);
    comicText(ctx, last + '!', W * 0.64, lastY, lastSize, '#fffbe8', look.suit, rot, W * 0.7);
    ctx.restore();
  }
}

const easeOut = p => 1 - (1 - p) ** 3;
const easeIn = p => p * p * p;
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

function comicText(ctx, t, x, y, size, fill, stroke, rot, maxW) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  let sz = size; ctx.font = `${sz}px ${FONT_DISPLAY}`;
  while (ctx.measureText(t).width > maxW && sz > 18) { sz -= 2; ctx.font = `${sz}px ${FONT_DISPLAY}`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = sz * 0.26; ctx.strokeStyle = INK; ctx.strokeText(t, sz * 0.05, sz * 0.07);
  ctx.lineWidth = sz * 0.14; ctx.strokeStyle = stroke; ctx.strokeText(t, 0, 0);
  ctx.fillStyle = fill; ctx.fillText(t, 0, 0);
  ctx.restore();
}

function wrap(ctx, text, maxW) {
  const out = []; let cur = '';
  for (const w of text.split(' ')) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}

// A player's painted portrait on a card, a little crooked, breathing in and out
function portraitCard(ctx, face, cx, cy, size, t) {
  const k = 1 + Math.sin(t / 140) * 0.012, w = size * k;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.045);
  ctx.fillStyle = '#fffbe8'; ctx.strokeStyle = INK; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(-w / 2 - 9, -w / 2 - 9, w + 18, w + 18, 16); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w / 2, -w / 2, w, w, 10); ctx.save(); ctx.clip();
  ctx.drawImage(face, -w / 2, -w / 2, w, w); ctx.restore();
  ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
}

// Head-and-shoulders portrait, front view, with the hero's prop.
function bust(ctx, hx, hy, s, hero, rnd) {
  const look = hero.look;
  const Q = (x, y) => [hx + x * s, hy - y * s];
  const path = (fn, fill, lw = 4) => { ctx.beginPath(); fn(); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); };
  const poly = (pts, fill, lw = 3) => path(() => pts.forEach((p, i) => (i ? ctx.lineTo(...Q(...p)) : ctx.moveTo(...Q(...p)))), fill, lw);
  if (look.cape) poly([[-80, -70], [80, -70], [70, 26], [-70, 26]], look.cape, 4);
  // the prop behind the shoulder
  if (hero.slot === 'bat') {
    ctx.save(); ctx.translate(...Q(44, 18)); ctx.rotate(0.62);
    const g = ctx.createLinearGradient(-15, 0, 15, 0); g.addColorStop(0, '#c98a3e'); g.addColorStop(0.5, '#ffe2a0'); g.addColorStop(1, '#c98a3e');
    ctx.fillStyle = '#2b2b33'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillRect(-6, -26, 12, 46); ctx.strokeRect(-6, -26, 12, 46);
    ctx.beginPath(); ctx.moveTo(-15, -26); ctx.lineTo(15, -26); ctx.lineTo(14, -178); ctx.lineTo(0, -186); ctx.lineTo(-14, -178); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = look.trim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -168); ctx.stroke();
    ctx.restore();
  }
  // body
  path(() => { ctx.moveTo(...Q(-66, -70)); ctx.lineTo(...Q(-62, 14)); ctx.quadraticCurveTo(...Q(-58, 34), ...Q(-34, 38)); ctx.lineTo(...Q(-11, 44)); ctx.lineTo(...Q(11, 44)); ctx.lineTo(...Q(34, 38)); ctx.quadraticCurveTo(...Q(58, 34), ...Q(62, 14)); ctx.lineTo(...Q(66, -70)); }, look.suit);
  ctx.save(); ctx.beginPath(); ctx.moveTo(...Q(-66, -70)); ctx.lineTo(...Q(-62, 14)); ctx.quadraticCurveTo(...Q(-58, 34), ...Q(-34, 38)); ctx.lineTo(...Q(-14, 44)); ctx.lineTo(...Q(-24, -70)); ctx.closePath(); ctx.fillStyle = shade(look.suit); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,248,214,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...Q(60, 14)); ctx.lineTo(...Q(64, -66)); ctx.stroke();
  poly([[-24, 40], [24, 40], [16, 30], [-16, 30]], look.trim);
  if (!hero.plain) { ctx.save(); ctx.translate(...Q(0, 0)); ctx.scale(s * 2.1, s * 2.1); emblem(ctx, 0, 0, 10, look, hero.emblem, 2); ctx.restore(); }
  // hands and props in front
  if (hero.slot === 'bat') {
    ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(...Q(44, 16), 10 * s, 9 * s, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (hero.slot === 'bowl') {
    poly([[44, -10], [58, 8], [56, 44], [44, 46], [42, 12], [34, -4]], look.suit);
    ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(...Q(50, 54), 10 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.shadowColor = look.trim; ctx.shadowBlur = 24; ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.arc(...Q(52, 66), 9 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(...Q(52, 66), 9 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(...Q(52, 66), 5 * s, -0.9, 0.9); ctx.stroke();
  } else {
    for (const gx of [-46, 46]) { ctx.fillStyle = hero.id === 'rani' ? '#f3efe2' : look.trim; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(...Q(gx, 30), 14 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  // neck and head
  poly([[-9, 40], [9, 40], [9, 54], [-9, 54]], shade(look.skin, 0.15));
  path(() => { ctx.moveTo(...Q(-21, 78)); ctx.quadraticCurveTo(...Q(-22, 54), ...Q(-8, 48)); ctx.quadraticCurveTo(...Q(0, 45), ...Q(8, 48)); ctx.quadraticCurveTo(...Q(22, 54), ...Q(21, 78)); ctx.quadraticCurveTo(...Q(21, 102), ...Q(0, 103)); ctx.quadraticCurveTo(...Q(-21, 102), ...Q(-21, 78)); }, look.skin);
  ctx.save(); ctx.beginPath(); ctx.moveTo(...Q(-21, 78)); ctx.quadraticCurveTo(...Q(-22, 54), ...Q(-8, 48)); ctx.lineTo(...Q(-12, 60)); ctx.lineTo(...Q(-17, 82)); ctx.closePath(); ctx.fillStyle = shade(look.skin, 0.18); ctx.fill(); ctx.restore();
  // hair (reusing the figure's styles, scaled up)
  ctx.save(); ctx.translate(...Q(0, 78)); ctx.scale(s * 2.15, s * 2.15); hair(ctx, 0, 0, look, false, 1.7); ctx.restore();
  // mask with angled eyes and brows
  const mask = look.mask || shade(look.suit, 0.1);
  if (!hero.plain) path(() => { ctx.moveTo(...Q(-24, 84)); ctx.lineTo(...Q(24, 84)); ctx.lineTo(...Q(22, 72)); ctx.lineTo(...Q(6, 70)); ctx.lineTo(...Q(0, 74)); ctx.lineTo(...Q(-6, 70)); ctx.lineTo(...Q(-22, 72)); }, mask, 3.5);
  if (hero.plain) poly([[-24, 70], [24, 70], [22, 66], [-22, 66]], shade(look.skin, 0.1), 1);   // (no mask: just the brow line)
  poly([[-18, 80], [-6, 77], [-7, 73], [-17, 74]], '#fffbe8', 2.5);
  poly([[18, 80], [6, 77], [7, 73], [17, 74]], '#fffbe8', 2.5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(...Q(-9.5, 76), 1.6 * s, 0, Math.PI * 2); ctx.arc(...Q(9.5, 76), 1.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...Q(-20, 87)); ctx.lineTo(...Q(-5, 82)); ctx.moveTo(...Q(20, 87)); ctx.lineTo(...Q(5, 82)); ctx.stroke();
  if (look.style !== 'beard') {
    path(() => { ctx.moveTo(...Q(-9, 60)); ctx.quadraticCurveTo(...Q(2, 56), ...Q(12, 62)); ctx.quadraticCurveTo(...Q(3, 51), ...Q(-9, 60)); }, '#fffbe8', 3);
  }
}

// Each power's own flourish.
function effect(ctx, kind, hx, hy, s, rnd, t, W) {
  const Q = (x, y) => [hx + x * s, hy - y * s];
  ctx.save();
  const glow = (c, b) => { if (quality.high) { ctx.shadowColor = c; ctx.shadowBlur = b; } };
  const bolts = (cols, from, n, spread) => {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < n; k++) {
      ctx.strokeStyle = cols[k % cols.length]; ctx.lineWidth = k % 3 ? 2.2 : 4;
      let [x, y] = [from[0] - rnd() * spread, from[1] + rnd() * spread * 1.2];
      const a0 = rnd() * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 7; j++) { x += Math.cos(a0 + (rnd() - 0.5) * 1.6) * 22; y += Math.sin(a0 + (rnd() - 0.5) * 1.6) * 22; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  };
  switch (kind) {
    case 'thunder': glow('#7fe3ff', 22); bolts(['#d8f8ff', '#5fc8ff'], Q(100, 112), 11, 90); break;
    case 'relay': glow('#ffe066', 22); bolts(['#fff6bf', '#ffd23f'], Q(40, 40), 10, 120); break;
    case 'meteor': {
      glow('#ff7a1a', 20);
      for (let k = 0; k < 14; k++) {
        const [x, y] = Q(60 + rnd() * 60, 70 + rnd() * 110);
        const r = (8 + rnd() * 16) * s * 0.5;
        ctx.fillStyle = k % 2 ? '#ffb020' : '#ff4d1a';
        ctx.beginPath(); ctx.moveTo(x, y - r * 2.2); ctx.quadraticCurveTo(x + r, y - r * 0.4, x, y + r); ctx.quadraticCurveTo(x - r, y - r * 0.4, x, y - r * 2.2); ctx.fill();
      }
      break;
    }
    case 'showdown': glow('#ff9f1c', 22); bolts(['#fff0c9', '#ff7a1a'], Q(0, 60), 12, 110); break;
    case 'bouncer': glow('#e8343b', 16); bolts(['#ffd9d9', '#e8343b'], Q(40, 40), 9, 100); break;
    case 'tornado': case 'storm': {
      ctx.strokeStyle = 'rgba(200,240,255,0.85)'; ctx.lineWidth = 4; glow('#5ff0ff', 14);
      const [cx, cy] = Q(52, 66);
      for (let k = 0; k < 6; k++) { const r = (20 + k * 16) * s * 0.5, a = t / 120 + k; ctx.beginPath(); ctx.ellipse(cx, cy - k * 10, r, r * 0.35, -0.2, a, a + Math.PI * 1.3); ctx.stroke(); }
      break;
    }
    case 'maya': {
      for (let k = 0; k < 9; k++) { const [x, y] = Q(-90 + rnd() * 180, -10 + rnd() * 120); ctx.fillStyle = `rgba(80,200,120,${0.25 + rnd() * 0.3})`; ctx.beginPath(); ctx.arc(x, y, (14 + rnd() * 18) * s * 0.5, 0, Math.PI * 2); ctx.fill(); }
      for (let k = 0; k < 5; k++) {
        const [x, y] = Q(-80 + k * 40, 100 + Math.sin(t / 200 + k) * 12);
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4 + k * 0.2);
        ctx.fillStyle = '#fffbe8'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.fillRect(-13, -18, 26, 36); ctx.strokeRect(-13, -18, 26, 36);
        ctx.fillStyle = k % 2 ? '#e8343b' : INK; ctx.font = `18px ${FONT_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1);
        ctx.restore();
      }
      break;
    }
    case 'shatter': {
      const [cx, cy] = Q(52, 66);
      ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 3; glow('#ff3b3b', 12);
      for (let k = 0; k < 9; k++) { let [x, y] = [cx, cy]; const a = (k / 9) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += Math.cos(a + (rnd() - 0.5)) * 30; y += Math.sin(a + (rnd() - 0.5)) * 30; ctx.lineTo(x, y); } ctx.stroke(); }
      break;
    }
    case 'elastic': {
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 4;
      for (const side of [-1, 1]) { const [x, y] = Q(side * 46, 30); ctx.beginPath(); for (let k = 0; k < 9; k++) ctx.lineTo(x + side * k * 14, y - 20 + (k % 2 ? -12 : 12)); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,225,77,0.6)';
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(...Q(0, 30), k * 46 * s * 0.5 + (t / 8) % 40, 0, Math.PI * 2); ctx.stroke(); }
      break;
    }
    case 'freeze': {
      ctx.fillStyle = 'rgba(62,198,255,0.18)'; ctx.fillRect(0, 0, W * 2, W * 3);
      const [cx, cy] = Q(-70, 90), r = 30 * s * 0.6;
      ctx.fillStyle = '#fffbe8'; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - r * 0.7); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.5, cy); ctx.stroke();
      break;
    }
    default: break;
  }
  ctx.restore();
}
