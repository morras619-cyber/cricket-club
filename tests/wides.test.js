import test from 'node:test';
import assert from 'node:assert/strict';
import { isWideDelivery, WIDE_OFF_X, WIDE_LEG_X, WIDE_HEIGHT } from '../js/physics.js';

const delivery = (x, y = 1) => ({ atContact: { x, y } });

test('outer off-side line is wide', () => {
  assert.equal(isWideDelivery(delivery(WIDE_OFF_X + 0.01)), true);
});

test('outer leg-side line is wide', () => {
  assert.equal(isWideDelivery(delivery(WIDE_LEG_X - 0.01)), true);
});

test('normal stump lines remain playable', () => {
  assert.equal(isWideDelivery(delivery(0.24)), false);
  assert.equal(isWideDelivery(delivery(-0.2)), false);
});

test('balls exactly on the lateral limits are not wide', () => {
  assert.equal(isWideDelivery(delivery(WIDE_OFF_X)), false);
  assert.equal(isWideDelivery(delivery(WIDE_LEG_X)), false);
});

test('a ball above the wide height limit is wide', () => {
  assert.equal(isWideDelivery(delivery(0, WIDE_HEIGHT + 0.01)), true);
});

test('a high but reachable ball remains playable', () => {
  assert.equal(isWideDelivery(delivery(0, WIDE_HEIGHT)), false);
});
