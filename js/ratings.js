// What a rating means in a match. 75 is a solid regular; 64 a squad player; 94 a superstar.
// Every number a player has should be felt: a 94 hits it 100 m when he middles it, a 64 can
// clear the short side of the ground at best.
import { batTypeOf } from './heroes.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// how hard he hits: the ball's speed off the bat, 1 for a 75. A perfect loft carries about 62 m
// for a 64 (a six only over the short side), 71 m for a 75 and 100 m and more for a 94 (carry
// grows with the square of the speed)
export const hitStrength = bat => { const b = bat ?? 75; return clamp(1 + (b - 75) * (b > 75 ? 0.009 : 0.006), 0.85, 1.25); };

// your timing windows, batting: wider for a better batter, narrower against a better bowler
export const timingFor = bat => clamp(0.4 + (bat ?? 75) / 150, 0.7, 1.1);
export const bowlerSqueeze = bowlSkill => clamp(1 - ((bowlSkill ?? 75) - 75) / 300, 0.9, 1.08);

// the computer batting: how widely his timing strays (bigger = more mistimed). A 94 is
// clean almost every ball, a 64 mistimes plenty; a good bowler (yours) makes him mistime more
export const aiSpread = skill => clamp(1 + (75 - (skill ?? 75)) / 100, 0.92, 1.4);
export const bowlerTrouble = bowlSkill => clamp(1 + ((bowlSkill ?? 75) - 75) / 150, 0.85, 1.15);

// your bowler: a better one moves it more and bowls quicker
export const movementFor = bowlSkill => clamp(0.7 + (bowlSkill ?? 75) / 250, 0.85, 1.1);
export const paceFor = bowlSkill => clamp(0.95 + (bowlSkill ?? 75) / 1500, 0.97, 1.02);

// a fielding side: how fast its men get to the ball, from the side's average overall
export const fieldSpeed = avgOvr => clamp(1 + ((avgOvr ?? 72) - 72) / 120, 0.85, 1.15);

// ======== type matchups: what each batter and bowler type is good and bad against ========
// Every effect is scaled by the player's rating: a 93 gets all of his strength and only a sliver of his weakness, a 53 the other way
// round (strength 0.4 at 50 up to 1 at 95; weakness 1 at 50 down to 0.4 at 95).
const strengthOf = r => 0.4 + 0.6 * clamp(((r ?? 75) - 50) / 45, 0, 1);
const weaknessOf = r => 1 - 0.6 * clamp(((r ?? 75) - 50) / 45, 0, 1);
// the pitch: a bowler with seam, swing or turn wins on a pitch that gives it (f above 1), loses on one that does not
const exploit = (f, s, w) => (f > 1 ? 1 - 0.1 * s * clamp((f - 1) / 0.3, 0, 1) : 1 + 0.1 * w * clamp((1 - f) / 0.3, 0, 1));

// batter: { bat (rating), role... } as a player; bowler: a player; ctx: { feel (pitchFeel), ballNo, length }
// -> { win: his timing windows (1 = no change, below 1 favours the bowler), power: how hard he hits it, edgeP: an extra chance of an edge }
export function matchup(batter, bowler, ctx = {}) {
  const out = { win: 1, power: 1, edgeP: 0 };
  if (!batter || !bowler) return out;
  const type = batTypeOf(batter), bs = strengthOf(batter.bat), bw = weaknessOf(batter.bat);
  const rate = bowler.bowlSkill ?? 75, ws = strengthOf(rate), ww = weaknessOf(rate), q = clamp((rate - 60) / 30, 0, 1);
  const ball = ctx.ballNo || 1, f = ctx.feel || {};
  // the batter's type
  switch (type) {
    case 'power':
      out.power *= 1 + 0.08 * bs;
      if (bowler.bowl === 'swing' || bowler.bowl === 'leftpace') out.win *= 1 - 0.15 * bw * q;   // struggles against quality swing
      break;
    case 'tactical': out.win *= 1 + 0.05 * bs; out.power *= 1 - 0.04 * bw; break;
    case 'touch':
      out.win *= 1 + 0.08 * bs;
      if (ctx.length === 'short' || ctx.length === 'bouncer') out.win *= 1 - 0.12 * bw;   // hates the short ball
      break;
    case 'finisher':
      if (ball >= 25) { out.win *= 1 + 0.1 * bs; out.power *= 1 + 0.05 * bs; }
      else if (ball <= 8) out.win *= 1 - 0.1 * bw;                                         // a slow starter
      break;
    case 'opener':
      if (ball <= 12) out.power *= 1 + 0.06 * bs;
      if (ball <= 8) out.edgeP += 0.06 * bw;                                               // loses wickets early
      break;
    case 'anchor': out.win *= 1 + 0.04 * bs; out.power *= 1 - 0.06 * bw; break;
    case 'keeper': out.win *= 1 + 0.04 * bs; out.power *= 1 - 0.05 * bw; break;
    default: break;
  }
  // the bowler's type
  switch (bowler.bowl) {
    case 'express': out.win *= 1 - 0.04 * ws; if (ball >= 25) out.win *= 1 + 0.05 * ww; break;   // tires at the death
    case 'swing': out.win *= exploit(f.swing ?? 1, ws, ww); break;
    case 'seam': out.win *= exploit(f.seam ?? 1, ws, ww); break;
    case 'leftpace': out.win *= 1 - 0.04 * ws; break;
    case 'offspin': out.win *= exploit(f.turn ?? 1, ws, ww); break;
    case 'legspin': out.win *= exploit(f.turn ?? 1, ws, ww) * (1 - 0.03 * ws); break;
    default: break;
  }
  return out;
}
