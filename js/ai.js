import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { LANES } from './physics.js';
import { gradeTiming, resolveContact } from './shots.js';
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

// How the AI batter picks a shot direction for a delivery.
function chooseShot(d, ctx, rng) {
  const short = d.length === 'short' || d.length === 'bouncer';
  let angle;
  if (short) angle = d.xt > 0.15 && rng.chance(0.45) ? 1.3 : -1.2;
  else if (d.xt > 0.15) angle = rng.chance(0.7) ? 0.75 : 0.3;
  else if (d.xt < -0.05) angle = rng.chance(0.6) ? -0.4 : -0.95;
  else angle = rng.range(-0.15, 0.15);
  angle += rng.range(-0.15, 0.15);

  let loftP = ctx.ballNo <= 12 ? 0.35 : ctx.ballNo >= 25 ? 0.55 : 0.25;
  // the batting team's style: Thunder slog, Titans block, Phoenix wait for the death
  const st = ctx.style || {};
  loftP += (st.loft || 0) + (ctx.ballNo >= 19 ? st.late || 0 : 0);
  const rate = ctx.need / Math.max(1, ctx.ballsLeft);
  if (rate > 1.8) loftP += 0.25;
  if (ctx.wicketsLeft <= 1) loftP -= 0.2;
  if (d.length === 'yorker') loftP *= 0.4;
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
  if (ctx.power === 'thunder') sigma *= 0.7;
  if (ctx.freeHit) sigma *= 0.85; // he picks his spot and commits to it
  if (ctx.hot) sigma *= HOT_BAT.sigma; // the duel is hot: he swings as hard as he can, and misses more
  const mods = ctx.mods || {};
  sigma *= mods.sigmaMul || 1;
  const w = { ...CFG.timing };
  if (ctx.release === 'loose') for (const k in w) w[k] *= 1.2;
  if (ctx.repeats >= 3) for (const k in w) w[k] += 20;
  if (ctx.fx?.tornado) w.perfect /= 2;
  const errMs = rng.normal() * sigma + 6 + (mods.bias || 0);
  const shot = chooseShot(d, ctx, rng);
  if (mods.loftAdd && !shot.loft && rng.chance(mods.loftAdd)) shot.loft = true;
  if (ctx.hot && !ctx.freeHit && !shot.loft && rng.chance(HOT_BAT.loft)) shot.loft = true;
  // ...unless it is a good ball: then he can block it
  if (ctx.hot && !ctx.freeHit && (ctx.release === 'good' || ctx.release === 'perfect') && ['good', 'full', 'yorker'].includes(d.length) && rng.chance(HOT_BAT.blockP)) {
    const block = { kind: 'defend', angle: 0, loft: false };
    return { errMs, shot: block, grade: 'defend', res: resolveContact({ grade: 'defend', errMs, shot: block, d, fx: ctx.fx || {}, rng, strength: 1 }) };
  }

  if (ctx.fx?.maya && !rng.chance(0.5)) {
    return { errMs, shot, grade: 'miss', res: { outcome: 'bowled', grade: 'miss', mayaFooled: true } };
  }
  let grade = gradeTiming(errMs, w, d.xt > 0.08);
  if (mods.edgeBoost && ['good', 'early', 'late'].includes(grade) && d.xt > -0.05 && rng.chance(mods.edgeBoost)) grade = 'edge';
  const res = resolveContact({ grade, errMs, shot, d, fx: { ...ctx.fx, thunder: ctx.power === 'thunder' }, rng, strength: hitStrength(ctx.power ? 75 : (ctx.skill ?? 75)) });
  // through the gate: a mistimed swing at a full, straight ball can miss it and lose the stumps.
  // A weaker batter is beaten more often; a yorker on the stumps is the hardest to keep out.
  if ((grade === 'early' || grade === 'late' || grade === 'edge') && !ctx.freeHit && d.onStumps && ['good', 'full', 'yorker', 'fulltoss'].includes(d.length)) {
    const p = (d.length === 'yorker' ? 0.4 : d.length === 'fulltoss' ? 0.08 : 0.2) * aiSpread(ctx.skill);
    if (rng.chance(p)) return { errMs, shot, grade: 'miss', res: { outcome: 'bowled', grade: 'miss' } };
  }
  if (ctx.fx?.tornado && (grade === 'miss' || res.outcome === 'beaten')) res.outcome = 'bowled';
  if (ctx.stance === 'charge' && res.outcome === 'beaten') res.outcome = 'stumping-chance';
  return { errMs, shot, grade, res };
}

export function aiStance(kind, rng) {
  if ((kind === 'spin' || bowlType(kind).spin && kind !== 'pace') && rng.chance(0.22)) return 'charge';
  return rng.pick(['normal', 'normal', 'open', 'back']);
}
