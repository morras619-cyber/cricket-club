import { CFG } from './config.js';

// World axes for a delivery: x = lateral (+ is the off side for a right-hander),
// y = height, z = distance from the striker's stumps (bowler's stumps at z = 20).
export const RELEASE_Z = 18.8;
export const RELEASE_Y = 2.1;
export const CONTACT_Z = 1.3; // the batter meets the ball just in front of the popping crease
export const KEEPER_Z = -3;
export const STUMP_HALF = 0.15; // stump half-width plus ball radius
export const STUMP_TOP = 0.72;

export const LANES = [
  { id: 'wideoff', name: 'Wide off', x: 0.55 },
  { id: 'off', name: 'Off stump', x: 0.24 },
  { id: 'stumps', name: 'Stumps', x: 0.0 },
  { id: 'leg', name: 'Leg stump', x: -0.2 },
  { id: 'wideleg', name: 'Wide leg', x: -0.5 },
];

// bounce = distance from the batter where the ball pitches; h = height when it reaches the batter.
export const LENGTHS = [
  { id: 'bouncer', name: 'Bouncer', bounce: 10.5, h: 1.75 },
  { id: 'short', name: 'Short', bounce: 8, h: 1.25 },
  { id: 'good', name: 'Good length', bounce: 5.4, h: 0.8 },
  { id: 'full', name: 'Full', bounce: 2.8, h: 0.45 },
  { id: 'yorker', name: 'Yorker', bounce: 0.9, h: 0.12 },
  { id: 'fulltoss', name: 'Full toss', bounce: null, h: 0.85 },
];
export const lengthById = id => LENGTHS.find(l => l.id === id);
export const laneById = id => LANES.find(l => l.id === id);

// opts: { x (line at the stumps), length (id), kmh, move (seam/spin after bounce, m), swing (m), loop (arc) }
export function makeDelivery(opts) {
  const L = lengthById(opts.length) || LENGTHS[2];
  const bounce = opts.bounce !== undefined ? opts.bounce : L.bounce; // a swipe can pitch the ball anywhere
  const xt = opts.x;
  const h = opts.h ?? L.h;
  // sped up or slowed down from 120 km/h more than in proportion, so a 140 km/h quick and an 88 km/h
  // spinner feel clearly different (CFG.paceSpread 1 would be plain scaling)
  const v = (120 / 3.6) * CFG.paceScale * Math.pow(Math.max(40, opts.kmh) / 120, CFG.paceSpread) * (opts.flight || 1); // (flight: a spinner's ball hurried along)
  const rx = opts.rx ?? 0.3;
  const swing = opts.swing || 0;
  const loop = opts.loop ?? 0.5;
  const move = opts.move || 0;
  const d = { ...opts, lengthName: L.name, v, rx, xt, h };

  if (bounce == null) {
    const tz = z => (RELEASE_Z - z) / v;
    d.bounceT = null;
    d.pos = t => {
      const z = RELEASE_Z - v * t;
      const u = (RELEASE_Z - z) / RELEASE_Z;
      return {
        x: rx + (xt - rx) * u + swing * 4 * u * (1 - u),
        y: RELEASE_Y + (h - RELEASE_Y) * u + loop * 0.6 * u * (1 - u),
        z,
      };
    };
    d.timeAt = tz;
  } else {
    const zb = bounce;
    const xb = xt - move;
    const t1 = (RELEASE_Z - zb) / v;
    const v2 = v * 0.92;
    d.bounceT = t1;
    d.bounce = { x: xb, z: zb };
    d.pos = t => {
      if (t <= t1) {
        const u = t / t1;
        return {
          x: rx + (xb - rx) * u + swing * 4 * u * (1 - u),
          y: Math.max(0, RELEASE_Y * (1 - u) + loop * u * (1 - u)),
          z: RELEASE_Z - (RELEASE_Z - zb) * u,
        };
      }
      const s = (t - t1) * v2;
      const k = s / zb;
      return { x: xb + (xt - xb) * k, y: Math.max(0.03, h * k * (1.25 - 0.25 * k)), z: zb - s };
    };
    d.timeAt = z => (z >= zb ? (RELEASE_Z - z) / v : t1 + (zb - z) / v2);
  }
  d.tContact = d.timeAt(CONTACT_Z);
  d.tStumps = d.timeAt(0);
  d.tKeeper = d.timeAt(KEEPER_Z);
  const atStumps = d.pos(d.tStumps);
  d.onStumps = Math.abs(atStumps.x) < STUMP_HALF && atStumps.y < STUMP_TOP;
  d.atContact = d.pos(d.tContact);
  return d;
}
