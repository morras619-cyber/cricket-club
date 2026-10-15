import { CFG } from './config.js';

const freshStint = (p = null) => ({ id: p?.id || null, name: p?.name || null, runs: 0, balls: 0, fours: 0, sixes: 0 });
const freshFig = p => ({ id: p.id, name: p.name, short: p.short || p.name.split(' ').slice(-1)[0], type: p.bowl || null, balls: 0, runs: 0, wkts: 0, dots: 0 });

export const oversText = balls => `${Math.floor(balls / 6)}.${balls % 6}`;

export class Innings {
  constructor(side, target = null) {
    this.side = side; // 'player' | 'ai' — who is batting
    this.target = target;
    this.runs = 0; this.wkts = 0; this.balls = 0;
    this.log = []; // per legal ball: '0' '1' '4' '6' 'W' ...
    // batting stints, one per batter: each dismissal ends one and the next batter comes in
    this.stints = [];
    this.cur = freshStint();
    // the whole attack's figures (run-outs aren't the bowler's wickets) and each bowler's own
    this.bowler = { balls: 0, runs: 0, wkts: 0, dots: 0 };
    this.figs = {};
    this.curBowler = null;
  }

  // The batter now on strike. Only valid at the start of a stint.
  setBatter(p) { if (p && this.cur.balls === 0) Object.assign(this.cur, { id: p.id, name: p.name }); }
  // The bowler of the current over.
  setBowler(p) {
    if (!p) return;
    if (!this.figs[p.id]) this.figs[p.id] = freshFig(p);
    this.curBowler = p.id;
  }
  // How many overs each bowler has started (for the over limit).
  oversBy() {
    const o = {};
    for (const f of Object.values(this.figs)) o[f.id] = Math.ceil(f.balls / 6);
    return o;
  }
  get ballsLeft() { return CFG.balls - this.balls; }
  get need() { return this.target == null ? null : Math.max(0, this.target - this.runs); }
  get overs() { return `${Math.floor(this.balls / 6)}.${this.balls % 6}`; }

  extra(runs) {
    this.runs += runs; this.bowler.runs += runs;
    if (this.curBowler) this.figs[this.curBowler].runs += runs;
  }

  ball({ runs = 0, wicket = false, runOut = false }) {
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
    if (wicket) { this.stints.push({ ...c, out: true, how: runOut ? 'run out' : f ? `b ${f.short}` : 'out' }); this.cur = freshStint(); }
  }

  // Every stint, including the unbeaten one at the end.
  battingCard() {
    const list = [...this.stints];
    if (this.cur.balls > 0 || list.length === 0) list.push({ ...this.cur, out: false });
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
    return this.balls >= CFG.balls || this.wkts >= CFG.wickets || (this.target != null && this.runs >= this.target);
  }
}

// Result of a two-innings match from the player's point of view.
export function matchResult(first, second) {
  const player = first.side === 'player' ? first : second;
  const ai = first.side === 'player' ? second : first;
  if (player.runs === ai.runs) return { outcome: 'tie', text: 'Match tied!' };
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
