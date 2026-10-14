// Light progression stored on this device: XP, level, coins, daily login calendar.
const KEY = 'sixcharge.profile.v1';
export const DAILY = [50, 60, 70, 80, 90, 100, 250];

const fresh = () => ({
  name: '', xp: 0, coins: 0, matches: 0, wins: 0, best: 0, tutorialDone: false,
  squad: { bat: 'raja', bowl: 'zara', field: 'rani' },
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
