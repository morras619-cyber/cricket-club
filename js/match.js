import { CFG } from './config.js';

export class Innings {
  constructor(side, target = null) {
    this.side = side; // 'player' | 'ai' — who is batting
    this.target = target;
    this.runs = 0; this.wkts = 0; this.balls = 0;
    this.log = []; // per legal ball: '0' '1' '4' '6' 'W' ...
  }
  get ballsLeft() { return CFG.balls - this.balls; }
  get need() { return this.target == null ? null : Math.max(0, this.target - this.runs); }
  get overs() { return `${Math.floor(this.balls / 6)}.${this.balls % 6}`; }

  extra(runs) { this.runs += runs; }

  ball({ runs = 0, wicket = false }) {
    this.balls++;
    this.runs += runs;
    if (wicket) this.wkts++;
    this.log.push(wicket ? 'W' : String(runs));
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
