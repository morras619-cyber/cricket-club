import test from 'node:test';
import assert from 'node:assert/strict';
import { isBallReachableAtSwing } from '../js/shots.js';

function delivery(speed = 30) {
  const atContact = { x: 0, y: 0.5, z: 1.3 };
  return {
    tContact: 1,
    atContact,
    pos: t => ({
      x: 0,
      y: 0.5,
      z: atContact.z - speed * (t - 1),
    }),
  };
}

test('a slightly late swing can still connect while the ball is within reach', () => {
  assert.equal(isBallReachableAtSwing(delivery(), 1.02), true);
});

test('a swing after the ball has travelled beyond the contact reach cannot connect', () => {
  assert.equal(isBallReachableAtSwing(delivery(), 1.05), false);
});

test('an early swing can connect only when the ball is physically within reach', () => {
  assert.equal(isBallReachableAtSwing(delivery(), 0.98), true);
  assert.equal(isBallReachableAtSwing(delivery(), 0.95), false);
});

test('contact reach accounts for lateral and vertical separation as well as depth', () => {
  const d = delivery();
  d.pos = () => ({ x: 0.7, y: 0.5, z: 1.3 });
  assert.equal(isBallReachableAtSwing(d, 1), true);
  d.pos = () => ({ x: 1.0, y: 0.5, z: 1.3 });
  assert.equal(isBallReachableAtSwing(d, 1), false);
});

test('invalid delivery positions cannot produce a hit', () => {
  const d = delivery();
  d.pos = () => ({ x: NaN, y: 0.5, z: 1.3 });
  assert.equal(isBallReachableAtSwing(d, 1), false);
});
