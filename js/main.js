import { UI } from './ui.js';
import { Game } from './game.js';
import { HEROES, heroById, heroesFor, BAT_TYPES, POWERS, batTypeOf, bowlPowerOf } from './heroes.js';
import { TEAMS, CLUBS, teamById, rivalTeam, teamOfHero, logoSrc, setMyClub, setLogo, stadiumTest, cosmetics } from './teams.js';
import { loadBowlSprites, spriteStatus } from './bowlsprite.js';
import { batSpriteMissing } from './batsprite.js';
import { squadPool, resolveLineup, batCandidates, bowlCandidates, bowlType, isUnlocked, UNLOCK_COST, ORDER_SIZE, ATTACK_SIZE, roster, fullName, flagName, starSquad, playerSquad, ovr, ratingStars } from './squads.js';
import { flag, nationName } from './nations.js';
import { faceEl } from './looks.js';
import { futCard, portraitFace } from './futcard.js';
import { groundOf, pitchOf, homeFromSeed, GROUNDS, PITCH_TYPES } from './grounds.js';
import { GUIDE, GUIDE_ORDER, meters } from './pitchguide.js';
import { newLeague, newCup, nextFixture, advance, playerResult, table, finish, unbeaten, ordinal, LEAGUE_PRIZE, CUP_PRIZE } from './tournament.js';
import { newCareer, chooseClub, currentLot, nextBid, bid, pass as passLot, finishAuction, nextSeason, afterLeagueMatch, clubPlayers, clubPool, clubHeroes, clubRating,
  value, potentialStars, ageNote, money, assessLot, squadNeeds, openingPrice, rivalsOf, leaders, playerName, ABILITIES, MAX_SQUAD, MIN_SQUAD, PEAK_AGE, STAR_OVR, isUnlocked as careerUnlocked, divisionOf, divisionName, afterPlayoff, migrateCareer, SCOUT_FEE, CARE, groundCond, hasCaretaker, hireCaretaker, dismissCaretaker, SCOUT_REGIONS, scoutOut, sendScout, scoutFinds, signFind, finishScouts, createClub, signTrialists, TRIAL_PICKS, enginePlayer, STADIUMS, stadiumLevel, stadiumLvl, ticketOf, setStadiumLevel, stadiumBlocked, OFFICE, OFFICERS, officeTick, hireOfficer, fireOfficer, trainOfficer, officerTrainCost, extendContract, extendFee, extensionsLeft, forecast, officeRow, APT, apartment, aptRow, decorSlots, trophiesOf, trophyBuffs, mgrPoints, mgrLevel, mgrShare, managerPay, repBonus, repCap, salaryCash, buyDecor, storyLog, SHOP, shopOf, shopRow, armourySlots, dealsToday, gearPrice, buyGear, equipGear, unequipGear, discardGear, matchPool, buyLook, setLook, lookColour, CLUB, clubhouse, clubhouseRow, chemLinks, chemBonus, chemPool, rivalBoard, eventCost, whyNoEvent, startEvent, settleEvents, eventSlots, paradeDue, chemAfterMatch, officeSlots, officePlaces, officerMax, officerWage, officeWagePerDay, accountantBonus, releasePlayer, startSeason, merchRoster, merchDemand, matchesLeft, fameOf, repBlock, trainingRoster, fitnessOf, startEnergies, office, seasonBooks, totalOf, INCOME, OUTGOING, SPONSORS, DEAL, dealWorth, signSponsor, objectiveOf, contractList, book, officeMatch, settleObjective, makeProspect, prospectsOf, veteransOf, academyPrice, promoteProspect, sellProspect, academySeason } from './career.js';
import { dailyScenario, updateStreak } from './daily.js';
import { setStartEnergy } from './match.js';
import * as MD from './stamina.js';
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
import { sound, unlockAudio, sfx, buzz, startAmbience, stopAmbience, crowdStop, crowdSing, crowdMute, CHANTS, previewChant } from './audio.js';
import { FEATURES } from './config.js';
import { SIDES, WEEKENDS, warClock, weekendSpan, countdown, totals, feed, leader, watchWar, saveMine, myRecord, namesOf, myId, warOnline } from './war.js';
import { units } from './config.js';
import { teamStars } from './teamrating.js';
import { createClubMap, buildingPicture } from './clubmap.js';
import * as MF from './merch.js';
import * as PC from './pacing.js';
import * as TG from './training.js';
import * as AC from './academy.js';
import { initCoach, coachOnce, coachSay, coachAsk, DEV, QUICK_TIPS } from './coach.js';
import { taunt } from './story.js';
import { playComic, preloadComic, titleCard, NIGHT, EXIT } from './comic.js';
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
// (a player who has not done the tutorial goes to it first: the same one as the Tutorial button)
$('tPlay').addEventListener('click', () => { unlockAudio(); sfx.click(); renderHome(); });   // (a new player sees the story first, then builds a club; Uncle Dev offers the tutorial after that)
// where the settings, the shop, the trophies, the stats and the tutorial go back to (there is no hub): the title, the club map, or the settings
let settingsFrom = null, shopFrom = null, moreFrom = null;
$('tSettings').addEventListener('click', () => { unlockAudio(); settingsFrom = renderTitle; renderSettings(); });
for (const id of ['tCoinPill', 'tGemPill']) $(id).addEventListener('click', () => { unlockAudio(); shopFrom = renderTitle; renderShop(); });
$('tTeam').addEventListener('click', () => { unlockAudio(); sfx.click(); renderHome(); });

// ---------- home: the hub ----------
// There is no hub screen: Play goes into the Super League. (?modes=all brings the old hub back, for the tests.)
function renderHome() { if (FEATURES.quick) renderHub(); else enterCareer(); }
function renderHub() {
  ui.show('home');
  $('btnWar').hidden = !FEATURES.war; $('btnPass').hidden = !FEATURES.pass;
  $('btnQuick').hidden = !FEATURES.quick; $('btnCup').hidden = !FEATURES.cup;
  document.querySelector('.hubgrid').classList.toggle('solo', !FEATURES.quick && !FEATURES.cup);   // (the Super League alone: one big tile)
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
  $('shopDot').hidden = true;   // (the old daily coin calendar is gone with the old shop)
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
  $('leagueSub').textContent = !c ? lines('Create your club', 'Win the auction', 'Build a dynasty')
    : c.phase === 'pick' ? lines(`Season ${c.season}`, 'Pick your club')
      : c.phase === 'scouts' ? lines(`Season ${c.season} · ${club}`, 'Your scouts are home', `${money(c.money)} to spend`)
      : c.phase === 'playoff' ? lines(`Season ${c.season} · ${club}`, 'Relegation play-off!')
      : c.phase === 'auction' ? lines(`Season ${c.season} · ${club}`, 'Auction', `${money(c.money)} to spend`)
        : c.phase === 'done' ? lines(`Season ${c.season} over · ${club}`, `${money(c.money)} in the bank`)
          : lines(`Season ${c.season} · ${club}`, (f => f && `${f.label} v ${teamById(f.opp).name}`)(nextFixture(c.league)), `${money(c.money)} in the bank`);
  if ($('cupSub')) $('cupSub').textContent = status('cup')?.replace(' · ', '\n') || 'Quarter, semi, final:\n3 wins for the cup';
  $('trophyCount').textContent = `${Object.keys(profile.achievements || {}).length}/${ACHIEVEMENTS.length}`;
  const card = $('challengeCard');
  if (challenge && FEATURES.challenge) {
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
  $('setMapLevel').textContent = mapLevelText();
  $('setTokens').textContent = tokenSwitch.on ? 'Match limit: ON (a match every 4 hours)' : 'Match limit: OFF (play freely)';
  $('setStadiumTest').textContent = stadiumTest.level ? `Test stadium: level ${stadiumTest.level}` : 'Test stadium: off';
}
$('btnSettings').addEventListener('click', () => { unlockAudio(); settingsFrom = null; renderSettings(); });
$('settingsBack').addEventListener('click', () => { const f = settingsFrom; settingsFrom = null; (f || renderHome)(); });
$('setClubMap').addEventListener('click', () => { unlockAudio(); sfx.click(); renderClubMap(true); });
$('setMapLevel').addEventListener('click', () => {
  mapLevel.v = (mapLevel.v + 1) % 4;
  try { localStorage.setItem('sixcharge.mapLevel', String(mapLevel.v)); } catch { /* private window: it lasts until you reload */ }
  sfx.click(); $('setMapLevel').textContent = mapLevelText();
});
$('setTokens').addEventListener('click', () => {
  tokenSwitch.on = !tokenSwitch.on;
  try { localStorage.setItem('sixcharge.tokensOff', tokenSwitch.on ? '0' : '1'); } catch { /* private window: it lasts until you reload */ }
  sfx.click(); renderSettings();
});
// testing the builders: your real career gets 100 diamonds, or 500 XP (a level or two), a press at a time
$('setDiamonds').addEventListener('click', () => { const c = career(); const n = PC.addDiamonds(c, 100); saveProfile(profile); sfx.dhol(); ui.toast(`💎 You have ${n} diamonds`); });
$('setXp').addEventListener('click', () => { const c = career(); const up = PC.addXp(c, 500); saveProfile(profile); sfx.dhol(); ui.toast(`Club XP ${Math.round(PC.buildOf(c).xp)}${up ? ` · club level ${up}!` : ''}`); });
$('setTrophies').addEventListener('click', () => { unlockAudio(); moreFrom = renderSettings; renderTrophies(); });
$('setStats').addEventListener('click', () => { unlockAudio(); moreFrom = renderSettings; renderStats(); });
$('setTutorial').addEventListener('click', () => { unlockAudio(); moreFrom = renderSettings; showCover(); });
$('setStory').addEventListener('click', () => { unlockAudio(); careerOpening().then(renderSettings); });   // (the career's opening story again; it plays by itself only the first time)
$('setStadiumTest').addEventListener('click', () => {   // (testing only: shows your own club's ground at level 1, 2 or 3 in your next match; the saved game is not touched)
  stadiumTest.level = (stadiumTest.level + 1) % 4;
  try { localStorage.setItem('sixcharge.stadiumTest', String(stadiumTest.level)); } catch { /* private window: it lasts until you reload */ }
  renderSettings();
});
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

// ---------- the club shop: gear for your players, looks for the ground and the ball, a few deals a day ----------
let shopTab = 'gear', shopSheet = null, shopTest = false, shopDay = 0;
const GEAR_ICON = { bat: 'star', grip: 'ball', shoes: 'up' };
const gearText = G => [G.bat ? `+${G.bat} batting` : '', G.bowl ? `+${G.bowl} bowling` : ''].filter(Boolean).join(' · ');
async function renderShop(test = false) {
  shopTest = test;
  const c = test ? demoCareer() : career();
  ui.show('shop');
  shopSheet = null; $('shopSheet').hidden = true;
  $('shopBack').onclick = () => { shopSheet = null; sfx.click(); const f = shopFrom; shopFrom = null; if (shopTest) renderSettings(); else if (f) f(); else if (fromMap) renderClubMap(); else renderHome(); };
  if (!c.club) { $('shopTabs').replaceChildren(); $('shopStats').replaceChildren(); $('shopLede').textContent = ''; $('shopLvl').replaceChildren(); $('shopBody').replaceChildren(el('p', 'mf-empty', 'Build your club first: the shop opens when you have one.')); return; }
  $('shopBody').replaceChildren(el('p', 'mf-empty', 'Checking the time with the server…'));
  await syncClock();
  shopOf(c);
  paintShop(c);
}
function paintShop(c) {
  buildTick(c);
  const h = shopOf(c), trusted = clock.state === 'ok', now = serverNow() + shopDay * 86400000, row = shopRow(c), dm = PC.buildOf(c).diamonds;
  const done = (r, close = false) => { if (r && r.ok === false) ui.toast(r.why); else { sfx.click(); if (close) shopSheet = null; } saveProfile(profile); paintShop(c); };
  paintShell(c, 'shop', 'shop', shopTab === 'gear' || shopTab === 'style' ? 'small' : 'mid'); $('shopLede').textContent = shopTest ? `Practice club (nothing is saved) · club ${money(c.money)}` : `${teamById(c.club).name} · club ${money(c.money)}`;
  $('shopLvl').replaceChildren(ico('factory'), el('span', '', `LV ${h.level}`));
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const x = el('div'); x.append(el('span', '', big), el('small', '', small)); d.append(ico(name), x); return d; };
  $('shopStats').replaceChildren(stat('coin', 'gold', money(c.money), 'club cash'), stat('star', 'blue', `${dm} 💎`, 'diamonds'), stat('box', 'red', `${h.gear.length}/${armourySlots(c)}`, 'in the armoury'));
  const tb = $('shopTest'); tb.hidden = !shopTest;
  if (shopTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { fn(); sfx.click(); saveProfile(profile); paintShop(c); });
    tb.replaceChildren(el('b', '', 'TEST'), chip('+$5M', () => { c.money += 5; }), chip('+100 💎', () => { PC.addDiamonds(c, 100); }), chip('Next day', () => { shopDay++; }));
  }
  const tabs = [['gear', 'star', 'Gear', trusted ? '!' : 0], ['armoury', 'box', 'Armoury', 0], ['style', 'pencil', 'Style', 0], ['diamonds', 'coin', 'Diamonds', 0], ['house', 'factory', 'Shop', canBuild(c, 'shop') ? '!' : 0]];
  $('shopTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${shopTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { shopTab = id; shopSheet = null; sfx.click(); paintShop(c); }); if (n && id !== 'gear') b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('shopBody');
  body.replaceChildren();
  const info = (icon, text) => { const f = el('div', 'mf-card'); f.append(ico(icon), el('span', 'mf-row', text)); return f; };
  const deals = trusted ? dealsToday(c, now) : null;
  if (shopTab === 'gear') {
    body.append(info('clock', deals ? `Today's deals: ${Math.round(row.off * 100)}% off, one of each. New ones at midnight (UTC).` : 'The deals need the server clock: try again when you are online.'));
    const grid = el('div', 'mf-grid three');
    for (const [id, G] of Object.entries(SHOP.GEAR)) {
      const sale = !!deals && deals.ids.includes(id) && !deals.taken[id], card = el('button', `mf-card stack${sale ? ' pick' : ''}`), r = el('div', 'mf-row');
      r.append(ico(GEAR_ICON[G.kind]), el('span', '', gearText(G)));
      card.append(el('b', '', G.name), r, el('small', '', sale ? `${money(gearPrice(c, id, true))} (was ${money(G.cost)})` : money(G.cost)));
      if (sale) card.append(el('i', 'mf-badge', 'SALE'));
      card.addEventListener('click', () => { shopSheet = { type: 'buy', id }; sfx.click(); paintShop(c); });
      grid.append(card);
    }
    body.append(grid);
  } else if (shopTab === 'armoury') {
    const grid = el('div', 'mf-grid three');
    for (let i = 0; i < armourySlots(c); i++) {
      const g = h.gear[i];
      if (!g) { const card = el('div', 'mf-card stack empty'); card.append(ico('plus'), el('b', '', 'Empty')); grid.append(card); continue; }
      const G = SHOP.GEAR[g.item], card = el('button', 'mf-card stack'), bar = el('div', 'mf-bar green'), f = el('i'); f.style.width = `${Math.max(4, Math.round(g.uses / SHOP.USES * 100))}%`; bar.append(f);
      const who = g.on && c.players[g.on];
      card.append(who ? frameOf(playerFace(who, 44)) : ico(GEAR_ICON[G.kind]), el('b', '', G.name), bar, el('small', '', who ? `${lastName(who.name)} · ${g.uses} left` : `${g.uses} matches left`));
      card.addEventListener('click', () => { shopSheet = { type: 'gear', gid: g.id }; sfx.click(); paintShop(c); });
      grid.append(card);
    }
    body.append(grid);
    body.append(info('warn', `A player carries one thing. It wears out after ${SHOP.USES} of your matches that he plays in. The armoury holds ${armourySlots(c)}.`));
  } else if (shopTab === 'style') {
    for (const [kind, title] of [['lights', 'Six lights (at home)'], ['trail', 'Ball trail']]) {
      const hd = el('div', 'mf-sheet-head'); hd.append(el('b', '', title)); body.append(hd);
      const grid = el('div', 'mf-grid four');
      for (const [id, L] of Object.entries(SHOP.LOOKS[kind])) {
        const owned = !!h.owned[kind][id], on = h.look[kind] === id, card = el('button', `mf-card stack${on ? ' pick' : ''}`), sw = el('span', 'mf-swatch'); sw.style.background = L.colour;
        card.append(sw, el('b', '', L.name.split(' ')[0]), el('small', '', on ? 'On' : owned ? 'Owned' : `${L.cost} 💎`));
        card.addEventListener('click', () => { if (owned) done(setLook(c, kind, on ? null : id)); else { shopSheet = { type: 'look', kind, id }; sfx.click(); paintShop(c); } });
        grid.append(card);
      }
      body.append(grid);
    }
    body.append(info('star', 'Looks change how the game looks, never how it plays.'));
  } else if (shopTab === 'diamonds') {
    const col = el('div', 'mf-col'), big = el('div', 'mf-card col');
    big.append(el('b', '', `You have ${dm} 💎`), el('p', 'sheetnote', 'Diamonds buy looks and a second builder.'));
    col.append(big);
    for (const pk of SHOP.PACKS) { const card = el('div', 'mf-card'), inf = el('div', 'mf-info'); inf.append(el('b', '', `${pk.diamonds} 💎`), el('small', '', pk.price)); const b = mfBtn('chipbtn', [el('span', '', 'Soon')], () => {}); b.disabled = true; card.append(ico('coin'), inf, b); col.append(card); }
    col.append(info('warn', 'Buying diamonds needs the server, which is not ready yet. For now diamonds come from the Settings test button.'));
    body.append(col);
  } else {
    const col = el('div', 'mf-col'), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head');
    hd.append(ico('factory'), el('b', '', `Club shop level ${h.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(h.level))));
    card.append(hd);
    const r1 = el('div', 'mf-row'); r1.append(ico('box'), el('span', '', `${armourySlots(c)} places in the armoury`));
    const r2 = el('div', 'mf-row'); r2.append(ico('star'), el('span', '', `Daily deals ${Math.round(row.off * 100)}% off`));
    card.append(r1, r2, ...buildBlock(c, 'shop', () => paintShop(c)));
    col.append(card);
    body.append(col);
  }
  const sh = $('shopSheet');
  sh.hidden = !shopSheet;
  if (!shopSheet) return;
  sh.onclick = e => { if (e.target === sh) { shopSheet = null; paintShop(c); } };
  const card = el('div', 'mf-sheet-card'), close = mfBtn('mf-x', [ico('cross')], () => { shopSheet = null; sfx.click(); paintShop(c); });
  if (shopSheet.type === 'buy') {
    const G = SHOP.GEAR[shopSheet.id], sale = !!deals && deals.ids.includes(shopSheet.id) && !deals.taken[shopSheet.id], price = gearPrice(c, shopSheet.id, sale);
    const hd = el('div', 'mf-sheet-head'); hd.append(ico(GEAR_ICON[G.kind]), el('b', '', G.name), close);
    const r = el('div', 'mf-row'); r.append(ico('up'), el('span', '', `${gearText(G)} for one player · lasts ${SHOP.USES} matches`));
    const go = mfBtn('mf-big', [ico('coin'), el('span', '', `Buy · ${money(price)}${sale ? ' (sale)' : ''}`)], () => { const res = buyGear(c, shopSheet.id, { now, trusted }); if (res.ok) sfx.dhol(); done(res, true); });
    go.disabled = c.money < price || h.gear.length >= armourySlots(c);
    card.append(hd, r, go);
    if (h.gear.length >= armourySlots(c)) card.append(el('p', 'sheetnote', 'The armoury is full: let something go, or build the shop bigger.'));
    else if (c.money < price) card.append(el('p', 'sheetnote', 'Not enough money in the club.'));
  } else if (shopSheet.type === 'gear') {
    const g = h.gear.find(x => x.id === shopSheet.gid);
    if (!g) { shopSheet = null; sh.hidden = true; return; }
    const G = SHOP.GEAR[g.item], hd = el('div', 'mf-sheet-head'); hd.append(ico(GEAR_ICON[G.kind]), el('b', '', G.name), close);
    card.append(hd, el('p', 'sheetnote', `${gearText(G)} · ${g.uses} of ${SHOP.USES} matches left`));
    const grid = el('div', 'mf-grid'); grid.style.cssText = 'grid-auto-rows: auto';
    const squad = clubPlayers(c, c.club).filter(p => (G.kind === 'grip' ? !!p.bowl : true)).sort((a, b) => (G.bat && !G.bowl ? b.bat - a.bat : G.bowl && !G.bat ? b.bowlSkill - a.bowlSkill : ovr(b) - ovr(a))).slice(0, 4);
    for (const p of squad) {
      const b = el('button', 'mf-card'), inf = el('div', 'mf-info'), carries = h.gear.find(x => x.on === p.id);
      inf.append(el('b', '', lastName(p.name)), el('small', '', g.on === p.id ? 'Carries this' : carries ? `Has ${SHOP.GEAR[carries.item].name}` : 'Free hands'));
      b.append(frameOf(playerFace(p, 48)), inf);
      b.addEventListener('click', () => done(equipGear(c, g.id, p.id), true));
      grid.append(b);
    }
    card.append(grid);
    if (g.on) card.append(mfBtn('mf-big alt', [ico('cross'), el('span', '', 'Put back')], () => done(unequipGear(c, g.id), true)));
    card.append(mfBtn('mf-big red', [ico('cross'), el('span', '', 'Let it go')], () => done(discardGear(c, g.id), true)));
  } else if (shopSheet.type === 'look') {
    const L = SHOP.LOOKS[shopSheet.kind][shopSheet.id], hd = el('div', 'mf-sheet-head'), sw = el('span', 'mf-swatch'); sw.style.background = L.colour;
    hd.append(sw, el('b', '', L.name), close);
    const go = mfBtn('mf-big', [ico('star'), el('span', '', `Buy · ${L.cost} 💎`)], () => { const res = buyLook(c, shopSheet.kind, shopSheet.id); if (res.ok) sfx.dhol(); done(res, true); });
    go.disabled = dm < L.cost;
    card.append(hd, go);
    if (dm < L.cost) card.append(el('p', 'sheetnote', `Not enough diamonds: ${L.cost} needed.`));
  } else { shopSheet = null; sh.hidden = true; return; }
  sh.replaceChildren(card);
}
$('setShop').addEventListener('click', () => { unlockAudio(); sfx.click(); renderShop(true); });
for (const id of ['btnShop', 'coinPill', 'gemPill']) $(id).addEventListener('click', () => { unlockAudio(); shopFrom = null; renderShop(); });

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
$('btnTeam').addEventListener('click', () => { unlockAudio(); pending = null; squadOpen = false; renderSquad(); });
$('teamBadge').addEventListener('click', () => { unlockAudio(); pending = null; squadOpen = false; renderSquad(); });
$('btnTrophies').addEventListener('click', () => { unlockAudio(); renderTrophies(); });
$('btnTutorial').addEventListener('click', () => { unlockAudio(); showCover(); });
$('btnStats').addEventListener('click', () => { unlockAudio(); renderStats(); });
$('statsBack').addEventListener('click', () => { const f = moreFrom; moreFrom = null; (f || renderHome)(); });

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
$('coverBack').addEventListener('click', () => { sfx.click(); const f = moreFrom; moreFrom = null; if (f) f(); else if (FEATURES.quick) ui.show('home'); else renderTitle(); });
function coverTipsShow() {
  $('coverTips').setAttribute('aria-pressed', String(tutTips));
  $('coverTipsText').textContent = `Uncle Dev's tips: ${tutTips ? 'On' : 'Off'}`;
}
$('coverTips').addEventListener('click', () => { tutTips = !tutTips; profile.tutTips = tutTips; saveProfile(profile); sfx.click(); coverTipsShow(); });
$('coverGo').addEventListener('click', () => startMatch({ mode: 'tutorial' }));

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
  const matchStart = performance.now();
  unlockAudio();
  game.matchActive = false;
  ui.show(null);
  for (const s of ui.screens) $(s).hidden = true;
  const mode = opts.mode;
  const seed = mode === 'challenge' ? opts.challenge.seed : mode === 'daily' ? opts.scenario.seed : randomSeed();
  let team = profile.team || 'thunder', opp = null, sq, lineup = null, levels = {}, pools = null, rival = null, home = null;
  if (mode === 'tutorial' && opts.trial) {
    // the nets: your own club's colours, the candidates as the pool, another Division 3 club as the net bowlers and batters
    const c = profile.career, T = opts.trial, oppId = c.divisions.d3.find(id => id !== c.club);
    team = c.club; opp = oppId; home = c.club; levels = {};
    pools = { mine: [...T.bats, ...T.bowls].map(id => enginePlayer(c.players[id])), opp: clubPool(c, oppId) };
    sq = clubHeroes(pools.mine); rival = clubHeroes(pools.opp);
  } else if (mode === 'tutorial' && opts.opening) {
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
      pools = { mine: matchPool(c, clubPool(c, team)), opp: clubPool(c, opp) };   // (the clubhouse's chemistry and the shop's gear: a little extra rating for some of your players)
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
  crowdMute.on = !!opts.trial;   // (the nets have no crowd)
  startAmbience();
  let summary;
  cosmetics.lights = mode === 'career' ? lookColour(profile.career, 'lights') : null; cosmetics.trail = mode === 'career' ? lookColour(profile.career, 'trail') : null;   // (the shop's looks)
  setStartEnergy(mode === 'career' && profile.career.medical ? startEnergies(profile.career) : {});   // (the medical centre: your players start the match on their fitness)
  try {
    summary = await game.runMatch({
      mode, story: !!opts.story, opening: !!opts.opening, trial: opts.trial ? { balls: opts.trial.balls, bats: opts.trial.bats.map(id => profile.career.players[id]).map(enginePlayer), bowls: opts.trial.bowls.map(id => profile.career.players[id]).map(enginePlayer) } : null, seed, order, team, opp, home, squad: sq, lineup, levels, pools, rival, scenario: opts.scenario, challenge: opts.challenge,
      records: { longestSix: careerStats(profile).bat.longestSix || 0 }, field: mode === 'tutorial' ? null : profile.field, level: levelOf(profile.skill), crowd: mode === 'career' && profile.career?.chirp ? crowdOf(profile.career) : 0,
    });
  } catch (e) {
    // a match that fails must say so (it would otherwise leave a dead screen): the error is shown, with a way back
    console.error('match', e);
    showMatchError(e, game.loopError);
    return;
  } finally {
    setStartEnergy({}); cosmetics.lights = null; cosmetics.trail = null;
    game.matchActive = false;
    stopAmbience(); crowdStop(); game.crowdLive = false;
    crowdMute.on = false;
  }
  if (opts.opening || opts.trial) { game.quit(); return summary; }   // (the story's final: no result screen, the story goes on)
  if (!summary) { if (mode === 'war') warAfterMatch(null); return; } // quit mid-match (a war match is lost)
  if (mode === 'tutorial') { profile.tutorialDone = true; saveProfile(profile); }
  if (mode === 'career' && profile.career?.merch) MF.notePace(profile.career.merch, performance.now() - matchStart);   // (how fast you play: the factory warns when a contract would end first)
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
  setTimeout(() => preloadComic(NIGHT, EXIT), 4000);   // (the rest of the story comes while the first panels are read and the match is played)
  await playComic();
  await titleCard('16 HOURS LATER...');
  await openingChirp();
  await startMatch({ mode: 'tutorial', opening: true });
  ui.show(null);
  await titleCard('4 HOURS LATER...');
  await playComic(NIGHT);
  await playComic(EXIT);
}

// ---------- career: the Super League ----------
let careerView = 'hub'; // 'hub' | 'squad'
let careerNotes = [];
function career() {
  if (!profile.career) { profile.career = newCareer(randomSeed()); saveProfile(profile); }
  ensureBuild(profile.career);
  syncMine(profile.career);
  return profile.career;
}
// your own club, if this career has one, is known to every screen
let mineOf = undefined;
function syncMine(c) { const m = c?.custom || null; if (m !== mineOf) { mineOf = m; setMyClub(m); } }
const stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
const pname = p => `${p.heroId ? '★ ' : p.ability ? '⭐ ' : ''}${flagName(p)}`;
const fname = p => `${flag(p)} ${p.name}`.trim(); // flag and plain name, for lists
// the club's level and its builders, under the map's title
function fillBuild(host, c) {
  buildTick(c);
  const b = PC.buildOf(c), lvl = PC.clubLevel(b.xp);
  host.replaceChildren();
  const lv = el('span', 'mb-lv'); lv.append(ico('star', 'on'), el('b', '', `Club LV ${lvl}`));
  const bar = el('span', 'mb-bar'), fill = el('i'); fill.style.width = `${Math.round(PC.levelShare(b.xp) * 100)}%`; bar.append(fill);
  host.append(lv, bar);
  const now = serverNow(), left = j => durfmt(Math.max(0, j.end - now));
  const job = b.jobs[0];
  const bt = el('span', 'mb-txt'); bt.append(ico('gear', b.jobs.length ? 'on' : ''), el('span', '', b.jobs.length ? `${BUILD_NAME[job.id]} → ${job.to} · ${left(job)}${b.jobs.length > 1 ? ` (+${b.jobs.length - 1})` : ''}` : `Builder${b.builders > 1 ? 's' : ''} free`));
  host.append(bt);
  const dm = el('span', 'mb-txt', `💎 ${b.diamonds}`); host.append(dm);
  if (b.builders < 2) {
    const buy = el('button', 'chipbtn', `2nd builder · ${PC.BUILD.BUILDER2} 💎`);
    buy.addEventListener('click', () => { const r = PC.buyBuilder(c); if (!r.ok) { ui.toast(r.why); return; } sfx.dhol(); saveProfile(profile); fillBuild(host, c); });
    host.append(buy);
  }
}
// ---------- how fast a season can go (js/pacing.js): a league match costs a token; one comes every two real hours, three are kept ----------
function fillPace(host, c) {
  if (!tokenSwitch.on) { host.replaceChildren(ico('ball', 'on'), el('span', 'pace-txt', 'Match limit off (testing)')); return; }
  const ready = clock.state === 'ok' || clock.state === 'local';
  if (!c.pace) { if (!ready) { host.replaceChildren(el('span', 'pace-txt', 'Checking the time…')); return; } c.pace = PC.freshPace(serverNow()); saveProfile(profile); }
  if (ready) PC.refill(c.pace, serverNow(), clock.state === 'ok');
  const p = c.pace;
  host.replaceChildren();
  for (let i = 0; i < PC.PACE.BANK; i++) host.append(ico('ball', i < p.tokens ? 'on' : ''));
  host.append(el('span', 'pace-txt', p.tokens >= PC.PACE.BANK ? 'Matches ready' : `${p.tokens ? `${p.tokens} ready · ` : 'No match yet · '}next in ${PC.fmtWait(PC.nextIn(p, serverNow()))}`));
}
// (testing only: the settings' switch for the match meter; off, every match is free. Kept on this device, not in the saved game.)
const tokenSwitch = { on: (() => { try { return localStorage.getItem('sixcharge.tokensOff') !== '1'; } catch { return true; } })() };
// start your next league (or play-off) match: it costs a token
async function takeMatch(c) {
  if (!tokenSwitch.on) return true;
  await syncClock();
  if (!c.pace) c.pace = PC.freshPace(clock.state === 'offline' ? Date.now() : serverNow());
  const p = c.pace, offline = clock.state === 'offline', now = offline ? p.at : serverNow();   // (no server time: only what is banked can be used)
  const ok = PC.spend(p, now, clock.state === 'ok');
  saveProfile(profile);
  if (!ok) ui.toast(offline ? 'No match banked, and the server cannot be reached to check the time' : `Your next match is ready in ${PC.fmtWait(PC.nextIn(p, now))}`);
  return ok;
}
async function playLeagueMatch(c) {
  if (!(await takeMatch(c))) { renderCareer(); return; }
  if (c.medical && (clock.state === 'ok' || clock.state === 'local')) medTickC(c);   // (the players' fitness is up to date when the match starts)
  startMatch({ mode: 'career' });
}

// ---------- the club map (js/clubmap.js): the hub of the career ----------
let fromMap = false;
const mapReady = c => !!c.club && c.phase !== 'pick' && c.phase !== 'trials';
// what each building opens (the ones that wait for their own features say so)
const BUILDINGS = {
  stadium: { name: 'Stadium', desc: 'Play matches, tickets and ground upgrades', open: () => { careerView = 'hub'; renderCareer(); } },
  training: { name: 'Training ground', desc: 'Coaches train your players', open: () => renderTraining(false) },
  office: { name: 'Club office', desc: 'The books, sponsors and the board', open: () => renderOffice(false) },
  academy: { name: 'Youth academy', desc: 'Scouts and young prospects', open: () => renderAcademy(false) },
  shop: { name: 'Club shop', desc: 'Gear, looks and daily deals', open: () => { shopFrom = null; renderShop(); } },
  apartment: { name: 'Your apartment', desc: 'Trophies, your reputation and your story', open: () => renderApartment(false) },
  medical: { name: 'Medical centre', desc: 'Fitness, beds and physios', open: () => renderMedical(false) },
  clubhouse: { name: 'Clubhouse', desc: 'Chemistry, rivals and supporter events', open: () => renderClubhouse(false) },
  merch: { name: 'Merchandise factory', desc: 'Make jerseys the fans want', open: () => renderMerch(false) },
};
let mapPick = null, mapPaceTimer = 0;
const clubMap = createClubMap($('mapCanvas'), {
  onSelect: id => {
    mapPick = id;
    $('mapSheet').hidden = !id;
    if (!id) return;
    const b = BUILDINGS[id];
    $('mapName').textContent = b.name; $('mapDesc').textContent = b.desc;
    $('mapOpen').hidden = !!b.soon;
    sfx.click();
  },
});
// which level of the buildings the map shows: 0 follows your stadium's level, 1-3 shows that level (the settings' Club map level, to look at them)
const mapLevelText = () => (mapLevel.v ? `Club map level: ${mapLevel.v}` : 'Club map level: follows your stadium');
const mapLevel = { v: (() => { try { return +localStorage.getItem('sixcharge.mapLevel') || 0; } catch { return 0; } })() };
const mapLevels = c => (mapLevel.v ? mapLevel.v : Object.fromEntries(Object.keys(BUILDINGS).map(id => [id, PC.IDS.includes(id) && levelOfBuilding(c, id) ? PC.lookOf(levelOfBuilding(c, id)) : levelOfMap(c)])));
const levelOfMap = c => mapLevel.v || (c.club ? Math.min(3, Math.max(1, stadiumLevel(c))) : 1);
let mapTest = false;   // the map opened from the settings to look at it: your club's colours (or a stand-in club), nothing opens, nothing is changed
function renderClubMap(test = false) {
  mapTest = test;
  const c = career(), club = c.club ? teamById(c.club) : { ...teamById('thunder'), name: 'Test Club' };
  careerView = 'hub'; fromMap = false;
  ui.show('clubmap');
  $('mapSheet').hidden = true; mapPick = null;
  $('mapClub').textContent = club.name;
  fillPace($('mapPace'), c); $('mapPace').hidden = test;
  fillBuild($('mapBuild'), c); $('mapBuild').hidden = test;
  syncClock().then(() => { if (!$('clubmap').hidden) { fillPace($('mapPace'), c); fillBuild($('mapBuild'), c); } });
  clearInterval(mapPaceTimer); mapPaceTimer = setInterval(() => { if ($('clubmap').hidden) { clearInterval(mapPaceTimer); return; } fillPace($('mapPace'), c); fillBuild($('mapBuild'), c); }, 30000);
  $('mapSub').textContent = test ? `Test view · level ${levelOfMap(c)} · nothing opens` : `${divisionName(divisionOf(c, c.club))} · Season ${c.season} · ${money(c.money)}`;
  const info = () => {
    const act = test ? {} : { stadium: ['season', 'playoff', 'auction'].includes(c.phase), academy: c.phase === 'scouts' || prospectsOf(c).some(p => p.age >= AC.ACAD.PLAY_AGE), medical: !!c.medical && (Object.keys(c.medical.knocked).length > 0 || Object.values(c.medical.fit).some(f => f < 50)), merch: (c.merch?.till || 0) >= 100, training: clock.state === 'ok' && TG.drillsLeft(c.training || {}, serverNow()) > 0, clubhouse: !!c.history?.length && paradeDue(c) };   // (a red dot: something to do there)
    clubMap.setInfo(Object.fromEntries(Object.entries(BUILDINGS).map(([id, b]) => [id, { name: b.name, soon: !!b.soon, badge: !!act[id] }])));
  };
  info();
  paintMapTabs(test);
  $('mapSettings').hidden = test;
  if (!test && c.merch) syncClock().then(() => { if (merchTick(c)) info(); });   // (the factory has been working while you were away)
  clubMap.open(club, mapLevels(c));
  if (!test) coachOnce('clubMap', DEV.clubMap);
}
$('mapBack').addEventListener('click', () => { sfx.click(); clubMap.close(); if (mapTest) renderSettings(); else renderTitle(); });
$('mapCoach').addEventListener('click', () => coachSay(DEV.clubMap));
// the tabs along the bottom of the map: the season, the squad, the records and the daily challenge
const openDaily = from => { dailyFrom = from; renderDaily(); };
const MAP_TABS = [['Season', 'trophy', () => { careerView = 'hub'; renderCareer(); }], ['Squad', 'users', () => { careerView = 'squad'; renderCareer(); }], ['Records', 'chart', () => renderRecords()], ['Daily', 'star', () => openDaily('map')]];
function paintMapTabs(test) {
  $('mapTabs').hidden = test;
  $('mapTabs').replaceChildren(...MAP_TABS.map(([label, icon, fn]) => {
    const b = el('button', 'map-tab'); b.append(ico(icon), el('span', '', label));
    if (label === 'Daily' && !dailyDone()) b.append(el('i', 'mf-badge', '!'));
    b.addEventListener('click', () => { unlockAudio(); sfx.click(); clubMap.close(); fromMap = true; fn(); });
    return b;
  }));
}
$('mapSettings').addEventListener('click', () => { unlockAudio(); sfx.click(); clubMap.close(); settingsFrom = () => renderClubMap(); renderSettings(); });
$('mapOpen').addEventListener('click', () => { const b = BUILDINGS[mapPick]; if (!b || b.soon) return; if (mapTest) return ui.toast(`${b.name}: test view only`); sfx.click(); clubMap.close(); fromMap = true; b.open(); });

// ---------- the merchandise factory (js/merch.js): a real business, on the server's time, also while you are away ----------
// The time is the server's (the Date of a request to this page), never the phone's clock: changing the clock gets you nothing. With no
// answer from the server the factory waits; a server that does not send a Date makes the phone's clock count, but for an hour at most.
const clock = { base: Date.now(), perf: performance.now(), state: 'none' };   // state: 'ok', 'local', 'offline' (or 'none' before the first answer)
async function syncClock() {
  try {
    let r = await fetch(location.pathname || '/', { method: 'HEAD', cache: 'no-store' });
    if (!r.ok) r = await fetch(location.pathname || '/', { cache: 'no-store' });
    const d = Date.parse(r.headers.get('date') || '');
    clock.base = Number.isFinite(d) ? d : Date.now(); clock.perf = performance.now();
    clock.state = Number.isFinite(d) ? 'ok' : 'local';
  } catch { clock.state = 'offline'; }
  return clock.state;
}
const serverNow = () => clock.base + (performance.now() - clock.perf);
// the club's money, in $50k steps ($k in, $k out)
// ---------- the builders (js/pacing.js): club XP and level, and upgrades that take builder time ----------
const BUILD_NAME = { apartment: 'Your apartment', shop: 'Club shop', clubhouse: 'Clubhouse', office: 'Club office', stadium: 'Stadium', training: 'Training ground', academy: 'Youth academy', medical: 'Medical centre', merch: 'Merchandise factory' };
const levelOfBuilding = (c, id) => (id === 'stadium' ? stadiumLvl(c) : id === 'office' ? c.office?.level || 1 : id === 'clubhouse' ? c.clubhouse?.level || 1 : id === 'shop' ? c.shop?.level || 1 : id === 'apartment' ? c.apartment?.level || 1 : c[id]?.level || 0);
const applyBuilding = (c, id, lv) => {
  if (id === 'stadium') setStadiumLevel(c, lv);
  else if (id === 'office') office(c).level = lv;
  else if (id === 'clubhouse') clubhouse(c).level = lv;
  else if (id === 'shop') shopOf(c).level = lv;
  else if (id === 'apartment') apartment(c).level = lv;
  else if (id === 'training') TG.setLevel(c.training, lv);
  else if (id === 'academy') AC.setLevel(c.academy, lv);
  else if (id === 'medical') MD.medSetLevel(c.medical, lv);
  else if (id === 'merch') MF.setLevel(c.merch, lv);
};
// a career from before the ten levels: its buildings were at level 1, 2 or 3, which now stand for 1, 5 and 10; the club's XP is what its biggest building needs
function ensureBuild(c) {
  if (c.build) return;
  const old = { 1: 1, 2: 5, 3: 10 };
  let top = c.custom ? stadiumLvl(c) : 1;
  for (const id of ['training', 'academy', 'medical', 'merch']) if (c[id]) { const lv = old[c[id].level] || c[id].level; if (lv !== c[id].level) applyBuilding(c, id, lv); top = Math.max(top, lv); }
  c.build = PC.freshBuild(PC.XP_AT[top]);
}
const buildCtx = c => ({ now: serverNow(), trusted: clock.state === 'ok', level: id => levelOfBuilding(c, id), apply: (id, lv) => applyBuilding(c, id, lv), bank: merchBank(c), blocked: (id, to) => (id === 'stadium' ? stadiumBlocked(c, to) : null) });
// finished buildings (only on a time the server confirmed)
function buildTick(c) {
  if (!c.build) ensureBuild(c);
  if (c.clubhouse && (clock.state === 'ok' || clock.state === 'local')) { const ev = settleEvents(c, { now: serverNow(), trusted: clock.state === 'ok' }); for (const e of ev) ui.toast(`🎉 ${CLUB.EVENTS[e.kind].name}: ${e.gain} new followers`); if (ev.length) saveProfile(profile); }
  if (c.office && (clock.state === 'ok' || clock.state === 'local')) { const r = officeTick(c, { now: serverNow(), trusted: clock.state === 'ok' }); for (const n of r.left || []) ui.toast(`${n} left the office: the wages were not paid`); }
  const done = PC.settleBuilds(c, buildCtx(c));
  if (done.length) { saveProfile(profile); for (const j of done) ui.toast(`🏗️ ${BUILD_NAME[j.id]} is now level ${j.to}`); }
  return done;
}
const canBuild = (c, id) => !PC.whyNot(c, id, buildCtx(c)) && c.money >= PC.costOf(id, levelOfBuilding(c, id) + 1);
// ---------- the shell of a building's screen: the top bar (club level, cash, diamonds) and the hero picture of the building ----------
function fillTopbar(host, c) {
  const b = PC.buildOf(c), lv = PC.clubLevel(b.xp), base = PC.XP_AT[lv], next = PC.XP_AT[lv + 1];
  const shield = el('div', 'tb-shield'); shield.append(el('span', '', String(lv)));
  const bar = el('div', 'tb-xp'), fill = el('i'); fill.style.width = `${Math.max(3, Math.round(PC.levelShare(b.xp) * 100))}%`; bar.append(fill, el('span', '', lv >= PC.MAX_LEVEL ? 'MAX' : `${Math.round(b.xp - base)}/${next - base}`));
  const pill = (icon, text, go) => { const d = el('div', 'tb-pill'); d.append(ico(icon), el('span', '', text), mfBtn('tb-plus', [ico('plus')], go)); return d; };
  host.replaceChildren(shield, bar,
    pill('coin', money(c.money), () => { sfx.click(); fromMap = true; renderOffice(false); }),
    pill('diamond', String(b.diamonds), () => { sfx.click(); fromMap = true; shopTab = 'diamonds'; renderShop(); }),
    mfBtn('tb-gear', [ico('gear')], () => { sfx.click(); renderSettings(); }));
}
// a building screen whose content does not fit takes tighter steps (the skin's data-tight 1-4) until it does; at the last the body scrolls
function tightenScreen(mf) {
  delete mf.dataset.tight;
  for (let n = 1; n <= 4 && mf.scrollHeight > mf.clientHeight + 1; n++) mf.dataset.tight = String(n);
}
function watchTight(mf) {
  if (mf._fit) return;
  let queued = 0;
  const run = () => { queued = 0; if (mf.offsetParent !== null) tightenScreen(mf); };
  mf._fit = new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(run); });
  mf._fit.observe(mf, { childList: true, subtree: true });
  window.addEventListener('resize', () => { if (!queued) queued = requestAnimationFrame(run); });
}
for (const mf of document.querySelectorAll('.mf')) watchTight(mf);
// the top bar and the hero of a building's screen: size is how tall the picture may be (dense tabs ask for a small one)
function paintShell(c, prefix, id, size = 'mid') {
  fillTopbar($(`${prefix}Top`), c);
  const hero = $(`${prefix}Hero`); hero.dataset.size = size;
  if (!hero._watch && window.ResizeObserver) { hero._watch = new ResizeObserver(() => { if (hero.getBoundingClientRect().height < 118) hero.dataset.compact = '1'; else delete hero.dataset.compact; }); hero._watch.observe(hero); }   // (a hero squeezed small shows only its sign)
  paintHero(hero, c, id);
}
// the building's own picture (the map's, painted in the club's colours) behind the screen's title
async function paintHero(host, c, id) {
  const club = teamById(c.club), look = PC.lookOf(levelOfBuilding(c, id) || 1), key = `${id}|${club.suit}|${club.trim}|${look}`;
  if (host.dataset.key === key) return;
  host.dataset.key = key; host.querySelector('.bhero-art')?.remove();
  try {
    const src = await buildingPicture(id, club, look);
    if (host.dataset.key !== key) return;
    const cv = document.createElement('canvas'); cv.className = 'bhero-art'; cv.width = 620; cv.height = Math.round(620 * src.height / src.width);
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height); host.prepend(cv);
  } catch { /* no picture: the title alone */ }
}
// the upgrade part of a building's screen: what the next level costs and takes, and the button; or the builder at work
function buildBlock(c, id, after) {
  const lv = levelOfBuilding(c, id), b = PC.buildOf(c), job = b.jobs.find(j => j.id === id), out = [];
  if (job) {
    const left = Math.max(0, job.end - serverNow()), total = PC.hoursOf(job.to) * 3600000, bar = el('div', 'mf-bar green'), fill = el('i');
    fill.style.width = `${Math.max(3, Math.min(100, Math.round((1 - left / total) * 100)))}%`; bar.append(fill);
    const r = el('div', 'mf-row'); r.append(ico('clock'), el('span', '', `Building level ${job.to}: ${left > 0 ? `${durfmt(left)} left` : 'finishing…'}`));
    out.push(r, bar);
    return out;
  }
  if (lv >= PC.MAX_LEVEL) { out.push(el('p', 'sheetnote', `The best ${BUILD_NAME[id].toLowerCase()} there is.`)); return out; }
  const to = lv + 1, cost = PC.costOf(id, to), why = PC.whyNot(c, id, buildCtx(c));
  const r = el('div', 'mf-row'); r.append(ico('upgrade'), el('span', '', `Level ${to}${PC.lookOf(to) > PC.lookOf(lv) ? ' (a new look)' : ''} · ${money(cost)} · ${PC.hoursOf(to)} h to build`));
  const btn = mfBtn('mf-big', [ico('upgrade', 'big'), el('span', '', `Build level ${to}`)], () => { const res = PC.startBuild(c, id, buildCtx(c)); if (!res.ok) { ui.toast(res.why); return; } sfx.dhol(); saveProfile(profile); after(); });
  btn.disabled = !!why || c.money < cost;
  out.push(r, btn);
  if (why) out.push(el('p', 'sheetnote', why === `Needs club level ${to}` ? `Needs club level ${to}: ${Math.round(b.xp)} of ${PC.XP_AT[to]} XP` : why));
  else if (c.money < cost) out.push(el('p', 'sheetnote', `Not enough money in the club: ${money(cost)} needed`));
  return out;
}
const merchBank = c => ({
  spend(k) { const need = Math.ceil(k / 50 - 1e-9) * 0.05; if (c.money + 1e-9 < need) return 0; c.money = Math.round((c.money - need) * 20) / 20; book(c, 'out', 'buildings', need); return Math.round(need * 1000); },
  give(k) { const g = Math.floor(k / 50) * 0.05; c.money = Math.round((c.money + g) * 20) / 20; book(c, 'in', 'merch', g); return Math.round(g * 1000); },
});
const merchCtx = c => ({ now: serverNow(), trusted: clock.state === 'ok', squad: merchRoster(c), demand: merchDemand(c), bank: merchBank(c) });
function merchTick(c) {
  buildTick(c);
  if (!c.merch || clock.state === 'none' || clock.state === 'offline') return null;
  const r = MF.tick(c.merch, merchCtx(c));
  saveProfile(profile);
  return r;
}
const kfmt = k => (Math.abs(k) >= 1000 ? `$${(k / 1000).toFixed(2)}M` : `$${Math.round(k * 10) / 10}k`);
const durfmt = ms => (!Number.isFinite(ms) ? 'never' : ms < 90 * 1000 ? 'a minute' : ms < 90 * 60000 ? `${Math.round(ms / 60000)} min` : ms < 36 * 3600000 ? `${(ms / 3600000).toFixed(1)} h` : `${Math.round(ms / 86400000)} days`);
let merchTab = 'fans', merchSheet = null, merchQty = 20, merchTimer = 0, merchReport = null;
// the settings' test of the factory: a practice club (it is not saved), and buttons to skip time and add money
let merchTest = false, merchDemo = null;
const demoCareer = () => { if (!merchDemo) { merchDemo = newCareer(Date.now() >>> 0); chooseClub(merchDemo, merchDemo.divisions.d3[0]); merchDemo.money = 2; merchDemo.build = PC.freshBuild(PC.XP_AT[10]); PC.addDiamonds(merchDemo, 500); if (window.__sixcharge) window.__sixcharge.demo = merchDemo; } return merchDemo; };
// the icons (24 x 24, drawn with the game's thick dark outline)
const ICON = {
  upgrade: '<path d="M12 2l9 10h-5v10H8V12H3z"/>',
  diamond: '<path d="M7 3h10l5 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12" fill="none"/>',
  jersey: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-1 2-7 2-8 0z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><text x="12" y="16.6" text-anchor="middle" font-size="12" font-weight="900" fill="#14102a" stroke="none">$</text>',
  pencil: '<path d="M4 20l1-5L15 5l4 4L9 19z"/><path d="M13 7l4 4" fill="none"/>',
  printer: '<path d="M7 9V4h10v5z"/><path d="M5 9h14a2 2 0 0 1 2 2v5h-3v4H6v-4H3v-5a2 2 0 0 1 2-2z"/>',
  box: '<path d="M3 8l9-5 9 5v9l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v9" fill="none"/>',
  gear: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.4" fill="#14102a"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" fill="none" stroke-width="3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="3"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6zM15 14c3 0 6 1.5 6 5h-4"/>',
  factory: '<path d="M3 21V10l6 4v-4l6 4V5h4v16z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2" fill="none" stroke-width="2"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5" fill="none" stroke="#14102a" stroke-width="2.4"/>',
  plus: '<path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" stroke-width="4"/>',
  heart: '<path d="M12 21C4 14 3 9 7 6c2.5-1.500 4.500 0 5 1.500C12.500 6 14.500 4.500 17 6c4 3 3 8-5 15z"/>',
  up: '<path d="M12 3l8 9h-5v9H9v-9H4z"/>',
  check: '<path d="M4 13l5 5L20 6" fill="none" stroke="currentColor" stroke-width="4"/>',
  trophy: '<path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4v4h-4z" fill="none"/>',
  chart: '<path d="M4 20v-8h4v8zM10 20V4h4v16zM16 20V9h4v11z"/>',
  star: '<path d="M12 2l3 7 7 .6-5.3 4.7 1.700 7.200L12 17.500 5.600 21.500l1.700-7.200L2 9.600 9 9z"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M5 8c4 2.500 10 2.500 14 0M5 16c4-2.500 10-2.500 14 0" fill="none" stroke="#14102a" stroke-width="1.600"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6" fill="none" stroke-width="3"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="4"/>',
};
const ICON_COLOUR = { coin: '#ffd23f', clock: '#ffffff', heart: '#ff4d5e', ball: '#ff4d5e', jersey: '#3b82f6', pencil: '#ffb800', printer: '#8fa0b8', box: '#c98a4b', gear: '#9aa6b2', users: '#5aa0ff', factory: '#ffb800', trophy: '#ffd23f', search: '#5aa0ff', star: '#ffd23f', chart: '#5aa0ff', warn: '#ffd23f', up: '#34c759' };
const ico = (name, cls = '') => { const sp = el('span', `ico ${cls}`.trim()); sp.dataset.n = name; if (ICON_COLOUR[name]) sp.style.setProperty('--ic', ICON_COLOUR[name]); sp.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`; return sp; };
const mfBtn = (cls, content, fn) => { const b = el('button', cls); b.append(...content); if (fn) b.addEventListener('click', fn); return b; };
const frameOf = (node, big = false) => { const f = el('span', `mf-frame${big ? ' big' : ''}`); f.append(node); return f; };
const playerFace = (p, size = 64) => (p.heroId ? portrait(heroById(p.heroId), size, 'celebrate') : portraitFace(p, p.team ? teamById(p.team) : null, size) || faceEl(p, kitOf(p), size));
const staffFace = (s, club, size = 64) => faceEl({ id: `staff-${s.id}`, name: s.name, nation: 'IN' }, club, size);
const lastName = n => n.split(' ').slice(-1)[0];
async function renderMerch(test = false) {
  merchTest = test;
  const c = test ? demoCareer() : career();
  ui.show('merch');
  $('merchBack').onclick = () => { clearInterval(merchTimer); merchTimer = 0; merchSheet = null; sfx.click(); if (merchTest) renderSettings(); else if (fromMap) renderClubMap(); else renderCareer(); };
  $('merchBody').replaceChildren(el('p', 'mf-empty', 'Checking the time with the server…'));
  $('merchSheet').hidden = true;
  await syncClock();
  if (clock.state === 'offline') {
    const e = el('div', 'mf-empty'); e.append(ico('clock'), el('span', '', 'Cannot reach the server. The factory waits until it can check the time (that is what stops clock tricks). Try again when you are online.'));
    $('merchBody').replaceChildren(e);
    return;
  }
  if (!c.merch) c.merch = MF.freshMerch(serverNow());
  merchReport = merchTick(c);
  if (!test) coachOnce('merch', DEV.merch);
  paintMerch(c);
  clearInterval(merchTimer);
  merchTimer = setInterval(() => { if ($('merch').hidden) { clearInterval(merchTimer); merchTimer = 0; return; } merchReport = merchTick(c) || merchReport; paintMerch(c); }, 15000);
}
function paintMerch(c) {
  const m = c.merch, club = teamById(c.club), roster = merchRoster(c), dmap = MF.demandMap(m, merchCtx(c)), L = PC.levelRow(MF.MERCH.LEVELS, m.level);
  const ctx = () => merchCtx(c);
  const done = (r, close = false) => { if (r && r.ok === false) ui.toast(r.why); else { sfx.click(); if (close) merchSheet = null; } saveProfile(profile); merchTick(c); paintMerch(c); };
  paintShell(c, 'merch', 'merch', 'big');
  // the top: the till, what it earns and costs, and the button to collect
  $('merchLede').textContent = merchTest ? `Practice club (nothing is saved) · club ${money(c.money)}` : `${club.name} · club ${money(c.money)}`;
  const lv = $('merchLvl'); lv.replaceChildren(ico('factory'), el('span', '', `LV ${m.level}`));
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const t = el('div'); t.append(el('span', '', big), el('small', '', small)); d.append(ico(name), t); return d; };
  const col = mfBtn('mf-collect', [ico('coin'), el('span', '', 'Collect')], () => { const r = MF.collect(m, ctx()); done(r); if (r.ok) ui.toast(`${kfmt(r.k)} to the club`); });
  col.disabled = m.till < 50;
  $('merchStats').replaceChildren(stat('coin', 'gold', kfmt(m.till), 'in the till'), stat('jersey', 'blue', String(m.sold), 'sold'), stat('clock', 'red', kfmt(MF.wagePerDay(m)), 'a day costs'), col);
  const tb = $('merchTest'); tb.hidden = !merchTest;
  if (merchTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { fn(); sfx.click(); saveProfile(profile); merchReport = merchTick(c) || merchReport; paintMerch(c); });
    tb.replaceChildren(el('b', '', 'TEST'), chip('+1 hour', () => { m.last -= 3600000; MF.seal(m); }), chip('+10 hours', () => { m.last -= 10 * 3600000; MF.seal(m); }), chip('+$1M', () => { c.money += 1; }));
  }
  const note = $('merchNote'), bad = m.unpaidMs > 0 || merchReport?.tampered;
  const msg = m.unpaidMs > 0 ? `The wages cannot be paid: the work has stopped${m.unpaidMs > 24 * 3600000 ? `, and staff leave in ${durfmt(MF.MERCH.QUIT - m.unpaidMs)}` : ''}.`
    : merchReport?.tampered ? 'The books did not add up, so the till was emptied.'
    : clock.state === 'local' ? 'The server gave no time: only the first hour away counts.'
    : merchReport && merchReport.away > 2 * 60000 ? `Away${merchReport.capped ? ' (ten hours count)' : ''}: ${merchReport.sold} jerseys sold, ${merchReport.till >= 0 ? '+' : ''}${kfmt(merchReport.till)}.` : '';
  note.hidden = !msg; note.className = `mf-note${bad ? ' bad' : ''}`; note.replaceChildren(...(msg ? [ico(bad ? 'warn' : 'coin'), el('span', '', msg)] : []));
  // the tabs
  const canUp = canBuild(c, 'merch');
  const tabs = [['fans', 'jersey', 'Fans', 0], ['making', 'printer', 'Making', m.queue.length], ['staff', 'users', 'Staff', 0], ['factory', 'factory', 'Factory', canUp ? '!' : 0]];
  $('merchTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${merchTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { merchTab = id; merchSheet = null; sfx.click(); paintMerch(c); }); if (n) b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('merchBody');
  body.replaceChildren();
  if (merchTab === 'fans') {
    // the fans: the six players they want most
    const grid = el('div', 'mf-grid three');
    for (const [pid, info] of [...roster].sort((a, b) => (dmap.get(b[0]) || 0) - (dmap.get(a[0]) || 0)).slice(0, 6)) {
      const p = c.players[pid], stock = m.live[pid] || 0, forever = p.contract >= 50;
      const card = el('button', `mf-card stack${merchSheet?.pid === pid ? ' pick' : ''}`);
      const bar = el('div', 'mf-bar'); const fill = el('i'); fill.style.width = `${Math.max(4, info.fame)}%`; bar.append(fill);
      const r1 = el('div', 'mf-row'); r1.append(ico('heart'), el('span', '', String(Math.round(dmap.get(pid) || 0))), ico('jersey'), el('span', '', String(stock)));
      const r2 = el('div', `mf-row ${m.designs[pid] ? 'ok' : 'no'}`); r2.append(ico(m.designs[pid] ? 'check' : 'pencil'), ico('clock'), el('span', '', forever ? '∞' : String(matchesLeft(c, p)))); r2.title = m.designs[pid] ? 'Jersey designed' : 'No jersey design yet';
      card.append(frameOf(playerFace(p, 72)), el('b', '', lastName(info.name)), bar, r1, r2);
      card.addEventListener('click', () => { merchSheet = { type: 'order', pid }; sfx.click(); paintMerch(c); });
      grid.append(card);
    }
    body.append(grid);
  } else if (merchTab === 'making') {
    if (!m.queue.length) { const e = el('div', 'mf-empty'); e.append(ico('printer'), el('span', '', 'Nothing in production. Pick a player in Fans to start a batch.')); body.append(e); }
    else {
      const grid = el('div', 'mf-col');
      m.queue.slice(0, 4).forEach((o, i) => {
        const p = c.players[o.pid], card = el('div', 'mf-card'), info = el('div', 'mf-info'), designed = !!m.designs[o.pid];
        const frac = designed ? (o.qty - o.left) / o.qty : m.designing[o.pid] || 0;
        const bar = el('div', 'mf-bar green'); const fill = el('i'); fill.style.width = `${Math.max(3, Math.round(frac * 100))}%`; bar.append(fill);
        const row = el('div', 'mf-row'); row.append(ico(designed ? 'printer' : 'pencil'), el('span', '', designed ? `${Math.ceil(o.left)} to go` : 'designing…'));
        info.append(el('b', '', `${lastName(p.name)} · ${o.qty}`), bar, row);
        const jer = el('div', 'mf-jersey'); jer.append(ico('jersey', 'jer'), el('i', 'mf-qty-badge', String(o.qty)));
        card.append(jer, frameOf(playerFace(p, 48)), info, mfBtn('mf-x', [ico('cross')], () => done(MF.cancel(m, i))));
        grid.append(card);
      });
      body.append(grid);
    }
  } else if (merchTab === 'staff') {
    const grid = el('div', 'mf-grid three');
    for (const s of m.staff) {
      const card = el('button', 'mf-card stack'), stars = el('span', 'mf-stars', '★'.repeat(s.lvl)), r = el('div', 'mf-row');
      r.append(ico({ designer: 'pencil', printer: 'printer', packer: 'box' }[s.role]), stars);
      card.append(frameOf(staffFace(s, club, 64)), el('b', '', s.name), r);
      card.addEventListener('click', () => { merchSheet = { type: 'staff', id: s.id }; sfx.click(); paintMerch(c); });
      grid.append(card);
    }
    for (let i = m.staff.length; i < L.staff; i++) {
      const card = el('button', 'mf-card stack empty'); card.append(ico('plus'), el('b', '', 'Hire'));
      card.addEventListener('click', () => { merchSheet = { type: 'hire' }; sfx.click(); paintMerch(c); });
      grid.append(card);
    }
    body.append(grid);
    const foot = el('div', 'mf-card'); foot.append(ico('users'), el('span', 'mf-row', `${m.staff.length} of ${L.staff} places used · ${kfmt(MF.wagePerDay(m))} a day${m.level < PC.MAX_LEVEL ? ' · upgrade the factory for more places' : ''}`)); body.append(foot);
  } else {
    const grid = el('div', 'mf-col');
    const lvl = el('div', 'mf-card col');
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('factory'), el('b', '', `Factory level ${m.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(m.level))));
    lvl.append(hd);
    const pips = (name, have, max) => { const d = el('div', 'mf-pips'); for (let i = 0; i < max; i++) d.append(ico(name, i < have ? 'on' : '')); return d; };
    const cap = (name, label, have, max, extra) => { const r = el('div', 'mf-row'); r.append(ico(name), el('span', '', label), pips(name, have, max)); if (extra) r.append(extra); return r; };
    lvl.append(cap('users', 'Staff', m.staff.length, L.staff), cap('gear', 'Machines', m.machines, L.machines, L.machines > m.machines ? mfBtn('chipbtn', [el('span', '', `Buy ${kfmt(MF.MERCH.MACHINE_COST)}`)], () => done(MF.buyMachine(m, ctx()))) : null));
    const wr = el('div', 'mf-row'); wr.append(ico('box'), el('span', '', `Warehouse ${L.stock} each`), ico('printer'), el('span', '', `${L.batch} a printer`)); lvl.append(wr);
    lvl.append(...buildBlock(c, 'merch', () => paintMerch(c)));
    grid.append(lvl);
    if (m.log.length) { const nw = el('div', 'mf-card'); const e = m.log[m.log.length - 1]; nw.append(ico('warn'), el('span', 'mf-row', e.text)); grid.append(nw); }
    body.append(grid);
  }
  // a bottom sheet: an order, a hire, a member of staff
  const sh = $('merchSheet');
  sh.hidden = !merchSheet;
  if (!merchSheet) return;
  sh.onclick = e => { if (e.target === sh) { merchSheet = null; paintMerch(c); } };
  const card = el('div', 'mf-sheet-card');
  const close = mfBtn('mf-x', [ico('cross')], () => { merchSheet = null; sfx.click(); paintMerch(c); });
  if (merchSheet.type === 'order' && roster.has(merchSheet.pid)) {
    const pid = merchSheet.pid, p = c.players[pid], max = MF.maxOrder(m), hd = el('div', 'mf-sheet-head');
    merchQty = Math.max(1, Math.min(merchQty, max));
    hd.append(frameOf(playerFace(p, 96), true), el('b', '', p.name), close);
    const facts = el('div', 'mf-row'); facts.append(ico('heart'), el('span', '', `${Math.round(dmap.get(pid) || 0)} fans a day`), ico('jersey'), el('span', '', `${m.live[pid] || 0} in stock`), ico('clock'), el('span', '', p.contract >= 50 ? 'signed for good' : `${matchesLeft(c, p)} matches left`));
    const qty = el('div', 'mf-qty');
    for (const q of [...new Set([10, 20, 50, max].filter(x => x <= max))].sort((a, b) => a - b)) { const b = mfBtn(q === merchQty ? 'on' : '', [el('span', '', String(q))], () => { merchQty = q; paintMerch(c); }); qty.append(b); }
    const ms = MF.forecast(m, pid, merchQty), left = p.contract >= 50 ? Infinity : matchesLeft(c, p) * m.pace;
    const eta = el('div', 'mf-row'); eta.append(ico('clock'), el('span', '', MF.staffOf(m, 'printer').length ? `ready in about ${durfmt(ms)}` : 'hire a printer first'), ico('box'), el('span', '', `${Math.round(MF.wasteRate(m) * 100)}% spoiled`));
    const go = mfBtn('mf-big', [ico('jersey'), el('span', '', `Make ${merchQty} · cloth ${kfmt(merchQty * MF.MERCH.MATERIAL)}`)], () => done(MF.order(m, pid, merchQty, ctx()), true));
    card.append(hd, facts, qty, eta);
    if (Number.isFinite(ms) && ms > left) { const w = el('div', 'mf-warn'); w.append(ico('warn'), el('span', '', `At your pace (${durfmt(m.pace)} a match) his contract ends in about ${durfmt(left)}, before this batch is done. What is unmade is cancelled; what is made sells as cheap vintage stock after two days.`)); card.append(w); }
    card.append(go);
  } else if (merchSheet.type === 'hire') {
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('users'), el('b', '', 'Hire someone'), close);
    const roles = el('div', 'mf-roles');
    for (const [role, R] of Object.entries(MF.ROLES)) {
      const b = el('button', 'mf-role'), t = el('div'); t.append(el('b', '', R.name), el('small', '', `${R.about} ${kfmt(R.wage)} a day.`));
      b.append(ico({ designer: 'pencil', printer: 'printer', packer: 'box' }[role]), t);
      b.addEventListener('click', () => done(MF.hire(m, role), true));
      roles.append(b);
    }
    card.append(hd, roles);
  } else if (merchSheet.type === 'staff') {
    const s = m.staff.find(x => x.id === merchSheet.id);
    if (!s) { merchSheet = null; sh.hidden = true; return; }
    const hd = el('div', 'mf-sheet-head'); hd.append(frameOf(staffFace(s, club, 96), true), el('b', '', `${s.name} · ${MF.ROLES[s.role].name}`), close);
    const info = el('div', 'mf-row'); info.append(el('span', 'mf-stars', '★'.repeat(s.lvl)), ico('coin'), el('span', '', `${kfmt(MF.ROLES[s.role].wage * (1 + 0.25 * (s.lvl - 1)))} a day`));
    const maxed = s.lvl >= MF.staffMax(m);
    const tr = mfBtn('mf-big alt', [ico('up'), el('span', '', maxed ? 'Best for now' : `Train · ${kfmt(MF.trainCost(s))}`)], () => done(MF.train(m, s.id, ctx())));
    tr.disabled = maxed;
    card.append(hd, info, tr, mfBtn('mf-big red', [ico('cross'), el('span', '', 'Let go')], () => done(MF.fire(m, s.id), true)));
  } else { merchSheet = null; sh.hidden = true; return; }
  sh.replaceChildren(card);
}
addEventListener('visibilitychange', () => { if (!document.hidden && !$('merch').hidden) renderMerch(merchTest); });
$('setMerch').addEventListener('click', () => { unlockAudio(); sfx.click(); renderMerch(true); });

// ---------- the training ground (js/training.js): coaches train the players in its places, on real time ----------
let trainTab = 'players', trainSheet = null, trainTimer = 0, trainReport = null, trainTest = false;
const trainCtx = c => ({ now: serverNow(), trusted: clock.state === 'ok', squad: trainingRoster(c), bank: merchBank(c) });
function trainTick(c) {
  buildTick(c);
  if (!c.training || clock.state === 'none' || clock.state === 'offline') return null;
  const r = TG.tick(c.training, trainCtx(c));
  saveProfile(profile);
  return r;
}
async function renderTraining(test = false) {
  trainTest = test;
  const c = test ? demoCareer() : career();
  ui.show('training');
  $('trainBack').onclick = () => { clearInterval(trainTimer); trainTimer = 0; trainSheet = null; sfx.click(); if (trainTest) renderSettings(); else if (fromMap) renderClubMap(); else renderCareer(); };
  $('trainBody').replaceChildren(el('p', 'mf-empty', 'Checking the time with the server…'));
  $('trainSheet').hidden = true;
  await syncClock();
  if (clock.state === 'offline') {
    const e = el('div', 'mf-empty'); e.append(ico('clock'), el('span', '', 'Cannot reach the server. The training ground waits until it can check the time. Try again when you are online.'));
    $('trainBody').replaceChildren(e);
    return;
  }
  if (!c.training) c.training = TG.freshTraining(serverNow());
  trainReport = trainTick(c);
  paintTraining(c);
  clearInterval(trainTimer);
  trainTimer = setInterval(() => { if ($('training').hidden) { clearInterval(trainTimer); trainTimer = 0; return; } trainReport = trainTick(c) || trainReport; paintTraining(c); }, 15000);
}
// a net drill: the player faces the balls himself (the net trial code in game.js); only a finished drill earns the points
async function runDrill(c, pid) {
  const t = c.training;
  if (trainTick(c) === null || TG.drillsLeft(t, serverNow()) < 1) return;
  trainSheet = null; clearInterval(trainTimer); trainTimer = 0;
  const sum = await startMatch({ mode: 'tutorial', trial: { bats: [pid], bowls: [], balls: TG.TRAIN.DRILL_BALLS } });
  const r = sum?.trial?.bats?.[pid];
  await syncClock();
  const res = r ? TG.finishDrill(t, pid, r, serverNow(), trainCtx(c)) : null;
  if (res?.ok) PC.addXp(c, PC.XP.DRILL);
  saveProfile(profile);
  await renderTraining();
  if (res?.ok) { trainSheet = { type: 'drilled', pid, runs: r.runs, pts: res.pts }; paintTraining(c); }
  else if (res) ui.toast(res.why);
}
const KIND_ICON = { bat: 'star', pace: 'ball', spin: 'gear' };
function paintTraining(c) {
  const t = c.training, club = teamById(c.club), roster = trainingRoster(c), L = PC.levelRow(TG.TRAIN.LEVELS, t.level);
  const ctx = () => trainCtx(c), who = TG.assignments(t, ctx());
  const done = (r, close = false) => { if (r && r.ok === false) ui.toast(r.why); else { sfx.click(); if (close) trainSheet = null; } saveProfile(profile); trainTick(c); paintTraining(c); };
  paintShell(c, 'train', 'training'); $('trainLede').textContent = trainTest ? `Practice club (nothing is saved) · club ${money(c.money)}` : `${club.name} · club ${money(c.money)}`;
  $('trainLvl').replaceChildren(ico('factory'), el('span', '', `LV ${t.level}`));
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const x = el('div'); x.append(el('span', '', big), el('small', '', small)); d.append(ico(name), x); return d; };
  const busy = t.slots.filter(Boolean).length;
  $('trainStats').replaceChildren(stat('coin', 'gold', kfmt(t.fund), 'in the fund'), stat('users', 'blue', `${busy}/${L.slots}`, 'in training'), stat('clock', 'red', kfmt(TG.wagePerDay(t)), 'wages a day'));
  const tb = $('trainTest'); tb.hidden = !trainTest;
  if (trainTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { fn(); sfx.click(); saveProfile(profile); trainReport = trainTick(c) || trainReport; paintTraining(c); });
    tb.replaceChildren(el('b', '', 'TEST'), chip('+1 hour', () => { t.last -= 3600000; TG.seal(t); }), chip('+10 hours', () => { t.last -= 10 * 3600000; TG.seal(t); }), chip('+$1M', () => { c.money += 1; }), chip('Season ends', () => { c.news = []; const n = {}; for (const [pid, p] of roster) { const g = TG.seasonGain(t, pid, p); if (g) { n[pid] = g; c.players[pid].bat += g; c.players[pid].bowlSkill += g; } } ui.toast(Object.keys(n).length ? `${Object.keys(n).length} trained: +${Object.values(n).join(', +')}` : 'Nobody gained a point yet'); }));
  }
  const note = $('trainNote'), bad = t.unpaidMs > 0 || trainReport?.tampered;
  const gainedTxt = trainReport && trainReport.away > 2 * 60000 && trainReport.gained > 0 ? `Away${trainReport.capped ? ' (ten hours count)' : ''}: your players earned ${trainReport.gained} training points.` : '';
  const msg = t.unpaidMs > 0 ? `The wages cannot be paid: the training has stopped${t.unpaidMs > 24 * 3600000 ? `, and the coaches leave in ${durfmt(TG.TRAIN.QUIT - t.unpaidMs)}` : ''}.`
    : trainReport?.tampered ? 'The books did not add up, so the fund was emptied.' : gainedTxt;
  note.hidden = !msg; note.className = `mf-note${bad ? ' bad' : ''}`; note.replaceChildren(...(msg ? [ico(bad ? 'warn' : 'up'), el('span', '', msg)] : []));
  const canUp = canBuild(c, 'training');
  const left = TG.drillsLeft(t, serverNow());
  const tabs = [['players', 'users', 'Players', 0], ['nets', 'ball', 'Nets', left], ['coaches', 'star', 'Coaches', 0], ['ground', 'factory', 'Ground', canUp ? '!' : 0]];
  $('trainTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${trainTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { trainTab = id; trainSheet = null; sfx.click(); paintTraining(c); }); if (n) b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('trainBody');
  body.replaceChildren();
  if (trainTab === 'players') {
    const grid = el('div', 'mf-grid');
    t.slots.forEach((pid, i) => {
      const info = pid && roster.get(pid), p = pid && c.players[pid];
      if (!info) {
        const card = el('button', 'mf-card stack empty'); card.append(ico('plus'), el('b', '', 'Add a player'));
        card.addEventListener('click', () => { trainSheet = { type: 'pick', index: i }; sfx.click(); paintTraining(c); });
        grid.append(card); return;
      }
      const card = el('button', 'mf-card stack'), cost = TG.tpCost(info.ovr, info.age), tp = t.tp[pid] || 0;
      const bar = el('div', 'mf-bar green'); const fill = el('i'); fill.style.width = `${Math.max(3, Math.min(100, Math.round(tp / cost * 100)))}%`; bar.append(fill);
      const r1 = el('div', 'mf-row'); r1.append(el('span', '', `${info.ovr}`), ico('up'), el('span', '', `${info.pot}`));
      const learn = TG.canLearn(info), coach = who.get(pid);
      const r2 = el('div', `mf-row ${coach ? 'ok' : 'no'}`); r2.append(ico(coach ? 'clock' : 'warn'), el('span', '', !learn ? (info.age >= TG.TRAIN.PEAK_AGE ? 'too old to learn' : 'at his potential') : coach ? 'training' : `needs a ${info.kinds.map(k => k).join(' or ')} coach`));
      card.append(frameOf(playerFace(p, 72)), el('b', '', lastName(info.name)), bar, r1, r2);
      card.addEventListener('click', () => { trainSheet = { type: 'slot', index: i }; sfx.click(); paintTraining(c); });
      grid.append(card);
    });
    body.append(grid);
    body.append(Object.assign(el('div', 'mf-card'), {}));
    body.lastChild.append(ico('clock'), el('span', 'mf-row', `Each point of rating takes about ${durfmt(TG.tpCost(60, 20) / TG.TRAIN.TP_HOUR * 3600000)} of coaching for a young player, more for a better or older one. At most ${L.cap} a season.`));
  } else if (trainTab === 'nets') {
    const pips = el('div', 'mf-pips');
    for (let i = 0; i < TG.TRAIN.DRILLS_DAY; i++) pips.append(ico('ball', i < left ? 'on' : ''));
    const hd = el('div', 'mf-card'); hd.append(ico('ball'), el('span', 'mf-row', `Face ${TG.TRAIN.DRILL_BALLS} balls in the nets yourself: a good drill earns the player up to ${TG.TRAIN.DRILL_MAX} training points.`), pips);
    body.append(hd);
    const grid = el('div', 'mf-grid');
    grid.style.cssText = 'grid-auto-rows: auto';
    const list = [...roster].filter(([, p]) => TG.canLearn(p)).sort((a, b) => (b[1].pot - b[1].ovr) - (a[1].pot - a[1].ovr)).slice(0, 6);
    for (const [pid, p] of list) {
      const b = el('button', 'mf-card'), info = el('div', 'mf-info'), r = el('div', 'mf-row'); r.append(el('span', '', `${p.ovr}`), ico('up'), el('span', '', `${p.pot}`));
      info.append(el('b', '', lastName(p.name)), r);
      b.append(frameOf(playerFace(c.players[pid], 64)), info);
      b.addEventListener('click', () => { trainSheet = { type: 'drill', pid }; sfx.click(); paintTraining(c); });
      grid.append(b);
    }
    body.append(grid);
    if (!list.length) body.append(el('p', 'sheetnote', 'Nobody in your squad can learn more right now.'));
  } else if (trainTab === 'coaches') {
    const grid = el('div', 'mf-grid three');
    for (const k of t.coaches) {
      const card = el('button', 'mf-card stack'), r = el('div', 'mf-row'); r.append(ico(KIND_ICON[k.kind]), el('span', 'mf-stars', '★'.repeat(k.lvl)));
      card.append(frameOf(staffFace(k, club, 64)), el('b', '', k.name.replace('Coach ', '')), el('small', '', TG.KINDS[k.kind].name.split(' ')[0]), r);
      card.addEventListener('click', () => { trainSheet = { type: 'coach', id: k.id }; sfx.click(); paintTraining(c); });
      grid.append(card);
    }
    for (let i = t.coaches.length; i < L.coaches; i++) {
      const card = el('button', 'mf-card stack empty'); card.append(ico('plus'), el('b', '', 'Hire'));
      card.addEventListener('click', () => { trainSheet = { type: 'hire' }; sfx.click(); paintTraining(c); });
      grid.append(card);
    }
    body.append(grid);
    const foot = el('div', 'mf-card'); foot.append(ico('users'), el('span', 'mf-row', `${t.coaches.length} of ${L.coaches} coaches · ${kfmt(TG.wagePerDay(t))} a day · each coach teaches two players at a time`)); body.append(foot);
  } else {
    const col = el('div', 'mf-col'), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head');
    hd.append(ico('factory'), el('b', '', `Training ground level ${t.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(t.level))));
    card.append(hd);
    const pips = (name, have, max) => { const d = el('div', 'mf-pips'); for (let i = 0; i < max; i++) d.append(ico(name, i < have ? 'on' : '')); return d; };
    const r1 = el('div', 'mf-row'); r1.append(ico('users'), el('span', '', 'Places'), pips('users', busy, L.slots));
    const r2 = el('div', 'mf-row'); r2.append(ico('star'), el('span', '', 'Coaches'), pips('star', t.coaches.length, L.coaches));
    const r3 = el('div', 'mf-row'); r3.append(ico('up'), el('span', '', `A player can gain up to ${L.cap} rating a season from training`));
    card.append(r1, r2, r3);
    card.append(...buildBlock(c, 'training', () => paintTraining(c)));
    col.append(card);
    if (t.log.length) { const nw = el('div', 'mf-card'); nw.append(ico('warn'), el('span', 'mf-row', t.log[t.log.length - 1].text)); col.append(nw); }
    body.append(col);
  }
  const sh = $('trainSheet');
  sh.hidden = !trainSheet;
  if (!trainSheet) return;
  sh.onclick = e => { if (e.target === sh) { trainSheet = null; paintTraining(c); } };
  const card = el('div', 'mf-sheet-card');
  const close = mfBtn('mf-x', [ico('cross')], () => { trainSheet = null; sfx.click(); paintTraining(c); });
  if (trainSheet.type === 'pick') {
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('users'), el('b', '', 'Who trains?'), close);
    const grid = el('div', 'mf-grid');
    grid.style.cssText = 'grid-auto-rows: auto';
    const list = [...roster].filter(([pid, p]) => TG.canLearn(p) && !t.slots.includes(pid)).sort((a, b) => (b[1].pot - b[1].ovr) - (a[1].pot - a[1].ovr)).slice(0, 6);
    for (const [pid, p] of list) {
      const b = el('button', 'mf-card'), info = el('div', 'mf-info'), r = el('div', 'mf-row'); r.append(el('span', '', `${p.ovr}`), ico('up'), el('span', '', `${p.pot}`));
      info.append(el('b', '', lastName(p.name)), r);
      b.append(frameOf(playerFace(c.players[pid], 64)), info);
      b.addEventListener('click', () => done(TG.assign(t, trainSheet.index, pid, ctx()), true));
      grid.append(b);
    }
    card.append(hd, grid);
    if (!list.length) card.append(el('p', 'sheetnote', 'Nobody in your squad can learn more right now.'));
  } else if (trainSheet.type === 'drill') {
    const pid = trainSheet.pid, info = roster.get(pid), p = c.players[pid], left = TG.drillsLeft(t, serverNow());
    if (!info) { trainSheet = null; sh.hidden = true; return; }
    const hd = el('div', 'mf-sheet-head'); hd.append(frameOf(playerFace(p, 96), true), el('b', '', info.name), close);
    const r = el('div', 'mf-row'); r.append(ico('ball'), el('span', '', `${TG.TRAIN.DRILL_BALLS} balls · about a minute · ${left} drill${left === 1 ? '' : 's'} left today`));
    const go = mfBtn('mf-big', [ico('ball'), el('span', '', 'Pad up')], () => runDrill(c, pid));
    go.disabled = trainTest || left < 1 || clock.state !== 'ok';
    card.append(hd, r, go);
    if (trainTest) card.append(el('p', 'sheetnote', 'The nets are for your real club, not the practice one.'));
    else if (clock.state !== 'ok') card.append(el('p', 'sheetnote', 'The nets need the server clock: try again when you are online.'));
    else if (left < 1) card.append(el('p', 'sheetnote', 'The nets are closed for today. They open again at midnight (UTC).'));
  } else if (trainSheet.type === 'drilled') {
    const d = trainSheet, hd = el('div', 'mf-sheet-head'); hd.append(frameOf(playerFace(c.players[d.pid], 96), true), el('b', '', `${d.runs} off ${TG.TRAIN.DRILL_BALLS}`), close);
    const r = el('div', 'mf-row'); r.append(ico('up'), el('span', '', `+${d.pts} training points for ${lastName(c.players[d.pid].name)}`));
    card.append(hd, r);
  } else if (trainSheet.type === 'slot') {
    const pid = t.slots[trainSheet.index], info = roster.get(pid), p = c.players[pid];
    if (!info) { trainSheet = null; sh.hidden = true; return; }
    const hd = el('div', 'mf-sheet-head'); hd.append(frameOf(playerFace(p, 96), true), el('b', '', info.name), close);
    const r = el('div', 'mf-row'); r.append(el('span', '', `${info.ovr}`), ico('up'), el('span', '', `potential ${info.pot}`), ico('clock'), el('span', '', `${Math.round(t.tp[pid] || 0)} / ${TG.tpCost(info.ovr, info.age)} points to the next`));
    card.append(hd, r, mfBtn('mf-big red', [ico('cross'), el('span', '', 'Take out of training')], () => done(TG.release(t, trainSheet.index), true)));
  } else if (trainSheet.type === 'hire') {
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('star'), el('b', '', 'Hire a coach'), close);
    const roles = el('div', 'mf-roles');
    for (const [kind, K] of Object.entries(TG.KINDS)) {
      const b = el('button', 'mf-role'), x = el('div'); x.append(el('b', '', K.name), el('small', '', `${K.about} ${kfmt(TG.TRAIN.WAGE)} a day.`));
      b.append(ico(KIND_ICON[kind]), x);
      b.addEventListener('click', () => done(TG.hire(t, kind), true));
      roles.append(b);
    }
    card.append(hd, roles);
  } else if (trainSheet.type === 'coach') {
    const k = t.coaches.find(x => x.id === trainSheet.id);
    if (!k) { trainSheet = null; sh.hidden = true; return; }
    const hd = el('div', 'mf-sheet-head'); hd.append(frameOf(staffFace(k, club, 96), true), el('b', '', `${k.name} · ${TG.KINDS[k.kind].name}`), close);
    const info = el('div', 'mf-row'); info.append(el('span', 'mf-stars', '★'.repeat(k.lvl)), ico('coin'), el('span', '', `${kfmt(TG.TRAIN.WAGE * (1 + 0.25 * (k.lvl - 1)))} a day`));
    const maxed = k.lvl >= TG.coachMax(t);
    const tr = mfBtn('mf-big alt', [ico('up'), el('span', '', maxed ? 'Best for now' : `Train · ${kfmt(TG.coachTrainCost(k))}`)], () => done(TG.trainCoach(t, k.id, ctx())));
    tr.disabled = maxed;
    card.append(hd, info, tr, mfBtn('mf-big red', [ico('cross'), el('span', '', 'Let go')], () => done(TG.fire(t, k.id), true)));
  } else { trainSheet = null; sh.hidden = true; return; }
  sh.replaceChildren(card);
}
$('setTraining').addEventListener('click', () => { unlockAudio(); sfx.click(); renderTraining(true); });

// ---------- the club office: the books, the sponsors, the board, the contracts ----------
let officeTab = 'money', officeSheet = null, officeTest = false;
const FIN_ICON = { prizes: 'trophy', wins: 'star', tickets: 'users', sponsors: 'coin', merch: 'jersey', transfers: 'users', players: 'users', buildings: 'factory' };
function renderOffice(test = false) {
  officeTest = test;
  const c = test ? demoCareer() : career();
  ui.show('office');
  $('officeBack').onclick = () => { officeSheet = null; sfx.click(); if (officeTest) renderSettings(); else if (fromMap) renderClubMap(); else renderCareer(); };
  if (test && !c.league) startSeason(c);   // (the practice club plays a season, so the board has a target)
  if (!c.office?.deal && !c.office) office(c);
  objectiveOf(c);
  paintOffice(c);
}
function paintOffice(c) {
  const club = teamById(c.club), o = office(c), books = seasonBooks(c), last = seasonBooks(c, c.season - 1);
  buildTick(c);
  const done = (r, close = false) => { if (r === false || r?.ok === false) ui.toast(r?.why || 'Not now'); else { sfx.click(); if (close) officeSheet = null; } saveProfile(profile); paintOffice(c); };
  paintShell(c, 'office', 'office', officeTab === 'money' ? 'tiny' : 'mid'); $('officeLede').textContent = officeTest ? `Practice club (nothing is saved) · club ${money(c.money)}` : `${club.name} · season ${c.season} · club ${money(c.money)}`;
  $('officeLvl').replaceChildren(ico('factory'), el('span', '', `LV ${o.level}`));
  const inn = totalOf(books.in), out = totalOf(books.out), net = Math.round((inn - out) * 100) / 100;
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const x = el('div'); x.append(el('span', '', big), el('small', '', small)); d.append(ico(name), x); return d; };
  $('officeStats').replaceChildren(stat('up', 'gold', money(inn), 'came in'), stat('cross', 'red', money(out), 'went out'), stat('coin', 'blue', `${net >= 0 ? '+' : '−'}${money(Math.abs(net))}`, 'this season'));
  const tb = $('officeTest'); tb.hidden = !officeTest;
  if (officeTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { const n = fn() || []; if (n.length) ui.toast(n[0], 2600); sfx.click(); paintOffice(c); });
    tb.replaceChildren(el('b', '', 'TEST'), chip('Win +2 sixes', () => officeMatch(c, { won: true, sixes: 2 })), chip('Loss', () => officeMatch(c, { won: false, sixes: 0 })),
      chip('Board met', () => { if (!objectiveOf(c)) return ['No target right now']; return settleObjective(c, 2); }), chip('+$1M', () => { c.money += 1; }));
  }
  const freeSlot = OFFICE.SLOTS.some((sl, i) => i < officeSlots(c) && !o.deals[sl]);
  const tabs = [['money', 'chart', 'Money', 0], ['sponsors', 'star', 'Sponsors', freeSlot ? '!' : 0], ['board', 'trophy', 'Board', 0], ['contracts', 'users', 'Contracts', 0], ['office', 'factory', 'Office', canBuild(c, 'office') ? '!' : 0]];
  $('officeTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${officeTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { officeTab = id; officeSheet = null; sfx.click(); paintOffice(c); }); if (n) b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('officeBody');
  body.replaceChildren();
  if (officeTab === 'money') {
    const rows = el('div', 'mf-col');
    const mx = Math.max(0.1, ...Object.values(books.in), ...Object.values(books.out));
    const row = (dir, cat, label) => {
      const v = books[dir][cat] || 0, r = el('div', 'mf-fin'), bar = el('div', 'mf-bar'), f = el('i');
      f.style.width = `${Math.round(v / mx * 100)}%`; bar.append(f);
      if (dir === 'out') bar.classList.add('red');
      const t = el('div', 'mf-fin-t'); t.append(el('b', '', label), bar);
      r.append(ico(FIN_ICON[cat]), t, el('span', `mf-fin-v ${dir}`, `${dir === 'out' && v ? '−' : ''}${v ? money(v) : '–'}`));
      return r;
    };
    for (const [k, l] of Object.entries(INCOME)) rows.append(row('in', k, l));
    for (const [k, l] of Object.entries(OUTGOING)) rows.append(row('out', k, l));
    body.append(rows);
    const lastNet = Math.round((totalOf(last.in) - totalOf(last.out)) * 100) / 100;
    const fc = forecast(c);
    const foot = el('div', 'mf-card'); foot.append(ico('clock'), el('span', 'mf-row', fc ? `At this rate the season ends ${fc.net >= 0 ? '+' : '−'}${money(Math.abs(fc.net))} (${fc.played} of ${fc.per} matches played)` : c.season > 1 || totalOf(last.in) ? `Last season: ${money(totalOf(last.in))} in, ${money(totalOf(last.out))} out (${lastNet >= 0 ? '+' : '−'}${money(Math.abs(lastNet))})` : 'This is your first season: the books start here.')); body.append(foot);
  } else if (officeTab === 'sponsors') {
    const col = el('div', 'mf-col'), SLOT = { shirt: ['jersey', 'Shirt'], ground: ['users', 'Ground'], kit: ['box', 'Kit'] }, opens = ['', 5, 10];
    for (const [i, slot] of OFFICE.SLOTS.entries()) {
      const d = o.deals[slot], [ic, label] = SLOT[slot], card = el('div', 'mf-card'), info = el('div', 'mf-info');
      if (i >= officeSlots(c)) {
        card.classList.add('empty'); info.append(el('b', '', `${label} sponsor`), el('small', '', `Opens at office level ${opens[i]}`));
        card.append(ico('warn'), info);
      } else if (d) {
        const S = SPONSORS[d.id], pips = el('div', 'mf-pips');
        for (let k = 0; k < DEAL.MATCHES; k++) pips.append(ico('ball', k < d.played ? 'on' : ''));
        const goal = S.goal ? `${S.goal.kind === 'wins' ? d.wins : d.sixes}/${S.goal.n} ${S.goal.kind}` : 'no goal';
        info.append(el('b', '', `${label}: ${S.name}`), pips, el('small', '', `${money(d.paid)} paid · ${goal}`));
        card.append(ico(ic), info);
      } else {
        info.append(el('b', '', `${label} sponsor`), el('small', '', 'Free: pick a deal'));
        const go = mfBtn('chipbtn', [el('span', '', 'Sign')], () => { officeSheet = { type: 'sign', slot }; sfx.click(); paintOffice(c); });
        card.append(ico(ic), info, go);
      }
      col.append(card);
    }
    const note = el('div', 'mf-card'); note.append(ico('clock'), el('span', 'mf-row', `Each deal runs for ${DEAL.MATCHES} of your league matches. A sponsor can be in one slot at a time.`)); col.append(note);
    body.append(col);
  } else if (officeTab === 'board') {
    const col = el('div', 'mf-col'), ob = objectiveOf(c), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head');
    hd.append(ico('trophy'), el('b', '', ob ? `Finish in the top ${ob.target}` : 'No target right now'));
    card.append(hd);
    if (ob) {
      const pos = c.league && c.league.stage ? (table(c.league).findIndex(r => r.id === c.club) + 1 || null) : null;
      card.append(el('div', 'mf-row', `You are rated ${ob.rank}${['st', 'nd', 'rd'][ob.rank - 1] || 'th'} of 8 in ${divisionName(ob.div)}. The board asks for ${ob.target}${['st', 'nd', 'rd'][ob.target - 1] || 'th'} or better.`));
      if (pos) card.append(el('div', `mf-row ${pos <= ob.target ? 'ok' : 'no'}`, `In the table now: ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'}`));
      card.append(el('p', 'sheetnote', `Reach it and the board pays ${money(ob.reward)} at the end of the season. Miss it and you just lose the bonus.`));
    } else card.append(el('p', 'sheetnote', 'The board sets its target when a season begins.'));
    col.append(card);
    for (const b of [...(o.board || [])].reverse().slice(0, 3)) { const r = el('div', 'mf-card'); r.append(ico(b.met ? 'check' : 'cross'), el('span', 'mf-row', `Season ${b.season}: wanted top ${b.target}, finished ${b.pos}${b.met ? ` · +${money(b.reward)}` : ''}`)); col.append(r); }
    body.append(col);
  } else if (officeTab === 'contracts') {
    const list = contractList(c).slice(0, 6), grid = el('div', 'mf-grid');
    for (const p of list) {
      const card = el('button', 'mf-card stack'), stock = c.merch?.live?.[p.id] || 0, r = el('div', 'mf-row');
      r.append(ico('clock'), el('span', '', p.contract <= 1 ? 'last season' : `${p.contract} seasons`), ico('jersey'), el('span', '', String(stock)));
      card.append(frameOf(playerFace(p, 72)), el('b', '', lastName(p.name)), r);
      if (p.contract <= 1) { card.classList.add('pick'); card.addEventListener('click', () => { officeSheet = { type: 'extend', pid: p.id }; sfx.click(); paintOffice(c); }); }
      grid.append(card);
    }
    body.append(grid);
    const foot = el('div', 'mf-card'); foot.append(ico('warn'), el('span', 'mf-row', extensionsLeft(c) ? `Tap a player in his last season: your agent can keep him (${extensionsLeft(c)} left this season). Otherwise he goes to the auction.` : 'When a contract ends, the player goes to the auction. An agent can keep a player in his last season. His jerseys in the factory turn into cheap vintage stock.')); body.append(foot);
  } else {
    const col = el('div', 'mf-col'), places = officePlaces(c), grid = el('div', 'mf-grid three');
    const OIC = { accountant: 'coin', agent: 'users' };
    for (const st of o.staff) {
      const card = el('button', 'mf-card stack'), r = el('div', 'mf-row'); r.append(ico(OIC[st.role]), el('span', 'mf-stars', '★'.repeat(st.lvl)));
      card.append(frameOf(staffFace(st, club, 64)), el('b', '', st.name.split(' ')[1]), el('small', '', OFFICERS[st.role].name), r);
      card.addEventListener('click', () => { officeSheet = { type: 'officer', id: st.id }; sfx.click(); paintOffice(c); });
      grid.append(card);
    }
    for (let i = o.staff.length; i < places; i++) {
      const card = el('button', 'mf-card stack empty'); card.append(ico('plus'), el('b', '', 'Hire'));
      card.addEventListener('click', () => { officeSheet = { type: 'hire' }; sfx.click(); paintOffice(c); });
      grid.append(card);
    }
    col.append(grid);
    const card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head'), row = officeRow(c);
    hd.append(ico('factory'), el('b', '', `Office level ${o.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(o.level))));
    card.append(hd);
    const r1 = el('div', 'mf-row'); r1.append(ico('coin'), el('span', '', `Sponsors pay ×${row.pay.toFixed(2)} · board bonus ×${row.reward.toFixed(1)} · ${officeSlots(c)} sponsor slot${officeSlots(c) > 1 ? 's' : ''}`));
    const r2 = el('div', 'mf-row'); r2.append(ico('users'), el('span', '', `${o.staff.length} of ${places} staff · ${kfmt(officeWagePerDay(c))} a day${o.unpaidMs > 0 ? ' · UNPAID: they stopped working' : ''}`));
    card.append(r1, r2, ...buildBlock(c, 'office', () => paintOffice(c)));
    col.append(card);
    body.append(col);
  }
  const sh = $('officeSheet');
  sh.hidden = !officeSheet;
  if (!officeSheet) return;
  sh.onclick = e => { if (e.target === sh) { officeSheet = null; paintOffice(c); } };
  const card = el('div', 'mf-sheet-card');
  const close = mfBtn('mf-x', [ico('cross')], () => { officeSheet = null; sfx.click(); paintOffice(c); });
  if (officeSheet.type === 'sign') {
    const slot = officeSheet.slot, hd = el('div', 'mf-sheet-head'); hd.append(ico('star'), el('b', '', `${slot[0].toUpperCase()}${slot.slice(1)} sponsor`), close);
    card.append(hd);
    for (const [id, S] of Object.entries(SPONSORS)) {
      if (Object.values(o.deals).some(d => d.id === id)) continue;
      const w = dealWorth(c, id, slot), b = el('div', 'mf-card'), info = el('div', 'mf-info');
      info.append(el('b', '', `${S.name} · ${S.tag}`), el('small', '', S.about), el('div', 'mf-row', `up to ${money(Math.round(w.top * 100) / 100)}`));
      b.append(ico('star'), info, mfBtn('chipbtn', [el('span', '', 'Sign')], () => done(signSponsor(c, id, slot), true)));
      card.append(b);
    }
  } else if (officeSheet.type === 'hire') {
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('plus'), el('b', '', 'Hire an officer'), close);
    const roles = el('div', 'mf-roles');
    for (const [role, R] of Object.entries(OFFICERS)) {
      const b = el('button', 'mf-role'), x = el('div'); x.append(el('b', '', R.name), el('small', '', `${R.about} ${kfmt(OFFICE.WAGE[role])} a day.`));
      b.append(ico(role === 'agent' ? 'users' : 'coin'), x);
      b.disabled = o.staff.some(st => st.role === role);
      b.addEventListener('click', () => done(hireOfficer(c, role), true));
      roles.append(b);
    }
    card.append(hd, roles);
  } else if (officeSheet.type === 'officer') {
    const st = o.staff.find(x => x.id === officeSheet.id);
    if (!st) { officeSheet = null; sh.hidden = true; return; }
    const hd = el('div', 'mf-sheet-head'); hd.append(frameOf(staffFace(st, club, 96), true), el('b', '', `${st.name} · ${OFFICERS[st.role].name}`), close);
    const info = el('div', 'mf-row'); info.append(el('span', 'mf-stars', '★'.repeat(st.lvl)), ico('coin'), el('span', '', `${kfmt(officerWage(st))} a day`));
    const maxed = st.lvl >= officerMax(c);
    const tr = mfBtn('mf-big alt', [ico('up'), el('span', '', maxed ? 'Best for now' : `Train · ${money(officerTrainCost(st))}`)], () => done(trainOfficer(c, st.id)));
    tr.disabled = maxed;
    card.append(hd, info, el('p', 'sheetnote', st.role === 'accountant' ? `Sponsor deals pay ${Math.round(st.lvl * 10)}% more.` : `Keeps ${st.lvl} player${st.lvl > 1 ? 's' : ''} a season, for ${Math.round((1 - 0.1 * (st.lvl - 1)) * 100)}% of the usual fee.`), tr, mfBtn('mf-big red', [ico('cross'), el('span', '', 'Let go')], () => done(fireOfficer(c, st.id), true)));
  } else if (officeSheet.type === 'extend') {
    const p = c.players[officeSheet.pid];
    if (!p || p.team !== c.club) { officeSheet = null; sh.hidden = true; return; }
    const hd = el('div', 'mf-sheet-head'); hd.append(frameOf(playerFace(p, 96), true), el('b', '', p.name), close);
    const fee = extendFee(c, p), r = el('div', 'mf-row'); r.append(ico('clock'), el('span', '', `Last season · +${OFFICE.EXTEND} seasons for ${money(fee)}`));
    const go = mfBtn('mf-big', [ico('check'), el('span', '', `Extend · ${money(fee)}`)], () => done(extendContract(c, p.id), true));
    go.disabled = extensionsLeft(c) < 1 || c.money < fee;
    card.append(hd, r, go);
    if (!office(c).staff.some(x => x.role === 'agent')) card.append(el('p', 'sheetnote', 'You need an agent: hire one in the Office tab.'));
    else if (extensionsLeft(c) < 1) card.append(el('p', 'sheetnote', 'Your agent has done all he can this season.'));
  } else { officeSheet = null; sh.hidden = true; return; }
  sh.replaceChildren(card);
}
$('setOffice').addEventListener('click', () => { unlockAudio(); sfx.click(); renderOffice(true); });

// ---------- the clubhouse: chemistry, the rivalry board, supporter events ----------
let clubTab = 'chem', clubSheet = null, clubTest = false, clubTimer = 0;
async function renderClubhouse(test = false) {
  clubTest = test;
  const c = test ? demoCareer() : career();
  ui.show('clubhouse');
  $('clubhouseBack').onclick = () => { clearInterval(clubTimer); clubTimer = 0; clubSheet = null; sfx.click(); if (clubTest) renderSettings(); else if (fromMap) renderClubMap(); else renderCareer(); };
  $('clubhouseSheet').hidden = true;
  $('clubhouseBody').replaceChildren(el('p', 'mf-empty', 'Checking the time with the server…'));
  await syncClock();
  if (test && !c.league) startSeason(c);
  clubhouse(c);
  paintClubhouse(c);
  clearInterval(clubTimer);
  clubTimer = setInterval(() => { if ($('clubhouse').hidden) { clearInterval(clubTimer); clubTimer = 0; return; } paintClubhouse(c); }, 20000);
}
function paintClubhouse(c) {
  buildTick(c);
  const h = clubhouse(c), club = teamById(c.club), now = serverNow(), trusted = clock.state === 'ok', P = ensureChirp(c);
  const done = (r, close = false) => { if (r && r.ok === false) ui.toast(r.why); else { sfx.click(); if (close) clubSheet = null; } saveProfile(profile); paintClubhouse(c); };
  const links = chemLinks(c), row = clubhouseRow(c);
  paintShell(c, 'clubhouse', 'clubhouse', clubTab === 'chem' ? 'small' : 'mid'); $('clubhouseLede').textContent = clubTest ? `Practice club (nothing is saved) · club ${money(c.money)}` : `${club.name} · club ${money(c.money)}`;
  $('clubhouseLvl').replaceChildren(ico('factory'), el('span', '', `LV ${h.level}`));
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const x = el('div'); x.append(el('span', '', big), el('small', '', small)); d.append(ico(name), x); return d; };
  $('clubhouseStats').replaceChildren(stat('heart', 'red', String(links.length), 'chemistry links'), stat('users', 'blue', compact(P.fans), 'followers'), stat('star', 'gold', buzzWord(P.buzz), 'buzz'));
  const tb = $('clubhouseTest'); tb.hidden = !clubTest;
  if (clubTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { fn(); sfx.click(); saveProfile(profile); paintClubhouse(c); });
    const ids = clubPlayers(c, c.club).map(p => p.id);
    tb.replaceChildren(el('b', '', 'TEST'), chip('+10 games', () => { for (let i = 0; i < 10; i++) chemAfterMatch(c, ids); }), chip('+5 hours', () => { for (const e of h.events) e.end -= 5 * 3600000; for (const k of Object.keys(h.cool)) h.cool[k] -= 5 * 3600000; }),
      chip('Title', () => { c.history = [...(c.history || []), { season: c.season, pos: 1, div: 'd3' }]; }), chip('+$1M', () => { c.money += 1; }));
  }
  const free = eventSlots(c) - h.events.length > 0;
  const tabs = [['chem', 'heart', 'Chemistry', 0], ['rivals', 'trophy', 'Rivals', 0], ['events', 'star', 'Events', free && trusted ? '!' : 0], ['house', 'factory', 'Clubhouse', canBuild(c, 'clubhouse') ? '!' : 0]];
  $('clubhouseTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${clubTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { clubTab = id; clubSheet = null; sfx.click(); paintClubhouse(c); }); if (n) b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('clubhouseBody');
  body.replaceChildren();
  const info = (icon, text) => { const f = el('div', 'mf-card'); f.append(ico(icon), el('span', 'mf-row', text)); return f; };
  if (clubTab === 'chem') {
    const bonus = chemBonus(c), col = el('div', 'mf-col');
    col.append(info('heart', links.length ? `${bonus.size} of your players get extra rating from their links: half a point for a link, a whole point for a strong one, up to ${row.cap}.` : 'No links yet. Players of one nation link at once; others link after 10 matches together.'));
    for (const l of links.slice(0, 4)) {
      const a = c.players[l.a], b = c.players[l.b], card = el('div', 'mf-card'), inf = el('div', 'mf-info'), bar = el('div', `mf-bar${l.kind === 2 ? ' green' : ''}`), f = el('i');
      f.style.width = `${Math.min(100, Math.round(l.pts / CLUB.STRONG * 100))}%`; bar.append(f);
      inf.append(el('b', '', `${lastName(a.name)} & ${lastName(b.name)}`), bar, el('small', '', `${l.kind === 2 ? 'Strong link' : 'Link'} · ${a.nation === b.nation ? 'same nation · ' : ''}${Math.min(l.pts, CLUB.STRONG)}/${CLUB.STRONG}`));
      card.append(frameOf(playerFace(a, 44)), frameOf(playerFace(b, 44)), inf);
      col.append(card);
    }
    body.append(col);
  } else if (clubTab === 'rivals') {
    const col = el('div', 'mf-col'), board = rivalBoard(c);
    for (const r of board) {
      const card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head'), crest = el('img', 'mf-crest'); crest.src = logoSrc(r.id); crest.alt = '';
      hd.append(crest, el('b', '', teamById(r.id).name), el('span', 'mf-stars', r.kind === 'nemesis' ? 'Nemesis' : 'Rival'));
      const rec = el('div', 'mf-row'); rec.append(ico(r.w >= r.l ? 'up' : 'warn'), el('span', '', `You ${r.w} – ${r.l} them${r.run ? ` · ${r.run > 0 ? 'won' : 'lost'} ${Math.abs(r.run)} in a row` : ''}`));
      card.append(hd, rec);
      if (r.said) card.append(el('p', 'sheetnote', `${r.who}: "${r.said}"`));
      col.append(card);
    }
    if (!board.length) col.append(info('warn', 'Your rivals appear when you take a club.'));
    col.append(info('clock', 'Matches against real clubs, with revenge matches, come later.'));
    body.append(col);
  } else if (clubTab === 'events') {
    const col = el('div', 'mf-col'), IC = { fanday: 'users', charity: 'heart', parade: 'trophy' };
    for (const [kind, E] of Object.entries(CLUB.EVENTS)) {
      const card = el('div', 'mf-card'), inf = el('div', 'mf-info'), run = h.events.find(e => e.kind === kind);
      inf.append(el('b', '', E.name), el('small', '', `${money(eventCost(c, kind))} · ${E.hours} h · about +${Math.round(Math.max(E.min, P.fans * E.fans) * row.boost)} followers`));
      if (run) {
        const total = E.hours * 3600000, left = Math.max(0, run.end - now), bar = el('div', 'mf-bar green'), f = el('i'); f.style.width = `${Math.max(3, Math.round((1 - left / total) * 100))}%`; bar.append(f);
        inf.append(bar, el('small', '', left > 0 ? `${durfmt(left)} left` : 'finishing…'));
        card.append(ico(IC[kind]), inf);
      } else {
        const why = whyNoEvent(c, kind, { now, trusted });
        const go = mfBtn('chipbtn', [el('span', '', 'Hold')], () => done(startEvent(c, kind, { now: serverNow(), trusted: clock.state === 'ok' })));
        go.disabled = !!why;
        if (why) inf.append(el('small', '', why));
        card.append(ico(IC[kind]), inf, go);
      }
      col.append(card);
    }
    col.append(info('clock', `${h.events.length} of ${eventSlots(c)} place${eventSlots(c) > 1 ? 's' : ''} busy. Events run on real time, also while you are away.`));
    body.append(col);
  } else {
    const col = el('div', 'mf-col'), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head');
    hd.append(ico('factory'), el('b', '', `Clubhouse level ${h.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(h.level))));
    card.append(hd);
    const r1 = el('div', 'mf-row'); r1.append(ico('heart'), el('span', '', `Chemistry gives up to ${row.cap} rating point${row.cap > 1 ? 's' : ''}`));
    const r2 = el('div', 'mf-row'); r2.append(ico('star'), el('span', '', `${eventSlots(c)} event place${eventSlots(c) > 1 ? 's' : ''} · events win ×${row.boost.toFixed(1)} followers`));
    card.append(r1, r2, ...buildBlock(c, 'clubhouse', () => paintClubhouse(c)));
    col.append(card);
    if (h.log.length) { const e = h.log[h.log.length - 1]; col.append(info('check', `Last event: ${CLUB.EVENTS[e.kind].name}, +${e.gain} followers`)); }
    body.append(col);
  }
  $('clubhouseSheet').hidden = true;
}
$('setClubhouse').addEventListener('click', () => { unlockAudio(); sfx.click(); renderClubhouse(true); });

// ---------- your apartment: the trophy cabinet, the manager's reputation and salary, the story, the decor ----------
let aptTab = 'cabinet', aptSheet = null, aptTest = false;
function renderApartment(test = false) {
  aptTest = test;
  const c = test ? demoCareer() : career();
  ui.show('apartment');
  aptSheet = null; $('apartmentSheet').hidden = true;
  $('apartmentBack').onclick = () => { aptSheet = null; sfx.click(); if (aptTest) renderSettings(); else if (fromMap) renderClubMap(); else renderCareer(); };
  if (!c.club) { $('apartmentTabs').replaceChildren(); $('apartmentStats').replaceChildren(); $('apartmentLede').textContent = ''; $('apartmentLvl').replaceChildren(); $('apartmentBody').replaceChildren(el('p', 'mf-empty', 'Build your club first: the apartment is yours once you have one.')); return; }
  apartment(c);
  paintApartment(c);
}
const DECOR_ICON = { lamp: 'star', plant: 'heart', sofa: 'users', rug: 'box', poster: 'chart', coffee: 'clock', shelf: 'box', tv: 'ball', statue: 'trophy' };
function paintApartment(c) {
  buildTick(c);
  const a = apartment(c), row = aptRow(c), lvl = mgrLevel(c), trophies = trophiesOf(c);
  const done = (r, close = false) => { if (r && r.ok === false) ui.toast(r.why); else { sfx.click(); if (close) aptSheet = null; } saveProfile(profile); paintApartment(c); };
  paintShell(c, 'apartment', 'apartment', aptTab === 'decor' || aptTab === 'cabinet' ? 'small' : 'mid'); $('apartmentLede').textContent = aptTest ? `Practice club (nothing is saved) · salary ${money(salaryCash(c))}` : `${teamById(c.club).name} · salary ${money(salaryCash(c))}`;
  $('apartmentLvl').replaceChildren(ico('factory'), el('span', '', `LV ${a.level}`));
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const x = el('div'); x.append(el('span', '', big), el('small', '', small)); d.append(ico(name), x); return d; };
  $('apartmentStats').replaceChildren(stat('star', 'gold', `LV ${lvl}`, 'manager'), stat('coin', 'blue', money(salaryCash(c)), 'salary saved'), stat('trophy', 'red', String(trophies.reduce((n, t) => n + t.count, 0)), 'trophies'));
  const tb = $('apartmentTest'); tb.hidden = !aptTest;
  if (aptTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { fn(); sfx.click(); saveProfile(profile); paintApartment(c); });
    const add = (o) => { c.history = [...(c.history || []), { season: (c.history?.length || 0) + 1, div: 'd3', pos: 5, ...o }]; };
    tb.replaceChildren(el('b', '', 'TEST'), chip('Season', () => add({})), chip('D3 title', () => add({ pos: 1 })), chip('Promoted', () => add({ pos: 2, promoted: 'd2' })), chip('League title', () => add({ pos: 1, div: 'asl' })));
  }
  const tabs = [['cabinet', 'trophy', 'Cabinet', 0], ['manager', 'star', 'Manager', 0], ['story', 'chart', 'Story', 0], ['decor', 'heart', 'Decor', 0], ['house', 'factory', 'Home', canBuild(c, 'apartment') ? '!' : 0]];
  $('apartmentTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${aptTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { aptTab = id; aptSheet = null; sfx.click(); paintApartment(c); }); if (n) b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('apartmentBody');
  body.replaceChildren();
  const info = (icon, text) => { const f = el('div', 'mf-card'); f.append(ico(icon), el('span', 'mf-row', text)); return f; };
  if (aptTab === 'cabinet') {
    const col = el('div', 'mf-col');
    for (const [id, T] of Object.entries(APT.TROPHIES)) {
      const won = trophies.find(t => t.id === id), card = el('div', `mf-card${won ? '' : ' empty'}`), inf = el('div', 'mf-info');
      inf.append(el('b', '', won ? `${T.name}${won.count > 1 ? ` ×${won.count}` : ''}` : T.name), el('small', '', won ? `${T.text} · last in season ${won.last}` : `Not won yet · ${T.text}`));
      card.append(ico(won ? 'trophy' : 'warn', won ? 'on' : ''), inf);
      col.append(card);
    }
    col.append(info('star', 'Each kind of trophy gives its bonus once, for good. A second title of the same kind is for the pride.'));
    body.append(col);
  } else if (aptTab === 'manager') {
    const col = el('div', 'mf-col'), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head'), bar = el('div', 'mf-bar green'), f = el('i');
    f.style.width = `${Math.max(3, Math.round(mgrShare(c) * 100))}%`; bar.append(f);
    hd.append(ico('star', 'on'), el('b', '', `Manager level ${lvl}`), el('span', 'mf-stars', `${mgrPoints(c)} pts`));
    card.append(hd, bar);
    const r1 = el('div', 'mf-row'); r1.append(ico('coin'), el('span', '', `Sponsors pay ×${managerPay(c).toFixed(2)}`));
    const r2 = el('div', 'mf-row'); r2.append(ico('users'), el('span', '', `Players up to ${repCap(c)} rating will sign for you${repBonus(c) ? ` (+${repBonus(c)} for your name)` : ''}`));
    card.append(r1, r2); col.append(card);
    const life = a.life, pct = life.played ? Math.round(life.won / life.played * 100) : 0;
    col.append(info('chart', `${(c.history || []).length} season${(c.history || []).length === 1 ? '' : 's'} played · ${trophies.reduce((n, t) => n + t.count, 0)} trophies · ${life.played ? `${life.won} wins in ${life.played} matches (${pct}%) since the apartment` : 'matches are counted from now on'}`));
    col.append(info('clock', 'Points come from every season, titles and promotions, and from the decor.'));
    body.append(col);
  } else if (aptTab === 'story') {
    const col = el('div', 'mf-col'), log = storyLog(c);
    for (const l of log) { const card = el('div', 'mf-card'); card.append(ico(l.title ? 'trophy' : l.promoted ? 'up' : 'check', l.title || l.promoted ? 'on' : ''), el('span', 'mf-row', `Season ${l.season}: ${l.text}`)); col.append(card); }
    if (!log.length) col.append(info('clock', 'Your story starts when your first season ends.'));
    body.append(col);
  } else if (aptTab === 'decor') {
    const own = Object.keys(a.decor).length, grid = el('div', 'mf-grid three');
    for (const [id, D] of Object.entries(APT.DECOR)) {
      const have = !!a.decor[id], card = el('button', `mf-card stack${have ? ' pick' : ''}`), r = el('div', 'mf-row');
      r.append(ico(DECOR_ICON[id], have ? 'on' : ''), el('span', '', `+${D.mp} pts`));
      card.append(el('b', '', D.name), r, el('small', '', have ? 'Yours' : money(D.cost)));
      card.addEventListener('click', () => { if (!have) { aptSheet = { type: 'decor', id }; sfx.click(); paintApartment(c); } });
      grid.append(card);
    }
    body.append(info('heart', `Furnish your place with your salary: ${own} of ${decorSlots(c)} places used.`), grid);
  } else {
    const col = el('div', 'mf-col'), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head');
    hd.append(ico('factory'), el('b', '', `Apartment level ${a.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(a.level))));
    card.append(hd);
    const r1 = el('div', 'mf-row'); r1.append(ico('heart'), el('span', '', `${decorSlots(c)} places for decor`));
    const r2 = el('div', 'mf-row'); r2.append(ico('coin'), el('span', '', `Salary ×${row.pay.toFixed(2)}`));
    card.append(r1, r2, ...buildBlock(c, 'apartment', () => paintApartment(c)));
    col.append(card); body.append(col);
  }
  const sh = $('apartmentSheet');
  sh.hidden = !aptSheet;
  if (!aptSheet) return;
  sh.onclick = e => { if (e.target === sh) { aptSheet = null; paintApartment(c); } };
  const card = el('div', 'mf-sheet-card'), close = mfBtn('mf-x', [ico('cross')], () => { aptSheet = null; sfx.click(); paintApartment(c); });
  if (aptSheet.type === 'decor') {
    const D = APT.DECOR[aptSheet.id], hd = el('div', 'mf-sheet-head'); hd.append(ico(DECOR_ICON[aptSheet.id]), el('b', '', D.name), close);
    const go = mfBtn('mf-big', [ico('coin'), el('span', '', `Buy · ${money(D.cost)} salary`)], () => { const res = buyDecor(c, aptSheet.id); if (res.ok) sfx.dhol(); done(res, true); });
    go.disabled = salaryCash(c) < D.cost || Object.keys(a.decor).length >= decorSlots(c);
    card.append(hd, el('p', 'sheetnote', `+${D.mp} manager points. You have ${money(salaryCash(c))} saved.`), go);
    if (Object.keys(a.decor).length >= decorSlots(c)) card.append(el('p', 'sheetnote', 'The apartment is full: build it bigger for more places.'));
    else if (salaryCash(c) < D.cost) card.append(el('p', 'sheetnote', 'Not enough salary saved: it is paid at the end of each season.'));
  } else { aptSheet = null; sh.hidden = true; return; }
  sh.replaceChildren(card);
}
$('setApartment').addEventListener('click', () => { unlockAudio(); sfx.click(); renderApartment(true); });

// ---------- the youth academy (js/academy.js): scouts on trips, trial drills, prospects raised until 18 ----------
let acadTab = 'prospects', acadSheet = null, acadTimer = 0, acadReport = null, acadTest = false, acadRegion = 'oceania';
const acadCtx = c => ({ now: serverNow(), trusted: clock.state === 'ok', bank: merchBank(c), has: id => !!c.players[id]?.prospect, make: t => makeProspect(c, t) });
function acadTick(c) {
  buildTick(c);
  if (!c.academy || clock.state === 'none' || clock.state === 'offline') return null;
  const r = AC.tick(c.academy, acadCtx(c));
  saveProfile(profile);
  return r;
}
async function renderAcademy(test = false) {
  acadTest = test;
  const c = test ? demoCareer() : career();
  ui.show('academy');
  $('acadBack').onclick = () => { clearInterval(acadTimer); acadTimer = 0; acadSheet = null; sfx.click(); if (acadTest) renderSettings(); else if (fromMap) renderClubMap(); else renderCareer(); };
  $('acadBody').replaceChildren(el('p', 'mf-empty', 'Checking the time with the server…'));
  $('acadSheet').hidden = true;
  await syncClock();
  if (clock.state === 'offline') {
    const e = el('div', 'mf-empty'); e.append(ico('clock'), el('span', '', 'Cannot reach the server. The academy waits until it can check the time. Try again when you are online.'));
    $('acadBody').replaceChildren(e);
    return;
  }
  if (!c.academy) c.academy = AC.freshAcademy(serverNow());
  acadReport = acadTick(c);
  paintAcademy(c);
  clearInterval(acadTimer);
  acadTimer = setInterval(() => { if ($('academy').hidden) { clearInterval(acadTimer); acadTimer = 0; return; } acadReport = acadTick(c) || acadReport; paintAcademy(c); }, 15000);
}
const TIER_CLS = ['common', 'rare', 'epic', 'super'];
function paintAcademy(c) {
  const a = c.academy, L = PC.levelRow(AC.ACAD.LEVELS, a.level), now = serverNow(), ctx = () => acadCtx(c);
  const done = (r, close = false) => { if (r && r.ok === false) ui.toast(r.why); else { sfx.click(); if (close) acadSheet = null; } saveProfile(profile); acadTick(c); paintAcademy(c); };
  paintShell(c, 'acad', 'academy', acadTab === 'seniors' ? 'tiny' : acadTab === 'trips' ? 'small' : 'mid'); $('acadLede').textContent = acadTest ? `Practice club (nothing is saved) · club ${money(c.money)}` : `${teamById(c.club).name} · club ${money(c.money)}`;
  $('acadLvl').replaceChildren(ico('factory'), el('span', '', `LV ${a.level}`));
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const x = el('div'); x.append(el('span', '', big), el('small', '', small)); d.append(ico(name), x); return d; };
  $('acadStats').replaceChildren(stat('coin', 'gold', kfmt(a.fund), 'in the fund'), stat('users', 'blue', `${AC.placesUsed(a)}/${L.slots}`, 'places used'), stat('clock', 'red', kfmt(AC.upkeepPerDay(a)), 'upkeep a day'));
  const tb = $('acadTest'); tb.hidden = !acadTest;
  if (acadTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { fn(); sfx.click(); saveProfile(profile); acadReport = acadTick(c) || acadReport; paintAcademy(c); });
    tb.replaceChildren(el('b', '', 'TEST'), chip('+1 hour', () => AC.skipTime(a, 3600000)), chip('+12 hours', () => AC.skipTime(a, 12 * 3600000)), chip('+$1M', () => { c.money += 1; }),
      chip('+1 year', () => { for (const p of prospectsOf(c)) p.age++; academySeason(c, { int: (x, y) => x + Math.floor(Math.random() * (y - x + 1)) }); }));
  }
  const note = $('acadNote'), bad = a.unpaidMs > 0 || acadReport?.tampered;
  const got = acadReport?.arrived?.length ? `A scout is back: ${acadReport.arrived.map(id => c.players[id]?.name).filter(Boolean).join(', ')}.` : acadReport?.revealed?.length ? `A trial drill is done: ${acadReport.revealed.map(id => c.players[id]?.name).filter(Boolean).join(', ')}.` : '';
  const msg = a.unpaidMs > 0 ? 'The upkeep cannot be paid: the scouts and the drills have stopped.' : acadReport?.tampered ? 'The books did not add up, so the fund was emptied.' : got;
  note.hidden = !msg; note.className = `mf-note${bad ? ' bad' : ''}`; note.replaceChildren(...(msg ? [ico(bad ? 'warn' : 'up'), el('span', '', msg)] : []));
  const ready = prospectsOf(c).filter(p => p.age >= AC.ACAD.PLAY_AGE).length, canUp = canBuild(c, 'academy');
  const tabs = [['prospects', 'users', 'Prospects', ready], ['trips', 'search', 'Trips', a.trips.length], ['seniors', 'star', 'Seniors', c.phase === 'scouts' ? '!' : 0], ['academy', 'factory', 'Academy', canUp ? '!' : 0]];
  $('acadTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${acadTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { acadTab = id; acadSheet = null; sfx.click(); paintAcademy(c); }); if (n) b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('acadBody');
  body.replaceChildren();
  const left = ms => durfmt(Math.max(0, ms));
  if (acadTab === 'prospects') {
    const grid = el('div', 'mf-grid three'), list = prospectsOf(c);
    for (const p of list) {
      const rev = a.revealed[p.id], tier = p.academy?.tier ?? 0, drill = a.drills[p.id], card = el('button', 'mf-card stack'), r = el('div', 'mf-row');
      r.append(el('span', '', String(ovr(p))), ico('up'), el('span', rev ? `tier ${TIER_CLS[tier]}` : '', rev ? String(p.pot) : '?'));
      const st = el('div', `mf-row ${p.age >= AC.ACAD.PLAY_AGE ? 'ok' : 'no'}`); st.append(el('span', '', drill ? `drill ${left(drill - now)}` : p.age >= AC.ACAD.PLAY_AGE ? 'ready' : `age ${p.age}`));
      card.append(frameOf(playerFace(p, 64)), el('b', '', lastName(p.name)), el('small', `tier ${rev ? TIER_CLS[tier] : 'unknown'}`, rev ? AC.TIERS[tier] : 'Unknown'), r, st);
      card.addEventListener('click', () => { acadSheet = { type: 'prospect', id: p.id }; sfx.click(); paintAcademy(c); });
      grid.append(card);
    }
    for (let i = list.length; i < L.slots; i++) {
      const trip = a.trips[i - list.length];
      const card = el('button', 'mf-card stack empty'); card.append(ico(trip ? 'search' : 'plus'), el('b', '', trip ? `Back in ${left(trip.end - now)}` : 'Free place'));
      card.addEventListener('click', () => { acadTab = 'trips'; sfx.click(); paintAcademy(c); });
      grid.append(card);
    }
    body.append(grid);
    const foot = el('div', 'mf-card'); foot.append(ico('clock'), el('span', 'mf-row', `Prospects cannot play until they are ${AC.ACAD.PLAY_AGE}. They grow ${AC.ACAD.GROW[0]} to ${AC.ACAD.GROW[1]} rating a season. They are not part of your squad of ${MAX_SQUAD}.`)); body.append(foot);
  } else if (acadTab === 'trips') {
    const col = el('div', 'mf-col');
    for (const t of a.trips) {
      const R = SCOUT_REGIONS[t.region], card = el('div', 'mf-card'), info = el('div', 'mf-info'), bar = el('div', 'mf-bar green'), f = el('i');
      f.style.width = `${Math.max(3, Math.min(100, Math.round(100 - (t.end - now) / (t.hours * 3600000) * 100)))}%`; bar.append(f);
      const im = document.createElement('img'); im.src = `img/region/card-${t.region}.webp`; im.alt = '';
      info.append(el('b', '', `${R.name} · ${t.hours} h`), bar, el('div', 'mf-row', `back in ${left(t.end - now)}`));
      card.append(frameOf(im), info); col.append(card);
    }
    if (a.trips.length < L.trips) {
      const go = el('button', 'mf-card empty'); go.append(ico('plus'), el('b', '', AC.placesUsed(a) >= L.slots ? 'No free place: promote or sell a prospect' : 'Send a scout'));
      go.addEventListener('click', () => { if (AC.placesUsed(a) >= L.slots) return ui.toast('The academy is full: promote or sell a prospect first'); acadSheet = { type: 'trip' }; sfx.click(); paintAcademy(c); });
      col.append(go);
    }
    const foot = el('div', 'mf-card'); foot.append(ico('warn'), el('span', 'mf-row', `${a.trips.length} of ${L.trips} scout${L.trips > 1 ? 's' : ''} away. A scout holds a place for his find. Longer trips find better prospects.`)); col.append(foot);
    body.append(col);
  } else if (acadTab === 'seniors') {
    const col = el('div', 'mf-col');
    if (c.phase === 'scouts') {
      const sg = mfBtn('mf-big', [ico('star'), el('span', '', 'Your scouts are home: sign their finds')], () => { clearInterval(acadTimer); fromMap = false; careerView = 'hub'; renderCareer(); });
      col.append(sg);
    }
    const note2 = el('div', 'mf-card'); note2.append(ico('warn'), el('span', 'mf-row', `A senior scout works a whole season (${money(SCOUT_FEE)}) and finds up to 3 ready players. You sign them before next season's auction.`)); col.append(note2);
    for (const [id, R] of Object.entries(SCOUT_REGIONS)) {
      const out = scoutOut(c, id), finds = out ? c.scouting[id].finds.length : 0, card = el('div', 'mf-card compact'), info = el('div', 'mf-info');
      const im = document.createElement('img'); im.src = `img/region/card-${id}.webp`; im.alt = '';
      const go = mfBtn('chipbtn', [el('span', '', out ? `${finds}/3 found` : `Send · ${money(SCOUT_FEE)}`)], () => { if (sendScout(c, id)) { sfx.full(); ui.toast(`Your scout is off to ${R.name}`); done({ ok: true }); } else ui.toast(c.phase !== 'season' ? 'Scouts can only be sent during a season' : 'Not enough money'); });
      go.disabled = out || c.money < SCOUT_FEE;
      info.append(el('b', '', R.name), el('small', '', R.tag));
      card.append(frameOf(im), info, go);
      col.append(card);
    }
    body.append(col);
  } else {
    const col = el('div', 'mf-col'), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head');
    hd.append(ico('factory'), el('b', '', `Academy level ${a.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(a.level))));
    card.append(hd);
    const pips = (name, have, max) => { const d = el('div', 'mf-pips'); for (let i = 0; i < max; i++) d.append(ico(name, i < have ? 'on' : '')); return d; };
    const r1 = el('div', 'mf-row'); r1.append(ico('users'), el('span', '', 'Places'), pips('users', AC.placesUsed(a), L.slots));
    const r2 = el('div', 'mf-row'); r2.append(ico('search'), el('span', '', 'Scouts'), pips('search', a.trips.length, L.trips));
    const r3 = el('div', 'mf-row'); r3.append(ico('coin'), el('span', '', `Upkeep ${kfmt(AC.ACAD.UPKEEP)} a day for each prospect`));
    card.append(r1, r2, r3);
    card.append(...buildBlock(c, 'academy', () => paintAcademy(c)));
    col.append(card);
    if (a.log.length) { const nw = el('div', 'mf-card'); nw.append(ico('warn'), el('span', 'mf-row', a.log[a.log.length - 1].text)); col.append(nw); }
    body.append(col);
  }
  // the bottom sheets: a prospect, the veterans who can mentor him, a trip
  const sh = $('acadSheet');
  sh.hidden = !acadSheet;
  if (!acadSheet) return;
  sh.onclick = e => { if (e.target === sh) { acadSheet = null; paintAcademy(c); } };
  const card = el('div', 'mf-sheet-card');
  const close = mfBtn('mf-x', [ico('cross')], () => { acadSheet = null; sfx.click(); paintAcademy(c); });
  if (acadSheet.type === 'prospect') {
    const p = c.players[acadSheet.id];
    if (!p?.prospect) { acadSheet = null; sh.hidden = true; return; }
    const rev = a.revealed[p.id], drill = a.drills[p.id], mentor = c.players[a.mentors[p.id]], hd = el('div', 'mf-sheet-head');
    hd.append(frameOf(playerFace(p, 96), true), el('b', '', p.name), close);
    const r1 = el('div', 'mf-row'); r1.append(el('span', '', p.label), el('span', '', `age ${p.age}`), el('span', '', `rating ${ovr(p)}`));
    const r2 = el('div', 'mf-row'); r2.append(ico('up'), el('span', rev ? `tier ${TIER_CLS[p.academy?.tier ?? 0]}` : '', rev ? `${AC.TIERS[p.academy?.tier ?? 0]}: he can reach ${p.pot}` : 'His ceiling is not known yet'));
    card.append(hd, r1, r2);
    if (!rev) card.append(mfBtn('mf-big alt', [ico('clock'), el('span', '', drill ? `Trial drill: ${left(drill - now)} left` : `Trial drill · ${AC.ACAD.DRILL_H} hours · free`)], () => done(AC.startDrill(a, p.id, ctx()))));
    if (card.lastChild.tagName === 'BUTTON' && drill) card.lastChild.disabled = true;
    const vets = veteransOf(c);
    card.append(mfBtn('mf-big alt', [ico('users'), el('span', '', mentor ? `Mentor: ${mentor.name}` : vets.length ? 'Pick a mentor (+1 growth a season)' : 'No veteran aged 30+ to mentor him')], () => { if (vets.length) { acadSheet = { type: 'mentor', id: p.id }; paintAcademy(c); } }));
    if (!vets.length) card.lastChild.disabled = true;
    const pr = mfBtn('mf-big', [ico('check'), el('span', '', p.age >= AC.ACAD.PLAY_AGE ? 'Promote to the squad' : `He plays at ${AC.ACAD.PLAY_AGE} (age ${p.age})`)], () => { const r = promoteProspect(c, p.id); if (r.ok) { sfx.full(); ui.toast(`${p.name} joins the squad!`); } done(r, true); });
    pr.disabled = p.age < AC.ACAD.PLAY_AGE;
    card.append(pr, mfBtn('mf-big red', [ico('coin'), el('span', '', `Sell · ${money(academyPrice(p))}`)], () => { const r = sellProspect(c, p.id); if (r.ok) ui.toast(`${p.name} sold for ${money(r.price)}`); done(r, true); }));
  } else if (acadSheet.type === 'mentor') {
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('users'), el('b', '', 'Who mentors him?'), close);
    const grid = el('div', 'mf-grid'); grid.style.cssText = 'grid-auto-rows: auto';
    for (const v of veteransOf(c).sort((x, y) => y.age - x.age).slice(0, 4)) {
      const b = el('button', 'mf-card'), info = el('div', 'mf-info'), r = el('div', 'mf-row'); r.append(el('span', '', `age ${v.age}`), el('span', '', `rating ${ovr(v)}`));
      info.append(el('b', '', lastName(v.name)), r);
      b.append(frameOf(playerFace(v, 64)), info);
      b.addEventListener('click', () => { const r2 = AC.setMentor(a, acadSheet.id, v.id); acadSheet = r2.ok ? { type: 'prospect', id: acadSheet.id } : acadSheet; done(r2); });
      grid.append(b);
    }
    card.append(hd, grid);
    if (a.mentors[acadSheet.id]) card.append(mfBtn('mf-big red', [ico('cross'), el('span', '', 'No mentor')], () => { AC.setMentor(a, acadSheet.id, null); acadSheet = { type: 'prospect', id: acadSheet.id }; done({ ok: true }); }));
  } else if (acadSheet.type === 'trip') {
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('search'), el('b', '', 'Send a scout'), close);
    const chips = el('div', 'mf-qty');
    for (const [id, R] of Object.entries(SCOUT_REGIONS)) chips.append(mfBtn(id === acadRegion ? 'on' : '', [el('span', '', { africa: 'AFR', europe: 'EUR', namerica: 'N.AM', samerica: 'S.AM', oceania: 'OCE' }[id] || id)], () => { acadRegion = id; paintAcademy(c); }));
    card.append(hd, chips, el('p', 'sheetnote', `${SCOUT_REGIONS[acadRegion].name}: ${SCOUT_REGIONS[acadRegion].tag}`));
    for (const h of [12, 24, 48]) {
      const T = AC.ACAD.TRIPS[h], b = mfBtn('mf-big alt', [ico('clock'), el('span', '', `${h} hours · ${kfmt(T.cost)} · Epic ${T.odds[2]}% · Superhero ${T.odds[3]}%`)], () => done(AC.startTrip(a, acadRegion, h, ctx()), true));
      b.disabled = c.money * 1000 < T.cost && a.fund < T.cost;
      card.append(b);
    }
  } else { acadSheet = null; sh.hidden = true; return; }
  sh.replaceChildren(card);
}
$('setAcademy').addEventListener('click', () => { unlockAudio(); sfx.click(); renderAcademy(true); });

// ---------- the medical centre (js/stamina.js): fitness between matches, beds, physios ----------
let medTab = 'squad', medSheet = null, medTimer = 0, medReport = null, medTest = false;
const medCtx = c => ({ now: serverNow(), trusted: clock.state === 'ok', bank: merchBank(c), has: id => c.players[id]?.team === c.club, nameOf: id => c.players[id]?.name });
function medTickC(c) {
  buildTick(c);
  if (!c.medical || clock.state === 'none' || clock.state === 'offline') return null;
  const r = MD.medTick(c.medical, medCtx(c));
  saveProfile(profile);
  return r;
}
async function renderMedical(test = false) {
  medTest = test;
  const c = test ? demoCareer() : career();
  ui.show('medical');
  $('medBack').onclick = () => { clearInterval(medTimer); medTimer = 0; medSheet = null; sfx.click(); if (medTest) renderSettings(); else if (fromMap) renderClubMap(); else renderCareer(); };
  $('medBody').replaceChildren(el('p', 'mf-empty', 'Checking the time with the server…'));
  $('medSheet').hidden = true;
  await syncClock();
  if (clock.state === 'offline') {
    const e = el('div', 'mf-empty'); e.append(ico('clock'), el('span', '', 'Cannot reach the server. The medical centre waits until it can check the time. Try again when you are online.'));
    $('medBody').replaceChildren(e);
    return;
  }
  if (!c.medical) c.medical = MD.freshMedical();
  medReport = medTickC(c);
  paintMedical(c);
  clearInterval(medTimer);
  medTimer = setInterval(() => { if ($('medical').hidden) { clearInterval(medTimer); medTimer = 0; return; } medReport = medTickC(c) || medReport; paintMedical(c); }, 15000);
}
const fitColour = f => (f >= 70 ? 'green' : f >= 40 ? 'amber' : 'red');
function paintMedical(c) {
  const m = c.medical, L = PC.levelRow(MD.MED.LEVELS, m.level), club = teamById(c.club), squad = clubPlayers(c, c.club), ctx = () => medCtx(c);
  const done = (r, close = false) => { if (r && r.ok === false) ui.toast(r.why); else { sfx.click(); if (close) medSheet = null; } saveProfile(profile); medTickC(c); paintMedical(c); };
  paintShell(c, 'med', 'medical'); $('medLede').textContent = medTest ? `Practice club (nothing is saved) · club ${money(c.money)}` : `${club.name} · club ${money(c.money)}`;
  $('medLvl').replaceChildren(ico('factory'), el('span', '', `LV ${m.level}`));
  const avg = squad.length ? Math.round(squad.reduce((a, p) => a + MD.fitOf(m, p.id), 0) / squad.length) : 100, hurt = squad.filter(p => MD.isKnocked(m, p.id)).length;
  const stat = (name, cls, big, small) => { const d = el('div', `mf-chip ${cls}`); const x = el('div'); x.append(el('span', '', big), el('small', '', small)); d.append(ico(name), x); return d; };
  $('medStats').replaceChildren(stat('heart', 'gold', `${avg}`, 'squad fitness'), stat('warn', 'red', `${hurt}`, 'with a knock'), stat('coin', 'blue', kfmt(MD.medWagePerDay(m)), 'wages a day'));
  const tb = $('medTest'); tb.hidden = !medTest;
  if (medTest) {
    const chip = (label, fn) => mfBtn('chipbtn', [el('span', '', label)], () => { fn(); sfx.click(); saveProfile(profile); medReport = medTickC(c) || medReport; paintMedical(c); });
    tb.replaceChildren(el('b', '', 'TEST'), chip('+1 hour', () => MD.medSkip(m, 3600000)), chip('+10 hours', () => MD.medSkip(m, 10 * 3600000)), chip('+$1M', () => { c.money += 1; }),
      chip('Play a match', () => { const list = squad.slice(0, 7).map(p => ({ id: p.id, start: MD.fitOf(m, p.id), drain: 45 })); const hurtIds = MD.medAfterMatch(m, list, Math.random); if (hurtIds.length) ui.toast(`${c.players[hurtIds[0]].name} picked up a knock`); }));
  }
  const note = $('medNote'), bad = m.unpaidMs > 0 || medReport?.tampered;
  const msg = m.unpaidMs > 0 ? 'The wages cannot be paid: the beds have stopped working.' : medReport?.tampered ? 'The books did not add up, so the fund was emptied.' : medReport?.healed > 0 ? 'A knock has healed.' : medReport?.gained > 20 && medReport.away > 2 * 60000 ? `Away: your players got ${medReport.gained} fitness points back.` : '';
  note.hidden = !msg; note.className = `mf-note${bad ? ' bad' : ''}`; note.replaceChildren(...(msg ? [ico(bad ? 'warn' : 'up'), el('span', '', msg)] : []));
  const canUp = canBuild(c, 'medical'), inBed = m.beds.filter(Boolean).length;
  const tabs = [['squad', 'users', 'Squad', hurt], ['beds', 'heart', 'Beds', 0], ['staff', 'star', 'Staff', m.physios.length ? 0 : '!'], ['centre', 'factory', 'Centre', canUp ? '!' : 0]];
  $('medTabs').replaceChildren(...tabs.map(([id, ic, label, n]) => { const b = mfBtn(`mf-tab${medTab === id ? ' on' : ''}`, [ico(ic), el('span', '', label)], () => { medTab = id; medSheet = null; sfx.click(); paintMedical(c); }); if (n) b.append(el('i', 'mf-badge', String(n))); return b; }));
  const body = $('medBody');
  body.replaceChildren();
  const hoursToFull = id => { const sp = MD.bedSpeed(m), need = MD.fitCap(m, id) - MD.fitOf(m, id); return sp ? need / (MD.MED.BED * sp) * 3600000 : need / MD.MED.REST * 3600000; };
  const bar = id => { const f = MD.fitOf(m, id), b = el('div', `mf-bar ${fitColour(f)}`), i = el('i'); i.style.width = `${Math.max(3, Math.round(f))}%`; b.append(i); return b; };
  if (medTab === 'squad') {
    const grid = el('div', 'mf-grid'), list = [...squad].sort((a, b) => MD.fitOf(m, a.id) - MD.fitOf(m, b.id)).slice(0, 6);
    for (const p of list) {
      const f = Math.round(MD.fitOf(m, p.id)), kn = MD.isKnocked(m, p.id), bed = m.beds.includes(p.id), card = el('button', 'mf-card stack'), r = el('div', 'mf-row');
      r.append(ico(kn ? 'warn' : 'heart'), el('span', '', `${f}`), el('span', kn ? 'knock' : '', kn ? 'knock' : bed ? 'in bed' : f >= 100 ? 'fit' : ''));
      card.append(frameOf(playerFace(p, 64)), el('b', '', lastName(p.name)), bar(p.id), r);
      card.addEventListener('click', () => { medSheet = { type: 'player', id: p.id }; sfx.click(); paintMedical(c); });
      grid.append(card);
    }
    body.append(grid);
    const foot = el('div', 'mf-card'); foot.append(ico('warn'), el('span', 'mf-row', 'Your most tired players. Anyone under 40 fitness who plays risks a knock. Fitness is how fresh he starts the next match.')); body.append(foot);
  } else if (medTab === 'beds') {
    const grid = el('div', 'mf-grid'), work = new Set(MD.workingBeds(m));
    m.beds.forEach((id, i) => {
      if (!id) {
        const card = el('button', 'mf-card stack empty'); card.append(ico('plus'), el('b', '', 'Free bed'));
        card.addEventListener('click', () => { medSheet = { type: 'pick', index: i }; sfx.click(); paintMedical(c); });
        grid.append(card); return;
      }
      const p = c.players[id], card = el('button', 'mf-card stack'), r = el('div', `mf-row ${work.has(i) ? 'ok' : 'no'}`);
      r.append(ico(work.has(i) ? 'clock' : 'warn'), el('span', '', work.has(i) ? `${durfmt(hoursToFull(id))} to go` : 'no physio free'));
      card.append(frameOf(playerFace(p, 64)), el('b', '', lastName(p.name)), bar(id), r);
      card.addEventListener('click', () => { medSheet = { type: 'player', id }; sfx.click(); paintMedical(c); });
      grid.append(card);
    });
    body.append(grid);
    const foot = el('div', 'mf-card'); foot.append(ico('users'), el('span', 'mf-row', `${inBed} of ${m.beds.length} beds in use. Each physio looks after two beds, so ${m.physios.length} physio${m.physios.length === 1 ? '' : 's'} can treat ${m.physios.length * 2}. A bed heals 4 times as fast as resting.`)); body.append(foot);
  } else if (medTab === 'staff') {
    const grid = el('div', 'mf-grid three');
    for (const ph of m.physios) {
      const card = el('button', 'mf-card stack'), r = el('div', 'mf-row'); r.append(ico('heart'), el('span', 'mf-stars', '★'.repeat(ph.lvl)));
      card.append(frameOf(staffFace({ id: `phys-${ph.id}`, name: ph.name }, club, 64)), el('b', '', ph.name.replace('Dr ', '')), el('small', '', 'Physio'), r);
      card.addEventListener('click', () => { medSheet = { type: 'physio', id: ph.id }; sfx.click(); paintMedical(c); });
      grid.append(card);
    }
    for (let i = m.physios.length; i < L.physios; i++) {
      const card = el('button', 'mf-card stack empty'); card.append(ico('plus'), el('b', '', 'Hire a physio'));
      card.addEventListener('click', () => done(MD.hirePhysio(m)));
      grid.append(card);
    }
    body.append(grid);
    const foot = el('div', 'mf-card'); foot.append(ico('users'), el('span', 'mf-row', `${m.physios.length} of ${L.physios} physios · ${kfmt(MD.medWagePerDay(m))} a day. Without a physio the beds do nothing.`)); body.append(foot);
  } else {
    const col = el('div', 'mf-col'), card = el('div', 'mf-card col'), hd = el('div', 'mf-sheet-head');
    hd.append(ico('factory'), el('b', '', `Medical centre level ${m.level}`), el('span', 'mf-stars', '★'.repeat(PC.lookOf(m.level))));
    card.append(hd);
    const pips = (name, have, max) => { const d = el('div', 'mf-pips'); for (let i = 0; i < max; i++) d.append(ico(name, i < have ? 'on' : '')); return d; };
    const r1 = el('div', 'mf-row'); r1.append(ico('heart'), el('span', '', 'Beds'), pips('heart', inBed, L.beds));
    const r2 = el('div', 'mf-row'); r2.append(ico('star'), el('span', '', 'Physios'), pips('star', m.physios.length, L.physios));
    const r3 = el('div', 'mf-row'); r3.append(ico('warn'), el('span', '', `A knock is ${Math.round(L.prevent * 100)}% as likely as at level 1`));
    card.append(r1, r2, r3);
    card.append(...buildBlock(c, 'medical', () => paintMedical(c)));
    col.append(card);
    if (m.log.length) { const nw = el('div', 'mf-card'); nw.append(ico('check'), el('span', 'mf-row', m.log[m.log.length - 1].text)); col.append(nw); }
    body.append(col);
  }
  const sh = $('medSheet');
  sh.hidden = !medSheet;
  if (!medSheet) return;
  sh.onclick = e => { if (e.target === sh) { medSheet = null; paintMedical(c); } };
  const card = el('div', 'mf-sheet-card');
  const close = mfBtn('mf-x', [ico('cross')], () => { medSheet = null; sfx.click(); paintMedical(c); });
  if (medSheet.type === 'player') {
    const p = c.players[medSheet.id];
    if (!p || p.team !== c.club) { medSheet = null; sh.hidden = true; return; }
    const f = Math.round(MD.fitOf(m, p.id)), kn = MD.isKnocked(m, p.id), idx = m.beds.indexOf(p.id), hd = el('div', 'mf-sheet-head');
    hd.append(frameOf(playerFace(p, 96), true), el('b', '', p.name), close);
    const r = el('div', 'mf-row'); r.append(ico('heart'), el('span', '', `fitness ${f}`), ico(kn ? 'warn' : 'check'), el('span', kn ? 'knock' : '', kn ? `knock: stuck at ${MD.MED.KNOCK_CAP} until treated` : f < MD.MED.RISK_BELOW ? 'he would risk a knock' : 'no knock'));
    card.append(hd, r);
    if (idx >= 0) card.append(mfBtn('mf-big red', [ico('cross'), el('span', '', 'Out of bed')], () => done(MD.leaveBed(m, idx), true)));
    else {
      const free = m.beds.findIndex(b => !b), b = mfBtn('mf-big', [ico('heart'), el('span', '', free < 0 ? 'No free bed' : 'Put in a bed')], () => done(MD.putInBed(m, free, p.id, ctx()), true));
      b.disabled = free < 0 || (f >= 100 && !kn);
      card.append(b);
    }
  } else if (medSheet.type === 'pick') {
    const hd = el('div', 'mf-sheet-head'); hd.append(ico('heart'), el('b', '', 'Who needs a bed?'), close);
    const grid = el('div', 'mf-grid'); grid.style.cssText = 'grid-auto-rows: auto';
    const list = squad.filter(p => !m.beds.includes(p.id) && (MD.fitOf(m, p.id) < 100 || MD.isKnocked(m, p.id))).sort((a, b) => MD.fitOf(m, a.id) - MD.fitOf(m, b.id)).slice(0, 6);
    for (const p of list) {
      const b = el('button', 'mf-card'), info = el('div', 'mf-info'), r = el('div', 'mf-row');
      r.append(ico(MD.isKnocked(m, p.id) ? 'warn' : 'heart'), el('span', '', `${Math.round(MD.fitOf(m, p.id))}`));
      info.append(el('b', '', lastName(p.name)), r);
      b.append(frameOf(playerFace(p, 64)), info);
      b.addEventListener('click', () => done(MD.putInBed(m, medSheet.index, p.id, ctx()), true));
      grid.append(b);
    }
    card.append(hd, grid);
    if (!list.length) card.append(el('p', 'sheetnote', 'Everyone is fully fit.'));
  } else if (medSheet.type === 'physio') {
    const ph = m.physios.find(x => x.id === medSheet.id);
    if (!ph) { medSheet = null; sh.hidden = true; return; }
    const hd = el('div', 'mf-sheet-head'); hd.append(frameOf(staffFace({ id: `phys-${ph.id}`, name: ph.name }, club, 96), true), el('b', '', `${ph.name} · Physio`), close);
    const info = el('div', 'mf-row'); info.append(el('span', 'mf-stars', '★'.repeat(ph.lvl)), ico('coin'), el('span', '', `${kfmt(MD.MED.WAGE * (1 + 0.25 * (ph.lvl - 1)))} a day`));
    const maxed = ph.lvl >= MD.physioMax(m);
    const tr = mfBtn('mf-big alt', [ico('up'), el('span', '', maxed ? 'Best for now' : `Train · ${kfmt(MD.physioTrainCost(ph))}`)], () => done(MD.trainPhysio(m, ph.id, ctx())));
    tr.disabled = maxed;
    card.append(hd, info, tr, mfBtn('mf-big red', [ico('cross'), el('span', '', 'Let go')], () => done(MD.firePhysio(m, ph.id), true)));
  } else { medSheet = null; sh.hidden = true; return; }
  sh.replaceChildren(card);
}
$('setMedical').addEventListener('click', () => { unlockAudio(); sfx.click(); renderMedical(true); });

function renderCareer(notes = careerNotes) {
  const c = career();
  careerNotes = [];
  ui.show('career');
  const bidding = c.phase === 'auction' && careerView !== 'squad' && !!currentLot(c); // the lot on the block: the auction stage's look (css .is-auction)
  $('career').classList.toggle('is-auction', bidding);
  $('career').classList.toggle('in-auction', c.phase === 'auction' && careerView !== 'squad'); // the auction's own backdrop (css), also on its closing card
  $('careerTitle').textContent = bidding ? `Season ${c.season} auction` : `Season ${c.season}`;
  const club = c.club ? teamById(c.club) : null;
  $('careerLede').textContent = club && c.phase === 'trials' ? `${club.name} · ${divisionName(divisionOf(c, c.club))} · picking the first squad`
    : club
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
  ({ pick: careerPick, trials: careerTrials, scouts: careerScouts, auction: careerAuction, season: careerSeason, playoff: careerPlayoff, done: careerDone })[c.phase](c, body);
  autoPages(body, 'Now');
  saveProfile(profile);
}
async function enterCareer() {
  unlockAudio(); careerView = 'hub';
  const fresh = career().phase === 'pick' && !career().region;
  // the story opens a new career, once (not for a career already under way)
  if (fresh && !profile.coachSeen?.careerOpening && !window.__SIXCHARGE_BOT) {
    profile.coachSeen = { ...profile.coachSeen, careerOpening: 1 }; saveProfile(profile);
    await careerOpening();
  }
  // a new career starts by choosing the region it's played in
  if (fresh) renderRegion(); else if (mapReady(career())) renderClubMap(); else renderCareer();
}
$('btnLeague').addEventListener('click', enterCareer);
$('careerHome').addEventListener('click', () => {
  const c = career(), was = careerView;
  careerView = 'hub';
  if (mapReady(c)) renderClubMap(); else if (was === 'squad') renderCareer(); else renderTitle();
});
$('careerSquad').addEventListener('click', () => { careerView = careerView === 'squad' ? 'hub' : 'squad'; renderCareer(); });
$('careerRecords').addEventListener('click', () => renderRecords());
$('careerDaily').addEventListener('click', () => { sfx.click(); openDaily('career'); });
$('careerCoach').addEventListener('click', () => {
  const c = career();
  coachSay(c.phase === 'season' ? [...DEV.season, ...DEV.scoutTip] : DEV[{ pick: 'makeClub', scouts: 'scoutSign', auction: 'auction', playoff: 'playoff', done: 'seasonEnd' }[c.phase]]);
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
$('rgBack').addEventListener('click', () => renderTitle());
$('rgBack2').addEventListener('click', () => renderTitle());
$('rgGo').addEventListener('click', () => { if (!REGIONS.find(r => r.id === regionSel)?.open) return; const c = career(); c.region = regionSel; sfx.dhol(); saveProfile(profile); careerView = 'hub'; renderCareer(); });

// a career begins with your own club: there is nobody else's to pick
function careerPick(c) { renderMakeClub(c); }

// ---------- Create your own club: name, colours, crest; it takes a Division 3 place ----------
const KIT_COLOURS = ['#1f5fd6', '#123a7a', '#5fb4e8', '#0f8a8a', '#1e7a32', '#9bd12a', '#ffcf1a', '#ff8a1c',
  '#e8262b', '#8b1c24', '#ec2f9a', '#6a22c4', '#1f1f26', '#8f9296', '#ffffff', '#c8913a'];
let mk = null;
function renderMakeClub(c) {
  mk = mk?.c === c ? mk : { c, name: '', short: '', ground: '', groundSet: false, suit: '#e8262b', trim: '#ffcf1a', emblem: 'bolt', chant: 'default', pitch: 'flat', n: 0 };
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
  // the fan chant: a song each, heard when it is tapped
  const ch = $('mkChants'); ch.innerHTML = '';
  for (const id of CHANTS) {
    const b = el('button'); b.dataset.k = id; b.append(el('i', '', '▶'), el('span', '', id === 'default' ? 'Thunder Strikers' : (teamById(id)?.name || id)));
    b.addEventListener('click', async () => {
      mk.chant = id; sfx.click(); unlockAudio(); mkUpdate();
      b.classList.add('playing'); await previewChant(id); setTimeout(() => b.classList.remove('playing'), 7000);
    });
    ch.append(b);
  }
  // the pitch: how it plays (its report is under the buttons)
  const pt = $('mkPitches'); pt.innerHTML = '';
  for (const id of GUIDE_ORDER) {
    const P = PITCH_TYPES[id]; if (!P) continue;
    const b = el('button'); b.dataset.p = id; b.append(el('span', '', P.name));
    b.addEventListener('click', () => { mk.pitch = id; sfx.click(); mkUpdate(); });
    pt.append(b);
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
  for (const b of $('mkChants').children) b.classList.toggle('on', b.dataset.k === mk.chant);
  for (const b of $('mkPitches').children) b.classList.toggle('on', b.dataset.p === mk.pitch);
  $('mkPitchNote').textContent = PITCH_TYPES[mk.pitch]?.report || '';
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
const mkBack = () => { if (mk?.c?.club) renderCareer(); else if (mk?.c?.season === 1) renderRegion(); else renderTitle(); };
$('mkBack').addEventListener('click', mkBack);
$('mkBack2').addEventListener('click', mkBack);
$('mkGo').addEventListener('click', () => {
  const name = mk.name.trim().replace(/\s+/g, ' ');
  if (name.length < 3) { ui.toast('Give your club a name first'); $('mkNameIn').focus(); return; }
  if (!mk.crest) return;
  const c = mk.c;
  if (createClub(c, { name, short: mkShort(), suit: mk.suit, trim: mk.trim, emblem: mk.emblem, ground: mkGroundName(), crest: mk.crest, chant: mk.chant, pitch: mk.pitch }, { trials: true })) {
    setLogo(mk.pid, null); mk = null;
    sfx.dhol(); saveProfile(profile);
    careerNotes = [`🏟️ ${name} are born! They take the place of ${c.custom.gone} in Division 3.`];
    renderCareer();
    offerTutorial();
  }
});
// the first time a club is born, Uncle Dev offers the tutorial: once, and only to a player who has not done it (it stays in the settings)
async function offerTutorial() {
  if (profile.tutorialDone || profile.tutorialOffered) return;
  profile.tutorialOffered = true; saveProfile(profile);
  if (await coachAsk(DEV.tutorialAsk, 'Yes, teach me', 'Later')) { moreFrom = () => renderCareer(); showCover(); }
}

// ---------- the nets: the new club's first squad (career.js net trials) ----------
let trialSel = null;
const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const statLine = (r, bat) => (bat ? `${r.runs} off ${r.balls} · ${pl(r.fours, 'four')} · ${pl(r.sixes, 'six').replace('sixs', 'sixes')} · out ${r.outs ? pl(r.outs, 'time') : 'never'}` : `${r.outs} for ${r.runs} · ${pl(r.dots, 'dot')} · ${pl(r.fours + r.sixes, 'boundary').replace('boundarys', 'boundaries')}`);
async function runTrials(c) {
  const T = c.trial;
  const sum = await startMatch({ mode: 'tutorial', trial: { bats: T.bats, bowls: T.bowls } });
  if (sum?.trial) { T.results = sum.trial; saveProfile(profile); }
  renderCareer();
}
function careerTrials(c, body) {
  const T = c.trial;
  if (!T) return;
  const note = el('div', 'panel paper statcard');
  if (!T.results) {
    note.append(el('h3', '', '🏏 The nets'), el('p', 'tnote', `${c.custom.name} have a ground, a name and a crest, and two players: you and a keeper Dev found. The rest of the squad is picked in the nets: face four balls from each of six batters, and bowl four with each of six bowlers. Then you choose.`));
    const go = el('button', 'bigbtn primary', 'Go to the nets');
    go.addEventListener('click', () => { sfx.click(); runTrials(c); });
    note.append(go); body.append(note);
    coachOnce('trials', DEV.trials);
    return;
  }
  if (!trialSel || trialSel.c !== c) trialSel = { c, bats: new Set(), bowls: new Set() };
  note.append(el('h3', '', '✅ Pick your squad'), el('p', 'tnote', `Choose ${TRIAL_PICKS.bat} batters and ${TRIAL_PICKS.bowl} bowlers. With the keeper and you, that makes eleven.`));
  const sign = el('button', 'bigbtn primary', '');
  note.append(sign); body.append(note);
  const refresh = () => {
    const nb = trialSel.bats.size, nw = trialSel.bowls.size, ok = nb === TRIAL_PICKS.bat && nw === TRIAL_PICKS.bowl;
    sign.textContent = ok ? 'Sign the squad' : `Batters ${nb}/${TRIAL_PICKS.bat} · Bowlers ${nw}/${TRIAL_PICKS.bowl}`;
    sign.disabled = !ok;
    for (const b of body.querySelectorAll('.tcard')) b.classList.toggle('on', (b.dataset.k === 'bat' ? trialSel.bats : trialSel.bowls).has(b.dataset.id));
  };
  const section = (title, ids, kind, max) => {
    const box = el('div', 'panel paper statcard'); box.append(el('h3', '', title));
    for (const id of ids) {
      const p = c.players[id], r = T.results[kind === 'bat' ? 'bats' : 'bowls'][id];
      const card = el('button', 'tcard'); card.dataset.id = id; card.dataset.k = kind;
      const bt = kind === 'bat' ? p.label : bowlType(p.bowl).name;
      const rate = kind === 'bat' ? `Bat ${p.bat}` : `Bowl ${p.bowlSkill}`;
      card.append(el('b', '', p.name), el('span', 'tt', `${bt} · ${p.age} · ${rate} · ${'★'.repeat(potentialStars(p))}${'☆'.repeat(5 - potentialStars(p))}`), el('span', 'tr', r ? `Nets: ${statLine(r, kind === 'bat')}` : 'Not tried'));
      card.addEventListener('click', () => {
        const set = kind === 'bat' ? trialSel.bats : trialSel.bowls;
        if (set.has(id)) set.delete(id); else if (set.size < max) set.add(id); else ui.toast(`You can only sign ${max} ${kind === 'bat' ? 'batters' : 'bowlers'}: put one back first`);
        sfx.click(); refresh();
      });
      box.append(card);
    }
    return box;
  };
  body.append(section('Batters', T.bats, 'bat', TRIAL_PICKS.bat), section('Bowlers', T.bowls, 'bowl', TRIAL_PICKS.bowl));
  sign.addEventListener('click', () => {
    if (!signTrialists(c, [...trialSel.bats], [...trialSel.bowls])) return;
    trialSel = null; sfx.dhol(); saveProfile(profile);
    careerNotes = [`✍️ ${c.custom.name}'s first eleven is signed.`];
    renderCareer();
    coachOnce('trialsDone', DEV.trialsDone);
  });
  refresh();
  coachOnce('trialsPick', DEV.trialsPick);
}

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
    const stand = repBlock(c, p);
    const why = stand ? 'Will not sign for you yet' : mine.length >= MAX_SQUAD ? 'Squad full' : c.money < nextBid(lot) ? 'Not enough money' : 'Make your move';
    bidBtn.append(el('b', '', `Bid ${money(nextBid(lot))}`), el('small', '', why));
    bidBtn.disabled = !!stand || c.money < nextBid(lot) || mine.length >= MAX_SQUAD;
    bidBtn.addEventListener('click', () => {
      const r = bid(c);
      if (r === 'won') { ui.toast(`${p.name} signed for ${money(c.auction.results.at(-1).price)}!`); sfx.full(); }
      else if (r === 'outbid') { const L = c.auction.lot; ui.toast(`${teamById(L.leader).name} bid ${money(L.price)}`); sfx.click(); }
      else if (r === 'broke') ui.toast('Not enough money');
      else if (r === 'full') ui.toast(`Your squad is full (${MAX_SQUAD})`);
      else if (r === 'rep') ui.toast(repBlock(c, p));
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
  const pace = el('div', 'panel paper statcard pace pacepanel'); fillPace(pace, c); body.append(pace);
  syncClock().then(() => { if (pace.isConnected) fillPace(pace, c); });
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
      () => playLeagueMatch(c), preMatch(c, o.id)));
  }
  body.append(chirpPanel(c));
  if (c.custom) body.append(stadiumPanel(c), groundPanel(c));
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
  buildTick(c);
  const lv = stadiumLvl(c), look = stadiumLevel(c), S = STADIUMS[look], me = teamById(c.club);
  const box = el('div', 'panel paper stadpanel');
  box.append(el('h3', '', `🏟️ ${c.custom.ground}`), el('p', 'sheetnote', `${S.name} · level ${lv} · ${S.fans} fans · ${money(ticketOf(c))} ticket money every home match`));
  const pic = (level, cls) => {
    const w = el('div', `stadthumb ${cls}`);
    stadiumThumb(level, me, logoSrc(c.club)).then(cv => w.append(cv), () => {});
    return w;
  };
  box.append(pic(look, 'now'));
  coachOnce('stadium', DEV.stadium);
  const blk = el('div', 'stadbuild');
  blk.append(...buildBlock(c, 'stadium', () => { buildTick(c); renderCareer(); }));
  box.append(blk);
  return box;
}

// ---------- the ground: how well kept it is, and the caretaker who looks after it ----------
const condWords = x => (x < 0.2 ? 'Bare, dry and cracked' : x < 0.4 ? 'Patchy and dusty' : x < 0.6 ? 'Getting greener' : x < 0.8 ? 'Mostly green' : x < 0.97 ? 'Lush' : 'In perfect order');
function groundPanel(c) {
  const box = el('div', 'panel paper groundpanel'), x = groundCond(c), has = hasCaretaker(c);
  box.append(el('h3', '', '🌱 Ground & caretaker'));
  const bar = el('div', 'condbar'), fill = el('i'); fill.style.width = `${Math.round(x * 100)}%`; bar.append(fill);
  box.append(el('p', 'sheetnote', `${c.custom.ground}: ${condWords(x).toLowerCase()}. ${has ? `Your caretaker is on the job (${money(CARE.WAGE)} a week, taken after each league match): it gets better week by week.` : x >= 0.97 ? 'Nothing left to do.' : `Hire a caretaker for the grass and the pitch: ${money(CARE.HIRE)} to hire him and ${money(CARE.WAGE)} every week (each league match). Within a couple of weeks you will see it greening up. Without him it slowly goes back.`}`), bar);
  const btn = el('button', 'chipbtn', has ? 'Let him go' : `Hire caretaker · ${money(CARE.HIRE)}`);
  btn.disabled = !has && (c.money < CARE.HIRE || x >= 0.97);
  btn.addEventListener('click', () => {
    if (has ? dismissCaretaker(c) : hireCaretaker(c)) { sfx.full(); ui.toast(has ? 'The caretaker has gone' : 'Your caretaker starts on Monday'); saveProfile(profile); renderCareer(); }
  });
  box.append(btn);
  return box;
}
// ---------- travelling scouts ----------
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
    btn.disabled = c.money < p.scouted.price || mine.length >= MAX_SQUAD || !!repBlock(c, p);
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
  body.append(fixtureCard({ ...c.playoff, label: 'Relegation play-off' }, me, o, `Win and you stay in the Asian Super League. Lose and ${me.name} go down to Division 2.`, () => playLeagueMatch(c)));
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
$('recordsBack').addEventListener('click', () => { if (fromMap) renderClubMap(); else renderCareer(); });

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
let dailyFrom = 'career';   // where the daily challenge was opened from: 'map' or 'career' (the career's pages)
const dailyDone = () => profile.dailyChallenge?.key === dailyScenario().key;
$('dailyBack').addEventListener('click', () => { const c = career(); if (c.club && dailyFrom === 'map' && mapReady(c)) renderClubMap(); else if (c.club) renderCareer(); else renderTitle(); });
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
$('trophiesBack').addEventListener('click', () => { const f = moreFrom; moreFrom = null; (f || renderHome)(); });

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
  $('resAgain').textContent = { tutorial: 'To the Super League', league: 'Back to the league', cup: 'Back to the cup', daily: 'Daily results', career: 'Back to the season', war: 'Back to the war', warmup: 'Back to the war' }[mode] || 'Play again';
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
  else if (m === 'tutorial' && !FEATURES.quick) $('btnLeague').click();   // (the tutorial leads to the Super League)
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

