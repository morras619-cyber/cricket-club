// Works out where the players' skin and hair are on every drawn sheet and saves it as
// img/mask-<sheet>.png (red = skin, green = hair), so phones don't have to compute it.
// Uses the same code as the game (js/looks.js), run in headless Chromium.
//
// usage: node tools/build_people_masks.mjs   (needs Playwright; re-run after changing a sheet)
// then shrink them to 3-colour PNGs: python3 tools/optimise_masks.py
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const TEAMS = ['thunder', 'cyclones', 'vipers', 'eagles', 'phoenix', 'titans', 'storm', 'royals'];
// mask name -> sheet
const SHEETS = {
  front: 'img/bowler.webp', batfront: 'img/batter-front.webp', 'spin-front': 'img/spinner-front.webp', 'spin-back': 'img/spinner-back-thunder.webp',
  ...Object.fromEntries(TEAMS.map(t => [`back-${t}`, `img/bowler-back-${t}.webp`])),
  ...Object.fromEntries(TEAMS.map(t => [`batter-${t}`, `img/batter-${t}.webp`])),
};

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const p = join(root, req.url.split(/[?#]/)[0] === '/' ? 'index.html' : req.url.split(/[?#]/)[0]);
  let body;
  try { body = await readFile(p); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(body);
}).listen(0);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${server.address().port}/index.html`);
for (const [name, src] of Object.entries(SHEETS)) {
  const t0 = Date.now();
  const url = await page.evaluate(async ([name, src]) => {
    const L = await import('/js/looks.js');
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/' + src; });
    return L.maskCanvas(img, name).toDataURL('image/png');
  }, [name, src]);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  await writeFile(join(root, `img/mask-${name}.png`), buf);
  console.log(`img/mask-${name}.png  ${(buf.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
}
await browser.close(); server.close();
