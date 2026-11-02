import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEffectLevel } from '../js/config.js';

const run = (lv, from, frames, dt) => { let t = from, l = 0; for (let i = 0; i < frames; i++) { t += dt; l = lv(t); } return [t, l]; };

test('a steady 60 fps keeps the effects at full', () => {
  assert.equal(run(makeEffectLevel(), 0, 3000, 16.7)[1], 0);
});
test('a few seconds of slow frames steps down, then off, and no further', () => {
  const lv = makeEffectLevel();
  let [t, l] = run(lv, 0, 85, 45);            // ~3.8 s at 22 fps
  assert.equal(l, 1);
  [t, l] = run(lv, t, 85, 45);
  assert.equal(l, 2);
  [, l] = run(lv, t, 600, 45);
  assert.equal(l, 2);
});
test('it does not step back up when the frame rate recovers', () => {
  const lv = makeEffectLevel();
  let [t, l] = run(lv, 0, 85, 45);
  [, l] = run(lv, t, 600, 16.7);
  assert.equal(l, 1);
});
test('a short hitch or a pause is not slowness', () => {
  const lv = makeEffectLevel();
  let [t] = run(lv, 0, 100, 16.7);
  [t] = run(lv, t, 8, 90);                      // a hitch
  t += 5000;                                    // a paused tab
  const [, l] = run(lv, t, 600, 16.7);
  assert.equal(l, 0);
});
