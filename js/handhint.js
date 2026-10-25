// A hand that shows what to do: a swipe up, or a tap, drawn over the match (the tutorial's steps: js/game.js runTutorial). It is only a picture:
// touch passes straight through it, and it goes the moment the player touches the screen. The pictures are img/ui/hands.webp (tools/hands/cut_hands.py):
// FRAMES = [x, y, w, h, fingertip x, fingertip y] in the sheet: waiting (grey wisps), the swipe (speed lines), the flick (sparks), the lift (fading).
export const FRAMES = [[0, 0, 105, 262, 58, 92], [109, 0, 131, 298, 68, 83], [244, 0, 153, 300, 71, 54], [401, 0, 115, 260, 51, 30]];
const IMG = 'img/ui/hands.webp';
const SWIPE_MS = 3300, TAP_MS = 2300;
const ease = p => (p < 0.5 ? 2 * p * p : 1 - (2 * (1 - p)) ** 2 / 2);
const clamp01 = x => Math.max(0, Math.min(1, x));

let one = null;
export const handHint = host => (one = one || new HandHint(host));

class HandHint {
  constructor(host) {
    this.host = host; this.kind = null; this.t0 = 0; this.raf = 0; this.dpr = 1;
    this.img = new Image(); this.img.src = IMG;
    const c = document.createElement('canvas');
    c.id = 'handHint'; c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40';
    c.hidden = true; host.append(c); this.cv = c;
    // the first touch is the player's own: the hand has done its job
    addEventListener('pointerdown', () => this.hide(), true);
  }
  // spec: { kind: 'swipe', from: [x, y], to: [x, y] } or { kind: 'tap', at: [x, y] }: positions as a share of the screen's width and height
  show(spec) {
    if (this.kind) return;
    this.spec = spec; this.kind = spec.kind; this.t0 = performance.now();
    this.resize(); this.cv.hidden = false;
    this.raf = requestAnimationFrame(() => this.frame());
  }
  hide() {
    if (!this.kind) return;
    this.kind = null; cancelAnimationFrame(this.raf); this.cv.hidden = true;
    this.cv.getContext('2d').clearRect(0, 0, this.cv.width, this.cv.height);
  }
  resize() {
    const W = this.host.clientWidth, H = this.host.clientHeight; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.cv.width !== Math.round(W * this.dpr) || this.cv.height !== Math.round(H * this.dpr)) { this.cv.width = Math.round(W * this.dpr); this.cv.height = Math.round(H * this.dpr); }
    this.W = W; this.H = H;
  }
  // a hand with its fingertip at (x, y): frame f, scaled about the tip, alpha a
  hand(g, f, x, y, s, a) {
    const [sx, sy, w, h, tx, ty] = FRAMES[f];
    g.globalAlpha = clamp01(a);
    g.drawImage(this.img, sx, sy, w, h, x - tx * s, y - ty * s, w * s, h * s);
    g.globalAlpha = 1;
  }
  ripple(g, x, y, p, big) {
    if (p <= 0 || p >= 1) return;
    g.lineWidth = Math.max(2, this.W / 120);
    g.strokeStyle = `rgba(255,210,63,${1 - p})`; g.beginPath(); g.arc(x, y, (0.2 + p) * big, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = `rgba(62,198,255,${(1 - p) * 0.9})`; g.beginPath(); g.arc(x, y, (0.1 + p * 0.7) * big, 0, Math.PI * 2); g.stroke();
  }
  frame() {
    if (!this.kind) return;
    if (this.img.complete && this.img.naturalWidth) this.paint(performance.now() - this.t0);
    this.raf = requestAnimationFrame(() => this.frame());
  }
  paint(el) {
    this.resize();
    const g = this.cv.getContext('2d'), { W, H, spec } = this, s = Math.min(0.7, W / 390 * 0.58), big = W / 8;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (spec.kind === 'swipe') {
      const t = el % SWIPE_MS, [fx, fy] = spec.from, [tx, ty] = spec.to, ax = fx * W, ay = fy * H, bx = tx * W, by = ty * H;
      if (t < 450) this.hand(g, 0, ax, ay + (1 - t / 450) * 14 * s * 3, s, t / 300);                       // it arrives
      else if (t < 800) { const p = (t - 450) / 350; this.hand(g, 0, ax, ay, s * (1 - 0.07 * p), 1); this.ripple(g, ax, ay, p, big); }   // it presses down
      else if (t < 1650) {                                                                                 // and swipes up
        const p = ease((t - 800) / 850), x = ax + (bx - ax) * p, y = ay + (by - ay) * p;
        g.strokeStyle = 'rgba(255,244,218,0.55)'; g.lineWidth = Math.max(3, W / 90); g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(x, y); g.stroke();
        this.hand(g, 1, x, y, s * 0.93, 1);
      } else if (t < 2150) { const p = (t - 1650) / 500; this.hand(g, 2, bx, by, s * (0.93 + 0.1 * p), 1); this.ripple(g, bx, by, p, big * 1.2); }   // it lifts off on the spark
      else if (t < 2600) this.hand(g, 3, bx, by, s * 1.03, 1 - (t - 2150) / 450);
    } else {
      const t = el % TAP_MS, [px, py] = spec.at, x = px * W, y = py * H;
      if (t < 400) { const p = ease(t / 400); this.hand(g, 0, x, y + (1 - p) * 60 * s, s, t / 250); }
      else if (t < 700) { const p = (t - 400) / 300; this.hand(g, 0, x, y, s * (1 - 0.1 * p), 1); this.ripple(g, x, y, p, big); }
      else if (t < 1000) { const p = (t - 700) / 300; this.hand(g, 2, x, y, s * (0.9 + 0.12 * p), 1); this.ripple(g, x, y, p, big * 1.3); }
      else if (t < 1450) this.hand(g, 3, x, y, s, 1 - (t - 1000) / 450);
    }
  }
}
