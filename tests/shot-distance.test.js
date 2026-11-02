import test from 'node:test';
import assert from 'node:assert/strict';
import { makePath } from '../js/fieldsim.js';

test('lofted shot carry is capped at a plausible maximum', () => {
  const path = makePath({ angle: 0, v: 100, loft: true, launchDeg: 35 });
  assert.ok(path.carry <= 105);
  assert.equal(path.carry, 105);
});

test('forced six distance is also capped', () => {
  const path = makePath({ angle: 0, v: 100, loft: true, launchDeg: 35, forced: { six: true } });
  assert.ok(path.carry <= 105);
});
