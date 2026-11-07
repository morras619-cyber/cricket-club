import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDelivery } from '../js/physics.js';

// Swing bends late: the sideways speed of a swinger builds towards the pitch, and the ball still pitches and arrives where it would without swing.
for (const swing of [0.22, -0.2]) {
  test(`a swinger (${swing}) curves late and pitches on the same spot`, () => {
    const base = { x: 0.05, length: 'good', kmh: 135, move: 0.02 };
    const a = makeDelivery({ ...base, swing }), b = makeDelivery({ ...base, swing: 0 });
    const t1 = a.bounceT, h = 0.02, bend = u => { const f = k => a.pos(t1 * (u + k * h)).x - b.pos(t1 * (u + k * h)).x; return Math.abs(f(1) - 2 * f(0) + f(-1)); };   // (how sharply the path curves there, against the same ball with no swing)
    assert.ok(bend(0.9) > bend(0.2) * 3, 'the curve is in the late part of the flight');
    assert.ok(Math.abs(a.pos(t1).x - b.pos(t1).x) < 1e-9, 'pitches on the same line');
    assert.ok(Math.abs(a.atContact.x - b.atContact.x) < 1e-9, 'arrives on the same line');
    assert.equal(a.onStumps, b.onStumps);
  });
}
