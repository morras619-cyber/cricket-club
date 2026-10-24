// Life for the painted stands (js/scene.js renderBuilt gives drawLife the picture's place on screen): drifting clouds and birds in the
// sky, an eagle over Eagle's Nest, the painted flags swaying, and the crowd's camera flashes on a six. Everything is drawn over the
// picture and is skipped on a phone that can't keep up (quality.js). FLAGS: [x, y, w, h] in the picture's own pixels, found by
// tools/stand_flags.py (a flag's colour against open sky).
import { quality } from './quality.js';

export const FLAGS = {"royals":{"bat":[[498,228,30,23],[884,228,30,23],[1516,229,29,21],[1843,229,29,21],[509,277,34,25],[869,277,34,25],[1503,278,37,23],[1848,278,38,23]],"bowl":[[714,120,39,36],[647,121,39,35],[1638,121,47,35],[1715,121,47,35],[638,214,34,27],[728,214,34,27],[1711,219,31,24],[1657,220,32,23],[646,282,42,36],[710,282,44,36],[1637,284,49,33],[1714,284,49,33],[688,356,24,13],[95,392,24,17]]},"storm":{"bat":[[1832,102,28,39],[1528,103,29,37],[12,290,26,23],[1988,290,26,23],[1375,291,26,21],[318,310,23,19],[1072,310,23,18],[2294,310,23,19]],"bowl":[[1533,10,24,27],[1843,10,24,28],[508,18,23,22],[869,18,23,22],[1532,146,35,54],[1831,146,37,55],[505,158,41,42],[854,161,41,39],[413,276,29,40],[959,276,28,40],[1928,279,32,33],[1440,280,26,32],[382,346,16,29],[1001,346,17,29],[2382,346,16,29],[323,367,24,30],[1053,367,24,28],[2323,367,24,30]]}};
// who gets what: only Cyclone Park's sky is plain enough for extra clouds (the others' painted clouds are detailed: a drawn one would look like a smudge)
const SKY = { cyclones: { clouds: 3, birds: 5 }, eagles: { clouds: 0, birds: 3, eagle: true }, storm: { clouds: 0, birds: 0 }, royals: { clouds: 0, birds: 4 } };

let cloudSprite = null;
// an outlined comic cumulus like Cyclone Park's painted ones: flat white, a cream underside, a dark-blue ink line, a flat base
function cloud() {
  if (cloudSprite) return cloudSprite;
  const c = document.createElement('canvas'); c.width = 360; c.height = 150;
  const g = c.getContext('2d'), base = 120;
  const puffs = [[70, 96, 34], [118, 74, 46], [178, 66, 52], [236, 84, 42], [286, 100, 30], [160, 100, 36]];
  g.save(); g.beginPath(); g.rect(0, 0, 360, base); g.clip();
  g.fillStyle = g.strokeStyle = '#3d4a6b'; g.lineWidth = 7;
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); }
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(0, 70, 0, base); sh.addColorStop(0, 'rgba(236,226,200,0)'); sh.addColorStop(1, 'rgba(236,226,200,1)');
  g.fillStyle = sh; g.fillRect(0, 0, 360, base);
  g.restore();
  g.strokeStyle = '#3d4a6b'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(44, base); g.lineTo(312, base); g.stroke();
  return (cloudSprite = c);
}

// a bird: two flapping wings, a small dark v
function bird(ctx, x, y, s, t, ph) {
  const f = Math.sin(t * 0.012 + ph);
  ctx.beginPath(); ctx.moveTo(x - s, y - f * s * 0.5); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.45 - f * s * 0.4, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.45 - f * s * 0.4, x + s, y - f * s * 0.5); ctx.stroke();
}

// L: the layout (cam.layout.life) = { club, dx, dy, k, skyY (the stand's roof line on screen), boardY, W }
export function drawLife(ctx, cam, t, flare = 0) {
  const L = cam.layout?.life;
  if (!L) return;
  const { club, W, k, dx, dy, skyY } = L, sky = SKY[club];
  if (!quality.high) return;
  ctx.save();
  if (sky && skyY > 20) {
    // clouds: slow, in the sky above the roof line, fading where they near the stand
    const cl = cloud(), n = sky.clouds;
    for (let i = 0; i < n; i++) {
      const w = W * (0.22 + 0.08 * ((i * 37) % 5) / 4), h = w * 150 / 360, sp = 0.004 + (i % 3) * 0.0015;
      const x = ((i * 0.31 * W + t * sp * W * 0.0035 + i * 97) % (W + 2 * w)) - w;
      const y = Math.max(2, skyY * (0.08 + 0.7 * (((i * 53) % 7) / 7)) - h * 0.4);
      const fade = Math.min(1, Math.max(0, (skyY - y - h * 0.3) / (h * 0.8)));
      ctx.globalAlpha = 0.95 * fade;
      ctx.drawImage(cl, x, y, w, h);
    }
    ctx.globalAlpha = 1;
    // birds, in small loose flocks
    ctx.strokeStyle = 'rgba(30,26,48,0.8)'; ctx.lineWidth = Math.max(1.2, W / 300); ctx.lineCap = 'round';
    for (let i = 0; i < sky.birds; i++) {
      const s = W / 70 * (0.8 + 0.1 * (i % 3)), sp = 0.012 + (i % 2) * 0.004;
      const x = ((i * 0.23 * W + t * sp * W * 0.0045 + i * 140) % (W + 80)) - 40, y = skyY * (0.15 + 0.5 * (((i * 31) % 6) / 6)) + Math.sin(t * 0.0013 + i) * 6;
      bird(ctx, x, y, s, t, i * 1.7);
    }
    if (sky.eagle) {
      // the eagle of the Nest: a big slow glide across, wings steady, now and then a flap
      const per = 26000, p = ((t + 4000) % per) / per, x = -40 + p * (W + 80), y = skyY * 0.3 + Math.sin(p * 6.28 * 1.5) * skyY * 0.05, s = W / 16;
      ctx.strokeStyle = 'rgba(48,34,22,0.92)'; ctx.lineWidth = Math.max(2, W / 150);
      const f = Math.sin(t * 0.0035) * 0.35;
      ctx.beginPath(); ctx.moveTo(x - s, y + f * s * 0.5); ctx.bezierCurveTo(x - s * 0.5, y - s * 0.38 - f * s * 0.3, x - s * 0.2, y - s * 0.12, x, y); ctx.bezierCurveTo(x + s * 0.2, y - s * 0.12, x + s * 0.5, y - s * 0.38 - f * s * 0.3, x + s, y + f * s * 0.5); ctx.stroke();
    }
  }
  // the flags in the picture: swaying from the pole (the left edge) a pixel or two
  const flags = FLAGS[club]?.[cam.kind];
  const bg = cam.bg;
  if (flags && bg && W > 0) {
    const dpr = bg.width / W;
    flags.forEach(([X, Y, w, h], j) => {
      const fx = dx + X * k, fy = dy + Y * k, fw = w * k, fh = h * k;
      if (fw < 6) return;
      const amp = Math.max(0.8, Math.min(2.2, fh * 0.1)), col = Math.max(1, Math.round(1 / dpr * 2));
      for (let i = 0; i < fw; i += col) {
        const u = i / fw, off = Math.sin(t * 0.006 + j * 1.3 - u * 5) * amp * u;
        ctx.drawImage(bg, (fx + i) * dpr, fy * dpr, Math.ceil(col * dpr), fh * dpr, fx + i, fy + off, col, fh);
      }
    });
  }
  // the crowd's camera flashes: a few starbursts in the stands, a lot of them on a six
  if (L.stands) {
    const [y0, y1] = L.stands, n = flare > 0 ? 44 : 9;
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.0018 + i * 0.137 + (i % 5) * 0.29) % 1; if (ph > 0.16) continue;
      const a = 1 - ph / 0.16, x = (((i * 7919) % 997) / 997) * W, y = y0 + (0.15 + 0.85 * (((i * 104729) % 991) / 991)) * (y1 - y0), r = W / 95 * (0.6 + a);
      ctx.globalAlpha = a * (flare > 0 ? 0.95 : 0.75);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 1.5, y - r * 0.18, r * 3, r * 0.36); ctx.fillRect(x - r * 0.18, y - r * 1.5, r * 0.36, r * 3);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
