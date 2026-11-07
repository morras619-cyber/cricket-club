import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeTiming, lateReach } from '../js/shots.js';
import { makeDelivery } from '../js/physics.js';

const W = { perfect: 40, good: 80, okay: 150, edge: 220, defend: 230 };

test('a swing so late that the ball has gone past cannot hit it: 164 ms late is a miss, and a hair later than the ball\'s reach is a thin edge on the off side', () => {
  const d = makeDelivery({ x: 0, length: 'good', kmh: 135, swing: 0, move: 0 }), reach = lateReach(d);
  assert.ok(reach > 70 && reach < 130, `the ball is gone ${reach} ms after it meets the bat`);
  assert.equal(gradeTiming(164, W, false, reach), 'miss');
  assert.equal(gradeTiming(reach + 15, W, true, reach), 'edge');
  assert.equal(gradeTiming(reach + 15, W, false, reach), 'miss');
  assert.equal(gradeTiming(reach - 5, W, true, reach), 'late');
});

test('early swings are as they were, and a slow ball can be hit later than a fast one', () => {
  const fast = lateReach(makeDelivery({ x: 0, length: 'good', kmh: 150, swing: 0, move: 0 })), slow = lateReach(makeDelivery({ x: 0, length: 'good', kmh: 80, swing: 0, move: 0 }));
  assert.ok(slow > fast + 40);
  assert.equal(gradeTiming(-140, W, true, fast), 'early');
  assert.equal(gradeTiming(-10, W, true, fast), 'perfect');
  assert.equal(gradeTiming(164, W, true), 'edge', 'no reach given: as before');
});
