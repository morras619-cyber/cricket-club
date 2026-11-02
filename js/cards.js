// The match pop-up card: when a player walks out to bat or comes on to bowl, his painted
// portrait on the pop-up frame, frame and shirt in his team's colours, with his rating, name and
// role. Players without a painting yet show the drawn face.
import { ovr } from './squads.js';
import { paintedPortrait } from './futcard.js';
import { faceEl } from './looks.js';
import { portrait } from './figure.js';

const frame = new Image();
frame.decoding = 'async';
frame.src = 'img/cards/match-frame.webp';
const ROLE = { bat: 'BAT', bowl: 'BOWL', all: 'ALL-ROUNDER', wk: 'KEEPER' };

const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;

// The frame in a team's colours: its purple glow becomes the team colour (the trim if the kit is
// near black), its yellow lightning border the trim (or stays yellow if the trim is black, white
// or the same colour as the glow).
const tinted = new Map();
function teamFrame(team) {
  const key = team?.id || '-';
  if (tinted.has(key)) return tinted.get(key);
  const c = document.createElement('canvas');
  c.width = frame.naturalWidth; c.height = frame.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(frame, 0, 0);
  if (team) {
    const suit = rgbOf(team.suit), trim = rgbOf(team.trim);
    const glow = hsl(lum(suit) < 50 ? trim : suit);
    const t = hsl(trim);
    const border = t[1] > 0.5 && t[2] > 0.2 && t[2] < 0.85 && Math.abs(t[0] - glow[0]) > 30 ? t : null;
    const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue;
      const [h, s, l] = hsl([px[i], px[i + 1], px[i + 2]]);
      if (s < 0.2) continue;
      let out = null;
      if (h > 255 && h < 335) out = rgb(glow[0], Math.min(1, glow[1] * (0.6 + 0.4 * s)), glow[1] < 0.15 ? l * 0.9 + 0.05 : l);
      else if (border && h > 30 && h < 70) out = rgb(border[0], border[1], l);
      if (out) { px[i] = out[0]; px[i + 1] = out[1]; px[i + 2] = out[2]; }
    }
    g.putImageData(d, 0, 0);
  }
  tinted.set(key, c);
  return c;
}

const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// p: the player; team: the side he plays for in this match
export function cardFor(p, team = null) {
  if (!p) return null;
  const card = mk('div', 'mcard');
  const fc = document.createElement('canvas');
  fc.className = 'mcard-frame';
  const paint = () => { const src = teamFrame(team); fc.width = src.width; fc.height = src.height; fc.getContext('2d').drawImage(src, 0, 0); };
  if (frame.complete && frame.naturalWidth) paint(); else frame.addEventListener('load', paint, { once: true });
  card.append(fc);
  const pic = paintedPortrait(p, team);
  if (pic) { pic.className = 'mcard-pic'; card.append(pic); }
  else {
    const hero = p.hero && typeof p.hero === 'object' ? p.hero : null;
    const f = hero ? portrait(hero, 200, 'celebrate') : faceEl(p, team, 200, 'mcard-face', true);
    f.classList.add('mcard-pic', 'mcard-drawn'); f.style.width = f.style.height = '';
    card.append(f);
  }
  const name = mk('div', 'mcard-name', (p.name || '').toUpperCase());
  name.style.fontSize = `${Math.min(10, 128 / Math.max(1, (p.name || '').length))}cqw`; // long names shrink to fit
  card.append(mk('div', 'mcard-ovr', String(ovr(p))), name, mk('div', 'mcard-role', ROLE[p.role] || 'BAT'));
  return card;
}
