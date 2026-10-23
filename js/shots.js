// Batting: timing grades, swipe → shot, and contact resolution. Pure functions.

export function gradeTiming(errMs, w, offSideBall = true) {
  const a = Math.abs(errMs);
  if (a <= w.perfect) return 'perfect';
  if (a <= w.good) return 'good';
  if (a <= w.okay) return errMs < 0 ? 'early' : 'late';
  if (errMs > 0 && a <= w.edge && offSideBall) return 'edge';
  return 'miss';
}

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

const POWER = { perfect: 1, good: 0.85, early: 0.5, late: 0.5 };
const SPREAD = { perfect: 0.04, good: 0.12, early: 0.25, late: 0.25 };

function isAgainstLine(angle, d) {
  const full = ['full', 'yorker', 'good', 'fulltoss'].includes(d.length);
  if (angle < -0.35 && d.xt > 0.15 && full) return true; // dragging a wide full ball to leg
  if (angle > 0.6 && d.xt < 0.05 && (d.length === 'full' || d.length === 'yorker')) return true; // cutting a straight full ball
  return false;
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
  let angle = shot.angle + errMs * 0.0035 + rng.normal() * SPREAD[grade];
  let loft = shot.loft;
  let launchDeg = loft ? 28 + rng.range(0, 10) : 0;
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
  if (isAgainstLine(shot.angle, d)) {
    power *= 0.7;
    label = 'AGAINST THE LINE';
    if (grade !== 'perfect' && rng.chance(0.5)) {
      loft = true; power = 0.42; launchDeg = 55 + rng.range(0, 15);
      angle = (rng.chance(0.5) ? -1 : 1) * rng.range(1.6, 2.6);
      label = 'TOP EDGE';
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
  return { outcome: 'hit', grade, angle, loft, launchDeg, v, forced, label, roll: fx.pitch?.roll || 1 };
}
