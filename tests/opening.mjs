// The story's opening, played for real in headless Chromium (not the bot, which skips it): the five panels, the black card, the Chirp post,
// then the final: 34/1, Kabir in pain, bowled first ball whatever he plays, 34/2, and on to the region choice.
// Usage: npm run opening
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
await page.addInitScript(() => { try { if (!localStorage.getItem('sixcharge.profile.v1')) localStorage.setItem('sixcharge.profile.v1', JSON.stringify({ tutorialDone: true, coachSeen: { welcome: 1 } })); } catch {} });
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails.push(what); };
await page.goto(`http://localhost:${server.address().port}/`); await page.waitForTimeout(900);
await page.evaluate(() => document.getElementById('tPlay').click()); await page.waitForTimeout(1800);   // (Play goes straight into the career: its opening story)
for (let i = 0; i < 7; i++) { await page.click('.cm-next'); await page.waitForTimeout(300); }
await page.waitForSelector('.cm-card', { timeout: 4000 }); check(/16 HOURS LATER/i.test(await page.textContent('.cm-card')), 'the black card says 16 hours later');
await page.waitForSelector('.cm-chirp.up', { timeout: 8000 });
const chirp = await page.textContent('.cm-chirp');
check(/Thunder Strikers/.test(chirp) && /4\.2M|M/.test(chirp), 'Chirp shows Thunder Strikers with millions of followers');
check(/choke/.test(chirp) && /Mina Cho/.test(chirp), 'one comment from a reporter asks if he will choke');
await page.click('.cm-go');
await page.waitForFunction(() => /34\s*\/\s*1/.test(document.querySelector('.hud-top')?.textContent || ''), null, { timeout: 8000 });
check(true, 'the match starts on 34/1');
await page.waitForSelector('.cm-card', { state: 'detached' }).catch(() => {});
await page.waitForTimeout(6500);
await page.mouse.move(300, 560); await page.mouse.down(); await page.mouse.move(300, 380, { steps: 4 }); await page.mouse.up();   // a shot
await page.waitForFunction(() => /34\s*\/\s*2/.test(document.querySelector('.hud-top')?.textContent || ''), null, { timeout: 9000 });
check(true, 'bowled first ball: 34/2');
await page.waitForFunction(() => /4 HOURS LATER/i.test(document.querySelector('.cm-card')?.textContent || ''), null, { timeout: 12000 });
check(true, 'a black card says 4 hours later');
await page.waitForSelector('.cm-next', { state: 'visible', timeout: 8000 });
await page.waitForTimeout(500);
let coach = false;
for (let i = 0; i < 8; i++) { await page.click('.cm-next'); await page.waitForTimeout(300); if (/cut from the team, effective immediately/.test(await page.textContent('#comic'))) coach = true; }
check(coach, 'the night scene ends with the coach\'s message: cut from the team, effective immediately');
for (let i = 0; i < 40 && await page.evaluate(() => document.getElementById('region').hidden); i++) { await page.click('.cm-next').catch(() => {}); await page.waitForTimeout(250); }
await page.waitForFunction(() => !document.getElementById('region').hidden, null, { timeout: 15000 });
check(true, 'the story moves on to the region choice');
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);
