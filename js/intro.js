// The match intro: the camera starts high over the stadium with the two sides facing off, drops to the pitch, shows the
// opening batter from close by, then the opening bowler. It plays once, when a match starts; a tap skips it.
// The pictures are the game's own (the top view, the batting and bowling views), zoomed: nothing new is drawn but the
// team plates, the captions and the black bars.
import { POSES } from './scene.js';
import { teamLook, logoSrc } from './teams.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const out = t => 1 - (1 - t) ** 3;
const FONT = '"Bangers", Impact, "Arial Black", sans-serif';
const INK = '#141018';

// how long each of the three shots lasts (ms), and the zoom each ends on
const OVER = 3600, BATTER = 2500, BOWLER = 2500, FADE = 220;
export const INTRO_MS = OVER + BATTER + BOWLER;

export class MatchIntro {
  // g: the game. batting: the player's side bats first. my / opp: the teams. striker / bowler: { name, ovr }
  constructor(g, { batting, my, opp, striker, bowler }) {
    Object.assign(this, { g, batting, my, opp, striker, bowler, t0: null, skipped: false });
    this.logos = {};
    for (const T of [my, opp]) { const im = new Image(); im.src = logoSrc(T.id); this.logos[T.id] = im; }
    this.looks = [my, opp].map(T => [0, 1].map(i => teamLook(T, i)));
  }
  skip() { this.skipped = true; }
  finished(now) { return this.skipped || (this.t0 != null && now - this.t0 >= INTRO_MS); }

  draw(ctx, now) {
    if (this.t0 == null) this.t0 = now;
    const { g } = this, W = g.W, H = g.H, t = Math.min(INTRO_MS, now - this.t0);
    const kind = this.batting ? 'bat' : 'bowl';
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    let cut = 0;   // the black dip between one shot and the next
    if (t < OVER) {
      this.overhead(ctx, W, H, t / OVER, t);
      cut = clamp((t - (OVER - FADE)) / FADE, 0, 1);
    } else if (t < OVER + BATTER) {
      const u = (t - OVER) / BATTER;
      // batting first: the batter seen from behind, the bowler from the front; bowling first: the other way round
      this.zoomShot(ctx, W, H, kind, g.S.batter, 1.2, this.batting ? [1.5, 1.95] : [2.7, 3.3], u);
      this.caption(ctx, W, H, this.batting ? this.my : this.opp, this.batting ? 'OPENS THE BATTING' : 'OPENING BATTER', this.striker, t - OVER, BATTER);
      cut = 1 - clamp((t - OVER) / FADE, 0, 1);
      if (t > OVER + BATTER - FADE) cut = clamp((t - (OVER + BATTER - FADE)) / FADE, 0, 1);
    } else {
      const u = (t - OVER - BATTER) / BOWLER;
      this.zoomShot(ctx, W, H, kind, g.S.bowler, 1.25, this.batting ? [2.7, 3.4] : [1.5, 1.9], u);
      this.caption(ctx, W, H, this.batting ? this.opp : this.my, 'OPENS THE BOWLING', this.bowler, t - OVER - BATTER, BOWLER);
      cut = 1 - clamp((t - OVER - BATTER) / FADE, 0, 1);
      if (t > INTRO_MS - FADE) cut = clamp((t - (INTRO_MS - FADE)) / FADE, 0, 1);
    }
    if (cut > 0) { ctx.fillStyle = `rgba(20,16,24,${cut})`; ctx.fillRect(0, 0, W, H); }
    // the black bars of a broadcast, in over the first moments and out over the last
    const bar = H * 0.075 * ease(clamp(t / 500, 0, 1)) * (1 - ease(clamp((t - (INTRO_MS - 350)) / 350, 0, 1)));
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    this.hint(ctx, W, H, t);
  }

  // high over the stadium, dropping towards the pitch, the two sides in lines either side of it, their names across the top
  overhead(ctx, W, H, u, t) {
    const V = this.g.of, e = ease(u);
    V.cx = 0; V.cy = 10; V.tcx = 0; V.tcy = 10;
    V.k = V.tk = lerp(2.0, 6.0, e);
    V.drawGround(ctx);
    const sides = [[this.my, -1, 0], [this.opp, 1, 1]];
    for (const [T, dir, idx] of sides) {
      for (let i = 0; i < 5; i++) V.figure(ctx, dir * 5.8, 3.4 + i * 3.4, this.looks[idx][i % 2], POSES.stand(), { scale: 0.6 });
    }
    const a = out(clamp(t / 800, 0, 1)), b = 1 - out(clamp((t - (OVER - 700)) / 500, 0, 1));
    const y = H * 0.095, slide = (1 - a * b) * W * 0.7;
    this.plate(ctx, W * 0.03 - slide, y, W * 0.62, this.my, 'left');
    this.plate(ctx, W * 0.97 + slide, y + 60, W * 0.62, this.opp, 'right');
    // the VS between them
    const s = a * b;
    if (s > 0.01) {
      ctx.save(); ctx.translate(W / 2, y + 58); ctx.rotate(-0.12); ctx.scale(s, s);
      ctx.font = `46px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.strokeText('VS', 0, 0);
      ctx.fillStyle = '#ffd23f'; ctx.fillText('VS', 0, 0); ctx.restore();
    }
  }

  // a team's name on its colour, with its crest
  plate(ctx, x, y, w, T, side) {
    const h = 54, skew = 14, left = side === 'left';
    const x0 = left ? x : x - w;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0 + (left ? 0 : skew), y); ctx.lineTo(x0 + w, y); ctx.lineTo(x0 + w - (left ? skew : 0), y + h); ctx.lineTo(x0, y + h);
    ctx.closePath();
    ctx.fillStyle = T.suit; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.clip();
    ctx.fillStyle = T.trim; ctx.fillRect(x0, y + h - 7, w, 7);
    ctx.restore();
    const lg = this.logos[T.id], pad = 8;
    const lx = left ? x0 + pad + 4 : x0 + w - pad - 4 - 44;
    if (lg?.complete && lg.naturalWidth) ctx.drawImage(lg, lx, y + 3, 44, 44);
    // (the names keep to the outer side, so the VS between the plates covers none of them)
    this.fit(ctx, (T.name || T.id).toUpperCase(), left ? lx + 52 : lx - 8, y + h * 0.5 - 2, w - 130, 30, left ? 'left' : 'right', '#fff4da');
  }

  // text shrunk to fit a width, with an ink outline
  fit(ctx, text, x, y, maxW, size, align, fill) {
    ctx.save();
    ctx.font = `${size}px ${FONT}`;
    const w = ctx.measureText(text).width;
    if (w > maxW) ctx.font = `${Math.max(12, size * maxW / w)}px ${FONT}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
    ctx.restore();
  }

  // the picture the game would show, zoomed in on a person, the zoom creeping in; the zoomed area never leaves the picture
  zoomShot(ctx, W, H, kind, who, hgt, [z0, z1], u) {
    const g = this.g, cam = g.cams[kind], p = cam.project(who.x, 0, who.z);
    const s = lerp(z0, z1, ease(u));
    let cx = p ? p.x : W / 2, cy = p ? p.y - p.k * hgt : H * 0.5;
    cx += lerp(-6, 6, u) / s;   // a slow drift across
    cx = clamp(cx, W / (2 * s), W - W / (2 * s)); cy = clamp(cy, H / (2 * s), H - H / (2 * s));
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-cx, -cy);
    g.render3D(kind);
    ctx.restore();
  }

  // the lower third: his side's colour, what he does, his name
  caption(ctx, W, H, T, role, who, t, dur) {
    if (!who) return;
    const a = out(clamp(t / 450, 0, 1)), b = 1 - out(clamp((t - (dur - 450)) / 350, 0, 1));
    const k = a * b;
    if (k <= 0.01) return;
    const w = W * 0.78, h = 66, x = W * 0.05 - (1 - k) * W, y = H * 0.76;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    ctx.fillStyle = T.suit; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.clip(); ctx.fillStyle = T.trim; ctx.fillRect(x, y + h - 7, w, 7); ctx.restore();
    this.fit(ctx, role, x + 26, y + 17, w - 50, 17, 'left', '#ffd23f');
    this.fit(ctx, who.name.toUpperCase(), x + 24, y + 42, w - (who.ovr ? 112 : 50), 34, 'left', '#fff4da');
    if (who.ovr) this.fit(ctx, String(who.ovr), x + w - 28, y + 38, 70, 34, 'right', '#ffd23f');
  }

  hint(ctx, W, H, t) {
    if (t < 900) return;
    const a = 0.55 * Math.min(1, (t - 900) / 400);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff4da'; ctx.fillText('TAP TO SKIP', W / 2, H - H * 0.0375);
    ctx.restore();
  }
}
