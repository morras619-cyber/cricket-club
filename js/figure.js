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

function stroked(ctx, path, color, w, lw) {
  ctx.strokeStyle = INK; ctx.lineWidth = w + lw * 2; path(); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; path(); ctx.stroke();
}

function limb(ctx, a, b, c, color, w, lw) {
  stroked(ctx, () => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); }, color, w, lw);
}

// look: { suit, trim, cape, skin, hair, mask }. opts: { back, emblem, flip, noShadow, glow }
export function drawFigure(ctx, x, y, h, look, pose = POSES.stand(), opts = {}) {
  if (h < 3) return;
  const s = h / 100;
  const lw = Math.max(1.1 / s, 2.6);
  const P = pose;
  ctx.save();
  ctx.translate(x, y);
  if (opts.flip) ctx.scale(-1, 1);
  ctx.scale(s, s);
  if (!opts.noShadow) {
    ctx.fillStyle = 'rgba(10,8,20,0.32)';
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, -P.lift);
  if (P.rot) { ctx.translate(0, -40); ctx.rotate(P.rot); ctx.translate(0, 40); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 18 / s; }

  const cape = () => {
    if (!look.cape) return;
    const sway = Math.sin(performance.now() / 260) * 3;
    ctx.fillStyle = look.cape; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(P.shL[0] - 2, P.shL[1] - 1);
    ctx.lineTo(P.shR[0] + 2, P.shR[1] - 1);
    ctx.quadraticCurveTo(P.shR[0] + 14, P.torsoBot + 10, P.shR[0] + 10 + sway, P.torsoBot + 26);
    ctx.lineTo(P.shL[0] - 10 + sway, P.torsoBot + 26);
    ctx.quadraticCurveTo(P.shL[0] - 14, P.torsoBot + 10, P.shL[0] - 2, P.shL[1] - 1);
    ctx.fill(); ctx.stroke();
    if (opts.back && opts.emblem) emblem(ctx, 0, P.torsoBot + 2, 8, look, opts.emblem, lw);
  };

  if (!opts.back) cape();
  // legs
  limb(ctx, P.hipL, P.kneeL, P.footL, look.suit, 10, lw);
  limb(ctx, P.hipR, P.kneeR, P.footR, look.suit, 10, lw);
  for (const f of [P.footL, P.footR]) {
    ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.ellipse(f[0], f[1] - 2, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // torso
  ctx.fillStyle = look.suit; ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(P.shL[0] - 2, P.torsoTop + 2);
  ctx.quadraticCurveTo(0, P.torsoTop - 3, P.shR[0] + 2, P.torsoTop + 2);
  ctx.lineTo(P.hipR[0] + 3, P.torsoBot);
  ctx.lineTo(P.hipL[0] - 3, P.torsoBot);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // belt
  ctx.fillStyle = look.trim;
  ctx.fillRect(P.hipL[0] - 3, P.torsoBot - 5, P.hipR[0] - P.hipL[0] + 6, 5);
  ctx.strokeRect(P.hipL[0] - 3, P.torsoBot - 5, P.hipR[0] - P.hipL[0] + 6, 5);
  if (!opts.back && opts.emblem) emblem(ctx, 0, (P.torsoTop + P.torsoBot) / 2 - 3, 7, look, opts.emblem, lw);

  // arms
  limb(ctx, P.shL, P.elL, P.hdL, look.suit, 7.5, lw);
  limb(ctx, P.shR, P.elR, P.hdR, look.suit, 7.5, lw);
  const handR = P.gloves ? 7.5 : 4.2;
  for (const hd of [P.hdL, P.hdR]) {
    ctx.fillStyle = P.gloves ? '#f3efe2' : look.trim; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(hd[0], hd[1], handR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // head
  const [hx, hy] = P.head;
  ctx.fillStyle = look.skin; ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.fillRect(hx - 3, hy + 6, 6, 6);
  ctx.beginPath(); ctx.arc(hx, hy, 9.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  if (opts.back) ctx.arc(hx, hy, 9.5, Math.PI * 0.95, Math.PI * 2.05);
  else ctx.arc(hx, hy - 1.5, 9.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  if (opts.back) { ctx.beginPath(); ctx.arc(hx, hy, 9.5, 0, Math.PI * 2); ctx.stroke(); }
  if (!opts.back) {
    if (look.mask) {
      ctx.fillStyle = look.mask;
      ctx.beginPath(); ctx.roundRect(hx - 10, hy - 3, 20, 6, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(hx - 4, hy, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.ellipse(hx + 4, hy, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx - 3.5, hy, 1.4, 0, Math.PI * 2); ctx.arc(hx + 3.5, hy, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (look.mask && opts.back) {
    ctx.strokeStyle = look.mask; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx - 9, hy); ctx.lineTo(hx + 9, hy); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  if (opts.back) cape();

  // bat
  if (P.bat) {
    const { x: bx, y: by, a } = P.bat;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-a);
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.fillStyle = '#2b2b33'; ctx.fillRect(-2, -4, 4, 14); ctx.strokeRect(-2, -4, 4, 14);
    ctx.fillStyle = opts.batColor || '#f0c27a';
    ctx.beginPath(); ctx.roundRect(-4.5, 9, 9, 32, 3); ctx.fill(); ctx.stroke();
    if (opts.batGlow) {
      ctx.strokeStyle = opts.batGlow; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(-7, 6, 14, 38, 5); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function emblem(ctx, x, y, r, look, letter, lw) {
  ctx.fillStyle = look.trim; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = `${r * 1.5}px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, x, y + r * 0.08);
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
