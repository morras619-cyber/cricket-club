import test from 'node:test';
import assert from 'node:assert/strict';
import { careerBatSkill, careerBowlWindow, careerBowlMove, paceFor, movementFor, fieldSpeed } from '../js/ratings.js';

test('a club\'s batters play as good as their rating: the order of the clubs is kept and the gap is felt', () => {
  assert.ok(careerBatSkill(58) < careerBatSkill(68) && careerBatSkill(68) < careerBatSkill(80), 'the order of the clubs is kept');
  assert.ok(careerBatSkill(80) - careerBatSkill(58) >= 13, 'a 58 and an 80 are a dozen points apart, not a few');
  assert.ok(careerBatSkill(58) > 58 && careerBatSkill(80) < 80, 'softened a little at the ends, never reversed');
});

test('a better bowler squeezes your windows, moves it more and bowls quicker; a weaker one gives you room', () => {
  assert.ok(careerBowlWindow(80) < 1 && careerBowlWindow(58) > 1 && careerBowlWindow(68) === 1);
  assert.ok(careerBowlMove(80) > 1 && careerBowlMove(58) < 1 && careerBowlMove(68) === 1);
  assert.ok(careerBowlWindow(0) <= 1.2 && careerBowlWindow(200) >= 0.8, 'it is capped');
  assert.ok(careerBowlMove(0) >= 0.8 && careerBowlMove(200) <= 1.4);
  assert.ok(paceFor(60) < paceFor(72) && paceFor(72) < paceFor(82), 'the better the bowler, the quicker');
  assert.ok(paceFor(82) / paceFor(60) > 1.12, 'a Division 3 bowler is clearly slower than a Super League one');
  assert.ok(movementFor(82) > movementFor(60));
});

test('a better fielding side gets to the ball quicker, a poor one is slower', () => {
  assert.ok(fieldSpeed(60) < 0.9 && fieldSpeed(80) > 1.05);
});

test('it applies to the modes that adapt to you, and not to the fixed ones', async () => {
  const { adaptScale } = await import('../js/adapt.js');
  for (const m of ['quick', 'league', 'cup', 'warmup', 'career']) assert.ok(adaptScale(m) > 0, m);
  for (const m of ['daily', 'challenge', 'war', 'tutorial']) assert.equal(adaptScale(m), 0, m);
});
