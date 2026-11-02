// The coin toss, painted (img/toss/, tools/build_toss_art.py): the coin hovers over the pitch in
// a gold swirl; called, it leaps up spinning through its flip frames with streaks of light, comes
// down and lands with a burst, the winning face up in a column of light.
import { COIN_FRAMES } from './packed.js';
const IMG = {};
const NAMES = ['coin-heads', 'coin-tails', ...[1, 2, 3, 4, 5, 6, 7].map(i => `coin-flip${i}`),
  'fx-swirl', 'fx-swirl2', 'fx-ring', 'fx-spiral', 'fx-star', 'fx-streak', 'fx-dust', 'fx-burst', 'fx-pad', 'fx-rays'];
export function loadToss() {
  for (const n of NAMES) if (!IMG[n]) { IMG[n] = new Image(); IMG[n].src = COIN_FRAMES[n] || `img/toss/${n}.webp`; }
}
const ok = im => im && im.complete && im.naturalWidth > 0;
// a full turn of the coin: heads, over the edge to tails, and back round
const TURN = [1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2];
const ease = t => 1 - (1 - t) ** 3;

export class TossAnim {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.state = 'idle'; this.t0 = performance.now(); this.result = null; this.raf = 0;
    loadToss();
  }
  start() { if (!this.raf) this.loop(); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  // the throw: resolves when the coin has landed
  flip(result, ms = 1700) {
    this.state = 'flip'; this.result = result; this.t0 = performance.now(); this.dur = ms;
    return new Promise(res => { this.landed = res; });
  }
  reset() { this.state = 'idle'; this.result = null; this.t0 = performance.now(); }
  size() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    return { W: w, H: h };
  }
  loop() {
    this.raf = requestAnimationFrame(() => this.loop());
    if (!this.cv.isConnected || this.cv.offsetParent === null) return;
    const { W, H } = this.size(), g = this.g, now = performance.now(), t = (now - this.t0) / 1000;
    g.clearRect(0, 0, W, H);
    const S = Math.min(W * 0.52, H * 0.62);       // the coin's size
    const cx = W / 2, cy = H * 0.5;
    const draw = (n, x, y, w, a = 1, rot = 0, add = false) => {
      const im = IMG[n]; if (!ok(im) || a <= 0) return;
      const h = w * im.naturalHeight / im.naturalWidth;
      g.save(); g.globalAlpha = Math.min(1, a); if (add) g.globalCompositeOperation = 'lighter';
      g.translate(x, y); if (rot) g.rotate(rot); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
    };
    // the flip frames share a height (the edge-on one is narrow): width from each frame's own shape
    const fw = (n, base) => (ok(IMG[n]) ? base * IMG[n].naturalWidth / IMG['coin-flip1'].naturalWidth : base);
    const twinkle = (k, x, y, s) => draw('fx-star', x, y, s * (0.6 + 0.4 * Math.abs(Math.sin(t * 3 + k * 1.7))), 0.5 + 0.5 * Math.sin(t * 2.3 + k), t * 0.6 + k, true);

    if (this.state === 'idle') {
      // hovering, tilted, a gold swirl round it
      const bob = Math.sin(t * 2) * H * 0.015;
      draw('fx-swirl', cx, cy + bob, S * 1.75, 0.85, -0.12 + Math.sin(t * 0.7) * 0.05, true);
      draw('coin-flip2', cx, cy + bob, fw('coin-flip2', S * 0.86), 1, -0.32 + Math.sin(t * 1.3) * 0.04);
      draw('fx-swirl2', cx + S * 0.05, cy + bob + S * 0.06, S * 1.45, 0.55 + 0.2 * Math.sin(t * 2), 0.25, true);
      twinkle(0, cx - S * 0.62, cy - S * 0.4, S * 0.22); twinkle(1, cx + S * 0.6, cy - S * 0.55, S * 0.18); twinkle(2, cx + S * 0.7, cy + S * 0.35, S * 0.16);
      return;
    }
    const p = Math.min(1, (now - this.t0) / this.dur);
    if (this.state === 'flip') {
      // up, spinning, and down: a parabola; the turn slows as it falls
      const hgt = 4 * p * (1 - p), y = cy - hgt * H * 0.36, sc = 1 + hgt * 0.35;
      const turns = 5 * ease(p), idx = Math.floor(turns * TURN.length) % TURN.length;
      draw('fx-streak', cx, y + S * 0.55, S * 1.4 * sc, hgt * 0.9, -0.3 + p, true);
      draw('fx-ring', cx, y, S * 1.3 * sc, 0.4 + hgt * 0.5, t * 4, true);
      draw(`coin-flip${TURN[idx]}`, cx, y, fw(`coin-flip${TURN[idx]}`, S * 0.86 * sc), 1, Math.sin(p * 9) * 0.25);
      twinkle(3, cx - S * 0.5, y - S * 0.3, S * 0.2 * hgt); twinkle(4, cx + S * 0.5, y + S * 0.2, S * 0.18 * hgt);
      if (p >= 1) { this.state = 'landed'; this.t0 = now; this.landed?.(); }
      return;
    }
    // landed: the burst on the grass, the winning face up in a column of light
    const k = Math.min(1, (now - this.t0) / 500), face = this.result === 'tails' ? 'coin-tails' : 'coin-heads';
    draw('fx-pad', cx, cy + S * 0.52, S * 1.3, 0.9, 0, true);
    draw('fx-spiral', cx, cy - S * 0.1, S * 1.5, (1 - k) * 0.9 + 0.25, 0, true);
    draw('fx-rays', cx, cy + S * 0.25, S * 1.4, 0.7 * (1 - k) + 0.2, 0, true);
    draw('fx-burst', cx, cy + S * 0.45, S * (1.1 + 0.6 * k), 1 - k, 0, true);
    draw('fx-dust', cx - S * 0.4, cy + S * 0.48, S * 0.9, 1 - k, 0.1, true);
    draw(face, cx, cy, S * (0.95 + 0.08 * Math.max(0, 1 - k * 2)), 1, 0);
    twinkle(5, cx - S * 0.55, cy - S * 0.45, S * 0.24); twinkle(6, cx + S * 0.58, cy - S * 0.3, S * 0.2); twinkle(7, cx + S * 0.45, cy + S * 0.5, S * 0.16);
  }
}
