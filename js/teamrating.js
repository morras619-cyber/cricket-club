// A club's ratings for the team picker, in stars out of 5 (to the half): batting from its best
// seven batters, bowling from its best five bowlers, fielding from the whole squad, power from its
// three biggest hitters and how hard it swings. Each is placed among the eight clubs (the best
// side 5 stars, the weakest 2), so the stars compare the clubs whatever the ratings' scale.
const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const top = (a, n) => [...a].sort((x, y) => y - x).slice(0, n);
const half = v => Math.round(v * 2) / 2;

function raw(players, team) {
  const bats = players.map(p => p.bat || 0), bowls = players.map(p => p.bowlSkill || 0).filter(Boolean);
  return {
    bat: avg(top(bats, 7)),
    bowl: avg(top(bowls, 5)),
    field: avg(players.map(p => Math.max(p.bat || 0, p.bowlSkill || 0))),
    power: avg(top(bats, 3)) + (team.style?.loft || 0) * 40,
  };
}

// squads: { teamId: players }; teams: the clubs. Returns { teamId: { bat, bowl, field, power, overall } }.
export function teamStars(squads, teams) {
  const r = Object.fromEntries(teams.map(t => [t.id, raw(squads[t.id] || [], t)]));
  const out = {};
  for (const t of teams) out[t.id] = {};
  for (const k of ['bat', 'bowl', 'field', 'power']) {
    const vs = teams.map(t => r[t.id][k]), lo = Math.min(...vs), hi = Math.max(...vs);
    for (const t of teams) out[t.id][k] = half(hi > lo ? 2 + (3 * (r[t.id][k] - lo)) / (hi - lo) : 3.5);
  }
  for (const t of teams) { const s = out[t.id]; s.overall = half((s.bat + s.bowl + s.field + s.power) / 4); }
  return out;
}
