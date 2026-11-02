import test from 'node:test';
import assert from 'node:assert/strict';
import { Charge } from '../js/charge.js';
import { Mind } from '../js/heat.js';
import { makeRng } from '../js/rng.js';
import { CFG } from '../js/config.js';

test('swinging and missing costs charge, and it never goes below empty', () => {
  const c = new Charge(40);
  c.missed();
  assert.equal(c.value, 40 - CFG.charge.missLoss);
  const low = new Charge(2);
  low.missed();
  assert.equal(low.value, 0);
});

test('the AI batter loses charge for a miss as you do', () => {
  const m = new Mind(makeRng(1), { start: 30 });
  m.earn({ batting: true, missed: true });
  assert.equal(m.value, 30 - CFG.charge.missLoss);
});
