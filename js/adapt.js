// The AI learns how well you play, and plays to match: a hidden skill estimate (saved in the profile) that moves a little after every match,
// and the handful of dials it turns on the AI's side. Nothing changes during a match: the level is read when it starts.
//   est: 0 to 100 (50 = a typical player), n: matches it has learned from.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const freshSkill = () => ({ est: 50, n: 0 });

// how much of the adaptation each mode gets: full matches fully, a career gently (its clubs' ratings still lead), and the fixed ones (a
// daily, a challenge, the war, the tutorial) not at all, so everyone plays the same game
export const adaptScale = mode => ({ quick: 1, league: 1, cup: 1, warmup: 1, career: 0.5 }[mode] ?? 0);

// -1 (struggling) to +1 (very strong)
export const levelOf = skill => clamp(((skill?.est ?? 50) - 50) / 30, -1, 1);

// the dials, for a level and a scale: what the AI's side gets on top of its own ratings
export function dialsFor(level, scale = 1) {
  const k = level * scale;
  return { bat: 15 * k, bowl: 15 * k, field: 1 + 0.08 * k, mind: 1 + 0.3 * k };
}
export const NO_DIALS = { bat: 0, bowl: 0, field: 1, mind: 1 };

export function levelName(level) {
  return level > 0.55 ? 'a very high' : level > 0.2 ? 'a high' : level > -0.2 ? 'a medium' : level > -0.55 ? 'a low' : 'a very low';
}

// how well you played a match, 0 to 100: the result (the margin over 40 runs) and your timing (swings and releases that were Good or Perfect)
export function performance(summary) {
  const inns = summary?.innings || [], mine = inns.find(i => i.side === 'player'), theirs = inns.find(i => i.side === 'ai');
  if (!mine || !theirs) return null;
  const st = summary.stats || {};
  const parts = [];
  if (st.swings >= 4) parts.push(st.swingGood / st.swings);
  if (st.rel >= 4) parts.push(st.relGood / st.rel);
  const tim = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0.55;
  const margin = clamp((mine.runs - theirs.runs) / 40, -1, 1);
  return clamp(50 + 25 * margin + 25 * clamp((tim - 0.55) / 0.3, -1, 1), 0, 100);
}

// learn from a match (the first ones count most)
export function learn(skill, summary) {
  const s = { ...freshSkill(), ...skill }, p = performance(summary);
  if (p == null) return s;
  s.est = clamp(s.est + (p - s.est) * (s.n < 3 ? 0.4 : 0.2), 0, 100);
  s.n++;
  return s;
}
