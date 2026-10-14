// Automated playthrough: a bot plays the tutorial and a full Quick Match in headless Chromium.
// Usage: npm run smoke  (serves the folder itself; screenshots land in SHOTS_DIR or ./smoke-shots)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(process.execPath, '../../lib/node_modules/playwright'))); }

const root = resolve(new URL('..', import.meta.url).pathname);
const shots = process.env.SHOTS_DIR || join(root, 'smoke-shots');
mkdirSync(shots, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const path = join(root, decodeURIComponent(req.url.split(/[?#]/)[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split(/[?#]/)[0]));
  try { res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }); res.end(await readFile(path)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push('request failed: ' + r.url()); });
await page.addInitScript(() => { window.__SIXCHARGE_BOT = true; window.__SIXCHARGE_SPEED = 4; });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto(url);
await page.waitForTimeout(600);
await page.screenshot({ path: join(shots, '01-home.png') });

const waitResult = async (label, maxMs) => {
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < maxMs) {
    if (await page.locator('#result').isVisible()) return true;
    if (errors.length) break;
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(shots, `${label}-${String(++i).padStart(2, '0')}.png`) });
  }
  return false;
};

// tutorial
await page.click('#btnTutorial');
await page.click('#coverGo');
const tut = await waitResult('02-tutorial', 90000);
console.log('tutorial finished:', tut);
await page.screenshot({ path: join(shots, '03-tutorial-result.png'), fullPage: true });

// quick match
await page.click('#resHome');
await page.click('#btnQuick');
await page.screenshot({ path: join(shots, '04-squad.png') });
await page.click('#squadGo');
const qm = await waitResult('05-match', 240000);
console.log('quick match finished:', qm);
await page.screenshot({ path: join(shots, '06-result.png') });
const link = await page.inputValue('#shareLink').catch(() => '');
console.log('challenge link:', link);
const resText = await page.textContent('#resText').catch(() => '');
console.log('result:', resText);

// challenge round-trip
if (link.includes('#c')) {
  await page.goto(url + link.slice(link.indexOf('#')));
  await page.waitForTimeout(500);
  console.log('challenge card:', await page.textContent('#challengeCard'));
  await page.screenshot({ path: join(shots, '07-challenge-home.png') });
  await page.click('#btnChallengeMode');
  await page.click('#squadGo');
  const ch = await waitResult('08-challenge', 180000);
  console.log('challenge finished:', ch, '-', await page.textContent('#resText').catch(() => ''));
  if (!ch) errors.push('challenge match did not finish');
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
await browser.close(); server.close();
process.exit(errors.length || !tut || !qm ? 1 : 0);
