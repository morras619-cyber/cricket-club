import test from 'node:test';
import assert from 'node:assert/strict';
import { isWideDelivery, WIDE_LEG_X } from '../js/physics.js';

const delivery = (x, y = 1) => ({ atContact: { x, y } });

test('outer leg-side line is wide', () => {
  assert.equal(isWideDelivery(delivery(WIDE_LEG_X - 0.01)), true);
});

test('off-side deliveries remain playable, even beyond the old wide line', () => {
  assert.equal(isWideDelivery(delivery(0.55)), false);
  assert.equal(isWideDelivery(delivery(0.8)), false);
});

test('normal stump lines remain playable', () => {
  assert.equal(isWideDelivery(delivery(0.24)), false);
  assert.equal(isWideDelivery(delivery(-0.2)), false);
});

test('a ball exactly on the leg-side limit is not wide', () => {
  assert.equal(isWideDelivery(delivery(WIDE_LEG_X)), false);
});

test('height alone does not make a delivery wide', () => {
  assert.equal(isWideDelivery(delivery(0, 2.5)), false);
});
