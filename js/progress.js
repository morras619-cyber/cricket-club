// Long-term progress: hero levels (heroes get better the more they play) and achievements.
import { heroById } from './heroes.js';
import { TEAMS } from './teams.js';

// ---------- hero levels ----------
export const MAX_LEVEL = 10;
export const heroLevel = xp => Math.min(MAX_LEVEL, 1 + Math.floor(Math.sqrt((xp || 0) / 60)));
export const levelXp = lv => 60 * (lv - 1) ** 2; // xp needed to reach a level
export function levelProgress(xp) {
  const lv = heroLevel(xp);
  if (lv >= MAX_LEVEL) return { lv, progress: 1, next: null };
  const a = levelXp(lv), b = levelXp(lv + 1);
  return { lv, progress: (xp - a) / (b - a), next: b - xp };
}
// What a level gives: the signature power costs 2 less charge per level, and the hero bats
// or bowls a point better per level.
export const powerDiscount = lv => 2 * (Math.max(1, lv) - 1);
export const ratingBoost = lv => Math.max(1, lv) - 1;
export const levelPerks = lv => (lv > 1 ? `Power −${powerDiscount(lv)}⚡ · skill +${ratingBoost(lv)}` : 'Levels up by playing');

// XP for the heroes who played a match: runs and wickets count, and everyone who turns up gets some.
export function heroXpFromMatch(summary) {
  const out = {};
  const add = (id, n) => { if (id) out[id] = (out[id] || 0) + Math.round(n); };
  const bat = summary.innings.find(i => i.side === 'player'), bowl = summary.innings.find(i => i.side === 'ai');
  const team = summary.team || {};
  for (const h of Object.values(team)) if (h) add(h.id, 20);
  if (bat) for (const st of bat.battingCard()) if (st.id && heroById(st.id)) add(st.id, st.runs * 2 + st.sixes * 4);
  if (bowl) for (const f of bowl.bowlingCard ? bowl.bowlingCard() : []) if (heroById(f.id)) add(f.id, f.wkts * 25 + f.dots * 2);
  if (team.field) add(team.field.id, 10 * (summary.stats.fieldingWins || 0));
  if (summary.result.outcome === 'win') for (const h of Object.values(team)) if (h) add(h.id, 15);
  return out;
}
// Add match XP; returns [{ id, from, to }] for heroes that levelled up.
export function addHeroXp(p, gains) {
  p.heroXp = p.heroXp || {};
  const ups = [];
  for (const [id, n] of Object.entries(gains)) {
    const from = heroLevel(p.heroXp[id]);
    p.heroXp[id] = (p.heroXp[id] || 0) + n;
    const to = heroLevel(p.heroXp[id]);
    if (to > from) ups.push({ id, from, to });
  }
  return ups;
}
export const heroLevels = p => Object.fromEntries(Object.entries(p.heroXp || {}).map(([id, xp]) => [id, heroLevel(xp)]));

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
  { id: 'signStar', name: 'Transfer window', desc: 'Sign a star from another team', coins: 50, check: c => c.events.includes('sign') },
  { id: 'heroLv5', name: 'Veteran', desc: 'Get a hero to level 5', coins: 150, check: c => Object.values(c.profile.heroXp || {}).some(x => heroLevel(x) >= 5) },
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
