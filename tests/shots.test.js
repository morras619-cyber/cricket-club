import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeSpeed, swipePowerFromSpeed, resolveContact } from '../js/shots.js';

const rng = {
  range: (a, b) => (a + b) / 2,
  normal: () => 0,
  chance: () => false,
};

test('swipe speed reads the fastest deliberate path segment', () => {
  const path = [
    { x: 0, y: 0, t: 0 },
    { x: 10, y: 0, t: 100 },
    { x: 70, y: 0, t: 150 },
    { x: 80, y: 0, t: 250 },
  ];
  assert.equal(swipeSpeed(path, 0, 0, 80, 0, 0, 250), 1200);
});

test('swipe power increases smoothly and stays within its bounds', () => {
  assert.equal(swipePowerFromSpeed(0), 0.65);
  assert.ok(swipePowerFromSpeed(700) > swipePowerFromSpeed(300));
  assert.equal(swipePowerFromSpeed(1500), 1.35);
  assert.equal(swipePowerFromSpeed(5000), 1.35);
});

test('a faster swipe produces a faster ball off the bat', () => {
  const base = {
    grade: 'perfect',
    shot: { kind: 'drive', angle: 0, loft: false },
    d: { length: 'good', xt: 0.3, onStumps: false },
    rng,
    strength: 1,
  };
  const soft = resolveContact({ ...base, swipePower: swipePowerFromSpeed(250) });
  const hard = resolveContact({ ...base, swipePower: swipePowerFromSpeed(1500) });
  assert.ok(hard.v > soft.v);
  assert.ok(Math.abs(hard.v / soft.v - (1.35 / 0.65)) < 1e-9);
});
