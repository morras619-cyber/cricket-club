// Tournaments: the Super League (everyone plays everyone once, top four to the semi-finals)
// and the Knockout Cup (an eight-team bracket). Pure data and functions; the state lives in
// the profile, so a tournament carries on between sessions.
import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { TEAMS } from './teams.js';
import { roster } from './squads.js';

export const LEAGUE_PRIZE = { champion: 500, runnerUp: 200, semi: 80 };
export const CUP_PRIZE = { champion: 300, runnerUp: 120, semi: 50 };

// Round-robin by the circle method: 7 rounds of 4 matches for 8 teams.
export function roundRobin(ids) {
  const t = [...ids], rounds = [];
  for (let r = 0; r < t.length - 1; r++) {
    const m = [];
    for (let i = 0; i < t.length / 2; i++) m.push([t[i], t[t.length - 1 - i]]);
    rounds.push(m);
    t.splice(1, 0, t.pop()); // keep the first team fixed, rotate the rest
  }
  return rounds;
}

export function newLeague(teamId, seed) {
  const rng = makeRng(seed);
  const ids = TEAMS.map(t => t.id);
  // shuffle so the player's fixtures aren't always in the same order
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return { kind: 'league', team: teamId, seed, round: 0, rounds: roundRobin(ids), results: [], ko: [], stage: 'group', champion: null, started: Date.now() };
}

export function newCup(teamId, seed) {
  const rng = makeRng(seed);
  const others = TEAMS.map(t => t.id).filter(id => id !== teamId);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const ids = [teamId, ...others];
  // bracket order: 1v2, 3v4 | 5v6, 7v8
  const qf = [[ids[0], ids[1]], [ids[2], ids[3]], [ids[4], ids[5]], [ids[6], ids[7]]];
  return { kind: 'cup', team: teamId, seed, round: 0, rounds: [], results: [], ko: [{ stage: 'qf', ties: qf }], stage: 'qf', champion: null, started: Date.now() };
}

// ---------- simulated matches ----------
const strength = id => {
  const r = roster(id);
  const bat = r.map(p => p.bat).sort((a, b) => b - a).slice(0, 4).reduce((s, x) => s + x, 0) / 4;
  const bowl = r.filter(p => p.bowl).map(p => p.bowlSkill).sort((a, b) => b - a).slice(0, 3).reduce((s, x) => s + x, 0) / 3;
  return { bat: bat + 6, bowl: bowl + 6 }; // + the star
};
function simInnings(batId, bowlId, rng, target = null) {
  const a = strength(batId), b = strength(bowlId);
  let runs = 0, wkts = 0, balls = 0, fours = 0, sixes = 0;
  const pWkt = 0.07 + (b.bowl - a.bat) * 0.002;
  while (balls < CFG.balls && wkts < CFG.wickets && (target == null || runs < target)) {
    balls++;
    if (rng.chance(Math.max(0.03, pWkt))) { wkts++; continue; }
    const r = rng.next();
    const edge = (a.bat - b.bowl) * 0.003;
    const runsNow = r < 0.33 - edge ? 0 : r < 0.62 ? 1 : r < 0.76 ? 2 : r < 0.92 + edge ? 4 : 6;
    if (runsNow === 4) fours++;
    if (runsNow === 6) sixes++;
    runs += runsNow;
  }
  return { runs, wkts, balls, boundaries: fours + sixes };
}
// A match between two AI teams: { a, b, ia, ib, winner }. ia is a's innings (a bats first).
export function simMatch(a, b, rng) {
  const ia = simInnings(a, b, rng);
  const ib = simInnings(b, a, rng, ia.runs + 1);
  return { a, b, ia, ib, winner: ib.runs > ia.runs ? b : ib.runs < ia.runs ? a : decider(a, b, ia, ib) };
}
// a tie is settled by boundary count (the old rule), then by the toss
function decider(a, b, ia, ib) {
  if (ia.boundaries !== ib.boundaries) return ia.boundaries > ib.boundaries ? a : b;
  return null;
}

// The player's match, from the finished innings: same shape as simMatch.
export function playerResult(state, summary) {
  const mine = summary.innings.find(i => i.side === 'player'), theirs = summary.innings.find(i => i.side === 'ai');
  const card = inn => ({ runs: inn.runs, wkts: inn.wkts, balls: inn.balls, boundaries: inn.log.filter(x => x === '4' || x === '6').length });
  const me = state.team, opp = summary.oppTeam.id;
  const [first, second] = summary.innings;
  const a = first.side === 'player' ? me : opp, b = a === me ? opp : me;
  const ia = card(first), ib = card(second);
  let winner = summary.result.outcome === 'win' ? me : summary.result.outcome === 'loss' ? opp : decider(a, b, ia, ib);
  if (winner == null && state.stage !== 'group') winner = me; // a knockout can't end level: you win the bowl-out
  return { a, b, ia, ib, winner, player: true, mine: card(mine), theirs: card(theirs) };
}

// ---------- the table ----------
// Net run rate: runs per over scored minus runs per over conceded; a side bowled out
// counts as having faced its full 5 overs.
export function table(state) {
  const rows = new Map(TEAMS.map(t => [t.id, { id: t.id, p: 0, w: 0, l: 0, t: 0, pts: 0, rf: 0, of: 0, ra: 0, oa: 0 }]));
  const overs = inn => (inn.wkts >= CFG.wickets ? CFG.balls : inn.balls) / 6;
  for (const m of state.results.filter(r => r.stage === 'group')) {
    const A = rows.get(m.a), B = rows.get(m.b);
    A.p++; B.p++;
    A.rf += m.ia.runs; A.of += overs(m.ia); A.ra += m.ib.runs; A.oa += overs(m.ib);
    B.rf += m.ib.runs; B.of += overs(m.ib); B.ra += m.ia.runs; B.oa += overs(m.ia);
    if (m.winner === m.a) { A.w++; B.l++; A.pts += 2; }
    else if (m.winner === m.b) { B.w++; A.l++; B.pts += 2; }
    else { A.t++; B.t++; A.pts++; B.pts++; }
  }
  const list = [...rows.values()].map(r => ({ ...r, nrr: (r.of ? r.rf / r.of : 0) - (r.oa ? r.ra / r.oa : 0) }));
  return list.sort((x, y) => y.pts - x.pts || y.nrr - x.nrr || x.id.localeCompare(y.id));
}

// ---------- what's next ----------
// The player's next fixture: { opp, stage, label } or null when the player is out or it's over.
export function nextFixture(state) {
  if (state.stage === 'done') return null;
  if (state.stage === 'group') {
    const m = state.rounds[state.round].find(f => f.includes(state.team));
    return { opp: m[0] === state.team ? m[1] : m[0], stage: 'group', label: `Matchday ${state.round + 1} of ${state.rounds.length}` };
  }
  const ko = state.ko[state.ko.length - 1];
  const tie = ko.ties.find(t => t.includes(state.team));
  if (!tie) return null;
  const label = { qf: 'Quarter-final', semi: 'Semi-final', final: 'Final' }[ko.stage];
  return { opp: tie[0] === state.team ? tie[1] : tie[0], stage: ko.stage, label };
}

// Record the player's result, simulate everyone else's matches of that round, and move on.
// Returns notes for the UI ("Through to the semi-finals!", "Knocked out", ...).
export function advance(state, result) {
  const rng = makeRng((state.seed ^ (state.results.length * 7919)) >>> 0);
  const notes = [];
  if (state.stage === 'group') {
    state.results.push({ ...result, stage: 'group', round: state.round });
    for (const [a, b] of state.rounds[state.round]) {
      if (a === state.team || b === state.team) continue;
      state.results.push({ ...simMatch(a, b, rng), stage: 'group', round: state.round });
    }
    state.round++;
    if (state.round >= state.rounds.length) {
      const t = table(state).map(r => r.id);
      state.ko.push({ stage: 'semi', ties: [[t[0], t[3]], [t[1], t[2]]] });
      state.stage = 'semi';
      const pos = t.indexOf(state.team) + 1;
      notes.push(pos <= 4 ? `You finished ${ordinal(pos)}: into the semi-finals!` : `You finished ${ordinal(pos)}. The top four play on.`);
      if (pos > 4) finishWithoutPlayer(state, rng, notes);
    }
    return notes;
  }
  // a knockout round
  const ko = state.ko[state.ko.length - 1];
  ko.winners = ko.ties.map(([a, b]) => {
    if (a === state.team || b === state.team) { state.results.push({ ...result, stage: ko.stage }); return result.winner; }
    const m = simMatch(a, b, rng);
    m.winner = m.winner || (rng.chance(0.5) ? a : b);
    state.results.push({ ...m, stage: ko.stage });
    return m.winner;
  });
  const won = result.winner === state.team;
  nextStage(state, notes);
  if (!won) {
    notes.unshift(`Knocked out in the ${{ qf: 'quarter-final', semi: 'semi-final', final: 'final' }[ko.stage]}.`);
    finishWithoutPlayer(state, rng, notes);
  }
  return notes;
}

function nextStage(state, notes) {
  const ko = state.ko[state.ko.length - 1];
  if (ko.stage === 'final') {
    state.champion = ko.winners[0]; state.stage = 'done';
    return;
  }
  const w = ko.winners, stage = ko.stage === 'qf' ? 'semi' : 'final';
  const ties = [];
  for (let i = 0; i < w.length; i += 2) ties.push([w[i], w[i + 1]]);
  state.ko.push({ stage, ties });
  state.stage = stage;
  if (w.includes(state.team)) notes.push(stage === 'final' ? 'Through to the FINAL!' : 'Through to the semi-finals!');
}

// The player is out: play the rest of the tournament through to a champion.
function finishWithoutPlayer(state, rng, notes) {
  while (state.stage !== 'done') {
    const ko = state.ko[state.ko.length - 1];
    if (ko.winners) { nextStage(state, notes); continue; }
    ko.winners = ko.ties.map(([a, b]) => {
      const m = simMatch(a, b, rng);
      m.winner = m.winner || (rng.chance(0.5) ? a : b);
      state.results.push({ ...m, stage: ko.stage });
      return m.winner;
    });
  }
  state.eliminated = true;
}

// Where the player finished: 'champion' | 'runnerUp' | 'semi' | 'out'.
export function finish(state) {
  if (state.stage !== 'done') return null;
  if (state.champion === state.team) return 'champion';
  const final = state.ko.find(k => k.stage === 'final');
  if (final?.ties[0].includes(state.team)) return 'runnerUp';
  const semi = state.ko.find(k => k.stage === 'semi');
  if (semi?.ties.some(t => t.includes(state.team))) return 'semi';
  return 'out';
}

// Was the player unbeaten all tournament?
export const unbeaten = state => state.results.filter(r => r.player).every(r => r.winner === state.team);

export const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
