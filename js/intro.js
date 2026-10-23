// The match intro: the camera starts high over the stadium with the two sides facing off (their crests, once), drops to
// the pitch, shows the opening batters from close by, then the opening bowler. It plays once, when a match starts; a tap
// skips it. The pictures are the game's own (the top view, the batting and bowling views), zoomed; the players' cards
// are the match pop-up cards, laid over the shot, so they are not shown again after it.
import { logoSrc } from './teams.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const out = t => 1 - (1 - t) ** 3;
const back = t => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const FONT = '"Bangers", Impact, "Arial Black", sans-serif';
const INK = '#141018';

// how long each shot lasts (ms); the dip to black between shots
const OVER = 3600, OPENERS = 3200, BOWLER = 2800, FADE = 220;
// batting first, all three shots (the bowler is known: the AI's plan); bowling first you choose the bowler yourself, so two
export const introLength = batting => OVER + OPENERS + (batting ? BOWLER : 0);
export const INTRO_MS = introLength(true);

export class MatchIntro {
  // g: the game. batting: the player's side bats first. my / opp: the teams. cards: { openers: [card elements], bowler: card element }
  constructor(g, { batting, my, opp, cards, order }) {
    Object.assign(this, { g, batting, my, opp, cards, order, t0: null, skipped: false, shown: '' });
    this.total = introLength(batting);
    this.logos = {};
    for (const T of [my, opp]) { const im = new Image(); im.src = logoSrc(T.id); this.logos[T.id] = im; }
    // the cards sit in a layer over the canvas
    const layer = this.layer = document.createElement('div');
    layer.className = 'intro-cards';
    layer.hidden = true;
    document.getElementById('app')?.append(layer);
  }
  skip() { this.skipped = true; }
  finished(now) { return this.skipped || (this.t0 != null && now - this.t0 >= this.total); }
  end() { this.layer.remove(); }

  // which cards are on show now
  show(which) {
    if (which === this.shown) return;
    this.shown = which;
    this.layer.replaceChildren();
    this.layer.hidden = !which;
    this.layer.classList.toggle('solo', which === 'bowler');
    if (which === 'openers') this.layer.append(...this.cards.openers);
    else if (which === 'bowler' && this.cards.bowler) this.layer.append(this.cards.bowler);
  }

  draw(ctx, now) {
    if (this.t0 == null) this.t0 = now;
    const { g } = this, W = g.W, H = g.H, t = Math.min(this.total, now - this.t0);
    const kind = this.batting ? 'bat' : 'bowl';
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    let cut = 0;   // the black dip between one shot and the next
    let cards = '', tag = null, local = 0, dur = 1;
    if (t < OVER) {
      this.overhead(ctx, W, H, t / OVER, t);
      cut = clamp((t - (OVER - FADE)) / FADE, 0, 1);
    } else if (t < OVER + OPENERS) {
      local = t - OVER; dur = OPENERS;
      // batting first: your openers seen from behind; bowling first: theirs from the front
      this.zoomShot(ctx, W, H, kind, g.S.batter, 1.25, this.batting ? [1.5, 1.85] : [2.6, 3.1], local / dur);
      cut = Math.max(1 - clamp(local / FADE, 0, 1), clamp((local - (dur - FADE)) / FADE, 0, 1));
      if (local > 260) cards = 'openers';
      tag = 'OPENING BATTERS';
    } else {
      local = t - OVER - OPENERS; dur = BOWLER;
      this.zoomShot(ctx, W, H, kind, g.S.bowler, 1.3, [2.6, 3.2], local / dur);
      cut = Math.max(1 - clamp(local / FADE, 0, 1), clamp((local - (dur - FADE)) / FADE, 0, 1));
      if (local > 260) cards = 'bowler';
      tag = 'OPENING BOWLER';
    }
    if (tag) this.lowerThird(ctx, W, H, tag, cards, local, dur);
    this.show(t > this.total - 180 ? '' : cards);
    if (cut > 0) { ctx.fillStyle = `rgba(20,16,24,${cut})`; ctx.fillRect(0, 0, W, H); }
    // the black bars of a broadcast, in over the first moments and out over the last
    const bar = H * 0.075 * ease(clamp(t / 500, 0, 1)) * (1 - ease(clamp((t - (this.total - 350)) / 350, 0, 1)));
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    this.hint(ctx, W, H, t);
  }

  // high over the stadium, dropping towards the pitch; the two sides' crests and names come in below the pitch report
  overhead(ctx, W, H, u, t) {
    const V = this.g.of, e = ease(u);
    V.cx = 0; V.cy = 10; V.tcx = 0; V.tcy = 10;
    V.k = V.tk = lerp(2.0, 6.0, e);
    V.drawGround(ctx);
    // a soft dark behind the matchup, so it reads over any ground
    const gr = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.92);
    gr.addColorStop(0, 'rgba(20,16,24,0)'); gr.addColorStop(0.45, 'rgba(20,16,24,0.62)'); gr.addColorStop(1, 'rgba(20,16,24,0.78)');
    const a = clamp(t / 500, 0, 1) * (1 - out(clamp((t - (OVER - 600)) / 500, 0, 1)));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(0, H * 0.45, W, H * 0.47); ctx.restore();
    this.matchup(ctx, W, H, t);
  }

  // crest, name and ribbon for each side, a VS between, and who bats first
  matchup(ctx, W, H, t) {
    const cy = H * 0.68, size = Math.min(104, W * 0.27);
    const exit = 1 - out(clamp((t - (OVER - 600)) / 500, 0, 1));
    const sides = [[this.my, 0.27, -1, 250], [this.opp, 0.73, 1, 450]];
    for (const [T, fx, dir, at] of sides) {
      const k = clamp((t - at) / 650, 0, 1);
      if (k <= 0) continue;
      const s = back(k), x = W * fx + dir * (1 - out(k)) * W * 0.5;
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 2) * exit; ctx.translate(x, cy);
      const lg = this.logos[T.id];
      ctx.save(); ctx.scale(s, s);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      if (lg?.complete && lg.naturalWidth) ctx.drawImage(lg, -size / 2, -size / 2, size, size);
      ctx.restore();
      this.ribbon(ctx, 0, size / 2 + 26, W * 0.42, 34, T, (T.name || T.id).toUpperCase());
      ctx.restore();
    }
    const v = clamp((t - 700) / 450, 0, 1);
    if (v > 0) {
      ctx.save(); ctx.globalAlpha = exit; ctx.translate(W / 2, cy - 4); ctx.rotate(-0.1); ctx.scale(back(v), back(v));
      ctx.font = `60px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeText('VS', 0, 0);
      ctx.fillStyle = '#ffd23f'; ctx.fillText('VS', 0, 0);
      ctx.restore();
    }
    const who = clamp((t - 1100) / 500, 0, 1);
    if (who > 0 && this.order) {
      ctx.save(); ctx.globalAlpha = who * exit;
      this.fit(ctx, this.order, W / 2, cy + size / 2 + 82, W * 0.8, 22, 'center', '#fff4da');
      ctx.restore();
    }
  }

  // a name on its team's colour, an ink outline and a trim line under it
  ribbon(ctx, x, y, w, h, T, text) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 10, y - h / 2); ctx.lineTo(x + w / 2, y - h / 2); ctx.lineTo(x + w / 2 - 10, y + h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath();
    ctx.fillStyle = T.suit; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.clip(); ctx.fillStyle = T.trim; ctx.fillRect(x - w / 2, y + h / 2 - 6, w, 6);
    ctx.restore();
    this.fit(ctx, text, x, y - 2, w - 28, 24, 'center', '#fff4da');
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

  // the picture the game would show, zoomed in on a person (placed in the upper part, the cards take the lower); the
  // zoom creeps in, and the zoomed area never leaves the picture
  zoomShot(ctx, W, H, kind, who, hgt, [z0, z1], u) {
    const g = this.g, cam = g.cams[kind], p = cam.project(who.x, 0, who.z);
    const s = lerp(z0, z1, ease(u)), ay = 0.4;
    let cx = p ? p.x : W / 2, cy = p ? p.y - p.k * hgt : H * 0.5;
    cx += lerp(-6, 6, u) / s;   // a slow drift across
    cx = clamp(cx, W / (2 * s), W - W / (2 * s));
    cy = clamp(cy, H * ay / s, H - H * (1 - ay) / s);
    ctx.save();
    ctx.translate(W / 2, H * ay); ctx.scale(s, s); ctx.translate(-cx, -cy);
    g.render3D(kind);
    ctx.restore();
  }

  // under the cards: a dark fade, and what they are (a line in the team's trim colour, then the words)
  lowerThird(ctx, W, H, text, cards, t, dur) {
    const k = out(clamp((t - 120) / 400, 0, 1)) * (1 - out(clamp((t - (dur - 400)) / 350, 0, 1)));
    if (k <= 0.01) return;
    const gr = ctx.createLinearGradient(0, H * 0.5, 0, H);
    gr.addColorStop(0, 'rgba(20,16,24,0)'); gr.addColorStop(1, 'rgba(20,16,24,0.82)');
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = gr; ctx.fillRect(0, H * 0.5, W, H * 0.5);
    const cw = cards === 'bowler' ? Math.min(W * 0.46, 190) : Math.min(W * 0.35, 150), ch = cw * 497 / 480;
    const y = H - H * 0.075 - 8 - ch - 22;
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(W / 2 - 22, y + 14, 44, 3);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = k;
    this.fit(ctx, text, W / 2, y, W * 0.8, 20, 'center', '#fff4da');
    ctx.restore();
  }

  hint(ctx, W, H, t) {
    if (t < 900) return;
    const a = 0.55 * Math.min(1, (t - 900) / 400);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff4da'; ctx.fillText('TAP TO SKIP', W / 2, H - H * 0.0375);
    ctx.restore();
  }
}
