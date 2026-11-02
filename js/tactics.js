// Bowling tactics: the one-swipe delivery gesture, reading the batter, and setup combos. Pure functions.

import { BOWL_TYPES } from './squads.js';

export const LENGTH_ORDER = ['bouncer', 'short', 'good', 'full', 'yorker', 'fulltoss'];
export const LENGTH_LABEL = { bouncer: 'Bouncer', short: 'Short', good: 'Good length', full: 'Full', yorker: 'Yorker', fulltoss: 'Full toss' };

// Swipe distance up the screen (px at an 844 px tall screen) → length band and where the ball pitches.
const BANDS = [
  { id: 'bouncer', from: 60, to: 130, b0: 11.5, b1: 9.6 },
  { id: 'short', from: 130, to: 190, b0: 9.6, b1: 7.0 },
  { id: 'good', from: 190, to: 260, b0: 7.0, b1: 4.3 },
  { id: 'full', from: 260, to: 320, b0: 4.3, b1: 1.9 },
  { id: 'yorker', from: 320, to: 370, b0: 1.9, b1: 0.7 },
];
export const BOUNCE_RANGES = Object.fromEntries(BANDS.map(b => [b.id, [b.b1, b.b0]]));
const H_TABLE = [[0.7, 0.1], [0.9, 0.12], [2.8, 0.45], [5.4, 0.8], [8, 1.25], [10.5, 1.75], [11.5, 1.9]];

export function heightForBounce(b) {
  if (b == null) return 0.85;
  for (let i = 1; i < H_TABLE.length; i++) {
    const [b0, h0] = H_TABLE[i - 1], [b1, h1] = H_TABLE[i];
    if (b <= b1) return h0 + (h1 - h0) * Math.max(0, (b - b0) / (b1 - b0));
  }
  return 1.9;
}

export function lengthForBounce(b) {
  if (b == null) return 'fulltoss';
  const band = BANDS.find(x => b <= x.b0 && b >= x.b1);
  if (band) return band.id;
  return b > 11.5 ? 'bouncer' : 'yorker';
}

export const LANE_RANGES = { wideoff: [0.4, 0.85], off: [0.1, 0.4], stumps: [-0.1, 0.1], leg: [-0.35, -0.1], wideleg: [-0.85, -0.35] };
export function laneFor(x) {
  if (x >= 0.4) return 'wideoff';
  if (x >= 0.1) return 'off';
  if (x > -0.1) return 'stumps';
  if (x > -0.35) return 'leg';
  return 'wideleg';
}

// Pace bands on the normalised flick speed p (1.0 ≈ 1.4 px/ms on an 844 px screen).
export const PACE = { slower: 0.45, good: 0.7, perfect: 1.05, spray: 1.4 };
export function paceGrade(p) {
  if (p < PACE.slower) return 'slower';
  if (p < PACE.good) return 'good';
  if (p <= PACE.perfect) return 'perfect';
  if (p <= PACE.spray) return 'loose';
  return 'bad';
}

// points: [{x, y, t}] in screen px / ms, first = touch down. kind: 'pace' | 'spin'. scale = screenHeight / 844.
// The bowling camera looks down the pitch from behind the bowler, so screen-left is the off side (+x).
export function gestureToDelivery(points, kind, scale = 1) {
  if (!points || points.length < 2) return null;
  const a = points[0], z = points[points.length - 1];
  const up = (a.y - z.y) / scale;
  if (up < 60) return null;
  const dx = (z.x - a.x) / scale;

  let length, bounce;
  const band = BANDS.find(b => up < b.to);
  if (band) {
    const t = Math.max(0, (up - band.from) / (band.to - band.from));
    length = band.id; bounce = band.b0 + (band.b1 - band.b0) * t;
  } else { length = 'fulltoss'; bounce = null; }
  const x = Math.max(-0.75, Math.min(0.75, -dx * 0.0036));

  // curve: the furthest the finger strayed from the straight line, signed (+ = bulged to the right)
  const cx = z.x - a.x, cy = z.y - a.y, len = Math.hypot(cx, cy) || 1;
  let dev = 0;
  for (const p of points) {
    const cross = (cx * (p.y - a.y) - cy * (p.x - a.x)) / len;
    if (Math.abs(cross) > Math.abs(dev)) dev = cross;
  }
  const curve = dev / len;
  const mag = Math.max(0, Math.min(1, (Math.abs(curve) - 0.04) / 0.25));
  const lateWorld = mag > 0.05 ? Math.sign(curve) : 0; // bulge right → ball moves late toward screen-left (off side)

  // speed over the final flick
  const end = z.t;
  let i = points.length - 1;
  while (i > 0 && end - points[i - 1].t <= 160) i--;
  let dist = 0;
  for (let k = i + 1; k < points.length; k++) dist += Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y);
  const span = Math.max(16, end - points[i].t);
  const p = (dist / scale) / span / 1.4;
  const band2 = paceGrade(p);
  const slower = band2 === 'slower';
  const grade = slower ? 'good' : band2;
  const k = Math.max(0, Math.min(1, (p - PACE.slower) / (PACE.perfect - PACE.slower)));

  const m = mag * 0.3;
  let kmh, swing, move, loop, type;
  const T = BOWL_TYPES[kind];
  if (T) {
    // a real bowler type: its own speed range, and the curve picks the stock ball or the variation
    kmh = T.kmh[0] + (T.kmh[1] - T.kmh[0]) * k;
    if (T.spin) {
      const stockDir = Math.sign(T.turn); // + = leg-break direction (turns toward the off side)
      move = lateWorld * Math.max(m * 1.4, mag > 0.05 ? Math.abs(T.turn) * 0.6 : 0); swing = -lateWorld * m * 0.3; loop = 1.3;
      type = lateWorld === 0 ? T.stock[0] : lateWorld === stockDir ? T.stock[0] : T.variation;
      if (lateWorld === 0) move = T.turn * 0.35;
      if (type === 'Arm ball') { move = 0.02; kmh += 6; loop = 0.9; }
      if (type === 'Googly') loop = 1.5;
    } else {
      swing = -lateWorld * m * 0.9 * (T.swing / 0.2); move = lateWorld * m * 0.3 * (T.seam / 0.07); loop = 0.4;
      type = lateWorld > 0 ? (T.swing >= T.seam ? 'Outswinger' : 'Leg-cutter') : lateWorld < 0 ? (T.swing >= T.seam ? 'Inswinger' : 'Off-cutter') : T.left ? 'Angled across' : 'Seam up';
    }
    if (slower) { kmh = T.kmh[0] * 0.8; loop = 1.1; type = T.spin ? 'Floater' : T.variation; }
    return { x, length, bounce, h: heightForBounce(bounce), kmh, swing, move, loop, type, speedP: p, grade, slower, lateWorld, mag, curve, rx: T.left ? -0.3 : 0.3 };
  }
  if (kind === 'spin') {
    kmh = 74 + 16 * k;
    move = lateWorld * m * 1.4; swing = -lateWorld * m * 0.3; loop = 1.3;
    type = lateWorld > 0 ? 'Leg-break' : lateWorld < 0 ? 'Off-break' : 'Arm ball';
  } else {
    kmh = 126 + 24 * k;
    swing = -lateWorld * m * 0.9; move = lateWorld * m * 0.3; loop = 0.4;
    type = lateWorld > 0 ? 'Outswinger' : lateWorld < 0 ? 'Inswinger' : 'Seam up';
  }
  if (slower) { kmh = (kind === 'spin' ? 74 : 126) * 0.8; loop = 1.1; type = kind === 'spin' ? 'Floater' : 'Slower ball'; }
  return { x, length, bounce, h: heightForBounce(bounce), kmh, swing, move, loop, type, speedP: p, grade, slower, lateWorld, mag, curve };
}

// What the batter thinks is coming. Batters expect the bowler to repeat himself; some bluff.
export function planExpectation(history, profile, rng) {
  let expect;
  const r = rng.next();
  if (history.length && r < 0.45) expect = history[history.length - 1].length;
  else if (history.length > 1 && r < 0.7) expect = history[history.length - 2].length;
  else expect = rng.pick(['short', 'good', 'full', 'good', 'yorker']);
  const honest = rng.chance(profile.honesty);
  const shown = honest ? expect : rng.pick(LENGTH_ORDER.slice(0, 5).filter(l => l !== expect));
  return { expect, shown, honest };
}

const MOOD = { rattled: { sigma: 1.3, edge: 0.1, loft: 0 }, fired: { sigma: 0.85, edge: 0, loft: 0.2 } };

// d: { length, lane, lateWorld, mag, slower, after }. history: previous deliveries (oldest first).
export function deliveryMods(d, history, expect, profile, mood) {
  const m = { sigmaMul: 1, loftAdd: 0, bias: 0, edgeBoost: 0, tags: [], combo: null };
  const prev = history[history.length - 1], prev2 = history[history.length - 2];
  // a combo works once; the batter is wise to it for the next 3 balls
  const fresh = id => !history.slice(-3).some(h => h.combo === id);

  if (expect) {
    const gap = Math.abs(LENGTH_ORDER.indexOf(expect) - LENGTH_ORDER.indexOf(d.length));
    if (gap === 0) { m.sigmaMul *= 0.75; m.tags.push({ id: 'read', label: 'HE READ IT!', charge: 0 }); }
    else if (gap >= 2) { m.sigmaMul *= 1.3; m.tags.push({ id: 'surprise', label: 'SURPRISE!', charge: 4 }); }
  }
  if (profile?.weak && profile.weak.lengths.includes(d.length) && (!profile.weak.lanes || profile.weak.lanes.includes(d.lane))) {
    if (history.slice(-2).some(h => h.weak)) m.tags.push({ id: 'waiting', label: 'HE\'S WAITING FOR IT', charge: 0 });
    else { m.sigmaMul *= 1.35; m.edgeBoost += 0.15; m.weak = true; m.tags.push({ id: 'weak', label: 'WEAK SPOT!', charge: 5 }); }
  }
  if (prev && ['bouncer', 'short'].includes(prev.length) && ['full', 'yorker'].includes(d.length) && fresh('setup')) {
    m.sigmaMul *= 1.5; m.combo = 'setup'; m.tags.push({ id: 'setup', label: 'SETUP!', charge: 10 });
  } else if (prev && prev.lateWorld && d.lateWorld && prev.lateWorld !== d.lateWorld && prev.mag > 0.3 && d.mag > 0.3 && fresh('swingtrap')) {
    m.sigmaMul *= 1.3; m.edgeBoost += 0.2; m.combo = 'swingtrap'; m.tags.push({ id: 'swingtrap', label: 'SWING TRAP!', charge: 8 });
  } else if (d.slower && prev && prev2 && !prev.slower && !prev2.slower && fresh('changeup')) {
    m.sigmaMul *= 1.4; m.bias -= 70; m.loftAdd += 0.15; m.combo = 'changeup'; m.tags.push({ id: 'changeup', label: 'CHANGE-UP!', charge: 8 });
  } else if (prev && prev2 && prev2.length === d.length && prev.length !== d.length) {
    m.sigmaMul *= 0.8; m.tags.push({ id: 'pattern', label: 'PATTERN SPOTTED', charge: 0 });
  }
  const late = Math.abs(d.after || 0);
  if (late > 0.04) { m.sigmaMul *= 1 + 1.2 * late; m.edgeBoost += 0.35 * late; }
  const md = mood && MOOD[mood.state];
  if (md) { m.sigmaMul *= md.sigma; m.edgeBoost += md.edge; m.loftAdd += md.loft; }
  m.sigmaMul = Math.min(2.6, m.sigmaMul);
  return m;
}

// Fielding position name from where a fielder stands (origin = striker's stumps, +y toward the bowler, +x off side).
export function positionName(x, y) {
  const r = Math.hypot(x, y);
  const a = Math.abs(Math.atan2(x, y)) * 180 / Math.PI;
  const off = x >= 0;
  const deep = r > 38;
  if (a < 22) return off ? (deep ? 'Long-off' : 'Mid-off') : (deep ? 'Long-on' : 'Mid-on');
  if (a < 62) return off ? (deep ? 'Deep cover' : 'Cover') : (deep ? 'Deep mid-wicket' : 'Mid-wicket');
  if (a < 100) return off ? (deep ? 'Deep point' : 'Point') : (deep ? 'Deep square leg' : 'Square leg');
  if (a < 140) {
    if (r < 12) return off ? 'Gully' : 'Leg gully';
    return off ? (deep ? 'Third man' : 'Backward point') : (deep ? 'Fine leg' : 'Backward square');
  }
  if (r < 8) return off ? 'Slip' : 'Leg slip';
  return off ? 'Third man' : 'Fine leg';
}
