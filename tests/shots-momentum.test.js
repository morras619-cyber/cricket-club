import test from 'node:test';
import assert from 'node:assert/strict';
import { lateralVelocityAtContact, resolveContact } from '../js/shots.js';

const rng = {
  normal: () => 0,
  range: (a, b) => (a + b) / 2,
  chance: () => false,
};

function delivery(vx, length = 'short') {
  return {
    tContact: 1,
    length,
    xt: 0,
    onStumps: false,
    pos: t => ({ x: vx * t, y: 0.5, z: 1.3 }),
  };
}

function hit(vx, angle, length = 'short') {
  return resolveContact({
    grade: 'perfect',
    shot: { kind: 'drive', angle, loft: false },
    d: delivery(vx, length),
    rng,
  });
}

test('lateral velocity is sampled at contact, not inferred from release line', () => {
  assert.ok(lateralVelocityAtContact(delivery(-4)) < 0);
  assert.equal(lateralVelocityAtContact(delivery(0)), 0);
});

test('playing with leftward ball movement improves power and carries trajectory left', () => {
  const aligned = hit(-4, -Math.PI / 2);
  const against = hit(-4, Math.PI / 2);
  assert.ok(aligned.v > against.v);
  assert.ok(aligned.angle < against.angle);
});

test('playing with rightward ball movement improves power and carries trajectory right', () => {
  const aligned = hit(4, Math.PI / 2);
  const against = hit(4, -Math.PI / 2);
  assert.ok(aligned.v > against.v);
  assert.ok(aligned.angle > against.angle);
});

// (a good-length ball straight at the stumps: square on either side is equally against its line; a short straight ball is a pull shot, which has its own side)
test('straight delivery has no artificial left-right momentum advantage', () => {
  const left = hit(0, -Math.PI / 2, 'good');
  const right = hit(0, Math.PI / 2, 'good');
  assert.equal(left.v, right.v);
  assert.ok(Math.abs(left.angle + right.angle) < 1e-12);
});

test('excellent timing still permits a shot against the movement', () => {
  const against = hit(-4, Math.PI / 2);
  assert.equal(against.outcome, 'hit');
  assert.equal(against.grade, 'perfect');
  assert.ok(against.v > 0);
});
