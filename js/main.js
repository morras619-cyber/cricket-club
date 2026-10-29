import { UI } from './ui.js';
import { Game } from './game.js';
import { HEROES, heroById, heroesFor, BAT_TYPES, POWERS, batTypeOf, bowlPowerOf } from './heroes.js';
import { TEAMS, CLUBS, teamById, rivalTeam, teamOfHero, logoSrc, setMyClub, setLogo } from './teams.js';
import { loadBowlSprites, spriteStatus } from './bowlsprite.js';
import { batSpriteMissing } from './batsprite.js';
import { squadPool, resolveLineup, batCandidates, bowlCandidates, bowlType, isUnlocked, UNLOCK_COST, ORDER_SIZE, ATTACK_SIZE, roster, fullName, flagName, starSquad, playerSquad, ovr, ratingStars } from './squads.js';
import { flag, nationName } from './nations.js';
import { faceEl } from './looks.js';
import { futCard, portraitFace } from './futcard.js';
import { groundOf, pitchOf, homeFromSeed, GROUNDS } from './grounds.js';
import { GUIDE, GUIDE_ORDER, meters } from './pitchguide.js';
import { newLeague, newCup, nextFixture, advance, playerResult, table, finish, unbeaten, ordinal, LEAGUE_PRIZE, CUP_PRIZE } from './tournament.js';
import { newCareer, chooseClub, currentLot, nextBid, bid, pass as passLot, finishAuction, nextSeason, afterLeagueMatch, clubPlayers, clubPool, clubHeroes, clubRating,
  value, potentialStars, ageNote, money, assessLot, squadNeeds, openingPrice, rivalsOf, leaders, playerName, ABILITIES, MAX_SQUAD, MIN_SQUAD, PEAK_AGE, STAR_OVR, isUnlocked as careerUnlocked, divisionOf, divisionName, afterPlayoff, migrateCareer, SCOUT_FEE, SCOUT_REGIONS, scoutOut, sendScout, scoutFinds, signFind, finishScouts, createClub, STADIUMS, stadiumLevel, upgradeBlock, upgradeStadium, releasePlayer } from './career.js';
import { dailyScenario, updateStreak } from './daily.js';
import { checkAchievements, ACHIEVEMENTS } from './progress.js';
import { portrait } from './figure.js';
import { randomSeed } from './rng.js';
import { encodeChallenge, decodeChallenge } from './codec.js';
import { renderShareCard } from './sharecard.js';
import { levelOf, levelName, learn, adaptScale } from './adapt.js';
import { preMatch } from './rivals.js';
import { ensureChirp, faceOfPress, faceStyle, compact, buzzWord, handleOf, sponsorBonus, crowdOf, CROWD_TIMING, engagement } from './chirp.js';
import { loadProfile, saveProfile, level, dailyAvailable, claimDaily, matchRewards, DAILY, careerStats, recordStats, fmt, unlockHero,
  passState, passReward, claimPass, PASS_TIERS, GEM_DEALS, buyCoins } from './profile.js';
import { sound, unlockAudio, sfx, buzz, startAmbience, stopAmbience, crowdStop, crowdSing } from './audio.js';
import { FEATURES } from './config.js';
import { SIDES, WEEKENDS, warClock, weekendSpan, countdown, totals, feed, leader, watchWar, saveMine, myRecord, namesOf, myId, warOnline } from './war.js';
import { units } from './units.js';
import { teamStars } from './teamrating.js';
import { initCoach, coachOnce, coachSay, DEV, QUICK_TIPS } from './coach.js';
import { storyIntro, taunt } from './story.js';
import { playComic, titleCard, NIGHT } from './comic.js';
import { EMBLEM_IDS, loadCrestMasks, paintCrest } from './crest.js';
import { stadiumThumb } from './ownground.js';
import { TossAnim, loadToss } from './toss.js';
import { loadKitSprites, drawKitFielder } from './kitsprite.js';

// framed by another app (e.g. a viewer with its own header): don't add the notch space again
try { if (window.self !== window.top) document.documentElement.classList.add('embedded'); } catch { document.documentElement.classList.add('embedded'); }

const $ = id => document.getElementById(id);
const ui = new UI();
const game = new Game(ui);
const profile = loadProfile();
// Uncle Dev remembers what he has told you (never during the automated test runs)
// the coin toss art loads in the background, ready for the first match
setTimeout(loadToss, 1500);
initCoach({
  seen: k => !!window.__SIXCHARGE_BOT || !!profile.coachSeen?.[k],
  mark: k => { profile.coachSeen = { ...profile.coachSeen, [k]: 1 }; saveProfile(profile); },
});
// a quick match: his next tip, now and then once he has given them all
// in the tutorial he speaks whenever his tips are on (always the first time); elsewhere, once each
let tutTips = true;
game.taunt = taunt;
game.coach = key => (game.mode === 'tutorial' ? (tutTips && !window.__SIXCHARGE_BOT ? coachSay(DEV[key]) : Promise.resolve()) : coachOnce(key, DEV[key]));
async function quickTip() {
  if (window.__SIXCHARGE_BOT) return;
  const next = QUICK_TIPS.find(([k]) => !profile.coachSeen?.[k]);
  if (next) return coachOnce(next[0], [next[1]]);
  if (Math.random() < 0.25) return coachSay([QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)][1]]);
}
// heroes are retired: the coins spent signing other teams' stars come back (once), and hero levels are gone
if (!profile.heroesRetired) {
  profile.coins = (profile.coins || 0) + UNLOCK_COST * (profile.unlocked || []).length;
  profile.unlocked = []; profile.squad = { bat: null, bowl: null, field: null }; profile.heroXp = {};
  profile.heroesRetired = true;
  saveProfile(profile);
}
// careers saved before players had countries
if (profile.career) { migrateCareer(profile.career); setMyClub(profile.career.custom); }
// start downloading the bowler sheets (pace and spin) while the menus are up
loadBowlSprites(profile.team || 'thunder');
sound.on = profile.settings.sound;
sound.haptics = profile.settings.haptics;
game.settings.fielding = profile.settings.fielding;
units.speed = profile.settings.units === 'mph' ? 'mph' : 'kmh';
window.__sixcharge = { game, ui, profile };
game.onFieldSaved = choice => { profile.field = { preset: choice.field, custom: choice.custom }; saveProfile(profile); };

let challenge = decodeChallenge(location.hash.slice(1));
let pending = null; // { mode, challenge }
let lastSummary = null;
let tourNotes = []; // what happened in the tournament after the last match

const FIELD_LABEL = { key: 'Fielding: key moments', all: 'Fielding: every chance', off: 'Fielding: auto' };

// ---------- screens that never scroll down: tabs and swipeable pages ----------
// fitPage: a page's content is shrunk, if it has to be, to fit the page (the real fonts are taller than a test's, and phones
// differ): nothing is cut off and nothing scrolls. Pages inside a carousel that grows with its content are left alone.
const fitWatch = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => fitPage(e.target))) : null;
function fitPage(pg) {
  if (pg.parentElement && getComputedStyle(pg.parentElement).flexGrow === '0') return;
  if (pg.querySelector('.chirp')) { pg.classList.add('scrolls'); return; }   // (the feed is long: it scrolls instead of shrinking)
  let box = pg.querySelector(':scope > .fitbox');
  if (!box) {
    box = el('div', 'fitbox');
    if (pg.classList.contains('futpage')) box.classList.add('futpage');
    box.append(...pg.childNodes); pg.append(box);
  }
  box.style.width = ''; box.style.transform = '';
  const avail = pg.clientHeight - 12;
  if (avail <= 40) return;                                  // (hidden for now: it is fitted when it is shown)
  let h = box.offsetHeight;
  if (h <= avail) return;
  let s = Math.max(0.6, avail / h);
  for (let i = 0; i < 2; i++) { box.style.width = `${100 / s}%`; h = box.offsetHeight; s = Math.max(0.6, Math.min(1, avail / h)); }
  box.style.width = `${100 / s}%`; box.style.transformOrigin = '0 0'; box.style.transform = `scale(${s})`;
}
const watchFit = pg => { fitWatch?.observe(pg); requestAnimationFrame(() => fitPage(pg)); };
document.fonts?.ready?.then(() => document.querySelectorAll('.pages > .page').forEach(fitPage));
// pager: a tab bar over pages that swipe left and right (a tap on a tab slides to its page). Each page fits the screen.
function pager(host, pages, start = 0) {
  host.innerHTML = '';
  host.classList.add('pagerhost');
  const tabs = el('div', 'tabs'), track = el('div', 'pages');
  pages.forEach(([name, nodes], i) => {
    const b = el('button', 'tab', name);
    b.addEventListener('click', () => { sfx.click(); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); });
    tabs.append(b);
    const pg = el('div', 'page'); pg.append(...[].concat(nodes)); track.append(pg); watchFit(pg);
  });
  const sync = () => { const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); [...tabs.children].forEach((t, k) => t.classList.toggle('on', k === i)); };
  track.addEventListener('scroll', sync, { passive: true });
  tabs.hidden = pages.length < 2;
  host.append(tabs, track);
  requestAnimationFrame(() => { track.scrollLeft = start * track.clientWidth; sync(); });
}
// autoPages: the panels already in `body` become tabs over swipeable pages, named from their headings. Whatever comes before
// the first headed panel (notes, the fixture card) is the first page, called `first`.
function autoPages(body, first = 'Match') {
  const kids = [...body.children];
  const NAMES = { 'your results': 'Results', 'across the divisions': 'Divisions', 'travelling scouts': 'Scouts', 'off-season news': 'News' };
  const raw = k => (k.querySelector?.('.lp-head b') || k.querySelector?.('h3'))?.textContent?.replace(/[^\p{L}\p{N}' -]/gu, '').trim();
  const name = k => {
    if (k.classList.contains('stadpanel')) return 'Stadium';
    const h = raw(k);
    if (!h) return null;
    return NAMES[h.toLowerCase()] || (h.length > 11 ? h.split(' ')[0] : h);
  };
  // what belongs on the first page: notes, the fixture card, the auction lot, the season result
  const lead = k => ['notecard', 'fixture', 'lotcard'].some(c => k.classList.contains(c));
  const pages = [];
  let first_ = [];
  for (const k of kids) {
    const n = lead(k) ? null : name(k);
    if (n) pages.push([n, [k]]); else first_.push(k);
  }
  if (first_.length) pages.unshift([first, first_]);
  if (!pages.length) return;
  pager(body, pages);   // (one page alone has no tab bar, but still fits the screen)
}
// fitBlock: a whole screen block (the team picker) is shrunk to fit its screen, so its buttons are never pushed out of sight
function fitBlock(pt) {
  const sc = pt.closest('.screen');
  if (!sc || sc.hidden || sc.clientHeight < 200) return;
  pt.style.cssText = 'height:auto;min-height:0;margin:0 auto;';
  let h = pt.offsetHeight; const avail = sc.clientHeight - (parseFloat(getComputedStyle(sc).paddingTop) || 0);
  if (h <= avail) { pt.style.cssText = ''; return; }
  let k = Math.max(0.6, avail / h);
  for (let i = 0; i < 2; i++) { pt.style.cssText = `height:auto;min-height:0;margin:0;width:${100 / k}%;max-width:none;`; h = pt.offsetHeight; k = Math.max(0.6, Math.min(1, avail / h)); }
  pt.style.cssText = `height:auto;min-height:0;margin:0;width:${100 / k}%;max-width:none;transform-origin:0 0;transform:scale(${k});`;
}
function watchBlock(sel) {
  const pt = document.querySelector(sel); if (!pt || typeof ResizeObserver === 'undefined') return;
  new ResizeObserver(() => fitBlock(pt)).observe(pt.closest('.screen'));
  document.fonts?.ready?.then(() => fitBlock(pt));
}
// (the club maker's three sections are tabs, set up once)
function setupClubTabs() {
  const secs = [...document.querySelectorAll('#mkPanel > .mk-sec')];
  if (secs.length === 3) pager($('mkPanel'), [['Name', secs[0]], ['Colours', secs[1]], ['Crest', secs[2]]]);
}
// carousel: a long list as swipeable pages of `per` rows, with dots
function carousel(nodes, per) {
  const wrap = el('div', 'carousel'), track = el('div', 'pages'), dots = el('div', 'dots');
  for (let i = 0; i < nodes.length; i += per) {
    const pg = el('div', 'page'); pg.append(...nodes.slice(i, i + per)); track.append(pg); dots.append(el('i')); watchFit(pg);
  }
  const sync = () => { const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); [...dots.children].forEach((d, j) => d.classList.toggle('on', j === k)); };
  track.addEventListener('scroll', sync, { passive: true });
  wrap.append(track, dots); requestAnimationFrame(sync);
  return wrap;
}

// ---------- the pitch guide: what each pitch does, from Settings or the venue line of a fixture ----------
let pitchGuideBack = 'home';
// a venue line you can tap: it opens the guide to that pitch
function pitchLink(node, pitchId) {
  node.classList.add('pitchlink'); node.setAttribute('role', 'button'); node.title = 'How this pitch plays';
  node.append(el('span', 'pg-i', ' ⓘ'));
  node.addEventListener('click', () => { sfx.click(); openPitchGuide(pitchId); });
  return node;
}
function openPitchGuide(pitchId) {
  const here = [...document.querySelectorAll('section.screen')].find(s => !s.hidden);
  if (here && here.id !== 'pitches') pitchGuideBack = here.id;
  ui.show('pitches');
  const body = $('pgBody');
  const cards = GUIDE_ORDER.map(id => {
    const g = GUIDE[id];
    const clubs = Object.entries(GROUNDS).filter(([c, G]) => G.pitch?.id === id && G.landmark && !['india', 'pakistan'].includes(c));   // (the painted grounds)
    const P = clubs[0]?.[1].pitch || {};
    const card = el('div', 'panel paper pgcard');
    const head = el('div', 'pg-head');
    head.append(el('h3', '', P.name || id), el('p', 'pg-at', clubs.length ? `Played at ${clubs.map(([, G]) => G.name).join(', ')}, and in a milder form at some club grounds` : 'Played at some club grounds'));
    const grid = el('div', 'pg-meters');
    for (const [label, n] of meters(P)) {
      const row = el('div', 'pg-row'), pipsEl = el('span', 'pg-pips');
      for (let i = 1; i <= 5; i++) pipsEl.append(el('i', i <= n ? 'on' : ''));
      row.append(el('b', '', label), pipsEl); grid.append(row);
    }
    const does = el('ul', 'pg-does'); for (const t of g.does) does.append(el('li', '', t));
    const tips = el('div', 'pg-tips');
    tips.append(el('p', '', ''), el('p', ''));
    tips.children[0].append(el('b', '', 'Batting '), g.bat); tips.children[1].append(el('b', '', 'Bowling '), g.bowl);
    card.append(head, el('p', 'pg-sum', g.sum), grid, does, tips);
    return [id, card];
  });
  const start = Math.max(0, cards.findIndex(([id]) => id === pitchId));
  pager(body, cards.map(([id, card]) => [id, card]), start);
  body.querySelector('.tabs').hidden = true;                       // (swipe between pitches: dots show where you are)
  const dots = el('div', 'dots'); for (let i = 0; i < cards.length; i++) dots.append(el('i'));
  const track = body.querySelector('.pages');
  const sync = () => { const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); [...dots.children].forEach((d, j) => d.classList.toggle('on', j === k)); };
  track.addEventListener('scroll', sync, { passive: true }); body.append(dots); requestAnimationFrame(() => requestAnimationFrame(sync));
}
$('pgBack').addEventListener('click', () => { sfx.click(); ui.show(pitchGuideBack || 'home'); });
$('setPitches').addEventListener('click', () => { sfx.click(); openPitchGuide(pitchOf(profile.team || 'thunder').id); });

// ---------- the title screen: the first thing a returning player sees; Play goes to the hub ----------
const myTeam = () => teamById(profile.team || 'thunder');
function renderTitle() {
  ui.show('title');
  const { lv, progress } = level(profile.xp);
  $('tLvl').textContent = `Lv ${lv}`;
  $('tXp').style.width = `${Math.round(progress * 100)}%`;
  $('tCoins').textContent = profile.coins;
  $('tGems').textContent = profile.gems || 0;
  const t = myTeam();
  $('tLogo').src = logoSrc(t.id);
  $('tName').textContent = t.name;
  $('tStyle').textContent = `${t.style.tag} · ★ ${heroById(t.star).name}`;
}
// (a player who has not done the tutorial goes to it first: the story of the Thunder Strikers)
$('tPlay').addEventListener('click', () => { unlockAudio(); sfx.click(); if (!profile.tutorialDone && !challenge) startStory(); else renderHome(); });
$('tSettings').addEventListener('click', () => { unlockAudio(); renderSettings(); });
for (const id of ['tCoinPill', 'tGemPill']) $(id).addEventListener('click', () => { unlockAudio(); renderShop(); });
$('tTeam').addEventListener('click', () => { unlockAudio(); sfx.click(); if (!profile.tutorialDone && !challenge) startStory(); else renderHome(); });

// ---------- home: the hub ----------
function renderHome() {
  ui.show('home');
  $('btnWar').hidden = !FEATURES.war; $('btnPass').hidden = !FEATURES.pass;
  if (FEATURES.war) { warWatch(); warBanner(); }
  const { lv, progress } = level(profile.xp);
  $('lvl').textContent = `Lv ${lv}`;
  $('xpFill').style.width = `${Math.round(progress * 100)}%`;
  $('coins').textContent = profile.coins;
  $('gems').textContent = profile.gems || 0;
  const t = myTeam();
  $('badgeLogo').src = logoSrc(t.id);
  $('badgeName').textContent = t.name;
  $('badgeStyle').textContent = `${t.style.tag} · ★ ${heroById(t.star).name}`;
  // the shop's dot: today's login reward waiting
  $('shopDot').hidden = !dailyAvailable(profile);
  const ps = passState(profile);
  $('passSeason').textContent = `Season ${ps.season}`;
  $('passCount').textContent = `${ps.tier} / ${PASS_TIERS}`;
  $('passFill').style.width = `${Math.round(((ps.tier + (ps.tier < PASS_TIERS ? ps.progress : 0)) / PASS_TIERS) * 100)}%`;
  $('passDot').hidden = ps.ready <= 0;
  // what each mode is doing right now
  const tour = profile.tournament;
  const status = kind => {
    if (tour?.kind !== kind) return null;
    const f = nextFixture(tour);
    return f ? `${teamById(tour.team).name} · ${f.label} v ${teamById(f.opp).name}` : 'Finished — see the results';
  };
  const c = profile.career;
  // the small print on the mode blocks: one line each, as the blocks were drawn
  const lines = (...l) => l.filter(Boolean).map(x => `• ${x}`).join('\n');
  const club = c?.club ? teamById(c.club).name : '';
  $('leagueSub').textContent = !c ? lines('Pick a club', 'Win the auction', 'Build a dynasty')
    : c.phase === 'pick' ? lines(`Season ${c.season}`, 'Pick your club')
      : c.phase === 'scouts' ? lines(`Season ${c.season} · ${club}`, 'Your scouts are home', `${money(c.money)} to spend`)
      : c.phase === 'playoff' ? lines(`Season ${c.season} · ${club}`, 'Relegation play-off!')
      : c.phase === 'auction' ? lines(`Season ${c.season} · ${club}`, 'Auction', `${money(c.money)} to spend`)
        : c.phase === 'done' ? lines(`Season ${c.season} over · ${club}`, `${money(c.money)} in the bank`)
          : lines(`Season ${c.season} · ${club}`, (f => f && `${f.label} v ${teamById(f.opp).name}`)(nextFixture(c.league)), `${money(c.money)} in the bank`);
  $('cupSub').textContent = status('cup')?.replace(' · ', '\n') || 'Quarter, semi, final:\n3 wins for the cup';
  const sc = dailyScenario(), done = profile.dailyChallenge?.key === sc.key;
  $('dailySub').textContent = done ? `Done today ${profile.dailyChallenge.won ? '✅' : '❌'}\n${profile.dailyChallenge.line}` : `#${sc.no}\n${sc.title}`;
  $('btnDaily').classList.toggle('done', done);
  $('trophyCount').textContent = `${Object.keys(profile.achievements || {}).length}/${ACHIEVEMENTS.length}`;
  const card = $('challengeCard');
  if (challenge) {
    card.hidden = false;
    card.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = `${challenge.name} challenged you!`;
    const p = document.createElement('p'); p.textContent = `Beat ${challenge.target} off the same 30 balls they faced (${challenge.wkts} down)${challenge.opp ? ` against ${teamById(challenge.opp).name}` : ''}.`;
    card.append(h, p);
    $('btnChallengeMode').hidden = false;
  } else { card.hidden = true; $('btnChallengeMode').hidden = true; }
}

// ---------- settings ----------
function renderSettings() {
  ui.show('settings');
  $('playerName').value = profile.name;
  const state = (id, text, on) => { const b = $(id); b.querySelector('span').textContent = text; b.classList.toggle('off', !on); };
  state('setSound', sound.on ? 'On' : 'Off', sound.on);
  state('setHaptics', sound.haptics ? 'On' : 'Off', sound.haptics);
  state('setField', { key: 'Key moments', all: 'Every chance', off: 'Auto' }[game.settings.fielding], game.settings.fielding !== 'off');
  state('setUnits', units.speed === 'mph' ? 'mph' : 'km/h', true);
}
$('btnSettings').addEventListener('click', () => { unlockAudio(); renderSettings(); });
$('settingsBack').addEventListener('click', () => renderHome());
$('setStory').addEventListener('click', () => { unlockAudio(); careerOpening().then(renderSettings); });   // (the career's opening story again; it plays by itself only the first time)
$('playerName').addEventListener('input', e => { profile.name = e.target.value.trim().slice(0, 14); saveProfile(profile); });
$('setSound').addEventListener('click', () => { sound.on = !sound.on; profile.settings.sound = sound.on; saveProfile(profile); unlockAudio(); renderSettings(); });
$('setHaptics').addEventListener('click', () => { sound.haptics = !sound.haptics; profile.settings.haptics = sound.haptics; saveProfile(profile); renderSettings(); });
$('setField').addEventListener('click', () => {
  const order = ['key', 'all', 'off'];
  game.settings.fielding = order[(order.indexOf(game.settings.fielding) + 1) % 3];
  profile.settings.fielding = game.settings.fielding; saveProfile(profile); renderSettings();
});

$('setUnits').addEventListener('click', () => {
  units.speed = units.speed === 'mph' ? 'kmh' : 'mph';
  profile.settings.units = units.speed; saveProfile(profile); renderSettings();
});

// ---------- shop: the daily login reward, and gems for coins ----------
function renderShop() {
  ui.show('shop');
  $('shopCoins').textContent = profile.coins;
  $('shopGems').textContent = profile.gems || 0;
  const d = $('shopDaily');
  d.innerHTML = '';
  const next = profile.daily.day % 7;
  const cal = el('div', 'dailycal');
  DAILY.forEach((n, i) => cal.append(el('span', i < next ? 'got' : i === next && dailyAvailable(profile) ? 'now' : '', `D${i + 1}\n${n}`)));
  d.append(el('h3', '', 'Daily reward'), cal);
  const claim = el('button', 'bigbtn primary', dailyAvailable(profile) ? `Claim +${DAILY[next]} coins` : 'Come back tomorrow');
  claim.disabled = !dailyAvailable(profile);
  claim.addEventListener('click', () => {
    const r = claimDaily(profile);
    if (r) { saveProfile(profile); ui.toast(`Day ${r.day}: +${r.coins} coins`); sfx.dhol(); }
    renderShop();
  });
  d.append(claim);
  const deals = $('shopDeals');
  deals.innerHTML = '';
  GEM_DEALS.forEach((g, i) => {
    const b = el('button', 'dealcard');
    b.append(el('b', '', `${g.coins}`), el('small', '', 'coins'), el('span', '', `${g.gems} 💎`));
    b.disabled = (profile.gems || 0) < g.gems;
    b.addEventListener('click', () => {
      if (buyCoins(profile, i)) { saveProfile(profile); ui.toast(`+${g.coins} coins`); sfx.dhol(); }
      renderShop();
    });
    deals.append(b);
  });
}
for (const id of ['btnShop', 'coinPill', 'gemPill']) $(id).addEventListener('click', () => { unlockAudio(); renderShop(); });
$('shopBack').addEventListener('click', () => renderHome());

// ---------- season pass ----------
function renderPass() {
  ui.show('pass');
  const ps = passState(profile);
  $('passTitle').textContent = `Season ${ps.season} Pass`;
  $('passLede').textContent = ps.tier >= PASS_TIERS ? 'Every tier reached! Claim the lot to start the next season.'
    : `Tier ${ps.tier} of ${PASS_TIERS} · ${Math.round((1 - ps.progress) * 100)} pass XP to the next (a win is 100, a loss 50)`;
  const claim = $('passClaim');
  claim.hidden = ps.ready <= 0;
  claim.textContent = `Claim ${ps.ready} tier${ps.ready === 1 ? '' : 's'}`;
  const list = $('passTiers');
  list.innerHTML = '';
  let focus = null;
  for (let n = 1; n <= PASS_TIERS; n++) {
    const r = passReward(n);
    const card = el('div', `passtier${n <= ps.claimed ? ' got' : n <= ps.tier ? ' ready' : ''}`);
    card.append(el('em', '', 'Tier'), el('b', '', `${n}`), el('span', '', `${r.coins} coins`), el('span', r.gems ? 'pg' : 'pg none', r.gems ? `+${r.gems} 💎` : ''), el('i', '', n <= ps.claimed ? '✓' : n <= ps.tier ? 'Ready' : '🔒'));
    list.append(card);
    if (!focus && n > ps.claimed) focus = card;   // (the first tier not yet claimed)
  }
  // swipe sideways; it opens on the next reward
  requestAnimationFrame(() => { if (focus) list.scrollLeft = focus.offsetLeft - (list.clientWidth - focus.offsetWidth) / 2; });
}
$('btnPass').addEventListener('click', () => { unlockAudio(); renderPass(); });
$('passClaim').addEventListener('click', () => {
  const g = claimPass(profile);
  saveProfile(profile);
  if (g.tiers) { ui.toast(`+${g.coins} coins${g.gems ? ` · +${g.gems} gems` : ''}${g.newSeason ? ' · a new season begins!' : ''}`, 2600); sfx.dhol(); }
  renderPass();
});
$('passBack').addEventListener('click', () => renderHome());

$('btnQuick').addEventListener('click', () => {
  unlockAudio();
  renderPickTeam({
    teams: TEAMS, start: profile.team || 'thunder', squads: rosters(), go: 'Start match', coach: 'quickTeam',
    onBack: renderHome,
    onGo: id => { profile.team = id; saveProfile(profile); loadBowlSprites(id); sfx.dhol(); startMatch({ mode: 'quick' }); },
  });
});
$('btnChallengeMode').addEventListener('click', () => { unlockAudio(); pending = { mode: 'challenge', challenge }; squadOpen = false; renderSquad(); });
$('btnCup').addEventListener('click', () => { unlockAudio(); openTournament('cup'); });
$('btnDaily').addEventListener('click', () => { unlockAudio(); renderDaily(); });
$('btnTeam').addEventListener('click', () => { unlockAudio(); pending = null; squadOpen = false; renderSquad(); });
$('teamBadge').addEventListener('click', () => { unlockAudio(); pending = null; squadOpen = false; renderSquad(); });
$('btnTrophies').addEventListener('click', () => { unlockAudio(); renderTrophies(); });
$('btnTutorial').addEventListener('click', () => { unlockAudio(); showCover(); });
$('btnStats').addEventListener('click', () => { unlockAudio(); renderStats(); });
$('statsBack').addEventListener('click', () => renderHome());

// ---------- career stats ----------
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
// "Are you sure?" without the browser's pop-up (the Claude app and some web views block it): the
// first tap turns the button into the question, a second tap within 4 seconds does it.
function confirmTap(btn, ask, action) {
  const label = btn.textContent;
  let armed = 0;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (performance.now() < armed) { armed = 0; btn.textContent = label; btn.classList.remove('confirming'); action(); return; }
    armed = performance.now() + 4000;
    btn.textContent = ask; btn.classList.add('confirming');
    ui.toast(ask, 2400);
    setTimeout(() => { if (armed && performance.now() >= armed) { armed = 0; btn.textContent = label; btn.classList.remove('confirming'); } }, 4100);
  });
}
function statGrid(items) {
  const g = el('div', 'statgrid');
  for (const [label, value] of items) { const d = el('div'); d.append(el('b', '', value), el('span', '', label)); g.append(d); }
  return g;
}
const batItems = t => [['Innings', t.inns], ['Runs', t.runs], ['Balls', t.balls], ['Highest', fmt.hs(t)], ['Average', fmt.avg(t.runs, t.inns - t.notOuts)], ['Strike rate', fmt.sr(t.runs, t.balls)], ['4s / 6s', `${t.fours}/${t.sixes}`], ['Longest six', t.longestSix ? `${t.longestSix}m` : '—'], ['Ducks', t.ducks]];
const bowlItems = t => [['Overs', fmt.overs(t.balls)], ['Wickets', t.wkts], ['Runs against', t.runs], ['Best', fmt.best(t)], ['Economy', fmt.econ(t.runs, t.balls)], ['Average', fmt.avg(t.runs, t.wkts)], ['Dot balls', t.dots], ['Maidens', t.maidens]];

function renderStats() {
  ui.show('stats');
  const s = careerStats(profile);
  const body = $('statsBody');
  body.innerHTML = '';
  body.className = 'statsbody';
  const card = (title, grid) => { const c = el('div', 'panel paper statcard'); c.append(el('h3', '', title), grid); return c; };
  const pages = [['Batting', card('Batting', statGrid(batItems(s.bat)))], ['Bowling', card('Bowling', statGrid(bowlItems(s.bowl)))]];
  const table = (title, slot, kind, cols) => {
    const c = el('div', 'panel paper statcard');
    c.append(el('h3', '', title));
    const wrap = el('div', 'tablewrap'), t = el('table', 'herotable'), head = el('tr');
    for (const h of ['Hero', ...cols.map(x => x[0])]) head.append(el('th', '', h));
    t.append(head);
    for (const hero of heroesFor(slot)) {
      const st = s.heroes[hero.id]?.[kind];
      const tr = el('tr');
      tr.append(el('td', '', hero.name));
      for (const [, f] of cols) tr.append(el('td', '', st && st.inns ? f(st) : '—'));
      t.append(tr);
    }
    wrap.append(t); c.append(wrap);
    return c;
  };
  pager(body, [...pages, ['Heroes', [
    table('Batting heroes', 'bat', 'bat', [['Runs', t => t.runs], ['HS', fmt.hs], ['Avg', t => fmt.avg(t.runs, t.inns - t.notOuts)], ['SR', t => fmt.sr(t.runs, t.balls)], ['Ducks', t => t.ducks]]),
    table('Bowling heroes', 'bowl', 'bowl', [['Wkts', t => t.wkts], ['Best', fmt.best], ['Overs', t => fmt.overs(t.balls)], ['Runs', t => t.runs], ['Econ', t => fmt.econ(t.runs, t.balls)]])]]]);
}

// what a player is good at and bad at, and the power his type brings
function typeLine(p) {
  const out = [], bt = batTypeOf(p), bp = bowlPowerOf(p);
  if (bt) out.push(`${BAT_TYPES[bt].name}: ${POWERS[BAT_TYPES[bt].power].name} · ${BAT_TYPES[bt].strong.toLowerCase()}; ${BAT_TYPES[bt].weak.toLowerCase()}`);
  if (bp) out.push(`${bowlType(p.bowl).short}: ${POWERS[bp].name}`);
  return out.join(' · ');
}
// a player's face beside his details
const kitOf = p => (p.team ? teamById(p.team) : { suit: '#f3efe2', trim: '#3a3a4a' });
function withFace(p, size, ...parts) {
  const row = el('div', 'facerow'), txt = el('div');
  // his painted portrait if he has one, else the drawn face (heroes keep their full portrait)
  const pic = portraitFace(p, p.team ? teamById(p.team) : null, size) || (p.heroId || (p.hero && typeof p.hero === 'object') ? portrait(heroById(p.heroId || p.hero.id), size, 'celebrate') : faceEl(p, kitOf(p), size));
  pic.classList.add('face'); pic.style.width = pic.style.height = `${size}px`;
  txt.append(...parts);
  row.append(pic, txt);
  return row;
}

// ---------- My Team: the team and the team sheet ----------
// ---------- Choose your team: the clubs as a carousel of cards, their ratings below ----------
// o: { teams, start (team id), squads ({ id: players }, for the ratings), go (button label),
//      locked (t => reason or null), note, onGo(id), onBack() }
let pick = null;
function renderPickTeam(o) {
  pick = { ...o, idx: Math.max(0, o.teams.findIndex(t => t.id === o.start)), stars: teamStars(o.squads, o.teams) };
  ui.show('pickteam');
  requestAnimationFrame(() => requestAnimationFrame(() => fitBlock(document.querySelector('#pickteam .pt')))); // (its buttons are never pushed out of sight)
  $('ptCoins').textContent = profile.coins;
  $('ptNote').hidden = !o.note; $('ptNote').textContent = o.note || '';
  $('ptMake').hidden = !o.make;
  const track = $('ptTrack'), dots = $('ptDots');
  track.innerHTML = ''; dots.innerHTML = '';
  pick.cards = o.teams.map((t, i) => {
    const b = el('button', 'ptcard');
    b.style.setProperty('--suit', t.suit); b.style.setProperty('--trim', t.trim);
    const face = el('div', 'face');
    const logo = document.createElement('img'); logo.className = 'logo'; logo.src = logoSrc(t.id); logo.alt = '';
    face.append(logo, el('div', 'plate'), el('div', 'name', t.name), el('div', 'tag', t.style.tag));
    b.append(face);
    const why = o.locked?.(t);
    if (why) b.append(el('div', 'lock', `🔒 ${why}`));
    b.setAttribute('aria-label', `${t.name}, ${t.style.tag}${why ? `, locked: ${why}` : ''}`);
    b.addEventListener('click', () => { if (i !== pick.idx) pickGo(i); });
    track.append(b); dots.append(el('i'));
    return b;
  });
  pickShow();
  if (o.coach) coachOnce(o.coach, DEV[o.coach]);
}
function pickGo(i) {
  const n = pick.cards.length;
  pick.idx = ((i % n) + n) % n; sfx.click(); pickShow();
}
function pickShow() {
  const n = pick.cards.length, t = pick.teams[pick.idx];
  pick.cards.forEach((c, i) => {
    let d = i - pick.idx;
    if (d > n / 2) d -= n; if (d < -n / 2) d += n;   // (round the ends: it's a loop)
    const a = Math.abs(d);
    c.style.transform = `translate(-50%, -50%) translateX(${d * 74}%) scale(${a ? 0.78 : 1}) rotateY(${-Math.sign(d) * 24}deg)`;
    c.style.zIndex = 20 - a; c.style.opacity = a > 1 ? 0 : 1; c.style.pointerEvents = a > 1 ? 'none' : '';
    c.style.filter = a ? 'brightness(.72)' : '';
    c.classList.toggle('on', !a);
    c.querySelector('.mine')?.remove();
    if (!a && !pick.locked?.(pick.teams[i])) c.append(el('i', 'mine', 'Your team'));
  });
  [...$('ptDots').children].forEach((d, i) => d.classList.toggle('on', i === pick.idx));
  const s = pick.stars[t.id], fill = v => `${(v / 5) * 100}%`;
  $('ptScore').textContent = s.overall.toFixed(1);
  $('ptStars').style.setProperty('--fill', fill(s.overall));
  const grid = $('ptGrid'); grid.innerHTML = '';
  for (const [k, label] of [['bat', 'Batting'], ['bowl', 'Bowling'], ['field', 'Fielding'], ['power', 'Power']]) {
    const tile = el('div', 'pt-tile');
    const ic = document.createElement('img'); ic.src = `img/menu/rate-${k}.webp`; ic.alt = '';
    const mid = el('div'); const st = el('i', 'pt-stars'); st.style.setProperty('--fill', fill(s[k]));
    mid.append(el('small', '', label), st);
    const num = el('b', '', String(s[k])); num.append(el('span', '', '/5'));
    tile.append(ic, mid, num); grid.append(tile);
  }
  const why = pick.locked?.(t);
  $('ptGo').disabled = !!why;
  $('ptGo').textContent = why ? '🔒 Locked' : pick.go;
}
$('ptPrev').addEventListener('click', () => pickGo(pick.idx - 1));
$('ptCoach').addEventListener('click', () => coachSay(DEV[pick.coach || 'quickTeam']));
$('rgCoach').addEventListener('click', () => coachSay(DEV.region));
$('ptNext').addEventListener('click', () => pickGo(pick.idx + 1));
$('ptBack').addEventListener('click', () => pick.onBack());
$('ptMake').addEventListener('click', () => { sfx.click(); pick.make?.(); });
$('ptBack2').addEventListener('click', () => pick.onBack());
$('ptGo').addEventListener('click', () => { const t = pick.teams[pick.idx]; if (!pick.locked?.(t)) pick.onGo(t.id); });
{
  // a swipe across the cards turns them
  let x0 = null;
  $('ptStage').addEventListener('pointerdown', e => { x0 = e.clientX; });
  $('ptStage').addEventListener('pointerup', e => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) pickGo(pick.idx + (dx < 0 ? 1 : -1));
  });
}
const rosters = () => Object.fromEntries(TEAMS.map(t => [t.id, roster(t.id)]));

// My Team: the eight clubs on one screen; tap one to pick it and open its page (star, signings,
// team sheet, squad). squadOpen: that page is showing.
let squadOpen = false;
function renderSquad() {
  ui.show('squad');
  $('squadGo').textContent = pending ? 'Start match' : 'Done';
  $('squadBack').textContent = squadOpen ? 'All teams' : 'Back';
  const rows = $('squadRows');
  rows.innerHTML = '';
  $('squadCoins').textContent = `${profile.coins} coins`;
  $('squad').classList.toggle('teamsonly', !squadOpen);
  if (!squadOpen) {
    $('squadTitle').textContent = 'My Team';
    $('squadLede').firstChild.textContent = 'Tap a club to pick it and see its squad. ';
    rows.append(teamPicker());
    $('squad').scrollTop = 0;
    return;
  }
  const t = myTeam();
  $('squadTitle').textContent = t.name;
  $('squadLede').firstChild.textContent = 'Set your batting order and bowling attack. Every player brings the power of his type. ';
  const starWrap = el('div', 'slot');
  const G = groundOf(t.id);
  starWrap.append(el('h3', '', `${t.name} · ${t.style.tag}`), el('p', 'sheetnote', t.style.desc),
    pitchLink(el('p', 'sheetnote venue', `🏟 Home ground: ${G.name} · Pitch: ${G.pitch.name}. ${G.pitch.report}`), G.pitch.id));
  rows.append(starWrap);
  rows.append(teamSheet());
}

// ---------- team sheet: batting order and bowling attack ----------
function currentLineup() {
  const id = profile.team || 'thunder', heroes = squad();
  const r = resolveLineup(id, heroes, profile.lineups?.[id], {});
  return { id, heroes, pool: squadPool(id, heroes, {}), order: r.order, attack: r.attack };
}
function saveLineup(order, attack) {
  const id = profile.team || 'thunder';
  profile.lineups = profile.lineups || {};
  profile.lineups[id] = { order: order.map(p => p.id), attack: attack.map(p => p.id) };
  saveProfile(profile);
}
function teamSheet() {
  const L = currentLineup();
  const wrap = el('div', 'slot teamsheet');
  const pick = (title, list, cands, size, label, onSet) => {
    const box = el('div', 'panel paper sheetbox');
    box.append(el('h3', '', title));
    for (let i = 0; i < size; i++) {
      const row = el('label', 'sheetrow');
      row.append(el('span', 'sheetno', String(i + 1)));
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `${title} ${i + 1}`);
      for (const p of cands) {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = `${p.hero ? '★ ' : ''}${flagName(p)} · ${label(p)}`;
        sel.append(o);
      }
      sel.value = list[i]?.id || '';
      sel.addEventListener('change', () => {
        const p = cands.find(c => c.id === sel.value);
        const j = list.indexOf(p);
        const next = [...list];
        if (j >= 0) next[j] = list[i]; // already picked: swap places
        next[i] = p;
        onSet(next); sfx.click(); renderSquad();
      });
      row.append(sel);
      box.append(row);
    }
    return box;
  };
  const roleTxt = p => `${p.label} · bat ${p.bat}`;
  // the whole squad, with what each player is known for
  const squadList = el('div', 'panel paper sheetbox');
  squadList.append(el('h3', '', 'The squad'));
  for (const p of roster(L.id)) {
    const r = el('div', 'squadrow');
    r.append(withFace(p, 44, el('b', '', flagName(p)), el('span', '', `${nationName(p)} · ${p.label}${p.bowl ? ` · ${bowlType(p.bowl).short}` : ''} · ${p.trait}`), el('span', 'ptype', typeLine(p))));
    squadList.append(r);
  }
  wrap.append(
    el('h3', '', `${TEAMS.find(t => t.id === L.id)?.name || 'Your'} team sheet`),
    el('p', 'sheetnote', 'Bat in this order: when a batter is out, the next one walks in. Your three bowlers share the five overs (two each at most), and you pick who bowls each over.'),
    pick('Batting order', L.order, batCandidates(L.pool), ORDER_SIZE, roleTxt, next => saveLineup(next, L.attack)),
    pick('Bowling attack', L.attack, bowlCandidates(L.pool), ATTACK_SIZE, p => `${bowlType(p.bowl).name}${p.bowlSkill ? ` · ${p.bowlSkill}` : ''}`, next => saveLineup(L.order, next)),
    squadList,
  );
  return wrap;
}
$('squadBack').addEventListener('click', () => { if (squadOpen) { squadOpen = false; sfx.click(); renderSquad(); } else renderHome(); });
$('squadGo').addEventListener('click', () => (pending ? startMatch(pending) : renderHome()));

// your team: its kit is what your batter, keeper and fielders wear
function teamPicker() {
  const wrap = el('div', 'slot');
  const row = el('div', 'teamgrid');
  for (const t of TEAMS) {
    const b = document.createElement('button');
    const on = (profile.team || 'thunder') === t.id;
    b.className = 'team' + (on ? ' on' : '');
    b.setAttribute('aria-pressed', on);
    b.style.setProperty('--suit', t.suit); b.style.setProperty('--trim', t.trim);
    const logo = document.createElement('img'); logo.src = logoSrc(t.id); logo.alt = '';
    b.append(logo, el('b', '', t.name), el('small', '', t.style.tag));
    if (on) b.append(el('i', 'team-mine', 'YOUR TEAM'));
    b.addEventListener('click', () => {
      profile.team = t.id; saveProfile(profile); sfx.click();
      loadBowlSprites(t.id);
      squadOpen = true;
      renderSquad();
      $('squad').scrollTop = 0;
    });
    row.append(b);
  }
  wrap.append(row);
  return wrap;
}

// your side for a match: your team's star plus your signings (who sit out against their own team)
// a team's own star: its one special player (heroes you could sign are retired)
function squad(teamId = profile.team || 'thunder') {
  return starSquad(teamId);
}

// ---------- tutorial cover ----------
function showCover() {
  ui.show('cover');
  // the first time through, his tips can't be turned off; a replay offers the switch
  const first = !profile.tutorialDone;
  tutTips = first || profile.tutTips !== false;
  $('coverTips').hidden = first;
  coverTipsShow();
  coachOnce('welcome', DEV.welcome);
  // the painted card (img/menu/cover): Thunder Raja in his frame, the title over its top edge, the brief under it
  $('coverPanel').innerHTML = '<img class="cv-card" src="img/menu/cover/card.webp" alt="Thunder Raja, ready to bat" draggable="false">'
    + '<img class="cv-fx" src="img/menu/cover/fx.webp" alt="" aria-hidden="true" draggable="false">'
    + '<img class="cv-title" src="img/menu/cover/title.webp" alt="Issue #1: The Final Over" draggable="false">'
    + '<img class="cv-text" src="img/menu/cover/text.webp" alt="Thunder Raja needs 14 off the last 4 balls. Then you defend the final 3." draggable="false">';
}
$('coverBack').addEventListener('click', () => { sfx.click(); ui.show('home'); });
function coverTipsShow() {
  $('coverTips').setAttribute('aria-pressed', String(tutTips));
  $('coverTipsText').textContent = `Uncle Dev's tips: ${tutTips ? 'On' : 'Off'}`;
}
$('coverTips').addEventListener('click', () => { tutTips = !tutTips; profile.tutTips = tutTips; saveProfile(profile); sfx.click(); coverTipsShow(); });
$('coverGo').addEventListener('click', () => startMatch({ mode: 'tutorial' }));

// ---------- the first-time story ----------
// Uncle Dev tells it (a few panels), then the match at the Thunderdome against the unbeaten Thunder Strikers
async function startStory() {
  tutTips = true;   // (his advice can't be turned off the first time)
  if (!window.__SIXCHARGE_BOT) { ui.show(null); await storyIntro(); }
  startMatch({ mode: 'tutorial', story: true });
}

// ---------- match ----------
// The match stopped on an error (a bug): what it was, to read out, and the way back to the menu.
function showMatchError(e, loopErr) {
  const box = $('matchError') || el('div', 'panel paper matcherr'), msg = el('pre', '', '');
  box.id = 'matchError'; box.innerHTML = '';
  const first = x => x ? `${x.name || 'Error'}: ${x.message || x}\n${String(x.stack || '').split('\n').slice(1, 4).map(s => s.trim().slice(0, 90)).join('\n')}` : '';
  msg.textContent = [first(e), loopErr && loopErr !== e ? `Frame: ${first(loopErr)}` : ''].filter(Boolean).join('\n');
  const back = el('button', 'bigbtn primary', 'Back to menu');
  back.addEventListener('click', () => { box.remove(); try { game.quit?.(); } catch {} renderHome(); });
  box.append(el('h3', '', 'The match hit a problem'), el('p', '', 'Sorry! Please send this message so it can be fixed:'), msg, back);
  document.getElementById('app').append(box);
}
// opts.mode: 'quick' | 'challenge' | 'tutorial' | 'league' | 'cup' | 'daily'
async function startMatch(opts) {
  unlockAudio();
  game.matchActive = false;
  ui.show(null);
  for (const s of ui.screens) $(s).hidden = true;
  const mode = opts.mode;
  const seed = mode === 'challenge' ? opts.challenge.seed : mode === 'daily' ? opts.scenario.seed : randomSeed();
  let team = profile.team || 'thunder', opp = null, sq, lineup = null, levels = {}, pools = null, rival = null, home = null;
  if (mode === 'tutorial' && opts.opening) {
    // the story's final: Thunder Strikers (Kabir's side) at home against the Volt Vipers
    team = 'thunder'; opp = 'vipers'; home = 'thunder'; levels = {}; sq = starSquad('thunder'); rival = starSquad('vipers');
  } else if (mode === 'tutorial' && opts.story) {
    // the story: you, the Green Cyclones, away at the Thunderdome against the unbeaten Thunder Strikers
    team = 'cyclones'; opp = 'thunder'; home = 'thunder'; levels = {};
    sq = { bat: heroById('meher'), bowl: heroById('zara'), field: heroById('rani') };
    rival = { bat: heroById('raja'), bowl: heroById('imran'), field: null };
  } else if (mode === 'tutorial') {
    team = 'thunder'; home = 'thunder'; sq = { bat: heroById('raja'), bowl: heroById('zara'), field: heroById('rani') }; levels = {};
  } else if (mode === 'war' || mode === 'warmup') {
    // the national sides: your country (picked once) against the other, at your country's ground
    team = warSide(); opp = SIDES.find(s => s !== team); home = team; sq = starSquad(team); rival = starSquad(opp); levels = {};
    if (mode === 'war') {
      // the weekend's one match counts from the first ball: quitting it is a loss
      const k = warClock().weekend, mine = warRecordNow() || { country: team, r: {} };
      if (!k || mine.r?.[k]) { ui.toast('Your match this weekend is already played'); return renderWar(); }
      await saveMine({ ...mine, country: team, r: { ...mine.r, [k]: { win: false, at: Date.now(), pending: true } }, at: Date.now() });
      warPending = k;
    }
  } else if (mode === 'daily') {
    // the same for everyone: the day's two teams, their own stars, default line-ups, no levels
    team = opts.scenario.team; opp = opts.scenario.opp; home = team; sq = starSquad(team); levels = {};
  } else {
    if (mode === 'league' || mode === 'cup') { const f = nextFixture(profile.tournament); team = profile.tournament.team; opp = f.opp; home = f.home; }
    if (mode === 'career') {
      // the club's own squad from the career: heroes it bought at the auction give it its powers
      const c = profile.career;
      const f = c.phase === 'playoff' ? c.playoff : nextFixture(c.league);
      team = c.club; opp = f.opp; home = f.home;
      pools = { mine: clubPool(c, team), opp: clubPool(c, opp) };
      lineup = c.lineup;
    }
    if (mode === 'challenge') {
      opp = opts.challenge.opp || null;
      if (opp === team) team = opts.challenge.team || TEAMS.find(t => t.id !== opp).id;
    }
    if (!opp) opp = rivalTeam(seed, team).id;
    if (pools) { sq = clubHeroes(pools.mine); rival = clubHeroes(pools.opp); } else {
      sq = squad(team, opp);
      lineup = profile.lineups?.[team] || null;
    }
  }
  home = home || homeFromSeed(seed, team, opp);
  const order = ['quick', 'league', 'cup', 'career', 'war', 'warmup'].includes(mode) ? await coinToss(teamById(opp), home) : 'bat';
  for (const s of ui.screens) $(s).hidden = true;
  if (mode === 'quick') await quickTip();
  game.matchActive = true;
  startAmbience();
  let summary;
  try {
    summary = await game.runMatch({
      mode, story: !!opts.story, opening: !!opts.opening, seed, order, team, opp, home, squad: sq, lineup, levels, pools, rival, scenario: opts.scenario, challenge: opts.challenge,
      records: { longestSix: careerStats(profile).bat.longestSix || 0 }, field: mode === 'tutorial' ? null : profile.field, level: levelOf(profile.skill), crowd: mode === 'career' && profile.career?.chirp ? crowdOf(profile.career) : 0,
    });
  } catch (e) {
    // a match that fails must say so (it would otherwise leave a dead screen): the error is shown, with a way back
    console.error('match', e);
    showMatchError(e, game.loopError);
    return;
  } finally {
    game.matchActive = false;
    stopAmbience(); crowdStop(); game.crowdLive = false;
  }
  if (opts.opening) { game.quit(); return summary; }   // (the story's final: no result screen, the story goes on)
  if (!summary) { if (mode === 'war') warAfterMatch(null); return; } // quit mid-match (a war match is lost)
  if (mode === 'tutorial') { profile.tutorialDone = true; saveProfile(profile); }
  showResult(summary);
  if (summary.result?.outcome === 'win' && summary.home && summary.home === summary.myTeam?.id) crowdSing(0.4, 10, 0.5); // a win at home: the crowd sings
  if (mode === 'tutorial' && tutTips && !window.__SIXCHARGE_BOT) coachSay(opts.story ? DEV.storyDone : DEV.tutDone);
}

$('btnPause').addEventListener('pointerdown', e => {
  e.stopPropagation(); game.paused = true; ui.show('pause');
  // which hand-drawn sheets are in use: helps tell a slow download from a phone out of memory
  const st = spriteStatus(), miss = [...st.missing, ...batSpriteMissing()];
  $('pauseInfo').textContent = miss.length ? `Drawings missing: ${miss.join(', ')}` : `All ${st.total} drawing sheets loaded`;
});
$('resumeBtn').addEventListener('click', () => { game.paused = false; $('pause').hidden = true; });
$('pausePitch').addEventListener('click', () => { sfx.click(); openPitchGuide(game.pitch?.id || 'flat'); });   // (the pitch of this match; Back returns here)
$('quitBtn').addEventListener('click', () => { game.quit(); renderHome(); });

// "🏟 The Snakepit · AWAY · Pitch: Dusty turner"

// ---------- tournaments ----------
// The next match: a ribbon with the round, both crests either side of the V, the ground, a line on
// the opposition and the play button.
function fixtureCard(f, me, o, about, onPlay, derby = null) {
  const card = el('div', 'fixcard');
  const logos = el('div', 'fixlogos');
  const la = document.createElement('img'); la.src = logoSrc(me.id); la.alt = me.name;
  const lb = document.createElement('img'); lb.src = logoSrc(o.id); lb.alt = o.name;
  const vs = document.createElement('img'); vs.src = 'img/league-vs.webp'; vs.alt = 'v'; vs.className = 'fixvs';
  logos.append(la, vs, lb);
  const G = groundOf(f.home || me.id), venue = el('p', 'fixvenue');
  venue.append(el('i', '', '🏟'), el('b', '', G.name), '\u00a0· ', el('strong', '', f.home === me.id ? 'HOME' : 'AWAY'), '\u00a0· ', el('b', '', `Pitch: ${G.pitch.name}`));
  pitchLink(venue, G.pitch.id);
  const go = el('button', 'playbtn', `Play ${f.label.startsWith('Matchday') ? 'match' : f.label.toLowerCase()}`);
  go.addEventListener('click', onPlay);
  card.append(el('div', 'fixribbon', f.label), logos, venue);
  // a rival's word before the match (js/rivals.js), and the record between you
  if (derby) {
    card.classList.add('derby');
    const q = el('div', 'fixtaunt'), r = derby.record;
    q.append(el('b', 'fixtag', derby.kind === 'nemesis' ? '⚡ YOUR NEMESIS' : '⚔️ DIVISION RIVAL'), el('p', '', `“${derby.text}”`), el('small', '', `${derby.who}, ${o.name}${r.w + r.l ? ` · you ${r.w}-${r.l}` : ''}`));
    card.append(q);
  }
  card.append(el('p', 'fixabout', about), go);
  return card;
}

function openTournament(kind) {
  const t = profile.tournament;
  if (t && t.kind !== kind && t.stage !== 'done') {
    ui.toast(`Finish (or abandon) your ${t.kind === 'league' ? 'Super League' : 'Knockout Cup'} first`);
    renderTournament();
    return;
  }
  if (!t || t.kind !== kind || t.stage === 'done') {
    profile.tournament = kind === 'league' ? newLeague(profile.team || 'thunder', randomSeed()) : newCup(profile.team || 'thunder', randomSeed());
    saveProfile(profile);
  }
  renderTournament();
}
function renderTournament(notes = []) {
  const t = profile.tournament;
  if (!t) return renderHome();
  ui.show('league');
  const league = t.kind === 'league';
  $('leagueTitle').textContent = league ? 'Super League' : 'Knockout Cup';
  const f = nextFixture(t);
  const me = teamById(t.team);
  const place = finish(t);
  $('leagueLede').textContent = f ? `${me.name} · ${f.label}: v ${teamById(f.opp).name}`
    : place === 'champion' ? `${me.name} are CHAMPIONS!` : `Over: ${teamById(t.champion).name} won it.`;
  const body = $('leagueBody');
  body.innerHTML = '';
  for (const n of notes) body.append(el('div', 'panel paper notecard', n));
  if (f) {
    const o = teamById(f.opp);
    body.append(fixtureCard(f, me, o, `${o.name} · ${o.style.tag}: ${o.style.desc} Their star: ${heroById(o.star).name}.`, () => startMatch({ mode: t.kind })));
  } else if (place) {
    const prize = (league ? LEAGUE_PRIZE : CUP_PRIZE)[place];
    body.append(el('div', 'panel paper notecard big', place === 'champion' ? `🏆 Champions! +${prize} coins` : place === 'runnerUp' ? `🥈 Runners-up · +${prize} coins` : place === 'semi' ? `Semi-finalists · +${prize} coins` : 'Better luck next time'));
  }
  body.append(...leaguePanels(t));
  autoPages(body);
  $('leagueGo').hidden = true; // (the play button is on the fixture card)
  $('leagueQuit').hidden = !f;
}
// a dark panel's heading: the title in yellow, a note after it in pink, speed stripes on the right
const lpHead = (title, note) => {
  const h = el('h3', 'lp-head');
  h.append(el('b', '', title));
  if (note) h.append(el('span', '', `· ${note}`));
  h.append(el('i', 'lp-streaks'));
  return h;
};
// The table, the knockout bracket and your results: shared by the cup and the career league.
function leaguePanels(t) {
  const out = [];
  const league = t.kind === 'league';
  if (league) {
    const tb = el('div', 'lpanel');
    tb.append(lpHead('Table', t.stage === 'group' ? `after ${t.round} of ${t.rounds.length}` : 'final'));
    const tab = el('table', 'ltable'), head = el('tr');
    for (const h of ['#', 'Team', 'P', 'W', 'L', 'Pts', 'NRR']) head.append(el('th', '', h));
    tab.append(head);
    table(t).forEach((r, i) => {
      const tr = el('tr', r.id === t.team ? 'mine' : '');
      const team = teamById(r.id), logo = document.createElement('img');
      logo.src = logoSrc(r.id); logo.alt = '';
      const pos = el('td'), name = el('td', 'lt-team');
      pos.append(el('b', i < 4 ? 'lt-pos top' : 'lt-pos', String(i + 1)));
      name.append(logo, el('span', '', team.name));
      tr.append(pos, name);
      for (const v of [r.p, r.w, r.l, r.pts]) tr.append(el('td', '', String(v)));
      tr.append(el('td', r.nrr >= 0 ? 'lt-up' : 'lt-down', (r.nrr >= 0 ? '+' : '') + r.nrr.toFixed(2)));
      tab.append(tr);
    });
    const note = el('div', 'lnote');
    note.append(el('i', '', '🏆'), el('span', '', 'Top four go through: 1st v 4th and 2nd v 3rd in the semi-finals. A win is 2 points; a tie is settled by a super over.'));
    const inner = el('div', 'lp-body');
    inner.append(tab, note);
    tb.append(inner);
    out.push(tb);
  }
  // the knockout bracket so far
  if (t.ko.length) {
    const kb = el('div', 'lpanel'), kin = el('div', 'lp-body lp-list');
    kb.append(lpHead('Knockouts'), kin);
    for (const k of t.ko) {
      const label = { qf: 'Quarter-finals', semi: 'Semi-finals', final: 'Final' }[k.stage];
      kin.append(el('b', 'kostage', label));
      k.ties.forEach(([a, b2], i) => {
        const w = k.winners?.[i];
        const row = el('div', 'kotie' + (a === t.team || b2 === t.team ? ' mine' : ''));
        row.append(el('span', w === a ? 'won' : '', teamById(a).name), el('i', '', 'v'), el('span', w === b2 ? 'won' : '', teamById(b2).name));
        kin.append(row);
      });
    }
    out.push(kb);
  }
  // your results
  const mine = t.results.filter(r => r.player);
  if (mine.length) {
    const rb = el('div', 'lpanel'), rin = el('div', 'lp-body lp-list');
    rb.append(lpHead('Your results'), rin);
    for (const r of mine) {
      const o = r.a === t.team ? r.b : r.a;
      const res = r.winner === t.team ? 'W' : r.winner ? 'L' : 'T', row = el('div', 'lres'), logo = document.createElement('img');
      logo.src = logoSrc(o); logo.alt = '';
      row.append(el('b', `lres-${res}`, res), logo, el('span', '', `v ${teamById(o).name}`), el('em', '', `${r.mine.runs}/${r.mine.wkts} v ${r.theirs.runs}/${r.theirs.wkts}`));
      rin.append(row);
    }
    out.push(rb);
  }
  return out;
}

$('leagueBack').addEventListener('click', renderHome);
$('leagueGo').addEventListener('click', () => { const t = profile.tournament; if (t) startMatch({ mode: t.kind }); });
confirmTap($('leagueQuit'), 'Tap again to abandon (progress is lost)', () => {
  profile.tournament = null; saveProfile(profile); renderHome();
});

// After a tournament match: record it, play the rest of the round, pay out at the end.
function tournamentAfterMatch(summary) {
  const t = profile.tournament;
  const notes = advance(t, playerResult(t, summary));
  const events = [];
  const place = finish(t);
  if (place) {
    const prize = (t.kind === 'league' ? LEAGUE_PRIZE : CUP_PRIZE)[place] || 0;
    profile.coins += prize;
    if (place === 'champion') {
      profile.trophies = [...(profile.trophies || []), { kind: t.kind, team: t.team, date: new Date().toISOString().slice(0, 10), unbeaten: unbeaten(t) }];
      events.push(t.kind);
      if (t.kind === 'league' && unbeaten(t)) events.push('unbeaten');
      notes.push(`🏆 ${teamById(t.team).name} win the ${t.kind === 'league' ? 'Super League' : 'Knockout Cup'}! +${prize} coins`);
    } else if (prize) notes.push(`${place === 'runnerUp' ? 'Runners-up' : 'Semi-finalists'}: +${prize} coins`);
  }
  return { notes, events };
}

// ---------- the Weekend War: India v Pakistan ----------
let warState = { mine: null, entries: [], online: false }, warStop = null, warPending = null, warNames = {};
const warSide = () => warState.mine?.country || myRecord()?.country || null;
const warRecordNow = () => warState.mine || myRecord();
const sideName = id => teamById(id).name;
const num = n => Number(n || 0).toLocaleString();
function warWatch() {
  if (warStop) return;
  warStop = watchWar(s => {
    warState = s;
    if (!$('war').hidden) renderWar();
    if (!$('home').hidden) warBanner();
    const ids = feed(s.entries).map(f => f.id).filter(id => id !== 'me' && !(id in warNames));
    if (ids.length) namesOf(ids).then(n => { Object.assign(warNames, n); if (!$('war').hidden) renderWar(); });
  });
}
// the home banner: the live score and what's next for you
function warBanner() {
  const t = totals(warState.entries.map(e => e[1])), c = warClock(), mine = warRecordNow();
  $('warIn').textContent = num(t.india); $('warPk').textContent = num(t.pakistan);
  $('warSub').textContent = c.phase === 'over' ? `Final · ${leader(t) ? `${sideName(leader(t))} win the war!` : 'All square!'}`
    : c.phase === 'open' ? (mine?.r?.[c.weekend] ? (c.weekend < WEEKENDS ? `Weekend ${c.weekend} played · next in ${countdown(weekendSpan(c.weekend + 1)[0] - Date.now())}` : 'Last weekend played · final on Sunday night') : `Weekend ${c.weekend} · your match is ready!`)
    : `Weekend ${c.next} starts in ${countdown(c.opensAt - Date.now())}`;
  $('btnWar').classList.toggle('live', c.phase === 'open' && !mine?.r?.[c.weekend]);
}
function renderWar() {
  ui.show('war');
  const body = $('warBody');
  body.innerHTML = '';
  const t = totals(warState.entries.map(e => e[1])), c = warClock(), mine = warRecordNow(), side = warSide();
  // the scoreboard
  const board = el('div', 'warboard');
  for (const id of SIDES) {
    const col = el('div', 'wb-side' + (leader(t) === id ? ' lead' : '') + (side === id ? ' mine' : ''));
    const logo = document.createElement('img'); logo.src = logoSrc(id); logo.alt = '';
    col.append(logo, el('b', 'wb-name', sideName(id)), el('strong', 'wb-pts', num(t[id])), el('small', '', `${t.players[id]} player${t.players[id] === 1 ? '' : 's'}`));
    board.append(col);
    if (id === 'india') { const v = document.createElement('img'); v.src = 'img/league-vs.webp'; v.alt = 'v'; v.className = 'wb-vs'; board.append(v); }
  }
  const head = el('div', 'fixcard warcard');
  head.append(el('div', 'fixribbon', c.phase === 'over' ? 'Final score' : 'Live score'), board,
    el('p', 'fixabout', c.phase === 'over' ? (leader(t) ? `${sideName(leader(t))} win the Weekend War!` : 'The war ends all square!')
      : leader(t) ? `${sideName(leader(t))} lead by ${num(Math.abs(t.india - t.pakistan))}` : 'All square'));
  // your side, and your match this weekend
  if (!side) {
    head.append(el('p', 'warpick-q', 'Choose your side. You play for them every weekend: this can\'t be changed.'));
    const pick = el('div', 'warpick');
    for (const id of SIDES) {
      const b = el('button', 'warpick-btn'); b.style.setProperty('--suit', teamById(id).suit);
      const logo = document.createElement('img'); logo.src = logoSrc(id); logo.alt = '';
      b.append(logo, el('b', '', `Play for ${sideName(id)}`));
      confirmTap(b, `Tap again: you'll play for ${sideName(id)} all four weekends`, async () => {
        sfx.dhol?.();
        await saveMine({ country: id, r: {}, at: Date.now() });
        warState = { ...warState, mine: myRecord() };
        renderWar();
      });
      pick.append(b);
    }
    head.append(pick);
  } else {
    const r = c.phase === 'open' ? mine?.r?.[c.weekend] : null;
    head.append(el('p', 'fixvenue', `You play for ${sideName(side)} · ${num(Object.values(mine?.r || {}).filter(x => x.win).length)} point${Object.values(mine?.r || {}).filter(x => x.win).length === 1 ? '' : 's'} from you so far`));
    if (c.phase === 'open' && !r) {
      const go = el('button', 'playbtn', `Play weekend ${c.weekend} match`);
      go.addEventListener('click', () => startMatch({ mode: 'war' }));
      head.append(go, el('p', 'warnote', `One match this weekend, against ${sideName(SIDES.find(s => s !== side))}. A win is +1 for ${sideName(side)}. Once it starts it counts: leaving it is a loss. Closes in ${countdown(c.closesAt - Date.now())}.`));
    } else if (c.phase === 'open') {
      head.append(el('div', 'warstatus', r.win ? `You won: +1 for ${sideName(side)}!` : r.pending ? 'Your match is being played' : 'You lost this one: no point'),
        el('p', 'warnote', c.weekend < WEEKENDS ? `Next match: weekend ${c.weekend + 1}, opens in ${countdown(weekendSpan(c.weekend + 1)[0] - Date.now())}.` : 'That was the last weekend. The war ends Sunday at midnight.'));
    } else if (c.phase !== 'over') {
      head.append(el('div', 'warstatus', `Weekend ${c.next} opens in ${countdown(c.opensAt - Date.now())}`),
        el('p', 'warnote', `${new Date(c.opensAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}, from midnight. One match per weekend.`));
    }
  }
  const p1 = [head];
  // the four weekends
  const wk = el('div', 'lpanel'), wkin = el('div', 'lp-body lp-list');
  wk.append(lpHead('Weekends'), wkin);
  for (let k = 1; k <= WEEKENDS; k++) {
    const [s] = weekendSpan(k), w = t.weeks[k - 1], my = mine?.r?.[k];
    const row = el('div', 'lres warweek' + (c.weekend === k ? ' now' : ''));
    row.append(el('b', my ? (my.win ? 'lres-W' : my.pending ? 'lres-T' : 'lres-L') : 'lres-T', my ? (my.win ? 'W' : my.pending ? '…' : 'L') : String(k)),
      el('span', '', `Weekend ${k} · ${new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`),
      el('em', '', `IND ${w.india} · PAK ${w.pakistan}`));
    wkin.append(row);
  }
  const p2 = [wk];
  // what's been happening
  const fd = feed(warState.entries);
  if (fd.length) {
    const fp = el('div', 'lpanel'), fin = el('div', 'lp-body lp-list');
    fp.append(lpHead('Latest', 'live'), fin);
    for (const f of fd.slice(0, 4)) {
      const row = el('div', 'lres'), logo = document.createElement('img');
      logo.src = logoSrc(f.country); logo.alt = '';
      const who = f.id === myId() || f.id === 'me' ? 'You' : warNames[f.id] || 'A player';
      row.append(el('b', f.win ? 'lres-W' : 'lres-L', f.win ? '+1' : '0'), logo, el('span', '', `${who} ${f.win ? 'won' : 'lost'} for ${sideName(f.country)}`), el('em', '', f.line));
      fin.append(row);
    }
    p2.push(fp);
  }
  // a warm-up, any time, no points
  const wu = el('button', 'chipbtn', 'Warm-up match (no points)');
  wu.addEventListener('click', () => { if (!warSide()) return ui.toast('Choose your side first'); startMatch({ mode: 'warmup' }); });
  const rules = el('div', 'lnote');
  rules.append(el('i', '', '⚔️'), el('span', '', warOnline()
    ? 'Every player\'s wins count for their country, live. A win is +1; a loss scores nothing. The side with the most points after four weekends wins.'
    : 'Offline here: only your own results show. Open the game on claude.ai to join the live table.'));
  pager(body, [['The war', [...p1, wu]], ['Weekends', [...p2, rules]]]);
}
// after the weekend's match: the result into the shared table
function warAfterMatch(summary) {
  const k = warPending; warPending = null;
  if (!k) return [];
  const mine = warRecordNow() || { country: warSide(), r: {} };
  const win = summary?.result.outcome === 'win';
  const p = summary?.innings.find(i => i.side === 'player'), o = summary?.innings.find(i => i.side === 'ai');
  const line = summary ? `${p.runs}/${p.wkts} v ${o.runs}/${o.wkts}` : 'left the match';
  saveMine({ ...mine, r: { ...mine.r, [k]: { win, at: Date.now(), line } }, at: Date.now() }).then(() => { warState = { ...warState, mine: myRecord() }; });
  return [win ? `+1 point for ${sideName(mine.country)}! Your win is on the Weekend War table.` : `No point this weekend. Back next weekend for ${sideName(mine.country)}!`];
}
$('btnWar').addEventListener('click', () => { unlockAudio(); warWatch(); renderWar(); });
$('warBack').addEventListener('click', renderHome);

// ---------- the story's opening scene (js/comic.js): the night before, the black card, Chirp, then the final ----------
function openingChirp() {
  return new Promise(done => {
    const box = el('div', 'cm-chirp'), feed = el('div', 'chirp');
    const bar = el('div', 'chirpbar'), logo = document.createElement('img'); logo.src = 'img/chirp/logo.webp'; logo.alt = 'Chirp'; logo.className = 'chirplogo';
    const stats = el('div', 'chirpstats'), fol = el('b', '', ''); fol.dataset.n = 4200000;
    const f1 = el('span', 'cfol'); f1.append(fol, el('small', '', 'FOLLOWERS'));
    stats.append(f1); bar.append(logo, stats);
    const by = { type: 'club', club: 'thunder', name: 'Thunder Strikers', handle: handleOf('Thunder Strikers'), verified: true };
    const post = {
      kind: 'win', by, likes: 1284000, replies: 48200, shares: 310000,
      text: 'THE FINAL. Tonight. Thirty thousand at the Thunderdome and one trophy left to win. Let\'s make history. ⚡🏆 #ThunderUp',
      comments: [{ name: 'Mina Cho', handle: '@MinaCho · Cricket Daily', face: faceOfPress(7), text: "Kabir Anand's first final, and he walks out at number 3. Is this his day... or will he choke? 👀" }],
    };
    const feedBox = el('div', 'cfeed'); feedBox.append(chirpPost(null, post, 0));
    feed.append(bar, feedBox);
    const go = el('button', 'cm-go', 'Go on');
    box.append(feed, go); $('app').append(box);
    requestAnimationFrame(() => { box.classList.add('up'); box.querySelectorAll('[data-n]').forEach(n => countUp(n, +n.dataset.n)); });
    go.onclick = () => { box.classList.remove('up'); setTimeout(() => { box.remove(); done(); }, 400); };
  });
}
async function careerOpening() {
  ui.show(null);
  await playComic();
  await titleCard('16 HOURS LATER...');
  await openingChirp();
  await startMatch({ mode: 'tutorial', opening: true });
  ui.show(null);
  await titleCard('4 HOURS LATER...');
  await playComic(NIGHT);
}

// ---------- career: the Super League ----------
let careerView = 'hub'; // 'hub' | 'squad'
let careerNotes = [];
function career() {
  if (!profile.career) { profile.career = newCareer(randomSeed()); saveProfile(profile); }
  syncMine(profile.career);
  return profile.career;
}
// your own club, if this career has one, is known to every screen
let mineOf = undefined;
function syncMine(c) { const m = c?.custom || null; if (m !== mineOf) { mineOf = m; setMyClub(m); } }
const stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
const pname = p => `${p.heroId ? '★ ' : p.ability ? '⭐ ' : ''}${flagName(p)}`;
const fname = p => `${flag(p)} ${p.name}`.trim(); // flag and plain name, for lists
function renderCareer(notes = careerNotes) {
  const c = career();
  careerNotes = [];
  ui.show('career');
  const bidding = c.phase === 'auction' && careerView !== 'squad' && !!currentLot(c); // the lot on the block: the auction stage's look (css .is-auction)
  $('career').classList.toggle('is-auction', bidding);
  $('career').classList.toggle('in-auction', c.phase === 'auction' && careerView !== 'squad'); // the auction's own backdrop (css), also on its closing card
  $('careerTitle').textContent = bidding ? `Season ${c.season} auction` : `Season ${c.season}`;
  const club = c.club ? teamById(c.club) : null;
  $('careerLede').textContent = club
    ? `${club.name} · ${divisionName(divisionOf(c, c.club))} · ${money(c.money)} to spend · rating ${clubRating(c, c.club)}`
    : `Super League career · ${money(c.money)} to spend`;
  $('careerSquad').hidden = !club || c.phase === 'pick';
  const body = $('careerBody');
  body.innerHTML = '';
  for (const n of notes) body.append(el('div', 'panel paper notecard', n));
  if (careerView === 'squad' && club) return careerSquad(c, body);
  careerView = 'hub';
  if (c.news?.length && (c.phase === 'scouts' || c.phase === 'auction') && !c.auction?.results?.length) {
    const n = el('div', 'panel paper statcard'); n.append(el('h3', '', 'Off-season news')); for (const x of c.news) n.append(el('div', 'kotie', x)); body.append(n);
  }
  ({ pick: careerPick, scouts: careerScouts, auction: careerAuction, season: careerSeason, playoff: careerPlayoff, done: careerDone })[c.phase](c, body);
  autoPages(body, 'Now');
  saveProfile(profile);
}
$('btnLeague').addEventListener('click', async () => {
  unlockAudio(); careerView = 'hub';
  const fresh = career().phase === 'pick' && !career().region;
  // the story opens a new career, once (not for a career already under way)
  if (fresh && !profile.coachSeen?.careerOpening && !window.__SIXCHARGE_BOT) {
    profile.coachSeen = { ...profile.coachSeen, careerOpening: 1 }; saveProfile(profile);
    await careerOpening();
  }
  // a new career starts by choosing the region it's played in
  if (fresh) renderRegion(); else renderCareer();
});
$('careerHome').addEventListener('click', () => { if (careerView === 'squad') { careerView = 'hub'; renderCareer(); } else renderHome(); });
$('careerSquad').addEventListener('click', () => { careerView = careerView === 'squad' ? 'hub' : 'squad'; renderCareer(); });
$('careerRecords').addEventListener('click', () => renderRecords());
$('careerCoach').addEventListener('click', () => {
  const c = career();
  coachSay(c.phase === 'season' ? [...DEV.season, ...DEV.scoutTip] : DEV[{ pick: 'leagueTeam', scouts: 'scoutSign', auction: 'auction', playoff: 'playoff', done: 'seasonEnd' }[c.phase]]);
});
// start the Super League again from season 1: a fresh league, a fresh auction (nothing else is touched)
confirmTap($('careerRestart'), 'Tap again to restart from season 1', () => {
  profile.career = newCareer(randomSeed());
  careerView = 'hub';
  saveProfile(profile);
  ui.toast('A new Super League career begins');
  renderRegion();
});

// ---------- the Super League's first step: choose your region (only Asia's league is running) ----------
const REGIONS = [
  { id: 'africa', name: 'Africa', color: '#2fbf3a' }, { id: 'europe', name: 'Europe', color: '#2f7cff' },
  { id: 'asia', name: 'Asia', color: '#ff3b3b', open: true }, { id: 'namerica', name: 'North America', color: '#9b3bff' },
  { id: 'samerica', name: 'South America', color: '#ff8a1c' }, { id: 'oceania', name: 'Oceania', color: '#2ec8ff' },
];
let regionSel = 'asia';
function renderRegion() {
  const c = career();
  regionSel = c.region || 'asia';
  ui.show('region');
  $('rgCoins').textContent = profile.coins;
  // (every region's lit map loaded now, so a tap moves the light at once)
  for (const r of REGIONS) { const im = new Image(); im.src = `img/region/map-${r.id}.webp`; }
  const grid = $('rgGrid'); grid.innerHTML = '';
  for (const r of REGIONS) {
    const b = el('button', 'rgcard' + (r.open ? '' : ' locked'));
    b.dataset.id = r.id;
    b.style.setProperty('--rc', r.color);
    const im = document.createElement('img'); im.src = `img/region/card-${r.id}.webp`; im.alt = '';
    b.append(im);
    if (!r.open) b.append(el('div', 'soon', '🔒 Coming soon'));
    b.setAttribute('aria-label', `${r.name}${r.open ? '' : ', coming soon'}`);
    b.addEventListener('click', () => {
      sfx.click(); regionSel = r.id; regionShow();
      if (!r.open) ui.toast(`${r.name}'s league is coming soon. Asia's Super League is open now.`);
    });
    grid.append(b);
  }
  regionShow();
  coachOnce('region', DEV.region);
}
// the chosen region: lit on the map and tagged; only an open region's league can be entered
function regionShow() {
  const r = REGIONS.find(x => x.id === regionSel);
  $('rgMap').src = `img/region/map-${r.id}.webp`;
  for (const b of $('rgGrid').children) {
    const on = b.dataset.id === r.id;
    b.classList.toggle('on', on);
    b.querySelector('.sel')?.remove();
    b.querySelector('.soon')?.toggleAttribute('hidden', on);
    if (on) b.append(el('i', 'sel', REGIONS.find(x => x.id === b.dataset.id).open ? 'Selected' : '🔒 Coming soon'));
  }
  $('rgGo').disabled = !r.open;
  $('rgGo').textContent = r.open ? 'Continue' : '🔒 Coming soon';
}
$('rgBack').addEventListener('click', () => renderHome());
$('rgBack2').addEventListener('click', () => renderHome());
$('rgGo').addEventListener('click', () => { if (!REGIONS.find(r => r.id === regionSel)?.open) return; const c = career(); c.region = regionSel; sfx.dhol(); saveProfile(profile); careerView = 'hub'; renderCareer(); });

// pick (or keep) a club for the season
function careerPick(c, body) {
  // every career starts in Division 3
  const order = c.divisions.d3.map(teamById).sort((a, b) => a.name.localeCompare(b.name));
  renderPickTeam({
    teams: order, start: order[0].id, go: 'To the auction', coach: 'leagueTeam',
    squads: Object.fromEntries(order.map(t => [t.id, clubPool(c, t.id)])),
    note: 'Every career starts in Division 3. Win it to go up, win Division 2 to reach the Asian Super League.',
    onBack: () => (c.season === 1 && !c.club ? renderRegion() : renderHome()),
    onGo: id => { if (chooseClub(c, id)) { sfx.dhol(); saveProfile(profile); renderCareer(); } },
    make: () => renderMakeClub(c),
  });
}

// ---------- Create your own club: name, colours, crest; it takes a Division 3 place ----------
const KIT_COLOURS = ['#1f5fd6', '#123a7a', '#5fb4e8', '#0f8a8a', '#1e7a32', '#9bd12a', '#ffcf1a', '#ff8a1c',
  '#e8262b', '#8b1c24', '#ec2f9a', '#6a22c4', '#1f1f26', '#8f9296', '#ffffff', '#c8913a'];
let mk = null;
function renderMakeClub(c) {
  mk = mk?.c === c ? mk : { c, name: '', short: '', ground: '', groundSet: false, suit: '#e8262b', trim: '#ffcf1a', emblem: 'bolt', n: 0 };
  ui.show('makeclub');
  $('mkNameIn').value = mk.name; $('mkShortIn').value = mk.short; $('mkGroundIn').value = mk.ground;
  $('mkNameIn').placeholder = 'e.g. Mumbai Meteors'; $('mkShortIn').placeholder = 'MUM'; $('mkGroundIn').placeholder = 'e.g. Meteor Park';
  const sw = (box, key) => {
    box.innerHTML = '';
    for (const col of KIT_COLOURS) {
      const b = el('button'); b.style.setProperty('--c', col); b.dataset.c = col; b.setAttribute('aria-label', col);
      b.addEventListener('click', () => { mk[key] = col; sfx.click(); mkUpdate(); });
      box.append(b);
    }
  };
  sw($('mkSuit'), 'suit'); sw($('mkTrim'), 'trim');
  const em = $('mkEmblems'); em.innerHTML = '';
  for (const id of EMBLEM_IDS) {
    const b = el('button'); b.dataset.e = id; b.setAttribute('aria-label', id);
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; b.append(cv);
    b.addEventListener('click', () => { mk.emblem = id; sfx.click(); mkUpdate(); });
    em.append(b);
  }
  loadKitSprites();
  loadCrestMasks().then(() => mkUpdate());
  mkUpdate();
  coachOnce('makeClub', DEV.makeClub);
}
const mkFirst = () => (mk.name.trim().split(/\s+/)[0] || '');
const mkGroundName = () => mk.ground.trim() || (mkFirst() ? `${mkFirst()} Park` : 'Community Ground');
const mkShort = () => (mk.short.trim() || mk.name.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
function mkUpdate() {
  if (!mk) return;
  if (mk.trim === mk.suit) mk.trim = KIT_COLOURS.find(x => x !== mk.suit && x !== '#1f1f26') || '#ffffff';
  for (const b of $('mkSuit').children) b.classList.toggle('on', b.dataset.c === mk.suit);
  for (const b of $('mkTrim').children) { b.classList.toggle('on', b.dataset.c === mk.trim); b.disabled = b.dataset.c === mk.suit; }
  const show = $('mkShow');
  show.style.setProperty('--suit', mk.suit); show.style.setProperty('--trim', mk.trim);
  $('mkName').textContent = mk.name.trim() || 'Your Club';
  $('mkGround').textContent = `${mkShort() || '???'} · ${mkGroundName()}`;
  const crest = paintCrest(mk.emblem, mk.suit, mk.trim);
  for (const b of $('mkEmblems').children) {
    b.classList.toggle('on', b.dataset.e === mk.emblem);
    const pc = paintCrest(b.dataset.e, mk.suit, mk.trim), cv = b.firstChild, g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height); if (pc) g.drawImage(pc, 0, 0, cv.width, cv.height);
  }
  if (!crest) return;
  mk.crest = crest.toDataURL('image/png');
  $('mkCrest').src = mk.crest;
  // the kit: a player from the front and one from behind, in a preview club of these colours
  const id = `mk${++mk.n}`;
  setLogo(mk.pid, null); mk.pid = id; setLogo(id, mk.crest);
  mk.team = { id, name: mk.name, suit: mk.suit, trim: mk.trim, star: null, style: {} };
  loadKitSprites(id);
  mkDrawKit();
}
function mkDrawKit(tries = 0) {
  const cv = $('mkKit'), g = cv.getContext('2d'), team = mk?.team;
  if (!team || $('makeclub').hidden) return;
  g.clearRect(0, 0, cv.width, cv.height);
  const look = n => ({ skin: 2, hair: 0, style: n ? 'swept' : 'short', beard: 'none', seed: `mk${n}`, who: n ? `Captain ${mkShort() || 'Club'}` : 'Captain One', num: n ? 10 : 7 });
  const a = drawKitFielder(g, 130, 285, 140, 'ready_front', team, look(0));
  const b = drawKitFielder(g, 300, 285, 140, 'ready_back', team, look(1));
  // (the sheets and the crest load in the background: try again shortly)
  if ((!a || !b) && tries < 40) setTimeout(() => { if (mk?.team === team) mkDrawKit(tries + 1); }, 150);
}
$('mkNameIn').addEventListener('input', e => { mk.name = e.target.value; mkUpdate(); });
$('mkShortIn').addEventListener('input', e => { mk.short = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase(); e.target.value = mk.short; mkUpdate(); });
$('mkGroundIn').addEventListener('input', e => { mk.ground = e.target.value; mkUpdate(); });
$('mkCoach').addEventListener('click', () => coachSay(DEV.makeClub));
const mkBack = () => { renderCareer(); };
$('mkBack').addEventListener('click', mkBack);
$('mkBack2').addEventListener('click', mkBack);
$('mkGo').addEventListener('click', () => {
  const name = mk.name.trim().replace(/\s+/g, ' ');
  if (name.length < 3) { ui.toast('Give your club a name first'); $('mkNameIn').focus(); return; }
  if (!mk.crest) return;
  const c = mk.c;
  if (createClub(c, { name, short: mkShort(), suit: mk.suit, trim: mk.trim, emblem: mk.emblem, ground: mkGroundName(), crest: mk.crest })) {
    setLogo(mk.pid, null); mk = null;
    sfx.dhol(); saveProfile(profile);
    careerNotes = [`🏟️ ${name} are born! They take the place of ${c.custom.gone} in Division 3.`];
    renderCareer();
    coachOnce('madeClub', DEV.madeClub);
  }
});

// the pre-season auction
function careerAuction(c, body) {
  const lot = currentLot(c);
  const mine = clubPlayers(c, c.club);
  coachOnce('auction', DEV.auction).then(shown => {
    // short of players with the money running out: once a season
    if (!shown && lot && mine.length < MIN_SQUAD - 2 && c.money < 0.8) coachOnce(`auctionLow-${c.season}`, DEV.auctionLow);
  });
  if (!lot) body.append(el('div', 'panel paper notecard', `${teamById(c.club).name} · squad ${mine.length}/${MAX_SQUAD} · ${money(c.money)} to spend`));
  if (!lot) {
    const done = el('div', 'panel paper fixture');
    done.append(el('h3', '', 'The auction is over'), el('p', '', 'Every club needs at least 10 players: any gaps are filled with free agents and academy graduates.'));
    const go = el('button', 'bigbtn primary', `Start season ${c.season}`);
    go.addEventListener('click', () => { finishAuction(c); sfx.crowd?.(0.8); saveProfile(profile); renderCareer(); });
    done.append(go);
    body.append(done);
  } else {
    const p = c.players[lot.pid], A = c.auction, me = teamById(c.club);
    const stage = el('div', 'lotcard auction');
    // your franchise: crest, division and rating, squad places, money left
    const head = el('div', 'auc-club');
    const crest = el('img', 'auc-crest'); crest.src = logoSrc(c.club); crest.alt = '';
    const who = el('div', 'auc-who');
    who.append(el('b', '', me.name), el('small', '', `${divisionName(divisionOf(c, c.club))} · Rating ${clubRating(c, c.club)}`));
    const squad = el('div', 'auc-squad');
    const pips = el('div', 'auc-pips'); pips.setAttribute('aria-label', `${mine.length} of ${MAX_SQUAD} players`);
    for (let i = 0; i < MAX_SQUAD; i++) pips.append(el('i', i < mine.length ? 'on' : ''));
    squad.append(el('small', '', `SQUAD ${mine.length}/${MAX_SQUAD}`), pips);
    const budget = el('div', 'auc-budget');
    budget.append(el('small', '', 'BUDGET LEFT'), el('b', '', money(c.money)));
    head.append(crest, who, squad, budget);
    stage.append(head);
    const shown = Math.min(A.lots.length, 16);
    stage.append(el('div', 'auc-lot', `LOT ${Math.min(A.idx + 1, shown)} OF ${shown}`));
    const last = A.results.at(-1);
    if (last) stage.append(el('div', 'auc-last' + (last.team === c.club ? ' mine' : ''), last.team ? `Last: ${c.players[last.pid].name} → ${last.team === c.club ? 'YOU' : teamById(last.team).name} · ${money(last.price)}` : `Last: ${c.players[last.pid].name} went unsold`));
    // the player, and what he costs
    const main = el('div', 'auc-main');
    const cardBox = el('div', 'auc-card');
    cardBox.append(futCard(p, { size: Math.max(120, Math.min(210, window.innerWidth * 0.5, window.innerHeight * (window.innerHeight < 700 ? 0.24 : 0.3))) }));
    const side = el('div', 'auc-side');
    const price = el('div', 'auc-price');
    price.append(el('small', '', lot.leader ? 'CURRENT BID' : 'OPENING PRICE'), el('b', '', money(lot.price)), el('span', '', lot.leader ? `${teamById(lot.leader).name} lead` : 'No bids yet'));
    if (lot.leader) price.append(el('em', '', `Opened ${money(openingPrice(p))} · next ${money(nextBid(lot))}`));
    const facts = el('div', 'auc-facts');
    for (const [k, v] of [['Age', p.age ?? '—'], ['Batting', p.bat], ['Bowling', p.bowlSkill || '—'], ['Worth', money(value(p))]]) {
      const row = el('div', ''); row.append(el('span', '', k), el('b', '', String(v))); facts.append(row);
    }
    // the rival clubs: the leader, those who have dropped out (their limits stay hidden until they do), and how many are still in
    const rivals = el('div', 'auc-rivals'), all = rivalsOf(c, lot);
    const crestOf = (r, label) => {
      const rv = el('div', `rv rv-${r.state}`), nm = teamById(r.team).name, img = el('img');
      img.src = logoSrc(r.team); img.alt = '';
      rv.title = rv.ariaLabel = r.state === 'lead' ? `${nm}: leading` : `${nm}: out at ${money(r.at)}`;
      rv.append(img, el('span', '', label));
      return rv;
    };
    const lead = all.find(r => r.state === 'lead'), outs = all.filter(r => r.state === 'out').sort((x, y) => y.at - x.at).slice(0, 4);
    if (lead) rivals.append(crestOf(lead, 'LEAD'));
    for (const r of outs) rivals.append(crestOf(r, 'OUT'));
    const stillIn = all.filter(r => r.state === 'in').length;
    rivals.append(el('p', 'rv-count', stillIn ? `${stillIn} club${stillIn > 1 ? 's' : ''} still in` : lead && lead.team === c.club ? 'No club can raise' : 'No one else in'));
    side.append(price, rivals, facts, el('p', 'auc-note', ageNote(p)));
    main.append(cardBox, side);
    stage.append(main);
    if (p.heroId) {
      const pw = el('div', 'auc-power');
      pw.append(el('b', '', heroById(p.heroId).power.name), el('span', '', heroById(p.heroId).power.desc));
      stage.append(pw);
    }
    // the decision in four verdicts for the next bid (career.js assessLot)
    const rep = assessLot(c, lot), report = el('div', 'auc-report');
    for (const [k, title] of [['fit', 'SQUAD FIT'], ['price', 'PRICE'], ['cash', 'CASH AFTER'], ['risk', 'SQUAD RISK']]) {
      const t = el('div', `tone-${rep[k].tone}`);
      t.append(el('small', '', title), el('b', '', rep[k].label), el('span', '', rep[k].detail));
      report.append(t);
    }
    stage.append(report);
    const row = el('div', 'menu row auc-btns');
    const pass = el('button', 'bigbtn auc-pass');
    pass.append(el('b', '', 'Pass'), el('small', '', 'Save your budget'));
    const bidBtn = el('button', 'bigbtn primary auc-bid');
    const why = mine.length >= MAX_SQUAD ? 'Squad full' : c.money < nextBid(lot) ? 'Not enough money' : 'Make your move';
    bidBtn.append(el('b', '', `Bid ${money(nextBid(lot))}`), el('small', '', why));
    bidBtn.disabled = c.money < nextBid(lot) || mine.length >= MAX_SQUAD;
    bidBtn.addEventListener('click', () => {
      const r = bid(c);
      if (r === 'won') { ui.toast(`${p.name} signed for ${money(c.auction.results.at(-1).price)}!`); sfx.full(); }
      else if (r === 'outbid') { const L = c.auction.lot; ui.toast(`${teamById(L.leader).name} bid ${money(L.price)}`); sfx.click(); }
      else if (r === 'broke') ui.toast('Not enough money');
      else if (r === 'full') ui.toast(`Your squad is full (${MAX_SQUAD})`);
      saveProfile(profile); renderCareer();
    });
    pass.addEventListener('click', () => {
      const w = passLot(c);
      const sale = c.auction.results.at(-1), ru = sale.out?.[0];
      ui.toast(w ? `${p.name} → ${teamById(w).name} for ${money(sale.price)}${ru ? ` (${teamById(ru[0]).name} out at ${money(ru[1])})` : ''}` : `${p.name} goes unsold`);
      saveProfile(profile); renderCareer();
    });
    row.append(pass, bidBtn);
    stage.append(row);
    const skip = el('button', 'chipbtn ghostchip', 'Skip the rest of the auction');
    skip.addEventListener('click', () => { while (currentLot(c)) passLot(c); saveProfile(profile); renderCareer(); });
    stage.append(skip);
    body.append(stage);
  }
  if (lot) {
    // your squad now, and with this lot signed (a page of its own: the tab beside "Now")
    const now = squadNeeds(c), after = squadNeeds(c, c.players[lot.pid]);
    const pg = el('div', 'panel statcard auc-page');
    pg.append(el('h3', '', 'Squad needs'));
    const tbl = el('div', 'auc-table');
    const head = el('div', 'hd'); head.append(el('span', ''), el('b', '', 'NOW'), el('b', '', `WITH ${c.players[lot.pid].name.split(' ').pop().toUpperCase()}`));
    tbl.append(head);
    for (const [k, label] of [['rating', 'Squad rating'], ['bat', 'Batting (best 4)'], ['bowl', 'Bowling (best 3)'], ['pace', 'Pace bowlers'], ['spin', 'Spin bowlers'], ['allr', 'All-rounders'], ['size', `Players (${MIN_SQUAD}-${MAX_SQUAD})`]]) {
      const r = el('div', 'rw'); const up = after[k] > now[k];
      r.append(el('span', '', label), el('b', '', String(now[k])), el('b', up ? 'up' : '', String(after[k])));
      tbl.append(r);
    }
    pg.append(tbl, el('p', 'auc-need', now.needed ? `You need ${now.needed} more player${now.needed > 1 ? 's' : ''} to reach ${MIN_SQUAD}. ${now.places} places are free.` : `Squad complete. ${now.places} place${now.places === 1 ? ' is' : 's are'} free.`));
    body.append(pg);
  }
  const res = c.auction.results.slice(-8).reverse();
  if (res.length) {
    const rb = el('div', lot ? 'panel statcard auc-page' : 'panel paper statcard');
    rb.append(el('h3', '', 'Sold'));
    for (const r of res) {
      if (!lot) { rb.append(el('div', 'kotie' + (r.team === c.club ? ' mine' : ''), `${c.players[r.pid].name} → ${r.team ? `${teamById(r.team).name} · ${money(r.price)}` : 'unsold'}`)); continue; }
      const row = el('div', 'auc-sale' + (r.team === c.club ? ' mine' : ''));
      const who = el('div', ''); who.append(el('b', '', c.players[r.pid].name), el('small', '', r.team ? (r.team === c.club ? 'You signed him' : teamById(r.team).name) : 'Unsold'));
      if (r.out?.length) who.append(el('small', 'auc-beat', `${r.team === c.club ? 'Beat' : 'Outbid'}: ${teamById(r.out[0][0]).name} ${money(r.out[0][1])}`));
      row.append(who, el('strong', '', r.team ? money(r.price) : '—'));
      rb.append(row);
    }
    body.append(rb);
  }
}

// the season: the next fixture, the table and the bracket
function careerSeason(c, body) {
  const f = nextFixture(c.league);
  const me = teamById(c.club);
  body.append(divisionCard(c));
  coachOnce('season', DEV.season).then(async shown => {
    // send a scout abroad; then, once one has found someone, what happens next
    if (!Object.keys(c.scouting || {}).length) shown = (await coachOnce('scoutTip', DEV.scoutTip)) || shown;
    if (Object.values(c.scouting || {}).some(s => s.season === c.season && s.finds.length)) shown = (await coachOnce('scoutFound', DEV.scoutFound)) || shown;
    // two defeats running: a word of advice (once a season)
    const mineR = (c.league.results || []).filter(r => r.player), last2 = mineR.slice(-2);
    if (!shown && last2.length === 2 && last2.every(r => r.winner && r.winner !== c.club)) coachOnce(`slump-${c.season}`, DEV.slump);
  });
  if (f) {
    const o = teamById(f.opp);
    const theirs = clubPlayers(c, o.id), heroes = theirs.filter(p => p.heroId).map(p => heroById(p.heroId).name);
    const best = [...theirs].sort((a, b) => ovr(b) - ovr(a))[0];
    body.append(fixtureCard(f, me, o, `${o.name} · rating ${clubRating(c, o.id)} · ${o.style.tag}. ${heroes.length ? `Heroes: ${heroes.join(', ')}. ` : ''}Watch out for ${flagName(best)} (${ovr(best)}).`,
      () => startMatch({ mode: 'career' }), preMatch(c, o.id)));
  }
  body.append(chirpPanel(c));
  if (c.custom) body.append(stadiumPanel(c));
  body.append(scoutsPanel(c));
  body.append(...leaguePanels(c.league));
}

// ---------- Chirp: the feed of your club's world (js/chirp.js): rivals, press and fans post, the fans reply ----------
const AGO = ['2m', '19m', '1h', '3h', '6h', '9h', '1d', '1d', '2d', '3d', '4d', '5d'];
const countUp = (node, to) => {
  const t0 = performance.now(), dur = 900;
  const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3; node.textContent = compact(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); };
  node.textContent = '0'; requestAnimationFrame(step);
};
const cface = (face, cls = '') => { const d = el('span', `cface ${cls}`); d.setAttribute('style', faceStyle(face)); d.setAttribute('aria-hidden', 'true'); return d; };
const ccrest = (club, cls = '') => { const i = document.createElement('img'); i.className = `cface crest ${cls}`; i.src = logoSrc(club); i.alt = ''; return i; };
const cstat = (icon, n) => { const w = el('span', 'cstat'), ic = el('i', 'cicon'); ic.style.backgroundPosition = `${icon / 3 * 100}% 0`; const b = el('b', '', ''); b.dataset.n = n; w.append(ic, b); return w; };
// the badge: a blue tick for a club and its players, the shield for the press
const cbadge = by => { const v = el('i', by.type === 'press' ? 'cshield' : 'ctick'); v.setAttribute('role', 'img'); v.setAttribute('aria-label', 'verified'); return v; };
function chirpActions(post) { const st = el('div', 'cstats'); st.append(cstat(1, post.likes), cstat(2, post.replies), cstat(3, post.shares)); return st; }
function chirpReplies(post) {
  if (!post.comments?.length) return null;
  const list = el('div', 'creplies');
  for (const m of post.comments) {
    const row = el('div', 'creply');
    const txt = el('div', 'cbody'); const h = el('div', 'chead'); h.append(el('b', 'cname sm', m.name), el('span', 'chandle', m.handle));
    txt.append(h, el('p', 'ctext sm', m.text));
    row.append(cface(m.face, 'sm'), txt);
    list.append(row);
  }
  return list;
}
function chirpPost(c, post, k) {
  const card = el('article', `cpost k-${post.kind}`);
  const by = post.by;
  const av = by.type === 'star' || by.type === 'club' ? ccrest(by.club) : cface(by.face);
  const head = el('div', 'chead');
  const name = el('b', 'cname', by.name);
  if (by.verified) name.append(cbadge(by));
  const sub = el('div', 'csub');
  sub.append(el('span', 'chandle', by.handle));
  if (by.outlet) sub.append(el('span', 'coutlet', by.outlet));
  else if (by.type === 'star') sub.append(el('span', 'chandle', `· ${teamById(by.club).name}`));
  const top = el('div', 'ctop'); top.append(name, el('span', 'cago', AGO[Math.min(k, AGO.length - 1)]), el('span', 'cdots', '⋮'));
  head.append(top, sub);
  const body = el('div', 'cbody');
  body.append(head, el('p', 'ctext', post.text), chirpActions(post));
  const rep = chirpReplies(post); if (rep) body.append(rep);
  card.append(av, body);
  return card;
}
// your club's own post: the next match, with the club's star on it
function nextMatchPost(c) {
  if (c.phase !== 'season' || !c.league) return null;
  const f = nextFixture(c.league);
  if (!f) return null;
  const me = teamById(c.club), opp = teamById(f.opp), by = { type: 'club', club: c.club, name: me.name, handle: handleOf(me.name), verified: true };
  const card = el('article', 'cpost official');
  const row = el('div', 'crow');
  const head = el('div', 'chead'), top = el('div', 'ctop'), name = el('b', 'cname', me.name); name.append(cbadge(by));
  top.append(name, el('span', 'cago', '2h'), el('span', 'cdots', '⋮'));
  const sub = el('div', 'csub'); sub.append(el('span', 'chandle', by.handle));
  head.append(top, sub);
  const hb = el('div', 'cbody'); hb.append(head);
  row.append(ccrest(c.club), hb);
  const ban = el('div', 'cbanner');
  const main = el('div', 'cbmain');
  const words = el('div', 'cbwords'); words.append(el('b', 'cbnext', 'NEXT MATCH'), el('b', 'cbvs', `VS ${opp.name.toUpperCase()}`));
  const chips = el('div', 'cbchips');
  chips.append(el('span', '', `📅 ${f.label.toUpperCase()}`), el('span', '', `📍 ${groundOf(f.home || c.club).name.toUpperCase()}`), el('span', '', `⚡ ${divisionName(divisionOf(c, c.club)).toUpperCase()}`));
  main.append(words, ccrest(c.club, 'cbcrest'));
  ban.append(main, chips);
  const eng = engagement(c, by, `next${c.season}${f.opp}`);
  card.append(row, ban, chirpActions({ likes: eng.likes, replies: eng.replies, shares: eng.shares }));
  return card;
}
function chirpPanel(c) {
  const P = ensureChirp(c), me = teamById(c.club);
  const box = el('div', 'chirp');
  box.append(el('h3', 'vh', 'Chirp'));   // (the pager names the tab from it)
  // the app's header: the logo, and where the club stands
  const bar = el('div', 'chirpbar');
  const logo = document.createElement('img'); logo.src = 'img/chirp/logo.webp'; logo.alt = 'Chirp'; logo.className = 'chirplogo';
  const stats = el('div', 'chirpstats');
  const fol = el('b', '', compact(P.fans)); fol.dataset.n = P.fans;
  const buzz = el('div', 'cbuzz'); const bz = el('i'); bz.style.width = `${Math.round(P.buzz * 100)}%`; buzz.append(bz);
  const f1 = el('span', 'cfol'); f1.append(fol, el('small', '', 'FOLLOWERS'));
  const f2 = el('span', 'cfol'); f2.append(el('b', 'sm', buzzWord(P.buzz)), el('small', '', 'BUZZ'), buzz);
  stats.append(f1, f2);
  bar.append(logo, stats);
  box.append(bar);
  const perk = sponsorBonus(c), lift = Math.round(crowdOf(c) * CROWD_TIMING * 1000) / 10;
  box.append(el('p', 'cperk', `${perk > 0 ? `Your fans bring ${money(perk)} extra in sponsorship every season. ` : 'Win matches and your followers grow: big clubs earn more from sponsors. '}${lift >= 0.1 ? `At home, your crowd widens your timing by ${lift}%.` : 'A bigger, hotter crowd will widen your timing at home.'}`));
  const feed = el('div', 'cfeed');
  const next = nextMatchPost(c); if (next) feed.append(next);
  P.feed.slice(0, 14).forEach((post, k) => feed.append(chirpPost(c, post, k + 1)));
  if (!P.feed.length && !next) feed.append(el('p', 'cperk', 'Quiet for now. Play a match and Chirp will have something to say.'));
  box.append(feed);
  requestAnimationFrame(() => box.querySelectorAll('[data-n]').forEach(n => countUp(n, +n.dataset.n)));
  return box;
}

// ---------- your own ground: its level, and building the next one ----------
function stadiumPanel(c) {
  const lv = stadiumLevel(c), S = STADIUMS[lv], next = STADIUMS[lv + 1], me = teamById(c.club);
  const box = el('div', 'panel paper stadpanel');
  box.append(el('h3', '', `🏟️ ${c.custom.ground}`), el('p', 'sheetnote', `${S.name} · ${S.fans} fans · ${money(S.ticket)} ticket money every home match`));
  const pic = (level, cls) => {
    const w = el('div', `stadthumb ${cls}`);
    stadiumThumb(level, me, logoSrc(c.club)).then(cv => w.append(cv), () => {});
    return w;
  };
  box.append(pic(lv, 'now'));
  coachOnce('stadium', DEV.stadium);
  if (next) {
    const why = upgradeBlock(c);
    const row = el('div', 'stadnext');
    const txt = el('div');
    txt.append(el('b', '', `Next: ${next.name}`), el('small', '', `${next.fans} fans · ${money(next.ticket)} a home match`));
    const btn = el('button', 'chipbtn', why === 'division' ? '🔒 Division 2 first' : `Build · ${money(next.cost)}`);
    btn.disabled = !!why;
    if (!why) confirmTap(btn, `Tap again: ${money(next.cost)}`, () => {
      if (!upgradeStadium(c)) return;
      sfx.dhol(); saveProfile(profile);
      ui.toast(`🏗️ ${c.custom.ground} is now a ${next.name}!`);
      renderCareer();
      coachOnce(`stadium${lv + 1}`, DEV.stadiumBuilt);
    });
    row.append(pic(lv + 1, 'next'), txt, btn);
    box.append(row);
    if (!why) coachOnce('stadiumCan', DEV.stadiumCan);
  } else box.append(el('p', 'sheetnote', 'The biggest ground a club can build. The crowd is yours.'));
  return box;
}

// ---------- travelling scouts ----------
function scoutsPanel(c) {
  const box = el('div', 'panel paper scoutpanel');
  box.append(el('h3', '', '🔎 Travelling scouts'));
  box.append(el('p', 'sheetnote', `Send a scout abroad for the season (${money(SCOUT_FEE)} a region). He finds a player every two matches, up to three, and you can sign them at a set price before next season's auction.`));
  for (const [id, R] of Object.entries(SCOUT_REGIONS)) {
    const row = el('div', 'scoutrow');
    const im = document.createElement('img'); im.src = `img/region/card-${id}.webp`; im.alt = '';
    const txt = el('div');
    const out = scoutOut(c, id), finds = out ? c.scouting[id].finds.map(pid => c.players[pid]) : [];
    txt.append(el('b', '', R.name), el('small', '', out
      ? (finds.length ? `Found: ${finds.map(p => `${flag(p)} ${p.name}`).join(', ')}` : 'Out scouting: his first report comes after two matches')
      : R.tag));
    const btn = el('button', 'chipbtn', out ? `✓ ${finds.length}/3 found` : `Send · ${money(SCOUT_FEE)}`);
    btn.disabled = out || c.money < SCOUT_FEE;
    btn.addEventListener('click', () => {
      if (sendScout(c, id)) { sfx.full(); ui.toast(`Your scout is off to ${R.name}`); saveProfile(profile); renderCareer(); }
    });
    row.append(im, txt, btn); box.append(row);
  }
  return box;
}
// the start of a season: your scouts' finds, yours to sign at a set price before the auction
function careerScouts(c, body) {
  coachOnce('scoutSign', DEV.scoutSign);
  const finds = scoutFinds(c), mine = clubPlayers(c, c.club);
  body.append(el('div', 'panel paper notecard', `🔎 Your scouts are home · ${teamById(c.club).name} · squad ${mine.length}/${MAX_SQUAD} · ${money(c.money)} to spend`));
  const grid = el('div', 'scoutfinds');
  for (const p of finds) {
    const card = el('div', 'panel paper lotcard');
    card.append(el('div', 'eyebrow', `SCOUTED IN ${SCOUT_REGIONS[p.scouted.region].name.toUpperCase()}`));
    card.append(futCard(p, { size: Math.min(200, window.innerWidth * 0.46) }));
    card.append(el('p', 'lotmeta', `${p.label} · ${ageNote(p)} · bat ${p.bat}${p.bowlSkill ? ` · bowl ${p.bowlSkill}` : ''}`));
    const btn = el('button', 'bigbtn primary', `Sign · ${money(p.scouted.price)}`);
    btn.disabled = c.money < p.scouted.price || mine.length >= MAX_SQUAD;
    btn.addEventListener('click', () => {
      if (signFind(c, p.id)) { sfx.full(); ui.toast(`${p.name} signs for ${teamById(c.club).name}!`); saveProfile(profile); renderCareer(); }
    });
    card.append(btn);
    grid.append(card);
  }
  if (!finds.length) grid.append(el('div', 'panel paper notecard', 'All signed. On to the auction!'));
  body.append(grid);
  const go = el('button', 'bigbtn primary', 'To the auction');
  go.addEventListener('click', () => { finishScouts(c); sfx.dhol(); saveProfile(profile); renderCareer(); });
  body.append(go, el('p', 'sheetnote', 'Anyone you leave goes into the auction, where every club can bid for him.'));
}

// the season is over
function careerDone(c, body) {
  const h = c.history.at(-1);
  coachOnce(`done-${h.season}`, h.promoted ? DEV.promoted : h.relegated ? DEV.relegated : h.champion === c.club ? DEV.champion : DEV.seasonEnd);
  const card = el('div', 'panel paper fixture');
  card.append(el('div', 'eyebrow', `SEASON ${h.season} · ${divisionName(h.div || 'asl').toUpperCase()} · FINAL STANDINGS`),
    el('h3', '', h.promoted ? '⬆️ PROMOTED!' : h.relegated ? '⬇️ RELEGATED' : h.champion === c.club ? '🏆 CHAMPIONS!' : `You finished ${ordinal(h.pos)}`),
    el('p', '', `Champions: ${teamById(h.champion).name} · Runners-up: ${teamById(h.runnerUp).name}`));
  if (h.promoted) card.append(el('p', '', `Next season ${teamById(c.club).name} play in ${divisionName(h.promoted)}.`));
  if (h.relegated) card.append(el('p', '', `Next season ${teamById(c.club).name} play in ${divisionName(h.relegated)}.`));
  if (h.playoff) card.append(el('p', '', h.playoff.won ? `🛡️ Survived the play-off against ${teamById(h.playoff.opp).name}.` : `Lost the play-off to ${teamById(h.playoff.opp).name}.`));
  if (h.orange) card.append(el('p', '', `🟠 Most runs: ${playerName(c, h.orange.pid)} (${h.orange.runs})`));
  if (h.purple) card.append(el('p', '', `🟣 Most wickets: ${playerName(c, h.purple.pid)} (${h.purple.wkts})`));
  if (c.custom) setTimeout(() => card.after(stadiumPanel(c)));
  const go = el('button', 'bigbtn primary', `On to season ${c.season + 1}`);
  go.addEventListener('click', () => { nextSeason(c); saveProfile(profile); renderCareer(); });
  card.append(go);
  body.append(card);
  // the whole ladder: who went up, who came down
  if (c.moveNews?.length || h.champions) {
    const m = el('div', 'panel paper statcard');
    m.append(el('h3', '', 'Across the divisions'));
    if (h.champions) for (const d of ['asl', 'd2', 'd3']) m.append(el('div', 'kotie', `🏆 ${divisionName(d)}: ${teamById(h.champions[d]).name}`));
    for (const x of c.moveNews || []) m.append(el('div', 'kotie', x));
    body.append(m);
  }
  body.append(...leaguePanels(c.league));
}

// the division you're in, and what it takes to move up (or stay up)
function divisionCard(c) {
  const d = divisionOf(c, c.club);
  const box = el('div', 'panel paper divcard');
  const rungs = el('div', 'divladder');
  for (const x of ['asl', 'd2', 'd3']) rungs.append(el('span', x === d ? 'on' : '', divisionName(x)));
  box.append(rungs, el('p', 'sheetnote', {
    d3: 'Win Division 3 (the final, after the semis) to be promoted to Division 2.',
    d2: 'Win Division 2 to reach the Asian Super League. Finish bottom of the table and you go back down to Division 3.',
    asl: 'The top flight. Finish 7th or 8th and you play off to stay up: the loser goes down to Division 2.',
  }[d]));
  return box;
}

// 7th or 8th in the Super League: one match to stay up
function careerPlayoff(c, body) {
  coachOnce(`playoff-${c.season}`, DEV.playoff);
  const me = teamById(c.club), o = teamById(c.playoff.opp);
  body.append(divisionCard(c));
  body.append(fixtureCard({ ...c.playoff, label: 'Relegation play-off' }, me, o, `Win and you stay in the Asian Super League. Lose and ${me.name} go down to Division 2.`, () => startMatch({ mode: 'career' })));
  body.append(...leaguePanels(c.league));
}

// your squad: who you've got, how good they could be, and the line-up
function careerSquad(c, body) {
  const pool = clubPool(c, c.club);
  const list = el('div', 'panel paper sheetbox');
  list.append(el('h3', '', `${teamById(c.club).name} · ${pool.length}/${MAX_SQUAD}`));
  list.append(el('p', 'sheetnote', `Players improve when they play well, up to their potential, until they turn ${PEAK_AGE}. A regular who reaches ${STAR_OVR} becomes a star with an ability.`));
  const grid = el('div', 'futgrid');
  list.append(grid);
  for (const p of [...pool].sort((a, b) => ovr(b) - ovr(a))) {
    const r = el('div', 'futcell');
    const s = p.stats.season;
    r.append(futCard(p, { size: 112 }),
      el('div', 'futnote', `${p.contract} season${p.contract === 1 ? '' : 's'} left · this season ${s.runs}r ${s.wkts}w · form ${'▮'.repeat(p.form || 0)}${'▯'.repeat(4 - (p.form || 0))}`));
    if (pool.length > MIN_SQUAD && !p.heroId) {
      const rel = el('button', 'chipbtn', 'Release');
      confirmTap(rel, 'Tap again to release', () => {
        releasePlayer(c, p.id); saveProfile(profile); renderCareer();
      });
      r.append(rel);
    }
    grid.append(r);
  }
  // line-up for league matches
  const L = resolveLineup(c.club, clubHeroes(pool), c.lineup, {}, pool);
  const sheet = el('div', 'panel paper sheetbox');
  sheet.append(el('h3', '', 'Line-up'));
  const pick = (title, chosen, cands, n, label, save) => {
    sheet.append(el('b', 'kostage', title));
    for (let i = 0; i < n; i++) {
      const row = el('label', 'sheetrow');
      row.append(el('span', 'sheetno', String(i + 1)));
      const sel = document.createElement('select');
      for (const p of cands) { const o = document.createElement('option'); o.value = p.id; o.textContent = `${pname(p)} · ${label(p)}`; sel.append(o); }
      sel.value = chosen[i]?.id || '';
      sel.addEventListener('change', () => {
        const p = cands.find(x => x.id === sel.value), j = chosen.indexOf(p), next = [...chosen];
        if (j >= 0) next[j] = chosen[i];
        next[i] = p; save(next); saveProfile(profile); renderCareer();
      });
      row.append(sel); sheet.append(row);
    }
  };
  pick('Batting order', L.order, batCandidates(pool), ORDER_SIZE, p => `bat ${p.bat}`, next => { c.lineup = { order: next.map(p => p.id), attack: L.attack.map(p => p.id) }; });
  pick('Bowling attack', L.attack, bowlCandidates(pool), ATTACK_SIZE, p => `${bowlType(p.bowl).short} ${p.bowlSkill}`, next => { c.lineup = { order: L.order.map(p => p.id), attack: next.map(p => p.id) }; });
  // nothing scrolls down: the players swipe in pairs (fours on a tall phone), the line-up is its own tab
  const per = window.innerHeight >= 800 ? 4 : 2;
  grid.replaceWith(carousel([...grid.children], per));
  list.querySelectorAll('.carousel .page').forEach(pg => pg.classList.add('futpage'));
  pager(body, [['Players', list], ['Line-up', sheet]]);
}

// records that never go away
function renderRecords() {
  const c = career();
  ui.show('records');
  const body = $('recordsBody');
  body.innerHTML = '';
  const team = p => (p.retired ? 'retired' : p.team ? teamById(p.team).name : 'free agent');
  const board = (title, rows) => {
    const b = el('div', 'panel paper statcard');
    b.append(el('h3', '', title));
    if (!rows.length) b.append(el('p', 'sheetnote', 'Nothing yet: play a season.'));
    rows.forEach((r, i) => {
      const d = el('div', 'kotie');
      d.append(el('b', '', `${i + 1}.`));
      if (r && typeof r === 'object') { if (r.p) d.append(r.p.heroId ? portrait(heroById(r.p.heroId), 28, 'celebrate') : portraitFace(r.p, r.p.team ? teamById(r.p.team) : null, 28) || faceEl(r.p, kitOf(r.p), 28)); d.append(el('span', '', r.text)); }
      else d.append(el('span', '', r));
      const pic = d.querySelector('canvas'); if (pic) { pic.classList.add('face'); pic.style.width = pic.style.height = '28px'; }
      b.append(d);
    });
    return b;
  };
  const top = (scope, key, fmtRow, n = 5) => leaders(c, scope, key, n).filter(p => p.stats[scope][key === 'hs' ? 'hs' : key] > 0).map(p => ({ p, text: fmtRow(p) }));
  if (c.phase === 'season' || c.phase === 'done') {
    body.append(board(`Season ${c.season} · most runs`, top('season', 'runs', p => `${fname(p)} (${team(p)}) · ${p.stats.season.runs}`)));
    body.append(board(`Season ${c.season} · most wickets`, top('season', 'wkts', p => `${fname(p)} (${team(p)}) · ${p.stats.season.wkts}`)));
  }
  body.append(board('All-time most runs', top('all', 'runs', p => `${fname(p)} (${team(p)}) · ${p.stats.all.runs} in ${p.stats.all.m} matches`, 10)));
  body.append(board('All-time most wickets', top('all', 'wkts', p => `${fname(p)} (${team(p)}) · ${p.stats.all.wkts}${p.stats.all.bb ? ` · best ${p.stats.all.bb.w}/${p.stats.all.bb.r}` : ''}`, 10)));
  body.append(board('Most sixes', top('all', 'sixes', p => `${fname(p)} (${team(p)}) · ${p.stats.all.sixes}`)));
  body.append(board('Highest scores', c.records.hs.slice(0, 10).map(r => ({ p: c.players[r.pid], text: `${fname(c.players[r.pid])} · ${r.runs}${r.out ? '' : '*'} (${r.balls}) · ${teamById(r.team || 'thunder').name} · S${r.season}` }))));
  body.append(board('Best bowling', c.records.bb.slice(0, 10).map(r => ({ p: c.players[r.pid], text: `${fname(c.players[r.pid])} · ${r.w}/${r.r} · ${teamById(r.team || 'thunder').name} · S${r.season}` }))));
  const clubs = CLUBS.map(t => ({ t: teamById(t.id), titles: c.titles[t.id] || 0, finals: c.history.filter(h => h.runnerUp === t.id).length })).sort((a, b) => b.titles - a.titles || b.finals - a.finals);
  body.append(board('Most Super League titles', clubs.filter(x => x.titles || x.finals).map(x => `${x.t.name} · ${x.titles} title${x.titles === 1 ? '' : 's'}${x.finals ? `, ${x.finals} runner-up` : ''}`)));
  body.append(board('Season by season', c.history.map(h => `S${h.season}: ${teamById(h.champion).name} champions · you: ${teamById(h.club).name} (${ordinal(h.pos)})${h.orange ? ` · most runs ${playerName(c, h.orange.pid)} ${h.orange.runs}` : ''}`)));
  const reset = el('button', 'chipbtn ghostchip', 'Start a brand-new career');
  confirmTap(reset, 'Tap again to start over', () => {
    profile.career = null; saveProfile(profile); careerView = 'hub'; renderCareer();
  });
  // nothing scrolls down: the boards swipe in threes (twos on a short phone)
  const boards = [...body.children];
  body.textContent = '';
  body.append(carousel(boards, window.innerHeight >= 800 ? 3 : 2), reset);
}
$('recordsBack').addEventListener('click', () => renderCareer());

// ---------- the daily challenge ----------
function renderDaily() {
  ui.show('daily');
  const sc = dailyScenario(), done = profile.dailyChallenge?.key === sc.key ? profile.dailyChallenge : null;
  $('dailyTitle').textContent = `Daily #${sc.no}`;
  const c = $('dailyCard');
  c.innerHTML = '';
  const logos = el('div', 'fixlogos');
  const la = document.createElement('img'); la.src = logoSrc(sc.team); la.alt = '';
  const lb = document.createElement('img'); lb.src = logoSrc(sc.opp); lb.alt = '';
  logos.append(la, el('b', '', 'V'), lb);
  c.append(el('div', 'eyebrow', sc.kind === 'chase' ? 'THE CHASE' : 'THE DEFENCE'), el('h3', '', sc.title), logos, el('p', '', sc.text),
    el('p', 'venue', `🏟 ${groundOf(sc.team).name} · Pitch: ${groundOf(sc.team).pitch.name}`),
    el('p', 'sheetnote', `Everyone plays the same scenario today, with the same teams and their own stars. One attempt. You start with 60 charge. Streak: ${profile.dailyStreak?.count || 0} day${profile.dailyStreak?.count === 1 ? '' : 's'}.`));
  if (done) {
    c.append(el('div', 'notecard big', `${done.won ? '✅' : '❌'} ${done.line}`), el('div', 'dailyballs', done.balls));
    const share = el('button', 'bigbtn whatsapp', 'Share your result');
    share.addEventListener('click', () => { location.href = `https://wa.me/?text=${encodeURIComponent(dailyShareText(sc, done))}`; });
    c.append(share, el('p', 'sheetnote', 'A new challenge arrives at midnight (UTC).'));
  }
  $('dailyGo').hidden = !!done;
}
const dailyShareText = (sc, d) => `Sixcharge Daily #${sc.no}: ${sc.title} ${d.won ? '✅' : '❌'}\n${d.line}\n${d.balls}\n${shareBase()}`;
$('dailyBack').addEventListener('click', renderHome);
$('dailyGo').addEventListener('click', () => {
  const sc = dailyScenario();
  if (profile.dailyChallenge?.key === sc.key) return renderDaily();
  // the attempt counts as soon as it starts: quitting doesn't give a second go
  profile.dailyChallenge = { key: sc.key, won: false, line: 'Gave up', balls: '' };
  updateStreak(profile, sc.key);
  saveProfile(profile);
  startMatch({ mode: 'daily', scenario: sc });
});

// ---------- trophies: cabinet, achievements ----------
function renderTrophies() {
  ui.show('trophies');
  const body = $('trophyBody');
  body.innerHTML = '';
  const cab = el('div', 'panel paper statcard');
  cab.append(el('h3', '', 'Trophy cabinet'));
  const tr = profile.trophies || [];
  if (!tr.length) cab.append(el('p', 'sheetnote', 'Empty for now. Win the Super League or the Knockout Cup to fill it.'));
  const shelf = el('div', 'shelf');
  for (const x of tr) shelf.append(el('div', 'cup' + (x.kind === 'league' ? ' gold' : ''), `🏆 ${x.kind === 'league' ? 'Super League' : 'Knockout Cup'}${x.unbeaten ? ' · unbeaten' : ''} · ${teamById(x.team).name} · ${x.date}`));
  cab.append(shelf);
  const ach = el('div', 'panel paper statcard');
  const got = profile.achievements || {};
  ach.append(el('h3', '', `Achievements · ${ACHIEVEMENTS.filter(a => got[a.id]).length}/${ACHIEVEMENTS.length}`));
  const rows = ACHIEVEMENTS.map(a => {
    const row = el('div', 'achrow' + (got[a.id] ? ' got' : ''));
    row.append(el('b', '', `${got[a.id] ? '★' : '☆'} ${a.name}`), el('span', '', `${a.desc} · ${a.coins} coins${got[a.id] ? ` · ${got[a.id]}` : ''}`));
    return row;
  });
  ach.append(carousel(rows, 5));
  pager(body, [['Trophies', cab], ['Medals', ach]]);
}
$('trophiesBack').addEventListener('click', renderHome);

// unlock achievements and tell the player
function awardAchievements(ctx) {
  const got = checkAchievements(profile, ctx);
  saveProfile(profile);
  for (const a of got) ui.toast(`🏅 ${a.name}! +${a.coins} coins`, 2600);
  return got;
}

// ---------- coin toss ----------
let tossAnim = null;
function coinToss(opp, home) {
  return new Promise(resolve => {
    ui.show('toss');
    const text = $('tossText'), bot = !!window.__SIXCHARGE_BOT;
    tossAnim = tossAnim || new TossAnim($('tossCanvas'));
    tossAnim.reset(); tossAnim.start();
    const btns = [...$('tossCall').querySelectorAll('button')];
    $('tossCall').hidden = false; $('tossCall').classList.remove('called'); $('tossChoose').hidden = true; $('tossGo').hidden = true;
    for (const b of btns) { b.disabled = false; b.classList.remove('on'); }
    const G = groundOf(home);
    text.textContent = `You v ${opp.name} at ${G.name} (${home === opp.id ? 'away' : 'home'}). Pitch: ${G.pitch.name}. Call it in the air!`;
    const done = choice => { tossAnim.stop(); resolve(choice); };
    const call = side => {
      // your call lights up; the coin goes up
      for (const b of btns) { b.disabled = true; b.classList.toggle('on', b.dataset.call === side); }
      $('tossCall').classList.add('called');
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      sfx.whoosh(); buzz(20);
      text.textContent = 'It\'s in the air…';
      tossAnim.flip(result, bot ? 250 : 1700).then(() => {
        sfx.dhol(); buzz([30, 30, 50]);
        $('tossCall').hidden = true;
        if (side === result) {
          text.textContent = `${result.toUpperCase()}! You won the toss. What will you do?`;
          $('tossChoose').hidden = false;
          if (bot) setTimeout(() => done(Math.random() < 0.5 ? 'bat' : 'bowl'), 100);
        } else {
          const aiBats = Math.random() < 0.4;
          text.textContent = `${result.toUpperCase()}. ${opp.name} won the toss and will ${aiBats ? 'bat' : 'bowl'} first: you ${aiBats ? 'bowl' : 'bat'} first.`;
          $('tossGo').hidden = false;
          $('tossGo').onclick = () => done(aiBats ? 'bowl' : 'bat');
          if (bot) setTimeout(() => done(aiBats ? 'bowl' : 'bat'), 100);
        }
      });
    };
    for (const b of btns) b.onclick = () => call(b.dataset.call);
    for (const b of $('tossChoose').querySelectorAll('button')) b.onclick = () => done(b.dataset.choose);
    if (bot) setTimeout(() => call(Math.random() < 0.5 ? 'heads' : 'tails'), 100);
  });
}

// ---------- result + sharing ----------
function shareBase() {
  const meta = document.querySelector('meta[name="sixcharge:share-base"]')?.content;
  return meta || location.href.split('#')[0];
}

function showResult(summary) {
  lastSummary = summary;
  const mode = summary.mode;
  const rewards = matchRewards(profile, summary);
  // the AI learns from how you played (not in the fixed modes), and says where it is playing now
  const adapts = adaptScale(mode) > 0;
  if (adapts) profile.skill = learn(profile.skill, summary);
  const counts = mode !== 'tutorial' && mode !== 'daily'; // full matches go in the career record
  const rec = counts ? recordStats(profile, summary) : null;
  const win = summary.result.outcome === 'win';
  if (counts && win && !summary.oppTeam.national) profile.beaten = [...new Set([...(profile.beaten || []), summary.oppTeam.id])];
  const events = [];
  let notes = [];
  if (mode === 'league' || mode === 'cup') { const r = tournamentAfterMatch(summary); notes = r.notes; tourNotes = notes; events.push(...r.events); }
  if (mode === 'war') notes = warAfterMatch(summary);
  if (mode === 'warmup') notes = ['A warm-up: no points. Your Weekend War match counts from Saturday.'];
  if (mode === 'career') {
    const c = profile.career;
    notes = c.phase === 'playoff' ? afterPlayoff(c, summary) : afterLeagueMatch(c, summary);
    careerNotes = notes;
    if (c.phase === 'done' && c.league.champion === c.club && !c.history.at(-1).trophy) {
      c.history.at(-1).trophy = true;
      profile.trophies = [...(profile.trophies || []), { kind: 'league', div: c.league.div || 'asl', team: c.club, season: c.season, date: new Date().toISOString().slice(0, 10), unbeaten: unbeaten(c.league) }];
      events.push('league');
      if (unbeaten(c.league)) events.push('unbeaten');
    }
  }
  if (mode === 'daily') {
    const o = summary.result.daily;
    profile.dailyChallenge = { key: summary.scenario.key, won: o.won, line: o.line, balls: o.balls };
    events.push('daily');
  }
  if (adapts) notes = [...notes, `The AI is playing at ${levelName(levelOf(profile.skill))} level, and it keeps learning how you play.`];
  const got = mode === 'tutorial' ? [] : checkAchievements(profile, { summary, rec, events });
  saveProfile(profile);
  $('resStash').append($('shareFig'), $('shareBox'), $('resStats')); // (back to the stash: the pages below are rebuilt each match)
  ui.show('result');
  $('resTitle').textContent = win ? 'YOU WON!' : summary.result.outcome === 'tie' ? 'TIED!' : 'SO CLOSE!';
  $('resText').textContent = summary.result.text;
  const cards = $('resCards');
  cards.innerHTML = '';
  for (const inn of summary.innings) {
    const c = el('div', 'panel card');
    const who = inn.side === 'player' ? `You · ${summary.myTeam?.name || ''}` : `${summary.oppTeam?.name || 'Opponents'}`;
    c.append(el('div', 'eyebrow', who.toUpperCase()), el('div', 'score', `${inn.runs}/${inn.wkts}`), el('div', 'sub', `${inn.overs} overs`));
    cards.append(c);
  }
  // the super over and any shoot-outs that settled a tie
  for (const r of summary.tiebreaks || []) {
    const mine = r.innings.find(i => i.side === 'player'), theirs = r.innings.find(i => i.side === 'ai');
    const c = el('div', 'panel card');
    c.append(el('div', 'eyebrow', r.kind === 'super' ? 'SUPER OVER' : 'SIX-HITTING SHOOT-OUT'),
      el('div', 'score', r.kind === 'super' ? `${mine.runs}/${mine.wkts} v ${theirs.runs}/${theirs.wkts}` : `${mine.sixesHit} v ${theirs.sixesHit}`),
      el('div', 'sub', r.kind === 'super' ? 'You v them' : 'Sixes: you v them'));
    cards.append(c);
  }
  const extra = [];
  if (got.length) extra.push(...got.map(a => `🏅 ${a.name} +${a.coins}`));
  if (rewards.pass && FEATURES.pass) extra.push(`Season Pass tier ${rewards.pass}!`);
  const rewardLine = `+${rewards.xp} XP · +${rewards.coins} coins${rewards.gems ? ` · +${rewards.gems} 💎` : ''} · Level ${level(profile.xp).lv}`;
  $('resRewards').textContent = [rewardLine, ...extra].join(' · ');
  // this match's scorecard
  const ms = $('resStats');
  ms.innerHTML = '';
  for (const n of notes) ms.append(el('div', 'row notes', n));
  for (const a of got) { const r = el('div', 'row'); r.append(el('span', 'badge', 'ACHIEVEMENT'), el('b', '', a.name), el('span', '', `${a.desc} · +${a.coins} coins`)); ms.append(r); }
  ms.hidden = !rec?.batting && !rec?.bowling && !notes.length && !got.length;
  const isHero = (id, slot) => id && id === summary.team?.[slot]?.id;
  if (rec?.batting) {
    const runs = rec.batting.reduce((a, b) => a + b.runs, 0), balls = rec.batting.reduce((a, b) => a + b.balls, 0);
    for (const st of rec.batting) {
      const r = el('div', 'row');
      r.append(el('b', '', `${heroById(st.id) ? '★ ' : ''}${flag(st)} ${st.name || ''}`), el('span', '', `${fmt.stint(st)}${st.out && st.how ? ` · ${st.how}` : ''}`));
      ms.append(r);
    }
    const r2 = el('div', 'row');
    r2.append(el('span', '', `${runs} runs off ${balls} · SR ${fmt.sr(runs, balls)} · ${rec.batting.reduce((a, b) => a + b.fours, 0)}×4 ${rec.batting.reduce((a, b) => a + b.sixes, 0)}×6`));
    if (rec.batting.some(st => st.out && st.runs === 0)) r2.append(el('span', 'badge', 'DUCK!'));
    if (rec.newHS) r2.append(el('span', 'badge', 'NEW HIGH SCORE'));
    if (rec.newLongSix) r2.append(el('span', 'badge', `LONGEST SIX · ${summary.stats.longestSix}m`));
    ms.append(r2);
  }
  if (rec?.bowling) {
    const f = rec.bowling;
    for (const b of rec.bowlingCard || []) {
      const r = el('div', 'row');
      r.append(el('b', '', `${isHero(b.id, 'bowl') || heroById(b.id) ? '★ ' : ''}${flag(b)} ${b.name}`), el('span', '', `${fmt.figures(b)}${b.type ? ` · ${bowlType(b.type).short}` : ''}`));
      ms.append(r);
    }
    const r2 = el('div', 'row');
    r2.append(el('span', '', `Econ ${fmt.econ(f.runs, f.balls)} · ${f.dots} dots${f.maidens ? ` · ${f.maidens} maiden${f.maidens > 1 ? 's' : ''}` : ''}`));
    if (rec.newBest) r2.append(el('span', 'badge', 'BEST FIGURES'));
    ms.append(r2);
  }

  const name = profile.name || 'A friend';
  const card = renderShareCard(summary, profile.name);
  $('shareImg').src = card.toDataURL('image/jpeg', 0.86);
  const playerInn = summary.innings.find(i => i.side === 'player');
  let link = shareBase();
  let text;
  const best = summary.moments[0];
  if (mode === 'daily') {
    text = dailyShareText(summary.scenario, profile.dailyChallenge);
  } else if (mode !== 'tutorial' && playerInn) {
    const sq = summary.team || {};
    const token = encodeChallenge({ seed: summary.seed, target: playerInn.runs, wkts: playerInn.wkts, balls: playerInn.balls, name, squad: [sq.bat?.id || '', sq.bowl?.id || '', sq.field?.id || ''], moment: best?.kind || '', team: summary.myTeam.id, opp: summary.oppTeam.id });
    link = `${link}#${token}`;
    text = `I scored ${playerInn.runs}/${playerInn.wkts} for ${summary.myTeam.name} v ${summary.oppTeam.name} in Sixcharge${best ? ` with a ${best.title.replace(/!$/, '')}` : ''}! Beat my score off the same 30 balls: ${link}`;
  } else {
    text = `I just won Issue #1 of Sixcharge: Superhero Cricket${best ? ` with a ${best.title.replace(/!$/, '')}` : ''}! Play it here: ${link}`;
  }
  $('shareLink').value = link;
  $('shareWa').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const nb = $('shareNative');
  nb.hidden = true;
  card.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], 'sixcharge.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      nb.hidden = false;
      nb.onclick = async () => {
        try { await navigator.share({ files: [file], text }); } catch { /* cancelled or not allowed */ }
      };
    }
  }, 'image/jpeg', 0.86);
  // the result in tabs over swipeable pages: nothing scrolls down
  const hl = el('div', 'panel paper matchstats'), sc = el('div', 'panel paper matchstats');
  // what the match gave you, as chips (the same figures as the line above)
  const chips = el('div', 'reward-chips');
  for (const [cls, big, small] of [['xp', `+${rewards.xp}`, 'XP'], ['coin', `+${rewards.coins}`, 'COINS'], ...(rewards.gems ? [['gem', `+${rewards.gems}`, 'GEMS']] : []), ['lvl', `${level(profile.xp).lv}`, 'LEVEL']]) {
    const c = el('div', `rc rc-${cls}`); c.append(el('b', '', big), el('small', '', small)); chips.append(c);
  }
  hl.append(chips);
  if (rewards.pass && FEATURES.pass) hl.append(el('div', 'row notes', `Season Pass tier ${rewards.pass}!`));
  const hlRows = [];
  for (const row of [...ms.children]) {
    const tag = row.querySelector?.('.badge')?.textContent;
    if (row.classList.contains('notes') || tag === 'ACHIEVEMENT' || tag === 'LEVEL UP') hlRows.push(row); else sc.append(row);
  }
  if (hlRows.length > 3) hl.append(carousel(hlRows, 3)); else hl.append(...hlRows);   // (a long list of medals swipes in threes)
  const pages = [['Highlights', hl]];
  if (sc.children.length) pages.push(['Scorecard', sc]);
  pages.push(['Share', [$('shareFig'), $('shareBox')]]);
  pager($('resPages'), pages);
  $('resAgain').textContent = { tutorial: 'Play Quick Match', league: 'Back to the league', cup: 'Back to the cup', daily: 'Daily results', career: 'Back to the season', war: 'Back to the war', warmup: 'Back to the war' }[mode] || 'Play again';
}

$('copyLink').addEventListener('click', async () => {
  const input = $('shareLink');
  try { await navigator.clipboard.writeText(input.value); ui.toast('Challenge link copied'); }
  catch { input.select(); ui.toast('Link selected — copy it from the box'); }
});
$('resHome').addEventListener('click', renderHome);
$('resAgain').addEventListener('click', () => {
  const m = lastSummary?.mode;
  if (m === 'challenge') { pending = { mode: 'challenge', challenge }; startMatch(pending); }
  else if (m === 'league' || m === 'cup') renderTournament(tourNotes);
  else if (m === 'war' || m === 'warmup') renderWar();
  else if (m === 'daily') renderDaily();
  else if (m === 'career') { careerView = 'hub'; renderCareer(); }
  else { pending = { mode: 'quick' }; squadOpen = false; renderSquad(); }
});

addEventListener('hashchange', () => {
  challenge = decodeChallenge(location.hash.slice(1));
  if (challenge && $('hud').hidden) renderHome();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !$('hud').hidden && !game.paused) { game.paused = true; ui.show('pause'); }
});

// ---------- boot ----------
(async () => {
  try { await Promise.race([document.fonts.load('40px Bangers'), new Promise(r => setTimeout(r, 1500))]); } catch { /* fallback fonts */ }
  setupClubTabs();
  watchBlock('#pickteam .pt');
  game.resize(); // redraw the cached stadium now the comic font is ready
  if (new URLSearchParams(location.search).get('comic') === 'opening') { ui.show(null); careerOpening().then(renderHome); }   // (a way to see the story opening while it is being made)
  else if (challenge || window.__SIXCHARGE_BOT) renderHome();
  else renderTitle(); // (the title screen first for everyone; Play goes on to the tutorial or the hub)
  // the logo splash: up for a moment, then it fades away
  const splash = $('splash');
  if (splash) {
    const gone = () => { splash.classList.add('gone'); setTimeout(() => splash.remove(), 500); };
    if (window.__SIXCHARGE_BOT) splash.remove(); else setTimeout(gone, Math.max(0, 1100 - performance.now()));
  }
})();

