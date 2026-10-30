// Disco lights for a six by the home side: beams sweeping down from the top of the screen and a pulse of colour round the edges, all in the
// club's own colours (its suit and trim; a dark one is swapped for something that shows). Drawn over the match for DISCO_MS, in time with the
// celebration music (js/audio.js sixMusic).
export const DISCO_MS = 3200, DISCO_LEAD_MS = 150;
const BEAMS = 6, BEAT_MS = 420;

const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const luma = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
const mixWhite = ([r, g, b], k) => [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k].map(Math.round);
const css = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

// the lights of a club: its suit mostly, with its trim (a colour too dark to show is left out; a club with nothing bright gets a steel white)
export function discoColors(team) {
  const bright = [team.suit, team.trim].map(rgb).filter(c => luma(c) >= 70);
  if (!bright.length) return [[210, 220, 240], [210, 220, 240], [150, 165, 200]];
  if (bright.length === 1) return [bright[0], bright[0], mixWhite(bright[0], 0.6)];
  return [bright[0], bright[0], bright[1]];
}

// the lights in one colour picked in the shop (#rrggbb): the same shape as a club's own
export const lightColors = hex => { const c = rgb(hex); return [c, c, mixWhite(c, 0.6)]; };

// t: ms since the lights came on
export function drawDisco(ctx, W, H, t, colors, high = true) {
  if (t < 0 || t > DISCO_MS) return;
  const env = Math.min(1, t / 250) * Math.min(1, (DISCO_MS - t) / 700);
  const beat = Math.max(0, 1 - ((t % BEAT_MS) / BEAT_MS)) ** 2;      // (a pulse on every beat)
  ctx.save();
  // the colour pulsing round the edges
  const c0 = colors[Math.floor(t / (BEAT_MS * 2)) % colors.length];
  const wash = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
  wash.addColorStop(0, css(c0, 0)); wash.addColorStop(1, css(c0, (0.3 + 0.2 * beat) * env));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
  // the beams, from spots along the top, swinging to and fro
  const n = high ? BEAMS : 4, len = H * 1.05;
  for (let i = 0; i < n; i++) {
    const x = W * (i + 0.5) / n, c = colors[(i + Math.floor(t / (BEAT_MS * 2))) % colors.length];
    const swing = Math.sin(t * 0.0027 + i * 1.7) * 0.55, a = Math.PI / 2 + swing * (i % 2 ? 1 : -1), half = 0.1 + 0.03 * beat;
    const ex = x + Math.cos(a) * len, ey = Math.sin(a) * len;
    const g = ctx.createLinearGradient(x, 0, ex, ey);
    g.addColorStop(0, css(c, (0.6 + 0.25 * beat) * env)); g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.cos(a - half) * len * 1.1, Math.sin(a - half) * len * 1.1);
    ctx.lineTo(x + Math.cos(a + half) * len * 1.1, Math.sin(a + half) * len * 1.1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(mixWhite(c, 0.7), 0.9 * env); ctx.beginPath(); ctx.arc(x, 4, 5 + 3 * beat, 0, Math.PI * 2); ctx.fill();   // (the lamp)
  }
  ctx.restore();
}
