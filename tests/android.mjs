// Android phones, as far as a desktop browser can stand in for them: a Pixel-class, a mid-range Galaxy A and a budget phone, each with its own screen, pixel density, a throttled
// processor and (for the load) a real mobile connection. For each it loads the game (bytes, requests and time to the first screen), then plays a bot Quick Match for a while and
// measures the frames (median, 95th and 99th percentile, how many dropped past 33 and 50 ms, the longest stall), the resolution the game settled on and the memory it holds.
// It prints a table against the budgets below. Usage: npm run android   (GATE=1 to exit non-zero on a failed budget, DEVICES=budget to pick, SECS=40 to play longer)
// This is not a phone: it tells you which way a change moves the numbers, and where a phone would struggle first. A real device is the only proof.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(process.execPath, '../../lib/node_modules/playwright'))); }
const root = resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split(/[?#]/)[0]), path = join(root, u === '/' ? 'index.html' : u);
  try { const d = await readFile(path); res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }); res.end(d); } catch { res.writeHead(404); res.end(); }
}).listen(0);

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
// cpu: how many times slower than this machine; mbps: the connection. Budgets: what a phone of that class should manage.
const DEVICES = {
  pixel: { name: 'Pixel 7 class', viewport: { width: 412, height: 915 }, dpr: 2.625, cpu: 1.5, mbps: 20, budget: { loadMB: 12, homeS: 5, p95: 24, p99: 40, over50: 2, heapMB: 400 } },
  galaxy: { name: 'Galaxy A14 class', viewport: { width: 360, height: 800 }, dpr: 2, cpu: 4, mbps: 9, budget: { loadMB: 12, homeS: 10, p95: 34, p99: 60, over50: 5, heapMB: 300 } },
  budget: { name: 'Budget (Tecno/Redmi) class', viewport: { width: 360, height: 640 }, dpr: 1.75, cpu: 6, mbps: 4, budget: { loadMB: 12, homeS: 20, p95: 50, p99: 90, over50: 12, heapMB: 220 } },
};
const pick = (process.env.DEVICES || Object.keys(DEVICES).join(',')).split(',').filter(k => DEVICES[k]);
const SECS = +(process.env.SECS || 25);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const rows = [];
for (const key of pick) {
  const D = DEVICES[key];
  const ctx = await browser.newContext({ viewport: D.viewport, deviceScaleFactor: D.dpr, isMobile: true, hasTouch: true, userAgent: UA });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e).slice(0, 200)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: D.cpu });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: D.mbps * 125000, uploadThroughput: D.mbps * 125000 / 4 });
  let bytes = 0, reqs = 0;
  cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength || 0; reqs++; });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(() => {
    window.__SIXCHARGE_BOT = true; window.__SIXCHARGE_SPEED = 1;
    window.__frames = []; window.__long = [];
    let last = 0; const tick = t => { if (last && !document.hidden) window.__frames.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch {}
    try { localStorage.setItem('sixcharge.coach.seen', '1'); } catch {}
  });
  const t0 = Date.now();
  await page.goto(`http://localhost:${server.address().port}/?modes=all`);
  await page.waitForFunction(() => [...document.querySelectorAll('section.screen')].some(s => !s.hidden) && !document.getElementById('splash')?.offsetParent, null, { timeout: 120000 }).catch(() => {});
  const homeS = (Date.now() - t0) / 1000;
  await page.waitForTimeout(1500);
  const loadMB = bytes / 1e6;
  // a bot Quick Match, with the network and processor left throttled as they are
  await page.evaluate(() => document.getElementById('btnQuick')?.click());
  await page.evaluate(() => document.getElementById('ptNext')?.click());
  await page.evaluate(() => document.getElementById('ptGo')?.click());
  const inMatch = await page.waitForFunction(() => { const h = document.getElementById('hud'); return h && !h.hidden && document.getElementById('matchLoad')?.hidden; }, null, { timeout: 180000 }).then(() => true).catch(() => false);
  let stats = { n: 0, p50: 0, p95: 0, p99: 0, over33: 0, over50: 0, max: 0, long: 0, dpr: null, heapMB: null };
  if (inMatch) {
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__frames.length = 0; window.__long.length = 0; });
    await page.waitForTimeout(SECS * 1000);
    const r = await page.evaluate(() => ({ f: window.__frames, long: window.__long.length, dpr: window.__sixcharge?.game?.dprCap ?? null, heap: performance.memory ? performance.memory.usedJSHeapSize / 1e6 : null }));
    const f = r.f.filter(x => x < 1000);
    stats = { n: f.length, p50: pct(f, 0.5), p95: pct(f, 0.95), p99: pct(f, 0.99), over33: 100 * f.filter(x => x > 33.4).length / Math.max(1, f.length), over50: 100 * f.filter(x => x > 50).length / Math.max(1, f.length), max: Math.max(0, ...f), long: r.long, dpr: r.dpr, heapMB: r.heap };
  }
  const B = D.budget, checks = [
    ['load size', loadMB, B.loadMB, '<='], ['time to first screen (s)', homeS, B.homeS, '<='], ['frame p95 (ms)', stats.p95, B.p95, '<='], ['frame p99 (ms)', stats.p99, B.p99, '<='],
    ['frames over 50 ms (%)', stats.over50, B.over50, '<='], ['JS heap (MB)', stats.heapMB ?? 0, B.heapMB, '<='],
  ].map(([what, v, lim]) => ({ what, v, lim, ok: inMatch || /load|first/.test(what) ? v <= lim : false }));
  rows.push({ key, D, loadMB, reqs, homeS, inMatch, stats, checks, errors });
  await ctx.close();
}
await browser.close(); server.close();

let failed = 0;
for (const r of rows) {
  const s = r.stats;
  console.log(`\n${r.D.name}: ${r.D.viewport.width}x${r.D.viewport.height} @${r.D.dpr}x, processor x${r.D.cpu} slower, ${r.D.mbps} Mbps`);
  console.log(`  load: ${r.loadMB.toFixed(1)} MB in ${r.reqs} requests, first screen after ${r.homeS.toFixed(1)} s`);
  if (r.inMatch) console.log(`  ${SECS} s of a match: ${s.n} frames, median ${s.p50.toFixed(1)} ms, p95 ${s.p95.toFixed(1)}, p99 ${s.p99.toFixed(1)}, worst ${s.max.toFixed(0)}; ${s.over33.toFixed(1)}% past 33 ms, ${s.over50.toFixed(1)}% past 50 ms; ${s.long} long tasks; resolution cap ${s.dpr ?? 'full'}; heap ${s.heapMB ? s.heapMB.toFixed(0) + ' MB' : 'n/a'}`);
  else console.log('  the match did not start in time');
  for (const c of r.checks) { const ok = c.ok; if (!ok) failed++; console.log(`  ${ok ? 'ok  ' : 'OVER'} ${c.what}: ${c.v.toFixed(1)} (budget ${c.lim})`); }
  if (r.errors.length) { failed++; console.log('  page errors:', r.errors.slice(0, 2)); }
}
console.log(failed ? `\n${failed} budget(s) missed` : '\nall budgets met');
process.exit(process.env.GATE && failed ? 1 : 0);
