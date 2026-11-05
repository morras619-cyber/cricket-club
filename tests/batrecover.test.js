import test from 'node:test';
import assert from 'node:assert/strict';
import { batFrame } from '../js/batsprite.js';

// a batter does not stand frozen in his follow-through: the last pose is held a moment, then he settles back to his stance
test('after a shot the batter settles back to his stance', () => {
  const b = { angle: 0, shot: { anim: 'drive', t0: 0 } };
  const early = batFrame(b, 100).f, held = batFrame(b, 300), late = batFrame(b, 2500);
  assert.notEqual(early, 'ready');
  assert.notEqual(held.f, 'ready');   // (still in the held finish)
  assert.equal(late.f, 'ready');
  assert.equal(late.a, 1);
});

test('a batter who was bowled stays as he is (he is replaced, not reset)', () => {
  const b = { angle: 0, shot: { anim: 'bowled', t0: 0 } };
  assert.equal(batFrame(b, 5000).f, 'bowled');
});
