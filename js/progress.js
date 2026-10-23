// Long-term progress: achievements. (Hero levels are retired: players grow in career mode.)
import { TEAMS } from './teams.js';

// ---------- achievements ----------
// check(ctx): ctx = { summary, rec, profile, events } — events: 'league'|'cup'|'unbeaten'|'daily'|'sign'
const inn = (s, side) => s?.innings.find(i => i.side === side);
const won = s => s?.result.outcome === 'win';
const hatTrick = i => !!i && /WWW/.test(i.log.join(''));
const maiden = i => !!i && i.log.some((_, k) => k % 6 === 0 && i.log.length >= k + 6 && i.log.slice(k, k + 6).every(x => x === '0' || x === 'W'));
export const ACHIEVEMENTS = [
  { id: 'firstWin', name: 'Off the mark', desc: 'Win a match', coins: 50, check: c => won(c.summary) },
  { id: 'fifty', name: 'Half-century', desc: 'Score 50 in an innings', coins: 75, check: c => (inn(c.summary, 'player')?.runs || 0) >= 50 },
  { id: 'six100', name: 'Out of the ground', desc: 'Hit a six of 100 metres or more', coins: 100, check: c => (c.summary?.stats.longestSix || 0) >= 100 },
  { id: 'lastBall', name: 'Last-ball hero', desc: 'Win a chase off the final ball', coins: 100, check: c => won(c.summary) && c.summary.moments.some(m => m.kind === 'lastBallWin') && inn(c.summary, 'player')?.ballsLeft === 0 },
  { id: 'flawless', name: 'Flawless', desc: 'Win without losing a wicket', coins: 100, check: c => won(c.summary) && inn(c.summary, 'player')?.wkts === 0 && inn(c.summary, 'player')?.balls > 0 },
  { id: 'allOut', name: 'All out!', desc: 'Bowl the opposition out', coins: 75, check: c => (inn(c.summary, 'ai')?.wkts || 0) >= 3 },
  { id: 'hatTrick', name: 'Hat-trick', desc: 'Three wickets in three balls', coins: 150, check: c => hatTrick(inn(c.summary, 'ai')) },
  { id: 'maiden', name: 'Maiden over', desc: 'Bowl an over without conceding a run', coins: 50, check: c => maiden(inn(c.summary, 'ai')) },
  { id: 'divingCatch', name: 'Superman', desc: 'Take a diving catch', coins: 75, check: c => !!c.summary?.moments.some(m => m.title === 'DIVING CATCH!') },
  { id: 'stumping', name: 'Lightning gloves', desc: 'Make a stumping', coins: 75, check: c => !!c.summary?.moments.some(m => m.title === 'STUMPED!' || m.word === 'STUMPED!') },
  { id: 'powerPlay', name: 'Fully charged', desc: 'Use 5 powers in one match', coins: 75, check: c => (c.summary?.stats.powers || 0) >= 5 },
  { id: 'beatAll', name: 'Conquered them all', desc: 'Beat all seven other teams', coins: 200, check: c => (c.profile.beaten || []).length >= TEAMS.length - 1 },
  { id: 'league', name: 'League champions', desc: 'Win the Super League', coins: 300, check: c => c.events.includes('league') },
  { id: 'unbeaten', name: 'Invincibles', desc: 'Win the Super League unbeaten', coins: 500, check: c => c.events.includes('unbeaten') },
  { id: 'cup', name: 'Cup winners', desc: 'Win the Knockout Cup', coins: 200, check: c => c.events.includes('cup') },
  { id: 'daily3', name: 'Regular', desc: 'Play the daily challenge 3 days in a row', coins: 75, check: c => (c.profile.dailyStreak?.count || 0) >= 3 },
  { id: 'daily7', name: 'Every single day', desc: 'Play the daily challenge 7 days in a row', coins: 200, check: c => (c.profile.dailyStreak?.count || 0) >= 7 },
];

// Unlock whatever this moment earned; returns the new ones (their coins are already added).
export function checkAchievements(p, ctx) {
  p.achievements = p.achievements || {};
  const full = { summary: null, rec: null, events: [], ...ctx, profile: p };
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.check(full); } catch { ok = false; }
    if (ok) { p.achievements[a.id] = new Date().toISOString().slice(0, 10); p.coins += a.coins; got.push(a); }
  }
  return got;
}
