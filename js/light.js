// Light and shade for the match views: soft ground shadows under every figure, and one finishing pass over the picture (a pool of light on the pitch,
// a gentle vignette, a glow at the top at night). It is all drawn with gradients, so it costs little. `?light=0` in the address (or the saved
// setting sixcharge.light = 0) turns it off, to compare with how it was.
import { quality } from './quality.js';

const KEY = 'sixcharge.light';
const off = (() => { try { return /[?&]light=0/.test(location.search) || localStorage.getItem(KEY) === '0'; } catch { return false; } })();
export const light = { on: !off };
// how much darker the whole picture is laid (a gentle tint of night over it) and how strong the pool of warm light on the ground is: both kept low, as the
// match views were coming out lighter than they should
const DARKEN = 0.09, POOL = 0.7;
// how dark the ground's time of day is: 0 day .. 1 night
export const NIGHT = { night: 1, storm: 1, dusk: 0.7, evening: 0.6, sunset: 0.3, overcast: 0, day: 0 };

// A ground shadow under a figure whose feet are at (x, y), about rx wide and ry deep: a tight dark core under the feet and a longer, fainter one
// thrown to the lower right, away from the key light (high, left of the camera). Without the light, the old flat oval.
export function softShadow(ctx, x, y, rx, ry, a = 0.28) {
  rx = Math.max(0.5, Math.abs(rx));
  ry = Math.max(0.35, Math.abs(ry));
  const aspect = Math.max(0.08, Math.min(1.5, ry / rx));
  if (!light.on) {
    ctx.save();
    ctx.fillStyle = `rgba(10,8,20,${Math.min(0.55, a)})`;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  // Three inexpensive gradient layers give feet a contact point and a soft cast shadow.
  // The wider layers stay subtle so the sprites retain their painted outlines and colour.
  const blob = (cx, cy, r, ratio, alpha, inner = 0.04) => {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, ratio);
    const g = ctx.createRadialGradient(0, 0, r * inner, 0, 0, r);
    const peak = Math.min(0.72, Math.max(0, alpha));
    g.addColorStop(0, `rgba(8,6,18,${peak})`);
    g.addColorStop(0.38, `rgba(8,6,18,${peak * 0.72})`);
    g.addColorStop(0.72, `rgba(8,6,18,${peak * 0.24})`);
    g.addColorStop(1, 'rgba(8,6,18,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  blob(x + rx * 0.62, y + ry * 0.28, rx * 2.05, aspect * 0.9, a * 1.15, 0.12);
  blob(x, y + ry * 0.08, rx * 0.92, aspect * 0.92, a * 1.75, 0.08);
  blob(x, y, rx * 0.34, aspect * 0.72, a * 2.15, 0.02);
}

// The pool of warm light on the middle of the ground. It is laid on the ground (right after the background is drawn), under the figures: laid over
// them it washed the players out (the batter's blue lost a tenth of its colour and its depth).
export function groundLight(ctx, W, H, hy, night = 0) {
  if (!light.on || !quality.high) return;
  const n = Math.max(0, Math.min(1, night));
  ctx.save();
  // A restrained cool floodlight wash, with a warmer centre on the wicket.
  // soft-light preserves the source artwork instead of flattening kit colours.
  ctx.globalCompositeOperation = 'soft-light';
  let g = ctx.createRadialGradient(W * 0.5, H * 0.68, 0, W * 0.5, H * 0.68, Math.max(W * 0.88, H * 0.68));
  g.addColorStop(0, `rgba(255,238,195,${(0.22 + 0.12 * n) * POOL})`);
  g.addColorStop(0.48, `rgba(255,232,184,${0.075 * POOL})`);
  g.addColorStop(1, 'rgba(255,232,184,0)');
  ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
  if (n > 0.15) {
    ctx.globalCompositeOperation = 'screen';
    g = ctx.createRadialGradient(W * 0.5, hy + H * 0.2, 0, W * 0.5, hy + H * 0.2, Math.max(W * 0.58, H * 0.52));
    g.addColorStop(0, `rgba(164,198,255,${0.055 * n})`);
    g.addColorStop(0.62, `rgba(164,198,255,${0.018 * n})`);
    g.addColorStop(1, 'rgba(164,198,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
  }
  ctx.restore();
}

// The finishing pass over a match view (after the figures, before the buttons): W x H is the picture, hy its horizon, night 0..1
export function finishLight(ctx, W, H, hy, night = 0) {
  if (!light.on) return;
  const n = Math.max(0, Math.min(1, night));
  ctx.save();
  // Keep the grade restrained: deepen the scene without muddying the team palettes.
  ctx.fillStyle = `rgba(6,8,24,${DARKEN * (0.72 + 0.28 * n)})`;
  ctx.fillRect(0, 0, W, H);
  // Soft cinematic falloff at the edges; the centre and player silhouettes stay clear.
  const v = ctx.createRadialGradient(W * 0.5, H * 0.53, H * 0.3, W * 0.5, H * 0.53, H * 0.82);
  v.addColorStop(0, 'rgba(4,6,20,0)');
  v.addColorStop(0.72, `rgba(4,6,20,${0.08 + 0.05 * n})`);
  v.addColorStop(1, `rgba(4,6,20,${0.3 + 0.12 * n})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (n > 0.15 && quality.high) {
    ctx.globalCompositeOperation = 'screen';
    const t = ctx.createLinearGradient(0, 0, 0, H * 0.34);
    t.addColorStop(0, `rgba(150,190,255,${0.11 * n})`);
    t.addColorStop(0.55, `rgba(150,190,255,${0.035 * n})`);
    t.addColorStop(1, 'rgba(150,190,255,0)');
    ctx.fillStyle = t; ctx.fillRect(0, 0, W, H * 0.34);
    // A subtle neutral lift on the playing area separates the action from the stands.
    const p = ctx.createRadialGradient(W * 0.5, hy + (H - hy) * 0.42, 0, W * 0.5, hy + (H - hy) * 0.42, Math.max(W * 0.62, H * 0.5));
    p.addColorStop(0, `rgba(205,220,255,${0.035 * n})`);
    p.addColorStop(1, 'rgba(205,220,255,0)');
    ctx.fillStyle = p; ctx.fillRect(0, hy, W, H - hy);
  }
  ctx.restore();
}
