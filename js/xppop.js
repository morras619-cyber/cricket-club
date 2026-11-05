// The XP burst: when a player gains XP, a painted burst (img/fx/xp-burst.webp, 8 frames: tools/build_xp_burst.py) pops over his tile, a "+12 XP"
// rises from it, the tile gives a little bounce, and there is a zing (a chime and a longer, bigger burst for a rating point).
// The burst is drawn in a layer of its own over the page, so no tile's edge clips it.
import { sfx, buzz } from './audio.js';

const FRAMES = [0, 70, 140, 210, 290, 390, 510, 650];   // (when each of the 8 frames begins, in ms)
const TOTAL = 800, SHOW = 1400;
let art = null;
export function warmXpArt() { if (!art) { art = new Image(); art.src = 'img/fx/xp-burst.webp'; art.decode?.().catch(() => {}); } }

// host: the tile the points were gained on; text: '+12 XP'; big: a rating point gained
export function xpPop(host, text, { big = false } = {}) {
  if (!host?.isConnected) return;
  warmXpArt();
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = host.getBoundingClientRect();
  if (!r.width) return;
  const layer = document.createElement('div');
  layer.className = `xp-fx${big ? ' big' : ''}`;
  const size = Math.round(Math.min(230, r.width * (big ? 1.9 : 1.5)));
  const cx = Math.max(size / 2 + 4, Math.min(innerWidth - size / 2 - 4, r.left + r.width / 2));   // (kept on the screen: a tile at the edge pops inward)
  Object.assign(layer.style, { left: `${cx}px`, top: `${r.top + r.height * 0.4}px` });
  layer.style.setProperty('--w', `${size}px`);
  const burst = document.createElement('i'); burst.className = 'xp-burst';
  const num = document.createElement('b'); num.className = 'xp-num'; num.textContent = text;
  if (!still) layer.append(burst);
  layer.append(num);
  document.body.append(layer);
  host.classList.remove('xp-bump'); void host.offsetWidth; host.classList.add('xp-bump');
  setTimeout(() => host.classList.remove('xp-bump'), 500);
  big ? sfx.chime() : sfx.zing(60);
  buzz(big ? 40 : 15);
  if (!still) {
    const t0 = performance.now();
    const step = now => {
      const t = now - t0;
      let f = 0; for (let i = 0; i < FRAMES.length; i++) if (t >= FRAMES[i]) f = i;
      burst.style.backgroundPosition = `${(f % 4) * 100 / 3}% ${Math.floor(f / 4) * 100}%`;
      if (t < TOTAL && layer.isConnected) requestAnimationFrame(step); else burst.remove();
    };
    requestAnimationFrame(step);
  }
  setTimeout(() => layer.remove(), SHOW);
}
