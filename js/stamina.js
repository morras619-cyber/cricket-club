// Stamina: how tired a batter or a bowler is. Everyone starts an innings on 100 (Innings.energy in match.js keeps it).
// A batter tires from hitting out (a power batter faster, an anchor slower) and rests on singles and dots; a bowler tires
// from every ball and from being hit, and rests while the others bowl. The effects are felt through ratings.js matchup.
import { CFG } from './config.js';
import { batTypeOf } from './heroes.js';

const S = CFG.stamina;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const FULL = 100;

// 0 (fresh) to 1 (spent): nothing until `from`, then growing
export const tiredness = e => clamp((S.from - (e ?? FULL)) / S.span, 0, 1);
export const isTired = e => tiredness(e) >= 0.5;

// what one ball does to the batter's energy: runs off the bat, and whether he swung and missed
export function batDrain(player, { runs = 0, missed = false } = {}) {
  const mul = S.batMul[batTypeOf(player)] ?? 1;
  const base = runs >= 6 ? S.bat.six : runs === 4 ? S.bat.four : runs > 0 && runs % 2 === 1 ? S.bat.single : runs > 0 ? 0 : missed ? S.bat.miss : S.bat.dot;
  return base > 0 ? base * mul : base;   // (a rest is the same for everyone)
}

// what one ball does to the bowler's energy: runs off the bat, and whether it was a wide or a no-ball
export function bowlDrain(player, { runs = 0, extra = false } = {}) {
  const mul = S.bowlMul[player?.bowl] ?? 1;
  return mul * (S.bowl.ball + (runs >= 6 ? S.bowl.six : runs === 4 ? S.bowl.four : 0) + (extra ? S.bowl.extra : 0));
}

// the effect numbers for a pair, 1 / 0 when both are fresh: { power, win, edgeP } to apply to ratings.js matchup's output
export function staminaEffect(batEnergy, bowlEnergy) {
  const tb = tiredness(batEnergy), tw = tiredness(bowlEnergy), E = S.effect;
  return {
    power: (1 - E.batPower * tb) * (1 + E.bowlPower * tw),
    win: (1 - E.batWin * tb) * (1 + E.bowlWin * tw),
    edgeP: E.batEdge * tb,
  };
}

// a tired bowler is slower: the factor on his speed
export const paceTired = e => 1 - S.effect.bowlPace * tiredness(e);
