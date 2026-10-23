// The heat between a batter and the bowler facing him. It builds on sledges, boundaries and beaten bats; when it is full the
// two want each other's wicket: the bowler bowls harder (a quick bowls faster, a spinner turns it more), the batter swings
// as hard as he can, missing more often, unless the ball is a good one, which he can block. A wicket settles the duel.
// Heat is kept for each pair, for the match.
export const FULL = 100, HOLD = 6, COOLED = 55;

// how much an event adds (a hot-headed player gains faster: his `fire`, 0.2 to 0.55)
const GAIN = { sledge: 22, six: 20, four: 14, beaten: 12, dot: 9, edge: 10 };
export const gainOf = (kind, fire = 0.3) => Math.round((GAIN[kind] || 0) * (0.85 + fire));

export class Duels {
  constructor() { this.map = new Map(); }
  key(a, b) { return `${a}|${b}`; }
  state(a, b) { const k = this.key(a, b); if (!this.map.has(k)) this.map.set(k, { heat: 0, hold: 0, fresh: false }); return this.map.get(k); }
  heat(a, b) { return this.map.get(this.key(a, b))?.heat || 0; }
  // face-off: full, for a few balls
  hot(a, b) { const s = this.map.get(this.key(a, b)); return !!s && s.heat >= FULL && s.hold > 0; }
  // heat added; says whether this made it full
  add(a, b, n) {
    const s = this.state(a, b), was = s.heat >= FULL;
    if (n > 0) s.fresh = true;
    s.heat = Math.max(0, Math.min(FULL, s.heat + n));
    if (!was && s.heat >= FULL) { s.hold = HOLD; return true; }
    return false;
  }
  // a ball is over: a full duel runs down, a quiet one cools a little
  ball(a, b) {
    const s = this.state(a, b);
    if (s.heat >= FULL) { if (--s.hold <= 0) { s.heat = COOLED; s.hold = 0; } }
    else if (!s.fresh) s.heat = Math.max(0, s.heat - 2);
    s.fresh = false;
  }
  // the wicket ends it
  settle(a, b) { const s = this.state(a, b); s.heat = 0; s.hold = 0; s.fresh = false; }
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
