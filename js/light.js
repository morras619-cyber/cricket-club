// Light and shade for the match views: soft ground shadows under every figure, and one finishing pass over the picture (a pool of light on the pitch,
// a gentle vignette, a glow at the top at night). It is all drawn with gradients, so it costs little. `?light=0` in the address (or the saved
// setting sixcharge.light = 0) turns it off, to compare with how it was.
import { quality } from './quality.js';

const KEY = 'sixcharge.light';
const off = (() => { try { return /[?&]light=0/.test(location.search) || localStorage.getItem(KEY) === '0'; } catch { return false; } })();
export const light = { on: !off };
// how dark the ground's time of day is: 0 day .. 1 night
export const NIGHT = { night: 1, storm: 1, dusk: 0.7, evening: 0.6, sunset: 0.3, overcast: 0, day: 0 };

// A ground shadow under a figure whose feet are at (x, y), about rx wide and ry deep: a tight dark core under the feet and a longer, fainter one
// thrown to the lower right, away from the key light (high, left of the camera). Without the light, the old flat oval.
export function softShadow(ctx, x, y, rx, ry, a = 0.28) {
  if (!light.on) { ctx.save(); ctx.fillStyle = `rgba(10,8,20,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  const blob = (cx, cy, r, ratio, alpha) => {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, ratio);
    const g = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    g.addColorStop(0, `rgba(8,6,18,${Math.min(0.85, alpha)})`); g.addColorStop(0.6, `rgba(8,6,18,${Math.min(0.85, alpha) * 0.6})`); g.addColorStop(1, 'rgba(8,6,18,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  blob(x + rx * 0.7, y + ry * 0.25, rx * 2.1, ry / rx * 1.0, a * 1.9);   // (the long shadow)
  blob(x, y, rx * 0.9, ry / rx * 1.1, a * 3.4);                                  // (the dark core under the feet)
}

// The finishing pass over a match view (after the figures, before the buttons): W x H is the picture, hy its horizon, night 0..1
export function finishLight(ctx, W, H, hy, night = 0) {
  if (!light.on) return;
  ctx.save();
  // a pool of warm light on the middle of the ground
  if (quality.high) {
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createRadialGradient(W / 2, H * 0.7, 0, W / 2, H * 0.7, Math.max(W * 0.95, H * 0.62));
    g.addColorStop(0, `rgba(255,238,185,${0.8 + 0.2 * night})`); g.addColorStop(0.55, 'rgba(255,238,185,0.22)'); g.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
    ctx.globalCompositeOperation = 'source-over';
  }
  // a vignette: the corners fall away
  const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.28, W / 2, H * 0.55, H * 0.78);
  v.addColorStop(0, 'rgba(4,6,20,0)'); v.addColorStop(1, `rgba(4,6,20,${0.4 + 0.14 * night})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // at night the floodlights glow over the top of the picture
  if (night > 0.2 && quality.high) {
    ctx.globalCompositeOperation = 'screen';
    const t = ctx.createLinearGradient(0, 0, 0, H * 0.3);
    t.addColorStop(0, `rgba(150,190,255,${0.14 * night})`); t.addColorStop(1, 'rgba(150,190,255,0)');
    ctx.fillStyle = t; ctx.fillRect(0, 0, W, H * 0.3);
  }
  ctx.restore();
}
