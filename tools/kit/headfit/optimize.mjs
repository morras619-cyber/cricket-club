import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const root = new URL('../../../', import.meta.url).pathname, here = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split(/[?#]/)[0]);
  const p = u.startsWith('/__h/') ? join(here, u.slice(5)) : join(root, u === '/' ? 'index.html' : u);
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${server.address().port}/__h/blank.html`);
const result = await page.evaluate(async ([base]) => {
  const { loadHair, hairReady, dressSheet } = await import(base + '/js/hair.js');
  const out = {};
  for (const view of ['front', 'back']) {
    const heads = await (await fetch(`${base}/__h/out/heads-${view}.json`)).json();
    const zimg = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = `${base}/__h/out/zones-${view}.png`; });
    loadHair(); for (let k = 0; k < 100 && !hairReady(view); k++) await new Promise(r => setTimeout(r, 50));
    const WIN = 200, c = document.createElement('canvas'); c.width = WIN; c.height = WIN;
    const g = c.getContext('2d', { willReadFrequently: true });
    const zc = document.createElement('canvas'); zc.width = zimg.width; zc.height = zimg.height;
    const zg = zc.getContext('2d', { willReadFrequently: true }); zg.drawImage(zimg, 0, 0);
    const opts = view === 'front' ? { lift: -0.03, hairGrow: 1.06 } : { lift: -0.02, hairGrow: 1.06 };
    const res = [];
    heads.forEach((h, i) => {
      const Z = zg.getImageData(i * WIN, 0, WIN, WIN).data;
      let nz = 0, nf = 0; for (let k = 0; k < Z.length; k += 4) { if (Z[k] > 127) nz++; if (Z[k + 1] > 127) nf++; }
      const J = (p) => {
        g.clearRect(0, 0, WIN, WIN);
        dressSheet(g, { hair: 'buzz', beard: null, wear: null }, { 0: [WIN / 2 + p[0], 60 + p[1], h[2] * p[2], h[3] + p[3]] }, view, '#444444', '#fcad7d', opts);
        const D = g.getImageData(0, 0, WIN, WIN).data; let cz = 0, cf = 0;
        for (let k = 0; k < D.length; k += 4) { if (D[k + 3] > 128) { if (Z[k] > 127) cz++; if (Z[k + 1] > 127) cf++; } }
        return cz / Math.max(1, nz) - 2.5 * cf / Math.max(1, nf) - 0.002 * (p[0] ** 2 + p[1] ** 2) - 2 * (p[2] - 1) ** 2 - 1.0 * p[3] ** 2;
      };
      let p = [0, 0, 1, 0], best = J(p); const j0 = best;
      const steps = [[4, 4, 0.08, 0.16], [2, 2, 0.04, 0.08], [1, 1, 0.02, 0.04]];
      for (const st of steps) {
        let improved = true, guard = 0;
        while (improved && guard++ < 20) {
          improved = false;
          for (let d = 0; d < 4; d++) for (const sgn of [1, -1]) {
            const q = p.slice(); q[d] += sgn * st[d];
            if (Math.abs(q[0]) > 12 || Math.abs(q[1]) > 10 || q[2] < 0.94 || q[2] > 1.3 || Math.abs(q[3]) > 0.45) continue;
            const v = J(q); if (v > best + 1e-4) { best = v; p = q; improved = true; }
          }
        }
      }
      res.push({ pose: i + 1, p: p.map(v => Math.round(v * 1000) / 1000), j0: Math.round(j0 * 1000) / 1000, j1: Math.round(best * 1000) / 1000, head: h });
    });
    out[view] = res;
  }
  return out;
}, [`http://localhost:${server.address().port}`]);
for (const view of ['front', 'back']) {
  const hs = result[view].map(r => [r.head[0] + r.p[0], r.head[1] + r.p[1], Math.round(r.head[2] * r.p[2] * 10) / 10, Math.round((r.head[3] + r.p[3]) * 1000) / 1000]);
  await writeFile(`out/heads-${view}-opt.json`, JSON.stringify(hs));
  console.log(view); for (const r of result[view]) console.log(`  pose ${String(r.pose).padStart(2)}  shift (${r.p[0]}, ${r.p[1]})  size x${r.p[2]}  tilt ${r.p[3] >= 0 ? '+' : ''}${r.p[3]}   score ${r.j0} -> ${r.j1}`);
}
await browser.close(); server.close();
