// How a pitch plays at this moment of the match: the multipliers js/game.js applies to a delivery and to batting.
// grounds.js gives each pitch its starting numbers (and how it wears); this adds the match's progress.
//   swing / seam / turn: movement in the air / off the pitch / spin     kmh: pace bowlers' speed
//   bounce: height of the ball at the batter     skid: how much pace it keeps after pitching (<1: it holds up, arrives late)
//   uneven: random variation of bounce and pace off the pitch (a cracked pitch)     bat / ai: timing room; the AI's spread
//   carry: speed of the ball off the bat     roll: how far a ground shot runs     field: fielders' speed
//   wear: { turn, seam, swing, bounce } added by the end of the match (60 balls): spin grips, seam flattens, the new ball ages
//   dew: in the second innings the ball skids on, swing dies, batting eases, as the night goes on
export const PITCH_BASE = { swing: 1, seam: 1, turn: 1, kmh: 1, bounce: 1, skid: 1, uneven: 0, bat: 1, ai: 1, carry: 1, roll: 1, field: 1 };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// P: a ground's pitch. progress: { wear (0..1 over the whole match), innings (1 or 2), balls (balls bowled in this innings) }
export function pitchFeel(P, { wear = 0, innings = 1, balls = 0 } = {}) {
  const f = { ...PITCH_BASE };
  for (const k of Object.keys(PITCH_BASE)) if (typeof P?.[k] === 'number') f[k] = P[k];
  const w = clamp(wear, 0, 1);
  for (const [k, d] of Object.entries(P?.wear || {})) f[k] = Math.max(0.2, f[k] + d * w);
  if (P?.dew && innings >= 2) {
    const p = clamp(balls / 30, 0, 1);
    f.swing *= 1 - 0.4 * p; f.skid *= 1 + 0.1 * p; f.bat *= 1 + 0.1 * p; f.roll *= 1 + 0.15 * p;
  }
  return f;
}
