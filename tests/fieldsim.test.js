import test from 'node:test';
import assert from 'node:assert/strict';
import { fielderArrivalTime, fielderRunDistance, simulateHit } from '../js/fieldsim.js';

const alwaysSuccess = { chance: () => true };

test('fielder acceleration starts at zero and reaches a steady sprint', () => {
  assert.equal(fielderRunDistance(0), 0);
  assert.ok(fielderRunDistance(0.2) > 0);
  assert.ok(fielderRunDistance(1) > fielderRunDistance(0.5));
  assert.ok(fielderRunDistance(2) - fielderRunDistance(1) > fielderRunDistance(1) - fielderRunDistance(0.5));
});

test('arrival-time calculation is the inverse of sprint distance', () => {
  for (const distance of [0, 0.5, 1.8, 4, 10, 25]) {
    const seconds = fielderArrivalTime(distance, 1);
    assert.ok(Math.abs(fielderRunDistance(seconds, 1) - distance) < 1e-8);
  }
});

test('ground-ball interception selects the earliest-arriving fielder, not array order', () => {
  const near = { id: 'near', name: 'Near', x: 0, y: 15 };
  const far = { id: 'far', name: 'Far', x: 0, y: 24 };
  const shot = { angle: 0, v: 22, loft: false };
  const first = simulateHit(shot, [far, near], alwaysSuccess);
  const reversed = simulateHit(shot, [near, far], alwaysSuccess);

  assert.equal(first.intercept?.fielder.id, 'near');
  assert.equal(reversed.intercept?.fielder.id, 'near');
  assert.equal(first.intercept?.action, 'dive');
});

test('a fast straight ground shot can beat fielders who are too far away', () => {
  const fielders = [
    { id: 'left', name: 'Left', x: -40, y: 20 },
    { id: 'right', name: 'Right', x: 40, y: 20 },
  ];
  const shot = { angle: 0, v: 30, loft: false };
  const result = simulateHit(shot, fielders, alwaysSuccess);

  assert.equal(result.kind, 'four');
  assert.equal(result.intercept, null);
  assert.equal(result.save, null);
});

test('a failed dive can let a fast ground shot escape', () => {
  const fielder = { id: 'only', name: 'Only', x: 0, y: 15 };
  const shot = { angle: 0, v: 30, loft: false };
  const result = simulateHit(shot, [fielder], { chance: () => false });

  assert.ok(result.nearMiss);
  assert.equal(result.intercept, null);
});
