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
