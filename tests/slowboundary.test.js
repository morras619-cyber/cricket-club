import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateHit, buildField, saveChance } from '../js/fieldsim.js';
import { makeRng } from '../js/rng.js';

const hit = (v, angle, seed, preset = 'attack') => simulateHit({ outcome: 'hit', angle, loft: false, launchDeg: 0, v, forced: null, roll: 1 }, buildField(preset, false), makeRng(seed), {});

test('a ground four says how fast the ball was going when it crossed the rope', () => {
  let fast = null, slow = null;
  for (let s = 1; s <= 4000 && !(fast && slow); s++) {
    const rng = makeRng(s), v = 14 + rng.next() * 22, angle = rng.range(-2.4, 2.4), o = hit(v, angle, s);
    if (o.kind !== 'four') continue;
    assert.ok(Number.isFinite(o.ropeSpeed) && o.ropeSpeed >= 0, 'a speed is given');
    if (o.ropeSpeed > 12 && !fast && o.save) fast = o;
    if (o.ropeSpeed < 3 && !slow && o.save) slow = o;
  }
  assert.ok(fast && slow, 'both a hard four and a crawling one turned up');
  assert.ok(fast.ropeSpeed > slow.ropeSpeed * 4);
});

test('a ball hit hard may beat the fielder, a ball crawling over the rope is stopped by whoever is chasing it', () => {
  const p = 0.8;
  assert.ok(Math.abs(saveChance({ save: { p }, ropeSpeed: 25 }) - 0.4) < 1e-9, 'hard: half his reach, as before');
  assert.ok(Math.abs(saveChance({ save: { p }, ropeSpeed: 8 }) - 0.4) < 1e-9, 'at a sprint: still half');
  assert.ok(saveChance({ save: { p }, ropeSpeed: 5 }) > 0.4 && saveChance({ save: { p }, ropeSpeed: 5 }) < p, 'slowing: more');
  assert.ok(Math.abs(saveChance({ save: { p }, ropeSpeed: 2 }) - p) < 1e-9, 'at a jog or slower: all of it');
  assert.equal(saveChance({ save: { p: 1 }, ropeSpeed: 0 }), 1);
  assert.ok(Math.abs(saveChance({ save: { p } }) - 0.4) < 1e-9, 'no speed given (a lofted ball): as before');
});
