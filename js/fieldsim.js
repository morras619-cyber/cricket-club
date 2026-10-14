import { CFG } from './config.js';

// Top-down field: origin at the striker's stumps, +y toward the bowler, +x the off side.
const G = 9.8;
const { boundaryR: R, centerY: CY } = CFG.ground;
const F = CFG.fielding;
export const ENDS = { striker: { x: 0, y: 0 }, bowler: { x: 0, y: CFG.ground.pitch } };

export const FIELD_PRESETS = {
  attack: [
    ['slip', 'Slip', 2.6, -4.4], ['gully', 'Gully', 8, -3], ['point', 'Point', 15, 0], ['cover', 'Cover', 18, 15],
    ['midoff', 'Mid-off', 9, 28], ['midon', 'Mid-on', -9, 28], ['midwicket', 'Mid-wicket', -18, 14],
    ['square', 'Square leg', -15, 0], ['fine', 'Fine leg', -30, -40],
  ],
  balanced: [
    ['point', 'Point', 16, 1], ['cover', 'Cover', 19, 16], ['midoff', 'Mid-off', 9, 30], ['midon', 'Mid-on', -9, 30],
    ['midwicket', 'Mid-wicket', -19, 15], ['square', 'Square leg', -17, 1], ['fine', 'Fine leg', -30, -40],
    ['third', 'Third man', 30, -40], ['longon', 'Long-on', -20, 62],
  ],
  defend: [
    ['deeppoint', 'Deep point', 52, -8], ['deepcover', 'Deep cover', 45, 40], ['longoff', 'Long-off', 18, 62],
    ['longon', 'Long-on', -18, 62], ['deepmid', 'Deep mid-wicket', -46, 38], ['deepsq', 'Deep square', -52, -6],
    ['fine', 'Fine leg', -30, -40], ['third', 'Third man', 30, -40], ['cover', 'Cover', 18, 14],
  ],
};

const INNER = 27; // the 30-yard circle, measured from the pitch centre

// Builds the 9 outfielders plus bowler and keeper. In the Power Burst only 2 may stay outside the ring.
export function buildField(preset, powerplay) {
  const list = FIELD_PRESETS[preset].map(([id, name, x, y]) => ({ id, name, x, y, hx: x, hy: y }));
  if (powerplay) {
    let outside = 0;
    for (const f of list) {
      const r = Math.hypot(f.x, f.y - CY);
      if (r > INNER && ++outside > 2) {
        const k = (INNER - 2) / r;
        f.x = f.hx = f.x * k; f.y = f.hy = CY + (f.y - CY) * k;
      }
    }
  }
  list.push({ id: 'bowler', name: 'Bowler', x: 1.5, y: 23, hx: 1.5, hy: 23 });
  list.push({ id: 'keeper', name: 'Keeper', x: 0, y: -3, hx: 0, hy: -3, keeper: true });
  return list;
}

export function boundaryDist(angle) {
  const dx = Math.sin(angle), dy = Math.cos(angle);
  const b = -CY * dy;
  return -b + Math.sqrt(b * b - (CY * CY - R * R));
}

export const sigmoid = m => 1 / (1 + Math.exp(-1.8 * m));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const outside = p => Math.hypot(p.x, p.y - CY) > R;

// Builds the ball's top-down path from a contact result.
export function makePath(res) {
  const dir = { x: Math.sin(res.angle), y: Math.cos(res.angle) };
  const forcedSix = res.forced?.six;
  const forcedFour = res.forced?.four;
  const bd = boundaryDist(res.angle);
  let along, height, T = 0, carry = 0;

  if (forcedSix || res.loft) {
    const th = (res.launchDeg || 32) * Math.PI / 180;
    T = (2 * res.v * Math.sin(th) / G) * 0.92;
    carry = forcedSix ? bd + 14 : res.v * Math.cos(th) * T * 0.72;
    const apex = Math.max(6, carry * Math.tan(th) * 0.25);
    const vr = (carry / T) * 0.35, tau = 1.6;
    along = t => (t <= T ? carry * t / T : carry + vr * tau * (1 - Math.exp(-(t - T) / tau)));
    height = t => (t <= T ? 4 * apex * (t / T) * (1 - t / T) : 0);
  } else {
    const vg = forcedFour ? Math.max(res.v, 30) : res.v * 0.95, tau = 2.8;
    along = t => vg * tau * (1 - Math.exp(-t / tau));
    height = () => 0;
  }
  const ballAt = t => { const s = along(t); return { x: dir.x * s, y: dir.y * s, h: height(t) }; };
  return { dir, bd, T, carry, along, ballAt, lofted: T > 0 };
}

function runsFor(total) {
  const { first, next } = CFG.running;
  if (total < first) return 0;
  return Math.min(3, 1 + Math.floor((total - first) / next));
}

// Time for the fielder to gather, then throw to each end, from point p at time t.
export function collectTimes(t, p) {
  const gather = 0.5;
  return {
    striker: t + gather + dist(p, ENDS.striker) / F.throwSpeed,
    bowler: t + gather + dist(p, ENDS.bowler) / F.throwSpeed,
  };
}

export function runsAfterCollect(t, p) {
  const ct = collectTimes(t, p);
  return runsFor(Math.max(ct.striker, ct.bowler) - 0.2);
}

// Margin (s) of an attempted extra run at each end: positive = batter safe.
export function runOutMargins(t, p, runsDone) {
  const { first, next } = CFG.running;
  const arrive = first + next * runsDone;
  const ct = collectTimes(t, p);
  return { striker: ct.striker - arrive, bowler: ct.bowler - arrive };
}

// Simulates where the ball goes and what chances it creates.
// opts.aiBatting: the AI is batting, so it may attempt a risky extra run.
export function simulateHit(res, fielders, rng, opts = {}) {
  const path = makePath(res);
  const out = { path, kind: 'field', runs: 0, catch: null, intercept: null, save: null, runOut: null, duration: 2 };
  const outfield = fielders.filter(f => !f.keeper);

  if (res.forced?.six) {
    out.kind = 'six'; out.runs = 6; out.duration = path.T * 0.8; return out;
  }

  if (path.lofted) {
    if (path.carry > path.bd) { out.kind = 'six'; out.runs = 6; out.duration = Math.min(path.T, 3); return out; }
    const L = path.ballAt(path.T);
    let best = null;
    for (const f of outfield) {
      const margin = F.catchRun * Math.max(0, path.T - F.catchReact) + F.reach - dist(f, L);
      const p = sigmoid(margin);
      if (!best || p > best.p) best = { fielder: f, p, margin, t: path.T, point: L };
    }
    if (best && best.p >= F.minP && !res.forced?.uncatchable) out.catch = best;
  }

  // Ground (or after the bounce): first fielder to cut the ball off, else it reaches the rope.
  const t0 = path.lofted ? path.T : 0;
  for (let t = t0; t < 14; t += 0.05) {
    const p = path.ballAt(t);
    if (outside(p)) {
      out.kind = 'four'; out.runs = res.forced?.cap ? 2 : 4; out.duration = Math.min(t, 3.2);
      let best = null;
      for (const f of outfield) {
        const m = F.runSpeed * Math.max(0, t - F.react) + F.reach + F.diveReach - dist(f, p);
        const pr = sigmoid(m);
        if (!best || pr > best.p) best = { fielder: f, p: pr, t, point: p };
      }
      if (best && best.p >= F.minP && !res.forced?.uncatchable && !res.forced?.cap) out.save = best;
      break;
    }
    if (res.forced?.four) continue; // powered fours beat every fielder
    let hit = null;
    for (const f of outfield) {
      const need = dist(f, p) - F.reach;
      if (need <= F.runSpeed * Math.max(0, t - F.react)) { hit = f; break; }
    }
    if (hit) {
      out.intercept = { fielder: hit, t, point: p };
      out.runs = runsAfterCollect(t, p);
      if (res.forced?.cap) out.runs = Math.min(out.runs, res.forced.cap);
      out.duration = Math.min(t + 0.8, 3.2);
      if (opts.aiBatting && out.runs < 3) {
        const m = runOutMargins(t, p, out.runs);
        const worst = Math.min(m.striker, m.bowler);
        if (worst > -0.6 && worst < 0.6 && rng.chance(opts.riskyRun ?? 0.55)) {
          out.runOut = { margins: m, point: p, t, fielder: hit, attempt: out.runs + 1 };
        }
      }
      break;
    }
  }
  return out;
}

// Auto-resolve a catch for the AI side, or for a chance outside the player's band.
export const autoCatch = (chance, rng) => rng.chance(chance.p);
export const keeperEdgeP = off => Math.max(0.2, Math.min(0.95, 0.95 - 0.32 * Math.abs(off.x - 0.2)));
