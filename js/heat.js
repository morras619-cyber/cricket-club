import { Charge } from './charge.js';
import { CFG } from './config.js';

// The heat between a batter and the bowler facing him. It starts when someone talks smack and it is answered (never by play
// alone), then builds on sledges, boundaries and beaten bats; when it is full the
// two want each other's wicket: the bowler bowls harder (a quick bowls faster, a spinner turns it more), the batter swings
// as hard as he can, missing more often, unless the ball is a good one, which he can block. A wicket settles the duel.
// Heat is kept for each pair, for the match.
export const FULL = 100, HOLD = 6, COOLED = 55;

// how much an event adds (a hot-headed player gains faster: his `fire`, 0.2 to 0.55)
const GAIN = { sledge: 22, six: 20, four: 14, beaten: 12, dot: 9, edge: 10 };
export const gainOf = (kind, fire = 0.3) => Math.round((GAIN[kind] || 0) * (0.85 + fire));

export const START = 30;

export class Duels {
  constructor() { this.map = new Map(); }
  key(a, b) { return `${a}|${b}`; }
  state(a, b) { const k = this.key(a, b); if (!this.map.has(k)) this.map.set(k, { on: false, heat: 0, hold: 0, fresh: false }); return this.map.get(k); }
  // a duel only exists once someone has talked smack and it was answered: nothing builds before that
  on(a, b) { return !!this.map.get(this.key(a, b))?.on; }
  heat(a, b) { const s = this.map.get(this.key(a, b)); return s?.on ? s.heat : 0; }
  // face-off: full, for a few balls
  hot(a, b) { const s = this.map.get(this.key(a, b)); return !!s && s.on && s.heat >= FULL && s.hold > 0; }
  // the smack talk that begins it (false if it is already on)
  start(a, b) {
    const s = this.state(a, b);
    if (s.on) return false;
    Object.assign(s, { on: true, heat: START, hold: 0, fresh: true });
    return true;
  }
  // heat added to a duel that is on; says whether this made it full
  add(a, b, n) {
    const s = this.state(a, b);
    if (!s.on) return false;
    const was = s.heat >= FULL;
    if (n > 0) s.fresh = true;
    s.heat = Math.max(0, Math.min(FULL, s.heat + n));
    if (!was && s.heat >= FULL) { s.hold = HOLD; return true; }
    return false;
  }
  // a ball is over: a full duel runs down, a quiet one cools a little (and fizzles out at nothing)
  ball(a, b) {
    const s = this.state(a, b);
    if (!s.on) return;
    if (s.heat >= FULL) { if (--s.hold <= 0) { s.heat = COOLED; s.hold = 0; } }
    else if (!s.fresh) { s.heat = Math.max(0, s.heat - 2); if (s.heat <= 0) s.on = false; }
    s.fresh = false;
  }
  // the wicket ends it
  settle(a, b) { const s = this.state(a, b); Object.assign(s, { on: false, heat: 0, hold: 0, fresh: false }); }
}

// A hot bowler: a quick bowls faster; a spinner turns it more and floats it a little
export function hotSpec(spec, spin) {
  const out = { ...spec };
  if (spin) { out.move = (out.move || 0) * 1.22; out.loop = (out.loop || 1) * 1.1; }
  else out.kmh = Math.min(168, (out.kmh || 135) * 1.08);
  return out;
}
// A hot batter, facing a ball: swinging hard (more lofted shots, more misses), but a good ball he can block
export const HOT_BAT = { sigma: 1.3, loft: 0.4, blockP: 0.55 };

// ======== counter-powers and the AI's hidden mind (kept in this file: the published game is at its file limit) ========
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
//   tornado is no longer 160 km/h nor halves the timing, shatter spares a Good contact, maya fools half as often, pinpoint is only Good,
//   gap finder's sure four only on a Perfect, showdown +7% instead of +15%, bouncer spares a Good contact (skied only below that),
//   googly / storm / hunt rattle him about half as much, cutter: he swings less early
// Steady Hands lifts the answerer's own timing to Good (a batter's shot, a bowler's release)
export const BRACE = { focusWindow: 0.5, focusSlow: 0.8, meteorLess: 2, tornadoKmh: 140, mayaFooled: 0.25, pinpointSigma: 1.3 };
// when the AI bowler answers your power with Steady Hands his ball is exactly where he wants it: your windows shrink
export const STEADY_SQUEEZE = 0.85;

// ---- the AI's mind ----
const FIRE_AT = { thunder: 'bat', mirror: 'bat', tornado: 'bowl', maya: 'bowl', shatter: 'bowl' };
export class Mind {
  constructor(rng, { gain = 3, start = 40 } = {}) {
    this.charge = new Charge(start);   // hidden: never shown (it starts a little warm, and fills faster than yours: it has one star to feed)
    this.gain = gain;
    this.rng = rng;
    this.counters = 0; this.fired = 0;
  }
  get value() { return this.charge.value; }

  // what happened on a ball for the AI side: its batter hit well or boundaries, its bowler a dot or a wicket, a wicket it lost
  earn({ batting, runs = 0, wicket = false, grade = null }) {
    const S = CFG.charge.sources, add = n => this.charge.add(n * this.gain, 'ai');
    if (batting) {
      if (wicket) { this.charge.wicketLost(); return; }
      if (grade === 'perfect') add(S.perfectBat);
      else if (grade === 'good') add(S.goodBat);
      if (runs === 4) add(S.four);
      if (runs >= 6) add(S.six);
    } else {
      if (wicket) add(S.wicket);
      else if (runs === 0) { add(S.dot); this.charge.dot(); }
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
    // two reasons, or one reason with the charge in hand, or the death
    return score >= 2 || (score >= 1 && this.value >= cost) || (ctx.ball >= 24 && this.value >= cost);
  }

  // Should it answer a power you fired? power: 'thunder'|'mirror'|'meteor'|'focus'|'tornado'|'maya'|'shatter'|'pinpoint'|... (a star's other powers too).
  // Returns a counter id or null (it pays for it itself).
  counter(power, ctx = {}) {
    const ids = affordable(this.value);
    if (!ids.length) return null;
    if (['luckybreak', 'readbowler'].includes(power)) return null;   // (nothing to answer: a free hit, or only a look at the ball)
    const big = ['thunder', 'meteor', 'tornado', 'shatter', 'showdown', 'bouncer'].includes(power);
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
