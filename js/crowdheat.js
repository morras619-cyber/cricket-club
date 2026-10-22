// How the match is going for the home crowd, from the last two overs: -1 (the visitors are hitting them apart, or
// the home side keeps losing wickets) to 1 (the home side is on top). 0 until there are six balls to judge by.
// `log` is an innings' per-ball record ('0'..'6', 'W'); `homeBatting` is whether the batting side is the home side.
export const RUNAWAY = -0.6;
export function heat(log, homeBatting) {
  const w = log.slice(-12);
  if (w.length < 6) return 0;
  let runs = 0, wkts = 0, bounds = 0;
  for (const r of w) { if (r === 'W') wkts++; else { runs += Number(r); if (r === '4' || r === '6') bounds++; } }
  const bat = Math.max(-1, Math.min(1, (runs / w.length * 6 - 8) / 6 - 0.6 * wkts + 0.05 * bounds));
  return homeBatting ? bat : -bat;
}
export const twoWickets = log => log.slice(-6).filter(r => r === 'W').length >= 2;
