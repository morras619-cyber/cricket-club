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
check(await page.evaluate(() => !document.getElementById('makeclub').hidden), 'a new career goes straight to building your own club: no other club to pick');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'builder-coach.png') });
check(await page.evaluate(() => document.querySelectorAll('#mkChants button').length === 8 && document.querySelectorAll('#mkPitches button').length === 8), 'eight chants and eight pitches to choose from');
await page.evaluate(() => { document.querySelector('#mkChants button[data-k="vipers"]').click(); document.querySelector('#mkPitches button[data-p="turner"]').click(); }); await page.waitForTimeout(300);
await page.fill('#mkNameIn', 'Harbour Kings'); await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('mkGo').click()); await page.waitForTimeout(800);
check(/Go to the nets/.test(await page.textContent('#careerBody')), 'a new club goes to the nets, with nobody signed');
check(await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('sixcharge.profile.v1')).career; return c.custom.chant === 'vipers' && c.custom.pitch === 'turner'; }), 'the chant and the pitch chosen are the club\'s');
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
// the ground and its caretaker, on the season's hub
await page.evaluate(async () => { const C = await import('/js/career.js'); const c = window.__sixcharge.profile.career; C.finishAuction(c); c.money = 1; document.getElementById('btnLeague').click(); });
await page.waitForTimeout(2500);
// the club map is the career's hub: tap the stadium, then open it
check(await page.evaluate(() => !document.getElementById('clubmap').hidden), 'the career opens on the club map');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'club-map.png') });
const tapAt = async (fx, fy) => { const r = await page.evaluate(([fx, fy]) => { const b = document.getElementById('mapCanvas').getBoundingClientRect(), sc = b.width / 1536; return { x: b.left + b.width / 2 + (fx - 0.5) * 1536 * sc, y: b.top + b.height / 2 + (fy - 0.5) * 2304 * sc }; }, [fx, fy]); await page.mouse.click(r.x, r.y); await page.waitForTimeout(300); };
await tapAt(0.504, 0.446);
check(await page.evaluate(() => !document.getElementById('mapSheet').hidden && document.getElementById('mapName').textContent === 'Stadium'), 'tapping the stadium selects it');
await tapAt(0.766, 0.592);
check(await page.evaluate(() => document.getElementById('mapName').textContent === 'Clubhouse' && document.getElementById('mapOpen').hidden), 'the clubhouse says coming soon, with nothing to open');
await tapAt(0.504, 0.446);
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'club-map-stadium.png') });
await page.mouse.move(195, 420); for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -200); await page.waitForTimeout(400);
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'club-map-zoom.png') });
check(await page.evaluate(() => !document.getElementById('clubmap').hidden), 'the map zooms with the wheel without errors');
await page.evaluate(() => document.getElementById('mapOpen').click());
await page.waitForTimeout(700);
check(await page.evaluate(() => /Ground & caretaker/.test(document.querySelector('.groundpanel')?.textContent || '') && /Bare, dry and cracked|bare, dry and cracked/.test(document.querySelector('.groundpanel')?.textContent || '')), 'the hub shows the ground as bare, dry and cracked, with the caretaker to hire');
await page.evaluate(() => [...document.querySelectorAll('.groundpanel button')].find(b => /Hire caretaker/.test(b.textContent)).click());
await page.waitForTimeout(700);
check(await page.evaluate(() => /on the job/.test(document.querySelector('.groundpanel')?.textContent || '')), 'the caretaker is hired and on the job');
await page.evaluate(() => document.getElementById('setClubMap').click()); await page.waitForTimeout(1500);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden && /Test view/.test(document.getElementById('mapSub').textContent)), 'the settings open the club map as a test view');
// the settings' Club map level: cycle to level 3 and the map shows it (and level 2, to draw both)
await page.evaluate(() => document.getElementById('mapBack').click()); await page.waitForTimeout(500);
for (const want of [2, 3]) {
  while (!new RegExp(`level: ${want}`).test(await page.evaluate(() => document.getElementById('setMapLevel').textContent))) await page.evaluate(() => document.getElementById('setMapLevel').click());
  await page.evaluate(() => document.getElementById('setClubMap').click()); await page.waitForTimeout(3500);
  check(await page.evaluate(w => new RegExp(`level ${w}`).test(document.getElementById('mapSub').textContent), want), `the settings' map level ${want} opens the map at level ${want}`);
  if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, `club-map-level${want}.png`) });
  await page.evaluate(() => document.getElementById('mapBack').click()); await page.waitForTimeout(400);
}
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);
