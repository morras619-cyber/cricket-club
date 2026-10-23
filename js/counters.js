// Counter-powers and the AI's hidden mind. When a power is fired at you (a star's power, or a Spark) you may answer it, if you have the
// charge: Brace halves what the power does to you, Steady Hands guarantees you at least a Good timing for that ball. The AI has the same
// two answers, paid from a charge of its own that you never see; it also decides for itself when to fire its star's power, and when to
// keep some charge back to answer yours. Pure logic: js/game.js applies the effects.
import { Charge } from './charge.js';
import { CFG } from './config.js';

export const COUNTERS = {
  brace: { id: 'brace', name: 'Brace', cost: 20, desc: 'Halves what the power does to you' },
  steady: { id: 'steady', name: 'Steady Hands', cost: 25, desc: 'A Good timing is guaranteed' },
};
export const COUNTER_IDS = Object.keys(COUNTERS);
export const COUNTER_WINDOW_MS = 4000;
export const cheapest = Math.min(...Object.values(COUNTERS).map(c => c.cost));

// the counters a charge can afford
export const affordable = value => COUNTER_IDS.filter(id => value >= COUNTERS[id].cost);

// ---- what each answer does (game.js reads these) ----
// Brace halves the power on whoever it is aimed at:
//   thunder (six) only on a Perfect, mirror's forced four only on a Perfect, meteor two runs less, focus half its window and slow-down,
//   tornado is no longer 160 km/h nor halves the timing, shatter spares a Good contact, maya fools half as often, pinpoint is only Good
// Steady Hands lifts the answerer's own timing to Good (a batter's shot, a bowler's release)
export const BRACE = { focusWindow: 0.5, focusSlow: 0.8, meteorLess: 2, tornadoKmh: 140, mayaFooled: 0.25, pinpointSigma: 1.3 };
// when the AI bowler answers your power with Steady Hands his ball is exactly where he wants it: your windows shrink
export const STEADY_SQUEEZE = 0.85;

// ---- the AI's mind ----
const FIRE_AT = { thunder: 'bat', mirror: 'bat', tornado: 'bowl', maya: 'bowl', shatter: 'bowl' };
export class Mind {
  constructor(rng) {
    this.charge = new Charge(0);   // hidden: never shown
    this.rng = rng;
    this.counters = 0; this.fired = 0;
  }
  get value() { return this.charge.value; }

  // what happened on a ball for the AI side: its batter hit well or boundaries, its bowler a dot or a wicket, a wicket it lost
  earn({ batting, runs = 0, wicket = false, grade = null }) {
    const S = CFG.charge.sources;
    if (batting) {
      if (wicket) { this.charge.wicketLost(); return; }
      if (grade === 'perfect') this.charge.add(S.perfectBat, 'ai');
      else if (grade === 'good') this.charge.add(S.goodBat, 'ai');
      if (runs === 4) this.charge.add(S.four, 'ai');
      if (runs >= 6) this.charge.add(S.six, 'ai');
    } else {
      if (wicket) this.charge.add(S.wicket, 'ai');
      else if (runs === 0) { this.charge.add(S.dot, 'ai'); this.charge.dot(); }
    }
  }

  // how much it thinks you have: it reads your body language, so it is close but not exact
  guess(yourCharge) { return yourCharge + this.rng.range(-15, 15); }

  // Should it fire its star's power now? ctx: { kind: 'thunder'|'tornado'..., cost, ball, balls, chasing, needRate, lastRuns, setBat, yourCharge, wicketsLeft }
  wantsToFire(ctx) {
    const cost = ctx.cost;
    if (this.value < cost) return false;
    const finale = ctx.ball >= CFG.charge.finaleFrom;
    // keep an answer in reserve when you look able to fire a power, unless the end is near
    const youCouldFire = this.guess(ctx.yourCharge) >= 50;
    if (youCouldFire && this.value - cost < cheapest && !finale) return false;
    let score = 0;
    if (ctx.ball >= 19) score++;
    if (finale) score++;
    if (ctx.lastRuns >= 4) score++;            // answering a boundary
    if (ctx.setBat) score++;                  // a batter who has got in
    if (ctx.pressure) score++;                // the AI is behind the rate (batting) or you are cruising (bowling)
    if (ctx.wicketsLeft != null && ctx.wicketsLeft <= 1) score++;
    return score >= 2 || (ctx.ball >= 27 && this.value >= cost);
  }

  // Should it answer a power you fired? power: 'thunder'|'mirror'|'meteor'|'focus'|'tornado'|'maya'|'shatter'|'pinpoint'.
  // Returns a counter id or null (it pays for it itself).
  counter(power, ctx = {}) {
    const ids = affordable(this.value);
    if (!ids.length) return null;
    const big = ['thunder', 'meteor', 'tornado', 'shatter'].includes(power);
    const cheap = ['focus', 'pinpoint'].includes(power);
    // a Spark is worth answering only from a full tank; a big power nearly always
    if (cheap && this.value < 50) return null;
    if (!big && !cheap && !this.rng.chance(0.65)) return null;
    if (big && !this.rng.chance(0.85)) return null;
    // a batter whose wicket is on the line takes Steady Hands; otherwise Brace is cheaper and covers every power
    const wicketOnLine = ['tornado', 'shatter'].includes(power) && (ctx.wicketsLeft ?? 3) <= 2;
    const pick = wicketOnLine && ids.includes('steady') ? 'steady' : ids.includes('brace') ? 'brace' : ids[0];
    this.charge.spend(COUNTERS[pick].cost, 0, 'counter');
    this.counters++;
    return pick;
  }

  pay(cost, ball) { return this.charge.spend(cost, ball, 'power'); }
}
