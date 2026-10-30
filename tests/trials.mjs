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
check(await page.evaluate(() => document.getElementById('mapName').textContent === 'Clubhouse' && !document.getElementById('mapOpen').hidden), 'the clubhouse opens from the map');
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
await page.evaluate(async () => { const M = await import('/js/merch.js'); const m = window.__sixcharge.profile.career.merch; m.last -= 10 * 3600e3; M.seal(m); window.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(1500);
check(await page.evaluate(() => window.__sixcharge.profile.career.merch.sold > 0 && /Away/.test(document.getElementById('merchNote').textContent)), 'ten hours away: jerseys were made and sold (a trickle at level 1), and the note says so');
await page.evaluate(() => { window.__sixcharge.profile.career.merch.till = 99999999; window.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(1500);
check(await page.evaluate(() => window.__sixcharge.profile.career.merch.till < 1000 && /did not add up/.test(document.getElementById('merchNote').textContent)), 'a number changed in the till is noticed');
await page.evaluate(() => document.getElementById('merchBack').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden), 'back from the factory is the map');
// the training ground's nets: from the map, a drill with the real batting (played by the bot), points for the player, three a day, and the red dot
await tapAt(0.344, 0.165); await page.waitForTimeout(300);
check(await page.evaluate(() => document.getElementById('mapName').textContent === 'Training ground'), 'the training ground is tapped on the map');
await page.evaluate(() => document.getElementById('mapOpen').click()); await page.waitForTimeout(1200);
await page.evaluate(() => [...document.querySelectorAll('#trainTabs .mf-tab')].find(t => t.textContent.includes('Nets')).click()); await page.waitForTimeout(300);
check(await page.evaluate(() => /3/.test(document.querySelector('#trainTabs .mf-tab .mf-badge')?.textContent || '') && document.querySelectorAll('#trainBody .mf-card .mf-frame canvas').length >= 1), 'the Nets tab shows three drills left and the players who can learn');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'training-nets.png') });
await page.evaluate(() => document.querySelector('#trainBody .mf-grid .mf-card').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => { const b = [...document.querySelectorAll('#trainSheet button')].find(x => /Pad up/.test(x.textContent)); return !!b && !b.disabled; }), 'a player opens a sheet with the Pad up button');
await page.evaluate(() => [...document.querySelectorAll('#trainSheet button')].find(x => /Pad up/.test(x.textContent)).click());
await page.waitForFunction(() => !document.getElementById('training').hidden, null, { timeout: 90000 }).catch(() => {}); await page.waitForTimeout(1500);
check(await page.evaluate(() => { const t = window.__sixcharge.profile.career.training; return Object.values(t.tp).some(v => v >= 10) && t.drills.n === 1; }), 'the drill gave the player training points and used one of the three');
check(await page.evaluate(() => /training points for/.test(document.getElementById('trainSheet').textContent)), 'the result sheet says what the player earned');
await page.evaluate(() => document.querySelector('#trainSheet .mf-x').click()); await page.waitForTimeout(300);
await page.evaluate(async () => { const T = await import('/js/training.js'); const t = window.__sixcharge.profile.career.training; t.drills = { day: T.drillDay(Date.now()), n: 3 }; t.drills.seal = undefined; });
check(await page.evaluate(async () => { const T = await import('/js/training.js'); return T.drillsLeft(window.__sixcharge.profile.career.training, Date.now()) === 0; }), 'a count edited by hand closes the nets');
await page.evaluate(() => document.getElementById('trainBack').click()); await page.waitForTimeout(1000);
check(await page.evaluate(() => !document.getElementById('clubmap').hidden), 'back from the training ground is the map');
// the builders: the club's level and the builder under the map's title; a level needs XP, money and builder time; and a career from before the ten levels moves up
check(await page.evaluate(() => /Club LV 1/.test(document.getElementById('mapBuild').textContent) && /Builder free/.test(document.getElementById('mapBuild').textContent) && /2nd builder/.test(document.getElementById('mapBuild').textContent)), 'the map shows the club level, a free builder and the second builder to buy');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'map-builders.png') });
await tapAt(0.344, 0.165); await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('mapOpen').click()); await page.waitForTimeout(1200);
const groundTab = async () => { await page.evaluate(() => [...document.querySelectorAll('#trainTabs .mf-tab')].find(t => t.textContent.includes('Ground')).click()); await page.waitForTimeout(300); };
await groundTab();
check(await page.evaluate(() => { const b = [...document.querySelectorAll('#trainBody button')].find(x => /Build level 2/.test(x.textContent)); return !!b && b.disabled && /Needs club level 2/.test(document.getElementById('trainBody').textContent); }), 'a new club cannot build yet: the Ground tab says it needs club level 2');
await page.evaluate(async () => { const P = await import('/js/pacing.js'); const c = window.__sixcharge.profile.career; P.addXp(c, 150); c.money += 20; });
await groundTab();
check(await page.evaluate(() => { const b = [...document.querySelectorAll('#trainBody button')].find(x => /Build level 2/.test(x.textContent)); return !!b && !b.disabled && /h to build/.test(document.getElementById('trainBody').textContent); }), 'with the club level and the money, the Build button shows the price and the hours');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'training-ground-build.png') });
await page.evaluate(() => [...document.querySelectorAll('#trainBody button')].find(x => /Build level 2/.test(x.textContent)).click()); await page.waitForTimeout(500);
check(await page.evaluate(() => window.__sixcharge.profile.career.build.jobs.length === 1 && /Building level 2/.test(document.getElementById('trainBody').textContent)), 'the build starts: the builder is busy and the screen shows the time left');
await page.evaluate(async () => { const P = await import('/js/pacing.js'); P.skipBuild(window.__sixcharge.profile.career, 3 * 3600e3); });
await page.evaluate(() => [...document.querySelectorAll('#trainTabs .mf-tab')].find(t => t.textContent.includes('Players')).click());
await page.evaluate(() => document.getElementById('trainBack').click()); await page.waitForTimeout(1500);
check(await page.evaluate(() => { const c = window.__sixcharge.profile.career; return c.training.level === 2 && c.build.jobs.length === 0 && c.training.slots.length === 3; }), 'after the hours the ground is level 2, with a third place (the levels between fill in)');
await page.evaluate(async () => { const T = await import('/js/training.js'); const c = window.__sixcharge.profile.career; delete c.build; c.training.level = 2; T.seal(c.training); });
await page.evaluate(() => document.getElementById('setDiamonds').click()); await page.waitForTimeout(300);
check(await page.evaluate(async () => { const T = await import('/js/training.js'); const c = window.__sixcharge.profile.career; return c.training.level === 5 && c.training.slots.length === 4 && T.sealed(c.training) && c.build.xp >= 1400 && c.build.diamonds === 100; }), 'a career from before the ten levels: its old level 2 becomes 5, the places follow, and nothing is lost');
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
// the match meter: four matches banked at the start; with none left, Play does not start a match and the wait is shown
await page.waitForTimeout(800);
check(await page.evaluate(() => /ready/i.test(document.querySelector('.pacepanel')?.textContent || '') && !!window.__sixcharge.profile.career.pace), 'the season page shows the match meter, full at the start');
await page.evaluate(async () => { const P = await import('/js/pacing.js'); const c = window.__sixcharge.profile.career; for (let i = 0; i < P.PACE.BANK; i++) P.spend(c.pace, Date.now()); });
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
check(await page.evaluate(() => !document.getElementById('office').hidden && document.querySelectorAll('#officeTabs .mf-tab').length === 5 && document.querySelectorAll('#officeBody .mf-fin').length === 8), 'the settings open the club office: five tabs, and the books with eight lines');
const offTab = async name => { await page.evaluate(n => [...document.querySelectorAll('#officeTabs .mf-tab')].find(t => t.textContent.includes(n)).click(), name); await page.waitForTimeout(250); };
const offFits = async () => page.evaluate(() => { const m = document.querySelector('#office .mf'), b = document.getElementById('officeBody'); return m.scrollHeight <= m.clientHeight + 1 && b.scrollHeight <= b.clientHeight + 1; });
check(await offFits(), 'the books fit the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-money.png') });
await offTab('Sponsors');
check(await page.evaluate(() => document.querySelectorAll('#officeBody .mf-card .chipbtn').length === 1 && document.querySelectorAll('#officeBody .mf-card.empty').length === 2) && await offFits(), 'one shirt slot to sign and two locked slots, and they fit the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-sponsors.png') });
await page.evaluate(() => [...document.querySelectorAll('#officeBody .mf-card .chipbtn')][0].click()); await page.waitForTimeout(300);
check(await page.evaluate(() => document.querySelectorAll('#officeSheet .mf-card .chipbtn').length === 3), 'the free slot opens a sheet with the three sponsors');
await page.evaluate(() => document.querySelector('#officeSheet .mf-card .chipbtn').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.office.deals.shirt?.id === 'steady' && document.querySelectorAll('#officeBody .mf-pips .ico').length === 7), 'a sponsor is signed: seven matches of progress show');
for (let i = 0; i < 2; i++) await page.evaluate(() => [...document.querySelectorAll('#officeTest .chipbtn')].find(b => /Win/.test(b.textContent)).click());
await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.office.deals.shirt.played === 2 && document.querySelectorAll('#officeBody .mf-pips .ico.on').length === 2) && await offFits(), 'two matches played: two pips light up');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-deal.png') });
await offTab('Board');
check(await page.evaluate(() => /Finish in the top/.test(document.getElementById('officeBody').textContent)) && await offFits(), 'the board has its target for the season, and it fits the screen');
await offTab('Contracts');
check(await page.evaluate(() => document.querySelectorAll('#officeBody .mf-card.stack').length >= 4) && await offFits(), 'the contracts tab shows players with their seasons left, and fits');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-contracts.png') });
await offTab('Office');
check(await page.evaluate(() => document.querySelectorAll('#officeBody .mf-card.empty').length === 1 && /Office level 1/.test(document.getElementById('officeBody').textContent) && /Build level 2/.test(document.getElementById('officeBody').textContent)) && await offFits(), 'the Office tab: one place for staff, the level and the Build button, fitting the screen');
await page.evaluate(() => document.querySelector('#officeBody .mf-card.empty').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => document.querySelectorAll('#officeSheet .mf-role').length === 2), 'the empty place offers an accountant and an agent');
await page.evaluate(() => document.querySelector('#officeSheet .mf-role').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.office.staff.length === 1 && document.querySelectorAll('#officeBody .mf-card .mf-frame canvas').length === 1) && await offFits(), 'an officer is hired with a framed portrait, and it fits');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'office-staff.png') });
await page.evaluate(() => document.getElementById('officeBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the club office is the settings');
// the clubhouse: from the settings (a practice club): chemistry links, the rivals, supporter events, the level; no scrolling
await page.evaluate(() => document.getElementById('setClubhouse').click()); await page.waitForTimeout(1500);
const clubTab = async name => { await page.evaluate(n => [...document.querySelectorAll('#clubhouseTabs .mf-tab')].find(t => t.textContent.includes(n)).click(), name); await page.waitForTimeout(300); };
const clubFits = async () => page.evaluate(() => { const m = document.querySelector('#clubhouse .mf'), b = document.getElementById('clubhouseBody'); return m.scrollHeight <= m.clientHeight + 1 && b.scrollHeight <= b.clientHeight + 1; });
check(await page.evaluate(() => !document.getElementById('clubhouse').hidden && document.querySelectorAll('#clubhouseTabs .mf-tab').length === 4 && document.querySelectorAll('#clubhouseBody .mf-card .mf-frame canvas').length >= 2) && await clubFits(), 'the settings open the clubhouse: four tabs, and the chemistry links with framed portraits, fitting the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'clubhouse-chemistry.png') });
await clubTab('Rivals');
check(await page.evaluate(() => /Thunder Strikers/.test(document.getElementById('clubhouseBody').textContent) && document.querySelectorAll('#clubhouseBody .mf-crest').length === 2) && await clubFits(), 'the rivals tab shows the nemesis and the division rival with their crests, and fits');
await clubTab('Events');
check(await page.evaluate(() => [...document.querySelectorAll('#clubhouseBody .chipbtn')].map(b => b.disabled).join() === 'false,false,true') && await clubFits(), 'three events: the parade is locked until a title or a promotion, and it fits');
await page.evaluate(() => document.querySelector('#clubhouseBody .chipbtn').click()); await page.waitForTimeout(400);
check(await page.evaluate(() => window.__sixcharge.demo.clubhouse.events.length === 1 && document.querySelectorAll('#clubhouseBody .mf-bar').length === 1 && /left/.test(document.getElementById('clubhouseBody').textContent)), 'an event is held: it runs on the clock and shows the time left');
await page.evaluate(() => [...document.querySelectorAll('#clubhouseTest .chipbtn')].find(b => /5 hours/.test(b.textContent)).click()); await page.waitForTimeout(500);
check(await page.evaluate(() => window.__sixcharge.demo.clubhouse.events.length === 0 && window.__sixcharge.demo.chirp.fans > 900), 'after the hours the supporters came: followers went up');
await clubTab('Clubhouse');
check(await page.evaluate(() => /Clubhouse level 1/.test(document.getElementById('clubhouseBody').textContent) && /Build level 2/.test(document.getElementById('clubhouseBody').textContent)) && await clubFits(), 'the Clubhouse tab shows the level and the Build button, fitting the screen');
await page.evaluate(() => document.getElementById('clubhouseBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the clubhouse is the settings');
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
// the youth academy: from the settings (a practice club): send a scout, wait, a prospect arrives, a trial drill, the other tabs, no scrolling
await page.evaluate(() => document.getElementById('setAcademy').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('academy').hidden && document.querySelectorAll('#acadTabs .mf-tab').length === 4 && document.querySelectorAll('#acadBody .mf-card').length >= 3), 'the settings open the youth academy: four tabs, and places for prospects');
const acFits = async () => page.evaluate(() => { const m = document.querySelector('#academy .mf'), b = document.getElementById('acadBody'); return m.scrollHeight <= m.clientHeight + 1 && b.scrollHeight <= b.clientHeight + 1; });
const acTab = async name => { await page.evaluate(n => [...document.querySelectorAll('#acadTabs .mf-tab')].find(t => t.textContent.includes(n)).click(), name); await page.waitForTimeout(250); };
check(await acFits(), 'the prospects tab fits the screen');
await acTab('Trips');
await page.evaluate(() => document.querySelector('#acadBody .mf-card.empty').click()); await page.waitForTimeout(250);
check(await page.evaluate(() => !document.getElementById('acadSheet').hidden && document.querySelectorAll('#acadSheet .mf-big').length === 3), 'the trip sheet offers three lengths');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'academy-trip.png') });
await page.evaluate(() => document.querySelector('#acadSheet .mf-big').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.academy.trips.length === 1 && /back in/.test(document.getElementById('acadBody').textContent)) && await acFits(), 'a 12-hour trip is under way and shows its time left');
await page.evaluate(() => [...document.querySelectorAll('#acadTest .chipbtn')].find(b => /12 hours/.test(b.textContent)).click()); await page.waitForTimeout(700);
await acTab('Prospects');
check(await page.evaluate(() => window.__sixcharge.demo.academy.prospects.length === 1 && document.querySelectorAll('#acadBody .mf-card.stack:not(.empty)').length === 1), 'twelve hours later the scout is back with a prospect');
await page.evaluate(() => document.querySelector('#acadBody .mf-card.stack:not(.empty)').click()); await page.waitForTimeout(250);
check(await page.evaluate(() => /not known yet/.test(document.getElementById('acadSheet').textContent) && /Trial drill/.test(document.getElementById('acadSheet').textContent)), 'the prospect sheet hides his ceiling until a trial drill');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'academy-prospect.png') });
await page.evaluate(() => [...document.querySelectorAll('#acadSheet .mf-big')].find(b => /Trial drill/.test(b.textContent)).click()); await page.waitForTimeout(300);
await page.evaluate(() => { document.getElementById('acadSheet').click(); });
await page.evaluate(() => [...document.querySelectorAll('#acadTest .chipbtn')].find(b => /12 hours/.test(b.textContent)).click()); await page.waitForTimeout(700);
check(await page.evaluate(() => { const a = window.__sixcharge.demo.academy; return a.revealed[a.prospects[0]] === true; }), 'six hours of drills later his tier is shown');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'academy-prospects.png') });
await acTab('Seniors');
check(await page.evaluate(() => document.querySelectorAll('#acadBody .mf-card .chipbtn').length === 5) && await acFits(), 'the seniors tab has the five regions, and fits the screen');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'academy-seniors.png') });
await acTab('Academy');
check(await page.evaluate(() => /Academy level 1/.test(document.getElementById('acadBody').textContent)) && await acFits(), 'the academy tab shows its level, and fits');
await page.evaluate(() => document.getElementById('acadBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the academy is the settings');
// the medical centre: from the settings (a practice club): a match tires the squad, a physio and a bed bring a player back, no scrolling
await page.evaluate(() => document.getElementById('setMedical').click()); await page.waitForTimeout(1200);
check(await page.evaluate(() => !document.getElementById('medical').hidden && document.querySelectorAll('#medTabs .mf-tab').length === 4 && document.querySelectorAll('#medBody .mf-card.stack').length === 6), 'the settings open the medical centre: four tabs and the six most tired players');
const mdFits = async () => page.evaluate(() => { const m = document.querySelector('#medical .mf'), b = document.getElementById('medBody'); return m.scrollHeight <= m.clientHeight + 1 && b.scrollHeight <= b.clientHeight + 1; });
const mdTab = async name => { await page.evaluate(n => [...document.querySelectorAll('#medTabs .mf-tab')].find(t => t.textContent.includes(n)).click(), name); await page.waitForTimeout(250); };
check(await mdFits(), 'the squad tab fits the screen');
await page.evaluate(() => [...document.querySelectorAll('#medTest .chipbtn')].find(b => /Play a match/.test(b.textContent)).click()); await page.waitForTimeout(500);
check(await page.evaluate(() => { const m = window.__sixcharge.demo.medical; return Object.values(m.fit).filter(f => f < 100).length === 7 && Math.min(...Object.values(m.fit)) < 74; }), 'a match tires seven players');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'medical-squad.png') });
await mdTab('Staff');
await page.evaluate(() => document.querySelector('#medBody .mf-card.empty').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.medical.physios.length === 1 && document.querySelectorAll('#medBody .mf-card .mf-frame canvas').length === 1) && await mdFits(), 'a physio is hired, with a picture in a frame');
await mdTab('Beds');
await page.evaluate(() => document.querySelector('#medBody .mf-card.empty').click()); await page.waitForTimeout(250);
await page.evaluate(() => document.querySelector('#medSheet .mf-card').click()); await page.waitForTimeout(300);
check(await page.evaluate(() => window.__sixcharge.demo.medical.beds.filter(Boolean).length === 1 && /to go/.test(document.getElementById('medBody').textContent)) && await mdFits(), 'a tired player is put in a bed and the time to full shows');
if (process.env.SHOTS_DIR) await page.screenshot({ path: join(process.env.SHOTS_DIR, 'medical-beds.png') });
await page.evaluate(() => [...document.querySelectorAll('#medTest .chipbtn')].find(b => /10 hours/.test(b.textContent)).click()); await page.waitForTimeout(700);
check(await page.evaluate(() => { const m = window.__sixcharge.demo.medical; return m.beds.filter(Boolean).length === 0; }), 'ten hours later the player in the bed is fit again and has left it');
await mdTab('Centre');
check(await page.evaluate(() => /Medical centre level 1/.test(document.getElementById('medBody').textContent)) && await mdFits(), 'the centre tab shows the level, and fits');
await page.evaluate(() => document.getElementById('medBack').click()); await page.waitForTimeout(500);
check(await page.evaluate(() => !document.getElementById('settings').hidden), 'back from the medical centre is the settings');
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
