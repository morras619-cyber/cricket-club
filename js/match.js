import { CFG } from './config.js';
import { FULL, batDrain, bowlDrain } from './stamina.js';

const freshStint = (p = null) => ({ id: p?.id || null, name: p?.name || null, nation: p?.nation || null, runs: 0, balls: 0, fours: 0, sixes: 0 });
const freshFig = p => ({ id: p.id, name: p.name, nation: p.nation || null, short: p.short || p.name.split(' ').slice(-1)[0], type: p.bowl || null, balls: 0, runs: 0, wkts: 0, dots: 0 });

export const oversText = balls => `${Math.floor(balls / 6)}.${balls % 6}`;

export class Innings {
  // opt (tie-breaks): { balls, wkts, sixes } — a super over is 6 balls and 2 wickets; in the
  // six-hitting shoot-out only sixes count (target: sixes to beat) and getting out costs nothing
  constructor(side, target = null, opt = {}) {
    this.side = side; // 'player' | 'ai' — who is batting
    this.target = target;
    this.maxBalls = opt.balls || CFG.balls;
    this.maxWkts = opt.wkts || CFG.wickets;
    this.sixes = !!opt.sixes;
    this.kind = opt.kind || 'main';
    this.runs = 0; this.wkts = 0; this.balls = 0;
    this.log = []; // per legal ball: '0' '1' '4' '6' 'W' ...
    this.noBalls = []; // legal balls bowled when each no-ball came (for the over strip)
    // batting stints, one per batter: each dismissal ends one and the next batter comes in.
    // Two are at the crease: cur is on strike, other at the bowler's end. An odd number of runs
    // swaps them, and so does the end of an over.
    this.stints = [];
    this.cur = freshStint();
    this.other = freshStint();
    // the whole attack's figures (run-outs aren't the bowler's wickets) and each bowler's own
    this.bowler = { balls: 0, runs: 0, wkts: 0, dots: 0 };
    this.figs = {};
    this.curBowler = null;
    // stamina (stamina.js): everyone starts on FULL; people keeps who each id is, for his type
    this.energy = {};
    this.people = {};
  }

  energyOf(id) { return id && this.energy[id] != null ? this.energy[id] : FULL; }
  tire(id, amount) { if (id) this.energy[id] = Math.max(0, Math.min(FULL, this.energyOf(id) - amount)); }
  // one ball bowled: the man on strike and the bowler tire (or rest) by what happened; the rest of the attack rests a little
  tireBall({ runs = 0, extra = false, missed = false, batter = true }) {
    if (batter && this.cur.id) this.tire(this.cur.id, batDrain(this.people[this.cur.id], { runs, missed }));
    if (this.curBowler) {
      this.tire(this.curBowler, bowlDrain(this.people[this.curBowler], { runs, extra }));
      for (const id of Object.keys(this.figs)) if (id !== this.curBowler) this.tire(id, CFG.stamina.bowl.rest);
    }
  }

  // The batter now on strike. Only valid at the start of a stint.
  setBatter(p) { if (p) this.people[p.id] = p; if (p && this.cur.balls === 0) Object.assign(this.cur, { id: p.id, name: p.name, nation: p.nation || null }); }
  // His partner at the other end (only fills an empty place)
  setPartner(p) { if (p) this.people[p.id] = p; if (p && !this.other.id && this.other.balls === 0) Object.assign(this.other, { id: p.id, name: p.name, nation: p.nation || null }); }
  // ids of everyone who has batted or is in
  battedIds() { return [...this.stints.map(s => s.id), this.cur.id, this.other.id].filter(Boolean); }
  swapStrike() { [this.cur, this.other] = [this.other, this.cur]; }
  // The bowler of the current over.
  setBowler(p) {
    if (!p) return;
    this.people[p.id] = p;
    if (!this.figs[p.id]) this.figs[p.id] = freshFig(p);
    this.curBowler = p.id;
  }
  // How many overs each bowler has started (for the over limit).
  oversBy() {
    const o = {};
    for (const f of Object.values(this.figs)) o[f.id] = Math.ceil(f.balls / 6);
    return o;
  }
  get ballsLeft() { return this.maxBalls - this.balls; }
  get sixesHit() { return this.log.filter(r => r === '6').length; }
  // what the innings is scored on: runs, or sixes in the shoot-out
  get score() { return this.sixes ? this.sixesHit : this.runs; }
  get need() { return this.target == null ? null : Math.max(0, this.target - this.score); }
  reached() { return this.target != null && this.score >= this.target; }
  get overs() { return `${Math.floor(this.balls / 6)}.${this.balls % 6}`; }

  extra(runs, noBall = false) {
    if (noBall) this.noBalls.push(this.balls);
    this.runs += runs; this.bowler.runs += runs;
    if (this.curBowler) this.figs[this.curBowler].runs += runs;
    this.tireBall({ extra: true, batter: false });
  }

  // A no-ball that is played (nbPlay): the runs off the bat count (the extra is already in) but it is not a legal ball, and only a run-out ends the batter's innings
  noBallPlay({ runs = 0, wicket = false, runOut = false }) {
    this.runs += runs;
    const c = this.cur;
    c.runs += runs; c.balls++;
    if (runs === 4) c.fours++;
    if (runs === 6) c.sixes++;
    this.bowler.runs += runs;
    const f = this.curBowler && this.figs[this.curBowler];
    if (f) f.runs += runs;
    this.tireBall({ runs });
    if (wicket && runOut && !this.sixes) { this.wkts++; this.stints.push({ ...c, out: true, how: 'run out' }); this.cur = freshStint(); }
    else if (runs % 2 === 1) this.swapStrike();
  }

  ball({ runs = 0, wicket = false, runOut = false, missed = false }) {
    if (this.nbPlay) return this.noBallPlay({ runs, wicket, runOut });
    if (this.sixes) wicket = false; // (out doesn't count in the shoot-out: the ball just isn't a six)
    this.balls++;
    this.runs += runs;
    if (wicket) this.wkts++;
    this.log.push(wicket ? 'W' : String(runs));
    const c = this.cur;
    c.runs += runs; c.balls++;
    if (runs === 4) c.fours++;
    if (runs === 6) c.sixes++;
    const b = this.bowler;
    b.balls++; b.runs += runs;
    if (runs === 0) b.dots++;
    if (wicket && !runOut) b.wkts++;
    const f = this.curBowler && this.figs[this.curBowler];
    if (f) {
      f.balls++; f.runs += runs;
      if (runs === 0) f.dots++;
      if (wicket && !runOut) f.wkts++;
    }
    this.tireBall({ runs, missed });
    if (wicket) { this.stints.push({ ...c, out: true, how: runOut ? 'run out' : f ? `b ${f.short}` : 'out' }); this.cur = freshStint(); }
    // they crossed: 1, 3 or 5 runs puts the other man on strike (a wicket brings the new man in on strike)
    else if (runs % 2 === 1) this.swapStrike();
    // end of the over: the bowling switches ends, so the other batter faces
    if (this.balls % 6 === 0 && this.balls < this.maxBalls) {
      this.swapStrike();
      for (const id of [this.cur.id, this.other.id]) this.tire(id, CFG.stamina.bat.overRest);   // (a breather between overs)
    }
  }

  // Every stint, including the unbeaten one at the end.
  battingCard() {
    const list = [...this.stints];
    for (const s of [this.cur, this.other]) if (s.balls > 0 || (s.id && list.length === 0)) list.push({ ...s, out: false });
    if (list.length === 0) list.push({ ...this.cur, out: false });
    return list;
  }

  bowlingFigures() {
    let maidens = 0;
    for (let i = 0; i + 6 <= this.log.length; i += 6) {
      if (this.log.slice(i, i + 6).every(r => r === '0' || r === 'W')) maidens++;
    }
    return { ...this.bowler, maidens };
  }

  // Each bowler's figures, in the order they came on.
  bowlingCard() { return Object.values(this.figs).filter(f => f.balls > 0); }

  done() {
    return this.balls >= this.maxBalls || this.wkts >= this.maxWkts || this.reached();
  }
}

// Result of a two-innings match from the player's point of view. A tie goes to the tie-breaks
// (rounds: [{ kind: 'super'|'sixes', innings: [a, b] }]): the last round decides it.
export function matchResult(first, second, rounds = []) {
  const player = first.side === 'player' ? first : second;
  const ai = first.side === 'player' ? second : first;
  if (player.runs === ai.runs) {
    const last = rounds[rounds.length - 1];
    if (!last) return { outcome: 'tie', text: 'Match tied!' };
    const mine = last.innings.find(i => i.side === 'player'), theirs = last.innings.find(i => i.side === 'ai');
    if (mine.score === theirs.score) return { outcome: 'tie', text: 'Match tied!' };
    const won = mine.score > theirs.score, how = last.kind === 'super' ? 'the Super Over' : 'the six-hitting shoot-out';
    const line = last.kind === 'super' ? `${mine.runs}/${mine.wkts} v ${theirs.runs}/${theirs.wkts}` : `${mine.sixesHit} six${mine.sixesHit === 1 ? '' : 'es'} to ${theirs.sixesHit}`;
    return { outcome: won ? 'win' : 'loss', text: `Tied on ${player.runs}. ${won ? 'You won' : 'You lost'} ${how}, ${line}`, tiebreak: last.kind };
  }
  const playerWon = player.runs > ai.runs;
  const chaser = second;
  const chaserWon = chaser.runs > first.runs;
  let margin;
  if (chaserWon) {
    const w = CFG.wickets - chaser.wkts;
    margin = `${w} wicket${w === 1 ? '' : 's'} (${chaser.ballsLeft} balls left)`;
  } else {
    const r = first.runs - chaser.runs;
    margin = `${r} run${r === 1 ? '' : 's'}`;
  }
  return { outcome: playerWon ? 'win' : 'loss', text: `${playerWon ? 'You won' : 'You lost'} by ${margin}`, margin };
}
