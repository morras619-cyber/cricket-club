import test from 'node:test';
import assert from 'node:assert/strict';
import { Duels, FULL, HOLD, COOLED, START, gainOf, hotSpec } from '../js/heat.js';
import { aiBat } from '../js/ai.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';

test('a duel starts only with smack talk; then heat builds, runs down once it is full, and a wicket settles it', () => {
  const D = new Duels();
  assert.equal(D.add('a', 'b', gainOf('six')), false, 'play alone starts nothing');
  assert.equal(D.heat('a', 'b'), 0);
  assert.equal(D.on('a', 'b'), false);
  assert.equal(D.start('a', 'b'), true, 'smack talk starts it');
  assert.equal(D.start('a', 'b'), false, 'already on');
  assert.equal(D.heat('a', 'b'), START);
  let full = false;
  for (let i = 0; i < 6 && !full; i++) full = D.add('a', 'b', gainOf('sledge'));
  assert.ok(full && D.hot('a', 'b'), 'enough sledges and boundaries make it full');
  assert.equal(D.heat('a', 'c'), 0, 'another bowler is another duel');
  for (let i = 0; i < HOLD; i++) D.ball('a', 'b');
  assert.ok(!D.hot('a', 'b') && D.heat('a', 'b') === COOLED, 'a full duel runs for a few balls, then cools');
  D.settle('a', 'b');
  assert.ok(!D.on('a', 'b') && D.heat('a', 'b') === 0, 'a wicket ends it');
  const q = new Duels(); q.start('x', 'y'); q.ball('x', 'y'); assert.equal(q.heat('x', 'y'), START, 'the ball it started on does not cool it');
  q.ball('x', 'y'); assert.ok(q.heat('x', 'y') < START, 'a quiet ball cools it a little');
  for (let i = 0; i < 20; i++) q.ball('x', 'y');
  assert.ok(!q.on('x', 'y'), 'left quiet, the duel fizzles out');
  assert.ok(gainOf('sledge', 0.55) > gainOf('sledge', 0.2), 'a hot-head heats up faster');
  assert.ok(FULL === 100 && gainOf('six') > gainOf('four') && gainOf('four') > gainOf('dot'));
});

test('a hot quick bowls faster (capped) and a hot spinner turns it more', () => {
  const quick = hotSpec({ kmh: 140, move: 0.1 }, false), spin = hotSpec({ kmh: 85, move: -0.28, loop: 1.3 }, true);
  assert.ok(quick.kmh > 148 && quick.move === 0.1, 'faster, same line');
  assert.ok(hotSpec({ kmh: 165 }, false).kmh <= 168, 'never beyond the cap');
  assert.ok(Math.abs(spin.move) > 0.3 && spin.kmh === 85 && spin.loop > 1.3, 'more turn and flight, same pace');
});

test('a hot batter swings harder and misses more, but can block a good ball', () => {
  const spec = { x: 0, length: 'good', kmh: 135, swing: 0, move: 0, rx: 0.3 };
  const run = (hot, release, n = 1500) => {
    const rng = makeRng(11);
    let defended = 0, hits = 0, lofted = 0, miss = 0;
    for (let i = 0; i < n; i++) {
      const d = makeDelivery(spec);
      const r = aiBat(d, { skill: 75, bowlSkill: 75, style: {}, ballNo: 10, need: 40, ballsLeft: 20, wicketsLeft: 5, release, hot, fx: {} }, rng);
      if (r.grade === 'defend') defended++;
      if (r.res.outcome === 'hit') { hits++; if (r.res.loft) lofted++; }
      if (r.res.outcome === 'bowled' || r.res.outcome === 'beaten') miss++;
    }
    return { defended, hits, lofted, miss };
  };
  const calm = run(false, 'good'), hot = run(true, 'good');
  assert.ok(hot.defended > calm.defended + 500, 'a good ball is blocked far more often by a hot batter');
  const calmLoose = run(false, 'loose'), hotLoose = run(true, 'loose');
  assert.equal(hotLoose.defended <= calmLoose.defended + 5, true, 'a loose ball is not blocked: he swings');
  assert.ok(hotLoose.lofted > calmLoose.lofted && hotLoose.miss >= calmLoose.miss, 'more big shots, and more misses');
});
