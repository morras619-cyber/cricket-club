// Batting: timing grades, swipe → shot, and contact resolution. Pure functions.

// lateMs: how late a swing can still meet the ball. The ball is past the stumps (and the batter) a moment after it reaches his bat, and later than that it is behind him:
// a swing 160 ms late cannot hit it (lateMs, from the ball's own flight: lateReach). A hair later than that, on the off side, is a thin edge.
export function gradeTiming(errMs, w, offSideBall = true, lateMs = Infinity) {
  const a = Math.abs(errMs);
  if (errMs > 0 && a > lateMs) return a <= lateMs + 35 && offSideBall ? 'edge' : 'miss';
  if (a <= w.perfect) return 'perfect';
  if (a <= w.good) return 'good';
  if (a <= w.okay) return errMs < 0 ? 'early' : 'late';
  if (errMs > 0 && a <= w.edge && offSideBall) return 'edge';
  return 'miss';
}
// Whether the bat can physically reach the ball at the moment of a swing (t, seconds on the delivery's clock): the ball's position then against where it meets the bat (depth,
// sideways and height together), within a bat's reach. The timing grades are wider than this on purpose (an early or late swing is a weak shot, not a miss); lateReach below is
// the hard edge for a swing that is too late. Anything not a number cannot hit.
export const BAT_REACH = 0.85;
export function isBallReachableAtSwing(d, t, reach = BAT_REACH) {
  if (typeof d?.pos !== 'function' || !d.atContact || !Number.isFinite(t)) return false;
  const p = d.pos(t), c = d.atContact;
  if (![p?.x, p?.y, p?.z, c.x, c.y, c.z].every(Number.isFinite)) return false;
  return Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) <= reach;
}
// how late (ms) a swing can still reach the ball: it has gone past the stumps, and a little more (the bat's follow-through)
export const lateReach = d => (d && d.tStumps != null && d.tContact != null ? (d.tStumps - d.tContact) * 1000 + 25 : Infinity);

// Screen swipe (px, y down) → shot. angle: 0 = straight back past the bowler,
// +π/2 = square on the off side, −π/2 = square on the leg side, ±π = straight behind
// (over the keeper). Every direction is a shot: swiping down plays behind the wicket.
// loft: the player's GROUND / LOFT choice; null (the tutorial) = a long swipe lofts it.
export function swipeToShot(dx, dy, loftPx = 110, loft = null) {
  const len = Math.hypot(dx, dy);
  if (len < 28) return { kind: 'block', angle: 0, loft: false, len };
  const angle = Math.atan2(dx, -dy);
  return { kind: 'drive', angle, loft: loft ?? len > loftPx, len };
}

// Where the swipe was aimed: the direction of its fastest stretch (the flick itself), at the length of the whole swipe. The straight line from where the finger first
// touched to where it lifted bends the shot away from the flick whenever the swipe starts with a rest or a wobble or drifts sideways as the finger comes off; the flick
// is the part the player means. path: [{ x, y, t }] oldest first. Falls back to the whole swipe when no stretch is long and quick enough to read.
export function aimVector(path, x0, y0, x, y, tUp, minPx = 28) {
  const whole = { dx: x - x0, dy: y - y0 }, wl = Math.hypot(whole.dx, whole.dy);
  if (!path || path.length < 3 || wl < minPx) return whole;
  let best = null;
  for (let i = 0; i < path.length - 1; i++) {
    // the shortest stretch from i that spans at least 24 ms and 12 px
    for (let j = i + 1; j < path.length; j++) {
      const dt = path[j].t - path[i].t, dx = path[j].x - path[i].x, dy = path[j].y - path[i].y, len = Math.hypot(dx, dy);
      if (dt >= 24 && len >= 12) { const v = len / dt; if (!best || v > best.v) best = { v, dx, dy, len }; break; }
    }
  }
  if (!best) return whole;
  return { dx: best.dx / best.len * wl, dy: best.dy / best.len * wl };
}

// how far (radians) from the ball's natural direction a shot can be played: a ball on the left is hit to the left, a straight one anywhere about the straight
export const HIT_ARC = 0.8, HIT_ARC_SHORT = 1.1;
// going round the ball's own side (a cut to a ball outside off, a pull or hook to one on the pads) is allowed this far past its natural shot; a cross-bat pull of a short ball outside off carries this much risk
const ROUND_ARC = 1.7, CROSS_MIS = 0.55;
const POWER = { perfect: 1, good: 0.85, early: 0.5, late: 0.5 };
// how far the ball strays from the swipe's direction (a standard deviation, radians), by the timing grade: a clean contact goes where the finger went
const SPREAD = { perfect: 0.025, good: 0.07, early: 0.16, late: 0.16 };

// Lateral ball velocity at contact (positive = off side, negative = leg side).
// Sample the delivery on either side of contact so swing and post-bounce seam/spin
// are both represented, rather than relying on the initial line at release.
export function lateralVelocityAtContact(d) {
  if (typeof d?.pos !== 'function' || !Number.isFinite(d.tContact)) return 0;
  const dt = 0.01;
  const before = d.pos(Math.max(0, d.tContact - dt));
  const after = d.pos(d.tContact + dt);
  if (!Number.isFinite(before?.x) || !Number.isFinite(after?.x)) return 0;
  return (after.x - before.x) / (2 * dt);
}

// ---------- the line of the ball, and the shot that goes with it ----------
// Every ball has a way it is best played. A ball outside off is driven or cut to the off side, a straight one goes down the ground, one on the pads is flicked
// to leg; a ball still swinging or turning across is played where it is heading; a short one is cut if it is wide and pulled if it is not. A shot that goes
// the way the ball goes is struck cleanly and runs away; a shot against the line loses its power, strays, and is the one that finds the edge or the stumps.
// How much a mistake costs depends on how good the ball is: the more it moves and the faster it comes, the harder it is to play against its line.
export function idealAngle(d) {
  const x = (d.atContact?.x ?? d.xt ?? 0) + 0.08 * lateralVelocityAtContact(d);
  if (d.length === 'short' || d.length === 'bouncer') return x > 0.22 ? 1.2 : x < -0.05 ? -1.15 : -0.9;
  return Math.max(-1.15, Math.min(1.15, x * 1.9));
}
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// q: 1 = with the line, 0 = right against it; mis = 1 - q. A clean zone of 0.45 rad (about 26 degrees) either side, and none past 1.2.
export function lineMatch(angle, d) {
  const ideal = idealAngle(d), diff = Math.abs(wrap(angle - ideal));
  const q = Math.max(0, Math.min(1, 1 - (diff - 0.45) / 0.75));
  return { ideal, diff, q, mis: 1 - q };
}
// 0.7 (a gentle ball) to 1.7 (a swinging or turning one, quick): how hard the ball is to play against its line
export function ballDifficulty(d) {
  const mv = Math.max(0, Math.min(1, ((Math.abs(d.swing) || 0) + 1.5 * (Math.abs(d.move) || 0)) / 0.7));
  const pace = Math.max(0, Math.min(1, ((d.kmh || 120) - 105) / 50));
  return 0.7 + 0.7 * mv + 0.3 * pace;
}

// fx: { thunder, mirror, tornado, shatter }
// strength: how hard the batter hits (ratings.js hitStrength), scales the ball's speed off the bat
export function resolveContact({ grade, errMs = 0, shot, d, fx = {}, rng, strength = 1 }) {
  if (!shot || shot.kind === 'leave') {
    return { outcome: d.onStumps ? 'bowled' : 'leave', grade: 'leave' };
  }
  if (grade === 'miss') return { outcome: d.onStumps ? 'bowled' : 'beaten', grade };

  // a tap: dead-bat defence. Safe in the window (no edge, even against Shatter Seam),
  // dropped at the feet for a dot or a quick single
  if (shot.kind === 'defend') {
    return { outcome: 'hit', grade: 'defend', angle: rng.range(-0.6, 0.6), loft: false, launchDeg: 0, v: 5 + rng.range(0, 4), forced: { cap: rng.chance(0.25) ? 1 : 0 } }; // mostly a dot, sometimes a nudged single
  }

  if (fx.shatter && grade !== 'perfect' && !(fx.shatterHalf && grade === 'good')) grade = 'edge';   // (braced: a Good contact is spared)
  if (grade === 'edge') {
    return {
      outcome: 'edge', grade,
      offset: { x: rng.range(-0.25, 1.5), y: rng.range(0.35, 1.25) },
    };
  }

  if (shot.kind === 'block') {
    return { outcome: 'hit', grade, angle: rng.range(-0.4, 0.4), loft: false, launchDeg: 0, v: 9 + rng.range(0, 3), forced: null };
  }

  let power = POWER[grade];
  // with the line or against it: the shot's direction against the way the ball is going (the powers that force their own result are not judged)
  const judged = !fx.thunder && !fx.mirror && !fx.tornado;
  // the arc a ball can be hit in: a ball on the left cannot be hit to the right. Swung beyond the arc, the shot is not played where it was aimed: it comes off at the
  // edge of the arc, with the power taken off it, and most of the time it is beaten or edged (a scoop over the keeper is its own shot, with its own risk)
  let across = false, round = null;
  if (judged && shot.kind === 'drive' && Math.abs(shot.angle) <= 2.7) {
    const ideal = idealAngle(d), dev = wrap(shot.angle - ideal), short = d.length === 'short' || d.length === 'bouncer', arc = short ? HIT_ARC_SHORT : HIT_ARC;
    const side = ideal > 0.15 ? 1 : ideal < -0.15 ? -1 : 0;
    if (Math.abs(dev) > arc) {
      if (side && Math.sign(shot.angle) === side && Math.abs(shot.angle) > Math.abs(ideal) && Math.abs(dev) <= ROUND_ARC) round = Math.abs(dev);   // further round the ball's own side: the cut, the pull, the hook, the late cut
      else if (short && ideal > 0.5 && shot.angle < 0 && shot.angle > -2.5) round = 'cross';                                                         // a short ball outside off, pulled across the line with a cross bat: risky, not barred
      else { shot = { ...shot, angle: ideal + Math.sign(dev) * arc }; across = true; }
    }
  }
  // how far the shot is from the line, for the risk: going further round a ball's own side counts for half (a cut or a pull is a shot of its own), a cross-bat pull is a set risk
  const lm = judged ? (typeof round === 'number' ? lineMatch(idealAngle(d) + Math.sign(shot.angle) * round * 0.5, d) : lineMatch(shot.angle, d)) : { ideal: shot.angle, diff: 0, q: 1, mis: 0 };
  if (round === 'cross') { lm.mis = CROSS_MIS; lm.q = 1 - CROSS_MIS; }
  if (across) { lm.mis = 1; lm.q = 0; }
  if (judged && shot.loft) { lm.mis = Math.min(1, lm.mis * 1.2); lm.q = 1 - lm.mis; }   // (lofting against the line is worse still)
  if (judged && lm.mis > 0.3) {
    // a good ball played against its line: beaten (and bowled if it was on the stumps) or edged. A well-timed shot is spared more often.
    const k = (lm.mis - 0.3) / 0.7, spare = grade === 'perfect' ? 0.45 : grade === 'good' ? 0.75 : 1;
    const p = Math.min(across ? 0.6 : 0.7, k * 0.5 * ballDifficulty(d) * spare + (across ? 0.15 : 0));
    if (rng.chance(p)) {
      if (rng.chance(d.onStumps ? 0.7 : 0.45)) return { outcome: d.onStumps ? 'bowled' : 'beaten', grade, line: lm };
      return { outcome: 'edge', grade: 'edge', line: lm, offset: { x: rng.range(-0.25, 1.5), y: rng.range(0.35, 1.25) } };
    }
  }
  // through the gate: a mistimed swing at a full or good ball on the stumps can miss it altogether (a yorker is the hardest to keep out); against the line, more so.
  // (the AI batters have this check of their own, in ai.js, and ask for none here)
  if (!fx.noGate && (grade === 'early' || grade === 'late') && d.onStumps && ['good', 'full', 'yorker', 'fulltoss'].includes(d.length)) {
    const pg = (d.length === 'yorker' ? 0.4 : d.length === 'fulltoss' ? 0.08 : 0.2) * (fx.gateK ?? 1) * (0.8 + 0.8 * lm.mis);
    if (rng.chance(pg)) return { outcome: 'bowled', grade: 'miss', line: lm };
  }
  let angle = shot.angle + errMs * 0.0035 + rng.normal() * SPREAD[grade] * (1.6 - 0.8 * lm.q);
  let loft = shot.loft;
  power *= 0.6 + 0.5 * lm.q;   // (with the line: struck cleanly; against it: it dies off the bat)

  // The ball carries lateral momentum into the bat. Playing with that movement
  // adds a little power; playing against it costs power and makes redirection harder.
  // The outgoing angle also inherits a small part of the ball's lateral velocity.
  const lateralV = lateralVelocityAtContact(d);
  const lateralInfluence = Math.max(-1, Math.min(1, lateralV / 8));
  const alignment = lateralInfluence * Math.sin(shot.angle);
  power *= 1 + alignment * 0.12;
  angle += lateralInfluence * 0.12;  let launchDeg = loft ? 28 + rng.range(0, 10) : 0;
  let label = '';

  if (d.length === 'yorker' && grade !== 'perfect') power *= 0.6;

  // behind the wicket: glances and late cuts use the bowler's pace; the scoop over the
  // keeper needs good timing or it's gloved through or skied
  const timed = grade === 'perfect' || grade === 'good';
  if (Math.abs(shot.angle) > Math.PI / 2) {
    power *= 0.9;
    if (Math.abs(shot.angle) > 2.7) {
      label = 'SCOOP';
      if (!timed) {
        if (rng.chance(0.5)) return { outcome: 'edge', grade: 'edge', label: 'GLOVED IT', offset: { x: rng.range(-0.4, 0.6), y: rng.range(0.5, 1.2) } };
        loft = true; power = 0.4; launchDeg = 58 + rng.range(0, 14); label = 'TOP EDGE';
      } else { loft = true; launchDeg = 24 + rng.range(0, 8); power = grade === 'perfect' ? 0.78 : 0.68; } // usually four, sometimes six
    } else {
      label = shot.angle < 0 ? (loft ? 'OVER FINE LEG' : 'LEG GLANCE') : (loft ? 'OVER THIRD MAN' : 'LATE CUT');
      if (loft) power *= 0.93; // the rope is closer behind square
    }
  }

  let forced = null;
  const good = grade === 'perfect' || grade === 'good';
  const powerOk = fx.braced ? grade === 'perfect' : good;   // (a braced power only works at its best, on a Perfect)
  if (fx.thunder) {
    forced = powerOk ? { six: true } : { four: true, uncatchable: true };
    angle = shot.angle; loft = powerOk; launchDeg = powerOk ? 34 : 0; power = 1;
  } else if (fx.mirror && !loft && powerOk) {
    forced = { four: true, uncatchable: true };
  }
  let v = (14 + 20 * power) * (1 + rng.range(-0.04, 0.04)) * strength * (fx.pitch?.carry || 1);   // (the pitch: shots carry on a flat deck, die on a slow one)
  if (fx.tornado) {
    v = Math.min(v, 15); loft = false; launchDeg = 0; forced = { cap: 2 };
  }
  return { outcome: 'hit', grade, angle, loft, launchDeg, v, forced, label: across && !label ? 'ACROSS THE LINE' : label, roll: fx.pitch?.roll || 1, line: lm, across };
}

// ---------- Batting 2.0: the swipe itself carries the decisions ----------
// The length of the swipe is the risk: a short push is safe and weak, a long committed swipe is big and hard to time. Where the finger comes down against the ball's
// line is the footwork. A run of good shots builds confidence, and confidence widens the window and adds power. r = swipe length / the lofting length.
const bnClamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function batNewSize(r) {
  const power = r <= 1 ? 0.65 + 0.35 * r : 1 + 0.55 * (r - 1);
  const win = r <= 1 ? 1.3 - 0.3 * r : bnClamp(1 - 0.25 * (r - 1), 0.8, 1);
  return { win, power: bnClamp(power, 0.65, 1.45), band: r < 0.55 ? 'push' : r <= 1 ? 'drive' : 'big' };
}
// off: how far the finger came down from the ball's line, in zones (1 = the edge of the zone)
export function batNewZone(off) {
  return { win: bnClamp(1.2 - 0.3 * off, 0.85, 1.1), power: bnClamp(1 - 0.15 * Math.max(0, off - 0.6), 0.7, 1), near: off <= 0.6 ? 'on the line' : off <= 1.2 ? 'close' : 'reaching' };
}
export const rhythmStage = v => (v >= 60 ? 2 : v >= 25 ? 1 : 0);
export const RHYTHM_NAMES = ['SHAKY', 'CONFIDENT', 'UNSTOPPABLE'];
export const rhythmFx = v => { const s = rhythmStage(v); return { win: 1 + 0.07 * s, power: 1 + 0.07 * s, stage: s }; };
// a perfect shot builds it a lot, a good one some; a mistimed shot costs, a miss or an edge costs most; a defensive tap leaves it
export function rhythmNext(v, grade) {
  const d = { perfect: 40, good: 25, early: -8, late: -8, edge: -40, miss: -40, leave: 0, defend: 0 }[grade] ?? 0;
  return bnClamp(v + d, 0, 100);
}

// ---------- left-handers: the same game in a mirror ----------
// A left-hander is worked out exactly as a right-hander is, in a mirror: the ball's line, the shot and the result are flipped on the way in and flipped back on the way out,
// so the off side is on the left of the screen for him and every rule (the line, the off-side edge, the through-the-gate check) holds as it does for a right-hander.
export function mirrorDelivery(d) {
  const m = Object.create(d);
  m.xt = -d.xt;
  if (d.atContact) m.atContact = { ...d.atContact, x: -d.atContact.x };
  if (typeof d.pos === 'function') m.pos = t => { const p = d.pos(t); return p && { ...p, x: -p.x }; };
  return m;
}
export function mirrorResult(res) {
  if (!res) return res;
  const out = { ...res };
  if (typeof out.angle === 'number') out.angle = -out.angle;
  if (out.offset) out.offset = { ...out.offset, x: -out.offset.x };
  return out;
}

// ---------- wides ----------
// A ball is wide when it passes where the batter cannot reach: off side beyond 0.75 m from the middle of the stumps, leg side beyond 0.5 m (the leg side is called tighter, as in
// the laws). x is where the ball passes the batter (after its swing and turn), left: he is a left-hander (his off side is the other way).
export const WIDE = { off: 0.75, leg: -0.5 };
export function isWide(x, left = false) { const m = left ? -x : x; return m > WIDE.off || m < WIDE.leg; }
