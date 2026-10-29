import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Charge } from '../js/charge.js';
import { CFG } from '../js/config.js';
import { makeDelivery, CONTACT_Z } from '../js/physics.js';
import { gradeTiming, swipeToShot, resolveContact } from '../js/shots.js';
import { simulateHit, boundaryDist, buildField } from '../js/fieldsim.js';
import { aiBowlingScript, aiBat } from '../js/ai.js';
import { makeRng } from '../js/rng.js';
import { encodeChallenge, decodeChallenge } from '../js/codec.js';
import { playerControls } from '../js/rules.js';
import { Innings, matchResult } from '../js/match.js';

test('charge tiers, costs, overheat, wicket loss and carry', () => {
  const c = new Charge();
  const events = [];
  c.on(e => events.push(e));
  c.add(32);
  assert.equal(c.tier(), 1);
  assert.equal(events.at(-1).crossed, 30);
  c.add(200);
  assert.equal(c.value, 100);
  c.dot();
  assert.equal(c.value, 99);
  assert.equal(c.cost(60, 24), 60);
  assert.equal(c.cost(60, 25), 48);
  assert.ok(c.spend(60, 10));
  assert.equal(c.value, 39);
  c.wicketLost();
  assert.equal(c.value, 19);
  c.value = 100;
  assert.equal(c.carryOver(), 25);
  assert.equal(c.spend(100, 1), true);
  assert.equal(c.spend(30, 1), false);
});

test('perfect streak bonus grows and caps', () => {
  const c = new Charge();
  const bonuses = [1, 2, 3, 4, 5, 6, 7].map(() => c.timingStreak(true));
  assert.deepEqual(bonuses, [0, 2, 4, 6, 8, 10, 10]);
  assert.equal(c.timingStreak(false), 0);
});

test('timing grades follow the GDD windows', () => {
  const w = CFG.timing;
  assert.equal(gradeTiming(0, w), 'perfect');
  assert.equal(gradeTiming(-60, w), 'good');
  assert.equal(gradeTiming(-120, w), 'early');
  assert.equal(gradeTiming(120, w), 'late');
  assert.equal(gradeTiming(190, w, true), 'edge');
  assert.equal(gradeTiming(190, w, false), 'miss');
  assert.equal(gradeTiming(-190, w), 'miss');
});

test('swipe mapping', () => {
  assert.equal(swipeToShot(0, -10).kind, 'block');
  const drive = swipeToShot(0, -200);
  assert.equal(drive.kind, 'drive');
  assert.ok(Math.abs(drive.angle) < 0.01);
  assert.equal(drive.loft, true);
  assert.ok(swipeToShot(80, 0).angle > 1.5); // swipe right = off side
  // swiping down plays behind the wicket: down-left fine leg, down-right third man, straight down a scoop
  assert.equal(swipeToShot(0, 100).kind, 'drive');
  assert.ok(Math.abs(swipeToShot(0, 100).angle) > 3);
  assert.ok(swipeToShot(-70, 70).angle < -2 && swipeToShot(70, 70).angle > 2);
  // the GROUND / LOFT switch decides, whatever the swipe's length
  assert.equal(swipeToShot(0, -200, 110, false).loft, false);
  assert.equal(swipeToShot(0, -60, 110, true).loft, true);
  assert.equal(swipeToShot(0, -10, 110, true).kind, 'block'); // a tap still defends
});

test('deliveries arrive on time and stumps detection works', () => {
  const straight = makeDelivery({ x: 0, length: 'full', kmh: 140 });
  assert.ok(straight.onStumps);
  assert.ok(straight.tContact > 0.6 && straight.tContact < 1.3, `tContact ${straight.tContact}`);
  const bouncer = makeDelivery({ x: 0, length: 'bouncer', kmh: 140 });
  assert.equal(bouncer.onStumps, false);
  const wide = makeDelivery({ x: 0.55, length: 'good', kmh: 140 });
  assert.equal(wide.onStumps, false);
  const p = straight.pos(straight.tContact);
  assert.ok(Math.abs(p.z - CONTACT_Z) < 1e-6);
});

test('powers force outcomes', () => {
  const rng = makeRng(1);
  const d = makeDelivery({ x: 0.2, length: 'good', kmh: 140 });
  const shot = swipeToShot(0, -200);
  const thunder = resolveContact({ grade: 'good', shot, d, fx: { thunder: true }, rng });
  assert.equal(simulateHit(thunder, buildField('balanced'), rng).kind, 'six');
  const thunderLate = resolveContact({ grade: 'late', errMs: 120, shot, d, fx: { thunder: true }, rng });
  assert.equal(simulateHit(thunderLate, buildField('defend'), rng).kind, 'four');
  const shatter = resolveContact({ grade: 'good', shot, d, fx: { shatter: true }, rng });
  assert.equal(shatter.outcome, 'edge');
  const leave = resolveContact({ grade: 'leave', shot: null, d: makeDelivery({ x: 0, length: 'full', kmh: 140 }), rng });
  assert.equal(leave.outcome, 'bowled');
});

test('boundary distance is longer straight than square', () => {
  assert.ok(boundaryDist(0) > boundaryDist(Math.PI / 2));
  assert.ok(Math.abs(boundaryDist(0) - 72) < 0.01);
});

test('field sim produces sane results over many balls', () => {
  const rng = makeRng(7);
  const field = buildField('balanced', false);
  const counts = { six: 0, four: 0, field: 0 };
  for (let i = 0; i < 400; i++) {
    const grade = rng.pick(['perfect', 'good', 'early', 'late']);
    const shot = { kind: 'drive', angle: rng.range(-1.5, 1.5), loft: rng.chance(0.4), len: 200 };
    const d = makeDelivery({ x: 0.1, length: 'good', kmh: 135 });
    const res = resolveContact({ grade, errMs: 0, shot, d, rng });
    const out = simulateHit(res, field, rng, { aiBatting: true });
    counts[out.kind]++;
    assert.ok(out.runs >= 0 && out.runs <= 6);
    if (out.catch) assert.ok(out.catch.p >= 0.05 && out.catch.p <= 1);
  }
  assert.ok(counts.six > 10 && counts.four > 10 && counts.field > 50, JSON.stringify(counts));
});

test('AI bowling script is deterministic per seed', () => {
  const a = aiBowlingScript(42, 'pace', 'tornado');
  const b = aiBowlingScript(42, 'pace', 'tornado');
  assert.deepEqual(a, b);
  assert.equal(a.length, 30);
  assert.equal(a[8].power, 'tornado');
  assert.notDeepEqual(aiBowlingScript(43, 'pace', 'tornado'), a);
});

test('AI batter scores at an arcade rate', () => {
  const rng = makeRng(3);
  const field = buildField('balanced', false);
  let runs = 0, outs = 0;
  const script = aiBowlingScript(99, 'pace', null);
  for (let rep = 0; rep < 10; rep++) {
    for (const s of script) {
      const d = makeDelivery(s);
      const { res } = aiBat(d, { ballNo: s.ball, need: 50, ballsLeft: 30 - s.ball, wicketsLeft: 3, release: 'good', repeats: 0 }, rng);
      if (res.outcome === 'bowled') { outs++; continue; }
      if (res.outcome !== 'hit') continue;
      const out = simulateHit(res, field, rng, {});
      if (out.catch && rng.chance(out.catch.p)) { outs++; continue; }
      runs += out.runs;
    }
  }
  const perInnings = runs / 10;
  assert.ok(perInnings > 25 && perInnings < 90, `runs per 30 balls ${perInnings}`);
  assert.ok(outs / 10 < 12, `outs per innings ${outs / 10}`);
});

test('challenge codec round-trips and rejects tampering', () => {
  const c = { seed: 123456789, target: 52, wkts: 2, balls: 30, name: 'Ayaan', squad: ['raja', 'zara', 'rani'], moment: 'six', team: 'thunder', opp: 'vipers' };
  const token = encodeChallenge(c);
  assert.match(token, /^c[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeChallenge(token), c);
  assert.equal(decodeChallenge(token.slice(0, -2) + 'xx'), null);
  assert.equal(decodeChallenge('garbage'), null);
});

test('fielding control rules', () => {
  const s = { events: 0, lastEventBall: -5, setting: 'key' };
  assert.equal(playerControls({ kind: 'catch', p: 0.5 }, s, 10), true);
  assert.equal(playerControls({ kind: 'catch', p: 0.95 }, s, 10), false);
  assert.equal(playerControls({ kind: 'catch', p: 0.02 }, s, 10), false);
  assert.equal(playerControls({ kind: 'catch', p: 0.5 }, { ...s, lastEventBall: 9 }, 10), false);
  assert.equal(playerControls({ kind: 'edge', p: 0.5 }, { ...s, lastEventBall: 9 }, 10), true);
  assert.equal(playerControls({ kind: 'edge', p: 0.5 }, { ...s, events: 6 }, 10), false);
  // run outs: always the player's throw, whatever the cap or the last event
  assert.equal(playerControls({ kind: 'runout', p: 0.97 }, { ...s, events: 6, lastEventBall: 9 }, 10), true);
  assert.equal(playerControls({ kind: 'runout', p: 0.5 }, { ...s, setting: 'off' }, 10), false);
  assert.equal(playerControls({ kind: 'runout', p: 0.5, near: false }, s, 10), false); // a long run to the ball: played for you
});

test('innings and match result', () => {
  const a = new Innings('player');
  a.ball({ runs: 6 }); a.ball({ runs: 4 }); a.ball({ wicket: true });
  assert.equal(a.runs, 10); assert.equal(a.overs, '0.3');
  const b = new Innings('ai', 11);
  b.ball({ runs: 4 }); b.ball({ runs: 2 });
  for (let i = 0; i < 28; i++) b.ball({ runs: 0 });
  assert.ok(b.done());
  assert.equal(matchResult(a, b).outcome, 'win');
});

test('innings tracks batting stints and bowling figures', () => {
  const i = new Innings('player');
  i.ball({ runs: 4 }); i.ball({ runs: 0 }); i.ball({ wicket: true });
  i.ball({ wicket: true });
  i.ball({ runs: 6 }); i.ball({ runs: 1 });
  const card = i.battingCard();
  assert.deepEqual(card.map(c => [c.runs, c.balls, c.out]), [[4, 3, true], [0, 1, true], [7, 2, false]]);
  assert.equal(card[0].fours, 1); assert.equal(card[2].sixes, 1);
  const b = new Innings('ai');
  for (let k = 0; k < 6; k++) b.ball({ runs: 0 });
  b.ball({ runs: 2, wicket: true, runOut: true });
  b.ball({ wicket: true });
  b.extra(1);
  const f = b.bowlingFigures();
  assert.equal(f.wkts, 1); // the run-out isn't the bowler's
  assert.equal(f.runs, 3); assert.equal(f.balls, 8); assert.equal(f.maidens, 1); assert.equal(f.dots, 7);
});

test('a tap defends: safe in the window, even against Shatter Seam, and yields at most a single', () => {
  const rng = makeRng(7);
  const d = makeDelivery({ x: 0, length: 'good', kmh: 130, swing: 0, move: 0 });
  const shot = { kind: 'defend', angle: 0, loft: false };
  for (let i = 0; i < 40; i++) {
    const res = resolveContact({ grade: 'defend', errMs: 0, shot, d, fx: { shatter: true }, rng });
    assert.equal(res.outcome, 'hit');
    assert.equal(res.loft, false);
    const sim = simulateHit(res, buildField('balanced', false), rng);
    assert.ok(sim.runs <= 1, `defence went for ${sim.runs}`);
    assert.ok(!sim.catch, 'a defensive tap cannot be caught');
  }
  // badly timed: beaten (or bowled if it's on the stumps)
  const miss = resolveContact({ grade: 'miss', errMs: 400, shot, d, fx: {}, rng });
  assert.ok(['bowled', 'beaten'].includes(miss.outcome));
});

test('strike rotates: odd runs and the end of an over swap the batters', () => {
  const i = new Innings('player');
  const A = { id: 'a', name: 'A' }, B = { id: 'b', name: 'B' }, C = { id: 'c', name: 'C' };
  i.setBatter(A); i.setPartner(B);
  i.ball({ runs: 1 }); assert.equal(i.cur.id, 'b');   // a single: they cross
  i.ball({ runs: 2 }); assert.equal(i.cur.id, 'b');   // two: same man faces
  i.ball({ runs: 3 }); assert.equal(i.cur.id, 'a');   // three: they cross again
  i.ball({ runs: 4 }); assert.equal(i.cur.id, 'a');   // a boundary: no change
  i.ball({ runs: 0 }); assert.equal(i.cur.id, 'a');
  i.ball({ runs: 0 }); assert.equal(i.cur.id, 'b');   // end of the over: the other end faces
  i.ball({ wicket: true });                             // b out: the new man is on strike, a stays
  assert.equal(i.cur.id, null); assert.equal(i.other.id, 'a');
  i.setBatter(C); assert.equal(i.cur.id, 'c');
  const card = i.battingCard();
  assert.equal(card.find(c => c.id === 'a').runs, 5); // 1 + 4
  assert.equal(card.find(c => c.id === 'b').runs, 5); // 2 + 3
  assert.equal(card.find(c => c.id === 'b').out, true);
});

test('ratings are felt: a 94 hits it 100 m, a 64 barely clears the short side', async () => {
  const { hitStrength, timingFor, aiSpread } = await import('../js/ratings.js');
  const { makePath } = await import('../js/fieldsim.js');
  const carry = bat => makePath({ angle: 0, loft: true, launchDeg: 33, v: 34 * hitStrength(bat) }).carry; // a perfect loft
  assert.ok(carry(94) >= 95, `94 carries ${carry(94)}`);
  assert.ok(carry(64) < 64, `64 carries ${carry(64)}`);
  assert.ok(Math.abs(carry(75) - 71) < 3, `75 carries ${carry(75)}`);
  assert.ok(timingFor(94) > timingFor(75) && timingFor(75) > timingFor(64));
  assert.ok(aiSpread(94) < aiSpread(75) && aiSpread(75) < aiSpread(64));
});

test('each swipe direction plays its own shot', async () => {
  const { shotAnim } = await import('../js/batsprite.js');
  const d = deg => shotAnim({ kind: 'drive', angle: deg * Math.PI / 180 });
  assert.equal(d(0), 'straight'); assert.equal(d(10), 'straight'); assert.equal(d(-10), 'straight');
  assert.equal(d(35), 'cover'); assert.equal(d(80), 'cut'); assert.equal(d(140), 'rsweep');
  assert.equal(d(-35), 'ondrive'); assert.equal(d(-80), 'pull'); assert.equal(d(-150), 'pull');
  assert.equal(shotAnim({ kind: 'block', angle: 0 }), 'block');
  // a lifted drive straight or to the off side has its own finish; a lifted cut or pull is still a cut or pull
  const l = deg => shotAnim({ kind: 'drive', angle: deg * Math.PI / 180, loft: true });
  assert.equal(l(0), 'loft'); assert.equal(l(35), 'loft'); assert.equal(l(80), 'cut'); assert.equal(l(-80), 'pull');
});
