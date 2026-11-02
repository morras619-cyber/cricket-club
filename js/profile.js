// Light progression stored on this device: XP, level, coins, daily login calendar.
const KEY = 'sixcharge.profile.v1';
export const DAILY = [50, 60, 70, 80, 90, 100, 250];

const fresh = () => ({
  name: '', xp: 0, coins: 0, gems: 0, matches: 0, wins: 0, best: 0, tutorialDone: false, tutorialOffered: false,
  team: 'thunder',
  unlocked: [], // signed heroes (your own team's star is always yours)
  lineups: {}, // per team id: { order: [player ids], attack: [player ids] }
  squad: { bat: null, bowl: null, field: null }, // signings by slot
  tournament: null, trophies: [], heroXp: {}, achievements: {}, beaten: [],
  dailyChallenge: null, dailyStreak: { last: '', count: 0, best: 0 },
  daily: { day: 0, last: '' },
  pass: { season: 1, xp: 0, claimed: 0 }, // the season pass: tiers reached by playing, rewards claimed
  skill: { est: 50, n: 0 }, // how well you play, as the AI has learned it (js/adapt.js)
  settings: { sound: true, haptics: true, fielding: 'key', units: 'kmh' },
});

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* storage unavailable: play without saving */ }
  return fresh();
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function level(xp) {
  const lv = Math.min(50, 1 + Math.floor(Math.sqrt(xp / 120)));
  const cur = 120 * (lv - 1) ** 2, next = 120 * lv ** 2;
  return { lv, progress: lv >= 50 ? 1 : (xp - cur) / (next - cur) };
}

const today = () => new Date().toISOString().slice(0, 10);

export function dailyAvailable(p) { return p.daily.last !== today(); }

// Missing a day pauses the calendar instead of resetting it.
export function claimDaily(p) {
  if (!dailyAvailable(p)) return 0;
  const day = (p.daily.day % 7) + 1;
  const coins = DAILY[day - 1];
  p.daily = { day, last: today() };
  p.coins += coins;
  return { day, coins };
}

export function matchRewards(p, summary) {
  const win = summary.result.outcome === 'win';
  const daily = summary.mode === 'daily';
  const xp = (daily ? (win ? 60 : 30) : win ? 100 : 50) + 10 * (summary.stats.fieldingWins || 0);
  const coins = daily ? (win ? 60 : 20) : win ? 40 : 20;
  p.xp += xp; p.coins += coins;
  const gems = win ? 1 : 0;
  p.gems = (p.gems || 0) + gems;
  const pass = addPassXp(p, win ? 100 : 50);
  if (daily) return { xp, coins, gems, pass };
  p.matches++;
  if (win) p.wins++;
  const inn = summary.innings.find(i => i.side === 'player');
  if (inn) p.best = Math.max(p.best, inn.runs);
  return { xp, coins, gems, pass };
}

// ---------- season pass ----------
// 30 tiers of 100 pass XP (a win is a tier, a loss half of one). Every tier pays coins, every
// fifth tier gems too; once the last one is claimed the next season starts.
export const PASS_TIERS = 30;
export const PASS_TIER_XP = 100;
export const passReward = n => ({ coins: 40 + 10 * n, gems: n === PASS_TIERS ? 25 : n % 5 === 0 ? 5 : 0 });
export function passState(p) {
  const ps = { season: 1, xp: 0, claimed: 0, ...(p.pass || {}) };
  const tier = Math.min(PASS_TIERS, Math.floor(ps.xp / PASS_TIER_XP));
  const progress = tier >= PASS_TIERS ? 1 : (ps.xp % PASS_TIER_XP) / PASS_TIER_XP;
  return { ...ps, tier, progress, ready: tier - ps.claimed };
}
// adds pass XP; returns the tier reached if it went up, else 0
function addPassXp(p, n) {
  const before = passState(p).tier;
  p.pass = { ...passState(p), xp: Math.min(PASS_TIERS * PASS_TIER_XP, (p.pass?.xp || 0) + n) };
  const after = passState(p).tier;
  p.pass = { season: p.pass.season, xp: p.pass.xp, claimed: p.pass.claimed };
  return after > before ? after : 0;
}
// claims every reached tier; returns the total paid, and starts the next season after the last tier
export function claimPass(p) {
  const st = passState(p);
  const got = { coins: 0, gems: 0, tiers: 0, newSeason: false };
  for (let n = st.claimed + 1; n <= st.tier; n++) {
    const r = passReward(n);
    got.coins += r.coins; got.gems += r.gems; got.tiers++;
  }
  p.coins += got.coins; p.gems = (p.gems || 0) + got.gems;
  p.pass = { season: st.season, xp: st.xp, claimed: st.tier };
  if (st.tier >= PASS_TIERS) { p.pass = { season: st.season + 1, xp: 0, claimed: 0 }; got.newSeason = true; }
  return got;
}

// ---------- shop: gems for coins ----------
export const GEM_DEALS = [{ gems: 5, coins: 300 }, { gems: 12, coins: 800 }, { gems: 25, coins: 1800 }];
export function buyCoins(p, i) {
  const d = GEM_DEALS[i];
  if (!d || (p.gems || 0) < d.gems) return false;
  p.gems -= d.gems; p.coins += d.coins;
  return true;
}

// Spend coins to unlock a star hero. Returns false if it can't be afforded.
export function unlockHero(p, id, cost) {
  p.unlocked = p.unlocked || ['raja', 'zara', 'rani'];
  if (p.unlocked.includes(id)) return true;
  if (p.coins < cost) return false;
  p.coins -= cost; p.unlocked.push(id);
  return true;
}

// ---------- career stats ----------
const batBlank = () => ({ inns: 0, notOuts: 0, runs: 0, balls: 0, hs: 0, hsNotOut: false, ducks: 0, fours: 0, sixes: 0, longestSix: 0 });
const bowlBlank = () => ({ inns: 0, balls: 0, runs: 0, wkts: 0, dots: 0, maidens: 0, best: null });

export function careerStats(p) {
  p.stats = p.stats || {};
  p.stats.bat = { ...batBlank(), ...(p.stats.bat || {}) };
  p.stats.bowl = { ...bowlBlank(), ...(p.stats.bowl || {}) };
  p.stats.heroes = p.stats.heroes || {};
  return p.stats;
}

function heroStats(stats, id, kind) {
  const h = (stats.heroes[id] = stats.heroes[id] || {});
  h[kind] = { ...(kind === 'bat' ? batBlank() : bowlBlank()), ...(h[kind] || {}) };
  return h[kind];
}

const betterFigures = (a, b) => !b || a.w > b.w || (a.w === b.w && a.r < b.r);

function addBatting(t, card) {
  for (const st of card) {
    t.inns++; t.runs += st.runs; t.balls += st.balls; t.fours += st.fours; t.sixes += st.sixes;
    if (!st.out) t.notOuts++;
    if (st.out && st.runs === 0) t.ducks++;
    if (st.runs > t.hs || (st.runs === t.hs && !st.out && !t.hsNotOut)) { t.hs = st.runs; t.hsNotOut = !st.out; }
  }
}

function addBowling(t, f) {
  t.inns++; t.balls += f.balls; t.runs += f.runs; t.wkts += f.wkts; t.dots += f.dots; t.maidens += f.maidens;
  const fig = { w: f.wkts, r: f.runs };
  if (betterFigures(fig, t.best)) t.best = fig;
}

// Adds a finished match to the career and per-hero records. Returns what's new.
export function recordStats(p, summary) {
  const stats = careerStats(p);
  const out = { batting: null, bowling: null, newHS: false, newBest: false, newLongSix: false };
  const six = summary.stats?.longestSix || 0;
  if (six) {
    out.newLongSix = six > (stats.bat.longestSix || 0) && stats.bat.longestSix > 0;
    stats.bat.longestSix = Math.max(stats.bat.longestSix || 0, six);
  }
  const batInn = summary.innings.find(i => i.side === 'player');
  if (batInn && batInn.balls > 0) {
    const card = batInn.battingCard();
    const prevHS = stats.bat.inns ? stats.bat.hs : -1;
    addBatting(stats.bat, card);
    // the hero's own stints (older records had no ids: the hero batted throughout)
    const heroId = summary.team.bat?.id;
    const mine = card.filter(c => heroId && (!c.id || c.id === heroId));
    if (heroId && mine.length) addBatting(heroStats(stats, heroId, 'bat'), mine);
    out.batting = card;
    out.newHS = Math.max(...card.map(c => c.runs)) > prevHS && prevHS >= 0;
  }
  const bowlInn = summary.innings.find(i => i.side === 'ai');
  if (bowlInn && bowlInn.balls > 0) {
    const f = bowlInn.bowlingFigures();
    const prevBest = stats.bowl.best;
    addBowling(stats.bowl, f);
    const heroId = summary.team.bowl?.id;
    const hf = !heroId ? null : bowlInn.figs && Object.keys(bowlInn.figs).length ? bowlInn.figs[heroId] : f;
    if (hf && hf.balls > 0) addBowling(heroStats(stats, heroId, 'bowl'), { maidens: 0, ...hf });
    out.bowling = f;
    out.bowlingCard = bowlInn.bowlingCard ? bowlInn.bowlingCard() : [];
    out.newBest = !!prevBest && betterFigures({ w: f.wkts, r: f.runs }, prevBest);
  }
  return out;
}

// Display helpers
export const fmt = {
  avg: (runs, outs) => (outs ? (runs / outs).toFixed(1) : '—'),
  sr: (runs, balls) => (balls ? ((runs / balls) * 100).toFixed(0) : '—'),
  econ: (runs, balls) => (balls ? ((runs / balls) * 6).toFixed(1) : '—'),
  overs: balls => `${Math.floor(balls / 6)}.${balls % 6}`,
  hs: t => (t.inns ? `${t.hs}${t.hsNotOut ? '*' : ''}` : '—'),
  best: t => (t.best ? `${t.best.w}/${t.best.r}` : '—'),
  stint: st => `${st.runs}${st.out ? '' : '*'} (${st.balls})`,
  figures: f => `${f.wkts}/${f.runs} (${Math.floor(f.balls / 6)}.${f.balls % 6} ov)`,
};
