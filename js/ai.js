import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { LANES } from './physics.js';
import { idealAngle, gradeTiming, resolveContact } from './shots.js';
import { bowlType, deliveryParams } from './squads.js';
import { aiSpread, bowlerTrouble, hitStrength, movementFor } from './ratings.js';
import { HOT_BAT } from './heat.js';

function weighted(rng, table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [v, w] of table) { if ((r -= w) <= 0) return v; }
  return table[table.length - 1][0];
}

const PACE_TYPES = ['Outswinger', 'Inswinger', 'Slower ball'];
const SPIN_TYPES = ['Off-break', 'Leg-break', 'Arm ball'];
export const deliveryTypes = kind => (kind === 'spin' ? SPIN_TYPES : PACE_TYPES);

// Physics parameters for a delivery type. sign flips spin direction.
export function typeParams(kind, type, rng) {
  const r = () => (rng ? rng.range(0.85, 1.15) : 1);
  switch (type) {
    case 'Outswinger': return { kmh: 138 * r() ** 0.1, swing: 0.22 * r(), move: 0.05 };
    case 'Inswinger': return { kmh: 136 * r() ** 0.1, swing: -0.2 * r(), move: -0.04 };
    case 'Slower ball': return { kmh: 112 * r() ** 0.1, swing: 0, move: 0, loop: 1.1, slower: true };
    case 'Off-break': return { kmh: 84 * r() ** 0.1, move: -0.28 * r(), loop: 1.3 };
    case 'Leg-break': return { kmh: 80 * r() ** 0.1, move: 0.32 * r(), loop: 1.4 };
    case 'Arm ball': return { kmh: 92 * r() ** 0.1, move: 0.02, loop: 0.9 };
    default: return { kmh: 135, move: 0 };
  }
}

// The AI's 30 deliveries for one innings, fixed by the seed so challenges replay exactly.
// kind is either 'pace' | 'spin' (one bowler all innings) or the over plan: one bowler
// (a squads.js player) per over, each bowling his own type, speeds and variations.
export function aiBowlingScript(seed, kind, powerKind) {
  if (Array.isArray(kind)) return planScript(seed, kind, powerKind);
  const rng = makeRng(seed);
  const powerBalls = new Set([9, 20, 27]);
  const out = [];
  for (let ball = 1; ball <= CFG.balls; ball++) {
    const finale = ball >= 25;
    const length = kind === 'spin'
      ? weighted(rng, [['good', 45], ['full', 30], ['short', 12], ['yorker', 5], ['fulltoss', 8]])
      : weighted(rng, [['good', 38], ['full', 20], ['short', 15], ['yorker', finale ? 30 : 12], ['bouncer', 8], ['fulltoss', 5]]);
    const lane = weighted(rng, [['off', 40], ['stumps', 30], ['leg', 15], ['wideoff', 10], ['wideleg', 5]]);
    const type = rng.pick(deliveryTypes(kind));
    const params = typeParams(kind, type, rng);
    const d = { ball, length, lane, x: LANES.find(l => l.id === lane).x + rng.range(-0.04, 0.04), type, ...params, power: null };
    if (powerBalls.has(ball) && powerKind) applyPower(d, powerKind);
    out.push(d);
  }
  return out;
}

export function applyPower(d, powerKind) {
  d.power = powerKind;
  if (powerKind === 'tornado') Object.assign(d, { length: 'yorker', lane: 'stumps', x: 0, kmh: 160, swing: 0.05, move: 0, type: 'Tornado Yorker', slower: false });
  if (powerKind === 'shatter') Object.assign(d, { length: 'good', lane: 'off', x: 0.2, move: 0.3, type: 'Shatter Seam', slower: false });
  if (powerKind === 'maya') Object.assign(d, { length: 'good', type: 'Maya Ball' });
  // the type powers of the other bowlers (the game doubles Swing Storm's swing for its three balls)
  if (powerKind === 'bouncer') Object.assign(d, { length: 'bouncer', lane: 'stumps', x: 0.05, kmh: Math.max(d.kmh || 135, 138), swing: 0.05, move: 0, type: 'Bouncer Barrage', slower: false });
  if (powerKind === 'googly') { const mv = d.move || 0; Object.assign(d, { move: -(Math.sign(mv) || -1) * Math.max(0.34, Math.abs(mv) * 1.5), type: 'Googly Switch' }); }
  if (powerKind === 'cutter') Object.assign(d, { kmh: 92, swing: (d.swing || 0) * 0.5, type: 'Cutter', slower: true });
  if (powerKind === 'storm') d.type = 'Swing Storm';
}

function planScript(seed, plan, powerKind) {
  const rng = makeRng(seed);
  const out = [];
  for (let ball = 1; ball <= CFG.balls; ball++) {
    const over = Math.floor((ball - 1) / 6), inOver = (ball - 1) % 6;
    const p = plan[Math.min(over, plan.length - 1)];
    const T = bowlType(p.bowl);
    const finale = ball >= 25;
    // weaker bowlers bowl more bad balls: full tosses, long hops and wides of the line
    const loose = Math.max(0, (85 - (p.bowlSkill || 70)) / 100);
    const length = T.spin
      ? weighted(rng, [['good', 45], ['full', 30], ['short', 10 + 40 * loose], ['yorker', 5], ['fulltoss', 6 + 40 * loose]])
      : weighted(rng, [['good', 38], ['full', 20], ['short', 15 + 30 * loose], ['yorker', finale ? 30 : 12], ['bouncer', T.id === 'express' ? 14 : 6], ['fulltoss', 4 + 30 * loose]]);
    const lane = weighted(rng, [['off', 40], ['stumps', 30], ['leg', 15], ['wideoff', 10 + 20 * loose], ['wideleg', 5 + 15 * loose]]);
    const variation = rng.chance(T.spin ? 0.18 : 0.14);
    const type = variation ? T.variation : rng.pick(T.stock);
    const params = deliveryParams(T.id, type, rng.range(0.2, 1), rng);
    if (p.ability === 'swingMaster') { params.swing *= 1.3; params.move *= 1.3; } // a career star
    // a better bowler moves it more
    params.swing = (params.swing || 0) * movementFor(p.bowlSkill); params.move = (params.move || 0) * movementFor(p.bowlSkill);
    const d = { ball, length, lane, x: LANES.find(l => l.id === lane).x + rng.range(-0.04, 0.04), ...params, bowler: p.id, power: null };
    if (type === 'Slower bouncer') Object.assign(d, { length: 'bouncer', lane: rng.pick(['off', 'stumps']), x: 0.05 });
    // the star's power ball comes once in each of his overs
    if (p.hero && powerKind && p.hero.power?.kind === powerKind && inOver === (over % 2 ? 3 : 2)) applyPower(d, powerKind);
    out.push(d);
  }
  return out;
}

// What the AI batter is trying to do this ball: 'defend' (his wicket matters more than the runs), 'build' (keep it on the ground and tick over)
// or 'attack' (he needs runs, or it is the death). ctx: { need, ballsLeft, wicketsLeft, ballNo, batType, freeHit }
export function aiIntent(ctx) {
  if (ctx.freeHit) return 'attack';
  const rate = (ctx.need ?? 0) / Math.max(1, ctx.ballsLeft ?? 1), wk = ctx.wicketsLeft ?? 3, type = ctx.batType;
  if (rate > 1.9 || ((ctx.ballsLeft ?? 30) <= 6 && rate > 0.9)) return 'attack';       // behind the rate, or the last over with runs to get
  if (type === 'power') return wk > 1 && rate > 1.0 ? 'attack' : wk > 1 ? 'build' : 'defend';
  if (wk <= (type === 'anchor' ? 2 : 1) && rate < 1.6) return 'defend';                // the last wickets, and no need to risk them
  if (rate < 1.0 || type === 'anchor') return 'build';
  if (type === 'finisher') return (ctx.ballNo ?? 1) >= 22 ? 'attack' : 'build';
  return (ctx.ballNo ?? 1) >= 25 ? 'attack' : 'build';
}

// How the AI batter picks a shot direction for a delivery.
function chooseShot(d, ctx, rng, Q = null) {
  // he plays the ball by its line (shots.js idealAngle), as well as his skill lets him read it: a good batter goes with the line nearly every time, a weak one
  // is often a long way off it (a slogger swings at everything the same way), and against a ball that is moving a lot even the best are caught out now and then
  const sk = Math.max(0, Math.min(1, ((ctx.skill ?? 75) - 40) / 55)), move = Math.max(0, Math.min(1, (Math.abs(d.swing) || 0) / 0.5 + (Math.abs(d.move) || 0) / 0.3));
  let angle = idealAngle(d) + rng.normal() * (0.5 - 0.37 * sk + 0.12 * move) + rng.range(-0.08, 0.08);

  let loftP = ctx.ballNo <= 12 ? 0.35 : ctx.ballNo >= 25 ? 0.55 : 0.25;
  // the batting team's style: Thunder slog, Titans block, Phoenix wait for the death
  const st = ctx.style || {};
  loftP += (st.loft || 0) + (ctx.ballNo >= 19 ? st.late || 0 : 0);
  const rate = ctx.need / Math.max(1, ctx.ballsLeft);
  if (rate > 1.8) loftP += 0.25;
  if (ctx.wicketsLeft <= 1) loftP -= 0.2;
  const intent = aiIntent(ctx);
  if (intent === 'build') loftP *= 0.6; else if (intent === 'attack') loftP = Math.min(0.9, loftP + 0.2); else loftP *= 0.4;   // (building keeps it on the ground; attacking goes over the top)
  if (d.length === 'yorker') loftP *= 0.4;
  if (Q) loftP = Math.max(0.01, Math.min(0.92, loftP * Q.loft));
  // a free hit: nothing to lose, so he goes over the top for six, mostly straight or over cow corner
  if (ctx.freeHit) return { kind: 'drive', angle: rng.chance(0.6) ? rng.range(-0.25, 0.2) : rng.range(-0.9, -0.5), loft: true, len: 200 };
  return { kind: 'drive', angle, loft: rng.chance(loftP), len: 200 };
}

// ctx: { ballNo, need, ballsLeft, wicketsLeft, release ('perfect'|'good'|'loose'|'bad'), repeats, fx, stance, power, freeHit }
export function aiBat(d, ctx, rng) {
  let sigma = 78;
  // the batter's own skill (a squads.js rating, 75 = a solid regular)
  if (ctx.skill != null) sigma *= aiSpread(ctx.skill);
  if (ctx.bowlSkill != null) sigma *= bowlerTrouble(ctx.bowlSkill); // the bowler he's facing
  sigma *= ctx.style?.sigma || 1;
  if (ctx.release === 'perfect') sigma *= 1.2;
  if (ctx.release === 'loose') sigma *= 0.8;
  if (ctx.repeats >= 3) sigma *= 0.8;
  if (ctx.power === 'thunder') sigma *= ctx.brace ? 0.85 : 0.7;   // (a braced bowler halves it)
  if (ctx.freeHit) sigma *= 0.85; // he picks his spot and commits to it
  if (ctx.hot) sigma *= HOT_BAT.sigma; // the duel is hot: he swings as hard as he can, and misses more
  const intent = aiIntent(ctx);
  const Q = ctx.bowlNew ? ballQuality(d, ctx.sameLen || 0) : null;
  if (Q) sigma *= Q.sigma;
  // a wide: out of his reach. He lets it go (now and then he reaches for it anyway)
  if (ctx.wide && !ctx.freeHit && rng.chance(0.85)) return { errMs: 0, shot: { kind: 'leave' }, grade: 'leave', res: { outcome: 'leave', grade: 'leave' } };
  if (intent === 'attack' && !ctx.freeHit) sigma *= 1.08;   // (going for it: a little more mistimed)
  const mods = ctx.mods || {};
  sigma *= mods.sigmaMul || 1;
  // my star's tricks (a braced one does about half of it)
  const f = ctx.fx || {};
  if (f.googly) sigma *= f.googlyBrace ? 1.18 : 1.4;         // he reads it turning the wrong way
  if (f.storm) sigma *= f.stormBrace ? 1.2 : 1.4;             // swing and seam he can't read
  if (f.hunt) sigma *= 1.15;                                  // the new batter is rattled
  const cutterBias = f.cutter ? (f.cutterBrace ? -50 : -105) : 0;   // looks quick, arrives slow: he swings early
  const w = { ...CFG.timing };
  if (ctx.release === 'loose') for (const k in w) w[k] *= 1.2;
  if (ctx.repeats >= 3) for (const k in w) w[k] += 20;
  if (ctx.fx?.tornado) w.perfect /= 2;
  const errMs = rng.normal() * sigma + 6 + (mods.bias || 0) + cutterBias;
  const shot = chooseShot(d, ctx, rng, Q);
  if (mods.loftAdd && !shot.loft && rng.chance(mods.loftAdd)) shot.loft = true;
  if (f.cutter && !shot.loft && rng.chance(f.cutterBrace ? 0.3 : 0.6)) shot.loft = true;   // (an early swing skies it)
  if (ctx.hot && !ctx.freeHit && !shot.loft && rng.chance(HOT_BAT.loft)) shot.loft = true;
  // ...unless it is a good ball: then he can block it
  if (ctx.hot && !ctx.freeHit && (ctx.release === 'good' || ctx.release === 'perfect') && ['good', 'full', 'yorker'].includes(d.length) && rng.chance(HOT_BAT.blockP)) {
    const block = { kind: 'defend', angle: 0, loft: false };
    return { errMs, shot: block, grade: 'defend', res: resolveContact({ grade: 'defend', errMs, shot: block, d, fx: ctx.fx || {}, rng, strength: 1 }) };
  }

  // defending: he leaves the wide ones and blocks what threatens him (a looser ball he still punishes), with a wider window than a drive has
  // Bowling 2.0: a ball that deserves respect is played out now and then, whatever his intent (less when he is going for it)
  const respect = !!Q && !ctx.freeHit && !ctx.hot && !ctx.fx?.maya && ctx.release !== 'loose' && rng.chance(Q.block * (intent === 'attack' ? 0.5 : 1));
  if ((intent === 'defend' || respect) && !ctx.hot && !ctx.freeHit && !ctx.fx?.maya && ctx.release !== 'loose' && d.length !== 'fulltoss' && !(d.length === 'short' && d.xt > 0.3)) {
    if (!d.onStumps && Math.abs(d.xt) > 0.4) return { errMs, shot: { kind: 'leave' }, grade: 'leave', res: { outcome: 'leave', grade: 'leave' } };
    const g = gradeTiming(errMs * 0.6, w, false);
    if (g === 'miss') return { errMs, shot: { kind: 'defend' }, grade: 'miss', res: { outcome: d.onStumps ? 'bowled' : 'beaten', grade: 'miss' } };
    const block = { kind: 'defend', angle: 0, loft: false };
    return { errMs, shot: block, grade: 'defend', res: resolveContact({ grade: 'defend', errMs, shot: block, d, fx: ctx.fx || {}, rng, strength: 1 }) };
  }

  if (ctx.fx?.maya && !rng.chance(ctx.fx.mayaBrace ? 0.75 : 0.5)) {
    return { errMs, shot, grade: 'miss', res: { outcome: 'bowled', grade: 'miss', mayaFooled: true } };
  }
  let grade = gradeTiming(errMs, w, d.xt > 0.08);
  if (ctx.steady && grade !== 'perfect') grade = 'good';   // his Steady Hands: a Good timing, however it is bowled
  if (((mods.edgeBoost || 0) + (Q ? Q.edge : 0)) && ['good', 'early', 'late'].includes(grade) && d.xt > -0.05 && rng.chance((mods.edgeBoost || 0) + (Q ? Q.edge : 0))) grade = 'edge';
  const res = resolveContact({ grade, errMs, shot, d, fx: { ...ctx.fx, noGate: true, thunder: ctx.power === 'thunder', braced: !!ctx.brace }, rng, strength: hitStrength(ctx.power ? 75 : (ctx.skill ?? 75)) * (ctx.powerMul || 1) * (Q ? Q.power : 1) });
  // a lofted shot at a ball that gives him nothing to lift can be mistimed up in the air: a catch chance (a well-timed one is spared more often)
  if (Q && res.outcome === 'hit' && shot.loft && !res.forced?.six && rng.chance(0.75 * Q.skyP * (grade === 'perfect' ? 0.25 : grade === 'good' ? 0.6 : 1.2))) {
    res.loft = true; res.launchDeg = 55 + rng.range(0, 13); res.v = Math.min(res.v || 20, 19); res.label = 'SKIED!';   // (a catch for whoever is under it)
  }
  // through the gate: a mistimed swing at a full, straight ball can miss it and lose the stumps.
  // A weaker batter is beaten more often; a yorker on the stumps is the hardest to keep out.
  if ((grade === 'early' || grade === 'late' || grade === 'edge') && !ctx.freeHit && d.onStumps && ['good', 'full', 'yorker', 'fulltoss'].includes(d.length)) {
    const p = (d.length === 'yorker' ? 0.4 : d.length === 'fulltoss' ? 0.08 : 0.2) * aiSpread(ctx.skill) * (Q ? (d.length === 'yorker' ? 0.7 : 0.9) * (1 - 0.17 * Math.max(0, Math.min(ctx.sameLen || 0, 5) - 1)) : 1);   // (Bowling 2.0: less than before, and not at all for a ball he has seen coming)
    if (rng.chance(p)) return { errMs, shot, grade: 'miss', res: { outcome: 'bowled', grade: 'miss' } };
  }
  if (ctx.fx?.tornado && (grade === 'miss' || res.outcome === 'beaten')) res.outcome = 'bowled';
  if (ctx.stance === 'charge' && res.outcome === 'beaten') res.outcome = 'stumping-chance';
  return { errMs, shot, grade, res };
}


// ---------- Bowling 2.0 (Settings > Tools, a test): the ball decides what the batter can do with it ----------
// Each length has its own character: a yorker cannot be lifted, a half-volley is driven, a good length is respected, a short ball is pulled (and skied), a full toss is hit.
// The line and the pace change it: a ball on the pads is flicked away, one in the channel outside off is hard to get away, a quick one gives less time (and goes further off the bat).
// sigma: how much harder (or easier) it is to time. power: how hard it comes off the bat. loft: how likely he is to try to lift it. skyP: the chance a lofted shot is mistimed up in the air.
// block: the chance he simply plays it out. edge: an extra chance of an edge.
const LENGTH_Q = {
  fulltoss: { sigma: 0.85, power: 0.95, loft: 1.2, skyP: 0.03, block: 0, edge: 0 },
  full: { sigma: 0.92, power: 0.9, loft: 0.9, skyP: 0.12, block: 0.05, edge: 0.005 },
  good: { sigma: 1.12, power: 0.9, loft: 0.6, skyP: 0.3, block: 0.25, edge: 0.02 },
  short: { sigma: 1.0, power: 0.85, loft: 0.85, skyP: 0.25, block: 0.1, edge: 0.015 },
  bouncer: { sigma: 1.2, power: 0.85, loft: 0.55, skyP: 0.35, block: 0.15, edge: 0.03 },
  yorker: { sigma: 1.18, power: 0.95, loft: 0.2, skyP: 0.4, block: 0.12, edge: 0.015 },
};
export function ballQuality(d, same = 0) {
  const q = { ...(LENGTH_Q[d.length] || LENGTH_Q.good) };
  const x = d.atContact?.x ?? d.xt ?? 0;
  if (x < -0.1 && x > -0.5) { q.sigma *= 0.92; q.power *= d.length === 'fulltoss' ? 0.9 : 1.08; q.loft *= d.length === 'fulltoss' ? 0.8 : 1.1; q.block *= 0.4; }          // on the pads: flicked away
  else if (x >= 0.1 && x < 0.36) { q.sigma *= 1.08; q.edge += 0.01; q.block *= 1.2; }                       // the channel outside off: hard to get away
  else if (x >= 0.36) { q.power *= 0.9; q.loft *= 0.7; }                                                    // reaching for it
  if (d.kmh > 100) { const f = Math.max(-0.4, Math.min(1, (d.kmh - 118) / 40)); q.sigma *= 1 + 0.2 * f; q.power *= 1 + 0.1 * f; q.block *= 1 + 0.3 * f; q.edge += 0.03 * Math.max(0, f); }   // a quick one: less time, and it goes further
  if (d.slower) q.sigma *= 1.15;
  // the same length again and again: he is set for it (the third ball running, and the fourth more still)
  if (same >= 2) { const n = Math.min(same, 5) - 1; q.sigma *= 1 - 0.04 * n; q.block *= 1 - 0.1 * n; q.power *= 1 + 0.04 * n; q.loft = Math.max(q.loft * (1 + 0.1 * n), same >= 3 ? 0.3 + 0.12 * n : 0); q.edge *= 0.7; }   // (and he starts to plan for it: a ramp or a scoop over a yorker he has seen coming)
  return q;
}

export function aiStance(kind, rng) {
  if ((kind === 'spin' || bowlType(kind).spin && kind !== 'pace') && rng.chance(0.22)) return 'charge';
  return rng.pick(['normal', 'normal', 'open', 'back']);
}
