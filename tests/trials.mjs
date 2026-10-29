// The net trials, played by the bot in headless Chromium: create a club, face and bowl the six balls of every candidate, pick 4 batters and 5 bowlers,
// sign them: eleven in the squad, no money, on to the auction. Usage: npm run trials
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(process.execPath, '../../lib/node_modules/playwright'))); }
const root = resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split(/[?#]/)[0]), path = join(root, u === '/' ? 'index.html' : u);
  try { res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }); res.end(await readFile(path)); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [], fails = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => { window.__SIXCHARGE_BOT = true; window.__SIXCHARGE_SPEED = 4; });
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails.push(what); };
await page.goto(`http://localhost:${server.address().port}/`); await page.waitForTimeout(900);
await page.evaluate(() => { document.getElementById('tPlay').click(); });
await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('btnLeague').click()); await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('rgGo').click()); await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('ptMake').click()); await page.waitForTimeout(800);
await page.fill('#mkNameIn', 'Harbour Kings'); await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('mkGo').click()); await page.waitForTimeout(800);
check(/Go to the nets/.test(await page.textContent('#careerBody')), 'a new club goes to the nets, with nobody signed');
await page.evaluate(() => [...document.querySelectorAll('#careerBody button')].find(b => /Go to the nets/.test(b.textContent)).click());
await page.waitForFunction(() => document.querySelectorAll('.tcard').length === 12, null, { timeout: 240000 });
check(true, 'twelve candidates were tried and the pick screen is up');
if (process.env.SHOTS_DIR) { await page.waitForTimeout(500); await page.screenshot({ path: join(process.env.SHOTS_DIR, 'trials-pick.png') }); }
const lines = await page.evaluate(() => [...document.querySelectorAll('.tcard .tr')].map(e => e.textContent));
check(lines.length === 12 && lines.every(l => /^Nets: /.test(l)), `every candidate has a net result (${lines[0]} | ${lines[6]})`);
await page.evaluate(() => {
  const by = k => [...document.querySelectorAll(`.tcard[data-k="${k}"]`)];
  by('bat').slice(0, 4).forEach(b => b.click()); by('bowl').slice(0, 5).forEach(b => b.click());
});
check(/Sign the squad/.test(await page.textContent('#careerBody')), '4 batters and 5 bowlers picked');
if (process.env.SHOTS_DIR) { await page.screenshot({ path: join(process.env.SHOTS_DIR, 'trials-picked.png') }); await page.evaluate(() => [...document.querySelectorAll('.tab')].find(t => /Batters/.test(t.textContent)).click()); await page.waitForTimeout(700); await page.screenshot({ path: join(process.env.SHOTS_DIR, 'trials-bats.png') }); await page.evaluate(() => [...document.querySelectorAll('.tab')].find(t => /Bowlers/.test(t.textContent)).click()); await page.waitForTimeout(700); await page.screenshot({ path: join(process.env.SHOTS_DIR, 'trials-bowls.png') }); }
await page.evaluate(() => [...document.querySelectorAll('#careerBody button')].find(b => /Sign the squad/.test(b.textContent)).click());
await page.waitForTimeout(800);
const squad = await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('sixcharge.profile.v1')).career; return { club: Object.values(c.players).filter(p => p.team === c.club).length, money: c.money, phase: c.phase }; });
check(squad.club === 11 && squad.money === 0 && squad.phase === 'auction', `eleven signed, no money, on to the auction (${JSON.stringify(squad)})`);
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);
