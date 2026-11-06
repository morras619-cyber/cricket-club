import test from 'node:test';
import assert from 'node:assert/strict';
import { careerBatSkill, careerBowlWindow, careerBowlMove } from '../js/ratings.js';

test('a club\'s batters are pulled in towards the middle: no pushover, none out of reach', () => {
  assert.ok(careerBatSkill(58) > 58 + 8, 'a weak club is lifted');
  assert.ok(careerBatSkill(80) < 80, 'a top club is brought down a little');
  assert.ok(careerBatSkill(58) < careerBatSkill(68) && careerBatSkill(68) < careerBatSkill(80), 'but the order of the clubs is kept');
  assert.ok(careerBatSkill(80) - careerBatSkill(58) < 10, 'and the gap between the best and the worst is a few points, not twenty');
});

test('a better bowler squeezes your windows and moves it more, a weaker one gives you room', () => {
  assert.ok(careerBowlWindow(80) < 1 && careerBowlWindow(58) > 1 && careerBowlWindow(68) === 1);
  assert.ok(careerBowlMove(80) > 1 && careerBowlMove(58) < 1 && careerBowlMove(68) === 1);
  assert.ok(careerBowlWindow(0) <= 1.15 && careerBowlWindow(200) >= 0.85, 'it is capped');
  assert.ok(careerBowlMove(0) >= 0.85 && careerBowlMove(200) <= 1.3);
  assert.ok(Math.abs(careerBowlWindow(94) - 1) < 0.3, 'even a star is a few percent, not a different game');
});

test('it applies to the modes that adapt to you, and not to the fixed ones', async () => {
  const { adaptScale } = await import('../js/adapt.js');
  for (const m of ['quick', 'league', 'cup', 'warmup', 'career']) assert.ok(adaptScale(m) > 0, m);
  for (const m of ['daily', 'challenge', 'war', 'tutorial']) assert.equal(adaptScale(m), 0, m);
});
