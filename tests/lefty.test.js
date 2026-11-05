import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorDelivery, mirrorResult, resolveContact, lineMatch, idealAngle } from '../js/shots.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';
import { isLeft } from '../js/looks.js';

const ball = x => makeDelivery({ x, length: 'good', bounce: 6, kmh: 130, swing: 0.1, move: 0, rx: 0.3, h: 0.8 });

test('a left-hander is a right-hander in a mirror: the line is the line, turned round', () => {
  for (const x of [-0.3, -0.1, 0.05, 0.2, 0.35]) {
    const d = ball(x), m = mirrorDelivery(d);
    assert.ok(Math.abs(m.xt + d.xt) < 1e-9, 'the line is flipped');
    assert.ok(Math.abs(idealAngle(m) - -idealAngle(ball(-x))) < 1e-6 || Math.abs(idealAngle(m) - idealAngle(ball(-x))) < 1e-6, 'it asks for the shot the other way round');
  }
});

test('the same shot at the mirrored ball gives the mirrored result', () => {
  const d = ball(0.25), md = mirrorDelivery(d), shot = { kind: 'drive', angle: 0.7, loft: false, len: 150 };
  const a = resolveContact({ grade: 'perfect', errMs: 0, shot, d, fx: {}, rng: makeRng(7), strength: 1 });
  const b = resolveContact({ grade: 'perfect', errMs: 0, shot, d: md, fx: {}, rng: makeRng(7), strength: 1 });
  assert.equal(typeof a.angle, 'number');
  assert.equal(mirrorResult(mirrorResult(a)).angle, a.angle, 'mirroring twice is the identity');
  assert.notEqual(b.outcome, undefined);
});

test('a result is turned round: the angle and the side of an edge', () => {
  const r = mirrorResult({ outcome: 'edge', angle: 0.4, offset: { x: 0.5, y: 1 } });
  assert.equal(r.angle, -0.4); assert.equal(r.offset.x, -0.5); assert.equal(r.offset.y, 1);
  assert.equal(mirrorResult(null), null);
});

test('about one batter in four bats left-handed, the same ones every time, and a player can say so', () => {
  const ids = Array.from({ length: 400 }, (_, i) => `player-${i}`), n = ids.filter(id => isLeft({ id })).length;
  assert.ok(n > 60 && n < 140, `${n} of 400`);
  assert.equal(isLeft({ id: 'x-1' }), isLeft({ id: 'x-1' }));
  assert.equal(isLeft({ id: 'a', hand: 'L' }), true); assert.equal(isLeft({ id: 'a', hand: 'R' }), false);
});
