// Renders poses of the pace bowler from behind exactly as the match draws him (the premium kit: navy yoke, gold piping), bald,
// no print, a plain tan skin, on a transparent background: tools/build_spin_back.py takes the spinner's standing poses from these.
// usage (repo root, needs playwright): node tools/kit/render_pace_poses.mjs OUTDIR
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const root = process.cwd(), out = process.argv[2] || 'tools/kit/src/pace';
const FRAMES = ['start', 'field'];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split(/[?#]/)[0]);
  if (u === '/__blank.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><body style="margin:0"></body>'); return; }
  try { const b = await readFile(join(root, u)); res.writeHead(200, { 'content-type': types[extname(u)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${server.address().port}/__blank.html`);
const shots = await page.evaluate(async (frames) => {
  const bs = await import('/js/bowlsprite.js'), tm = await import('/js/teams.js'), ks = await import('/js/kitsprite.js');
  const team = tm.teamById('thunder');
  bs.loadBowlSprites('thunder');
  const look = { who: 'Pace Pose', skin: '#f0a870', hair: '#222222', cut: 'bald', num: 1 };
  CanvasRenderingContext2D.prototype.fillText = function () {}; CanvasRenderingContext2D.prototype.strokeText = function () {};   // (no name or number)
  const probe = document.createElement('canvas').getContext('2d');
  for (let k = 0; k < 300; k++) { if (ks.drawKitSprite(probe, 5, 5, 40, 'start', team, false, 'back', look)) break; await new Promise(r => setTimeout(r, 100)); }
  const res = {};
  for (const f of frames) {
    const c = document.createElement('canvas'); c.width = 700; c.height = 760;
    const g = c.getContext('2d');
    let ok = false;
    for (let t = 0; t < 100 && !ok; t++) { g.clearRect(0, 0, 700, 760); ok = ks.drawKitSprite(g, 350, 700, 300, f, team, false, 'back', look); if (!ok) await new Promise(r => setTimeout(r, 100)); }
    res[f] = ok ? c.toDataURL('image/png') : null;
  }
  return res;
}, FRAMES);
await mkdir(out, { recursive: true });
for (const [f, d] of Object.entries(shots)) { if (!d) { console.log('missing', f); continue; } await writeFile(join(out, `${f}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log('wrote', f); }
await browser.close(); server.close();
