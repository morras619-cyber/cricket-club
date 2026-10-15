// Light progression stored on this device: XP, level, coins, daily login calendar.
const KEY = 'sixcharge.profile.v1';
export const DAILY = [50, 60, 70, 80, 90, 100, 250];

const fresh = () => ({
  name: '', xp: 0, coins: 0, matches: 0, wins: 0, best: 0, tutorialDone: false,
  squad: { bat: 'raja', bowl: 'zara', field: 'rani' },
  team: 'thunder',
  daily: { day: 0, last: '' },
  settings: { sound: true, haptics: true, fielding: 'key' },
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
  const xp = (win ? 100 : 50) + 10 * (summary.stats.fieldingWins || 0);
  const coins = win ? 40 : 20;
  p.xp += xp; p.coins += coins; p.matches++;
  if (win) p.wins++;
  const inn = summary.innings.find(i => i.side === 'player');
  if (inn) p.best = Math.max(p.best, inn.runs);
  return { xp, coins };
}

// ---------- career stats ----------
const batBlank = () => ({ inns: 0, notOuts: 0, runs: 0, balls: 0, hs: 0, hsNotOut: false, ducks: 0, fours: 0, sixes: 0 });
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
  const out = { batting: null, bowling: null, newHS: false, newBest: false };
  const batInn = summary.innings.find(i => i.side === 'player');
  if (batInn && batInn.balls > 0) {
    const card = batInn.battingCard();
    const prevHS = stats.bat.inns ? stats.bat.hs : -1;
    addBatting(stats.bat, card);
    addBatting(heroStats(stats, summary.team.bat.id, 'bat'), card);
    out.batting = card;
    out.newHS = Math.max(...card.map(c => c.runs)) > prevHS && prevHS >= 0;
  }
  const bowlInn = summary.innings.find(i => i.side === 'ai');
  if (bowlInn && bowlInn.balls > 0) {
    const f = bowlInn.bowlingFigures();
    const prevBest = stats.bowl.best;
    addBowling(stats.bowl, f);
    addBowling(heroStats(stats, summary.team.bowl.id, 'bowl'), f);
    out.bowling = f;
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
