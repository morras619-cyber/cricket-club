import { CFG } from './config.js';

const freshStint = () => ({ runs: 0, balls: 0, fours: 0, sixes: 0 });

export const oversText = balls => `${Math.floor(balls / 6)}.${balls % 6}`;

export class Innings {
  constructor(side, target = null) {
    this.side = side; // 'player' | 'ai' — who is batting
    this.target = target;
    this.runs = 0; this.wkts = 0; this.balls = 0;
    this.log = []; // per legal ball: '0' '1' '4' '6' 'W' ...
    // the batting hero's stints: each dismissal ends one
    this.stints = [];
    this.cur = freshStint();
    // the bowling hero's figures (run-outs aren't the bowler's wickets)
    this.bowler = { balls: 0, runs: 0, wkts: 0, dots: 0 };
  }
  get ballsLeft() { return CFG.balls - this.balls; }
  get need() { return this.target == null ? null : Math.max(0, this.target - this.runs); }
  get overs() { return `${Math.floor(this.balls / 6)}.${this.balls % 6}`; }

  extra(runs) { this.runs += runs; this.bowler.runs += runs; }

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
    if (wicket) { this.stints.push({ ...c, out: true }); this.cur = freshStint(); }
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
