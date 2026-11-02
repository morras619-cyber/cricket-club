// The daily challenge: one scenario a day, the same for everyone (it comes from the date),
// one attempt each. Alternates between chasing and defending.
import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { TEAMS, teamById } from './teams.js';

const EPOCH = Date.UTC(2026, 0, 1);
export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const dailyNumber = key => Math.floor((Date.parse(key) - EPOCH) / 86400000) + 1;

function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// { key, no, seed, kind: 'chase'|'defend', team, opp, ballsLeft, wktsDown, runsSoFar, target, title, text }
export function dailyScenario(key = todayKey()) {
  const seed = hashStr('daily' + key);
  const rng = makeRng(seed);
  const ids = TEAMS.map(t => t.id);
  const team = rng.pick(ids), opp = rng.pick(ids.filter(id => id !== team));
  const kind = dailyNumber(key) % 2 ? 'chase' : 'defend';
  const ballsLeft = rng.pick([12, 12, 18, 18, 24]);
  const wktsDown = kind === 'chase' ? rng.pick([0, 1, 1]) : rng.pick([0, 1, 1, 2]); // chases two down were near impossible
  const used = CFG.balls - ballsLeft;
  const runsSoFar = Math.round(used * rng.range(1.1, 1.6));
  // 1.55 to 2.1 runs a ball: harder than par, doable with a power or two
  const need = Math.round(ballsLeft * rng.range(1.55, 2.1) - wktsDown * 3);
  const target = runsSoFar + need;
  const T = teamById(team).name, O = teamById(opp).name;
  const title = kind === 'chase' ? `Chase ${need} off ${ballsLeft}` : `Defend ${need - 1} off ${ballsLeft}`;
  const wk = CFG.wickets - wktsDown;
  const text = kind === 'chase'
    ? `${T} need ${need} off the last ${ballsLeft} balls against ${O}, with ${wk} wicket${wk === 1 ? '' : 's'} left. You bat.`
    : `${O} need ${need} off the last ${ballsLeft} balls with ${wk} wicket${wk === 1 ? '' : 's'} left. Bowl for ${T} and stop them.`;
  return { key, no: dailyNumber(key), seed, kind, team, opp, ballsLeft, wktsDown, runsSoFar, target, need, title, text };
}

// After the attempt: did you do it, and the line to share.
export function dailyOutcome(sc, inn) {
  const won = sc.kind === 'chase' ? inn.runs >= sc.target : inn.runs < sc.target - 1;
  const tied = sc.kind === 'defend' ? inn.runs === sc.target - 1 : inn.runs === sc.target - 1 && inn.done();
  const made = inn.runs - sc.runsSoFar, faced = inn.balls - (CFG.balls - sc.ballsLeft);
  const line = sc.kind === 'chase'
    ? (won ? `Chased ${sc.need} with ${inn.ballsLeft} ball${inn.ballsLeft === 1 ? '' : 's'} to spare` : `${made} of ${sc.need} off ${faced} balls`)
    : (won ? `Defended! They made ${made} of ${sc.need}` : `They got there with ${inn.ballsLeft} ball${inn.ballsLeft === 1 ? '' : 's'} left`);
  const balls = inn.log.map(x => (x === 'W' ? '🟥' : x === '6' ? '🟪' : x === '4' ? '🟦' : x === '0' ? '⬛' : '🟩')).join('');
  return { won, tied, line, balls };
}

// Streak of consecutive days with an attempt.
export function updateStreak(p, key) {
  const s = p.dailyStreak || { last: '', count: 0, best: 0 };
  if (s.last === key) return s;
  const yesterday = todayKey(new Date(Date.parse(key) - 86400000));
  s.count = s.last === yesterday ? s.count + 1 : 1;
  s.best = Math.max(s.best || 0, s.count);
  s.last = key;
  p.dailyStreak = s;
  return s;
}
