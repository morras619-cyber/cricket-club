import test from 'node:test';
import assert from 'node:assert/strict';
import { bowlCommit, pressureNext, pressureStage, pressureFx, PRESSURE_NAMES, PACE } from '../js/tactics.js';

test('pace is the risk: a slow flick lands where drawn and is easy to play, an all-out one is quick, moves more and strays more', () => {
  const slow = bowlCommit(0.5), mid = bowlCommit(0.8), fast = bowlCommit(PACE.perfect);
  assert.ok(slow.spray < mid.spray && mid.spray < fast.spray, 'it strays more as the flick speeds up');
  assert.ok(slow.bounceSpray < fast.bounceSpray);
  assert.ok(slow.move < mid.move && mid.move < fast.move, 'it moves more');
  assert.ok(slow.sigma < fast.sigma, 'and is harder to time');
  assert.equal(slow.band, 'CONTROLLED'); assert.equal(fast.band, 'ALL-OUT');
  assert.ok(fast.spray < 0.1 && slow.spray < 0.03, 'a risk, not a lottery');
  assert.ok(bowlCommit(undefined).k >= 0, 'a missing flick speed is safe');
});

test('pressure builds on dot balls, breaks on boundaries, and bites at each stage', () => {
  let v = 0;
  v = pressureNext(v, { runs: 0 }); assert.equal(pressureStage(v), 0);        // 22
  v = pressureNext(v, { runs: 0 }); assert.equal(pressureStage(v), 1);        // 44: building
  v = pressureNext(v, { runs: 0 }); v = pressureNext(v, { runs: 0 });         // 88: squeeze
  assert.equal(PRESSURE_NAMES[pressureStage(v)], 'SQUEEZE');
  assert.ok(pressureFx(v).sigma > pressureFx(44).sigma && pressureFx(44).sigma > pressureFx(0).sigma);
  assert.ok(pressureFx(v).edge > pressureFx(0).edge);
  assert.ok(pressureNext(v, { runs: 4 }) < v - 20 && pressureNext(v, { runs: 6 }) < pressureNext(v, { runs: 4 }), 'a four hurts, a six hurts more');
  assert.ok(pressureNext(40, { runs: 1 }) >= 40 && pressureNext(40, { runs: 2 }) < 40, 'a single holds it, twos and threes ease it');
  assert.ok(pressureNext(40, { wicket: true }) > 40, 'a wicket is momentum');
  assert.ok(pressureNext(40, { noBall: true }) < 40);
  assert.equal(pressureNext(95, { runs: 0 }), 100); assert.equal(pressureNext(5, { runs: 6 }), 0);
});
