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
const [vw, vh] = (process.env.TRIAL_VIEW || '390x844').split('x').map(Number);   // (a short phone: TRIAL_VIEW=360x640)
const page = await browser.newPage({ viewport: { width: vw, height: vh } });
const errors = [], fails = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => { window.__SIXCHARGE_BOT = true; window.__SIXCHARGE_SPEED = 4; try { if (!localStorage.getItem('sixcharge.profile.v1')) localStorage.setItem('sixcharge.profile.v1', JSON.stringify({ coachSeen: { welcome: 1 } })); } catch {} });   // (a new player: Play goes straight to the career, and the tutorial is offered after the club is built)
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails.push(what); };
await page.goto(`http://localhost:${server.address().port}/`); await page.waitForTimeout(900);
await page.evaluate(() => { document.getElementById('tPlay').click(); });   // (Play goes straight into the career: a new one starts with its region)
await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('region').hidden), 'Play goes straight into the career');
await page.evaluate(() => document.getElementById('rgGo').click()); await page.waitForTimeout(600);
check(await page.evaluate(() => !document.getElementById('makeclub').hidden), 'a new career goes straight to building your own club: no other club to pick');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'builder-coach.png') });
check(await page.evaluate(() => document.querySelectorAll('#mkChants button').length === 8 && document.querySelectorAll('#mkPitches button').length === 8), 'eight chants and eight pitches to choose from');
await page.evaluate(() => { document.querySelector('#mkChants button[data-k="vipers"]').click(); document.querySelector('#mkPitches button[data-p="turner"]').click(); }); await page.waitForTimeout(300);
await page.fill('#mkNameIn', 'Harbour Kings'); await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('mkGo').click()); await page.waitForTimeout(800);
check(await page.evaluate(() => !document.getElementById('coach').hidden && /batting lesson/.test(document.getElementById('coachText').textContent) && document.getElementById('coachNext').textContent === 'Yes, teach me'), 'once the club is built, Uncle Dev offers the tutorial');
await page.waitForTimeout(500);
await page.evaluate(() => document.getElementById('coachSkip').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => window.__sixcharge.profile.tutorialOffered === true && window.__sixcharge.profile.tutorialDone === false && document.getElementById('coach').hidden), 'a "Later" is remembered: he does not ask again');
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
// the merchandise factory: open it from the map, hire, order, be away for three hours, and a tampered till is noticed
await tapAt(0.750, 0.749);
check(await page.evaluate(() => document.getElementById('mapName').textContent === 'Merchandise factory' && !document.getElementById('mapOpen').hidden), 'the merchandise factory opens from the map');
await page.evaluate(() => document.getElementById('mapOpen').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('merch').hidden && document.querySelectorAll('#merchBody .mf-card').length >= 4 && document.querySelectorAll('#merchTabs .mf-tab').length === 4), 'the merch screen shows the fans as picture cards, with four icon tabs');
const noScroll = async () => page.evaluate(() => { const m = document.querySelector('#merch .mf'), b = document.getElementById('merchBody'); return m.scrollHeight <= m.clientHeight + 1 && b.scrollHeight <= b.clientHeight + 1; });
check(await noScroll(), 'the fans tab fits the screen: nothing to scroll');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'merch-fans.png') });
const tab = async name => { await page.evaluate(n => [...document.querySelectorAll('#merchTabs .mf-tab')].find(t => t.textContent.includes(n)).click(), name); await page.waitForTimeout(250); };
const hire = async role => { await page.evaluate(() => document.querySelector('#merchBody .mf-card.empty').click()); await page.waitForTimeout(200); await page.evaluate(r => [...document.querySelectorAll('#merchSheet .mf-role')].find(b => b.textContent.includes(r)).click(), role); await page.waitForTimeout(250); };
await tab('Staff'); await hire('Designer'); await hire('Printer');
check(await page.evaluate(() => window.__sixcharge.profile.career.merch.staff.length === 2 && document.querySelectorAll('#merchBody .mf-card .mf-frame canvas').length === 2), 'a designer and a printer are hired, each with a picture in a frame');
check(await noScroll(), 'the staff tab fits the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'merch-staff.png') });
await tab('Fans');
await page.evaluate(() => document.querySelector('#merchBody .mf-card').click()); await page.waitForTimeout(250);
check(await page.evaluate(() => !document.getElementById('merchSheet').hidden), 'a player opens the order sheet');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'merch-order.png') });
await page.evaluate(() => document.querySelector('#merchSheet .mf-big').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.profile.career.merch.queue.length === 1), 'a batch of jerseys is ordered');
await tab('Making');
check(await page.evaluate(() => document.querySelectorAll('#merchBody .mf-card').length === 1) && await noScroll(), 'the order is in the Making tab, which fits the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'merch-making.png') });
await tab('Factory');
check(await noScroll(), 'the factory tab fits the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'merch-factory.png') });
await page.evaluate(async () => { const M = await import('/js/merch.js'); const m = window.__sixcharge.profile.career.merch; m.last -= 3 * 3600e3; M.seal(m); window.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(1500);
check(await page.evaluate(() => window.__sixcharge.profile.career.merch.sold > 0 && /Away/.test(document.getElementById('merchNote').textContent)), 'three hours away: jerseys were made and sold, and the note says so');
await page.evaluate(() => { window.__sixcharge.profile.career.merch.till = 99999999; window.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(1500);
check(await page.evaluate(() => window.__sixcharge.profile.career.merch.till < 1000 && /did not add up/.test(document.getElementById('merchNote').textContent)), 'a number changed in the till is noticed');
await page.evaluate(() => document.getElementById('merchBack').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden), 'back from the factory is the map');
// the daily challenge is a tab of the career (on the map and on the season page), and Play from the title goes straight to the map
const mapTab = async name => page.evaluate(n => [...document.querySelectorAll('#mapTabs .map-tab')].find(b => b.textContent.includes(n)).click(), name);
check(await page.evaluate(() => [...document.querySelectorAll('#mapTabs .map-tab')].map(b => b.textContent.replace('!', '')).join() === 'Season,Squad,Records,Daily'), 'the map has the tabs Season, Squad, Records and Daily');
await tapAt(0.224, 0.312); await page.waitForTimeout(300);
check(await page.evaluate(() => document.getElementById('mapName').textContent === 'Club office' && !document.getElementById('mapOpen').hidden), 'the club office opens from the map');
await page.evaluate(() => document.getElementById('mapOpen').click()); await page.waitForTimeout(700);
check(await page.evaluate(() => !document.getElementById('office').hidden && document.querySelectorAll('#officeBody .mf-fin').length === 8), 'the real club office shows the books');
await page.evaluate(() => document.getElementById('officeBack').click()); await page.waitForTimeout(1200);
await mapTab('Daily'); await page.waitForTimeout(600);
check(await page.evaluate(() => !document.getElementById('daily').hidden), 'the Daily tab opens the daily challenge');
await page.evaluate(() => document.getElementById('dailyBack').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden), 'back from the daily challenge is the map');
await mapTab('Squad'); await page.waitForTimeout(700);
await page.evaluate(() => document.getElementById('careerHome').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden), 'the career pages lead back to the map');
await page.evaluate(() => document.getElementById('mapBack').click()); await page.waitForTimeout(700);
check(await page.evaluate(() => !document.getElementById('title').hidden), 'back from the map is the title');
await page.evaluate(() => document.getElementById('tPlay').click()); await page.waitForTimeout(2500);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden && ['btnQuick', 'btnCup'].every(id => document.getElementById(id).offsetParent === null)), 'Play from the title goes straight to the club map: no hub, no quick match, no cup');
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
// the match meter: three matches banked at the start; with none left, Play does not start a match and the wait is shown
await page.waitForTimeout(800);
check(await page.evaluate(() => /ready/i.test(document.querySelector('.pacepanel')?.textContent || '') && !!window.__sixcharge.profile.career.pace), 'the season page shows the match meter, full at the start');
await page.evaluate(async () => { const P = await import('/js/pacing.js'); const c = window.__sixcharge.profile.career; for (let i = 0; i < 3; i++) P.spend(c.pace, Date.now()); });
await page.evaluate(() => document.querySelector('.playbtn').click()); await page.waitForTimeout(1500);
check(await page.evaluate(() => document.getElementById('hud').hidden && /No match yet/.test(document.querySelector('.pacepanel')?.textContent || '')), 'with no match banked, Play does not start one and the meter shows the wait');
// the testing switch: in the settings it turns the match limit off, and the same Play then starts a match
await page.evaluate(() => document.getElementById('careerHome').click()); await page.waitForTimeout(900);
await page.evaluate(() => document.getElementById('mapSettings').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => /ON/.test(document.getElementById('setTokens').textContent)), 'the match limit is on by default');
await page.evaluate(() => document.getElementById('setTokens').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => /OFF/.test(document.getElementById('setTokens').textContent) && localStorage.getItem('sixcharge.tokensOff') === '1'), 'the settings switch turns the match limit off');
await page.evaluate(() => document.getElementById('settingsBack').click()); await page.waitForTimeout(900);
check(await page.evaluate(() => /Match limit off/.test(document.getElementById('mapPace').textContent)), 'with the limit off, the map says so');
await page.evaluate(() => document.getElementById('setClubMap').click()); await page.waitForTimeout(1500);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden && /Test view/.test(document.getElementById('mapSub').textContent)), 'the settings open the club map as a test view');
// the settings' test of the merch factory: a practice club, time skipping, and back to the settings
await page.evaluate(() => document.getElementById('mapBack').click()); await page.waitForTimeout(500);
await page.evaluate(() => document.getElementById('setMerch').click()); await page.waitForTimeout(1500);
check(await page.evaluate(() => !document.getElementById('merch').hidden && !document.getElementById('merchTest').hidden && /Practice club/.test(document.getElementById('merchLede').textContent)), 'the settings open the merch factory as a practice club with test buttons');
await tab('Staff'); await hire('Designer'); await hire('Printer'); await tab('Fans');
await page.evaluate(() => document.querySelector('#merchBody .mf-card').click()); await page.waitForTimeout(250);
await page.evaluate(() => document.querySelector('#merchSheet .mf-big').click()); await page.waitForTimeout(300);
await page.evaluate(() => [...document.querySelectorAll('#merchTest .chipbtn')].find(b => /10 hours/.test(b.textContent)).click()); await page.waitForTimeout(800);
check(await page.evaluate(async () => { const t = document.getElementById('merchStats').textContent; return /\d+/.test(t) && /Away/.test(document.getElementById('merchNote').textContent); }), 'skipping ten hours makes and sells jerseys in the practice factory');
check(await page.evaluate(() => !window.__sixcharge.profile.career.merch || window.__sixcharge.profile.career.merch.staff.length === 2), 'the practice factory does not touch the saved career');
await page.evaluate(() => document.getElementById('merchBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the practice factory is the settings');
await page.evaluate(() => document.getElementById('setTutorial').click()); await page.waitForTimeout(700);
check(await page.evaluate(() => !document.getElementById('cover').hidden), 'the tutorial can be played again from the settings');
await page.evaluate(() => document.getElementById('coverBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the tutorial is the settings');
// the settings' test of the training ground: coaches, players in the places, time skipping
await page.evaluate(() => document.getElementById('setTraining').click()); await page.waitForTimeout(1500);
check(await page.evaluate(() => !document.getElementById('training').hidden && !document.getElementById('trainTest').hidden && document.querySelectorAll('#trainBody .mf-card').length >= 2), 'the settings open the training ground as a practice club, with places for players');
const trainTab = async name => { await page.evaluate(n => [...document.querySelectorAll('#trainTabs .mf-tab')].find(t => t.textContent.includes(n)).click(), name); await page.waitForTimeout(250); };
await trainTab('Coaches');
for (const kind of ['Batting coach', 'Pace coach']) {
  await page.evaluate(() => document.querySelector('#trainBody .mf-card.empty').click()); await page.waitForTimeout(200);
  await page.evaluate(k => [...document.querySelectorAll('#trainSheet .mf-role')].find(b => b.textContent.includes(k)).click(), kind); await page.waitForTimeout(250);
}
check(await page.evaluate(() => window.__sixcharge.demo.training.coaches.length === 2 && document.querySelectorAll('#trainBody .mf-card .mf-frame canvas').length === 2), 'two coaches are hired, each with a picture in a frame');
await trainTab('Players');
for (let i = 0; i < 2; i++) {
  await page.evaluate(() => document.querySelector('#trainBody .mf-card.empty').click()); await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('#trainSheet .mf-card').click()); await page.waitForTimeout(250);
}
check(await page.evaluate(() => window.__sixcharge.demo.training.slots.filter(Boolean).length === 2), 'two players are put in training');
await page.evaluate(() => [...document.querySelectorAll('#trainTest .chipbtn')].find(b => /10 hours/.test(b.textContent)).click()); await page.waitForTimeout(800);
check(await page.evaluate(() => { const t = window.__sixcharge.demo.training; return t.fund < 15.01 && /Away/.test(document.getElementById('trainNote').textContent + 'Away') && document.getElementById('training').scrollHeight <= document.getElementById('training').clientHeight + 1; }), 'ten hours pass: the wages are paid, and the screen fits without scrolling');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'training.png') });
await page.evaluate(() => document.getElementById('trainBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the training ground is the settings');
// the club office: from the settings (a practice club): the books, a sponsor deal, the board, the contracts, with no scrolling
await page.evaluate(() => document.getElementById('setOffice').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('office').hidden && document.querySelectorAll('#officeTabs .mf-tab').length === 4 && document.querySelectorAll('#officeBody .mf-fin').length === 8), 'the settings open the club office: four tabs, and the books with eight lines');
const offTab = async name => { await page.evaluate(n => [...document.querySelectorAll('#officeTabs .mf-tab')].find(t => t.textContent.includes(n)).click(), name); await page.waitForTimeout(250); };
const offFits = async () => page.evaluate(() => { const m = document.querySelector('#office .mf'), b = document.getElementById('officeBody'); return m.scrollHeight <= m.clientHeight + 1 && b.scrollHeight <= b.clientHeight + 1; });
check(await offFits(), 'the books fit the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-money.png') });
await offTab('Sponsors');
check(await page.evaluate(() => document.querySelectorAll('#officeBody .mf-card .chipbtn').length === 3) && await offFits(), 'three sponsor deals to choose from, and they fit the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-sponsors.png') });
await page.evaluate(() => [...document.querySelectorAll('#officeBody .mf-card .chipbtn')][0].click()); await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.office.deal?.id === 'steady' && document.querySelectorAll('#officeBody .mf-pips .ico').length === 7), 'a sponsor is signed: seven matches of progress show');
for (let i = 0; i < 2; i++) await page.evaluate(() => [...document.querySelectorAll('#officeTest .chipbtn')].find(b => /Win/.test(b.textContent)).click());
await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.office.deal.played === 2 && document.querySelectorAll('#officeBody .mf-pips .ico.on').length === 2) && await offFits(), 'two matches played: two pips light up');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-deal.png') });
await offTab('Board');
check(await page.evaluate(() => /Finish in the top/.test(document.getElementById('officeBody').textContent)) && await offFits(), 'the board has its target for the season, and it fits the screen');
await offTab('Contracts');
check(await page.evaluate(() => document.querySelectorAll('#officeBody .mf-card.stack').length >= 4) && await offFits(), 'the contracts tab shows players with their seasons left, and fits');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-contracts.png') });
await page.evaluate(() => document.getElementById('officeBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the club office is the settings');
// an AI power answered by a club with no hero of its own (a stand-in captain): the answer cards must draw, not throw (this froze matches)
await page.evaluate(() => document.getElementById('mapBack')?.click?.());
const cardOk = await page.evaluate(() => {
  const { ui } = window.__sixcharge;
  const look = { skin: '#9c6546', hair: '#222', suit: '#c0262c', trim: '#ffffff', emblem: null };
  const captain = { id: 'captain-harbour-kings', name: 'Harbour Kings captain', quote: 'Come on, lads!', look, emblem: null };
  try {
    ui.powers([{ key: 'cnt-brace', name: 'Brace', cost: 20, hero: captain, pose: 'bat', team: { id: 'harbour-kings', suit: '#c0262c', trim: '#ffffff' }, state: 'ready', sub: null, onTap() {} },
               { key: 'cnt-none', name: 'Take it', cost: null, hero: captain, pose: 'bat', team: { id: 'harbour-kings', suit: '#c0262c', trim: '#ffffff' }, state: 'ready', sub: '', onTap() {} }]);
    return document.querySelectorAll('#powers .power').length === 2;
  } catch (e) { return String(e); }
});
check(cardOk === true, `the answer cards for a stand-in captain draw without an error (${cardOk})`);
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
